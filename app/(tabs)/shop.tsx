import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Alert } from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { 
    getCoinsLocal, saveCoinsLocal, updatePetAccessoryLocal, addXPLocal, 
    getEnergyLocal, saveEnergyLocal, getGemsLocal, saveGemsLocal, 
    addSpentCoinsLocal, addSpentGemsLocal, getInventoryLocal, addToInventoryLocal 
} from '../../localDatabase';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export type ShopTab = 'accessory' | 'consumable' | 'gem_store';

type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_COLORS: Record<ItemRarity, { bg: string; darkBg: string; border: string }> = {
    common: { bg: '#E8F5E8', darkBg: '#2A3A24', border: '#8CC084' },
    rare: { bg: '#E0ECFF', darkBg: '#1E2A40', border: '#7AABE0' },
    epic: { bg: '#F0E0FF', darkBg: '#2E1E40', border: '#B08ADA' },
    legendary: { bg: '#FFF3D6', darkBg: '#3A3020', border: '#F2C14E' },
};

const CATALOG = [
    // Acessórios Soft Currency
    { id: 'bow', name: 'Laço Rosa', price: 150, currency: 'coins', icon: 'ribbon', iconLib: 'Ionicons', tab: 'accessory', rarity: 'common' as ItemRarity },
    { id: 'glasses', name: 'Óculos do Saber', price: 200, currency: 'coins', icon: 'glasses', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'common' as ItemRarity },
    { id: 'flower', name: 'Flor de Sakura', price: 350, currency: 'coins', icon: 'flower-tulip', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'common' as ItemRarity },
    { id: 'cap', name: 'Boné Esportivo', price: 400, currency: 'coins', icon: 'hat-fedora', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'common' as ItemRarity },
    { id: 'scarf', name: 'Cachecol Fofo', price: 1000, currency: 'coins', icon: 'muffler', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'rare' as ItemRarity },
    { id: 'necklace', name: 'Colar de Pérolas', price: 2500, currency: 'coins', icon: 'necklace', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'rare' as ItemRarity },
    { id: 'hat_fisher', name: 'Chapéu Pescador', price: 3000, currency: 'coins', icon: 'hook', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'rare' as ItemRarity },
    { id: 'cloak', name: 'Capa de Viajante', price: 5000, currency: 'coins', icon: 'tshirt-crew', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'epic' as ItemRarity },

    // Acessórios Hard Currency (Gems)
    { id: 'crown', name: 'Coroa Imperial', price: 50, currency: 'gems', icon: 'crown', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'epic' as ItemRarity },
    { id: 'shades', name: 'Óculos Estilo', price: 80, currency: 'gems', icon: 'sunglasses', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'epic' as ItemRarity },
    { id: 'halo', name: 'Aura Celestial', price: 150, currency: 'gems', icon: 'star-four-points', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'legendary' as ItemRarity },
    { id: 'vr_headset', name: 'Óculos VR Cyber', price: 250, currency: 'gems', icon: 'virtual-reality', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'legendary' as ItemRarity },
    { id: 'magic_wand', name: 'Varinha Estelar', price: 500, currency: 'gems', icon: 'magic-staff', iconLib: 'MaterialCommunityIcons', tab: 'accessory', rarity: 'legendary' as ItemRarity },

    // Consumíveis (Soft Currency)
    { id: 'apple', name: 'Maçã Fresca', price: 50, currency: 'coins', icon: 'nutrition', iconLib: 'Ionicons', tab: 'consumable', boost: 30, rarity: 'common' as ItemRarity },
    { id: 'milk', name: 'Leite Morno', price: 30, currency: 'coins', icon: 'cafe', iconLib: 'Ionicons', tab: 'consumable', boost: 20, rarity: 'common' as ItemRarity },
    { id: 'meat', name: 'Bife Suculento', price: 120, currency: 'coins', icon: 'restaurant', iconLib: 'Ionicons', tab: 'consumable', boost: 50, rarity: 'rare' as ItemRarity },
    { id: 'xp_potion_small', name: 'Poção de XP', price: 300, currency: 'coins', icon: 'flask', iconLib: 'Ionicons', tab: 'consumable', xp: 200, rarity: 'rare' as ItemRarity },
    
    // Consumíveis (Hard Currency)
    { id: 'xp_potion_mega', name: 'Elixir Supremo', price: 25, currency: 'gems', icon: 'beaker', iconLib: 'Ionicons', tab: 'consumable', xp: 2500, rarity: 'legendary' as ItemRarity },
    { id: 'golden_meat', name: 'Bife Dourado', price: 15, currency: 'gems', icon: 'flame', iconLib: 'Ionicons', tab: 'consumable', boost: 100, rarity: 'epic' as ItemRarity },

    // Loja de Gemas Real (Simulação de IAP)
    { id: 'iap_1', name: 'Punhado de Gemas', price: 4.99, currency: 'fiat', icon: 'diamond', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 100, rarity: 'common' as ItemRarity },
    { id: 'iap_2', name: 'Saco de Gemas', price: 19.99, currency: 'fiat', icon: 'bag-handle', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 500, rarity: 'rare' as ItemRarity },
    { id: 'iap_3', name: 'Baú do Tesouro', price: 49.99, currency: 'fiat', icon: 'cube', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 1500, rarity: 'epic' as ItemRarity },
    { id: 'iap_4', name: 'Carro-Forte VIP', price: 99.99, currency: 'fiat', icon: 'trophy', iconLib: 'Ionicons', tab: 'gem_store', givesGems: 4000, rarity: 'legendary' as ItemRarity },
];

function renderItemIcon(item: any, size: number, color: string) {
    if (item.iconLib === 'Ionicons') return <Ionicons name={item.icon as any} size={size} color={color} />;
    if (item.iconLib === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={item.icon as any} size={size} color={color} />;
    return <FontAwesome5 name={item.icon as any} size={size} color={color} />;
}

export default function ShopScreen() {
    const { colors, isDarkMode } = useTheme();
    const [coins, setCoins] = useState(0);
    const [gems, setGems] = useState(0);
    const [inventory, setInventory] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<ShopTab>('accessory');
    const [dailyDealId, setDailyDealId] = useState<string | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            loadBalances();
            // Seleciona oferta do dia (aleatória de moedas)
            const coinItems = CATALOG.filter(i => i.currency === 'coins' && i.tab !== 'gem_store');
            const randomItem = coinItems[Math.floor(Math.random() * coinItems.length)];
            setDailyDealId(randomItem.id);
        }, [])
    );

    const loadBalances = async () => {
        setCoins(await getCoinsLocal());
        setGems(await getGemsLocal());
        setInventory(await getInventoryLocal());
    };

    const handleBuy = async (item: any) => {
        if (item.tab === 'gem_store') {
            Alert.alert(
                'Confirmar Compra',
                `Adquirir ${item.givesGems} Gemas por US$ ${item.price}? (Simulação)`,
                [
                    { text: 'Voltar', style: 'cancel' },
                    { text: 'Comprar', onPress: async () => {
                        const newGems = gems + item.givesGems;
                        await saveGemsLocal(newGems);
                        setGems(newGems);
                        Alert.alert('Compra realizada!', `${item.givesGems} WanderGems foram adicionadas.`);
                    }}
                ]
            );
            return;
        }

        const isGem = item.currency === 'gems';
        const isDeal = item.id === dailyDealId;
        const price = isDeal ? Math.floor(item.price / 2) : item.price;
        const balance = isGem ? gems : coins;
        
        if (balance < price) {
            Alert.alert('Saldo insuficiente', `Você precisa de mais ${isGem ? 'gemas' : 'moedas'} para este item.`);
            return;
        }

        Alert.alert(
            'Confirmar compra',
            `Pagar ${price} ${isGem ? 'gemas' : 'moedas'} por ${item.name}? ${isDeal ? '(OFERTA DO DIA!)' : ''}`,
            [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Comprar', onPress: () => processPurchase(item, isGem, isDeal) }
            ]
        );
    };

    const processPurchase = async (item: any, isGem: boolean, isDeal: boolean) => {
        const price = isDeal ? Math.floor(item.price / 2) : item.price;
        if (isGem) {
            const newGems = gems - price;
            await saveGemsLocal(newGems);
            await addSpentGemsLocal(price);
            setGems(newGems);
        } else {
            const newCoins = coins - price;
            await saveCoinsLocal(newCoins);
            await addSpentCoinsLocal(price);
            setCoins(newCoins);
        }

        if (item.tab === 'accessory') {
            await addToInventoryLocal(item.id);
            setInventory([...inventory, item.id]);
            await updatePetAccessoryLocal(item.id);
            const xpResult = await addXPLocal(100);
            const msg = xpResult.leveledUp ? `\n\nSeu explorador subiu para o nível ${xpResult.level}!` : "";
            Alert.alert('Novo estilo adquirido!', `${item.name} foi equipado no seu pet.${msg}`);
        } else if (item.tab === 'consumable') {
            if (item.boost) {
                const currentEnergy = await getEnergyLocal();
                const newEnergy = Math.min(100, currentEnergy + item.boost);
                await saveEnergyLocal(newEnergy);
            }
            const xpGained = item.xp || 30;
            const xpResult = await addXPLocal(xpGained);
            const msg = xpResult.leveledUp ? `\n\nSeu explorador subiu para o nível ${xpResult.level}!` : "";
            Alert.alert('Item consumido!', `Os efeitos de ${item.name} foram aplicados.${msg}`);
        }
    };

    const handleEquip = async (item: any) => {
        await updatePetAccessoryLocal(item.id);
        Alert.alert('Equipado!', `${item.name} foi colocado no seu pet.`);
    };

    const activeList = CATALOG.filter(i => i.tab === activeTab);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Loja Wander</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Itens e cosméticos para seu companheiro</Text>
                </View>
                <View style={styles.walletsRow}>
                    <View style={[styles.walletBadge, { backgroundColor: isDarkMode ? '#2D2440' : '#F0EDFA', borderColor: colors.primary + '44' }]}>
                        <Ionicons name="wallet" size={14} color={colors.primary} />
                        <Text style={[styles.walletText, { color: colors.text }]}>{String(coins)}</Text>
                    </View>
                    <View style={[styles.walletBadge, { backgroundColor: isDarkMode ? '#1A2040' : '#EAF0FF', borderColor: '#7AABE044' }]}>
                        <Ionicons name="diamond" size={14} color="#7AABE0" />
                        <Text style={[styles.walletText, { color: colors.text }]}>{String(gems)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {[
                        { id: 'accessory' as ShopTab, label: 'Moda', icon: 'shirt-outline' },
                        { id: 'consumable' as ShopTab, label: 'Consumíveis', icon: 'flask-outline' },
                        { id: 'gem_store' as ShopTab, label: 'WanderGems', icon: 'diamond-outline' },
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        const isGem = tab.id === 'gem_store';
                        return (
                            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)}>
                                <LinearGradient 
                                    colors={isActive 
                                        ? (isGem ? ['#7AABE0', '#5A8BC0'] : [colors.primary, colors.primary + 'AA']) 
                                        : [colors.card, colors.card]
                                    } 
                                    style={[styles.tabBtn, !isActive && { borderWidth: 1, borderColor: colors.border }]}
                                >
                                    <Ionicons name={tab.icon as any} size={15} color={isActive ? (isDarkMode ? '#1C1E2B' : '#FFF') : colors.subtext} />
                                    <Text style={[styles.tabText, { color: isActive ? (isDarkMode ? '#1C1E2B' : '#FFF') : colors.subtext }]}>{tab.label}</Text>
                                </LinearGradient>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {activeTab === 'gem_store' && (
                    <View style={[styles.gemBanner, { backgroundColor: isDarkMode ? '#1E2A3A' : '#EAF4FF', borderColor: '#7AABE033' }]}>
                        <Ionicons name="diamond" size={20} color="#7AABE0" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.gemBannerTitle, { color: isDarkMode ? '#A0C8E8' : '#4A7AA0' }]}>WanderGems</Text>
                            <Text style={[styles.gemBannerText, { color: colors.subtext }]}>Moeda premium para itens exclusivos</Text>
                        </View>
                    </View>
                )}
                
                <View style={styles.grid}>
                    {activeList.map(item => {
                        const isOwned = inventory.includes(item.id);
                        const isGemStore = item.tab === 'gem_store';
                        const rarityStyle = RARITY_COLORS[item.rarity];

                        return (
                            <Pressable key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={[styles.itemIconBg, { backgroundColor: isDarkMode ? rarityStyle.darkBg : rarityStyle.bg }]}>
                                    {renderItemIcon(item, 28, rarityStyle.border)}
                                    {isOwned && (
                                        <View style={[styles.ownedBadge, { backgroundColor: colors.primary }]}>
                                            <Ionicons name="checkmark" size={10} color="#FFF" />
                                        </View>
                                    )}
                                </View>
                                
                                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                                <View style={[styles.rarityDot, { backgroundColor: rarityStyle.border }]} />
                                
                                <View style={styles.priceRow}>
                                    {isGemStore ? (
                                        <Text style={[styles.priceText, { color: colors.subtext }]}>US$ {String(item.price)}</Text>
                                    ) : (
                                        <>
                                            <Ionicons name={item.currency === 'gems' ? 'diamond' : 'wallet'} size={12} color={item.currency === 'gems' ? '#7AABE0' : colors.accent} />
                                            <Text style={[styles.priceText, { color: item.id === dailyDealId ? '#FF8C42' : colors.text }]}>
                                                {item.id === dailyDealId ? String(Math.floor(item.price/2)) : String(item.price)}
                                            </Text>
                                            {item.id === dailyDealId && (
                                                <View style={{ backgroundColor: '#FF8C42', paddingHorizontal: 4, borderRadius: 4, marginLeft: 4 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '900' }}>-50%</Text>
                                                </View>
                                            )}
                                        </>
                                    )}
                                </View>

                                {isOwned ? (
                                    <Pressable style={[styles.buyBtn, { backgroundColor: colors.border }]} onPress={() => handleEquip(item)}>
                                        <Text style={[styles.buyBtnText, { color: colors.text }]}>Equipar</Text>
                                    </Pressable>
                                ) : (
                                    <Pressable 
                                        style={[styles.buyBtn, { backgroundColor: colors.primary }]} 
                                        onPress={() => handleBuy(item)}
                                    >
                                        <Text style={[styles.buyBtnText, { color: isDarkMode ? '#1C1E2B' : '#FFF' }]}>Comprar</Text>
                                    </Pressable>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    subtitle: { fontSize: 12, fontWeight: '600', marginTop: 3, opacity: 0.7 },
    walletsRow: { alignItems: 'flex-end', gap: 6 },
    walletBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, gap: 6, minWidth: 75, justifyContent: 'center' },
    walletText: { fontSize: 12, fontWeight: '800' },
    
    tabContainer: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8 },
    tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    tabText: { fontSize: 12, fontWeight: '700' },

    gemBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 14 },
    gemBannerTitle: { fontSize: 14, fontWeight: '800' },
    gemBannerText: { fontSize: 11, fontWeight: '600', marginTop: 2 },

    scroll: { padding: 18, paddingBottom: 100 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    card: { width: '47%', borderRadius: 24, padding: 16, borderWidth: 1.5, alignItems: 'center' },
    itemIconBg: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    ownedBadge: { position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    itemName: { fontSize: 13, fontWeight: '800', textAlign: 'center', minHeight: 34 },
    rarityDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, marginTop: 6 },
    priceText: { fontSize: 14, fontWeight: '800' },
    buyBtn: { paddingVertical: 10, borderRadius: 14, width: '100%', alignItems: 'center' },
    buyBtnText: { fontWeight: '800', fontSize: 12 },
});
