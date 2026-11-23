param(
    [Parameter(Mandatory = $true)][ValidateSet('Prepare', 'Build')][string]$Action,
    [Parameter(Mandatory = $true)][uri]$SiteUrl,
    [string]$Fingerprint
)

$ErrorActionPreference = 'Stop'
if ($SiteUrl.Scheme -ne 'https' -or $SiteUrl.UserInfo -or $SiteUrl.Query -or $SiteUrl.Fragment) {
    throw 'Use the public HTTPS app directory URL without credentials, query or fragment.'
}
if (-not $SiteUrl.AbsolutePath.EndsWith('/')) {
    throw 'SiteUrl must end with / (the app directory, not index.html).'
}
$lamsatNpx = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $lamsatNpx) { throw 'Install Node.js 22 LTS with npm before packaging the Android app.' }

$lamsatManifestUrl = [uri]::new($SiteUrl, 'manifest.webmanifest')
$lamsatManifest = Invoke-RestMethod -Uri $lamsatManifestUrl.AbsoluteUri
if (-not $lamsatManifest.start_url -or -not $lamsatManifest.icons) {
    throw 'The hosted web manifest is not ready. Publish the website first.'
}
$lamsatStart = [uri]::new($lamsatManifestUrl, [string]$lamsatManifest.start_url)
if ($lamsatStart.Scheme -ne 'https' -or $lamsatStart.Authority -ne $SiteUrl.Authority -or -not $lamsatStart.AbsolutePath.StartsWith($SiteUrl.AbsolutePath, [StringComparison]::Ordinal)) {
    throw 'The app launch URL must stay inside the hosted app directory.'
}
$lamsatBuild = Join-Path $PSScriptRoot 'quest\build'
$lamsatConfigPath = Join-Path $lamsatBuild 'twa-manifest.json'
New-Item -ItemType Directory -Path $lamsatBuild -Force | Out-Null

function Invoke-LamsatBubblewrap {
    & $lamsatNpx.Source --yes --package '@meta-quest/bubblewrap-cli@1.24.1' -- bubblewrap @args
    if ($LASTEXITCODE -ne 0) { throw 'Meta Quest Bubblewrap did not complete successfully.' }
}

Push-Location -LiteralPath $lamsatBuild
try {
    if ($Action -eq 'Prepare') {
        if (-not (Test-Path -LiteralPath $lamsatConfigPath)) {
            Write-Host 'Choose immersive mode, keep billing disabled, and keep your signing key/passwords for future updates.'
            Invoke-LamsatBubblewrap init "--manifest=$($lamsatManifestUrl.AbsoluteUri)" --metaquest
        }
        $lamsatConfig = Get-Content -LiteralPath $lamsatConfigPath -Raw | ConvertFrom-Json
        if ($lamsatConfig.host -ne $SiteUrl.Authority -or $lamsatConfig.startUrl -cne $lamsatStart.PathAndQuery) {
            throw 'This Android project already belongs to another app URL; its signing configuration was preserved.'
        }
        foreach ($entry in @{
            isMetaQuest = $true
            horizonOSAppMode = 'immersive'
            display = 'standalone'
            enableNotifications = $false
            enableMicrophone = $false
            enableXRScene = $false
        }.GetEnumerator()) {
            $lamsatConfig | Add-Member -NotePropertyName $entry.Key -NotePropertyValue $entry.Value -Force
        }
        [IO.File]::WriteAllText($lamsatConfigPath, ($lamsatConfig | ConvertTo-Json -Depth 30), [Text.UTF8Encoding]::new($false))
        Invoke-LamsatBubblewrap update --skipVersionUpgrade
        if ($Fingerprint) {
            if ($Fingerprint -notmatch '^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$') { throw 'Fingerprint must be the SHA-256 certificate fingerprint, with colon-separated hex pairs.' }
            Invoke-LamsatBubblewrap fingerprint add $Fingerprint
            $lamsatLinks = Join-Path $PSScriptRoot 'quest\assetlinks.json'
            Invoke-LamsatBubblewrap fingerprint generateAssetLinks "--output=$lamsatLinks"
            if ($SiteUrl.AbsolutePath -eq '/') {
                $lamsatPublicLinks = Join-Path $PSScriptRoot 'public\.well-known'
                New-Item -ItemType Directory -Path $lamsatPublicLinks -Force | Out-Null
                Copy-Item -LiteralPath $lamsatLinks -Destination (Join-Path $lamsatPublicLinks 'assetlinks.json')
            }
            Write-Host "Publish $lamsatLinks at $($SiteUrl.GetLeftPart([UriPartial]::Authority))/.well-known/assetlinks.json"
        } else {
            Write-Host 'Run keytool -list -v for the signing key. Run Prepare again with -Fingerprint SHA256 before Build.'
        }
    } else {
        if (-not (Test-Path -LiteralPath $lamsatConfigPath)) { throw 'Run Prepare first.' }
        $lamsatConfig = Get-Content -LiteralPath $lamsatConfigPath -Raw | ConvertFrom-Json
        if ($lamsatConfig.host -ne $SiteUrl.Authority -or $lamsatConfig.startUrl -cne $lamsatStart.PathAndQuery -or $lamsatConfig.horizonOSAppMode -ne 'immersive' -or -not $lamsatConfig.isMetaQuest) {
            throw 'The Android project does not match this immersive Quest app. Run Prepare with the correct URL.'
        }
        $lamsatLinksUrl = $SiteUrl.GetLeftPart([UriPartial]::Authority) + '/.well-known/assetlinks.json'
        # Assign directly so PowerShell enumerates individual JSON statements below.
        $lamsatHostedLinks = Invoke-RestMethod -Uri $lamsatLinksUrl
        $lamsatExpected = @($lamsatConfig.fingerprints | ForEach-Object { $_.value })
        $lamsatVerified = @($lamsatHostedLinks | Where-Object {
            $_.target.namespace -eq 'android_app' -and
            $_.target.package_name -eq $lamsatConfig.packageId -and
            $_.relation -contains 'delegate_permission/common.handle_all_urls' -and
            @($_.target.sha256_cert_fingerprints | Where-Object { $lamsatExpected -contains $_ }).Count -gt 0
        })
        if ($lamsatVerified.Count -eq 0) { throw 'Publish matching Digital Asset Links at the origin root before building the installable app.' }
        # Meta's current packaging guide requires target SDK 32 for this PWA path.
        $lamsatGradle = Join-Path $lamsatBuild 'app\build.gradle'
        $lamsatGradleText = Get-Content -LiteralPath $lamsatGradle -Raw
        $lamsatSdkPattern = '(?m)^(?<indent>[ \t]*)(?://noinspection ExpiredTargetSdkVersion\r?\n[ \t]*)?targetSdk(?:Version)?\s*(?:=\s*)?\d+'
        if ($lamsatGradleText -notmatch $lamsatSdkPattern) { throw 'Review generated targetSdk in app/build.gradle before building.' }
        $lamsatGradleText = $lamsatGradleText -replace $lamsatSdkPattern, ('${indent}//noinspection ExpiredTargetSdkVersion' + "`n" + '${indent}targetSdkVersion 32')
        $lamsatGradleText = $lamsatGradleText -replace 'jcenter\(\)', 'mavenCentral()'
        [IO.File]::WriteAllText($lamsatGradle, $lamsatGradleText, [Text.UTF8Encoding]::new($false))
        Invoke-LamsatBubblewrap build
        $lamsatApk = Join-Path $lamsatBuild 'app-release-signed.apk'
        if (-not (Test-Path -LiteralPath $lamsatApk)) { throw 'Bubblewrap did not produce the signed APK.' }
        Write-Host "Signed Quest application: $lamsatApk"
    }
} finally { Pop-Location }
