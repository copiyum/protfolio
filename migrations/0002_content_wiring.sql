ALTER TABLE tech_stack ADD COLUMN color TEXT NOT NULL DEFAULT '#9ca3af';

ALTER TABLE experiences ADD COLUMN company_logo TEXT;
ALTER TABLE experiences ADD COLUMN company_website TEXT;
ALTER TABLE experiences ADD COLUMN is_current_employer INTEGER NOT NULL DEFAULT 0 CHECK (is_current_employer IN (0, 1));
ALTER TABLE experiences ADD COLUMN is_expanded INTEGER NOT NULL DEFAULT 0 CHECK (is_expanded IN (0, 1));
