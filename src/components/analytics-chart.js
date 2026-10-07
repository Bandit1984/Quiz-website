/**
 * AnalyticsChartComponent generates the SVG performance improvement chart
 * and calculates overall cumulative metrics.
 */
export class AnalyticsChartComponent {
  constructor({
    analyticsTrendBadge = typeof document !== 'undefined' ? document.getElementById('analytics-trend-badge') : null,
    overallSessionsCount = typeof document !== 'undefined' ? document.getElementById('overall-sessions-count') : null,
    overallAccuracy = typeof document !== 'undefined' ? document.getElementById('overall-accuracy') : null,
    overallTotalQuestions = typeof document !== 'undefined' ? document.getElementById('overall-total-questions') : null,
    overallBestStreak = typeof document !== 'undefined' ? document.getElementById('overall-best-streak') : null,
    overallAvgSpeed = typeof document !== 'undefined' ? document.getElementById('overall-avg-speed') : null,
    chartContainer = typeof document !== 'undefined' ? document.getElementById('chart-container') : null
  } = {}) {
    this.analyticsTrendBadge = analyticsTrendBadge;
    this.overallSessionsCount = overallSessionsCount;
    this.overallAccuracy = overallAccuracy;
    this.overallTotalQuestions = overallTotalQuestions;
    this.overallBestStreak = overallBestStreak;
    this.overallAvgSpeed = overallAvgSpeed;
    this.chartContainer = chartContainer;
  }

  /**
   * Calculates overall summary metrics from past session history.
   */
  static calculateOverallStats(history) {
    if (!history || history.length === 0) {
      return {
        totalSessions: 0,
        totalAnswered: 0,
        overallAccuracy: 100,
        bestStreak: 0,
        overallSpeed: '0.0',
        delta: null,
        latestAccuracy: 0
      };
    }

    const totalSessions = history.length;
    const totalAnswered = history.reduce((sum, s) => sum + (s.totalAnswered || 0), 0);
    const totalCorrect = history.reduce((sum, s) => sum + (s.correctCount || 0), 0);
    const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 100;
    const bestStreak = Math.max(...history.map(s => s.streak || 0));

    const validSpeeds = history.filter(s => s.avgSpeed && s.avgSpeed > 0);
    const overallSpeed = validSpeeds.length > 0
      ? (validSpeeds.reduce((sum, s) => sum + s.avgSpeed, 0) / validSpeeds.length).toFixed(1)
      : '0.0';

    let delta = null;
    let latestAccuracy = history[history.length - 1].accuracy;
    if (history.length >= 2) {
      delta = latestAccuracy - history[history.length - 2].accuracy;
    }

    return {
      totalSessions,
      totalAnswered,
      overallAccuracy,
      bestStreak,
      overallSpeed,
      delta,
      latestAccuracy
    };
  }

  renderOverallStats(history) {
    if (!history || history.length === 0) return;

    const stats = AnalyticsChartComponent.calculateOverallStats(history);

    if (this.overallSessionsCount) this.overallSessionsCount.textContent = stats.totalSessions.toString();
    if (this.overallAccuracy) this.overallAccuracy.textContent = `${stats.overallAccuracy}%`;
    if (this.overallTotalQuestions) this.overallTotalQuestions.textContent = stats.totalAnswered.toString();
    if (this.overallBestStreak) this.overallBestStreak.textContent = `${stats.bestStreak}🔥`;
    if (this.overallAvgSpeed) this.overallAvgSpeed.textContent = `${stats.overallSpeed}s`;

    if (this.analyticsTrendBadge && stats.delta !== null) {
      if (stats.delta > 0) {
        this.analyticsTrendBadge.textContent = `+${stats.delta}% vs Previous Drill ↗`;
        this.analyticsTrendBadge.style.borderColor = 'var(--color-correct)';
        this.analyticsTrendBadge.style.color = 'var(--color-correct)';
      } else if (stats.delta < 0) {
        this.analyticsTrendBadge.textContent = `${stats.delta}% vs Previous Drill ↘`;
        this.analyticsTrendBadge.style.borderColor = 'var(--color-wrong)';
        this.analyticsTrendBadge.style.color = 'var(--color-wrong)';
      } else {
        this.analyticsTrendBadge.textContent = `Maintained ${stats.latestAccuracy}% Accuracy →`;
        this.analyticsTrendBadge.style.borderColor = 'var(--border)';
        this.analyticsTrendBadge.style.color = 'var(--muted-foreground)';
      }
    }
  }

  /**
   * Generates the SVG chart markup for session accuracy trends.
   */
  static generateChartSVG(history, width = 600, height = 200) {
    if (!history || history.length === 0) {
      return `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted-foreground);font-size:0.88rem;">
          Complete your first drill session to track improvement over time.
        </div>`;
    }

    const data = history.slice(-15);
    const N = data.length;
    const padLeft = 45;
    const padRight = 30;
    const padTop = 25;
    const padBottom = 35;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const baseY = padTop + chartH;

    const gridLevels = [100, 75, 50, 25, 0];
    let gridLinesSVG = '';
    gridLevels.forEach(pct => {
      const y = padTop + (1 - pct / 100) * chartH;
      gridLinesSVG += `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
        <text x="${padLeft - 8}" y="${y + 3}" class="chart-axis-text" text-anchor="end">${pct}%</text>
      `;
    });

    const points = data.map((session, index) => {
      const x = N === 1 ? (padLeft + chartW / 2) : (padLeft + (index / (N - 1)) * chartW);
      const acc = Math.max(0, Math.min(100, session.accuracy));
      const y = padTop + (1 - acc / 100) * chartH;
      return { x, y, session, index };
    });

    let linePath = '';
    let areaPath = '';
    let pointsSVG = '';
    let xLabelsSVG = '';

    if (N === 1) {
      const p = points[0];
      pointsSVG = `
        <line x1="${padLeft}" y1="${p.y}" x2="${width - padRight}" y2="${p.y}" stroke="var(--chart-primary)" stroke-dasharray="4 4" stroke-opacity="0.4" stroke-width="1.5" />
        <circle cx="${p.x}" cy="${p.y}" r="6" class="chart-point">
          <title>Session 1: ${p.session.accuracy}%</title>
        </circle>
        <text x="${p.x}" y="${p.y - 12}" class="chart-axis-text" text-anchor="middle" fill="var(--chart-primary)" font-weight="700">${p.session.accuracy}%</text>
      `;
      xLabelsSVG = `<text x="${p.x}" y="${height - 10}" class="chart-axis-text" text-anchor="middle">Session 1</text>`;
    } else {
      linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}` + points.slice(1).map(p => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
      areaPath = `M ${points[0].x.toFixed(1)} ${baseY.toFixed(1)} L ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}` +
        points.slice(1).map(p => ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') +
        ` L ${points[points.length - 1].x.toFixed(1)} ${baseY.toFixed(1)} Z`;

      points.forEach((p, idx) => {
        const tooltip = `Session ${idx + 1}: ${p.session.accuracy}% (${p.session.score})`;
        const showLabel = N <= 8 || idx === 0 || idx === N - 1 || idx === Math.floor(N / 2);
        pointsSVG += `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" class="chart-point">
            <title>${tooltip}</title>
          </circle>
          ${showLabel ? `<text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" class="chart-axis-text" text-anchor="middle" font-weight="600">${p.session.accuracy}%</text>` : ''}
        `;
      });

      xLabelsSVG += `<text x="${points[0].x.toFixed(1)}" y="${height - 10}" class="chart-axis-text" text-anchor="start">S1</text>`;
      if (N > 2) {
        const mid = Math.floor(N / 2);
        xLabelsSVG += `<text x="${points[mid].x.toFixed(1)}" y="${height - 10}" class="chart-axis-text" text-anchor="middle">S${mid + 1}</text>`;
      }
      xLabelsSVG += `<text x="${points[points.length - 1].x.toFixed(1)}" y="${height - 10}" class="chart-axis-text" text-anchor="end">S${N}</text>`;
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--chart-primary)" stop-opacity="0.25" />
            <stop offset="100%" stop-color="var(--chart-primary)" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridLinesSVG}
        ${areaPath ? `<path d="${areaPath}" fill="url(#chartGradient)" />` : ''}
        ${linePath ? `<path d="${linePath}" class="chart-trend-line" />` : ''}
        ${pointsSVG}
        ${xLabelsSVG}
      </svg>
    `;
  }

  renderImprovementChart(history) {
    if (!this.chartContainer) return;
    this.chartContainer.innerHTML = AnalyticsChartComponent.generateChartSVG(history);
  }
}
