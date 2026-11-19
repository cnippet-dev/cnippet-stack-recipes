"use client";

import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth/signout-button";

export default function Footer() {
  const { data: session } = useSession();
  return (
    <footer className="mt-auto flex h-[70px] w-full items-center justify-end">
      {session?.user ? (
        <div className="mr-5">
          <SignOutButton />
        </div>
      ) : (
        <p className="mr-5">auth.js</p>
      )}
    </footer>
  );
}
