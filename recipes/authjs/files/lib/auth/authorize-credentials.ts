import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/auth/db";
import { InvalidCredentialsError } from "@/lib/errors/auth-errors";
import { loginSchema } from "@/lib/validations/auth.schema";

export async function authorizeCredentials(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await findUserByEmail(parsed.data.email);
  if (!user?.passwordHash) throw new InvalidCredentialsError();

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) throw new InvalidCredentialsError();

  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role,
  };
}
