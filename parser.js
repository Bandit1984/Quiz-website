/**
 * Question Bank Parser
 * Parses markdown/plain text formatted question banks into structured quiz data.
 */

/**
 * Converts simple markdown tables and formatting to safe HTML for prompt rendering.
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is a markdown table row (starts and ends with | or contains |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
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
        // Close table
        output.push(renderTableHTML(tableHeader, tableRows));
        inTable = false;
        tableHeader = [];
        tableRows = [];
      }

      if (line.length > 0) {
        output.push(`<p>${formatInlineMarkdown(line)}</p>`);
      }
    }
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

function formatInlineMarkdown(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
 * Parses a raw question bank string.
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
