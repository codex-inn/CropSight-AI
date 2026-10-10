import { defaultSettings, demoFields, demoScans } from '../data/demoData';
import type { AppSettings, Field, Scan } from '../domain/models';

type StoredEnvelope<T> = {
  version: number;
  updatedAt: string;
  data: T;
};

const NS = 'cropsight.ai';
const SCHEMA_VERSION = 1;

const keys = {
  fields: `${NS}.fields`,
  scans: `${NS}.scans`,
  settings: `${NS}.settings`
};

const safeJsonParse = <T>(input: string | null): T | null => {
  if (!input) return null;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();

function readEnvelope<T>(key: string): StoredEnvelope<T> | null {
  const parsed = safeJsonParse<StoredEnvelope<T> | T>(localStorage.getItem(key));
  if (!parsed) return null;
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed && 'data' in parsed) {
    return parsed.version === SCHEMA_VERSION
      ? parsed
      : { version: SCHEMA_VERSION, updatedAt: nowIso(), data: parsed.data };
  }
  return { version: SCHEMA_VERSION, updatedAt: nowIso(), data: parsed as T };
}

function writeEnvelope<T>(key: string, data: T) {
  const envelope: StoredEnvelope<T> = { version: SCHEMA_VERSION, updatedAt: nowIso(), data };
  localStorage.setItem(key, JSON.stringify(envelope));
}

const ensureArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export function loadFields(): Field[] {
  const env = readEnvelope<unknown>(keys.fields);
  if (!env) return demoFields;
  return ensureArray<Field>(env.data);
}

export function saveFields(fields: Field[]) {
  writeEnvelope(keys.fields, fields);
}

export function loadScans(): Scan[] {
  const env = readEnvelope<unknown>(keys.scans);
  if (!env) return demoScans;
  return ensureArray<Scan>(env.data);
}

export function saveScans(scans: Scan[]) {
  writeEnvelope(keys.scans, scans);
}

export function loadSettings(): AppSettings {
  const env = readEnvelope<unknown>(keys.settings);
  if (!env?.data || typeof env.data !== 'object') return defaultSettings;
  return {
    ...defaultSettings,
    ...(env.data as Partial<AppSettings>),
    schemaVersion: SCHEMA_VERSION
  };
}

export function saveSettings(settings: AppSettings) {
  writeEnvelope(keys.settings, { ...settings, schemaVersion: SCHEMA_VERSION });
}

export function hydrateStorageIfEmpty() {
  if (!readEnvelope<Field[]>(keys.fields)) saveFields(demoFields);
  if (!readEnvelope<Scan[]>(keys.scans)) saveScans(demoScans);
  if (!readEnvelope<AppSettings>(keys.settings)) saveSettings(defaultSettings);
}

export function resetDemoData() {
  saveFields(demoFields);
  saveScans(demoScans);
  saveSettings(defaultSettings);
}

export const storageMeta = {
  namespace: NS,
  version: SCHEMA_VERSION,
  keys
};
