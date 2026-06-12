import { json } from '../_shared'
import type { Env } from '../_shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return json({
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() ?? '',
  })
}
