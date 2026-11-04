import { createClient } from "@supabase/supabase-js";

/** Never import this module into a Client Component. Service role bypasses RLS. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
