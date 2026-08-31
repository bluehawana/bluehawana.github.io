---
layout: post
title: "Running DeepSeek-V4-Flash Locally on a MacBook M5 Max 128GB?


I spent the past few days testing Dee..."
date: 2026-08-31
categories: linkedin
tags: [linkedin, social-media, automation]
linkedin_url: "https://www.linkedin.com/posts/harvad_localllm-deepseekv4-mpb-activity-7494355893061582848-6WGc?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY"
author: "Harvad Li"
extract_method: "linkedinscraper-rapidapi"
sync_date: "2026-08-31T16:01:55.037Z"

linkedin_stats:
  likes: 2
  comments: 1
  shares: 0
---

Running DeepSeek-V4-Flash Locally on a MacBook M5 Max 128GB?


I spent the past few days testing DeepSeek-V4-Flash-0731 — DeepSeek's 284B-parameter MoE model — using AtomicChat's 2.8-bit GGUF quant on a MacBook M5 Max (128 GB RAM).

It runs locally at 33 tokens/sec.

I recorded a one-minute clip of it answering "What is DDD in .NET". The output arrives faster than I can read it.

Most people assume a model this size requires a datacenter. The full checkpoint is 162 GB; the 2.8-bit quantized version I run is 104 GB. Consumer GPUs can't hold either, but Apple Silicon can — unified memory gives the GPU full access to system RAM.

DeepSeek-V4-Flash is a Mixture-of-Experts model, so only ~13B parameters activate per token, while the model retains the knowledge of the full 284B. To be clear: this is a compressed copy, not the original weights. But because DeepSeek trained the experts directly in 4-bit, the quant still matches the original's token choice 83.6% of the time.


Making it work with Ollama

Ollama doesn't support sharded GGUF downloads, and the available quants on Hugging Face come in four shards. Local import fails for the same reason.

I merged the shards into a single GGUF using llama.cpp and re-hosted it. After that, the entire setup becomes one command:

ollama run bluehawana/deepseek-v4-flash:iq2_m

Nothing else required.

If you want other quants or other sharded models, the repo includes a script that handles download → merge → import automatically.


Performance numbers (measured via Ollama)

33 tok/s generation (consistent from 128–512 token outputs)
545 tok/s prompt processing on a 2,700-token prompt
3.9 s warm load time

With 103 GB of weights inside 128 GB RAM, context needs to be capped at 8192 for stable long sessions. Full benchmark sheet in the first comment.


Notes from the setup

ollama create fails on sharded GGUFs ("has 1 shards, expected 4"). Merging first is required.
The default chat template inside the GGUF is outdated; multi-turn reasoning improves noticeably with a corrected template.
All troubleshooting steps are documented in the repo.

What this actually is:

The model is DeepSeek's (MIT).
The quantization is by AtomicChat.
I found the work through Rohan Paul's post on x.com https://lnkd.in/dguG6d-K
My part was merging the shards and documenting a reproducible path.
I created nothing new here — I merged two files and wrote down the steps.

Why run it locally: offline, private, and no per-token cost. One Mac can serve an entire LAN through Ollama's API.

Hardware: a 128 GB Apple Silicon Mac.

Repo: https://lnkd.in/d4tCBSHP
Model on Ollama: https://lnkd.in/d8mfXb9Q
Model on Hugging Face: https://lnkd.in/dARbrKj4

#LocalLLM #DeepSeekV4 #MPB #Ollama #AppleSilicon #BuildInPublic



---

**Engagement:** 👍 2 likes • 💬 1 comments • 🔄 0 shares

*This post was automatically synced from LinkedIn on 8/31/2026.*

**Original LinkedIn Post:** [View on LinkedIn](https://www.linkedin.com/posts/harvad_localllm-deepseekv4-mpb-activity-7494355893061582848-6WGc?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAABWNEOYBdb1mUVFywmMzK0UKcw_6cTpqScY)
