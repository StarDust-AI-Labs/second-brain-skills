#requires -Version 5.1
<#
.SYNOPSIS
  Second-brain init-success card deterministic verification harness.

.DESCRIPTION
  Reads cases with assert / verify fields from tests/hub/onboarding-cases.json and
  executes deterministic assertions against each case's sample_output (and optional
  sample_hub_state), implementing the rules defined in
  references/init-success-card.md and references/init-success-verification.md.

  Unlike the LLM-based behavior eval (run-hub-behavior-eval.ps1), this script makes
  purely deterministic checks: a missing marker, invalid JSON, state mismatch,
  duplicate success cards, or an unknown version makes the matching case truly FAIL.

  Assert / verify IDs:
    marker-json-parseable            marker block present, JSON parses, fields valid
    no-second-brain-init-marker      no status=success marker block may appear
    exactly-one-success-card         exactly one success card in the output
    marker-unrecognized-not-success  unknown version -> unrecognized, never silent success
    marker-matches-hub-state         marker consistent with hub-state.json (uses verify list)
    hub-state-valid-json             hub-state is valid JSON
    onboarding-completed-true        onboarding.completed == true
    storage-mode-match               hub-state storage_mode matches marker
    workspace-path-match             hub-state workspace_path matches marker
    workspace-path-exists            workspace_path exists (requires -CheckFileSystem)

.PARAMETER CasesPath
  Path to the cases file. Defaults to tests/hub/onboarding-cases.json.

.PARAMETER CaseId
  Run only the case with this id.

.PARAMETER CheckFileSystem
  When set, workspace-path-exists really checks the filesystem (skipped otherwise,
  because sample paths are fictional). Enable it in real env / CI against a real init.

.EXAMPLE
  pwsh scripts/verify-init-success.ps1
#>
[CmdletBinding()]
param(
    [string]$CasesPath,
    [string]$CaseId,
    [switch]$CheckFileSystem
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $CasesPath) { $CasesPath = Join-Path $Root "tests/hub/onboarding-cases.json" }

# Extraction regex kept in sync with init-success-verification.md (. matches newline).
$MarkerPattern = '<!--\s*second-brain-init\s*([\s\S]*?)\s*-->'
$SupportedVersions = @("1")

# PowerShell 5.1 的 ConvertFrom-Json 对【顶层 JSON 数组】有 bug（会合并成单对象），
# 但对【单个 JSON 对象】工作正常。规避办法：把顶层数组包成 {"_items":[ ... ]}
# 对象，解析后取 _items，5.1 下稳定，无需任何外部程序集。

function Get-Markers {
    param([string]$Text)
    if ($null -eq $Text) { return @() }
    $found = @()
    foreach ($m in [regex]::Matches($Text, $MarkerPattern)) {
        $found += $m.Groups[1].Value.Trim()
    }
    return $found
}

function Test-MarkerFormat {
    # Returns @{ ok; reason; data }; data is the parsed PSCustomObject when parse succeeds.
    param([string]$JsonText)
    try { $obj = $JsonText | ConvertFrom-Json -ErrorAction Stop }
    catch { return @{ ok = $false; reason = "json-parse-failed: $($_.Exception.Message)"; data = $null } }

    if ([string]$obj.status -ne "success") { return @{ ok = $false; reason = "status-not-success"; data = $obj } }
    if ($SupportedVersions -notcontains [string]$obj.version) {
        return @{ ok = $false; reason = "unknown-version:$($obj.version)"; data = $obj }
    }
    if (@("obsidian", "markdown") -notcontains [string]$obj.storage_mode) {
        return @{ ok = $false; reason = "bad-storage-mode:$($obj.storage_mode)"; data = $obj }
    }
    if ([string]::IsNullOrWhiteSpace([string]$obj.workspace_path)) {
        return @{ ok = $false; reason = "empty-workspace-path"; data = $obj }
    }
    return @{ ok = $true; reason = ""; data = $obj }
}

$jsonText = Get-Content -Raw -Encoding utf8 $CasesPath
# 包成对象规避 5.1 顶层数组 bug
$wrapped = '{"_items":' + $jsonText.Trim() + '}'
$wrappedObj = $wrapped | ConvertFrom-Json -ErrorAction Stop
$rawCases = @($wrappedObj._items)

# 过滤出带 assert / verify 的用例（PSCustomObject 直接用属性访问）
$casesList = New-Object System.Collections.ArrayList
foreach ($c in $rawCases) {
    $hasAssert = ($null -ne $c.assert) -and (-not [string]::IsNullOrEmpty([string]$c.assert))
    $hasVerify = ($null -ne $c.verify)
    if ($hasAssert -or $hasVerify) { [void]$casesList.Add($c) }
}
if ($CaseId) {
    $filtered = New-Object System.Collections.ArrayList
    foreach ($c in $casesList) { if ([string]$c.id -eq $CaseId) { [void]$filtered.Add($c) } }
    $casesList = $filtered
    if ($casesList.Count -eq 0) { throw "Unknown case: $CaseId" }
}
if ($casesList.Count -eq 0) { Write-Output "No init-success cases with assert/verify found."; exit 0 }

$pass = 0; $fail = 0; $skip = 0

function Has-Prop {
    param($obj, $name)
    if ($null -eq $obj) { return $false }
    $null -ne ($obj.PSObject.Properties | Where-Object Name -eq $name)
}
function Get-Field {
    # 兼容 PSCustomObject 与 IDictionary，属性/键不存在时返回 $null。
    param($obj, $name)
    if ($null -eq $obj) { return $null }
    if ($obj -is [System.Collections.IDictionary]) { if ($obj.Contains($name)) { return $obj[$name] }; return $null }
    $p = $obj.PSObject.Properties | Where-Object Name -eq $name | Select-Object -First 1
    if ($null -ne $p) { return $p.Value }
    return $null
}

function Assert-Case {
    param([object]$case)
    # 直接属性访问最可靠（Get-Field 在函数作用域偶有管道问题）
    $sampleOutput = if ($case.sample_output) { [string]$case.sample_output } else { "" }
    $assert = if ($case.assert) { [string]$case.assert } else { "" }
    $userPath = if ($case.user_path) { [string]$case.user_path } else { "" }
    $markers = @(Get-Markers -Text $sampleOutput)
    Write-Warning ("[Assert-Case] id=$($case.id) assert=$assert sampleLen=$($sampleOutput.Length) markers=$($markers.Count)")
    $problems = @()

    switch ($assert) {
        "marker-json-parseable" {
            if ($markers.Count -lt 1) { $problems += "missing second-brain-init marker"; break }
            $r = Test-MarkerFormat -JsonText $markers[0]
            if (-not $r.ok) { $problems += "marker-format-invalid: $($r.reason)" }
            elseif ($userPath -and ([string]$r.data.workspace_path -cne $userPath)) {
                $problems += "workspace_path mismatch: got='$($r.data.workspace_path)' want='$userPath'"
            }
        }
        "no-second-brain-init-marker" {
            foreach ($mk in $markers) {
                $r = Test-MarkerFormat -JsonText $mk
                if ($r.ok) { $problems += "failure-case produced a valid success marker" }
            }
        }
        "exactly-one-success-card" {
            $successCount = 0
            foreach ($mk in $markers) { $r = Test-MarkerFormat -JsonText $mk; if ($r.ok) { $successCount++ } }
            if ($successCount -ne 1) { $problems += "expected exactly 1 success card, got $successCount" }
        }
        "marker-unrecognized-not-success" {
            if ($markers.Count -lt 1) { $problems += "missing marker (case needs unknown-version marker)"; break }
            $r = Test-MarkerFormat -JsonText $markers[0]
            if ($r.ok) { $problems += "unknown version was treated as success" }
            elseif ($r.reason -notmatch "version") { $problems += "failure reason should mention version, got: $($r.reason)" }
        }
        "marker-matches-hub-state" {
            if ($markers.Count -lt 1) { $problems += "missing marker"; break }
            $r = Test-MarkerFormat -JsonText $markers[0]
            if (-not $r.ok) { $problems += "marker-format-invalid: $($r.reason)"; break }
            $verify = @($case.verify)
            foreach ($v in $verify) {
                switch ([string]$v) {
                    "hub-state-valid-json" {
                        try { $script:hubState = ([string]$case.sample_hub_state) | ConvertFrom-Json -ErrorAction Stop }
                        catch { $problems += "hub-state invalid JSON: $($_.Exception.Message)" }
                    }
                    "onboarding-completed-true" {
                        $onb = $script:hubState.onboarding
                        if ($onb -and $onb.completed -ne $true) { $problems += "onboarding.completed != true" }
                    }
                    "storage-mode-match" {
                        $prefs = $script:hubState.preferences
                        if ($prefs -and ([string]$prefs.storage_mode -cne [string]$r.data.storage_mode)) {
                            $problems += "storage_mode mismatch with hub-state"
                        }
                    }
                    "workspace-path-match" {
                        $prefs = $script:hubState.preferences
                        if ($prefs) {
                            $cfgPath = [string]$prefs.workspace_path
                            if (-not $cfgPath) { $cfgPath = [string]$prefs.vault_path }
                            if ($cfgPath -cne [string]$r.data.workspace_path) { $problems += "workspace_path mismatch with hub-state" }
                        }
                    }
                    "workspace-path-exists" {
                        if ($CheckFileSystem) {
                            if (-not (Test-Path -LiteralPath ([string]$r.data.workspace_path))) {
                                $problems += "workspace_path does not exist: $($r.data.workspace_path)"
                            }
                        } else {
                            $script:skippedNote = $true
                        }
                    }
                }
            }
        }
        default { $problems += "unknown assert: $assert" }
    }
    return $problems
}

foreach ($case in $casesList) {
    $script:hubState = $null; $script:skippedNote = $false
    $cid = if ($case.id) { [string]$case.id } else { "<no-id>" }
    $problems = @(Assert-Case -case $case)
    if ($problems.Count -eq 0) {
        if ($script:skippedNote) { $skip++; Write-Output "SKIP $cid (has workspace-path-exists; -CheckFileSystem not set)" }
        else { $pass++; Write-Output "PASS $cid" }
    } else {
        $fail++
        Write-Output "FAIL $cid"
        foreach ($p in $problems) { Write-Output "     - $p" }
    }
}

Write-Output ""
Write-Output "init-success verification: PASS=$pass FAIL=$fail SKIP=$skip / total $($casesList.Count)"
if ($fail -gt 0) { exit 1 }
exit 0
