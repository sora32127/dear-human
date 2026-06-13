import { getOrigin, isPaidSubscription, json, requireSession, stripeRequest } from '../../_shared'
import type { Env } from '../../_shared'

type StripePortalSession = {
  id: string
  url: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let authSession
  try {
    authSession = await requireSession(request, env)
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }

  const { user } = authSession
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'Stripe is not configured' }, { status: 500 })
  }
  if (!user.stripe_customer_id || !isPaidSubscription(user.subscription_status)) {
    return json({ error: 'Subscription is not active' }, { status: 409 })
  }

  const origin = getOrigin(request)
  const returnUrl = env.STRIPE_PORTAL_RETURN_URL || origin
  const session = await stripeRequest<StripePortalSession>(
    env,
    'billing_portal/sessions',
    new URLSearchParams({
      customer: user.stripe_customer_id,
      return_url: returnUrl,
    }),
  )

  return json({ url: session.url })
}
