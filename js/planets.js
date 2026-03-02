// planets.js - Planet 2048 Procedural Celestial Body Renderer (30 Levels)
// Canvas 2D only — no images. Each celestial body drawn with gradients, arcs, and paths.
// Covers 2^0 (1) through 2^29 (536,870,912)

window.BoomTen = window.BoomTen || {};

window.BoomTen.Planets = (function () {
  'use strict';

  // ─── Planet color palette (30 levels) ──────────────────────────────────
  const PLANET_COLORS = {
    1:         '#8B6914',   // 작은 유성 - amber brown
    2:         '#A8D8EA',   // 얼음 소행성 - icy blue
    4:         '#71797E',   // 철 소행성 - steel gray
    8:         '#8B7355',   // 소행성 - brown
    16:        '#C2B280',   // 왜소 행성 - tan
    32:        '#C0C0C0',   // 위성 (달) - silver
    64:        '#8C8C8C',   // 수성 - dark gray
    128:       '#E8B84B',   // 금성 - golden yellow
    256:       '#1E90FF',   // 지구 - blue
    512:       '#C1440E',   // 화성 - rust
    1024:      '#D2691E',   // 목성 - orange brown
    2048:      '#DAA520',   // 토성 - goldenrod
    4096:      '#48D1CC',   // 천왕성 - turquoise
    8192:      '#3355FF',   // 해왕성 - deep blue
    16384:     '#8B5CF6',   // 거대 가스 행성 - purple
    32768:     '#2ECC71',   // 슈퍼 지구 - emerald
    65536:     '#FF4500',   // 용암 행성 - orange red
    131072:    '#B0C4DE',   // 얼음 거인 - light steel blue
    262144:    '#A8A8B8',   // 금속 행성 - metallic silver
    524288:    '#B9F2FF',   // 다이아몬드 행성 - diamond blue
    1048576:   '#E0E0FF',   // 중성자별 - white blue
    2097152:   '#FFFDE0',   // 백색왜성 - ivory
    4194304:   '#CC4444',   // 적색왜성 - medium red
    8388608:   '#FFD700',   // 황색왜성 - gold
    16777216:  '#4488FF',   // 청색거성 - bright blue
    33554432:  '#FF4500',   // 적색거성 - red orange
    67108864:  '#FFB800',   // 초거성 - amber gold
    134217728: '#FF6B00',   // 블랙홀 - accretion orange
    268435456: '#BB66FF',   // 퀘이사 - violet
    536870912: '#7B68EE',   // 은하 - medium slate blue
  };

  const PLANET_NAMES = {
    1: 'Small Meteor', 2: 'Ice Asteroid', 4: 'Iron Asteroid', 8: 'Asteroid',
    16: 'Dwarf Planet', 32: 'Moon', 64: 'Mercury', 128: 'Venus',
    256: 'Earth', 512: 'Mars', 1024: 'Jupiter', 2048: 'Saturn',
    4096: 'Uranus', 8192: 'Neptune', 16384: 'Gas Giant', 32768: 'Super Earth',
    65536: 'Lava Planet', 131072: 'Ice Giant', 262144: 'Metal Planet', 524288: 'Diamond Planet',
    1048576: 'Neutron Star', 2097152: 'White Dwarf', 4194304: 'Red Dwarf', 8388608: 'Yellow Dwarf',
    16777216: 'Blue Giant', 33554432: 'Red Giant', 67108864: 'Supergiant',
    134217728: 'Black Hole', 268435456: 'Quasar', 536870912: 'Galaxy',
  };

  const PLANET_NAMES_KO = {
    1: '작은 유성', 2: '얼음 소행성', 4: '철 소행성', 8: '소행성',
    16: '왜소 행성', 32: '위성', 64: '수성', 128: '금성',
    256: '지구', 512: '화성', 1024: '목성', 2048: '토성',
    4096: '천왕성', 8192: '해왕성', 16384: '거대 가스 행성', 32768: '슈퍼 지구',
    65536: '용암 행성', 131072: '얼음 거인', 262144: '금속 행성', 524288: '다이아몬드 행성',
    1048576: '중성자별', 2097152: '백색왜성', 4194304: '적색왜성', 8388608: '황색왜성',
    16777216: '청색거성', 33554432: '적색거성', 67108864: '초거성',
    134217728: '블랙홀', 268435456: '퀘이사', 536870912: '은하',
  };

  // ─── Utility Functions ─────────────────────────────────────────────────

  function lighten(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amt);
    g = Math.min(255, g + amt);
    b = Math.min(255, b + amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function darken(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - amt);
    g = Math.max(0, g - amt);
    b = Math.max(0, b - amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /** Format large numbers for display on balls */
  function formatNum(n) {
    if (n >= 1e9) return (n / 1e9 | 0) + 'G';
    if (n >= 1e6) return (n / 1e6 | 0) + 'M';
    if (n >= 10000) return (n / 1e3 | 0) + 'K';
    return String(n);
  }

  /** Draw a basic sphere with radial gradient */
  function drawSphere(ctx, x, y, r, colorLight, colorDark) {
    var grad = ctx.createRadialGradient(
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

  /** Draw number label centered on a body */
  function drawLabel(ctx, x, y, r, number, style) {
    var text = formatNum(number);
    var len = text.length;
    var dark = style === 'dark';
    var glow = style === 'glow';

    ctx.fillStyle = dark ? '#0A0E27' : '#FFFFFF';
    var fontSize = len >= 4 ? r * 0.42 : len >= 3 ? r * 0.52 : r * 0.7;
    ctx.font = 'bold ' + Math.max(8, fontSize) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (glow) {
      ctx.shadowColor = '#FF6B00';
      ctx.shadowBlur = 6;
    } else {
      ctx.shadowColor = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
    }
    ctx.fillText(text, x, y + 1);
    ctx.shadowBlur = 0;
  }

  /** Draw craters on a clipped circle */
  function drawCraters(ctx, x, y, r, craters, craterColor) {
    craters.forEach(function (c) {
      ctx.beginPath();
      ctx.arc(x + c.dx * r, y + c.dy * r, c.sr * r, 0, Math.PI * 2);
      ctx.fillStyle = craterColor || 'rgba(80, 80, 80, 0.35)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + c.dx * r + 1, y + c.dy * r + 1, c.sr * r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(50, 50, 50, 0.2)';
      ctx.fill();
    });
  }

  /** Draw horizontal atmospheric bands (for gas giants) */
  function drawBands(ctx, x, y, r, bands) {
    bands.forEach(function (b) {
      ctx.fillStyle = b.c;
      ctx.fillRect(x - r, y + b.y * r, r * 2, b.h * r);
    });
  }

  /** Draw star with corona glow effect */
  function drawStarBody(ctx, x, y, r, coreColor, midColor, outerColor, glowColor, glowStr) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = r * (glowStr || 0.5);

    var grad = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    grad.addColorStop(0, coreColor);
    grad.addColorStop(0.4, midColor);
    grad.addColorStop(1, outerColor);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Outer glow halo
    ctx.beginPath();
    ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
    ctx.fillStyle = glowColor.replace(')', ',0.1)').replace('rgb(', 'rgba(').replace('#', '');
    // Simple alpha overlay
    ctx.fillStyle = 'rgba(' + hexToRgb(glowColor) + ',0.1)';
    ctx.fill();
  }

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    return parseInt(h.substring(0,2),16)+','+parseInt(h.substring(2,4),16)+','+parseInt(h.substring(4,6),16);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDERERS: Small Bodies (1-8)
  // ══════════════════════════════════════════════════════════════════════

  // 1: 작은 유성 (Small Meteor) — tiny brown rock with fiery trail hint
  function draw_1(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#B8942A', '#5C3A08');
    // Surface bumps
    var spots = [
      { dx: 0.25, dy: -0.3, sr: 0.14 },
      { dx: -0.3, dy: 0.15, sr: 0.12 },
      { dx: 0.1, dy: 0.3, sr: 0.16 },
    ];
    ctx.fillStyle = 'rgba(60, 40, 10, 0.35)';
    spots.forEach(function (s) {
      ctx.beginPath();
      ctx.arc(x + s.dx * r, y + s.dy * r, s.sr * r, 0, Math.PI * 2);
      ctx.fill();
    });
    drawLabel(ctx, x, y, r, 1, 'light');
  }

  // 2: 얼음 소행성 (Ice Asteroid) — pale blue-white with icy facets
  function draw_2(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#D6F0FF', '#6AA8C8');
    // Ice crystal lines
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = r * 0.04;
    var lines = [
      [-0.3, -0.4, 0.2, 0.3],
      [0.15, -0.35, -0.25, 0.25],
      [-0.1, 0.1, 0.35, -0.15],
    ];
    lines.forEach(function (l) {
      ctx.beginPath();
      ctx.moveTo(x + l[0] * r, y + l[1] * r);
      ctx.lineTo(x + l[2] * r, y + l[3] * r);
      ctx.stroke();
    });
    // Ice glint spots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.15, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y + r * 0.2, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 2, 'dark');
  }

  // 4: 철 소행성 (Iron Asteroid) — dark metallic gray with metallic highlights
  function draw_4(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#9FA8B0', '#3A4048');
    // Metallic highlight streak
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(200, 210, 220, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.15, y - r * 0.2, r * 0.35, r * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Dark pits
    ctx.fillStyle = 'rgba(30, 30, 40, 0.3)';
    ctx.beginPath(); ctx.arc(x + r * 0.2, y + r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y + r * 0.25, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 4, 'light');
  }

  // 8: 소행성 (Asteroid) — classic brown rocky body with speckles
  function draw_8(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#A89070', '#5C4A32');
    var spots = [
      { dx: 0.25, dy: -0.3, sr: 0.15 },
      { dx: -0.35, dy: 0.1, sr: 0.12 },
      { dx: 0.1, dy: 0.35, sr: 0.18 },
      { dx: -0.15, dy: -0.2, sr: 0.1 },
      { dx: 0.3, dy: 0.2, sr: 0.13 },
    ];
    ctx.fillStyle = 'rgba(60, 40, 20, 0.35)';
    spots.forEach(function (s) {
      ctx.beginPath();
      ctx.arc(x + s.dx * r, y + s.dy * r, s.sr * r, 0, Math.PI * 2);
      ctx.fill();
    });
    drawLabel(ctx, x, y, r, 8, 'light');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDERERS: Minor Bodies (16-64)
  // ══════════════════════════════════════════════════════════════════════

  // 16: 왜소 행성 (Dwarf Planet) — Pluto-like, pale tan with subtle features
  function draw_16(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#DDD0A8', '#8A7A58');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Heart-shaped lighter region (like Pluto's Tombaugh Regio)
    ctx.fillStyle = 'rgba(230, 220, 195, 0.35)';
    ctx.beginPath();
    ctx.arc(x - r * 0.08, y + r * 0.05, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Subtle surface variation
    ctx.fillStyle = 'rgba(120, 100, 70, 0.2)';
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 16, 'dark');
  }

  // 32: 위성/달 (Moon) — silver-gray with craters
  function draw_32(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#E8E8E8', '#808080');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    drawCraters(ctx, x, y, r, [
      { dx: 0.2, dy: -0.25, sr: 0.2 },
      { dx: -0.3, dy: 0.15, sr: 0.25 },
      { dx: 0.15, dy: 0.3, sr: 0.15 },
      { dx: -0.1, dy: -0.35, sr: 0.12 },
    ], 'rgba(100, 100, 100, 0.4)');
    ctx.restore();
    drawLabel(ctx, x, y, r, 32, 'dark');
  }

  // 64: 수성 (Mercury) — dark gray, heavily cratered
  function draw_64(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#B0B0B0', '#505050');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    drawCraters(ctx, x, y, r, [
      { dx: 0.15, dy: -0.2, sr: 0.22 },
      { dx: -0.25, dy: 0.2, sr: 0.18 },
      { dx: 0.3, dy: 0.1, sr: 0.15 },
      { dx: -0.1, dy: -0.35, sr: 0.14 },
      { dx: 0.05, dy: 0.35, sr: 0.2 },
      { dx: -0.3, dy: -0.15, sr: 0.1 },
    ], 'rgba(60, 60, 60, 0.4)');
    ctx.restore();
    drawLabel(ctx, x, y, r, 64, 'light');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDERERS: Terrestrial Planets (128-512)
  // ══════════════════════════════════════════════════════════════════════

  // 128: 금성 (Venus) — yellowish with thick swirling cloud bands
  function draw_128(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#F0D870', '#9A7A20');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Thick atmosphere cloud bands
    var bands = [
      { y: -0.5, h: 0.2, c: 'rgba(220, 190, 80, 0.35)' },
      { y: -0.15, h: 0.15, c: 'rgba(200, 170, 60, 0.3)' },
      { y: 0.15, h: 0.18, c: 'rgba(230, 200, 90, 0.3)' },
      { y: 0.45, h: 0.15, c: 'rgba(190, 160, 50, 0.35)' },
    ];
    drawBands(ctx, x, y, r, bands);
    // Swirl patterns
    ctx.strokeStyle = 'rgba(255, 230, 140, 0.2)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(x + r * 0.1, y - r * 0.1, r * 0.35, 0.5, 2.8);
    ctx.stroke();
    ctx.restore();
    // Atmosphere glow
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(230, 200, 100, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLabel(ctx, x, y, r, 128, 'dark');
  }

  // 256: 지구 (Earth) — blue ocean, green continents, white clouds
  function draw_256(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#5CB8FF', '#0A4080');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Continents
    ctx.fillStyle = 'rgba(80, 160, 60, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.1, r * 0.3, r * 0.45, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y - r * 0.2, r * 0.35, r * 0.25, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.1, y + r * 0.25, r * 0.18, r * 0.28, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Cloud wisps
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.35, r * 0.4, 0.5, 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 0.2, y + r * 0.3, r * 0.35, 3.5, 5.5); ctx.stroke();
    ctx.restore();
    // Atmosphere glow
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLabel(ctx, x, y, r, 256, 'light');
  }

  // 512: 화성 (Mars) — rust red planet with polar cap
  function draw_512(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#E8613C', '#7B2A0A');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Polar ice cap
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.78, r * 0.45, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 230, 0.5)';
    ctx.fill();
    // Surface feature (Valles Marineris)
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y + r * 0.05);
    ctx.quadraticCurveTo(x, y - r * 0.1, x + r * 0.35, y + r * 0.15);
    ctx.strokeStyle = 'rgba(100, 30, 10, 0.3)';
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, x, y, r, 512, 'light');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDERERS: Gas/Ice Giants (1024-8192)
  // ══════════════════════════════════════════════════════════════════════

  // 1024: 목성 (Jupiter) — orange-brown with bands + Great Red Spot
  function draw_1024(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#E8A050', '#6B3A15');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    drawBands(ctx, x, y, r, [
      { y: -0.6, h: 0.15, c: 'rgba(180, 110, 50, 0.4)' },
      { y: -0.3, h: 0.12, c: 'rgba(220, 160, 80, 0.3)' },
      { y: -0.05, h: 0.1, c: 'rgba(160, 90, 40, 0.35)' },
      { y: 0.15, h: 0.14, c: 'rgba(200, 140, 60, 0.3)' },
      { y: 0.4, h: 0.12, c: 'rgba(170, 100, 50, 0.35)' },
    ]);
    // Great Red Spot
    ctx.beginPath();
    ctx.ellipse(x + r * 0.25, y + r * 0.18, r * 0.18, r * 0.12, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 50, 30, 0.5)';
    ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 1024, 'light');
  }

  // 2048: 토성 (Saturn) — golden planet with ring system
  function draw_2048(ctx, x, y, r) {
    var ringOuter = r * 1.7;
    var ringInner = r * 1.15;
    var ringTilt = r * 0.35;

    // Ring behind planet
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - ringOuter - 5, y, ringOuter * 2 + 10, ringOuter + 10);
    ctx.clip();
    _drawRing(ctx, x, y, ringOuter, ringInner, ringTilt, '#D2B060');
    ctx.restore();

    // Planet body
    drawSphere(ctx, x, y, r, '#F0D060', '#8B6914');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(180, 140, 40, 0.25)';
    ctx.fillRect(x - r, y - r * 0.15, r * 2, r * 0.12);
    ctx.fillRect(x - r, y + r * 0.2, r * 2, r * 0.1);
    ctx.restore();

    // Ring in front of planet
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - ringOuter - 5, y - ringOuter - 10, ringOuter * 2 + 10, ringOuter + 10);
    ctx.clip();
    _drawRing(ctx, x, y, ringOuter, ringInner, ringTilt, '#D2B060');
    ctx.restore();

    drawLabel(ctx, x, y, r, 2048, 'dark');
  }

  function _drawRing(ctx, x, y, outer, inner, tilt, baseColor) {
    ctx.beginPath();
    ctx.ellipse(x, y, outer, tilt, 0, 0, Math.PI * 2);
    ctx.strokeStyle = lighten(baseColor, 20) + '99';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, (outer + inner) / 2, tilt * 0.75, 0, 0, Math.PI * 2);
    ctx.strokeStyle = baseColor + '66';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, inner, tilt * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = darken(baseColor, 20) + '4D';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 4096: 천왕성 (Uranus) — turquoise/cyan with faint vertical ring
  function draw_4096(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#7EEEDE', '#1A7A70');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Very subtle bands
    ctx.fillStyle = 'rgba(100, 220, 200, 0.15)';
    ctx.fillRect(x - r, y - r * 0.2, r * 2, r * 0.08);
    ctx.fillRect(x - r, y + r * 0.15, r * 2, r * 0.06);
    ctx.restore();
    // Thin vertical ring (Uranus is tilted ~98°)
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 230, 220, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.25, r * 1.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, x, y, r, 4096, 'dark');
  }

  // 8192: 해왕성 (Neptune) — deep blue with bands and dark spot
  function draw_8192(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#5577FF', '#0A1A66');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    drawBands(ctx, x, y, r, [
      { y: -0.5, h: 0.08, c: 'rgba(80, 120, 255, 0.2)' },
      { y: -0.15, h: 0.08, c: 'rgba(80, 120, 255, 0.2)' },
      { y: 0.2, h: 0.08, c: 'rgba(80, 120, 255, 0.2)' },
      { y: 0.5, h: 0.08, c: 'rgba(80, 120, 255, 0.2)' },
    ]);
    // Great Dark Spot
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y - r * 0.1, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 30, 80, 0.35)';
    ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 8192, 'light');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDERERS: Exotic Planets (16384-524288)
  // ══════════════════════════════════════════════════════════════════════

  // 16384: 거대 가스 행성 (Giant Gas Planet) — purple/violet with dramatic swirls
  function draw_16384(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#B088F0', '#3D1A80');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    drawBands(ctx, x, y, r, [
      { y: -0.55, h: 0.18, c: 'rgba(160, 100, 220, 0.3)' },
      { y: -0.15, h: 0.12, c: 'rgba(120, 70, 200, 0.25)' },
      { y: 0.1, h: 0.16, c: 'rgba(180, 120, 240, 0.3)' },
      { y: 0.4, h: 0.14, c: 'rgba(140, 80, 210, 0.25)' },
    ]);
    // Storm vortex
    ctx.beginPath();
    ctx.ellipse(x - r * 0.15, y + r * 0.05, r * 0.22, r * 0.15, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 150, 255, 0.3)';
    ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 16384, 'light');
  }

  // 32768: 슈퍼 지구 (Super Earth) — larger Earth-like with more ocean
  function draw_32768(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#40C8A0', '#0A5040');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Large continents (emerald green)
    ctx.fillStyle = 'rgba(50, 180, 100, 0.5)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.15, r * 0.35, r * 0.5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.1, r * 0.25, r * 0.35, 0.4, 0, Math.PI * 2); ctx.fill();
    // Clouds
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.45, 0.3, 2.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.1, y + r * 0.35, r * 0.3, 3.8, 5.8); ctx.stroke();
    ctx.restore();
    // Thick atmosphere
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(60, 200, 160, 0.2)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawLabel(ctx, x, y, r, 32768, 'light');
  }

  // 65536: 용암 행성 (Lava Planet) — dark surface with glowing lava cracks
  function draw_65536(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#604030', '#201008');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Glowing lava cracks
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = r * 0.05;
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = r * 0.15;
    var cracks = [
      [[-0.4, -0.3], [0, 0.1], [0.3, -0.1]],
      [[-0.2, 0.4], [0.15, 0.2], [0.4, 0.35]],
      [[0.1, -0.4], [0.25, 0], [0.1, 0.35]],
    ];
    cracks.forEach(function (pts) {
      ctx.beginPath();
      ctx.moveTo(x + pts[0][0] * r, y + pts[0][1] * r);
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(x + pts[i][0] * r, y + pts[i][1] * r);
      }
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
    // Lava pools
    ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
    ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.15, y + r * 0.25, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Magma glow
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 69, 0, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLabel(ctx, x, y, r, 65536, 'light');
  }

  // 131072: 얼음 거인 (Ice Giant) — pale blue-white with ice patterns
  function draw_131072(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#D0E8F0', '#5888A0');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Ice crystal patterns
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = r * 0.03;
    for (var i = 0; i < 5; i++) {
      var cx2 = x + (Math.cos(i * 1.2) * r * 0.4);
      var cy2 = y + (Math.sin(i * 1.5) * r * 0.3);
      ctx.beginPath();
      for (var j = 0; j < 6; j++) {
        var a = j * Math.PI / 3;
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(cx2 + Math.cos(a) * r * 0.15, cy2 + Math.sin(a) * r * 0.15);
      }
      ctx.stroke();
    }
    // Subtle bands
    ctx.fillStyle = 'rgba(180, 210, 230, 0.2)';
    ctx.fillRect(x - r, y - r * 0.1, r * 2, r * 0.08);
    ctx.fillRect(x - r, y + r * 0.25, r * 2, r * 0.06);
    ctx.restore();
    drawLabel(ctx, x, y, r, 131072, 'dark');
  }

  // 262144: 금속 행성 (Metal Planet) — highly reflective metallic surface
  function draw_262144(ctx, x, y, r) {
    // Chrome-like gradient
    var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r);
    grad.addColorStop(0, '#F0F0F8');
    grad.addColorStop(0.3, '#C0C0D0');
    grad.addColorStop(0.6, '#808098');
    grad.addColorStop(1, '#404058');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Reflective highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.2, y - r * 0.25, r * 0.25, r * 0.08, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // Surface ridges
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.2)';
    ctx.lineWidth = r * 0.03;
    ctx.beginPath(); ctx.arc(x + r * 0.1, y + r * 0.1, r * 0.4, 1.0, 3.0); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.05, r * 0.5, 4.0, 5.5); ctx.stroke();
    ctx.restore();
    drawLabel(ctx, x, y, r, 262144, 'dark');
  }

  // 524288: 다이아몬드 행성 (Diamond Planet) — sparkling crystalline
  function draw_524288(ctx, x, y, r) {
    drawSphere(ctx, x, y, r, '#E8F8FF', '#60A0C0');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    // Facet lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = r * 0.025;
    var facets = [
      [-0.4, -0.3, 0.1, 0.4],
      [0.3, -0.35, -0.15, 0.3],
      [-0.2, -0.1, 0.35, 0.15],
      [0, -0.4, 0, 0.4],
      [-0.35, 0, 0.35, 0],
    ];
    facets.forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo(x + f[0] * r, y + f[1] * r);
      ctx.lineTo(x + f[2] * r, y + f[3] * r);
      ctx.stroke();
    });
    // Sparkle points
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    var sparkles = [
      { dx: -0.2, dy: -0.2, sr: 0.04 },
      { dx: 0.25, dy: -0.1, sr: 0.035 },
      { dx: -0.1, dy: 0.25, sr: 0.03 },
      { dx: 0.15, dy: 0.2, sr: 0.04 },
      { dx: 0, dy: -0.35, sr: 0.03 },
    ];
    sparkles.forEach(function (s) {
      ctx.beginPath();
      ctx.arc(x + s.dx * r, y + s.dy * r, s.sr * r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    // Prismatic glow
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(185, 242, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLabel(ctx, x, y, r, 524288, 'dark');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDERERS: Stars (1048576-67108864)
  // ══════════════════════════════════════════════════════════════════════

  // 1048576: 중성자별 (Neutron Star) — white pulse with energy ring
  function draw_1048576(ctx, x, y, r) {
    var pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.005);
    ctx.save();
    ctx.shadowColor = '#C0D0FF';
    ctx.shadowBlur = r * 0.6 * pulse;
    var grad = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.4, '#C8D8FF');
    grad.addColorStop(1, '#4060AA');
    ctx.beginPath();
    ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Energy ring
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 200, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r * 0.2, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Pulsar beam
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 220, 255, ' + (0.12 * pulse) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.6);
    ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, x, y, r, 1048576, 'dark');
  }

  // 2097152: 백색왜성 (White Dwarf) — bright compact white star
  function draw_2097152(ctx, x, y, r) {
    drawStarBody(ctx, x, y, r, '#FFFFFF', '#F0F0FF', '#A0A8C0', '#E0E0FF', 0.4);
    // Subtle pulsation ring
    ctx.save();
    ctx.strokeStyle = 'rgba(230, 230, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, x, y, r, 2097152, 'dark');
  }

  // 4194304: 적색왜성 (Red Dwarf) — small dim red star
  function draw_4194304(ctx, x, y, r) {
    drawStarBody(ctx, x, y, r, '#FF8866', '#CC4444', '#662222', '#CC4444', 0.35);
    // Surface granules
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 150, 100, 0.2)';
    ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.2, y + r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 4194304, 'light');
  }

  // 8388608: 황색왜성/태양 (Yellow Dwarf / Sun) — yellow with prominences
  function draw_8388608(ctx, x, y, r) {
    drawStarBody(ctx, x, y, r, '#FFFFF0', '#FFD700', '#CC8800', '#FFD700', 0.55);
    // Solar prominences (arcs extending from surface)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.25)';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.arc(x - r * 0.5, y - r * 0.6, r * 0.4, 1.2, 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.6, y + r * 0.3, r * 0.3, 3.5, 5.0);
    ctx.stroke();
    ctx.restore();
    // Sunspots
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(180, 120, 0, 0.25)';
    ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y + r * 0.2, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 8388608, 'dark');
  }

  // 16777216: 청색거성 (Blue Giant) — bright blue with rays
  function draw_16777216(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = '#4488FF';
    ctx.shadowBlur = r * 0.6;
    var grad = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.3, '#AACCFF');
    grad.addColorStop(1, '#2244AA');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Cross-shaped light rays
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.2)';
    ctx.lineWidth = 1.5;
    for (var i = 0; i < 4; i++) {
      var angle = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * r * 0.7, y + Math.sin(angle) * r * 0.7);
      ctx.lineTo(x + Math.cos(angle) * (r * 1.5), y + Math.sin(angle) * (r * 1.5));
      ctx.stroke();
    }
    ctx.restore();
    // Halo
    ctx.beginPath();
    ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(70, 140, 255, 0.1)';
    ctx.fill();
    drawLabel(ctx, x, y, r, 16777216, 'dark');
  }

  // 33554432: 적색거성 (Red Giant) — large red with corona glow
  function draw_33554432(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = r * 0.5;
    var grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.15);
    grad.addColorStop(0, '#FFD080');
    grad.addColorStop(0.5, '#FF5500');
    grad.addColorStop(1, '#AA1500');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Corona halo
    ctx.beginPath();
    ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 80, 20, 0.12)';
    ctx.fill();
    // Surface granules
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
    ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.2, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y + r * 0.15, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawLabel(ctx, x, y, r, 33554432, 'dark');
  }

  // 67108864: 초거성 (Supergiant) — massive gold with corona rays
  function draw_67108864(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = r * 0.7;
    var grad = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
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
    for (var i = 0; i < 8; i++) {
      var angle = (i * Math.PI) / 4;
      var len = (i % 2 === 0) ? r * 0.6 : r * 0.35;
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
    drawLabel(ctx, x, y, r, 67108864, 'dark');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDERERS: Cosmic Objects (134217728-536870912)
  // ══════════════════════════════════════════════════════════════════════

  // 134217728: 블랙홀 (Black Hole) — event horizon + accretion disk
  function draw_134217728(ctx, x, y, r) {
    ctx.save();
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = r * 0.6;
    // Accretion disk
    var diskGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.6);
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
    // Event horizon (black)
    ctx.beginPath();
    ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = '#050510';
    ctx.fill();
    // Gravitational lensing
    ctx.beginPath();
    ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 150, 50, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawLabel(ctx, x, y, r, 134217728, 'glow');
  }

  // 268435456: 퀘이사 (Quasar) — extremely bright center with jets
  function draw_268435456(ctx, x, y, r) {
    // Relativistic jets (behind)
    ctx.save();
    ctx.globalAlpha = 0.3;
    var jetGrad1 = ctx.createLinearGradient(x, y - r * 2, x, y);
    jetGrad1.addColorStop(0, 'rgba(187, 102, 255, 0)');
    jetGrad1.addColorStop(1, 'rgba(187, 102, 255, 0.5)');
    ctx.fillStyle = jetGrad1;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.15, y);
    ctx.lineTo(x - r * 0.35, y - r * 2);
    ctx.lineTo(x + r * 0.35, y - r * 2);
    ctx.lineTo(x + r * 0.15, y);
    ctx.fill();
    var jetGrad2 = ctx.createLinearGradient(x, y, x, y + r * 2);
    jetGrad2.addColorStop(0, 'rgba(187, 102, 255, 0.5)');
    jetGrad2.addColorStop(1, 'rgba(187, 102, 255, 0)');
    ctx.fillStyle = jetGrad2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.15, y);
    ctx.lineTo(x - r * 0.35, y + r * 2);
    ctx.lineTo(x + r * 0.35, y + r * 2);
    ctx.lineTo(x + r * 0.15, y);
    ctx.fill();
    ctx.restore();

    // Accretion disk
    ctx.save();
    ctx.shadowColor = '#BB66FF';
    ctx.shadowBlur = r * 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r * 0.25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(187, 102, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Bright core
    ctx.save();
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = r * 0.6;
    var coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.5, '#BB88FF');
    coreGrad.addColorStop(1, '#551199');
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    drawLabel(ctx, x, y, r, 268435456, 'light');
  }

  // 536870912: 은하 (Galaxy) — spiral arms
  function draw_536870912(ctx, x, y, r) {
    // Background glow
    ctx.save();
    ctx.shadowColor = '#7B68EE';
    ctx.shadowBlur = r * 0.5;
    var bgGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
    bgGrad.addColorStop(0, 'rgba(200, 180, 255, 0.5)');
    bgGrad.addColorStop(0.3, 'rgba(123, 104, 238, 0.3)');
    bgGrad.addColorStop(1, 'rgba(60, 40, 120, 0.05)');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Spiral arms
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Date.now() * 0.0002 % (Math.PI * 2)); // Slow rotation
    for (var arm = 0; arm < 2; arm++) {
      ctx.strokeStyle = 'rgba(200, 180, 255, 0.4)';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      for (var t = 0; t < 3.5; t += 0.1) {
        var spiralR = r * 0.1 + t * r * 0.22;
        var angle = t + arm * Math.PI;
        var sx = Math.cos(angle) * spiralR;
        var sy = Math.sin(angle) * spiralR * 0.5; // Flatten for tilt
        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Bright center (galactic core)
    var coreGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.3);
    coreGrad.addColorStop(0, '#FFFFFF');
    coreGrad.addColorStop(0.5, '#DDD0FF');
    coreGrad.addColorStop(1, 'rgba(123, 104, 238, 0)');
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Star dust particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    var dust = [
      { dx: 0.35, dy: -0.15 }, { dx: -0.4, dy: 0.1 },
      { dx: 0.15, dy: 0.35 }, { dx: -0.2, dy: -0.3 },
      { dx: 0.5, dy: 0.05 }, { dx: -0.45, dy: -0.2 },
      { dx: 0.1, dy: -0.45 }, { dx: -0.15, dy: 0.4 },
    ];
    dust.forEach(function (d) {
      ctx.beginPath();
      ctx.arc(x + d.dx * r, y + d.dy * r, r * 0.02, 0, Math.PI * 2);
      ctx.fill();
    });

    drawLabel(ctx, x, y, r, 536870912, 'light');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DISPATCH
  // ═══════════════════════════════════════════════════════════════════

  var renderers = {};
  renderers[1] = draw_1;
  renderers[2] = draw_2;
  renderers[4] = draw_4;
  renderers[8] = draw_8;
  renderers[16] = draw_16;
  renderers[32] = draw_32;
  renderers[64] = draw_64;
  renderers[128] = draw_128;
  renderers[256] = draw_256;
  renderers[512] = draw_512;
  renderers[1024] = draw_1024;
  renderers[2048] = draw_2048;
  renderers[4096] = draw_4096;
  renderers[8192] = draw_8192;
  renderers[16384] = draw_16384;
  renderers[32768] = draw_32768;
  renderers[65536] = draw_65536;
  renderers[131072] = draw_131072;
  renderers[262144] = draw_262144;
  renderers[524288] = draw_524288;
  renderers[1048576] = draw_1048576;
  renderers[2097152] = draw_2097152;
  renderers[4194304] = draw_4194304;
  renderers[8388608] = draw_8388608;
  renderers[16777216] = draw_16777216;
  renderers[33554432] = draw_33554432;
  renderers[67108864] = draw_67108864;
  renderers[134217728] = draw_134217728;
  renderers[268435456] = draw_268435456;
  renderers[536870912] = draw_536870912;

  /** Draw a full-detail celestial body at (x, y) with given radius and number */
  function drawPlanet(ctx, x, y, radius, number) {
    ctx.save();

    // Drop shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();

    var render = renderers[number];
    if (render) {
      render(ctx, x, y, radius);
    } else {
      // Fallback for unknown numbers
      drawSphere(ctx, x, y, radius, '#AAAAAA', '#666666');
      drawLabel(ctx, x, y, radius, number, 'light');
    }

    ctx.restore();
  }

  /** Simplified preview for drop ghost */
  function drawPlanetPreview(ctx, x, y, radius, number, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    var color = PLANET_COLORS[number] || '#AAAAAA';
    drawSphere(ctx, x, y, radius, lighten(color, 30), darken(color, 30));

    // Simple label
    var text = formatNum(number);
    var len = text.length;
    var isStar = number >= 1048576;
    ctx.fillStyle = isStar ? '#0A0E27' : '#FFFFFF';
    var fontSize = len >= 4 ? radius * 0.42 : len >= 3 ? radius * 0.52 : radius * 0.7;
    ctx.font = 'bold ' + Math.max(8, fontSize) + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);

    ctx.restore();
  }

  // ─── Public API ──────────────────────────────────────────────────────
  return {
    drawPlanet: drawPlanet,
    drawPlanetPreview: drawPlanetPreview,
    PLANET_COLORS: PLANET_COLORS,
    PLANET_NAMES: PLANET_NAMES,
    PLANET_NAMES_KO: PLANET_NAMES_KO,
    formatNum: formatNum,
  };
})();
