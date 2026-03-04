import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server Actions).
 * Uses the anon key + RLS — respects user permissions automatically.
 * Note: not generically typed — @supabase/ssr 0.6.x imports GenericSchema from a
 * path that no longer exists in @supabase/supabase-js 2.98+. Use explicit casts
 * in callers. Replace once Supabase gen types output is stable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): ReturnType<typeof createServerClient<any>> {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: object }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  );
}

/**
 * Admin Supabase client (service role — bypasses RLS).
 * Uses supabase-js directly (not @supabase/ssr) so the service role key is
 * sent as a plain Authorization header with no cookie interference.
 * ONLY use in trusted server-side code (API routes, migrations, webhooks).
 * NEVER expose to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
