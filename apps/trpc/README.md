# tRPC recipe
List of files which are essential to this template and additional files for usage.


> Important: Update all the RSA policies. Current policies leave the application very vulnerable.
> Also configure next.config.ts with your supabase credentials

## Priority Files

- lib/validations/post.schema.ts
- lib/actions/posts/dal.ts
- lib/action-result.ts
- lib/db/prisma.ts

- prisma/

- trpc/

## Priority Components

- components/layout/create.tsx (require cnippet components)
- components/layout/read.tsx (require cnippet components)
- components/layout/update.tsx (require cnippet components)
- components/layout/delete.tsx (require cnippet components)

## Priority Layout

- app/layout.tsx (wrap the app with toast provider)
- app/page.tsx

## .env variables

```ts
DATABASE_URL = "postgresql://root:<password>@localhost:5432/trpc";
```