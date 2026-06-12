import { MoreHorizontal, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createCheckoutSession,
  fetchConfig,
  fetchSession,
  logoutRemote,
  postRemoteEntry,
  signInWithGoogle,
  startRemoteTrial,
} from './api'
import AlgorithmLab, { MatchingFlowPreview } from './AlgorithmLab'
import { BillingResultPage, LegalPage } from './LegalPages'
import type { RemoteSession } from './api'

const STORAGE_KEY = 'dear-human-state-v2'
const LEGACY_STORAGE_KEY = 'dear-human-state-v1'
const TRIAL_DAYS = 7
const MONTHLY_PRICE = 500
const BUILD_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''

type Actor = 'self' | 'partner' | 'system'
type Language = 'ja' | 'en'

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
  language: Language
  partnerCode: string
  testUserId: string
}

type TestUser = {
  id: string
  email: string
  label: Record<Language, string>
  prompt: Record<Language, string>
  partnerEntries: Record<Language, string[]>
}

type ThreadMessage = {
  id: string
  actor: Actor
  label?: string
  text: string
  createdAt?: string
  locked?: boolean
}

const copy = {
  ja: {
    appName: 'Dear Human',
    catchphrase: 'AIではなく人間と日記を交換しよう',
    serviceDescription:
      'Dear Humanは、7日間だけ、匿名の一人と日記を交換します。返信、評価、プロフィールはありません。',
    ageCheck: '18歳以上です。',
    safetyCheck: '医療、カウンセリング、危機対応ではないことを理解しました。',
    priceCheck:
      '7日間無料。その後は月500円。自動では課金されません。始めるのにクレジットカードは不要です。',
    signInHint: 'Googleでログインすると、実際の交換を始められます。',
    signedInAs: 'ログイン中',
    authRequired: '始めるにはGoogleログインが必要です。',
    startTrial: '7日間無料で始める',
    day: (day: number) => `${day}日目`,
    settings: '設定',
    close: '閉じる',
    systemIntro: '24時間に1回だけ投稿できます。自分が今日の日記を送ると、相手の日記を読めるようになります。',
    daySeven: `今日で7日目です。続ける場合は月${MONTHLY_PRICE}円です。`,
    posted: '投稿が終わりました。今日はもう投稿できません。',
    waitingTitle: '相手を待っています',
    waitingText: '今はプールに入りました。次の参加者が来ると、7日間の交換が始まります。',
    partnerPending: '相手の日記はまだ届いていません。',
    lockedPreview: '相手の日記は届いています。あなたが送ると読めます。',
    self: 'あなた',
    partner: '相手',
    locked: 'あなたが送ると読めます',
    todayDiary: '今日の日記',
    composerHint: '24時間に1回。送ると相手の日記を読めます',
    send: '送る',
    trialEnded: '7日間の無料体験が終わりました。',
    interrupted: 'この交換は中断されました。',
    finished: '1週間の交換は終了しました。',
    continueHelp: `続ける場合は月${MONTHLY_PRICE}円です。プランは1つだけです。`,
    deleteData: 'データを消す',
    current: '現在',
    remaining: '残り',
    afterTrial: '体験後',
    trialing: '無料体験中',
    paidStatus: `月${MONTHLY_PRICE}円`,
    price: `月${MONTHLY_PRICE}円`,
    billingNote: '年額、上位プラン、使用量制限はありません。課金前に確認画面を表示します。',
    billingError: '決済画面を開けませんでした。時間を置いてもう一度試してください。',
    testUsers: 'テストユーザー',
    active: '使用中',
    continue: '続ける',
    finishExchange: '交換を終了',
    interrupt: '中断',
    reset: 'リセット',
    logout: 'ログアウト',
    language: '言語',
    japanese: '日本語',
    english: 'English',
  },
  en: {
    appName: 'Dear Human',
    catchphrase: 'Exchange diaries with a human, not AI',
    serviceDescription:
      'Dear Human lets you exchange diaries with one anonymous person for 7 days. There are no replies, ratings, or profiles.',
    ageCheck: 'I am 18 or older.',
    safetyCheck: 'I understand this is not medical care, counseling, or crisis support.',
    priceCheck:
      '7 days free, then ¥500/month. You will not be charged automatically. No credit card is needed to start.',
    signInHint: 'Sign in with Google to start a real exchange.',
    signedInAs: 'Signed in',
    authRequired: 'Sign in with Google to start.',
    startTrial: 'Start 7 days free',
    day: (day: number) => `Day ${day}`,
    settings: 'Settings',
    close: 'Close',
    systemIntro: 'You can post once every 24 hours. After you send today’s diary, you can read your partner’s diary.',
    daySeven: `Today is day 7. Continuing costs ¥${MONTHLY_PRICE}/month.`,
    posted: 'Your diary has been posted. You cannot post again today.',
    waitingTitle: 'Waiting for a partner',
    waitingText: 'You are in the pool. When the next person joins, your 7-day exchange starts.',
    partnerPending: 'Your partner has not posted today yet.',
    lockedPreview: 'Your partner posted today. Send yours to read it.',
    self: 'You',
    partner: 'Partner',
    locked: 'Send yours to read this',
    todayDiary: 'Today’s diary',
    composerHint: 'Once every 24 hours. Send yours to read your partner’s diary.',
    send: 'Send',
    trialEnded: 'Your 7-day free trial has ended.',
    interrupted: 'This exchange has been interrupted.',
    finished: 'The 1-week exchange has ended.',
    continueHelp: `Continuing costs ¥${MONTHLY_PRICE}/month. There is only one plan.`,
    deleteData: 'Delete data',
    current: 'Current',
    remaining: 'Remaining',
    afterTrial: 'After trial',
    trialing: 'Free trial',
    paidStatus: `¥${MONTHLY_PRICE}/month`,
    price: `¥${MONTHLY_PRICE}/month`,
    billingNote: 'There is no annual plan, premium tier, or usage limit. A confirmation screen appears before payment.',
    billingError: 'Could not open checkout. Please try again later.',
    testUsers: 'Test users',
    active: 'Active',
    continue: 'Continue',
    finishExchange: 'End exchange',
    interrupt: 'Interrupt',
    reset: 'Reset',
    logout: 'Log out',
    language: 'Language',
    japanese: '日本語',
    english: 'English',
  },
} satisfies Record<Language, Record<string, string | ((value: number) => string)>>

const testUsers: TestUser[] = [
  {
    id: 'night-writer',
    email: 'night@example.com',
    label: {
      ja: '夜にAIへ貼る人',
      en: 'Night AI diarist',
    },
    prompt: {
      ja: '今日ここに置いていくこと',
      en: 'What you want to leave here today',
    },
    partnerEntries: {
      ja: [
        '今日は、誰かに言うほどではないことばかりが積もった日だった。\n\n帰り道で買った温かい飲み物が、手の中で少しだけ心強かった。明日になれば忘れるかもしれないけれど、今日はここに置いていく。',
        '眠る前に、何も解決していないことを数えそうになった。\n\nでも、数えるのをやめて洗濯物を畳んだ。畳んだぶんだけ、部屋の空気が少し静かになった。',
      ],
      en: [
        'Today was full of things too small to tell anyone.\n\nThe warm drink I bought on the way home felt a little steady in my hands. I might forget it by morning, but I am leaving it here tonight.',
        'Before sleep, I almost started counting everything that was still unresolved.\n\nInstead, I folded the laundry. The room became a little quieter by exactly that much.',
      ],
    },
  },
  {
    id: 'quiet-office',
    email: 'office@example.com',
    label: {
      ja: '普通に働いた人',
      en: 'Quiet office day',
    },
    prompt: {
      ja: '誰にも送らない今日のこと',
      en: 'Something from today you will not send anywhere else',
    },
    partnerEntries: {
      ja: [
        '昼間は普通にしていた。普通にできたぶん、夜に疲れが来た。\n\n大きなことは起きていない。ただ、大きなことが起きていない日にも重さはある。',
        '駅のホームで、知らない人たちがそれぞれの家に帰っていくのを見た。\n\n自分もその中の一人なのに、少し外側にいるような気がした。',
      ],
      en: [
        'I looked normal during the day. Maybe because I managed that, the tiredness arrived at night.\n\nNothing big happened. Still, days without big events can be heavy too.',
        'On the station platform, I watched strangers going home to their own places.\n\nI was one of them, but I felt slightly outside of it.',
      ],
    },
  },
  {
    id: 'almost-asleep',
    email: 'sleep@example.com',
    label: {
      ja: '眠る前だけ書く人',
      en: 'Before sleep only',
    },
    prompt: {
      ja: '眠る前に残すこと',
      en: 'What remains before sleep',
    },
    partnerEntries: {
      ja: [
        '今日の自分は、あまり上手に生きていなかった。\n\nでも、ここに一度書けたので、これ以上うまく説明しなくてもいいことにする。',
        '朝になれば、今の気分を大げさだったと思うかもしれない。\n\nそれでも夜の自分には夜の本当がある。今日はそれだけを残す。',
      ],
      en: [
        'I did not live particularly well today.\n\nBut I wrote it here once, so I will stop trying to explain it better than that.',
        'In the morning I may think tonight was too dramatic.\n\nStill, the night version of me has its own truth. I am leaving only that here.',
      ],
    },
  },
]

function generatePartnerCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = new Uint8Array(5)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values)
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

function createInitialState(language: Language = 'ja'): AppState {
  return {
    accepted: false,
    email: '',
    trialStartedAt: null,
    paid: false,
    ended: false,
    interrupted: false,
    entries: {},
    language,
    partnerCode: generatePartnerCode(),
    testUserId: testUsers[0].id,
  }
}

function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return createInitialState()

    const parsed = JSON.parse(raw) as Partial<AppState>
    const language: Language = parsed.language === 'en' ? 'en' : 'ja'

    return {
      ...createInitialState(language),
      ...parsed,
      language,
      partnerCode: parsed.partnerCode ?? generatePartnerCode(),
      testUserId: parsed.testUserId ?? testUsers[0].id,
    }
  } catch {
    return createInitialState()
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

function daysUntil(value: string | null) {
  if (!value) return TRIAL_DAYS
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000))
}

function formatTime(value: string | undefined, language: Language) {
  if (!value) return ''
  return new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), {
      once: true,
    })
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

function mergeRemoteState(current: AppState, next: RemoteSession): AppState | null {
  if (!next.user || (!next.waiting && !next.exchange)) return null

  return {
    ...current,
    accepted: true,
    email: next.user.email,
    trialStartedAt: next.user.trialStartedAt ?? next.exchange?.startedAt ?? current.trialStartedAt ?? new Date().toISOString(),
    partnerCode: next.exchange?.partnerCode ?? current.partnerCode,
    paid: next.user.subscriptionStatus === 'active',
  }
}

function App() {
  const pathname = window.location.pathname

  if (pathname === '/algorithm') {
    return <AlgorithmLab />
  }

  if (pathname === '/legal/tokushoho') {
    return <LegalPage kind="tokushoho" />
  }

  if (pathname === '/legal/privacy') {
    return <LegalPage kind="privacy" />
  }

  if (pathname === '/legal/terms') {
    return <LegalPage kind="terms" />
  }

  if (pathname === '/billing/success') {
    return <BillingResultPage kind="success" />
  }

  if (pathname === '/billing/cancel') {
    return <BillingResultPage kind="cancel" />
  }

  return <DiaryApp />
}

function DiaryApp() {
  const [state, setState] = useState<AppState>(loadState)
  const [draft, setDraft] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [googleClientId, setGoogleClientId] = useState(BUILD_GOOGLE_CLIENT_ID)
  const [configLoaded, setConfigLoaded] = useState(Boolean(BUILD_GOOGLE_CLIENT_ID))
  const [remoteSession, setRemoteSession] = useState<RemoteSession | null>(null)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const [billingLoading, setBillingLoading] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)

  const backendEnabled = Boolean(googleClientId)
  const language = state.language
  const t = copy[language]
  const selectedUser = testUsers.find((user) => user.id === state.testUserId) ?? testUsers[0]
  const key = todayKey()
  const remoteExchange = backendEnabled ? remoteSession?.exchange ?? null : null
  const remoteWaiting = backendEnabled && Boolean(remoteSession?.waiting && !remoteExchange)
  const remoteOwnEntry = remoteExchange?.ownEntry
    ? { text: remoteExchange.ownEntry.body ?? '', createdAt: remoteExchange.ownEntry.created_at }
    : null
  const todayEntry = remoteOwnEntry ?? state.entries[key]
  const elapsedDays = daysSinceStart(remoteExchange?.startedAt ?? state.trialStartedAt)
  const currentDay = remoteExchange?.dayIndex ?? Math.min(TRIAL_DAYS, elapsedDays + 1)
  const trialEndsAt = remoteSession?.user?.trialEndsAt ?? remoteExchange?.endsAt ?? null
  const remainingDays = remoteWaiting ? TRIAL_DAYS : trialEndsAt ? daysUntil(trialEndsAt) : Math.max(0, TRIAL_DAYS - elapsedDays)
  const remoteTrialEnded = backendEnabled && remoteSession?.user?.subscriptionStatus === 'trial_ended'
  const expired = state.accepted && !remoteWaiting && !state.paid && (remoteTrialEnded || remainingDays <= 0)
  const partnerLabel = `${t.partner} ${remoteExchange?.partnerCode ?? state.partnerCode}`
  const partnerEntries = selectedUser.partnerEntries[language]

  const applyRemoteSession = useCallback((next: RemoteSession) => {
    setRemoteSession(next)
    setState((current) => {
      const merged = mergeRemoteState(current, next)
      if (!merged) return current
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      return merged
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchConfig()
      .then((config) => {
        if (!cancelled && config.googleClientId) setGoogleClientId(config.googleClientId)
      })
      .catch(() => {
        // Runtime config is unavailable in pure static/local test mode.
      })
      .finally(() => {
        if (!cancelled) setConfigLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!configLoaded || !backendEnabled) return

    let cancelled = false
    fetchSession()
      .then((next) => {
        if (cancelled) return
        applyRemoteSession(next)
      })
      .catch((error: unknown) => {
        if (!cancelled) setRemoteError(error instanceof Error ? error.message : 'Failed to load session')
      })
      .finally(() => {
        if (!cancelled) setRemoteLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [applyRemoteSession, backendEnabled, configLoaded])

  useEffect(() => {
    if (!backendEnabled || remoteSession?.authenticated || !googleButtonRef.current) return

    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          use_fedcm_for_prompt: true,
          callback: (response) => {
            if (!response.credential) return

            setRemoteLoading(true)
            setRemoteError('')
            signInWithGoogle(response.credential)
              .then((next) => applyRemoteSession(next))
              .catch((error: unknown) => {
                setRemoteError(error instanceof Error ? error.message : 'Failed to sign in')
              })
              .finally(() => setRemoteLoading(false))
          },
        })

        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 260,
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) setRemoteError(error instanceof Error ? error.message : 'Failed to load Google sign-in')
      })

    return () => {
      cancelled = true
    }
  }, [applyRemoteSession, backendEnabled, googleClientId, remoteSession?.authenticated])

  const messages = useMemo<ThreadMessage[]>(() => {
    const items: ThreadMessage[] = [
      {
        id: 'system-intro',
        actor: 'system',
        text: t.systemIntro,
      },
    ]

    if (remoteWaiting) {
      items.push({
        id: 'system-waiting',
        actor: 'system',
        text: t.waitingText,
      })
      return items
    }

    if (currentDay >= TRIAL_DAYS) {
      items.push({
        id: 'system-day-seven',
        actor: 'system',
        text: t.daySeven,
      })
    }

    if (remoteExchange && !todayEntry) {
      if (remoteExchange.partnerEntry) {
        items.push({
          id: 'partner-locked',
          actor: 'partner',
          label: partnerLabel,
          text: t.lockedPreview,
          locked: true,
        })
      } else {
        items.push({
          id: 'system-partner-pending',
          actor: 'system',
          text: t.partnerPending,
        })
      }
      return items
    }

    if (!todayEntry) {
      items.push({
        id: 'partner-locked',
        actor: 'partner',
        label: partnerLabel,
        text: partnerEntries[(currentDay - 1) % partnerEntries.length],
        locked: true,
      })
      return items
    }

    items.push({
      id: 'system-posted',
      actor: 'system',
      text: t.posted,
    })

    items.push({
      id: 'self-today',
      actor: 'self',
      label: t.self,
      text: todayEntry.text,
      createdAt: todayEntry.createdAt,
    })

    items.push({
      id: 'partner-today',
      actor: 'partner',
      label: partnerLabel,
      text: remoteExchange?.partnerEntry?.body ?? partnerEntries[(currentDay - 1) % partnerEntries.length],
    })

    if (remoteExchange && !remoteExchange.partnerEntry?.body) {
      items.pop()
      items.push({
        id: 'system-partner-pending',
        actor: 'system',
        text: t.partnerPending,
      })
    }

    return items
  }, [currentDay, partnerEntries, partnerLabel, remoteExchange, remoteWaiting, t, todayEntry])

  function commit(next: AppState) {
    setState(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function setLanguage(language: Language) {
    commit({ ...state, language })
  }

  async function startTrial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (form.get('age') !== 'on' || form.get('safety') !== 'on' || form.get('price') !== 'on') {
      return
    }

    if (backendEnabled) {
      if (!remoteSession?.authenticated) {
        setRemoteError(t.authRequired)
        return
      }

      setRemoteLoading(true)
      setRemoteError('')
      try {
        const next = await startRemoteTrial({ age: true, safety: true, price: true })
        applyRemoteSession(next)
      } catch (error) {
        setRemoteError(error instanceof Error ? error.message : 'Failed to start trial')
      } finally {
        setRemoteLoading(false)
      }
      return
    }

    commit({
      ...state,
      accepted: true,
      email: selectedUser.email,
      partnerCode: state.partnerCode || generatePartnerCode(),
      trialStartedAt: new Date().toISOString(),
    })
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (text.length < 20 || todayEntry) return

    if (backendEnabled && remoteExchange) {
      setRemoteError('')
      try {
        const next = await postRemoteEntry(text)
        applyRemoteSession(next)
        setDraft('')
      } catch (error) {
        setRemoteError(error instanceof Error ? error.message : 'Failed to post diary')
      }
      return
    }

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

  async function openCheckout() {
    if (!backendEnabled) {
      commit({ ...state, paid: true })
      return
    }

    setBillingLoading(true)
    setRemoteError('')
    try {
      const session = await createCheckoutSession()
      window.location.assign(session.url)
    } catch {
      setRemoteError(t.billingError)
      setBillingLoading(false)
    }
  }

  async function logout() {
    if (backendEnabled) {
      await logoutRemote()
      setRemoteSession({ authenticated: false, user: null, waiting: false, exchange: null })
    }
    resetAll()
  }

  function switchTestUser(testUserId: string) {
    const nextUser = testUsers.find((user) => user.id === testUserId)
    commit({
      ...createInitialState(language),
      accepted: true,
      email: nextUser?.email ?? selectedUser.email,
      language,
      partnerCode: generatePartnerCode(),
      testUserId,
      trialStartedAt: new Date().toISOString(),
    })
    setDraft('')
  }

  function resetAll() {
    const next = createInitialState(language)
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    setState(next)
    setDraft('')
    setSettingsOpen(false)
  }

  if (!state.accepted) {
    return (
      <main className="grid min-h-dvh justify-items-center bg-black px-5 pb-8 pt-[calc(env(safe-area-inset-top)+80px)] text-white">
        <section className="w-full max-w-[560px] space-y-7">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-11 w-11 border border-white bg-[repeating-linear-gradient(180deg,transparent_0_10px,rgba(255,255,255,.25)_11px,transparent_12px)]" />
              <LanguageSwitch language={language} onChange={setLanguage} />
            </div>
            <h1 className="font-serif text-[clamp(1.8rem,8vw,2.8rem)] leading-[1.35]">
              {t.catchphrase}
            </h1>
            <p className="max-w-[48ch] text-sm leading-7 text-zinc-400">
              {t.serviceDescription}
            </p>
            <MatchingFlowPreview compact language={language} />
            {backendEnabled ? (
              <div className="grid gap-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
                {remoteSession?.authenticated && remoteSession.user ? (
                  <div className="text-sm text-zinc-300">
                    {t.signedInAs}: {remoteSession.user.email}
                  </div>
                ) : (
                  <>
                    <div ref={googleButtonRef} />
                    <p className="text-xs leading-6 text-zinc-500">{t.signInHint}</p>
                  </>
                )}
                {remoteLoading ? <div className="text-xs text-zinc-500">Loading...</div> : null}
                {remoteError ? <div className="text-xs leading-6 text-zinc-300">{remoteError}</div> : null}
              </div>
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={startTrial}>
            <div className="grid gap-3 text-sm text-zinc-400">
              <label className="grid grid-cols-[20px_1fr] gap-3">
                <input className="mt-1 accent-white" name="age" type="checkbox" />
                <span>{t.ageCheck}</span>
              </label>
              <label className="grid grid-cols-[20px_1fr] gap-3">
                <input className="mt-1 accent-white" name="safety" type="checkbox" />
                <span>{t.safetyCheck}</span>
              </label>
              <label className="grid grid-cols-[20px_1fr] gap-3">
                <input className="mt-1 accent-white" name="price" type="checkbox" />
                <span>{t.priceCheck}</span>
              </label>
            </div>

            <button
              className="h-12 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:bg-zinc-800 disabled:text-zinc-500"
              disabled={backendEnabled && (!remoteSession?.authenticated || remoteLoading)}
              type="submit"
            >
              {t.startTrial}
            </button>
          </form>
          <LegalLinks />
        </section>
      </main>
    )
  }

  if (state.ended || state.interrupted || expired) {
    const title = expired ? t.trialEnded : state.interrupted ? t.interrupted : t.finished

    return (
      <main className="grid min-h-dvh place-items-center bg-black px-5 text-white">
        <section className="w-full max-w-[520px] space-y-5">
          <h1 className="font-serif text-3xl leading-tight">{title}</h1>
          <p className="text-sm leading-7 text-zinc-400">{t.continueHelp}</p>
          <div className="flex flex-wrap gap-2">
            {expired ? (
              <button
                className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-black"
                disabled={billingLoading}
                onClick={() => void openCheckout()}
                type="button"
              >
                {t.continue}
              </button>
            ) : null}
            <button
              className="h-11 rounded-full border border-white px-5 text-sm"
              onClick={resetAll}
              type="button"
            >
              {t.deleteData}
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (remoteWaiting && state.accepted) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black px-5 text-white">
        <section className="w-full max-w-[520px] space-y-5">
          <h1 className="font-serif text-3xl leading-tight">{t.waitingTitle}</h1>
          <p className="text-sm leading-7 text-zinc-400">{t.waitingText}</p>
          {remoteSession?.user ? (
            <p className="text-xs text-zinc-600">
              {t.signedInAs}: {remoteSession.user.email}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="h-11 rounded-full border border-white px-5 text-sm"
              onClick={() => void logout()}
              type="button"
            >
              {t.logout}
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
            <h1 className="font-serif text-lg leading-tight">{t.appName}</h1>
            <p className="text-xs text-zinc-500">{(t.day as (value: number) => string)(currentDay)}</p>
          </div>
          <button
            aria-label={t.settings}
            className="grid h-10 w-10 place-items-center rounded-full border border-zinc-800 text-zinc-400"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <MoreHorizontal size={18} />
          </button>
        </header>

        <div className={`min-h-0 space-y-4 overflow-y-auto px-3 py-5 sm:px-5 ${todayEntry ? '' : 'pb-64 sm:pb-72'}`}>
          {messages.map((message) => (
            <MessageBubble key={message.id} language={language} message={message} />
          ))}
        </div>

        {todayEntry ? null : (
          <form
            className="grid gap-3 border-t border-zinc-900 bg-black px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:px-5"
            onSubmit={submitEntry}
          >
            {remoteError ? <div className="px-1 text-xs leading-6 text-zinc-400">{remoteError}</div> : null}
            <div className="grid gap-2 rounded-3xl border border-zinc-800 bg-zinc-950 p-3 focus-within:border-white">
              <label className="px-1 text-xs text-zinc-500" htmlFor="today-diary">
                {t.todayDiary}
              </label>
              <textarea
                aria-label={t.todayDiary}
                className="min-h-[168px] w-full resize-y bg-transparent px-1 text-sm leading-7 text-zinc-50 outline-none placeholder:text-zinc-600 sm:min-h-[220px] sm:text-base"
                id="today-diary"
                onChange={(event) => setDraft(event.target.value)}
                placeholder={selectedUser.prompt[language]}
                value={draft}
              />
              <div className="grid gap-1 px-1 text-xs text-zinc-600 sm:flex sm:items-center sm:justify-between sm:gap-3">
                <span>{t.composerHint}</span>
              </div>
            </div>
            <button
              className="h-12 rounded-full bg-white px-5 text-sm font-semibold text-black disabled:bg-zinc-800 disabled:text-zinc-500"
              disabled={draft.trim().length < 20}
              type="submit"
            >
              {t.send}
            </button>
          </form>
        )}
      </section>

      {settingsOpen ? (
        <SettingsSheet
          currentUserId={state.testUserId}
          accountEmail={remoteSession?.user?.email ?? null}
          billingLoading={billingLoading}
          language={language}
          onClose={() => setSettingsOpen(false)}
          onEnd={() => commit({ ...state, ended: true })}
          onInterrupt={() => commit({ ...state, interrupted: true })}
          onLanguageChange={setLanguage}
          onLogout={logout}
          onPay={openCheckout}
          onReset={resetAll}
          onSwitchUser={switchTestUser}
          paid={state.paid}
          remainingDays={remainingDays}
          showTestUsers={!backendEnabled}
          status={state.paid ? t.paidStatus : t.trialing}
          t={t}
        />
      ) : null}
    </main>
  )
}

function LegalLinks() {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600" aria-label="法務リンク">
      <a className="transition-colors hover:text-zinc-300" href="/legal/terms">
        利用規約
      </a>
      <a className="transition-colors hover:text-zinc-300" href="/legal/privacy">
        プライバシーポリシー
      </a>
      <a className="transition-colors hover:text-zinc-300" href="/legal/tokushoho">
        特定商取引法に基づく表記
      </a>
    </nav>
  )
}

function LanguageSwitch({
  language,
  onChange,
}: {
  language: Language
  onChange: (language: Language) => void
}) {
  return (
    <div className="inline-grid grid-cols-2 rounded-full border border-zinc-800 p-1 text-xs">
      {(['ja', 'en'] as const).map((option) => (
        <button
          className={`rounded-full px-3 py-1.5 ${language === option ? 'bg-white text-black' : 'text-zinc-500'}`}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option === 'ja' ? '日本語' : 'English'}
        </button>
      ))}
    </div>
  )
}

function MessageBubble({ language, message }: { language: Language; message: ThreadMessage }) {
  if (message.actor === 'system') {
    return (
      <div className="mx-auto max-w-[88%] text-center text-xs leading-6 text-zinc-500">
        {message.text}
      </div>
    )
  }

  const mine = message.actor === 'self'

  if (message.locked) {
    return (
      <article className="mr-auto grid max-w-[90%] gap-1">
        <div className="px-2 text-xs text-zinc-500">{message.label}</div>
        <div className="relative h-36 overflow-hidden rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-4 py-3 sm:h-44">
          <div aria-hidden="true" className="pointer-events-none select-none whitespace-pre-wrap break-words text-sm leading-7 text-zinc-400 blur-[5px] sm:text-base">
            {message.text}
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
          <div className="absolute inset-0 grid place-items-center bg-black/58 px-4 text-center text-xs leading-6 text-zinc-300">
            {copy[language].locked}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className={`grid max-w-[90%] gap-1 ${mine ? 'ml-auto justify-items-end' : 'mr-auto'}`}>
      <div className="px-2 text-xs text-zinc-500">{message.label}</div>
      <div
        className={`whitespace-pre-wrap rounded-3xl border bg-zinc-950 px-4 py-3 text-sm leading-7 text-zinc-50 sm:text-base ${
          mine ? 'border-white' : 'border-zinc-800'
        }`}
      >
        {message.text}
      </div>
      {message.createdAt ? <div className="px-2 text-xs text-zinc-600">{formatTime(message.createdAt, language)}</div> : null}
    </article>
  )
}

function SettingsSheet({
  accountEmail,
  billingLoading,
  currentUserId,
  language,
  onClose,
  onEnd,
  onInterrupt,
  onLanguageChange,
  onLogout,
  onPay,
  onReset,
  onSwitchUser,
  paid,
  remainingDays,
  showTestUsers,
  status,
  t,
}: {
  accountEmail: string | null
  billingLoading: boolean
  currentUserId: string
  language: Language
  onClose: () => void
  onEnd: () => void
  onInterrupt: () => void
  onLanguageChange: (language: Language) => void
  onLogout: () => void | Promise<void>
  onPay: () => void | Promise<void>
  onReset: () => void
  onSwitchUser: (testUserId: string) => void
  paid: boolean
  remainingDays: number
  showTestUsers: boolean
  status: string
  t: typeof copy[Language]
}) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-end bg-black/70 px-3 py-3">
      <section className="max-h-[calc(100dvh-24px)] w-full max-w-[560px] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-medium">{t.settings}</h2>
          <button aria-label={t.close} className="text-zinc-400" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <section className="space-y-2 text-sm text-zinc-400">
            <div className="flex justify-between gap-4">
              <span>{t.current}</span>
              <strong className="font-medium text-white">{status}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t.remaining}</span>
              <strong className="font-medium text-white">{remainingDays}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t.afterTrial}</span>
              <strong className="font-medium text-white">{t.price}</strong>
            </div>
            <p className="pt-2 text-xs leading-6 text-zinc-500">
              {t.billingNote}
            </p>
            {accountEmail ? (
              <p className="pt-1 text-xs leading-6 text-zinc-500">
                {t.signedInAs}: {accountEmail}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <div className="text-xs text-zinc-500">{t.language}</div>
            <LanguageSwitch language={language} onChange={onLanguageChange} />
          </section>

          {showTestUsers ? (
            <section className="space-y-2">
              <div className="text-xs text-zinc-500">{t.testUsers}</div>
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
                    <span>{user.label[language]}</span>
                    {currentUserId === user.id ? <span className="text-xs text-zinc-500">{t.active}</span> : null}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {!paid ? (
              <button
                className="h-10 rounded-full bg-white px-3 text-xs font-semibold text-black disabled:bg-zinc-800 disabled:text-zinc-500"
                disabled={billingLoading}
                onClick={() => void onPay()}
                type="button"
              >
                {t.continue}
              </button>
            ) : null}
            <button className="h-10 rounded-full border border-zinc-700 px-3 text-xs" onClick={onEnd} type="button">
              {t.finishExchange}
            </button>
            <button className="h-10 rounded-full border border-zinc-700 px-3 text-xs" onClick={onInterrupt} type="button">
              {t.interrupt}
            </button>
            {accountEmail ? (
              <button className="h-10 rounded-full border border-zinc-700 px-3 text-xs" onClick={() => void onLogout()} type="button">
                {t.logout}
              </button>
            ) : null}
            <button className="h-10 rounded-full border border-zinc-700 px-3 text-xs" onClick={onReset} type="button">
              <span className="inline-flex items-center gap-2">
                <RotateCcw size={15} />
                {t.reset}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
