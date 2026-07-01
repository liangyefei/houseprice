[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $root '.venv\Scripts\python.exe'
$portalDir = Join-Path $root 'portal'
$javaDir = Join-Path $root 'java-backend'
$statePath = Join-Path $root '.houseprice-dev-processes.json'

function Test-CommandPath {
    param(
        [string]$Path
    )

    return [System.IO.File]::Exists($Path)
}

function Get-VersionText {
    param(
        [string]$CommandPath,
        [string[]]$Arguments
    )

    $quotedCommand = '"{0}" {1} 2>&1' -f $CommandPath, ($Arguments -join ' ')
    $output = cmd.exe /d /c $quotedCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to query version from $CommandPath."
    }

    return ($output | Select-Object -First 1)
}

function Get-MavenCommand {
    $candidates = @()

    if ($env:MAVEN_HOME) {
        $candidates += (Join-Path $env:MAVEN_HOME 'bin\mvn.cmd')
    }

    $candidates += 'C:\Users\57326\tools\maven-3.9.15\bin\mvn.cmd'

    $toolRoots = @(
        'C:\Users\57326\tools',
        (Join-Path $env:USERPROFILE 'tools')
    ) | Select-Object -Unique

    foreach ($toolRoot in $toolRoots) {
        if (Test-Path $toolRoot) {
            $matches = Get-ChildItem -Path $toolRoot -Filter 'mvn.cmd' -Recurse -ErrorAction SilentlyContinue |
                Sort-Object FullName -Descending
            if ($matches) {
                $candidates += $matches.FullName
            }
        }
    }

    try {
        $pathCommand = Get-Command mvn -ErrorAction Stop
        $candidates += $pathCommand.Source
    } catch {
    }

    foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        if (-not (Test-CommandPath $candidate)) {
            continue
        }

        $versionText = Get-VersionText -CommandPath $candidate -Arguments @('-version')
        if ($versionText -match 'Apache Maven\s+(\d+\.\d+\.\d+)') {
            $version = [version]$matches[1]
            if ($version -ge [version]'3.6.3') {
                return $candidate
            }
        }
    }

    throw 'Compatible Maven 3.6.3+ not found. Install Maven 3.9.x or update MAVEN_HOME.'
}

function Get-JavaHome {
    $candidates = @()

    if ($env:JAVA_HOME) {
        $candidates += $env:JAVA_HOME
    }

    $jdkRoots = @(
        'C:\Program Files\Eclipse Adoptium',
        (Join-Path $env:USERPROFILE '.jdks')
    )

    foreach ($jdkRoot in $jdkRoots) {
        if (Test-Path $jdkRoot) {
            $matches = Get-ChildItem -Path $jdkRoot -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -match 'jdk-?(25|26)|temurin-25|openjdk-26' } |
                Sort-Object Name -Descending
            if ($matches) {
                $candidates += $matches.FullName
            }
        }
    }

    foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        $javacPath = Join-Path $candidate 'bin\javac.exe'
        if (-not (Test-CommandPath $javacPath)) {
            continue
        }

        $versionText = cmd.exe /d /c ('"{0}" -version 2>&1' -f $javacPath)
        if ($LASTEXITCODE -ne 0) {
            continue
        }

        $versionLine = $versionText | Select-Object -First 1
        if ($versionLine -match 'javac\s+(\d+)') {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -ge 25) {
                return $candidate
            }
        }
    }

    throw 'Compatible JDK 25+ not found. Set JAVA_HOME to a JDK 25 or newer installation.'
}

function Assert-PathExists {
    param(
        [string]$Path,
        [string]$Message
    )

    if (-not (Test-Path $Path)) {
        throw $Message
    }
}

function Start-DevWindow {
    param(
        [string]$Name,
        [string]$Title,
        [string]$WorkingDirectory,
        [string[]]$CommandLines
    )

    $command = @(
        '$Host.UI.RawUI.WindowTitle = ''{0}''' -f $Title
        'Set-Location ''{0}''' -f $WorkingDirectory
    ) + $CommandLines

    $joinedCommand = ($command -join '; ')

    if ($DryRun) {
        Write-Host "[dry-run] $Title"
        Write-Host "  $joinedCommand"
        return [pscustomobject]@{
            Name = $Name
            Title = $Title
            Pid = $null
            WorkingDirectory = $WorkingDirectory
        }
    }

    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy', 'Bypass',
        '-Command', $joinedCommand
    ) -PassThru

    return [pscustomobject]@{
        Name = $Name
        Title = $Title
        Pid = $process.Id
        WorkingDirectory = $WorkingDirectory
    }
}

Assert-PathExists -Path $pythonExe -Message 'Missing .venv\Scripts\python.exe. Create the virtual environment and install requirements first.'
Assert-PathExists -Path (Join-Path $portalDir 'package.json') -Message 'Missing portal\package.json.'
Assert-PathExists -Path (Join-Path $portalDir 'node_modules') -Message 'Missing portal\node_modules. Run npm install in portal first.'
Assert-PathExists -Path (Join-Path $javaDir 'pom.xml') -Message 'Missing java-backend\pom.xml.'

$mavenCmd = Get-MavenCommand
$javaHome = Get-JavaHome

Write-Host "Using Python: $pythonExe"
Write-Host "Using JAVA_HOME: $javaHome"
Write-Host "Using Maven: $mavenCmd"

$startedProcesses = @()

$startedProcesses += Start-DevWindow -Name 'python' -Title 'houseprice-python' -WorkingDirectory $root -CommandLines @(
    '& ''{0}'' -m uvicorn app.main:app --reload' -f $pythonExe
)

$startedProcesses += Start-DevWindow -Name 'java' -Title 'houseprice-java' -WorkingDirectory $javaDir -CommandLines @(
    '$env:JAVA_HOME = ''{0}''' -f $javaHome,
    '$env:Path = ''{0};'' + $env:Path' -f (Split-Path -Parent $mavenCmd),
    '& ''{0}'' spring-boot:run' -f $mavenCmd
)

$startedProcesses += Start-DevWindow -Name 'portal' -Title 'houseprice-portal' -WorkingDirectory $portalDir -CommandLines @(
    '$env:PYTHON_API_URL = ''http://127.0.0.1:8000''',
    '$env:JAVA_API_URL = ''http://127.0.0.1:8080''',
    'if (Test-Path ''.next'') { Remove-Item ''.next'' -Recurse -Force }',
    'npm run dev'
)

if (-not $DryRun) {
    $startedProcesses | ConvertTo-Json | Set-Content -Path $statePath -Encoding UTF8
    Write-Host "Recorded process state: $statePath"
}

Write-Host 'Started development services:'
Write-Host '  Portal: http://localhost:3000'
Write-Host '  Python API: http://127.0.0.1:8000'
Write-Host '  Java API: http://127.0.0.1:8080'