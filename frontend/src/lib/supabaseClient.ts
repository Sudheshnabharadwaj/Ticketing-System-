import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fidilgpihfwfnwiugoxm.supabase.co';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_lD7DIwNLPX251RYYtXdkZw_l54ozMws';

export const supabase = createClient(supabaseUrl, supabaseKey);
