#!/bin/bash

# Firebase Android Auto APK Build Script
echo "🔨 Building Android Auto APKs for Firebase App Distribution..."

# Build CarPlayer IPTV APK
echo ""
echo "📺 Building CarPlayer IPTV APK..."
cd /Users/bluehawana/Projects/carplayer/carplayer-kotlin-androidauto/
if [ ! -f "./gradlew" ]; then
    echo "❌ Error: CarPlayer project not found at expected path"
    exit 1
fi

./gradlew clean assembleRelease
if [ $? -eq 0 ]; then
    echo "✅ CarPlayer APK built successfully!"
    echo "📍 APK location: app/build/outputs/apk/release/app-release.apk"
    ls -la app/build/outputs/apk/release/
else
    echo "❌ Error building CarPlayer APK"
fi

echo ""
echo "📚 Building EPUB Reader APK..."
cd /Users/bluehawana/Projects/epub-to-audiobook-bot/AudiobookPlayer/
if [ ! -f "./gradlew" ]; then
    echo "❌ Error: EPUB Reader project not found at expected path"
    exit 1
fi

./gradlew clean assembleRelease
if [ $? -eq 0 ]; then
    echo "✅ EPUB Reader APK built successfully!"
    echo "📍 APK location: app/build/outputs/apk/release/app-release.apk"
    ls -la app/build/outputs/apk/release/
else
    echo "❌ Error building EPUB Reader APK"
fi

echo ""
echo "🚀 Both APKs ready for Firebase App Distribution!"
echo ""
echo "Next steps:"
echo "1. Create Firebase project at: https://console.firebase.google.com"
echo "2. Add Android apps with package names from AndroidManifest.xml"
echo "3. Use Firebase CLI to upload APKs"