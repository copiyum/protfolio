CREATE TRIGGER IF NOT EXISTS audit_log_deny_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log rows are immutable');
END;

CREATE TRIGGER IF NOT EXISTS audit_log_deny_recent_delete
BEFORE DELETE ON audit_log
WHEN julianday(OLD.ts) >= julianday('now', '-90 days')
BEGIN
  SELECT RAISE(ABORT, 'audit_log rows are retained for 90 days');
END;
