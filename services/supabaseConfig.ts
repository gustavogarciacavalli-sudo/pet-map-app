import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE (WanderPet)
 */
const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uviW7D78bKzNa5Zxfohvwg_7B4FiEv4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
