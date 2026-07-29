"use client";

import { useEffect, useState } from "react";

export default function Profile() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/me")
      .then((res) => {
        if (!res) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white text-xl uppercase tracking-widest">
      {loading ? "Loading..." : `${user?.email} • ${user?.role}`}
    </div>
  );
}
