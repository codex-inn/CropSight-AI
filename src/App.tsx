import { useMemo, useState } from 'react';
import { dashboardMetrics, fieldData, recentScans, reportSummary, sampleScanResult } from './data/mockData';
import { calculateSummary, csvFromSummary, getHarvestWindowText, getStatusTone } from './lib/analytics';

type ViewName = 'dashboard' | 'scan' | 'fields' | 'history' | 'reports';

type ScanState = {
  id: string;
  field: string;
  ready: number;
  nearlyReady: number;
  developing: number;
  confidence: number;
  date: string;
};

const navItems: { id: ViewName; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'scan', label: 'Scan crop', icon: '⌁' },
  { id: 'fields', label: 'My fields', icon: '⌖' },
  { id: 'history', label: 'Scan history', icon: '◷' },
  { id: 'reports', label: 'Reports', icon: '▤' }
];

function App() {
  const [currentView, setCurrentView] = useState<ViewName>('dashboard');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanState | null>(null);
  const [scanHistory, setScanHistory] = useState(recentScans);
  const summary = useMemo(() => calculateSummary(scanHistory), [scanHistory]);

  const handleAnalyze = () => {
    setScanResult({
      id: 'CS-0249',
      field: 'North Field · Row 04',
      ready: 5,
      nearlyReady: 4,
      developing: 3,
      confidence: 94,
      date: 'Today, 9:52 AM'
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    setScanResult(null);
  };

  const downloadCsv = () => {
    const blob = new Blob([csvFromSummary(scanHistory)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cropsight-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-mark">✦</span>
          <div>
            <strong>CropSight</strong>
            <small>AI agriculture intelligence</small>
          </div>
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-button ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="pulse"></span>
          <div>
            <strong>Demo workspace</strong>
            <small>Model integration ready</small>
          </div>
        </div>

        <div className="profile-box">
          <div className="avatar">AM</div>
          <div>
            <strong>Alex Morgan</strong>
            <small>Green Valley Farm</small>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="crumbs">
            <button className="mobile-menu" type="button" aria-label="Toggle menu">
              ☰
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>
              {navItems.find((item) => item.id === currentView)?.label ?? 'Dashboard'}
            </strong>
          </div>
          <div className="top-actions">
            <button type="button" className="ghost-button" aria-label="Notifications">
              ⌁
            </button>
            <button type="button" className="date-pill">
              October 10, 2026 <span>⌄</span>
            </button>
          </div>
        </header>

        {currentView === 'dashboard' && (
          <section className="page-section">
            <div className="hero-panel">
              <div>
                <p className="eyebrow">Saturday, October 10, 2026</p>
                <h1>Good morning, Alex.</h1>
                <p className="subtle">Your fields are looking healthy. Here is the latest crop intelligence for your farm.</p>
              </div>
              <button type="button" className="primary-button" onClick={() => setCurrentView('scan')}>
                + Scan a crop
              </button>
            </div>

            <div className="metrics-grid">
              {dashboardMetrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <div className={`metric-icon ${metric.tone}`}>{metric.icon}</div>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small className={metric.change >= 0 ? 'positive' : 'negative'}>
                    {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}%<em>vs last month</em>
                  </small>
                </article>
              ))}
            </div>

            <div className="two-column">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Harvest outlook</p>
                    <h2>Upcoming harvest forecast</h2>
                  </div>
                  <button type="button" className="text-button" onClick={() => setCurrentView('reports')}>View report →</button>
                </div>

                <div className="forecast-box">
                  <div className="forecast-date">
                    <span>18</span>
                    <small>OCT<br />2026</small>
                  </div>
                  <div>
                    <strong>Peak harvest window</strong>
                    <p>Based on current maturity across the monitored fields.</p>
                  </div>
                  <span className="pill">8 days away</span>
                </div>

                <div className="chart" aria-label="Forecast line chart">
                  <div className="chart-scale">
                    <span>60</span>
                    <span>40</span>
                    <span>20</span>
                    <span>0</span>
                  </div>
                  <div className="bars">
                    <i style={{ height: '35%' }} />
                    <i style={{ height: '48%' }} />
                    <i style={{ height: '43%' }} />
                    <i style={{ height: '63%' }} />
                    <i style={{ height: '82%' }} className="highlight" />
                    <i style={{ height: '68%' }} />
                    <i style={{ height: '55%' }} />
                  </div>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Recent activity</p>
                    <h2>Latest scans</h2>
                  </div>
                  <button type="button" className="text-button" onClick={() => setCurrentView('history')}>See all →</button>
                </div>

                <div className="activity-list">
                  {scanHistory.slice(0, 3).map((scan) => (
                    <div key={scan.id} className="activity-item">
                      <span className={`crop-bullet ${getStatusTone(scan.ready, scan.nearlyReady, scan.developing)}`} />
                      <div>
                        <strong>{scan.field}</strong>
                        <small>{scan.date}</small>
                      </div>
                      <span className={`status-tag ${getStatusTone(scan.ready, scan.nearlyReady, scan.developing)}`}>
                        {scan.ready >= scan.nearlyReady ? 'Ready' : scan.nearlyReady >= scan.developing ? 'Nearly ready' : 'Developing'}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="section-heading">
              <div>
                <p className="eyebrow">Field health</p>
                <h2>Your fields</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setCurrentView('fields')}>Manage fields</button>
            </div>

            <div className="field-grid">
              {fieldData.map((field) => (
                <article key={field.name} className="field-card">
                  <div className="field-top">
                    <div>
                      <span className="field-badge">● Monitoring</span>
                      <h3>{field.name}</h3>
                      <small>{field.crop} · {field.variety}</small>
                    </div>
                    <span className="field-menu">•••</span>
                  </div>
                  <div className="field-health">
                    <div>
                      <span>Crop health</span>
                      <strong>{field.health}%</strong>
                    </div>
                    <div className="progress-track">
                      <i style={{ width: `${field.health}%` }} />
                    </div>
                  </div>
                  <div className="field-footer">
                    <span>Last scanned {field.lastScanned}</span>
                    <span>{field.acres} acres</span>
                  </div>
                </article>
              ))}
              <button type="button" className="add-field-card" onClick={() => setCurrentView('fields')}>
                <span>＋</span>
                <strong>Add a new field</strong>
                <small>Start monitoring another field</small>
              </button>
            </div>
          </section>
        )}

        {currentView === 'scan' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <p className="eyebrow">Crop analysis</p>
                <h1>Scan a crop</h1>
                <p>Upload a clear photo of your tomatoes to estimate maturity and harvest timing.</p>
              </div>
            </div>

            <div className="scan-layout">
              <article className="panel upload-panel">
                {!selectedImage ? (
                  <div className="drop-zone">
                    <div className="upload-icon">⇪</div>
                    <h2>Drop an image here</h2>
                    <p>or choose a photo from your device</p>
                    <label className="primary-button upload-label">
                      Choose image
                      <input type="file" accept="image/*" onChange={handleFileChange} />
                    </label>
                    <small>JPG, PNG or WEBP · Max 10 MB</small>
                  </div>
                ) : (
                  <div className="preview-box">
                    <img src={selectedImage} alt="Selected crop preview" />
                    <button type="button" className="remove-button" onClick={() => setSelectedImage(null)}>Remove image</button>
                  </div>
                )}

                <button
                  type="button"
                  className="primary-button full-width"
                  onClick={handleAnalyze}
                  disabled={!selectedImage}
                >
                  Analyze crop
                </button>
              </article>

              <article className="panel side-panel">
                <p className="eyebrow">Better scans</p>
                <h2>Capture tips</h2>
                <ul className="tips-list">
                  <li><span>01</span> Keep the camera steady and level.</li>
                  <li><span>02</span> Use natural light and avoid harsh shadows.</li>
                  <li><span>03</span> Include several fruits in the frame.</li>
                  <li><span>04</span> Capture fruit color and surface clearly.</li>
                </ul>
                <div className="demo-box">
                  <strong>Demo analysis mode</strong>
                  <p>This MVP uses deterministic sample results. A real vision model can be attached at the analysis boundary.</p>
                </div>
              </article>
            </div>

            {scanResult && (
              <article className="panel analysis-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Analysis complete · demo result</p>
                    <h2>Crop maturity overview</h2>
                  </div>
                  <span className="pill">Confidence {scanResult.confidence}%</span>
                </div>

                <div className="result-grid">
                  <div className="result-stat">
                    <div className="metric-icon tomato">◉</div>
                    <strong>{scanResult.ready + scanResult.nearlyReady + scanResult.developing}</strong>
                    <small>Tomatoes detected</small>
                  </div>
                  <div className="result-stat">
                    <div className="metric-icon green">✓</div>
                    <strong>{scanResult.ready}</strong>
                    <small>Harvest-ready</small>
                  </div>
                  <div className="result-stat">
                    <div className="metric-icon amber">◌</div>
                    <strong>{scanResult.nearlyReady}</strong>
                    <small>Nearly ready</small>
                  </div>
                  <div className="result-stat">
                    <div className="metric-icon blue">◍</div>
                    <strong>{scanResult.developing}</strong>
                    <small>Developing</small>
                  </div>
                </div>

                <div className="result-footer">
                  <div>
                    <strong>Estimated harvest window</strong>
                    <p>{getHarvestWindowText(scanResult.ready, scanResult.nearlyReady, scanResult.developing)}</p>
                  </div>
                  <span className="status-tag ready">Ready to plan</span>
                </div>

                <p className="small-note">ⓘ Sample result for product demonstration. CropSight AI predictions should be reviewed by a qualified grower and are not a substitute for field inspection.</p>
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
                <p>Keep your growing areas organized and monitor crop health over time.</p>
              </div>
              <button type="button" className="primary-button">+ Add field</button>
            </div>

            <div className="field-grid large">
              {fieldData.map((field) => (
                <article key={field.name} className="field-card">
                  <div className="field-top">
                    <div>
                      <span className="field-badge">● Monitoring</span>
                      <h3>{field.name}</h3>
                      <small>{field.crop} · {field.variety}</small>
                    </div>
                    <span className="field-menu">•••</span>
                  </div>
                  <div className="field-health">
                    <div>
                      <span>Crop health</span>
                      <strong>{field.health}%</strong>
                    </div>
                    <div className="progress-track">
                      <i style={{ width: `${field.health}%` }} />
                    </div>
                  </div>
                  <div className="field-footer">
                    <span>{field.acres} acres</span>
                    <span>{field.scans} scans</span>
                  </div>
                </article>
              ))}
              <button type="button" className="add-field-card tall">
                <span>＋</span>
                <strong>Add a new field</strong>
                <small>Start monitoring another field</small>
              </button>
            </div>
          </section>
        )}

        {currentView === 'history' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <p className="eyebrow">Field observations</p>
                <h1>Scan history</h1>
                <p>Review previous crop analyses and maturity trends.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setCurrentView('reports')}>Export data</button>
            </div>

            <article className="panel history-panel">
              <div className="table-toolbar">
                <div className="search-box">⌕ <input aria-label="Search scans" placeholder="Search scans" /></div>
                <button type="button" className="ghost-button small">All fields ⌄</button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Scan</th>
                      <th>Field</th>
                      <th>Detected</th>
                      <th>Maturity mix</th>
                      <th>Confidence</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.map((scan) => (
                      <tr key={scan.id}>
                        <td><span className="scan-id">{scan.id}</span></td>
                        <td>{scan.field}</td>
                        <td>{scan.ready + scan.nearlyReady + scan.developing} tomatoes</td>
                        <td>
                          <span className="status-tag ready">{scan.ready} ready</span>
                          <span className="status-tag nearly">{scan.nearlyReady} near</span>
                        </td>
                        <td>{scan.confidence}%</td>
                        <td>{scan.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {currentView === 'reports' && (
          <section className="page-section">
            <div className="page-header">
              <div>
                <p className="eyebrow">Insights & exports</p>
                <h1>Reports</h1>
                <p>Turn your crop observations into clear harvest planning decisions.</p>
              </div>
              <button type="button" className="primary-button" onClick={downloadCsv}>↓ Download CSV</button>
            </div>

            <div className="report-grid">
              <article className="panel report-card green-panel">
                <div className="metric-icon green">▤</div>
                <p className="eyebrow">Monthly summary</p>
                <h2>October field report</h2>
                <p>{reportSummary.totalScans} crop scans across {reportSummary.activeFields} active tomato fields.</p>
                <button type="button" className="text-button" onClick={downloadCsv}>Download report →</button>
              </article>

              <article className="panel report-card tomato-panel">
                <div className="metric-icon tomato">◉</div>
                <p className="eyebrow">Harvest planning</p>
                <h2>{reportSummary.harvestReady} crops ready soon</h2>
                <p>Your next peak harvest window begins {reportSummary.harvestWindow}.</p>
                <button type="button" className="text-button" onClick={() => setCurrentView('scan')}>Run another scan →</button>
              </article>
            </div>

            <article className="panel summary-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Maturity distribution</p>
                  <h2>Current crop mix</h2>
                </div>
                <span className="pill">{summary.total} total detections</span>
              </div>

              <div className="distribution-list">
                <div>
                  <div className="label-row"><span><i className="legend ready-dot" />Harvest-ready</span><strong>{summary.readyShare}%</strong></div>
                  <div className="meter"><i style={{ width: `${summary.readyShare}%`, background: '#e76f51' }} /></div>
                </div>
                <div>
                  <div className="label-row"><span><i className="legend nearly-dot" />Nearly ready</span><strong>{summary.nearlyShare}%</strong></div>
                  <div className="meter"><i style={{ width: `${summary.nearlyShare}%`, background: '#e9b949' }} /></div>
                </div>
                <div>
                  <div className="label-row"><span><i className="legend developing-dot" />Developing</span><strong>{summary.developingShare}%</strong></div>
                  <div className="meter"><i style={{ width: `${summary.developingShare}%`, background: '#72a98f' }} /></div>
                </div>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
