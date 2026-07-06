param(
    [string]$PrimaryPath = "skills/second-brain-hub/test-prompts.json",
    [string]$MirrorPath = "",
    [string]$StateExamplePath = ".claude/hub-state.example.json"
)

$ErrorActionPreference = "Stop"

function Read-TestPrompts {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing test prompt file: $Path"
    }

    $raw = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path
    $data = $raw | ConvertFrom-Json

    if ($null -eq $data -or $data.Count -eq 0) {
        throw "No test cases found in $Path"
    }

    return @($data)
}

function Assert-HasProperty {
    param(
        [object]$Item,
        [string]$Name,
        [string]$CaseId
    )

    if (-not ($Item.PSObject.Properties.Name -contains $Name)) {
        throw "Case $CaseId is missing required property '$Name'"
    }
}

$primary = Read-TestPrompts -Path $PrimaryPath
$mirror = $null
if ($MirrorPath -and (Test-Path -LiteralPath $MirrorPath)) {
    $mirror = Read-TestPrompts -Path $MirrorPath
}

$ids = @{}
$sceneCounts = @{}
$requiredIds = @(
    "t01",
    "t05",
    "t08",
    "t10",
    "t13",
    "t12",
    "t15",
    "t17",
    "t18",
    "t21",
    "t23",
    "t26",
    "t30"
)

foreach ($case in $primary) {
    Assert-HasProperty -Item $case -Name "id" -CaseId "<unknown>"
    Assert-HasProperty -Item $case -Name "scene" -CaseId $case.id
    Assert-HasProperty -Item $case -Name "input" -CaseId $case.id

    $hasExpectedIntent = $case.PSObject.Properties.Name -contains "expected_intent"
    $hasExpectedBehavior = $case.PSObject.Properties.Name -contains "expected_behavior"
    if (-not ($hasExpectedIntent -or $hasExpectedBehavior)) {
        throw "Case $($case.id) must include expected_intent or expected_behavior"
    }

    if ($ids.ContainsKey($case.id)) {
        throw "Duplicate test id: $($case.id)"
    }
    $ids[$case.id] = $true

    $sceneKey = [string]$case.scene
    if (-not $sceneCounts.ContainsKey($sceneKey)) {
        $sceneCounts[$sceneKey] = 0
    }
    $sceneCounts[$sceneKey] += 1
}

foreach ($requiredId in $requiredIds) {
    if (-not $ids.ContainsKey($requiredId)) {
        throw "Missing required coverage case id: $requiredId"
    }
}

if ($null -ne $mirror) {
    if ($mirror.Count -ne $primary.Count) {
        throw "Mirror test count mismatch: $PrimaryPath has $($primary.Count), $MirrorPath has $($mirror.Count)"
    }

    $primaryJson = ($primary | ConvertTo-Json -Depth 20 -Compress)
    $mirrorJson = ($mirror | ConvertTo-Json -Depth 20 -Compress)
    if ($primaryJson -ne $mirrorJson) {
        throw "Primary and mirror test prompts differ"
    }
}

if (Test-Path -LiteralPath $StateExamplePath) {
    $stateExample = Get-Content -Raw -Encoding UTF8 -LiteralPath $StateExamplePath | ConvertFrom-Json
    if (-not ($stateExample.PSObject.Properties.Name -contains "preferences")) {
        throw "State example is missing preferences: $StateExamplePath"
    }
    if ($null -ne $stateExample.preferences.vault_path) {
        throw "State example must not include a real vault_path"
    }
    if ($null -ne $stateExample.preferences.vault_name) {
        throw "State example must not include a real vault_name"
    }
} else {
    throw "Missing state example: $StateExamplePath"
}

Write-Output "Hub test prompts valid."
Write-Output "Primary: $PrimaryPath"
if ($null -ne $mirror) {
    Write-Output "Mirror: $MirrorPath"
}
Write-Output "State example: $StateExamplePath"
Write-Output "Total cases: $($primary.Count)"
Write-Output "Scene coverage:"
foreach ($key in ($sceneCounts.Keys | Sort-Object)) {
    Write-Output ("  {0}: {1}" -f $key, $sceneCounts[$key])
}
