/**
 * HudComponent manages HUD statistics cards, timer updates,
 * keyboard legends, and the session progress bar.
 */
export class HudComponent {
  constructor({
    statsHud = typeof document !== 'undefined' ? document.getElementById('stats-hud') : null,
    hudCard1 = typeof document !== 'undefined' ? document.getElementById('hud-card-1') : null,
    hudLabel1 = typeof document !== 'undefined' ? document.getElementById('hud-label-1') : null,
    hudVal1 = typeof document !== 'undefined' ? document.getElementById('hud-val-1') : null,
    hudCard2 = typeof document !== 'undefined' ? document.getElementById('hud-card-2') : null,
    hudLabel2 = typeof document !== 'undefined' ? document.getElementById('hud-label-2') : null,
    hudVal2 = typeof document !== 'undefined' ? document.getElementById('hud-val-2') : null,
    hudCard3 = typeof document !== 'undefined' ? document.getElementById('hud-card-3') : null,
    hudLabel3 = typeof document !== 'undefined' ? document.getElementById('hud-label-3') : null,
    hudVal3 = typeof document !== 'undefined' ? document.getElementById('hud-val-3') : null,
    hudCard4 = typeof document !== 'undefined' ? document.getElementById('hud-card-4') : null,
    hudLabel4 = typeof document !== 'undefined' ? document.getElementById('hud-label-4') : null,
    hudVal4 = typeof document !== 'undefined' ? document.getElementById('hud-val-4') : null,
    progressContainer = typeof document !== 'undefined' ? document.getElementById('progress-container') : null,
    progressBar = typeof document !== 'undefined' ? document.getElementById('progress-bar') : null,
    keyboardBar = typeof document !== 'undefined' ? document.getElementById('keyboard-bar') : null,
    kbdQuizLegend = typeof document !== 'undefined' ? document.getElementById('kbd-quiz-legend') : null,
    kbdFcLegend = typeof document !== 'undefined' ? document.getElementById('kbd-fc-legend') : null
  } = {}) {
    this.statsHud = statsHud;
    this.hudCard1 = hudCard1;
    this.hudLabel1 = hudLabel1;
    this.hudVal1 = hudVal1;
    this.hudCard2 = hudCard2;
    this.hudLabel2 = hudLabel2;
    this.hudVal2 = hudVal2;
    this.hudCard3 = hudCard3;
    this.hudLabel3 = hudLabel3;
    this.hudVal3 = hudVal3;
    this.hudCard4 = hudCard4;
    this.hudLabel4 = hudLabel4;
    this.hudVal4 = hudVal4;

    this.progressContainer = progressContainer;
    this.progressBar = progressBar;
    this.keyboardBar = keyboardBar;
    this.kbdQuizLegend = kbdQuizLegend;
    this.kbdFcLegend = kbdFcLegend;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateHUDTimer(timerSeconds) {
    if (this.hudVal3) {
      this.hudVal3.textContent = this.formatTime(timerSeconds);
    }
  }

  updateProgressBar(currentIndex, totalCount) {
    if (!this.progressBar) return;
    const pct = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;
    this.progressBar.style.width = `${pct}%`;
  }

  setupLabelsForMode(mode) {
    if (mode === 'flashcards') {
      if (this.hudLabel1) this.hudLabel1.textContent = 'Mastered';
      if (this.hudLabel2) this.hudLabel2.textContent = 'Need Review';
      if (this.hudLabel3) this.hudLabel3.textContent = 'Elapsed Time';
      if (this.hudLabel4) this.hudLabel4.textContent = 'Completion';

      if (this.kbdQuizLegend) this.kbdQuizLegend.classList.add('hidden');
      if (this.kbdFcLegend) this.kbdFcLegend.classList.remove('hidden');
    } else {
      if (this.hudLabel1) this.hudLabel1.textContent = 'Current Streak';
      if (this.hudLabel2) this.hudLabel2.textContent = 'Accuracy';
      if (this.hudLabel3) this.hudLabel3.textContent = 'Elapsed Time';
      if (this.hudLabel4) this.hudLabel4.textContent = 'Avg Speed / Q';

      if (this.kbdQuizLegend) this.kbdQuizLegend.classList.remove('hidden');
      if (this.kbdFcLegend) this.kbdFcLegend.classList.add('hidden');
    }
  }

  updateQuizHUD({ streak = 0, accuracyPct = 100, avgSpeed = '0.0' } = {}) {
    if (this.hudVal1) {
      this.hudVal1.textContent = `${streak}🔥`;
      this.hudVal1.className = 'stat-value streak';
    }
    if (this.hudVal2) {
      this.hudVal2.textContent = `${accuracyPct}%`;
      this.hudVal2.className = 'stat-value accuracy';
    }
    if (this.hudVal4) {
      this.hudVal4.textContent = `${avgSpeed}s`;
      this.hudVal4.className = 'stat-value';
    }
  }

  updateFlashcardHUD({ masteredCount = 0, reviewCount = 0, completionPct = 0 } = {}) {
    if (this.hudVal1) {
      this.hudVal1.textContent = `${masteredCount} ✅`;
      this.hudVal1.className = 'stat-value accuracy';
    }
    if (this.hudVal2) {
      this.hudVal2.textContent = `${reviewCount} ⚠️`;
      this.hudVal2.className = 'stat-value streak';
    }
    if (this.hudVal4) {
      this.hudVal4.textContent = `${completionPct}%`;
      this.hudVal4.className = 'stat-value';
    }
  }

  show() {
    if (this.statsHud) this.statsHud.classList.remove('hidden');
    if (this.progressContainer) this.progressContainer.classList.remove('hidden');
    if (this.keyboardBar) this.keyboardBar.classList.remove('hidden');
  }

  hide() {
    if (this.statsHud) this.statsHud.classList.add('hidden');
    if (this.progressContainer) this.progressContainer.classList.add('hidden');
    if (this.keyboardBar) this.keyboardBar.classList.add('hidden');
  }
}
