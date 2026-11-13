import { z } from "zod";

// Same limits as emailAndPassword in lib/auth/auth.ts.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const signUpSchema = z.object({
  email: z.email("Enter a valid email address"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  password,
});

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
