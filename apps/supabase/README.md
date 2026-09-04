# Supabase recipe
List of files which are essential to this template and additional files for usage.

> Important: Update all the RSA policies. Current policies leave the application very vulnerable.
> Also configure next.config.ts with your supabase credentials

## Priority Files

- lib/actions/posts/createPostsActions.ts
- lib/actions/posts/fetchPostActions.ts
- lib/actions/posts/updatePostActions.ts
- lib/actions/posts/deletePostActions.ts

- lib/actions/storage/storage.ts

- lib/api/errors.ts
- lib/api/handler.ts
- lib/api/rate-limit.ts
- lib/api/responses.ts
- lib/api/validate.ts

- lib/db/prisma.ts

- lib/validations/post.schema.ts

- supabase/

- utils/supabase/admin.ts
- utils/supabase/client.ts
- utils/supabase/server.ts
- utils/supabase/middleware.ts

- next.config.ts

## Priority Components

- components/layout/create.tsx (require cnippet components)
- components/layout/read.tsx (require cnippet components)
- components/layout/update.tsx (require cnippet components)
- components/layout/delete.tsx (require cnippet components)
- components/layout/mediaZone.tsx (require cnippet components)
- components/layout/uploadForm.tsx (require cnippet components)

## Priority Layout

- app/layout.tsx (wrap the app with toast provider)
- app/page.tsx

## .env variables

```ts
NEXT_PUBLIC_SUPABASE_URL = "https://url.supabase.co";
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ="sb_publishable_"

SUPABASE_SECRET_KEY="sb_secret_key"
SUPABASE_ACCESS_TOKEN="sbp_key"
```