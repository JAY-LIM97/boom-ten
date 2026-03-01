// drop.js - BOOM TEN Drop Control (2048 + Suika Game Hybrid)
// Handles player input for choosing drop position and releasing balls.
// Replaces the old drag.js module.

window.BoomTen = window.BoomTen || {};

window.BoomTen.Drop = (function () {
  'use strict';

  /** Canvas element reference. */
  let canvas;

  /** Current pointer X position for ghost preview. -1 = no pointer. */
  let pointerX = -1;

  /** Whether the pointer is currently over the canvas. */
  let pointerActive = false;

  // ─── init ──────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Mouse events
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onMouseClick);
    container.addEventListener('mouseleave', onMouseLeave);

    // Touch events
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchCancel);

    // Visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pointerActive = false;
        pointerX = -1;
      }
    });
  }

  // ─── Mouse Handlers ────────────────────────────────────────────────
  function onMouseMove(e) {
    pointerX = e.offsetX;
    pointerActive = true;
  }

  function onMouseClick(e) {
    dropBall(e.offsetX);
  }

  function onMouseLeave() {
    pointerActive = false;
    pointerX = -1;
  }

  // ─── Touch Handlers ─────────────────────────────────────────────────
  function onTouchStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = getTouchPos(touch);
    pointerX = pos.x;
    pointerActive = true;
  }

  function onTouchMove(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const pos = getTouchPos(touch);
    pointerX = pos.x;
  }

  function onTouchEnd(e) {
    if (pointerActive && pointerX >= 0) {
      dropBall(pointerX);
    }
    // Keep preview visible for a moment (don't reset immediately)
    setTimeout(() => {
      pointerActive = false;
      pointerX = -1;
    }, 100);
  }

  function onTouchCancel() {
    pointerActive = false;
    pointerX = -1;
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  function getTouchPos(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  // ─── Drop Logic ─────────────────────────────────────────────────────
  /**
   * Drop the pre-rolled ball at the given X position.
   * Respects cooldown and game state.
   */
  function dropBall(x) {
    const game = BoomTen.Game;
    if (!game) return;
    if (game.state.gameState !== 'playing') return;
    if (!game.state.canDrop) return;

    const number = game.state.nextBallNumber;
    if (number == null) return;

    // Drop Y position: just below the drop zone line
    const dropY = game.canvasHeight * game.DROP_ZONE_HEIGHT_PERCENT + 10;

    // Clamp X within walls
    const radius = game.ballRadius(number);
    const clampedX = Math.max(radius + 5, Math.min(game.canvasWidth - radius - 5, x));

    // Create the ball
    const ball = game.createBallAt(clampedX, dropY, number);
    if (!ball) return;

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);

    // Start cooldown
    game.state.canDrop = false;
    game.state.dropCooldownTimer = setTimeout(() => {
      game.state.canDrop = true;
    }, game.DROP_COOLDOWN);

    // Roll next ball
    game.rollNextBall();

    // Update UI preview
    if (BoomTen.UI && BoomTen.UI.updateNextBall) {
      BoomTen.UI.updateNextBall(
        game.state.nextBallNumber,
        game.COLORS[game.state.nextBallNumber]
      );
    }
  }

  // ─── Render Ghost Preview ──────────────────────────────────────────
  /**
   * Draw the ghost preview ball and drop guide line.
   * Called from Game's renderLoop each frame.
   *
   * @param {CanvasRenderingContext2D} renderCtx
   */
  function renderPreview(renderCtx) {
    const game = BoomTen.Game;
    if (!game || game.state.gameState !== 'playing') return;
    if (pointerX < 0) return;

    const number = game.state.nextBallNumber;
    if (number == null) return;

    const radius = game.ballRadius(number);
    const dropZoneY = game.canvasHeight * game.DROP_ZONE_HEIGHT_PERCENT;
    const clampedX = Math.max(radius + 5, Math.min(game.canvasWidth - radius - 5, pointerX));

    renderCtx.save();

    // Vertical guide line (dashed, from ghost ball down to bottom)
    renderCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    renderCtx.lineWidth = 1;
    renderCtx.setLineDash([4, 8]);
    renderCtx.beginPath();
    renderCtx.moveTo(clampedX, dropZoneY + radius);
    renderCtx.lineTo(clampedX, game.canvasHeight);
    renderCtx.stroke();
    renderCtx.setLineDash([]);

    // Ghost ball (semi-transparent)
    const color = game.COLORS[number] || '#AAAAAA';
    renderCtx.globalAlpha = game.state.canDrop ? 0.5 : 0.2;

    // Ball body
    renderCtx.beginPath();
    renderCtx.arc(clampedX, dropZoneY, radius, 0, Math.PI * 2);
    renderCtx.fillStyle = color;
    renderCtx.fill();

    // Number label
    renderCtx.globalAlpha = game.state.canDrop ? 0.7 : 0.3;
    renderCtx.fillStyle = '#FFFFFF';
    const fontSize = number >= 100 ? radius * 0.6 : radius * 0.85;
    renderCtx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    renderCtx.textAlign = 'center';
    renderCtx.textBaseline = 'middle';
    renderCtx.fillText(number, clampedX, dropZoneY + 1);

    renderCtx.restore();
  }

  // ─── Public API ────────────────────────────────────────────────────
  return {
    init,
    renderPreview,
    get pointerX() { return pointerX; },
    get pointerActive() { return pointerActive; },
  };
})();
