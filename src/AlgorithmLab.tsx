import { ArrowLeft, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type TokenKey = 'a' | 'b' | 'c'
type FlowLanguage = 'ja' | 'en'
type LocalizedText = Record<FlowLanguage, string>

type TokenPosition = {
  x: number
  y: number
  opacity: number
}

type FlowStep = {
  id: string
  index: number
  title: LocalizedText
  detail: LocalizedText
  note: LocalizedText
  pool: LocalizedText
  pair: LocalizedText
  next: LocalizedText
  day: number
  focus: 'pool' | 'match' | 'diary' | 'close' | 'rematch'
  positions: Record<TokenKey, TokenPosition>
}

const flowCopy = {
  ja: {
    title: '7日間の流れ',
    subtitle: '始める、出会う、書く、終わる。次も同じ流れです。',
    step: 'Step',
    day: '日目',
    noDay: '-',
    play: '再生',
    pause: '一時停止',
    next: '次へ',
    reset: 'リセット',
    waiting: '待っている人',
    exchange: '交換相手',
    nextState: '次のこと',
    poolLane: '待っている人',
    exchangeLane: '日記の交換',
    closeLane: '7日の終わり',
    sevenDays: '7日間',
    matchStarts: 'ここから7日間',
    youPost: '自分が投稿',
    canRead: '相手の日記を読める',
  },
  en: {
    title: 'How the 7 days work',
    subtitle: 'Start, meet, write, finish. The next exchange follows the same path.',
    step: 'Step',
    day: 'Day',
    noDay: '-',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    reset: 'Reset',
    waiting: 'Waiting',
    exchange: 'Exchange',
    nextState: 'Next',
    poolLane: 'Waiting',
    exchangeLane: 'Diary exchange',
    closeLane: 'After 7 days',
    sevenDays: '7 days',
    matchStarts: '7 days start',
    youPost: 'You write',
    canRead: 'Then you can read',
  },
} satisfies Record<FlowLanguage, Record<string, string>>

const flowSteps: FlowStep[] = [
  {
    id: 'empty-pool',
    index: 0,
    title: {
      ja: 'まだ待っている人がいない',
      en: 'No one is waiting yet',
    },
    detail: {
      ja: 'まだ誰も待っていない状態です。相手は言語で分けず、同じ場所で待ちます。',
      en: 'At first, no one is waiting. People wait in one shared place, not in separate language groups.',
    },
    note: {
      ja: '誰かが来るまで待つ',
      en: 'Wait until someone joins',
    },
    pool: { ja: '0人', en: '0 people' },
    pair: { ja: 'まだなし', en: 'None yet' },
    next: { ja: '最初の人を待つ', en: 'Wait for the first person' },
    day: 0,
    focus: 'pool',
    positions: {
      a: { x: 70, y: 332, opacity: 0 },
      b: { x: 70, y: 382, opacity: 0 },
      c: { x: 70, y: 382, opacity: 0 },
    },
  },
  {
    id: 'first-waits',
    index: 1,
    title: {
      ja: '最初の人が待つ',
      en: 'The first person waits',
    },
    detail: {
      ja: '最初に始めた人は、次の参加者が来るまで待ちます。7日間はまだ始まりません。',
      en: 'The first person waits until someone else arrives. The 7 days have not started yet.',
    },
    note: {
      ja: 'まだ相手は決まらない',
      en: 'No partner yet',
    },
    pool: { ja: 'A', en: 'A' },
    pair: { ja: 'まだなし', en: 'None yet' },
    next: { ja: '次の人が来たら開始', en: 'Start when the next person joins' },
    day: 0,
    focus: 'pool',
    positions: {
      a: { x: 132, y: 150, opacity: 1 },
      b: { x: 76, y: 330, opacity: 0 },
      c: { x: 76, y: 378, opacity: 0 },
    },
  },
  {
    id: 'instant-match',
    index: 2,
    title: {
      ja: '次の人が来たら始まる',
      en: 'The next person starts the exchange',
    },
    detail: {
      ja: '次に来た人と、待っていた人をつなぎます。この瞬間から7日間が始まります。',
      en: 'The next person is connected with the person who was waiting. The 7 days start from that moment.',
    },
    note: {
      ja: 'ここから7日間',
      en: '7 days start here',
    },
    pool: { ja: '0人', en: '0 people' },
    pair: { ja: 'A と B', en: 'A and B' },
    next: { ja: '今日から7日間', en: '7 days from today' },
    day: 1,
    focus: 'match',
    positions: {
      a: { x: 410, y: 132, opacity: 1 },
      b: { x: 510, y: 132, opacity: 1 },
      c: { x: 72, y: 378, opacity: 0 },
    },
  },
  {
    id: 'seven-days',
    index: 3,
    title: {
      ja: '7日間、同じ相手と書く',
      en: 'Write with the same person for 7 days',
    },
    detail: {
      ja: '毎日1回だけ日記を書けます。自分が書くと、その日の相手の日記を読めます。',
      en: 'You can write once a day. After you write, you can read your partner’s diary for that day.',
    },
    note: {
      ja: '1日1回、書いたら読める',
      en: 'Write once, then read',
    },
    pool: { ja: '新しく来た人だけ', en: 'New people only' },
    pair: { ja: 'A と B', en: 'A and B' },
    next: { ja: '7日目まで同じ相手', en: 'Same partner until day 7' },
    day: 5,
    focus: 'diary',
    positions: {
      a: { x: 410, y: 132, opacity: 1 },
      b: { x: 510, y: 132, opacity: 1 },
      c: { x: 92, y: 230, opacity: 0 },
    },
  },
  {
    id: 'close-pair',
    index: 4,
    title: {
      ja: '7日が終わる',
      en: 'The 7 days end',
    },
    detail: {
      ja: '7日が過ぎると、その相手との交換は終わります。新しい投稿はできません。',
      en: 'After 7 days, that exchange ends. You can keep the memory, but you cannot add new posts to it.',
    },
    note: {
      ja: 'この交換を閉じる',
      en: 'Close this exchange',
    },
    pool: { ja: '人がいれば待機', en: 'Others may be waiting' },
    pair: { ja: '交換終了', en: 'Finished' },
    next: { ja: '続ける人はもう一度待つ', en: 'Continuing means waiting again' },
    day: 7,
    focus: 'close',
    positions: {
      a: { x: 690, y: 132, opacity: 1 },
      b: { x: 790, y: 132, opacity: 1 },
      c: { x: 86, y: 342, opacity: 0 },
    },
  },
  {
    id: 'return-to-pool',
    index: 5,
    title: {
      ja: '続ける人は、次の相手を待つ',
      en: 'If you continue, you wait again',
    },
    detail: {
      ja: '続ける人だけ、次の相手を待ちます。同じ人が続かないようにします。',
      en: 'Only people who continue wait for another partner. The same partner is not repeated right away.',
    },
    note: {
      ja: 'もう一度、待つ',
      en: 'Wait again',
    },
    pool: { ja: 'A', en: 'A' },
    pair: { ja: 'Bとは終了', en: 'Finished with B' },
    next: { ja: '新しい人を待つ', en: 'Wait for someone new' },
    day: 0,
    focus: 'rematch',
    positions: {
      a: { x: 132, y: 150, opacity: 1 },
      b: { x: 790, y: 230, opacity: 0.38 },
      c: { x: 76, y: 342, opacity: 0 },
    },
  },
  {
    id: 'next-match',
    index: 6,
    title: {
      ja: '新しい相手と、また7日間',
      en: 'A new 7 days begin',
    },
    detail: {
      ja: '次の人が来ると、新しい相手としてつながります。また7日間だけ交換します。',
      en: 'When the next person arrives, a new exchange begins. It lasts for 7 days again.',
    },
    note: {
      ja: '新しい相手と始める',
      en: 'Start with someone new',
    },
    pool: { ja: '0人', en: '0 people' },
    pair: { ja: 'A と C', en: 'A and C' },
    next: { ja: 'また7日間', en: 'Another 7 days' },
    day: 1,
    focus: 'match',
    positions: {
      a: { x: 410, y: 132, opacity: 1 },
      b: { x: 790, y: 230, opacity: 0 },
      c: { x: 510, y: 132, opacity: 1 },
    },
  },
]

const tokens: Record<TokenKey, { label: string }> = {
  a: { label: 'A' },
  b: { label: 'B' },
  c: { label: 'C' },
}

function nextStep(current: number) {
  return current >= flowSteps.length - 1 ? 0 : current + 1
}

function AlgorithmLab() {
  return (
    <main className="min-h-dvh bg-black px-4 py-5 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
        <header className="border-b border-zinc-900 pb-5">
          <div className="space-y-3">
            <a
              className="inline-flex items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
              href="/"
            >
              <ArrowLeft size={15} />
              Dear Human
            </a>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Algorithm Lab</p>
              <h1 className="font-serif text-[clamp(2rem,7vw,4.8rem)] leading-[1.05]">
                マッチング検証
              </h1>
              <p className="max-w-[66ch] text-sm leading-7 text-zinc-400">
                参加して、相手が決まり、7日間だけ日記を交換し、次の相手を待つまでの流れです。
              </p>
            </div>
          </div>
        </header>

        <MatchingFlowPreview showControls />
      </div>
    </main>
  )
}

export function MatchingFlowPreview({
  compact = false,
  language = 'ja',
  showControls = false,
}: {
  compact?: boolean
  language?: FlowLanguage
  showControls?: boolean
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const step = flowSteps[stepIndex]
  const progress = useMemo(() => ((stepIndex + 1) / flowSteps.length) * 100, [stepIndex])
  const c = flowCopy[language]

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setStepIndex((current) => nextStep(current)), 2400)
    return () => window.clearInterval(timer)
  }, [playing])

  return (
    <section className={`grid gap-4 ${compact ? '' : 'lg:grid-cols-[minmax(0,1fr)_360px]'}`}>
      {compact ? (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-zinc-200">{c.title}</h2>
          <p className="text-xs leading-6 text-zinc-500">{c.subtitle}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-900 bg-zinc-950">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-900 px-4 py-3">
          <div>
            <div className="text-xs text-zinc-600">
              {c.step} {step.index}
            </div>
            <h2 className={`${compact ? 'text-base' : 'text-lg'} font-medium`}>{step.title[language]}</h2>
          </div>
          <div className="min-w-24 rounded-md border border-zinc-800 px-3 py-2 text-right text-xs text-zinc-400">
            {language === 'ja' ? `${step.day || c.noDay}${c.day}` : `${c.day} ${step.day || c.noDay}`} / 7
          </div>
        </div>

        <AlgorithmDiagram compact={compact} language={language} step={step} />

        <div className="h-1 bg-zinc-900">
          <div className="algorithm-progress h-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <aside className="grid content-start gap-3">
        <section className="rounded-lg border border-zinc-900 bg-zinc-950 p-4">
          {compact ? null : <h2 className="text-base font-medium">{step.title[language]}</h2>}
          <p className={`${compact ? '' : 'mt-3'} text-sm leading-7 text-zinc-400`}>{step.detail[language]}</p>
          <div className="mt-4 rounded-md border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-400">
            {step.note[language]}
          </div>
        </section>

        {!compact ? (
          <section className="grid gap-2 rounded-lg border border-zinc-900 bg-zinc-950 p-4 text-sm">
            <StateRow label={c.waiting} value={step.pool[language]} active={step.focus === 'pool' || step.focus === 'rematch'} />
            <StateRow label={c.exchange} value={step.pair[language]} active={step.focus === 'match' || step.focus === 'diary'} />
            <StateRow label={c.nextState} value={step.next[language]} active={step.focus === 'close' || step.focus === 'rematch'} />
          </section>
        ) : null}

        {showControls ? (
          <div className="flex flex-wrap gap-2">
            <button
              aria-label={playing ? c.pause : c.play}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black"
              onClick={() => setPlaying((current) => !current)}
              type="button"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
              {playing ? c.pause : c.play}
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-200"
              onClick={() => setStepIndex((current) => nextStep(current))}
              type="button"
            >
              <SkipForward size={16} />
              {c.next}
            </button>
            <button
              aria-label={c.reset}
              className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 text-zinc-400"
              onClick={() => {
                setStepIndex(0)
                setPlaying(false)
              }}
              type="button"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        ) : null}
      </aside>
    </section>
  )
}

function AlgorithmDiagram({
  compact,
  language,
  step,
}: {
  compact: boolean
  language: FlowLanguage
  step: FlowStep
}) {
  const c = flowCopy[language]

  return (
    <div className={`relative aspect-[16/9] w-full bg-black ${compact ? 'min-h-[260px]' : 'min-h-[360px]'}`}>
      <svg aria-label="マッチングアルゴリズムの流れ" className="h-full w-full" viewBox="0 0 960 540" role="img">
        <defs>
          <marker id="arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#71717a" />
          </marker>
          <pattern id="diary-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#18181b" strokeWidth="1" />
          </pattern>
        </defs>

        <rect fill="#000" height="540" width="960" />
        <rect fill="url(#diary-grid)" height="540" opacity="0.55" width="960" />

        <Lane active={step.focus === 'pool' || step.focus === 'rematch'} label={c.poolLane} metric={step.pool[language]} x={58} />
        <Lane active={step.focus === 'match' || step.focus === 'diary'} label={c.exchangeLane} metric={step.pair[language]} x={370} />
        <Lane active={step.focus === 'close'} label={c.closeLane} metric={step.next[language]} x={682} />

        <path
          d="M 288 174 C 326 174, 326 174, 360 174"
          fill="none"
          markerEnd="url(#arrow)"
          stroke="#52525b"
          strokeDasharray={step.focus === 'match' ? '4 7' : '0'}
          strokeWidth="2"
        />
        <path
          d="M 600 174 C 640 174, 640 174, 672 174"
          fill="none"
          markerEnd="url(#arrow)"
          stroke="#52525b"
          strokeDasharray={step.focus === 'close' ? '4 7' : '0'}
          strokeWidth="2"
        />
        <path
          d="M 720 330 C 560 470, 230 470, 176 314"
          fill="none"
          markerEnd="url(#arrow)"
          opacity={step.focus === 'rematch' ? 1 : 0.28}
          stroke="#52525b"
          strokeDasharray="5 8"
          strokeWidth="2"
        />

        <DayRail day={step.day} language={language} />

        {(Object.keys(tokens) as TokenKey[]).map((key) => (
          <UserToken key={key} position={step.positions[key]} tokenKey={key} />
        ))}

        {step.focus === 'match' ? (
          <g className="algorithm-fade">
            <circle cx="462" cy="153" fill="none" r="78" stroke="#f4f4f5" strokeDasharray="3 8" strokeWidth="2" />
            <text fill="#d4d4d8" fontSize="13" x="462" y="268" textAnchor="middle">
              {c.matchStarts}
            </text>
          </g>
        ) : null}

        {step.focus === 'diary' ? (
          <g className="algorithm-fade">
            <rect fill="#18181b" height="70" rx="8" width="170" x="395" y="230" />
            <text fill="#f4f4f5" fontSize="13" x="480" y="258" textAnchor="middle">
              {c.youPost}
            </text>
            <text fill="#a1a1aa" fontSize="12" x="480" y="280" textAnchor="middle">
              {c.canRead}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
}

function Lane({
  active,
  label,
  metric,
  x,
}: {
  active: boolean
  label: string
  metric: string
  x: number
}) {
  return (
    <g className="algorithm-fade">
      <rect
        fill={active ? '#09090b' : '#030303'}
        height="290"
        rx="8"
        stroke={active ? '#f4f4f5' : '#27272a'}
        strokeWidth={active ? '2' : '1'}
        width="220"
        x={x}
        y="78"
      />
      <text fill="#f4f4f5" fontSize="16" fontWeight="600" x={x + 20} y="113">
        {label}
      </text>
      <text fill="#71717a" fontSize="12" x={x + 20} y="139">
        {metric}
      </text>
    </g>
  )
}

function UserToken({ position, tokenKey }: { position: TokenPosition; tokenKey: TokenKey }) {
  const token = tokens[tokenKey]
  return (
    <g
      className="algorithm-token"
      style={{
        opacity: position.opacity,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <rect
        fill={tokenKey === 'b' ? '#18181b' : '#f4f4f5'}
        height="52"
        rx="8"
        stroke={tokenKey === 'b' ? '#a1a1aa' : '#f4f4f5'}
        width="52"
      />
      <text
        fill={tokenKey === 'b' ? '#f4f4f5' : '#000'}
        fontSize="18"
        fontWeight="700"
        x="26"
        y="32"
        textAnchor="middle"
      >
        {token.label}
      </text>
    </g>
  )
}

function DayRail({ day, language }: { day: number; language: FlowLanguage }) {
  return (
    <g transform="translate(394 326)">
      {Array.from({ length: 7 }, (_, index) => {
        const active = day > index
        return (
          <g key={index} transform={`translate(${index * 24} 0)`}>
            <rect fill={active ? '#f4f4f5' : '#18181b'} height="18" rx="4" width="16" />
            <text fill={active ? '#000' : '#71717a'} fontSize="9" fontWeight="600" x="8" y="13" textAnchor="middle">
              {index + 1}
            </text>
          </g>
        )
      })}
      <text fill="#71717a" fontSize="12" x="84" y="42" textAnchor="middle">
        {flowCopy[language].sevenDays}
      </text>
    </g>
  )
}

function StateRow({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <div className={`grid grid-cols-[96px_1fr] gap-3 rounded-md px-3 py-2 ${active ? 'bg-white text-black' : 'bg-black text-zinc-400'}`}>
      <span className="text-xs opacity-70">{label}</span>
      <strong className="text-sm font-medium">{value}</strong>
    </div>
  )
}

export default AlgorithmLab
