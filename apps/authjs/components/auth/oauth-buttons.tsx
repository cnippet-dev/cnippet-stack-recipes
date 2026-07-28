import { signIn } from "@/auth";
import { Button } from "../ui/button";
import { GitBranch } from "lucide-react";

export function OAuthButtons() {
  return (
    <div className="flex gap-2 ">
      {(["google", "github"] as const).map((provider) => (
        <form
          key={provider}
          className="border px-1 rounded-sm border-white/60 w-full"
          action={async () => {
            "use server";
            await signIn(provider, { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit" variant="outline" className="rounded-xs w-full">
            {provider === "google" ? (
              <p className="text-[17px] font-semibold">G</p>
            ) : (
              <GitBranch />
            )}
            {provider}
          </Button>
        </form>
      ))}
    </div>
  );
}
