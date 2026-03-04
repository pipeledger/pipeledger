import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Note: not generically typed because @supabase/ssr 0.6.x imports from a
 * path that no longer exists in @supabase/supabase-js 2.98+. Use server
 * components for type-safe queries; this client is for auth + mutations.
 * Replace with typed version once Supabase auto-generates types:
 *   npx supabase gen types typescript --project-id gvzcqmyvdzbjwoiisbhr
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): ReturnType<typeof createBrowserClient<any>> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
