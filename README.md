# Dear Human

AIではなく人間と日記を交換しよう。

匿名の一人と7日間だけ日記を交換するMVPです。UIはチャット風ですが、会話ではなく「自分」「相手」「システムメッセージ」の3アクターだけで構成した静かな日記スレッドです。

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- Cloudflare Pages Functions
- Cloudflare D1
- Google Identity Services
- Stripe Checkout

## Requirements Covered

- Smartphone-first UI
- Three actors: self, partner, system
- 7 days free, then ¥500/month
- One plan only
- No yearly plan, no premium tier, no usage limit
- No reply, reaction, read button, or report button in the main flow
- Partner diary unlocks only after the user posts
- Test users selectable from the settings sheet
- Google sign-in when `VITE_GOOGLE_CLIENT_ID` is configured
- D1-backed waiting pool, pairs, and diary entries
- Stripe Checkout endpoint for the ¥500/month subscription

## Local Development

```bash
npm install
npm run dev
```

Without `VITE_GOOGLE_CLIENT_ID`, the app runs in local test-user mode. To use the backend locally, copy `.dev.vars.example` to `.dev.vars`, set the values, and run a Pages-compatible dev server.

Required production configuration:

- `VITE_GOOGLE_CLIENT_ID`: Google OAuth web client ID used by the frontend.
- `GOOGLE_CLIENT_ID`: same client ID, used by Pages Functions to verify ID tokens.
- `STRIPE_SECRET_KEY`: Stripe secret key.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret for `/api/stripe/webhook`.
- `STRIPE_PRICE_ID`: recurring monthly price ID for ¥500/month.
- `STRIPE_SUCCESS_URL`: optional Checkout success redirect.
- `STRIPE_CANCEL_URL`: optional Checkout cancel redirect.

The D1 database binding is `DB`; migrations live in `migrations/`.

## Test Users

Open the settings sheet from the `...` button and switch between:

- 夜にAIへ貼る人
- 普通に働いた人
- 眠る前だけ書く人

Switching test users resets the local test state and starts a fresh 7-day trial.

## Verification

```bash
npm run lint
npm test
npm run build
```

## Deploy to Cloudflare Pages

```bash
npm run deploy
```

This builds the app and deploys `dist` to the Cloudflare Pages project named `dear-human`.
