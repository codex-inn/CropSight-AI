import { describe, expect, it } from 'vitest';
import { demoFields, demoScans } from '../data/demoData';
import { buildReport, calculateSummary } from './analytics';

describe('analytics', () => {
  it('calculates maturity totals and percentages from scans', () => {
    const summary = calculateSummary(demoScans);
    expect(summary.totalScans).toBe(demoScans.length);
    expect(summary.ready + summary.nearly + summary.developing).toBe(summary.totalDetections);
    expect(summary.avgConfidence).toBeGreaterThan(0);
  });

  it('builds report from persisted scans and fields', () => {
    const report = buildReport(demoScans, demoFields);
    expect(report.totalScans).toBe(2);
    expect(report.activeFields).toBe(2);
    expect(report.maturityTotals.harvestReady).toBeGreaterThan(0);
  });
});
