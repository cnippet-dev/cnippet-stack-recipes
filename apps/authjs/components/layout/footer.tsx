"use client";

import { useSession } from "next-auth/react";
import { SignOutButton } from "../auth/signout-button";

export default function Footer() {
  const { data: session } = useSession();
  return (
    <footer className="h-[70px] w-screen absolute bottom-0 left-0 flex items-center justify-end">
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
