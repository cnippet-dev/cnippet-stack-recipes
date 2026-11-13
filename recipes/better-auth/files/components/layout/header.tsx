"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/auth/signout-button";
import { authClient } from "@/lib/auth/auth-client";

export function Header() {
  const { data: session } = authClient.useSession();

  return (
    <nav className="flex h-[70px] w-full items-center justify-end gap-5 px-5 text-sm">
      {session ? (
        <>
          <Link className="underline underline-offset-2" href="/dashboard">
            Dashboard
          </Link>
          {session.user.role === "admin" && (
            <Link
              className="underline underline-offset-2"
              href="/dashboard/admin"
            >
              Admin
            </Link>
          )}
          <Link className="underline underline-offset-2" href="/profile">
            Profile
          </Link>
          <SignOutButton />
        </>
      ) : (
        <>
          <Link className="underline underline-offset-2" href="/login">
            Sign in
          </Link>
          <Link className="underline underline-offset-2" href="/register">
            Create account
          </Link>
        </>
      )}
    </nav>
  );
}
