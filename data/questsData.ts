export type QuestType = 'main' | 'daily' | 'weekly' | 'monthly';
export type QuestGoalType = 'distance' | 'coins' | 'level' | 'friends' | 'group' | 'group_members' | 'profile_pic' | 'shop_spend' | 'clan_event';

export interface QuestDef {
    id: string;
    type: QuestType;
    goalType: QuestGoalType;
    title: string;
    description: string;
    target: number; 
    reward: number; 
    xpReward: number; 
}

const TEMPLATES: Record<QuestGoalType, { titles: string[], descriptions: (val: number) => string }> = {
    distance: { 
        titles: ['Peregrino', 'Sola de Ferro', 'Marcha Infinita', 'Desbravador'], 
        descriptions: (val) => `Acumule ${(val/1000).toFixed(1).replace('.0', '')} km totais de exploração no mapa.`
    },
    coins: {
        titles: ['Tesouro Perdido', 'Toque de Midas', 'Cofre Cheio', 'Bilionário Canino'],
        descriptions: (val) => `Acumule o marco total de ${val} PetCoins no seu banco.`
    },
    level: {
        titles: ['Treinamento Árduo', 'Evolução Máxima', 'Força Oculta', 'Poder Supremo'],
        descriptions: (val) => `Alcance o Nível ${val} com o seu explorador.`
    },
    friends: {
        titles: ['Carismático', 'Socialite', 'Líder da Alcateia', 'O Influencer'],
        descriptions: (val) => `Adicione pelo menos ${val} amigos na Arena Social.`
    },
    group: {
        titles: ['Comunidade', 'Líder NATO', 'Guilda Forte', 'General'],
        descriptions: (val) => `Funde ou acesse pelo menos ${val} Clã/Grupo.`
    },
    group_members: {
        titles: ['Reino Crescente', 'Multidão', 'Povoado', 'Nação'],
        descriptions: (val) => `Tenha pelo menos ${val} pessoas cadastradas na sua guilda principal.`
    },
    profile_pic: {
        titles: ['Nova Identidade', 'O Retrato Próprio', 'Fotogênico'],
        descriptions: () => `Altere sua foto de avatar na tela de Perfil.`
    },
    shop_spend: {
        titles: ['Consumista', 'Mecenas', 'Esbanjador', 'Cliente VIP'],
        descriptions: (val) => `Invista um total de ${val} moedas comprando itens na loja.`
    },
    clan_event: {
        titles: ['Encontro de Clã', 'Reunião de Elite', 'Força Coletiva', 'União Faz a Força'],
        descriptions: (val) => `Reúna pelo menos ${val} membros do seu clã no mesmo local físico.`
    }
};

const ROMANS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'Mestre', 'Lenda', 'Deus'];

export const generateMainQuests = (): QuestDef[] => {
    const quests: QuestDef[] = [];
    const seq = ['distance', 'coins', 'shop_spend', 'level', 'friends', 'group_members', 'distance', 'group'] as QuestGoalType[];
    
    let baseDist = 1000;
    let baseCoins = 150;
    let baseSpend = 50;
    let baseLevel = 2;
    let baseFriends = 1;
    let baseGroupMems = 2;
    
    for (let i = 1; i <= 200; i++) {
        const goalType = seq[(i - 1) % seq.length];
        // Multiplicador exponencial fraco para dar curva de dificuldade em formato de Sino invertido
        const rawScaling = Math.floor(i / 10) * 1.5 + 1; 
        
        let target = 0;
        let reward = 50 * rawScaling;
        let xpReward = 100 * rawScaling;
        
        switch(goalType) {
            case 'distance':
                target = baseDist;
                baseDist += 1000 * Math.max(1, Math.floor(rawScaling / 1.5));
                break;
            case 'coins':
                target = baseCoins;
                baseCoins += 300 * Math.max(1, Math.floor(rawScaling));
                break;
            case 'shop_spend':
                target = baseSpend;
                baseSpend += 150 * Math.max(1, Math.floor(rawScaling));
                break;
            case 'level':
                target = baseLevel;
                baseLevel += 1 + Math.floor(i / 50);
                break;
            case 'friends':
                target = baseFriends;
                if (i % 3 === 0) baseFriends += 1;
                break;
            case 'group':
                target = 1;
                break;
            case 'group_members':
                target = baseGroupMems;
                if (i % 4 === 0) baseGroupMems += 2;
                break;
            case 'profile_pic':
                target = 1;
                break;
        }

        const template = TEMPLATES[goalType];
        const romanMod = Math.min(15, Math.floor(i / 15));
        const tierStr = romanMod > 0 ? ` ${ROMANS[romanMod]}` : '';
        
        quests.push({
            id: `main_${i}`,
            type: 'main',
            goalType,
            title: `${template.titles[i % template.titles.length]}${tierStr}`,
            description: template.descriptions(target),
            target,
            reward: Math.floor(reward),
            xpReward: Math.floor(xpReward)
        });
    }
    
    return quests;
};

export const MAIN_QUESTS = generateMainQuests();

export const DAILY_QUESTS: QuestDef[] = [
    { id: 'daily_1', type: 'daily', goalType: 'distance', title: 'Caminhada Diária', description: 'Caminhe 1 km hoje na vida real.', target: 1000, reward: 150, xpReward: 200 },
    { id: 'daily_2', type: 'daily', goalType: 'coins', title: 'Hora da Mesada', description: 'Colete 50 PetCoins explorando os quarteirões.', target: 50, reward: 80, xpReward: 100 },
    { id: 'daily_3', type: 'daily', goalType: 'profile_pic', title: 'Boa Impressão', description: 'Tenha uma foto no seu perfil.', target: 1, reward: 50, xpReward: 50 },
    { id: 'daily_clan_1', type: 'daily', goalType: 'clan_event', title: 'Encontro de Clã', description: 'Reúna pelo menos 3 membros do seu clã no mesmo local físico.', target: 3, reward: 500, xpReward: 1000 },
];

export const WEEKLY_QUESTS: QuestDef[] = [
    { id: 'weekly_1', type: 'weekly', goalType: 'distance', title: 'Maratona Semanal', description: 'Caminhe 10 km num período de 7 dias.', target: 10000, reward: 1200, xpReward: 1500 },
    { id: 'weekly_2', type: 'weekly', goalType: 'level', title: 'Treino Contínuo', description: 'Suba seu pet de nível 2 vezes.', target: 2, reward: 800, xpReward: 1000 },
    { id: 'weekly_clan_1', type: 'weekly', goalType: 'clan_event', title: 'Grande Reunião', description: 'Reúna pelo menos 5 membros do seu clã no mesmo local.', target: 5, reward: 2500, xpReward: 5000 },
];

export const MONTHLY_QUESTS: QuestDef[] = [
    { id: 'monthly_1', type: 'monthly', goalType: 'distance', title: 'Rei do Bairro', description: 'Cruze a marca de 50km explorados dentro do mês atual.', target: 50000, reward: 5000, xpReward: 10000 },
    { id: 'monthly_2', type: 'monthly', goalType: 'coins', title: 'Patrocínio Mensal', description: 'Garimpar um bolo cumulativo de 5.000 moedas no mapa.', target: 5000, reward: 2000, xpReward: 5000 },
];
