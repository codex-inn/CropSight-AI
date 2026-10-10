param(
    [Parameter(Mandatory = $true)]
    [string]$DatasetYaml,
    [int]$Epochs = 80,
    [int]$Batch = 4
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$VenvPython = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$Requirements = Join-Path $RepoRoot "api\requirements.txt"
$Validator = Join-Path $RepoRoot "api\validate_dataset.py"
$Trainer = Join-Path $RepoRoot "api\train.py"

if (-not (Test-Path $DatasetYaml)) {
    throw "Dataset YAML not found: $DatasetYaml. Extract CropSight_tomatOD_YOLO.zip and pass the full path to dataset.yaml."
}
if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating Python 3.11 virtual environment..."
    py -3.11 -m venv (Join-Path $RepoRoot ".venv")
}
if (-not (Test-Path $VenvPython)) {
    throw "Python 3.11 was not found. Install Python 3.11 (64-bit), then retry."
}

Write-Host "Installing/updating Python dependencies..."
& $VenvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed." }
& $VenvPython -m pip install -r $Requirements
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }

Write-Host "Validating dataset before training..."
& $VenvPython $Validator --data (Resolve-Path $DatasetYaml).Path
if ($LASTEXITCODE -ne 0) { throw "Dataset validation failed. Fix the errors before training." }

Write-Host "Starting training. This may take a long time on CPU."
& $VenvPython $Trainer --data (Resolve-Path $DatasetYaml).Path --epochs $Epochs --imgsz 640 --batch $Batch
if ($LASTEXITCODE -ne 0) { throw "Training failed; review the messages above." }

Write-Host ""
Write-Host "Training command completed. Review validation metrics before trusting the model."
Write-Host "Find best.pt in the training output, then follow api/README_LOCAL.md to enable the API."
