// game.js - BOOM TEN Physics Engine Core
// Uses Matter.js globals: Matter.Engine, Matter.World, Matter.Bodies, Matter.Body,
//                         Matter.Events, Matter.Runner, Matter.Query, Matter.Composite
//
// Matter.js is loaded via CDN and is available as the global `Matter` object.
// This module is wrapped in an IIFE and exposed on window.BoomTen.Game.

const BoomTen = window.BoomTen || {};

BoomTen.Game = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Matter.js aliases (destructured from the global Matter object at load time)
  // ---------------------------------------------------------------------------
  const { Engine, Bodies, Body, Events, Runner, Query, Composite } = Matter;

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** Ball fill colors keyed by number value (1–9). */
  const COLORS = {
    1: '#FF6B6B',
    2: '#FFA06B',
    3: '#FFD93D',
    4: '#6BCB77',
    5: '#4D96FF',
    6: '#9B59B6',
    7: '#FF85B3',
    8: '#00D2D3',
    9: '#FF6348',
  };

  /**
   * Spawn-weight table.
   * Distribution target:
   *   1-3 → ~45 %  (15 % each)  → 15 entries each  = 45
   *   4-6 → ~35 %  (~12 % each) → 12, 12, 11 entries = 35
   *   7-9 → ~20 %  (~7 % each)  →  7,  7,  6 entries = 20
   * Total: 100 entries → straightforward uniform random pick.
   */
  const SPAWN_WEIGHTS = [
    // 1 – 15 entries
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    // 2 – 15 entries
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    // 3 – 15 entries
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    // 4 – 12 entries
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    // 5 – 12 entries
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    // 6 – 11 entries
    6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
    // 7 – 7 entries
    7, 7, 7, 7, 7, 7, 7,
    // 8 – 7 entries
    8, 8, 8, 8, 8, 8, 8,
    // 9 – 6 entries
    9, 9, 9, 9, 9, 9,
  ]; // length === 100

  /** Hard cap on simultaneous physics bodies (balls). */
  const MAX_BALLS = 60;

  /** Starting interval between auto-spawned balls, in milliseconds. */
  const BASE_SPAWN_INTERVAL = 2500;

  /** Fastest the spawn interval may shrink to, in milliseconds. */
  const MIN_SPAWN_INTERVAL = 1000;

  /**
   * Vertical position of the "danger line" expressed as a fraction of canvas
   * height measured from the top (0 = top edge, 1 = bottom edge).
   */
  const DANGER_LINE_PERCENT = 0.12; // 12 % from the top

  /**
   * How long (ms) a ball must remain above the danger line without moving
   * before triggering game-over.
   */
  const DANGER_TIME_LIMIT = 3000;

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
   * Each body has a `.gameData` property (see createBall).
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
    score: 0,
    bestScore: parseInt(localStorage.getItem('boomten_best') || '0', 10),
    combo: 0,
    comboTimer: null,          // setTimeout handle
    gameState: 'splash',       // 'splash' | 'playing' | 'paused' | 'gameover'
    spawnInterval: BASE_SPAWN_INTERVAL,
    spawnTimer: null,          // setInterval handle
    difficulty: 1,             // incremented every 10 s
    difficultyTimer: null,     // setInterval handle
    isAnimating: false,        // true while a magnet / merge animation is running
    dangerBodies: new Map(),   // Map<bodyId, timestampMs> – first frame above danger
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

  /**
   * Resize the canvas to fill its parent container and rebuild the static
   * boundary walls to match the new dimensions.
   * Called automatically on window 'resize'.
   */
  function resize() {
    const container = canvas.parentElement;
    canvasWidth  = container.clientWidth;
    canvasHeight = container.clientHeight;
    canvas.width  = canvasWidth;
    canvas.height = canvasHeight;

    rebuildWalls();
  }

  /**
   * Remove the old wall bodies from the physics world and add fresh ones
   * that match the current canvas dimensions.
   */
  function rebuildWalls() {
    // Remove every previously created wall from the world.
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

    // Floor – sits just below the visible canvas area.
    const floor = Bodies.rectangle(
      canvasWidth / 2,
      canvasHeight + thickness / 2,
      canvasWidth,
      thickness,
      wallOptions
    );

    // Left wall – tall enough to contain any spawning ball.
    const leftWall = Bodies.rectangle(
      -thickness / 2,
      canvasHeight / 2,
      thickness,
      canvasHeight * 2,
      wallOptions
    );

    // Right wall – mirrors the left wall.
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
   * Create a single ball body and add it to the physics world.
   *
   * @param {number} [x] - Optional horizontal spawn position (px).
   *   Defaults to a random position within the canvas bounds.
   * @returns {Matter.Body|null} The created body, or null when the cap is hit.
   */
  function createBall(x) {
    if (balls.length >= MAX_BALLS) return null;

    // Pick a random number using the weighted table.
    const number = SPAWN_WEIGHTS[Math.floor(Math.random() * SPAWN_WEIGHTS.length)];

    // Radius scales with the ball's number so higher numbers feel heavier.
    const radius  = 20 + number * 3;

    // Clamp the horizontal position so the ball never spawns inside a wall.
    const spawnX  = (x !== undefined)
      ? Math.max(radius, Math.min(canvasWidth - radius, x))
      : radius + Math.random() * (canvasWidth - radius * 2);

    // Spawn slightly above the top edge so the ball falls in naturally.
    const spawnY  = -radius - 10;

    const body = Bodies.circle(spawnX, spawnY, radius, {
      restitution: 0.3,   // slight bounciness
      friction:    0.1,
      frictionAir: 0.01,  // very light air resistance
      density:     0.001,
      label:       'ball',
    });

    // Attach game-specific metadata directly on the body object.
    body.gameData = {
      number:   number,
      color:    COLORS[number],
      radius:   radius,
      selected: false,
      // Unique identifier used for the dangerBodies map.
      id: 'ball_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    };

    Composite.add(engine.world, body);
    balls.push(body);
    return body;
  }

  /**
   * Remove a single ball from the physics world and the balls array.
   *
   * @param {Matter.Body} body
   */
  function removeBall(body) {
    Composite.remove(engine.world, body);
    balls = balls.filter(b => b !== body);
    // Clean up any lingering danger-zone entry for this body.
    state.dangerBodies.delete(body.gameData && body.gameData.id);
  }

  /**
   * Remove multiple balls from the physics world and the balls array in one
   * batch operation.  More efficient than calling removeBall repeatedly because
   * the balls array is filtered only once.
   *
   * @param {Matter.Body[]} bodyArray
   */
  function removeBalls(bodyArray) {
    const bodySet = new Set(bodyArray);

    bodyArray.forEach(b => {
      Composite.remove(engine.world, b);
      // Clean up danger-zone tracking for each removed body.
      if (b.gameData) {
        state.dangerBodies.delete(b.gameData.id);
      }
    });

    balls = balls.filter(b => !bodySet.has(b));
  }

  // ---------------------------------------------------------------------------
  // Game lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Reset all game state and start a fresh game session.
   * Clears existing physics bodies, resets timers, and begins the render loop.
   */
  function startGame() {
    // --- Reset physics world ---
    // Remove every live ball from the world.
    balls.forEach(b => Composite.remove(engine.world, b));
    balls = [];

    // --- Reset game state ---
    state.score          = 0;
    state.combo          = 0;
    state.difficulty     = 1;
    state.spawnInterval  = BASE_SPAWN_INTERVAL;
    state.gameState      = 'playing';
    state.isAnimating    = false;
    state.dangerBodies.clear();

    // Clear any lingering timers from a previous session.
    if (state.spawnTimer)      clearInterval(state.spawnTimer);
    if (state.difficultyTimer) clearInterval(state.difficultyTimer);
    if (state.comboTimer)      clearTimeout(state.comboTimer);

    // --- Start physics runner ---
    if (runner) Runner.stop(runner);
    runner = Runner.create();
    Runner.run(runner, engine);

    // --- Initial ball drop (5 balls, staggered) ---
    for (let i = 0; i < 5; i++) {
      setTimeout(() => createBall(), i * 300);
    }

    // --- Auto-spawning ---
    startSpawning();

    // --- Difficulty ramp (increases every 10 seconds) ---
    state.difficultyTimer = setInterval(() => {
      state.difficulty   += 0.1;
      state.spawnInterval = Math.max(
        MIN_SPAWN_INTERVAL,
        BASE_SPAWN_INTERVAL - state.difficulty * 150
      );
      // Restart the spawn timer with the updated interval.
      startSpawning();
    }, 10000);

    // --- Kick off the render loop ---
    requestAnimationFrame(renderLoop);
  }

  /**
   * (Re-)start the periodic ball-spawn timer using the current
   * state.spawnInterval.  Cancels the previous timer if one is running.
   */
  function startSpawning() {
    if (state.spawnTimer) clearInterval(state.spawnTimer);

    state.spawnTimer = setInterval(() => {
      if (state.gameState === 'playing' && !state.isAnimating) {
        createBall();
      }
    }, state.spawnInterval);
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------

  /**
   * Main render callback – called once per animation frame while playing or
   * paused.  Clears the canvas, draws the danger line, then draws every live
   * ball with shadow, gradient fill, optional selection glow and number label.
   * Finally delegates particle rendering to BoomTen.Effects (if loaded).
   */
  function renderLoop() {
    // Only render during active play or while the game is paused (so the frozen
    // frame is still visible).
    if (state.gameState !== 'playing' && state.gameState !== 'paused') return;

    // --- Clear the canvas ---
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
    ctx.setLineDash([]); // reset dash pattern
    ctx.restore();

    // --- Balls ---
    balls.forEach(body => {
      const { number, color, radius, selected } = body.gameData;
      const pos = body.position;

      ctx.save();

      // -- Drop shadow (offset circle drawn in translucent black) --
      ctx.beginPath();
      ctx.arc(pos.x + 2, pos.y + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();

      // -- Ball body (radial gradient for a 3-D sheen) --
      const gradient = ctx.createRadialGradient(
        pos.x - radius * 0.3,  // highlight origin x (upper-left)
        pos.y - radius * 0.3,  // highlight origin y
        radius * 0.1,           // inner circle radius
        pos.x,                  // outer circle centre x
        pos.y,                  // outer circle centre y
        radius                  // outer circle radius
      );
      gradient.addColorStop(0, lightenColor(color, 40)); // bright highlight
      gradient.addColorStop(1, color);                   // base colour at edge

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // -- Selection glow (golden ring + canvas shadow blur) --
      if (selected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle  = '#FFD700';
        ctx.lineWidth    = 3;
        ctx.shadowColor  = '#FFD700';
        ctx.shadowBlur   = 15;
        ctx.stroke();
        ctx.shadowBlur   = 0; // reset before next draw call
      }

      // -- Number label (centred white text with a subtle text shadow) --
      ctx.fillStyle    = '#FFFFFF';
      ctx.font         = `bold ${radius * 0.9}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur   = 3;
      ctx.fillText(number, pos.x, pos.y + 1); // +1 px for optical centring
      ctx.shadowBlur   = 0;

      ctx.restore();
    });

    // --- Danger-zone check (only while actively playing) ---
    if (state.gameState === 'playing') {
      checkDangerZone();
    }

    // --- Particle effects (handled by BoomTen.Effects if loaded) ---
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

  /**
   * Inspect every ball.  If a ball's top edge is above the danger line AND it
   * is nearly stationary, track when it first entered that state.  If the ball
   * stays there longer than DANGER_TIME_LIMIT the game ends.
   *
   * A ball that moves back below the danger line has its tracking entry cleared.
   */
  function checkDangerZone() {
    const dangerY = canvasHeight * DANGER_LINE_PERCENT;
    const now     = Date.now();

    balls.forEach(body => {
      const topEdge = body.position.y - body.gameData.radius;
      const id      = body.gameData.id;

      // A ball is "stuck" above the line if it has negligible velocity.
      if (topEdge < dangerY && body.speed < 0.5) {
        if (!state.dangerBodies.has(id)) {
          // First frame the ball is seen in this state – record timestamp.
          state.dangerBodies.set(id, now);
        } else {
          const elapsed = now - state.dangerBodies.get(id);
          if (elapsed > DANGER_TIME_LIMIT) {
            gameOver();
          }
        }
      } else {
        // Ball is safe – remove any existing danger tracking entry.
        state.dangerBodies.delete(id);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Game over
  // ---------------------------------------------------------------------------

  /**
   * Transition to the 'gameover' state.
   * Stops all timers and the physics runner, persists the best score, then
   * delegates UI notification to BoomTen.UI.
   */
  function gameOver() {
    if (state.gameState === 'gameover') return; // guard against double-calls

    state.gameState = 'gameover';

    // Stop all recurring timers.
    if (state.spawnTimer)      clearInterval(state.spawnTimer);
    if (state.difficultyTimer) clearInterval(state.difficultyTimer);
    if (state.comboTimer)      clearTimeout(state.comboTimer);

    // Stop the physics simulation.
    if (runner) Runner.stop(runner);

    // Persist best score.
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem('boomten_best', state.bestScore.toString());
    }

    // Notify the UI layer.
    if (BoomTen.UI) {
      BoomTen.UI.showGameOver(state.score, state.bestScore);
    }
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Award points for a successful ball-removal action.
   *
   * Formula:
   *   base   = 10 × selectedCount
   *   points = floor(base × (1 + combo × 0.5))
   *
   * The combo counter is incremented on every call and automatically resets
   * 1.5 seconds after the last call.
   *
   * @param {number} selectedCount - Number of balls removed in this action.
   * @returns {number} Points awarded this action.
   */
  function addScore(selectedCount) {
    const base             = 10 * selectedCount;
    const comboMultiplier  = 1 + (state.combo * 0.5);
    const points           = Math.floor(base * comboMultiplier);

    state.score += points;

    // Increment combo and (re-)arm the reset timer.
    state.combo++;
    if (state.comboTimer) clearTimeout(state.comboTimer);
    state.comboTimer = setTimeout(() => {
      state.combo = 0;
    }, 1500);

    // Notify the UI layer.
    if (BoomTen.UI) {
      BoomTen.UI.updateScore(state.score, state.combo, points);
    }

    return points;
  }

  // ---------------------------------------------------------------------------
  // Pause / resume
  // ---------------------------------------------------------------------------

  /**
   * Pause the physics simulation.  Render loop continues (frozen frame).
   * No-op if the game is not currently playing.
   */
  function pause() {
    if (state.gameState !== 'playing') return;
    state.gameState = 'paused';
    if (runner) Runner.stop(runner);
  }

  /**
   * Resume the physics simulation after a pause.
   * No-op if the game is not currently paused.
   */
  function resume() {
    if (state.gameState !== 'paused') return;
    state.gameState = 'playing';
    Runner.run(runner, engine);
    requestAnimationFrame(renderLoop);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Return a lightened version of a CSS hex colour string.
   *
   * Each RGB channel is increased by `percent` × 2.55 (i.e., percent is on a
   * 0–100 scale) and clamped to 255.
   *
   * @param {string} hex     - Hex colour, e.g. '#FF6B6B'.
   * @param {number} percent - Amount to lighten (0–100).
   * @returns {string} CSS rgb() colour string.
   */
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
    /** Initialise the engine and canvas.  Call once at startup. */
    init,

    /** Reset state and begin a new game. */
    startGame,

    /** Create a ball at an optional x position. */
    createBall,

    /** Remove a single ball from the world. */
    removeBall,

    /** Remove multiple balls from the world in one pass. */
    removeBalls,

    /** Award points and update the combo counter. */
    addScore,

    /** Pause physics (render loop keeps running). */
    pause,

    /** Resume physics after a pause. */
    resume,

    /** Immediately end the current game. */
    gameOver,

    // --- Read-only accessors (using ES5-style getters on the return object) ---

    /** Current mutable game state.  Read-only reference; do not replace. */
    get state()       { return state; },

    /** Live array of all active ball bodies. */
    get balls()       { return balls; },

    /** The Matter.js Engine instance. */
    get engine()      { return engine; },

    /** Current logical canvas width in CSS pixels. */
    get canvasWidth() { return canvasWidth; },

    /** Current logical canvas height in CSS pixels. */
    get canvasHeight(){ return canvasHeight; },

    /** The 2-D rendering context. */
    get ctx()         { return ctx; },

    // --- Constants exposed for use by other modules ---

    /** Ball colour map (number → hex string). */
    COLORS,

    /** Danger-line position as a fraction of canvas height from the top. */
    DANGER_LINE_PERCENT,

    /** Maximum number of simultaneous balls allowed. */
    MAX_BALLS,
  };
})();

// Make the namespace available globally.
window.BoomTen = BoomTen;
