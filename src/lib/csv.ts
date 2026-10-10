import type { Scan } from '../domain/models';

const escapeCell = (value: string | number): string => {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

export function scansToCsv(scans: Scan[]): string {
  const header = ['Scan ID', 'Field', 'File', 'Detected', 'Ready', 'Nearly Ready', 'Developing', 'Confidence', 'Model Mode', 'Created At'];
  const rows = scans.map((scan) => {
    const counts = scan.analysis.maturityCounts;
    return [
      scan.id,
      scan.fieldName,
      scan.fileName,
      counts.harvestReady + counts.nearlyReady + counts.developing,
      counts.harvestReady,
      counts.nearlyReady,
      counts.developing,
      `${scan.analysis.confidence}%`,
      scan.analysis.model.mode,
      new Date(scan.createdAt).toISOString()
    ].map(escapeCell);
  });
  return [header.map(escapeCell), ...rows].map((row) => row.join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
