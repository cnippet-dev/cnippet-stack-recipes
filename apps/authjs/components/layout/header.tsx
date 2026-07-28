"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();
  return (
    <nav className="h-[70px] w-screen absolute top-0 left-0 flex items-center justify-end">
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
