[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$statePath = Join-Path $root '.houseprice-dev-processes.json'
$fallbackTitles = @('houseprice-python', 'houseprice-java', 'houseprice-portal')

function Get-ProcessTreeIds {
    param(
        [int]$RootPid
    )

    $allProcesses = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
    $pending = [System.Collections.Generic.Queue[int]]::new()
    $pending.Enqueue($RootPid)
    $collected = [System.Collections.Generic.HashSet[int]]::new()

    while ($pending.Count -gt 0) {
        $current = $pending.Dequeue()
        if (-not $collected.Add($current)) {
            continue
        }

        foreach ($child in ($allProcesses | Where-Object { $_.ParentProcessId -eq $current })) {
            $pending.Enqueue([int]$child.ProcessId)
        }
    }

    return @($collected)
}

function Stop-ProcessTree {
    param(
        [int]$RootPid,
        [string]$Label
    )

    try {
        $null = Get-Process -Id $RootPid -ErrorAction Stop
    } catch {
        Write-Host "Skipping $Label; root PID $RootPid is not running."
        return
    }

    $treeIds = Get-ProcessTreeIds -RootPid $RootPid | Sort-Object -Descending
    if ($DryRun) {
        Write-Host ("[dry-run] Would stop {0}: {1}" -f $Label, ($treeIds -join ', '))
        return
    }

    foreach ($processId in $treeIds) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
        }
    }

    Write-Host ("Stopped {0}: {1}" -f $Label, ($treeIds -join ', '))
}

function Stop-ProcessesByCommandPattern {
    param(
        [string]$Label,
        [string[]]$Patterns
    )

    $matches = Get-CimInstance Win32_Process | Where-Object {
        $commandLine = $_.CommandLine
        if (-not $commandLine) {
            return $false
        }

        foreach ($pattern in $Patterns) {
            if ($commandLine -like "*$pattern*") {
                return $true
            }
        }

        return $false
    } | Select-Object -ExpandProperty ProcessId -Unique

    foreach ($processId in $matches) {
        Stop-ProcessTree -RootPid ([int]$processId) -Label $Label
    }
}

$processEntries = @()

if (Test-Path $statePath) {
    $state = Get-Content -Path $statePath -Raw | ConvertFrom-Json
    if ($state -is [System.Array]) {
        $processEntries = @($state)
    } else {
        $processEntries = @($state)
    }
} else {
    foreach ($title in $fallbackTitles) {
        $windows = Get-Process -Name powershell -ErrorAction SilentlyContinue |
            Where-Object { $_.MainWindowTitle -eq $title }
        foreach ($window in $windows) {
            $processEntries += [pscustomobject]@{
                Name = $title
                Title = $title
                Pid = $window.Id
            }
        }
    }
}

if (-not $processEntries) {
    Write-Host 'No recorded development service processes found.'
} else {
    foreach ($entry in $processEntries) {
        if ($entry.Pid) {
            Stop-ProcessTree -RootPid ([int]$entry.Pid) -Label $entry.Title
        }
    }
}

Stop-ProcessesByCommandPattern -Label 'houseprice-portal orphan' -Patterns @(
    'portal\node_modules\next\dist\bin\next',
    'portal\node_modules\next\dist\server\lib\start-server.js',
    'cmd.exe /d /s /c next dev'
)

Stop-ProcessesByCommandPattern -Label 'houseprice-python orphan' -Patterns @(
    '-m uvicorn app.main:app --reload'
)

Stop-ProcessesByCommandPattern -Label 'houseprice-java orphan' -Patterns @(
    'spring-boot:run',
    'com.houseprice.market.MarketBackendApplication'
)

if ((Test-Path $statePath) -and (-not $DryRun)) {
    Remove-Item -Path $statePath -Force
    Write-Host "Removed process state: $statePath"
}