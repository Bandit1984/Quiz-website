import {
  STORAGE_KEYS,
  MODES,
  ORDERS,
  FONT_SCALE_LEVELS
} from './constants.js';
import { storageService } from './services/storage.js';
import { fileLoaderService } from './services/file-loader.js';
import { parseQuestionBank, parseFlashcardBank, detectBankType, formatQuestionText } from './parser.js';
import { Store } from './state/store.js';

import { ThemeController } from './controllers/theme-controller.js';
import { FontScaleController } from './controllers/font-scale-controller.js';
import { LayoutController } from './controllers/layout-controller.js';
import { PauseController } from './controllers/pause-controller.js';
import { KeybindsController } from './controllers/keybinds-controller.js';

import { HudComponent } from './components/hud.js';
import { FilterDropdownComponent } from './components/filter-dropdown.js';
import { BankModalComponent } from './components/bank-modal.js';
import { QuizViewComponent } from './components/quiz-view.js';
import { FlashcardViewComponent } from './components/flashcard-view.js';
import { AnalyticsChartComponent } from './components/analytics-chart.js';
import { SummaryViewComponent } from './components/summary-view.js';

/**
 * QuizApp acts as the high-level application orchestrator,
 * coordinating state, controllers, views, and event flows.
 */
export class QuizApp {
  constructor({ storage = storageService } = {}) {
    this.storage = storage;
    this.store = new Store(this.storage);

    // Backward-compatible storage key references
    this.storageKeyQuizBank = STORAGE_KEYS.QUIZ_BANK;
    this.storageKeyFlashcardBank = STORAGE_KEYS.FLASHCARD_BANK;
    this.storageKeyMistakes = STORAGE_KEYS.MISTAKES;
    this.storageKeyHistory = STORAGE_KEYS.HISTORY;
    this.storageKeyThemeMode = STORAGE_KEYS.THEME_MODE;
    this.storageKeyTheme = STORAGE_KEYS.THEME_ID;
    this.storageKeyFCMastered = STORAGE_KEYS.FC_MASTERED;
    this.storageKeyFCReview = STORAGE_KEYS.FC_REVIEW;
    this.storageKeyFontScale = STORAGE_KEYS.FONT_SCALE;
    this.storageKeyTopBarsHidden = STORAGE_KEYS.TOP_BARS_HIDDEN;
    this.storageKeyKeybindStyle = STORAGE_KEYS.KEYBIND_STYLE;
    this.storageKeyCustomKeys = STORAGE_KEYS.CUSTOM_KEYS;

    // Font Scaling Levels
    this.fontScaleLevels = [...FONT_SCALE_LEVELS];

    // Initialize DOM elements & Controllers
    this.initDOMElements();
    this.initControllers();
    this.initTheme();
    this.initFontScale();
    this.initTopBarsVisibility();
    this.initKeybinds();
    this.bindEvents();

    // Initialize Banks or Empty State
    this.loadBank();
  }

  // Store Proxy Getters and Setters
  get storedQuizRaw() { return this.store.storedQuizRaw; }
  set storedQuizRaw(v) { this.store.storedQuizRaw = v; }
  get storedFCRaw() { return this.store.storedFCRaw; }
  set storedFCRaw(v) { this.store.storedFCRaw = v; }
  get quizBankData() { return this.store.quizBankData; }
  set quizBankData(v) { this.store.quizBankData = v; }
  get flashcardBankData() { return this.store.flashcardBankData; }
  set flashcardBankData(v) { this.store.flashcardBankData = v; }
  get selectedQuizIds() { return this.store.selectedQuizIds; }
  set selectedQuizIds(v) { this.store.selectedQuizIds = v; }
  get selectedDeckIds() { return this.store.selectedDeckIds; }
  set selectedDeckIds(v) { this.store.selectedDeckIds = v; }
  get allQuestions() { return this.store.allQuestions; }
  set allQuestions(v) { this.store.allQuestions = v; }
  get activeQuestions() { return this.store.activeQuestions; }
  set activeQuestions(v) { this.store.activeQuestions = v; }
  get allCards() { return this.store.allCards; }
  set allCards(v) { this.store.allCards = v; }
  get activeCards() { return this.store.activeCards; }
  set activeCards(v) { this.store.activeCards = v; }
  get currentIndex() { return this.store.currentIndex; }
  set currentIndex(v) { this.store.currentIndex = v; }
  get isCardFlipped() { return this.store.isCardFlipped; }
  set isCardFlipped(v) { this.store.isCardFlipped = v; }
  get mode() { return this.store.mode; }
  set mode(v) { this.store.mode = v; }
  get order() { return this.store.order; }
  set order(v) { this.store.order = v; }
  get userAnswers() { return this.store.userAnswers; }
  set userAnswers(v) { this.store.userAnswers = v; }
  get isAnswered() { return this.store.isAnswered; }
  set isAnswered(v) { this.store.isAnswered = v; }
  get selectedMultiOptions() { return this.store.selectedMultiOptions; }
  set selectedMultiOptions(v) { this.store.selectedMultiOptions = v; }
  get timerSeconds() { return this.store.timerSeconds; }
  set timerSeconds(v) { this.store.timerSeconds = v; }
  get timerInterval() { return this.store.timerInterval; }
  set timerInterval(v) { this.store.timerInterval = v; }
  get questionStartTime() { return this.store.questionStartTime; }
  set questionStartTime(v) { this.store.questionStartTime = v; }
  get questionDurations() { return this.store.questionDurations; }
  set questionDurations(v) { this.store.questionDurations = v; }
  get streak() { return this.store.streak; }
  set streak(v) { this.store.streak = v; }
  get maxStreak() { return this.store.maxStreak; }
  set maxStreak(v) { this.store.maxStreak = v; }
  get mistakesSet() { return this.store.mistakesSet; }
  set mistakesSet(v) { this.store.mistakesSet = v; }
  get fcMasteredSet() { return this.store.fcMasteredSet; }
  set fcMasteredSet(v) { this.store.fcMasteredSet = v; }
  get fcReviewSet() { return this.store.fcReviewSet; }
  set fcReviewSet(v) { this.store.fcReviewSet = v; }
  get autoAdvanceMs() { return this.store.autoAdvanceMs; }
  set autoAdvanceMs(v) { this.store.autoAdvanceMs = v; }
  get autoAdvanceTimeout() { return this.store.autoAdvanceTimeout; }
  set autoAdvanceTimeout(v) { this.store.autoAdvanceTimeout = v; }
  get activeModalTab() { return this.store.activeModalTab; }
  set activeModalTab(v) { this.store.activeModalTab = v; }
  get isPaused() { return this.store.isPaused; }
  set isPaused(v) { this.store.isPaused = v; }
  get fontScaleIndex() { return this.store.fontScaleIndex; }
  set fontScaleIndex(v) { this.store.fontScaleIndex = v; }
  get isTopBarsHidden() { return this.store.isTopBarsHidden; }
  set isTopBarsHidden(v) { this.store.isTopBarsHidden = v; }
  get keybindStyle() { return this.store.keybindStyle; }
  set keybindStyle(v) { this.store.keybindStyle = v; }
  get customKeys() { return this.store.customKeys; }
  set customKeys(v) { this.store.customKeys = v; }

  initDOMElements() {
    // Header & Brand
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

    // Views
    this.quizView = document.getElementById('quiz-view');
    this.flashcardView = document.getElementById('flashcard-view');
    this.summaryView = document.getElementById('summary-view');

    // Summary & Analytics
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
  }

  initControllers() {
    // Theme Controller
    this.themeController = new ThemeController({
      storage: this.storage,
      btnThemeToggle: this.btnThemeToggle,
      themeIconSun: this.themeIconSun,
      themeIconMoon: this.themeIconMoon,
      themePills: this.themePills,
      onThemeChange: () => {
        if (this.summaryView && !this.summaryView.classList.contains('hidden')) {
          const history = this.storage.getHistory();
          this.renderImprovementChart(history);
        }
      }
    });

    // Font Scale Controller
    this.fontScaleController = new FontScaleController({
      storage: this.storage,
      levels: this.fontScaleLevels,
      btnZoomIn: this.btnZoomIn,
      btnZoomOut: this.btnZoomOut,
      zoomLevelLabel: this.zoomLevelLabel,
      btnZoomInZen: this.btnZoomInZen,
      btnZoomOutZen: this.btnZoomOutZen,
      zoomLevelLabelZen: this.zoomLevelLabelZen,
      btnZoomInCompact: this.btnZoomInCompact,
      btnZoomOutCompact: this.btnZoomOutCompact,
      zoomLevelLabelCompact: this.zoomLevelLabelCompact
    });

    // Layout Controller
    this.layoutController = new LayoutController({
      storage: this.storage,
      btnToggleBars: this.btnToggleBars,
      toggleBarsIcon: this.toggleBarsIcon,
      toggleBarsText: this.toggleBarsText,
      compactTopBar: this.compactTopBar,
      btnShowBars: this.btnShowBars,
      compactDeckTitle: this.compactDeckTitle,
      compactCounter: this.compactCounter,
      btnFullscreen: this.btnFullscreen,
      btnFullscreenCompact: this.btnFullscreenCompact,
      fullscreenZenBar: this.fullscreenZenBar,
      zenQuizTitle: this.zenQuizTitle,
      zenCounter: this.zenCounter,
      zenStreak: this.zenStreak,
      zenAccuracy: this.zenAccuracy,
      btnExitZen: this.btnExitZen,
      onMetaRefresh: () => this.updateCompactMeta()
    });

    // Pause Controller
    this.pauseController = new PauseController({
      btnPause: this.btnPause,
      pauseBtnIcon: this.pauseBtnIcon,
      pauseBtnText: this.pauseBtnText,
      btnPauseZen: this.btnPauseZen,
      pauseZenIcon: this.pauseZenIcon,
      btnPauseCompact: this.btnPauseCompact,
      pauseCompactIcon: this.pauseCompactIcon,
      pauseCompactText: this.pauseCompactText,
      pauseOverlay: this.pauseOverlay,
      pauseTimerDisplay: this.pauseTimerDisplay,
      btnResumeSession: this.btnResumeSession,
      formatTime: (s) => this.formatTime(s),
      getTime: () => this.timerSeconds,
      onPause: () => {
        this.isPaused = true;
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
      },
      onResume: () => {
        this.isPaused = false;
        if (!this.timerInterval) {
          this.timerInterval = setInterval(() => {
            this.timerSeconds++;
            this.updateHUDTimer();
          }, 1000);
        }
      }
    });

    // Keybinds Controller
    this.keybindsController = new KeybindsController({
      storage: this.storage,
      btnKeybinds: this.btnKeybinds,
      keybindsModal: this.keybindsModal,
      keybindsCloseBtn: this.keybindsCloseBtn,
      btnResetKeybinds: this.btnResetKeybinds,
      btnSaveKeybinds: this.btnSaveKeybinds,
      customKeysContainer: this.customKeysContainer,
      customKeysInput: this.customKeysInput,
      keybindRadioInputs: this.keybindRadioInputs,
      onKeybindsChanged: () => {
        this.keybindStyle = this.keybindsController.keybindStyle;
        this.customKeys = this.keybindsController.customKeys;
        if (this.mode !== MODES.FLASHCARDS && this.activeQuestions && this.activeQuestions.length > 0) {
          this.renderCurrentQuestion();
        }
      }
    });

    // HUD Component
    this.hudComponent = new HudComponent({
      statsHud: this.statsHud,
      hudCard1: this.hudCard1,
      hudLabel1: this.hudLabel1,
      hudVal1: this.hudVal1,
      hudCard2: this.hudCard2,
      hudLabel2: this.hudLabel2,
      hudVal2: this.hudVal2,
      hudCard3: this.hudCard3,
      hudLabel3: this.hudLabel3,
      hudVal3: this.hudVal3,
      hudCard4: this.hudCard4,
      hudLabel4: this.hudLabel4,
      hudVal4: this.hudVal4,
      progressContainer: this.progressContainer,
      progressBar: this.progressBar,
      keyboardBar: this.keyboardBar,
      kbdQuizLegend: this.kbdQuizLegend,
      kbdFcLegend: this.kbdFcLegend
    });

    // Filter Dropdown Component
    this.filterDropdownComponent = new FilterDropdownComponent({
      btnQuizDropdown: this.btnQuizDropdown,
      quizDropdownLabel: this.quizDropdownLabel,
      quizDropdownPopover: this.quizDropdownPopover,
      popoverHeaderTitle: this.popoverHeaderTitle,
      btnSelectAllQuizzes: this.btnSelectAllQuizzes,
      quizDropdownList: this.quizDropdownList,
      onSelectAll: () => this.selectAllDropdownItems(true),
      onToggleQuiz: (qId) => this.toggleQuizSelection(qId),
      onToggleDeck: (dId) => this.toggleDeckSelection(dId)
    });

    // Bank Modal Component
    this.bankModalComponent = new BankModalComponent({
      bankModal: document.getElementById('bank-modal'),
      modalCloseBtn: document.getElementById('modal-close-btn'),
      btnCancelModal: document.getElementById('btn-cancel-modal'),
      btnClearActiveBank: document.getElementById('btn-clear-active-bank'),
      btnSaveActiveBank: document.getElementById('btn-save-active-bank'),
      tabBtnQuiz: document.getElementById('tab-btn-quiz'),
      tabBtnFlashcard: document.getElementById('tab-btn-flashcard'),
      tabPanelQuiz: document.getElementById('tab-panel-quiz'),
      tabPanelFlashcard: document.getElementById('tab-panel-flashcard'),
      quizBankStatusText: document.getElementById('quiz-bank-status-text'),
      fcBankStatusText: document.getElementById('fc-bank-status-text'),
      modalQuizFileInput: document.getElementById('modal-quiz-file-input'),
      modalFcFileInput: document.getElementById('modal-fc-file-input'),
      modalQuizTextarea: document.getElementById('modal-quiz-textarea'),
      modalFcTextarea: document.getElementById('modal-fc-textarea'),
      quizParsePreviewBox: document.getElementById('quiz-parse-preview-box'),
      fcParsePreviewBox: document.getElementById('fc-parse-preview-box'),
      quizPreviewSummaryText: document.getElementById('quiz-preview-summary-text'),
      fcPreviewSummaryText: document.getElementById('fc-preview-summary-text'),
      quizPreviewList: document.getElementById('quiz-preview-list'),
      fcPreviewList: document.getElementById('fc-preview-list'),
      onSaveBank: ({ type, rawText }) => {
        if (type === 'quiz') {
          this.storage.setQuizBankRaw(rawText);
          this.closeBankModal();
          this.selectedQuizIds.clear();
          this.loadBank();
          this.switchMode(MODES.DRILL);
        } else {
          this.storage.setFlashcardBankRaw(rawText);
          this.closeBankModal();
          this.selectedDeckIds.clear();
          this.loadBank();
          this.switchMode(MODES.FLASHCARDS);
        }
      },
      onClearBank: ({ type }) => {
        if (type === 'quiz') {
          this.store.clearQuizBank();
        } else {
          this.store.clearFlashcardBank();
        }
        this.closeBankModal();
        this.loadBank();
      },
      onFileInputChange: (e, targetType, autoSave) => {
        this.handleFileSelect(e, targetType, autoSave);
      }
    });

    // Quiz View Component
    this.quizViewComponent = new QuizViewComponent({
      quizView: this.quizView,
      questionContentArea: document.querySelector('.question-content-area'),
      qQuizTitle: document.getElementById('q-quiz-title'),
      qCounter: document.getElementById('q-counter'),
      multiSelectBadge: document.getElementById('multi-select-badge'),
      questionText: document.getElementById('question-text'),
      optionsList: document.getElementById('options-list'),
      feedbackBox: document.getElementById('feedback-box'),
      btnPrev: document.getElementById('btn-prev'),
      btnSubmitAnswer: document.getElementById('btn-submit-answer'),
      btnNext: document.getElementById('btn-next'),
      btnNextLabel: document.getElementById('btn-next-label'),
      onOptionClick: (idx) => this.handleOptionClick(idx),
      onSubmitMultiAnswer: () => this.submitMultiAnswer(),
      onPrevQuestion: () => this.prevQuestion(),
      onNextOrSubmit: () => this.handleNextOrSubmit()
    });

    // Flashcard View Component
    this.flashcardViewComponent = new FlashcardViewComponent({
      flashcardView: this.flashcardView,
      fcDeckTitle: document.getElementById('fc-deck-title'),
      fcStatusPill: document.getElementById('fc-status-pill'),
      fcCounter: document.getElementById('fc-counter'),
      flashcardScene: document.getElementById('flashcard-scene'),
      flashcardCard: document.getElementById('flashcard-card'),
      fcQuestionText: document.getElementById('fc-question-text'),
      fcAnswerText: document.getElementById('fc-answer-text'),
      fcBtnPrev: document.getElementById('fc-btn-prev'),
      fcBtnFlip: document.getElementById('fc-btn-flip'),
      fcBtnReview: document.getElementById('fc-btn-review'),
      fcBtnMastered: document.getElementById('fc-btn-mastered'),
      fcBtnNext: document.getElementById('fc-btn-next'),
      onFlip: (flipped) => {
        this.isCardFlipped = flipped;
      },
      onPrev: () => this.prevCard(),
      onNext: () => this.nextCard(),
      onRate: (rating) => this.rateCard(rating)
    });

    // Analytics Chart Component
    this.analyticsChartComponent = new AnalyticsChartComponent({
      analyticsTrendBadge: this.analyticsTrendBadge,
      overallSessionsCount: this.overallSessionsCount,
      overallAccuracy: this.overallAccuracy,
      overallTotalQuestions: this.overallTotalQuestions,
      overallBestStreak: this.overallBestStreak,
      overallAvgSpeed: this.overallAvgSpeed,
      chartContainer: this.chartContainer
    });

    // Summary View Component
    this.summaryViewComponent = new SummaryViewComponent({
      summaryView: this.summaryView,
      summaryMainTitle: this.summaryMainTitle,
      summaryScore: this.summaryScore,
      summarySubtitle: this.summarySubtitle,
      summaryAccuracy: this.summaryAccuracy,
      summaryTime: this.summaryTime,
      summaryStreak: this.summaryStreak,
      summaryAvgSpeed: this.summaryAvgSpeed,
      sumStatLbl1: this.sumStatLbl1,
      sumStatLbl2: this.sumStatLbl2,
      sumStatLbl3: this.sumStatLbl3,
      sumStatLbl4: this.sumStatLbl4,
      btnRetryMistakes: this.btnRetryMistakes,
      btnRestartQuiz: this.btnRestartQuiz,
      summaryAnalyticsSection: this.summaryAnalyticsSection,
      summaryReviewSection: this.summaryReviewSection,
      reviewTitle: this.reviewTitle,
      reviewList: this.reviewList,
      onRetryMistakes: () => {
        if (this.mode === MODES.FLASHCARDS) {
          this.filterCardsByReview();
        } else {
          this.order = ORDERS.MISTAKE;
          this.startSession();
        }
      },
      onRestartQuiz: () => {
        this.restartSession();
      }
    });
  }

  // THEME METHODS
  initTheme() {
    this.themeController.initTheme();
  }

  applyTheme(themeId, persist = true) {
    this.themeController.applyTheme(themeId, persist);
  }

  toggleThemeMode() {
    this.themeController.toggleThemeMode();
  }

  // FONT SCALE METHODS
  initFontScale() {
    this.fontScaleController.initFontScale();
    this.fontScaleIndex = this.fontScaleController.fontScaleIndex;
  }

  applyFontScale() {
    this.fontScaleController.applyFontScale();
  }

  zoomIn() {
    this.fontScaleController.zoomIn();
    this.fontScaleIndex = this.fontScaleController.fontScaleIndex;
  }

  zoomOut() {
    this.fontScaleController.zoomOut();
    this.fontScaleIndex = this.fontScaleController.fontScaleIndex;
  }

  // LAYOUT & TOP BARS METHODS
  initTopBarsVisibility() {
    this.layoutController.initLayout();
    this.isTopBarsHidden = this.layoutController.isTopBarsHidden;
  }

  toggleTopBars() {
    this.layoutController.toggleTopBars();
    this.isTopBarsHidden = this.layoutController.isTopBarsHidden;
  }

  applyTopBarsVisibility() {
    this.layoutController.applyTopBarsVisibility();
  }

  updateCompactMeta() {
    if (this.mode === MODES.FLASHCARDS && this.activeCards && this.activeCards.length > 0) {
      const card = this.activeCards[this.currentIndex];
      const title = (card && card.deckTitle) || 'Deck';
      const counter = `Card ${this.currentIndex + 1} / ${this.activeCards.length}`;
      this.layoutController.updateCompactMeta(title, counter);
    } else if (this.activeQuestions && this.activeQuestions.length > 0) {
      const q = this.activeQuestions[this.currentIndex];
      const title = (q && q.quizTitle) || 'Quiz';
      const counter = `${this.currentIndex + 1} / ${this.activeQuestions.length}`;
      this.layoutController.updateCompactMeta(title, counter);
    }
  }

  // KEYBINDS METHODS
  initKeybinds() {
    this.keybindsController.initKeybinds();
    this.keybindStyle = this.keybindsController.keybindStyle;
    this.customKeys = this.keybindsController.customKeys;
  }

  openKeybindsModal() {
    this.keybindsController.openKeybindsModal();
  }

  closeKeybindsModal() {
    this.keybindsController.closeKeybindsModal();
  }

  saveKeybindsFromModal() {
    this.keybindsController.saveKeybindsFromModal();
  }

  resetKeybindsToDefault() {
    this.keybindsController.resetKeybindsToDefault();
  }

  getActiveBadgeKeys() {
    return this.keybindsController.getActiveBadgeKeys();
  }

  // PAUSE METHODS
  togglePause() {
    this.pauseController.togglePause(this.timerSeconds);
    this.isPaused = this.pauseController.isPaused;
  }

  // ZEN FULLSCREEN METHODS
  toggleZenMode() {
    this.layoutController.toggleZenMode();
  }

  exitZenMode() {
    this.layoutController.exitZenMode();
  }

  onFullscreenChange() {
    this.layoutController.onFullscreenChange();
  }

  // FILE LOADING & DRAG AND DROP
  setupDragAndDrop() {
    fileLoaderService.setupDragAndDrop({
      dropZoneQuiz: this.dropZoneQuiz,
      dropZoneFlashcard: this.dropZoneFlashcard,
      onFileDropped: (file, targetType) => {
        this.readFile(file, targetType, true);
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
    fileLoaderService.readFile(file, {
      targetType,
      autoSave,
      onSuccess: ({ type, content, autoSave: shouldSave }) => {
        if (type === 'flashcard') {
          if (shouldSave) {
            this.storage.setFlashcardBankRaw(content);
            this.closeBankModal();
            this.selectedDeckIds.clear();
            this.loadBank();
            this.switchMode(MODES.FLASHCARDS);
          } else {
            const modalFcTextarea = document.getElementById('modal-fc-textarea');
            if (modalFcTextarea) modalFcTextarea.value = content;
            this.bankModalComponent.updateModalPreview();
          }
        } else {
          if (shouldSave) {
            this.storage.setQuizBankRaw(content);
            this.closeBankModal();
            this.selectedQuizIds.clear();
            this.loadBank();
            this.switchMode(MODES.DRILL);
          } else {
            const modalQuizTextarea = document.getElementById('modal-quiz-textarea');
            if (modalQuizTextarea) modalQuizTextarea.value = content;
            this.bankModalComponent.updateModalPreview();
          }
        }
      },
      onInvalid: ({ type, content, message }) => {
        alert(message);
        this.openBankModal(type);
        if (type === 'flashcard') {
          const modalFcTextarea = document.getElementById('modal-fc-textarea');
          if (modalFcTextarea) modalFcTextarea.value = content;
        } else {
          const modalQuizTextarea = document.getElementById('modal-quiz-textarea');
          if (modalQuizTextarea) modalQuizTextarea.value = content;
        }
        this.bankModalComponent.updateModalPreview();
      }
    });
  }

  // BANK LOADING & POOLS
  loadBank() {
    this.storedQuizRaw = this.storage.getQuizBankRaw();
    this.storedFCRaw = this.storage.getFlashcardBankRaw();

    const hasQuiz = !!this.storedQuizRaw;
    const hasFC = !!this.storedFCRaw;

    if (!hasQuiz && !hasFC) {
      if (this.emptyStateView) this.emptyStateView.classList.remove('hidden');
      if (this.mainAppContent) this.mainAppContent.classList.add('hidden');
      if (this.brandTitle) this.brandTitle.textContent = 'Quiz Drill Memorizer';
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

    if (this.emptyStateView) this.emptyStateView.classList.add('hidden');
    if (this.mainAppContent) this.mainAppContent.classList.remove('hidden');

    if (this.mode === MODES.FLASHCARDS) {
      if (this.brandTitle) {
        this.brandTitle.textContent = this.flashcardBankData.title || 'Flashcard Practice';
      }
    } else {
      if (this.brandTitle) {
        this.brandTitle.textContent = this.quizBankData.title || (this.flashcardBankData.title || 'Quiz Drill Memorizer');
      }
    }

    if (this.mode === MODES.FLASHCARDS && !hasFC && hasQuiz) {
      this.mode = MODES.DRILL;
    } else if ((this.mode === MODES.DRILL || this.mode === MODES.EXAM) && !hasQuiz && hasFC) {
      this.mode = MODES.FLASHCARDS;
    }

    this.updateModeButtonsUI();
    this.renderFilterDropdown();
    this.startSession();
  }

  updateModeButtonsUI() {
    if (this.modeDrillBtn) this.modeDrillBtn.classList.toggle('active', this.mode === MODES.DRILL);
    if (this.modeExamBtn) this.modeExamBtn.classList.toggle('active', this.mode === MODES.EXAM);
    if (this.modeFlashcardsBtn) this.modeFlashcardsBtn.classList.toggle('active', this.mode === MODES.FLASHCARDS);
  }

  renderFilterDropdown() {
    this.filterDropdownComponent.renderDropdown({
      mode: this.mode,
      quizBankData: this.quizBankData,
      flashcardBankData: this.flashcardBankData,
      selectedQuizIds: this.selectedQuizIds,
      selectedDeckIds: this.selectedDeckIds
    });
  }

  updateFilterDropdownUI() {
    this.filterDropdownComponent.updateDropdownUI({
      mode: this.mode,
      quizBankData: this.quizBankData,
      flashcardBankData: this.flashcardBankData,
      selectedQuizIds: this.selectedQuizIds,
      selectedDeckIds: this.selectedDeckIds
    });
  }

  selectAllDropdownItems(triggerSession = true) {
    if (this.mode === MODES.FLASHCARDS) {
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
    this.store.rebuildQuestionsPool();
  }

  rebuildCardsPool() {
    this.store.rebuildCardsPool();
  }

  switchMode(newMode) {
    if (this.mode === newMode) return;

    if (newMode === MODES.FLASHCARDS) {
      if (!this.storedFCRaw) {
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

    if (this.mode === MODES.FLASHCARDS) {
      if (this.brandTitle) {
        this.brandTitle.textContent = this.flashcardBankData.title || 'Flashcard Practice';
      }
    } else {
      if (this.brandTitle) {
        this.brandTitle.textContent = this.quizBankData.title || 'Quiz Drill Memorizer';
      }
    }

    if (this.autoadvanceControl) {
      this.autoadvanceControl.classList.toggle('hidden', this.mode !== MODES.DRILL);
    }

    this.hudComponent.setupLabelsForMode(this.mode);
    this.renderFilterDropdown();
    this.startSession();
  }

  // STUDY SESSIONS
  restartSession() {
    this.order = this.shuffleToggle && this.shuffleToggle.checked ? ORDERS.SHUFFLE : ORDERS.ORIGINAL;
    this.startSession();
  }

  startSession() {
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);

    this.timerSeconds = 0;
    this.isPaused = false;
    if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    this.pauseController.updateButtons(false);

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateHUDTimer();
    }, 1000);

    if (this.topToolbar) this.topToolbar.classList.remove('hidden');
    this.hudComponent.show();
    if (this.summaryView) this.summaryView.classList.add('hidden');

    if (this.mode === MODES.FLASHCARDS) {
      this.quizViewComponent.hide();
      this.flashcardViewComponent.show();
      this.rebuildCardsPool();
      this.startFlashcardSession();
    } else {
      this.flashcardViewComponent.hide();
      this.quizViewComponent.show();
      this.rebuildQuestionsPool();
      this.startQuizSession();
    }
  }

  startQuizSession() {
    if (!this.allQuestions || this.allQuestions.length === 0) return;

    if (this.order === ORDERS.SHUFFLE) {
      this.activeQuestions = [...this.allQuestions].sort(() => Math.random() - 0.5);
    } else if (this.order === ORDERS.MISTAKE) {
      const filtered = this.allQuestions.filter(q => this.mistakesSet.has(q.id));
      if (filtered.length === 0) {
        alert('No saved mistakes in selected quizzes! Reverting to all questions.');
        this.order = this.shuffleToggle && this.shuffleToggle.checked ? ORDERS.SHUFFLE : ORDERS.ORIGINAL;
        this.activeQuestions = this.order === ORDERS.SHUFFLE
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

    this.hudComponent.setupLabelsForMode(MODES.DRILL);
    this.renderCurrentQuestion();
    this.updateHUD();
  }

  startFlashcardSession() {
    if (!this.allCards || this.allCards.length === 0) return;

    if (this.order === ORDERS.SHUFFLE) {
      this.activeCards = [...this.allCards].sort(() => Math.random() - 0.5);
    } else {
      this.activeCards = [...this.allCards];
    }

    this.currentIndex = 0;
    this.isCardFlipped = false;

    this.hudComponent.setupLabelsForMode(MODES.FLASHCARDS);
    this.renderCurrentCard();
    this.updateFlashcardHUD();
  }

  // FLASHCARD ACTIONS
  renderCurrentCard() {
    if (!this.activeCards || this.activeCards.length === 0) return;

    const card = this.activeCards[this.currentIndex];
    const isMastered = this.fcMasteredSet.has(card.id);
    const isReview = this.fcReviewSet.has(card.id);

    this.flashcardViewComponent.renderCard({
      card,
      currentIndex: this.currentIndex,
      totalCards: this.activeCards.length,
      isMastered,
      isReview
    });

    this.layoutController.updateZenHUD({
      title: card.deckTitle,
      counter: `${this.currentIndex + 1} / ${this.activeCards.length}`,
      streak: `✅ ${this.fcMasteredSet.size}`,
      accuracy: `⚠️ ${this.fcReviewSet.size}`
    });

    this.updateProgressBar();
    this.updateCompactMeta();
  }

  updateCardStatusPill(cardId) {
    const isMastered = this.fcMasteredSet.has(cardId);
    const isReview = this.fcReviewSet.has(cardId);
    this.flashcardViewComponent.updateStatusPill(isMastered, isReview);
  }

  flipCard() {
    this.flashcardViewComponent.flipCard();
    this.isCardFlipped = this.flashcardViewComponent.isCardFlipped;
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

    this.store.rateCard(card.id, rating);

    this.updateCardStatusPill(card.id);
    this.updateFlashcardHUD();

    setTimeout(() => {
      this.nextCard();
    }, 180);
  }

  saveFlashcardProgress() {
    this.store.saveFlashcardProgress();
  }

  updateFlashcardHUD() {
    const masteredCount = this.fcMasteredSet.size;
    const reviewCount = this.fcReviewSet.size;
    const completionPct = Math.round(((this.currentIndex + 1) / this.activeCards.length) * 100);

    this.hudComponent.updateFlashcardHUD({
      masteredCount,
      reviewCount,
      completionPct
    });
  }

  showFlashcardSummary() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.flashcardViewComponent.hide();
    this.quizViewComponent.hide();

    this.summaryViewComponent.showFlashcardSummary({
      masteredCount: this.fcMasteredSet.size,
      totalCards: this.activeCards.length,
      timeFormatted: this.formatTime(this.timerSeconds),
      reviewCount: this.fcReviewSet.size
    });
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
    this.summaryViewComponent.hide();
    this.flashcardViewComponent.show();
    this.renderCurrentCard();
    this.updateFlashcardHUD();
  }

  // QUIZ ACTIONS
  renderCurrentQuestion() {
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
    if (!this.activeQuestions || this.activeQuestions.length === 0) return;

    const q = this.activeQuestions[this.currentIndex];
    this.questionStartTime = Date.now();
    this.isAnswered = this.userAnswers[q.id] !== undefined;

    if (this.isAnswered && Array.isArray(this.userAnswers[q.id])) {
      this.selectedMultiOptions.clear();
      this.userAnswers[q.id].forEach(idx => this.selectedMultiOptions.add(idx));
    }

    this.quizViewComponent.renderQuestion({
      question: q,
      currentIndex: this.currentIndex,
      totalQuestions: this.activeQuestions.length,
      userAnswers: this.userAnswers,
      isAnswered: this.isAnswered,
      selectedMultiOptions: this.selectedMultiOptions,
      badgeKeys: this.getActiveBadgeKeys(),
      mode: this.mode
    });

    const accuracyText = this.hudVal2 ? this.hudVal2.textContent : '100%';
    this.layoutController.updateZenHUD({
      title: q.quizTitle,
      counter: `${this.currentIndex + 1} / ${this.activeQuestions.length}`,
      streak: `${this.streak}🔥`,
      accuracy: accuracyText
    });

    this.updateProgressBar();
    this.updateCompactMeta();
  }

  checkAnswerCorrectness(q, answer) {
    return QuizViewComponent.checkAnswerCorrectness(q, answer);
  }

  handleOptionClick(index) {
    if (this.isPaused) return;
    const q = this.activeQuestions[this.currentIndex];
    if (!q) return;

    if (this.mode === MODES.DRILL && this.isAnswered) return;

    if (q.isMultipleChoice) {
      if (this.mode === MODES.DRILL && this.isAnswered) return;
      if (this.selectedMultiOptions.has(index)) {
        this.selectedMultiOptions.delete(index);
      } else {
        this.selectedMultiOptions.add(index);
      }
      if (this.mode === MODES.EXAM) {
        this.userAnswers[q.id] = Array.from(this.selectedMultiOptions).sort((a, b) => a - b);
      }
      this.renderCurrentQuestion();
      return;
    }

    if (this.mode === MODES.EXAM) {
      this.userAnswers[q.id] = index;
      this.renderCurrentQuestion();
      return;
    }

    this.recordAnswer(index);
  }

  submitMultiAnswer() {
    const q = this.activeQuestions[this.currentIndex];
    if (!q || !q.isMultipleChoice || this.isAnswered) return;
    if (this.selectedMultiOptions.size === 0) {
      alert('Please select at least one option before submitting.');
      return;
    }

    const answers = Array.from(this.selectedMultiOptions).sort((a, b) => a - b);
    this.recordAnswer(answers);
  }

  recordAnswer(answer) {
    const q = this.activeQuestions[this.currentIndex];
    const duration = (Date.now() - this.questionStartTime) / 1000;
    const isRight = this.checkAnswerCorrectness(q, answer);

    this.store.recordAnswer(q.id, answer, duration, isRight);

    this.updateHUD();
    this.renderCurrentQuestion();

    if (this.mode === MODES.DRILL && this.autoAdvanceMs > 0) {
      this.autoAdvanceTimeout = setTimeout(() => {
        this.handleNextOrSubmit();
      }, this.autoAdvanceMs);
    }
  }

  initQuestionSelections() {
    this.store.initQuestionSelections();
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
    if (this.mode === MODES.FLASHCARDS) {
      this.hudComponent.updateProgressBar(this.currentIndex, this.activeCards.length);
    } else {
      this.hudComponent.updateProgressBar(this.currentIndex, this.activeQuestions.length);
    }
  }

  updateHUD() {
    if (this.mode === MODES.FLASHCARDS) {
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
    const durations = Object.values(this.questionDurations);
    const avgSec = durations.length > 0
      ? (durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(1)
      : '0.0';

    this.hudComponent.updateQuizHUD({
      streak: this.streak,
      accuracyPct,
      avgSpeed: avgSec
    });
  }

  updateHUDTimer() {
    this.hudComponent.updateHUDTimer(this.timerSeconds);
  }

  formatTime(seconds) {
    return this.hudComponent.formatTime(seconds);
  }

  showQuizSummary() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.quizViewComponent.hide();
    this.flashcardViewComponent.hide();

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

    this.summaryViewComponent.showQuizSummary({
      mode: this.mode,
      correctCount,
      answeredCount,
      accuracy,
      timeFormatted: this.formatTime(this.timerSeconds),
      maxStreak: this.maxStreak,
      avgSpeed
    });

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
    const history = this.storage.addHistorySession(session);
    this.renderOverallStats(history);
    this.renderImprovementChart(history);
  }

  renderOverallStats(history) {
    this.analyticsChartComponent.renderOverallStats(history);
  }

  renderImprovementChart(history) {
    this.analyticsChartComponent.renderImprovementChart(history);
  }

  renderReviewList() {
    this.summaryViewComponent.renderReviewList(
      this.activeQuestions,
      this.userAnswers,
      (q, ans) => this.checkAnswerCorrectness(q, ans)
    );
  }

  saveMistakes() {
    this.store.saveMistakes();
  }

  // BANK MODAL METHODS
  openBankModal(tab = 'quiz') {
    this.activeModalTab = tab;
    this.bankModalComponent.openBankModal(tab, {
      storedQuizRaw: this.storedQuizRaw,
      storedFCRaw: this.storedFCRaw,
      quizBankData: this.quizBankData,
      flashcardBankData: this.flashcardBankData
    });
  }

  closeBankModal() {
    this.bankModalComponent.closeBankModal();
  }

  switchModalTab(tab) {
    this.activeModalTab = tab;
    this.bankModalComponent.switchModalTab(tab, {
      storedQuizRaw: this.storedQuizRaw,
      storedFCRaw: this.storedFCRaw
    });
  }

  updateModalPreview() {
    this.bankModalComponent.updateModalPreview();
  }

  saveActiveBankFromModal() {
    this.bankModalComponent.saveActiveBank();
  }

  clearActiveBank() {
    this.bankModalComponent.clearActiveBank();
  }

  // KEYBOARD NAVIGATION
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
    if (this.mode === MODES.FLASHCARDS && !this.flashcardView.classList.contains('hidden')) {
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

      // Multi-keybind option selection: Numbers, QWERTY, Home Row, and Custom
      const optIdx = this.keybindsController.resolveOptionIndex(key, e.key);

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

  bindEvents() {
    // Header & Modal Actions
    if (this.btnManageBank) {
      this.btnManageBank.addEventListener('click', () => {
        this.openBankModal(this.mode === MODES.FLASHCARDS ? 'flashcard' : 'quiz');
      });
    }

    // Empty state paste buttons
    if (this.btnPasteQuizEmpty) {
      this.btnPasteQuizEmpty.addEventListener('click', () => this.openBankModal('quiz'));
    }
    if (this.btnPasteFlashcardEmpty) {
      this.btnPasteFlashcardEmpty.addEventListener('click', () => this.openBankModal('flashcard'));
    }

    // File inputs
    if (this.quizFileInput) {
      this.quizFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'quiz', true));
    }
    if (this.flashcardFileInput) {
      this.flashcardFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'flashcard', true));
    }

    // Drag and drop
    this.setupDragAndDrop();

    // Mode Switching
    if (this.modeDrillBtn) {
      this.modeDrillBtn.addEventListener('click', () => this.switchMode(MODES.DRILL));
    }
    if (this.modeExamBtn) {
      this.modeExamBtn.addEventListener('click', () => this.switchMode(MODES.EXAM));
    }
    if (this.modeFlashcardsBtn) {
      this.modeFlashcardsBtn.addEventListener('click', () => this.switchMode(MODES.FLASHCARDS));
    }

    // Shuffle & Auto Advance Toggles
    if (this.shuffleToggle) {
      this.shuffleToggle.addEventListener('change', (e) => {
        this.order = e.target.checked ? ORDERS.SHUFFLE : ORDERS.ORIGINAL;
        this.startSession();
      });
    }

    if (this.autoAdvanceToggle) {
      this.autoAdvanceToggle.addEventListener('change', (e) => {
        this.autoAdvanceMs = e.target.checked ? 500 : 0;
      });
    }

    // Session controls
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.restartSession());
    }

    // Global Keydown
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }
}
