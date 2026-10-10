import { describe, expect, it } from 'vitest';
import { demoScans } from '../data/demoData';
import { scansToCsv } from './csv';

describe('csv export', () => {
  it('escapes commas and quotes safely', () => {
    const csv = scansToCsv([
      {
        ...demoScans[0],
        fieldName: 'North, "Field"'
      }
    ]);

    expect(csv).toContain('"North, ""Field"""');
    expect(csv.split('\n')[0]).toContain('Scan ID');
  });
});
