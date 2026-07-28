import { signIn } from "@/auth";

export function OAuthButtons() {
  return (
    <div className="flex gap-2 ">
      {(["google", "github"] as const).map((provider) => (
        <form
          key={provider}
          className="border px-2 py-1 rounded-sm border-white/60"
          action={async () => {
            "use server";
            await signIn(provider, { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit">Continue with {provider}</button>
        </form>
      ))}
    </div>
  );
}
