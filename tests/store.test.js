import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/state/store.js';
import { StorageService } from '../src/services/storage.js';

class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
}

describe('Store State Manager', () => {
  it('initializes with clean default values', () => {
    const storage = new StorageService(new MockStorage());
    const store = new Store(storage);

    assert.strictEqual(store.currentIndex, 0);
    assert.strictEqual(store.mode, 'drill');
    assert.strictEqual(store.order, 'original');
    assert.strictEqual(store.isPaused, false);
    assert.strictEqual(store.streak, 0);
    assert.strictEqual(store.mistakesSet.size, 0);
    assert.strictEqual(store.fcMasteredSet.size, 0);
  });

  it('rebuilds questions pool across selected quizzes', () => {
    const storage = new StorageService(new MockStorage());
    const store = new Store(storage);

    store.quizBankData = {
      title: 'Test Bank',
      quizzes: [
        { id: 'q1', title: 'Quiz 1', questions: [{ id: 'q1_1' }, { id: 'q1_2' }] },
        { id: 'q2', title: 'Quiz 2', questions: [{ id: 'q2_1' }, { id: 'q2_2' }, { id: 'q2_3' }] }
      ],
      totalQuestions: 5
    };

    // When none selected, selects all
    store.selectedQuizIds = new Set();
    store.rebuildQuestionsPool();
    assert.strictEqual(store.allQuestions.length, 5);

    // Filter to only q2
    store.selectedQuizIds = new Set(['q2']);
    store.rebuildQuestionsPool();
    assert.strictEqual(store.allQuestions.length, 3);
    assert.strictEqual(store.allQuestions[0].id, 'q2_1');
  });

  it('rebuilds cards pool across selected decks', () => {
    const storage = new StorageService(new MockStorage());
    const store = new Store(storage);

    store.flashcardBankData = {
      title: 'Test Deck Bank',
      decks: [
        { id: 'd1', title: 'Deck 1', cards: [{ id: 'c1' }] },
        { id: 'd2', title: 'Deck 2', cards: [{ id: 'c2' }, { id: 'c3' }] }
      ],
      totalCards: 3
    };

    store.selectedDeckIds = new Set(['d1']);
    store.rebuildCardsPool();
    assert.strictEqual(store.allCards.length, 1);
    assert.strictEqual(store.allCards[0].id, 'c1');
  });

  it('resets study session state', () => {
    const storage = new StorageService(new MockStorage());
    const store = new Store(storage);

    store.currentIndex = 5;
    store.userAnswers = { q1: 1 };
    store.streak = 10;
    store.maxStreak = 10;
    store.selectedMultiOptions.add(1);

    store.resetQuizSessionState();
    assert.strictEqual(store.currentIndex, 0);
    assert.deepStrictEqual(store.userAnswers, {});
    assert.strictEqual(store.streak, 0);
    assert.strictEqual(store.maxStreak, 0);
    assert.strictEqual(store.selectedMultiOptions.size, 0);
  });

  it('records answers and updates metrics and mistakes set', () => {
    const storage = new StorageService(new MockStorage());
    const store = new Store(storage);

    // Answer correctly
    store.recordAnswer('q1', 2, 3.5, true);
    assert.strictEqual(store.userAnswers['q1'], 2);
    assert.strictEqual(store.isAnswered, true);
    assert.strictEqual(store.questionDurations['q1'], 3.5);
    assert.strictEqual(store.streak, 1);
    assert.strictEqual(store.maxStreak, 1);
    assert.strictEqual(store.mistakesSet.has('q1'), false);

    // Answer incorrectly
    store.recordAnswer('q2', 0, 4.0, false);
    assert.strictEqual(store.userAnswers['q2'], 0);
    assert.strictEqual(store.streak, 0);
    assert.strictEqual(store.maxStreak, 1);
    assert.strictEqual(store.mistakesSet.has('q2'), true);

    // Mistakes persisted to storage
    const reloadedMistakes = storage.getMistakes();
    assert.ok(reloadedMistakes.has('q2'));
  });

  it('rates flashcards and updates mastered and review sets', () => {
    const storage = new StorageService(new MockStorage());
    const store = new Store(storage);

    store.rateCard('c1', 'review');
    assert.ok(store.fcReviewSet.has('c1'));
    assert.ok(!store.fcMasteredSet.has('c1'));

    store.rateCard('c1', 'mastered');
    assert.ok(store.fcMasteredSet.has('c1'));
    assert.ok(!store.fcReviewSet.has('c1'));

    const savedMastered = storage.getFCMastered();
    assert.ok(savedMastered.has('c1'));
  });

  it('clears quiz and flashcard banks from state and storage', () => {
    const storage = new StorageService(new MockStorage());
    const store = new Store(storage);

    store.storedQuizRaw = 'sample quiz';
    store.allQuestions = [{ id: 'q1' }];
    store.mistakesSet.add('q1');
    store.clearQuizBank();
    assert.strictEqual(store.storedQuizRaw, null);
    assert.strictEqual(store.allQuestions.length, 0);
    assert.strictEqual(store.mistakesSet.size, 0);

    store.storedFCRaw = 'sample deck';
    store.allCards = [{ id: 'c1' }];
    store.fcMasteredSet.add('c1');
    store.clearFlashcardBank();
    assert.strictEqual(store.storedFCRaw, null);
    assert.strictEqual(store.allCards.length, 0);
    assert.strictEqual(store.fcMasteredSet.size, 0);
  });
});
