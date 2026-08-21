import { neonConfig, Pool } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-serverless";
import { WebSocket } from "ws";
import { relations } from "./relations";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("No database url!");

neonConfig.webSocketConstructor = WebSocket;

const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, relations });
