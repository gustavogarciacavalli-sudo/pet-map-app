const { createClient } = require('@supabase/supabase-js');

// Configuração manual para o diagnóstico (usando as chaves do projeto)
const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uviW7D78bKzNa5Zxfohvwg_7B4FiEv4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
    console.log("--- DIAGNÓSTICO SUPABASE ---");
    
    // 1. Verificar Perfis
    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, name, wander_id');
    if (pError) console.error("Erro ao buscar perfis:", pError.message);
    else console.log(`Perfis encontrados: ${profiles.length}`, profiles.map(p => p.wander_id));

    // 2. Verificar Grupos
    const { data: groups, error: gError } = await supabase.from('groups').select('id, name');
    if (gError) console.error("Erro ao buscar grupos:", gError.message);
    else console.log(`Grupos encontrados: ${groups.length}`, groups.map(g => g.name));

    // 3. Verificar Amizades
    const { data: friends, error: fError } = await supabase.from('friendships').select('id, status');
    if (fError) console.error("Erro ao buscar amizades:", fError.message);
    else console.log(`Total de registros de amizade: ${friends.length}`);

    console.log("--- FIM DO DIAGNÓSTICO ---");
}

diagnose();
