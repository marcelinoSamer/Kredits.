@AGENTS.md

---

# Kredits — Product & Business Brief

> **About this document.** The first line imports `AGENTS.md` (engineering
> gotchas & checks, for coding sessions). Everything below is a **self-contained
> product + business brief** meant to bootstrap a strategy conversation in a
> separate session — read it cold and you should understand what Kredits is, who
> it's for, what's decided, what's constrained, and what's still open. The
> business-model options here are framed as *questions to explore*, not
> decisions that have been made.

---

## 1. What Kredits is

**Kredits — "The Offline Ledger."** A fully **offline, private** personal-finance
app for iOS and Android (Expo / React Native / TypeScript). No accounts, no
cloud, no sign-up, no telemetry. Every byte of a user's financial data lives
**encrypted on their device** and never leaves it.

One-liner: *A private money ledger that lives entirely on your phone — track net
worth, budgets, and goals without a single server ever seeing your data.*

The name mark is a serif **"K."** (Fraunces) with a single gold period; the app
was formerly codenamed "PersonalFinance / Finances" and was renamed to **Kredits**
during pre-release.

---

## 2. Core philosophy (the non-negotiables)

These are identity, not features. They shape — and constrain — the business model.

- **100% offline at runtime.** No network calls, ever. There is a production
  build flag (`OFFLINE_BUILD=1`) that **strips the Android INTERNET permission
  from the manifest** — a *verifiable* guarantee the app cannot phone home. This
  is a marketing asset ("we literally can't send your data anywhere") and a hard
  technical constraint (see §9).
- **Local-first & user-owned.** Data is in an encrypted SQLite (SQLCipher) DB;
  the key lives in the OS keystore (Secure Enclave / Keystore). Backup/restore is
  a passphrase-encrypted local file the user controls — no cloud sync.
- **No telemetry.** We collect nothing. This means **no analytics, no funnels,
  no A/B tests, no retention dashboards** — a real growth/measurement constraint.
- **Privacy as the wedge**, not a checkbox. The whole product is the anti-Mint.

---

## 3. Who it's for

- **Privacy-conscious users** who distrust cloud finance apps (post-Mint-shutdown,
  post-data-breach sentiment).
- **Cash- and gold-heavy / underbanked economies**, especially **MENA, South
  Asia, and similar markets** where (a) bank **SMS alerts are ubiquitous** and
  (b) **physical gold/silver** is a normal store of wealth. Kredits treats bank-SMS
  auto-import and gold (XAU/XAG) as first-class — incumbents don't.
- **Multi-currency people** — expats, freelancers paid in several currencies,
  people who hold assets across denominations.
- **"I just want to see my whole net worth in one place, privately"** users who
  find spreadsheets tedious and cloud apps invasive.

Arabic is a first-class locale (full RTL), which is unusual for indie finance
apps and directly serves the MENA angle.

---

## 4. Feature set

In-app naming uses a deliberate "vault ledger" vocabulary (shown in parentheses).

**Money tracking**
- **Pockets** (containers) — named virtual accounts/wallets (Cash, Bank, Wallet,
  Savings), each in its own currency, with derived balances.
- **Receipts** (transactions) — manual income/expense entry with categories.
- **Transfers / conversions** between Pockets using a **manual FX rate** (offline
  → rates are user-entered, never fetched).
- **Assets** — gold, stocks, crypto, property, etc., for full net-worth tracking.
- **Net Worth** shown in a chosen display currency, combined across currencies via
  a **user-maintained FX rate table**.

**Planning ("The Long Game")**
- **Budgets** with progress and **local threshold notifications** (90% / 100%).
- **Goals / purchase plans** with progress and savings-rate ETA projections.
- **"Just this time" Boxes** — one-off event budgets (a trip, a wedding, a
  birthday): fund a closed envelope, spend against it, get an under/over verdict.

**Insight & automation**
- **Analytics** — spending-by-category donut, income-vs-expense trend, top merchants.
- **SMS auto-import (Android only)** — reads bank SMS from an **allowlist of
  senders**, parses **English & Arabic** messages (per-bank templates + a generic
  extractor), dedupes, and queues them for **one-tap review**. iOS can't read the
  SMS inbox, so this feature is hidden there. *This is the standout automation and
  a key wedge in SMS-heavy markets.*

**Trust & data ownership**
- **Security** — SQLCipher-encrypted DB, key in the OS keystore, **biometric +
  PIN app lock** (Face ID / fingerprint).
- **Encrypted local backup / restore** — passphrase-based, no cloud.

---

## 5. Design & brand

"**Vault Ledger**" design system — a private, offline finance vault feel.
- **Palette:** deep emerald-ink surfaces (`#0C1311`), emerald primary
  (`#34C79A`), and a **strictly rationed brass-gold** (`#E0A93E`) that *only* ever
  marks value (net worth, asset totals, the active tab) — never chrome or buttons.
- **Type:** Fraunces (serif headlines & the wordmark), Space Grotesk (tabular
  money figures so ledger columns align), Inter (UI/body).
- **Mark:** "K." — light glyph + gold dot. App icon, splash, and adaptive/mono/
  tinted variants are all shipped; colors & fonts in-app already match the kit.

---

## 6. Tech & architecture (business-relevant bits)

- **Expo SDK 56 / React Native / TypeScript**, expo-router, react-native-paper
  (Material 3, RTL-aware), zustand for state, i18n-js (EN/AR).
- **Encrypted store:** expo-sqlite + SQLCipher; expo-secure-store for the key.
- **On-device only:** expo-notifications is **local** (budget alerts), never push.
- Pure, tested logic (money math, planning, SMS parsing, backup crypto) is kept
  out of the UI — the codebase is maintainable by a small team.
- **No backend exists.** There is nothing to run, scale, or pay for server-side.

**Implication:** marginal cost per user is ~**zero** and there is **no recurring
infrastructure cost** — but equally **no server-side lever** (no sync to sell, no
entitlement server, no usage data).

---

## 7. Platform & distribution

- **iOS + Android**, distributed through the **App Store and Play Store** only.
- Full feature parity **except SMS auto-import (Android-only)** — a meaningful
  platform asymmetry: Android is the stronger story in SMS-heavy markets.
- No web app, no landing-page backend required to function.

---

## 8. Current status (pre-release)

- Feature-complete enough to be **"building & releasing soon."**
- Rename to **Kredits** and full brand application (icon, splash, favicon) are done.
- **No monetization is implemented** — no in-app purchases, no paywall, no ads,
  no pricing. Monetization is a **greenfield decision**, which is exactly what the
  companion strategy session is for.

---

## 9. Business-model context — the central tension

The offline identity is the product's biggest differentiator **and** its hardest
monetization constraint. Frame the discussion around this:

**The offline ↔ monetization tension.**
- App-store **in-app purchases and subscriptions require network** at purchase
  time (StoreKit / Play Billing talk to Apple/Google, not to us). In the
  **INTERNET-stripped offline build, IAP/subscriptions cannot work at all** on
  Android.
- So realistic options are: (a) **paid up-front** app (works with zero network at
  runtime; purchase is handled by the store before install), or (b) a build that
  **retains INTERNET solely for the store/purchase handshake**, softening the
  "verifiably can't phone home" claim, or (c) a **hybrid** (free offline core +
  a paid unlock validated once, at a moment where network is allowed).
- **Recurring revenue is unnatural here.** Cloud apps justify subscriptions with
  sync + servers; Kredits has neither. A subscription would need a *different*
  justification (ongoing bank-SMS template updates? new features via app updates?)
  and would likely read as user-hostile without a server story.

**What we give up by being offline (growth/measurement).**
- No telemetry → **no data-driven growth**. Acquisition leans on App Store
  optimization, privacy positioning, word-of-mouth, press, and community.
- No usage data → retention/pricing must be reasoned about, not measured.

**What we gain.**
- **Near-zero COGS**, no infra to fund → even modest one-time revenue is
  high-margin and sustainable for a small team.
- A **rare, verifiable privacy claim** (INTERNET permission removed) that can
  anchor **premium, trust-based positioning**.
- A **feature moat in specific markets** (bank-SMS import + Arabic + gold).

**Candidate monetization models to weigh (not decided):**
- **Paid up-front** (simplest; fits offline purity; caps reach).
- **Freemium with a one-time "Pro" unlock** — free core, pay once for e.g. SMS
  auto-import, multi-currency net worth, unlimited Pockets/Boxes, advanced
  analytics, extra themes. (Note: the unlock still needs a network moment to
  validate — revisit the §9 tension.)
- **Lifetime / family license**, "pay what you want," or regional pricing (matters
  a lot for MENA / South Asia purchasing power).
- **Non-monetary** for now: build audience/trust, monetize later.

---

## 10. Competitive landscape (for positioning)

- **Mint** — shut down; was cloud + data-monetized. Kredits is the deliberate opposite.
- **YNAB** — cloud, ~$109/yr subscription, sync-based. Kredits = no cloud, likely no
  subscription.
- **Monarch / Copilot** — premium cloud subscriptions, bank-linking (Plaid). Kredits
  has no bank-linking by design (privacy) and no recurring server cost.
- **Actual Budget** — open-source, local-first but sync-oriented / self-host. Kredits
  is closer in spirit but consumer-polished and truly no-server, with SMS import.
- **Wallet (BudgetBakers) / Spendee** — freemium cloud. Kredits' edge is offline +
  SMS + Arabic + gold.

Kredits' one-sentence position: *the only polished consumer finance app that is
verifiably offline, needs no account, and auto-captures bank SMS in English and
Arabic.*

---

## 11. Open questions for the strategy session

1. **Pricing model:** paid up-front vs one-time Pro unlock vs something else —
   given the offline/IAP tension in §9, which is actually buildable *and* on-brand?
2. **Does any monetization justify keeping INTERNET** in the shipped build, or is
   the "verifiably offline" claim too central to compromise?
3. **Which markets first?** Global privacy-conscious buyers, or MENA/South-Asia
   where SMS + Arabic + gold are killer features (and where price sensitivity and
   regional pricing dominate)?
4. **Free vs Pro split:** if freemium, what's core vs paid without gutting the
   value or feeling extractive?
5. **Growth without telemetry:** ASO, privacy press, communities, referrals —
   what's the realistic acquisition engine with zero analytics?
6. **iOS vs Android strategy** given SMS import (the strongest hook) is Android-only.
7. **Trust as premium:** can "we can't see your data, and here's the proof" carry a
   higher price than cloud competitors, or does offline cap willingness-to-pay?
