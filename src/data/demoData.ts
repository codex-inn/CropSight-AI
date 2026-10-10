import type { AppSettings, Field, Scan, User } from '../domain/models';

const now = new Date().toISOString();

export const demoUser: User = {
  id: 'user-demo-alex',
  name: 'Alex Morgan',
  farmName: 'Green Valley Farm'
};

export const demoFields: Field[] = [
  {
    id: 'field-north',
    name: 'North Field',
    crop: 'tomato',
    variety: 'Roma',
    acreage: 12.4,
    plantingDate: '2026-07-22',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'field-east',
    name: 'East Field',
    crop: 'tomato',
    variety: 'Cherry',
    acreage: 8.7,
    plantingDate: '2026-08-03',
    createdAt: now,
    updatedAt: now
  }
];

export const demoScans: Scan[] = [
  {
    id: 'scan-cs-0248',
    fieldId: 'field-north',
    fieldName: 'North Field',
    cropType: 'tomato',
    fileName: 'north-row-04.jpg',
    createdAt: '2026-10-10T09:42:00.000Z',
    analysis: {
      detections: [],
      maturityCounts: { harvestReady: 5, nearlyReady: 4, developing: 3 },
      confidence: 94,
      forecast: {
        harvestWindowStart: '2026-10-15',
        harvestWindowEnd: '2026-10-18',
        confidenceLabel: 'high',
        notes: 'High share of harvest-ready tomatoes in this scan.'
      },
      model: { mode: 'demo', version: 'demo-v1' },
      warnings: ['Demo result generated from deterministic mock inference.'],
      createdAt: '2026-10-10T09:42:00.000Z'
    }
  },
  {
    id: 'scan-cs-0247',
    fieldId: 'field-east',
    fieldName: 'East Field',
    cropType: 'tomato',
    fileName: 'east-row-12.jpg',
    createdAt: '2026-10-10T08:16:00.000Z',
    analysis: {
      detections: [],
      maturityCounts: { harvestReady: 3, nearlyReady: 9, developing: 6 },
      confidence: 91,
      forecast: {
        harvestWindowStart: '2026-10-17',
        harvestWindowEnd: '2026-10-20',
        confidenceLabel: 'medium',
        notes: 'Nearly-ready tomatoes are dominant in this sample.'
      },
      model: { mode: 'demo', version: 'demo-v1' },
      warnings: ['Demo result generated from deterministic mock inference.'],
      createdAt: '2026-10-10T08:16:00.000Z'
    }
  }
];

export const defaultSettings: AppSettings = {
  schemaVersion: 1,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || null,
  maxUploadMb: 10,
  lowConfidenceThreshold: 75,
  preferredCrop: 'tomato'
};
