import {
  STORAGE_KEYS,
  VALID_THEMES,
  DEFAULT_THEME,
  FONT_SCALE_LEVELS,
  DEFAULT_FONT_SCALE_INDEX,
  DEFAULT_KEYBIND_STYLE,
  DEFAULT_CUSTOM_KEYS,
  MAX_HISTORY_ITEMS
} from '../constants.js';

/**
 * StorageService provides safe, centralized localStorage operations.
 */
export class StorageService {
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage;
  }

  getItem(key, fallback = null) {
    if (!this.storage) return fallback;
    try {
      const val = this.storage.getItem(key);
      return val !== null ? val : fallback;
    } catch {
      return fallback;
    }
  }

  setItem(key, value) {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, value);
    } catch (err) {
      console.warn(`StorageService.setItem failed for key "${key}":`, err);
    }
  }

  removeItem(key) {
    if (!this.storage) return;
    try {
      this.storage.removeItem(key);
    } catch (err) {
      console.warn(`StorageService.removeItem failed for key "${key}":`, err);
    }
  }

  getJson(key, fallback = null) {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  setJson(key, value) {
    this.setItem(key, JSON.stringify(value));
  }

  // Quiz Bank Raw
  getQuizBankRaw() {
    return this.getItem(STORAGE_KEYS.QUIZ_BANK, null);
  }

  setQuizBankRaw(rawText) {
    this.setItem(STORAGE_KEYS.QUIZ_BANK, rawText);
  }

  removeQuizBankRaw() {
    this.removeItem(STORAGE_KEYS.QUIZ_BANK);
  }

  // Flashcard Bank Raw
  getFlashcardBankRaw() {
    return this.getItem(STORAGE_KEYS.FLASHCARD_BANK, null);
  }

  setFlashcardBankRaw(rawText) {
    this.setItem(STORAGE_KEYS.FLASHCARD_BANK, rawText);
  }

  removeFlashcardBankRaw() {
    this.removeItem(STORAGE_KEYS.FLASHCARD_BANK);
  }

  // Mistakes Set
  getMistakes() {
    const arr = this.getJson(STORAGE_KEYS.MISTAKES, []);
    return new Set(Array.isArray(arr) ? arr : []);
  }

  setMistakes(setOrArray) {
    const arr = setOrArray instanceof Set ? Array.from(setOrArray) : setOrArray;
    this.setJson(STORAGE_KEYS.MISTAKES, arr);
  }

  removeMistakes() {
    this.removeItem(STORAGE_KEYS.MISTAKES);
  }

  // Flashcards Mastered Set
  getFCMastered() {
    const arr = this.getJson(STORAGE_KEYS.FC_MASTERED, []);
    return new Set(Array.isArray(arr) ? arr : []);
  }

  setFCMastered(setOrArray) {
    const arr = setOrArray instanceof Set ? Array.from(setOrArray) : setOrArray;
    this.setJson(STORAGE_KEYS.FC_MASTERED, arr);
  }

  removeFCMastered() {
    this.removeItem(STORAGE_KEYS.FC_MASTERED);
  }

  // Flashcards Review Set
  getFCReview() {
    const arr = this.getJson(STORAGE_KEYS.FC_REVIEW, []);
    return new Set(Array.isArray(arr) ? arr : []);
  }

  setFCReview(setOrArray) {
    const arr = setOrArray instanceof Set ? Array.from(setOrArray) : setOrArray;
    this.setJson(STORAGE_KEYS.FC_REVIEW, arr);
  }

  removeFCReview() {
    this.removeItem(STORAGE_KEYS.FC_REVIEW);
  }

  // Session History
  getHistory() {
    const arr = this.getJson(STORAGE_KEYS.HISTORY, []);
    return Array.isArray(arr) ? arr : [];
  }

  addHistorySession(session) {
    const history = this.getHistory();
    history.push(session);
    if (history.length > MAX_HISTORY_ITEMS) history.shift();
    this.setJson(STORAGE_KEYS.HISTORY, history);
    return history;
  }

  // Theme Mode ('light' | 'dark')
  getThemeMode() {
    return this.getItem(STORAGE_KEYS.THEME_MODE, 'light');
  }

  setThemeMode(mode) {
    this.setItem(STORAGE_KEYS.THEME_MODE, mode);
  }

  // Theme ID ('blue', 'zinc', etc.)
  getThemeId() {
    const id = this.getItem(STORAGE_KEYS.THEME_ID, DEFAULT_THEME);
    return VALID_THEMES.includes(id) ? id : DEFAULT_THEME;
  }

  setThemeId(id) {
    this.setItem(STORAGE_KEYS.THEME_ID, id);
  }

  // Font Scale Index
  getFontScaleIndex() {
    const saved = this.getItem(STORAGE_KEYS.FONT_SCALE);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      const idx = FONT_SCALE_LEVELS.indexOf(parsed);
      if (idx !== -1) return idx;
    }
    return DEFAULT_FONT_SCALE_INDEX;
  }

  setFontScale(scale) {
    this.setItem(STORAGE_KEYS.FONT_SCALE, scale.toString());
  }

  // Top Bars Hidden
  getTopBarsHidden() {
    return this.getItem(STORAGE_KEYS.TOP_BARS_HIDDEN) === 'true';
  }

  setTopBarsHidden(hidden) {
    this.setItem(STORAGE_KEYS.TOP_BARS_HIDDEN, hidden ? 'true' : 'false');
  }

  // Keybinds Preset & Custom Keys
  getKeybindStyle() {
    return this.getItem(STORAGE_KEYS.KEYBIND_STYLE, DEFAULT_KEYBIND_STYLE);
  }

  setKeybindStyle(style) {
    this.setItem(STORAGE_KEYS.KEYBIND_STYLE, style);
  }

  getCustomKeys() {
    return this.getItem(STORAGE_KEYS.CUSTOM_KEYS, DEFAULT_CUSTOM_KEYS);
  }

  setCustomKeys(keys) {
    this.setItem(STORAGE_KEYS.CUSTOM_KEYS, keys);
  }
}

export const storageService = new StorageService();
