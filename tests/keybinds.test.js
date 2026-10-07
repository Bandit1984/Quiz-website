import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { KeybindsController } from '../src/controllers/keybinds-controller.js';
import { StorageService } from '../src/services/storage.js';

class MockStorage {
  constructor(initial = {}) {
    this.store = new Map(Object.entries(initial));
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

describe('KeybindsController', () => {
  it('returns badge keys for numbers preset', () => {
    const storage = new StorageService(new MockStorage({ quiz_drill_keybind_style: 'numbers' }));
    const controller = new KeybindsController({ storage });
    const badges = controller.getActiveBadgeKeys();
    assert.deepStrictEqual(badges, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
  });

  it('returns badge keys for qwerty preset', () => {
    const storage = new StorageService(new MockStorage({ quiz_drill_keybind_style: 'qwerty' }));
    const controller = new KeybindsController({ storage });
    const badges = controller.getActiveBadgeKeys();
    assert.deepStrictEqual(badges, ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']);
  });

  it('returns badge keys for homerow preset', () => {
    const storage = new StorageService(new MockStorage({ quiz_drill_keybind_style: 'homerow' }));
    const controller = new KeybindsController({ storage });
    const badges = controller.getActiveBadgeKeys();
    assert.deepStrictEqual(badges, ['D', 'F', 'J', 'K', 'L', ';', 'A', 'S', 'G', 'Z']);
  });

  it('pads custom keys up to 10 keys', () => {
    const storage = new StorageService(new MockStorage({
      quiz_drill_keybind_style: 'custom',
      quiz_drill_custom_keys: 'ZXCVB'
    }));
    const controller = new KeybindsController({ storage });
    const badges = controller.getActiveBadgeKeys();
    assert.strictEqual(badges.length, 10);
    assert.strictEqual(badges[0], 'Z');
    assert.strictEqual(badges[4], 'B');
    assert.strictEqual(badges[5], '6');
    assert.strictEqual(badges[9], '10');
  });

  it('resolves key events to 0-indexed option numbers across presets', () => {
    const storage = new StorageService(new MockStorage({
      quiz_drill_keybind_style: 'custom',
      quiz_drill_custom_keys: 'ZXCV'
    }));
    const controller = new KeybindsController({ storage });

    // Numbers map
    assert.strictEqual(controller.resolveOptionIndex('1', '1'), 0);
    assert.strictEqual(controller.resolveOptionIndex('0', '0'), 9);

    // QWERTY map
    assert.strictEqual(controller.resolveOptionIndex('Q', 'q'), 0);
    assert.strictEqual(controller.resolveOptionIndex('P', 'p'), 9);

    // Homerow map
    assert.strictEqual(controller.resolveOptionIndex('D', 'd'), 0);
    assert.strictEqual(controller.resolveOptionIndex(';', ';'), 5);

    // Custom map
    assert.strictEqual(controller.resolveOptionIndex('Z', 'z'), 0);
    assert.strictEqual(controller.resolveOptionIndex('V', 'v'), 3);
  });
});
