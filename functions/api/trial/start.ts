import { buildSessionPayload, json, matchOrWait, readJson, requireSession } from '../../_shared'
import type { Env } from '../../_shared'

type StartTrialRequest = {
  age?: boolean
  safety?: boolean
  price?: boolean
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { user } = await requireSession(request, env)
  const body = await readJson<StartTrialRequest>(request)
  if (!body.age || !body.safety || !body.price) {
    return json({ error: 'Required confirmations are missing' }, { status: 400 })
  }

  await matchOrWait(env, user.id)
  return json({ authenticated: true, ...(await buildSessionPayload(env, user)) })
}

