const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/profile"];

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function canAccessRoute(
  auth: { user?: unknown } | null,
  pathname: string,
): boolean {
  const isLoggedIn = !!auth?.user;
  if (isProtectedRoute(pathname)) return isLoggedIn;
  return true;
}
