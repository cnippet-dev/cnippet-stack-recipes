import "dotenv/config";
import { defineConfig } from "prisma/config";

// This host only runs `prisma generate` (CI composition), which never
// connects. `env()` throws when DATABASE_URL is unset, so read it directly.
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
});
