import { createClient } from '@supabase/supabase-js';

// TODO: Adicione sua URL e Anon Key do Supabase aqui
const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdmJmd3JuamdmcnpxbndjZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzEwOTUsImV4cCI6MjA5MTc0NzA5NX0._k8ebXtxJxMUAztDuFeJRPZ2qdJhUh83BCGuoxps_gw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
