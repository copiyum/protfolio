export async function alert(env: { ALERT_EMAIL_WEBHOOK?: string }, subject: string, body: string): Promise<void> {
  if (!env.ALERT_EMAIL_WEBHOOK) return;
  try {
    await fetch(env.ALERT_EMAIL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
  } catch {
    // never let an alert failure cascade
  }
}