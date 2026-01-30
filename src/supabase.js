import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jribfnztzwekgmjtykbs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Pf6YtRbiRx-l0gMOgTjcFQ_ngMm4QB1';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);