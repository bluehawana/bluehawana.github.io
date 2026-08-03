---
layout: post
title: "New Year, New Project No.9 — Saving your old iPhone’s battery, and its life.

Apple ships a Charge L..."
date: 2026-08-03
categories: linkedin
tags: [linkedin, social-media, automation]
linkedin_url: "https://www.linkedin.com/posts/harvad_smartplug-ios-swift-activity-7489787304174211072-ymRH?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY"
author: "Harvad Li"
extract_method: "linkedinscraper-rapidapi"
sync_date: "2026-08-03T11:32:20.014Z"
featured_image: "/images/linkedin/linkedin-1785756739860-0-5501246b9297fa56413a16778aa3116a.jpg"
linkedin_stats:
  likes: 2
  comments: 0
  shares: 0
---

New Year, New Project No.9 — Saving your old iPhone’s battery, and its life.

Apple ships a Charge Limit feature — 80/85/90/95% — that stops your phone from topping up to 100% and slowly cooking its battery.
But it only exists on iPhone 15 and later.
Everything older gets Optimized Battery Charging, which is adaptive and unpredictable. It decides when to go to 100%. You can’t pin it. My iPhone 12 Pro Max sat at 100% every single night.
So I built the hard cap Apple didn’t ship.
Charge Guard watches for the battery crossing ~80%, then switches off the WiFi smart plug powering the charger. Charging simply stops.
Here’s the part most people don’t know: almost every cheap WiFi smart plug runs on Tuya Smart underneath. DELTACO, Smart Life, and hundreds of white‑label brands are the same platform in different boxes.
One integration works for nearly all of them — and Tuya gives you a free developer account with a proper Cloud API.
The constraint that shaped the design: iOS won’t let an app monitor battery level in the background. So I didn’t try.
The OS‑level Shortcuts automation is the trigger — my app is only the muscle.
Battery automation → App Intent → Tuya Cloud API → plug off
---
How to do it yourself — full tutorial in the README
Pair any Tuya‑compatible plug in the Smart Life app (move your Deltaco plug from Deltaco Smart Home → Smart Life).
Create a free Cloud project at iot.tuya.com — pick the data center matching your country → copy Access ID + Secret.
Authorize IoT Core, link your app account via QR → copy the Device ID.
cp .env.example .env → ./scripts/setup.sh → run it on your iPhone.
Shortcuts → Battery Level rises → Run Immediately.
About 20 minutes, mostly waiting.
There’s a scripts/tuya.py that translates Tuya’s error codes into actual fixes — run it from your Mac before touching the phone.
---
The honest version: you can do this with zero code
If your plug is already in Smart Life, you can build this with a Tap‑to‑Run scene triggered by the battery automation.
It’s the first section of the README. Use it if it works for you.
---
What actually cost me the evening wasn’t the code
→ Picked Western Europe instead of Central Europe — different Tuya API host, everything failed silently.
→ Tuya’s device‑linking QR rejects white‑label apps; had to move the plug from Deltaco → Smart Life.
→ Automation fired perfectly and did nothing. “Ask Before Running” was on, waiting for a tap I was asleep for.
All three are in the troubleshooting section so you don’t lose that evening too.
---
No credentials in the binary — no plaintext strings. Every user enters their own, stored in the iOS Keychain.
Hardware: one DELTACO #SmartPlug, ~€10. Cheaper than the battery replacement it prevents.

Swift · SwiftUI · App Intents · Keychain · HMAC‑SHA256 · XcodeGen
MIT‑licensed repo 👇
https://lnkd.in/em-CyZ2m

#iOS #Swift #SwiftUI #AppIntents #BatteryHealth #Sustainability #BuildInPublic


![Post Image](/images/linkedin/linkedin-1785756739860-0-5501246b9297fa56413a16778aa3116a.jpg)


---

**Engagement:** 👍 2 likes • 💬 0 comments • 🔄 0 shares

*This post was automatically synced from LinkedIn on 8/3/2026.*

**Original LinkedIn Post:** [View on LinkedIn](https://www.linkedin.com/posts/harvad_smartplug-ios-swift-activity-7489787304174211072-ymRH?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY)
