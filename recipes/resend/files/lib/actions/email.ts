"use server";

import { type SendResult, sendWelcome } from "@/lib/email/send";
import { welcomeEmailSchema } from "@/lib/validations/email";

export async function sendWelcomeEmail(
  _prev: SendResult | null,
  formData: FormData,
): Promise<SendResult> {
  const parsed = welcomeEmailSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      ok: false,
    };
  }

  // Never throw to the client — the form always gets a result it can show.
  try {
    return await sendWelcome({ name: parsed.data.name, to: parsed.data.email });
  } catch {
    return { error: "Could not send the email. Please try again.", ok: false };
  }
}
