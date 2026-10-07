import { parseQuestionBank, parseFlashcardBank } from '../parser.js';

/**
 * BankModalComponent manages the study bank management dialog,
 * markdown paste & upload tabs, and live parsing preview.
 */
export class BankModalComponent {
  constructor({
    bankModal = typeof document !== 'undefined' ? document.getElementById('bank-modal') : null,
    modalCloseBtn = typeof document !== 'undefined' ? document.getElementById('modal-close-btn') : null,
    btnCancelModal = typeof document !== 'undefined' ? document.getElementById('btn-cancel-modal') : null,
    btnClearActiveBank = typeof document !== 'undefined' ? document.getElementById('btn-clear-active-bank') : null,
    btnSaveActiveBank = typeof document !== 'undefined' ? document.getElementById('btn-save-active-bank') : null,
    tabBtnQuiz = typeof document !== 'undefined' ? document.getElementById('tab-btn-quiz') : null,
    tabBtnFlashcard = typeof document !== 'undefined' ? document.getElementById('tab-btn-flashcard') : null,
    tabPanelQuiz = typeof document !== 'undefined' ? document.getElementById('tab-panel-quiz') : null,
    tabPanelFlashcard = typeof document !== 'undefined' ? document.getElementById('tab-panel-flashcard') : null,
    quizBankStatusText = typeof document !== 'undefined' ? document.getElementById('quiz-bank-status-text') : null,
    fcBankStatusText = typeof document !== 'undefined' ? document.getElementById('fc-bank-status-text') : null,
    modalQuizFileInput = typeof document !== 'undefined' ? document.getElementById('modal-quiz-file-input') : null,
    modalFcFileInput = typeof document !== 'undefined' ? document.getElementById('modal-fc-file-input') : null,
    modalQuizTextarea = typeof document !== 'undefined' ? document.getElementById('modal-quiz-textarea') : null,
    modalFcTextarea = typeof document !== 'undefined' ? document.getElementById('modal-fc-textarea') : null,
    quizParsePreviewBox = typeof document !== 'undefined' ? document.getElementById('quiz-parse-preview-box') : null,
    fcParsePreviewBox = typeof document !== 'undefined' ? document.getElementById('fc-parse-preview-box') : null,
    quizPreviewSummaryText = typeof document !== 'undefined' ? document.getElementById('quiz-preview-summary-text') : null,
    fcPreviewSummaryText = typeof document !== 'undefined' ? document.getElementById('fc-preview-summary-text') : null,
    quizPreviewList = typeof document !== 'undefined' ? document.getElementById('quiz-preview-list') : null,
    fcPreviewList = typeof document !== 'undefined' ? document.getElementById('fc-preview-list') : null,
    onSaveBank = null,
    onClearBank = null,
    onFileInputChange = null
  } = {}) {
    this.bankModal = bankModal;
    this.modalCloseBtn = modalCloseBtn;
    this.btnCancelModal = btnCancelModal;
    this.btnClearActiveBank = btnClearActiveBank;
    this.btnSaveActiveBank = btnSaveActiveBank;
    this.tabBtnQuiz = tabBtnQuiz;
    this.tabBtnFlashcard = tabBtnFlashcard;
    this.tabPanelQuiz = tabPanelQuiz;
    this.tabPanelFlashcard = tabPanelFlashcard;
    this.quizBankStatusText = quizBankStatusText;
    this.fcBankStatusText = fcBankStatusText;
    this.modalQuizFileInput = modalQuizFileInput;
    this.modalFcFileInput = modalFcFileInput;
    this.modalQuizTextarea = modalQuizTextarea;
    this.modalFcTextarea = modalFcTextarea;
    this.quizParsePreviewBox = quizParsePreviewBox;
    this.fcParsePreviewBox = fcParsePreviewBox;
    this.quizPreviewSummaryText = quizPreviewSummaryText;
    this.fcPreviewSummaryText = fcPreviewSummaryText;
    this.quizPreviewList = quizPreviewList;
    this.fcPreviewList = fcPreviewList;

    this.activeModalTab = 'quiz';
    this.onSaveBank = onSaveBank;
    this.onClearBank = onClearBank;
    this.onFileInputChange = onFileInputChange;
    this.eventsBound = false;

    this.bindEvents();
  }

  openBankModal(tab = 'quiz', { storedQuizRaw = null, storedFCRaw = null, quizBankData = null, flashcardBankData = null } = {}) {
    this.switchModalTab(tab, { storedQuizRaw, storedFCRaw });

    if (this.modalQuizTextarea && this.quizBankStatusText) {
      if (storedQuizRaw) {
        this.modalQuizTextarea.value = storedQuizRaw;
        const qTitle = (quizBankData && quizBankData.title) || 'Quiz Bank';
        const qCount = (quizBankData && quizBankData.quizzes && quizBankData.quizzes.length) || 0;
        const totalQ = (quizBankData && quizBankData.totalQuestions) || 0;
        this.quizBankStatusText.textContent = `Currently loaded: "${qTitle}" (${qCount} Quizzes, ${totalQ} Questions)`;
      } else {
        this.modalQuizTextarea.value = '';
        this.quizBankStatusText.textContent = 'No question bank currently loaded.';
      }
    }

    if (this.modalFcTextarea && this.fcBankStatusText) {
      if (storedFCRaw) {
        this.modalFcTextarea.value = storedFCRaw;
        const fcTitle = (flashcardBankData && flashcardBankData.title) || 'Flashcard Deck';
        const dCount = (flashcardBankData && flashcardBankData.decks && flashcardBankData.decks.length) || 0;
        const totalC = (flashcardBankData && flashcardBankData.totalCards) || 0;
        this.fcBankStatusText.textContent = `Currently loaded: "${fcTitle}" (${dCount} Decks, ${totalC} Cards)`;
      } else {
        this.modalFcTextarea.value = '';
        this.fcBankStatusText.textContent = 'No flashcard deck currently loaded.';
      }
    }

    this.updateModalPreview();

    if (this.bankModal && !this.bankModal.open && typeof this.bankModal.showModal === 'function') {
      this.bankModal.showModal();
    }
  }

  closeBankModal() {
    if (this.bankModal && this.bankModal.open && typeof this.bankModal.close === 'function') {
      this.bankModal.close();
    }
  }

  switchModalTab(tab, { storedQuizRaw = null, storedFCRaw = null } = {}) {
    this.activeModalTab = tab;

    if (this.tabBtnQuiz) this.tabBtnQuiz.classList.toggle('active', tab === 'quiz');
    if (this.tabBtnFlashcard) this.tabBtnFlashcard.classList.toggle('active', tab === 'flashcard');

    if (this.tabPanelQuiz) this.tabPanelQuiz.classList.toggle('hidden', tab !== 'quiz');
    if (this.tabPanelFlashcard) this.tabPanelFlashcard.classList.toggle('hidden', tab !== 'flashcard');

    const hasActiveBank = tab === 'quiz' ? !!storedQuizRaw : !!storedFCRaw;
    if (this.btnClearActiveBank) {
      this.btnClearActiveBank.classList.toggle('hidden', !hasActiveBank);
    }

    this.updateModalPreview();
  }

  updateModalPreview() {
    if (this.activeModalTab === 'quiz') {
      const text = this.modalQuizTextarea ? this.modalQuizTextarea.value.trim() : '';
      if (!text) {
        if (this.quizParsePreviewBox) this.quizParsePreviewBox.classList.add('hidden');
        if (this.btnSaveActiveBank) this.btnSaveActiveBank.disabled = true;
        return;
      }

      const parsed = parseQuestionBank(text);
      if (parsed.quizzes.length === 0) {
        if (this.quizParsePreviewBox) this.quizParsePreviewBox.classList.remove('hidden');
        if (this.quizPreviewSummaryText) {
          this.quizPreviewSummaryText.textContent = 'No valid quizzes or questions detected yet.';
        }
        if (this.quizPreviewList) {
          this.quizPreviewList.innerHTML = '<div style="color: var(--muted-foreground); font-size: 0.8rem;">Ensure sections start with "## Quiz Title", questions with "### Question", and options with "A.", "B.", etc.</div>';
        }
        if (this.btnSaveActiveBank) this.btnSaveActiveBank.disabled = true;
        return;
      }

      if (this.quizParsePreviewBox) this.quizParsePreviewBox.classList.remove('hidden');
      if (this.quizPreviewSummaryText) {
        this.quizPreviewSummaryText.textContent = `${parsed.quizzes.length} Quizzes, ${parsed.totalQuestions} Questions parsed`;
      }
      if (this.quizPreviewList) {
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
      }
      if (this.btnSaveActiveBank) this.btnSaveActiveBank.disabled = false;
    } else {
      const text = this.modalFcTextarea ? this.modalFcTextarea.value.trim() : '';
      if (!text) {
        if (this.fcParsePreviewBox) this.fcParsePreviewBox.classList.add('hidden');
        if (this.btnSaveActiveBank) this.btnSaveActiveBank.disabled = true;
        return;
      }

      const parsed = parseFlashcardBank(text);
      if (parsed.decks.length === 0) {
        if (this.fcParsePreviewBox) this.fcParsePreviewBox.classList.remove('hidden');
        if (this.fcPreviewSummaryText) {
          this.fcPreviewSummaryText.textContent = 'No valid flashcard decks or cards detected yet.';
        }
        if (this.fcPreviewList) {
          this.fcPreviewList.innerHTML = '<div style="color: var(--muted-foreground); font-size: 0.8rem;">Ensure sections start with "## Deck Name", cards with "### Question", and answers with "**Answer:**".</div>';
        }
        if (this.btnSaveActiveBank) this.btnSaveActiveBank.disabled = true;
        return;
      }

      if (this.fcParsePreviewBox) this.fcParsePreviewBox.classList.remove('hidden');
      if (this.fcPreviewSummaryText) {
        this.fcPreviewSummaryText.textContent = `${parsed.decks.length} Decks, ${parsed.totalCards} Cards parsed`;
      }
      if (this.fcPreviewList) {
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
      }
      if (this.btnSaveActiveBank) this.btnSaveActiveBank.disabled = false;
    }
  }

  saveActiveBank() {
    if (this.activeModalTab === 'quiz') {
      const text = this.modalQuizTextarea ? this.modalQuizTextarea.value.trim() : '';
      const parsed = parseQuestionBank(text);
      if (parsed.quizzes.length === 0) {
        alert('Could not find any valid quizzes in the provided text.');
        return;
      }
      if (typeof this.onSaveBank === 'function') {
        this.onSaveBank({ type: 'quiz', rawText: text, parsed });
      }
    } else {
      const text = this.modalFcTextarea ? this.modalFcTextarea.value.trim() : '';
      const parsed = parseFlashcardBank(text);
      if (parsed.decks.length === 0) {
        alert('Could not find any valid flashcards in the provided text.');
        return;
      }
      if (typeof this.onSaveBank === 'function') {
        this.onSaveBank({ type: 'flashcard', rawText: text, parsed });
      }
    }
  }

  clearActiveBank() {
    const isQuiz = this.activeModalTab === 'quiz';
    const name = isQuiz ? 'Question Bank (MCQ)' : 'Flashcard Bank';

    if (confirm(`Are you sure you want to delete the ${name}?`)) {
      if (typeof this.onClearBank === 'function') {
        this.onClearBank({ type: isQuiz ? 'quiz' : 'flashcard' });
      }
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => this.closeBankModal());
    }
    if (this.btnCancelModal) {
      this.btnCancelModal.addEventListener('click', () => this.closeBankModal());
    }
    if (this.btnClearActiveBank) {
      this.btnClearActiveBank.addEventListener('click', () => this.clearActiveBank());
    }
    if (this.btnSaveActiveBank) {
      this.btnSaveActiveBank.addEventListener('click', () => this.saveActiveBank());
    }

    if (this.tabBtnQuiz) {
      this.tabBtnQuiz.addEventListener('click', () => this.switchModalTab('quiz'));
    }
    if (this.tabBtnFlashcard) {
      this.tabBtnFlashcard.addEventListener('click', () => this.switchModalTab('flashcard'));
    }

    if (this.modalQuizTextarea) {
      this.modalQuizTextarea.addEventListener('input', () => this.updateModalPreview());
    }
    if (this.modalFcTextarea) {
      this.modalFcTextarea.addEventListener('input', () => this.updateModalPreview());
    }

    if (this.modalQuizFileInput) {
      this.modalQuizFileInput.addEventListener('change', (e) => {
        if (typeof this.onFileInputChange === 'function') {
          this.onFileInputChange(e, 'quiz', false);
        }
      });
    }
    if (this.modalFcFileInput) {
      this.modalFcFileInput.addEventListener('change', (e) => {
        if (typeof this.onFileInputChange === 'function') {
          this.onFileInputChange(e, 'flashcard', false);
        }
      });
    }

    if (this.bankModal) {
      this.bankModal.addEventListener('click', (e) => {
        const rect = this.bankModal.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) this.closeBankModal();
      });
    }
  }
}
