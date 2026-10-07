/**
 * Application Constants & Configuration
 */

export const STORAGE_KEYS = {
  QUIZ_BANK: 'quiz_bank_raw',
  FLASHCARD_BANK: 'flashcard_bank_raw',
  MISTAKES: 'quiz_drill_mistakes',
  HISTORY: 'quiz_drill_history',
  THEME_MODE: 'quiz_theme_mode',
  THEME_ID: 'quiz_theme_id',
  FC_MASTERED: 'fc_mastered_ids',
  FC_REVIEW: 'fc_review_ids',
  FONT_SCALE: 'quiz_drill_font_scale',
  TOP_BARS_HIDDEN: 'quiz_drill_top_bars_hidden',
  KEYBIND_STYLE: 'quiz_drill_keybind_style',
  CUSTOM_KEYS: 'quiz_drill_custom_keys'
};

export const VALID_THEMES = ['blue', 'zinc', 'violet', 'green', 'rose', 'orange'];
export const DEFAULT_THEME = 'blue';

export const FONT_SCALE_LEVELS = [0.75, 0.85, 1.0, 1.15, 1.35, 1.55, 1.75];
export const DEFAULT_FONT_SCALE_INDEX = 2; // 1.0 (100%)

export const DEFAULT_AUTO_ADVANCE_MS = 500;

export const KEYBIND_PRESETS = {
  NUMBERS: 'numbers',
  QWERTY: 'qwerty',
  HOMEROW: 'homerow',
  CUSTOM: 'custom'
};

export const DEFAULT_KEYBIND_STYLE = KEYBIND_PRESETS.NUMBERS;
export const DEFAULT_CUSTOM_KEYS = '1234567890';

export const PRESET_BADGE_KEYS = {
  numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  qwerty: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  homerow: ['D', 'F', 'J', 'K', 'L', ';', 'A', 'S', 'G', 'Z']
};

export const NUMBER_KEY_MAP = {
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
  '6': 5, '7': 6, '8': 7, '9': 8, '0': 9
};

export const QWERTY_KEY_MAP = {
  'Q': 0, 'W': 1, 'E': 2, 'R': 3, 'T': 4,
  'Y': 5, 'U': 6, 'I': 7, 'O': 8, 'P': 9
};

export const HOMEROW_KEY_MAP = {
  'D': 0, 'F': 1, 'J': 2, 'K': 3, 'L': 4,
  ';': 5, 'A': 6, 'S': 7, 'G': 8, 'Z': 9
};

export const MODES = {
  DRILL: 'drill',
  EXAM: 'exam',
  FLASHCARDS: 'flashcards'
};

export const ORDERS = {
  ORIGINAL: 'original',
  SHUFFLE: 'shuffle',
  MISTAKE: 'mistake'
};

export const MAX_HISTORY_ITEMS = 50;
