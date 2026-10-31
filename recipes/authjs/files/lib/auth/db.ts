import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@/app/generated/prisma/client";
// Every database call Auth.js and this recipe make goes through this file.
// If your Prisma client lives somewhere else, this is the only import to change.
import prisma from "@/lib/db/prisma";

export const adapter = PrismaAdapter(prisma);

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

/** Returns null when the email is already taken. */
export async function createUser(data: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  try {
    return await prisma.user.create({ data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

export function getProfile(id: string) {
  return prisma.user.findUniqueOrThrow({
    include: { accounts: { select: { provider: true } } },
    where: { id },
  });
}
