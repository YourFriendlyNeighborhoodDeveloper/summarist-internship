# Summarist

Summarist is a book summary and audio platform built for the Frontend Simplified Virtual Internship (v2). Readers can browse curated books, read full summaries, listen to narrated versions with a custom audio player, keep a personal library, and upgrade to a Stripe-powered Premium subscription to unlock premium titles.

Reference design: <https://summarist.vercel.app> · Home page assets: <https://github.com/hannamitri/summarist-home-page>

## Features

- **Landing page** converted from the instructor's HTML/CSS into React components, with the rotating statistics highlight from the reference site.
- **Authentication modal** (Redux-controlled, available everywhere): email/password sign-up and login, guest login (Firebase anonymous auth), Google sign-in, password reset, logout, input validation, and friendly error messages. Guests can later sign up and keep their library (the anonymous account is linked, so the uid stays the same).
- **For You** page with the selected, recommended, and suggested books from the Summarist API, horizontal carousels, audio durations, ratings, and Premium pills.
- **Book page** (`/book/[id]`) with every book field plus Read, Listen, and Save to Library actions that follow the access rules below.
- **Reader and audio player** (`/player/[id]`): full summary with preserved line breaks, adjustable text size, play/pause, ±10 s skip, draggable seek bar, current time and duration, playback speed, buffering and error states. Finishing the audio marks the book as finished.
- **Choose plan** (`/choose-plan`): Basic, Premium Monthly, and Premium Plus Yearly (7-day free trial), FAQ accordion, and Stripe Checkout.
- **Settings**: verified plan (Basic / Premium / Premium Plus) with trial, renewal, or cancellation details, upgrade or manage-billing button, email or guest identity, and logout.
- **Library** (`/library`): Saved Books and Finished sections stored in Firestore per user.
- **Search** with a 300 ms debounce, request cancellation, and loading, empty, and error states.
- **Responsive sidebar** that becomes a drawer below 768 px and adapts to the fixed audio bar on the player page.
- Skeleton loaders, retry buttons, not-found states, and graceful handling when Firebase or Stripe isn't configured.

### Access rules

| Visitor | Free book | Premium book |
| --- | --- | --- |
| Logged out | Read, Listen, and Save open the auth modal | Read, Listen, and Save open the auth modal |
| Basic or guest | Opens `/player/[id]` | Redirects to `/choose-plan` |
| Active or trialing subscriber | Opens `/player/[id]` | Opens `/player/[id]` |

Subscription status is read from `subscriptions/{uid}` in Firestore. Only the server writes that document (Firebase Admin SDK, from signature-verified Stripe webhooks), and Firestore rules forbid client writes, so a locally edited Redux, localStorage, or Firestore value cannot unlock premium content. The player page enforces the same rules when opened directly.

## Tech stack

- Next.js 16 (App Router, Cache Components, Turbopack) with JavaScript/JSX
- React 19, plain CSS and CSS Modules, React Icons
- Redux Toolkit and React Redux for UI state (auth modal, sidebar, text size, toasts)
- Firebase Authentication and Cloud Firestore (client SDK); Firebase Admin SDK on the server
- Stripe Checkout, Billing Portal, and webhooks (`stripe` Node SDK, API version `2026-09-30.endive`)
- Playwright end-to-end tests against the Firebase Auth and Firestore emulators
- Deployed on Vercel

`package.json` overrides `@grpc/grpc-js` to `^1.14.6` inside `@firebase/firestore` so the Firebase client SDK's Node build doesn't pull in a version with known advisories.

## Project structure

```
src/
  app/
    page.js                     Landing page (/)
    choose-plan/page.js         Plans and checkout (/choose-plan)
    (app)/layout.js             App shell: search bar and sidebar
    (app)/for-you/page.js
    (app)/book/[id]/            Book page and loading skeleton
    (app)/player/[id]/          Reader/player and loading skeleton
    (app)/library/page.js
    (app)/settings/page.js
    api/checkout/route.js       Creates Stripe Checkout sessions (server)
    api/billing-portal/route.js Opens the Stripe Billing Portal (server)
    api/stripe/webhook/route.js Verifies and processes Stripe events (server)
  components/                   UI components with colocated CSS Modules
  hooks/                        Data, audio-duration, library, and access hooks
  lib/                          Book API client, Firebase client, auth, library, plans
  lib/server/                   Server-only code: Firebase Admin, Stripe, billing logic
  store/                        Redux Toolkit store and slices
  assets/                       Images supplied by the instructor
tests/
  e2e/                          Playwright specs and test support
  fixtures/books.json           Real API responses captured for deterministic tests
firestore.rules                 Firestore security rules
firestore.indexes.json          Firestore index configuration
firebase.json                   Firebase CLI and emulator configuration
```

## Getting started

Requirements: Node.js 22 or newer and npm.

```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Open <http://localhost:3000>. Without any configuration, book browsing and search work; login shows a clear "Firebase isn't configured" message and checkout reports that payments aren't configured.

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js core web vitals rules) |
| `npm run test:e2e` | Build the app and run Playwright against the Firebase emulators |
| `npm run emulators` | Start the Auth and Firestore emulators on their own |

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local` or service-account files (both are git-ignored).

| Variable | Where it's used | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser | Firebase web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Browser | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Browser | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Browser | Optional |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Browser | Optional |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Browser | Firebase web app ID |
| `NEXT_PUBLIC_FIREBASE_USE_EMULATORS` | Browser | `true` only when using local emulators |
| `FIREBASE_ADMIN_PROJECT_ID` | Server | Service account project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | Service account client email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | Service account private key, with `\n` line breaks |
| `STRIPE_SECRET_KEY` | Server | Stripe secret key (`sk_test_…` in development) |
| `STRIPE_WEBHOOK_SECRET` | Server | Signing secret of your webhook endpoint (`whsec_…`) |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Server | Recurring monthly Price ID |
| `STRIPE_PRICE_PREMIUM_PLUS_YEARLY` | Server | Recurring yearly Price ID |
| `STRIPE_ALLOW_LIVE_MODE` | Server | Live keys are refused unless this is `true` |
| `APP_URL` | Server | Optional absolute URL for Stripe redirects (defaults to the request origin) |

`NEXT_PUBLIC_*` values are inlined at build time, so rebuild (or redeploy) after changing them.

## Firebase setup

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and add a **Web app**. Copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables.
2. **Authentication → Sign-in method**: enable **Email/Password**, **Anonymous** (guest login), and optionally **Google**.
3. **Authentication → Settings → Authorized domains**: add `localhost` (present by default) and your Vercel domain(s).
4. **Firestore Database**: create a database in production mode.
5. Deploy the security rules and index configuration with the [Firebase CLI](https://firebase.google.com/docs/cli):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes --project your-project-id
   ```

6. **Project settings → Service accounts → Generate new private key**. Copy `project_id`, `client_email`, and `private_key` into the `FIREBASE_ADMIN_*` variables, then delete the downloaded JSON file.

### Firestore data model

| Path | Written by | Contents |
| --- | --- | --- |
| `users/{uid}/library/{bookId}` | Signed-in owner | Saved book metadata and `savedAt` |
| `users/{uid}/finished/{bookId}` | Signed-in owner | Finished book metadata and `finishedAt` |
| `subscriptions/{uid}` | Server only | Status, plan, price, trial end, period end, cancellation, latest invoice |
| `customers/{uid}` | Server only | Stripe customer ID for a Firebase user |
| `stripeCustomers/{customerId}` | Server only | Reverse mapping to the Firebase uid |
| `stripeEvents/{eventId}` | Server only | Processed webhook events used for deduplication, with an `expireAt` date 30 days after processing (see [Stripe event retention](#stripe-event-retention)) |

The rules in `firestore.rules` let users read and change only their own library entries (with field and type validation, and server timestamps), let users read only their own subscription document, and deny all client access to billing records.

### Free Spark plan

The app runs on Firebase's free **Spark** plan. It uses Authentication (Email/Password, Anonymous, and optionally Google), Cloud Firestore, and the Admin SDK from Vercel's servers, all of which work without billing. Spark's daily Firestore and Authentication quotas apply; when one is reached, Firebase stops serving that product until the quota resets rather than charging you.

These Firebase features need the paid **Blaze** plan, so the app deliberately doesn't use them:

- Firestore TTL policies (automatic document deletion)
- Cloud Functions and scheduled functions, including the "Run Payments with Stripe" extension (Stripe is handled by this app's own API routes instead)
- Cloud Storage buckets for new projects (book images and audio come from the Summarist API)
- Firestore backups and point-in-time recovery

### Stripe event retention

Every processed Stripe webhook event is stored in `stripeEvents/{eventId}` so that redelivered or replayed events are recognized and skipped. Replay protection also comes from signature verification, which rejects events whose signed timestamp is more than 5 minutes old.

On Spark nothing deletes these records, so they accumulate (they are small, one per event). Each record has an `expireAt` field 30 days after processing that marks when it is safe to delete. Stripe retries failed deliveries for up to 3 days, so records must be kept at least that long. Before the collection grows large, add a retention strategy, for example:

- After upgrading to Blaze, enable a TTL policy on `stripeEvents.expireAt`.
- Or run a scheduled job (such as a Vercel Cron Job or a GitHub Actions schedule) that uses the Admin SDK to delete `stripeEvents` documents whose `expireAt` has passed. The default single-field index on `expireAt` supports that query.

## Stripe setup (test mode)

1. In the [Stripe dashboard](https://dashboard.stripe.com/test/dashboard), stay in **test mode**.
2. **Product catalog → Add product** "Summarist Premium" with two **recurring** prices that match the plans page:
   - $9.99 per month → `STRIPE_PRICE_PREMIUM_MONTHLY`
   - $99.99 per year → `STRIPE_PRICE_PREMIUM_PLUS_YEARLY`

   The 7-day trial for the yearly plan is added when the Checkout session is created, so don't add a trial to the price itself. The server checks that each configured price is active, recurring, and has the expected interval.
3. **Developers → API keys**: copy the secret key into `STRIPE_SECRET_KEY`.
4. **Webhook endpoint**: add `https://your-domain/api/stripe/webhook` and select these events:
   - `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `customer.subscription.trial_will_end`, `customer.subscription.pending_update_applied`, `customer.subscription.pending_update_expired`
   - `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`

   Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Settings → Billing → Customer portal**: save the default configuration once so "Manage subscription" works.
6. Local development: forward events with the [Stripe CLI](https://docs.stripe.com/stripe-cli) and use the secret it prints:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

Pay with the test card `4242 4242 4242 4242`, any future expiry, and any CVC.

### How payments work

1. The plans page sends only the plan name and the user's Firebase ID token to `POST /api/checkout`.
2. The route verifies the token with the Admin SDK, rejects guest accounts, maps the plan to an approved Price ID from the environment, refuses duplicate subscriptions, finds or creates the Stripe customer (stored in `customers` and `stripeCustomers`), and creates a subscription Checkout session (`trial_period_days: 7` for Premium Plus).
3. The success redirect only shows a "confirming your payment" notice. Access changes when Stripe's webhook arrives: `/api/stripe/webhook` verifies the signature, then updates `subscriptions/{uid}` inside a Firestore transaction that also records the event ID. Replayed events are ignored, older events can't overwrite newer state, and canceled subscriptions can't be revived by late events.
4. The client listens to `subscriptions/{uid}`, so Settings, Premium pills, and access rules update immediately.

## Testing

The Playwright suite runs the production build against the Firebase **Auth and Firestore emulators**, with the Firestore rules loaded. Book API responses are served from `tests/fixtures/books.json` (real responses captured from the API) so tests are deterministic, and a generated WAV file stands in for the audio. Stripe is exercised through signed webhook fixtures and the server's validation paths. No Stripe secret key is used in tests, so they never contact Stripe.

Prerequisites: the Firebase CLI (`npm install -g firebase-tools`), Java 21 or newer for the emulators, and the Playwright browser:

```bash
npx playwright install chromium
npm run test:e2e
```

If your default `java` is older than 21, point `JAVA_HOME` at a newer JDK first (for example `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` on macOS). The test browser runs with Chromium's `--disable-audio-output` flag, which gives headless Chromium a fake audio device; without it, audio playback never advances in headless mode.

The run builds the app into `.next-e2e`, starts it on port 3100, and runs the desktop (1440 px), tablet (768 px), and mobile (375 px) projects. `npx playwright show-report` opens the HTML report. To run against the live Summarist API only, use `npx playwright test --grep @live` (it needs network access).

Covered flows: landing page and assets, auth modal (open, close, Escape, backdrop), sign-up and login validation, login, session persistence, guest login and guest upgrade, password reset, logout, For You data and Premium pills, skeletons, API outage with retry, book page details, not-found handling, the exact 300 ms search debounce (with a fake clock), stale search results, search states, access rules for free and premium books, attempts to self-grant a subscription, audio play/pause/skip/seek/speed, finishing a book, pausing when leaving the player, audio errors, saving and removing library books, Firestore rule enforcement, the plans page and FAQ, checkout API authentication and validation, webhook signatures, idempotency, ordering, cancellation, Settings, and responsive navigation.

Not automated: the real Stripe Checkout and Billing Portal pages (they need your Stripe test keys; follow the Stripe setup above and pay with the test card) and the Google sign-in popup (it needs the provider enabled in your Firebase project).

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel. The defaults work: framework Next.js, build command `npm run build`, Node.js 22 or newer.
2. Add every variable from `.env.example` under **Settings → Environment Variables** (leave `NEXT_PUBLIC_FIREBASE_USE_EMULATORS` unset or `false`). Paste `FIREBASE_ADMIN_PRIVATE_KEY` with its `\n` sequences as they appear in the service account JSON.
3. Deploy, then add the production domain to **Firebase → Authentication → Authorized domains**.
4. Create the Stripe webhook endpoint for `https://your-domain/api/stripe/webhook` (see Stripe setup), set `STRIPE_WEBHOOK_SECRET`, and redeploy.

## Known limitations

- The book API is public and returns full summaries and audio links, so premium content can't be protected at the source. The app enforces access in its own UI using the server-verified subscription status.
- `getBooks?status=selected` returns a one-element array rather than the single object the assignment describes; the client accepts both shapes. Some upstream data is imperfect (for example, "Good to Great" lists the title and author swapped); it is shown as received.
- Unknown book IDs return an empty `200` response from the API, and empty IDs or search terms make it hang, so the client validates IDs, never sends empty searches, and times requests out after 15 seconds.
- Audio durations come from each file's metadata. Browsers that don't preload metadata (notably iOS Safari) show `--:--` until playback starts.
- Plan prices on the plans page are static copy and must match the prices you create in Stripe.
- Guest data is tied to the anonymous Firebase account and is lost when the guest logs out unless they sign up first.
- Highlights, Search (sidebar item), and Help & Support are intentionally disabled, as in the assignment.
