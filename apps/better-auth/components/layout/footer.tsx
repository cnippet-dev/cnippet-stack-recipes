"use client";

import { authClient } from "@/lib/auth/auth-client";
import { SignoutButton } from "../auth/signout-button";

export function Footer() {
  const { data: session } = authClient.useSession();

  return (
    <footer className="absolute bottom-0 left-0 flex h-[70px] w-screen items-center justify-end text-black">
      {session?.user ? (
        <div className="mr-5">
          <SignoutButton />
        </div>
      ) : (
        <p className="mr-5 text-black">auth.js</p>
      )}
    </footer>
  );
}
