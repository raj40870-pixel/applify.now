$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$javaRoot = Join-Path $env:LOCALAPPDATA "Java"
if (-Not (Test-Path $javaRoot)) { New-Item -Path $javaRoot -ItemType Directory -Force | Out-Null }

$jdkDir = Join-Path $javaRoot "jdk-21"
if (Test-Path $jdkDir) {
    Write-Host "Java 21 already exists in $jdkDir. Skipping..."
} else {
    Write-Host "Downloading OpenJDK 21..."
    $url = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.6%2B7/OpenJDK21U-jdk_x64_windows_hotspot_21.0.6_7.zip"
    $zipPath = Join-Path $env:TEMP "jdk21.zip"
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    
    Write-Host "Extracting OpenJDK 21..."
    Expand-Archive -Path $zipPath -DestinationPath $javaRoot -Force
    Remove-Item $zipPath
    
    $extractedFolders = Get-ChildItem -Path $javaRoot -Directory | Where-Object { $_.Name -like "jdk-21*" -and $_.Name -ne "jdk-21" }
    foreach ($folder in $extractedFolders) {
        Rename-Item -Path $folder.FullName -NewName "jdk-21" | Out-Null
        break
    }
}

Write-Host "Java 21 installed at $jdkDir"
