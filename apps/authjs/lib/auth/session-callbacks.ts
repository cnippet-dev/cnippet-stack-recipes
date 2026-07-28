import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

type AuthUser = {
  id: string;
  role: "USER" | "ADMIN";
};

export async function jwtCallback({
  token,
  user,
}: {
  token: JWT;
  user?: AuthUser;
}) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
  }
  return token;
}

export async function sessionCallback({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}) {
  if (token) {
    session.user.id = token.id as string;
    session.user.role = token.role as "USER" | "ADMIN";
  }
  return session;
}
