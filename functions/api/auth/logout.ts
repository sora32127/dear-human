import { clearSessionCookie, getCookie, json } from '../../_shared'
import type { Env } from '../../_shared'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const sessionId = getCookie(request, 'dh_session')
  if (sessionId) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  }

  return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie() } })
}

