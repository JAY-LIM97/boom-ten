// ui.js - Planet 2048 UI Controller (2048 + Suika Game Hybrid)
window.BoomTen = window.BoomTen || {};

window.BoomTen.UI = (function () {
  'use strict';

  // ─── DOM References ────────────────────────────────────────────────────────
  let splashScreen, gameScreen, gameoverScreen;

  let hudScore;        // #hud-score
  let hudCombo;        // #hud-combo
  let hudComboBlock;   // #hud-combo-block
  let hudNextBall;     // #hud-next-ball
  let hudNextName;     // #hud-next-name (planet name label)
  let btnPause;        // #btn-pause

  let elFinalScore;    // #final-score
  let elBestScore;     // #best-score

  let pauseModal;      // #pause-modal

  let soundEnabled = true;

  // ─── init ──────────────────────────────────────────────────────────────────
  function init() {
    splashScreen   = document.getElementById('splash-screen');
    gameScreen     = document.getElementById('game-screen');
    gameoverScreen = document.getElementById('gameover-screen');

    hudScore      = document.getElementById('hud-score');
    hudCombo      = document.getElementById('hud-combo');
    hudComboBlock = document.getElementById('hud-combo-block');
    hudNextBall   = document.getElementById('hud-next-ball');
    hudNextName   = document.getElementById('hud-next-name');
    btnPause      = document.getElementById('btn-pause');

    elFinalScore = document.getElementById('final-score');
    elBestScore  = document.getElementById('best-score');

    pauseModal = document.getElementById('pause-modal');

    // ── Splash: tap anywhere on the screen to start ───────────────────────
    if (splashScreen) {
      splashScreen.addEventListener('click', _onSplashClick);
    }

    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.stopPropagation();
        _startFromSplash();
      });
    }

    // ── Pause button in HUD ────────────────────────────────────────────────
    if (btnPause) {
      btnPause.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
      });
    }

    // ── Game-over: "이어하기 (광고)" button ────────────────────────────────
    const btnContinueAd = document.getElementById('btn-continue-ad');
    if (btnContinueAd) {
      btnContinueAd.addEventListener('click', () => {
        alert('보상형 광고가 여기에 표시됩니다');
      });
    }

    // ── Game-over: "다시하기" button ───────────────────────────────────────
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        _restartGame();
      });
    }

    // ── Pause modal: "계속하기" (resume) ──────────────────────────────────
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        togglePause();
      });
    }

    // ── Pause modal: "처음부터" (restart from pause) ──────────────────────
    const pauseCard = pauseModal ? pauseModal.querySelector('.pause-card') : null;
    if (pauseCard) {
      const pauseRestartBtn = pauseCard.querySelector('.pause-actions .btn-secondary');
      if (pauseRestartBtn) {
        pauseRestartBtn.addEventListener('click', () => {
          _hidePause();
          _restartGame();
        });
      }
    }

    // ── Pause modal: sound toggle ──────────────────────────────────────────
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', _toggleSound);
    }

    // ── Auto-pause on tab hide ─────────────────────────────────────────────
    document.addEventListener('visibilitychange', () => {
      if (
        document.hidden &&
        BoomTen.Game &&
        BoomTen.Game.state &&
        BoomTen.Game.state.gameState === 'playing'
      ) {
        togglePause();
      }
    });

    // ── Global hooks for inline onclick ──────────────────────────────────
    window.__startGame   = _startFromSplash;
    window.__restartGame = _restartGame;
    window.__resumeGame  = () => {
      if (BoomTen.Game && BoomTen.Game.state.gameState === 'paused') {
        togglePause();
      }
    };
    window.__toggleSound = _toggleSound;
    window.__continueWithAd = () => {
      alert('보상형 광고가 여기에 표시됩니다');
    };
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  function _onSplashClick() {
    _startFromSplash();
  }

  function _startFromSplash() {
    showScreen('game');
    if (BoomTen.Game && typeof BoomTen.Game.startGame === 'function') {
      BoomTen.Game.startGame();
    }
  }

  function _restartGame() {
    showScreen('game');
    if (BoomTen.Effects && typeof BoomTen.Effects.clear === 'function') {
      BoomTen.Effects.clear();
    }
    if (BoomTen.Game && typeof BoomTen.Game.startGame === 'function') {
      BoomTen.Game.startGame();
    }
  }

  function _hidePause() {
    if (pauseModal) {
      pauseModal.classList.add('hidden');
      pauseModal.classList.remove('flex');
    }
  }

  function _toggleSound() {
    soundEnabled = !soundEnabled;
    const soundIcon  = document.getElementById('sound-icon');
    const soundLabel = document.getElementById('sound-label');
    if (soundIcon) {
      soundIcon.setAttribute('data-lucide', soundEnabled ? 'volume-2' : 'volume-x');
      if (window.lucide) lucide.createIcons();
    }
    if (soundLabel) {
      soundLabel.textContent = soundEnabled ? '사운드 ON' : '사운드 OFF';
    }
    if (BoomTen.Game && typeof BoomTen.Game.setSoundEnabled === 'function') {
      BoomTen.Game.setSoundEnabled(soundEnabled);
    }
  }

  // ─── showScreen ───────────────────────────────────────────────────────────
  function showScreen(screen) {
    const all = [splashScreen, gameScreen, gameoverScreen];
    all.forEach(s => {
      if (!s) return;
      s.classList.add('hidden');
      s.classList.remove('flex');
    });

    let target = null;
    switch (screen) {
      case 'splash':   target = splashScreen;   break;
      case 'game':     target = gameScreen;      break;
      case 'gameover': target = gameoverScreen;  break;
      default: return;
    }

    if (target) {
      target.classList.remove('hidden');
      target.classList.add('flex');
    }
  }

  // ─── updateScore ──────────────────────────────────────────────────────────
  /**
   * Refresh the HUD score display.
   * In 2048+Suika mode, score = highest ball number.
   */
  function updateScore(score, combo, addedPoints) {
    if (hudScore) {
      // Use abbreviated format for very large numbers
      hudScore.textContent = BoomTen.Planets && BoomTen.Planets.formatNum
        ? BoomTen.Planets.formatNum(score)
        : score.toLocaleString();
      hudScore.classList.remove('pop');
      void hudScore.offsetWidth;
      hudScore.classList.add('pop');
    }

    if (hudCombo) {
      hudCombo.textContent = combo > 1 ? `x${combo}` : '';
      hudCombo.classList.remove('combo-0', 'combo-1', 'combo-3', 'combo-5', 'combo-10');

      if (combo >= 10)     hudCombo.classList.add('combo-10');
      else if (combo >= 5) hudCombo.classList.add('combo-5');
      else if (combo >= 3) hudCombo.classList.add('combo-3');
      else if (combo >= 2) hudCombo.classList.add('combo-1');
      else                 hudCombo.classList.add('combo-0');

      if (hudComboBlock) {
        const scale = combo > 1 ? Math.min(1 + (combo - 1) * 0.08, 2) : 1;
        hudComboBlock.style.transform = `scale(${scale})`;
        hudComboBlock.style.transition = 'transform 0.15s ease';
      }
    }
  }

  // ─── updateNextBall ───────────────────────────────────────────────────────
  /**
   * Update the next-ball preview display in the HUD.
   * @param {number} number - The next ball's number.
   * @param {string} color  - The next ball's CSS color.
   */
  function updateNextBall(number, color) {
    if (!hudNextBall) return;
    hudNextBall.textContent = BoomTen.Planets && BoomTen.Planets.formatNum
      ? BoomTen.Planets.formatNum(number) : number;
    hudNextBall.style.backgroundColor = color;

    // Show planet name below the preview
    if (hudNextName && BoomTen.Planets) {
      hudNextName.textContent = BoomTen.Planets.PLANET_NAMES_KO[number] || '';
    }

    // Pop animation
    hudNextBall.classList.remove('pop');
    void hudNextBall.offsetWidth;
    hudNextBall.classList.add('pop');
  }

  // ─── showGameOver ─────────────────────────────────────────────────────────
  function showGameOver(score, best) {
    var fmt = BoomTen.Planets && BoomTen.Planets.formatNum
      ? BoomTen.Planets.formatNum : function(n) { return n.toLocaleString(); };
    if (elFinalScore) elFinalScore.textContent = fmt(score);
    if (elBestScore)  elBestScore.textContent  = fmt(best);

    setTimeout(() => {
      showScreen('gameover');
    }, 500);
  }

  // ─── togglePause ──────────────────────────────────────────────────────────
  function togglePause() {
    if (!BoomTen.Game || !BoomTen.Game.state) return;
    const gs = BoomTen.Game.state.gameState;

    if (gs === 'playing') {
      if (typeof BoomTen.Game.pause === 'function') BoomTen.Game.pause();
      if (pauseModal) {
        pauseModal.classList.remove('hidden');
        pauseModal.classList.add('flex');
      }
    } else if (gs === 'paused') {
      if (typeof BoomTen.Game.resume === 'function') BoomTen.Game.resume();
      _hidePause();
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    init,
    showScreen,
    updateScore,
    updateNextBall,
    showGameOver,
    togglePause,
  };
})();
