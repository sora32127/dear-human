export type Env = {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID: string
  STRIPE_SUCCESS_URL?: string
  STRIPE_CANCEL_URL?: string
}

export type UserRecord = {
  id: string
  google_sub: string
  email: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  subscription_current_period_end: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
}

export type PairRecord = {
  id: string
  user_a_id: string
  user_b_id: string
  partner_code_a: string
  partner_code_b: string
  started_at: string
  ends_at: string
  status: string
}

export type EntryRecord = {
  id: string
  pair_id: string
  user_id: string
  day_index: number
  body: string
  created_at: string
}

export type SessionContext = {
  user: UserRecord
  sessionId: string
}

const SESSION_COOKIE = 'dh_session'
const SESSION_DAYS = 30
const TRIAL_DAYS = 7
const PARTNER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PAID_SUBSCRIPTION_STATUSES = new Set(['active'])
const USER_COLUMNS = `
  id, google_sub, email, stripe_customer_id, stripe_subscription_id,
  subscription_status, subscription_current_period_end, trial_started_at, trial_ends_at
`

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

export function badRequest(message: string, status = 400) {
  return json({ error: message }, { status })
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error('Invalid JSON')
  }
}

export function nowIso() {
  return new Date().toISOString()
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function dayIndex(startedAt: string, now = new Date()) {
  const start = new Date(startedAt)
  const elapsed = now.getTime() - start.getTime()
  return Math.min(TRIAL_DAYS, Math.max(1, Math.floor(elapsed / 86400000) + 1))
}

export function isPaidSubscription(status: string) {
  return PAID_SUBSCRIPTION_STATUSES.has(status)
}

export function isTrialActive(user: UserRecord, now = new Date()) {
  if (user.subscription_status !== 'trialing' || !user.trial_ends_at) return false
  return new Date(user.trial_ends_at).getTime() > now.getTime()
}

export function canStartExchange(user: UserRecord, now = new Date()) {
  if (isPaidSubscription(user.subscription_status)) return true
  if (!user.trial_started_at) return true
  return isTrialActive(user, now)
}

export function getOrigin(request: Request) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export function getCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie')
  if (!cookie) return null

  for (const part of cookie.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }

  return null
}

export function sessionCookie(sessionId: string, secure = true) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60
  const securePart = secure ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${securePart}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`
}

export function generatePartnerCode() {
  const values = new Uint8Array(5)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => PARTNER_CODE_ALPHABET[value % PARTNER_CODE_ALPHABET.length]).join('')
}

export async function requireSession(request: Request, env: Env): Promise<SessionContext> {
  const sessionId = getCookie(request, SESSION_COOKIE)
  if (!sessionId) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const user = await env.DB.prepare(
    `
      SELECT users.id, users.google_sub, users.email, users.stripe_customer_id,
             users.stripe_subscription_id, users.subscription_status,
             users.subscription_current_period_end, users.trial_started_at, users.trial_ends_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ? AND sessions.expires_at > ?
    `,
  )
    .bind(sessionId, nowIso())
    .first<UserRecord>()

  if (!user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  return { user, sessionId }
}

export async function getUserById(env: Env, userId: string) {
  return env.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).bind(userId).first<UserRecord>()
}

export async function refreshUserAccess(env: Env, user: UserRecord) {
  if (
    user.subscription_status === 'trialing' &&
    user.trial_ends_at &&
    new Date(user.trial_ends_at).getTime() <= Date.now()
  ) {
    await env.DB.prepare(
      `
        UPDATE users
        SET subscription_status = 'trial_ended',
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ? AND subscription_status = 'trialing'
      `,
    )
      .bind(user.id)
      .run()
    return { ...user, subscription_status: 'trial_ended' }
  }

  return user
}

export async function completeExpiredPairs(env: Env) {
  await env.DB.prepare(
    `
      UPDATE pairs
      SET status = 'completed'
      WHERE status = 'active' AND ends_at <= ?
    `,
  )
    .bind(nowIso())
    .run()
}

export async function getActivePair(env: Env, userId: string) {
  await completeExpiredPairs(env)
  return env.DB.prepare(
    `
      SELECT id, user_a_id, user_b_id, partner_code_a, partner_code_b, started_at, ends_at, status
      FROM pairs
      WHERE status = 'active'
        AND (user_a_id = ? OR user_b_id = ?)
      ORDER BY started_at DESC
      LIMIT 1
    `,
  )
    .bind(userId, userId)
    .first<PairRecord>()
}

export async function getCurrentEntryState(env: Env, pair: PairRecord, userId: string) {
  const currentDay = dayIndex(pair.started_at)
  const partnerId = pair.user_a_id === userId ? pair.user_b_id : pair.user_a_id
  const partnerCode = pair.user_a_id === userId ? pair.partner_code_a : pair.partner_code_b

  const ownEntry = await env.DB.prepare(
    'SELECT id, pair_id, user_id, day_index, body, created_at FROM entries WHERE pair_id = ? AND user_id = ? AND day_index = ?',
  )
    .bind(pair.id, userId, currentDay)
    .first<EntryRecord>()

  const partnerEntry = await env.DB.prepare(
    'SELECT id, pair_id, user_id, day_index, body, created_at FROM entries WHERE pair_id = ? AND user_id = ? AND day_index = ?',
  )
    .bind(pair.id, partnerId, currentDay)
    .first<EntryRecord>()

  return {
    pairId: pair.id,
    partnerCode,
    startedAt: pair.started_at,
    endsAt: pair.ends_at,
    dayIndex: currentDay,
    ownEntry,
    partnerEntry: ownEntry ? partnerEntry : partnerEntry ? { ...partnerEntry, body: null } : null,
  }
}

export async function buildSessionPayload(env: Env, user: UserRecord) {
  const currentUser = await refreshUserAccess(env, user)
  const pair = await getActivePair(env, currentUser.id)
  const waiting = await env.DB.prepare('SELECT user_id FROM waiting_pool WHERE user_id = ?')
    .bind(currentUser.id)
    .first<{ user_id: string }>()

  return {
    user: {
      id: currentUser.id,
      email: currentUser.email,
      subscriptionStatus: currentUser.subscription_status,
      subscriptionCurrentPeriodEnd: currentUser.subscription_current_period_end,
      trialStartedAt: currentUser.trial_started_at,
      trialEndsAt: currentUser.trial_ends_at,
    },
    waiting: Boolean(waiting),
    exchange: pair ? await getCurrentEntryState(env, pair, currentUser.id) : null,
  }
}

export async function createSession(env: Env, userId: string) {
  const sessionId = randomId('sess')
  const expiresAt = addDays(new Date(), SESSION_DAYS).toISOString()
  await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, userId, expiresAt)
    .run()
  return sessionId
}

export async function matchOrWait(env: Env, userId: string) {
  const existingPair = await getActivePair(env, userId)
  if (existingPair) return { status: 'matched' as const, pair: existingPair }

  const waitingUser = await env.DB.prepare(
    `
      SELECT user_id
      FROM waiting_pool
      WHERE user_id <> ?
      ORDER BY joined_at ASC
      LIMIT 1
    `,
  )
    .bind(userId)
    .first<{ user_id: string }>()

  if (!waitingUser) {
    await env.DB.prepare(
      'INSERT INTO waiting_pool (user_id, joined_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET joined_at = excluded.joined_at',
    )
      .bind(userId, nowIso())
      .run()
    return { status: 'waiting' as const, pair: null }
  }

  const start = new Date()
  const trialEndsAt = addDays(start, TRIAL_DAYS).toISOString()
  const pair: PairRecord = {
    id: randomId('pair'),
    user_a_id: waitingUser.user_id,
    user_b_id: userId,
    partner_code_a: generatePartnerCode(),
    partner_code_b: generatePartnerCode(),
    started_at: start.toISOString(),
    ends_at: trialEndsAt,
    status: 'active',
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM waiting_pool WHERE user_id IN (?, ?)').bind(waitingUser.user_id, userId),
    env.DB.prepare(
      `
        INSERT INTO pairs
          (id, user_a_id, user_b_id, partner_code_a, partner_code_b, started_at, ends_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).bind(
      pair.id,
      pair.user_a_id,
      pair.user_b_id,
      pair.partner_code_a,
      pair.partner_code_b,
      pair.started_at,
      pair.ends_at,
      pair.status,
    ),
    env.DB.prepare(
      `
        UPDATE users
        SET trial_started_at = COALESCE(trial_started_at, ?),
            trial_ends_at = COALESCE(trial_ends_at, ?),
            subscription_status = CASE
              WHEN subscription_status = 'none' AND trial_started_at IS NULL THEN 'trialing'
              ELSE subscription_status
            END,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id IN (?, ?)
      `,
    ).bind(pair.started_at, pair.ends_at, pair.user_a_id, pair.user_b_id),
  ])

  return { status: 'matched' as const, pair }
}

export async function stripeRequest<T>(env: Env, path: string, body: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json<T & { error?: { message?: string } }>()
  if (!response.ok) throw new Error(data.error?.message ?? 'Stripe request failed')
  return data
}

export async function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false

  const pieces = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key, value]
    }),
  )
  const timestamp = pieces.t
  const signature = pieces.v1
  if (!timestamp || !signature) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const payload = `${timestamp}.${rawBody}`
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

  if (expected.length !== signature.length) return false
  let diff = 0
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ signature.charCodeAt(index)
  }
  return diff === 0
}
