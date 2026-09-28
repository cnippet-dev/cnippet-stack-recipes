import { defineRecipe } from "../../scripts/define-recipe";

// `app/...` sources land in the app dir, everything else under srcDir.
const create = (source: string) => ({
  source,
  strategy: "create" as const,
  target: source.startsWith("app/")
    ? `{{appDir}}${source.slice("app/".length)}`
    : `{{srcDir}}${source}`,
});

// SQL files are read by the Supabase CLI from the project root.
const sql = (source: string) => ({
  source,
  strategy: "create" as const,
  target: source,
});

export default defineRecipe({
  category: "database",
  cnippetUiComponents: [
    "accordion",
    "badge",
    "button",
    "card",
    "dialog",
    "field",
    "form",
    "input",
    "label",
    "spinner",
    "textarea",
    "toast",
  ],
  dependencies: [
    "@supabase/ssr@^0.12.5",
    "@supabase/supabase-js@^2.112.4",
    "zod@^4.5.4",
  ],
  description:
    "Supabase Postgres and Storage with cookie-based SSR clients, an RPC for transactional inserts, row-level security and a media upload example.",
  envVars: [
    {
      description: "Project URL from Project Settings → API.",
      example: "https://your-project.supabase.co",
      name: "NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      description: "Publishable (anon) key from Project Settings → API keys.",
      example: "sb_publishable_your-key",
      name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    },
  ],
  hosts: ["app-router-src", "app-router-no-src"],
  name: "supabase",

  steps: [
    {
      files: [
        sql("supabase/migrations/20260902051702_create_posts.sql"),
        sql("supabase/migrations/20260902144010_create_post_with_tags.sql"),
        sql("supabase/migrations/20260904060354_create_media_table.sql"),
        sql("supabase/migrations/20260904093522_media_read_policy.sql"),
        sql("supabase/demo-public-write.sql"),
      ],
      id: "database",
      manualSteps: [
        {
          blocking: true,
          description:
            "Create a project at supabase.com, then run `supabase init` and `supabase link --project-ref <ref>` in your app.",
          title: "Create and link a Supabase project",
          when: "before",
        },
        {
          blocking: true,
          description:
            "Run `supabase db push` to apply the migrations, then create a Storage bucket named `post-media`.",
          title: "Apply migrations and create the bucket",
          when: "after",
        },
        {
          blocking: true,
          description:
            "Row-level security is on and the tables are READ-ONLY for anonymous users, so creating, editing, deleting and uploading will fail until you allow it. For production, add policies scoped to auth.uid(). For a throwaway local demo only, copy supabase/demo-public-write.sql into supabase/migrations/ — it lets anyone with your publishable key change or delete all data.",
          title: "Decide who may write data",
          when: "after",
        },
      ],
      title: "Create the tables, RPC and RLS policies",
      verify:
        "In the Supabase dashboard, posts, tags, post_tags and post_media exist with RLS enabled.",
      why: "Migrations create the tables and an RPC that inserts a post and its tags in one transaction. RLS starts read-only so a new project is never publicly writable.",
    },
    {
      files: [create("types/supabase.ts")],
      id: "types",
      manualSteps: [
        {
          blocking: false,
          description:
            "After changing the schema, run `supabase gen types typescript --linked > types/supabase.ts`.",
          title: "Regenerate database types",
          when: "after",
        },
      ],
      title: "Add the generated database types",
      verify:
        "Import `Database` from `@/types/supabase` — no TypeScript errors.",
      why: 'Typed clients make `.from("posts")` and RPC arguments checked at compile time. The file is generated from your schema by the Supabase CLI.',
    },
    {
      files: [
        create("utils/supabase/client.ts"),
        create("utils/supabase/server.ts"),
        create("utils/supabase/middleware.ts"),
        create("proxy.ts"),
      ],
      id: "clients",
      title: "Create the browser, server and proxy clients",
      verify:
        "Load any page — no errors, and an sb- auth cookie refresh happens in proxy.ts.",
      why: "Supabase needs a different client per runtime. proxy.ts refreshes the session cookie on every request so server components see a valid session.",
    },
    {
      files: [
        create("lib/validations/post.schema.ts"),
        create("lib/actions/posts/createPostsActions.ts"),
        create("lib/actions/posts/fetchPostsActions.ts"),
        create("lib/actions/posts/updatePostActions.ts"),
        create("lib/actions/posts/deletePostActions.ts"),
      ],
      id: "post-actions",
      title: "Add the post server actions",
      verify:
        "Call `fetchPostsAction()` — it returns `{ success: true, data: [] }`.",
      why: "Actions validate with Zod and talk to Postgres through the typed server client. Creation goes through the RPC so tags are never half-written.",
    },
    {
      files: [
        create("lib/actions/storage/storage.ts"),
        {
          injection: { anchor: "nextConfig", kind: "add-object-property" },
          source: "next.config.images.txt",
          strategy: "ast-inject",
          target: "next.config.ts",
        },
      ],
      id: "storage-actions",
      manualSteps: [
        {
          blocking: true,
          description:
            "In next.config.ts, replace `url.supabase.co` in images.remotePatterns with your project's host (the host part of NEXT_PUBLIC_SUPABASE_URL).",
          title: "Allow your Supabase host for next/image",
          when: "after",
        },
      ],
      title: "Add upload, list and delete for Storage",
      verify:
        "Upload a file from /storage — it appears in the post-media bucket.",
      why: "Files go to a Storage bucket and a post_media row records each one. next/image must be told which remote host serves them.",
    },
    {
      files: [
        create("components/layout/create.tsx"),
        create("components/layout/read.tsx"),
        create("components/layout/update.tsx"),
        create("components/layout/delete.tsx"),
        create("components/layout/header.tsx"),
        create("components/layout/footer.tsx"),
        create("app/(supabase)/layout.tsx"),
        create("app/(supabase)/posts/page.tsx"),
      ],
      id: "starter-ui",
      title: "Add the starter CRUD UI",
      verify:
        "Visit /posts — reading works; writes work once you have allowed them.",
      why: "Four cards that exercise every post action. Built from Cnippet UI components.",
    },
    {
      files: [
        create("components/layout/uploadForm.tsx"),
        create("components/layout/mediaZone.tsx"),
        create("app/(supabase)/storage/page.tsx"),
      ],
      id: "storage-ui",
      title: "Add the media upload page",
      verify: "Visit /storage — upload an image and see it in the grid.",
      why: "An upload form and a grid of public URLs from the bucket, with delete.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["none"],
    router: ["app"],
  },
  tier: "free",
  title: "Supabase",
  version: "0.1.0",
});
