// index.js - BOOM TEN Main Entry Point
(function () {
  'use strict';

  // ─── DOMContentLoaded bootstrap ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 BOOM TEN - Initializing...');

    // Verify the canvas exists before attempting any engine setup
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      console.error('[index.js] Canvas element #game-canvas not found! Aborting.');
      return;
    }

    // ── 1. Game Engine ─────────────────────────────────────────────────────
    if (!window.BoomTen || !BoomTen.Game) {
      console.error('[index.js] BoomTen.Game module not loaded. Check js/game.js.');
      return;
    }
    BoomTen.Game.init(canvas);
    console.log('✅ Game Engine initialized');

    // ── 2. Effects ─────────────────────────────────────────────────────────
    // BoomTen.Effects is self-contained; it initialises lazily when first used.
    // If the module exposes an init(), call it; otherwise it is already ready.
    if (BoomTen.Effects && typeof BoomTen.Effects.init === 'function') {
      BoomTen.Effects.init();
    }
    console.log('✅ Effects system ready');

    // ── 3. Drag System ─────────────────────────────────────────────────────
    if (!BoomTen.Drag) {
      console.error('[index.js] BoomTen.Drag module not loaded. Check js/drag.js.');
      return;
    }
    BoomTen.Drag.init();
    console.log('✅ Drag system initialized');

    // ── 4. UI Controller ───────────────────────────────────────────────────
    if (!BoomTen.UI) {
      console.error('[index.js] BoomTen.UI module not loaded. Check js/ui.js.');
      return;
    }
    BoomTen.UI.init();
    console.log('✅ UI controller initialized');

    // ── Show splash ────────────────────────────────────────────────────────
    BoomTen.UI.showScreen('splash');
    console.log('🚀 BOOM TEN ready!');

    // ── PWA Service Worker ─────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then(reg => {
          console.log('✅ Service Worker registered', reg.scope);
        })
        .catch(err => {
          // Non-fatal: game runs fine without the SW
          console.warn('[index.js] Service Worker registration failed:', err);
        });
    }
  });
})();
