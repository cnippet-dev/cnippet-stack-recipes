import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) throw new Error("No database url!");

export default defineConfig({
  dbCredentials: {
    url: DATABASE_URL,
  },
  dialect: "postgresql",
  out: "./migrations",
  // #if detection.srcDir
  schema: "./src/lib/db/schema.ts",
  // #else
  schema: "./lib/db/schema.ts",
  // #endif
  verbose: true,
});
