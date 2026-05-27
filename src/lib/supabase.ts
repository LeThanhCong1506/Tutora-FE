import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu biến môi trường Supabase! Hãy kiểm tra file .env");
}

// Public anon client — safe to ship to the browser. Used for Supabase Auth
// flows (password reset emails, magic links) that don't need elevated privileges.
//
// ⚠️ NEVER add a service-role client here. Anything that needs to bypass
// Row Level Security (private bucket uploads, auth.admin.*, cross-user reads,
// etc.) MUST run on the backend, where the service-role key stays in env vars
// and never reaches the bundle.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
