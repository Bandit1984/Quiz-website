import { FONT_SCALE_LEVELS } from '../constants.js';
import { storageService } from '../services/storage.js';

/**
 * FontScaleController manages text zoom and font scaling across normal, zen, and compact views.
 */
export class FontScaleController {
  constructor({
    storage = storageService,
    levels = FONT_SCALE_LEVELS,
    btnZoomIn = typeof document !== 'undefined' ? document.getElementById('btn-zoom-in') : null,
    btnZoomOut = typeof document !== 'undefined' ? document.getElementById('btn-zoom-out') : null,
    zoomLevelLabel = typeof document !== 'undefined' ? document.getElementById('zoom-level-label') : null,
    btnZoomInZen = typeof document !== 'undefined' ? document.getElementById('btn-zoom-in-zen') : null,
    btnZoomOutZen = typeof document !== 'undefined' ? document.getElementById('btn-zoom-out-zen') : null,
    zoomLevelLabelZen = typeof document !== 'undefined' ? document.getElementById('zoom-level-label-zen') : null,
    btnZoomInCompact = typeof document !== 'undefined' ? document.getElementById('btn-zoom-in-compact') : null,
    btnZoomOutCompact = typeof document !== 'undefined' ? document.getElementById('btn-zoom-out-compact') : null,
    zoomLevelLabelCompact = typeof document !== 'undefined' ? document.getElementById('zoom-level-label-compact') : null
  } = {}) {
    this.storage = storage;
    this.levels = [...levels];
    this.fontScaleIndex = this.storage.getFontScaleIndex();

    this.btnZoomIn = btnZoomIn;
    this.btnZoomOut = btnZoomOut;
    this.zoomLevelLabel = zoomLevelLabel;
    this.btnZoomInZen = btnZoomInZen;
    this.btnZoomOutZen = btnZoomOutZen;
    this.zoomLevelLabelZen = zoomLevelLabelZen;
    this.btnZoomInCompact = btnZoomInCompact;
    this.btnZoomOutCompact = btnZoomOutCompact;
    this.zoomLevelLabelCompact = zoomLevelLabelCompact;
    this.eventsBound = false;
  }

  initFontScale() {
    this.fontScaleIndex = this.storage.getFontScaleIndex();
    this.applyFontScale();
    this.bindEvents();
  }

  applyFontScale() {
    const scale = this.levels[this.fontScaleIndex] || 1.0;
    document.documentElement.style.setProperty('--font-scale', scale.toString());
    const labelText = `${Math.round(scale * 100)}%`;

    if (this.zoomLevelLabel) this.zoomLevelLabel.textContent = labelText;
    if (this.zoomLevelLabelZen) this.zoomLevelLabelZen.textContent = labelText;
    if (this.zoomLevelLabelCompact) this.zoomLevelLabelCompact.textContent = labelText;

    this.storage.setFontScale(scale);
  }

  zoomIn() {
    if (this.fontScaleIndex < this.levels.length - 1) {
      this.fontScaleIndex++;
      this.applyFontScale();
    }
  }

  zoomOut() {
    if (this.fontScaleIndex > 0) {
      this.fontScaleIndex--;
      this.applyFontScale();
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    const attach = (btn, action) => {
      if (btn) btn.addEventListener('click', action);
    };

    attach(this.btnZoomIn, () => this.zoomIn());
    attach(this.btnZoomOut, () => this.zoomOut());
    attach(this.btnZoomInZen, () => this.zoomIn());
    attach(this.btnZoomOutZen, () => this.zoomOut());
    attach(this.btnZoomInCompact, () => this.zoomIn());
    attach(this.btnZoomOutCompact, () => this.zoomOut());
  }
}
