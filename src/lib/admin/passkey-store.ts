export async function deletePasskeyIfAboveMinimum(
  db: D1Database,
  credentialId: string,
  minimum = 2,
): Promise<boolean> {
  const deleted = await db.prepare(
    `DELETE FROM passkeys
     WHERE credential_id = ?
       AND (SELECT COUNT(*) FROM passkeys) > ?`,
  ).bind(credentialId, minimum).run();
  return (deleted.meta.changes ?? 0) === 1;
}
