[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('Start', 'Status', 'Stop', 'InstallTask', 'UninstallTask')]
    [string]$Action = 'Status',

    [string]$HubUrl = 'http://127.0.0.1:3006',

    [string]$PublicUrl,

    [string]$NgrokPath = (Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.exe')
)

$ErrorActionPreference = 'Stop'
$taskName = 'SecondBrain-HAPI-Remote-Tunnel'
$ngrokApiUrl = 'http://127.0.0.1:4040/api/tunnels'
$logDirectory = Join-Path $env:LOCALAPPDATA 'ngrok\logs'
$stdoutLog = Join-Path $logDirectory 'hapi-tunnel.stdout.log'
$stderrLog = Join-Path $logDirectory 'hapi-tunnel.stderr.log'
$scriptPath = $PSCommandPath

function Resolve-PublicUrl {
    if ($PublicUrl) {
        return $PublicUrl.TrimEnd('/')
    }

    $settingsPath = Join-Path $env:USERPROFILE '.hapi\settings.json'
    if (-not (Test-Path -LiteralPath $settingsPath)) {
        throw "HAPI settings were not found at $settingsPath. Pass -PublicUrl explicitly."
    }

    $settings = Get-Content -LiteralPath $settingsPath -Raw -Encoding utf8 | ConvertFrom-Json
    if (-not $settings.publicUrl) {
        throw "HAPI publicUrl is missing in $settingsPath."
    }

    return ([string]$settings.publicUrl).TrimEnd('/')
}

function Test-Hub {
    try {
        $response = Invoke-WebRequest -Uri "$HubUrl/" -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Get-NgrokTunnel {
    try {
        $result = Invoke-RestMethod -Uri $ngrokApiUrl -TimeoutSec 5
        return @($result.tunnels) | Where-Object {
            $_.config.addr -eq $HubUrl -and $_.proto -eq 'https'
        } | Select-Object -First 1
    } catch {
        return $null
    }
}

function Get-ManagedNgrokProcesses {
    $expectedPath = [IO.Path]::GetFullPath($NgrokPath)
    return @(Get-Process -Name ngrok -ErrorAction SilentlyContinue | Where-Object {
        try {
            $_.Path -and ([IO.Path]::GetFullPath($_.Path) -eq $expectedPath)
        } catch {
            $false
        }
    })
}

function Get-TunnelStatus {
    $resolvedPublicUrl = Resolve-PublicUrl
    $tunnel = Get-NgrokTunnel
    [pscustomobject]@{
        HubHealthy = Test-Hub
        TunnelHealthy = [bool]$tunnel
        ExpectedPublicUrl = $resolvedPublicUrl
        ActualPublicUrl = if ($tunnel) { $tunnel.public_url } else { $null }
        Upstream = if ($tunnel) { $tunnel.config.addr } else { $null }
        NgrokProcessIds = @((Get-ManagedNgrokProcesses).Id)
        NgrokApi = $ngrokApiUrl
        StdoutLog = $stdoutLog
        StderrLog = $stderrLog
    }
}

function Start-Tunnel {
    $resolvedPublicUrl = Resolve-PublicUrl
    if (-not (Test-Hub)) {
        throw "HAPI is not healthy at $HubUrl. Start the hub before the tunnel."
    }
    if (-not (Test-Path -LiteralPath $NgrokPath -PathType Leaf)) {
        throw "ngrok was not found at $NgrokPath."
    }

    $current = Get-NgrokTunnel
    if ($current -and $current.public_url -eq $resolvedPublicUrl) {
        Get-TunnelStatus
        return
    }

    Get-ManagedNgrokProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $domain = ([Uri]$resolvedPublicUrl).Host
    $arguments = @(
        'http', $HubUrl,
        '--url', $domain,
        '--log', 'stdout',
        '--log-format', 'json'
    )

    Start-Process `
        -FilePath $NgrokPath `
        -ArgumentList $arguments `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog | Out-Null

    $deadline = (Get-Date).AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 500
        $current = Get-NgrokTunnel
        if ($current) { break }
    } while ((Get-Date) -lt $deadline)

    if (-not $current) {
        $detail = if (Test-Path -LiteralPath $stderrLog) {
            (Get-Content -LiteralPath $stderrLog -Tail 20 -Encoding utf8) -join [Environment]::NewLine
        } else {
            'No ngrok error log was created.'
        }
        throw "ngrok did not become healthy within 15 seconds.`n$detail"
    }
    if ($current.public_url -ne $resolvedPublicUrl) {
        throw "ngrok started with unexpected URL '$($current.public_url)'. Expected '$resolvedPublicUrl'."
    }

    Get-TunnelStatus
}

function Stop-Tunnel {
    Get-ManagedNgrokProcesses | Stop-Process -Force
    Start-Sleep -Milliseconds 500
    Get-TunnelStatus
}

function Install-TunnelTask {
    if (-not $scriptPath) {
        throw 'Cannot install the task because the script path is unknown.'
    }

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $taskAction = New-ScheduledTaskAction `
        -Execute 'powershell.exe' `
        -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`" Start"
    $logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
    $repairTrigger = New-ScheduledTaskTrigger `
        -Once `
        -At (Get-Date).AddMinutes(1) `
        -RepetitionInterval (New-TimeSpan -Minutes 5) `
        -RepetitionDuration (New-TimeSpan -Days 3650)
    $principal = New-ScheduledTaskPrincipal `
        -UserId $identity `
        -LogonType Interactive `
        -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -MultipleInstances IgnoreNew `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $taskAction `
        -Trigger @($logonTrigger, $repairTrigger) `
        -Principal $principal `
        -Settings $settings `
        -Description 'Keeps the HAPI ngrok tunnel pointed directly at localhost:3006.' `
        -Force | Out-Null

    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State, Description
}

switch ($Action) {
    'Start' { Start-Tunnel }
    'Status' {
        $status = Get-TunnelStatus
        $status
        if (-not ($status.HubHealthy -and $status.TunnelHealthy -and
            $status.ActualPublicUrl -eq $status.ExpectedPublicUrl)) {
            exit 1
        }
    }
    'Stop' { Stop-Tunnel }
    'InstallTask' { Install-TunnelTask }
    'UninstallTask' {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    }
}
