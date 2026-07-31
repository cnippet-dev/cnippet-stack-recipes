# authjs recipe

List of files which are essential to this template and additional files for usage.

## Priority Files

- auth.config.ts
- auth.ts
- prisma.config.ts

- prisma/schema.ts

- lib/dal.ts
- lib/primsa.ts

- lib/actions/login.ts
- lib/actions/register.ts
- lib/actions/signout.ts

- lib/auth/authorize-credentials.ts
- lib/auth/route-guard.ts

- lib/errors/auth-error.ts
- lib/errors/handle-auth-errors.ts

- lib/validations/auth.schema.ts

- types/next-auth.d.ts (also modify tsconfig.json to include this file if not included)

## Priority Components

- components/auth/login-form.tsx (require cnippet components)
- components/auth/register-form.tsx (require cnippet components)
- components/auth/oauth-buttons.tsx (require cnippet components)
- components/auth/signout-button.tsx (require cnippet components)

- components/session-provider.tsx

## Priority Route

- api/auth/[...nextauth]/route.ts

## Priority Layout

- app/layout.tsx (wrap the app with session provider)

## Added Files

- proxy.ts

## Added UI

- app/(auth)/login/page.tsx
- app/(auth)/register/page.tsx

## .env variables

```ts
DATABASE_URL = "postgres_db_url(neonDB))";

AUTH_SECRET = "string_to_encrypt_JWT";

AUTH_GOOGLE_ID = "clientID_of_project_from_cloud_console(OAuth)";
AUTH_GOOGLE_SECRET = "clientSecret_of_project_from_cloud_console";

AUTH_GITHUB_ID = "clientID_from_github(OAuth)";
AUTH_GITHUB_SECRET = "clientID_from_github";
```
