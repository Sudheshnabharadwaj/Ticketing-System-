import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://fidilgpihfwfnwiugoxm.supabase.co';

const supabaseKey =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
  'sb_publishable_lD7DIwNLPX251RYYtXdkZw_l54ozMws';

export const supabase = createClient(supabaseUrl, supabaseKey);
