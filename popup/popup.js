'use strict';

const $ = (id) => document.getElementById(id);

const MIN_RATE = 0.1;
const MAX_RATE = 16;
const LOG_MIN = Math.log10(MIN_RATE);
const LOG_MAX = Math.log10(MAX_RATE);

const DEFAULTS = { speed: 1.0, preservePitch: true, muteOnHigh: true, muteThreshold: 4.0 };

let speed = DEFAULTS.speed;

const clampRate = (r) => Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(r * 10) / 10));
const posFromRate = (r) => (Math.log10(r) - LOG_MIN) / (LOG_MAX - LOG_MIN);
const rateFromPos = (p) => Math.round(10 ** (LOG_MIN + p * (LOG_MAX - LOG_MIN)) * 10) / 10;

function render() {
  $('value').textContent = speed.toFixed(1) + 'x';
  $('slider').value = String(Math.round(posFromRate(speed) * 1000));
  const muteOn = $('mute').checked;
  $('threshold').disabled = !muteOn;
  $('thresholdRow').classList.toggle('off', !muteOn);
}

function setSpeed(rate) {
  speed = clampRate(rate);
  chrome.storage.local.set({ speed }).catch(() => {});
  render();
}

$('inc').addEventListener('click', () => setSpeed(speed + 0.1));
$('dec').addEventListener('click', () => setSpeed(speed - 0.1));
$('reset').addEventListener('click', () => setSpeed(1.0));

$('slider').addEventListener('input', (e) => {
  const r = rateFromPos(Number(e.target.value) / 1000);
  if (r !== speed) setSpeed(r);
});

$('pitch').addEventListener('change', (e) => {
  chrome.storage.local.set({ preservePitch: e.target.checked }).catch(() => {});
});

$('mute').addEventListener('change', (e) => {
  chrome.storage.local.set({ muteOnHigh: e.target.checked }).catch(() => {});
  render();
});

$('threshold').addEventListener('change', (e) => {
  chrome.storage.local.set({ muteThreshold: Number(e.target.value) }).catch(() => {});
});

chrome.storage.local
  .get(DEFAULTS)
  .then((s) => {
    speed = clampRate(Number(s.speed) || DEFAULTS.speed);
    $('pitch').checked = s.preservePitch !== false;
    $('mute').checked = s.muteOnHigh !== false;
    const t = String(Number(s.muteThreshold) || DEFAULTS.muteThreshold);
    for (const o of $('threshold').options) {
      if (o.value === t) $('threshold').value = t;
    }
    render();
  })
  .catch(() => render());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.speed) return;
  speed = clampRate(changes.speed.newValue);
  render();
});
