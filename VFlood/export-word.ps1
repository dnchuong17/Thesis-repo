[CmdletBinding()]
param(
  [string]$TexFile = "main.tex",
  [string]$OutDocx = "out/main.docx",
  [string]$ExpandedTex = "out/main.expanded.tex",
  [string]$Bibliography = "chapters/references.bib",
  [string]$ReferenceTitle = "Bibliography",
  [switch]$SkipCiteproc,
  [switch]$KeepExpanded
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-PandocPath {
  $cmd = Get-Command pandoc -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $localPandoc = Join-Path $env:LOCALAPPDATA "Pandoc\\pandoc.exe"
  if (Test-Path -LiteralPath $localPandoc) {
    return $localPandoc
  }

  throw "pandoc not found. Install it (recommended): winget install --id JohnMacFarlane.Pandoc -e"
}

function Assert-CommandExists([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' not found in PATH."
  }
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutDocx) | Out-Null

Assert-CommandExists "latexpand"
$pandoc = Resolve-PandocPath

Write-Host "Expanding LaTeX inputs -> $ExpandedTex"
latexpand -o $ExpandedTex $TexFile

$pandocArgs = @(
  "-f", "latex",
  "-t", "docx",
  "-s",
  $ExpandedTex,
  "-o", $OutDocx,
  "--resource-path=.:images:chapters"
)

if (-not $SkipCiteproc) {
  if (Test-Path -LiteralPath $Bibliography) {
    $pandocArgs += @("--citeproc", "--bibliography=$Bibliography", "-M", "reference-section-title=$ReferenceTitle")
  } else {
    Write-Warning "Bibliography file not found at '$Bibliography' (skipping citeproc)."
  }
}

Write-Host "Writing Word file -> $OutDocx"
& $pandoc @pandocArgs

if (-not $KeepExpanded) {
  Remove-Item -LiteralPath $ExpandedTex -Force -ErrorAction SilentlyContinue
}

Write-Host "Done."
