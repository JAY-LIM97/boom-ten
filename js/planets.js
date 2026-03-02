// planets.js - Planet 2048 Procedural Celestial Body Renderer
// Canvas 2D only — no images. Each planet drawn with gradients, arcs, and paths.

window.BoomTen = window.BoomTen || {};

window.BoomTen.Planets = (function () {
  'use strict';

  // ─── Planet color palette ────────────────────────────────────────────
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

  const PLANET_NAMES = {
    1: 'Asteroid', 2: 'Moon', 4: 'Mars', 8: 'Earth',
    16: 'Neptune', 32: 'Saturn', 64: 'Jupiter', 128: 'Red Giant',
    256: 'Blue Star', 512: 'Supergiant', 1024: 'Neutron Star', 2048: 'Black Hole',
  };

  const PLANET_NAMES_KO = {
    1: '소행성', 2: '달', 4: '화성', 8: '지구',
    16: '해왕성', 32: '토성', 64: '목성', 128: '적색거성',
    256: '청색항성', 512: '초거성', 1024: '중성자별', 2048: '블랙홀',
  };

  // ─── Utility ─────────────────────────────────────────────────────────

  /** Lighten a hex color by amount (0-255) */
  function lighten(hex, amt) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amt);
    g = Math.min(255, g + amt);
    b = Math.min(255, b + amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /** Darken a hex color by amount */
  function darken(hex, amt) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - amt);
    g = Math.max(0, g - amt);
    b = Math.max(0, b - amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /** Draw a basic sphere with radial gradient (reusable base) */
  function drawSphere(ctx, x, y, r, colorLight, colorDark) {
    const grad = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, r * 0.05,
      x, y, r
    );
    grad.addColorStop(0, colorLight);
    grad.addColorStop(1, colorDark);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  /** Draw number label centered on the planet */
  function drawLabel(ctx, x, y, r, number, style) {
    const dark = style === 'dark';
    const glow = style === 'glow';
    ctx.fillStyle = dark ? '#0A0E27' : '#FFFFFF';
    const fontSize = number >= 1024 ? r * 0.5 : number >= 100 ? r * 0.6 : r * 0.8;
    ctx.font = 'bold ' + fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (glow) {
      ctx.shadowColor = '#FF6B00';
      ctx.shadowBlur = 6;
    } else {
      ctx.shadowColor = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
    }
    ctx.fillText(number, x, y + 1);
    ctx.shadowBlur = 0;
  }

  // ─── Individual Planet Renderers ─────────────────────────────────────

  // 1: Asteroid — small brown rocky body with speckled texture
  function drawAsteroid(ctx, x, y, r) {
    // Slightly irregular shape via drawing main body + bumps
    drawSphere(ctx, x, y, r, '#A89070', '#5C4A32');

    // Surface speckles (fixed positions, deterministic)
    const spots = [
      { dx: 0.25, dy: -0.3, sr: 0.15 },
      { dx: -0.35, dy: 0.1, sr: 0.12 },
      { dx: 0.1, dy: 0.35, sr: 0.18 },
      { dx: -0.15, dy: -0.2, sr: 0.1 },
      { dx: 0.3, dy: 0.2, sr: 0.13 },
    ];
    ctx.fillStyle = 'rgba(60, 40, 20, 0.35)';
    spots.forEach(s => {
      ctx.beginPath();
      ctx.arc(x + s.dx * r, y + s.dy * r, s.sr * r, 0, Math.PI * 2);
      ctx.fill();
    });

    drawLabel(ctx, x, y, r, 1, 'light');
  }

  // 2: Moon — silver-gray with craters
  function drawMoon(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#E8E8E8', '#808080');

    // Craters
    const craters = [
      { dx: 0.2, dy: -0.25, sr: 0.2 },
      { dx: -0.3, dy: 0.15, sr: 0.25 },
      { dx: 0.15, dy: 0.3, sr: 0.15 },
      { dx: -0.1, dy: -0.35, sr: 0.12 },
    ];
    craters.forEach(c => {
      // Outer crater ring
      ctx.beginPath();
      ctx.arc(x + c.dx * r, y + c.dy * r, c.sr * r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      ctx.fill();
      // Inner shadow
      ctx.beginPath();
      ctx.arc(x + c.dx * r + 1, y + c.dy * r + 1, c.sr * r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(70, 70, 70, 0.3)';
      ctx.fill();
    });

    drawLabel(ctx, x, y, r, 2, 'dark');
  }

  // 4: Mars — rust red planet with polar cap
  function drawMars(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#E8613C', '#7B2A0A');

    // Polar ice cap (white arc at top)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.78, r * 0.45, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 230, 0.5)';
    ctx.fill();

    // Surface feature (Valles Marineris-like dark line)
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y + r * 0.05);
    ctx.quadraticCurveTo(x, y - r * 0.1, x + r * 0.35, y + r * 0.15);
    ctx.strokeStyle = 'rgba(100, 30, 10, 0.3)';
    ctx.lineWidth = r * 0.06;
    ctx.stroke();

    ctx.restore();

    drawLabel(ctx, x, y, r, 4, 'light');
  }

  // 8: Earth — blue ocean, green continents, white clouds
  function drawEarth(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#5CB8FF', '#0A4080');

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    // Continent blobs (green-brown)
    ctx.fillStyle = 'rgba(80, 160, 60, 0.55)';

    // Americas-ish blob
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.1, r * 0.3, r * 0.45, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eurasia-ish blob
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y - r * 0.2, r * 0.35, r * 0.25, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Africa-ish blob
    ctx.beginPath();
    ctx.ellipse(x + r * 0.1, y + r * 0.25, r * 0.18, r * 0.28, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Cloud wisps (white arcs)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(x - r * 0.1, y - r * 0.35, r * 0.4, 0.5, 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y + r * 0.3, r * 0.35, 3.5, 5.5);
    ctx.stroke();

    ctx.restore();

    // Atmosphere glow
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    drawLabel(ctx, x, y, r, 8, 'light');
  }

  // 16: Neptune — deep blue ice giant with subtle bands
  function drawNeptune(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#5577FF', '#0A1A66');

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    // Subtle atmospheric bands
    const bands = [-0.5, -0.15, 0.2, 0.5];
    bands.forEach(by => {
      ctx.beginPath();
      ctx.rect(x - r, y + by * r - r * 0.04, r * 2, r * 0.08);
      ctx.fillStyle = 'rgba(80, 120, 255, 0.2)';
      ctx.fill();
    });

    // Great Dark Spot
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y - r * 0.1, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 30, 80, 0.35)';
    ctx.fill();

    ctx.restore();

    drawLabel(ctx, x, y, r, 16, 'light');
  }

  // 32: Saturn — golden planet with ring system
  function drawSaturn(ctx, x, y, r) {
    const ringOuter = r * 1.7;
    const ringInner = r * 1.15;
    const ringTilt = r * 0.35;

    // --- Ring behind planet (bottom half) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - ringOuter - 5, y, ringOuter * 2 + 10, ringOuter + 10);
    ctx.clip();

    _drawSaturnRing(ctx, x, y, ringOuter, ringInner, ringTilt);
    ctx.restore();

    // --- Planet body ---
    drawSphere(ctx, x, y, r, '#F0D060', '#8B6914');

    // Horizontal bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(180, 140, 40, 0.25)';
    ctx.fillRect(x - r, y - r * 0.15, r * 2, r * 0.12);
    ctx.fillRect(x - r, y + r * 0.2, r * 2, r * 0.1);
    ctx.fillStyle = 'rgba(220, 180, 80, 0.2)';
    ctx.fillRect(x - r, y - r * 0.45, r * 2, r * 0.15);
    ctx.restore();

    // --- Ring in front of planet (top half) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - ringOuter - 5, y - ringOuter - 10, ringOuter * 2 + 10, ringOuter + 10);
    ctx.clip();

    _drawSaturnRing(ctx, x, y, ringOuter, ringInner, ringTilt);
    ctx.restore();

    drawLabel(ctx, x, y, r, 32, 'dark');
  }

  function _drawSaturnRing(ctx, x, y, outer, inner, tilt) {
    // Outer ring
    ctx.beginPath();
    ctx.ellipse(x, y, outer, tilt, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(210, 180, 100, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Middle ring
    ctx.beginPath();
    ctx.ellipse(x, y, (outer + inner) / 2, tilt * 0.75, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(190, 160, 80, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.ellipse(x, y, inner, tilt * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(170, 140, 60, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 64: Jupiter — orange-brown gas giant with horizontal bands + great red spot
  function drawJupiter(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#E8A050', '#6B3A15');

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    // Prominent horizontal bands
    const bandColors = [
      { y: -0.6, h: 0.15, c: 'rgba(180, 110, 50, 0.4)' },
      { y: -0.3, h: 0.12, c: 'rgba(220, 160, 80, 0.3)' },
      { y: -0.05, h: 0.1, c: 'rgba(160, 90, 40, 0.35)' },
      { y: 0.15, h: 0.14, c: 'rgba(200, 140, 60, 0.3)' },
      { y: 0.4, h: 0.12, c: 'rgba(170, 100, 50, 0.35)' },
    ];
    bandColors.forEach(b => {
      ctx.fillStyle = b.c;
      ctx.fillRect(x - r, y + b.y * r, r * 2, b.h * r);
    });

    // Great Red Spot
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y + r * 0.18, r * 0.18, r * 0.12, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 50, 30, 0.5)';
    ctx.fill();

    ctx.restore();

    drawLabel(ctx, x, y, r, 64, 'light');
  }

  // 128: Red Giant — reddish star with corona glow
  function drawRedGiant(ctx, x, y, r) {
    // Corona glow (behind)
    ctx.save();
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = r * 0.5;

    const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.15);
    grad.addColorStop(0, '#FFD080');
    grad.addColorStop(0.5, '#FF5500');
    grad.addColorStop(1, '#AA1500');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Outer corona halo
    ctx.beginPath();
    ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 80, 20, 0.12)';
    ctx.fill();

    // Surface granules
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const spots = [
      { dx: 0.2, dy: -0.2, sr: 0.15 },
      { dx: -0.25, dy: 0.15, sr: 0.2 },
      { dx: 0.3, dy: 0.25, sr: 0.12 },
    ];
    spots.forEach(s => {
      ctx.beginPath();
      ctx.arc(x + s.dx * r, y + s.dy * r, s.sr * r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
      ctx.fill();
    });
    ctx.restore();

    drawLabel(ctx, x, y, r, 128, 'dark');
  }

  // 256: Blue Star — hot blue-white with bright glow
  function drawBlueStar(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = '#4488FF';
    ctx.shadowBlur = r * 0.6;

    const grad = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.3, '#AACCFF');
    grad.addColorStop(1, '#2244AA');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Light rays (4 cross-shaped)
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.2)';
    ctx.lineWidth = 1.5;
    const rayLen = r * 0.5;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * r * 0.7, y + Math.sin(angle) * r * 0.7);
      ctx.lineTo(x + Math.cos(angle) * (r + rayLen), y + Math.sin(angle) * (r + rayLen));
      ctx.stroke();
    }
    ctx.restore();

    // Outer glow halo
    ctx.beginPath();
    ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(70, 140, 255, 0.1)';
    ctx.fill();

    drawLabel(ctx, x, y, r, 256, 'dark');
  }

  // 512: Supergiant — brilliant gold star with corona rays
  function drawSupergiant(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = r * 0.7;

    const grad = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.2, '#FFF4B0');
    grad.addColorStop(0.7, '#FFB800');
    grad.addColorStop(1, '#CC7700');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Corona rays (8 directions)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 220, 100, 0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const len = (i % 2 === 0) ? r * 0.6 : r * 0.35;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * r * 0.8, y + Math.sin(angle) * r * 0.8);
      ctx.lineTo(x + Math.cos(angle) * (r + len), y + Math.sin(angle) * (r + len));
      ctx.stroke();
    }
    ctx.restore();

    // Outer glow
    ctx.beginPath();
    ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 200, 50, 0.08)';
    ctx.fill();

    drawLabel(ctx, x, y, r, 512, 'dark');
  }

  // 1024: Neutron Star — bright white pulsing with energy ring
  function drawNeutronStar(ctx, x, y, r) {
    // Pulse cycle based on time
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.005);

    ctx.save();
    ctx.shadowColor = '#C0D0FF';
    ctx.shadowBlur = r * 0.6 * pulse;

    const grad = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.4, '#C8D8FF');
    grad.addColorStop(1, '#4060AA');

    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Energy ring (perpendicular)
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 200, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r * 0.2, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Pulsar beam lines
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 220, 255, ' + (0.12 * pulse) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.6);
    ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
    ctx.restore();

    drawLabel(ctx, x, y, r, 1024, 'dark');
  }

  // 2048: Black Hole — dark center with bright accretion disk
  function drawBlackHole(ctx, x, y, r) {
    // Accretion disk glow (behind everything)
    ctx.save();
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = r * 0.6;

    // Accretion disk (tilted ellipse)
    const diskGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.6);
    diskGrad.addColorStop(0, 'rgba(255, 200, 50, 0.5)');
    diskGrad.addColorStop(0.5, 'rgba(255, 100, 0, 0.4)');
    diskGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');

    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.5, r * 0.35, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = diskGrad;
    ctx.fill();

    // Accretion ring stroke
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.4, r * 0.3, 0.15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 180, 50, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();

    // Event horizon (black center)
    ctx.beginPath();
    ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = '#050510';
    ctx.fill();

    // Gravitational lensing bright edge
    ctx.beginPath();
    ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner bright ring
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 150, 50, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawLabel(ctx, x, y, r, 2048, 'glow');
  }

  // ─── Main Dispatch ───────────────────────────────────────────────────

  /** Draw a full-detail planet at (x, y) with given radius and number */
  function drawPlanet(ctx, x, y, radius, number) {
    ctx.save();

    // Drop shadow (all planets)
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    switch (number) {
      case 1:    drawAsteroid(ctx, x, y, radius); break;
      case 2:    drawMoon(ctx, x, y, radius); break;
      case 4:    drawMars(ctx, x, y, radius); break;
      case 8:    drawEarth(ctx, x, y, radius); break;
      case 16:   drawNeptune(ctx, x, y, radius); break;
      case 32:   drawSaturn(ctx, x, y, radius); break;
      case 64:   drawJupiter(ctx, x, y, radius); break;
      case 128:  drawRedGiant(ctx, x, y, radius); break;
      case 256:  drawBlueStar(ctx, x, y, radius); break;
      case 512:  drawSupergiant(ctx, x, y, radius); break;
      case 1024: drawNeutronStar(ctx, x, y, radius); break;
      case 2048: drawBlackHole(ctx, x, y, radius); break;
      default:
        // Fallback for unknown numbers
        drawSphere(ctx, x, y, radius, '#AAAAAA', '#666666');
        drawLabel(ctx, x, y, radius, number, 'light');
        break;
    }

    ctx.restore();
  }

  /** Simplified planet preview for drop ghost (low detail, supports alpha) */
  function drawPlanetPreview(ctx, x, y, radius, number, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    const color = PLANET_COLORS[number] || '#AAAAAA';
    drawSphere(ctx, x, y, radius, lighten(color, 30), darken(color, 30));

    // Simple label
    ctx.fillStyle = number >= 128 ? '#0A0E27' : '#FFFFFF';
    const fontSize = number >= 100 ? radius * 0.6 : radius * 0.8;
    ctx.font = 'bold ' + fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number, x, y + 1);

    ctx.restore();
  }

  // ─── Public API ──────────────────────────────────────────────────────
  return {
    drawPlanet,
    drawPlanetPreview,
    PLANET_COLORS,
    PLANET_NAMES,
    PLANET_NAMES_KO,
  };
})();
