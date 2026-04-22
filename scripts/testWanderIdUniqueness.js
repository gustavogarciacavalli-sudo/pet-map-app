const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdmJmd3JuamdmcnpxbndjZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzEwOTUsImV4cCI6MjA5MTc0NzA5NX0._k8ebXtxJxMUAztDuFeJRPZ2qdJhUh83BCGuoxps_gw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWanderIdSecurity() {
    console.log("🛠️  Iniciando bateria de testes de SEGURANÇA do Wander-ID...\n");

    const TEST_WANDER_ID = '#WP-SECURITY-TEST';
    const TEST_USER_ID = '00000000-0000-0000-0000-000000000006';
    const TEST_USER_2_ID = '00000000-0000-0000-0000-000000000007';

    // LIMPEZA PRÉVIA
    await supabase.from('profiles').delete().in('id', [TEST_USER_ID, TEST_USER_2_ID]);

    try {
        // --- TESTE 1: UNICIDADE ---
        console.log("1️⃣  TESTE DE UNICIDADE...");
        await supabase.from('profiles').insert([{ id: TEST_USER_ID, name: 'Dono Original', wander_id: TEST_WANDER_ID }]);
        
        const { error: dupeError } = await supabase.from('profiles').insert([
            { id: TEST_USER_2_ID, name: 'Impostor', wander_id: TEST_WANDER_ID }
        ]);

        if (dupeError && dupeError.code === '23505') {
            console.log("✅ Sucesso: O banco impediu um ID duplicado.");
        } else {
            console.error("❌ FALHA: O banco permitiu um ID duplicado ou deu erro desconhecido.");
        }

        // --- TESTE 2: IMUTABILIDADE ---
        console.log("\n2️⃣  TESTE DE IMUTABILIDADE...");
        const { error: updateError } = await supabase.from('profiles')
            .update({ wander_id: '#WP-HACKED-ID' })
            .eq('id', TEST_USER_ID);

        if (updateError && updateError.message.includes('imutável')) {
            console.log("✅ Sucesso: O banco impediu a alteração do Wander-ID!");
            console.log(`💬 Mensagem do Banco: "${updateError.message}"`);
        } else if (!updateError) {
            console.error("❌ FALHA CRÍTICA: O banco permitiu alterar um ID que deveria ser imutável!");
        } else {
            console.error("❌ Erro inesperado no teste de imutabilidade:", updateError.message);
        }

    } catch (e) {
        console.error("Erro fatal no script:", e.message);
    } finally {
        await supabase.from('profiles').delete().in('id', [TEST_USER_ID, TEST_USER_2_ID]);
        console.log("\n✨ Bateria de testes finalizada.");
    }
}

testWanderIdSecurity();
