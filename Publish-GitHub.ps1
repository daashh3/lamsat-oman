param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$lamsatGitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
$lamsatGit = if ($lamsatGitCommand) { $lamsatGitCommand.Source } else { $null }
if (-not $lamsatGit) {
    # Standard installations, then the Git runtime already installed with Codex.
    $lamsatCandidates = @(
        "$env:ProgramFiles\Git\cmd\git.exe"
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
        'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1119-907-0_26.1119.907.0_x64__3k8sg7r9htsxt\dependencies\native\git\cmd\git.exe'
    )
    $lamsatGit = $lamsatCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $lamsatGit) {
        try {
            $lamsatGit = Get-AppxPackage -Name 'OpenAI.CodexPrimaryRuntime*' -ErrorAction Stop |
                ForEach-Object { Join-Path $_.InstallLocation 'dependencies\native\git\cmd\git.exe' } |
                Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        } catch { }
    }
}
if (-not $lamsatGit) { throw 'Git was not found. Install Git for Windows from https://git-scm.com/downloads/win and retry.' }

function Invoke-LamsatGit {
    & $lamsatGit -C $PSScriptRoot @args
    if ($LASTEXITCODE -ne 0) { throw "Git failed ($LASTEXITCODE). No further publishing steps were run." }
}

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot '.git'))) {
    throw 'This project must be connected to its GitHub repository before publishing.'
}
$lamsatRemote = Invoke-LamsatGit remote get-url origin
if ($lamsatRemote -ne 'https://github.com/daashh3/lamsat-oman.git') {
    throw 'The repository address does not match daashh3/lamsat-oman. Review origin before publishing.'
}
$lamsatBranch = Invoke-LamsatGit branch --show-current
if ($lamsatBranch -ne 'main') { throw 'Switch to the main branch before publishing.' }
if ($CheckOnly) {
    Invoke-LamsatGit --version
    Write-Host "Ready: $lamsatRemote"
    exit 0
}

# Preserve GitHub history; never force-push or discard local files.
Invoke-LamsatGit fetch origin main
& $lamsatGit -C $PSScriptRoot merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) { throw 'GitHub has changes not present locally. Integrate them before publishing.' }
Invoke-LamsatGit add --all
& $lamsatGit -C $PSScriptRoot diff --cached --quiet
$lamsatDiffExit = $LASTEXITCODE
if ($lamsatDiffExit -eq 1) {
    Invoke-LamsatGit commit -m 'Publish Lamsat Oman'
} elseif ($lamsatDiffExit -ne 0) { throw 'Could not check staged changes.' }
Invoke-LamsatGit push -u origin main
Write-Host 'Uploaded. In GitHub: Settings > Pages > Source > GitHub Actions.'
Write-Host 'Then Actions > Publish Lamsat Oman > Run workflow > main.'
