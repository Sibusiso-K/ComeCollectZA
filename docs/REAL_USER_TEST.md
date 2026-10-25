# Ten minutes with a real person

The score for Usability, Product and Impact all say the same thing: the app has never been tried by a real reclaimer. This is a 10 minute test you can run with one person, ideally a reclaimer, a buy-back centre worker or any adult who does not know the app. Do it on a cheap Android phone if you can, on mobile data, not Wi-Fi.

Write down what happens. Do not help unless they are stuck for more than 30 seconds, and note every time you do.

## Before

- Phone with Chrome, a data bundle, and the camera allowed.
- Use the language they are most comfortable in. Ask them to open the app and pick it on the first screen. English, Afrikaans, isiZulu and isiXhosa are drafts: write down any word that looks wrong.
- Have a few real items to scan: a drink can, a plastic bottle, a piece of cardboard.
- Say: "We are testing the app, not you. If something is confusing, that is our mistake."
- Ask permission to take notes, and to use what they say, without their name.

## Tasks (read each one aloud, one at a time)

| # | Task | Done by themselves? | Time | What went wrong |
|---|---|---|---|---|
| 1 | Open https://comecollectza.vercel.app and choose a language | | | |
| 2 | Find out which centre pays the most for plastic bottles today | | | |
| 3 | Scan a bottle or a can with the camera | | | |
| 4 | Say what you think the app told you | | | |
| 5 | Work out about how much 6 kg would pay | | | |
| 6 | Read what the "Sell now or wait?" card says. What would you do? | | | |
| 7 | Show me where you would find your code to show at the centre | | | |
| 8 | Find where old electronics would go | | | |

## Questions at the end

1. In your own words, what is this app for?
2. What was the most confusing part?
3. Did anything seem wrong or not true?
4. Would you use it before selling a load? Why or why not?
5. What would make you trust it with your sales?
6. Would you tell another reclaimer about it?
7. Was anything too small to read or tap, or too slow on your data?

## What to record

- Which tasks they finished alone, and how long each took.
- Every time you helped, and what you said.
- What they said the app was for, in their words.
- Anything they tapped that did nothing.
- Any bad scan: what the item was, what the app said, and the light.
- One quote you may use, with their permission.

## After

Send the notes, or photos of them, to the person fixing the app. The same night:

1. Fix whatever blocked a task. Re-check with `node tools/usability/audit.mjs` and `npm run test:app`.
2. Write what happened in [USABILITY.md](USABILITY.md) honestly, including what did not work.
3. Update the "No tests with real reclaimers" line in the deck only if a real reclaimer did the test.

## Counting real use

Count honestly. A friend who signs up is a sign-up, not a reclaimer. This read-only query in the Supabase SQL editor counts people outside the demo accounts:

```sql
select p.role, count(*) as people
from profiles p
join auth.users u on u.id = p.id
where u.email not like '%@ccza.com'
group by p.role
order by p.role;
```

Real sales are rows in `transactions` recorded by a centre. Until a centre records one, the deck and the canvas keep saying "no real sales".
