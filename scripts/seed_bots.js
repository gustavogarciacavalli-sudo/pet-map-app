const { createClient } = require('@supabase/supabase-js');

// Use as mesmas chaves do app
const supabaseUrl = 'https://akvbfwrnjgfrzqnwcemc.supabase.co';
const supabaseAnonKey = 'sb_publishable_uviW7D78bKzNa5Zxfohvwg_7B4FiEv4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BOTS = [
    { name: 'Luna Bunny', species: 'bunny', level: 12 },
    { name: 'Rex Dog', species: 'dog', level: 8 },
    { name: 'Miau Cat', species: 'cat', level: 15 },
    { name: 'Oliver Fox', species: 'fox', level: 5 },
    { name: 'Bella Hamster', species: 'hamster', level: 3 },
    { name: 'Cooper Bear', species: 'bear', level: 20 },
    { name: 'Lola Pig', species: 'pig', level: 4 },
    { name: 'Toby Frog', species: 'frog', level: 2 },
];

async function seed() {
    console.log("🚀 Iniciando povoamento de Bots no WanderPet...");

    for (const bot of BOTS) {
        const id = require('crypto').randomUUID();
        const wander_id = `#WP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        console.log(`- Criando ${bot.name} (${wander_id})...`);

        // 1. Inserir Perfil (Removendo colunas inexistentes: avatar, xp)
        const { error: pError } = await supabase.from('profiles').insert([
            {
                id,
                name: bot.name,
                wander_id,
                email: `${bot.name.toLowerCase().replace(' ', '.')}@bot.wanderpet`,
                level: bot.level,
                coins: 100,
                gems: 10,
                // Espécie não existe como coluna? Vamos checar. O check_columns não mostrou 'species'.
                // Se o schema cache do Supabase estiver chato, vamos omitir tudo o que não vimos no check.
                security_question: 'Qual o seu pet favorito?',
                security_answer: bot.species || 'nenhum'
            }
        ]);

        if (pError) {
            console.warn(`  ⚠️ Erro no perfil de ${bot.name}: ${pError.message}`);
            continue;
        }

        // 2. Inserir Localização (perto de SP)
        const latOffset = (Math.random() - 0.5) * 0.1;
        const lngOffset = (Math.random() - 0.5) * 0.1;
        const { error: lError } = await supabase.from('locations').insert([
            {
                user_id: id,
                latitude: -23.5505 + latOffset,
                longitude: -46.6333 + lngOffset,
                ghost_mode: false
            }
        ]);

        if (lError) console.warn(`  ⚠️ Erro na localização de ${bot.name}: ${lError.message}`);
        else console.log(`  ✅ ${bot.name} criado com sucesso!`);
    }

    console.log("\n✨ Povoamento concluído!");
}

seed();
