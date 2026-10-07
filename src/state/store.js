import {
  MODES,
  ORDERS,
  FONT_SCALE_LEVELS,
  DEFAULT_AUTO_ADVANCE_MS
} from '../constants.js';
import { storageService } from '../services/storage.js';

/**
 * Store holds the centralized state of the quiz & flashcard application.
 */
export class Store {
  constructor(storage = storageService) {
    this.storage = storage;

    // Bank & Question Pool State
    this.storedQuizRaw = this.storage.getQuizBankRaw();
    this.storedFCRaw = this.storage.getFlashcardBankRaw();

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
    this.mode = MODES.DRILL;
    this.order = ORDERS.ORIGINAL;
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
    this.mistakesSet = this.storage.getMistakes();
    this.fcMasteredSet = this.storage.getFCMastered();
    this.fcReviewSet = this.storage.getFCReview();

    this.autoAdvanceMs = DEFAULT_AUTO_ADVANCE_MS;
    this.autoAdvanceTimeout = null;

    // Modal active tab
    this.activeModalTab = 'quiz';

    // Pause state
    this.isPaused = false;

    // Font scale
    this.fontScaleLevels = [...FONT_SCALE_LEVELS];
    this.fontScaleIndex = this.storage.getFontScaleIndex();

    // Layout
    this.isTopBarsHidden = this.storage.getTopBarsHidden();

    // Keybinds
    this.keybindStyle = this.storage.getKeybindStyle();
    this.customKeys = this.storage.getCustomKeys();
  }

  rebuildQuestionsPool() {
    this.allQuestions = [];
    if (this.selectedQuizIds.size === 0 && this.quizBankData.quizzes) {
      this.selectedQuizIds = new Set(this.quizBankData.quizzes.map(q => q.id));
    }
    if (this.quizBankData.quizzes) {
      this.quizBankData.quizzes.forEach(quiz => {
        if (this.selectedQuizIds.has(quiz.id)) {
          this.allQuestions.push(...quiz.questions);
        }
      });
    }
  }

  rebuildCardsPool() {
    this.allCards = [];
    if (this.selectedDeckIds.size === 0 && this.flashcardBankData.decks) {
      this.selectedDeckIds = new Set(this.flashcardBankData.decks.map(d => d.id));
    }
    if (this.flashcardBankData.decks) {
      this.flashcardBankData.decks.forEach(deck => {
        if (this.selectedDeckIds.has(deck.id)) {
          this.allCards.push(...deck.cards);
        }
      });
    }
  }

  saveMistakes() {
    this.storage.setMistakes(this.mistakesSet);
  }

  saveFlashcardProgress() {
    this.storage.setFCMastered(this.fcMasteredSet);
    this.storage.setFCReview(this.fcReviewSet);
  }

  recordAnswer(questionId, answer, duration, isCorrect) {
    this.userAnswers[questionId] = answer;
    this.isAnswered = true;
    this.questionDurations[questionId] = duration;

    if (isCorrect) {
      this.streak++;
      if (this.streak > this.maxStreak) this.maxStreak = this.streak;
      this.mistakesSet.delete(questionId);
    } else {
      this.streak = 0;
      this.mistakesSet.add(questionId);
    }

    this.saveMistakes();
  }

  rateCard(cardId, rating) {
    if (rating === 'mastered') {
      this.fcMasteredSet.add(cardId);
      this.fcReviewSet.delete(cardId);
    } else {
      this.fcReviewSet.add(cardId);
      this.fcMasteredSet.delete(cardId);
    }
    this.saveFlashcardProgress();
  }

  clearQuizBank() {
    this.storage.removeQuizBankRaw();
    this.storage.removeMistakes();
    this.mistakesSet.clear();
    this.storedQuizRaw = null;
    this.quizBankData = { title: '', quizzes: [], totalQuestions: 0 };
    this.selectedQuizIds.clear();
    this.allQuestions = [];
    this.activeQuestions = [];
  }

  clearFlashcardBank() {
    this.storage.removeFlashcardBankRaw();
    this.storage.removeFCMastered();
    this.storage.removeFCReview();
    this.fcMasteredSet.clear();
    this.fcReviewSet.clear();
    this.storedFCRaw = null;
    this.flashcardBankData = { title: '', decks: [], totalCards: 0 };
    this.selectedDeckIds.clear();
    this.allCards = [];
    this.activeCards = [];
  }

  initQuestionSelections() {
    this.selectedMultiOptions.clear();
    const q = this.activeQuestions && this.activeQuestions[this.currentIndex];
    if (q && this.userAnswers[q.id] !== undefined && Array.isArray(this.userAnswers[q.id])) {
      this.userAnswers[q.id].forEach(idx => this.selectedMultiOptions.add(idx));
    }
  }

  resetQuizSessionState() {
    this.currentIndex = 0;
    this.userAnswers = {};
    this.questionDurations = {};
    this.isAnswered = false;
    this.selectedMultiOptions.clear();
    this.streak = 0;
    this.maxStreak = 0;
  }

  resetFlashcardSessionState() {
    this.currentIndex = 0;
    this.isCardFlipped = false;
  }
}
