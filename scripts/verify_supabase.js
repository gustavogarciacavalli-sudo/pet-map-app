const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uviW7D78bKzNa5Zxfohvwg_7B4FiEv4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
    console.log("--- VERIFICANDO AMBIENTE SUPABASE ---");

    const tables = ['profiles', 'locations', 'friendships', 'groups', 'social_likes', 'recommendations'];

    for (const table of tables) {
        process.stdout.write(`Verificando tabela '${table}'... `);
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ ERRO: ${error.code} - ${error.message}`);
        } else {
            console.log("✅ OK");
        }
    }

    console.log("\n--- TESTANDO INSERÇÃO ---");
    const testId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Test UUID
    const { error: insertError } = await supabase.from('profiles').insert([{ id: testId, name: 'Test Bot', wander_id: '#TEST' }]);
    if (insertError) {
        console.log(`❌ Falha ao inserir perfil: ${insertError.code} - ${insertError.message}`);
    } else {
        console.log("✅ Sucesso ao inserir perfil!");
        await supabase.from('profiles').delete().eq('id', testId);
    }

    console.log("--- FIM DA VERIFICAÇÃO ---");
}

verify();
