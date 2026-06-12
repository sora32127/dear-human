import { buildSessionPayload, createSession, json, readJson, sessionCookie } from '../../_shared'
import type { Env, UserRecord } from '../../_shared'

type GoogleAuthRequest = {
  credential?: string
}

type GoogleTokenInfo = {
  iss?: string
  aud?: string
  sub?: string
  email?: string
  email_verified?: string | boolean
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'GOOGLE_CLIENT_ID is not configured' }, { status: 500 })

  const body = await readJson<GoogleAuthRequest>(request)
  if (!body.credential) return json({ error: 'Missing Google credential' }, { status: 400 })

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`,
  )
  if (!tokenInfoResponse.ok) return json({ error: 'Invalid Google credential' }, { status: 401 })

  const tokenInfo = await tokenInfoResponse.json<GoogleTokenInfo>()
  const emailVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === 'true'
  const validIssuer = !tokenInfo.iss || tokenInfo.iss === 'https://accounts.google.com' || tokenInfo.iss === 'accounts.google.com'
  if (tokenInfo.aud !== env.GOOGLE_CLIENT_ID || !validIssuer || !tokenInfo.sub || !tokenInfo.email || !emailVerified) {
    return json({ error: 'Invalid Google credential' }, { status: 401 })
  }

  let user = await env.DB.prepare(
    `
      SELECT id, google_sub, email, stripe_customer_id, stripe_subscription_id,
             subscription_status, subscription_current_period_end, trial_started_at, trial_ends_at
      FROM users
      WHERE google_sub = ?
    `,
  )
    .bind(tokenInfo.sub)
    .first<UserRecord>()

  if (!user) {
    const userId = crypto.randomUUID()
    await env.DB.prepare(
      `
        INSERT INTO users (id, google_sub, email, subscription_status)
        VALUES (?, ?, ?, 'none')
      `,
    )
      .bind(userId, tokenInfo.sub, tokenInfo.email)
      .run()

    user = await env.DB.prepare(
      `
        SELECT id, google_sub, email, stripe_customer_id, stripe_subscription_id,
               subscription_status, subscription_current_period_end, trial_started_at, trial_ends_at
        FROM users
        WHERE id = ?
      `,
    )
      .bind(userId)
      .first<UserRecord>()
  } else if (user.email !== tokenInfo.email) {
    await env.DB.prepare(
      `
        UPDATE users
        SET email = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `,
    )
      .bind(tokenInfo.email, user.id)
      .run()
    user.email = tokenInfo.email
  }

  if (!user) return json({ error: 'Failed to create user' }, { status: 500 })

  const sessionId = await createSession(env, user.id)
  const secure = new URL(request.url).protocol === 'https:'

  return json(
    {
      authenticated: true,
      ...(await buildSessionPayload(env, user)),
    },
    {
      headers: {
        'set-cookie': sessionCookie(sessionId, secure),
      },
    },
  )
}
