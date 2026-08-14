"use server";

// Better-auth usage
export async function getCurrentUser() {
  //   const session = await auth.api.getSession({
  //     headers: await headers(),
  //   });
  const session = { user: { id: 123 } };

  if (!session?.user) {
    return null;
  }

  return session.user;
}
