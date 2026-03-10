param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$contentPath = Join-Path $RepoRoot 'polymarket-apr\content.js'
$userscriptPath = Join-Path $RepoRoot 'dev\polymarket-apr-dev.user.js'

if (-not (Test-Path $contentPath)) {
  throw "Missing source file: $contentPath"
}

$header = @'
// ==UserScript==
// @name         Polymarket APR Dev
// @namespace    https://github.com/DennisLypovetsky/polymarket-apr
// @version      1.2.0-dev
// @description  Fast visual iteration script for Polymarket APR
// @match        https://polymarket.com/*
// @grant        none
// ==/UserScript==

// NOTE:
// Source of truth is polymarket-apr/content.js.
// Use this file for fast visual iteration, then move accepted changes back.

'@

$body = Get-Content -Raw -Encoding utf8 $contentPath
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($userscriptPath, ($header + $body), $utf8NoBom)

Write-Output "Updated userscript: $userscriptPath"
