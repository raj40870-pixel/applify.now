# AppifyNow (Web + APK)

This project runs a single Node server (`server.ts`) that serves both:
- backend auth/project APIs (`/api/*`)
- frontend app via Vite middleware in development

## 1) Run in VS Code (Local Development)

### Prerequisites
- Node.js 20+
- npm
- Java JDK 17+ (required for Gradle APK builds)
- Android Studio + Android SDK

### Setup
1. Install dependencies:
   - `npm install`
2. Create `.env` from `.env.example`:
   - `copy .env.example .env`
3. Update `.env` values:
   - `MONGO_URI` (required)
   - `JWT_SECRET` (required)
   - `VITE_API_BASE_URL` (keep empty for local web dev, set deployed URL for production/APK)
   - `CORS_ORIGINS` (include your local origins and deployed domain)

### Start app
- `npm run dev`
- Open `http://localhost:3000`

### Health + login quick checks
- Backend health check:
  - `http://localhost:3000/api/health`
- Test login endpoint:
  - `POST http://localhost:3000/api/auth/login`
  - JSON body:
    - `{"email":"your_user@email.com","password":"your_password"}`

## 2) Build Android APK (Capacitor)

### One-time Android setup
1. Add Android project (if `android/` folder does not exist):
   - `npx cap add android`
2. Build web assets and sync:
   - `npm run apk:build`

### Important APK requirements
- Ensure `VITE_API_BASE_URL` points to deployed backend (`https://...`), not localhost.
- Android app must have Internet permission in `android/app/src/main/AndroidManifest.xml`:
  - `<uses-permission android:name="android.permission.INTERNET" />`
- On Windows, the build script also looks for `ANDROID_HOME`, `ANDROID_SDK_ROOT`, or `%LOCALAPPDATA%\Android\Sdk`.
- Java is required and can be provided via `JAVA_HOME` or `JDK_HOME`.

### Build debug APK
From project root:
- `cd android`
- `.\gradlew.bat assembleDebug`

Recommended (auto preflight for Windows):
- `npm run apk:build:win`

APK output:
- `android/app/build/outputs/apk/debug/app-debug.apk`

> Note: Capacitor is configured to package local `dist` assets for the APK. If `server.url` is enabled in `capacitor.config.ts`, the app may try to load the remote website instead of the bundled app.

### Install on Android device
- Enable Developer Options + USB Debugging
- Install via ADB:
  - `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

## 3) iOS / Apple builds
- This repository currently includes Android packaging only. There is no `ios/` folder in the Windows workspace, so building a native iOS `.ipa` requires a macOS machine with Xcode.
- If you want to add iOS support on macOS:
  - `npx cap add ios`
  - `npm run ios:build`
  - open the Xcode workspace in `ios/App/App.xcworkspace`

> On Windows, the `/api/build/ios` route currently returns a placeholder TestFlight link file rather than a real `.ipa`.

## 4) Common issues
- Login fails with `503`: backend started but MongoDB not connected yet; wait a few seconds.
- CORS blocked origin: add your origin to `CORS_ORIGINS`.
- APK opens but API fails: `VITE_API_BASE_URL` still points to localhost or empty.
