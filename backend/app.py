import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8765"))


def predict_price(features):
    """Return a transparent baseline estimate in USD."""
    area = features["area"]
    bedrooms = features["bedrooms"]
    bathrooms = features["bathrooms"]
    age = features["age"]
    location = features["location"]
    condition = features["condition"]

    location_premium = {"urban": 1.24, "suburban": 1.0, "rural": 0.78}[location]
    condition_factor = {"excellent": 1.16, "good": 1.0, "fair": 0.88}[condition]
    base = (area * 235) + (bedrooms * 18000) + (bathrooms * 26000)
    age_adjustment = max(0.72, 1 - (age * 0.006))
    price = base * location_premium * condition_factor * age_adjustment
    prediction = round(max(price, 45000), -2)
    return {
        "prediction": prediction,
        "range_low": round(prediction * 0.91, -2),
        "range_high": round(prediction * 1.09, -2),
        "confidence": 0.84,
        "drivers": [
            {"label": "Interior area", "value": f"{int(area):,} sq ft", "impact": "positive"},
            {"label": "Location", "value": location.title(), "impact": "positive" if location == "urban" else "neutral"},
            {"label": "Condition", "value": condition.title(), "impact": "positive" if condition == "excellent" else "neutral"},
        ],
    }


def validate(payload):
    required = ("area", "bedrooms", "bathrooms", "age", "location", "condition")
    missing = [field for field in required if field not in payload]
    if missing:
        raise ValueError(f"Missing fields: {', '.join(missing)}")

    values = {
        "area": float(payload["area"]),
        "bedrooms": int(payload["bedrooms"]),
        "bathrooms": float(payload["bathrooms"]),
        "age": int(payload["age"]),
        "location": str(payload["location"]),
        "condition": str(payload["condition"]),
    }
    if not 300 <= values["area"] <= 20000:
        raise ValueError("Area must be between 300 and 20,000 sq ft")
    if not 1 <= values["bedrooms"] <= 12:
        raise ValueError("Bedrooms must be between 1 and 12")
    if not 1 <= values["bathrooms"] <= 12:
        raise ValueError("Bathrooms must be between 1 and 12")
    if not 0 <= values["age"] <= 150:
        raise ValueError("Age must be between 0 and 150 years")
    if values["location"] not in {"urban", "suburban", "rural"}:
        raise ValueError("Choose a valid location")
    if values["condition"] not in {"excellent", "good", "fair"}:
        raise ValueError("Choose a valid condition")
    return values


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, body):
        encoded = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self._send_json(200, {"status": "ok", "service": "house-price-predictor"})
            return
        self._serve_file(path)

    def do_POST(self):
        if urlparse(self.path).path != "/api/predict":
            self._send_json(404, {"error": "Route not found"})
            return
        try:
            size = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(size))
            features = validate(payload)
            result = predict_price(features)
            self._send_json(200, {
                **result,
                "currency": "USD",
                "model": "Hearthline baseline v1",
                "inputs": features,
            })
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self._send_json(400, {"error": str(error)})

    def _serve_file(self, path):
        relative = "index.html" if path == "/" else path.lstrip("/")
        file_path = (FRONTEND / relative).resolve()
        if FRONTEND not in file_path.parents or not file_path.is_file():
            self.send_error(404)
            return
        content = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(file_path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"House price predictor running at http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        server.server_close()