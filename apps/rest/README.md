# REST recipe
List of files which are essential to this template and additional files for usage.

## Priority Files

- prisma.config.ts

- prisma/schema.ts

- lib/actions/dal.ts

- lib/api/errors.ts
- lib/api/handler.ts
- lib/api/rate-limit.ts
- lib/api/responses.ts
- lib/api/validate.ts

- lib/db/prisma.ts

- lib/services/post.service.ts

- lib/utils/env.ts

- lib/validations/post.ts

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

UPSTASH_REDIS_REST_URL="https://your.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token-asdfas0jpiuhewqnaskjdbxzmcoaidhf"
```
