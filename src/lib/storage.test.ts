import { beforeEach, describe, expect, it } from 'vitest';
import { demoFields, demoScans } from '../data/demoData';
import { hydrateStorageIfEmpty, loadFields, loadScans, resetDemoData, saveFields } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates defaults when storage is empty', () => {
    hydrateStorageIfEmpty();
    expect(loadFields().length).toBe(demoFields.length);
    expect(loadScans().length).toBe(demoScans.length);
  });

  it('safely falls back when invalid json exists', () => {
    localStorage.setItem('cropsight.ai.fields', '{bad json');
    expect(loadFields().length).toBe(demoFields.length);
  });

  it('resets demo data after edits', () => {
    hydrateStorageIfEmpty();
    saveFields([]);
    expect(loadFields().length).toBe(0);
    resetDemoData();
    expect(loadFields().length).toBe(demoFields.length);
  });
});
