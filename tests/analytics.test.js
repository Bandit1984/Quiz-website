import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsChartComponent } from '../src/components/analytics-chart.js';

describe('AnalyticsChartComponent', () => {
  describe('calculateOverallStats', () => {
    it('handles empty session history gracefully', () => {
      const stats = AnalyticsChartComponent.calculateOverallStats([]);
      assert.strictEqual(stats.totalSessions, 0);
      assert.strictEqual(stats.totalAnswered, 0);
      assert.strictEqual(stats.overallAccuracy, 100);
      assert.strictEqual(stats.bestStreak, 0);
      assert.strictEqual(stats.delta, null);
    });

    it('calculates metrics for a single session', () => {
      const history = [
        { accuracy: 80, totalAnswered: 10, correctCount: 8, streak: 5, avgSpeed: 3.2 }
      ];
      const stats = AnalyticsChartComponent.calculateOverallStats(history);
      assert.strictEqual(stats.totalSessions, 1);
      assert.strictEqual(stats.totalAnswered, 10);
      assert.strictEqual(stats.overallAccuracy, 80);
      assert.strictEqual(stats.bestStreak, 5);
      assert.strictEqual(stats.overallSpeed, '3.2');
      assert.strictEqual(stats.delta, null);
    });

    it('calculates cumulative metrics and positive improvement delta', () => {
      const history = [
        { accuracy: 70, totalAnswered: 10, correctCount: 7, streak: 4, avgSpeed: 4.0 },
        { accuracy: 90, totalAnswered: 10, correctCount: 9, streak: 8, avgSpeed: 2.0 }
      ];
      const stats = AnalyticsChartComponent.calculateOverallStats(history);
      assert.strictEqual(stats.totalSessions, 2);
      assert.strictEqual(stats.totalAnswered, 20);
      assert.strictEqual(stats.overallAccuracy, 80); // (16 / 20) * 100
      assert.strictEqual(stats.bestStreak, 8);
      assert.strictEqual(stats.overallSpeed, '3.0');
      assert.strictEqual(stats.delta, 20); // 90 - 70
    });

    it('calculates negative delta when accuracy drops', () => {
      const history = [
        { accuracy: 95, totalAnswered: 20, correctCount: 19, streak: 12, avgSpeed: 2.5 },
        { accuracy: 85, totalAnswered: 20, correctCount: 17, streak: 6, avgSpeed: 2.8 }
      ];
      const stats = AnalyticsChartComponent.calculateOverallStats(history);
      assert.strictEqual(stats.delta, -10);
    });
  });

  describe('generateChartSVG', () => {
    it('returns placeholder message when history is empty', () => {
      const svg = AnalyticsChartComponent.generateChartSVG([]);
      assert.ok(svg.includes('Complete your first drill session'));
    });

    it('generates single-session SVG with reference line and marker', () => {
      const history = [{ accuracy: 85, score: '17/20' }];
      const svg = AnalyticsChartComponent.generateChartSVG(history);
      assert.ok(svg.includes('<svg'));
      assert.ok(svg.includes('Session 1'));
      assert.ok(svg.includes('85%'));
      assert.ok(svg.includes('<circle'));
    });

    it('generates multi-session SVG with gradient, line, and area paths', () => {
      const history = [
        { accuracy: 60, score: '6/10' },
        { accuracy: 75, score: '15/20' },
        { accuracy: 90, score: '9/10' }
      ];
      const svg = AnalyticsChartComponent.generateChartSVG(history);
      assert.ok(svg.includes('<svg'));
      assert.ok(svg.includes('<linearGradient id="chartGradient"'));
      assert.ok(svg.includes('chart-trend-line'));
      assert.ok(svg.includes('class="chart-point"'));
      assert.ok(svg.includes('S1'));
      assert.ok(svg.includes('S3'));
    });
  });
});
