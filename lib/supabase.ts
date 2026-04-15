import { createClient } from '@supabase/supabase-js';

// TODO: Adicione sua URL e Anon Key do Supabase aqui
const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uviW7D78bKzNa5Zxfohvwg_7B4FiEv4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
