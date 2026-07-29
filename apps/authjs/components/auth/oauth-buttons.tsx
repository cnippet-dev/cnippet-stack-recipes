import { GitBranch } from "lucide-react";
import { signIn } from "@/auth";
import { Button } from "../ui/button";

export function OAuthButtons() {
  return (
    <div className="flex gap-2">
      {(["google", "github"] as const).map((provider) => (
        <form
          action={async () => {
            "use server";
            await signIn(provider, { redirectTo: "/dashboard" });
          }}
          className="w-full rounded-sm border border-white/60 px-1"
          key={provider}
        >
          <Button className="w-full rounded-xs" type="submit" variant="outline">
            {provider === "google" ? (
              <p className="font-semibold text-[17px]">G</p>
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
