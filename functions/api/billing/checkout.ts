import { getOrigin, json, requireSession, stripeRequest } from '../../_shared'
import type { Env } from '../../_shared'

type StripeCustomer = {
  id: string
}

type StripeCheckoutSession = {
  id: string
  url: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { user } = await requireSession(request, env)
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  let customerId = user.stripe_customer_id
  if (!customerId) {
    const customer = await stripeRequest<StripeCustomer>(
      env,
      'customers',
      new URLSearchParams({
        email: user.email,
        'metadata[user_id]': user.id,
      }),
    )
    customerId = customer.id
    await env.DB.prepare(
      `
        UPDATE users
        SET stripe_customer_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `,
    )
      .bind(customerId, user.id)
      .run()
  }

  const origin = getOrigin(request)
  const successUrl = env.STRIPE_SUCCESS_URL || `${origin}/?billing=success`
  const cancelUrl = env.STRIPE_CANCEL_URL || `${origin}/?billing=cancel`
  const session = await stripeRequest<StripeCheckoutSession>(
    env,
    'checkout/sessions',
    new URLSearchParams({
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'metadata[user_id]': user.id,
      'subscription_data[metadata][user_id]': user.id,
    }),
  )

  return json({ url: session.url })
}

