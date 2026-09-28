import bcrypt from "bcryptjs";
import { InvalidCredentialsError } from "../errors/auth-errors";
import prisma from "../prisma";
import { loginSchema } from "../validations/auth.schema";

export async function authorizeCredentials(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
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
