#requires -Version 5.1
<#
.SYNOPSIS
  第二大脑 · 初始化成功卡确定性校验 harness。

.DESCRIPTION
  读取 tests/hub/onboarding-cases.json 中带有 assert / verify 字段的用例，
  对每个用例的 sample_output（及可选 sample_hub_state）执行确定性断言，
  覆盖 init-success-card / init-success-verification 中定义的规则。

  与基于 LLM 的行为评测（run-hub-behavior-eval.ps1）不同，本脚本做纯确定性断言：
  标记缺失、JSON 非法、状态不一致、出现两张成功卡、未知版本时，对应用例真实失败。

  断言 / 校验 ID：
    marker-json-parseable            标记块存在且 JSON 可解析、字段合法
    no-second-brain-init-marker      输出中不得出现 status=success 的标记块
    exactly-one-success-card         输出中恰好一张成功卡
    marker-unrecognized-not-success  未知 version 判为未识别，不得静默成功
    marker-matches-hub-state         标记与 hub-state.json 一致（配合 verify 列表）
    hub-state-valid-json             hub-state 为合法 JSON
    onboarding-completed-true        onboarding.completed == true
    storage-mode-match               hub-state 与标记 storage_mode 一致
    workspace-path-match             hub-state 与标记 workspace_path 一致
    workspace-path-exists            workspace_path 真实存在（需 -CheckFileSystem）

.PARAMETER CasesPath
  用例文件路径，默认 tests/hub/onboarding-cases.json。

.PARAMETER CaseId
  只运行指定 id 的用例。

.PARAMETER CheckFileSystem
  启用后，workspace-path-exists 会真实检查文件系统（默认跳过并标记为 SKIP，
  因为样例路径是虚构的）。在真实环境 / CI 中验证真实初始化时可开启。

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

# 与 init-success-verification.md 保持一致的提取正则（. 匹配换行）。
$MarkerPattern = '<!--\s*second-brain-init\s*([\s\S]*?)\s*-->'
$SupportedVersions = @("1")

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
    # 返回 @{ ok; reason; data }；data 为解析后的对象（解析成功时）。
    param([string]$JsonText)
    try { $obj = $JsonText | ConvertFrom-Json -ErrorAction Stop }
    catch { return @{ ok = $false; reason = "JSON 解析失败: $($_.Exception.Message)"; data = $null } }

    if ($obj.status -ne "success") { return @{ ok = $false; reason = "status != success"; data = $obj } }
    if ($SupportedVersions -notcontains [string]$obj.version) {
        return @{ ok = $false; reason = "未知 version: $($obj.version)"; data = $obj }
    }
    if (@("obsidian", "markdown") -notcontains $obj.storage_mode) {
        return @{ ok = $false; reason = "非法 storage_mode: $($obj.storage_mode)"; data = $obj }
    }
    if ([string]::IsNullOrWhiteSpace([string]$obj.workspace_path)) {
        return @{ ok = $false; reason = "workspace_path 为空"; data = $obj }
    }
    return @{ ok = $true; reason = ""; data = $obj }
}

$cases = @(Get-Content -Raw -Encoding utf8 $CasesPath | ConvertFrom-Json)
$cases = @($cases | Where-Object { $_.assert -or $_.verify })
if ($CaseId) {
    $cases = @($cases | Where-Object id -eq $CaseId)
    if ($cases.Count -eq 0) { throw "Unknown case: $CaseId" }
}
if ($cases.Count -eq 0) { Write-Output "No init-success cases with assert/verify found."; exit 0 }

$pass = 0; $fail = 0; $skip = 0
$failures = @()

function Assert-Case {
    param($case)
    $id = $case.id
    $markers = Get-Markers -Text ([string]$case.sample_output)
    $problems = @()

    switch ($case.assert) {
        "marker-json-parseable" {
            if ($markers.Count -lt 1) { $problems += "缺少 second-brain-init 标记块"; break }
            $r = Test-MarkerFormat -JsonText $markers[0]
            if (-not $r.ok) { $problems += "标记格式非法：$($r.reason)" }
            elseif ($case.user_path -and ([string]$r.data.workspace_path -cne [string]$case.user_path)) {
                $problems += "workspace_path 解析结果与预期路径不一致：got='$($r.data.workspace_path)' want='$($case.user_path)'"
            }
        }
        "no-second-brain-init-marker" {
            foreach ($mk in $markers) {
                $r = Test-MarkerFormat -JsonText $mk
                if ($r.ok) { $problems += "失败用例却出现合法 success 标记块" }
            }
        }
        "exactly-one-success-card" {
            $successCount = 0
            foreach ($mk in $markers) { $r = Test-MarkerFormat -JsonText $mk; if ($r.ok) { $successCount++ } }
            if ($successCount -ne 1) { $problems += "成功卡数量应为 1，实际 $successCount" }
        }
        "marker-unrecognized-not-success" {
            if ($markers.Count -lt 1) { $problems += "缺少标记块（用例需要未知版本标记）"; break }
            $r = Test-MarkerFormat -JsonText $markers[0]
            if ($r.ok) { $problems += "未知 version 被误判为成功" }
            elseif ($r.reason -notmatch "version") { $problems += "失败原因应指向 version，实际：$($r.reason)" }
        }
        "marker-matches-hub-state" {
            if ($markers.Count -lt 1) { $problems += "缺少标记块"; break }
            $r = Test-MarkerFormat -JsonText $markers[0]
            if (-not $r.ok) { $problems += "标记格式非法：$($r.reason)"; break }
            # verify 列表
            $hub = $null
            foreach ($v in @($case.verify)) {
                switch ($v) {
                    "hub-state-valid-json" {
                        try { $script:hubState = $case.sample_hub_state | ConvertFrom-Json -ErrorAction Stop }
                        catch { $problems += "hub-state 不是合法 JSON: $($_.Exception.Message)" }
                    }
                    "onboarding-completed-true" {
                        if ($script:hubState -and $script:hubState.onboarding.completed -ne $true) {
                            $problems += "onboarding.completed != true"
                        }
                    }
                    "storage-mode-match" {
                        if ($script:hubState -and ([string]$script:hubState.preferences.storage_mode -cne [string]$r.data.storage_mode)) {
                            $problems += "storage_mode 与 hub-state 不一致"
                        }
                    }
                    "workspace-path-match" {
                        if ($script:hubState) {
                            $cfgPath = [string]$script:hubState.preferences.workspace_path
                            if (-not $cfgPath) { $cfgPath = [string]$script:hubState.preferences.vault_path }
                            if ($cfgPath -cne [string]$r.data.workspace_path) { $problems += "workspace_path 与 hub-state 不一致" }
                        }
                    }
                    "workspace-path-exists" {
                        if ($CheckFileSystem) {
                            if (-not (Test-Path -LiteralPath ([string]$r.data.workspace_path))) {
                                $problems += "workspace_path 在文件系统不存在：$($r.data.workspace_path)"
                            }
                        } else {
                            $script:skippedNote = $true
                        }
                    }
                }
            }
        }
        default { $problems += "未知 assert: $($case.assert)" }
    }
    return $problems
}

foreach ($case in $cases) {
    $script:hubState = $null; $script:skippedNote = $false
    $problems = Assert-Case -case $case
    if ($problems.Count -eq 0) {
        if ($script:skippedNote) { $skip++; Write-Output "SKIP $($case.id)（含 workspace-path-exists，未启用 -CheckFileSystem）" }
        else { $pass++; Write-Output "PASS $($case.id)" }
    } else {
        $fail++
        Write-Output "FAIL $($case.id)"
        foreach ($p in $problems) { Write-Output "     - $p"; $failures += "$($case.id): $p" }
    }
}

Write-Output ""
Write-Output "init-success 校验结果：PASS=$pass FAIL=$fail SKIP=$skip / 共 $($cases.Count) 例"
if ($fail -gt 0) { exit 1 }
exit 0
