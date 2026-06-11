import { MoreHorizontal, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

const STORAGE_KEY = 'dear-human-state-v1'
const TRIAL_DAYS = 7
const MONTHLY_PRICE = 500

type Actor = 'self' | 'partner' | 'system'

type Entry = {
  text: string
  createdAt: string
}

type AppState = {
  accepted: boolean
  email: string
  trialStartedAt: string | null
  paid: boolean
  ended: boolean
  interrupted: boolean
  entries: Record<string, Entry>
  testUserId: string
}

type TestUser = {
  id: string
  label: string
  email: string
  prompt: string
  partnerLabel: string
  partnerEntries: string[]
}

type ThreadMessage = {
  id: string
  actor: Actor
  label?: string
  text: string
  createdAt?: string
  locked?: boolean
}

const testUsers: TestUser[] = [
  {
    id: 'night-writer',
    label: '夜にAIへ貼る人',
    email: 'night@example.com',
    prompt: '今日ここに置いていくこと',
    partnerLabel: '相手',
    partnerEntries: [
      '今日は、誰かに言うほどではないことばかりが積もった日だった。\n\n帰り道で買った温かい飲み物が、手の中で少しだけ心強かった。明日になれば忘れるかもしれないけれど、今日はここに置いていく。',
      '眠る前に、何も解決していないことを数えそうになった。\n\nでも、数えるのをやめて洗濯物を畳んだ。畳んだぶんだけ、部屋の空気が少し静かになった。',
    ],
  },
  {
    id: 'quiet-office',
    label: '普通に働いた人',
    email: 'office@example.com',
    prompt: '誰にも送らない今日のこと',
    partnerLabel: '相手',
    partnerEntries: [
      '昼間は普通にしていた。普通にできたぶん、夜に疲れが来た。\n\n大きなことは起きていない。ただ、大きなことが起きていない日にも重さはある。',
      '駅のホームで、知らない人たちがそれぞれの家に帰っていくのを見た。\n\n自分もその中の一人なのに、少し外側にいるような気がした。',
    ],
  },
  {
    id: 'almost-asleep',
    label: '眠る前だけ書く人',
    email: 'sleep@example.com',
    prompt: '眠る前に残すこと',
    partnerLabel: '相手',
    partnerEntries: [
      '今日の自分は、あまり上手に生きていなかった。\n\nでも、ここに一度書けたので、これ以上うまく説明しなくてもいいことにする。',
      '朝になれば、今の気分を大げさだったと思うかもしれない。\n\nそれでも夜の自分には夜の本当がある。今日はそれだけを残す。',
    ],
  },
]

const initialState: AppState = {
  accepted: false,
  email: '',
  trialStartedAt: null,
  paid: false,
  ended: false,
  interrupted: false,
  entries: {},
  testUserId: testUsers[0].id,
}

function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState
  } catch {
    return initialState
  }
}

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
}

function daysSinceStart(startedAt: string | null) {
  if (!startedAt) return 0
  const start = new Date(startedAt)
  const now = new Date()
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.floor((today.getTime() - startDay.getTime()) / 86400000))
}

function formatTime(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [draft, setDraft] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const selectedUser = testUsers.find((user) => user.id === state.testUserId) ?? testUsers[0]
  const key = todayKey()
  const todayEntry = state.entries[key]
  const elapsedDays = daysSinceStart(state.trialStartedAt)
  const currentDay = Math.min(TRIAL_DAYS, elapsedDays + 1)
  const remainingDays = Math.max(0, TRIAL_DAYS - elapsedDays)
  const expired = state.accepted && !state.paid && remainingDays <= 0

  const messages = useMemo<ThreadMessage[]>(() => {
    const items: ThreadMessage[] = [
      {
        id: 'system-intro',
        actor: 'system',
        text: '自分が今日の日記を送るまで、相手の日記は開きません。',
      },
    ]

    if (currentDay >= TRIAL_DAYS) {
      items.push({
        id: 'system-day-seven',
        actor: 'system',
        text: `今日で7日目です。続ける場合は月${MONTHLY_PRICE}円です。`,
      })
    }

    if (!todayEntry) {
      items.push({
        id: 'partner-locked',
        actor: 'partner',
        label: selectedUser.partnerLabel,
        text: 'あなたが送ると開きます。',
        locked: true,
      })
      return items
    }

    items.push({
      id: 'self-today',
      actor: 'self',
      label: 'あなた',
      text: todayEntry.text,
      createdAt: todayEntry.createdAt,
    })

    items.push({
      id: 'partner-today',
      actor: 'partner',
      label: selectedUser.partnerLabel,
      text: selectedUser.partnerEntries[(currentDay - 1) % selectedUser.partnerEntries.length],
    })

    return items
  }, [currentDay, selectedUser, todayEntry])

  function commit(next: AppState) {
    setState(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function startTrial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (form.get('age') !== 'on' || form.get('safety') !== 'on' || form.get('price') !== 'on') {
      return
    }

    commit({
      ...state,
      accepted: true,
      email: selectedUser.email,
      trialStartedAt: new Date().toISOString(),
    })
  }

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (text.length < 20 || todayEntry) return

    commit({
      ...state,
      entries: {
        ...state.entries,
        [key]: {
          text,
          createdAt: new Date().toISOString(),
        },
      },
    })
    setDraft('')
  }

  function switchTestUser(testUserId: string) {
    const nextUser = testUsers.find((user) => user.id === testUserId)
    commit({
      ...initialState,
      accepted: true,
      email: nextUser?.email ?? selectedUser.email,
      testUserId,
      trialStartedAt: new Date().toISOString(),
    })
    setDraft('')
  }

  function resetAll() {
    window.localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
    setDraft('')
    setSettingsOpen(false)
  }

  if (!state.accepted) {
    return (
      <main className="grid min-h-dvh justify-items-center bg-black px-5 pb-8 pt-[calc(env(safe-area-inset-top)+80px)] text-white">
        <section className="w-full max-w-[560px] space-y-7">
          <div className="space-y-4">
            <div className="h-11 w-11 border border-white bg-[repeating-linear-gradient(180deg,transparent_0_10px,rgba(255,255,255,.25)_11px,transparent_12px)]" />
            <h1 className="font-serif text-[clamp(1.35rem,6.5vw,2.3rem)] leading-[1.45]">
              AIに日記を貼ったあと、
              <br />
              誰にも読まれていない
              <br />
              感じだけが残る夜へ。
            </h1>
            <p className="max-w-[44ch] text-sm leading-7 text-zinc-400">
              7日間だけ、匿名の一人と日記を交換します。返信、評価、プロフィールはありません。
            </p>
          </div>

          <form className="space-y-4" onSubmit={startTrial}>
            <div className="grid gap-3 text-sm text-zinc-400">
              <label className="grid grid-cols-[20px_1fr] gap-3">
                <input className="mt-1 accent-white" name="age" type="checkbox" />
                <span>18歳以上です。</span>
              </label>
              <label className="grid grid-cols-[20px_1fr] gap-3">
                <input className="mt-1 accent-white" name="safety" type="checkbox" />
                <span>これは医療、カウンセリング、危機対応ではありません。</span>
              </label>
              <label className="grid grid-cols-[20px_1fr] gap-3">
                <input className="mt-1 accent-white" name="price" type="checkbox" />
                <span>7日間無料。その後は月{MONTHLY_PRICE}円。自動では課金されません。</span>
              </label>
            </div>

            <button
              className="h-12 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:bg-zinc-800 disabled:text-zinc-500"
              type="submit"
            >
              7日間無料で始める
            </button>
          </form>
        </section>
      </main>
    )
  }

  if (state.ended || state.interrupted || expired) {
    const title = expired
      ? '7日間の無料体験が終わりました。'
      : state.interrupted
        ? 'この交換は中断されました。'
        : '1週間の交換は終了しました。'

    return (
      <main className="grid min-h-dvh place-items-center bg-black px-5 text-white">
        <section className="w-full max-w-[520px] space-y-5">
          <h1 className="font-serif text-3xl leading-tight">{title}</h1>
          <p className="text-sm leading-7 text-zinc-400">
            続ける場合は月{MONTHLY_PRICE}円です。プランは1つだけです。
          </p>
          <div className="flex flex-wrap gap-2">
            {expired ? (
              <button
                className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-black"
                onClick={() => commit({ ...state, paid: true })}
                type="button"
              >
                月{MONTHLY_PRICE}円で続ける
              </button>
            ) : null}
            <button
              className="h-11 rounded-full border border-white px-5 text-sm"
              onClick={resetAll}
              type="button"
            >
              データを消す
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-black text-white">
      <section className="mx-auto grid h-dvh w-full max-w-[760px] grid-rows-[auto_1fr_auto] border-x border-zinc-900">
        <header className="flex items-center justify-between border-b border-zinc-900 bg-black/95 px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
          <div>
            <h1 className="font-serif text-lg leading-tight">Dear Human</h1>
            <p className="text-xs text-zinc-500">{currentDay}日目</p>
          </div>
          <button
            aria-label="設定"
            className="grid h-10 w-10 place-items-center rounded-full border border-zinc-800 text-zinc-400"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <MoreHorizontal size={18} />
          </button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto px-3 py-5 sm:px-5">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        {todayEntry ? null : (
          <form
            className="grid grid-cols-[1fr_auto] items-end gap-2 border-t border-zinc-900 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
            onSubmit={submitEntry}
          >
            <textarea
              aria-label="今日の日記"
              className="max-h-[180px] min-h-12 resize-y rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-6 outline-none focus:border-white"
              maxLength={1600}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={selectedUser.prompt}
              value={draft}
            />
            <button
              className="h-12 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:bg-zinc-800 disabled:text-zinc-500"
              disabled={draft.trim().length < 20}
              type="submit"
            >
              送る
            </button>
          </form>
        )}
      </section>

      {settingsOpen ? (
        <SettingsSheet
          currentUserId={state.testUserId}
          onClose={() => setSettingsOpen(false)}
          onEnd={() => commit({ ...state, ended: true })}
          onInterrupt={() => commit({ ...state, interrupted: true })}
          onPay={() => commit({ ...state, paid: true })}
          onReset={resetAll}
          onSwitchUser={switchTestUser}
          paid={state.paid}
          remainingDays={remainingDays}
          status={state.paid ? `月${MONTHLY_PRICE}円` : '無料体験中'}
        />
      ) : null}
    </main>
  )
}

function MessageBubble({ message }: { message: ThreadMessage }) {
  if (message.actor === 'system') {
    return (
      <div className="mx-auto max-w-[88%] text-center text-xs leading-6 text-zinc-500">
        {message.text}
      </div>
    )
  }

  const mine = message.actor === 'self'

  return (
    <article className={`grid max-w-[90%] gap-1 ${mine ? 'ml-auto justify-items-end' : 'mr-auto'}`}>
      <div className="px-2 text-xs text-zinc-500">{message.label}</div>
      <div
        className={`whitespace-pre-wrap rounded-3xl border bg-zinc-950 px-4 py-3 text-sm leading-7 text-zinc-50 sm:text-base ${
          mine ? 'border-white' : message.locked ? 'border-dashed border-zinc-800 text-zinc-500' : 'border-zinc-800'
        }`}
      >
        {message.text}
      </div>
      {message.createdAt ? <div className="px-2 text-xs text-zinc-600">{formatTime(message.createdAt)}</div> : null}
    </article>
  )
}

function SettingsSheet({
  currentUserId,
  onClose,
  onEnd,
  onInterrupt,
  onPay,
  onReset,
  onSwitchUser,
  paid,
  remainingDays,
  status,
}: {
  currentUserId: string
  onClose: () => void
  onEnd: () => void
  onInterrupt: () => void
  onPay: () => void
  onReset: () => void
  onSwitchUser: (testUserId: string) => void
  paid: boolean
  remainingDays: number
  status: string
}) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-end bg-black/70 px-3 py-3">
      <section className="max-h-[calc(100dvh-24px)] w-full max-w-[560px] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-medium">設定</h2>
          <button aria-label="閉じる" className="text-zinc-400" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <section className="space-y-2 text-sm text-zinc-400">
            <div className="flex justify-between gap-4">
              <span>現在</span>
              <strong className="font-medium text-white">{status}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>残り</span>
              <strong className="font-medium text-white">{remainingDays}日</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>体験後</span>
              <strong className="font-medium text-white">月{MONTHLY_PRICE}円</strong>
            </div>
            <p className="pt-2 text-xs leading-6 text-zinc-500">
              年額、上位プラン、使用量制限はありません。課金前に確認画面を表示します。
            </p>
          </section>

          <section className="space-y-2">
            <div className="text-xs text-zinc-500">テストユーザー</div>
            <div className="grid gap-2">
              {testUsers.map((user) => (
                <button
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
                    currentUserId === user.id
                      ? 'border-white text-white'
                      : 'border-zinc-800 text-zinc-400'
                  }`}
                  key={user.id}
                  onClick={() => onSwitchUser(user.id)}
                  type="button"
                >
                  <span>{user.label}</span>
                  {currentUserId === user.id ? <span className="text-xs text-zinc-500">使用中</span> : null}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            {!paid ? (
              <button className="h-10 rounded-full bg-white px-3 text-xs font-semibold text-black" onClick={onPay} type="button">
                続ける
              </button>
            ) : null}
            <button className="h-10 rounded-full border border-zinc-700 px-3 text-xs" onClick={onEnd} type="button">
              交換を終了
            </button>
            <button className="h-10 rounded-full border border-zinc-700 px-3 text-xs" onClick={onInterrupt} type="button">
              中断
            </button>
            <button className="h-10 rounded-full border border-zinc-700 px-3 text-xs" onClick={onReset} type="button">
              <span className="inline-flex items-center gap-2">
                <RotateCcw size={15} />
                リセット
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
