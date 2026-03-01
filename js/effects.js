// effects.js - BOOM TEN Visual Effects System
const BoomTen = window.BoomTen || {};

BoomTen.Effects = (function() {
  const MAX_PARTICLES = 200;

  let particles = [];
  let floatingTexts = [];
  let screenShake = { x: 0, y: 0, intensity: 0, duration: 0, startTime: 0 };

  // ---------------------------------------------------------------------------
  // Particle class
  // ---------------------------------------------------------------------------
  class Particle {
    constructor(x, y, color, options = {}) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.radius = options.radius !== undefined ? options.radius : (Math.random() * 4 + 2);
      this.vx = options.vx !== undefined ? options.vx : (Math.random() - 0.5) * 12;
      this.vy = options.vy !== undefined ? options.vy : (Math.random() - 0.5) * 12 - 3;
      this.gravity = options.gravity !== undefined ? options.gravity : 0.15;
      this.friction = options.friction !== undefined ? options.friction : 0.98;
      this.life = options.life !== undefined ? options.life : 1.0;
      this.decay = options.decay !== undefined ? options.decay : (Math.random() * 0.02 + 0.015);
      this.glow = options.glow || false;
    }

    update() {
      this.vy += this.gravity;
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      return this.life > 0;
    }

    // draw() is intentionally NOT using ctx.save/ctx.restore per-particle.
    // The caller manages a single save/restore around the batch draw loop,
    // resetting globalAlpha and shadowBlur manually between particles to
    // minimise state-stack overhead.
    draw(ctx) {
      ctx.globalAlpha = this.life;

      if (this.glow) {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.1, this.radius * this.life), 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // FloatingText class
  // ---------------------------------------------------------------------------
  class FloatingText {
    constructor(x, y, text, combo) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.combo = combo;
      this.life = 1.0;
      this.vy = -2;
      this.scale = combo > 1 ? 1.5 : 1.0;
    }

    update() {
      this.y += this.vy;
      this.vy *= 0.95;
      this.life -= 0.02;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.life;

      const fontSize = Math.floor(24 * this.scale);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(this.text, this.x, this.y);

      // Fill colour based on combo tier
      let color = '#FFFFFF';
      if (this.combo >= 5)      color = '#FF6B35'; // orange
      else if (this.combo >= 3) color = '#FFD700'; // gold
      else if (this.combo >= 2) color = '#00FF88'; // green

      ctx.fillStyle = color;
      ctx.fillText(this.text, this.x, this.y);

      // Combo label
      if (this.combo > 1) {
        ctx.font = `bold ${Math.floor(fontSize * 0.6)}px sans-serif`;
        ctx.fillStyle = '#FF6B35';
        ctx.fillText(`COMBO x${this.combo}!`, this.x, this.y - fontSize);
      }

      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  // Add a particle, enforcing the MAX_PARTICLES cap by dropping the oldest
  // entry (index 0) when the array is full.
  function _addParticle(particle) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift(); // remove oldest to stay within budget
    }
    particles.push(particle);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Trigger a particle explosion centred on (x, y).
   * @param {number} x
   * @param {number} y
   * @param {string[]} colors - Array of CSS colour strings used for particles.
   */
  function explode(x, y, colors) {
    const count = 30 + colors.length * 5;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const speed = Math.random() * 10 + 3;
      const color = colors[Math.floor(Math.random() * colors.length)];

      _addParticle(new Particle(x, y, color, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: Math.random() * 5 + 2,
        glow: Math.random() > 0.5,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.01
      }));
    }

    // Sparkle particles – small, white, fast-decaying
    for (let i = 0; i < 15; i++) {
      _addParticle(new Particle(x, y, '#FFFFFF', {
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        radius: Math.random() * 2 + 1,
        glow: true,
        life: 1.0,
        decay: 0.04
      }));
    }

    triggerShake(5 + colors.length * 2, 300);
  }

  /**
   * Spawn a floating score label at (x, y).
   * @param {number} x
   * @param {number} y
   * @param {string} text  - Label text (e.g. "+100")
   * @param {number} combo - Current combo multiplier (affects size/colour).
   */
  function floatingText(x, y, text, combo) {
    floatingTexts.push(new FloatingText(x, y, text, combo));
  }

  /**
   * Shake the canvas element for the given duration.
   * @param {number} intensity - Peak pixel offset.
   * @param {number} duration  - Milliseconds.
   */
  function triggerShake(intensity, duration) {
    screenShake.intensity = intensity;
    screenShake.duration = duration;
    screenShake.startTime = Date.now();
  }

  /**
   * Update and render all active effects.
   * Must be called once per animation frame, before any game-layer drawing
   * that should appear on top of particles.
   * @param {CanvasRenderingContext2D} ctx
   */
  function render(ctx) {
    // ---- Particles ---------------------------------------------------------
    // Single save/restore wrapping the whole batch; state is reset manually
    // between draws to avoid repeated push/pop of the context stack.
    ctx.save();

    const nextParticles = [];
    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];
      const alive = p.update();
      if (alive) {
        p.draw(ctx);
        nextParticles.push(p);
      }
    }
    // Reset any lingering glow so floating-text draws cleanly
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();

    // Replace array in-place (dead particles already excluded above)
    particles = nextParticles;

    // ---- Floating texts ----------------------------------------------------
    // Each FloatingText uses its own save/restore because it sets multiple
    // independent properties (font, textAlign, etc.).
    const nextTexts = [];
    for (let i = 0, len = floatingTexts.length; i < len; i++) {
      const t = floatingTexts[i];
      const alive = t.update();
      if (alive) {
        t.draw(ctx);
        nextTexts.push(t);
      }
    }
    floatingTexts = nextTexts;

    // ---- Screen shake ------------------------------------------------------
    if (screenShake.intensity > 0) {
      const elapsed = Date.now() - screenShake.startTime;
      const canvas = document.getElementById('game-canvas');

      if (elapsed < screenShake.duration) {
        const progress = elapsed / screenShake.duration;
        const currentIntensity = screenShake.intensity * (1 - progress);
        screenShake.x = (Math.random() - 0.5) * currentIntensity;
        screenShake.y = (Math.random() - 0.5) * currentIntensity;

        if (canvas) {
          canvas.style.transform = `translate(${screenShake.x}px, ${screenShake.y}px)`;
        }
      } else {
        screenShake.intensity = 0;
        if (canvas) canvas.style.transform = '';
      }
    }
  }

  /**
   * Remove all active effects and reset state (call on game reset / new game).
   */
  function clear() {
    particles = [];
    floatingTexts = [];
    screenShake = { x: 0, y: 0, intensity: 0, duration: 0, startTime: 0 };
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.style.transform = '';
  }

  // ---------------------------------------------------------------------------
  // Expose public interface
  // ---------------------------------------------------------------------------
  return {
    explode,
    floatingText,
    triggerShake,
    render,
    clear,
    /** Live count of active particles – useful for performance HUDs. */
    get particleCount() { return particles.length; }
  };
})();

window.BoomTen = BoomTen;
