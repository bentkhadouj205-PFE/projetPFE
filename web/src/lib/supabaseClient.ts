import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://uvmruxcjpgovdrwvykyn.supabase.co',
  'sb_publishable_GF__NHm1x5YVLBdPIA5hsw_FauKPiRA',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'register',
    },
  }
);