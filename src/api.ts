export type RemoteEntry = {
  id: string
  body: string | null
  created_at: string
}

export type RemoteExchange = {
  pairId: string
  partnerCode: string
  startedAt: string
  endsAt: string
  dayIndex: number
  ownEntry: RemoteEntry | null
  partnerEntry: RemoteEntry | null
}

export type RemoteSession = {
  authenticated: boolean
  user: {
    id: string
    email: string
    subscriptionStatus: string
    subscriptionCurrentPeriodEnd: string | null
    trialStartedAt: string | null
    trialEndsAt: string | null
  } | null
  waiting: boolean
  exchange: RemoteExchange | null
}

export type RemoteConfig = {
  googleClientId: string
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

export function fetchSession() {
  return requestJson<RemoteSession>('/api/session')
}

export function fetchConfig() {
  return requestJson<RemoteConfig>('/api/config')
}

export function signInWithGoogle(credential: string) {
  return requestJson<RemoteSession>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
}

export function startRemoteTrial(confirmations: { age: boolean; safety: boolean; price: boolean }) {
  return requestJson<RemoteSession>('/api/trial/start', {
    method: 'POST',
    body: JSON.stringify(confirmations),
  })
}

export function postRemoteEntry(body: string) {
  return requestJson<RemoteSession>('/api/entries', {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function createCheckoutSession() {
  return requestJson<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
  })
}

export function logoutRemote() {
  return requestJson<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  })
}
