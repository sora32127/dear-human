import { json, verifyStripeSignature } from '../../_shared'
import type { Env } from '../../_shared'

type StripeEvent = {
  type?: string
  data?: {
    object?: Record<string, unknown>
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null
}

function numberToIso(value: unknown) {
  return typeof value === 'number' ? new Date(value * 1000).toISOString() : null
}

function metadataUserId(object: Record<string, unknown>) {
  const metadata = object.metadata
  if (!metadata || typeof metadata !== 'object') return null
  return stringValue((metadata as Record<string, unknown>).user_id)
}

async function updateSubscriptionByUser(env: Env, userId: string, status: string, periodEnd: string | null) {
  await env.DB.prepare(
    `
      UPDATE users
      SET subscription_status = ?,
          subscription_current_period_end = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `,
  )
    .bind(status, periodEnd, userId)
    .run()
}

async function updateSubscriptionByCustomer(env: Env, customerId: string, status: string, periodEnd: string | null) {
  await env.DB.prepare(
    `
      UPDATE users
      SET subscription_status = ?,
          subscription_current_period_end = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE stripe_customer_id = ?
    `,
  )
    .bind(status, periodEnd, customerId)
    .run()
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  const verified = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  if (!verified) return json({ error: 'Invalid Stripe signature' }, { status: 400 })

  const event = JSON.parse(rawBody) as StripeEvent
  const object = event.data?.object
  if (!object) return json({ received: true })

  if (event.type === 'checkout.session.completed') {
    const userId = metadataUserId(object)
    const customerId = stringValue(object.customer)
    if (userId && customerId) {
      await env.DB.prepare(
        `
          UPDATE users
          SET stripe_customer_id = ?,
              subscription_status = 'active',
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ?
        `,
      )
        .bind(customerId, userId)
        .run()
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : stringValue(object.status) || 'unknown'
    const periodEnd = numberToIso(object.current_period_end)
    const userId = metadataUserId(object)
    const customerId = stringValue(object.customer)

    if (userId) {
      await updateSubscriptionByUser(env, userId, status, periodEnd)
    } else if (customerId) {
      await updateSubscriptionByCustomer(env, customerId, status, periodEnd)
    }
  }

  return json({ received: true })
}

