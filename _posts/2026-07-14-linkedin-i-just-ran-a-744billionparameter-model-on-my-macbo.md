---
layout: post
title: "I just ran a 744-billion-parameter model on my MacBook. It technically worked. That's the whole poin..."
date: 2026-07-14
categories: linkedin
tags: [linkedin, social-media, automation]
linkedin_url: "https://www.linkedin.com/posts/harvad_llm-applesilicon-opensource-activity-7482546597378080768-Zbl3?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY"
author: "Harvad Li"
extract_method: "linkedinscraper-rapidapi"
sync_date: "2026-07-14T10:03:41.122Z"
featured_image: "/images/linkedin/linkedin-1784023421023-0-15642926d27f0b0543c85bcb25a78137.jpg"
linkedin_stats:
  likes: 2
  comments: 0
  shares: 0
---

I just ran a 744-billion-parameter model on my MacBook. It technically worked. That's the whole point — and the whole problem. 🐦

Today I tried colibrì by JustVugg — an open-source engine that does something that shouldn't be possible: running GLM-5.2 (744B MoE) on consumer hardware by streaming expert weights straight from the nvme. The whole engine is ~2,400 lines of dependency-free C, written and tested by one person on a 12-core laptop with 25 GB of RAM. Massive respect. 👏

🔗 Project: https://lnkd.in/dP4yXdqg

The setup on my M5 Max (128GB):
- ~370 GB int4 model on disk, only ~10 GB resident in RAM
- 21,504 experts stream from SSD on demand, with an LRU cache that learns your usage and literally gets faster the more you use it
- Great Apple Silicon support: Metal backend with zero-copy unified memory, hand-written NEON kernels, speculative decoding

And it answered. Correctly. A frontier-class 744B model, on a laptop.

Now the reality check: my first "hello" took 75+ seconds. Cold decode reads ~11 GB from disk per token; even fully warmed up, this machine tops out around ~2 tokens/sec. So no — this isn't a daily-work tool. It's a beautiful proof of physics. For real work on a Mac, a 4-bit ~100B model that fits entirely in RAM is 20–30× faster.

Small contribution back: every macOS user hits a "Too many open files" crash on first launch (the engine opens 144+ model shards; macOS defaults to 256 file descriptors). We fixed it and sent a PR upstream: https://lnkd.in/dqP7BeuV

Want to try it yourself? You need ~400 GB of free NVMe/SSD space and patience:
- ⚙️ Engine: https://lnkd.in/dP4yXdqg (cd c && ./setup.sh, on a Mac add make glm METAL=1)
- 🤗 Model (pre-converted int4, ~370 GB — use this one, it has the int8 MTP heads speculative decoding needs): https://lnkd.in/dzhi9dhv

Screenshot: A 744B model saying hello on my MacBook. Worth the 75-second wait, even if it crashed on the second prompt. Theoretical working state, but not quite practical yet. Can't wait for a project that makes running GLM 5.2 truly viable on a MacBook Pro M5 Max! 😄

#LLM #AppleSilicon #OpenSource #GLM #LocalAI #MachineLearning


![Post Image](/images/linkedin/linkedin-1784023421023-0-15642926d27f0b0543c85bcb25a78137.jpg)


---

**Engagement:** 👍 2 likes • 💬 0 comments • 🔄 0 shares

*This post was automatically synced from LinkedIn on 7/14/2026.*

**Original LinkedIn Post:** [View on LinkedIn](https://www.linkedin.com/posts/harvad_llm-applesilicon-opensource-activity-7482546597378080768-Zbl3?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY)
