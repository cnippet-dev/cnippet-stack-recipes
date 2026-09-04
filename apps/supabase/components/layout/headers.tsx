"use client";

import Link from "next/link";

export default function Header() {
  return (
    <nav className="absolute top-0 left-0 flex h-[70px] w-screen items-center justify-end text-background">
      <Link className="mr-5 underline underline-offset-2" href="/storage">
        supabase storage
      </Link>
    </nav>
  );
}
