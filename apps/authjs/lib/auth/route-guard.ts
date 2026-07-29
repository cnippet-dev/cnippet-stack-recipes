export function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

export function canAccessRoute(
  auth: { user?: unknown } | null,
  pathname: string,
): boolean {
  const isLoggedIn = !!auth?.user;
  if (isProtectedRoute(pathname)) return isLoggedIn;
  return true;
}
