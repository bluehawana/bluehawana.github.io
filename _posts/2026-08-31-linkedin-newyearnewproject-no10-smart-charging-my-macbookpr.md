---
layout: post
title: "#NewYearNewProject No.10 --Smart Charging
My #MacBookPro shut down while plugged in. M5 Max, running..."
date: 2026-08-31
categories: linkedin
tags: [linkedin, social-media, automation]
linkedin_url: "https://www.linkedin.com/posts/harvad_newyearnewproject-macbookpro-qwen3827b-activity-7496316422038446080-JQx1?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY"
author: "Harvad Li"
extract_method: "linkedinscraper-rapidapi"
sync_date: "2026-08-31T16:01:55.037Z"
featured_image: "/images/linkedin/linkedin-1788192114759-2-4d421575bea5a44e6be23521954b5fcf.jpg"
linkedin_stats:
  likes: 0
  comments: 2
  shares: 0
---

#NewYearNewProject No.10 --Smart Charging
My #MacBookPro shut down while plugged in. M5 Max, running a #Qwen3827B model locally. macOS reported "Charging" the entire time the battery went to zero.
That is a measurable claim, so I measured it. What ioreg returns is exact, and it turned out there were three separate faults, not one.
1 — The cable, not the charger. A 100 W adapter was negotiating 60 W. Every profile it offered capped at exactly 3000 mA on a full 20 V rail. Above 3 A a USB-C cable must carry an e-marker chip identifying itself; without one the standard requires the charger to stop there. 20 V × 3 A = 60 W. The charger was not weak — it was being refused.
2 — The port. Same cable, same charger, three ports: 140 W, 100 W, 30 W. The distinguishing signal is the voltage rail, not the wattage. A cable cap lowers current. A slow port lowers voltage. Both present as "charging slowly" and need opposite fixes.
3 — A stuck negotiation. Once, the same port settled at 22 W instead of 30 W and stayed there. Reconnecting the cable restored it. No symptom, no log entry, nothing to notice.
Then a generational finding while comparing two UGREEN chargers four years apart. The 2022 unit's highest rail is 20 V, so 100 W is a hardware ceiling — no cable lifts it. 140 W requires the 28 V rail introduced with USB-PD 3.1. So "100 W vs 200 W" understates it; the real difference is a rail that either exists or does not.
The practical outcome mattered more than the diagnosis. One 200 W GaN charger now runs both my MacBook Pro at 140 W and my Dell Precision 7680 at 130 W over USB-C — Dell publishes that figure. Two machines, one charger, one outlet, instead of a 1.5 kg workstation brick plus a second adapter. USB-PD is a standard, not a vendor feature.
So I built the instrumentation I wanted: a menu bar app that reads the same sensor continuously and names which component is limiting you. Free, open source, signed and notarised.
You can run the analysis without installing anything. The diagnostic rules are ported to JavaScript and execute in the browser — click a sample reading, or paste one command's output from your own Mac. Nothing is uploaded.
🔗 https://lnkd.in/eKEVTA4f
Building it surfaced a second gap: every App Store screenshot generator targets iPhone and Android, and the Mac App Store wants 16:10 at its own sizes. That is open source now too.
If you run local LLMs on a MacBook, check your wattage first. The figure is already on your machine.

#macOS #AppleSilicon #LocalLLM #OpenSource #IndieDev #Swift


![Post Image](/images/linkedin/linkedin-1788192114759-2-4d421575bea5a44e6be23521954b5fcf.jpg)


---

**Engagement:** 👍 0 likes • 💬 2 comments • 🔄 0 shares

*This post was automatically synced from LinkedIn on 8/31/2026.*

**Original LinkedIn Post:** [View on LinkedIn](https://www.linkedin.com/posts/harvad_newyearnewproject-macbookpro-qwen3827b-activity-7496316422038446080-JQx1?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY)
