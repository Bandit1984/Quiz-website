import { parseQuestionBank } from './parser.js';

class QuizApp {
  constructor() {
    this.storageKeyBank = 'quiz_bank_raw';
    this.storageKeyMistakes = 'quiz_drill_mistakes';
    this.storageKeyHistory = 'quiz_drill_history';

    // Bank & Question Pool State
    this.storedBankRaw = localStorage.getItem(this.storageKeyBank) || null;
    this.bankData = { title: '', quizzes: [], totalQuestions: 0 };
    this.selectedQuizIds = new Set(); // Set of quiz ids
    this.allQuestions = []; // Combined questions from selected quizzes
    this.activeQuestions = []; // Filtered/ordered for the current drill
    this.currentIndex = 0;

    // Quiz Session State
    this.mode = 'drill'; // 'drill' | 'exam'
    this.order = 'original'; // 'original' | 'shuffle' | 'mistake'
    this.userAnswers = {}; // { [qId]: number | number[] }
    this.isAnswered = false;
    this.selectedMultiOptions = new Set(); // Staging for multi-choice questions

    // Timer & Metrics
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.questionStartTime = Date.now();
    this.questionDurations = {};

    // Streaks & Mistakes
    this.streak = 0;
    this.maxStreak = 0;
    this.mistakesSet = new Set(JSON.parse(localStorage.getItem(this.storageKeyMistakes) || '[]'));
    this.autoAdvanceMs = 600;
    this.autoAdvanceTimeout = null;

    // DOM Elements
    this.initDOMElements();
    this.bindEvents();

    // Initialize Bank or Empty State
    this.loadBank();
  }

  initDOMElements() {
    // Header
    this.brandTitle = document.getElementById('brand-title');
    this.btnManageBank = document.getElementById('btn-manage-bank');
    this.restartBtn = document.getElementById('btn-restart');

    // Empty State
    this.emptyStateView = document.getElementById('empty-state-view');
    this.emptyDropZone = document.getElementById('empty-drop-zone');
    this.emptyFileInput = document.getElementById('empty-file-input');
    this.emptyBtnPaste = document.getElementById('empty-btn-paste');
    this.mainAppContent = document.getElementById('main-app-content');

    // Quiz Filter Bar
    this.quizFilterBar = document.getElementById('quiz-filter-bar');
    this.btnFilterAll = document.getElementById('btn-filter-all');
    this.filterAllCount = document.getElementById('filter-all-count');
    this.filterChipsList = document.getElementById('filter-chips-list');

    // Control Bar
    this.modeDrillBtn = document.getElementById('mode-drill');
    this.modeExamBtn = document.getElementById('mode-exam');
    this.orderSelect = document.getElementById('order-select');
    this.autoAdvanceSelect = document.getElementById('autoadvance-select');

    // HUD Stats
    this.hudStreak = document.getElementById('hud-streak');
    this.hudAccuracy = document.getElementById('hud-accuracy');
    this.hudTimer = document.getElementById('hud-timer');
    this.hudAvgSpeed = document.getElementById('hud-avg-speed');
    this.progressBar = document.getElementById('progress-bar');

    // Question Card
    this.quizView = document.getElementById('quiz-view');
    this.summaryView = document.getElementById('summary-view');
    this.qQuizTitle = document.getElementById('q-quiz-title');
    this.qBadge = document.getElementById('q-badge');
    this.qCounter = document.getElementById('q-counter');
    this.multiSelectBadge = document.getElementById('multi-select-badge');
    this.questionText = document.getElementById('question-text');
    this.optionsList = document.getElementById('options-list');
    this.feedbackBox = document.getElementById('feedback-box');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnSubmitAnswer = document.getElementById('btn-submit-answer');
    this.btnNext = document.getElementById('btn-next');

    // Summary View
    this.summaryScore = document.getElementById('summary-score');
    this.summarySubtitle = document.getElementById('summary-subtitle');
    this.summaryAccuracy = document.getElementById('summary-accuracy');
    this.summaryTime = document.getElementById('summary-time');
    this.summaryStreak = document.getElementById('summary-streak');
    this.summaryAvgSpeed = document.getElementById('summary-avg-speed');
    this.reviewTitle = document.getElementById('review-title');
    this.reviewList = document.getElementById('review-list');
    this.btnRetryMistakes = document.getElementById('btn-retry-mistakes');
    this.btnRestartQuiz = document.getElementById('btn-restart-quiz');

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

  bindEvents() {
    // Header & Modal Actions
    this.btnManageBank.addEventListener('click', () => this.openBankModal());
    this.modalCloseBtn.addEventListener('click', () => this.closeBankModal());
    this.btnCancelModal.addEventListener('click', () => this.closeBankModal());
    this.btnClearBank.addEventListener('click', () => this.clearBank());
    this.btnSaveBank.addEventListener('click', () => this.saveBankFromModal());

    // File Input & Drag and Drop (Empty State)
    this.emptyFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.modalFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.emptyBtnPaste.addEventListener('click', () => this.openBankModal());

    this.setupDragAndDrop();

    // Textarea input in modal (Live preview)
    this.bankTextarea.addEventListener('input', () => this.updateModalPreview());

    // Filter Chips Events
    this.btnFilterAll.addEventListener('click', () => this.selectAllQuizzes());

    // Mode Switching
    this.modeDrillBtn.addEventListener('click', () => this.switchMode('drill'));
    this.modeExamBtn.addEventListener('click', () => this.switchMode('exam'));

    // Order & Auto Advance
    this.orderSelect.addEventListener('change', (e) => {
      this.order = e.target.value;
      this.startSession();
    });

    this.autoAdvanceSelect.addEventListener('change', (e) => {
      this.autoAdvanceMs = parseInt(e.target.value, 10);
    });

    // Navigation & Actions
    this.restartBtn.addEventListener('click', () => this.startSession());
    this.btnPrev.addEventListener('click', () => this.prevQuestion());
    this.btnSubmitAnswer.addEventListener('click', () => this.submitMultiAnswer());
    this.btnNext.addEventListener('click', () => this.handleNextOrSubmit());

    // Summary Actions
    this.btnRetryMistakes.addEventListener('click', () => {
      this.order = 'mistake';
      this.orderSelect.value = 'mistake';
      this.startSession();
    });

    this.btnRestartQuiz.addEventListener('click', () => {
      this.startSession();
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  setupDragAndDrop() {
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

    ['dragleave', 'drop'].forEach(eventName => {
      this.emptyDropZone.addEventListener(eventName, () => {
        this.emptyDropZone.classList.remove('drag-active');
      });
    });

    this.emptyDropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        this.readFile(files[0]);
      }
    });
  }

  handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      this.readFile(file);
    }
  }

  readFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      this.bankTextarea.value = content;
      this.openBankModal();
      this.updateModalPreview();
    };
    reader.readAsText(file);
  }

  loadBank() {
    this.storedBankRaw = localStorage.getItem(this.storageKeyBank) || null;

    if (!this.storedBankRaw) {
      // Empty state
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

    // Set dynamic brand title
    this.brandTitle.textContent = this.bankData.title || 'Quiz Drill Memorizer';

    // Populate filter chips
    this.renderFilterChips();

    // Select all quizzes by default if no selection yet
    if (this.selectedQuizIds.size === 0) {
      this.selectAllQuizzes(false);
    } else {
      this.rebuildQuestionsPool();
      this.startSession();
    }
  }

  renderFilterChips() {
    this.filterChipsList.innerHTML = '';
    this.filterAllCount.textContent = this.bankData.totalQuestions;

    this.bankData.quizzes.forEach(quiz => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.dataset.id = quiz.id;
      chip.innerHTML = `
        <span class="chip-name">${quiz.title}</span>
        <span class="chip-count">${quiz.questions.length}</span>
      `;

      chip.addEventListener('click', () => this.toggleQuizSelection(quiz.id));
      this.filterChipsList.appendChild(chip);
    });

    this.updateFilterChipsUI();
  }

  updateFilterChipsUI() {
    const isAllSelected = this.selectedQuizIds.size === this.bankData.quizzes.length;
    if (isAllSelected) {
      this.btnFilterAll.classList.add('active');
    } else {
      this.btnFilterAll.classList.remove('active');
    }

    const chips = this.filterChipsList.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      const qId = chip.dataset.id;
      if (this.selectedQuizIds.has(qId)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  selectAllQuizzes(triggerSession = true) {
    this.selectedQuizIds = new Set(this.bankData.quizzes.map(q => q.id));
    this.updateFilterChipsUI();
    this.rebuildQuestionsPool();
    if (triggerSession) this.startSession();
  }

  toggleQuizSelection(quizId) {
    const isAllSelected = this.selectedQuizIds.size === this.bankData.quizzes.length;

    if (isAllSelected) {
      // If all were selected, clicking one isolates that single quiz
      this.selectedQuizIds = new Set([quizId]);
    } else if (this.selectedQuizIds.has(quizId)) {
      this.selectedQuizIds.delete(quizId);
      // If nothing remains, revert to all
      if (this.selectedQuizIds.size === 0) {
        this.selectedQuizIds = new Set(this.bankData.quizzes.map(q => q.id));
      }
    } else {
      this.selectedQuizIds.add(quizId);
    }

    this.updateFilterChipsUI();
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
        this.order = 'original';
        this.orderSelect.value = 'original';
        this.activeQuestions = [...this.allQuestions];
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

    // Populate staging set if already answered
    if (this.isAnswered && Array.isArray(this.userAnswers[q.id])) {
      this.userAnswers[q.id].forEach(idx => this.selectedMultiOptions.add(idx));
    }

    // Header info & Origin Badge
    this.qQuizTitle.textContent = q.quizTitle;
    this.qBadge.textContent = `Question ${this.currentIndex + 1} of ${this.activeQuestions.length}`;
    this.qCounter.textContent = `Progress: ${this.currentIndex + 1} / ${this.activeQuestions.length}`;

    // Question Prompt (supports tables and code formatting)
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

    // Options rendering
    this.optionsList.innerHTML = '';
    const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

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

    // Navigation buttons state
    this.btnPrev.disabled = this.currentIndex === 0;

    // Multi-select Submit Button visibility
    if (q.isMultipleChoice && !this.isAnswered) {
      this.btnSubmitAnswer.classList.remove('hidden');
    } else {
      this.btnSubmitAnswer.classList.add('hidden');
    }

    if (this.currentIndex === this.activeQuestions.length - 1) {
      this.btnNext.innerHTML = `<span>${this.mode === 'exam' ? 'Submit Exam' : 'Finish Drill'}</span> ➔`;
    } else {
      this.btnNext.innerHTML = `<span>Next</span> ➔`;
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
        const correctLetters = q.correctAnswers.map(idx => optionKeys[idx]).join(', ');
        const correctTexts = q.correctAnswers.map(idx => `<strong>${optionKeys[idx]}. ${q.options[idx]}</strong>`).join('<br>');
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
      // Toggle selection for multiple choice
      if (this.isAnswered) return;

      if (this.selectedMultiOptions.has(index)) {
        this.selectedMultiOptions.delete(index);
      } else {
        this.selectedMultiOptions.add(index);
      }

      // Update button visual state
      const btns = this.optionsList.querySelectorAll('.option-btn');
      if (btns[index]) {
        btns[index].classList.toggle('multi-selected', this.selectedMultiOptions.has(index));
      }
    } else {
      // Single choice
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
    // Disable keyboard shortcuts when typing inside form fields or modal is open
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || (this.bankModal && this.bankModal.open)) {
      return;
    }

    const key = e.key.toUpperCase();
    const keyMap = {
      'A': 0, '1': 0,
      'B': 1, '2': 1,
      'C': 2, '3': 2,
      'D': 3, '4': 3,
      'E': 4, '5': 4,
      'F': 5, '6': 5
    };

    if (keyMap[key] !== undefined && this.summaryView.classList.contains('hidden')) {
      e.preventDefault();
      this.handleOptionClick(keyMap[key]);
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!this.summaryView.classList.contains('hidden')) {
        this.startSession();
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
      this.startSession();
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

    this.quizView.classList.add('hidden');
    this.summaryView.classList.remove('hidden');

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
    const avgSpeed = total > 0 ? (totalTime / total).toFixed(1) : 0;

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
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

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
          const userLabels = userSel.map(idx => `${optionLetters[idx]}. ${q.options[idx]}`).join(', ');
          userAnsHTML = `<span class="ans-user-wrong">Your answer: ${userLabels}</span>`;
        } else {
          userAnsHTML = `<span class="ans-user-wrong">Your answer: ${optionLetters[userSel]}. ${q.options[userSel]}</span>`;
        }
      }

      const correctLabels = q.correctAnswers.map(idx => `${optionLetters[idx]}. ${q.options[idx]}`).join(' | ');
      const correctAnsHTML = `<span class="ans-correct">Correct answer: ${correctLabels}</span>`;

      item.innerHTML = `
        <div class="review-q-title"><span class="q-quiz-badge">${q.quizTitle}</span> ${q.question}</div>
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

    this.saveHistoryRecord({
      date: new Date().toLocaleString(),
      mode: this.mode,
      score: `${correctCount}/${total}`,
      accuracy: accuracyPct,
      time: timeFormatted
    });
  }

  saveMistakes() {
    localStorage.setItem(this.storageKeyMistakes, JSON.stringify(Array.from(this.mistakesSet)));
  }

  saveHistoryRecord(record) {
    const history = JSON.parse(localStorage.getItem(this.storageKeyHistory) || '[]');
    history.unshift(record);
    localStorage.setItem(this.storageKeyHistory, JSON.stringify(history.slice(0, 20)));
  }

  // Bank Management Modal Operations
  openBankModal() {
    if (this.storedBankRaw) {
      this.bankTextarea.value = this.storedBankRaw;
      this.bankStatusText.textContent = `Currently loaded: "${this.bankData.title}" (${this.bankData.quizzes.length} Quizzes, ${this.bankData.totalQuestions} Questions)`;
      this.btnClearBank.classList.remove('hidden');
      this.updateModalPreview();
    } else {
      this.bankTextarea.value = '';
      this.bankStatusText.textContent = 'No question bank currently loaded.';
      this.btnClearBank.classList.add('hidden');
      this.parsePreviewBox.classList.add('hidden');
      this.btnSaveBank.disabled = true;
    }

    this.bankModal.showModal();
  }

  closeBankModal() {
    this.bankModal.close();
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
      this.previewQuizzesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem;">Ensure questions start with "### Question" and options with "A.", "B.", etc.</div>';
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
  new QuizApp();
});
