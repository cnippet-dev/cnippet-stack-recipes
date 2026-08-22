# drizzle recipe

List of files which are essential to this template and additional files for usage.

## Priority Files

- drizzle.config.ts

- prisma/schema.ts

- lib/actions/dal.ts

- lib/validations/post.ts

- lib/db/drizzle.ts
- lib/db/relations.ts
- lib/db/schema.ts


## Priority Components

- components/layout/create.tsx (require cnippet components)
- components/layout/read.tsx (require cnippet components)
- components/layout/update.tsx (require cnippet components)
- components/layout/delete.tsx (require cnippet components)

## Priority Route

- api/v1/post/route.ts
- api/v1/post/[id]/route.ts

## Priority Layout

- app/layout.tsx (wrap the app with toast provider)
- app/page.tsx

## .env variables

```ts
DATABASE_URL = "postgres_db_url(neonDB))";
NEXT_PUBLIC_APP_URL = "your_app_url"
API_URL= "your_api_url"
```
