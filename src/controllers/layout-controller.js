import { storageService } from '../services/storage.js';

/**
 * LayoutController manages top bars visibility (compact mode) and Zen fullscreen mode.
 */
export class LayoutController {
  constructor({
    storage = storageService,
    btnToggleBars = typeof document !== 'undefined' ? document.getElementById('btn-toggle-bars') : null,
    toggleBarsIcon = typeof document !== 'undefined' ? document.getElementById('toggle-bars-icon') : null,
    toggleBarsText = typeof document !== 'undefined' ? document.getElementById('toggle-bars-text') : null,
    compactTopBar = typeof document !== 'undefined' ? document.getElementById('compact-top-bar') : null,
    btnShowBars = typeof document !== 'undefined' ? document.getElementById('btn-show-bars') : null,
    compactDeckTitle = typeof document !== 'undefined' ? document.getElementById('compact-deck-title') : null,
    compactCounter = typeof document !== 'undefined' ? document.getElementById('compact-counter') : null,
    btnFullscreen = typeof document !== 'undefined' ? document.getElementById('btn-fullscreen') : null,
    btnFullscreenCompact = typeof document !== 'undefined' ? document.getElementById('btn-fullscreen-compact') : null,
    fullscreenZenBar = typeof document !== 'undefined' ? document.getElementById('fullscreen-zen-bar') : null,
    zenQuizTitle = typeof document !== 'undefined' ? document.getElementById('zen-quiz-title') : null,
    zenCounter = typeof document !== 'undefined' ? document.getElementById('zen-counter') : null,
    zenStreak = typeof document !== 'undefined' ? document.getElementById('zen-streak') : null,
    zenAccuracy = typeof document !== 'undefined' ? document.getElementById('zen-accuracy') : null,
    btnExitZen = typeof document !== 'undefined' ? document.getElementById('btn-exit-zen') : null,
    onMetaRefresh = null
  } = {}) {
    this.storage = storage;
    this.isTopBarsHidden = this.storage.getTopBarsHidden();

    this.btnToggleBars = btnToggleBars;
    this.toggleBarsIcon = toggleBarsIcon;
    this.toggleBarsText = toggleBarsText;
    this.compactTopBar = compactTopBar;
    this.btnShowBars = btnShowBars;
    this.compactDeckTitle = compactDeckTitle;
    this.compactCounter = compactCounter;

    this.btnFullscreen = btnFullscreen;
    this.btnFullscreenCompact = btnFullscreenCompact;
    this.fullscreenZenBar = fullscreenZenBar;
    this.zenQuizTitle = zenQuizTitle;
    this.zenCounter = zenCounter;
    this.zenStreak = zenStreak;
    this.zenAccuracy = zenAccuracy;
    this.btnExitZen = btnExitZen;

    this.onMetaRefresh = onMetaRefresh;
    this.eventsBound = false;
  }

  initLayout() {
    this.applyTopBarsVisibility();
    this.bindEvents();
  }

  toggleTopBars() {
    this.isTopBarsHidden = !this.isTopBarsHidden;
    this.applyTopBarsVisibility();
    this.storage.setTopBarsHidden(this.isTopBarsHidden);
  }

  applyTopBarsVisibility() {
    if (this.isTopBarsHidden) {
      document.body.classList.add('top-bars-hidden');
      if (this.toggleBarsText) this.toggleBarsText.textContent = 'Show Bars';
      if (this.compactTopBar) this.compactTopBar.classList.remove('hidden');
    } else {
      document.body.classList.remove('top-bars-hidden');
      if (this.toggleBarsText) this.toggleBarsText.textContent = 'Hide Bars';
      if (this.compactTopBar) this.compactTopBar.classList.add('hidden');
    }

    if (typeof this.onMetaRefresh === 'function') {
      this.onMetaRefresh();
    }
  }

  updateCompactMeta(title, counter) {
    if (this.compactDeckTitle && title !== undefined) {
      this.compactDeckTitle.textContent = title || 'Study';
    }
    if (this.compactCounter && counter !== undefined) {
      this.compactCounter.textContent = counter;
    }
  }

  updateZenHUD({ title, counter, streak, accuracy } = {}) {
    if (this.zenQuizTitle && title !== undefined) this.zenQuizTitle.textContent = title;
    if (this.zenCounter && counter !== undefined) this.zenCounter.textContent = counter;
    if (this.zenStreak && streak !== undefined) this.zenStreak.textContent = streak;
    if (this.zenAccuracy && accuracy !== undefined) this.zenAccuracy.textContent = accuracy;
  }

  toggleZenMode() {
    const isZen = document.body.classList.contains('fullscreen-mode');
    if (!isZen) {
      document.body.classList.add('fullscreen-mode');
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      this.exitZenMode();
    }
  }

  exitZenMode() {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    document.body.classList.remove('fullscreen-mode');
  }

  onFullscreenChange() {
    const isFs = !!document.fullscreenElement;
    if (isFs) {
      document.body.classList.add('fullscreen-mode');
    } else {
      document.body.classList.remove('fullscreen-mode');
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.btnToggleBars) {
      this.btnToggleBars.addEventListener('click', () => this.toggleTopBars());
    }
    if (this.btnShowBars) {
      this.btnShowBars.addEventListener('click', () => this.toggleTopBars());
    }
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', () => this.toggleZenMode());
    }
    if (this.btnFullscreenCompact) {
      this.btnFullscreenCompact.addEventListener('click', () => this.toggleZenMode());
    }
    if (this.btnExitZen) {
      this.btnExitZen.addEventListener('click', () => this.exitZenMode());
    }
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
  }
}
