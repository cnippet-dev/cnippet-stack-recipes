import type { RecipeManifestInput } from "@cnippet/recipe-kit";

// `app/...` sources land in the app dir, everything else under srcDir.
const create = (source: string, when?: string) => ({
  source,
  strategy: "create" as const,
  target: source.startsWith("app/")
    ? `{{appDir}}${source.slice("app/".length)}`
    : `{{srcDir}}${source}`,
  ...(when ? { when } : {}),
});

export default {
  category: "email",
  cnippetUiComponents: ["button", "input", "label"],
  dependencies: ["resend@^6.31.0", "zod@^4.4.3"],
  description:
    "Send transactional email with Resend from a Zod-validated server action, with an optional starter form and a signed webhook for delivery events.",
  envVars: [
    {
      description: "Resend API key from resend.com/api-keys.",
      example: "re_placeholder",
      name: "RESEND_API_KEY",
    },
    {
      description:
        "Sender address. Must be on a verified domain, or onboarding@resend.dev for local testing.",
      example: "onboarding@resend.dev",
      name: "EMAIL_FROM",
    },
    {
      description: "Webhook signing secret from resend.com/webhooks.",
      example: "whsec_placeholder",
      name: "RESEND_WEBHOOK_SECRET",
      when: "answers.webhooks",
    },
  ],
  hosts: ["app-router-src", "app-router-no-src"],
  name: "resend",
  prompts: [
    {
      default: true,
      id: "starterUi",
      message: "Generate a starter email form?",
      type: "confirm",
    },
    {
      default: false,
      id: "webhooks",
      message: "Add a webhook route for delivery events?",
      type: "confirm",
    },
  ],
  steps: [
    {
      files: [create("lib/email/resend.ts")],
      id: "client",
      manualSteps: [
        {
          blocking: true,
          description:
            "Create an API key at https://resend.com/api-keys and set RESEND_API_KEY in .env.",
          title: "Create a Resend API key",
          when: "before",
        },
      ],
      title: "Create the Resend client",
      verify:
        "The dev server still starts. Import `resend` from `@/lib/email/resend` with no type errors.",
      why: "One shared client instead of one per request. It throws at import if the key is missing, so a bad setup fails at boot rather than at the first send.",
    },
    {
      files: [create("lib/email/send.ts")],
      id: "send-helper",
      manualSteps: [
        {
          blocking: true,
          description:
            "Verify a domain at https://resend.com/domains, or use onboarding@resend.dev for local development, and set EMAIL_FROM.",
          title: "Choose a sender address",
          when: "after",
        },
      ],
      title: "Add a typed send function",
      verify:
        "Call `sendWelcome()` from a server component and you get `{ ok: true, id }` back.",
      why: "Keeps the from address and subject in one place. Resend returns { data, error } instead of throwing, and this turns that into a result you can switch on.",
    },
    {
      files: [create("lib/validations/email.ts")],
      id: "validation",
      title: "Add the input schema",
      verify:
        "`welcomeEmailSchema.safeParse({ email: 'nope', name: 'A' })` returns `success: false`.",
      why: "Validate on the server, always. A client-side check is a convenience, not a guard.",
    },
    {
      files: [create("lib/actions/email.ts")],
      id: "server-action",
      title: "Wire the server action",
      verify:
        "Call the action with a bad address and you get `{ ok: false }`, not an exception.",
      why: "Sending must stay on the server so the API key never reaches the browser. The action never throws, so the form always gets a result it can show.",
    },
    {
      files: [
        create("components/email-form.tsx", "answers.starterUi"),
        { ...create("app/page.tsx", "answers.starterUi"), replaces: true },
      ],
      id: "starter-ui",
      title: "Add the email form",
      verify:
        "Open the home page and submit the form. The email lands in your inbox within a few seconds.",
      why: "Proves the whole path end to end, and gives you something to delete later.",
    },
    {
      files: [create("app/api/webhooks/resend/route.ts", "answers.webhooks")],
      id: "webhook",
      manualSteps: [
        {
          blocking: false,
          condition: "answers.webhooks",
          description:
            "Add an endpoint at https://resend.com/webhooks pointing at https://yourdomain.com/api/webhooks/resend, and copy its signing secret into RESEND_WEBHOOK_SECRET.",
          title: "Register the webhook endpoint",
          when: "after",
        },
      ],
      title: "Receive delivery events",
      verify:
        "Send a test event from the Resend dashboard. The route logs it and returns 200.",
      why: "Resend tells you what happened after the send: delivered, bounced or marked as spam. It reads the raw body because re-serialising JSON breaks the signature.",
    },
  ],
  supports: { next: ["16"], orm: ["none"], router: ["app"] },
  tier: "free",
  title: "Resend Email Integration",
  version: "0.1.0",
} satisfies RecipeManifestInput;
