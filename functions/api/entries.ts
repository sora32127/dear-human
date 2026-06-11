import { buildSessionPayload, getActivePair, json, randomId, readJson, requireSession, dayIndex } from '../_shared'
import type { Env } from '../_shared'

type EntryRequest = {
  body?: string
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { user } = await requireSession(request, env)
  return json({ authenticated: true, ...(await buildSessionPayload(env, user)) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { user } = await requireSession(request, env)
  const pair = await getActivePair(env, user.id)
  if (!pair) return json({ error: 'No active exchange' }, { status: 409 })

  const body = await readJson<EntryRequest>(request)
  const text = body.body?.trim() ?? ''
  if (text.length < 20) return json({ error: 'Diary entry is too short' }, { status: 400 })

  const currentDay = dayIndex(pair.started_at)
  await env.DB.prepare(
    `
      INSERT INTO entries (id, pair_id, user_id, day_index, body)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(pair_id, user_id, day_index) DO NOTHING
    `,
  )
    .bind(randomId('entry'), pair.id, user.id, currentDay, text)
    .run()

  return json({ authenticated: true, ...(await buildSessionPayload(env, user)) })
}

