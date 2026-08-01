# authjs recipe

List of files which are essential to this template and additional files for usage.

## Priority Files

- prisma.config.ts

- prisma/schema.ts

- lib/dal.ts
- lib/rate-limit.ts

- lib/actions/sign-in.ts
- lib/actions/sign-out.ts
- lib/actions/sign-up.ts

- lib/auth/auth.ts
- lib/auth/auth-client.ts

- lib/config/env.ts

- lib/db/prisma.ts

- lib/validations/auth.schema.ts

## Priority Components

- components/auth/signin-form.tsx (require cnippet components)
- components/auth/signup-form.tsx (require cnippet components)
- components/auth/oauth-buttons.tsx (require cnippet components)
- components/auth/signout-button.tsx (require cnippet components)
- components/auth/enable-2fa.tsx (require cnippet components)

## Priority Route

- api/auth/[...nextauth]/route.ts

## Priority Layout

- app/layout.tsx (wrap the app with toast provider)

## Added Files

- proxy.ts

## Added UI

- app/(auth)/login/page.tsx
- app/(auth)/two-factor/page.tsx
- app/(auth)/register/page.tsx

## .env variables

```ts
DATABASE_URL = "postgres_db_url(neonDB))";
NEXT_PUBLIC_APP_URL = "your_app_url"

BETTER_AUTH_SECRET = "string_to_encrypt_JWT";
BETTER_AUTH_URL="your_app_url";
NEXT_PUBLIC_BETTER_AUTH_URL="your_public_url";

GOOGLE_CLIENT_ID = "clientID_of_project_from_cloud_console(OAuth)";
GOOGLE_CLIENT_SECRET = "clientSecret_of_project_from_cloud_console";

GITHUB_CLIENT_ID = "clientID_from_github(OAuth)";
GITHUB_CLIENT_SECRET = "clientID_from_github";
```
