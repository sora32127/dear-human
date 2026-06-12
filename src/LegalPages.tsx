import { ArrowLeft } from 'lucide-react'

type LegalPageKind = 'privacy' | 'terms' | 'tokushoho'
type BillingResultKind = 'success' | 'cancel'
type LegalSection = {
  title: string
  items?: string[]
  rows?: Array<[string, string]>
}
type LegalPageContent = {
  title: string
  intro: string
  sections: LegalSection[]
  note: string
}

const updatedAt = '2026年6月12日'
const serviceUrl = 'https://dear-human.net'
const contactEmail = '未設定'

const legalPages: Record<LegalPageKind, LegalPageContent> = {
  tokushoho: {
    title: '特定商取引法に基づく表記',
    intro:
      'Dear Humanで有料プランを提供する前に必要な表示事項です。未設定の項目は、課金開始前に必ず確定してください。',
    sections: [
      {
        title: '販売事業者',
        rows: [
          ['事業者名', '未設定'],
          ['運営責任者', '未設定'],
          ['所在地', '未設定'],
          ['電話番号', '未設定'],
          ['メールアドレス', contactEmail],
          ['ウェブサイト', serviceUrl],
        ],
      },
      {
        title: '販売条件',
        rows: [
          ['販売価格', '月額500円（税込）'],
          ['サービス内容', '匿名の一人と7日間だけ日記を交換できるオンラインサービス'],
          ['商品代金以外の必要料金', 'インターネット接続料金、通信料金等は利用者の負担です。'],
          ['支払方法', 'Stripe Checkoutで利用可能な決済手段'],
          ['支払時期', '有料プラン申込み時、および以後の更新時に決済されます。'],
          ['サービス提供時期', '無料体験または決済完了後、利用条件を満たした時点で提供を開始します。'],
          ['申込みの有効期限', '申込み画面に表示された条件に従います。'],
          ['動作環境', '最新版の主要ブラウザを推奨します。'],
        ],
      },
      {
        title: '解約・キャンセル',
        rows: [
          ['解約方法', 'アカウント画面または問い合わせ窓口から手続きできるようにします。'],
          ['解約時期', '次回更新前に解約した場合、次回以降の請求は行われません。'],
          ['返品・キャンセル', 'デジタルサービスの性質上、提供開始後の返品はできません。誤請求がある場合は個別に確認します。'],
        ],
      },
    ],
    note: 'このページは本番課金前のドラフトです。未設定項目が残っている間は、Stripeの本番課金を開始しないでください。',
  },
  privacy: {
    title: 'プライバシーポリシー',
    intro: 'Dear Humanは、匿名の一人と7日間だけ日記を交換するサービスです。必要最小限の情報だけを扱います。',
    sections: [
      {
        title: '取得する情報',
        items: [
          'Googleログインで取得する識別子、メールアドレス',
          '利用者が投稿した日記本文、投稿日時、マッチング状態',
          'Stripeから連携される決済状態、顧客ID、購読状態',
          'Cloudflare等が処理するアクセスログ、Cookie、技術情報',
        ],
      },
      {
        title: '利用目的',
        items: [
          '本人確認、ログイン状態の維持',
          '匿名の相手とのマッチング、日記交換、投稿制限の管理',
          '有料プラン、請求、解約、問い合わせ対応',
          '不正利用の防止、障害調査、サービス改善',
        ],
      },
      {
        title: '外部サービス',
        items: [
          'Cloudflare: ホスティング、データベース、セキュリティ',
          'Google: ログイン認証',
          'Stripe: 決済、請求、購読管理',
        ],
      },
      {
        title: '削除・問い合わせ',
        items: [
          '利用者は、自分のアカウントおよび関連データの削除を依頼できます。',
          `問い合わせ先は ${contactEmail} です。本番公開前に有効な連絡先を設定してください。`,
        ],
      },
    ],
    note: '危機対応、医療、カウンセリングを目的としたサービスではありません。緊急時は地域の緊急窓口に連絡してください。',
  },
  terms: {
    title: '利用規約',
    intro: 'Dear Humanを利用する前に、以下の内容を確認してください。',
    sections: [
      {
        title: 'サービスの内容',
        items: [
          'Dear Humanは、匿名の一人と7日間だけ日記を交換するサービスです。',
          '返信、評価、プロフィール、フォロー機能はありません。',
          '自分が今日の日記を送ると、相手の日記を読めるようになります。',
        ],
      },
      {
        title: '利用条件',
        items: [
          '18歳以上の方のみ利用できます。',
          '医療、カウンセリング、危機対応の代替として利用することはできません。',
          '他者への脅迫、差別、違法行為、個人情報の投稿、第三者の権利侵害は禁止します。',
        ],
      },
      {
        title: '料金',
        items: [
          '無料体験は7日間です。',
          '無料体験後に継続する場合、料金は月額500円です。',
          '現在のMVPでは、開始時にクレジットカードは不要で、自動課金されません。',
        ],
      },
      {
        title: '停止・変更',
        items: [
          '運営者は、不正利用や安全上の理由により、利用を停止することがあります。',
          'サービス内容、料金、規約は必要に応じて変更されることがあります。',
        ],
      },
    ],
    note: '本規約はMVP公開前のドラフトです。本番公開前に最終確認してください。',
  },
}

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const page = legalPages[kind]

  return (
    <main className="min-h-dvh bg-black px-5 py-8 text-white">
      <article className="mx-auto w-full max-w-[760px] space-y-8">
        <LegalHeader />
        <div className="space-y-3 border-b border-zinc-900 pb-6">
          <p className="text-xs text-zinc-600">Dear Human</p>
          <h1 className="font-serif text-[clamp(2rem,8vw,4rem)] leading-tight">{page.title}</h1>
          <p className="max-w-[64ch] text-sm leading-7 text-zinc-400">{page.intro}</p>
        </div>

        <div className="space-y-6">
          {page.sections.map((section) => (
            <section className="space-y-3" key={section.title}>
              <h2 className="text-base font-medium">{section.title}</h2>
              {section.rows ? (
                <dl className="grid overflow-hidden rounded-lg border border-zinc-900 text-sm sm:grid-cols-[180px_1fr]">
                  {section.rows.map(([label, value]) => (
                    <div className="contents" key={label}>
                      <dt className="border-b border-zinc-900 bg-zinc-950 px-4 py-3 text-zinc-500 sm:border-r">
                        {label}
                      </dt>
                      <dd className="border-b border-zinc-900 px-4 py-3 leading-7 text-zinc-300">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {section.items ? (
                <ul className="space-y-2 text-sm leading-7 text-zinc-400">
                  {section.items.map((item) => (
                    <li className="border-l border-zinc-800 pl-4" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs leading-6 text-zinc-400">
          {page.note}
        </div>

        <p className="text-xs text-zinc-600">最終更新日: {updatedAt}</p>
      </article>
    </main>
  )
}

export function BillingResultPage({ kind }: { kind: BillingResultKind }) {
  const success = kind === 'success'

  return (
    <main className="grid min-h-dvh place-items-center bg-black px-5 text-white">
      <section className="w-full max-w-[520px] space-y-5">
        <LegalHeader />
        <h1 className="font-serif text-3xl leading-tight">
          {success ? '決済が完了しました' : '決済をキャンセルしました'}
        </h1>
        <p className="text-sm leading-7 text-zinc-400">
          {success
            ? 'Dear Humanに戻ると、購読状態が反映されます。反映に少し時間がかかる場合があります。'
            : '決済は完了していません。必要になったら、もう一度プラン画面から手続きしてください。'}
        </p>
        <a className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-black" href="/">
          Dear Humanへ戻る
        </a>
      </section>
    </main>
  )
}

function LegalHeader() {
  return (
    <a className="inline-flex items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-200" href="/">
      <ArrowLeft size={15} />
      Dear Human
    </a>
  )
}
