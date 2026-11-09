-- Additive blog-editor rollout. Legacy `content` stays in place for old deployments.
ALTER TABLE posts ADD COLUMN body TEXT;
ALTER TABLE posts ADD COLUMN body_version INTEGER;
ALTER TABLE posts ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN published_at TEXT;
ALTER TABLE posts ADD COLUMN cover_asset_id TEXT;

CREATE TABLE IF NOT EXISTS post_drafts (
  post_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  proposed_slug TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  cover_asset_id TEXT,
  body TEXT NOT NULL,
  body_version INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 0,
  base_revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_drafts_proposed_slug ON post_drafts(proposed_slug);

CREATE TABLE IF NOT EXISTS post_revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  actor_credential_id TEXT,
  FOREIGN KEY(post_id) REFERENCES post_drafts(post_id) ON DELETE CASCADE,
  UNIQUE(post_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_post_revisions_post_id ON post_revisions(post_id, revision DESC);

CREATE TABLE IF NOT EXISTS blog_assets (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT,
  FOREIGN KEY(post_id) REFERENCES post_drafts(post_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_assets_post_id ON blog_assets(post_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_posts_published_slug ON posts(published, slug);
