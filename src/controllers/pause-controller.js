/**
 * PauseController manages pausing and resuming active study sessions.
 */
export class PauseController {
  constructor({
    btnPause = typeof document !== 'undefined' ? document.getElementById('btn-pause') : null,
    pauseBtnIcon = typeof document !== 'undefined' ? document.getElementById('pause-btn-icon') : null,
    pauseBtnText = typeof document !== 'undefined' ? document.getElementById('pause-btn-text') : null,
    btnPauseZen = typeof document !== 'undefined' ? document.getElementById('btn-pause-zen') : null,
    pauseZenIcon = typeof document !== 'undefined' ? document.getElementById('pause-zen-icon') : null,
    btnPauseCompact = typeof document !== 'undefined' ? document.getElementById('btn-pause-compact') : null,
    pauseCompactIcon = typeof document !== 'undefined' ? document.getElementById('pause-compact-icon') : null,
    pauseCompactText = typeof document !== 'undefined' ? document.getElementById('pause-compact-text') : null,
    pauseOverlay = typeof document !== 'undefined' ? document.getElementById('pause-overlay') : null,
    pauseTimerDisplay = typeof document !== 'undefined' ? document.getElementById('pause-timer-display') : null,
    btnResumeSession = typeof document !== 'undefined' ? document.getElementById('btn-resume-session') : null,
    onPause = null,
    onResume = null,
    formatTime = null,
    getTime = null
  } = {}) {
    this.isPaused = false;
    this.eventsBound = false;

    this.btnPause = btnPause;
    this.pauseBtnIcon = pauseBtnIcon;
    this.pauseBtnText = pauseBtnText;
    this.btnPauseZen = btnPauseZen;
    this.pauseZenIcon = pauseZenIcon;
    this.btnPauseCompact = btnPauseCompact;
    this.pauseCompactIcon = pauseCompactIcon;
    this.pauseCompactText = pauseCompactText;
    this.pauseOverlay = pauseOverlay;
    this.pauseTimerDisplay = pauseTimerDisplay;
    this.btnResumeSession = btnResumeSession;

    this.onPause = onPause;
    this.onResume = onResume;
    this.getTime = getTime;
    this.formatTime = formatTime || ((sec) => {
      const mins = Math.floor(sec / 60);
      const secs = sec % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });

    this.bindEvents();
  }

  resolveTime(currentSeconds) {
    if (typeof currentSeconds === 'number') return currentSeconds;
    if (typeof this.getTime === 'function') {
      const val = this.getTime();
      if (typeof val === 'number') return val;
    }
    return 0;
  }

  togglePause(currentSeconds) {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause(this.resolveTime(currentSeconds));
    }
  }

  pause(currentSeconds) {
    this.isPaused = true;
    const sec = this.resolveTime(currentSeconds);

    if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
    if (this.pauseTimerDisplay) {
      this.pauseTimerDisplay.textContent = this.formatTime(sec);
    }

    this.updateButtons(true);

    if (typeof this.onPause === 'function') {
      this.onPause();
    }
  }

  resume() {
    this.isPaused = false;

    if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');

    this.updateButtons(false);

    if (typeof this.onResume === 'function') {
      this.onResume();
    }
  }

  updateButtons(isPaused) {
    const icon = isPaused ? '▶️' : '⏸️';
    const text = isPaused ? 'Resume' : 'Pause';

    if (this.pauseBtnIcon) this.pauseBtnIcon.textContent = icon;
    if (this.pauseBtnText) this.pauseBtnText.textContent = text;
    if (this.pauseZenIcon) this.pauseZenIcon.textContent = icon;
    if (this.pauseCompactIcon) this.pauseCompactIcon.textContent = icon;
    if (this.pauseCompactText) this.pauseCompactText.textContent = text;
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    const toggle = () => this.togglePause();
    if (this.btnPause) this.btnPause.addEventListener('click', toggle);
    if (this.btnPauseZen) this.btnPauseZen.addEventListener('click', toggle);
    if (this.btnPauseCompact) this.btnPauseCompact.addEventListener('click', toggle);
    if (this.btnResumeSession) this.btnResumeSession.addEventListener('click', toggle);
  }
}
