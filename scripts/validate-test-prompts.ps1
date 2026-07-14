param(
    [string]$PrimaryPath = "skills/second-brain-hub/test-prompts.json",
    [string]$MirrorPath = "",
    [string]$StateExamplePath = "skills/second-brain-hub/hub-state.example.json",
    [string]$ContractPath = "skills/second-brain-hub/route-contracts.json",
    [string]$CapabilityContractPath = "skills/second-brain-hub/capability-contracts.json",
    [string]$HubSkillPath = "skills/second-brain-hub/SKILL.md",
    [string]$IntentCasePath = "tests/hub/intent-routing.json",
    [string]$RouteCasePath = "tests/hub/route-contract-cases.json",
    [string]$E2ECasePath = "tests/hub/e2e-cases.json",
    [string]$GateCasePath = "tests/hub/gate-cases.json"
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
        foreach ($property in @("id", "intent", "mode", "requires_vault", "step_order", "required_steps", "conditional_steps", "required_outputs")) {
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

function Assert-SequenceEqual {
    param(
        [array]$Actual,
        [array]$Expected,
        [string]$Description
    )

    if ($Actual.Count -ne $Expected.Count) {
        throw "$Description count mismatch: expected $($Expected.Count), got $($Actual.Count)"
    }

    for ($index = 0; $index -lt $Expected.Count; $index++) {
        if ($Actual[$index] -ne $Expected[$index]) {
            throw "${Description} differs at index ${index}: expected '$($Expected[$index])', got '$($Actual[$index])'"
        }
    }
}

function Get-CapabilityIdForStep {
    param([string]$Step)

    if ($Step.StartsWith("hub.")) {
        return $null
    }

    return (($Step -replace "\(.*$", "") -replace "/.*$", "")
}

function Read-CapabilityContracts {
    param(
        [string]$Path,
        [hashtable]$RouteContracts
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing capability contract file: $Path"
    }

    $data = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path | ConvertFrom-Json
    foreach ($property in @("schema_version", "source_of_truth", "capabilities")) {
        if (-not ($data.PSObject.Properties.Name -contains $property)) {
            throw "Capability contracts are missing required property '$property'"
        }
    }
    if ($data.source_of_truth -ne "skills/") {
        throw "Capability contracts must declare skills/ as source_of_truth"
    }

    $capabilities = @{}
    foreach ($capability in @($data.capabilities)) {
        foreach ($property in @("id", "implementation", "inputs", "outputs", "gates", "failure_mode", "side_effects")) {
            if (-not ($capability.PSObject.Properties.Name -contains $property)) {
                throw "Capability contract is missing required property '$property'"
            }
        }
        if ($capabilities.ContainsKey($capability.id)) {
            throw "Duplicate capability contract id: $($capability.id)"
        }
        if (@($capability.inputs).Count -eq 0 -or @($capability.outputs).Count -eq 0) {
            throw "Capability '$($capability.id)' must define at least one input and output"
        }
        if ([string]::IsNullOrWhiteSpace($capability.failure_mode)) {
            throw "Capability '$($capability.id)' must define failure_mode"
        }

        $skillDefinitionPath = [string]$capability.implementation
        if (-not (Test-Path -LiteralPath $skillDefinitionPath)) {
            throw "Capability '$($capability.id)' points to missing implementation: $skillDefinitionPath"
        }
        $skillDefinition = Get-Content -Raw -Encoding UTF8 -LiteralPath $skillDefinitionPath
        foreach ($gate in @($capability.gates)) {
            if ($skillDefinition -notmatch [regex]::Escape("<HARD-GATE id=`"$gate`">")) {
                throw "Capability '$($capability.id)' declares missing HARD-GATE '$gate'"
            }
        }
        $capabilities[$capability.id] = $capability
    }

    foreach ($route in $RouteContracts.Values) {
        foreach ($step in @($route.step_order)) {
            $capabilityId = Get-CapabilityIdForStep -Step $step
            if ($null -ne $capabilityId -and -not $capabilities.ContainsKey($capabilityId)) {
                throw "Route '$($route.id)' references step '$step' without a capability contract"
            }
        }
    }

    return $capabilities
}

function Assert-RouteCases {
    param(
        [string]$Path,
        [hashtable]$RouteContracts
    )

    $cases = Read-TestPrompts -Path $Path
    $coveredContracts = @{}
    foreach ($case in $cases) {
        foreach ($property in @("id", "contract_id", "expected_required_chain", "expected_conditional_steps")) {
            Assert-HasProperty -Item $case -Name $property -CaseId "<route-case>"
        }
        if (-not $RouteContracts.ContainsKey($case.contract_id)) {
            throw "Route case $($case.id) references unknown contract_id '$($case.contract_id)'"
        }
        if ($coveredContracts.ContainsKey($case.contract_id)) {
            throw "Duplicate route case for contract_id '$($case.contract_id)'"
        }

        $contract = $RouteContracts[$case.contract_id]
        $conditionalIds = @($contract.conditional_steps | ForEach-Object { $_.id })
        Assert-SequenceEqual -Actual @($case.expected_required_chain) -Expected @($contract.required_steps) -Description "Route case $($case.id) required chain"
        Assert-SequenceEqual -Actual @($case.expected_conditional_steps) -Expected $conditionalIds -Description "Route case $($case.id) conditional steps"
        $coveredContracts[$case.contract_id] = $true
    }

    foreach ($contractId in $RouteContracts.Keys) {
        if (-not $coveredContracts.ContainsKey($contractId)) {
            throw "Missing route case for contract_id '$contractId'"
        }
    }

    return $cases
}

function Assert-E2ECases {
    param(
        [string]$Path,
        [hashtable]$RouteContracts,
        [object]$RouteContractDocument
    )

    $cases = Read-TestPrompts -Path $Path
    $writeEvidence = @($RouteContractDocument.write_preflight)

    foreach ($case in $cases) {
        foreach ($property in @("id", "contract_id", "input", "expected_intent", "expected_final_action", "expected_evidence")) {
            Assert-HasProperty -Item $case -Name $property -CaseId "<e2e-case>"
        }
        if (-not $RouteContracts.ContainsKey($case.contract_id)) {
            throw "E2E case $($case.id) references unknown contract_id '$($case.contract_id)'"
        }

        $contract = $RouteContracts[$case.contract_id]
        if ($case.expected_intent -ne $contract.intent) {
            throw "E2E case $($case.id) intent '$($case.expected_intent)' does not match contract '$($contract.intent)'"
        }

        $expectedAction = switch ($contract.mode) {
            "write" { "create" }
            "update" { "edit" }
            default { $contract.mode }
        }
        if ($case.expected_final_action -ne $expectedAction) {
            throw "E2E case $($case.id) action '$($case.expected_final_action)' does not match contract mode '$($contract.mode)'"
        }

        $globalEvidence = @($RouteContractDocument.global_preflight | Where-Object {
            $_.applies_to -eq "all" -or ($_.applies_to -eq "vault-scenes" -and $contract.requires_vault)
        } | ForEach-Object { $_.id })
        foreach ($evidence in $globalEvidence) {
            if ($evidence -notin @($case.expected_evidence)) {
                throw "E2E case $($case.id) is missing global evidence '$evidence'"
            }
        }
        foreach ($preflight in $writeEvidence) {
            if ($preflight.applies_to -like "*$($contract.mode)*" -and $preflight.id -notin @($case.expected_evidence)) {
                throw "E2E case $($case.id) is missing write evidence '$($preflight.id)'"
            }
        }

        $conditionalIds = @($contract.conditional_steps | ForEach-Object { $_.id })
        foreach ($property in @("expected_executed_conditional_steps", "expected_skipped_conditional_steps")) {
            if ($case.PSObject.Properties.Name -contains $property) {
                foreach ($step in @($case.$property)) {
                    if ($step -notin $conditionalIds) {
                        throw "E2E case $($case.id) references non-conditional step '$step'"
                    }
                }
            }
        }
    }

    return $cases
}

function Assert-GateCases {
    param(
        [string]$Path,
        [hashtable]$Capabilities
    )

    $cases = Read-TestPrompts -Path $Path
    foreach ($case in $cases) {
        foreach ($property in @("capability", "required_gates")) {
            Assert-HasProperty -Item $case -Name $property -CaseId "<gate-case>"
        }
        if (-not $Capabilities.ContainsKey($case.capability)) {
            throw "Gate case references unknown capability '$($case.capability)'"
        }
        $capability = $Capabilities[$case.capability]
        Assert-SequenceEqual -Actual @($case.required_gates) -Expected @($capability.gates) -Description "Gate case $($case.capability)"
    }
    return $cases
}

function Assert-HubSkillStructure {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing Hub SKILL.md: $Path"
    }

    $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path
    $frontmatter = [regex]::Match($content, "(?s)\A---\r?\n(.*?)\r?\n---")
    if (-not $frontmatter.Success) {
        throw "Hub SKILL.md has invalid YAML frontmatter"
    }
    $keys = @($frontmatter.Groups[1].Value -split "\r?\n" | Where-Object { $_ -match "^([a-zA-Z0-9_-]+):" } | ForEach-Object { $Matches[1] })
    Assert-SequenceEqual -Actual $keys -Expected @("name", "description") -Description "Hub frontmatter keys"

    $skillDirectory = Split-Path -Parent $Path
    $referenceMatches = [regex]::Matches($content, "\]\((references/[^)#]+)\)")
    foreach ($match in $referenceMatches) {
        $referencePath = Join-Path $skillDirectory ($match.Groups[1].Value -replace "/", "\")
        if (-not (Test-Path -LiteralPath $referencePath)) {
            throw "Hub SKILL.md links to missing reference: $($match.Groups[1].Value)"
        }
    }

    $nestedSkills = @(Get-ChildItem -LiteralPath (Join-Path $skillDirectory "references") -Recurse -File -Filter "SKILL.md")
    if ($nestedSkills.Count -ne 0) {
        throw "Hub references must not contain discoverable nested SKILL.md files"
    }

    $publicMethodSkills = @(Get-ChildItem -LiteralPath "skills" -Directory | Where-Object {
        Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md")
    } | ForEach-Object { $_.Name })
    Assert-SequenceEqual -Actual $publicMethodSkills -Expected @("second-brain-hub") -Description "Top-level public Skill set"

    $agentMetadata = Join-Path $skillDirectory "agents/openai.yaml"
    if (-not (Test-Path -LiteralPath $agentMetadata)) {
        throw "Missing Hub agents/openai.yaml"
    }
}

$null = Assert-HubSkillStructure -Path $HubSkillPath
$primary = Read-TestPrompts -Path $PrimaryPath
$contracts = Read-RouteContracts -Path $ContractPath
$routeContractDocument = Get-Content -Raw -Encoding UTF8 -LiteralPath $ContractPath | ConvertFrom-Json
$capabilities = Read-CapabilityContracts -Path $CapabilityContractPath -RouteContracts $contracts
$intentCases = Read-TestPrompts -Path $IntentCasePath
$routeCases = Assert-RouteCases -Path $RouteCasePath -RouteContracts $contracts
$e2eCases = Assert-E2ECases -Path $E2ECasePath -RouteContracts $contracts -RouteContractDocument $routeContractDocument
$gateCases = Assert-GateCases -Path $GateCasePath -Capabilities $capabilities
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
Write-Output "Hub skill structure valid: $HubSkillPath"
Write-Output "Primary: $PrimaryPath"
if ($null -ne $mirror) {
    Write-Output "Mirror: $MirrorPath"
}
Write-Output "State example: $StateExamplePath"
Write-Output "Route contracts: $ContractPath ($($contracts.Count) scenes)"
Write-Output "Capability contracts: $CapabilityContractPath ($($capabilities.Count) capabilities)"
Write-Output "Test layers: intent=$($intentCases.Count), route=$($routeCases.Count), e2e=$($e2eCases.Count), gates=$($gateCases.Count)"
Write-Output "Total cases: $($primary.Count)"
Write-Output "Scene coverage:"
foreach ($key in ($sceneCounts.Keys | Sort-Object)) {
    Write-Output ("  {0}: {1}" -f $key, $sceneCounts[$key])
}
