CREATE TABLE IF NOT EXISTS album_art_cache (
  cache_key TEXT PRIMARY KEY,
  art_url TEXT,
  created_at INTEGER NOT NULL
);
