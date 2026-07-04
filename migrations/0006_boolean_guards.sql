CREATE TRIGGER IF NOT EXISTS posts_published_bool_insert
BEFORE INSERT ON posts
WHEN NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'posts.published must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS posts_published_bool_update
BEFORE UPDATE OF published ON posts
WHEN NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'posts.published must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS projects_bool_insert
BEFORE INSERT ON projects
WHEN NEW.featured NOT IN (0, 1)
  OR NEW.is_expanded NOT IN (0, 1)
  OR NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'projects boolean columns must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS projects_bool_update
BEFORE UPDATE OF featured, is_expanded, published ON projects
WHEN NEW.featured NOT IN (0, 1)
  OR NEW.is_expanded NOT IN (0, 1)
  OR NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'projects boolean columns must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS experiences_bool_insert
BEFORE INSERT ON experiences
WHEN NEW.is_current_employer NOT IN (0, 1)
  OR NEW.is_expanded NOT IN (0, 1)
  OR NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'experiences boolean columns must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS experiences_bool_update
BEFORE UPDATE OF is_current_employer, is_expanded, published ON experiences
WHEN NEW.is_current_employer NOT IN (0, 1)
  OR NEW.is_expanded NOT IN (0, 1)
  OR NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'experiences boolean columns must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS social_links_published_bool_insert
BEFORE INSERT ON social_links
WHEN NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'social_links.published must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS social_links_published_bool_update
BEFORE UPDATE OF published ON social_links
WHEN NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'social_links.published must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS tech_stack_published_bool_insert
BEFORE INSERT ON tech_stack
WHEN NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'tech_stack.published must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS tech_stack_published_bool_update
BEFORE UPDATE OF published ON tech_stack
WHEN NEW.published NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'tech_stack.published must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS bento_cells_visible_bool_insert
BEFORE INSERT ON bento_cells
WHEN NEW.visible NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'bento_cells.visible must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS bento_cells_visible_bool_update
BEFORE UPDATE OF visible ON bento_cells
WHEN NEW.visible NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'bento_cells.visible must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS nav_items_visible_bool_insert
BEFORE INSERT ON nav_items
WHEN NEW.visible NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'nav_items.visible must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS nav_items_visible_bool_update
BEFORE UPDATE OF visible ON nav_items
WHEN NEW.visible NOT IN (0, 1)
BEGIN
  SELECT RAISE(ABORT, 'nav_items.visible must be 0 or 1');
END;
