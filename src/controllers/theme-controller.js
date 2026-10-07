import { VALID_THEMES, DEFAULT_THEME } from '../constants.js';
import { storageService } from '../services/storage.js';

/**
 * ThemeController handles light/dark mode and shadcn/ui color themes.
 */
export class ThemeController {
  constructor({
    storage = storageService,
    btnThemeToggle = typeof document !== 'undefined' ? document.getElementById('btn-theme-toggle') : null,
    themeIconSun = typeof document !== 'undefined' ? document.getElementById('theme-icon-sun') : null,
    themeIconMoon = typeof document !== 'undefined' ? document.getElementById('theme-icon-moon') : null,
    themePills = typeof document !== 'undefined' ? document.querySelectorAll('.theme-pill') : null,
    onThemeChange = null
  } = {}) {
    this.storage = storage;
    this.btnThemeToggle = btnThemeToggle;
    this.themeIconSun = themeIconSun;
    this.themeIconMoon = themeIconMoon;
    this.themePills = themePills;
    this.onThemeChange = onThemeChange;
    this.eventsBound = false;
  }

  initTheme() {
    const savedMode = this.storage.getThemeMode();

    if (savedMode === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      if (this.themeIconSun) this.themeIconSun.classList.add('hidden');
      if (this.themeIconMoon) this.themeIconMoon.classList.remove('hidden');
      if (this.btnThemeToggle) this.btnThemeToggle.title = 'Switch to Light Mode';
    } else {
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      if (this.themeIconSun) this.themeIconSun.classList.remove('hidden');
      if (this.themeIconMoon) this.themeIconMoon.classList.add('hidden');
      if (this.btnThemeToggle) this.btnThemeToggle.title = 'Switch to Dark Mode';
    }

    const savedTheme = this.storage.getThemeId();
    this.applyTheme(savedTheme, false);
    this.bindEvents();
  }

  applyTheme(themeId, persist = true) {
    const validTheme = VALID_THEMES.includes(themeId) ? themeId : DEFAULT_THEME;
    document.body.dataset.theme = validTheme;

    if (persist) {
      this.storage.setThemeId(validTheme);
    }

    if (this.themePills) {
      this.themePills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.theme === validTheme);
      });
    }

    if (typeof this.onThemeChange === 'function') {
      this.onThemeChange();
    }
  }

  toggleThemeMode() {
    const isDark = document.body.classList.toggle('dark');
    document.body.classList.toggle('light', !isDark);
    const newMode = isDark ? 'dark' : 'light';
    this.storage.setThemeMode(newMode);

    if (this.themeIconSun) this.themeIconSun.classList.toggle('hidden', isDark);
    if (this.themeIconMoon) this.themeIconMoon.classList.toggle('hidden', !isDark);
    if (this.btnThemeToggle) {
      this.btnThemeToggle.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }

    if (typeof this.onThemeChange === 'function') {
      this.onThemeChange();
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => this.toggleThemeMode());
    }
    if (this.themePills) {
      this.themePills.forEach(pill => {
        pill.addEventListener('click', () => this.applyTheme(pill.dataset.theme));
      });
    }
  }
}
