# Dear Human

AIに日記を貼ったあと、誰にも読まれていない感じだけが残る夜へ。

匿名の一人と7日間だけ日記を交換するMVPです。UIはチャット風ですが、会話ではなく「自分」「相手」「システムメッセージ」の3アクターだけで構成した静かな日記スレッドです。

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Vitest
- Cloudflare Pages

## Requirements Covered

- Smartphone-first UI
- Three actors: self, partner, system
- 7 days free, then ¥500/month
- One plan only
- No yearly plan, no premium tier, no usage limit
- No reply, reaction, read button, or report button in the main flow
- Partner diary unlocks only after the user posts
- Test users selectable from the settings sheet

## Local Development

```bash
npm install
npm run dev
```

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
