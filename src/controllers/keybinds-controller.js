import {
  KEYBIND_PRESETS,
  DEFAULT_KEYBIND_STYLE,
  DEFAULT_CUSTOM_KEYS,
  PRESET_BADGE_KEYS,
  NUMBER_KEY_MAP,
  QWERTY_KEY_MAP,
  HOMEROW_KEY_MAP
} from '../constants.js';
import { storageService } from '../services/storage.js';

/**
 * KeybindsController manages keyboard configuration presets, keybind modal,
 * option badges, and global keyboard shortcuts.
 */
export class KeybindsController {
  constructor({
    storage = storageService,
    btnKeybinds = typeof document !== 'undefined' ? document.getElementById('btn-keybinds') : null,
    keybindsModal = typeof document !== 'undefined' ? document.getElementById('keybinds-modal') : null,
    keybindsCloseBtn = typeof document !== 'undefined' ? document.getElementById('keybinds-close-btn') : null,
    btnResetKeybinds = typeof document !== 'undefined' ? document.getElementById('btn-reset-keybinds') : null,
    btnSaveKeybinds = typeof document !== 'undefined' ? document.getElementById('btn-save-keybinds') : null,
    customKeysContainer = typeof document !== 'undefined' ? document.getElementById('custom-keys-container') : null,
    customKeysInput = typeof document !== 'undefined' ? document.getElementById('custom-keys-input') : null,
    keybindRadioInputs = typeof document !== 'undefined' ? document.querySelectorAll('input[name="keybind-preset"]') : null,
    onKeybindsChanged = null
  } = {}) {
    this.storage = storage;
    this.keybindStyle = this.storage.getKeybindStyle();
    this.customKeys = this.storage.getCustomKeys();

    this.btnKeybinds = btnKeybinds;
    this.keybindsModal = keybindsModal;
    this.keybindsCloseBtn = keybindsCloseBtn;
    this.btnResetKeybinds = btnResetKeybinds;
    this.btnSaveKeybinds = btnSaveKeybinds;
    this.customKeysContainer = customKeysContainer;
    this.customKeysInput = customKeysInput;
    this.keybindRadioInputs = keybindRadioInputs;

    this.onKeybindsChanged = onKeybindsChanged;
    this.eventsBound = false;
  }

  initKeybinds() {
    this.keybindStyle = this.storage.getKeybindStyle();
    this.customKeys = this.storage.getCustomKeys();

    if (this.keybindRadioInputs) {
      this.keybindRadioInputs.forEach(radio => {
        radio.checked = radio.value === this.keybindStyle;
      });
    }
    if (this.customKeysInput) {
      this.customKeysInput.value = this.customKeys;
    }
    if (this.customKeysContainer) {
      this.customKeysContainer.classList.toggle('hidden', this.keybindStyle !== KEYBIND_PRESETS.CUSTOM);
    }

    this.bindEvents();
  }

  openKeybindsModal() {
    this.initKeybinds();
    if (this.keybindsModal && typeof this.keybindsModal.showModal === 'function') {
      this.keybindsModal.showModal();
    }
  }

  closeKeybindsModal() {
    if (this.keybindsModal && typeof this.keybindsModal.close === 'function') {
      this.keybindsModal.close();
    }
  }

  saveKeybindsFromModal() {
    let checkedRadio = null;
    if (this.keybindRadioInputs) {
      checkedRadio = Array.from(this.keybindRadioInputs).find(r => r.checked);
    } else if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      checkedRadio = document.querySelector('input[name="keybind-preset"]:checked');
    }

    if (checkedRadio) {
      this.keybindStyle = checkedRadio.value;
      this.storage.setKeybindStyle(this.keybindStyle);
    }
    if (this.customKeysInput) {
      const val = this.customKeysInput.value.trim().toUpperCase() || DEFAULT_CUSTOM_KEYS;
      this.customKeys = val;
      this.storage.setCustomKeys(this.customKeys);
    }
    this.closeKeybindsModal();

    if (typeof this.onKeybindsChanged === 'function') {
      this.onKeybindsChanged();
    }
  }

  resetKeybindsToDefault() {
    this.keybindStyle = DEFAULT_KEYBIND_STYLE;
    this.customKeys = DEFAULT_CUSTOM_KEYS;
    this.storage.setKeybindStyle(DEFAULT_KEYBIND_STYLE);
    this.storage.setCustomKeys(DEFAULT_CUSTOM_KEYS);
    this.initKeybinds();

    if (typeof this.onKeybindsChanged === 'function') {
      this.onKeybindsChanged();
    }
  }

  getActiveBadgeKeys() {
    if (this.keybindStyle === KEYBIND_PRESETS.NUMBERS) {
      return [...PRESET_BADGE_KEYS.numbers];
    }
    if (this.keybindStyle === KEYBIND_PRESETS.QWERTY) {
      return [...PRESET_BADGE_KEYS.qwerty];
    }
    if (this.keybindStyle === KEYBIND_PRESETS.HOMEROW) {
      return [...PRESET_BADGE_KEYS.homerow];
    }
    if (this.keybindStyle === KEYBIND_PRESETS.CUSTOM) {
      const keys = (this.customKeys || DEFAULT_CUSTOM_KEYS).toUpperCase().split('');
      while (keys.length < 10) {
        keys.push((keys.length + 1).toString());
      }
      return keys;
    }
    return [...PRESET_BADGE_KEYS.numbers];
  }

  /**
   * Resolves a key event to an option index (0..9) based on active configuration.
   */
  resolveOptionIndex(key, rawKey) {
    // Prioritize active preset matching keybindStyle
    if (this.keybindStyle === KEYBIND_PRESETS.CUSTOM && this.customKeys) {
      const customArr = this.customKeys.toUpperCase().split('');
      const cIdx = customArr.indexOf(key);
      if (cIdx !== -1) return cIdx;
    } else if (this.keybindStyle === KEYBIND_PRESETS.QWERTY) {
      if (QWERTY_KEY_MAP[key] !== undefined) return QWERTY_KEY_MAP[key];
    } else if (this.keybindStyle === KEYBIND_PRESETS.HOMEROW) {
      if (HOMEROW_KEY_MAP[key] !== undefined) return HOMEROW_KEY_MAP[key];
    } else if (this.keybindStyle === KEYBIND_PRESETS.NUMBERS) {
      if (NUMBER_KEY_MAP[rawKey] !== undefined) return NUMBER_KEY_MAP[rawKey];
    }

    // Fallback checks across all maps
    if (NUMBER_KEY_MAP[rawKey] !== undefined) {
      return NUMBER_KEY_MAP[rawKey];
    }
    if (QWERTY_KEY_MAP[key] !== undefined) {
      return QWERTY_KEY_MAP[key];
    }
    if (HOMEROW_KEY_MAP[key] !== undefined) {
      return HOMEROW_KEY_MAP[key];
    }
    if (this.customKeys) {
      const customArr = this.customKeys.toUpperCase().split('');
      const cIdx = customArr.indexOf(key);
      if (cIdx !== -1) return cIdx;
    }
    return undefined;
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.btnKeybinds) {
      this.btnKeybinds.addEventListener('click', () => this.openKeybindsModal());
    }
    if (this.keybindsCloseBtn) {
      this.keybindsCloseBtn.addEventListener('click', () => this.closeKeybindsModal());
    }
    if (this.btnSaveKeybinds) {
      this.btnSaveKeybinds.addEventListener('click', () => this.saveKeybindsFromModal());
    }
    if (this.btnResetKeybinds) {
      this.btnResetKeybinds.addEventListener('click', () => this.resetKeybindsToDefault());
    }
    if (this.keybindRadioInputs) {
      this.keybindRadioInputs.forEach(r => {
        r.addEventListener('change', () => {
          if (this.customKeysContainer) {
            this.customKeysContainer.classList.toggle('hidden', r.value !== KEYBIND_PRESETS.CUSTOM);
          }
        });
      });
    }
    if (this.keybindsModal) {
      this.keybindsModal.addEventListener('click', (e) => {
        const rect = this.keybindsModal.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) this.closeKeybindsModal();
      });
    }
  }
}
