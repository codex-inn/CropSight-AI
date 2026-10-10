import type { Field, Forecast, Report, Scan } from '../domain/models';

export type Summary = {
  totalDetections: number;
  totalScans: number;
  ready: number;
  nearly: number;
  developing: number;
  readyShare: number;
  nearlyShare: number;
  developingShare: number;
  avgConfidence: number;
};

export function calculateSummary(scans: Scan[]): Summary {
  const totals = scans.reduce(
    (acc, scan) => {
      acc.ready += scan.analysis.maturityCounts.harvestReady;
      acc.nearly += scan.analysis.maturityCounts.nearlyReady;
      acc.developing += scan.analysis.maturityCounts.developing;
      acc.confidence += scan.analysis.confidence;
      return acc;
    },
    { ready: 0, nearly: 0, developing: 0, confidence: 0 }
  );

  const totalDetections = totals.ready + totals.nearly + totals.developing;
  const totalScans = scans.length;

  return {
    totalDetections,
    totalScans,
    ready: totals.ready,
    nearly: totals.nearly,
    developing: totals.developing,
    readyShare: totalDetections ? Math.round((totals.ready / totalDetections) * 100) : 0,
    nearlyShare: totalDetections ? Math.round((totals.nearly / totalDetections) * 100) : 0,
    developingShare: totalDetections ? Math.round((totals.developing / totalDetections) * 100) : 0,
    avgConfidence: totalScans ? Math.round(totals.confidence / totalScans) : 0
  };
}

export function buildReport(scans: Scan[], fields: Field[]): Report {
  const summary = calculateSummary(scans);
  return {
    generatedAt: new Date().toISOString(),
    totalScans: summary.totalScans,
    activeFields: fields.length,
    maturityTotals: {
      harvestReady: summary.ready,
      nearlyReady: summary.nearly,
      developing: summary.developing
    }
  };
}

export function getDominantStage(scan: Scan): 'ready' | 'nearly' | 'developing' {
  const { harvestReady, nearlyReady, developing } = scan.analysis.maturityCounts;
  if (harvestReady >= nearlyReady && harvestReady >= developing) return 'ready';
  if (nearlyReady >= harvestReady && nearlyReady >= developing) return 'nearly';
  return 'developing';
}

export function getHarvestWindowText(forecast: Forecast): string {
  const start = new Date(forecast.harvestWindowStart).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const end = new Date(forecast.harvestWindowEnd).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `${start} – ${end}`;
}

export function estimateFieldHealth(field: Field, scans: Scan[]): number {
  const fieldScans = scans.filter((scan) => scan.fieldId === field.id);
  if (!fieldScans.length) return 0;
  const total = fieldScans.reduce((acc, scan) => {
    const counts = scan.analysis.maturityCounts;
    const detected = counts.harvestReady + counts.nearlyReady + counts.developing;
    const weighted = counts.harvestReady * 1 + counts.nearlyReady * 0.75 + counts.developing * 0.55;
    return acc + (detected ? weighted / detected : 0);
  }, 0);
  return Math.max(0, Math.min(100, Math.round((total / fieldScans.length) * 100)));
}
