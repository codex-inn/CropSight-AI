import type { AnalysisRequest, AnalysisResponse, Detection, DetectionStage } from '../domain/models';

export type AnalysisAdapter = {
  mode: 'demo' | 'api';
  analyzeCrop: (request: AnalysisRequest) => Promise<AnalysisResponse>;
};

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);

const hashString = (text: string) =>
  text.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 100000, 7);

function buildDetections(seed: number, total: number): Detection[] {
  const stages: DetectionStage[] = ['harvest-ready', 'nearly-ready', 'developing'];
  return Array.from({ length: total }, (_, index) => {
    const stage = stages[(seed + index) % stages.length];
    return {
      id: `det-${seed}-${index}`,
      stage,
      confidence: 72 + ((seed + index * 13) % 26),
      bbox: {
        x: 0.1 + ((seed + index) % 4) * 0.15,
        y: 0.08 + ((seed + index * 3) % 3) * 0.2,
        width: 0.2,
        height: 0.22
      }
    };
  });
}

const summarize = (detections: Detection[]) => ({
  harvestReady: detections.filter((item) => item.stage === 'harvest-ready').length,
  nearlyReady: detections.filter((item) => item.stage === 'nearly-ready').length,
  developing: detections.filter((item) => item.stage === 'developing').length
});

const buildForecast = (counts: ReturnType<typeof summarize>) => {
  const now = new Date();
  const offset = counts.harvestReady >= counts.nearlyReady ? 5 : counts.nearlyReady >= counts.developing ? 8 : 12;
  const start = new Date(now);
  start.setDate(now.getDate() + offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 3);

  return {
    harvestWindowStart: start.toISOString(),
    harvestWindowEnd: end.toISOString(),
    confidenceLabel: (counts.harvestReady >= counts.developing ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    notes: 'Forecast generated from deterministic demo analysis. Validate in-field before harvest decisions.'
  };
};

export function createMockAnalysisAdapter(): AnalysisAdapter {
  return {
    mode: 'demo',
    async analyzeCrop(request) {
      const seed = hashString(`${request.image.name}-${request.image.size}-${request.fieldId}`);
      const total = 8 + (seed % 7);
      const detections = buildDetections(seed, total);
      const maturityCounts = summarize(detections);
      const confidence = Math.round(detections.reduce((acc, row) => acc + row.confidence, 0) / detections.length);

      return {
        detections,
        maturityCounts,
        confidence,
        forecast: buildForecast(maturityCounts),
        model: { mode: 'demo', version: 'deterministic-mock-v1' },
        warnings: [
          'Demo mode: this is not a trained production model.',
          'Do not use this analysis as the sole basis for agricultural decisions.'
        ],
        createdAt: new Date().toISOString()
      };
    }
  };
}

export function createApiAnalysisAdapter(apiBaseUrl: string): AnalysisAdapter {
  const cleaned = apiBaseUrl.replace(/\/$/, '');
  return {
    mode: 'api',
    async analyzeCrop(request) {
      if (!allowedMime.has(request.image.type)) {
        throw new Error('Unsupported image type. Upload JPG, PNG, or WEBP.');
      }

      const form = new FormData();
      form.append('image', request.image);
      form.append('crop_type', request.cropType);
      form.append('field_id', request.fieldId);
      if (request.location?.latitude !== undefined) form.append('latitude', String(request.location.latitude));
      if (request.location?.longitude !== undefined) form.append('longitude', String(request.location.longitude));

      const response = await fetch(`${cleaned}/api/v1/analyze`, {
        method: 'POST',
        body: form
      });

      if (!response.ok) {
        const reason = await response.text();
        throw new Error(reason || 'Analysis request failed.');
      }

      const payload = (await response.json()) as AnalysisResponse;
      return payload;
    }
  };
}

export function createAnalysisAdapter(): AnalysisAdapter {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (baseUrl) {
    return createApiAnalysisAdapter(baseUrl);
  }
  return createMockAnalysisAdapter();
}
