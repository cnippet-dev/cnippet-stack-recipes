"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";

export function Header() {
  const { data: session } = authClient.useSession();

  return (
    <nav className="fixed top-0 left-0 flex h-[70px] w-screen items-center justify-end text-background">
      {session?.user ? (
        session?.user && (
          <>
            <Link
              className="mr-5 underline underline-offset-2"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link className="mr-5 underline underline-offset-2" href="/profile">
              Profile
            </Link>
          </>
        )
      ) : (
        <>
          <Link className="mr-5 underline underline-offset-2" href="/login">
            Login
          </Link>
          <Link className="mr-5 underline underline-offset-2" href="/register">
            Register
          </Link>
        </>
      )}
    </nav>
  );
}
