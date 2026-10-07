import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBankType,
  parseQuestionBank,
  parseFlashcardBank,
  formatQuestionText
} from '../src/parser.js';

describe('Parser Module', () => {
  describe('detectBankType', () => {
    it('detects unknown for empty or whitespace text', () => {
      assert.strictEqual(detectBankType(''), 'unknown');
      assert.strictEqual(detectBankType('   \n  '), 'unknown');
      assert.strictEqual(detectBankType(null), 'unknown');
    });

    it('detects quiz banks by options or [CORRECT] tags', () => {
      const quizSample = `
## General Quiz
### Question 1
What is 2 + 2?
A. 3
B. 4 **[CORRECT]**
C. 5
`;
      assert.strictEqual(detectBankType(quizSample), 'quiz');
    });

    it('detects flashcard decks by Answer tags', () => {
      const fcSample = `
# Flashcards
## Big Data Deck
### Card 1
What is MapReduce?
**Answer:** A distributed computing framework.
`;
      assert.strictEqual(detectBankType(fcSample), 'flashcard');
    });
  });

  describe('parseQuestionBank', () => {
    it('parses single and multiple choice questions with options and titles', () => {
      const raw = `
## Big Data Concepts
### Question 1
Which of the following are NoSQL databases? (select all)
A. MongoDB **[CORRECT]**
B. Cassandra **[CORRECT]**
C. PostgreSQL
D. Redis **[CORRECT]**

### Question 2
What is the primary role of HDFS?
A. Resource negotiation
B. Distributed storage **[CORRECT]**
C. Stream processing
`;
      const result = parseQuestionBank(raw);
      assert.strictEqual(result.quizzes.length, 1);
      assert.strictEqual(result.quizzes[0].title, 'Big Data Concepts');
      assert.strictEqual(result.quizzes[0].questions.length, 2);

      const q1 = result.quizzes[0].questions[0];
      assert.strictEqual(q1.isMultipleChoice, true);
      assert.deepStrictEqual(q1.correctAnswers, [0, 1, 3]);
      assert.strictEqual(q1.options.length, 4);

      const q2 = result.quizzes[0].questions[1];
      assert.strictEqual(q2.isMultipleChoice, false);
      assert.deepStrictEqual(q2.correctAnswers, [1]);
      assert.strictEqual(q2.options.length, 3);
    });

    it('handles empty input gracefully', () => {
      const result = parseQuestionBank('');
      assert.strictEqual(result.quizzes.length, 0);
      assert.strictEqual(result.totalQuestions, 0);
    });
  });

  describe('parseFlashcardBank', () => {
    it('parses flashcard decks and cards with front and back text', () => {
      const raw = `
# Engineering Flashcards
## Distributed Systems
### Question 1
Define CAP theorem.
**Answer:** Consistency, Availability, Partition tolerance.

### Card 2
What does ACID stand for?
#### Answer
Atomicity, Consistency, Isolation, Durability.
`;
      const result = parseFlashcardBank(raw);
      assert.strictEqual(result.title, 'Engineering Flashcards');
      assert.strictEqual(result.decks.length, 1);
      assert.strictEqual(result.decks[0].title, 'Distributed Systems');
      assert.strictEqual(result.decks[0].cards.length, 2);

      const c1 = result.decks[0].cards[0];
      assert.strictEqual(c1.question, 'Define CAP theorem.');
      assert.strictEqual(c1.answer, 'Consistency, Availability, Partition tolerance.');

      const c2 = result.decks[0].cards[1];
      assert.strictEqual(c2.question, 'What does ACID stand for?');
      assert.strictEqual(c2.answer, 'Atomicity, Consistency, Isolation, Durability.');
    });

    it('handles empty input gracefully', () => {
      const result = parseFlashcardBank('');
      assert.strictEqual(result.decks.length, 0);
      assert.strictEqual(result.totalCards, 0);
    });
  });

  describe('formatQuestionText', () => {
    it('formats bold and inline code', () => {
      const html = formatQuestionText('This is **bold** and `code`.');
      assert.ok(html.includes('<strong>bold</strong>'));
      assert.ok(html.includes('<code>code</code>'));
    });

    it('renders code blocks safely', () => {
      const text = '```python\nprint("hello")\n```';
      const html = formatQuestionText(text);
      assert.ok(html.includes('<pre class="code-block"><code class="lang-python">print("hello")</code></pre>'));
    });

    it('renders markdown tables', () => {
      const table = `
| Term | Meaning |
|:---:|:---:|
| HDFS | Storage |
| YARN | Resource |
`;
      const html = formatQuestionText(table);
      assert.ok(html.includes('<table class="quiz-table">'));
      assert.ok(html.includes('<th>Term</th>'));
      assert.ok(html.includes('<td>HDFS</td>'));
    });
  });
});
