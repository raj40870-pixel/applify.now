# Flutter Build Script - AppifyNow
param (
    [string]$url = "https://google.com",
    [string]$appName = "AppifyNow",
    [string]$packageName = "com.appifynow.app",
    [string]$iconPath = ""
)
$ErrorActionPreference = "Stop"

Write-Host "== Flutter Build Engine: Executing PRD Fixes ==" -ForegroundColor Cyan

$flutterPath = "C:\Users\Lenovo\source\flutter\bin\flutter.bat"
$templateDir = Join-Path $PSScriptRoot "..\flutter_app_template"

# User Agent to fix Chrome/Google login issues in WebViews
$userAgent = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

# 1. INCREMENTAL BUILD OPTIMIZATION
Write-Host "TC3: Running full clean to prevent stale builds (Fixes 'old app' issue)..." -ForegroundColor Green
try {
    Push-Location $templateDir
    & $flutterPath clean
    Pop-Location
    
    $dirsToClean = @(
        "build",
        ".dart_tool",
        "android\.gradle",
        "android\app\build",
        "..\temp",
        "..\build",
        "..\cache"
    )
    foreach ($dir in $dirsToClean) {
        $fullPath = Join-Path $templateDir $dir
        if (Test-Path $fullPath) {
            Remove-Item -Recurse -Force $fullPath -ErrorAction SilentlyContinue
            Write-Host "Cleaned: $fullPath" -ForegroundColor Cyan
        }
    }
    
    # Run gradlew clean to ensure android cache is gone
    Push-Location (Join-Path $templateDir "android")
    .\gradlew clean --no-build-cache --rerun-tasks
    Pop-Location
} catch {
    Write-Host "Warning: Cache clear had locked files, ignoring to proceed with build..." -ForegroundColor Yellow
}

# 2. INJECT URL & USER AGENT VIA config.json
Write-Host "Injecting URL into config.json: $url" -ForegroundColor Yellow
$assetsDir = Join-Path $templateDir "assets"
if (-not (Test-Path $assetsDir)) { New-Item -Path $assetsDir -ItemType Directory }
$configJson = @{ url = $url; enableJS = $true } | ConvertTo-Json
Set-Content (Join-Path $assetsDir "config.json") $configJson

# 3. INJECT APP NAME VIA strings.xml
Write-Host "Injecting App Name via strings.xml: $appName" -ForegroundColor Yellow
$valuesDir = Join-Path $templateDir "android\app\src\main\res\values"
if (-not (Test-Path $valuesDir)) { New-Item -Path $valuesDir -ItemType Directory }
$stringsXml = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">$appName</string>
</resources>
"@
Set-Content (Join-Path $valuesDir "strings.xml") $stringsXml

# Ensure AndroidManifest uses the string resource and allows cleartext traffic
$manifestPath = Join-Path $templateDir "android\app\src\main\AndroidManifest.xml"
$manifestContent = Get-Content $manifestPath -Raw
$manifestContent = $manifestContent -replace 'android:label="[^"]+"', 'android:label="@string/app_name"'
if ($manifestContent -notmatch 'android:usesCleartextTraffic="true"') {
    $manifestContent = $manifestContent -replace '<application', '<application android:usesCleartextTraffic="true"'
}
Set-Content $manifestPath $manifestContent

# 4. UPDATE PACKAGE ID
Write-Host "Updating Application ID: $packageName" -ForegroundColor Yellow
$gradlePath = Join-Path $templateDir "android\app\build.gradle.kts"
$gradleContent = Get-Content $gradlePath -Raw
$gradleContent = $gradleContent -replace 'applicationId = "[^"]+"', "applicationId = `"$packageName`""
$gradleContent = $gradleContent -replace 'namespace = "[^"]+"', "namespace = `"$packageName`""
Set-Content $gradlePath $gradleContent

# 5. INJECT APP ICON
if ($iconPath -and (Test-Path $iconPath)) {
    Write-Host "Injecting launcher icons..." -ForegroundColor Yellow
    $resPath = Join-Path $templateDir "android\app\src\main\res"
    $mipmapFolders = Get-ChildItem -Path $resPath -Filter "mipmap-*" -Directory
    foreach ($folder in $mipmapFolders) {
        $destIcon = Join-Path $folder.FullName "ic_launcher.png"
        $destIconRound = Join-Path $folder.FullName "ic_launcher_round.png"
        $folderName = Split-Path $folder.FullName -Leaf
        $bakFolder = Join-Path $env:TEMP "flutter_icons_bak\$folderName"
        if (-not (Test-Path $bakFolder)) { New-Item -Path $bakFolder -ItemType Directory -Force | Out-Null }
        
        # Backup original icons outside the res directory so AAPT2 doesn't fail
        if (Test-Path $destIcon) { Copy-Item $destIcon "$bakFolder\ic_launcher.png" -Force }
        if (Test-Path $destIconRound) { Copy-Item $destIconRound "$bakFolder\ic_launcher_round.png" -Force }

        Copy-Item $iconPath $destIcon -Force
        Copy-Item $iconPath $destIconRound -Force
    }
}

try {
    Write-Host "Running Flutter Build..." -ForegroundColor Cyan
    Push-Location $templateDir
    
    # Ensure packages are up to date (required after switching to webview_flutter)
    Write-Host "Getting Flutter packages..." -ForegroundColor Yellow
    & $flutterPath pub get
    
    & $flutterPath build apk --release --no-tree-shake-icons
    Pop-Location

    $apkPath = Join-Path $templateDir "build\app\outputs\flutter-apk\app-release.apk"
    if (-not (Test-Path $apkPath)) {
        $apkPath = Join-Path $PSScriptRoot "..\build\app\outputs\flutter-apk\app-release.apk"
    }

    if (Test-Path $apkPath) {
        # Name the APK file after the app name (sanitized)
        $safeName = ($appName -replace '[^a-zA-Z0-9]', '-').ToLower().Trim('-')
        if (-not $safeName) { $safeName = "app" }
        $dest = Join-Path $PSScriptRoot "..\build-output.apk"
        Copy-Item $apkPath $dest -Force
        Write-Host "Success! APK '$safeName.apk' ready at: $dest" -ForegroundColor Green
    } else {
        throw "APK build failed. Check Flutter logs above."
    }
} catch {
    # Ensure Pop-Location is called if Push-Location was done
    try { Pop-Location -ErrorAction SilentlyContinue } catch {}
    throw $_
} finally {
    Write-Host "== Cleanup: Resetting template to prevent codebase pollution ==" -ForegroundColor Cyan

    # 1. Reset App Name
    if (Test-Path $valuesDir) {
        $defaultStrings = '<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">AppifyNow</string></resources>'
        Set-Content (Join-Path $valuesDir "strings.xml") $defaultStrings
    }

    # 2. Reset URL Config
    if (Test-Path $assetsDir) {
        $defaultConfig = @{ url = "PLACEHOLDER_URL"; enableJS = $true } | ConvertTo-Json
        Set-Content (Join-Path $assetsDir "config.json") $defaultConfig
    }

    # 3. Reset Package Name in gradle.kts
    $gradleContent = Get-Content $gradlePath -Raw
    $gradleContent = $gradleContent -replace 'applicationId = "[^"]+"', 'applicationId = "com.appifynow.app"'
    $gradleContent = $gradleContent -replace 'namespace = "[^"]+"', 'namespace = "com.appifynow.app"'
    Set-Content $gradlePath $gradleContent
    Write-Host "Package ID reset to default." -ForegroundColor Green

    # 4. Reset Icons (If they were changed)
    # Always restore icons, even if $iconPath is empty now, in case a previous build crashed halfway
    $bakBaseDir = Join-Path $env:TEMP "flutter_icons_bak"
    if (Test-Path $bakBaseDir) {
        Write-Host "Restoring default placeholder icons from backup..." -ForegroundColor Yellow
        $resPath = Join-Path $templateDir "android\app\src\main\res"
        $mipmapFolders = Get-ChildItem -Path $resPath -Filter "mipmap-*" -Directory
        foreach ($folder in $mipmapFolders) {
            $folderName = Split-Path $folder.FullName -Leaf
            $bakFolder = Join-Path $bakBaseDir $folderName
            $destIcon = Join-Path $folder.FullName "ic_launcher.png"
            $destIconRound = Join-Path $folder.FullName "ic_launcher_round.png"
            
            if (Test-Path "$bakFolder\ic_launcher.png") { 
                Copy-Item "$bakFolder\ic_launcher.png" $destIcon -Force
            }
            if (Test-Path "$bakFolder\ic_launcher_round.png") { 
                Copy-Item "$bakFolder\ic_launcher_round.png" $destIconRound -Force
            } else {
                # If there was no backup, the original template didn't have a round icon.
                if (Test-Path $destIconRound) { Remove-Item $destIconRound -Force -ErrorAction SilentlyContinue }
            }
        }
        Remove-Item $bakBaseDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host "Template reset complete." -ForegroundColor Green
}
