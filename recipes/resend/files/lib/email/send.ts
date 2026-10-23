import { resend } from "@/lib/email/resend";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendWelcome({
  to,
  name,
}: {
  to: string;
  name: string;
}): Promise<SendResult> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { error: "EMAIL_FROM is not set.", ok: false };
  }

  // The SDK returns { data, error } instead of throwing on API errors.
  const { data, error } = await resend.emails.send({
    from,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for signing up.</p>`,
    subject: `Welcome, ${name}!`,
    to,
  });

  if (error) {
    return { error: `${error.name}: ${error.message}`, ok: false };
  }
  return { id: data.id, ok: true };
}
