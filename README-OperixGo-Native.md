# OperixGo Native Build Guide

This document describes how to build the native Android and iOS apps
on your local machine. Lovable cannot run these steps.

## Prerequisites

### For Android:
- **Android Studio** (latest) — https://developer.android.com/studio
- **JDK 17** (bundled with Android Studio)
- **Android SDK** platform-tools + build-tools 34+

### For iOS:
- **macOS** with **Xcode 15+** — App Store
- **Apple Developer account** (for real-device testing / App Store submission)
- **CocoaPods** — `sudo gem install cocoapods`

### Both:
- **Node.js 20+** and **npm 10+**
- Access to this repo (clone locally)

## First-time setup

```bash
# 1. Clone + install
git clone <repo-url>
cd smart-ops-foundation
npm install

# 2. Add Android platform
npx cap add android

# 3. Add iOS platform (macOS only)
npx cap add ios

# 4. Build the web bundle and sync to native
npm run build
npx cap sync
```

The `android/` and `ios/` folders are now present in the repo root.

## Day-to-day dev cycle

```bash
# After any web code change:
npm run build
npx cap sync

# Open Android Studio (launches emulator or real device):
npx cap open android

# Open Xcode (macOS):
npx cap open ios
```

## Build signed APK/AAB for Play Store

```bash
# In Android Studio:
# 1. Build > Generate Signed Bundle / APK
# 2. Choose AAB (Play Store format)
# 3. Create or reuse keystore (KEEP THE KEYSTORE SAFE)
# 4. Upload the AAB to Play Console
```

## Build signed IPA for App Store

```bash
# In Xcode:
# 1. Select 'Any iOS Device' as destination
# 2. Product > Archive
# 3. Window > Organizer > Distribute App
# 4. Choose App Store Connect
```

## Troubleshooting

- **'command not found: cap'** -> `npm install -g @capacitor/cli` or use `npx cap`
- **Gradle build failed** -> open `android/` in Android Studio, let it sync
- **Pod install failed (iOS)** -> `cd ios/App && pod install`
- **White screen on launch** -> verify `npm run build` ran and `dist/` exists
- **Offline queue not working on native** -> native uses @capacitor/preferences
  instead of localStorage; bridge handles this transparently (see native-bridge.ts)

## Bundle IDs
- Android: `com.fourdsmartops.operixgo`
- iOS: `com.fourdsmartops.operixgo`

## Signing (production)

**NEVER commit your keystore or private keys to git.**
Store them in:
- Android: local `~/.android/keystore.jks` + `gradle.properties` (gitignored)
- iOS: Xcode automatic signing with your Apple Developer account

## Questions?
- Capacitor docs: https://capacitorjs.com
- Issue on this repo: open a GitHub issue

---

## Push Notifications Setup (Firebase) — Sprint 14c

Push needs a free Firebase project. One-time setup (~5 min):

1. Go to https://console.firebase.google.com — create new project `OperixGo` (or use existing)
2. Add Android app → package name `com.fourdsmartops.operixgo` → download `google-services.json`
3. Place it at `android/app/google-services.json`
4. Add iOS app → bundle ID `com.fourdsmartops.operixgo` → download `GoogleService-Info.plist`
5. Place it at `ios/App/App/GoogleService-Info.plist`
6. Add to Android `android/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
7. In Firebase console → Cloud Messaging → get 'Server key' → store in your backend (to send pushes later)

That's it. Push permissions are handled by `PushPermissionGate` on first login.

## Plugin Registration — Sprint 14c

After `npm install` brings the new Capacitor plugins in, run:

```bash
npm run build
npx cap sync
```

Capacitor auto-discovers all installed `@capacitor/*` and `@capacitor-community/*`
plugins. No manual registration in `MainActivity.java` / `AppDelegate.swift` is
required for Capacitor 6+.

### Android-specific permissions (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS-specific Info.plist keys
```xml
<key>NSCameraUsageDescription</key>
<string>OperixGo uses the camera to scan QR codes and capture proof-of-delivery photos.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>OperixGo uses your location to verify visit check-ins.</string>
<key>NSFaceIDUsageDescription</key>
<string>OperixGo uses Face ID for quick, secure sign-in.</string>
```

## Permissions — Sprint 14c

| Feature | Android | iOS |
|---------|---------|-----|
| Biometric | `USE_BIOMETRIC` | Face ID prompt at runtime |
| Push | `POST_NOTIFICATIONS` (API 33+) | APNs prompt at runtime |
| Camera | `CAMERA` | `NSCameraUsageDescription` |
| Geolocation | `ACCESS_FINE_LOCATION` | `NSLocationWhenInUseUsageDescription` |
| Badge | none | none |

## Native Verification (after `npx cap sync`)

- Biometric: enroll Face ID/fingerprint, login once, log out, re-open → 'Unlock with Face ID/fingerprint' button appears
- Push: Use Firebase console → Cloud Messaging → Send test message
- Camera + GPS: real device (simulators have limited camera access)
- Badge: place an offline order → badge appears within 5 sec on the home-screen icon

