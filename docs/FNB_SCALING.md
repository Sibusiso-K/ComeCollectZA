# FNB and the scaling of ComeCollectZA

How FNB's products and programmes could carry ComeCollectZA from a pilot to many thousands of reclaimers. Researched 24 Oct 2026 from FNB's own pages and press coverage. Each fact has a source at the bottom. Anything we could not confirm is marked, and nothing here claims an agreement with FNB. There is none.

## The short version

ComeCollectZA's weak point today is the last step: a reclaimer is paid by a **demo payout that moves no money**. FNB already runs the pieces that fix this and make the app grow:

1. **eWallet** pays a person by cellphone number, and the person collects cash without needing the FNB app. That is the payout rail.
2. **The solopreneur account and First Business Zero** are built for the self-employed and informal traders. A reclaimer's recorded sales are the income history those accounts need.
3. **QR payments** let a centre, tavern or bottle store take and make payments from a phone, next to our own QR sale record.
4. **eBucks** is an existing rewards system that could reward verified recycling.
5. **The App of the Year hackathon itself** is FNB's pipeline for apps it may back.

## What FNB offers, and how it connects

| FNB product | What it is, from FNB's pages and press | How ComeCollectZA connects |
|---|---|---|
| **eWallet** | Send money to any South African cellphone number from the FNB app, online banking, ATM or USSD. The receiver collects cash by dialling \*120\*277\# and using a temporary ATM PIN. Sending limit R3 000 in the app, wallet balance capped at R5 000. Press reports eWallet on WhatsApp since March 2026, with over 12 million interactions | **The payout rail.** Replace our `ewallet_mock` channel with a real eWallet payment when a sale is recorded. A reclaimer needs only a phone number. A sale is far below the R3 000 limit, so no splitting is needed. WhatsApp could carry the payout message to a reclaimer on a basic data plan |
| **Solopreneur account** (May 2026) | A bundle of a personal account, credit card, business account and payment tools for side hustlers. FNB says most side hustlers are informal traders and retailers, estimates 4 million self-employed people, and says the informal sector is over 21% of employment. Aim: help people "manage, grow, and formalise" | **A path out of cash.** A reclaimer's recorded sales are a verifiable income history. With their consent, that record could help them open and qualify for the account |
| **First Business Zero** | A digital business account for sole proprietors, reported to have no monthly fee and an interoperable QR code | **For centres and taverns** that want to take payments and keep proper records |
| **QR code payments** | FNB reports businesses can register in the FNB app and start taking QR payments within 24 hours, with no monthly rental. Reports of the merchant fee disagree (2% to 3%, 2019 coverage), so confirm | **Taverns and bottle stores** selling on our marketplace could be paid by QR. Our QR code identifies the reclaimer. FNB's QR moves the money. They do different jobs |
| **FNB and Selpal** (2018) | FNB partnered with Selpal so township traders can order stock and take payments on a device. FNB describes townships as an "unseen economy" of up to a million businesses | **The same places.** Taverns, spaza shops and bottle stores in Soweto are both Selpal's traders and our supply points |
| **eBucks** | FNB's rewards system. Customers spend eBucks on fuel, electronics, travel and more, and an in-app tracker shows how to move up a level | **A reward for verified recycling**, such as eBucks for FNB customers who sell recorded loads or hand in electronics safely. This does not exist. It is a proposal |
| **FNB App of the Year and Hackathon** | FNB is the headline sponsor. There is a Best Hackathon Solution award. Climate resilience and small-business growth are challenge areas | **The door in.** A winning or shortlisted solution is a conversation with the sponsor |

## A path to scale

| Phase | What happens | What we build | What we need from FNB |
|---|---|---|---|
| **0. Today** | Demo payouts and a hand-entered SAWPRS record | Done. The adapter point is `record_sale()` | Nothing |
| **1. Pilot** | One real centre in Soweto, about 50 reclaimers, real money | A real eWallet adapter behind the same function. Payout status and retry. Cash-out instructions in the app | A sandbox or business eWallet arrangement, and FNB's security review |
| **2. Formalise** | Reclaimers move from cash to an account | An income statement a reclaimer can share with their consent. A prompt to open an account | A referral or onboarding route into the solopreneur account |
| **3. Take payments** | Centres and taverns pay and are paid by QR | QR reference on the sale record. Reconciliation | Merchant onboarding for centres and taverns |
| **4. Reward and grow** | Verified recycling earns something | An eBucks hook. More centres and cities | A rewards partnership, and links with the programme bodies that pay service fees |

## What we can say today, and what we cannot

**We can say**
- The app works end to end on the live site, with real accounts, prices, a scanner, a marketplace and an electronics guide.
- The payout step is built as a replaceable adapter, so a real rail is a change in one place.
- eWallet works by cellphone number and cash-out by USSD, which suits reclaimers without smartphones or data.

**We cannot say, and should not**
- That FNB has agreed to anything, or that we use an FNB API. We found **no public FNB payments API or sandbox** for South Africa. Third-party directories list none. Access would come from a partnership, or through a payment aggregator.
- That eWallet needs no bank account for the receiver. FNB's page describes collecting cash with a phone number and PIN but does not say this in words, so confirm before promising it.
- Exact fees for eWallet or QR. The pages give none.

## Rules we must meet

- **Payments need a regulated partner.** We are not a bank. A partner holds and moves the money.
- **Consent for income records.** Sharing a reclaimer's history with a bank follows POPIA, and must be their choice, switched off by default.
- **FICA and wallet limits** apply to eWallet. The R5 000 balance cap and the R3 000 per-send limit shape how often a centre pays.
- **Reclaimers never pay.** Any revenue, such as the programme fee in [BUSINESS_MODEL.md](BUSINESS_MODEL.md), comes from the businesses that gain.

## What to ask FNB in conversation

1. Is there an eWallet or Send Money route for business-to-person payouts at a centre, and what does it cost?
2. Could a consented income statement from ComeCollectZA count towards opening a solopreneur or First Business Zero account?
3. Could a centre or tavern register for QR payments through a referral?
4. Would FNB consider an eBucks reward for verified recycling or safe electronics hand-in?
5. What would FNB want to see to back a winning solution beyond the hackathon?

## Sources

- FNB eWallet: https://www.fnb.co.za/ways-to-bank/ewallet.html (limits, cash-out steps and balance cap read from the page, which shows no date)
- FNB send money: https://fnb.co.za/send-money
- eWallet on WhatsApp (March 2026, over 12 million interactions), as reported by press found in search. Not confirmed on FNB's own page
- Solopreneur account, TimesLive, 2 May 2026: https://www.timeslive.co.za/news/business/2026-05-02-hustle-economy-a-boon-for-banks/
- BusinessTech on a side-hustle account: https://businesstech.co.za/news/banking/692807/new-bank-account-for-side-hustles-in-south-africa/
- FNB and Selpal, FinTech Futures: https://www.fintechfutures.com/fintech/south-africa-s-fnb-turns-to-township-trade (read through search, the page itself returned an error)
- First Business Zero: https://www.techinafrica.com/fnb-business-launch-first-business-zero-alongside-fundaba-no-monthly-cost-support-smes/ (2019 coverage, confirm current terms)
- FNB QR code payments: https://www.thepaypers.com/mobile-payments/fnb-launches-qr-code-payments-for-its-banking-app/777029-16
- eBucks Rewards: https://FNB.co.za/ways-to-bank/digital/eBucksRewards.html
- FNB App of the Year: https://appoftheyear.co.za/ and https://appoftheyear.co.za/fnb-takes-the-helm-as-app-of-the-year-headline-sponsor/
- Open-banking directories showing no public FNB South Africa API: https://openbankingtracker.com/provider/fnb-south
