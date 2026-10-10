import type { ScanRecord } from '../data/mockData';

export type Summary = {
  total: number;
  ready: number;
  nearly: number;
  developing: number;
  readyShare: number;
  nearlyShare: number;
  developingShare: number;
};

export function calculateSummary(scans: ScanRecord[]): Summary {
  const totals = scans.reduce(
    (acc, scan) => {
      acc.ready += scan.ready;
      acc.nearly += scan.nearlyReady;
      acc.developing += scan.developing;
      return acc;
    },
    { ready: 0, nearly: 0, developing: 0 }
  );

  const total = totals.ready + totals.nearly + totals.developing;

  return {
    total,
    ready: totals.ready,
    nearly: totals.nearly,
    developing: totals.developing,
    readyShare: total ? Math.round((totals.ready / total) * 100) : 0,
    nearlyShare: total ? Math.round((totals.nearly / total) * 100) : 0,
    developingShare: total ? Math.round((totals.developing / total) * 100) : 0
  };
}

export function getStatusTone(ready: number, nearlyReady: number, developing: number): string {
  if (ready >= nearlyReady && ready >= developing) return 'ready';
  if (nearlyReady >= ready && nearlyReady >= developing) return 'nearly';
  return 'developing';
}

export function getHarvestWindowText(ready: number, nearlyReady: number, developing: number): string {
  const total = ready + nearlyReady + developing;
  if (total === 0) return 'No forecast available';
  if (ready >= nearlyReady && ready >= developing) return 'October 15–18, 2026 · approximately 5–8 days';
  if (nearlyReady >= ready && nearlyReady >= developing) return 'October 17–20, 2026 · approximately 8–11 days';
  return 'October 20–25, 2026 · approximately 11–16 days';
}

export function csvFromSummary(scans: ScanRecord[]): string {
  const header = ['Scan ID', 'Field', 'Detected', 'Ready', 'Nearly Ready', 'Developing', 'Confidence', 'Date'];
  const rows = scans.map((scan) => [
    scan.id,
    scan.field,
    String(scan.ready + scan.nearlyReady + scan.developing),
    String(scan.ready),
    String(scan.nearlyReady),
    String(scan.developing),
    `${scan.confidence}%`,
    scan.date
  ]);

  return [header, ...rows].map((row) => row.join(',')).join('\n');
}
