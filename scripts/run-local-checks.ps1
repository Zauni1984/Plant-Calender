$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host '==> BlockSocial Plants Calendar local checks'

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw 'cargo not found. Install Rust via rustup first.'
}

$HasNode = $null -ne (Get-Command node -ErrorAction SilentlyContinue)

Write-Host '==> cargo fmt --all --check'
cargo fmt --all --check

Write-Host '==> cargo check --workspace'
cargo check --workspace

Write-Host '==> cargo test -p shared'
cargo test -p shared

Write-Host '==> cargo test -p backend -- --nocapture'
cargo test -p backend -- --nocapture

if ($HasNode) {
  Write-Host '==> node --check desktop-ui/src/main.js'
  node --check desktop-ui/src/main.js

  if (Test-Path 'desktop-ui/package.json') {
    Push-Location desktop-ui
    try {
      Write-Host '==> npm install'
      npm install
      Write-Host '==> npm run build'
      npm run build
    }
    finally {
      Pop-Location
    }
  }
} else {
  Write-Warning 'node not found. Skipping desktop-ui checks.'
}

Write-Host '==> done'
