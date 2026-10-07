import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PauseController } from '../src/controllers/pause-controller.js';
import { ThemeController } from '../src/controllers/theme-controller.js';
import { FontScaleController } from '../src/controllers/font-scale-controller.js';
import { LayoutController } from '../src/controllers/layout-controller.js';
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

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...names) {
    names.forEach(n => this.classes.add(n));
  }
  remove(...names) {
    names.forEach(n => this.classes.delete(n));
  }
  contains(name) {
    return this.classes.has(name);
  }
  toggle(name, force) {
    if (typeof force === 'boolean') {
      if (force) this.classes.add(name);
      else this.classes.delete(name);
      return force;
    }
    if (this.classes.has(name)) {
      this.classes.delete(name);
      return false;
    }
    this.classes.add(name);
    return true;
  }
}

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.classList = new MockClassList();
    this.listeners = new Map();
    this.style = {
      properties: new Map(),
      setProperty(name, val) {
        this.properties.set(name, String(val));
      },
      getPropertyValue(name) {
        return this.properties.get(name) || '';
      }
    };
    this.dataset = {};
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.title = '';
    this.disabled = false;
    this.checked = false;
    this.attributes = new Map();
    this.open = false;
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  click() {
    const list = this.listeners.get('click') || [];
    for (const fn of list) {
      fn({ target: this, preventDefault() {}, stopPropagation() {} });
    }
  }

  change() {
    const list = this.listeners.get('change') || [];
    for (const fn of list) {
      fn({ target: this, preventDefault() {}, stopPropagation() {} });
    }
  }

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
  }
}

function createMockDocument() {
  const body = new MockElement('body');
  const docElem = new MockElement('html');
  return {
    body,
    documentElement: docElem,
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    fullscreenElement: null
  };
}

describe('Controllers Suite', () => {
  describe('PauseController', () => {
    it('accurately uses getTime callback to display elapsed study seconds on overlay', () => {
      let activeSeconds = 75; // 01:15
      const pauseOverlay = new MockElement();
      pauseOverlay.classList.add('hidden');
      const pauseTimerDisplay = new MockElement();
      const btnPause = new MockElement('button');

      let paused = false;
      let resumed = false;

      const controller = new PauseController({
        btnPause,
        pauseOverlay,
        pauseTimerDisplay,
        getTime: () => activeSeconds,
        onPause: () => { paused = true; },
        onResume: () => { resumed = true; }
      });

      // Click pause button on UI
      btnPause.click();
      assert.strictEqual(controller.isPaused, true);
      assert.strictEqual(paused, true);
      assert.strictEqual(pauseOverlay.classList.contains('hidden'), false);
      assert.strictEqual(pauseTimerDisplay.textContent, '01:15');

      // Click resume button on UI
      btnPause.click();
      assert.strictEqual(controller.isPaused, false);
      assert.strictEqual(resumed, true);
      assert.strictEqual(pauseOverlay.classList.contains('hidden'), true);
    });

    it('does not duplicate event listeners when bindEvents is invoked multiple times', () => {
      const btnPause = new MockElement('button');
      let pauseCalls = 0;

      const controller = new PauseController({
        btnPause,
        onPause: () => { pauseCalls++; }
      });

      // Attempt repeated bindings
      controller.bindEvents();
      controller.bindEvents();

      assert.strictEqual(btnPause.listeners.get('click').length, 1);
      btnPause.click();
      assert.strictEqual(pauseCalls, 1);
    });
  });

  describe('KeybindsController', () => {
    it('does not duplicate event listeners when modal is opened repeatedly or reset', () => {
      const storage = new StorageService(new MockStorage());
      const btnKeybinds = new MockElement('button');
      const btnSaveKeybinds = new MockElement('button');
      const keybindsModal = new MockElement('dialog');
      let changedCount = 0;

      const controller = new KeybindsController({
        storage,
        btnKeybinds,
        btnSaveKeybinds,
        keybindsModal,
        keybindRadioInputs: [new MockElement('input')],
        onKeybindsChanged: () => { changedCount++; }
      });

      controller.initKeybinds();
      assert.strictEqual(btnSaveKeybinds.listeners.get('click').length, 1);

      // Open modal 3 times
      controller.openKeybindsModal();
      controller.openKeybindsModal();
      controller.openKeybindsModal();
      assert.strictEqual(btnSaveKeybinds.listeners.get('click').length, 1);

      // Reset to defaults
      controller.resetKeybindsToDefault();
      assert.strictEqual(btnSaveKeybinds.listeners.get('click').length, 1);
      assert.strictEqual(changedCount, 1);

      // Save keybinds fires once more
      btnSaveKeybinds.click();
      assert.strictEqual(changedCount, 2);
    });
  });

  describe('ThemeController', () => {
    it('manages theme mode and color themes idempotently', () => {
      const storage = new StorageService(new MockStorage({ quiz_theme_mode: 'light', quiz_theme_id: 'green' }));
      const btnToggle = new MockElement('button');
      const pillViolet = new MockElement('button');
      pillViolet.dataset.theme = 'violet';

      const oldDoc = global.document;
      const mockDoc = createMockDocument();
      global.document = mockDoc;

      try {
        let themeChanged = 0;
        const controller = new ThemeController({
          storage,
          btnThemeToggle: btnToggle,
          themePills: [pillViolet],
          onThemeChange: () => { themeChanged++; }
        });

        controller.initTheme();
        assert.strictEqual(mockDoc.body.dataset.theme, 'green');

        // Repeated init doesn't duplicate listeners
        controller.initTheme();
        assert.strictEqual(btnToggle.listeners.get('click').length, 1);

        // Toggle to dark mode
        btnToggle.click();
        assert.strictEqual(storage.getThemeMode(), 'dark');
        assert.strictEqual(mockDoc.body.classList.contains('dark'), true);

        // Apply violet theme
        pillViolet.click();
        assert.strictEqual(storage.getThemeId(), 'violet');
        assert.strictEqual(mockDoc.body.dataset.theme, 'violet');
      } finally {
        global.document = oldDoc;
      }
    });
  });

  describe('FontScaleController', () => {
    it('zooms in and out within configured levels and updates styles', () => {
      const storage = new StorageService(new MockStorage({ quiz_drill_font_scale: '1' }));
      const btnIn = new MockElement('button');
      const btnOut = new MockElement('button');
      const label = new MockElement('span');

      const oldDoc = global.document;
      const mockDoc = createMockDocument();
      global.document = mockDoc;

      try {
        const controller = new FontScaleController({
          storage,
          btnZoomIn: btnIn,
          btnZoomOut: btnOut,
          zoomLevelLabel: label
        });

        controller.initFontScale();
        assert.strictEqual(label.textContent, '100%');
        assert.strictEqual(mockDoc.documentElement.style.properties.get('--font-scale'), '1');

        // Zoom in: 1.0 -> 1.15
        btnIn.click();
        assert.strictEqual(label.textContent, '115%');
        assert.strictEqual(storage.getFontScaleIndex(), 3);

        // Zoom out twice: 1.15 -> 1.0 -> 0.85
        btnOut.click();
        btnOut.click();
        assert.strictEqual(label.textContent, '85%');
        assert.strictEqual(storage.getFontScaleIndex(), 1);

        // Multiple inits do not duplicate listeners
        controller.initFontScale();
        assert.strictEqual(btnIn.listeners.get('click').length, 1);
      } finally {
        global.document = oldDoc;
      }
    });
  });

  describe('LayoutController', () => {
    it('toggles top bars and updates compact and zen HUD meta', () => {
      const storage = new StorageService(new MockStorage({ quiz_drill_top_bars_hidden: 'false' }));
      const btnToggle = new MockElement('button');
      const toggleText = new MockElement('span');
      const compactBar = new MockElement('div');
      compactBar.classList.add('hidden');
      const deckTitle = new MockElement('span');
      const counter = new MockElement('span');

      const oldDoc = global.document;
      const mockDoc = createMockDocument();
      global.document = mockDoc;

      try {
        const controller = new LayoutController({
          storage,
          btnToggleBars: btnToggle,
          toggleBarsText: toggleText,
          compactTopBar: compactBar,
          compactDeckTitle: deckTitle,
          compactCounter: counter
        });

        controller.initLayout();
        assert.strictEqual(toggleText.textContent, 'Hide Bars');

        // Toggle to hidden
        btnToggle.click();
        assert.strictEqual(controller.isTopBarsHidden, true);
        assert.strictEqual(toggleText.textContent, 'Show Bars');
        assert.strictEqual(compactBar.classList.contains('hidden'), false);
        assert.strictEqual(storage.getTopBarsHidden(), true);

        // Update compact meta
        controller.updateCompactMeta('Distributed DB', 'Card 2 / 5');
        assert.strictEqual(deckTitle.textContent, 'Distributed DB');
        assert.strictEqual(counter.textContent, 'Card 2 / 5');

        // Idempotency check
        controller.bindEvents();
        assert.strictEqual(btnToggle.listeners.get('click').length, 1);
      } finally {
        global.document = oldDoc;
      }
    });
  });
});
