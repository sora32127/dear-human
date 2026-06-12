import {
  buildSessionPayload,
  canStartExchange,
  getUserById,
  json,
  matchOrWait,
  readJson,
  refreshUserAccess,
  requireSession,
} from '../../_shared'
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

  const currentUser = await refreshUserAccess(env, user)
  if (!canStartExchange(currentUser)) {
    return json({ error: 'The free trial has ended. Please subscribe to continue.' }, { status: 402 })
  }

  await matchOrWait(env, currentUser.id)
  const nextUser = (await getUserById(env, currentUser.id)) ?? currentUser
  return json({ authenticated: true, ...(await buildSessionPayload(env, nextUser)) })
}
