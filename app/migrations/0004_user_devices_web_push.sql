ALTER TABLE f2w_user_devices ADD COLUMN push_subscription TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_f2w_user_devices_web_endpoint
  ON f2w_user_devices(user_id, push_subscription)
  WHERE push_subscription IS NOT NULL;
