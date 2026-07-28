import bcrypt from "bcryptjs";
import prisma from "../prisma";
import { loginSchema } from "../validations/auth.schema";
import {
  InvalidCredentialsError,
  OAuthOnlyAccountError,
} from "../errors/auth-errors";

export async function authorizeCredentials(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !user.passwordHash) {
    if (user) throw new OAuthOnlyAccountError();
    throw new InvalidCredentialsError();
  }

  const valid = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );
  if (!valid) throw new InvalidCredentialsError();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
