const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uviW7D78bKzNa5Zxfohvwg_7B4FiEv4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    console.log("--- PROFILES COLUMN CHECK ---");
    
    // Tentamos buscar uma linha para ver o retorno
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error) {
        console.error("Erro:", error.message);
    } else {
        console.log("Colunas disponíveis no primeiro registro (se houver):", data[0] ? Object.keys(data[0]) : "Nenhum dado para mostrar colunas.");
        
        // Se não houver dados, tentamos um select de colunas específicas que suspeitamos existir
        const specificColumns = ['id', 'name', 'email', 'wander_id', 'avatar', 'coins', 'gems', 'xp', 'level'];
        console.log("Testando existência de colunas específicas...");
        for (const col of specificColumns) {
            const { error: cError } = await supabase.from('profiles').select(col).limit(1);
            console.log(`[${cError ? ' ' : 'x'}] ${col}${cError ? ' (Erro: ' + cError.message + ')' : ''}`);
        }
    }
    
    console.log("--- FIM DO CHECK ---");
}

checkColumns();
