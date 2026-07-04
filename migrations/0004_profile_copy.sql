ALTER TABLE profile_settings ADD COLUMN bio_text TEXT NOT NULL DEFAULT 'I''m a software developer. I specialize in clean design and crafting engaging user experiences with great attention to detail.';
ALTER TABLE profile_settings ADD COLUMN bio_highlights TEXT NOT NULL DEFAULT '["clean design","engaging user experiences"]';
ALTER TABLE profile_settings ADD COLUMN selection_tooltip_phrases TEXT NOT NULL DEFAULT '["nice taste 👀"]';

UPDATE profile_settings
SET
  bio_text = COALESCE(NULLIF(bio_text, ''), 'I''m a software developer. I specialize in clean design and crafting engaging user experiences with great attention to detail.'),
  bio_highlights = COALESCE(NULLIF(bio_highlights, ''), '["clean design","engaging user experiences"]'),
  selection_tooltip_phrases = COALESCE(NULLIF(selection_tooltip_phrases, ''), '["nice taste 👀"]')
WHERE id = 'singleton';
