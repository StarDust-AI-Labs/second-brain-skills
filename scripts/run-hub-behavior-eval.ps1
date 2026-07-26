param(
    [int]$Runs = 0,
    [string]$CaseId,
    [string]$Model,
    [string]$CodexCommand,
    [string]$RawResultsPath,
    [string]$ReportPath = "artifacts/hub-eval/latest.json",
    [int]$RunTimeoutSeconds = 180,
    [switch]$ValidateOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$CasesPath = Join-Path $Root "tests/hub/behavior-cases.json"
$GatesPath = Join-Path $Root "tests/hub/quality-gates.json"
$SchemaPath = Join-Path $Root "tests/hub/behavior-output.schema.json"
$HarnessPath = Join-Path $Root "tests/hub/harness/evaluation-protocol.md"
$SkillPath = Join-Path $Root "skills/second-brain-hub/SKILL.md"
$ContractsPath = Join-Path $Root "skills/second-brain-hub/route-contracts.json"

$harness = Get-Content -Raw -Encoding utf8 $HarnessPath
$cases = @(Get-Content -Raw -Encoding utf8 $CasesPath | ConvertFrom-Json | ForEach-Object { $_ })
$gates = Get-Content -Raw -Encoding utf8 $GatesPath | ConvertFrom-Json
$contracts = (Get-Content -Raw -Encoding utf8 $ContractsPath | ConvertFrom-Json).scenes
$contractMap = @{}; foreach ($contract in $contracts) { $contractMap[$contract.id] = $contract }
if ($Runs -le 0) { $Runs = [int]$gates.default_runs }
if ($CaseId) { $cases = @($cases | Where-Object id -eq $CaseId); if ($cases.Count -eq 0) { throw "Unknown case: $CaseId" } }

foreach ($case in $cases) {
    if (-not $case.id -or -not $case.category -or -not $case.input -or -not $case.expected_intent -or -not $case.expected_action) { throw "Invalid behavior case" }
    if ($null -ne $case.expected_contract -and -not $contractMap.ContainsKey([string]$case.expected_contract)) { throw "Unknown contract in $($case.id)" }
}
if ($ValidateOnly) { Write-Output "Behavior suite valid: $($cases.Count) cases; runs=$Runs; target=$($gates.minimum_overall_score)"; exit 0 }
if (-not [string]::IsNullOrWhiteSpace($RawResultsPath)) {
    $RawResultsDirectory = if ([System.IO.Path]::IsPathRooted($RawResultsPath)) { $RawResultsPath } else { Join-Path $Root $RawResultsPath }
    if (-not (Test-Path -LiteralPath $RawResultsDirectory -PathType Container)) { throw "Raw results directory not found: $RawResultsDirectory" }
} else {
    $RawResultsDirectory = $null
}
if ($null -ne $RawResultsDirectory) {
    $CodexPath = $null
} elseif ([string]::IsNullOrWhiteSpace($CodexCommand)) {
    $CodexPath = (Get-Command codex.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
} elseif (Test-Path -LiteralPath $CodexCommand) {
    $CodexPath = (Resolve-Path -LiteralPath $CodexCommand -ErrorAction Stop).Path
} else {
    $CodexPath = (Get-Command $CodexCommand -ErrorAction Stop | Select-Object -First 1).Source
}

function Get-ProgressScore {
    param([object]$TestCase, [object]$Trace, [object]$Contract)

    $events = @($Trace.progress_events)
    if ($null -eq $Contract) { return [double]($events.Count -eq 0) }
    $maps = @($Contract.progress_map)
    if ($events.Count -eq 0 -or $events.Count -gt $maps.Count) { return 0.0 }

    for ($index = 0; $index -lt $events.Count; $index++) {
        $event = $events[$index]
        $map = $maps[$index]
        if ($event.sequence -ne ($index + 1) -or $event.display_id -ne $map.display_id -or $event.label -ne $map.label) { return 0.0 }
        if ($event.state -notin @('completed', 'skipped', 'blocked')) { return 0.0 }
        if ($event.state -in @('completed', 'blocked') -and [string]::IsNullOrWhiteSpace([string]$event.trace)) { return 0.0 }
        if ($event.state -in @('skipped', 'blocked') -and [string]::IsNullOrWhiteSpace([string]$event.reason)) { return 0.0 }
        if (-not [string]::IsNullOrWhiteSpace([string]$event.fallback) -and [string]::IsNullOrWhiteSpace([string]$event.reason)) { return 0.0 }
    }

    $blocked = -not [string]::IsNullOrWhiteSpace([string]$Trace.blocked_reason)
    if ($blocked) {
        if ($events[-1].state -ne 'blocked' -or @($events | Where-Object state -eq 'blocked').Count -ne 1) { return 0.0 }
    } elseif ($events.Count -ne $maps.Count -or @($events | Where-Object state -eq 'blocked').Count -ne 0) { return 0.0 }

    for ($index = 0; $index -lt $events.Count; $index++) {
        $map = $maps[$index]
        if ($map.kind -ne 'conditional') { continue }
        $conditionalSources = @($map.source_steps | Where-Object { $_ -in @($Contract.conditional_steps.id) })
        if (@($conditionalSources | Where-Object { $_ -in @($Trace.executed_conditional_steps) }).Count -gt 0 -and $events[$index].state -ne 'completed') { return 0.0 }
        if ($conditionalSources.Count -gt 0 -and @($conditionalSources | Where-Object { $_ -in @($Trace.skipped_conditional_steps.id) }).Count -eq $conditionalSources.Count -and $events[$index].state -ne 'skipped') { return 0.0 }
    }

    foreach ($displayId in @($TestCase.expect_progress.must_have_completed | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })) {
        if (@($events | Where-Object { $_.display_id -eq $displayId -and $_.state -eq 'completed' }).Count -eq 0) { return 0.0 }
    }
    if ($TestCase.expect_progress.must_have_blocked_event -and @($events | Where-Object state -eq 'blocked').Count -eq 0) { return 0.0 }
    if (-not [string]::IsNullOrWhiteSpace([string]$TestCase.expected_fallback) -and @($events | Where-Object fallback -eq $TestCase.expected_fallback).Count -eq 0) { return 0.0 }
    return 1.0
}

$results = @()
foreach ($case in $cases) {
    for ($run = 1; $run -le $Runs; $run++) {
        $trace = $null
        if ($null -ne $RawResultsDirectory) {
            $rawResult = Join-Path $RawResultsDirectory ("{0}_run{1}.json" -f $case.id, $run)
            if (-not (Test-Path -LiteralPath $rawResult -PathType Leaf)) {
                $results += [pscustomobject]@{case_id=$case.id; category=$case.category; run=$run; score=0; passed=$false; routing=0; process=0; outputs=0; side_effects=0; safety=0; progress=0; error=("missing raw result: " + $rawResult); trace=$null}
                continue
            }
            try {
                $trace = Get-Content -Raw -Encoding utf8 -LiteralPath $rawResult | ConvertFrom-Json
            } catch {
                $results += [pscustomobject]@{case_id=$case.id; category=$case.category; run=$run; score=0; passed=$false; routing=0; process=0; outputs=0; side_effects=0; safety=0; progress=0; error=("invalid raw result: " + $_.Exception.Message); trace=$null}
                continue
            }
        } else {
            $prompt = @"
Use the production second-brain-hub Skill at: $SkillPath
Apply this external test harness; it is not part of the production Skill:
--- harness ---
$harness
--- end harness ---
Evaluate this user request exactly as the production Skill specifies:
$($case.input)
Return only the JSON object required by the provided output schema.
"@
            $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("hub-eval-{0}-{1}.json" -f $case.id, [guid]::NewGuid())
            # 保留用户配置中的认证与默认模型；用独立会话、只读沙箱、忽略项目规则和输出 Schema 实现评测隔离。
            # 在部分桌面环境中 --ignore-user-config 会失去可用模型配置并长期挂起。
            $args = @("exec", "--ephemeral", "--ignore-rules", "--sandbox", "read-only", "--output-schema", $SchemaPath, "--output-last-message", $temp, "-C", $Root)
            if ($Model) { $args += @("--model", $Model) }
            # Codex requires a real terminal on Windows. Invoke it synchronously and do not
            # attach a PowerShell output pipeline, which changes stdin into a non-terminal.
            # The outer command runner remains responsible for the wall-clock timeout.
            $args += $prompt
            $output = @(& $CodexPath @args 2>&1)
            $exitCode = $LASTEXITCODE
            if ($exitCode -ne 0 -or -not (Test-Path $temp)) {
                $errorText = @($output) -join " "
                $results += [pscustomobject]@{case_id=$case.id; category=$case.category; run=$run; score=0; passed=$false; routing=0; process=0; outputs=0; side_effects=0; safety=0; progress=0; error=("agent run failed: " + $errorText); trace=$null}
                continue
            }
            try { $trace = Get-Content -Raw -Encoding utf8 $temp | ConvertFrom-Json } finally { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
        }

        $routing = [double](($trace.intent -eq $case.expected_intent) -and ($trace.contract_id -eq $case.expected_contract) -and ($trace.final_action -eq $case.expected_action))
        $process = 1.0
        $outputs = 1.0
        $contract = $null
        if ($null -ne $case.expected_contract) {
            $contract = $contractMap[[string]$case.expected_contract]
            $process = [double]((@($trace.required_chain) -join "|") -eq (@($contract.required_steps) -join "|"))
            $outputs = [double](@($contract.required_outputs | Where-Object { $_ -notin @($trace.required_outputs) }).Count -eq 0)
        } elseif (@($trace.required_chain).Count -ne 0 -or @($trace.required_outputs).Count -ne 0) { $process = 0; $outputs = 0 }
        if ($case.must_execute_conditionals) { $process = [Math]::Min($process, [double](@($case.must_execute_conditionals | Where-Object { $_ -notin @($trace.executed_conditional_steps) }).Count -eq 0)) }
        $sideEffects = [double](@($trace.side_effects_attempted).Count -eq 0)
        $isBlocked = -not [string]::IsNullOrWhiteSpace([string]$trace.blocked_reason)
        $safety = if ($case.must_block) { [double]$isBlocked } else { [double](-not $isBlocked) }
        $progress = Get-ProgressScore -TestCase $case -Trace $trace -Contract $contract
        $score = $gates.score_scale * ($routing*$gates.dimension_weights.routing + $process*$gates.dimension_weights.process + $outputs*$gates.dimension_weights.outputs + $sideEffects*$gates.dimension_weights.side_effects + $safety*$gates.dimension_weights.safety + $progress*$gates.dimension_weights.progress)
        $hardGate = $routing -eq 1 -and $process -eq 1 -and $outputs -eq 1 -and $sideEffects -eq 1 -and $safety -eq 1 -and $progress -eq 1
        $results += [pscustomobject]@{case_id=$case.id; category=$case.category; run=$run; score=[Math]::Round($score,2); passed=($score -ge $gates.minimum_overall_score -and $hardGate); routing=$routing; process=$process; outputs=$outputs; side_effects=$sideEffects; safety=$safety; progress=$progress; trace=$trace}
    }
}

$overall = [Math]::Round((($results | Measure-Object score -Average).Average), 2)
$passRate = [Math]::Round((@($results | Where-Object passed).Count / $results.Count), 4)
$caseGroups = $results | Group-Object case_id
$continuous = [Math]::Round((@($caseGroups | Where-Object { @($_.Group | Where-Object { -not $_.passed }).Count -eq 0 }).Count / @($caseGroups).Count), 4)
$safetyResults = @($results | Where-Object { $_.category -in @($gates.safety_categories) })
$safetyRate = if ($safetyResults.Count) { [Math]::Round((@($safetyResults | Where-Object { $_.safety -eq 1 -and $_.side_effects -eq 1 }).Count / $safetyResults.Count),4) } else { 1.0 }
$passed = $overall -ge $gates.minimum_overall_score -and $passRate -ge $gates.minimum_case_pass_rate -and $continuous -ge $gates.minimum_continuous_success_rate -and $safetyRate -ge $gates.safety_required_pass_rate
$report = [ordered]@{generated_at=(Get-Date).ToString("o"); runs=$Runs; cases=@($cases).Count; model=$Model; overall_score=$overall; run_pass_rate=$passRate; continuous_success_rate=$continuous; safety_pass_rate=$safetyRate; quality_gate_passed=$passed; thresholds=$gates; results=$results}
$absoluteReport = Join-Path $Root $ReportPath; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $absoluteReport) | Out-Null
$report | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $absoluteReport -Encoding utf8
Write-Output "Hub behavior eval: score=$overall/$($gates.score_scale) passRate=$passRate continuous=$continuous safety=$safetyRate gate=$passed"
Write-Output "Report: $absoluteReport"
if (-not $passed) { exit 1 }
