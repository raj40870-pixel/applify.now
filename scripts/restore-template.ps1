# Restore Template Script
$templateDir = Join-Path $PSScriptRoot "..\flutter_app_template"

Write-Host "Restoring Flutter Template to original state..." -ForegroundColor Cyan

# 1. Restore lib/main.dart
$mainDart = @"
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AppifyNow',
      debugShowCheckedModeBanner: false,
      home: const WebViewPage(),
    );
  }
}

class WebViewPage extends StatefulWidget {
  const WebViewPage({super.key});

  @override
  State<WebViewPage> createState() => _WebViewPageState();
}

class _WebViewPageState extends State<WebViewPage> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    const String userUrl = "PLACEHOLDER_URL";
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(userUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: WebViewWidget(controller: controller),
      ),
    );
  }
}
"@
Set-Content (Join-Path $templateDir "lib\main.dart") $mainDart

# 2. Restore pubspec.yaml
$pubspec = @"
name: appify_flutter_app
description: A new Flutter project for AppifyNow website conversion.
publish_to: 'none'
version: 1.0.0+1
environment:
  sdk: '>=3.0.0 <4.0.0'
dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.2.2
  cupertino_icons: ^1.0.2
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0
flutter:
  uses-material-design: true
"@
Set-Content (Join-Path $templateDir "pubspec.yaml") $pubspec

# 3. Restore AndroidManifest.xml
$manifestPath = Join-Path $templateDir "android\app\src\main\AndroidManifest.xml"
$manifestContent = Get-Content $manifestPath -Raw
$manifestContent = $manifestContent -replace 'android:label="[^"]+"', 'android:label="appify_flutter_app"'
Set-Content $manifestPath $manifestContent

# 4. Cleanup
Remove-Item (Join-Path $templateDir "assets\config.json") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $templateDir "android\app\src\main\res\values\strings.xml") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $PSScriptRoot "..\build-output.apk") -ErrorAction SilentlyContinue

Write-Host "Project Restored Successfully!" -ForegroundColor Green
