import * as ort from 'onnxruntime-web';

export type TomatoPrediction = {
  harvest_ready: number;
  nearly_ready: number;
  developing: number;
  mean_confidence: number;
  detections: Array<{ className: string; confidence: number; x: number; y: number; width: number; height: number }>;
};

const MODEL_URL = `${import.meta.env.BASE_URL}models/cropsight-tomato-maturity.onnx`;
const INPUT_SIZE = 640;
const CLASS_NAMES = ['harvest_ready', 'nearly_ready', 'developing'] as const;
let sessionPromise: Promise<ort.InferenceSession> | undefined;

async function getSession() {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });
  }
  return sessionPromise;
}

function iou(a: number[], b: number[]) {
  const left = Math.max(a[0], b[0]);
  const top = Math.max(a[1], b[1]);
  const right = Math.min(a[0] + a[2], b[0] + b[2]);
  const bottom = Math.min(a[1] + a[3], b[1] + b[3]);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a[2] * a[3] + b[2] * b[3] - intersection;
  return union > 0 ? intersection / union : 0;
}

export async function analyzeTomatoImage(file: File): Promise<TomatoPrediction> {
  const session = await getSession();
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser could not prepare the image.');
  context.fillStyle = 'rgb(114,114,114)';
  context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  context.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  bitmap.close();
  const pixels = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const input = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const plane = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0; i < plane; i += 1) {
    input[i] = pixels[i * 4] / 255;
    input[plane + i] = pixels[i * 4 + 1] / 255;
    input[2 * plane + i] = pixels[i * 4 + 2] / 255;
  }
  const inputName = session.inputNames[0];
  const outputs = await session.run({ [inputName]: new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]) });
  const output = outputs[session.outputNames[0]];
  if (!output || output.dims.length !== 3) throw new Error('The model returned an unsupported output shape.');
  const dims = output.dims;
  const data = output.data as Float32Array;
  let channels: number;
  let candidates: number;
  let channelFirst: boolean;
  if (dims[1] === 4 + CLASS_NAMES.length) {
    channels = dims[1]; candidates = dims[2]; channelFirst = true;
  } else if (dims[2] === 4 + CLASS_NAMES.length) {
    channels = dims[2]; candidates = dims[1]; channelFirst = false;
  } else {
    throw new Error(`Unexpected model output dimensions: ${dims.join(' × ')}`);
  }
  const at = (candidate: number, channel: number) =>
    channelFirst ? data[channel * candidates + candidate] : data[candidate * channels + channel];
  const raw: Array<{ classIndex: number; confidence: number; box: number[] }> = [];
  for (let i = 0; i < candidates; i += 1) {
    let classIndex = 0;
    let confidence = at(i, 4);
    for (let c = 1; c < CLASS_NAMES.length; c += 1) {
      const score = at(i, 4 + c);
      if (score > confidence) { confidence = score; classIndex = c; }
    }
    if (!Number.isFinite(confidence) || confidence < 0.25) continue;
    const cx = at(i, 0); const cy = at(i, 1);
    const width = at(i, 2); const height = at(i, 3);
    if (![cx, cy, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;
    raw.push({ classIndex, confidence, box: [cx - width / 2, cy - height / 2, width, height] });
  }
  raw.sort((a, b) => b.confidence - a.confidence);
  const kept: typeof raw = [];
  for (const item of raw) {
    if (kept.some((other) => other.classIndex === item.classIndex && iou(other.box, item.box) > 0.45)) continue;
    kept.push(item);
  }
  const counts = [0, 0, 0];
  for (const item of kept) counts[item.classIndex] += 1;
  const mean = kept.length ? kept.reduce((sum, item) => sum + item.confidence, 0) / kept.length : 0;
  return {
    harvest_ready: counts[0],
    nearly_ready: counts[1],
    developing: counts[2],
    mean_confidence: mean,
    detections: kept.map((item) => ({
      className: CLASS_NAMES[item.classIndex],
      confidence: item.confidence,
      x: Math.max(0, item.box[0] / INPUT_SIZE),
      y: Math.max(0, item.box[1] / INPUT_SIZE),
      width: Math.min(1, item.box[2] / INPUT_SIZE),
      height: Math.min(1, item.box[3] / INPUT_SIZE)
    }))
  };
}
