param(
    [string]$PrimaryPath = "skills/second-brain-hub/test-prompts.json",
    [string]$MirrorPath = "",
    [string]$StateExamplePath = "skills/second-brain-hub/hub-state.example.json",
    [string]$ContractPath = "skills/second-brain-hub/route-contracts.json"
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

function Read-RouteContracts {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing route contract file: $Path"
    }

    $data = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path | ConvertFrom-Json
    foreach ($property in @("schema_version", "source_of_truth", "global_preflight", "write_preflight", "scenes")) {
        if (-not ($data.PSObject.Properties.Name -contains $property)) {
            throw "Route contracts are missing required property '$property'"
        }
    }

    if ($data.source_of_truth -ne "skills/") {
        throw "Route contracts must declare skills/ as source_of_truth"
    }

    $contracts = @{}
    foreach ($scene in @($data.scenes)) {
        foreach ($property in @("id", "intent", "mode", "step_order", "required_steps", "conditional_steps", "required_outputs")) {
            if (-not ($scene.PSObject.Properties.Name -contains $property)) {
                throw "Route contract is missing required property '$property'"
            }
        }

        if ($contracts.ContainsKey($scene.id)) {
            throw "Duplicate route contract id: $($scene.id)"
        }

        $stepOrder = @($scene.step_order)
        $requiredSteps = @($scene.required_steps)
        if ($stepOrder.Count -eq 0 -or $requiredSteps.Count -eq 0) {
            throw "Route contract '$($scene.id)' must define step_order and required_steps"
        }

        foreach ($step in $requiredSteps) {
            if ($step -notin $stepOrder) {
                throw "Route contract '$($scene.id)' has required step '$step' missing from step_order"
            }
        }

        foreach ($conditional in @($scene.conditional_steps)) {
            foreach ($property in @("id", "run_when", "skip_evidence")) {
                if (-not ($conditional.PSObject.Properties.Name -contains $property)) {
                    throw "Route contract '$($scene.id)' has conditional step missing '$property'"
                }
            }
            if ($conditional.id -notin $stepOrder) {
                throw "Route contract '$($scene.id)' has conditional step '$($conditional.id)' missing from step_order"
            }
        }

        if ($scene.mode -eq "write" -and "obsidian-markdown" -notin $requiredSteps) {
            throw "Write route '$($scene.id)' must render obsidian-markdown"
        }

        $contracts[$scene.id] = $scene
    }

    return $contracts
}

function Assert-ChainMatchesContract {
    param(
        [object]$Case,
        [object]$Contract
    )

    if (-not ($Case.PSObject.Properties.Name -contains "expected_chain")) {
        return
    }

    $expectedChain = @($Case.expected_chain)
    $stepOrder = @($Contract.step_order)
    $requiredSteps = @($Contract.required_steps)

    foreach ($step in $expectedChain) {
        if ($step -notin $stepOrder) {
            throw "Case $($Case.id) contains '$step', which is not allowed by contract '$($Contract.id)'"
        }
    }

    foreach ($step in $requiredSteps) {
        if ($step -notin $expectedChain) {
            throw "Case $($Case.id) is missing required contract step '$step'"
        }
    }

    $lastIndex = -1
    foreach ($step in $expectedChain) {
        $index = [array]::IndexOf($stepOrder, $step)
        if ($index -le $lastIndex) {
            throw "Case $($Case.id) has an out-of-order expected_chain for contract '$($Contract.id)'"
        }
        $lastIndex = $index
    }
}

$primary = Read-TestPrompts -Path $PrimaryPath
$contracts = Read-RouteContracts -Path $ContractPath
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

    if ($case.PSObject.Properties.Name -contains "contract_id") {
        if (-not $contracts.ContainsKey($case.contract_id)) {
            throw "Case $($case.id) references unknown contract_id '$($case.contract_id)'"
        }
        Assert-ChainMatchesContract -Case $case -Contract $contracts[$case.contract_id]
    } elseif ($case.PSObject.Properties.Name -contains "expected_chain") {
        throw "Case $($case.id) has expected_chain but no contract_id"
    }
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
Write-Output "Route contracts: $ContractPath ($($contracts.Count) scenes)"
Write-Output "Total cases: $($primary.Count)"
Write-Output "Scene coverage:"
foreach ($key in ($sceneCounts.Keys | Sort-Object)) {
    Write-Output ("  {0}: {1}" -f $key, $sceneCounts[$key])
}
