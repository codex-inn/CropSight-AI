export type FieldEntry = {
  name: string;
  crop: string;
  variety: string;
  health: number;
  lastScanned: string;
  acres: string;
  scans: number;
};

export type ScanRecord = {
  id: string;
  field: string;
  ready: number;
  nearlyReady: number;
  developing: number;
  confidence: number;
  date: string;
};

export const dashboardMetrics = [
  { label: 'Total scans', value: '248', change: 12.4, icon: '⌁', tone: 'green' },
  { label: 'Harvest-ready', value: '42', change: 8.7, icon: '◉', tone: 'tomato' },
  { label: 'Nearly ready', value: '67', change: 2.1, icon: '◌', tone: 'amber' },
  { label: 'Developing', value: '139', change: 5.2, icon: '◍', tone: 'blue' }
];

export const fieldData: FieldEntry[] = [
  {
    name: 'North Field',
    crop: 'Tomato',
    variety: 'Roma',
    health: 86,
    lastScanned: '2h ago',
    acres: '12.4',
    scans: 248
  },
  {
    name: 'East Field',
    crop: 'Tomato',
    variety: 'Cherry',
    health: 73,
    lastScanned: '5h ago',
    acres: '8.7',
    scans: 96
  }
];

export const recentScans: ScanRecord[] = [
  {
    id: 'CS-0248',
    field: 'North Field · Row 04',
    ready: 5,
    nearlyReady: 4,
    developing: 3,
    confidence: 94,
    date: 'Today, 9:42 AM'
  },
  {
    id: 'CS-0247',
    field: 'East Field · Row 12',
    ready: 3,
    nearlyReady: 9,
    developing: 6,
    confidence: 91,
    date: 'Today, 8:16 AM'
  },
  {
    id: 'CS-0246',
    field: 'North Field · Row 02',
    ready: 2,
    nearlyReady: 4,
    developing: 8,
    confidence: 89,
    date: 'Yesterday, 4:28 PM'
  }
];

export const reportSummary = {
  totalScans: 248,
  activeFields: 2,
  harvestReady: 42,
  harvestWindow: 'October 15–18'
};

export const sampleScanResult = {
  ready: 5,
  nearlyReady: 4,
  developing: 3,
  confidence: 94,
  date: 'Today, 9:52 AM'
};
