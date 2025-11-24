# 🔥 Firebase App Distribution - Manual Setup Guide

## 📋 Prerequisites
- Built APKs are ready (completed ✅)
- Firebase CLI installed: `npm install firebase-tools` (completed ✅)

## 🚀 Step-by-Step Manual Setup

### 1. Firebase Authentication
```bash
# Run this command and complete browser login
firebase login
```

### 2. Create Firebase Project
Go to [Firebase Console](https://console.firebase.google.com):
1. Click **"Create a project"**
2. Project name: `bluehawana-android-auto`
3. Enable Google Analytics: **Yes**
4. Choose Analytics account: **Default**

### 3. Add Android Apps

#### CarPlayer IPTV App:
1. Click **"Add app"** → **Android**
2. Package name: `com.carplayer.iptv`
3. App nickname: `CarPlayer IPTV`
4. Click **"Register app"**

#### EPUB Reader App:
1. Click **"Add app"** → **Android**
2. Package name: `com.audiobookplayer`
3. App nickname: `EPUB Reader TTS`
4. Click **"Register app"**

### 4. Enable App Distribution
1. In Firebase Console → **"App Distribution"**
2. Click **"Get started"**
3. You'll see both apps listed

### 5. Upload APKs via CLI

**Initialize Firebase in your project:**
```bash
cd /Users/bluehawana/IdeaProjects/bluehawana.github.io
firebase init appdistribution
# Select: bluehawana-android-auto project
# Choose: App Distribution features
```

**Get App IDs from Firebase Console:**
- Go to Project Settings → General → Your apps
- Copy the App ID for each app (format: `1:123456789:android:abcdef123456`)

**Upload CarPlayer IPTV APK:**
```bash
firebase appdistribution:distribute \
  "/Users/bluehawana/Projects/carplayer/carplayer-kotlin-androidauto/app/build/outputs/apk/release/app-release.apk" \
  --app "YOUR_CARPLAYER_APP_ID" \
  --groups "testers" \
  --release-notes "🚗 CarPlayer IPTV v1.0

✨ Features:
• Android Auto IPTV Player
• Smart Network Optimization for 5G/Cellular
• M3U Playlist Support
• Hybrid Media Engine (ExoPlayer + VLC)
• Car-Safe UI Controls
• Swedish Networks Optimized (Comviq/Tele2)

📲 Install and test in your Android Auto system!"
```

**Upload EPUB Reader APK:**
```bash
firebase appdistribution:distribute \
  "/Users/bluehawana/Projects/epub-to-audiobook-bot/AudiobookPlayer/app/build/outputs/apk/release/app-release.apk" \
  --app "YOUR_EPUB_READER_APP_ID" \
  --groups "testers" \
  --release-notes "📚 EPUB Reader with TTS v1.0

✨ Features:
• EPUB to Audiobook Conversion
• Azure Neural Voice Text-to-Speech
• Android Auto Integration
• Hands-free Reading Controls
• Cloud Processing & Storage
• QR Code Device Linking

🎧 Perfect for hands-free reading while driving!"
```

### 6. Create Tester Groups
1. In App Distribution → **"Testers & Groups"**
2. Click **"Add group"**
3. Group name: `testers`
4. Add email addresses of people who should test

### 7. Get Distribution Links
After uploading, you'll get distribution links like:
- **CarPlayer**: `https://appdistribution.firebase.dev/i/YOUR_CARPLAYER_LINK`
- **EPUB Reader**: `https://appdistribution.firebase.dev/i/YOUR_EPUB_READER_LINK`

## 🔧 Update Website Demo Pages

Once you have the Firebase distribution links, update these files:

**File: `/pages/carplayer_demo.html`**
Replace the `downloadAPK` function:
```javascript
function downloadAPK(appName) {
    if (appName === 'carplayer') {
        window.open('https://appdistribution.firebase.dev/i/YOUR_CARPLAYER_LINK', '_blank');
    }
}
```

**File: `/pages/epub_reader_demo.html`**
Replace the `downloadAPK` function:
```javascript
function downloadAPK(appName) {
    if (appName === 'epub-reader') {
        window.open('https://appdistribution.firebase.dev/i/YOUR_EPUB_READER_LINK', '_blank');
    }
}
```

## 📊 Project Information

### CarPlayer IPTV
- **Package**: `com.carplayer.iptv`
- **APK Size**: ~202MB (includes VLC libraries)
- **APK Path**: `/Users/bluehawana/Projects/carplayer/carplayer-kotlin-androidauto/app/build/outputs/apk/release/app-release.apk`

### EPUB Reader
- **Package**: `com.audiobookplayer`
- **APK Size**: ~12.6MB
- **APK Path**: `/Users/bluehawana/Projects/epub-to-audiobook-bot/AudiobookPlayer/app/build/outputs/apk/release/app-release.apk`

## 🎯 Next Steps After Setup

1. **Test Distribution**: Send test links to yourself
2. **Update Website**: Replace placeholder download functions
3. **Analytics**: Monitor downloads in Firebase Console
4. **Automation**: Set up CI/CD for automatic uploads

## 🔗 Quick Links
- [Firebase Console](https://console.firebase.google.com)
- [App Distribution Docs](https://firebase.google.com/docs/app-distribution)
- [CarPlayer Demo](https://bluehawana.github.io/pages/carplayer_demo.html)
- [EPUB Reader Demo](https://bluehawana.github.io/pages/epub_reader_demo.html)