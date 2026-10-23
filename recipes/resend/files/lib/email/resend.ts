import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

// Fail at import, not at first send: a missing key should break the build,
// not surface later as a 401 that reads like a Resend outage.
if (!apiKey) {
  throw new Error(
    "RESEND_API_KEY is not set. Create a key at https://resend.com/api-keys and add it to .env.",
  );
}

export const resend = new Resend(apiKey);
