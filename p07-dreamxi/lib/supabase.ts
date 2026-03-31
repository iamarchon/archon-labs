import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function canCreate(url: string | undefined, key: string | undefined): boolean {
  return Boolean(url && key);
}

function required(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

export function createBrowserSupabaseClient(): SupabaseClient {
  const url = required(supabaseUrl, "Missing required Supabase env vars for browser client");
  const key = required(supabaseAnonKey, "Missing required Supabase env vars for browser client");

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function createServerSupabaseClient(): SupabaseClient {
  const url = required(supabaseUrl, "Missing required Supabase env vars for server client");
  const key = required(serviceRoleKey, "Missing required Supabase env vars for server client");

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase = canCreate(supabaseUrl, serviceRoleKey)
  ? createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : canCreate(supabaseUrl, supabaseAnonKey)
    ? createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const supabaseAdmin = canCreate(supabaseUrl, serviceRoleKey)
  ? createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
