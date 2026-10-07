import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuizViewComponent } from '../src/components/quiz-view.js';

describe('Quiz Evaluation Logic', () => {
  describe('checkAnswerCorrectness', () => {
    it('evaluates single-choice questions correctly', () => {
      const q = {
        id: 'q1',
        isMultipleChoice: false,
        correctAnswers: [2],
        options: ['A', 'B', 'C', 'D']
      };

      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, 2), true);
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, 0), false);
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, 1), false);
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, undefined), false);
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, null), false);
    });

    it('evaluates multiple-choice questions with strict exact matching', () => {
      const q = {
        id: 'q2',
        isMultipleChoice: true,
        correctAnswers: [0, 2, 3],
        options: ['Option A', 'Option B', 'Option C', 'Option D']
      };

      // Fully correct
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, [0, 2, 3]), true);

      // Incomplete (missing 3)
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, [0, 2]), false);

      // Extra incorrect option included (1)
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, [0, 1, 2, 3]), false);

      // Completely incorrect
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, [1]), false);

      // Empty selections
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, []), false);

      // Invalid input type
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, 0), false);
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(q, null), false);
    });

    it('handles null/undefined question gracefully', () => {
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(null, 1), false);
      assert.strictEqual(QuizViewComponent.checkAnswerCorrectness(undefined, [1]), false);
    });
  });
});
