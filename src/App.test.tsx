import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

async function startTrial() {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByLabelText('18歳以上です。'))
  await user.click(screen.getByLabelText('医療、カウンセリング、危機対応ではないことを理解しました。'))
  await user.click(
    screen.getByLabelText(
      '7日間無料。その後は月500円。自動では課金されません。始めるのにクレジットカードは不要です。',
    ),
  )
  await user.click(screen.getByRole('button', { name: '7日間無料で始める' }))

  return user
}

describe('Dear Human MVP', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('locks the partner diary until the user posts', async () => {
    const user = await startTrial()

    expect(
      screen.getByText(
        '24時間に1回だけ投稿できます。自分が今日の日記を送ると、相手の日記を読めるようになります。',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('24時間に1回。送ると相手の日記を読めます')).toBeInTheDocument()
    expect(screen.getByText('あなたが送ると読めます')).toBeInTheDocument()
    expect(screen.getByText(/^相手 [A-Z2-9]{5}$/)).toBeInTheDocument()
    expect(screen.getByText(/今日は、誰かに言うほどではないことばかり/)).toHaveAttribute('aria-hidden', 'true')

    await user.type(
      screen.getByLabelText('今日の日記'),
      '今日は少し疲れている。誰かに説明したいわけではないけれど、ここに一度だけ置いておきたい。',
    )
    await user.click(screen.getByRole('button', { name: '送る' }))

    expect(screen.getByText('あなた')).toBeInTheDocument()
    expect(screen.getByText(/^相手 [A-Z2-9]{5}$/)).toBeInTheDocument()
    expect(screen.getByText('投稿が終わりました。今日はもう投稿できません。')).toBeInTheDocument()
    expect(screen.getByText(/今日は、誰かに言うほどではないことばかり/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '読む' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '通報' })).not.toBeInTheDocument()
  })

  it('provides test users in the settings sheet', async () => {
    const user = await startTrial()

    await user.click(screen.getByRole('button', { name: '設定' }))

    expect(screen.getByText('テストユーザー')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /夜にAIへ貼る人/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /普通に働いた人/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /眠る前だけ書く人/ })).toBeInTheDocument()
    expect(screen.getByText('月500円')).toBeInTheDocument()
  })

  it('switches between Japanese and English copy', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('AIではなく人間と日記を交換しよう')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Dear Humanは、7日間だけ、匿名の一人と日記を交換します。返信、評価、プロフィールはありません。マッチングアルゴリズムは平等であり、完全にランダムに相手を選びます。',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByText('Exchange diaries with a human, not AI')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Dear Human lets you exchange diaries with one anonymous person for 7 days. There are no replies, ratings, or profiles. The matching algorithm is equal and chooses your partner completely at random.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByLabelText('I am 18 or older.'))
    await user.click(
      screen.getByLabelText('I understand this is not medical care, counseling, or crisis support.'),
    )
    await user.click(
      screen.getByLabelText(
        '7 days free, then ¥500/month. You will not be charged automatically. No credit card is needed to start.',
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Start 7 days free' }))

    expect(
      screen.getByText(
        'You can post once every 24 hours. After you send today’s diary, you can read your partner’s diary.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/^Partner [A-Z2-9]{5}$/)).toBeInTheDocument()
  })
})
