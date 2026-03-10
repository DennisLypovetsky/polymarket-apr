param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$contentPath = Join-Path $RepoRoot 'polymarket-apr\content.js'
$userscriptPath = Join-Path $RepoRoot 'dev\polymarket-apr-dev.user.js'

if (-not (Test-Path $userscriptPath)) {
  throw "Missing userscript file: $userscriptPath"
}

$raw = Get-Content -Raw -Encoding utf8 $userscriptPath

# Remove userscript header block.
$withoutHeader = [regex]::Replace(
  $raw,
  '(?s)^\uFEFF?// ==UserScript==.*?// ==/UserScript==\s*',
  ''
)

# Keep JS body starting from the IIFE to avoid carrying note comments.
$startIndex = $withoutHeader.IndexOf('(function () {')
if ($startIndex -lt 0) {
  throw "Cannot find '(function () {' in userscript body."
}

$body = $withoutHeader.Substring($startIndex).TrimStart()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($contentPath, $body, $utf8NoBom)

Write-Output "Updated extension source: $contentPath"
