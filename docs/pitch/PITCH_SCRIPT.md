# 20-second pitch video

Sonke's brief: a 20-second HustleWindow video that sells the app, under 30 MB, uploaded by Saturday 24 Oct at 13:30.

**Final file:** `ComeCollectZA-pitch-final.mp4`. 19.6 s, 1920 x 1080, 30 fps, 10.4 MB, loudness -15.5 LUFS.

## The script, as recorded

| Time | Scene | Said |
|---|---|---|
| 0.4 s | **Problem.** Landfill footage | "Reclaimers sort our recycling by hand." |
| 3.5 s | **Problem.** A reclaimer carrying a load | "Prices are hidden. Pay is a guess." |
| 6.0 s | **Solution.** The scanner | "ComeCollectZA: snap a photo, know the material." |
| 9.2 s | **Solution.** Best price at each centre | "See the best price nearby." |
| 11.0 s | **Value.** My money: proof of every sale | "Sell, and every kilo is recorded." |
| 13.4 s | **Value.** Old electronics | "Old electronics too." |
| 15.2 s | Logo, value line, link | "ComeCollectZA. Fair pay, every kilo." |

Each scene says what it is in a coloured label (THE PROBLEM, THE SOLUTION, THE VALUE) and a progress tracker shows where the viewer is. The words are also on screen as captions, so it works on mute.

## How it was made

1. **Transcription:** the recording was transcribed with Whisper (`small.en`, run through faster-whisper, MIT licence), with a time for every word. It heard all seven lines as scripted.
2. **Cleaning:** rumble and hiss removed, level evened out and brought to -15 LUFS.
3. **Cutting:** each line was cut out of the take and placed on the timeline. The gaps between lines were tightened from about 0.7 s to 0.45 s so the video fits in 20 seconds. The recording itself was not sped up.
4. **Scenes:** each scene starts a quarter of a second before its line, so the picture leads the voice.
5. **Music:** written for this video in code, calm at 84 BPM. Notes and chords land on the start of each line. It lifts when the solution begins, and the mix ducks it under the voice. No samples, nothing to license.

## Score against how pitch videos are judged

The brief says the video must "sell the app offering" and convince a panel to "use and buy" it. Panels usually look for the points below.

| What they look for | Score | Why |
|---|---|---|
| Hook in the first 3 seconds | 8 | Opens on real landfill footage with a plain statement of who the app is for. |
| Problem is clear | 9 | Two scenes, two plain sentences, labelled THE PROBLEM. |
| Solution is clear | 9 | Scan, price and record, each shown on the live app and labelled THE SOLUTION. |
| Value is clear | 8 | A labelled VALUE section and the closing line "Fair pay, every kilo." The value is stated as outcomes, with no figures yet. |
| Proof it is real | 9 | Real app screens throughout, a live link, and a working scanner. Not a mock-up. |
| Fit for the audience | 8 | Judges see who it is for (reclaimers) and why it matters (income and recycling). |
| Business case | 5 | The video does not say who pays or how the app earns. Sonke's guidance says to make it make business sense, with figures. |
| Call to action | 8 | The live link and a demo-ready app. It does not say "try it". |
| Delivery and audio | 8 | Clean, steady voice at broadcast loudness over a ducked music bed. It is voice only. |
| Production and pacing | 8 | Seven cuts in 20 seconds, each on a spoken line, with captions. |
| Meets the rules | 9 | 19.6 s, 10.4 MB (limit 30 MB), real app, sources credited on the end card. |
| **Average** | **8.1** | |

**What would raise it**
- **Business case (5):** add a short spoken line such as "Paid for by recyclers, never by reclaimers", and one figure from `BUSINESS_MODEL.md`. This needs a new take and about two more seconds, so a line would have to be dropped or tightened.
- **A face on camera:** Sonke says "record yourself selling the app". This video is voice only. A small selfie in a corner would meet that wording more closely.
- **Local footage:** the reclaimer footage and photo are from the Solomon Islands and the Philippines, not South Africa. A few seconds filmed in Soweto, with permission, would be stronger.

## Sources

- Opening footage: "Scavenging on Solomon Islands Ranadi Landfill (1)" by Vincent M. E. Verheyen, CC BY 3.0, Wikimedia Commons.
- Reclaimer photo: "Standing Baliwagenyo waste picker" by FBenjr123, CC BY-SA 4.0, Wikimedia Commons.
- E-waste photo: "Ewaste-pile.jpg" by AvWijk, public domain, Wikimedia Commons.
- Soweto background: see `public/images/soweto/CREDITS.md`.
- App screens: the live app.
- Music: `tools/pitch/music.mjs`. Voice: the team's own recording.
- The credits are on the end card.

`tools/pitch/` has the scripts: `fetch-stock.mjs` (open-licence photos), `render.mjs` (scenes), `music.mjs` (music), `transcribe.py` (Whisper timings) and `build.sh` (puts it together).
