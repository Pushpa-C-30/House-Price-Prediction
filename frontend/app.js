const form = document.querySelector('#prediction-form');
const errorMessage = document.querySelector('#form-error');
const emptyResult = document.querySelector('#result-empty');
const readyResult = document.querySelector('#result-ready');
const button = form.querySelector('.predict-button');
const apiUrl = (!window.location.hostname || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) && window.location.port !== '8765'
  ? 'http://127.0.0.1:8765/api/predict'
  : '/api/predict';

document.querySelectorAll('[data-step]').forEach((control) => {
  control.addEventListener('click', () => {
    const input = document.querySelector(`#${control.dataset.step}`);
    const nextValue = Number(input.value) + Number(control.dataset.change) * Number(input.step || 1);
    const minimum = Number(input.min);
    const maximum = Number(input.max);
    if (nextValue >= minimum && nextValue <= maximum) input.value = nextValue;
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Calculating...';
  const data = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const responseText = await response.text();
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(`Prediction service returned an invalid response (${response.status}).`);
    }
    if (!response.ok) throw new Error(result.error || 'Unable to calculate estimate.');
    const currency = typeof result.currency === 'string' && /^[A-Z]{3}$/i.test(result.currency) ? result.currency : 'USD';
    const prediction = parseNumericValue(result.prediction);
    const rangeLow = parseNumericValue(result.range_low);
    const rangeHigh = parseNumericValue(result.range_high);
    const confidence = parseNumericValue(result.confidence);
    if (![prediction, rangeLow, rangeHigh, confidence].every(Number.isFinite)) {
      const missingFields = ['prediction', 'range_low', 'range_high', 'confidence']
        .filter((field) => !Number.isFinite(parseNumericValue(result[field])));
      throw new Error(`Prediction service returned an invalid estimate: ${missingFields.join(', ')}.`);
    }
    document.querySelector('#prediction').textContent = formatCurrency(prediction, currency);
    document.querySelector('#range').textContent = `${formatCurrency(rangeLow, currency)} – ${formatCurrency(rangeHigh, currency)}`;
    document.querySelector('#confidence-value').textContent = `${Math.round(confidence * 100)}%`;
    document.querySelector('#confidence-meter').style.width = `${confidence * 100}%`;
    document.querySelector('#model-name').textContent = result.model;
    document.querySelector('#drivers').innerHTML = result.drivers.map((driver) => `<div class="driver"><span class="driver-label"><i class="driver-dot"></i>${driver.label}</span><strong class="driver-value">${driver.value}</strong></div>`).join('');
    emptyResult.classList.add('hidden');
    readyResult.classList.remove('hidden');
  } catch (error) { errorMessage.textContent = error.message; }
  finally { button.disabled = false; button.querySelector('span:first-child').textContent = 'Estimate value'; }
});

function formatCurrency(value, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function parseNumericValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const normalized = value.replace(/[$,%\s,]/g, '');
  const number = Number(normalized);
  return value.includes('%') && number > 1 ? number / 100 : number;
}