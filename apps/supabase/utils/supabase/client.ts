import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("No SUPABASE_URL or SUPABASE_KEY");
}

const SUPABASE_URL: string = supabaseUrl;
const SUPABASE_KEY: string = supabaseKey;

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
