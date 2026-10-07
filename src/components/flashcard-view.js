/**
 * FlashcardViewComponent manages the 3D interactive flashcard view,
 * flipping mechanics, mastery ratings, and deck navigation.
 */
export class FlashcardViewComponent {
  constructor({
    flashcardView = typeof document !== 'undefined' ? document.getElementById('flashcard-view') : null,
    fcDeckTitle = typeof document !== 'undefined' ? document.getElementById('fc-deck-title') : null,
    fcStatusPill = typeof document !== 'undefined' ? document.getElementById('fc-status-pill') : null,
    fcCounter = typeof document !== 'undefined' ? document.getElementById('fc-counter') : null,
    flashcardScene = typeof document !== 'undefined' ? document.getElementById('flashcard-scene') : null,
    flashcardCard = typeof document !== 'undefined' ? document.getElementById('flashcard-card') : null,
    fcQuestionText = typeof document !== 'undefined' ? document.getElementById('fc-question-text') : null,
    fcAnswerText = typeof document !== 'undefined' ? document.getElementById('fc-answer-text') : null,
    fcBtnPrev = typeof document !== 'undefined' ? document.getElementById('fc-btn-prev') : null,
    fcBtnFlip = typeof document !== 'undefined' ? document.getElementById('fc-btn-flip') : null,
    fcBtnReview = typeof document !== 'undefined' ? document.getElementById('fc-btn-review') : null,
    fcBtnMastered = typeof document !== 'undefined' ? document.getElementById('fc-btn-mastered') : null,
    fcBtnNext = typeof document !== 'undefined' ? document.getElementById('fc-btn-next') : null,
    onFlip = null,
    onPrev = null,
    onNext = null,
    onRate = null
  } = {}) {
    this.flashcardView = flashcardView;
    this.fcDeckTitle = fcDeckTitle;
    this.fcStatusPill = fcStatusPill;
    this.fcCounter = fcCounter;
    this.flashcardScene = flashcardScene;
    this.flashcardCard = flashcardCard;
    this.fcQuestionText = fcQuestionText;
    this.fcAnswerText = fcAnswerText;
    this.fcBtnPrev = fcBtnPrev;
    this.fcBtnFlip = fcBtnFlip;
    this.fcBtnReview = fcBtnReview;
    this.fcBtnMastered = fcBtnMastered;
    this.fcBtnNext = fcBtnNext;

    this.isCardFlipped = false;
    this.onFlip = onFlip;
    this.onPrev = onPrev;
    this.onNext = onNext;
    this.onRate = onRate;
    this.eventsBound = false;

    this.bindEvents();
  }

  renderCard({
    card,
    currentIndex,
    totalCards,
    isMastered = false,
    isReview = false
  }) {
    if (!card) return;

    this.isCardFlipped = false;
    if (this.flashcardCard) {
      this.flashcardCard.classList.remove('is-flipped');
    }

    if (this.fcDeckTitle) {
      this.fcDeckTitle.textContent = card.deckTitle || 'Deck';
    }
    if (this.fcCounter) {
      this.fcCounter.textContent = `Card ${currentIndex + 1} / ${totalCards}`;
    }

    this.updateStatusPill(isMastered, isReview);

    if (this.fcQuestionText) {
      if (card.formattedQuestion) {
        this.fcQuestionText.innerHTML = card.formattedQuestion;
      } else {
        this.fcQuestionText.textContent = card.question;
      }
      this.fcQuestionText.scrollTop = 0;
    }

    if (this.fcAnswerText) {
      if (card.formattedAnswer) {
        this.fcAnswerText.innerHTML = card.formattedAnswer;
      } else {
        this.fcAnswerText.textContent = card.answer;
      }
      this.fcAnswerText.scrollTop = 0;
    }

    if (this.fcBtnPrev) {
      this.fcBtnPrev.disabled = currentIndex === 0;
    }

    if (this.fcBtnNext) {
      const label = this.fcBtnNext.querySelector('span');
      if (label) {
        label.textContent = currentIndex === totalCards - 1 ? 'Finish Deck' : 'Next';
      }
    }
  }

  updateStatusPill(isMastered, isReview) {
    if (!this.fcStatusPill) return;

    this.fcStatusPill.className = 'badge-subtle';
    if (isMastered) {
      this.fcStatusPill.classList.add('status-mastered');
      this.fcStatusPill.textContent = '✅ Mastered';
    } else if (isReview) {
      this.fcStatusPill.classList.add('status-learning');
      this.fcStatusPill.textContent = '⚠️ Need Review';
    } else {
      this.fcStatusPill.textContent = 'Unseen';
    }
  }

  flipCard() {
    this.isCardFlipped = !this.isCardFlipped;
    if (this.flashcardCard) {
      this.flashcardCard.classList.toggle('is-flipped', this.isCardFlipped);
    }
    if (this.isCardFlipped && this.fcAnswerText) {
      this.fcAnswerText.scrollTop = 0;
    }
    if (typeof this.onFlip === 'function') {
      this.onFlip(this.isCardFlipped);
    }
  }

  show() {
    if (this.flashcardView) this.flashcardView.classList.remove('hidden');
  }

  hide() {
    if (this.flashcardView) this.flashcardView.classList.add('hidden');
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.flashcardCard) {
      this.flashcardCard.addEventListener('click', () => this.flipCard());
    }
    if (this.fcBtnFlip) {
      this.fcBtnFlip.addEventListener('click', () => this.flipCard());
    }
    if (this.fcBtnPrev) {
      this.fcBtnPrev.addEventListener('click', () => {
        if (typeof this.onPrev === 'function') this.onPrev();
      });
    }
    if (this.fcBtnNext) {
      this.fcBtnNext.addEventListener('click', () => {
        if (typeof this.onNext === 'function') this.onNext();
      });
    }
    if (this.fcBtnReview) {
      this.fcBtnReview.addEventListener('click', () => {
        if (typeof this.onRate === 'function') this.onRate('review');
      });
    }
    if (this.fcBtnMastered) {
      this.fcBtnMastered.addEventListener('click', () => {
        if (typeof this.onRate === 'function') this.onRate('mastered');
      });
    }
  }
}
