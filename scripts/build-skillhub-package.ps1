param(
    [string]$OutputPath = "artifacts/skillhub/second-brain-hub"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $Root "skills/second-brain-hub"
$Destination = Join-Path $Root $OutputPath

if (-not (Test-Path -LiteralPath (Join-Path $Source "SKILL.md"))) {
    throw "Missing second-brain-hub/SKILL.md"
}

if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force

$skillFiles = @(Get-ChildItem -LiteralPath $Destination -Recurse -File -Filter "SKILL.md")
if ($skillFiles.Count -ne 1 -or $skillFiles[0].Directory.Name -ne "second-brain-hub") {
    throw "SkillHub package must contain exactly one discoverable SKILL.md"
}

$dependencies = Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path $Destination "dependencies.json") | ConvertFrom-Json
if (@($dependencies.dependencies).Count -ne 5) {
    throw "SkillHub package must declare five hidden dependencies"
}

# 生成上传用 zip。不能用 Compress-Archive / 资源管理器压缩：
# 它们写入反斜杠路径分隔符，Linux 端 unzip 会报
# "appears to use backslashes as path separators" 导致安全扫描失败。
# 这里逐条创建条目并强制使用正斜杠。
Add-Type -AssemblyName System.IO.Compression.FileSystem
$ZipPath = Join-Path (Split-Path -Parent $Destination) "second-brain-hub.zip"
if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}
$zip = [System.IO.Compression.ZipFile]::Open($ZipPath, "Create")
try {
    foreach ($file in @(Get-ChildItem -LiteralPath $Destination -Recurse -File)) {
        $relative = $file.FullName.Substring($Destination.TrimEnd('\').Length + 1) -replace '\\', '/'
        $entryName = "second-brain-hub/$relative"
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Output "SkillHub package ready: $Destination"
Write-Output "SkillHub upload zip: $ZipPath"
Write-Output "Discoverable Skills: 1 (second-brain-hub)"
Write-Output "Hidden install dependencies: $(@($dependencies.dependencies).Count)"
