// ui.js - BOOM TEN UI Controller
const BoomTen = window.BoomTen || {};

BoomTen.UI = (function () {
  'use strict';

  // ─── DOM References ────────────────────────────────────────────────────────
  // Screens
  let splashScreen, gameScreen, gameoverScreen;

  // HUD elements (IDs from index.html)
  let hudScore;        // #hud-score
  let hudCombo;        // #hud-combo
  let hudComboBlock;   // #hud-combo-block
  let btnPause;        // #btn-pause

  // Game-over elements
  let elFinalScore;    // #final-score
  let elBestScore;     // #best-score

  // Pause modal
  let pauseModal;      // #pause-modal

  // Sound state (referenced by the sound-toggle button inside the pause card)
  let soundEnabled = true;

  // ─── init ──────────────────────────────────────────────────────────────────
  function init() {
    // Screens
    splashScreen   = document.getElementById('splash-screen');
    gameScreen     = document.getElementById('game-screen');
    gameoverScreen = document.getElementById('gameover-screen');

    // HUD
    hudScore      = document.getElementById('hud-score');
    hudCombo      = document.getElementById('hud-combo');
    hudComboBlock = document.getElementById('hud-combo-block');
    btnPause      = document.getElementById('btn-pause');

    // Game-over card
    elFinalScore = document.getElementById('final-score');
    elBestScore  = document.getElementById('best-score');

    // Pause modal
    pauseModal = document.getElementById('pause-modal');

    // ── Splash: tap anywhere on the screen to start ───────────────────────
    if (splashScreen) {
      splashScreen.addEventListener('click', _onSplashClick);
    }

    // Also wire the explicit "TAP TO START" button (has its own onclick but
    // we add a listener here so it always works even without window.__startGame)
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.stopPropagation(); // avoid double-fire with the screen listener
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
        // Placeholder: in production this triggers a rewarded ad SDK call
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
        togglePause(); // will resume because state is 'paused'
      });
    }

    // ── Pause modal: "처음부터" (restart from pause) ──────────────────────
    // The button inside the pause card has no unique id; select it by its
    // position inside .pause-actions as the last .btn-secondary.
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

    // ── Expose global hooks used by inline onclick attributes in HTML ──────
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
      soundIcon.setAttribute(
        'data-lucide',
        soundEnabled ? 'volume-2' : 'volume-x'
      );
      // Re-render the Lucide icon if the library is available
      if (window.lucide) {
        lucide.createIcons();
      }
    }

    if (soundLabel) {
      soundLabel.textContent = soundEnabled ? '사운드 ON' : '사운드 OFF';
    }

    // Notify the game engine if it exposes a sound API
    if (BoomTen.Game && typeof BoomTen.Game.setSoundEnabled === 'function') {
      BoomTen.Game.setSoundEnabled(soundEnabled);
    }
  }

  // ─── showScreen ───────────────────────────────────────────────────────────
  /**
   * Transition to the requested screen.
   * The CSS class `.hidden` sets `display: none`; `.screen` by itself uses
   * `display: flex` via the `.screen` rule in index.html.
   * @param {'splash'|'game'|'gameover'} screen
   */
  function showScreen(screen) {
    const all = [splashScreen, gameScreen, gameoverScreen];

    // Hide every screen first
    all.forEach(s => {
      if (!s) return;
      s.classList.add('hidden');
      s.classList.remove('flex');
    });

    // Determine the target
    let target = null;
    switch (screen) {
      case 'splash':   target = splashScreen;   break;
      case 'game':     target = gameScreen;      break;
      case 'gameover': target = gameoverScreen;  break;
      default:
        console.warn('[UI] showScreen: unknown screen "' + screen + '"');
        return;
    }

    if (target) {
      target.classList.remove('hidden');
      // The `.screen` CSS rule already handles flex layout;
      // adding the class here keeps it consistent with Tailwind utilities
      // and the existing CSS where `.screen.hidden { display: none }`.
      target.classList.add('flex');
    }
  }

  // ─── updateScore ──────────────────────────────────────────────────────────
  /**
   * Refresh the HUD score and combo indicators.
   * @param {number} score       - Current total score
   * @param {number} combo       - Current combo multiplier (1 = no combo)
   * @param {number} addedPoints - Points just added (for future toast use)
   */
  function updateScore(score, combo, addedPoints) {
    // Score display with pop animation
    if (hudScore) {
      hudScore.textContent = score.toLocaleString();
      // Remove then re-add the class so the animation restarts each update
      hudScore.classList.remove('pop');
      // Force reflow so the browser registers the removal before re-adding
      void hudScore.offsetWidth;
      hudScore.classList.add('pop');
    }

    // Combo display
    if (hudCombo) {
      hudCombo.textContent = combo > 1 ? `×${combo}` : '×1';

      // Remove all combo colour classes
      hudCombo.classList.remove('combo-0', 'combo-1', 'combo-3', 'combo-5', 'combo-10');

      if (combo >= 10) {
        hudCombo.classList.add('combo-10');
      } else if (combo >= 5) {
        hudCombo.classList.add('combo-5');
      } else if (combo >= 3) {
        hudCombo.classList.add('combo-3');
      } else if (combo >= 2) {
        hudCombo.classList.add('combo-1');
      } else {
        hudCombo.classList.add('combo-0');
      }

      // Scale the combo block with the multiplier (cap at ×2)
      if (hudComboBlock) {
        const scale = combo > 1 ? Math.min(1 + (combo - 1) * 0.08, 2) : 1;
        hudComboBlock.style.transform = `scale(${scale})`;
        hudComboBlock.style.transition = 'transform 0.15s ease';
      }
    }
  }

  // ─── showGameOver ─────────────────────────────────────────────────────────
  /**
   * Populate and reveal the game-over screen after a brief dramatic delay.
   * @param {number} score - Final score for this session
   * @param {number} best  - All-time best score (already updated by Game)
   */
  function showGameOver(score, best) {
    if (elFinalScore) {
      elFinalScore.textContent = score.toLocaleString();
    }
    if (elBestScore) {
      elBestScore.textContent = best.toLocaleString();
    }

    // Short delay for dramatic effect — lets the last explosion finish
    setTimeout(() => {
      showScreen('gameover');
    }, 500);
  }

  // ─── togglePause ──────────────────────────────────────────────────────────
  /**
   * Toggle between playing and paused states; shows/hides the pause modal.
   */
  function togglePause() {
    if (!BoomTen.Game || !BoomTen.Game.state) return;

    const state = BoomTen.Game.state.gameState;

    if (state === 'playing') {
      if (typeof BoomTen.Game.pause === 'function') {
        BoomTen.Game.pause();
      }
      if (pauseModal) {
        pauseModal.classList.remove('hidden');
        pauseModal.classList.add('flex');
      }
    } else if (state === 'paused') {
      if (typeof BoomTen.Game.resume === 'function') {
        BoomTen.Game.resume();
      }
      _hidePause();
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    init,
    showScreen,
    updateScore,
    showGameOver,
    togglePause,
  };
})();

window.BoomTen = BoomTen;
