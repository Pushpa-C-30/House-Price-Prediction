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
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to calculate estimate.');
    document.querySelector('#prediction').textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: result.currency, maximumFractionDigits: 0 }).format(result.prediction);
    document.querySelector('#range').textContent = `${formatCurrency(result.range_low, result.currency)} – ${formatCurrency(result.range_high, result.currency)}`;
    document.querySelector('#confidence-value').textContent = `${Math.round(result.confidence * 100)}%`;
    document.querySelector('#confidence-meter').style.width = `${result.confidence * 100}%`;
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