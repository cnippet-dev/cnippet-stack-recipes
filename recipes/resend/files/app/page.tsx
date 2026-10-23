import { EmailForm } from "@/components/email-form";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-semibold text-2xl">Resend recipe test</h1>
      <EmailForm />
    </main>
  );
}
