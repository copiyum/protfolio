CREATE TABLE IF NOT EXISTS profile_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  photo_light TEXT,
  photo_dark TEXT,
  location_label TEXT NOT NULL DEFAULT 'Bangalore',
  latitude REAL NOT NULL DEFAULT 12.9716,
  longitude REAL NOT NULL DEFAULT 77.5946,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  timezone_label TEXT NOT NULL DEFAULT 'IST',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO profile_settings (
  id,
  location_label,
  latitude,
  longitude,
  timezone,
  timezone_label
) VALUES (
  'singleton',
  'Bangalore',
  12.9716,
  77.5946,
  'Asia/Kolkata',
  'IST'
);
