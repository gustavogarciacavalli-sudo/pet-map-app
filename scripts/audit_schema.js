const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uviW7D78bKzNa5Zxfohvwg_7B4FiEv4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listSchema() {
    console.log("--- SCHEMA AUDIT ---");
    
    // Lista tabelas públicas através de uma query RPC ou consulta de nomes comuns
    // Como não temos RPC definida, vamos tentar dar um select em tabelas que DEVEM existir
    const tables = ['profiles', 'groups', 'clans', 'friendships', 'messages', 'expeditions', 'locations', 'pets'];
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`[ ] ${table}: FALHA (${error.message})`);
        } else {
            console.log(`[x] ${table}: OK`);
        }
    }
    
    console.log("--- FIM DO AUDIT ---");
}

listSchema();
