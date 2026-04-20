import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    getCoinsLocal, saveCoinsLocal, updatePetAccessoryLocal, addXPLocal,
    getEnergyLocal, saveEnergyLocal, getGemsLocal, saveGemsLocal,
    addSpentCoinsLocal, addSpentGemsLocal, getInventoryLocal, addToInventoryLocal
} from '../../localDatabase';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';

export type ShopTab = 'accessory' | 'consumable' | 'gem_store';
type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_COLORS: Record<ItemRarity, { bg: string; darkBg: string; border: string; glow: string }> = {
    common: { bg: '#E8F5E810', darkBg: '#34D39912', border: '#34D399', glow: '#34D39930' },
    rare: { bg: '#60A5FA10', darkBg: '#60A5FA12', border: '#60A5FA', glow: '#60A5FA30' },
    epic: { bg: '#A78BFA10', darkBg: '#A78BFA12', border: '#A78BFA', glow: '#A78BFA30' },
    legendary: { bg: '#FBBF2410', darkBg: '#FBBF2412', border: '#FBBF24', glow: '#FBBF2430' },
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

// ─── Product Card ───
function ProductCard({ item, isOwned, isDeal, onBuy, onEquip, colors, isDarkMode }: any) {
    const scale = useRef(new Animated.Value(1)).current;
    const rarityStyle = RARITY_COLORS[item.rarity as ItemRarity];
    const isGemStore = item.tab === 'gem_store';

    const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 20 }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

    return (
        <Pressable style={{ width: '48%' }} onPressIn={onPressIn} onPressOut={onPressOut} onPress={isOwned ? onEquip : onBuy}>
            <Animated.View style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: [{ scale }],
                }
            ]}>
                {/* Rarity indicator line */}
                <View style={[styles.rarityLine, { backgroundColor: rarityStyle.border }]} />

                {/* Icon */}
                <View style={[styles.itemIconBg, { backgroundColor: isDarkMode ? rarityStyle.darkBg : rarityStyle.bg }]}>
                    {renderItemIcon(item, 26, rarityStyle.border)}
                    {isOwned && (
                        <View style={[styles.ownedBadge, { backgroundColor: colors.primary }]}>
                            <Ionicons name="checkmark" size={10} color="#FFF" />
                        </View>
                    )}
                </View>

                {/* Name */}
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>

                {/* Price */}
                <View style={styles.priceRow}>
                    {isGemStore ? (
                        <Text style={[styles.priceText, { color: colors.subtext }]}>US$ {String(item.price)}</Text>
                    ) : (
                        <>
                            <Ionicons
                                name={item.currency === 'gems' ? 'diamond' : 'wallet'}
                                size={12}
                                color={item.currency === 'gems' ? '#60A5FA' : colors.primary}
                            />
                            <Text style={[styles.priceText, { color: isDeal ? '#F59E0B' : colors.text }]}>
                                {isDeal ? String(Math.floor(item.price / 2)) : String(item.price)}
                            </Text>
                            {isDeal && (
                                <View style={styles.dealBadge}>
                                    <Text style={styles.dealText}>-50%</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Button */}
                <Pressable
                    style={[
                        styles.buyBtn,
                        {
                            backgroundColor: isOwned ? (isDarkMode ? '#ffffff08' : '#0000000A') : colors.primary,
                        }
                    ]}
                    onPress={isOwned ? onEquip : onBuy}
                >
                    <Text style={[styles.buyBtnText, { color: isOwned ? colors.text : '#FFF' }]}>
                        {isOwned ? 'Equipar' : 'Comprar'}
                    </Text>
                </Pressable>
            </Animated.View>
        </Pressable>
    );
}

// ─── Main Screen ───
export default function ShopScreen() {
    const { colors, isDarkMode } = useTheme();
    const [coins, setCoins] = useState(0);
    const [gems, setGems] = useState(0);
    const [inventory, setInventory] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<ShopTab>('accessory');
    const [dailyDealId, setDailyDealId] = useState<string | null>(null);

    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(30)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadBalances();
            const coinItems = CATALOG.filter(i => i.currency === 'coins' && i.tab !== 'gem_store');
            const randomItem = coinItems[Math.floor(Math.random() * coinItems.length)];
            setDailyDealId(randomItem.id);
            Animated.parallel([
                Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
                Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            ]).start();
        }, [])
    );

    const loadBalances = async () => {
        setCoins(await getCoinsLocal());
        setGems(await getGemsLocal());
        setInventory(await getInventoryLocal());
    };

    const handleBuy = async (item: any) => {
        if (item.tab === 'gem_store') {
            Alert.alert('Confirmar Compra', `Adquirir ${item.givesGems} Gemas por US$ ${item.price}? (Simulação)`, [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Comprar', onPress: async () => {
                    const newGems = gems + item.givesGems;
                    await saveGemsLocal(newGems);
                    setGems(newGems);
                    Alert.alert('Compra realizada!', `${item.givesGems} WanderGems foram adicionadas.`);
                }}
            ]);
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

        Alert.alert('Confirmar compra',
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

    const shopTabs: { id: ShopTab; label: string; icon: string }[] = [
        { id: 'accessory', label: 'Moda', icon: 'shirt-outline' },
        { id: 'consumable', label: 'Consumíveis', icon: 'flask-outline' },
        { id: 'gem_store', label: 'WanderGems', icon: 'diamond-outline' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>Loja Wander</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>Itens e cosméticos para seu companheiro</Text>
                    </View>
                    <View style={styles.walletsCol}>
                        <View style={[styles.walletBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                            <Ionicons name="wallet" size={13} color={colors.primary} />
                            <Text style={[styles.walletText, { color: colors.text }]}>{String(coins)}</Text>
                        </View>
                        <View style={[styles.walletBadge, { backgroundColor: '#60A5FA15', borderColor: '#60A5FA30' }]}>
                            <Ionicons name="diamond" size={13} color="#60A5FA" />
                            <Text style={[styles.walletText, { color: colors.text }]}>{String(gems)}</Text>
                        </View>
                    </View>
                </View>

                {/* Tab Bar */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
                    {shopTabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const isGem = tab.id === 'gem_store';
                        const activeColor = isGem ? '#60A5FA' : colors.primary;
                        return (
                            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)}
                                style={[
                                    styles.tabPill,
                                    { borderColor: isActive ? activeColor : colors.border },
                                    isActive && { backgroundColor: activeColor }
                                ]}
                            >
                                <Ionicons name={tab.icon as any} size={14} color={isActive ? '#FFF' : colors.subtext} />
                                <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.subtext }]}>{tab.label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </Animated.View>

            {/* Content */}
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {activeTab === 'gem_store' && (
                    <View style={[styles.gemBanner, { backgroundColor: '#60A5FA0C', borderColor: '#60A5FA20' }]}>
                        <Ionicons name="diamond" size={20} color="#60A5FA" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.gemBannerTitle, { color: '#60A5FA' }]}>WanderGems</Text>
                            <Text style={[styles.gemBannerSub, { color: colors.subtext }]}>Moeda premium para itens exclusivos</Text>
                        </View>
                    </View>
                )}

                <View style={styles.grid}>
                    {activeList.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            isOwned={inventory.includes(item.id)}
                            isDeal={item.id === dailyDealId}
                            onBuy={() => handleBuy(item)}
                            onEquip={() => handleEquip(item)}
                            colors={colors}
                            isDarkMode={isDarkMode}
                        />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ─── Header ───
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.7 },
    walletsCol: { alignItems: 'flex-end', gap: 6 },
    walletBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderWidth: 1,
        gap: 6,
        minWidth: 70,
        justifyContent: 'center',
    },
    walletText: { fontSize: 12, fontWeight: '800' },

    // ─── Tabs ───
    tabContainer: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8, gap: 8 },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    tabText: { fontSize: 12, fontWeight: '700' },

    // ─── Gem Banner ───
    gemBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 14,
    },
    gemBannerTitle: { fontSize: 14, fontWeight: '800' },
    gemBannerSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },

    // ─── Layout ───
    scroll: { padding: 18, paddingBottom: 120 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },

    // ─── Card ───
    card: {
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 2,
        overflow: 'hidden',
    },
    rarityLine: {
        position: 'absolute',
        top: 0,
        left: 14,
        right: 14,
        height: 2,
        borderRadius: 1,
    },
    itemIconBg: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        marginTop: 4,
    },
    ownedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemName: { fontSize: 13, fontWeight: '700', textAlign: 'center', minHeight: 34, lineHeight: 17 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, marginTop: 4 },
    priceText: { fontSize: 14, fontWeight: '800' },
    dealBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 6,
        marginLeft: 2,
    },
    dealText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
    buyBtn: {
        paddingVertical: 10,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buyBtnText: { fontWeight: '800', fontSize: 12 },
});
