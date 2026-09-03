param(
    [string]$OutputPath = "artifacts/release/second-brain-install-package"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$SourceSkills = Join-Path $Root "skills"
$Destination = Join-Path $Root $OutputPath
$RequiredSkills = @(
    "second-brain-hub",
    "defuddle",
    "obsidian-markdown",
    "obsidian-cli",
    "obsidian-bases",
    "json-canvas"
)

foreach ($skill in $RequiredSkills) {
    if (-not (Test-Path -LiteralPath (Join-Path $SourceSkills "$skill/SKILL.md"))) {
        throw "Missing required Skill: $skill"
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $Root "install.mjs"))) {
    throw "Missing portable installer entry point: install.mjs"
}

if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

foreach ($skill in $RequiredSkills) {
    $source = Join-Path $SourceSkills $skill
    $target = Join-Path $Destination $skill
    Get-ChildItem -LiteralPath $source -Recurse -Force | Where-Object {
        $_.Name -ne "hub-state.json" -and
        $_.Name -ne "hub-runs" -and
        $_.Name -ne ".second-brain-install.json" -and
        $_.Name -notlike ".second-brain-backup-*" -and
        $_.FullName -notmatch '\\hub-runs(\\|$)' -and
        $_.FullName -notmatch '\\.second-brain-backup-[^\\]+'
    } | ForEach-Object {
        $relative = $_.FullName.Substring($source.Length).TrimStart('\')
        $destinationPath = Join-Path $target $relative
        if ($_.PSIsContainer) {
            New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null
        } else {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destinationPath) | Out-Null
            Copy-Item -LiteralPath $_.FullName -Destination $destinationPath -Force
        }
    }
}
Copy-Item -LiteralPath (Join-Path $Root "install.mjs") -Destination (Join-Path $Destination "install.mjs") -Force

$forbidden = @(Get-ChildItem -LiteralPath $Destination -Recurse -File | Where-Object {
    $_.Name -match '(?i)(evaluation|verification|(^|[-_.])test([-_.]|$)|fixture|quality-gate|behavior-case|hub-state\.json|second-brain-install\.json)'
})
if ($forbidden.Count -ne 0) {
    throw "Offline package contains test-only file(s): $(@($forbidden.FullName) -join ', ')"
}
if (@(Get-ChildItem -LiteralPath $Destination -Recurse -Directory -Filter "hub-runs").Count -ne 0) {
    throw "Offline package contains local Hub run ledgers"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$ZipPath = "${Destination}.zip"
if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}
$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, "Create")
try {
    foreach ($file in @(Get-ChildItem -LiteralPath $Destination -Recurse -File)) {
        $relative = $file.FullName.Substring($Destination.TrimEnd('\').Length + 1) -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Output "Offline installation package ready: $Destination"
Write-Output "Offline installation ZIP: $ZipPath"
Write-Output "Included Skills: $($RequiredSkills.Count)"
