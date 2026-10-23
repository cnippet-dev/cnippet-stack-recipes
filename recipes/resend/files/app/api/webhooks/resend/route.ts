import { resend } from "@/lib/email/resend";

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("RESEND_WEBHOOK_SECRET is not set", { status: 500 });
  }

  // Raw body, not req.json(): re-serialising changes the bytes and the
  // signature check fails.
  const payload = await req.text();

  let event: ReturnType<typeof resend.webhooks.verify>;
  try {
    event = resend.webhooks.verify({
      headers: {
        id: req.headers.get("svix-id") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
      },
      payload,
      webhookSecret: secret,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Logs for now — wire your own persistence here.
  switch (event.type) {
    case "email.delivered":
    case "email.bounced":
    case "email.complained":
      console.log(`[resend] ${event.type}`, event.data.email_id);
      break;
    default:
      console.log(`[resend] unhandled event: ${event.type}`);
  }

  return Response.json({ received: true });
}
