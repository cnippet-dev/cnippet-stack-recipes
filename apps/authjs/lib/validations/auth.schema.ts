import z from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Use at least 10 characters.").max(128),
});
