param(
    [string]$JavaHome = 'C:\Program Files\Unity\Hub\Editor\6000.6.8f1\Editor\Data\PlaybackEngines\AndroidPlayer\OpenJDK',
    [string]$AndroidSdk = 'C:\Program Files\Unity\Hub\Editor\6000.6.8f1\Editor\Data\PlaybackEngines\AndroidPlayer\SDK',
    [int]$VersionCode = 1,
    [string]$VersionName = '1.0.0',
    [string]$UnsignedApk
)

$ErrorActionPreference = 'Stop'
$lamsatBuild = Join-Path $PSScriptRoot 'quest\build'
$lamsatKey = Join-Path $PSScriptRoot 'quest\signing\release.keystore'
$lamsatSecretFile = Join-Path $PSScriptRoot 'quest\signing\password.clixml'
$lamsatJava = Join-Path $JavaHome 'bin\java.exe'
$lamsatTools = Join-Path $AndroidSdk 'build-tools\36.0.0'
$lamsatNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$lamsatNode = if ($lamsatNodeCommand) { $lamsatNodeCommand.Source } else {
    'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1119-907-0_26.1119.907.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe'
}
foreach ($lamsatRequired in @($lamsatJava, $lamsatNode, $lamsatKey, $lamsatSecretFile, (Join-Path $lamsatTools 'zipalign.exe'))) {
    if (-not (Test-Path -LiteralPath $lamsatRequired)) { throw "Required build file missing: $lamsatRequired" }
}
if ($VersionCode -lt 1) { throw 'VersionCode must be positive.' }
$lamsatPrevious = @{}
foreach ($lamsatName in @('JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','GRADLE_USER_HOME','LAMSAT_VERSION_CODE','LAMSAT_VERSION_NAME')) {
    $lamsatPrevious[$lamsatName] = [Environment]::GetEnvironmentVariable($lamsatName, 'Process')
}
Push-Location -LiteralPath $PSScriptRoot
try {
    $env:JAVA_HOME = $JavaHome
    $env:ANDROID_HOME = $AndroidSdk
    $env:ANDROID_SDK_ROOT = $AndroidSdk
    $env:GRADLE_USER_HOME = Join-Path $PSScriptRoot '.tools\gradle-home'
    $env:LAMSAT_VERSION_CODE = [string]$VersionCode
    $env:LAMSAT_VERSION_NAME = $VersionName
    if ($UnsignedApk) {
        $lamsatUnsigned = (Resolve-Path -LiteralPath $UnsignedApk).Path
    } else {
        & $lamsatNode 'quest/generate-project.mjs'
        if ($LASTEXITCODE) { throw 'Quest project generation failed.' }
        [IO.File]::WriteAllText((Join-Path $lamsatBuild 'local.properties'), ('sdk.dir=' + $AndroidSdk.Replace('\','/')), [Text.UTF8Encoding]::new($false))
        & (Join-Path $lamsatBuild 'gradlew.bat') -p $lamsatBuild --no-daemon --max-workers=2 '-Dorg.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8' assembleRelease
        if ($LASTEXITCODE) { throw 'Android release build failed.' }
        $lamsatUnsigned = Join-Path $lamsatBuild 'app\build\outputs\apk\release\app-release-unsigned.apk'
    }
    $lamsatBadging = & (Join-Path $lamsatTools 'aapt2.exe') dump badging $lamsatUnsigned
    if ($LASTEXITCODE -or ($lamsatBadging -join "`n") -notmatch "package: name='om.lamsat.quest'" -or ($lamsatBadging -join "`n") -notmatch "targetSdkVersion:'32'") {
        throw 'The unsigned APK does not match the Quest application package/target SDK.'
    }
    $lamsatAligned = Join-Path $lamsatBuild 'app-release-aligned.apk'
    $lamsatApk = Join-Path $lamsatBuild 'app-release-signed.apk'
    & (Join-Path $lamsatTools 'zipalign.exe') -P 16 -f 4 $lamsatUnsigned $lamsatAligned
    if ($LASTEXITCODE) { throw 'APK alignment failed.' }

    # DPAPI decrypts only for the Windows account that created the key.
    # The password is passed in the process environment, never in command arguments or logs.
    $lamsatSecure = Import-Clixml -LiteralPath $lamsatSecretFile
    $lamsatPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($lamsatSecure)
    try { $env:LAMSAT_SIGNING_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($lamsatPtr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($lamsatPtr) }
    $lamsatSigner = Join-Path $lamsatTools 'lib\apksigner.jar'
    & $lamsatJava -jar $lamsatSigner sign --ks $lamsatKey --ks-key-alias lamsat-oman --ks-pass env:LAMSAT_SIGNING_PASSWORD --key-pass env:LAMSAT_SIGNING_PASSWORD --out $lamsatApk $lamsatAligned
    if ($LASTEXITCODE) { throw 'APK signing failed.' }
    Remove-Item Env:\LAMSAT_SIGNING_PASSWORD
    $lamsatVerification = & $lamsatJava -jar $lamsatSigner verify --verbose --print-certs $lamsatApk
    if ($LASTEXITCODE) { throw 'APK signature verification failed.' }
    $lamsatFingerprint = (Get-Content -LiteralPath (Join-Path $lamsatBuild 'certificate-sha256.txt') -Raw).Trim()
    $lamsatHex = $lamsatFingerprint.Replace(':','')
    if (($lamsatVerification -join "`n") -notmatch "certificate SHA-256 digest: $lamsatHex") { throw 'The APK is signed with an unexpected certificate.' }
    $lamsatLinks = Invoke-RestMethod -Uri 'https://daashh3.github.io/.well-known/assetlinks.json'
    $lamsatMatch = @($lamsatLinks | Where-Object {
        $_.target.namespace -eq 'android_app' -and $_.target.package_name -eq 'om.lamsat.quest' -and
        $_.relation -contains 'delegate_permission/common.handle_all_urls' -and
        $_.target.sha256_cert_fingerprints -contains $lamsatFingerprint
    })
    if (-not $lamsatMatch.Count) { throw 'APK built, but the hosted signing certificate link is not ready.' }
    $lamsatVerification | Set-Content -LiteralPath (Join-Path $lamsatBuild 'signature-verification.txt')
    $lamsatBadging | Set-Content -LiteralPath (Join-Path $lamsatBuild 'apk-metadata.txt')
    Get-FileHash -LiteralPath $lamsatApk -Algorithm SHA256 | Select-Object Algorithm, Hash, Path
    Write-Host "Signed and verified Quest APK: $lamsatApk"
} finally {
    Remove-Item Env:\LAMSAT_SIGNING_PASSWORD -ErrorAction SilentlyContinue
    foreach ($lamsatName in $lamsatPrevious.Keys) { [Environment]::SetEnvironmentVariable($lamsatName, $lamsatPrevious[$lamsatName], 'Process') }
    Pop-Location
}
