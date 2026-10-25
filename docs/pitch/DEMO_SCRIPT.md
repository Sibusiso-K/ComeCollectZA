# Demo video

The submission checklist asks for a demo video under 90 seconds, linked in the slides. This one runs 86.7 s at 1920 x 1080 and 30 fps. It shows one promise and the proof: a reclaimer scans a load, sees the best price, weighs it and knows the money before selling.

**File:** `ComeCollectZA-demo-silent.mp4` (8 MB), kept out of the repo until the voice is mixed in. The picture is final. The voice is recorded by the team over it (see below).

## How it follows the demo guidance

| Guidance | What the video does |
|---|---|
| One promise, visible proof | "Know the money before you sell", shown on the live app |
| Tell the story before you click | A problem card first, then each screen has a caption saying what to notice |
| One known sample, one rehearsed route | One photo of PET bales, one weight (6.4 kg), one route through the app |
| Evidence and limits | A "Built and live, not yet proven with sales" card names what is not done |
| Next step and close | The next 30 days, the live link, and where the demo login is |

## Script

Read each line when its caption appears. The times are when the line starts. About 2.5 words a second fits.

| Time | Screen | Say |
|---|---|---|
| 0:00 | Opening card | "A free app that shows reclaimers which centre pays most, and records every sale so they can prove their income. Reclaimers never pay." |
| 0:06 | Welcome screen | "ComeCollectZA opens in any phone browser." |
| 0:09 | Home | "From home, a reclaimer can scan a load or check today's prices." |
| 0:16 | Scan (step 1) | "Scan the load. The AI runs on the phone, even with no data. It says plastic, and you can tap a part of the photo to see why." |
| 0:27 | Centres (step 2) | "Centres are ranked, best price first." |
| 0:30 | Keypad (step 3) | "Type the weight. Six point four kilograms is about twenty-four rand." |
| 0:36 | My load | "Add it to My load. At the centre, your code proves the sale." |
| 0:42 | Prices | "Every centre's price is in one place, with sourced market ranges." |
| 0:47 | Market map | "The market map links reclaimers with buyers." |
| 0:52 | Electronics | "Old electronics too. Scan a phone or a TV, and the app shows where it can go safely." |
| 1:03 | Code (step 4, example data) | "The centre scans your code and records the sale." |
| 1:07 | My money (step 5, example data) | "Every sale, fee and payout lands in My money." |
| 1:12 | Built and live card | "It is live, it works offline, and it uses free, open tools. Real sales with reclaimers come next." |
| 1:19 | Close, with a QR code to the app | "ComeCollectZA. Fair pay for every kilo. Try it now." |

## Recording the voice

1. Play the silent video on a laptop and read along on a phone voice recorder, in a quiet room, phone about a hand's width from your mouth.
2. One take is fine. If a line runs late, carry on: the voice is laid under the picture afterwards and each line can be moved to its caption.
3. Send the recording back and it is cleaned, levelled to broadcast loudness and mixed under the picture, the same way as the pitch video.

## What is live and what is example data

- **Live:** every screen from the welcome screen to the electronics guide was recorded on https://comecollectza.vercel.app on 25 Oct 2026, in a phone-sized browser, signed out, in the app's dark theme. The scan, the ranking, the estimate (6.4 kg of PET at R3.80/kg is R24.32) and "My load" are the real app at work. The centres are the seeded demo centres, and the app says so in their names.
- **Example data:** steps 4 and 5 (the code and My money) are real app screens filled with example data, because no real sale has been recorded yet. The video labels them "Example data, signed in". Once a test sale is recorded on the demo account, re-record these two steps live.

## The scan photo

The scanner was tried on eight open-licence photos before recording. It named PET correctly on both PET photos, but on three photos of aluminium cans it said plastic or "not a recyclable we buy", was unsure on one cardboard photo, and asked "could be electronics" on a glass jar. So the video scans PET bales. Do not demo a can scan live. See [SCORECARD.md](../SCORECARD.md) for what this means for judging.

## How it was made

1. `node tools/demo/record.mjs <url> <out dir> <load photo> <electronics photo> --warm` drives a phone-sized headless Chrome through the app, with a green ring on every tap, and saves the screencast frames with their real timestamps. `--warm` scans once first, so the 38 MB scanner model is cached.
2. `node tools/demo/compose.mjs <out dir> <code screen> <money screen> <out.mp4>` turns the frames into a steady 30 fps phone video, renders the cards and captions in headless Chrome, and joins everything with ffmpeg. Set `FFMPEG` to the ffmpeg path, or have `imageio_ffmpeg` installed for Python.

To swap steps 4 and 5 for real screens, take two phone screenshots signed in as the demo reclaimer (Show my code, and My money after the test sale) and add `--real` to the compose command. It drops the "Example data" label and changes the credit line.

Nothing is posted or saved to the server during recording.

## Credits

- Scan photos: "Bales of PET bottles closeup" by Grendelkhan (CC BY-SA 4.0) and "Ewaste-pile.jpg" by AvWijk (public domain), Wikimedia Commons.
- Soweto background: see `public/images/soweto/CREDITS.md`.
- The credits are on the end card.
