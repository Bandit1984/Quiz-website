/**
 * SummaryViewComponent manages the session completion view,
 * metrics summary, mistake review list, and retry actions.
 */
export class SummaryViewComponent {
  constructor({
    summaryView = typeof document !== 'undefined' ? document.getElementById('summary-view') : null,
    summaryMainTitle = typeof document !== 'undefined' ? document.getElementById('summary-main-title') : null,
    summaryScore = typeof document !== 'undefined' ? document.getElementById('summary-score') : null,
    summarySubtitle = typeof document !== 'undefined' ? document.getElementById('summary-subtitle') : null,
    summaryAccuracy = typeof document !== 'undefined' ? document.getElementById('summary-accuracy') : null,
    summaryTime = typeof document !== 'undefined' ? document.getElementById('summary-time') : null,
    summaryStreak = typeof document !== 'undefined' ? document.getElementById('summary-streak') : null,
    summaryAvgSpeed = typeof document !== 'undefined' ? document.getElementById('summary-avg-speed') : null,
    sumStatLbl1 = typeof document !== 'undefined' ? document.getElementById('sum-stat-lbl-1') : null,
    sumStatLbl2 = typeof document !== 'undefined' ? document.getElementById('sum-stat-lbl-2') : null,
    sumStatLbl3 = typeof document !== 'undefined' ? document.getElementById('sum-stat-lbl-3') : null,
    sumStatLbl4 = typeof document !== 'undefined' ? document.getElementById('sum-stat-lbl-4') : null,
    btnRetryMistakes = typeof document !== 'undefined' ? document.getElementById('btn-retry-mistakes') : null,
    btnRestartQuiz = typeof document !== 'undefined' ? document.getElementById('btn-restart-quiz') : null,
    summaryAnalyticsSection = typeof document !== 'undefined' ? document.getElementById('summary-analytics-section') : null,
    summaryReviewSection = typeof document !== 'undefined' ? document.getElementById('summary-review-section') : null,
    reviewTitle = typeof document !== 'undefined' ? document.getElementById('review-title') : null,
    reviewList = typeof document !== 'undefined' ? document.getElementById('review-list') : null,
    onRetryMistakes = null,
    onRestartQuiz = null
  } = {}) {
    this.summaryView = summaryView;
    this.summaryMainTitle = summaryMainTitle;
    this.summaryScore = summaryScore;
    this.summarySubtitle = summarySubtitle;
    this.summaryAccuracy = summaryAccuracy;
    this.summaryTime = summaryTime;
    this.summaryStreak = summaryStreak;
    this.summaryAvgSpeed = summaryAvgSpeed;
    this.sumStatLbl1 = sumStatLbl1;
    this.sumStatLbl2 = sumStatLbl2;
    this.sumStatLbl3 = sumStatLbl3;
    this.sumStatLbl4 = sumStatLbl4;
    this.btnRetryMistakes = btnRetryMistakes;
    this.btnRestartQuiz = btnRestartQuiz;
    this.summaryAnalyticsSection = summaryAnalyticsSection;
    this.summaryReviewSection = summaryReviewSection;
    this.reviewTitle = reviewTitle;
    this.reviewList = reviewList;

    this.onRetryMistakes = onRetryMistakes;
    this.onRestartQuiz = onRestartQuiz;
    this.eventsBound = false;

    this.bindEvents();
  }

  showQuizSummary({
    mode = 'drill',
    correctCount = 0,
    answeredCount = 0,
    accuracy = 0,
    timeFormatted = '00:00',
    maxStreak = 0,
    avgSpeed = '0.0'
  } = {}) {
    if (this.summaryView) this.summaryView.classList.remove('hidden');
    if (this.summaryAnalyticsSection) this.summaryAnalyticsSection.classList.remove('hidden');
    if (this.summaryReviewSection) this.summaryReviewSection.classList.remove('hidden');

    if (this.summaryMainTitle) {
      this.summaryMainTitle.textContent = mode === 'exam'
        ? 'Exam Simulation Complete!'
        : 'Drill Session Complete!';
    }

    if (this.summaryScore) this.summaryScore.textContent = `${correctCount} / ${answeredCount}`;
    if (this.summarySubtitle) {
      this.summarySubtitle.textContent = `Scored ${correctCount} correct out of ${answeredCount} total questions.`;
    }

    if (this.sumStatLbl1) this.sumStatLbl1.textContent = 'Accuracy Rate';
    if (this.summaryAccuracy) this.summaryAccuracy.textContent = `${accuracy}%`;

    if (this.sumStatLbl2) this.sumStatLbl2.textContent = 'Total Time';
    if (this.summaryTime) this.summaryTime.textContent = timeFormatted;

    if (this.sumStatLbl3) this.sumStatLbl3.textContent = 'Max Streak';
    if (this.summaryStreak) this.summaryStreak.textContent = `${maxStreak}🔥`;

    if (this.sumStatLbl4) this.sumStatLbl4.textContent = 'Avg Speed / Q';
    if (this.summaryAvgSpeed) this.summaryAvgSpeed.textContent = `${avgSpeed}s`;

    if (this.btnRetryMistakes) this.btnRetryMistakes.textContent = 'Retake Missed Questions';
    if (this.btnRestartQuiz) this.btnRestartQuiz.textContent = 'Start New Full Drill';
  }

  showFlashcardSummary({
    masteredCount = 0,
    totalCards = 0,
    timeFormatted = '00:00',
    reviewCount = 0
  } = {}) {
    if (this.summaryView) this.summaryView.classList.remove('hidden');
    if (this.summaryAnalyticsSection) this.summaryAnalyticsSection.classList.add('hidden');
    if (this.summaryReviewSection) this.summaryReviewSection.classList.add('hidden');

    if (this.summaryMainTitle) this.summaryMainTitle.textContent = 'Flashcard Deck Completed!';
    if (this.summaryScore) this.summaryScore.textContent = `${masteredCount} / ${totalCards} Mastered`;
    if (this.summarySubtitle) {
      this.summarySubtitle.textContent = `You reviewed all ${totalCards} cards in this study session.`;
    }

    if (this.sumStatLbl1) this.sumStatLbl1.textContent = 'Mastered Cards';
    if (this.summaryAccuracy) this.summaryAccuracy.textContent = `${masteredCount}`;

    if (this.sumStatLbl2) this.sumStatLbl2.textContent = 'Study Time';
    if (this.summaryTime) this.summaryTime.textContent = timeFormatted;

    if (this.sumStatLbl3) this.sumStatLbl3.textContent = 'Cards Marked For Review';
    if (this.summaryStreak) this.summaryStreak.textContent = `${reviewCount} ⚠️`;

    if (this.sumStatLbl4) this.sumStatLbl4.textContent = 'Total In Deck';
    if (this.summaryAvgSpeed) this.summaryAvgSpeed.textContent = `${totalCards}`;

    if (this.btnRetryMistakes) this.btnRetryMistakes.textContent = 'Practice Cards Marked for Review';
    if (this.btnRestartQuiz) this.btnRestartQuiz.textContent = 'Restart Flashcard Deck';
  }

  renderReviewList(questions, userAnswers, checkAnswerCorrectness) {
    if (!this.reviewList || !questions) return;
    this.reviewList.innerHTML = '';
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    questions.forEach((q, index) => {
      const userAns = userAnswers[q.id];
      const isRight = checkAnswerCorrectness(q, userAns);

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

  show() {
    if (this.summaryView) this.summaryView.classList.remove('hidden');
  }

  hide() {
    if (this.summaryView) this.summaryView.classList.add('hidden');
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.btnRetryMistakes) {
      this.btnRetryMistakes.addEventListener('click', () => {
        if (typeof this.onRetryMistakes === 'function') {
          this.onRetryMistakes();
        }
      });
    }

    if (this.btnRestartQuiz) {
      this.btnRestartQuiz.addEventListener('click', () => {
        if (typeof this.onRestartQuiz === 'function') {
          this.onRestartQuiz();
        }
      });
    }
  }
}
