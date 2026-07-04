UPDATE profile_settings
SET selection_tooltip_phrases = '["nice taste 👀","good eye","solid pick","clean choice","saving this","noted"]'
WHERE id = 'singleton'
  AND selection_tooltip_phrases = '["nice taste 👀"]';
