import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("No database url!");

export const db = drizzle(connectionString);
