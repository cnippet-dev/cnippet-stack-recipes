import { signIn } from "@/auth";
import { oauthProviders } from "@/auth.config";
import { Button } from "@/components/ui/button";

// A provider is either a config object or a function that returns one.
const providers = oauthProviders.map((provider) => {
  const { id, name } = typeof provider === "function" ? provider() : provider;
  return { id, name };
});

export function OAuthButtons() {
  if (providers.length === 0) return null;

  return (
    <div className="flex gap-2">
      {providers.map(({ id, name }) => (
        <form
          action={async () => {
            "use server";
            await signIn(id, { redirectTo: "/dashboard" });
          }}
          className="w-full rounded-sm border border-white/60 px-1"
          key={id}
        >
          <Button className="w-full rounded-xs" type="submit" variant="outline">
            {name}
          </Button>
        </form>
      ))}
    </div>
  );
}
