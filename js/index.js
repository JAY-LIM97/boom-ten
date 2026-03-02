// index.js - Planet 2048 Main Entry Point (2048 + Suika Game Hybrid)
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    console.log('Planet 2048 - Initializing...');

    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
      console.error('[index.js] Canvas element #game-canvas not found! Aborting.');
      return;
    }

    // ── 1. Game Engine ─────────────────────────────────────────────────────
    if (!window.BoomTen || !BoomTen.Game) {
      console.error('[index.js] BoomTen.Game module not loaded.');
      return;
    }
    BoomTen.Game.init(canvas);
    console.log('Game Engine initialized');

    // ── 2. Effects ─────────────────────────────────────────────────────────
    if (BoomTen.Effects && typeof BoomTen.Effects.init === 'function') {
      BoomTen.Effects.init();
    }
    console.log('Effects system ready');

    // ── 3. Drop System (replaces Drag) ─────────────────────────────────────
    if (!BoomTen.Drop) {
      console.error('[index.js] BoomTen.Drop module not loaded. Check js/drop.js.');
      return;
    }
    BoomTen.Drop.init();
    console.log('Drop system initialized');

    // ── 4. UI Controller ───────────────────────────────────────────────────
    if (!BoomTen.UI) {
      console.error('[index.js] BoomTen.UI module not loaded.');
      return;
    }
    BoomTen.UI.init();
    console.log('UI controller initialized');

    // ── Show splash ────────────────────────────────────────────────────────
    BoomTen.UI.showScreen('splash');
    console.log('Planet 2048 ready!');

    // ── PWA Service Worker ─────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then(reg => {
          console.log('Service Worker registered', reg.scope);
        })
        .catch(err => {
          console.warn('[index.js] Service Worker registration failed:', err);
        });
    }
  });
})();
