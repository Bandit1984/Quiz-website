import { parseQuestionBank, parseFlashcardBank, detectBankType, formatQuestionText } from './parser.js';

class QuizApp {
  constructor() {
    this.storageKeyQuizBank = 'quiz_bank_raw';
    this.storageKeyFlashcardBank = 'flashcard_bank_raw';
    this.storageKeyMistakes = 'quiz_drill_mistakes';
    this.storageKeyHistory = 'quiz_drill_history';
    this.storageKeyThemeMode = 'quiz_theme_mode';
    this.storageKeyTheme = 'quiz_theme_id';
    this.storageKeyFCMastered = 'fc_mastered_ids';
    this.storageKeyFCReview = 'fc_review_ids';

    // Bank & Question Pool State
    this.storedQuizRaw = localStorage.getItem(this.storageKeyQuizBank) || null;
    this.storedFCRaw = localStorage.getItem(this.storageKeyFlashcardBank) || null;

    this.quizBankData = { title: '', quizzes: [], totalQuestions: 0 };
    this.flashcardBankData = { title: '', decks: [], totalCards: 0 };

    this.selectedQuizIds = new Set();
    this.selectedDeckIds = new Set();

    this.allQuestions = [];
    this.activeQuestions = [];
    this.allCards = [];
    this.activeCards = [];

    this.currentIndex = 0;
    this.isCardFlipped = false;

    // Study Session State
    this.mode = 'drill'; // 'drill' | 'exam' | 'flashcards'
    this.order = 'original'; // 'original' | 'shuffle' | 'mistake'
    this.userAnswers = {}; // { [qId]: number | number[] }
    this.isAnswered = false;
    this.selectedMultiOptions = new Set();

    // Timer & Metrics
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.questionStartTime = Date.now();
    this.questionDurations = {};

    // Streaks, Mistakes & Flashcard Mastery
    this.streak = 0;
    this.maxStreak = 0;
    this.mistakesSet = new Set(JSON.parse(localStorage.getItem(this.storageKeyMistakes) || '[]'));
    this.fcMasteredSet = new Set(JSON.parse(localStorage.getItem(this.storageKeyFCMastered) || '[]'));
    this.fcReviewSet = new Set(JSON.parse(localStorage.getItem(this.storageKeyFCReview) || '[]'));

    this.autoAdvanceMs = 500; // 0.5s default as requested
    this.autoAdvanceTimeout = null;

    // Modal active tab
    this.activeModalTab = 'quiz'; // 'quiz' | 'flashcard'

    // Pause state
    this.isPaused = false;

    // Text Zoom Font Scaling (Expanded 75% to 175%)
    this.fontScaleLevels = [0.75, 0.85, 1.0, 1.15, 1.35, 1.55, 1.75];
    this.fontScaleIndex = 2; // Default 1.0 (100%)
    this.storageKeyFontScale = 'quiz_drill_font_scale';

    // Collapsed Top Bars State
    this.storageKeyTopBarsHidden = 'quiz_drill_top_bars_hidden';
    this.isTopBarsHidden = localStorage.getItem(this.storageKeyTopBarsHidden) === 'true';

    // Keybinds Configuration
    this.storageKeyKeybindStyle = 'quiz_drill_keybind_style';
    this.storageKeyCustomKeys = 'quiz_drill_custom_keys';
    this.keybindStyle = localStorage.getItem(this.storageKeyKeybindStyle) || 'numbers'; // 'numbers' | 'qwerty' | 'homerow' | 'custom'
    this.customKeys = localStorage.getItem(this.storageKeyCustomKeys) || '1234567890';

    // DOM Elements & Theme
    this.initDOMElements();
    this.initTheme();
    this.initFontScale();
    this.initTopBarsVisibility();
    this.initKeybinds();
    this.bindEvents();

    // Initialize Banks or Empty State
    this.loadBank();
  }

  initDOMElements() {
    // Header & Theme
    this.brandTitle = document.getElementById('brand-title');
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.themeIconSun = document.getElementById('theme-icon-sun');
    this.themeIconMoon = document.getElementById('theme-icon-moon');
    this.themePills = document.querySelectorAll('.theme-pill');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnManageBank = document.getElementById('btn-manage-bank');
    this.restartBtn = document.getElementById('btn-restart');

    // Hide / Show Top Bars Button
    this.btnToggleBars = document.getElementById('btn-toggle-bars');
    this.toggleBarsIcon = document.getElementById('toggle-bars-icon');
    this.toggleBarsText = document.getElementById('toggle-bars-text');

    // Zoom & Pause Controls
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.zoomLevelLabel = document.getElementById('zoom-level-label');
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnPause = document.getElementById('btn-pause');
    this.pauseBtnIcon = document.getElementById('pause-btn-icon');
    this.pauseBtnText = document.getElementById('pause-btn-text');

    // Compact Top Bar Elements
    this.compactTopBar = document.getElementById('compact-top-bar');
    this.btnShowBars = document.getElementById('btn-show-bars');
    this.compactDeckTitle = document.getElementById('compact-deck-title');
    this.compactCounter = document.getElementById('compact-counter');
    this.btnZoomOutCompact = document.getElementById('btn-zoom-out-compact');
    this.zoomLevelLabelCompact = document.getElementById('zoom-level-label-compact');
    this.btnZoomInCompact = document.getElementById('btn-zoom-in-compact');
    this.btnPauseCompact = document.getElementById('btn-pause-compact');
    this.pauseCompactIcon = document.getElementById('pause-compact-icon');
    this.pauseCompactText = document.getElementById('pause-compact-text');
    this.btnFullscreenCompact = document.getElementById('btn-fullscreen-compact');

    // Keybinds Elements
    this.btnKeybinds = document.getElementById('btn-keybinds');
    this.keybindsModal = document.getElementById('keybinds-modal');
    this.keybindsCloseBtn = document.getElementById('keybinds-close-btn');
    this.btnResetKeybinds = document.getElementById('btn-reset-keybinds');
    this.btnSaveKeybinds = document.getElementById('btn-save-keybinds');
    this.customKeysContainer = document.getElementById('custom-keys-container');
    this.customKeysInput = document.getElementById('custom-keys-input');
    this.keybindRadioInputs = document.querySelectorAll('input[name="keybind-preset"]');

    // Zen Fullscreen Bar
    this.fullscreenZenBar = document.getElementById('fullscreen-zen-bar');
    this.zenQuizTitle = document.getElementById('zen-quiz-title');
    this.zenCounter = document.getElementById('zen-counter');
    this.btnZoomOutZen = document.getElementById('btn-zoom-out-zen');
    this.zoomLevelLabelZen = document.getElementById('zoom-level-label-zen');
    this.btnZoomInZen = document.getElementById('btn-zoom-in-zen');
    this.btnPauseZen = document.getElementById('btn-pause-zen');
    this.pauseZenIcon = document.getElementById('pause-zen-icon');
    this.zenStreak = document.getElementById('zen-streak');
    this.zenAccuracy = document.getElementById('zen-accuracy');
    this.btnExitZen = document.getElementById('btn-exit-zen');

    // Pause Overlay
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.pauseTimerDisplay = document.getElementById('pause-timer-display');
    this.btnResumeSession = document.getElementById('btn-resume-session');

    // Empty State Views & Drop Zones
    this.emptyStateView = document.getElementById('empty-state-view');
    this.dropZoneQuiz = document.getElementById('drop-zone-quiz');
    this.dropZoneFlashcard = document.getElementById('drop-zone-flashcard');
    this.quizFileInput = document.getElementById('quiz-file-input');
    this.flashcardFileInput = document.getElementById('flashcard-file-input');
    this.btnPasteQuizEmpty = document.getElementById('btn-paste-quiz-empty');
    this.btnPasteFlashcardEmpty = document.getElementById('btn-paste-flashcard-empty');
    this.mainAppContent = document.getElementById('main-app-content');

    // Top Toolbar & Filters
    this.topToolbar = document.getElementById('top-toolbar');
    this.btnQuizDropdown = document.getElementById('btn-quiz-dropdown');
    this.quizDropdownLabel = document.getElementById('quiz-dropdown-label');
    this.quizDropdownPopover = document.getElementById('quiz-dropdown-popover');
    this.popoverHeaderTitle = document.getElementById('popover-header-title');
    this.btnSelectAllQuizzes = document.getElementById('btn-select-all-quizzes');
    this.quizDropdownList = document.getElementById('quiz-dropdown-list');

    // Mode Buttons
    this.modeDrillBtn = document.getElementById('mode-drill');
    this.modeExamBtn = document.getElementById('mode-exam');
    this.modeFlashcardsBtn = document.getElementById('mode-flashcards');

    // Toggles
    this.shuffleToggle = document.getElementById('shuffle-toggle');
    this.autoadvanceControl = document.getElementById('autoadvance-control');
    this.autoAdvanceToggle = document.getElementById('autoadvance-toggle');

    // HUD Stats
    this.statsHud = document.getElementById('stats-hud');
    this.hudCard1 = document.getElementById('hud-card-1');
    this.hudLabel1 = document.getElementById('hud-label-1');
    this.hudVal1 = document.getElementById('hud-val-1');
    this.hudCard2 = document.getElementById('hud-card-2');
    this.hudLabel2 = document.getElementById('hud-label-2');
    this.hudVal2 = document.getElementById('hud-val-2');
    this.hudCard3 = document.getElementById('hud-card-3');
    this.hudLabel3 = document.getElementById('hud-label-3');
    this.hudVal3 = document.getElementById('hud-val-3');
    this.hudCard4 = document.getElementById('hud-card-4');
    this.hudLabel4 = document.getElementById('hud-label-4');
    this.hudVal4 = document.getElementById('hud-val-4');

    this.progressContainer = document.getElementById('progress-container');
    this.progressBar = document.getElementById('progress-bar');
    this.keyboardBar = document.getElementById('keyboard-bar');
    this.kbdQuizLegend = document.getElementById('kbd-quiz-legend');
    this.kbdFcLegend = document.getElementById('kbd-fc-legend');

    // 1. MCQ Quiz View
    this.quizView = document.getElementById('quiz-view');
    this.questionContentArea = document.querySelector('.question-content-area');
    this.qQuizTitle = document.getElementById('q-quiz-title');
    this.qCounter = document.getElementById('q-counter');
    this.multiSelectBadge = document.getElementById('multi-select-badge');
    this.questionText = document.getElementById('question-text');
    this.optionsList = document.getElementById('options-list');
    this.feedbackBox = document.getElementById('feedback-box');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnSubmitAnswer = document.getElementById('btn-submit-answer');
    this.btnNext = document.getElementById('btn-next');
    this.btnNextLabel = document.getElementById('btn-next-label');

    // 2. Flashcard View
    this.flashcardView = document.getElementById('flashcard-view');
    this.fcDeckTitle = document.getElementById('fc-deck-title');
    this.fcStatusPill = document.getElementById('fc-status-pill');
    this.fcCounter = document.getElementById('fc-counter');
    this.flashcardScene = document.getElementById('flashcard-scene');
    this.flashcardCard = document.getElementById('flashcard-card');
    this.fcQuestionText = document.getElementById('fc-question-text');
    this.fcAnswerText = document.getElementById('fc-answer-text');
    this.fcBtnPrev = document.getElementById('fc-btn-prev');
    this.fcBtnFlip = document.getElementById('fc-btn-flip');
    this.fcBtnReview = document.getElementById('fc-btn-review');
    this.fcBtnMastered = document.getElementById('fc-btn-mastered');
    this.fcBtnNext = document.getElementById('fc-btn-next');

    // Summary View
    this.summaryView = document.getElementById('summary-view');
    this.summaryMainTitle = document.getElementById('summary-main-title');
    this.summaryScore = document.getElementById('summary-score');
    this.summarySubtitle = document.getElementById('summary-subtitle');
    this.summaryAccuracy = document.getElementById('summary-accuracy');
    this.summaryTime = document.getElementById('summary-time');
    this.summaryStreak = document.getElementById('summary-streak');
    this.summaryAvgSpeed = document.getElementById('summary-avg-speed');
    this.sumStatLbl1 = document.getElementById('sum-stat-lbl-1');
    this.sumStatLbl2 = document.getElementById('sum-stat-lbl-2');
    this.sumStatLbl3 = document.getElementById('sum-stat-lbl-3');
    this.sumStatLbl4 = document.getElementById('sum-stat-lbl-4');
    this.btnRetryMistakes = document.getElementById('btn-retry-mistakes');
    this.btnRestartQuiz = document.getElementById('btn-restart-quiz');

    // Overall General Stats & Analytics
    this.summaryAnalyticsSection = document.getElementById('summary-analytics-section');
    this.summaryReviewSection = document.getElementById('summary-review-section');
    this.analyticsTrendBadge = document.getElementById('analytics-trend-badge');
    this.overallSessionsCount = document.getElementById('overall-sessions-count');
    this.overallAccuracy = document.getElementById('overall-accuracy');
    this.overallTotalQuestions = document.getElementById('overall-total-questions');
    this.overallBestStreak = document.getElementById('overall-best-streak');
    this.overallAvgSpeed = document.getElementById('overall-avg-speed');
    this.chartContainer = document.getElementById('chart-container');
    this.reviewTitle = document.getElementById('review-title');
    this.reviewList = document.getElementById('review-list');

    // Bank Manager Modal Elements
    this.bankModal = document.getElementById('bank-modal');
    this.modalCloseBtn = document.getElementById('modal-close-btn');
    this.tabBtnQuiz = document.getElementById('tab-btn-quiz');
    this.tabBtnFlashcard = document.getElementById('tab-btn-flashcard');
    this.tabPanelQuiz = document.getElementById('tab-panel-quiz');
    this.tabPanelFlashcard = document.getElementById('tab-panel-flashcard');

    this.quizBankStatusText = document.getElementById('quiz-bank-status-text');
    this.fcBankStatusText = document.getElementById('fc-bank-status-text');
    this.modalQuizFileInput = document.getElementById('modal-quiz-file-input');
    this.modalFcFileInput = document.getElementById('modal-fc-file-input');
    this.modalQuizTextarea = document.getElementById('modal-quiz-textarea');
    this.modalFcTextarea = document.getElementById('modal-fc-textarea');

    this.quizParsePreviewBox = document.getElementById('quiz-parse-preview-box');
    this.fcParsePreviewBox = document.getElementById('fc-parse-preview-box');
    this.quizPreviewSummaryText = document.getElementById('quiz-preview-summary-text');
    this.fcPreviewSummaryText = document.getElementById('fc-preview-summary-text');
    this.quizPreviewList = document.getElementById('quiz-preview-list');
    this.fcPreviewList = document.getElementById('fc-preview-list');

    this.btnClearActiveBank = document.getElementById('btn-clear-active-bank');
    this.btnCancelModal = document.getElementById('btn-cancel-modal');
    this.btnSaveActiveBank = document.getElementById('btn-save-active-bank');
  }

  initTheme() {
    const validThemes = ['blue', 'zinc', 'violet', 'green', 'rose', 'orange'];
    const savedMode = localStorage.getItem(this.storageKeyThemeMode) || 'light';

    if (savedMode === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      if (this.themeIconSun) this.themeIconSun.classList.add('hidden');
      if (this.themeIconMoon) this.themeIconMoon.classList.remove('hidden');
      if (this.btnThemeToggle) this.btnThemeToggle.title = 'Switch to Light Mode';
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      if (this.themeIconSun) this.themeIconSun.classList.remove('hidden');
      if (this.themeIconMoon) this.themeIconMoon.classList.add('hidden');
      if (this.btnThemeToggle) this.btnThemeToggle.title = 'Switch to Dark Mode';
    }

    let savedTheme = localStorage.getItem(this.storageKeyTheme) || 'blue';
    if (!validThemes.includes(savedTheme)) savedTheme = 'blue';
    this.applyTheme(savedTheme, false);
  }

  applyTheme(themeId, persist = true) {
    const validThemes = ['blue', 'zinc', 'violet', 'green', 'rose', 'orange'];
    if (!validThemes.includes(themeId)) themeId = 'blue';
    document.body.dataset.theme = themeId;
    if (persist) localStorage.setItem(this.storageKeyTheme, themeId);
    if (this.themePills) {
      this.themePills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.theme === themeId);
      });
    }

    if (this.summaryView && !this.summaryView.classList.contains('hidden')) {
      const history = JSON.parse(localStorage.getItem(this.storageKeyHistory) || '[]');
      this.renderImprovementChart(history);
    }
  }

  toggleThemeMode() {
    const isDark = document.body.classList.toggle('dark');
    document.body.classList.toggle('light', !isDark);
    const newMode = isDark ? 'dark' : 'light';
    localStorage.setItem(this.storageKeyThemeMode, newMode);

    if (this.themeIconSun) this.themeIconSun.classList.toggle('hidden', isDark);
    if (this.themeIconMoon) this.themeIconMoon.classList.toggle('hidden', !isDark);
    if (this.btnThemeToggle) {
      this.btnThemeToggle.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }

    if (this.summaryView && !this.summaryView.classList.contains('hidden')) {
      const history = JSON.parse(localStorage.getItem(this.storageKeyHistory) || '[]');
      this.renderImprovementChart(history);
    }
  }

  initFontScale() {
    const saved = localStorage.getItem(this.storageKeyFontScale);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      const foundIdx = this.fontScaleLevels.indexOf(parsed);
      if (foundIdx !== -1) {
        this.fontScaleIndex = foundIdx;
      }
    }
    this.applyFontScale();
  }

  applyFontScale() {
    const scale = this.fontScaleLevels[this.fontScaleIndex] || 1.0;
    document.documentElement.style.setProperty('--font-scale', scale.toString());
    const labelText = Math.round(scale * 100) + '%';
    if (this.zoomLevelLabel) this.zoomLevelLabel.textContent = labelText;
    if (this.zoomLevelLabelZen) this.zoomLevelLabelZen.textContent = labelText;
    if (this.zoomLevelLabelCompact) this.zoomLevelLabelCompact.textContent = labelText;
    localStorage.setItem(this.storageKeyFontScale, scale.toString());
  }

  zoomIn() {
    if (this.fontScaleIndex < this.fontScaleLevels.length - 1) {
      this.fontScaleIndex++;
      this.applyFontScale();
    }
  }

  zoomOut() {
    if (this.fontScaleIndex > 0) {
      this.fontScaleIndex--;
      this.applyFontScale();
    }
  }

  initTopBarsVisibility() {
    this.applyTopBarsVisibility();
  }

  toggleTopBars() {
    this.isTopBarsHidden = !this.isTopBarsHidden;
    this.applyTopBarsVisibility();
    localStorage.setItem(this.storageKeyTopBarsHidden, this.isTopBarsHidden.toString());
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
    this.updateCompactMeta();
  }

  updateCompactMeta() {
    if (this.mode === 'flashcards' && this.activeCards && this.activeCards.length > 0) {
      const card = this.activeCards[this.currentIndex];
      if (this.compactDeckTitle) this.compactDeckTitle.textContent = (card && card.deckTitle) || 'Deck';
      if (this.compactCounter) this.compactCounter.textContent = `Card ${this.currentIndex + 1} / ${this.activeCards.length}`;
    } else if (this.activeQuestions && this.activeQuestions.length > 0) {
      const q = this.activeQuestions[this.currentIndex];
      if (this.compactDeckTitle) this.compactDeckTitle.textContent = (q && q.quizTitle) || 'Quiz';
      if (this.compactCounter) this.compactCounter.textContent = `${this.currentIndex + 1} / ${this.activeQuestions.length}`;
    }
  }

  initKeybinds() {
    if (this.keybindRadioInputs) {
      this.keybindRadioInputs.forEach(radio => {
        radio.checked = radio.value === this.keybindStyle;
      });
    }
    if (this.customKeysInput) {
      this.customKeysInput.value = this.customKeys;
    }
    if (this.customKeysContainer) {
      this.customKeysContainer.classList.toggle('hidden', this.keybindStyle !== 'custom');
    }
  }

  openKeybindsModal() {
    this.initKeybinds();
    if (this.keybindsModal && typeof this.keybindsModal.showModal === 'function') {
      this.keybindsModal.showModal();
    }
  }

  closeKeybindsModal() {
    if (this.keybindsModal && typeof this.keybindsModal.close === 'function') {
      this.keybindsModal.close();
    }
  }

  saveKeybindsFromModal() {
    const checkedRadio = document.querySelector('input[name="keybind-preset"]:checked');
    if (checkedRadio) {
      this.keybindStyle = checkedRadio.value;
      localStorage.setItem(this.storageKeyKeybindStyle, this.keybindStyle);
    }
    if (this.customKeysInput) {
      const val = this.customKeysInput.value.trim().toUpperCase() || '1234567890';
      this.customKeys = val;
      localStorage.setItem(this.storageKeyCustomKeys, this.customKeys);
    }
    this.closeKeybindsModal();
    if (this.mode !== 'flashcards' && this.activeQuestions && this.activeQuestions.length > 0) {
      this.renderCurrentQuestion();
    }
  }

  resetKeybindsToDefault() {
    this.keybindStyle = 'numbers';
    this.customKeys = '1234567890';
    localStorage.setItem(this.storageKeyKeybindStyle, 'numbers');
    localStorage.setItem(this.storageKeyCustomKeys, '1234567890');
    this.initKeybinds();
    if (this.mode !== 'flashcards' && this.activeQuestions && this.activeQuestions.length > 0) {
      this.renderCurrentQuestion();
    }
  }

  getActiveBadgeKeys() {
    if (this.keybindStyle === 'numbers') {
      return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    }
    if (this.keybindStyle === 'qwerty') {
      return ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
    }
    if (this.keybindStyle === 'homerow') {
      return ['D', 'F', 'J', 'K', 'L', ';', 'A', 'S', 'G', 'Z'];
    }
    if (this.keybindStyle === 'custom') {
      const keys = (this.customKeys || '1234567890').toUpperCase().split('');
      while (keys.length < 10) keys.push((keys.length + 1).toString());
      return keys;
    }
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
      if (this.pauseTimerDisplay) {
        this.pauseTimerDisplay.textContent = this.formatTime(this.timerSeconds);
      }
      if (this.pauseBtnIcon) this.pauseBtnIcon.textContent = '▶️';
      if (this.pauseBtnText) this.pauseBtnText.textContent = 'Resume';
      if (this.pauseZenIcon) this.pauseZenIcon.textContent = '▶️';
      if (this.pauseCompactIcon) this.pauseCompactIcon.textContent = '▶️';
      if (this.pauseCompactText) this.pauseCompactText.textContent = 'Resume';
    } else {
      if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
      if (this.pauseBtnIcon) this.pauseBtnIcon.textContent = '⏸️';
      if (this.pauseBtnText) this.pauseBtnText.textContent = 'Pause';
      if (this.pauseZenIcon) this.pauseZenIcon.textContent = '⏸️';
      if (this.pauseCompactIcon) this.pauseCompactIcon.textContent = '⏸️';
      if (this.pauseCompactText) this.pauseCompactText.textContent = 'Pause';
      if (!this.timerInterval) {
        this.timerInterval = setInterval(() => {
          this.timerSeconds++;
          this.updateHUDTimer();
        }, 1000);
      }
    }
  }

  bindEvents() {
    // Zoom Controls
    if (this.btnZoomIn) this.btnZoomIn.addEventListener('click', () => this.zoomIn());
    if (this.btnZoomOut) this.btnZoomOut.addEventListener('click', () => this.zoomOut());
    if (this.btnZoomInZen) this.btnZoomInZen.addEventListener('click', () => this.zoomIn());
    if (this.btnZoomOutZen) this.btnZoomOutZen.addEventListener('click', () => this.zoomOut());
    if (this.btnZoomInCompact) this.btnZoomInCompact.addEventListener('click', () => this.zoomIn());
    if (this.btnZoomOutCompact) this.btnZoomOutCompact.addEventListener('click', () => this.zoomOut());

    // Pause Controls
    if (this.btnPause) this.btnPause.addEventListener('click', () => this.togglePause());
    if (this.btnPauseZen) this.btnPauseZen.addEventListener('click', () => this.togglePause());
    if (this.btnPauseCompact) this.btnPauseCompact.addEventListener('click', () => this.togglePause());
    if (this.btnResumeSession) this.btnResumeSession.addEventListener('click', () => this.togglePause());

    // Top Bars Visibility Controls
    if (this.btnToggleBars) this.btnToggleBars.addEventListener('click', () => this.toggleTopBars());
    if (this.btnShowBars) this.btnShowBars.addEventListener('click', () => this.toggleTopBars());

    // Keybinds Modal Controls
    if (this.btnKeybinds) this.btnKeybinds.addEventListener('click', () => this.openKeybindsModal());
    if (this.keybindsCloseBtn) this.keybindsCloseBtn.addEventListener('click', () => this.closeKeybindsModal());
    if (this.btnSaveKeybinds) this.btnSaveKeybinds.addEventListener('click', () => this.saveKeybindsFromModal());
    if (this.btnResetKeybinds) this.btnResetKeybinds.addEventListener('click', () => this.resetKeybindsToDefault());
    if (this.keybindRadioInputs) {
      this.keybindRadioInputs.forEach(r => {
        r.addEventListener('change', () => {
          if (this.customKeysContainer) {
            this.customKeysContainer.classList.toggle('hidden', r.value !== 'custom');
          }
        });
      });
    }
    if (this.keybindsModal) {
      this.keybindsModal.addEventListener('click', (e) => {
        const rect = this.keybindsModal.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) this.closeKeybindsModal();
      });
    }

    if (this.btnFullscreenCompact) {
      this.btnFullscreenCompact.addEventListener('click', () => this.toggleZenMode());
    }

    // Theme Events
    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => this.toggleThemeMode());
    }
    if (this.themePills) {
      this.themePills.forEach(pill => {
        pill.addEventListener('click', () => this.applyTheme(pill.dataset.theme));
      });
    }

    // Header & Modal Actions
    this.btnManageBank.addEventListener('click', () => this.openBankModal(this.mode === 'flashcards' ? 'flashcard' : 'quiz'));
    this.modalCloseBtn.addEventListener('click', () => this.closeBankModal());
    this.btnCancelModal.addEventListener('click', () => this.closeBankModal());
    this.btnClearActiveBank.addEventListener('click', () => this.clearActiveBank());
    this.btnSaveActiveBank.addEventListener('click', () => this.saveActiveBankFromModal());

    // Modal Tabs
    this.tabBtnQuiz.addEventListener('click', () => this.switchModalTab('quiz'));
    this.tabBtnFlashcard.addEventListener('click', () => this.switchModalTab('flashcard'));

    // Textarea Input Events (Live preview)
    this.modalQuizTextarea.addEventListener('input', () => this.updateModalPreview());
    this.modalFcTextarea.addEventListener('input', () => this.updateModalPreview());

    // Fullscreen / Zen Mode
    this.btnFullscreen.addEventListener('click', () => this.toggleZenMode());
    this.btnExitZen.addEventListener('click', () => this.exitZenMode());
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());

    // Modal Backdrop Click
    this.bankModal.addEventListener('click', (e) => {
      const rect = this.bankModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) this.closeBankModal();
    });

    // File Inputs & Paste Buttons
    this.quizFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'quiz', true));
    this.flashcardFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'flashcard', true));
    this.modalQuizFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'quiz', false));
    this.modalFcFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'flashcard', false));

    this.btnPasteQuizEmpty.addEventListener('click', () => this.openBankModal('quiz'));
    this.btnPasteFlashcardEmpty.addEventListener('click', () => this.openBankModal('flashcard'));

    this.setupDragAndDrop();

    // Filter Dropdown Popover
    this.btnQuizDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = this.quizDropdownPopover.classList.contains('hidden');
      this.quizDropdownPopover.classList.toggle('hidden', !isHidden);
      this.btnQuizDropdown.setAttribute('aria-expanded', isHidden);
    });

    this.btnSelectAllQuizzes.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectAllDropdownItems(true);
    });

    document.addEventListener('click', (e) => {
      if (!this.quizDropdownPopover.contains(e.target) && !this.btnQuizDropdown.contains(e.target)) {
        this.quizDropdownPopover.classList.add('hidden');
        this.btnQuizDropdown.setAttribute('aria-expanded', 'false');
      }
    });

    // Mode Switching
    this.modeDrillBtn.addEventListener('click', () => this.switchMode('drill'));
    this.modeExamBtn.addEventListener('click', () => this.switchMode('exam'));
    this.modeFlashcardsBtn.addEventListener('click', () => this.switchMode('flashcards'));

    // Shuffle & Auto Advance Toggles
    if (this.shuffleToggle) {
      this.shuffleToggle.addEventListener('change', (e) => {
        this.order = e.target.checked ? 'shuffle' : 'original';
        this.startSession();
      });
    }

    if (this.autoAdvanceToggle) {
      this.autoAdvanceToggle.addEventListener('change', (e) => {
        this.autoAdvanceMs = e.target.checked ? 500 : 0;
      });
    }

    // Quiz Navigation & Actions
    this.restartBtn.addEventListener('click', () => this.restartSession());
    this.btnPrev.addEventListener('click', () => this.prevQuestion());
    this.btnSubmitAnswer.addEventListener('click', () => this.submitMultiAnswer());
    this.btnNext.addEventListener('click', () => this.handleNextOrSubmit());

    // Flashcard Actions
    this.flashcardCard.addEventListener('click', () => this.flipCard());
    this.fcBtnFlip.addEventListener('click', () => this.flipCard());
    this.fcBtnPrev.addEventListener('click', () => this.prevCard());
    this.fcBtnNext.addEventListener('click', () => this.nextCard());
    this.fcBtnReview.addEventListener('click', () => this.rateCard('review'));
    this.fcBtnMastered.addEventListener('click', () => this.rateCard('mastered'));

    // Summary Actions
    this.btnRetryMistakes.addEventListener('click', () => {
      if (this.mode === 'flashcards') {
        this.filterCardsByReview();
      } else {
        this.order = 'mistake';
        this.startSession();
      }
    });

    this.btnRestartQuiz.addEventListener('click', () => {
      this.restartSession();
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  restartSession() {
    this.order = this.shuffleToggle && this.shuffleToggle.checked ? 'shuffle' : 'original';
    this.startSession();
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

  setupDragAndDrop() {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    const bindZone = (dropEl, targetType) => {
      if (!dropEl) return;
      ['dragenter', 'dragover'].forEach(name => {
        dropEl.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropEl.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        dropEl.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropEl.classList.remove('drag-active');
        });
      });

      dropEl.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt && dt.files;
        if (files && files.length > 0) {
          this.readFile(files[0], targetType, true);
        }
      });
    };

    bindZone(this.dropZoneQuiz, 'quiz');
    bindZone(this.dropZoneFlashcard, 'flashcard');

    // Also support dropping anywhere on window
    window.addEventListener('drop', (e) => {
      if (this.dropZoneQuiz && this.dropZoneQuiz.contains(e.target)) return;
      if (this.dropZoneFlashcard && this.dropZoneFlashcard.contains(e.target)) return;
      const dt = e.dataTransfer;
      const files = dt && dt.files;
      if (files && files.length > 0) {
        // Auto-detect type
        this.readFile(files[0], 'auto', true);
      }
    });
  }

  handleFileSelect(e, targetType, autoSave = true) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      this.readFile(file, targetType, autoSave);
      e.target.value = '';
    }
  }

  readFile(file, targetType = 'auto', autoSave = true) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const detected = detectBankType(content);
      const effectiveType = targetType === 'auto'
        ? (detected !== 'unknown' ? detected : 'quiz')
        : targetType;

      if (effectiveType === 'flashcard') {
        const parsed = parseFlashcardBank(content);
        if (parsed.decks.length === 0) {
          alert('Could not find any valid flashcards in the uploaded file.\n\nPlease ensure sections start with "## Deck Name", cards with "### Question", and answers with "**Answer:**".');
          this.openBankModal('flashcard');
          this.modalFcTextarea.value = content;
          this.updateModalPreview();
          return;
        }

        if (autoSave) {
          localStorage.setItem(this.storageKeyFlashcardBank, content);
          this.closeBankModal();
          this.selectedDeckIds.clear();
          this.loadBank();
          this.switchMode('flashcards');
        } else {
          this.modalFcTextarea.value = content;
          this.updateModalPreview();
        }
      } else {
        const parsed = parseQuestionBank(content);
        if (parsed.quizzes.length === 0) {
          alert('Could not find any valid quizzes in the uploaded file.\n\nPlease ensure sections start with "## Quiz Title", questions with "### Question", and options with "A.", "B.", etc.');
          this.openBankModal('quiz');
          this.modalQuizTextarea.value = content;
          this.updateModalPreview();
          return;
        }

        if (autoSave) {
          localStorage.setItem(this.storageKeyQuizBank, content);
          this.closeBankModal();
          this.selectedQuizIds.clear();
          this.loadBank();
          this.switchMode('drill');
        } else {
          this.modalQuizTextarea.value = content;
          this.updateModalPreview();
        }
      }
    };

    reader.onerror = (err) => {
      console.error('File read error:', err);
      alert('Error reading the selected file. Please try again.');
    };

    reader.readAsText(file);
  }

  loadBank() {
    this.storedQuizRaw = localStorage.getItem(this.storageKeyQuizBank) || null;
    this.storedFCRaw = localStorage.getItem(this.storageKeyFlashcardBank) || null;

    const hasQuiz = !!this.storedQuizRaw;
    const hasFC = !!this.storedFCRaw;

    if (!hasQuiz && !hasFC) {
      this.emptyStateView.classList.remove('hidden');
      this.mainAppContent.classList.add('hidden');
      this.brandTitle.textContent = 'Quiz Drill Memorizer';
      return;
    }

    if (hasQuiz) {
      this.quizBankData = parseQuestionBank(this.storedQuizRaw);
    } else {
      this.quizBankData = { title: '', quizzes: [], totalQuestions: 0 };
    }

    if (hasFC) {
      this.flashcardBankData = parseFlashcardBank(this.storedFCRaw);
    } else {
      this.flashcardBankData = { title: '', decks: [], totalCards: 0 };
    }

    this.emptyStateView.classList.add('hidden');
    this.mainAppContent.classList.remove('hidden');

    // Title representation
    if (this.mode === 'flashcards') {
      this.brandTitle.textContent = this.flashcardBankData.title || 'Flashcard Practice';
    } else {
      this.brandTitle.textContent = this.quizBankData.title || (this.flashcardBankData.title || 'Quiz Drill Memorizer');
    }

    // Default mode determination if current mode has no material
    if (this.mode === 'flashcards' && !hasFC && hasQuiz) {
      this.mode = 'drill';
    } else if ((this.mode === 'drill' || this.mode === 'exam') && !hasQuiz && hasFC) {
      this.mode = 'flashcards';
    }

    // Sync mode button styling
    this.updateModeButtonsUI();

    // Render filter dropdown
    this.renderFilterDropdown();

    // Start session
    this.startSession();
  }

  updateModeButtonsUI() {
    this.modeDrillBtn.classList.toggle('active', this.mode === 'drill');
    this.modeExamBtn.classList.toggle('active', this.mode === 'exam');
    this.modeFlashcardsBtn.classList.toggle('active', this.mode === 'flashcards');
  }

  renderFilterDropdown() {
    this.quizDropdownList.innerHTML = '';

    if (this.mode === 'flashcards') {
      this.popoverHeaderTitle.textContent = 'Select Flashcard Decks';
      if (this.flashcardBankData.decks.length === 0) {
        this.quizDropdownLabel.textContent = 'No Decks Loaded';
        return;
      }

      this.flashcardBankData.decks.forEach(deck => {
        const label = document.createElement('label');
        label.className = 'popover-item';
        const isChecked = this.selectedDeckIds.has(deck.id);

        label.innerHTML = `
          <div class="popover-item-left">
            <input type="checkbox" class="popover-checkbox" data-id="${deck.id}" ${isChecked ? 'checked' : ''}>
            <span class="popover-item-name">${deck.title}</span>
          </div>
          <span class="popover-item-badge">${deck.cards.length} Cards</span>
        `;

        const checkbox = label.querySelector('.popover-checkbox');
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          this.toggleDeckSelection(deck.id);
        });

        this.quizDropdownList.appendChild(label);
      });

      this.updateFilterDropdownUI();
    } else {
      this.popoverHeaderTitle.textContent = 'Select Quizzes';
      if (this.quizBankData.quizzes.length === 0) {
        this.quizDropdownLabel.textContent = 'No Quizzes Loaded';
        return;
      }

      this.quizBankData.quizzes.forEach(quiz => {
        const label = document.createElement('label');
        label.className = 'popover-item';
        const isChecked = this.selectedQuizIds.has(quiz.id);

        label.innerHTML = `
          <div class="popover-item-left">
            <input type="checkbox" class="popover-checkbox" data-id="${quiz.id}" ${isChecked ? 'checked' : ''}>
            <span class="popover-item-name">${quiz.title}</span>
          </div>
          <span class="popover-item-badge">${quiz.questions.length} Qs</span>
        `;

        const checkbox = label.querySelector('.popover-checkbox');
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          this.toggleQuizSelection(quiz.id);
        });

        this.quizDropdownList.appendChild(label);
      });

      this.updateFilterDropdownUI();
    }
  }

  updateFilterDropdownUI() {
    if (this.mode === 'flashcards') {
      const isAllSelected = this.selectedDeckIds.size === this.flashcardBankData.decks.length || this.selectedDeckIds.size === 0;
      if (isAllSelected) {
        this.quizDropdownLabel.textContent = `All Decks (${this.flashcardBankData.totalCards} Cards)`;
      } else if (this.selectedDeckIds.size === 1) {
        const dk = this.flashcardBankData.decks.find(d => this.selectedDeckIds.has(d.id));
        this.quizDropdownLabel.textContent = dk ? `${dk.title} (${dk.cards.length} Cards)` : '1 Deck Selected';
      } else {
        const count = this.flashcardBankData.decks
          .filter(d => this.selectedDeckIds.has(d.id))
          .reduce((sum, d) => sum + d.cards.length, 0);
        this.quizDropdownLabel.textContent = `${this.selectedDeckIds.size} Decks Selected (${count} Cards)`;
      }

      const checkboxes = this.quizDropdownList.querySelectorAll('.popover-checkbox');
      checkboxes.forEach(cb => {
        const dId = cb.dataset.id;
        cb.checked = this.selectedDeckIds.has(dId);
      });
    } else {
      const isAllSelected = this.selectedQuizIds.size === this.quizBankData.quizzes.length || this.selectedQuizIds.size === 0;
      if (isAllSelected) {
        this.quizDropdownLabel.textContent = `All Quizzes (${this.quizBankData.totalQuestions} Questions)`;
      } else if (this.selectedQuizIds.size === 1) {
        const qz = this.quizBankData.quizzes.find(q => this.selectedQuizIds.has(q.id));
        this.quizDropdownLabel.textContent = qz ? `${qz.title} (${qz.questions.length} Qs)` : '1 Quiz Selected';
      } else {
        const count = this.quizBankData.quizzes
          .filter(q => this.selectedQuizIds.has(q.id))
          .reduce((sum, q) => sum + q.questions.length, 0);
        this.quizDropdownLabel.textContent = `${this.selectedQuizIds.size} Quizzes Selected (${count} Qs)`;
      }

      const checkboxes = this.quizDropdownList.querySelectorAll('.popover-checkbox');
      checkboxes.forEach(cb => {
        const qId = cb.dataset.id;
        cb.checked = this.selectedQuizIds.has(qId);
      });
    }
  }

  selectAllDropdownItems(triggerSession = true) {
    if (this.mode === 'flashcards') {
      this.selectedDeckIds = new Set(this.flashcardBankData.decks.map(d => d.id));
      this.updateFilterDropdownUI();
      this.rebuildCardsPool();
    } else {
      this.selectedQuizIds = new Set(this.quizBankData.quizzes.map(q => q.id));
      this.updateFilterDropdownUI();
      this.rebuildQuestionsPool();
    }
    if (triggerSession) this.startSession();
  }

  toggleQuizSelection(quizId) {
    const isAllSelected = this.selectedQuizIds.size === this.quizBankData.quizzes.length;
    if (isAllSelected) {
      this.selectedQuizIds = new Set([quizId]);
    } else if (this.selectedQuizIds.has(quizId)) {
      this.selectedQuizIds.delete(quizId);
      if (this.selectedQuizIds.size === 0) {
        this.selectedQuizIds = new Set(this.quizBankData.quizzes.map(q => q.id));
      }
    } else {
      this.selectedQuizIds.add(quizId);
    }

    this.updateFilterDropdownUI();
    this.rebuildQuestionsPool();
    this.startSession();
  }

  toggleDeckSelection(deckId) {
    const isAllSelected = this.selectedDeckIds.size === this.flashcardBankData.decks.length;
    if (isAllSelected) {
      this.selectedDeckIds = new Set([deckId]);
    } else if (this.selectedDeckIds.has(deckId)) {
      this.selectedDeckIds.delete(deckId);
      if (this.selectedDeckIds.size === 0) {
        this.selectedDeckIds = new Set(this.flashcardBankData.decks.map(d => d.id));
      }
    } else {
      this.selectedDeckIds.add(deckId);
    }

    this.updateFilterDropdownUI();
    this.rebuildCardsPool();
    this.startSession();
  }

  rebuildQuestionsPool() {
    this.allQuestions = [];
    if (this.selectedQuizIds.size === 0) {
      this.selectedQuizIds = new Set(this.quizBankData.quizzes.map(q => q.id));
    }
    this.quizBankData.quizzes.forEach(quiz => {
      if (this.selectedQuizIds.has(quiz.id)) {
        this.allQuestions.push(...quiz.questions);
      }
    });
  }

  rebuildCardsPool() {
    this.allCards = [];
    if (this.selectedDeckIds.size === 0) {
      this.selectedDeckIds = new Set(this.flashcardBankData.decks.map(d => d.id));
    }
    this.flashcardBankData.decks.forEach(deck => {
      if (this.selectedDeckIds.has(deck.id)) {
        this.allCards.push(...deck.cards);
      }
    });
  }

  switchMode(newMode) {
    if (this.mode === newMode) return;

    if (newMode === 'flashcards') {
      if (!this.storedFCRaw) {
        // If no flashcard deck loaded, prompt or open modal
        this.openBankModal('flashcard');
        return;
      }
    } else {
      if (!this.storedQuizRaw) {
        this.openBankModal('quiz');
        return;
      }
    }

    this.mode = newMode;
    this.updateModeButtonsUI();

    if (this.mode === 'flashcards') {
      this.brandTitle.textContent = this.flashcardBankData.title || 'Flashcard Practice';
    } else {
      this.brandTitle.textContent = this.quizBankData.title || 'Quiz Drill Memorizer';
    }

    // Toggle autoadvance visibility (only relevant in Fast Drill)
    if (this.autoadvanceControl) {
      this.autoadvanceControl.classList.toggle('hidden', this.mode !== 'drill');
    }

    // Toggle keyboard legends
    if (this.kbdQuizLegend && this.kbdFcLegend) {
      this.kbdQuizLegend.classList.toggle('hidden', this.mode === 'flashcards');
      this.kbdFcLegend.classList.toggle('hidden', this.mode !== 'flashcards');
    }

    this.renderFilterDropdown();
    this.startSession();
  }

  startSession() {
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);

    // Reset Timer & Pause State
    this.timerSeconds = 0;
    this.isPaused = false;
    if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    if (this.pauseBtnIcon) this.pauseBtnIcon.textContent = '⏸️';
    if (this.pauseBtnText) this.pauseBtnText.textContent = 'Pause';
    if (this.pauseZenIcon) this.pauseZenIcon.textContent = '⏸️';

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateHUDTimer();
    }, 1000);

    if (this.topToolbar) this.topToolbar.classList.remove('hidden');
    if (this.statsHud) this.statsHud.classList.remove('hidden');
    if (this.progressContainer) this.progressContainer.classList.remove('hidden');
    if (this.keyboardBar) this.keyboardBar.classList.remove('hidden');
    this.summaryView.classList.add('hidden');

    if (this.mode === 'flashcards') {
      this.quizView.classList.add('hidden');
      this.flashcardView.classList.remove('hidden');
      this.rebuildCardsPool();
      this.startFlashcardSession();
    } else {
      this.flashcardView.classList.add('hidden');
      this.quizView.classList.remove('hidden');
      this.rebuildQuestionsPool();
      this.startQuizSession();
    }
  }

  startQuizSession() {
    if (!this.allQuestions || this.allQuestions.length === 0) return;

    if (this.order === 'shuffle') {
      this.activeQuestions = [...this.allQuestions].sort(() => Math.random() - 0.5);
    } else if (this.order === 'mistake') {
      const filtered = this.allQuestions.filter(q => this.mistakesSet.has(q.id));
      if (filtered.length === 0) {
        alert('No saved mistakes in selected quizzes! Reverting to all questions.');
        this.order = this.shuffleToggle && this.shuffleToggle.checked ? 'shuffle' : 'original';
        this.activeQuestions = this.order === 'shuffle'
          ? [...this.allQuestions].sort(() => Math.random() - 0.5)
          : [...this.allQuestions];
      } else {
        this.activeQuestions = filtered;
      }
    } else {
      this.activeQuestions = [...this.allQuestions];
    }

    this.currentIndex = 0;
    this.userAnswers = {};
    this.questionDurations = {};
    this.isAnswered = false;
    this.selectedMultiOptions.clear();
    this.streak = 0;
    this.maxStreak = 0;

    // HUD labels for Quiz
    this.hudLabel1.textContent = 'Current Streak';
    this.hudLabel2.textContent = 'Accuracy';
    this.hudLabel3.textContent = 'Elapsed Time';
    this.hudLabel4.textContent = 'Avg Speed / Q';

    this.renderCurrentQuestion();
    this.updateHUD();
  }

  startFlashcardSession() {
    if (!this.allCards || this.allCards.length === 0) return;

    if (this.order === 'shuffle') {
      this.activeCards = [...this.allCards].sort(() => Math.random() - 0.5);
    } else {
      this.activeCards = [...this.allCards];
    }

    this.currentIndex = 0;
    this.isCardFlipped = false;

    // HUD labels for Flashcards
    this.hudLabel1.textContent = 'Mastered';
    this.hudLabel2.textContent = 'Need Review';
    this.hudLabel3.textContent = 'Elapsed Time';
    this.hudLabel4.textContent = 'Completion';

    this.renderCurrentCard();
    this.updateFlashcardHUD();
  }

  // =========================================================================
  // FLASHCARD RENDERING & ACTIONS
  // =========================================================================
  renderCurrentCard() {
    if (!this.activeCards || this.activeCards.length === 0) return;

    const card = this.activeCards[this.currentIndex];
    this.isCardFlipped = false;
    this.flashcardCard.classList.remove('is-flipped');

    // Deck & Counter meta
    this.fcDeckTitle.textContent = card.deckTitle || 'Deck';
    this.fcCounter.textContent = `Card ${this.currentIndex + 1} / ${this.activeCards.length}`;

    // Status pill
    this.updateCardStatusPill(card.id);

    // Front Question
    if (card.formattedQuestion) {
      this.fcQuestionText.innerHTML = card.formattedQuestion;
    } else {
      this.fcQuestionText.textContent = card.question;
    }
    this.fcQuestionText.scrollTop = 0;

    // Back Answer
    if (card.formattedAnswer) {
      this.fcAnswerText.innerHTML = card.formattedAnswer;
    } else {
      this.fcAnswerText.textContent = card.answer;
    }
    this.fcAnswerText.scrollTop = 0;

    // Nav button states
    this.fcBtnPrev.disabled = this.currentIndex === 0;
    if (this.currentIndex === this.activeCards.length - 1) {
      this.fcBtnNext.querySelector('span').textContent = 'Finish Deck';
    } else {
      this.fcBtnNext.querySelector('span').textContent = 'Next';
    }

    // Zen mode sync
    if (this.zenQuizTitle) {
      this.zenQuizTitle.textContent = card.deckTitle;
      this.zenCounter.textContent = `${this.currentIndex + 1} / ${this.activeCards.length}`;
      this.zenStreak.textContent = `✅ ${this.fcMasteredSet.size}`;
      this.zenAccuracy.textContent = `⚠️ ${this.fcReviewSet.size}`;
    }

    this.updateProgressBar();
    this.updateCompactMeta();
  }

  updateCardStatusPill(cardId) {
    this.fcStatusPill.className = 'badge-subtle';
    if (this.fcMasteredSet.has(cardId)) {
      this.fcStatusPill.classList.add('status-mastered');
      this.fcStatusPill.textContent = '✅ Mastered';
    } else if (this.fcReviewSet.has(cardId)) {
      this.fcStatusPill.classList.add('status-learning');
      this.fcStatusPill.textContent = '⚠️ Need Review';
    } else {
      this.fcStatusPill.textContent = 'Unseen';
    }
  }

  flipCard() {
    this.isCardFlipped = !this.isCardFlipped;
    this.flashcardCard.classList.toggle('is-flipped', this.isCardFlipped);
    if (this.isCardFlipped) {
      this.fcAnswerText.scrollTop = 0;
    }
  }

  nextCard() {
    if (this.currentIndex < this.activeCards.length - 1) {
      this.currentIndex++;
      this.renderCurrentCard();
      this.updateFlashcardHUD();
    } else {
      this.showFlashcardSummary();
    }
  }

  prevCard() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentCard();
      this.updateFlashcardHUD();
    }
  }

  rateCard(rating) {
    if (!this.activeCards || this.activeCards.length === 0) return;
    const card = this.activeCards[this.currentIndex];

    if (rating === 'mastered') {
      this.fcMasteredSet.add(card.id);
      this.fcReviewSet.delete(card.id);
    } else {
      this.fcReviewSet.add(card.id);
      this.fcMasteredSet.delete(card.id);
    }

    this.saveFlashcardProgress();
    this.updateCardStatusPill(card.id);
    this.updateFlashcardHUD();

    // Advance to next card smoothly
    setTimeout(() => {
      this.nextCard();
    }, 180);
  }

  saveFlashcardProgress() {
    localStorage.setItem(this.storageKeyFCMastered, JSON.stringify(Array.from(this.fcMasteredSet)));
    localStorage.setItem(this.storageKeyFCReview, JSON.stringify(Array.from(this.fcReviewSet)));
  }

  updateFlashcardHUD() {
    const masteredCount = this.fcMasteredSet.size;
    const reviewCount = this.fcReviewSet.size;
    const pct = Math.round(((this.currentIndex + 1) / this.activeCards.length) * 100);

    this.hudVal1.textContent = `${masteredCount} ✅`;
    this.hudVal1.className = 'stat-value accuracy';

    this.hudVal2.textContent = `${reviewCount} ⚠️`;
    this.hudVal2.className = 'stat-value streak';

    this.hudVal4.textContent = `${pct}%`;
    this.hudVal4.className = 'stat-value';
  }

  showFlashcardSummary() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.flashcardView.classList.add('hidden');
    this.quizView.classList.add('hidden');
    this.summaryView.classList.remove('hidden');

    this.summaryMainTitle.textContent = 'Flashcard Deck Completed!';
    const masteredCount = this.fcMasteredSet.size;
    const total = this.activeCards.length;
    this.summaryScore.textContent = `${masteredCount} / ${total} Mastered`;
    this.summarySubtitle.textContent = `You reviewed all ${total} cards in this study session.`;

    this.sumStatLbl1.textContent = 'Mastered Cards';
    this.summaryAccuracy.textContent = `${masteredCount}`;

    this.sumStatLbl2.textContent = 'Study Time';
    this.summaryTime.textContent = this.formatTime(this.timerSeconds);

    this.sumStatLbl3.textContent = 'Cards Marked For Review';
    this.summaryStreak.textContent = `${this.fcReviewSet.size} ⚠️`;

    this.sumStatLbl4.textContent = 'Total In Deck';
    this.summaryAvgSpeed.textContent = `${total}`;

    this.btnRetryMistakes.textContent = 'Practice Cards Marked for Review';
    this.btnRestartQuiz.textContent = 'Restart Flashcard Deck';

    // Hide analytics & review section for flashcard session to keep clean
    if (this.summaryAnalyticsSection) this.summaryAnalyticsSection.classList.add('hidden');
    if (this.summaryReviewSection) this.summaryReviewSection.classList.add('hidden');
  }

  filterCardsByReview() {
    const reviewCards = this.allCards.filter(c => this.fcReviewSet.has(c.id));
    if (reviewCards.length === 0) {
      alert('No cards currently marked for review! Restarting full deck.');
      this.startSession();
      return;
    }
    this.activeCards = reviewCards;
    this.currentIndex = 0;
    this.summaryView.classList.add('hidden');
    this.flashcardView.classList.remove('hidden');
    this.renderCurrentCard();
    this.updateFlashcardHUD();
  }

  // =========================================================================
  // MCQ QUIZ RENDERING & ACTIONS
  // =========================================================================
  renderCurrentQuestion() {
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
    if (this.activeQuestions.length === 0) return;

    const q = this.activeQuestions[this.currentIndex];
    this.questionStartTime = Date.now();
    this.isAnswered = this.userAnswers[q.id] !== undefined;

    if (this.isAnswered && Array.isArray(this.userAnswers[q.id])) {
      this.selectedMultiOptions.clear();
      this.userAnswers[q.id].forEach(idx => this.selectedMultiOptions.add(idx));
    }

    this.qQuizTitle.textContent = q.quizTitle;
    this.qCounter.textContent = `Progress: ${this.currentIndex + 1} / ${this.activeQuestions.length}`;

    if (this.zenQuizTitle) {
      this.zenQuizTitle.textContent = q.quizTitle;
      this.zenCounter.textContent = `${this.currentIndex + 1} / ${this.activeQuestions.length}`;
      this.zenStreak.textContent = `${this.streak}🔥`;
      this.zenAccuracy.textContent = this.hudVal2.textContent;
    }

    if (q.formattedQuestion) {
      this.questionText.innerHTML = q.formattedQuestion;
    } else {
      this.questionText.textContent = q.question;
    }

    if (q.isMultipleChoice) {
      this.multiSelectBadge.classList.remove('hidden');
    } else {
      this.multiSelectBadge.classList.add('hidden');
    }

    // Reset scroll in question area so content begins at top
    if (this.questionContentArea) {
      this.questionContentArea.scrollTop = 0;
    }

    // Single-column layout prioritized; use grid only for >= 6 options
    const useGrid = q.options && q.options.length >= 6;
    this.optionsList.classList.toggle('grid-options', useGrid);

    this.optionsList.innerHTML = '';
    const optionBadges = this.getActiveBadgeKeys();

    q.options.forEach((optText, index) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.index = index;

      const userSelected = q.isMultipleChoice
        ? this.selectedMultiOptions.has(index)
        : this.userAnswers[q.id] === index;

      const isCorrectOption = q.correctAnswers.includes(index);

      if (this.mode === 'drill' && this.isAnswered) {
        btn.classList.add('disabled');
        if (isCorrectOption) {
          btn.classList.add('correct');
        } else if (userSelected && !isCorrectOption) {
          btn.classList.add('wrong');
        }
      } else {
        if (userSelected) {
          if (q.isMultipleChoice) {
            btn.classList.add('multi-selected');
          } else {
            btn.classList.add('selected');
          }
        }
      }

      btn.innerHTML = `
        <span class="key-badge">${optionBadges[index] || index + 1}</span>
        <span class="option-text">${optText}</span>
        <span class="option-status-icon">${isCorrectOption ? '✓' : '✗'}</span>
      `;

      btn.addEventListener('click', () => this.handleOptionClick(index));
      this.optionsList.appendChild(btn);
    });

    this.btnPrev.disabled = this.currentIndex === 0;

    if (q.isMultipleChoice && !this.isAnswered) {
      this.btnSubmitAnswer.classList.remove('hidden');
    } else {
      this.btnSubmitAnswer.classList.add('hidden');
    }

    if (this.btnNextLabel) {
      if (this.currentIndex === this.activeQuestions.length - 1) {
        this.btnNextLabel.textContent = this.mode === 'exam' ? 'Submit Exam' : 'Finish Drill';
      } else {
        this.btnNextLabel.textContent = 'Next';
      }
    }

    if (this.mode === 'drill' && this.isAnswered) {
      const userSel = this.userAnswers[q.id];
      const isRight = this.checkAnswerCorrectness(q, userSel);
      this.feedbackBox.classList.remove('hidden', 'correct', 'wrong');

      if (isRight) {
        this.feedbackBox.classList.add('correct');
        this.feedbackBox.innerHTML = `<div>✓ <strong>Correct!</strong> Excellent retention.</div> <span style="font-size:0.8rem; opacity:0.8">[Press Space / Enter to advance]</span>`;
      } else {
        this.feedbackBox.classList.add('wrong');
        const correctLetters = q.correctAnswers.map(idx => optionBadges[idx] || idx + 1).join(', ');
        const correctTexts = q.correctAnswers.map(idx => `<strong>${optionBadges[idx] || idx + 1}. ${q.options[idx]}</strong>`).join('<br>');
        this.feedbackBox.innerHTML = `<div>✗ <strong>Incorrect.</strong> Correct answer(s): <strong>${correctLetters}</strong><div style="margin-top:0.35rem; font-size:0.85rem;">${correctTexts}</div></div> <span style="font-size:0.8rem; opacity:0.8">[Press Space / Enter to advance]</span>`;
      }
    } else {
      this.feedbackBox.classList.add('hidden');
    }

    this.updateProgressBar();
    this.updateCompactMeta();
  }

  checkAnswerCorrectness(q, answer) {
    if (q.isMultipleChoice) {
      if (!Array.isArray(answer)) return false;
      if (answer.length !== q.correctAnswers.length) return false;
      return answer.every(val => q.correctAnswers.includes(val));
    }
    return answer === q.correctAnswers[0];
  }

  handleOptionClick(index) {
    if (this.isPaused) return;
    const q = this.activeQuestions[this.currentIndex];
    if (!q) return;

    if (this.mode === 'drill' && this.isAnswered) return;

    if (q.isMultipleChoice) {
      if (this.mode === 'drill' && this.isAnswered) return;
      if (this.selectedMultiOptions.has(index)) {
        this.selectedMultiOptions.delete(index);
      } else {
        this.selectedMultiOptions.add(index);
      }
      if (this.mode === 'exam') {
        this.userAnswers[q.id] = Array.from(this.selectedMultiOptions).sort((a, b) => a - b);
      }
      this.renderCurrentQuestion();
      return;
    }

    if (this.mode === 'exam') {
      this.userAnswers[q.id] = index;
      this.renderCurrentQuestion();
      return;
    }

    this.recordAnswer(index);
  }

  submitMultiAnswer() {
    const q = this.activeQuestions[this.currentIndex];
    if (!q.isMultipleChoice || this.isAnswered) return;
    if (this.selectedMultiOptions.size === 0) {
      alert('Please select at least one option before submitting.');
      return;
    }

    const answers = Array.from(this.selectedMultiOptions).sort((a, b) => a - b);
    this.recordAnswer(answers);
  }

  recordAnswer(answer) {
    const q = this.activeQuestions[this.currentIndex];
    this.userAnswers[q.id] = answer;
    this.isAnswered = true;

    const duration = (Date.now() - this.questionStartTime) / 1000;
    this.questionDurations[q.id] = duration;

    const isRight = this.checkAnswerCorrectness(q, answer);

    if (isRight) {
      this.streak++;
      if (this.streak > this.maxStreak) this.maxStreak = this.streak;
      this.mistakesSet.delete(q.id);
    } else {
      this.streak = 0;
      this.mistakesSet.add(q.id);
    }

    this.saveMistakes();
    this.updateHUD();
    this.renderCurrentQuestion();

    if (this.mode === 'drill' && this.autoAdvanceMs > 0) {
      this.autoAdvanceTimeout = setTimeout(() => {
        this.handleNextOrSubmit();
      }, this.autoAdvanceMs);
    }
  }

  initQuestionSelections() {
    this.selectedMultiOptions.clear();
    const q = this.activeQuestions[this.currentIndex];
    if (q && this.userAnswers[q.id] !== undefined && Array.isArray(this.userAnswers[q.id])) {
      this.userAnswers[q.id].forEach(idx => this.selectedMultiOptions.add(idx));
    }
  }

  handleNextOrSubmit() {
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);

    if (this.currentIndex < this.activeQuestions.length - 1) {
      this.currentIndex++;
      this.initQuestionSelections();
      this.renderCurrentQuestion();
    } else {
      this.showQuizSummary();
    }
  }

  prevQuestion() {
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.initQuestionSelections();
      this.renderCurrentQuestion();
    }
  }

  updateProgressBar() {
    let pct = 0;
    if (this.mode === 'flashcards') {
      pct = this.activeCards.length > 0 ? ((this.currentIndex + 1) / this.activeCards.length) * 100 : 0;
    } else {
      pct = this.activeQuestions.length > 0 ? ((this.currentIndex + 1) / this.activeQuestions.length) * 100 : 0;
    }
    this.progressBar.style.width = `${pct}%`;
  }

  updateHUD() {
    if (this.mode === 'flashcards') {
      this.updateFlashcardHUD();
      return;
    }

    const answeredCount = Object.keys(this.userAnswers).length;
    let correctCount = 0;

    this.activeQuestions.forEach(q => {
      const ans = this.userAnswers[q.id];
      if (ans !== undefined && this.checkAnswerCorrectness(q, ans)) {
        correctCount++;
      }
    });

    const accuracyPct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;

    this.hudVal1.textContent = `${this.streak}🔥`;
    this.hudVal1.className = 'stat-value streak';

    this.hudVal2.textContent = `${accuracyPct}%`;
    this.hudVal2.className = 'stat-value accuracy';

    const durations = Object.values(this.questionDurations);
    const avgSec = durations.length > 0
      ? (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(1)
      : '0.0';
    this.hudVal4.textContent = `${avgSec}s`;
    this.hudVal4.className = 'stat-value';
  }

  updateHUDTimer() {
    this.hudVal3.textContent = this.formatTime(this.timerSeconds);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  showQuizSummary() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.quizView.classList.add('hidden');
    this.flashcardView.classList.add('hidden');
    this.summaryView.classList.remove('hidden');

    if (this.summaryAnalyticsSection) this.summaryAnalyticsSection.classList.remove('hidden');
    if (this.summaryReviewSection) this.summaryReviewSection.classList.remove('hidden');

    this.summaryMainTitle.textContent = this.mode === 'exam' ? 'Exam Simulation Complete!' : 'Drill Session Complete!';

    let correctCount = 0;
    const answeredCount = this.activeQuestions.length;

    this.activeQuestions.forEach(q => {
      const ans = this.userAnswers[q.id];
      if (ans !== undefined && this.checkAnswerCorrectness(q, ans)) {
        correctCount++;
      }
    });

    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const durations = Object.values(this.questionDurations);
    const avgSpeed = durations.length > 0
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : '0.0';

    this.summaryScore.textContent = `${correctCount} / ${answeredCount}`;
    this.summarySubtitle.textContent = `Scored ${correctCount} correct out of ${answeredCount} total questions.`;

    this.sumStatLbl1.textContent = 'Accuracy Rate';
    this.summaryAccuracy.textContent = `${accuracy}%`;

    this.sumStatLbl2.textContent = 'Total Time';
    this.summaryTime.textContent = this.formatTime(this.timerSeconds);

    this.sumStatLbl3.textContent = 'Max Streak';
    this.summaryStreak.textContent = `${this.maxStreak}🔥`;

    this.sumStatLbl4.textContent = 'Avg Speed / Q';
    this.summaryAvgSpeed.textContent = `${avgSpeed}s`;

    this.btnRetryMistakes.textContent = 'Retake Missed Questions';
    this.btnRestartQuiz.textContent = 'Start New Full Drill';

    const sessionData = {
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      timestamp: Date.now(),
      mode: this.mode,
      accuracy,
      score: `${correctCount}/${answeredCount}`,
      totalAnswered: answeredCount,
      correctCount,
      streak: this.maxStreak,
      avgSpeed: parseFloat(avgSpeed)
    };

    this.recordSessionHistory(sessionData);
    this.renderReviewList();
  }

  recordSessionHistory(session) {
    const history = JSON.parse(localStorage.getItem(this.storageKeyHistory) || '[]');
    history.push(session);
    if (history.length > 50) history.shift();
    localStorage.setItem(this.storageKeyHistory, JSON.stringify(history));

    this.renderOverallStats(history);
    this.renderImprovementChart(history);
  }

  renderOverallStats(history) {
    if (!history || history.length === 0) return;

    const totalSessions = history.length;
    const totalAnswered = history.reduce((sum, s) => sum + (s.totalAnswered || 0), 0);
    const totalCorrect = history.reduce((sum, s) => sum + (s.correctCount || 0), 0);
    const overallAcc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 100;
    const bestStreak = Math.max(...history.map(s => s.streak || 0));
    const validSpeeds = history.filter(s => s.avgSpeed && s.avgSpeed > 0);
    const overallSpeed = validSpeeds.length > 0
      ? (validSpeeds.reduce((sum, s) => sum + s.avgSpeed, 0) / validSpeeds.length).toFixed(1)
      : '0.0';

    if (this.overallSessionsCount) this.overallSessionsCount.textContent = totalSessions.toString();
    if (this.overallAccuracy) this.overallAccuracy.textContent = `${overallAcc}%`;
    if (this.overallTotalQuestions) this.overallTotalQuestions.textContent = totalAnswered.toString();
    if (this.overallBestStreak) this.overallBestStreak.textContent = `${bestStreak}🔥`;
    if (this.overallAvgSpeed) this.overallAvgSpeed.textContent = `${overallSpeed}s`;

    if (this.analyticsTrendBadge && history.length >= 2) {
      const latestAcc = history[history.length - 1].accuracy;
      const prevAcc = history[history.length - 2].accuracy;
      const delta = latestAcc - prevAcc;
      if (delta > 0) {
        this.analyticsTrendBadge.textContent = `+${delta}% vs Previous Drill ↗`;
        this.analyticsTrendBadge.style.borderColor = 'var(--color-correct)';
        this.analyticsTrendBadge.style.color = 'var(--color-correct)';
      } else if (delta < 0) {
        this.analyticsTrendBadge.textContent = `${delta}% vs Previous Drill ↘`;
        this.analyticsTrendBadge.style.borderColor = 'var(--color-wrong)';
        this.analyticsTrendBadge.style.color = 'var(--color-wrong)';
      } else {
        this.analyticsTrendBadge.textContent = `Maintained ${latestAcc}% Accuracy →`;
        this.analyticsTrendBadge.style.borderColor = 'var(--border)';
        this.analyticsTrendBadge.style.color = 'var(--muted-foreground)';
      }
    }
  }

  renderImprovementChart(history) {
    if (!this.chartContainer) return;
    if (!history || history.length === 0) {
      this.chartContainer.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted-foreground);font-size:0.88rem;">
          Complete your first drill session to track improvement over time.
        </div>`;
      return;
    }

    const data = history.slice(-15);
    const N = data.length;
    const width = 600;
    const height = 200;
    const padLeft = 45;
    const padRight = 30;
    const padTop = 25;
    const padBottom = 35;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const baseY = padTop + chartH;

    const gridLevels = [100, 75, 50, 25, 0];
    let gridLinesSVG = '';
    gridLevels.forEach(pct => {
      const y = padTop + (1 - pct / 100) * chartH;
      gridLinesSVG += `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
        <text x="${padLeft - 8}" y="${y + 3}" class="chart-axis-text" text-anchor="end">${pct}%</text>
      `;
    });

    const points = data.map((session, index) => {
      const x = N === 1 ? (padLeft + chartW / 2) : (padLeft + (index / (N - 1)) * chartW);
      const acc = Math.max(0, Math.min(100, session.accuracy));
      const y = padTop + (1 - acc / 100) * chartH;
      return { x, y, session, index };
    });

    let linePath = '';
    let areaPath = '';
    let pointsSVG = '';
    let xLabelsSVG = '';

    if (N === 1) {
      const p = points[0];
      pointsSVG = `
        <line x1="${padLeft}" y1="${p.y}" x2="${width - padRight}" y2="${p.y}" stroke="var(--chart-primary)" stroke-dasharray="4 4" stroke-opacity="0.4" stroke-width="1.5" />
        <circle cx="${p.x}" cy="${p.y}" r="6" class="chart-point">
          <title>Session 1: ${p.session.accuracy}%</title>
        </circle>
        <text x="${p.x}" y="${p.y - 12}" class="chart-axis-text" text-anchor="middle" fill="var(--chart-primary)" font-weight="700">${p.session.accuracy}%</text>
      `;
      xLabelsSVG = `<text x="${p.x}" y="${height - 10}" class="chart-axis-text" text-anchor="middle">Session 1</text>`;
    } else {
      linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}` + points.slice(1).map(p => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
      areaPath = `M ${points[0].x.toFixed(1)} ${baseY.toFixed(1)} L ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}` +
        points.slice(1).map(p => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') +
        ` L ${points[points.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} Z`;

      points.forEach((p, idx) => {
        const tooltip = `Session ${idx + 1}: ${p.session.accuracy}% (${p.session.score})`;
        const showLabel = N <= 8 || idx === 0 || idx === N - 1 || idx === Math.floor(N / 2);
        pointsSVG += `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" class="chart-point">
            <title>${tooltip}</title>
          </circle>
          ${showLabel ? `<text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" class="chart-axis-text" text-anchor="middle" font-weight="600">${p.session.accuracy}%</text>` : ''}
        `;
      });

      xLabelsSVG += `<text x="${points[0].x.toFixed(1)}" y="${height - 10}" class="chart-axis-text" text-anchor="start">S1</text>`;
      if (N > 2) {
        const mid = Math.floor(N / 2);
        xLabelsSVG += `<text x="${points[mid].x.toFixed(1)}" y="${height - 10}" class="chart-axis-text" text-anchor="middle">S${mid + 1}</text>`;
      }
      xLabelsSVG += `<text x="${points[points.length - 1].x.toFixed(1)}" y="${height - 10}" class="chart-axis-text" text-anchor="end">S${N}</text>`;
    }

    const svgHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--chart-primary)" stop-opacity="0.25" />
            <stop offset="100%" stop-color="var(--chart-primary)" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridLinesSVG}
        ${areaPath ? `<path d="${areaPath}" fill="url(#chartGradient)" />` : ''}
        ${linePath ? `<path d="${linePath}" class="chart-trend-line" />` : ''}
        ${pointsSVG}
        ${xLabelsSVG}
      </svg>
    `;

    this.chartContainer.innerHTML = svgHTML;
  }

  renderReviewList() {
    this.reviewList.innerHTML = '';
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    this.activeQuestions.forEach((q, index) => {
      const userAns = this.userAnswers[q.id];
      const isRight = this.checkAnswerCorrectness(q, userAns);

      const item = document.createElement('div');
      item.className = `review-item ${isRight ? 'is-correct' : 'is-wrong'}`;

      const correctStr = q.correctAnswers
        .map(i => `${optionLetters[i] || i + 1}. ${q.options[i]}`)
        .join(', ');

      let userStr = 'No Answer Selected';
      if (userAns !== undefined) {
        if (Array.isArray(userAns)) {
          userStr = userAns.map(i => `${optionLetters[i] || i + 1}. ${q.options[i]}`).join(', ');
        } else {
          userStr = `${optionLetters[userAns] || userAns + 1}. ${q.options[userAns]}`;
        }
      }

      item.innerHTML = `
        <div class="review-q-title">
          <span>Q${index + 1}.</span>
          <span>${q.question}</span>
        </div>
        <div class="review-q-answers">
          ${!isRight ? `<div><span class="ans-user-wrong">Your answer: ${userStr}</span></div>` : ''}
          <div><span class="ans-correct">Correct answer: ${correctStr}</span></div>
        </div>
      `;

      this.reviewList.appendChild(item);
    });
  }

  saveMistakes() {
    localStorage.setItem(this.storageKeyMistakes, JSON.stringify(Array.from(this.mistakesSet)));
  }

  // =========================================================================
  // BANK MANAGER MODAL OPERATIONS
  // =========================================================================
  openBankModal(tab = 'quiz') {
    this.switchModalTab(tab);

    if (this.storedQuizRaw) {
      this.modalQuizTextarea.value = this.storedQuizRaw;
      this.quizBankStatusText.textContent = `Currently loaded: "${this.quizBankData.title}" (${this.quizBankData.quizzes.length} Quizzes, ${this.quizBankData.totalQuestions} Questions)`;
    } else {
      this.modalQuizTextarea.value = '';
      this.quizBankStatusText.textContent = 'No question bank currently loaded.';
    }

    if (this.storedFCRaw) {
      this.modalFcTextarea.value = this.storedFCRaw;
      this.fcBankStatusText.textContent = `Currently loaded: "${this.flashcardBankData.title}" (${this.flashcardBankData.decks.length} Decks, ${this.flashcardBankData.totalCards} Cards)`;
    } else {
      this.modalFcTextarea.value = '';
      this.fcBankStatusText.textContent = 'No flashcard deck currently loaded.';
    }

    this.updateModalPreview();

    if (!this.bankModal.open) {
      this.bankModal.showModal();
    }
  }

  closeBankModal() {
    if (this.bankModal.open) {
      this.bankModal.close();
    }
  }

  switchModalTab(tab) {
    this.activeModalTab = tab;
    this.tabBtnQuiz.classList.toggle('active', tab === 'quiz');
    this.tabBtnFlashcard.classList.toggle('active', tab === 'flashcard');

    this.tabPanelQuiz.classList.toggle('hidden', tab !== 'quiz');
    this.tabPanelFlashcard.classList.toggle('hidden', tab !== 'flashcard');

    const hasActiveBank = tab === 'quiz' ? !!this.storedQuizRaw : !!this.storedFCRaw;
    this.btnClearActiveBank.classList.toggle('hidden', !hasActiveBank);

    this.updateModalPreview();
  }

  updateModalPreview() {
    if (this.activeModalTab === 'quiz') {
      const text = this.modalQuizTextarea.value.trim();
      if (!text) {
        this.quizParsePreviewBox.classList.add('hidden');
        this.btnSaveActiveBank.disabled = true;
        return;
      }

      const parsed = parseQuestionBank(text);
      if (parsed.quizzes.length === 0) {
        this.quizParsePreviewBox.classList.remove('hidden');
        this.quizPreviewSummaryText.textContent = 'No valid quizzes or questions detected yet.';
        this.quizPreviewList.innerHTML = '<div style="color: var(--muted-foreground); font-size: 0.8rem;">Ensure sections start with "## Quiz Title", questions with "### Question", and options with "A.", "B.", etc.</div>';
        this.btnSaveActiveBank.disabled = true;
        return;
      }

      this.quizParsePreviewBox.classList.remove('hidden');
      this.quizPreviewSummaryText.textContent = `${parsed.quizzes.length} Quizzes, ${parsed.totalQuestions} Questions parsed`;
      this.quizPreviewList.innerHTML = '';

      parsed.quizzes.forEach(quiz => {
        const row = document.createElement('div');
        row.className = 'preview-quiz-row';
        row.innerHTML = `
          <span class="preview-quiz-name">${quiz.title}</span>
          <span class="preview-quiz-count">${quiz.questions.length} Qs</span>
        `;
        this.quizPreviewList.appendChild(row);
      });

      this.btnSaveActiveBank.disabled = false;
    } else {
      const text = this.modalFcTextarea.value.trim();
      if (!text) {
        this.fcParsePreviewBox.classList.add('hidden');
        this.btnSaveActiveBank.disabled = true;
        return;
      }

      const parsed = parseFlashcardBank(text);
      if (parsed.decks.length === 0) {
        this.fcParsePreviewBox.classList.remove('hidden');
        this.fcPreviewSummaryText.textContent = 'No valid flashcard decks or cards detected yet.';
        this.fcPreviewList.innerHTML = '<div style="color: var(--muted-foreground); font-size: 0.8rem;">Ensure sections start with "## Deck Name", cards with "### Question", and answers with "**Answer:**".</div>';
        this.btnSaveActiveBank.disabled = true;
        return;
      }

      this.fcParsePreviewBox.classList.remove('hidden');
      this.fcPreviewSummaryText.textContent = `${parsed.decks.length} Decks, ${parsed.totalCards} Cards parsed`;
      this.fcPreviewList.innerHTML = '';

      parsed.decks.forEach(deck => {
        const row = document.createElement('div');
        row.className = 'preview-quiz-row';
        row.innerHTML = `
          <span class="preview-quiz-name">${deck.title}</span>
          <span class="preview-quiz-count">${deck.cards.length} Cards</span>
        `;
        this.fcPreviewList.appendChild(row);
      });

      this.btnSaveActiveBank.disabled = false;
    }
  }

  saveActiveBankFromModal() {
    if (this.activeModalTab === 'quiz') {
      const text = this.modalQuizTextarea.value.trim();
      const parsed = parseQuestionBank(text);
      if (parsed.quizzes.length === 0) {
        alert('Could not find any valid quizzes in the provided text.');
        return;
      }

      localStorage.setItem(this.storageKeyQuizBank, text);
      this.closeBankModal();
      this.selectedQuizIds.clear();
      this.loadBank();
      this.switchMode('drill');
    } else {
      const text = this.modalFcTextarea.value.trim();
      const parsed = parseFlashcardBank(text);
      if (parsed.decks.length === 0) {
        alert('Could not find any valid flashcards in the provided text.');
        return;
      }

      localStorage.setItem(this.storageKeyFlashcardBank, text);
      this.closeBankModal();
      this.selectedDeckIds.clear();
      this.loadBank();
      this.switchMode('flashcards');
    }
  }

  clearActiveBank() {
    const isQuiz = this.activeModalTab === 'quiz';
    const name = isQuiz ? 'Question Bank (MCQ)' : 'Flashcard Bank';

    if (confirm(`Are you sure you want to delete the ${name}?`)) {
      if (isQuiz) {
        localStorage.removeItem(this.storageKeyQuizBank);
        localStorage.removeItem(this.storageKeyMistakes);
        this.mistakesSet.clear();
        this.storedQuizRaw = null;
        this.quizBankData = { title: '', quizzes: [], totalQuestions: 0 };
        this.selectedQuizIds.clear();
        this.allQuestions = [];
        this.activeQuestions = [];
      } else {
        localStorage.removeItem(this.storageKeyFlashcardBank);
        localStorage.removeItem(this.storageKeyFCMastered);
        localStorage.removeItem(this.storageKeyFCReview);
        this.fcMasteredSet.clear();
        this.fcReviewSet.clear();
        this.storedFCRaw = null;
        this.flashcardBankData = { title: '', decks: [], totalCards: 0 };
        this.selectedDeckIds.clear();
        this.allCards = [];
        this.activeCards = [];
      }

      this.closeBankModal();
      this.loadBank();
    }
  }

  // =========================================================================
  // KEYBOARD NAVIGATION
  // =========================================================================
  handleKeyDown(e) {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    const key = e.key.toUpperCase();

    // If session is paused, allow only P, Space, or Enter to resume
    if (this.isPaused) {
      if (key === 'P' || e.code === 'Space' || key === 'ENTER') {
        e.preventDefault();
        this.togglePause();
      }
      return;
    }

    // Pause toggle: P
    if (key === 'P' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.togglePause();
      return;
    }

    // Hide / Show Top Bars: H
    if (key === 'H' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      this.toggleTopBars();
      return;
    }

    // Text Zoom Out: [
    if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.zoomOut();
      return;
    }

    // Text Zoom In: ]
    if (e.key === ']' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.zoomIn();
      return;
    }

    // Escape exits Zen mode
    if (e.key === 'Escape') {
      if (document.body.classList.contains('fullscreen-mode')) {
        e.preventDefault();
        this.exitZenMode();
        return;
      }
    }

    // Fullscreen shortcut: Shift+F
    if (e.shiftKey && key === 'F') {
      e.preventDefault();
      this.toggleZenMode();
      return;
    }

    // Restart: Shift+R or R (prevent conflict with QWERTY 'R' option)
    if (key === 'R' && !e.ctrlKey && !e.metaKey) {
      const q = this.activeQuestions && this.activeQuestions[this.currentIndex];
      const isROption = !this.quizView.classList.contains('hidden') && q && q.options && q.options.length >= 4;
      if (!isROption || e.shiftKey) {
        e.preventDefault();
        this.restartSession();
        return;
      }
    }

    // Flashcard Mode Shortcuts
    if (this.mode === 'flashcards' && !this.flashcardView.classList.contains('hidden')) {
      if (e.code === 'Space' || key === 'ENTER') {
        e.preventDefault();
        this.flipCard();
        return;
      }
      if (e.key === 'ArrowLeft' || key === 'D') {
        e.preventDefault();
        this.prevCard();
        return;
      }
      if (e.key === 'ArrowRight' || key === 'K') {
        e.preventDefault();
        this.nextCard();
        return;
      }
      if (key === '1' || key === 'J') {
        e.preventDefault();
        this.rateCard('review');
        return;
      }
      if (key === '2' || key === 'L') {
        e.preventDefault();
        this.rateCard('mastered');
        return;
      }
      return;
    }

    // Quiz Mode Shortcuts
    if (!this.quizView.classList.contains('hidden')) {
      if (e.code === 'Space' || key === 'ENTER') {
        e.preventDefault();
        const q = this.activeQuestions[this.currentIndex];
        if (q && q.isMultipleChoice && !this.isAnswered) {
          this.submitMultiAnswer();
        } else {
          this.handleNextOrSubmit();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevQuestion();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.handleNextOrSubmit();
        return;
      }

      // Multi-keybind option selection: Numbers (1-0), QWERTY (Q-P), Home Row (D,F,J,K...), and Custom
      let optIdx = undefined;

      const numberMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9 };
      const qwertyMap = { 'Q': 0, 'W': 1, 'E': 2, 'R': 3, 'T': 4, 'Y': 5, 'U': 6, 'I': 7, 'O': 8, 'P': 9 };
      const homerowMap = { 'D': 0, 'F': 1, 'J': 2, 'K': 3, 'L': 4, ';': 5, 'A': 6, 'S': 7, 'G': 8, 'Z': 9 };

      if (numberMap[e.key] !== undefined) {
        optIdx = numberMap[e.key];
      } else if (qwertyMap[key] !== undefined) {
        optIdx = qwertyMap[key];
      } else if (homerowMap[key] !== undefined) {
        optIdx = homerowMap[key];
      } else if (this.customKeys) {
        const customArr = this.customKeys.toUpperCase().split('');
        const cIdx = customArr.indexOf(key);
        if (cIdx !== -1) optIdx = cIdx;
      }

      if (optIdx !== undefined) {
        const q = this.activeQuestions[this.currentIndex];
        if (q && optIdx < q.options.length) {
          e.preventDefault();
          this.handleOptionClick(optIdx);
          return;
        }
      }
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.quizApp = new QuizApp();
});
