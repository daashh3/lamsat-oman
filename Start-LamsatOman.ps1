$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$lamsatNode = if ($nodeCommand) { $nodeCommand.Source } else {
    Get-ChildItem -Path "$env:ProgramFiles\WindowsApps\OpenAI.CodexPrimaryRuntime.*\dependencies\node\bin\node.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $lamsatNode) { throw 'Install Node.js 22.12 or later with npm, then run npm install and npm run dev.' }
if (-not (Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) { throw 'Dependencies are missing. Run npm install in this project first.' }
Write-Host 'Opening Lamsat Oman at http://127.0.0.1:5173/ . Keep this window open; Ctrl+C stops the server.'
& $lamsatNode 'node_modules/vite/bin/vite.js' '--host' '127.0.0.1' '--open'
