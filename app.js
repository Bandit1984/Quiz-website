import { parseQuestionBank } from './parser.js';

class QuizApp {
  constructor() {
    this.storageKeyBank = 'quiz_bank_raw';
    this.storageKeyMistakes = 'quiz_drill_mistakes';
    this.storageKeyHistory = 'quiz_drill_history';
    this.storageKeyThemeMode = 'quiz_theme_mode';
    this.storageKeyTheme = 'quiz_theme_id';

    // Bank & Question Pool State
    this.storedBankRaw = localStorage.getItem(this.storageKeyBank) || null;
    this.bankData = { title: '', quizzes: [], totalQuestions: 0 };
    this.selectedQuizIds = new Set();
    this.allQuestions = [];
    this.activeQuestions = [];
    this.currentIndex = 0;

    // Quiz Session State
    this.mode = 'drill'; // 'drill' | 'exam'
    this.order = 'original'; // 'original' | 'shuffle' | 'mistake'
    this.userAnswers = {}; // { [qId]: number | number[] }
    this.isAnswered = false;
    this.selectedMultiOptions = new Set();

    // Timer & Metrics
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.questionStartTime = Date.now();
    this.questionDurations = {};

    // Streaks & Mistakes
    this.streak = 0;
    this.maxStreak = 0;
    this.mistakesSet = new Set(JSON.parse(localStorage.getItem(this.storageKeyMistakes) || '[]'));
    this.autoAdvanceMs = 500; // 0.5s default as requested
    this.autoAdvanceTimeout = null;

    // DOM Elements & Theme
    this.initDOMElements();
    this.initTheme();
    this.bindEvents();

    // Initialize Bank or Empty State
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

    // Zen Fullscreen Bar
    this.fullscreenZenBar = document.getElementById('fullscreen-zen-bar');
    this.zenQuizTitle = document.getElementById('zen-quiz-title');
    this.zenCounter = document.getElementById('zen-counter');
    this.zenStreak = document.getElementById('zen-streak');
    this.zenAccuracy = document.getElementById('zen-accuracy');
    this.btnExitZen = document.getElementById('btn-exit-zen');

    // Empty State
    this.emptyStateView = document.getElementById('empty-state-view');
    this.emptyDropZone = document.getElementById('empty-drop-zone');
    this.emptyFileInput = document.getElementById('empty-file-input');
    this.emptyBtnPaste = document.getElementById('empty-btn-paste');
    this.mainAppContent = document.getElementById('main-app-content');

    this.topToolbar = document.getElementById('top-toolbar');
    this.btnQuizDropdown = document.getElementById('btn-quiz-dropdown');
    this.quizDropdownLabel = document.getElementById('quiz-dropdown-label');
    this.quizDropdownPopover = document.getElementById('quiz-dropdown-popover');
    this.btnSelectAllQuizzes = document.getElementById('btn-select-all-quizzes');
    this.quizDropdownList = document.getElementById('quiz-dropdown-list');
    this.modeDrillBtn = document.getElementById('mode-drill');
    this.modeExamBtn = document.getElementById('mode-exam');
    this.shuffleToggle = document.getElementById('shuffle-toggle');
    this.autoAdvanceToggle = document.getElementById('autoadvance-toggle');

    // HUD Stats
    this.statsHud = document.getElementById('stats-hud');
    this.hudStreak = document.getElementById('hud-streak');
    this.hudAccuracy = document.getElementById('hud-accuracy');
    this.hudTimer = document.getElementById('hud-timer');
    this.hudAvgSpeed = document.getElementById('hud-avg-speed');
    this.progressContainer = document.getElementById('progress-container');
    this.progressBar = document.getElementById('progress-bar');
    this.keyboardBar = document.getElementById('keyboard-bar');

    // Question Card
    this.quizView = document.getElementById('quiz-view');
    this.summaryView = document.getElementById('summary-view');
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

    // Summary View
    this.summaryScore = document.getElementById('summary-score');
    this.summarySubtitle = document.getElementById('summary-subtitle');
    this.summaryAccuracy = document.getElementById('summary-accuracy');
    this.summaryTime = document.getElementById('summary-time');
    this.summaryStreak = document.getElementById('summary-streak');
    this.summaryAvgSpeed = document.getElementById('summary-avg-speed');
    this.btnRetryMistakes = document.getElementById('btn-retry-mistakes');
    this.btnRestartQuiz = document.getElementById('btn-restart-quiz');

    // Overall General Stats & Analytics
    this.analyticsTrendBadge = document.getElementById('analytics-trend-badge');
    this.overallSessionsCount = document.getElementById('overall-sessions-count');
    this.overallAccuracy = document.getElementById('overall-accuracy');
    this.overallTotalQuestions = document.getElementById('overall-total-questions');
    this.overallBestStreak = document.getElementById('overall-best-streak');
    this.overallAvgSpeed = document.getElementById('overall-avg-speed');
    this.chartContainer = document.getElementById('chart-container');
    this.reviewTitle = document.getElementById('review-title');
    this.reviewList = document.getElementById('review-list');

    // Modal Elements
    this.bankModal = document.getElementById('bank-modal');
    this.modalCloseBtn = document.getElementById('modal-close-btn');
    this.bankStatusText = document.getElementById('bank-status-text');
    this.modalFileInput = document.getElementById('modal-file-input');
    this.bankTextarea = document.getElementById('bank-textarea');
    this.parsePreviewBox = document.getElementById('parse-preview-box');
    this.previewSummaryText = document.getElementById('preview-summary-text');
    this.previewQuizzesList = document.getElementById('preview-quizzes-list');
    this.btnClearBank = document.getElementById('btn-clear-bank');
    this.btnCancelModal = document.getElementById('btn-cancel-modal');
    this.btnSaveBank = document.getElementById('btn-save-bank');
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
    if (!validThemes.includes(savedTheme)) {
      savedTheme = 'blue';
    }
    this.applyTheme(savedTheme, false);
  }

  applyTheme(themeId, persist = true) {
    const validThemes = ['blue', 'zinc', 'violet', 'green', 'rose', 'orange'];
    if (!validThemes.includes(themeId)) {
      themeId = 'blue';
    }
    document.body.dataset.theme = themeId;
    if (persist) {
      localStorage.setItem(this.storageKeyTheme, themeId);
    }
    if (this.themePills) {
      this.themePills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.theme === themeId);
      });
    }

    // If summary chart is rendered, re-render it so SVG colors and gradients update
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

    // If summary chart is rendered, re-render it
    if (this.summaryView && !this.summaryView.classList.contains('hidden')) {
      const history = JSON.parse(localStorage.getItem(this.storageKeyHistory) || '[]');
      this.renderImprovementChart(history);
    }
  }

  bindEvents() {
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
    this.btnManageBank.addEventListener('click', () => this.openBankModal(false));
    this.modalCloseBtn.addEventListener('click', () => this.closeBankModal());
    this.btnCancelModal.addEventListener('click', () => this.closeBankModal());
    this.btnClearBank.addEventListener('click', () => this.clearBank());
    this.btnSaveBank.addEventListener('click', () => this.saveBankFromModal());

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
      if (!isInDialog) {
        this.closeBankModal();
      }
    });

    // File Input & Drag and Drop
    this.emptyFileInput.addEventListener('change', (e) => this.handleFileSelect(e, true));
    this.modalFileInput.addEventListener('change', (e) => this.handleFileSelect(e, false));
    this.emptyBtnPaste.addEventListener('click', () => this.openBankModal(false));

    this.setupDragAndDrop();

    // Textarea input in modal (Live preview)
    this.bankTextarea.addEventListener('input', () => this.updateModalPreview());

    // Quiz Dropdown Popover
    this.btnQuizDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = this.quizDropdownPopover.classList.contains('hidden');
      this.quizDropdownPopover.classList.toggle('hidden', !isHidden);
      this.btnQuizDropdown.setAttribute('aria-expanded', isHidden);
    });

    this.btnSelectAllQuizzes.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectAllQuizzes(true);
    });

    // Close dropdown popover on click outside
    document.addEventListener('click', (e) => {
      if (!this.quizDropdownPopover.contains(e.target) && !this.btnQuizDropdown.contains(e.target)) {
        this.quizDropdownPopover.classList.add('hidden');
        this.btnQuizDropdown.setAttribute('aria-expanded', 'false');
      }
    });

    // Mode Switching
    this.modeDrillBtn.addEventListener('click', () => this.switchMode('drill'));
    this.modeExamBtn.addEventListener('click', () => this.switchMode('exam'));

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

    // Navigation & Actions
    this.restartBtn.addEventListener('click', () => this.restartSession());
    this.btnPrev.addEventListener('click', () => this.prevQuestion());
    this.btnSubmitAnswer.addEventListener('click', () => this.submitMultiAnswer());
    this.btnNext.addEventListener('click', () => this.handleNextOrSubmit());

    // Summary Actions
    this.btnRetryMistakes.addEventListener('click', () => {
      this.order = 'mistake';
      this.startSession();
    });

    this.btnRestartQuiz.addEventListener('click', () => {
      this.restartSession();
    });

    // Keyboard Shortcuts (D, F, J, K, etc.)
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  restartSession() {
    this.order = this.shuffleToggle && this.shuffleToggle.checked ? 'shuffle' : 'original';
    this.startSession();
  }

  toggleZenMode() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      document.body.classList.add('fullscreen-mode');
    } else {
      document.exitFullscreen().catch(() => {});
      document.body.classList.remove('fullscreen-mode');
    }
  }

  exitZenMode() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    document.body.classList.remove('fullscreen-mode');
  }

  onFullscreenChange() {
    const isFs = !!document.fullscreenElement;
    document.body.classList.toggle('fullscreen-mode', isFs);
  }

  setupDragAndDrop() {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    const events = ['dragenter', 'dragover', 'dragleave', 'drop'];
    events.forEach(eventName => {
      this.emptyDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.emptyDropZone.addEventListener(eventName, () => {
        this.emptyDropZone.classList.add('drag-active');
      });
    });

    ['dragleave'].forEach(eventName => {
      this.emptyDropZone.addEventListener(eventName, () => {
        this.emptyDropZone.classList.remove('drag-active');
      });
    });

    this.emptyDropZone.addEventListener('drop', (e) => {
      this.emptyDropZone.classList.remove('drag-active');
      const dt = e.dataTransfer;
      const files = dt && dt.files;
      if (files && files.length > 0) {
        this.readFile(files[0], true);
      }
    });
  }

  handleFileSelect(e, autoSave = true) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      this.readFile(file, autoSave);
      e.target.value = '';
    }
  }

  readFile(file, autoSave = true) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const parsed = parseQuestionBank(content);

      if (!parsed || parsed.quizzes.length === 0) {
        alert('Could not find any valid quizzes in the uploaded file.\n\nPlease ensure sections start with "## Quiz Title", questions with "### Question", and options with "A.", "B.", etc.');
        this.bankTextarea.value = content;
        this.openBankModal(true);
        this.updateModalPreview();
        return;
      }

      if (autoSave) {
        localStorage.setItem(this.storageKeyBank, content);
        this.closeBankModal();
        this.selectedQuizIds.clear();
        this.loadBank();
      } else {
        this.bankTextarea.value = content;
        this.updateModalPreview();
      }
    };

    reader.onerror = (err) => {
      console.error('File read error:', err);
      alert('Error reading the selected file. Please try again.');
    };

    reader.readAsText(file);
  }

  loadBank() {
    this.storedBankRaw = localStorage.getItem(this.storageKeyBank) || null;

    if (!this.storedBankRaw) {
      this.emptyStateView.classList.remove('hidden');
      this.mainAppContent.classList.add('hidden');
      this.brandTitle.textContent = 'Quiz Drill Memorizer';
      return;
    }

    const parsed = parseQuestionBank(this.storedBankRaw);
    if (!parsed || parsed.quizzes.length === 0) {
      this.emptyStateView.classList.remove('hidden');
      this.mainAppContent.classList.add('hidden');
      this.brandTitle.textContent = 'Quiz Drill Memorizer';
      return;
    }

    this.bankData = parsed;
    this.emptyStateView.classList.add('hidden');
    this.mainAppContent.classList.remove('hidden');

    this.brandTitle.textContent = this.bankData.title || 'Quiz Drill Memorizer';

    // Populate dropdown
    this.renderQuizDropdown();

    if (this.selectedQuizIds.size === 0) {
      this.selectAllQuizzes(true);
    } else {
      this.rebuildQuestionsPool();
      this.startSession();
    }
  }

  renderQuizDropdown() {
    this.quizDropdownList.innerHTML = '';

    this.bankData.quizzes.forEach(quiz => {
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

    this.updateQuizDropdownUI();
  }

  updateQuizDropdownUI() {
    const isAllSelected = this.selectedQuizIds.size === this.bankData.quizzes.length;

    // Update Dropdown Label Text
    if (isAllSelected) {
      this.quizDropdownLabel.textContent = `All Quizzes (${this.bankData.totalQuestions} Questions)`;
    } else if (this.selectedQuizIds.size === 1) {
      const qz = this.bankData.quizzes.find(q => this.selectedQuizIds.has(q.id));
      this.quizDropdownLabel.textContent = qz ? `${qz.title} (${qz.questions.length} Qs)` : '1 Quiz Selected';
    } else {
      const count = this.bankData.quizzes
        .filter(q => this.selectedQuizIds.has(q.id))
        .reduce((sum, q) => sum + q.questions.length, 0);
      this.quizDropdownLabel.textContent = `${this.selectedQuizIds.size} Quizzes Selected (${count} Qs)`;
    }

    // Sync Checkboxes
    const checkboxes = this.quizDropdownList.querySelectorAll('.popover-checkbox');
    checkboxes.forEach(cb => {
      const qId = cb.dataset.id;
      cb.checked = this.selectedQuizIds.has(qId);
    });
  }

  selectAllQuizzes(triggerSession = true) {
    this.selectedQuizIds = new Set(this.bankData.quizzes.map(q => q.id));
    this.updateQuizDropdownUI();
    this.rebuildQuestionsPool();
    if (triggerSession) this.startSession();
  }

  toggleQuizSelection(quizId) {
    const isAllSelected = this.selectedQuizIds.size === this.bankData.quizzes.length;

    if (isAllSelected) {
      // Isolate clicked quiz
      this.selectedQuizIds = new Set([quizId]);
    } else if (this.selectedQuizIds.has(quizId)) {
      this.selectedQuizIds.delete(quizId);
      if (this.selectedQuizIds.size === 0) {
        this.selectedQuizIds = new Set(this.bankData.quizzes.map(q => q.id));
      }
    } else {
      this.selectedQuizIds.add(quizId);
    }

    this.updateQuizDropdownUI();
    this.rebuildQuestionsPool();
    this.startSession();
  }

  rebuildQuestionsPool() {
    this.allQuestions = [];
    this.bankData.quizzes.forEach(quiz => {
      if (this.selectedQuizIds.has(quiz.id)) {
        this.allQuestions.push(...quiz.questions);
      }
    });
  }

  switchMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;

    if (newMode === 'drill') {
      this.modeDrillBtn.classList.add('active');
      this.modeExamBtn.classList.remove('active');
    } else {
      this.modeExamBtn.classList.add('active');
      this.modeDrillBtn.classList.remove('active');
    }

    this.startSession();
  }

  startSession() {
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
    }

    if (!this.allQuestions || this.allQuestions.length === 0) {
      return;
    }

    // Apply Order
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

    // Reset Timer
    this.timerSeconds = 0;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateHUDTimer();
    }, 1000);

    if (this.topToolbar) this.topToolbar.classList.remove('hidden');
    if (this.statsHud) this.statsHud.classList.remove('hidden');
    if (this.progressContainer) this.progressContainer.classList.remove('hidden');
    if (this.keyboardBar) this.keyboardBar.classList.remove('hidden');
    this.quizView.classList.remove('hidden');
    this.summaryView.classList.add('hidden');

    this.renderCurrentQuestion();
    this.updateHUD();
  }

  renderCurrentQuestion() {
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);

    if (this.activeQuestions.length === 0) return;

    const q = this.activeQuestions[this.currentIndex];
    this.questionStartTime = Date.now();
    this.isAnswered = this.userAnswers[q.id] !== undefined;
    this.selectedMultiOptions.clear();

    if (this.isAnswered && Array.isArray(this.userAnswers[q.id])) {
      this.userAnswers[q.id].forEach(idx => this.selectedMultiOptions.add(idx));
    }

    // Header info & Origin Badge
    this.qQuizTitle.textContent = q.quizTitle;
    this.qCounter.textContent = `Progress: ${this.currentIndex + 1} / ${this.activeQuestions.length}`;

    // Sync Zen Fullscreen bar
    if (this.zenQuizTitle) {
      this.zenQuizTitle.textContent = q.quizTitle;
      this.zenCounter.textContent = `${this.currentIndex + 1} / ${this.activeQuestions.length}`;
      this.zenStreak.textContent = `${this.streak}🔥`;
      this.zenAccuracy.textContent = this.hudAccuracy ? this.hudAccuracy.textContent : '100%';
    }

    // Question Prompt
    if (q.formattedQuestion) {
      this.questionText.innerHTML = q.formattedQuestion;
    } else {
      this.questionText.textContent = q.question;
    }

    // Multiple choice indicator
    if (q.isMultipleChoice) {
      this.multiSelectBadge.classList.remove('hidden');
    } else {
      this.multiSelectBadge.classList.add('hidden');
    }

    // Options rendering with D, F, J, K keys
    this.optionsList.innerHTML = '';
    const optionKeys = ['D', 'F', 'J', 'K', 'L', ';'];

    q.options.forEach((optText, index) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.index = index;

      const userSelected = q.isMultipleChoice
        ? this.selectedMultiOptions.has(index)
        : this.userAnswers[q.id] === index;

      const isCorrectOption = q.correctAnswers.includes(index);

      if (this.isAnswered) {
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
          } else if (this.mode === 'exam') {
            btn.classList.add('selected');
          }
        }
      }

      btn.innerHTML = `
        <span class="key-badge">${optionKeys[index] || index + 1}</span>
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

    // Update Next Button text without emojis, keeping matching nav button styling
    if (this.btnNextLabel) {
      if (this.currentIndex === this.activeQuestions.length - 1) {
        this.btnNextLabel.textContent = this.mode === 'exam' ? 'Submit Exam' : 'Finish Drill';
      } else {
        this.btnNextLabel.textContent = 'Next';
      }
    }

    // Feedback box in drill mode
    if (this.mode === 'drill' && this.isAnswered) {
      const userSel = this.userAnswers[q.id];
      const isRight = this.checkAnswerCorrectness(q, userSel);
      this.feedbackBox.classList.remove('hidden', 'correct', 'wrong');

      if (isRight) {
        this.feedbackBox.classList.add('correct');
        this.feedbackBox.innerHTML = `<div>✓ <strong>Correct!</strong> Excellent retention.</div> <span style="font-size:0.8rem; opacity:0.8">[Press Space / Enter to advance]</span>`;
      } else {
        this.feedbackBox.classList.add('wrong');
        const correctLetters = q.correctAnswers.map(idx => optionKeys[idx] || idx + 1).join(', ');
        const correctTexts = q.correctAnswers.map(idx => `<strong>${optionKeys[idx] || idx + 1}. ${q.options[idx]}</strong>`).join('<br>');
        this.feedbackBox.innerHTML = `<div>✗ <strong>Incorrect.</strong> Correct answer(s): <strong>${correctLetters}</strong><div style="margin-top:0.35rem; font-size:0.85rem;">${correctTexts}</div></div> <span style="font-size:0.8rem; opacity:0.8">[Press Space / Enter to advance]</span>`;
      }
    } else {
      this.feedbackBox.classList.add('hidden');
    }

    this.updateProgressBar();
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
    const q = this.activeQuestions[this.currentIndex];

    if (this.isAnswered && this.mode === 'drill') return;

    if (q.isMultipleChoice) {
      if (this.isAnswered) return;

      if (this.selectedMultiOptions.has(index)) {
        this.selectedMultiOptions.delete(index);
      } else {
        this.selectedMultiOptions.add(index);
      }

      const btns = this.optionsList.querySelectorAll('.option-btn');
      if (btns[index]) {
        btns[index].classList.toggle('multi-selected', this.selectedMultiOptions.has(index));
      }
    } else {
      this.selectSingleOption(index);
    }
  }

  submitMultiAnswer() {
    const q = this.activeQuestions[this.currentIndex];
    if (this.isAnswered || !q.isMultipleChoice) return;

    const selectedArray = Array.from(this.selectedMultiOptions).sort((a, b) => a - b);
    if (selectedArray.length === 0) {
      alert('Please select at least one option before submitting.');
      return;
    }

    const duration = (Date.now() - this.questionStartTime) / 1000;
    this.questionDurations[q.id] = duration;
    this.userAnswers[q.id] = selectedArray;

    const isCorrect = this.checkAnswerCorrectness(q, selectedArray);
    this.recordAnswerResult(q, isCorrect);
  }

  selectSingleOption(index) {
    const q = this.activeQuestions[this.currentIndex];
    if (this.isAnswered && this.mode === 'drill') return;

    const duration = (Date.now() - this.questionStartTime) / 1000;
    this.questionDurations[q.id] = duration;
    this.userAnswers[q.id] = index;

    const isCorrect = this.checkAnswerCorrectness(q, index);
    this.recordAnswerResult(q, isCorrect);
  }

  recordAnswerResult(q, isCorrect) {
    if (this.mode === 'drill') {
      this.isAnswered = true;
      if (isCorrect) {
        this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;
        this.mistakesSet.delete(q.id);
      } else {
        this.streak = 0;
        this.mistakesSet.add(q.id);
      }
      this.saveMistakes();
      this.renderCurrentQuestion();
      this.updateHUD();

      if (this.autoAdvanceMs > 0) {
        this.autoAdvanceTimeout = setTimeout(() => {
          this.nextQuestion();
        }, this.autoAdvanceMs);
      }
    } else {
      // Exam Mode
      if (isCorrect) {
        this.mistakesSet.delete(q.id);
      } else {
        this.mistakesSet.add(q.id);
      }
      this.saveMistakes();
      this.renderCurrentQuestion();
      this.updateHUD();

      if (this.autoAdvanceMs > 0 && this.currentIndex < this.activeQuestions.length - 1) {
        this.autoAdvanceTimeout = setTimeout(() => {
          this.nextQuestion();
        }, this.autoAdvanceMs);
      }
    }
  }

  handleNextOrSubmit() {
    const q = this.activeQuestions[this.currentIndex];
    if (this.mode === 'exam' && q && q.isMultipleChoice && this.userAnswers[q.id] === undefined && this.selectedMultiOptions.size > 0) {
      this.userAnswers[q.id] = Array.from(this.selectedMultiOptions).sort((a, b) => a - b);
    }

    if (this.currentIndex < this.activeQuestions.length - 1) {
      this.nextQuestion();
    } else {
      this.finishSession();
    }
  }

  nextQuestion() {
    if (this.currentIndex < this.activeQuestions.length - 1) {
      this.currentIndex++;
      this.renderCurrentQuestion();
    } else {
      this.finishSession();
    }
  }

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentQuestion();
    }
  }

  handleKeyDown(e) {
    if (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) ||
      (this.bankModal && this.bankModal.open) ||
      this.mainAppContent.classList.contains('hidden')
    ) {
      return;
    }

    const key = e.key.toUpperCase();

    // Shift + F toggles Zen mode
    if (e.shiftKey && key === 'F') {
      e.preventDefault();
      this.toggleZenMode();
      return;
    }

    // Escape exits Zen mode
    if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
      e.preventDefault();
      this.exitZenMode();
      return;
    }

    // D, F, J, K mapping (Home row rhythm keys requested by user)
    const keyMap = {
      'D': 0, 'd': 0,
      'F': 1, 'f': 1,
      'J': 2, 'j': 2,
      'K': 3, 'k': 3,
      'L': 4, 'l': 4,
      ';': 5,
      // Fallback number keys
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
      // Fallback letter keys
      'A': 0, 'a': 0,
      'B': 1, 'b': 1,
      'C': 2, 'c': 2
    };

    if ((keyMap[e.key] !== undefined || keyMap[key] !== undefined) && this.summaryView.classList.contains('hidden')) {
      e.preventDefault();
      const optionIdx = keyMap[key] !== undefined ? keyMap[key] : keyMap[e.key];
      this.handleOptionClick(optionIdx);
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!this.summaryView.classList.contains('hidden')) {
        this.restartSession();
      } else {
        const q = this.activeQuestions[this.currentIndex];
        if (q && q.isMultipleChoice && !this.isAnswered && this.selectedMultiOptions.size > 0) {
          this.submitMultiAnswer();
        } else {
          this.handleNextOrSubmit();
        }
      }
      return;
    }

    if (key === 'R') {
      e.preventDefault();
      this.restartSession();
      return;
    }
  }

  updateHUDTimer() {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    this.hudTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateHUD() {
    this.hudStreak.textContent = `${this.streak}🔥`;

    const answeredCount = Object.keys(this.userAnswers).length;
    if (answeredCount === 0) {
      this.hudAccuracy.textContent = '100%';
      this.hudAvgSpeed.textContent = '0.0s';
      if (this.zenAccuracy) this.zenAccuracy.textContent = '100%';
      if (this.zenStreak) this.zenStreak.textContent = `${this.streak}🔥`;
      return;
    }

    let correctCount = 0;
    let totalTime = 0;

    this.activeQuestions.forEach(q => {
      if (this.userAnswers[q.id] !== undefined) {
        if (this.checkAnswerCorrectness(q, this.userAnswers[q.id])) {
          correctCount++;
        }
        if (this.questionDurations[q.id]) {
          totalTime += this.questionDurations[q.id];
        }
      }
    });

    const accuracy = Math.round((correctCount / answeredCount) * 100);
    this.hudAccuracy.textContent = `${accuracy}%`;

    const avgSpeed = (totalTime / answeredCount).toFixed(1);
    this.hudAvgSpeed.textContent = `${avgSpeed}s`;

    if (this.zenAccuracy) this.zenAccuracy.textContent = `${accuracy}%`;
    if (this.zenStreak) this.zenStreak.textContent = `${this.streak}🔥`;
  }

  updateProgressBar() {
    if (this.activeQuestions.length === 0) {
      this.progressBar.style.width = '0%';
      return;
    }
    const pct = ((this.currentIndex + 1) / this.activeQuestions.length) * 100;
    this.progressBar.style.width = `${pct}%`;
  }

  finishSession() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);

    if (this.topToolbar) this.topToolbar.classList.add('hidden');
    if (this.statsHud) this.statsHud.classList.add('hidden');
    if (this.progressContainer) this.progressContainer.classList.add('hidden');
    if (this.keyboardBar) this.keyboardBar.classList.add('hidden');
    this.quizView.classList.add('hidden');
    this.summaryView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const total = this.activeQuestions.length;
    let correctCount = 0;
    let totalTime = 0;

    this.activeQuestions.forEach(q => {
      const ans = this.userAnswers[q.id];
      if (ans !== undefined && this.checkAnswerCorrectness(q, ans)) {
        correctCount++;
      }
      if (this.questionDurations[q.id]) {
        totalTime += this.questionDurations[q.id];
      }
    });

    const accuracyPct = total > 0 ? Math.round((correctCount / total) * 100) : 100;
    const avgSpeed = total > 0 ? parseFloat((totalTime / total).toFixed(1)) : 0;

    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    const timeFormatted = `${mins}m ${secs}s`;

    this.summaryScore.textContent = `${correctCount} / ${total}`;
    this.summarySubtitle.textContent = `Performance across ${this.selectedQuizIds.size} selected quiz module(s).`;
    this.summaryAccuracy.textContent = `${accuracyPct}%`;
    this.summaryTime.textContent = timeFormatted;
    this.summaryStreak.textContent = `${this.maxStreak} 🔥`;
    this.summaryAvgSpeed.textContent = `${avgSpeed}s`;

    // Render detailed review list
    this.reviewList.innerHTML = '';
    const optionLetters = ['D', 'F', 'J', 'K', 'L', ';'];

    this.activeQuestions.forEach(q => {
      const userSel = this.userAnswers[q.id];
      const isCorrect = userSel !== undefined && this.checkAnswerCorrectness(q, userSel);

      const item = document.createElement('div');
      item.className = `review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`;

      let userAnsHTML = '';
      if (userSel === undefined) {
        userAnsHTML = `<span class="ans-user-wrong">Unanswered</span>`;
      } else if (!isCorrect) {
        if (Array.isArray(userSel)) {
          const userLabels = userSel.map(idx => `${optionLetters[idx] || idx + 1}. ${q.options[idx]}`).join(', ');
          userAnsHTML = `<span class="ans-user-wrong">Your answer: ${userLabels}</span>`;
        } else {
          userAnsHTML = `<span class="ans-user-wrong">Your answer: ${optionLetters[userSel] || userSel + 1}. ${q.options[userSel]}</span>`;
        }
      }

      const correctLabels = q.correctAnswers.map(idx => `${optionLetters[idx] || idx + 1}. ${q.options[idx]}`).join(' | ');
      const correctAnsHTML = `<span class="ans-correct">Correct answer: ${correctLabels}</span>`;

      item.innerHTML = `
        <div class="review-q-title"><span class="badge-outline">${q.quizTitle}</span> ${q.question}</div>
        <div class="review-answer">${userAnsHTML} ${correctAnsHTML}</div>
      `;
      this.reviewList.appendChild(item);
    });

    if (this.mistakesSet.size === 0) {
      this.btnRetryMistakes.disabled = true;
      this.btnRetryMistakes.style.opacity = '0.5';
    } else {
      this.btnRetryMistakes.disabled = false;
      this.btnRetryMistakes.style.opacity = '1';
    }

    // Save session record to history
    const sessionRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      mode: this.mode,
      score: `${correctCount}/${total}`,
      correctCount,
      totalQuestions: total,
      accuracy: accuracyPct,
      avgSpeed,
      durationSeconds: this.timerSeconds,
      maxStreak: this.maxStreak
    };

    const history = JSON.parse(localStorage.getItem(this.storageKeyHistory) || '[]');
    history.push(sessionRecord);
    const savedHistory = history.slice(-30);
    localStorage.setItem(this.storageKeyHistory, JSON.stringify(savedHistory));

    // Compute Overall General Statistics
    this.updateOverallStatistics(savedHistory);

    // Render Improvement Graph
    this.renderImprovementChart(savedHistory);
  }

  updateOverallStatistics(history) {
    if (!history || history.length === 0) return;

    const totalSessions = history.length;
    const totalAnswered = history.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((sum, s) => sum + (s.correctCount || 0), 0);
    const overallAcc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 100;
    const bestStreak = Math.max(0, ...history.map(s => s.maxStreak || 0));
    const totalDuration = history.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const overallSpeed = totalAnswered > 0 ? (totalDuration / totalAnswered).toFixed(1) : '0.0';

    if (this.overallSessionsCount) this.overallSessionsCount.textContent = totalSessions.toString();
    if (this.overallAccuracy) this.overallAccuracy.textContent = `${overallAcc}%`;
    if (this.overallTotalQuestions) this.overallTotalQuestions.textContent = totalAnswered.toString();
    if (this.overallBestStreak) this.overallBestStreak.textContent = `${bestStreak}🔥`;
    if (this.overallAvgSpeed) this.overallAvgSpeed.textContent = `${overallSpeed}s`;

    // Trend Badge
    if (this.analyticsTrendBadge) {
      if (history.length >= 2) {
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
      } else {
        this.analyticsTrendBadge.textContent = 'Baseline Established';
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

    // Grid lines at 100%, 75%, 50%, 25%, 0%
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
          <title>Session 1: ${p.session.accuracy}% (${p.session.score}, ${p.session.avgSpeed}s/Q)</title>
        </circle>
        <text x="${p.x}" y="${p.y - 12}" class="chart-axis-text" text-anchor="middle" fill="var(--chart-primary)" font-weight="700">${p.session.accuracy}%</text>
      `;
      xLabelsSVG = `
        <text x="${p.x}" y="${height - 10}" class="chart-axis-text" text-anchor="middle">Session 1</text>
      `;
    } else {
      linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}` + points.slice(1).map(p => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
      areaPath = `M ${points[0].x.toFixed(1)} ${baseY.toFixed(1)} L ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}` +
        points.slice(1).map(p => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') +
        ` L ${points[points.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} Z`;

      points.forEach((p, idx) => {
        const tooltip = `Session ${idx + 1}: ${p.session.accuracy}% (${p.session.score}) - ${p.session.avgSpeed}s/Q - ${p.session.date}`;
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
        <!-- Grid -->
        ${gridLinesSVG}
        <!-- Area Fill -->
        ${areaPath ? `<path d="${areaPath}" fill="url(#chartGradient)" />` : ''}
        <!-- Trend Line -->
        ${linePath ? `<path d="${linePath}" class="chart-trend-line" />` : ''}
        <!-- Data Points -->
        ${pointsSVG}
        <!-- X-Axis Labels -->
        ${xLabelsSVG}
      </svg>
    `;

    this.chartContainer.innerHTML = svgHTML;
  }

  saveMistakes() {
    localStorage.setItem(this.storageKeyMistakes, JSON.stringify(Array.from(this.mistakesSet)));
  }

  // Bank Management Modal Operations
  openBankModal(keepContent = false) {
    if (!keepContent) {
      if (this.storedBankRaw) {
        this.bankTextarea.value = this.storedBankRaw;
        this.bankStatusText.textContent = `Currently loaded: "${this.bankData.title}" (${this.bankData.quizzes.length} Quizzes, ${this.bankData.totalQuestions} Questions)`;
        this.btnClearBank.classList.remove('hidden');
      } else {
        this.bankTextarea.value = '';
        this.bankStatusText.textContent = 'No question bank currently loaded.';
        this.btnClearBank.classList.add('hidden');
      }
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

  updateModalPreview() {
    const text = this.bankTextarea.value.trim();
    if (!text) {
      this.parsePreviewBox.classList.add('hidden');
      this.btnSaveBank.disabled = true;
      return;
    }

    const parsed = parseQuestionBank(text);
    if (parsed.quizzes.length === 0) {
      this.parsePreviewBox.classList.remove('hidden');
      this.previewSummaryText.textContent = 'No valid quizzes or questions detected yet.';
      this.previewQuizzesList.innerHTML = '<div style="color: var(--muted-foreground); font-size: 0.8rem;">Ensure sections start with "## Quiz Title", questions with "### Question", and options with "A.", "B.", etc.</div>';
      this.btnSaveBank.disabled = true;
      return;
    }

    this.parsePreviewBox.classList.remove('hidden');
    this.previewSummaryText.textContent = `${parsed.quizzes.length} Quizzes, ${parsed.totalQuestions} Questions parsed`;
    this.previewQuizzesList.innerHTML = '';

    parsed.quizzes.forEach(quiz => {
      const row = document.createElement('div');
      row.className = 'preview-quiz-row';
      row.innerHTML = `
        <span class="preview-quiz-name">${quiz.title}</span>
        <span class="preview-quiz-count">${quiz.questions.length} Qs</span>
      `;
      this.previewQuizzesList.appendChild(row);
    });

    this.btnSaveBank.disabled = false;
  }

  saveBankFromModal() {
    const text = this.bankTextarea.value.trim();
    const parsed = parseQuestionBank(text);

    if (parsed.quizzes.length === 0) {
      alert('Could not find any valid quizzes in the provided text.');
      return;
    }

    localStorage.setItem(this.storageKeyBank, text);
    this.closeBankModal();
    this.selectedQuizIds.clear();
    this.loadBank();
  }

  clearBank() {
    if (confirm('Are you sure you want to delete the current Question Bank? This will reset the app to its empty state.')) {
      localStorage.removeItem(this.storageKeyBank);
      localStorage.removeItem(this.storageKeyMistakes);
      this.mistakesSet.clear();
      this.storedBankRaw = null;
      this.bankData = { title: '', quizzes: [], totalQuestions: 0 };
      this.selectedQuizIds.clear();
      this.allQuestions = [];
      this.activeQuestions = [];
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.closeBankModal();
      this.loadBank();
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.quizApp = new QuizApp();
});
