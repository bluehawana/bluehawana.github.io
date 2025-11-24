# Firebase App Distribution Setup for Android Auto Projects

## Project Overview
- **CarPlayer IPTV**: Android Auto IPTV player with network optimization
- **EPUB Reader**: Android Auto audiobook reader with Azure TTS

## Firebase Setup Steps

### 1. Create Firebase Projects
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Project name: `bluehawana-android-auto`
4. Enable Google Analytics (optional)

### 2. Add Android Apps
For each app, add to Firebase:

#### CarPlayer IPTV
- Package name: `com.carplayer.iptv` (or actual package from AndroidManifest.xml)
- App nickname: `CarPlayer IPTV`
- Debug signing certificate SHA-1: (optional for App Distribution)

#### EPUB Reader  
- Package name: `com.audiobookplayer` (or actual package from AndroidManifest.xml)
- App nickname: `EPUB Reader TTS`
- Debug signing certificate SHA-1: (optional for App Distribution)

### 3. Enable App Distribution
1. In Firebase Console, go to "App Distribution" 
2. Click "Get started"
3. Upload your first APK manually or use CLI

### 4. CLI Commands

```bash
# Login to Firebase
npx firebase login

# Initialize Firebase in project
npx firebase init appdistribution

# Upload CarPlayer APK
npx firebase appdistribution:distribute \
  /Users/bluehawana/Projects/carplayer/carplayer-kotlin-androidauto/app/build/outputs/apk/release/app-release.apk \
  --app 1:YOUR_PROJECT_ID:android:carplayer_app_id \
  --groups "testers" \
  --release-notes "CarPlayer IPTV - Android Auto compatible IPTV player with smart network optimization"

# Upload EPUB Reader APK  
npx firebase appdistribution:distribute \
  /Users/bluehawana/Projects/epub-to-audiobook-bot/AudiobookPlayer/app/build/outputs/apk/release/app-release.apk \
  --app 1:YOUR_PROJECT_ID:android:epub_reader_app_id \
  --groups "testers" \
  --release-notes "EPUB Reader - Android Auto audiobook player with Azure Neural Voice TTS"
```

### 5. Get App IDs
After adding apps to Firebase, you'll get:
- Project ID: `bluehawana-android-auto`
- CarPlayer App ID: `1:PROJECT_NUMBER:android:APP_HASH` 
- EPUB Reader App ID: `1:PROJECT_NUMBER:android:APP_HASH`

### 6. Create Tester Groups
1. In App Distribution, go to "Testers & Groups"
2. Create group: `beta-testers`
3. Add email addresses of testers

### 7. Distribution Links
Firebase will provide links like:
- CarPlayer: `https://appdistribution.firebase.dev/i/APP_ID`
- EPUB Reader: `https://appdistribution.firebase.dev/i/APP_ID`

## Next Steps
1. First, build the APKs from your Android projects
2. Create Firebase project manually via web console
3. Use CLI to upload APKs
4. Update website demo pages with real download links