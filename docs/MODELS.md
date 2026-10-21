# Models

The product uses free, open-source models only. No paid model APIs are called from the app. Every AI feature has a non-AI fallback, so the app still works if every model is down.

## Models in the product

| Job | Model or method | Licence | Runs on | Fallback |
|---|---|---|---|---|
| Price forecast, 14 days (p10, p50, p90) | `amazon/chronos-bolt-small`, zero-shot | Apache-2.0 | GitHub Actions, CPU, nightly | Holt-Winters smoothing |
| Sell now or wait | Rule on the forecast: wait only if the 7-day p10 is at or above today's price and the p50 gain is at least 5% | Own code | Server | Default to sell now |
| Best centre | Net value = kg × price − distance × travel cost (R2 per km, configurable) | Own code | Server, PostGIS | Nearest open centre |
| Anomaly flags at sale time | Rules: weight above 3 × the reclaimer's 30-day 95th percentile, duplicate photo, centre far from usual area | Own code | Server | None needed |
| Anomaly score, batch | `IsolationForest` on weight, price, time and distance | BSD-3 (scikit-learn) | GitHub Actions, nightly | Rules only |
| Duplicate photo | 64-bit dHash, Hamming distance of 6 or less | Own code | Server, Postgres `bit_count` | None needed |
| Material suggestion from a photo | `google/gemma-4-26b-a4b-it:free` on OpenRouter, strict JSON output | Open weights. Confirm the licence on the model card before submission | OpenRouter free tier | `nvidia/nemotron-3.5-super-vl:free`, then the user taps a material |
| isiZulu speech to text (stretch) | `uctnlp/omniASR-CTC-300M-v2-Zulu-All-v2` | Apache-2.0 | Hugging Face ZeroGPU Gradio Space | Icons and typing |
| English and Afrikaans speech to text (stretch) | `openai/whisper-large-v3-turbo` | MIT | Same Space | Icons and typing |
| Assistant answers (stretch) | Gemma 4 on OpenRouter, given the recommendation as context | Open weights. Confirm the licence | OpenRouter free tier | Template answers per language |

Current code: none of these models is called yet. The product screens use demo data.

## Models we left out on purpose

| Model | Why not |
|---|---|
| Meta MMS (speech and text to speech) | CC BY-NC 4.0 forbids commercial use |
| NLLB-200 (translation) | CC BY-NC 4.0 |
| InkubaLM | CC BY-NC 4.0 |

South African languages matter to the product, so these were the obvious candidates. We would have had to remove them the day we sell to a PRO.

## Free-tier limits

| Service | Limit | Effect on the product |
|---|---|---|
| OpenRouter free models | 20 requests per minute. 50 per day with fewer than 10 credits bought. 1,000 per day after about $10 of credits | Cache results by photo hash. Optional credit top-up during judging |
| Hugging Face ZeroGPU | Free accounts can host 2 Gradio Spaces, with 5 GPU minutes per day. Account must be 30 days old with a verified email | Speech is a stretch goal. Keep the Space warm only during judging |
| Hugging Face Spaces, CPU or Docker | Need a paid plan | Not used |
| Supabase free | 500 MB database, 1 GB storage, 2 active projects. Projects pause after 7 days of inactivity | Keep-alive ping every 6 hours |
| GitHub Actions | Free minutes for public and private repos within plan limits | Nightly jobs are short |

## Vision prompt contract

The vision model must return JSON only:

```text
system: You classify recyclables in a photo for South African buy-back centres.
Return only JSON: {"material": one of ["PET","HDPE","CAN_AL","CARDBOARD","PAPER_WHITE","GLASS","OTHER"],
                   "confidence": number 0 to 1, "notes": short string}
Rules: pick the material that makes up most of the load. If unsure, use "OTHER" with low confidence.
```

The server validates the reply with zod, caches it by photo hash, and gives up after 8 seconds. A confidence below 0.6 shows the suggestion as a question instead of a pre-selected answer.

## Forecast data

There is no public history of buy-back prices. The seed script builds 180 days of daily prices for each material and area, anchored on the 2026 reported prices. The app labels every forecast screen as demo data. Forecasts must not be presented as market data.

## Models used to build the product

The team used Claude models (Opus 5.5, Sonnet 5.5 and Haiku 5.5) as development tools, for research, planning, writing code and checks. Those models are not part of the product and are not called by it. See [AGENTS.md](AGENTS.md).

## Adding a model

1. Check the licence on the model card. Reject non-commercial licences.
2. Check the free-tier limit and the expected load per demo.
3. Add a row to the first table, with a fallback.
4. Write the fallback path before the model path.
5. Record the change in [BUILD_LOG.md](BUILD_LOG.md).
