"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();
  return (
    <nav className="flex h-[70px] w-full items-center justify-end">
      {session?.user ? (
        session?.user.role === "ADMIN" ? (
          <Link
            className="mr-5 underline underline-offset-2"
            href="/dashboard/admin"
          >
            Admin Dashboard
          </Link>
        ) : (
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
