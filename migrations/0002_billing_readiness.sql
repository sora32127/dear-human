ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN trial_started_at TEXT;
ALTER TABLE users ADD COLUMN trial_ends_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
ON users(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

UPDATE users
SET subscription_status = 'none',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE subscription_status = 'trialing'
  AND subscription_current_period_end IS NULL;
