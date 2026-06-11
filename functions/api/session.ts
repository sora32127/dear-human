import { buildSessionPayload, json, requireSession } from '../_shared'
import type { Env } from '../_shared'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { user } = await requireSession(request, env)
    return json({ authenticated: true, ...(await buildSessionPayload(env, user)) })
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return json({ authenticated: false, user: null, waiting: false, exchange: null })
    }
    throw error
  }
}

