/**
 * QuizViewComponent manages the Multiple-Choice Quiz view,
 * question prompt layout, option interactions, feedback, and navigation buttons.
 */
export class QuizViewComponent {
  constructor({
    quizView = typeof document !== 'undefined' ? document.getElementById('quiz-view') : null,
    questionContentArea = typeof document !== 'undefined' ? document.querySelector('.question-content-area') : null,
    qQuizTitle = typeof document !== 'undefined' ? document.getElementById('q-quiz-title') : null,
    qCounter = typeof document !== 'undefined' ? document.getElementById('q-counter') : null,
    multiSelectBadge = typeof document !== 'undefined' ? document.getElementById('multi-select-badge') : null,
    questionText = typeof document !== 'undefined' ? document.getElementById('question-text') : null,
    optionsList = typeof document !== 'undefined' ? document.getElementById('options-list') : null,
    feedbackBox = typeof document !== 'undefined' ? document.getElementById('feedback-box') : null,
    btnPrev = typeof document !== 'undefined' ? document.getElementById('btn-prev') : null,
    btnSubmitAnswer = typeof document !== 'undefined' ? document.getElementById('btn-submit-answer') : null,
    btnNext = typeof document !== 'undefined' ? document.getElementById('btn-next') : null,
    btnNextLabel = typeof document !== 'undefined' ? document.getElementById('btn-next-label') : null,
    onOptionClick = null,
    onSubmitMultiAnswer = null,
    onPrevQuestion = null,
    onNextOrSubmit = null
  } = {}) {
    this.quizView = quizView;
    this.questionContentArea = questionContentArea;
    this.qQuizTitle = qQuizTitle;
    this.qCounter = qCounter;
    this.multiSelectBadge = multiSelectBadge;
    this.questionText = questionText;
    this.optionsList = optionsList;
    this.feedbackBox = feedbackBox;
    this.btnPrev = btnPrev;
    this.btnSubmitAnswer = btnSubmitAnswer;
    this.btnNext = btnNext;
    this.btnNextLabel = btnNextLabel;

    this.onOptionClick = onOptionClick;
    this.onSubmitMultiAnswer = onSubmitMultiAnswer;
    this.onPrevQuestion = onPrevQuestion;
    this.onNextOrSubmit = onNextOrSubmit;
    this.eventsBound = false;

    this.bindEvents();
  }

  /**
   * Evaluates if a given answer (number or array of numbers) matches the question's correct answer(s).
   */
  static checkAnswerCorrectness(question, answer) {
    if (!question) return false;
    if (question.isMultipleChoice) {
      if (!Array.isArray(answer)) return false;
      if (answer.length !== question.correctAnswers.length) return false;
      return answer.every(val => question.correctAnswers.includes(val));
    }
    return answer === question.correctAnswers[0];
  }

  renderQuestion({
    question,
    currentIndex,
    totalQuestions,
    userAnswers = {},
    isAnswered = false,
    selectedMultiOptions = new Set(),
    badgeKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    mode = 'drill'
  }) {
    if (!question) return;

    if (this.questionContentArea) {
      this.questionContentArea.scrollTop = 0;
    }

    if (this.qQuizTitle) this.qQuizTitle.textContent = question.quizTitle || 'Quiz';
    if (this.qCounter) this.qCounter.textContent = `Progress: ${currentIndex + 1} / ${totalQuestions}`;

    if (this.questionText) {
      if (question.formattedQuestion) {
        this.questionText.innerHTML = question.formattedQuestion;
      } else {
        this.questionText.textContent = question.question;
      }
    }

    if (this.multiSelectBadge) {
      this.multiSelectBadge.classList.toggle('hidden', !question.isMultipleChoice);
    }

    // Grid toggle for questions with 6 or more options
    const useGrid = question.options && question.options.length >= 6;
    if (this.optionsList) {
      this.optionsList.classList.toggle('grid-options', useGrid);
      this.optionsList.innerHTML = '';

      question.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.index = index;

        const userSelected = question.isMultipleChoice
          ? selectedMultiOptions.has(index)
          : userAnswers[question.id] === index;

        const isCorrectOption = question.correctAnswers.includes(index);

        if (mode === 'drill' && isAnswered) {
          btn.classList.add('disabled');
          if (isCorrectOption) {
            btn.classList.add('correct');
          } else if (userSelected && !isCorrectOption) {
            btn.classList.add('wrong');
          }
        } else {
          if (userSelected) {
            btn.classList.add(question.isMultipleChoice ? 'multi-selected' : 'selected');
          }
        }

        const badge = badgeKeys[index] || (index + 1);
        btn.innerHTML = `
          <span class="key-badge">${badge}</span>
          <span class="option-text">${optText}</span>
          <span class="option-status-icon">${isCorrectOption ? '✓' : '✗'}</span>
        `;

        btn.addEventListener('click', () => {
          if (typeof this.onOptionClick === 'function') {
            this.onOptionClick(index);
          }
        });

        this.optionsList.appendChild(btn);
      });
    }

    if (this.btnPrev) {
      this.btnPrev.disabled = currentIndex === 0;
    }

    if (this.btnSubmitAnswer) {
      const showSubmit = question.isMultipleChoice && !isAnswered;
      this.btnSubmitAnswer.classList.toggle('hidden', !showSubmit);
    }

    if (this.btnNextLabel) {
      if (currentIndex === totalQuestions - 1) {
        this.btnNextLabel.textContent = mode === 'exam' ? 'Submit Exam' : 'Finish Drill';
      } else {
        this.btnNextLabel.textContent = 'Next';
      }
    }

    // Drill Mode Feedback Box
    if (this.feedbackBox) {
      if (mode === 'drill' && isAnswered) {
        const userSel = userAnswers[question.id];
        const isRight = QuizViewComponent.checkAnswerCorrectness(question, userSel);
        this.feedbackBox.classList.remove('hidden', 'correct', 'wrong');

        if (isRight) {
          this.feedbackBox.classList.add('correct');
          this.feedbackBox.innerHTML = `<div>✓ <strong>Correct!</strong> Excellent retention.</div> <span style="font-size:0.8rem; opacity:0.8">[Press Space / Enter to advance]</span>`;
        } else {
          this.feedbackBox.classList.add('wrong');
          const correctLetters = question.correctAnswers.map(idx => badgeKeys[idx] || idx + 1).join(', ');
          const correctTexts = question.correctAnswers.map(idx => `<strong>${badgeKeys[idx] || idx + 1}. ${question.options[idx]}</strong>`).join('<br>');
          this.feedbackBox.innerHTML = `<div>✗ <strong>Incorrect.</strong> Correct answer(s): <strong>${correctLetters}</strong><div style="margin-top:0.35rem; font-size:0.85rem;">${correctTexts}</div></div> <span style="font-size:0.8rem; opacity:0.8">[Press Space / Enter to advance]</span>`;
        }
      } else {
        this.feedbackBox.classList.add('hidden');
      }
    }
  }

  show() {
    if (this.quizView) this.quizView.classList.remove('hidden');
  }

  hide() {
    if (this.quizView) this.quizView.classList.add('hidden');
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        if (typeof this.onPrevQuestion === 'function') {
          this.onPrevQuestion();
        }
      });
    }

    if (this.btnSubmitAnswer) {
      this.btnSubmitAnswer.addEventListener('click', () => {
        if (typeof this.onSubmitMultiAnswer === 'function') {
          this.onSubmitMultiAnswer();
        }
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        if (typeof this.onNextOrSubmit === 'function') {
          this.onNextOrSubmit();
        }
      });
    }
  }
}
