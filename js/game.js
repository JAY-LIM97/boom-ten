// game.js - Planet 2048 Physics Engine Core (2048 + Suika Game Hybrid)
// Uses Matter.js globals: Matter.Engine, Matter.World, Matter.Bodies, Matter.Body,
//                         Matter.Events, Matter.Runner, Matter.Query, Matter.Composite
//
// Matter.js is loaded via CDN and is available as the global `Matter` object.
// This module is wrapped in an IIFE and exposed on window.BoomTen.Game.

window.BoomTen = window.BoomTen || {};

window.BoomTen.Game = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Matter.js aliases (destructured from the global Matter object at load time)
  // ---------------------------------------------------------------------------
  const { Engine, Bodies, Body, Events, Runner, Query, Composite } = Matter;

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** Planet colors keyed by number value (powers of 2). */
  const PLANET_COLORS = {
    1:    '#8B7355',   // asteroid brown-gray
    2:    '#C0C0C0',   // moon silver
    4:    '#C1440E',   // mars rust
    8:    '#1E90FF',   // earth blue
    16:   '#3355FF',   // neptune deep blue
    32:   '#DAA520',   // saturn gold
    64:   '#D2691E',   // jupiter orange-brown
    128:  '#FF4500',   // red giant
    256:  '#4488FF',   // blue star
    512:  '#FFD700',   // supergiant gold
    1024: '#E0E0FF',   // neutron star white-blue
    2048: '#FF6B00',   // black hole accretion orange
  };
  /** Backward-compat alias */
  const COLORS = PLANET_COLORS;

  /**
   * Spawn-weight table for player drops.
   * Only small values spawn; larger values come from merging.
   * Distribution: 1→40%, 2→30%, 4→20%, 8→10%
   */
  const SPAWN_WEIGHTS = [
    // 1 – 40 entries (40%)
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    // 2 – 30 entries (30%)
    2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
    2,2,2,2,2,2,2,2,2,2,
    // 4 – 20 entries (20%)
    4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
    // 8 – 10 entries (10%)
    8,8,8,8,8,8,8,8,8,8,
  ]; // length === 100

  /** Hard cap on simultaneous physics bodies (balls). */
  const MAX_BALLS = 80;

  /**
   * Vertical position of the "danger line" expressed as a fraction of canvas
   * height measured from the top (0 = top edge, 1 = bottom edge).
   */
  const DANGER_LINE_PERCENT = 0.15;

  /**
   * How long (ms) a ball must remain above the danger line without moving
   * before triggering game-over.
   */
  const DANGER_TIME_LIMIT = 3000;

  /** Height of the drop zone at the top of the screen (fraction). */
  const DROP_ZONE_HEIGHT_PERCENT = 0.10;

  /** Cooldown between drops in milliseconds. */
  const DROP_COOLDOWN = 500;

  /**
   * Calculate ball radius from its number value.
   * Larger numbers = bigger balls. Uses log2 for 2048-style scaling.
   * @param {number} number - The ball's number value (power of 2).
   * @returns {number} Radius in pixels.
   */
  function ballRadius(number) {
    return 16 + Math.log2(Math.max(1, number)) * 4 + 2;
  }

  // ---------------------------------------------------------------------------
  // Module-level variables
  // ---------------------------------------------------------------------------

  /** Matter.js Engine instance. */
  let engine;

  /** Matter.js Runner instance. */
  let runner;

  /** HTMLCanvasElement used for rendering. */
  let canvas;

  /** 2-D rendering context for the canvas. */
  let ctx;

  /** Logical width of the canvas in CSS pixels. */
  let canvasWidth;

  /** Logical height of the canvas in CSS pixels. */
  let canvasHeight;

  /**
   * Live array of all active ball physics bodies.
   * Each body has a `.gameData` property (see createBallAt).
   * @type {Matter.Body[]}
   */
  let balls = [];

  /**
   * Static boundary bodies (floor, left wall, right wall).
   * Rebuilt whenever the canvas is resized.
   * @type {Matter.Body[]}
   */
  let walls = [];

  /**
   * Mutable game state object.  Accessed from outside via the `state` getter.
   */
  let state = {
    score: 0,                // score = highest ball number
    bestScore: parseInt(localStorage.getItem('boomten_best') || '0', 10),
    combo: 0,
    comboTimer: null,
    gameState: 'splash',     // 'splash' | 'playing' | 'paused' | 'gameover'
    isAnimating: false,
    dangerBodies: new Map(), // Map<bodyId, timestampMs>
    // Suika/2048 merge state
    nextBallNumber: null,
    canDrop: true,
    dropCooldownTimer: null,
    merging: new Set(),      // Set<bodyId> to prevent double-processing
  };

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /**
   * Initialise the physics engine and canvas.
   * Must be called once before any other method.
   *
   * @param {HTMLCanvasElement} canvasElement - The target canvas.
   * @returns {{ engine: Matter.Engine, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
   */
  function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');

    // Create the physics engine with downward gravity.
    engine = Engine.create({
      gravity: { x: 0, y: 1.5 },
    });

    // Size the canvas to its container and set up responsive handling.
    resize();
    window.addEventListener('resize', resize);

    return { engine, canvas, ctx };
  }

  // ---------------------------------------------------------------------------
  // Resize handling
  // ---------------------------------------------------------------------------

  function resize() {
    const container = canvas.parentElement;
    canvasWidth  = container.clientWidth;
    canvasHeight = container.clientHeight;
    canvas.width  = canvasWidth;
    canvas.height = canvasHeight;

    rebuildWalls();
  }

  function rebuildWalls() {
    if (walls.length > 0) {
      walls.forEach(w => Composite.remove(engine.world, w));
      walls = [];
    }

    const wallOptions = {
      isStatic:    true,
      friction:    0.3,
      restitution: 0.2,
      label:       'wall',
    };

    const thickness = 20;

    const floor = Bodies.rectangle(
      canvasWidth / 2,
      canvasHeight + thickness / 2,
      canvasWidth,
      thickness,
      wallOptions
    );

    const leftWall = Bodies.rectangle(
      -thickness / 2,
      canvasHeight / 2,
      thickness,
      canvasHeight * 2,
      wallOptions
    );

    const rightWall = Bodies.rectangle(
      canvasWidth + thickness / 2,
      canvasHeight / 2,
      thickness,
      canvasHeight * 2,
      wallOptions
    );

    walls = [floor, leftWall, rightWall];
    Composite.add(engine.world, walls);
  }

  // ---------------------------------------------------------------------------
  // Ball management
  // ---------------------------------------------------------------------------

  /**
   * Create a ball with a specific number at a specific position.
   * Used by the drop system and merge logic.
   *
   * @param {number} x - Horizontal position.
   * @param {number} y - Vertical position.
   * @param {number} number - The ball's number value (power of 2).
   * @returns {Matter.Body|null}
   */
  function createBallAt(x, y, number) {
    if (balls.length >= MAX_BALLS) return null;

    const radius = ballRadius(number);
    const clampedX = Math.max(radius + 5, Math.min(canvasWidth - radius - 5, x));

    const body = Bodies.circle(clampedX, y, radius, {
      restitution: 0.3,
      friction:    0.1,
      frictionAir: 0.01,
      density:     0.001,
      label:       'ball',
    });

    body.gameData = {
      number:   number,
      color:    COLORS[number] || '#AAAAAA',
      radius:   radius,
      id: 'ball_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    };

    Composite.add(engine.world, body);
    balls.push(body);
    return body;
  }

  /**
   * Roll the next ball number from the spawn weights table.
   * Stores it in state.nextBallNumber for preview display.
   * @returns {number}
   */
  function rollNextBall() {
    state.nextBallNumber = SPAWN_WEIGHTS[Math.floor(Math.random() * SPAWN_WEIGHTS.length)];
    return state.nextBallNumber;
  }

  /**
   * Remove a single ball from the physics world and the balls array.
   * @param {Matter.Body} body
   */
  function removeBall(body) {
    Composite.remove(engine.world, body);
    balls = balls.filter(b => b !== body);
    state.dangerBodies.delete(body.gameData && body.gameData.id);
  }

  /**
   * Remove multiple balls in one batch operation.
   * @param {Matter.Body[]} bodyArray
   */
  function removeBalls(bodyArray) {
    const bodySet = new Set(bodyArray);
    bodyArray.forEach(b => {
      Composite.remove(engine.world, b);
      if (b.gameData) {
        state.dangerBodies.delete(b.gameData.id);
      }
    });
    balls = balls.filter(b => !bodySet.has(b));
  }

  // ---------------------------------------------------------------------------
  // Collision-based merge system (Suika + 2048)
  // ---------------------------------------------------------------------------

  /**
   * Register the Matter.js collision event handler for merge detection.
   */
  function setupCollisionHandler() {
    Events.off(engine, 'collisionStart', onCollisionStart);
    Events.on(engine, 'collisionStart', onCollisionStart);
  }

  /**
   * Collision event callback. Finds same-number ball pairs and triggers merges.
   */
  function onCollisionStart(event) {
    if (state.gameState !== 'playing') return;

    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      // Both must be balls (not walls)
      if (bodyA.label !== 'ball' || bodyB.label !== 'ball') continue;
      if (!bodyA.gameData || !bodyB.gameData) continue;

      // Skip if either body is already being merged
      const idA = bodyA.gameData.id;
      const idB = bodyB.gameData.id;
      if (state.merging.has(idA) || state.merging.has(idB)) continue;

      // Same number check
      if (bodyA.gameData.number === bodyB.gameData.number) {
        state.merging.add(idA);
        state.merging.add(idB);
        // Defer merge to avoid modifying physics world mid-step
        setTimeout(() => mergeBalls(bodyA, bodyB), 0);
      }
    }
  }

  /**
   * Merge two same-number balls into one ball with doubled value.
   * @param {Matter.Body} bodyA
   * @param {Matter.Body} bodyB
   */
  function mergeBalls(bodyA, bodyB) {
    // Safety: verify both bodies still exist
    if (!balls.includes(bodyA) || !balls.includes(bodyB)) {
      if (bodyA.gameData) state.merging.delete(bodyA.gameData.id);
      if (bodyB.gameData) state.merging.delete(bodyB.gameData.id);
      return;
    }

    const currentNumber = bodyA.gameData.number;
    const newNumber = currentNumber * 2; // 2048 style: double the value

    // Calculate midpoint for the new ball
    const midX = (bodyA.position.x + bodyB.position.x) / 2;
    const midY = (bodyA.position.y + bodyB.position.y) / 2;

    // Colors for particle effects
    const colors = [bodyA.gameData.color, bodyB.gameData.color];

    // Remove both balls
    removeBalls([bodyA, bodyB]);

    // Clean up merging set
    state.merging.delete(bodyA.gameData.id);
    state.merging.delete(bodyB.gameData.id);

    // Create the merged ball at the midpoint
    const newBall = createBallAt(midX, midY, newNumber);

    if (newBall) {
      // Particle burst for merge feedback
      if (BoomTen.Effects) {
        const newColor = COLORS[newNumber] || '#FFFFFF';
        BoomTen.Effects.explode(midX, midY, [newColor, ...colors]);

        // Big explosion for milestone numbers (128+)
        if (newNumber >= 128) {
          BoomTen.Effects.explode(midX, midY, [newColor, '#FFFFFF', '#FFD700']);
          BoomTen.Effects.triggerShake(8 + Math.log2(newNumber), 400);
        } else if (newNumber >= 32) {
          BoomTen.Effects.triggerShake(4, 200);
        }

        // Floating text showing the new number
        BoomTen.Effects.floatingText(midX, midY - 30, String(newNumber), state.combo);
      }

      // Update highest ball (score)
      updateHighest(newNumber);

      // Increment combo
      state.combo++;
      if (state.comboTimer) clearTimeout(state.comboTimer);
      state.comboTimer = setTimeout(() => { state.combo = 0; }, 2000);

      // Haptic
      if (navigator.vibrate) navigator.vibrate(newNumber >= 64 ? [30, 20, 50] : 20);
    }
  }

  /**
   * Update the score (highest ball number) if a new merge creates a higher value.
   * @param {number} newNumber - The merged ball's number.
   */
  function updateHighest(newNumber) {
    if (newNumber > state.score) {
      state.score = newNumber;

      // Persist best score
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        localStorage.setItem('boomten_best', state.bestScore.toString());
      }

      // Notify the UI layer
      if (BoomTen.UI) {
        BoomTen.UI.updateScore(state.score, state.combo, newNumber);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Game lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Reset all game state and start a fresh game session.
   */
  function startGame() {
    // Remove every live ball
    balls.forEach(b => Composite.remove(engine.world, b));
    balls = [];

    // Ensure canvas is sized (may be 0 if init ran while hidden)
    resize();

    // Reset game state
    state.score         = 0;
    state.combo         = 0;
    state.gameState     = 'playing';
    state.isAnimating   = false;
    state.dangerBodies.clear();
    state.merging.clear();
    state.canDrop       = true;
    state.nextBallNumber = null;

    if (state.comboTimer)        clearTimeout(state.comboTimer);
    if (state.dropCooldownTimer) clearTimeout(state.dropCooldownTimer);

    // Start physics
    if (runner) Runner.stop(runner);
    runner = Runner.create();
    Runner.run(runner, engine);

    // Set up collision-based merge detection
    setupCollisionHandler();

    // Roll the first "next ball" for preview
    rollNextBall();

    // Update the UI preview
    if (BoomTen.UI && BoomTen.UI.updateNextBall) {
      BoomTen.UI.updateNextBall(state.nextBallNumber, COLORS[state.nextBallNumber]);
    }

    // Update score display to 0
    if (BoomTen.UI) {
      BoomTen.UI.updateScore(0, 0, 0);
    }

    // Start the render loop
    requestAnimationFrame(renderLoop);
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------

  function renderLoop() {
    if (state.gameState !== 'playing' && state.gameState !== 'paused') return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // --- Danger line ---
    const dangerY = canvasHeight * DANGER_LINE_PERCENT;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.3)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(canvasWidth, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- Drop zone indicator ---
    const dropZoneY = canvasHeight * DROP_ZONE_HEIGHT_PERCENT;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 10]);
    ctx.beginPath();
    ctx.moveTo(0, dropZoneY);
    ctx.lineTo(canvasWidth, dropZoneY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- Balls (planet rendering) ---
    balls.forEach(body => {
      const { number, radius } = body.gameData;
      const pos = body.position;

      if (BoomTen.Planets) {
        BoomTen.Planets.drawPlanet(ctx, pos.x, pos.y, radius, number);
      } else {
        // Fallback: simple gradient circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x + 2, pos.y + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();
        const color = COLORS[number] || '#AAAAAA';
        const grad = ctx.createRadialGradient(
          pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.1,
          pos.x, pos.y, radius
        );
        grad.addColorStop(0, lightenColor(color, 40));
        grad.addColorStop(1, color);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${radius * 0.7}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number, pos.x, pos.y + 1);
        ctx.restore();
      }
    });

    // --- Drop preview ghost (rendered by BoomTen.Drop if loaded) ---
    if (BoomTen.Drop && BoomTen.Drop.renderPreview) {
      BoomTen.Drop.renderPreview(ctx);
    }

    // --- Danger-zone check ---
    if (state.gameState === 'playing') {
      checkDangerZone();
    }

    // --- Particle effects ---
    if (BoomTen.Effects) {
      BoomTen.Effects.render(ctx);
    }

    // --- Schedule next frame ---
    if (state.gameState === 'playing') {
      requestAnimationFrame(renderLoop);
    }
  }

  // ---------------------------------------------------------------------------
  // Danger zone
  // ---------------------------------------------------------------------------

  function checkDangerZone() {
    const dangerY = canvasHeight * DANGER_LINE_PERCENT;
    const now     = Date.now();

    balls.forEach(body => {
      const topEdge = body.position.y - body.gameData.radius;
      const id      = body.gameData.id;

      if (topEdge < dangerY && body.speed < 0.5) {
        if (!state.dangerBodies.has(id)) {
          state.dangerBodies.set(id, now);
        } else {
          const elapsed = now - state.dangerBodies.get(id);
          if (elapsed > DANGER_TIME_LIMIT) {
            gameOver();
          }
        }
      } else {
        state.dangerBodies.delete(id);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Game over
  // ---------------------------------------------------------------------------

  function gameOver() {
    if (state.gameState === 'gameover') return;

    state.gameState = 'gameover';

    if (state.comboTimer)        clearTimeout(state.comboTimer);
    if (state.dropCooldownTimer) clearTimeout(state.dropCooldownTimer);

    // Stop physics
    if (runner) Runner.stop(runner);

    // Remove collision handler
    Events.off(engine, 'collisionStart', onCollisionStart);

    // Persist best score
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem('boomten_best', state.bestScore.toString());
    }

    // Notify the UI layer
    if (BoomTen.UI) {
      BoomTen.UI.showGameOver(state.score, state.bestScore);
    }
  }

  // ---------------------------------------------------------------------------
  // Pause / resume
  // ---------------------------------------------------------------------------

  function pause() {
    if (state.gameState !== 'playing') return;
    state.gameState = 'paused';
    if (runner) Runner.stop(runner);
  }

  function resume() {
    if (state.gameState !== 'paused') return;
    state.gameState = 'playing';
    Runner.run(runner, engine);
    requestAnimationFrame(renderLoop);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  function lightenColor(hex, percent) {
    const clean = hex.replace('#', '');
    const num   = parseInt(clean, 16);
    const amt   = Math.round(2.55 * percent);

    const R = Math.min(255, ((num >> 16) & 0xFF) + amt);
    const G = Math.min(255, ((num >>  8) & 0xFF) + amt);
    const B = Math.min(255, ( num        & 0xFF) + amt);

    return `rgb(${R},${G},${B})`;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    init,
    startGame,
    createBallAt,
    rollNextBall,
    removeBall,
    removeBalls,
    pause,
    resume,
    gameOver,

    get state()       { return state; },
    get balls()       { return balls; },
    get engine()      { return engine; },
    get canvasWidth() { return canvasWidth; },
    get canvasHeight(){ return canvasHeight; },
    get ctx()         { return ctx; },

    COLORS,
    DANGER_LINE_PERCENT,
    DROP_ZONE_HEIGHT_PERCENT,
    DROP_COOLDOWN,
    MAX_BALLS,
    ballRadius,
  };
})();
