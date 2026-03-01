// drag.js - BOOM TEN Drag Detection & Match-10 Logic
window.BoomTen = window.BoomTen || {};

window.BoomTen.Drag = (function() {
  const { Body } = Matter;

  let dragOverlay, sumIndicator;
  let isDragging = false;
  let dragPath = []; // [{x, y}]
  let selectedBodies = new Set(); // Set of Matter.Body
  let currentSum = 0;
  let activeTouchId = null;

  const DETECTION_RADIUS = 35;

  function init() {
    dragOverlay = document.getElementById('drag-overlay');
    sumIndicator = document.getElementById('sum-indicator');

    const container = document.getElementById('canvas-container');

    // Mouse events
    container.addEventListener('mousedown', onPointerDown);
    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mouseup', onPointerUp);
    container.addEventListener('mouseleave', onPointerUp);

    // Touch events
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    // Edge case 6: end drag when tab loses focus / visibility changes
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
  }

  // ─── Visibility / Focus Edge Cases ───────────────────────────────────────────

  function onVisibilityChange() {
    if (document.hidden) {
      activeTouchId = null;
      endDrag();
    }
  }

  function onWindowBlur() {
    activeTouchId = null;
    endDrag();
  }

  // ─── Touch Handlers ───────────────────────────────────────────────────────────

  function onTouchStart(e) {
    e.preventDefault();
    // Edge case 1: Only first touch — if activeTouchId is already set, ignore
    if (activeTouchId !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId = touch.identifier;
    startDrag(getTouchPos(touch));
  }

  function onTouchMove(e) {
    e.preventDefault();
    const touch = findActiveTouch(e.changedTouches);
    if (!touch) return;
    moveDrag(getTouchPos(touch));
  }

  function onTouchEnd(e) {
    const touch = findActiveTouch(e.changedTouches);

    if (!touch) {
      // The specific changed touch we care about wasn't in changedTouches,
      // but check if it is still present in the remaining active touches
      if (activeTouchId !== null) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === activeTouchId) return; // still touching
        }
      }
    }

    // Active touch has ended
    activeTouchId = null;
    endDrag();
  }

  // ─── Mouse Handlers ───────────────────────────────────────────────────────────

  function onPointerDown(e) {
    if (e.button !== 0) return; // left click only
    startDrag({ x: e.offsetX, y: e.offsetY });
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    moveDrag({ x: e.offsetX, y: e.offsetY });
  }

  function onPointerUp() {
    endDrag();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function findActiveTouch(touchList) {
    for (let i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === activeTouchId) return touchList[i];
    }
    return null;
  }

  function getTouchPos(touch) {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  // ─── Core Drag Logic ──────────────────────────────────────────────────────────

  function startDrag(pos) {
    // Edge case 5: Block input during magnet animation
    if (!BoomTen.Game || BoomTen.Game.state.gameState !== 'playing') return;
    if (BoomTen.Game.state.isAnimating) return;

    isDragging = true;
    dragPath = [pos];
    selectedBodies.clear();
    currentSum = 0;

    checkBodiesAtPoint(pos);
    updateDragVisuals();
    updateSumIndicator(pos);
  }

  function moveDrag(pos) {
    if (!isDragging) return;

    // Edge case 5: Stop processing if animation started mid-drag
    if (BoomTen.Game && BoomTen.Game.state.isAnimating) {
      endDrag();
      return;
    }

    dragPath.push(pos);
    checkBodiesAtPoint(pos);
    updateDragVisuals();
    updateSumIndicator(pos);
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (currentSum === 10 && selectedBodies.size >= 2) {
      // SUCCESS — trigger magnet effect
      triggerMatch([...selectedBodies]);
    } else if (selectedBodies.size > 0) {
      // FAIL — shake animation for visual feedback
      shakeSelected();
      // Deselect all immediately after shake is applied
      BoomTen.Game.balls.forEach(b => {
        if (b.gameData) b.gameData.selected = false;
      });
    }

    // Clear visuals
    clearDragVisuals();
    dragPath = [];
    selectedBodies.clear();
    currentSum = 0;
  }

  // ─── Body Detection ───────────────────────────────────────────────────────────

  function checkBodiesAtPoint(pos) {
    if (!BoomTen.Game || !BoomTen.Game.balls) return;

    const allBodies = BoomTen.Game.balls;

    allBodies.forEach(body => {
      // Edge case 3: Set prevents the same ball from being selected twice
      if (selectedBodies.has(body)) return;

      // Guard: body must have gameData
      if (!body.gameData) return;

      const dx = body.position.x - pos.x;
      const dy = body.position.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < body.gameData.radius + DETECTION_RADIUS) {
        const newSum = currentSum + body.gameData.number;

        // Edge case 4: If adding this body would exceed 10, skip — do NOT break drag
        if (newSum <= 10) {
          selectedBodies.add(body);
          body.gameData.selected = true;
          currentSum = newSum;

          // Haptic feedback if available
          if (navigator.vibrate) navigator.vibrate(20);
        }
        // newSum > 10: body is skipped, drag continues normally
      }
    });
  }

  // ─── Visuals ──────────────────────────────────────────────────────────────────

  function updateDragVisuals() {
    if (!dragOverlay) return;
    if (dragPath.length < 2) return;

    let pathStr = `M ${dragPath[0].x} ${dragPath[0].y}`;
    for (let i = 1; i < dragPath.length; i++) {
      pathStr += ` L ${dragPath[i].x} ${dragPath[i].y}`;
    }

    let color = 'rgba(255, 255, 255, 0.6)'; // default white
    let strokeWidth = 3;

    if (currentSum === 10) {
      color = '#00FF88'; // green — perfect!
      strokeWidth = 5;
    } else if (currentSum > 7) {
      color = '#FFD700'; // gold — getting close
      strokeWidth = 4;
    }

    // Build circles around selected bodies
    let circles = '';
    selectedBodies.forEach(body => {
      const r = body.gameData.radius + 5;
      circles += `<circle cx="${body.position.x}" cy="${body.position.y}" r="${r}" ` +
                 `stroke="${color}" stroke-width="2" fill="none" opacity="0.6"/>`;
    });

    // Reuse existing SVG children or create them once to avoid innerHTML per frame
    let pathEl = dragOverlay.querySelector('#drag-path');
    if (!pathEl) {
      pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.id = 'drag-path';
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke-linecap', 'round');
      pathEl.setAttribute('stroke-linejoin', 'round');
      pathEl.setAttribute('filter', 'url(#glow-filter)');
      pathEl.setAttribute('opacity', '0.8');
      dragOverlay.appendChild(pathEl);
    }
    pathEl.setAttribute('d', pathStr);
    pathEl.setAttribute('stroke', color);
    pathEl.setAttribute('stroke-width', strokeWidth);

    // Clear old selection circles, rebuild
    dragOverlay.querySelectorAll('.sel-circle').forEach(el => el.remove());
    selectedBodies.forEach(body => {
      const r = body.gameData.radius + 5;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.classList.add('sel-circle');
      circle.setAttribute('cx', body.position.x);
      circle.setAttribute('cy', body.position.y);
      circle.setAttribute('r', r);
      circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('fill', 'none');
      circle.setAttribute('opacity', '0.6');
      dragOverlay.appendChild(circle);
    });
  }

  function updateSumIndicator(pos) {
    if (!sumIndicator) return;

    if (selectedBodies.size === 0) {
      sumIndicator.classList.add('hidden');
      return;
    }

    sumIndicator.classList.remove('hidden');
    sumIndicator.style.left = pos.x + 'px';
    sumIndicator.style.top = pos.y + 'px';

    const badge = sumIndicator.querySelector('.sum-badge');
    const sumValueEl = document.getElementById('sum-value');

    if (badge) {
      badge.classList.remove('over', 'exact');
      if (currentSum === 10) {
        badge.classList.add('exact');
      } else if (currentSum > 7) {
        // close to target - no extra class needed, default cyan border
      }
    }

    if (sumValueEl) {
      sumValueEl.textContent = currentSum === 10 ? '10!' : currentSum;
    }
  }

  function clearDragVisuals() {
    if (dragOverlay) {
      // Remove dynamic elements but keep the <defs> filter
      const pathEl = dragOverlay.querySelector('#drag-path');
      if (pathEl) pathEl.remove();
      dragOverlay.querySelectorAll('.sel-circle').forEach(el => el.remove());
    }
    if (sumIndicator) sumIndicator.classList.add('hidden');
  }

  // ─── Match Logic ──────────────────────────────────────────────────────────────

  function triggerMatch(bodies) {
    const game = BoomTen.Game;

    // Edge case 5: Lock input during animation
    game.state.isAnimating = true;

    // Deselect visual state (selection glow handled by renderer)
    bodies.forEach(b => {
      if (b.gameData) b.gameData.selected = false;
    });

    // Calculate centroid of matched bodies
    let cx = 0, cy = 0;
    bodies.forEach(b => { cx += b.position.x; cy += b.position.y; });
    cx /= bodies.length;
    cy /= bodies.length;

    // Disable gravity and friction, apply velocity toward centroid (magnet effect)
    bodies.forEach(body => {
      Body.set(body, 'gravityScale', 0);
      Body.set(body, 'frictionAir', 0);

      const dx = cx - body.position.x;
      const dy = cy - body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 8;

      Body.setVelocity(body, {
        x: (dx / dist) * speed,
        y: (dy / dist) * speed
      });
    });

    // After 300ms bodies have converged — remove them and trigger effects
    setTimeout(() => {
      // Particle explosion at centroid
      if (BoomTen.Effects) {
        BoomTen.Effects.explode(cx, cy, bodies.map(b => b.gameData.color));
      }

      // Add score via game module
      const points = game.addScore(bodies.length);

      // Floating score text
      if (BoomTen.Effects) {
        BoomTen.Effects.floatingText(cx, cy - 30, `+${points}`, game.state.combo);
      }

      // Remove matched balls from the world
      game.removeBalls(bodies);

      // Spawn replacement balls after a short delay
      setTimeout(() => {
        const maxNew = BoomTen.Game.MAX_BALLS - game.balls.length;
        const count = Math.min(bodies.length, maxNew);
        for (let i = 0; i < count; i++) {
          setTimeout(() => game.createBall(), i * 200);
        }
        // Unlock input
        game.state.isAnimating = false;
      }, 400);
    }, 300);
  }

  function shakeSelected() {
    selectedBodies.forEach(body => {
      // Quick random impulse for shake feel
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5,
        y: -2
      });
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  return {
    init,
    get isDragging() { return isDragging; },
    get currentSum() { return currentSum; },
    get selectedBodies() { return selectedBodies; },
  };
})();

// BoomTen namespace is already on window.
