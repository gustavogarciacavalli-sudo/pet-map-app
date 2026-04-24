export type ShopTab = 'accessory' | 'consumable' | 'home' | 'gem_store';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<ItemRarity, { bg: string; darkBg: string; border: string; glow: string }> = {
    common: { bg: '#E8F5E810', darkBg: '#34D39912', border: '#34D399', glow: '#34D39930' },
    rare: { bg: '#60A5FA10', darkBg: '#60A5FA12', border: '#60A5FA', glow: '#60A5FA30' },
    epic: { bg: '#A78BFA10', darkBg: '#A78BFA12', border: '#A78BFA', glow: '#A78BFA30' },
    legendary: { bg: '#FBBF2410', darkBg: '#FBBF2412', border: '#FBBF24', glow: '#FBBF2430' },
};

export const CATALOG = [
    // Acessórios Soft Currency
    { id: 'bow', name: 'Laço Rosa', price: 150, currency: 'coins', icon: 'ribbon', iconLib: 'Ionicons', tab: 'accessory', rarity: 'common' as ItemRarity, description: 'Um laço charmoso para enfeitar seu pet.' },
    { id: 'glasses', name: 'Óculos do Saber', price: 200, currency: 'coins', icon: 'glasses', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'common' as ItemRarity, description: 'Deixa seu pet com cara de intelectual.' },
    { id: 'flower', name: 'Flor de Sakura', price: 350, currency: 'coins', icon: 'flower-tulip', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'common' as ItemRarity, description: 'Uma flor delicada colhida no oriente.' },
    { id: 'cap', name: 'Boné Esportivo', price: 400, currency: 'coins', icon: 'hat-fedora', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'common' as ItemRarity, description: 'Estilo urbano para o dia a dia.' },
    { id: 'scarf', name: 'Cachecol Fofo', price: 1000, currency: 'coins', icon: 'muffler', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'rare' as ItemRarity, description: 'Protege seu pet nos dias mais frios.' },
    { id: 'necklace', name: 'Colar de Pérolas', price: 2500, currency: 'coins', icon: 'necklace', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'rare' as ItemRarity, description: 'Elegância e sofisticação para ocasiões especiais.' },
    { id: 'hat_fisher', name: 'Chapéu Pescador', price: 3000, currency: 'coins', icon: 'hook', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'rare' as ItemRarity, description: 'Ideal para um dia de aventura ao sol.' },
    { id: 'cloak', name: 'Capa de Viajante', price: 5000, currency: 'coins', icon: 'tshirt-crew', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'epic' as ItemRarity, description: 'Uma capa robusta para grandes exploradores.' },

    // Acessórios Hard Currency (Gems)
    { id: 'crown', name: 'Coroa Imperial', price: 50, currency: 'gems', icon: 'crown', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'epic' as ItemRarity },
    { id: 'shades', name: 'Óculos Estilo', price: 80, currency: 'gems', icon: 'sunglasses', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'epic' as ItemRarity },
    { id: 'halo', name: 'Aura Celestial', price: 150, currency: 'gems', icon: 'star-four-points', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'legendary' as ItemRarity },
    { id: 'vr_headset', name: 'Óculos VR Cyber', price: 250, currency: 'gems', icon: 'virtual-reality', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'legendary' as ItemRarity },
    { id: 'magic_wand', name: 'Varinha Estelar', price: 500, currency: 'gems', icon: 'magic-staff', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'legendary' as ItemRarity },

    // Itens de Casinha (Home)
    { id: 'pet_bed', name: 'Caminha Confortável', price: 1200, currency: 'coins', icon: 'bed-outline', iconLib: 'Ionicons', tab: 'home', category: 'Móveis', rarity: 'common' as ItemRarity, description: 'Um lugar macio para seu pet tirar um cochilo.' },
    { id: 'pet_bowl', name: 'Tigela de Luxo', price: 800, currency: 'coins', icon: 'bowl-mix', iconLib: 'MaterialCommunityIcons', tab: 'home', category: 'Diversos', rarity: 'common' as ItemRarity, description: 'Comida com estilo e elegância.' },
    { id: 'lamp', name: 'Luminária Estelar', price: 20, currency: 'gems', icon: 'lamp', iconLib: 'MaterialCommunityIcons', tab: 'home', category: 'Luminárias', rarity: 'rare' as ItemRarity, description: 'Ilumina o lar do seu pet com luz suave.' },
    { id: 'rug', name: 'Tapete Felpudo', price: 1500, currency: 'coins', icon: 'rug', iconLib: 'MaterialCommunityIcons', tab: 'home', category: 'Tapetes', rarity: 'rare' as ItemRarity, description: 'Traz aconchego instantâneo para o ambiente.' },
    { id: 'gaming_chair', name: 'Cadeira Gamer Pet', price: 150, currency: 'gems', icon: 'chair-rolling', iconLib: 'MaterialCommunityIcons', tab: 'home', category: 'Móveis', rarity: 'epic' as ItemRarity, description: 'Para os pets que gostam de um setup de alto nível.' },

    // Consumíveis (Soft Currency)
    { id: 'apple', name: 'Maçã Fresca', price: 50, currency: 'coins', icon: 'nutrition', iconLib: 'Ionicons', tab: 'consumable', boost: 30, rarity: 'common' as ItemRarity, description: 'Restaura 30% da energia e felicidade.' },
    { id: 'milk', name: 'Leite Morno', price: 30, currency: 'coins', icon: 'cafe', iconLib: 'Ionicons', tab: 'consumable', boost: 20, rarity: 'common' as ItemRarity, description: 'Uma bebida calmante que melhora o humor.' },
    { id: 'meat', name: 'Bife Suculento', price: 120, currency: 'coins', icon: 'restaurant', iconLib: 'Ionicons', tab: 'consumable', boost: 50, rarity: 'rare' as ItemRarity, description: 'Uma meal completa para pets esfomeados.' },
    { id: 'xp_potion_small', name: 'Poção de XP', price: 300, currency: 'coins', icon: 'flask', iconLib: 'Ionicons', tab: 'consumable', xp: 200, rarity: 'rare' as ItemRarity, description: 'Ganha +200 pontos de experiência instantaneamente.' },
 
    // Consumíveis (Hard Currency)
    { id: 'xp_potion_mega', name: 'Elixir Supremo', price: 25, currency: 'gems', icon: 'beaker', iconLib: 'Ionicons', tab: 'consumable', xp: 2500, rarity: 'legendary' as ItemRarity, description: 'Um salto imenso no nível do seu pet (+2500 XP).' },
    { id: 'golden_meat', name: 'Bife Dourado', price: 15, currency: 'gems', icon: 'flame', iconLib: 'Ionicons', tab: 'consumable', boost: 100, rarity: 'epic' as ItemRarity, description: 'Restaura 100% da energia e concede bônus de brilho.' },

    // Loja de Gemas Real (Simulação de IAP)
    { id: 'iap_1', name: 'Punhado de Gemas', price: 4.99, currency: 'fiat', icon: 'diamond', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 100, rarity: 'common' as ItemRarity },
    { id: 'iap_2', name: 'Saco de Gemas', price: 19.99, currency: 'fiat', icon: 'bag-handle', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 500, rarity: 'rare' as ItemRarity },
    { id: 'iap_3', name: 'Baú do Tesouro', price: 49.99, currency: 'fiat', icon: 'cube', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 1500, rarity: 'epic' as ItemRarity },
    { id: 'iap_4', name: 'Carro-Forte VIP', price: 99.99, currency: 'fiat', icon: 'trophy', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 4000, rarity: 'legendary' as ItemRarity },
];
