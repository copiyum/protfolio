CREATE TABLE IF NOT EXISTS visitor_notes (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  message TEXT,
  color TEXT NOT NULL,
  x REAL NOT NULL CHECK (x >= 0 AND x <= 100),
  y REAL NOT NULL CHECK (y >= 0 AND y <= 100),
  rotation REAL NOT NULL CHECK (rotation >= -12 AND rotation <= 12),
  image_width INTEGER NOT NULL CHECK (image_width > 0 AND image_width <= 2048),
  image_height INTEGER NOT NULL CHECK (image_height > 0 AND image_height <= 1536),
  image_bytes INTEGER NOT NULL CHECK (image_bytes > 0 AND image_bytes <= 614400),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_visitor_notes_created_at ON visitor_notes(created_at);
