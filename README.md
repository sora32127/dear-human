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
- Google sign-in when `GOOGLE_CLIENT_ID` is configured
- D1-backed waiting pool, pairs, and diary entries
- Users can return to the shared pool for the next 7-day exchange after a pair ends
- Stripe Checkout endpoint for the ¥500/month subscription
- Legal pages for terms, privacy policy, and 特定商取引法に基づく表記

## Production Domain

Primary production domain:

- `https://dear-human.net`

Cloudflare Pages custom domain setup is done from the Cloudflare dashboard:

1. Open Workers & Pages.
2. Select the `dear-human` Pages project.
3. Open Custom domains.
4. Add `dear-human.net`.
5. Confirm that Cloudflare creates the DNS record and certificate.

After the custom domain is active, configure Google OAuth and Stripe URLs with `https://dear-human.net`.

## Google Auth Setup

Dear Human uses Google Identity Services to receive an ID token in the browser and verify it on the Pages Functions backend.

Google Cloud Console:

- Application type: Web application
- Authorized JavaScript origins:
  - `https://dear-human.net`
  - `http://localhost:5173` for local Vite development, if needed
- Authorized redirect URIs: not required for the current Google Identity Services button flow

Cloudflare Pages production secret:

```bash
wrangler pages secret put GOOGLE_CLIENT_ID --project-name dear-human
```

`GOOGLE_CLIENT_ID` is intentionally exposed through `/api/config` because it is a public OAuth client identifier. The backend uses the same value to verify the Google ID token audience.

## Stripe Setup

Dear Human keeps the 7-day free period inside the app. Stripe is only opened after the user explicitly chooses to continue, so the user is not automatically charged after the free period.

Stripe Dashboard:

- Product name: `Dear Human`
- Price: JPY `500`
- Billing period: monthly recurring
- Checkout mode: subscription
- Webhook endpoint: `https://dear-human.net/api/stripe/webhook`
- Webhook events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Cloudflare Pages production secrets:

```bash
wrangler pages secret put STRIPE_SECRET_KEY --project-name dear-human
wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name dear-human
wrangler pages secret put STRIPE_PRICE_ID --project-name dear-human
wrangler pages secret put STRIPE_SUCCESS_URL --project-name dear-human
wrangler pages secret put STRIPE_CANCEL_URL --project-name dear-human
wrangler pages secret put STRIPE_PORTAL_RETURN_URL --project-name dear-human
```

Use these redirect values:

- `STRIPE_SUCCESS_URL=https://dear-human.net/billing/success`
- `STRIPE_CANCEL_URL=https://dear-human.net/billing/cancel`
- `STRIPE_PORTAL_RETURN_URL=https://dear-human.net/`

## Legal Launch Notes

The commerce disclosure in `src/LegalPages.tsx` follows the concise format used by:

- `https://healthy-person-emulator.org/commerceDisclosure`

Current disclosed values:

- 販売業者の名称・サイト管理代表者: 上村空知
- 所在地: 請求があったら遅滞なく開示します
- 電話番号: 請求があったら遅滞なく開示します
- メールアドレス: `sora32127@gmail.com`

The current MVP says the 7-day trial does not require a credit card and does not automatically charge. If this changes to a Stripe subscription trial that automatically charges after 7 days, update:

- Landing copy
- Terms
- 特定商取引法に基づく表記
- Stripe Checkout mode and trial settings
- Final confirmation wording

## Local Development

```bash
npm install
npm run dev
```

Without `GOOGLE_CLIENT_ID`, the app runs in local test-user mode. To use the backend locally, copy `.dev.vars.example` to `.dev.vars`, set the values, and run a Pages-compatible dev server.

Required production configuration:

- `GOOGLE_CLIENT_ID`: Google OAuth web client ID. `/api/config` exposes it to the frontend, and Pages Functions use it to verify ID tokens.
- `STRIPE_SECRET_KEY`: Stripe secret key.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret for `/api/stripe/webhook`.
- `STRIPE_PRICE_ID`: recurring monthly price ID for ¥500/month.
- `STRIPE_SUCCESS_URL`: Checkout success redirect, normally `https://dear-human.net/billing/success`.
- `STRIPE_CANCEL_URL`: Checkout cancel redirect, normally `https://dear-human.net/billing/cancel`.
- `STRIPE_PORTAL_RETURN_URL`: Customer Portal return URL, normally `https://dear-human.net/`.

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
