# 🔥 Complete Firebase App Distribution Setup

## 📱 Project Details

### CarPlayer IPTV
- **Package**: `com.carplayer.iptv` 
- **APK Path**: `/Users/bluehawana/Projects/carplayer/carplayer-kotlin-androidauto/app/build/outputs/apk/release/app-release.apk`
- **Description**: Android Auto IPTV player with smart network optimization

### EPUB Reader 
- **Package**: `com.audiobookplayer`
- **APK Path**: `/Users/bluehawana/Projects/epub-to-audiobook-bot/AudiobookPlayer/app/build/outputs/apk/release/app-release.apk` 
- **Description**: Android Auto audiobook reader with Azure TTS

## 🎯 Step-by-Step Setup

### 1. Build APKs
```bash
# Run the build script
./build-android-apks.sh
```

### 2. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" 
3. Project name: `bluehawana-android-auto`
4. Project ID: `bluehawana-android-auto` (or auto-generated)
5. Enable Google Analytics: Yes (recommended)

### 3. Add Android Apps

#### Add CarPlayer IPTV:
- Click "Add app" → Android
- Package name: `com.carplayer.iptv`
- App nickname: `CarPlayer IPTV`
- Download `google-services.json` (optional for App Distribution)

#### Add EPUB Reader:
- Click "Add app" → Android  
- Package name: `com.audiobookplayer`
- App nickname: `EPUB Reader TTS`
- Download `google-services.json` (optional for App Distribution)

### 4. Enable App Distribution
1. In Firebase Console sidebar → "App Distribution"
2. Click "Get started"
3. Select each app and upload your first APK manually

### 5. Create Tester Groups
1. Go to "Testers & Groups" tab
2. Click "Add group"
3. Group name: `beta-testers`
4. Add email addresses of people who should test the apps

### 6. Firebase CLI Setup
```bash
# Login to Firebase (opens browser)
npx firebase login

# Initialize Firebase in your project
npx firebase init appdistribution

# Follow prompts:
# - Select existing project: bluehawana-android-auto
# - Choose App Distribution features
```

### 7. Upload APKs via CLI

**Upload CarPlayer IPTV:**
```bash
npx firebase appdistribution:distribute \
  "/Users/bluehawana/Projects/carplayer/carplayer-kotlin-androidauto/app/build/outputs/apk/release/app-release.apk" \
  --app "1:YOUR_PROJECT_NUMBER:android:CARPLAYER_APP_HASH" \
  --groups "beta-testers" \
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

**Upload EPUB Reader:**
```bash
npx firebase appdistribution:distribute \
  "/Users/bluehawana/Projects/epub-to-audiobook-bot/AudiobookPlayer/app/build/outputs/apk/release/app-release.apk" \
  --app "1:YOUR_PROJECT_NUMBER:android:EPUB_APP_HASH" \
  --groups "beta-testers" \
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

### 8. Get Distribution Links
After uploading, Firebase provides distribution links:
- **CarPlayer**: `https://appdistribution.firebase.dev/i/CARPLAYER_APP_ID`
- **EPUB Reader**: `https://appdistribution.firebase.dev/i/EPUB_READER_APP_ID`

### 9. Update Website Demo Pages
Replace the demo download buttons with real Firebase links:

**In carplayer_demo.html:**
```javascript
function downloadAPK(appName) {
    if (appName === 'carplayer') {
        window.open('https://appdistribution.firebase.dev/i/CARPLAYER_APP_ID', '_blank');
    }
}
```

**In epub_reader_demo.html:**
```javascript
function downloadAPK(appName) {
    if (appName === 'epub-reader') {
        window.open('https://appdistribution.firebase.dev/i/EPUB_READER_APP_ID', '_blank');
    }
}
```

## 🎯 Testing Workflow

1. **Upload new APK**: `npx firebase appdistribution:distribute ...`
2. **Testers get email** with download link
3. **Install on Android device** with Android Auto
4. **Test in car** or Android Auto simulator
5. **View analytics** in Firebase Console

## 📊 Analytics & Insights

Firebase App Distribution provides:
- Download counts
- Installation success rates  
- Device compatibility data
- Crash reporting (with Firebase Crashlytics)
- User feedback collection

## 🚀 Automation Options

**GitHub Actions Integration:**
```yaml
- name: Deploy to Firebase App Distribution
  uses: wzieba/Firebase-Distribution-Github-Action@v1
  with:
    appId: ${{ secrets.FIREBASE_APP_ID }}
    serviceCredentialsFileContent: ${{ secrets.CREDENTIAL_FILE_CONTENT }}
    groups: beta-testers
    file: app/build/outputs/apk/release/app-release.apk
```

## 🔗 Useful Links
- [Firebase Console](https://console.firebase.google.com)
- [App Distribution Docs](https://firebase.google.com/docs/app-distribution)
- [Android Auto Testing](https://developer.android.com/training/cars/testing)

---

**Next Steps:**
1. Run `./build-android-apks.sh` to build APKs
2. Create Firebase project manually 
3. Use CLI commands above to upload
4. Update website with real download links