import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

async function startTrial() {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByLabelText('18歳以上です。'))
  await user.click(screen.getByLabelText('これは医療、カウンセリング、危機対応ではありません。'))
  await user.click(screen.getByLabelText('7日間無料。その後は月500円。自動では課金されません。'))
  await user.click(screen.getByRole('button', { name: '7日間無料で始める' }))

  return user
}

describe('Dear Human MVP', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('locks the partner diary until the user posts', async () => {
    const user = await startTrial()

    expect(screen.getByText('24時間に1回だけ投稿できます。自分が投稿すると、相手の日記が読めます。')).toBeInTheDocument()
    expect(screen.getByText('24時間に1回。送ると相手の日記が開きます')).toBeInTheDocument()
    expect(screen.getByText('あなたが送ると開きます')).toBeInTheDocument()
    expect(screen.getByText(/今日は、誰かに言うほどではないことばかり/)).toHaveAttribute('aria-hidden', 'true')

    await user.type(
      screen.getByLabelText('今日の日記'),
      '今日は少し疲れている。誰かに説明したいわけではないけれど、ここに一度だけ置いておきたい。',
    )
    await user.click(screen.getByRole('button', { name: '送る' }))

    expect(screen.getByText('あなた')).toBeInTheDocument()
    expect(screen.getByText('相手')).toBeInTheDocument()
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
})
