/**
 * Question Bank & Flashcard Parser
 * Parses markdown/plain text formatted question banks and flashcards into structured data.
 */

/**
 * Converts markdown tables, code blocks, and formatting to safe HTML for rendering.
 * @param {string} text
 * @returns {string}
 */
export function formatQuestionText(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const output = [];
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];
  let inCode = false;
  let codeLines = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    // Check for code fence ```
    if (trimmedLine.startsWith('```')) {
      if (inTable) {
        output.push(renderTableHTML(tableHeader, tableRows));
        inTable = false;
        tableHeader = [];
        tableRows = [];
      }

      if (!inCode) {
        inCode = true;
        codeLang = trimmedLine.slice(3).trim();
        codeLines = [];
      } else {
        inCode = false;
        const codeContent = escapeHtml(codeLines.join('\n'));
        output.push(`<pre class="code-block"><code class="lang-${codeLang || 'plaintext'}">${codeContent}</code></pre>`);
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    // Check if line is a markdown table row (starts and ends with |)
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const cells = trimmedLine
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      // Check if it's the divider row |:---:|:---:|
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        output.push(renderTableHTML(tableHeader, tableRows));
        inTable = false;
        tableHeader = [];
        tableRows = [];
      }

      if (trimmedLine.length > 0) {
        // Handle numbered lists or bullet items
        if (/^\d+\.\s+/.test(trimmedLine)) {
          output.push(`<div class="list-item-num">${formatInlineMarkdown(trimmedLine)}</div>`);
        } else if (/^[-*]\s+/.test(trimmedLine)) {
          output.push(`<div class="list-item-bullet">${formatInlineMarkdown(trimmedLine.replace(/^[-*]\s+/, '• '))}</div>`);
        } else {
          output.push(`<p>${formatInlineMarkdown(trimmedLine)}</p>`);
        }
      }
    }
  }

  if (inCode && codeLines.length > 0) {
    const codeContent = escapeHtml(codeLines.join('\n'));
    output.push(`<pre class="code-block"><code>${codeContent}</code></pre>`);
  }

  if (inTable) {
    output.push(renderTableHTML(tableHeader, tableRows));
  }

  return output.join('\n');
}

function renderTableHTML(header, rows) {
  let html = '<div class="table-container"><table class="quiz-table">';
  if (header && header.length > 0) {
    html += '<thead><tr>';
    header.forEach(h => {
      html += `<th>${formatInlineMarkdown(h)}</th>`;
    });
    html += '</tr></thead>';
  }
  if (rows && rows.length > 0) {
    html += '<tbody>';
    rows.forEach(r => {
      html += '<tr>';
      r.forEach(cell => {
        html += `<td>${formatInlineMarkdown(cell)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
  }
  html += '</table></div>';
  return html;
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInlineMarkdown(str) {
  if (!str) return '';
  return escapeHtml(str)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Creates a URL-friendly slug from title.
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Detects whether raw text is a Multiple-Choice Quiz bank, a Flashcard deck, or unknown.
 * @param {string} rawText
 * @returns {'quiz' | 'flashcard' | 'unknown'}
 */
export function detectBankType(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return 'unknown';
  }

  const hasOptions = /^[A-Z]\.\s+/m.test(rawText);
  const hasMcqAnswers = /\*{0,2}\[CORRECT\]\*{0,2}/i.test(rawText);
  const hasFlashcardAnswers = /\*{0,2}Answer:\*{0,2}/i.test(rawText) || /####\s+Answer/i.test(rawText);

  if (hasFlashcardAnswers && !hasOptions) {
    return 'flashcard';
  }
  if (hasMcqAnswers || hasOptions) {
    return 'quiz';
  }
  if (hasFlashcardAnswers) {
    return 'flashcard';
  }
  return 'unknown';
}

/**
 * Parses a raw question bank string (Multiple Choice questions).
 * @param {string} rawText
 * @returns {{ title: string, quizzes: Array, totalQuestions: number, error?: string }}
 */
export function parseQuestionBank(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { title: '', quizzes: [], totalQuestions: 0, error: 'Empty content provided' };
  }

  const lines = rawText.split(/\r?\n/);
  const quizzes = [];

  let currentQuiz = null;
  let currentQuestion = null;
  let promptLines = [];
  let questionCounter = 0;

  function finalizeCurrentQuestion() {
    if (!currentQuestion) return;

    currentQuestion.question = promptLines.join('\n').trim();
    currentQuestion.formattedQuestion = formatQuestionText(currentQuestion.question);

    if (currentQuestion.options.length > 0) {
      currentQuestion.isMultipleChoice =
        currentQuestion.correctAnswers.length > 1 ||
        /\b(select all|check all)\b/i.test(currentQuestion.question);

      if (currentQuiz) {
        currentQuiz.questions.push(currentQuestion);
      }
    }

    currentQuestion = null;
    promptLines = [];
  }

  function finalizeCurrentQuiz() {
    finalizeCurrentQuestion();
    if (currentQuiz && currentQuiz.questions.length > 0) {
      quizzes.push(currentQuiz);
    }
    currentQuiz = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    // 1. Detect Quiz Heading: ## Quiz Title or # Quiz Title
    const quizHeaderMatch = trimmedLine.match(/^##?\s+([^#].*)$/);
    if (quizHeaderMatch) {
      const detectedTitle = quizHeaderMatch[1].trim();

      // Ignore standard separators or question headers if typed as ##
      if (!/^question\s+\d+/i.test(detectedTitle)) {
        finalizeCurrentQuiz();
        const slug = slugify(detectedTitle) || `quiz-${quizzes.length + 1}`;
        currentQuiz = {
          id: slug,
          title: detectedTitle,
          questions: []
        };
        questionCounter = 0;
        continue;
      }
    }

    // 2. Detect Question Heading: ### Question [N] or ### Q[N] or Question [N]
    const qHeaderMatch = trimmedLine.match(/^###\s*(?:Question\s*(\d+)|Q(\d+)|(.*))/i);
    if (qHeaderMatch) {
      finalizeCurrentQuestion();

      if (!currentQuiz) {
        currentQuiz = {
          id: 'quiz-general',
          title: 'General Quiz',
          questions: []
        };
      }

      questionCounter++;
      const qNum = qHeaderMatch[1] || qHeaderMatch[2] || questionCounter;
      const qId = `${currentQuiz.id}_q${qNum}_${questionCounter}`;

      currentQuestion = {
        id: qId,
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title,
        questionNumber: parseInt(qNum, 10) || questionCounter,
        question: '',
        options: [],
        correctAnswers: [],
        isMultipleChoice: false
      };
      promptLines = [];
      continue;
    }

    // 3. Detect Horizontal Separator: ---
    if (trimmedLine === '---' || trimmedLine === '***') {
      finalizeCurrentQuestion();
      continue;
    }

    // If inside a question, check for Option line: A. Text, B. Text, etc.
    if (currentQuestion) {
      const optionMatch = trimmedLine.match(/^([A-Z])\.\s+(.*)$/);
      if (optionMatch) {
        let optText = optionMatch[2].trim();
        const optIndex = currentQuestion.options.length;

        // Check for **[CORRECT]** or [CORRECT]
        const isCorrect = /\*{0,2}\[CORRECT\]\*{0,2}/i.test(optText);
        if (isCorrect) {
          optText = optText.replace(/\*{0,2}\[CORRECT\]\*{0,2}/gi, '').trim();
          currentQuestion.correctAnswers.push(optIndex);
        }

        currentQuestion.options.push(optText);
        continue;
      }

      // If we haven't seen options yet, this is part of the question prompt
      if (currentQuestion.options.length === 0) {
        promptLines.push(rawLine);
      }
    }
  }

  // Finalize any trailing question & quiz
  finalizeCurrentQuiz();

  const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0);

  return {
    title: quizzes.length === 1 ? quizzes[0].title : 'Question Bank',
    quizzes,
    totalQuestions
  };
}

/**
 * Parses a raw flashcard bank string (Question & Answer cards).
 * @param {string} rawText
 * @returns {{ title: string, decks: Array, totalCards: number, error?: string }}
 */
export function parseFlashcardBank(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { title: '', decks: [], totalCards: 0, error: 'Empty content provided' };
  }

  const lines = rawText.split(/\r?\n/);
  const decks = [];
  let bankTitle = '';

  let currentDeck = null;
  let currentCard = null;
  let promptLines = [];
  let answerLines = [];
  let readingAnswer = false;
  let cardCounter = 0;

  function finalizeCurrentCard() {
    if (!currentCard) return;

    currentCard.question = promptLines.join('\n').trim();
    currentCard.formattedQuestion = formatQuestionText(currentCard.question);

    currentCard.answer = answerLines.join('\n').trim();
    currentCard.formattedAnswer = formatQuestionText(currentCard.answer);

    if (currentCard.question.length > 0 && currentCard.answer.length > 0) {
      if (currentDeck) {
        currentDeck.cards.push(currentCard);
      }
    }

    currentCard = null;
    promptLines = [];
    answerLines = [];
    readingAnswer = false;
  }

  function finalizeCurrentDeck() {
    finalizeCurrentCard();
    if (currentDeck && currentDeck.cards.length > 0) {
      decks.push(currentDeck);
    }
    currentDeck = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    // 0. Detect Main Bank Title: # Title
    const mainTitleMatch = trimmedLine.match(/^#\s+([^#].*)$/);
    if (mainTitleMatch && !bankTitle) {
      bankTitle = mainTitleMatch[1].trim();
      continue;
    }

    // 1. Detect Deck/Part Heading: ## Part ... or ## Title
    const deckHeaderMatch = trimmedLine.match(/^##\s+([^#].*)$/);
    if (deckHeaderMatch) {
      const detectedTitle = deckHeaderMatch[1].trim();

      if (!/^question\s+\d+/i.test(detectedTitle) && !/^card\s+\d+/i.test(detectedTitle)) {
        finalizeCurrentDeck();
        const slug = slugify(detectedTitle) || `deck-${decks.length + 1}`;
        currentDeck = {
          id: slug,
          title: detectedTitle,
          cards: []
        };
        cardCounter = 0;
        continue;
      }
    }

    // 2. Detect Card Heading: ### Question [N] or ### Card [N]
    const cardHeaderMatch = trimmedLine.match(/^###\s*(?:Question\s*(\d+)|Card\s*(\d+)|Q(\d+)|(.*))/i);
    if (cardHeaderMatch) {
      finalizeCurrentCard();

      if (!currentDeck) {
        currentDeck = {
          id: 'deck-general',
          title: 'General Deck',
          cards: []
        };
      }

      cardCounter++;
      const cNum = cardHeaderMatch[1] || cardHeaderMatch[2] || cardHeaderMatch[3] || cardCounter;
      const cId = `${currentDeck.id}_card${cNum}_${cardCounter}`;

      currentCard = {
        id: cId,
        deckId: currentDeck.id,
        deckTitle: currentDeck.title,
        cardNumber: parseInt(cNum, 10) || cardCounter,
        question: '',
        answer: ''
      };
      promptLines = [];
      answerLines = [];
      readingAnswer = false;
      continue;
    }

    // 3. Detect Divider: --- or ***
    if (trimmedLine === '---' || trimmedLine === '***') {
      finalizeCurrentCard();
      continue;
    }

    // If inside a card:
    if (currentCard) {
      // Check for Answer marker: **Answer:** or Answer: or #### Answer
      const answerStartMatch = trimmedLine.match(/^(\*{0,2}Answer:\*{0,2}|####\s+Answer)\s*(.*)$/i);
      if (answerStartMatch) {
        readingAnswer = true;
        const remainder = answerStartMatch[2].trim();
        if (remainder) {
          answerLines.push(remainder);
        }
        continue;
      }

      if (readingAnswer) {
        answerLines.push(rawLine);
      } else {
        promptLines.push(rawLine);
      }
    }
  }

  finalizeCurrentDeck();

  const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0);

  return {
    title: bankTitle || (decks.length === 1 ? decks[0].title : 'Flashcard Deck'),
    decks,
    totalCards
  };
}
