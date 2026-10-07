import { detectBankType, parseQuestionBank, parseFlashcardBank } from '../parser.js';

/**
 * FileLoaderService handles reading files from input or drag-and-drop,
 * detecting content type, and parsing question banks or flashcard decks.
 */
export class FileLoaderService {
  /**
   * Reads a File object and processes its markdown content.
   */
  readFile(file, {
    targetType = 'auto',
    autoSave = true,
    onSuccess = null,
    onError = null,
    onInvalid = null
  } = {}) {
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
          if (typeof onInvalid === 'function') {
            onInvalid({
              type: 'flashcard',
              content,
              message: 'Could not find any valid flashcards in the uploaded file.\n\nPlease ensure sections start with "## Deck Name", cards with "### Question", and answers with "**Answer:**".'
            });
          }
          return;
        }

        if (typeof onSuccess === 'function') {
          onSuccess({ type: 'flashcard', content, parsed, autoSave });
        }
      } else {
        const parsed = parseQuestionBank(content);
        if (parsed.quizzes.length === 0) {
          if (typeof onInvalid === 'function') {
            onInvalid({
              type: 'quiz',
              content,
              message: 'Could not find any valid quizzes in the uploaded file.\n\nPlease ensure sections start with "## Quiz Title", questions with "### Question", and options with "A.", "B.", etc.'
            });
          }
          return;
        }

        if (typeof onSuccess === 'function') {
          onSuccess({ type: 'quiz', content, parsed, autoSave });
        }
      }
    };

    reader.onerror = (err) => {
      console.error('File read error:', err);
      if (typeof onError === 'function') {
        onError(err);
      } else {
        alert('Error reading the selected file. Please try again.');
      }
    };

    reader.readAsText(file);
  }

  /**
   * Sets up drag and drop event listeners on specific drop zones and the window.
   */
  setupDragAndDrop({
    dropZoneQuiz = document.getElementById('drop-zone-quiz'),
    dropZoneFlashcard = document.getElementById('drop-zone-flashcard'),
    onFileDropped = null
  } = {}) {
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
        if (files && files.length > 0 && typeof onFileDropped === 'function') {
          onFileDropped(files[0], targetType);
        }
      });
    };

    bindZone(dropZoneQuiz, 'quiz');
    bindZone(dropZoneFlashcard, 'flashcard');

    window.addEventListener('drop', (e) => {
      if (dropZoneQuiz && dropZoneQuiz.contains(e.target)) return;
      if (dropZoneFlashcard && dropZoneFlashcard.contains(e.target)) return;
      const dt = e.dataTransfer;
      const files = dt && dt.files;
      if (files && files.length > 0 && typeof onFileDropped === 'function') {
        onFileDropped(files[0], 'auto');
      }
    });
  }
}

export const fileLoaderService = new FileLoaderService();
