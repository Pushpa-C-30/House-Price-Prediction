# Hearthline House Price Predictor

A professional full-stack house price prediction module with a Python backend and responsive browser frontend.

Repository: `Pushpa-C-30/House-Price-Prediction`

## Deploy the full app

GitHub stores the source code. GitHub Pages can host static files, but it cannot run the Python prediction API, so deploy the complete app with Render:

1. Push this repository to GitHub as `House-Price-Prediction`.
2. In Render, choose **New > Web Service** and connect the repository.
3. Render will detect [`render.yaml`](render.yaml), or use `python backend/app.py` as the start command.
4. Open the generated Render URL. The frontend and `/api/predict` endpoint run together.

The repository URL will be:
`https://github.com/Pushpa-C-30/House-Price-Prediction`

## Run it

From the project directory:

```powershell
python backend/app.py
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765) in a browser. Set `PORT` to use another port, for example `$env:PORT=9000; python backend/app.py`.

## API

`POST /api/predict` accepts `area`, `bedrooms`, `bathrooms`, `age`, `location` (`urban`, `suburban`, `rural`), and `condition` (`excellent`, `good`, `fair`). It returns an estimated USD value, likely range, confidence score, valuation drivers, and normalized inputs.

The current model is an intentionally transparent baseline formula rather than a trained production model. Replace `predict_price` in `backend/app.py` with a serialized regression model when training data is available.