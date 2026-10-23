import { z } from "zod";

export const welcomeEmailSchema = z.object({
  email: z.email("Enter a valid email address."),
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(50, "Name is too long."),
});

export type WelcomeEmailInput = z.infer<typeof welcomeEmailSchema>;
