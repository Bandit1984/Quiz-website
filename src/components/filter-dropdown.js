/**
 * FilterDropdownComponent manages the quiz / flashcard deck selection popover.
 */
export class FilterDropdownComponent {
  constructor({
    btnQuizDropdown = typeof document !== 'undefined' ? document.getElementById('btn-quiz-dropdown') : null,
    quizDropdownLabel = typeof document !== 'undefined' ? document.getElementById('quiz-dropdown-label') : null,
    quizDropdownPopover = typeof document !== 'undefined' ? document.getElementById('quiz-dropdown-popover') : null,
    popoverHeaderTitle = typeof document !== 'undefined' ? document.getElementById('popover-header-title') : null,
    btnSelectAllQuizzes = typeof document !== 'undefined' ? document.getElementById('btn-select-all-quizzes') : null,
    quizDropdownList = typeof document !== 'undefined' ? document.getElementById('quiz-dropdown-list') : null,
    onSelectAll = null,
    onToggleQuiz = null,
    onToggleDeck = null
  } = {}) {
    this.btnQuizDropdown = btnQuizDropdown;
    this.quizDropdownLabel = quizDropdownLabel;
    this.quizDropdownPopover = quizDropdownPopover;
    this.popoverHeaderTitle = popoverHeaderTitle;
    this.btnSelectAllQuizzes = btnSelectAllQuizzes;
    this.quizDropdownList = quizDropdownList;

    this.onSelectAll = onSelectAll;
    this.onToggleQuiz = onToggleQuiz;
    this.onToggleDeck = onToggleDeck;
    this.eventsBound = false;

    this.bindEvents();
  }

  renderDropdown({ mode, quizBankData, flashcardBankData, selectedQuizIds, selectedDeckIds }) {
    if (!this.quizDropdownList) return;
    this.quizDropdownList.innerHTML = '';

    if (mode === 'flashcards') {
      if (this.popoverHeaderTitle) this.popoverHeaderTitle.textContent = 'Select Flashcard Decks';
      const decks = (flashcardBankData && flashcardBankData.decks) || [];

      if (decks.length === 0) {
        if (this.quizDropdownLabel) this.quizDropdownLabel.textContent = 'No Decks Loaded';
        return;
      }

      decks.forEach(deck => {
        const label = document.createElement('label');
        label.className = 'popover-item';
        const isChecked = selectedDeckIds.has(deck.id);

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
          if (typeof this.onToggleDeck === 'function') {
            this.onToggleDeck(deck.id);
          }
        });

        this.quizDropdownList.appendChild(label);
      });
    } else {
      if (this.popoverHeaderTitle) this.popoverHeaderTitle.textContent = 'Select Quizzes';
      const quizzes = (quizBankData && quizBankData.quizzes) || [];

      if (quizzes.length === 0) {
        if (this.quizDropdownLabel) this.quizDropdownLabel.textContent = 'No Quizzes Loaded';
        return;
      }

      quizzes.forEach(quiz => {
        const label = document.createElement('label');
        label.className = 'popover-item';
        const isChecked = selectedQuizIds.has(quiz.id);

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
          if (typeof this.onToggleQuiz === 'function') {
            this.onToggleQuiz(quiz.id);
          }
        });

        this.quizDropdownList.appendChild(label);
      });
    }

    this.updateDropdownUI({ mode, quizBankData, flashcardBankData, selectedQuizIds, selectedDeckIds });
  }

  updateDropdownUI({ mode, quizBankData, flashcardBankData, selectedQuizIds, selectedDeckIds }) {
    if (mode === 'flashcards') {
      const decks = (flashcardBankData && flashcardBankData.decks) || [];
      const totalCards = (flashcardBankData && flashcardBankData.totalCards) || 0;
      const isAllSelected = selectedDeckIds.size === decks.length || selectedDeckIds.size === 0;

      if (this.quizDropdownLabel) {
        if (isAllSelected) {
          this.quizDropdownLabel.textContent = `All Decks (${totalCards} Cards)`;
        } else if (selectedDeckIds.size === 1) {
          const dk = decks.find(d => selectedDeckIds.has(d.id));
          this.quizDropdownLabel.textContent = dk ? `${dk.title} (${dk.cards.length} Cards)` : '1 Deck Selected';
        } else {
          const count = decks
            .filter(d => selectedDeckIds.has(d.id))
            .reduce((sum, d) => sum + d.cards.length, 0);
          this.quizDropdownLabel.textContent = `${selectedDeckIds.size} Decks Selected (${count} Cards)`;
        }
      }

      if (this.quizDropdownList) {
        const checkboxes = this.quizDropdownList.querySelectorAll('.popover-checkbox');
        checkboxes.forEach(cb => {
          cb.checked = selectedDeckIds.has(cb.dataset.id);
        });
      }
    } else {
      const quizzes = (quizBankData && quizBankData.quizzes) || [];
      const totalQuestions = (quizBankData && quizBankData.totalQuestions) || 0;
      const isAllSelected = selectedQuizIds.size === quizzes.length || selectedQuizIds.size === 0;

      if (this.quizDropdownLabel) {
        if (isAllSelected) {
          this.quizDropdownLabel.textContent = `All Quizzes (${totalQuestions} Questions)`;
        } else if (selectedQuizIds.size === 1) {
          const qz = quizzes.find(q => selectedQuizIds.has(q.id));
          this.quizDropdownLabel.textContent = qz ? `${qz.title} (${qz.questions.length} Qs)` : '1 Quiz Selected';
        } else {
          const count = quizzes
            .filter(q => selectedQuizIds.has(q.id))
            .reduce((sum, q) => sum + q.questions.length, 0);
          this.quizDropdownLabel.textContent = `${selectedQuizIds.size} Quizzes Selected (${count} Qs)`;
        }
      }

      if (this.quizDropdownList) {
        const checkboxes = this.quizDropdownList.querySelectorAll('.popover-checkbox');
        checkboxes.forEach(cb => {
          cb.checked = selectedQuizIds.has(cb.dataset.id);
        });
      }
    }
  }

  togglePopover() {
    if (!this.quizDropdownPopover) return;
    const isHidden = this.quizDropdownPopover.classList.contains('hidden');
    this.quizDropdownPopover.classList.toggle('hidden', !isHidden);
    if (this.btnQuizDropdown) {
      this.btnQuizDropdown.setAttribute('aria-expanded', isHidden.toString());
    }
  }

  closePopover() {
    if (!this.quizDropdownPopover) return;
    this.quizDropdownPopover.classList.add('hidden');
    if (this.btnQuizDropdown) {
      this.btnQuizDropdown.setAttribute('aria-expanded', 'false');
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.btnQuizDropdown) {
      this.btnQuizDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePopover();
      });
    }

    if (this.btnSelectAllQuizzes) {
      this.btnSelectAllQuizzes.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof this.onSelectAll === 'function') {
          this.onSelectAll();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (
        this.quizDropdownPopover &&
        this.btnQuizDropdown &&
        !this.quizDropdownPopover.contains(e.target) &&
        !this.btnQuizDropdown.contains(e.target)
      ) {
        this.closePopover();
      }
    });
  }
}
