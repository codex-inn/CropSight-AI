const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('[data-view]');
const pageTitle = document.querySelector('#page-title');
const toast = document.querySelector('#toast');
const titles = { dashboard: 'Dashboard', scan: 'Scan crop', fields: 'My fields', history: 'Scan history', reports: 'Reports' };

function showView(name) {
  const viewName = titles[name] ? name : 'dashboard';
  views.forEach((view) => view.classList.toggle('active', view.id === `${viewName}-view`));
  document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.view === viewName));
  pageTitle.textContent = titles[viewName];
  history.replaceState(null, '', `#${viewName}`);
  document.querySelector('.sidebar')?.classList.remove('open');
}

navLinks.forEach((link) => link.addEventListener('click', (event) => {
  const view = link.dataset.view;
  if (!view) return;
  event.preventDefault();
  showView(view);
}));

const menuButton = document.querySelector('.menu-button');
menuButton?.addEventListener('click', () => document.querySelector('.sidebar')?.classList.toggle('open'));

const dropZone = document.querySelector('#drop-zone');
const input = document.querySelector('#image-input');
const previewArea = document.querySelector('#preview-area');
const preview = document.querySelector('#image-preview');
const analyzeButton = document.querySelector('#analyze-button');
const result = document.querySelector('#analysis-result');

function loadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    notify('Please choose an image file.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    notify('That image is larger than 10 MB.');
    return;
  }
  preview.src = URL.createObjectURL(file);
  dropZone.classList.add('hidden');
  previewArea.classList.remove('hidden');
  analyzeButton.disabled = false;
  result.classList.add('hidden');
}

input?.addEventListener('change', () => loadImage(input.files[0]));
['dragenter', 'dragover'].forEach((eventName) => dropZone?.addEventListener(eventName, (event) => {
  event.preventDefault(); dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((eventName) => dropZone?.addEventListener(eventName, (event) => {
  event.preventDefault(); dropZone.classList.remove('dragging');
}));
dropZone?.addEventListener('drop', (event) => loadImage(event.dataTransfer.files[0]));

document.querySelector('#remove-image')?.addEventListener('click', () => {
  preview.src = '';
  input.value = '';
  dropZone.classList.remove('hidden');
  previewArea.classList.add('hidden');
  analyzeButton.disabled = true;
  result.classList.add('hidden');
});

analyzeButton?.addEventListener('click', () => {
  analyzeButton.textContent = 'Analyzing…';
  analyzeButton.disabled = true;
  setTimeout(() => {
    result.classList.remove('hidden');
    analyzeButton.textContent = 'Analyze crop';
    analyzeButton.disabled = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    notify('Demo analysis complete.');
  }, 700);
});

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function downloadReport() {
  const csv = 'Scan ID,Field,Detected,Ready,Nearly Ready,Developing,Confidence,Date\nCS-0248,North Field Row 04,12,5,4,3,94%,2026-10-10\nCS-0247,East Field Row 12,18,0,9,9,91%,2026-10-10\nCS-0246,North Field Row 02,14,0,4,10,89%,2026-10-09\nCS-0245,North Field Row 01,16,7,6,3,93%,2026-10-09';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'cropsight-october-report.csv'; anchor.click();
  URL.revokeObjectURL(url);
  notify('Report downloaded.');
}

document.querySelectorAll('#download-report, #download-report-2').forEach((button) => button.addEventListener('click', downloadReport));
document.querySelectorAll('#add-field-button, #add-field-button-2').forEach((button) => button.addEventListener('click', () => notify('Field creation form is ready for the next milestone.')));

const initialView = window.location.hash.replace('#', '') || 'dashboard';
showView(initialView);
