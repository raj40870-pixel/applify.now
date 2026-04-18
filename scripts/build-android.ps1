$ErrorActionPreference = "Stop"

Write-Host "== Android build preflight ==" -ForegroundColor Cyan

$jdkPath = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$jdkPaths = @(
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.8.8-hotspot",
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.7.8-hotspot",
  "C:\Program Files\Eclipse Adoptium\jdk-21",
  $(Join-Path $env:LOCALAPPDATA "Java\jdk-21"),
  $jdkPath
)

if ($true) { # Force search and set
  foreach ($path in $jdkPaths) {
    if (Test-Path $path) {
      $env:JAVA_HOME = $path
      $env:Path = "$path\bin;$env:Path" # Ensure bin is at start of path
      break
    }
  }
}

if (-not $env:JAVA_HOME -and $env:JDK_HOME -and (Test-Path $env:JDK_HOME)) {
  $env:JAVA_HOME = $env:JDK_HOME
}

if (-not $env:ANDROID_HOME) {
  if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
    $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
  } else {
    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultSdk) {
      $env:ANDROID_HOME = $defaultSdk
    }
  }
}

if (-not $env:JAVA_HOME) {
  throw "JAVA_HOME missing. Install JDK 17 and set JAVA_HOME or JDK_HOME."
}

if (-not (Test-Path $env:JAVA_HOME)) {
  throw "JAVA_HOME path does not exist: $env:JAVA_HOME"
}

if (-not $env:ANDROID_HOME) {
  throw "ANDROID_HOME missing. Install Android SDK (usually in %LOCALAPPDATA%\Android\Sdk)."
}

if (-not (Test-Path $env:ANDROID_HOME)) {
  throw "ANDROID_HOME path does not exist: $env:ANDROID_HOME"
}

$debugKeystorePath = Join-Path $env:USERPROFILE ".android\debug.keystore"
if (-not (Test-Path $debugKeystorePath)) {
  Write-Host "Generating Android debug keystore at $debugKeystorePath"
  keytool -genkeypair -alias androiddebugkey -keypass android -keystore $debugKeystorePath -storepass android -dname "CN=Android Debug,O=Android,C=US" -keyalg RSA -keysize 2048 -validity 10000
}

$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:Path"

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"

Write-Host "== Build web + sync capacitor ==" -ForegroundColor Cyan
npm run build
npx cap sync android

Write-Host "== Clean + assemble debug APK ==" -ForegroundColor Cyan
Push-Location "android"
.\gradlew.bat clean assembleDebug
Pop-Location

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
  throw "APK not found at $apkPath"
}

$sizeMb = [Math]::Round((Get-Item $apkPath).Length / 1MB, 2)
Write-Host "APK created: $apkPath ($sizeMb MB)" -ForegroundColor Green
