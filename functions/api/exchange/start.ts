import {
  buildSessionPayload,
  canStartExchange,
  getUserById,
  json,
  matchOrWait,
  refreshUserAccess,
  requireSession,
} from '../../_shared'
import type { Env } from '../../_shared'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let session
  try {
    session = await requireSession(request, env)
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }

  const currentUser = await refreshUserAccess(env, session.user)
  if (!canStartExchange(currentUser)) {
    return json({ error: 'The free trial has ended. Please subscribe to continue.' }, { status: 402 })
  }

  await matchOrWait(env, currentUser.id)
  const nextUser = (await getUserById(env, currentUser.id)) ?? currentUser
  return json({ authenticated: true, ...(await buildSessionPayload(env, nextUser)) })
}
