(() => {
  'use strict';

  const MIN_RATE = 0.1;
  const MAX_RATE = 16;
  const STEP = 0.1;

  const DEFAULTS = {
    speed: 1.0,
    preservePitch: true,
    muteOnHigh: true,
    muteThreshold: 4.0,
  };

  const state = { ...DEFAULTS };

  const clampRate = (r) => Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(r * 10) / 10));

  // ---- video registry ------------------------------------------------

  const videos = new Set();
  const autoMuted = new WeakMap(); // video -> true (we muted it)

  function setRate(video) {
    try {
      video.playbackRate = state.speed;
    } catch (_) {}
    try {
      if ('preservesPitch' in video) video.preservesPitch = state.preservePitch;
      else if ('webkitPreservesPitch' in video) video.webkitPreservesPitch = state.preservePitch;
    } catch (_) {}
  }

  function updateMute(video) {
    const shouldMute = state.muteOnHigh && state.speed >= state.muteThreshold;
    if (shouldMute) {
      if (!video.muted && !autoMuted.has(video)) {
        autoMuted.set(video, true);
        video.muted = true;
      }
    } else if (autoMuted.has(video)) {
      autoMuted.delete(video);
      video.muted = false;
    }
  }

  function applyToVideo(video) {
    setRate(video);
    updateMute(video);
  }

  function applyAll() {
    for (const video of videos) applyToVideo(video);
  }

  function watch(video) {
    if (videos.has(video)) return;
    videos.add(video);
    video.addEventListener('loadeddata', onMediaEvent);
    video.addEventListener('play', onMediaEvent);
    video.addEventListener('pointerenter', onVideoEnter);
    video.addEventListener('pointerleave', onVideoLeave);
    applyToVideo(video);
  }

  function unwatch(video) {
    videos.delete(video);
    video.removeEventListener('loadeddata', onMediaEvent);
    video.removeEventListener('play', onMediaEvent);
    video.removeEventListener('pointerenter', onVideoEnter);
    video.removeEventListener('pointerleave', onVideoLeave);
  }

  function onMediaEvent(event) {
    applyToVideo(event.currentTarget);
  }

  function scanRoot(root) {
    if (!root) return;
    if (root instanceof HTMLVideoElement) watch(root);
    if (typeof root.querySelectorAll === 'function') {
      for (const v of root.querySelectorAll('video')) watch(v);
    }
  }

  // ---- speed changes ---------------------------------------------------

  function setSpeed(rate) {
    const r = clampRate(rate);
    state.speed = r;
    chrome.storage.local.set({ speed: r }).catch(() => {});
    applyAll();
    showOsd(r);
    if (overlayVisible) syncOverlayLabel();
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'baisoku:command') return;
    if (msg.command === 'speed-up') setSpeed(state.speed + STEP);
    else if (msg.command === 'speed-down') setSpeed(state.speed - STEP);
    else if (msg.command === 'speed-reset') setSpeed(1.0);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let touched = false;
    if (changes.speed) {
      const r = clampRate(changes.speed.newValue);
      if (r !== state.speed) {
        state.speed = r;
        showOsd(r);
      }
      touched = true;
    }
    if (changes.preservePitch) {
      state.preservePitch = !!changes.preservePitch.newValue;
      touched = true;
    }
    if (changes.muteOnHigh) {
      state.muteOnHigh = !!changes.muteOnHigh.newValue;
      touched = true;
    }
    if (changes.muteThreshold) {
      state.muteThreshold = Number(changes.muteThreshold.newValue) || DEFAULTS.muteThreshold;
      touched = true;
    }
    if (touched) {
      applyAll();
      if (overlayVisible) syncOverlayLabel();
    }
  });

  // ---- shadow DOM helper -----------------------------------------------

  function applyShadowCss(shadow, css) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      shadow.adoptedStyleSheets = [sheet];
    } catch (_) {
      const style = document.createElement('style');
      style.textContent = css;
      shadow.appendChild(style);
    }
  }

  function fullscreenParent() {
    return document.fullscreenElement || document.documentElement;
  }

  function firstVideo() {
    for (const v of videos) {
      if (v.isConnected && v.getClientRects().length) return v;
    }
    return null;
  }

  // ---- OSD ---------------------------------------------------------------

  let osdHost = null;
  let osdBox = null;
  let osdLabel = null;

  function ensureOsd() {
    if (osdHost) return;
    osdHost = document.createElement('div');
    osdHost.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;';
    const shadow = osdHost.attachShadow({ mode: 'closed' });
    applyShadowCss(shadow, `
      .box {
        position: fixed;
        font: 600 16px/1 system-ui, sans-serif;
        color: #fff;
        background: rgba(15, 15, 20, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 8px;
        padding: 6px 12px;
        opacity: 0;
        white-space: nowrap;
      }
      .run { animation: bsk-osd 1.1s ease forwards; }
      @keyframes bsk-osd {
        0% { opacity: 0; transform: translateY(-6px); }
        12% { opacity: 1; transform: none; }
        70% { opacity: 1; }
        100% { opacity: 0; }
      }
    `);
    osdBox = document.createElement('div');
    osdBox.className = 'box';
    osdLabel = document.createElement('span');
    osdBox.appendChild(osdLabel);
    shadow.appendChild(osdBox);
    osdBox.addEventListener('animationend', () => osdBox.classList.remove('run'));
  }

  function showOsd(rate) {
    ensureOsd();
    const parent = fullscreenParent();
    if (osdHost.parentNode !== parent) parent.appendChild(osdHost);
    osdLabel.textContent = rate.toFixed(1) + 'x';

    const w = osdHost.offsetWidth;
    const h = osdHost.offsetHeight;
    let x = window.innerWidth - w - 16;
    let y = 16;
    const video = (overlayVisible && overlayVideo) || firstVideo();
    if (video) {
      const rect = video.getBoundingClientRect();
      if (rect.width > 0) {
        x = rect.right - w - 12;
        y = rect.top + 12;
      }
    }
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    osdHost.style.left = x + 'px';
    osdHost.style.top = y + 'px';

    osdBox.classList.remove('run');
    void osdBox.offsetWidth;
    osdBox.classList.add('run');
  }

  // ---- hover overlay -------------------------------------------------------

  let overlayHost = null;
  let overlayBox = null;
  let overlayRate = null;
  let overlayVideo = null;
  let overlayVisible = false;
  let overlayHideTimer = 0;

  function ensureOverlay() {
    if (overlayHost) return;
    overlayHost = document.createElement('div');
    overlayHost.style.cssText = 'all:initial;position:fixed;left:0;top:0;z-index:2147483647;';
    const shadow = overlayHost.attachShadow({ mode: 'closed' });
    applyShadowCss(shadow, `
      .box {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 4px;
        background: rgba(15, 15, 20, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 10px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        font: 600 13px/1 system-ui, sans-serif;
        color: #fff;
        opacity: 0;
        transition: opacity 0.15s ease;
        user-select: none;
      }
      .visible { opacity: 1; }
      button {
        all: unset;
        box-sizing: border-box;
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        border-radius: 7px;
        font: 600 14px/1 system-ui, sans-serif;
        color: #fff;
        cursor: pointer;
      }
      button:hover { background: rgba(255, 255, 255, 0.14); }
      button:active { background: rgba(255, 255, 255, 0.26); }
      .rate {
        min-width: 44px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .reset { width: 30px; font-size: 12px; }
    `);
    overlayBox = document.createElement('div');
    overlayBox.className = 'box';

    const mkButton = (text, className, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      if (className) b.className = className;
      b.addEventListener('click', fn);
      return b;
    };
    overlayBox.appendChild(mkButton('\u2212', null, () => setSpeed(state.speed - STEP)));
    overlayRate = document.createElement('span');
    overlayRate.className = 'rate';
    overlayBox.appendChild(overlayRate);
    overlayBox.appendChild(mkButton('+', null, () => setSpeed(state.speed + STEP)));
    overlayBox.appendChild(mkButton('1x', 'reset', () => setSpeed(1.0)));
    shadow.appendChild(overlayBox);

    overlayBox.addEventListener('pointerenter', () => clearTimeout(overlayHideTimer));
    overlayBox.addEventListener('pointerleave', scheduleOverlayHide);
    overlayBox.addEventListener('pointerdown', (e) => e.stopPropagation());

    window.addEventListener('scroll', repositionOverlay, { passive: true, capture: true });
    window.addEventListener('resize', repositionOverlay, { passive: true });
    document.addEventListener('fullscreenchange', () => {
      if (overlayVisible && overlayVideo && overlayVideo.isConnected) {
        showOverlay(overlayVideo);
      }
    });
  }

  function showOverlay(video) {
    ensureOverlay();
    overlayVideo = video;
    clearTimeout(overlayHideTimer);
    const parent = fullscreenParent();
    if (overlayHost.parentNode !== parent) parent.appendChild(overlayHost);
    syncOverlayLabel();
    overlayVisible = true;
    repositionOverlay();
    overlayBox.classList.add('visible');
  }

  function scheduleOverlayHide() {
    clearTimeout(overlayHideTimer);
    overlayHideTimer = setTimeout(() => {
      overlayVisible = false;
      if (overlayBox) overlayBox.classList.remove('visible');
    }, 500);
  }

  function repositionOverlay() {
    if (!overlayHost || !overlayVisible || !overlayVideo || !overlayVideo.isConnected) return;
    const rect = overlayVideo.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 24) {
      overlayBox.classList.remove('visible');
      overlayVisible = false;
      return;
    }
    const w = overlayHost.offsetWidth;
    const h = overlayHost.offsetHeight;
    const bottomGap = Math.min(60, Math.max(8, rect.height - h - 8));
    let x = rect.right - w - 12;
    let y = rect.bottom - h - bottomGap;
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    overlayHost.style.left = x + 'px';
    overlayHost.style.top = y + 'px';
  }

  function syncOverlayLabel() {
    if (overlayRate) overlayRate.textContent = state.speed.toFixed(1) + 'x';
  }

  function onVideoEnter(event) {
    showOverlay(event.currentTarget);
  }

  function onVideoLeave() {
    scheduleOverlayHide();
  }

  // ---- dynamic video discovery -------------------------------------------

  let lastSweep = 0;
  function sweep(now) {
    if (now - lastSweep < 2000) return;
    lastSweep = now;
    for (const v of Array.from(videos)) {
      if (!v.isConnected) unwatch(v);
    }
    if (overlayVideo && !overlayVideo.isConnected) {
      overlayVideo = null;
      overlayVisible = false;
      if (overlayBox) overlayBox.classList.remove('visible');
    }
  }

  const observer = new MutationObserver((records) => {
    for (const rec of records) {
      for (const node of rec.addedNodes) scanRoot(node);
    }
    sweep(performance.now());
  });

  // ---- init ----------------------------------------------------------------

  scanRoot(document);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.local
    .get(DEFAULTS)
    .then((stored) => {
      state.speed = clampRate(Number(stored.speed) || DEFAULTS.speed);
      state.preservePitch = stored.preservePitch !== false;
      state.muteOnHigh = stored.muteOnHigh !== false;
      state.muteThreshold = Number(stored.muteThreshold) || DEFAULTS.muteThreshold;
      applyAll();
      if (overlayVisible) syncOverlayLabel();
    })
    .catch(() => applyAll());
})();
