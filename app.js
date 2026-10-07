/**
 * Main Application Entry Point
 * Boots QuizApp on DOMContentLoaded and exposes window.quizApp for accessibility and debuggability.
 */

import { QuizApp } from './src/app.js';

export { QuizApp };
export * from './src/constants.js';
export * from './src/parser.js';

// Instantiate on DOM load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
  });
}
