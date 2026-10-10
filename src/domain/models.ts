export type CropType = 'tomato';

export type User = {
  id: string;
  name: string;
  farmName: string;
};

export type Field = {
  id: string;
  name: string;
  crop: CropType;
  variety: string;
  acreage: number;
  plantingDate: string;
  createdAt: string;
  updatedAt: string;
};

export type DetectionStage = 'harvest-ready' | 'nearly-ready' | 'developing';

export type Detection = {
  id: string;
  stage: DetectionStage;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
};

export type Forecast = {
  harvestWindowStart: string;
  harvestWindowEnd: string;
  confidenceLabel: 'low' | 'medium' | 'high';
  notes: string;
};

export type AnalysisRequest = {
  image: File;
  cropType: CropType;
  fieldId: string;
  location?: { latitude?: number; longitude?: number };
};

export type AnalysisResponse = {
  detections: Detection[];
  maturityCounts: {
    harvestReady: number;
    nearlyReady: number;
    developing: number;
  };
  confidence: number;
  forecast: Forecast;
  model: {
    mode: 'demo' | 'api';
    version: string;
  };
  warnings: string[];
  createdAt: string;
};

export type Scan = {
  id: string;
  fieldId: string;
  fieldName: string;
  cropType: CropType;
  fileName: string;
  createdAt: string;
  analysis: AnalysisResponse;
};

export type Report = {
  generatedAt: string;
  totalScans: number;
  activeFields: number;
  maturityTotals: {
    harvestReady: number;
    nearlyReady: number;
    developing: number;
  };
};

export type AppSettings = {
  schemaVersion: number;
  apiBaseUrl: string | null;
  maxUploadMb: number;
  lowConfidenceThreshold: number;
  preferredCrop: CropType;
};
