# Usability review, 24 Oct 2026

Sonke asks: "Is the app easy to use? Is there clarity, simplicity and an intuitive feel of how the app works and what to do next?" This is a review of the live app against that, done in headless Chrome at phone size (375 x 812), plus a look at each screen. It is not a test with real users, which is still the biggest gap.

## Method

1. An automated pass over 13 screens (kept in `tools/usability/audit.mjs`): tap targets under 44 px, text under 12 px, form fields with no label, images with no description, buttons and links with no name, sideways scrolling, headings, and console errors.
2. A visual review of the key screens in dark and light mode.
3. A re-run of the same pass after the fixes.

## What was already right

- Every screen has exactly one main heading, the page language is set, and nothing scrolls sideways.
- Every form field has a label, every image has a description, and every button and link has a name.
- No text is under 12 px and there are no console errors.
- The first screen after sign-in is the scanner, so the main job takes one tap.
- Mistakes are explained in plain words ("Confirm your email first, then sign in.").

## Findings and fixes

| # | Finding | Why it matters | Fix | State |
|---|---|---|---|---|
| 1 | Every screen had the same browser title, "ComeCollectZA" | Tabs, history and screen readers could not tell screens apart | One title per screen, such as "Prices \| ComeCollectZA", translated, and kept when Next tries to reset it | Fixed |
| 2 | On Home the big white shutter circle was blank, beside two other ways to start the camera | A first-time user could not tell what it did | A camera icon in the circle and a visible label under it ("Open camera", then "Scan this load") | Fixed |
| 3 | The logo link was 40 px tall and "Look around first" on the welcome screen was 24 px | Too small to tap reliably with a thumb | Both now at least 44 px and 48 px tall | Fixed |
| 4 | Source links on Prices, Electronics and the photo credits were 17 to 19 px tall | Hard to tap, and lists of them sit close together | Padded to 32 to 36 px | Fixed |
| 5 | Map pins were 30 px and the zoom buttons 30 px | Hard to hit on a phone | Pins 40 px (46 px when selected), zoom buttons 44 px | Fixed |
| 6 | A scan froze the screen until it finished (found in the afternoon test pass) | Seconds of a dead screen on a cheap phone, and the sweep animation stops | The scanner lets the screen respond between its five passes | Fixed |
| 7 | No Cancel while the scanner downloads or works | On a slow connection the first download can take minutes, with no way out but leaving the screen | A Cancel button. The person can then pick the material by hand | Fixed |
| 8 | A black photo read "Looks like Plastic" | A confident wrong answer is worse than a question | "The photo is too dark or blank. Try again with more light." | Fixed |
| 9 | On a 320 px phone the bottom bar needed 312 px but had 296, so the round Sell button was squeezed into an oval (25 Oct) | Cheap Android phones and small iPhones are this narrow | The four side buttons share the width and their labels wrap. Sell keeps its size | Fixed |
| 10 | The app draws edge to edge, but nothing kept clear of the notch or the home bar | In the installed app on a newer iPhone the top bar sat under the status bar and the bottom bar over the home indicator | Top and bottom bars use the phone's safe-area insets | Fixed |
| 11 | In isiZulu and isiXhosa at 320 px: the welcome heading was cut off, the tour's Next button went off the screen, and the market and electronics tabs spilled out of their boxes. In Afrikaans an electronics button spilled | English hid all of these. The app offers 11 languages | Headings scale with the screen and break long words. The tour row wraps. Tabs take the room their label needs and use 14 px text under 360 px | Fixed |
| 12 | Source links (Prices, photo credits) were 32 to 36 px tall, map pins 40 px | Under the 44 px a thumb needs | All at least 44 px | Fixed |
| 13 | The Centre and Programme screens had no main heading when signed out | Screen readers and the page structure | A heading on each | Fixed |
| 14 | Quick taps on the weight keypad could zoom the page on a phone | Typing "11" zoomed instead of typing | Taps no longer trigger double-tap zoom | Fixed |

**Phone audit, 25 Oct.** `tools/usability/audit.mjs` now also finds content cut off at the screen edge or spilling out of its box. The screens hide sideways scrolling, so the old check could not see this. It also finds fields that make the phone zoom (text under 16 px). Run on all 14 screens:

- **English:** 320, 360, 375 and 412 px, in dark and light.
- **All 11 languages:** at 320 px.

**0 problems** after the fixes, with no console errors. Example: `WIDTHS=320,360 LANG_CODE=zu node tools/usability/audit.mjs http://localhost:3000 / /home /sell`.

## Left as they are, and why

| Item | Why it was left |
|---|---|
| Map pins are 40 px, not 44 px | Larger pins would overlap in the middle of Soweto. They pass the 24 px standard for tap targets. |
| The sign-in consent box is 24 px | The whole sentence beside it is also tappable. |
| Map credit links (Leaflet and OpenStreetMap) are about 14 px tall | They are required credits. |
| Prices (3,800 px) and the electronics places list (5,200 px) are long | The content is a list of sourced facts. A "back to top" link would help. |

## Not checked, and needed

- **Real users.** Ten minutes with one real reclaimer on a cheap Android phone would find more than this review. Nobody has used the app yet except the team.
- **Colour contrast** was judged by eye. The text sits on photos with a dark or light veil, and a measured check is still to do.
- **Screen readers and keyboard-only use** were not tested.
- **Speed on a cheap phone.** The first scan downloads about 38 MB once, which the screen says plainly. The time on a low-end phone is unmeasured.
- **Languages.** 11 are offered, 4 are drafts, and the longer electronics advice is English only.
- **A real phone.** The audit uses Chrome set to phone sizes. The safe-area fix and the keypad taps need a check on a real iPhone and a real Android phone.
- **The hardest scan case.** Photos of mixed household items read "Not sure" on 13% of real-world photos (9 of 70) with head version 7 (see [MODELS.md](MODELS.md)). The screen then asks the person to pick the material, which is the right behaviour, but it is one more tap.

## Suggested next steps

1. A test with one real reclaimer, written up honestly.
2. A "back to top" link on the long screens.
3. A measured contrast check in light and dark.
4. First-language readers for the translations.
