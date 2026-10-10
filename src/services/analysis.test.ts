import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiAnalysisAdapter, createMockAnalysisAdapter } from './analysis';

describe('analysis adapters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns deterministic mock analysis for same input', async () => {
    const adapter = createMockAnalysisAdapter();
    const file = new File(['x'], 'crop.png', { type: 'image/png' });

    const first = await adapter.analyzeCrop({ image: file, cropType: 'tomato', fieldId: 'field-1' });
    const second = await adapter.analyzeCrop({ image: file, cropType: 'tomato', fieldId: 'field-1' });

    expect(first.maturityCounts).toEqual(second.maturityCounts);
    expect(first.model.mode).toBe('demo');
  });

  it('calls api adapter endpoint with multipart payload', async () => {
    const fakeResponse = {
      detections: [],
      maturityCounts: { harvestReady: 1, nearlyReady: 2, developing: 3 },
      confidence: 90,
      forecast: {
        harvestWindowStart: new Date().toISOString(),
        harvestWindowEnd: new Date().toISOString(),
        confidenceLabel: 'medium',
        notes: 'ok'
      },
      model: { mode: 'api', version: 'v1' },
      warnings: [],
      createdAt: new Date().toISOString()
    };

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => fakeResponse
    } as Response);

    const adapter = createApiAnalysisAdapter('http://localhost:8000');
    const file = new File(['img'], 'scan.jpg', { type: 'image/jpeg' });
    const response = await adapter.analyzeCrop({ image: file, cropType: 'tomato', fieldId: 'field-north' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.model.mode).toBe('api');
  });
});
