import { useEffect, useMemo, useRef, useState } from 'react';
import { demoUser } from './data/demoData';
import type { AnalysisResponse, AppSettings, Field, Scan } from './domain/models';
import { buildReport, calculateSummary, estimateFieldHealth, getDominantStage, getHarvestWindowText } from './lib/analytics';
import { downloadCsv, scansToCsv } from './lib/csv';
import {
  hydrateStorageIfEmpty,
  loadFields,
  loadScans,
  loadSettings,
  resetDemoData,
  saveFields,
  saveScans,
  saveSettings,
  storageMeta
} from './lib/storage';
import { createAnalysisAdapter } from './services/analysis';

type ViewName = 'dashboard' | 'scan' | 'fields' | 'history' | 'reports' | 'settings';

type FieldForm = {
  id?: string;
  name: string;
  crop: 'tomato';
  variety: string;
  acreage: string;
  plantingDate: string;
};

const navItems: { id: ViewName; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'scan', label: 'Scan crop', icon: '⌁' },
  { id: 'fields', label: 'My fields', icon: '⌖' },
  { id: 'history', label: 'Scan history', icon: '◷' },
  { id: 'reports', label: 'Reports', icon: '▤' },
  { id: 'settings', label: 'Settings / Help', icon: '?' }
];

const emptyFieldForm: FieldForm = { name: '', crop: 'tomato', variety: '', acreage: '', plantingDate: '' };

const PAGE_SIZE = 8;

function formatDateTime(dateIso: string) {
  return new Date(dateIso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function App() {
  const [currentView, setCurrentView] = useState<ViewName>('dashboard');
  const [fields, setFields] = useState<Field[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [lastResult, setLastResult] = useState<AnalysisResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState('Ready. Upload a crop image to start analysis.');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyFieldForm);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);

  const [historySearch, setHistorySearch] = useState('');
  const [historyFieldFilter, setHistoryFieldFilter] = useState('all');
  const [historyMaturityFilter, setHistoryMaturityFilter] = useState<'all' | 'ready' | 'nearly' | 'developing'>('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const adapter = useMemo(() => createAnalysisAdapter(), []);

  useEffect(() => {
    hydrateStorageIfEmpty();
    const loadedFields = loadFields();
    const loadedScans = loadScans();
    const loadedSettings = loadSettings();
    setFields(loadedFields);
    setScans(loadedScans);
    setSettings(loadedSettings);
    setSelectedFieldId(loadedFields[0]?.id ?? '');
  }, []);

  useEffect(() => {
    saveFields(fields);
  }, [fields]);

  useEffect(() => {
    saveScans(scans);
  }, [scans]);

  useEffect(() => {
    if (!settings) return;
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!selectedFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const summary = useMemo(() => calculateSummary(scans), [scans]);
  const report = useMemo(() => buildReport(scans, fields), [scans, fields]);
  const selectedScan = useMemo(() => scans.find((scan) => scan.id === selectedScanId) ?? null, [scans, selectedScanId]);

  const filteredScans = useMemo(() => {
    const lower = historySearch.trim().toLowerCase();
    return scans
      .filter((scan) => {
        if (historyFieldFilter !== 'all' && scan.fieldId !== historyFieldFilter) return false;
        const dominant = getDominantStage(scan);
        if (historyMaturityFilter !== 'all' && dominant !== historyMaturityFilter) return false;
        if (!lower) return true;
        return [scan.id, scan.fieldName, scan.fileName].some((v) => v.toLowerCase().includes(lower));
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [historyFieldFilter, historyMaturityFilter, historySearch, scans]);

  const pageCount = Math.max(1, Math.ceil(filteredScans.length / PAGE_SIZE));
  const pagedScans = filteredScans.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyFieldFilter, historyMaturityFilter]);

  const onFileChosen = (file: File | null) => {
    setScanError(null);
    if (!file) return;
    const maxMb = settings?.maxUploadMb ?? 10;
    const maxBytes = maxMb * 1024 * 1024;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {
      setScanError('Unsupported file type. Use JPG, PNG, or WEBP.');
      setStatusMessage('Upload failed: unsupported file type.');
      return;
    }

    if (file.size > maxBytes) {
      setScanError(`File too large. Maximum size is ${maxMb} MB.`);
      setStatusMessage('Upload failed: file size exceeded limit.');
      return;
    }

    setSelectedFile(file);
    setLastResult(null);
    setStatusMessage(`Selected ${file.name}. Ready to analyze.`);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onFileChosen(event.dataTransfer.files?.[0] ?? null);
  };

  const openFieldForm = (field?: Field) => {
    if (field) {
      setFieldForm({
        id: field.id,
        name: field.name,
        crop: field.crop,
        variety: field.variety,
        acreage: String(field.acreage),
        plantingDate: field.plantingDate
      });
    } else {
      setFieldForm(emptyFieldForm);
    }
    setFieldError(null);
    setFieldModalOpen(true);
  };

  const submitField = (event: React.FormEvent) => {
    event.preventDefault();
    const acreage = Number(fieldForm.acreage);
    if (!fieldForm.name.trim() || !fieldForm.variety.trim()) {
      setFieldError('Field name and variety are required.');
      return;
    }
    if (!Number.isFinite(acreage) || acreage <= 0) {
      setFieldError('Acreage must be greater than zero.');
      return;
    }
    if (!fieldForm.plantingDate) {
      setFieldError('Planting date is required.');
      return;
    }

    const now = new Date().toISOString();
    if (fieldForm.id) {
      setFields((prev) =>
        prev.map((field) =>
          field.id === fieldForm.id
            ? {
                ...field,
                name: fieldForm.name.trim(),
                variety: fieldForm.variety.trim(),
                acreage,
                plantingDate: fieldForm.plantingDate,
                updatedAt: now
              }
            : field
        )
      );
    } else {
      const newField: Field = {
        id: `field-${crypto.randomUUID()}`,
        name: fieldForm.name.trim(),
        crop: 'tomato',
        variety: fieldForm.variety.trim(),
        acreage,
        plantingDate: fieldForm.plantingDate,
        createdAt: now,
        updatedAt: now
      };
      setFields((prev) => [newField, ...prev]);
      setSelectedFieldId((current) => current || newField.id);
    }

    setFieldModalOpen(false);
    setFieldForm(emptyFieldForm);
  };

  const deleteField = (fieldId: string) => {
    setFields((prev) => {
      const next = prev.filter((field) => field.id !== fieldId);
      if (selectedFieldId === fieldId) setSelectedFieldId(next[0]?.id ?? '');
      return next;
    });
    setScans((prev) => prev.filter((scan) => scan.fieldId !== fieldId));
  };

  const analyzeCrop = async () => {
    if (!selectedFile || !selectedFieldId) {
      setScanError('Choose an image and a field before analysis.');
      return;
    }

    const activeField = fields.find((field) => field.id === selectedFieldId);
    if (!activeField) {
      setScanError('Selected field no longer exists.');
      return;
    }

    setScanLoading(true);
    setScanError(null);
    setStatusMessage('Analyzing crop image. Please wait.');

    try {
      const analysis = await adapter.analyzeCrop({
        image: selectedFile,
        cropType: activeField.crop,
        fieldId: activeField.id
      });

      const newScan: Scan = {
        id: `scan-${crypto.randomUUID()}`,
        fieldId: activeField.id,
        fieldName: activeField.name,
        cropType: activeField.crop,
        fileName: selectedFile.name,
        createdAt: analysis.createdAt,
        analysis
      };

      setScans((prev) => [newScan, ...prev]);
      setLastResult(analysis);
      setStatusMessage('Analysis complete. Scan saved to history.');
      setCurrentView('scan');
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Analysis failed.');
      setStatusMessage('Analysis failed. Please retry.');
    } finally {
      setScanLoading(false);
    }
  };

  const removeScan = (scanId: string) => setScans((prev) => prev.filter((scan) => scan.id !== scanId));

  const clearHistory = () => {
    setScans([]);
    saveScans([]);
    setSelectedScanId(null);
  };

  const runResetDemo = () => {
    resetDemoData();
    setFields(loadFields());
    setScans(loadScans());
    setSettings(loadSettings());
    setStatusMessage('Demo data restored from defaults.');
  };

  const printReport = () => window.print();

  const hasFields = fields.length > 0;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-mark">✦</span>
          <div>
            <strong>CropSight</strong>
            <small>See Your Crop. Know Your Harvest.</small>
          </div>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-button ${currentView === item.id ? 'active' : ''}`} onClick={() => setCurrentView(item.id)} type="button">
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note" role="status" aria-live="polite">
          <span className="pulse"></span>
          <div>
            <strong>{adapter.mode === 'api' ? 'API analysis mode' : 'Demo analysis mode'}</strong>
            <small>{adapter.mode === 'api' ? 'Using backend endpoint' : 'Deterministic mock fallback active'}</small>
          </div>
        </div>

        <div className="profile-box">
          <div className="avatar">AM</div>
          <div>
            <strong>{demoUser.name}</strong>
            <small>{demoUser.farmName}</small>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="crumbs">
            <span>Workspace</span>
            <span>/</span>
            <strong>{navItems.find((item) => item.id === currentView)?.label ?? 'Dashboard'}</strong>
          </div>
          <div className="top-actions">
            <span className="pill" aria-label="model mode badge">
              {adapter.mode === 'api' ? 'API mode' : 'Demo mode'}
            </span>
          </div>
        </header>

        <p className="sr-only" aria-live="polite">{statusMessage}</p>

        {currentView === 'dashboard' && (
          <section className="page-section">
            <div className="hero-panel">
              <div>
                <p className="eyebrow">Dashboard overview</p>
                <h1>Good morning, Alex.</h1>
                <p className="subtle">Live metrics are calculated from your persisted scan history.</p>
              </div>
              <button type="button" className="primary-button" onClick={() => setCurrentView('scan')}>
                + Scan a crop
              </button>
            </div>

            <div className="metrics-grid">
              <article className="metric-card">
                <div className="metric-icon green">⌁</div>
                <span>Total scans</span>
                <strong>{summary.totalScans}</strong>
              </article>
              <article className="metric-card">
                <div className="metric-icon tomato">◉</div>
                <span>Harvest-ready detections</span>
                <strong>{summary.ready}</strong>
              </article>
              <article className="metric-card">
                <div className="metric-icon amber">◌</div>
                <span>Nearly-ready detections</span>
                <strong>{summary.nearly}</strong>
              </article>
              <article className="metric-card">
                <div className="metric-icon blue">◍</div>
                <span>Average confidence</span>
                <strong>{summary.avgConfidence}%</strong>
              </article>
            </div>

            <div className="two-column">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Forecast summary</p>
                    <h2>Harvest timing</h2>
                  </div>
                </div>
                <p>
                  Current maturity mix from {summary.totalDetections} detections indicates a peak window around{' '}
                  {scans[0] ? getHarvestWindowText(scans[0].analysis.forecast) : 'not enough data'}.
                </p>
                <p className="small-note">Always validate with in-field observation and agronomy expertise.</p>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Recent scans</p>
                    <h2>Latest activity</h2>
                  </div>
                  <button className="text-button" type="button" onClick={() => setCurrentView('history')}>
                    View all →
                  </button>
                </div>
                <div className="activity-list">
                  {scans.slice(0, 4).map((scan) => (
                    <div key={scan.id} className="activity-item">
                      <span className={`crop-bullet ${getDominantStage(scan)}`} />
                      <div>
                        <strong>{scan.fieldName}</strong>
                        <small>{formatDateTime(scan.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                  {!scans.length && <p>No scans yet. Go to “Scan crop” to create your first analysis.</p>}
                </div>
              </article>
            </div>

            <div className="section-heading">
              <div>
                <p className="eyebrow">Field health</p>
                <h2>Your fields</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setCurrentView('fields')}>
                Manage fields
              </button>
            </div>

            <div className="field-grid">
              {fields.map((field) => {
                const fieldScanCount = scans.filter((scan) => scan.fieldId === field.id).length;
                const health = estimateFieldHealth(field, scans);
                return (
                  <article key={field.id} className="field-card">
                    <div className="field-top">
                      <div>
                        <span className="field-badge">● Monitoring</span>
                        <h3>{field.name}</h3>
                        <small>
                          {field.crop} · {field.variety}
                        </small>
                      </div>
                    </div>
                    <div className="field-health">
                      <div>
                        <span>Field health</span>
                        <strong>{health}%</strong>
                      </div>
                      <div className="progress-track">
                        <i style={{ width: `${health}%` }} />
                      </div>
                    </div>
                    <div className="field-footer">
                      <span>{field.acreage} acres</span>
                      <span>{fieldScanCount} scans</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {currentView === 'scan' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <p className="eyebrow">Crop analysis</p>
                <h1>Scan a crop</h1>
                <p>Upload or capture a tomato image, then run analysis. Demo mode is clearly labeled and not production accuracy.</p>
              </div>
            </div>

            <div className="scan-layout">
              <article className="panel upload-panel">
                <label htmlFor="field-picker">Field</label>
                <select id="field-picker" className="text-input" value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)}>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>

                <div
                  className="drop-zone"
                  onDrop={handleDrop}
                  onDragOver={(event) => event.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Drop image here or press enter to browse files"
                >
                  {!previewUrl ? (
                    <>
                      <div className="upload-icon">⇪</div>
                      <h2>Drop an image here</h2>
                      <p>or choose a photo from your device</p>
                    </>
                  ) : (
                    <div className="preview-box">
                      <img src={previewUrl} alt="Selected crop preview" />
                      <button type="button" className="remove-button" onClick={() => setSelectedFile(null)}>
                        Remove image
                      </button>
                    </div>
                  )}
                </div>

                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                    Choose image
                  </button>
                  <button type="button" className="secondary-button" onClick={() => cameraInputRef.current?.click()}>
                    Capture photo
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Upload crop image"
                  onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  aria-label="Capture crop image"
                  onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
                />

                {scanError && <p className="error-text">{scanError}</p>}

                <button type="button" className="primary-button full-width" onClick={analyzeCrop} disabled={scanLoading || !selectedFile || !hasFields}>
                  {scanLoading ? 'Analyzing…' : 'Analyze crop'}
                </button>

                {scanError && (
                  <button type="button" className="ghost-button full-width" onClick={analyzeCrop}>
                    Retry analysis
                  </button>
                )}
              </article>

              <article className="panel side-panel">
                <p className="eyebrow">Mode and disclaimer</p>
                <h2>Analysis boundary</h2>
                <p className="small-note">
                  Current mode: <strong>{adapter.mode === 'api' ? 'API' : 'Demo'}</strong>. CropSight AI is decision support only and must not replace field inspection.
                </p>
                <div className="demo-box">
                  <strong>Important agricultural disclaimer</strong>
                  <p>Predictions can be wrong under lighting, occlusion, cultivar differences, and weather variation. Always confirm with qualified growers.</p>
                </div>
              </article>
            </div>

            {lastResult && (
              <article className="panel analysis-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Analysis complete</p>
                    <h2>Maturity overview</h2>
                  </div>
                  <span className="pill">Confidence {lastResult.confidence}%</span>
                </div>

                <div className="result-grid">
                  <div className="result-stat">
                    <strong>{lastResult.detections.length}</strong>
                    <small>Total detections</small>
                  </div>
                  <div className="result-stat">
                    <strong>{lastResult.maturityCounts.harvestReady}</strong>
                    <small>Harvest-ready</small>
                  </div>
                  <div className="result-stat">
                    <strong>{lastResult.maturityCounts.nearlyReady}</strong>
                    <small>Nearly ready</small>
                  </div>
                  <div className="result-stat">
                    <strong>{lastResult.maturityCounts.developing}</strong>
                    <small>Developing</small>
                  </div>
                </div>

                <div className="result-footer">
                  <div>
                    <strong>Forecast window</strong>
                    <p>{getHarvestWindowText(lastResult.forecast)}</p>
                  </div>
                  <span className="status-tag ready">Model {lastResult.model.mode} · {lastResult.model.version}</span>
                </div>

                {lastResult.confidence < (settings?.lowConfidenceThreshold ?? 75) && (
                  <p className="warning-text">Low confidence warning: review this scan manually before planning harvest operations.</p>
                )}
                <p className="small-note">{lastResult.warnings.join(' ')}</p>
              </article>
            )}
          </section>
        )}

        {currentView === 'fields' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <p className="eyebrow">Field management</p>
                <h1>My fields</h1>
                <p>Add, edit, or delete fields. Data is stored locally in your browser using namespaced keys.</p>
              </div>
              <button type="button" className="primary-button" onClick={() => openFieldForm()}>
                + Add field
              </button>
            </div>

            {!fields.length ? (
              <article className="panel">
                <h2>No fields yet</h2>
                <p>Create your first field to start crop scans.</p>
              </article>
            ) : (
              <div className="field-grid large">
                {fields.map((field) => {
                  const scanCount = scans.filter((scan) => scan.fieldId === field.id).length;
                  const health = estimateFieldHealth(field, scans);
                  return (
                    <article key={field.id} className="field-card">
                      <div className="field-top">
                        <div>
                          <span className="field-badge">● {field.crop}</span>
                          <h3>{field.name}</h3>
                          <small>
                            {field.variety} · planted {field.plantingDate}
                          </small>
                        </div>
                      </div>
                      <div className="field-health">
                        <div>
                          <span>Field health</span>
                          <strong>{health}%</strong>
                        </div>
                        <div className="progress-track">
                          <i style={{ width: `${health}%` }} />
                        </div>
                      </div>
                      <div className="field-footer">
                        <span>{field.acreage} acres</span>
                        <span>{scanCount} scans</span>
                      </div>
                      <div className="button-row">
                        <button type="button" className="ghost-button" onClick={() => openFieldForm(field)}>
                          Edit
                        </button>
                        <button type="button" className="ghost-button" onClick={() => deleteField(field.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {currentView === 'history' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <p className="eyebrow">Scan records</p>
                <h1>Scan history</h1>
                <p>Search and filter persisted scans with detail view and cleanup actions.</p>
              </div>
              <button type="button" className="secondary-button" onClick={clearHistory} disabled={!scans.length}>
                Clear history
              </button>
            </div>

            <article className="panel history-panel">
              <div className="table-toolbar">
                <div className="search-box">
                  ⌕{' '}
                  <input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} aria-label="Search scans" placeholder="Search by scan, field, or file" />
                </div>
                <select className="text-input small-input" value={historyFieldFilter} onChange={(e) => setHistoryFieldFilter(e.target.value)}>
                  <option value="all">All fields</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
                <select
                  className="text-input small-input"
                  value={historyMaturityFilter}
                  onChange={(e) => setHistoryMaturityFilter(e.target.value as 'all' | 'ready' | 'nearly' | 'developing')}
                >
                  <option value="all">All maturity</option>
                  <option value="ready">Ready</option>
                  <option value="nearly">Nearly</option>
                  <option value="developing">Developing</option>
                </select>
              </div>

              {!pagedScans.length ? (
                <div className="empty-state">No scan records match this filter.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Scan</th>
                        <th>Field</th>
                        <th>Detected</th>
                        <th>Confidence</th>
                        <th>Mode</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedScans.map((scan) => {
                        const counts = scan.analysis.maturityCounts;
                        const total = counts.harvestReady + counts.nearlyReady + counts.developing;
                        return (
                          <tr key={scan.id}>
                            <td>
                              <span className="scan-id">{scan.id.slice(0, 12)}</span>
                            </td>
                            <td>{scan.fieldName}</td>
                            <td>{total} tomatoes</td>
                            <td>{scan.analysis.confidence}%</td>
                            <td>{scan.analysis.model.mode}</td>
                            <td>{formatDateTime(scan.createdAt)}</td>
                            <td>
                              <button type="button" className="text-button" onClick={() => setSelectedScanId(scan.id)}>
                                Details
                              </button>
                              <button type="button" className="text-button" onClick={() => removeScan(scan.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pagination-row">
                <button type="button" className="ghost-button small" disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>
                  Prev
                </button>
                <span>
                  Page {historyPage} of {pageCount}
                </span>
                <button type="button" className="ghost-button small" disabled={historyPage >= pageCount} onClick={() => setHistoryPage((p) => Math.min(pageCount, p + 1))}>
                  Next
                </button>
              </div>
            </article>

            {selectedScan && (
              <article className="panel" aria-live="polite">
                <div className="panel-header">
                  <h2>Scan detail</h2>
                  <button type="button" className="ghost-button" onClick={() => setSelectedScanId(null)}>
                    Close
                  </button>
                </div>
                <p>
                  <strong>Field:</strong> {selectedScan.fieldName}
                </p>
                <p>
                  <strong>File:</strong> {selectedScan.fileName}
                </p>
                <p>
                  <strong>Forecast:</strong> {getHarvestWindowText(selectedScan.analysis.forecast)}
                </p>
                <p>
                  <strong>Warnings:</strong> {selectedScan.analysis.warnings.join(' ')}
                </p>
              </article>
            )}
          </section>
        )}

        {currentView === 'reports' && (
          <section className="page-section print-area">
            <div className="page-header">
              <div>
                <p className="eyebrow">Insights and exports</p>
                <h1>Reports</h1>
                <p>Generated from persisted scans and fields. Export CSV or print this report view.</p>
              </div>
              <div className="button-row">
                <button type="button" className="secondary-button" onClick={() => downloadCsv('cropsight-report.csv', scansToCsv(scans))}>
                  ↓ Download CSV
                </button>
                <button type="button" className="primary-button" onClick={printReport}>
                  Print report
                </button>
              </div>
            </div>

            <div className="report-grid">
              <article className="panel report-card green-panel">
                <p className="eyebrow">Summary card</p>
                <h2>{report.totalScans} scans recorded</h2>
                <p>{report.activeFields} active fields with tomato monitoring.</p>
              </article>
              <article className="panel report-card tomato-panel">
                <p className="eyebrow">Forecast card</p>
                <h2>{summary.readyShare}% harvest-ready share</h2>
                <p>Average model confidence across scans: {summary.avgConfidence}%.</p>
              </article>
            </div>

            <article className="panel summary-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Maturity distribution</p>
                  <h2>Current crop mix</h2>
                </div>
                <span className="pill">{summary.totalDetections} detections</span>
              </div>

              <div className="distribution-list">
                <div>
                  <div className="label-row">
                    <span>
                      <i className="legend ready-dot" />Harvest-ready
                    </span>
                    <strong>{summary.readyShare}%</strong>
                  </div>
                  <div className="meter">
                    <i style={{ width: `${summary.readyShare}%`, background: '#e76f51' }} />
                  </div>
                </div>
                <div>
                  <div className="label-row">
                    <span>
                      <i className="legend nearly-dot" />Nearly ready
                    </span>
                    <strong>{summary.nearlyShare}%</strong>
                  </div>
                  <div className="meter">
                    <i style={{ width: `${summary.nearlyShare}%`, background: '#e9b949' }} />
                  </div>
                </div>
                <div>
                  <div className="label-row">
                    <span>
                      <i className="legend developing-dot" />Developing
                    </span>
                    <strong>{summary.developingShare}%</strong>
                  </div>
                  <div className="meter">
                    <i style={{ width: `${summary.developingShare}%`, background: '#72a98f' }} />
                  </div>
                </div>
              </div>
            </article>
          </section>
        )}

        {currentView === 'settings' && settings && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <p className="eyebrow">Settings and help</p>
                <h1>Settings / Help</h1>
                <p>Understand mode, storage, and API contract guidance.</p>
              </div>
            </div>

            <article className="panel">
              <h2>Runtime mode</h2>
              <p>
                Current mode: <strong>{adapter.mode === 'api' ? 'API' : 'Demo'}</strong>
              </p>
              <p>
                Configured API base URL: <code>{settings.apiBaseUrl ?? 'Not configured'}</code>
              </p>
              <p className="small-note">No secrets are stored in localStorage. Do not put API keys in client environment variables.</p>
            </article>

            <article className="panel">
              <h2>Model disclaimer</h2>
              <p>
                CropSight AI provides decision support, not guaranteed agronomic truth. Treat all outputs as advisory and validate with field inspection.
              </p>
              <h3>Privacy and storage</h3>
              <p>
                Data is persisted only in your browser under namespace <code>{storageMeta.namespace}</code> with schema metadata version {storageMeta.version}.
                Clearing browser storage removes records.
              </p>
              <button type="button" className="secondary-button" onClick={runResetDemo}>
                Reset demo data
              </button>
            </article>

            <article className="panel">
              <h2>Keyboard and accessibility guidance</h2>
              <ul>
                <li>Use Tab/Shift+Tab to move through controls.</li>
                <li>Press Enter/Space on upload drop-zone to open file picker.</li>
                <li>Status updates are announced in a live region.</li>
              </ul>
              <h3>API contract guidance</h3>
              <p>
                POST <code>/api/v1/analyze</code> as multipart form-data with <code>image</code>, <code>crop_type</code>, <code>field_id</code>, optional <code>latitude</code>/<code>longitude</code>.
                Response includes detections, maturity counts, confidence, forecast, model mode/version, warnings, and timestamp.
              </p>
            </article>
          </section>
        )}
      </main>

      {fieldModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Field form dialog">
          <form className="modal-card" onSubmit={submitField}>
            <h2>{fieldForm.id ? 'Edit field' : 'Add field'}</h2>
            <label>
              Name
              <input className="text-input" value={fieldForm.name} onChange={(e) => setFieldForm((prev) => ({ ...prev, name: e.target.value }))} />
            </label>
            <label>
              Crop
              <input className="text-input" value="tomato" disabled />
            </label>
            <label>
              Variety
              <input className="text-input" value={fieldForm.variety} onChange={(e) => setFieldForm((prev) => ({ ...prev, variety: e.target.value }))} />
            </label>
            <label>
              Acreage
              <input className="text-input" type="number" min="0" step="0.1" value={fieldForm.acreage} onChange={(e) => setFieldForm((prev) => ({ ...prev, acreage: e.target.value }))} />
            </label>
            <label>
              Planting date
              <input
                className="text-input"
                type="date"
                value={fieldForm.plantingDate}
                onChange={(e) => setFieldForm((prev) => ({ ...prev, plantingDate: e.target.value }))}
              />
            </label>
            {fieldError && <p className="error-text">{fieldError}</p>}
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={() => setFieldModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save field
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
