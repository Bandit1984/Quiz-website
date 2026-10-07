import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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
  clear() {
    this.store.clear();
  }
}

describe('StorageService', () => {
  let mock;
  let service;

  beforeEach(() => {
    mock = new MockStorage();
    service = new StorageService(mock);
  });

  it('reads and writes raw string items', () => {
    assert.strictEqual(service.getItem('foo'), null);
    service.setItem('foo', 'bar');
    assert.strictEqual(service.getItem('foo'), 'bar');
    service.removeItem('foo');
    assert.strictEqual(service.getItem('foo'), null);
  });

  it('serializes and deserializes JSON objects', () => {
    service.setJson('data', { count: 42, tags: ['a', 'b'] });
    const loaded = service.getJson('data');
    assert.deepStrictEqual(loaded, { count: 42, tags: ['a', 'b'] });
  });

  it('manages mistakes Set seamlessly', () => {
    assert.strictEqual(service.getMistakes().size, 0);
    service.setMistakes(new Set(['q1', 'q2']));
    const mistakes = service.getMistakes();
    assert.strictEqual(mistakes.size, 2);
    assert.ok(mistakes.has('q1'));
    assert.ok(mistakes.has('q2'));

    service.removeMistakes();
    assert.strictEqual(service.getMistakes().size, 0);
  });

  it('manages flashcards mastered and review sets', () => {
    service.setFCMastered(['card1', 'card2']);
    service.setFCReview(['card3']);

    const mastered = service.getFCMastered();
    const review = service.getFCReview();
    assert.strictEqual(mastered.size, 2);
    assert.strictEqual(review.size, 1);
    assert.ok(mastered.has('card1'));
    assert.ok(review.has('card3'));
  });

  it('stores session history and caps at 50 entries', () => {
    for (let i = 1; i <= 60; i++) {
      service.addHistorySession({ id: i, accuracy: 100 });
    }
    const history = service.getHistory();
    assert.strictEqual(history.length, 50);
    assert.strictEqual(history[0].id, 11);
    assert.strictEqual(history[49].id, 60);
  });

  it('validates theme IDs and defaults to blue for unknown values', () => {
    service.setThemeId('violet');
    assert.strictEqual(service.getThemeId(), 'violet');

    service.setThemeId('invalid-color');
    assert.strictEqual(service.getThemeId(), 'blue');
  });

  it('reads font scale index and top bars state', () => {
    assert.strictEqual(service.getFontScaleIndex(), 2); // 1.0
    service.setFontScale(1.35);
    assert.strictEqual(service.getFontScaleIndex(), 4);

    assert.strictEqual(service.getTopBarsHidden(), false);
    service.setTopBarsHidden(true);
    assert.strictEqual(service.getTopBarsHidden(), true);
  });

  it('handles keybind style and custom keys', () => {
    assert.strictEqual(service.getKeybindStyle(), 'numbers');
    service.setKeybindStyle('qwerty');
    assert.strictEqual(service.getKeybindStyle(), 'qwerty');

    assert.strictEqual(service.getCustomKeys(), '1234567890');
    service.setCustomKeys('ASDFGHJKL');
    assert.strictEqual(service.getCustomKeys(), 'ASDFGHJKL');
  });
});
