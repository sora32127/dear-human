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

After the custom domain is active, configure OAuth and Stripe URLs with `https://dear-human.net`.

## Legal Launch Checklist

Before enabling Stripe live billing, fill the placeholders in `src/LegalPages.tsx`:

- 販売事業者
- 運営責任者
- 所在地
- 電話番号
- 有効な問い合わせメールアドレス

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

Without `VITE_GOOGLE_CLIENT_ID`, the app runs in local test-user mode. To use the backend locally, copy `.dev.vars.example` to `.dev.vars`, set the values, and run a Pages-compatible dev server.

Required production configuration:

- `VITE_GOOGLE_CLIENT_ID`: Google OAuth web client ID used by the frontend.
- `GOOGLE_CLIENT_ID`: same client ID, used by Pages Functions to verify ID tokens.
- `STRIPE_SECRET_KEY`: Stripe secret key.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret for `/api/stripe/webhook`.
- `STRIPE_PRICE_ID`: recurring monthly price ID for ¥500/month.
- `STRIPE_SUCCESS_URL`: Checkout success redirect, normally `https://dear-human.net/billing/success`.
- `STRIPE_CANCEL_URL`: Checkout cancel redirect, normally `https://dear-human.net/billing/cancel`.

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
