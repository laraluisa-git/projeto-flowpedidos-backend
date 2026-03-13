import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Prefer a service-role key on the server to avoid RLS blocking writes.
// Fallback to the public/anon key only if you really want RLS + policies.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] SUPABASE_URL/SUPABASE_*KEY não configurados corretamente.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;