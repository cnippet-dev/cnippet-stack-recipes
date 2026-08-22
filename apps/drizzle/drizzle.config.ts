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
  schema: "./lib/db/schema.ts",
  verbose: true,
});
