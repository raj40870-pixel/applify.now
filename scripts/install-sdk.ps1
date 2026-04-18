$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if (-Not (Test-Path $sdkRoot)) { New-Item -Path $sdkRoot -ItemType Directory -Force | Out-Null }

$cmdlineToolsDir = Join-Path $sdkRoot "cmdline-tools"
if (-Not (Test-Path $cmdlineToolsDir)) { New-Item -Path $cmdlineToolsDir -ItemType Directory -Force | Out-Null }

$latestDir = Join-Path $cmdlineToolsDir "latest"
if (Test-Path $latestDir) {
    Write-Host "cmdline-tools already exist in $latestDir. Skipping download."
} else {
    Write-Host "Downloading cmdline-tools..."
    $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $zipPath = Join-Path $env:TEMP "cmdline-tools.zip"
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    
    Write-Host "Extracting cmdline-tools..."
    Expand-Archive -Path $zipPath -DestinationPath $cmdlineToolsDir -Force
    Remove-Item $zipPath
    
    $extractedFolder = Join-Path $cmdlineToolsDir "cmdline-tools"
    if (Test-Path $extractedFolder) {
        Rename-Item -Path $extractedFolder -NewName "latest"
    }
}

$sdkManager = Join-Path $latestDir "bin\sdkmanager.bat"
if (-Not (Test-Path $sdkManager)) {
    throw "sdkmanager.bat not found at $sdkManager. Folder structure might be misaligned."
}

Write-Host "Accepting licenses..."
# Using cmd to pipe yes to sdkmanager
cmd.exe /c "for /l %x in (1, 1, 10) do @echo y" | & $sdkManager --licenses

Write-Host "Installing packages: platform-tools, platforms;android-34, build-tools;34.0.0..."
& $sdkManager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkRoot, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkRoot, "User")
Write-Host "ANDROID_HOME set to $sdkRoot"
Write-Host "Done!"
