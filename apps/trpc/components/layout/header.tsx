"use client";

export default function Header() {
  return (
    <nav className="absolute top-0 left-0 flex h-[70px] w-screen items-center justify-end text-background">
      <a
        className="mr-5 underline underline-offset-2"
        href="https://www.cnippet.dev"
        target="_blanck"
      >
        Cnippet
      </a>
      <a
        className="mr-5 underline underline-offset-2"
        href="https://stack.cnippet.dev"
        target="_blanck"
      >
        Cnippet.Stack
      </a>
    </nav>
  );
}
