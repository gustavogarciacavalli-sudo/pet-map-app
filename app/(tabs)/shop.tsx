import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Animated, Easing, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
    getCoinsLocal, saveCoinsLocal, updatePetAccessoryLocal, addXPLocal,
    getEnergyLocal, saveEnergyLocal, getGemsLocal, saveGemsLocal,
    addSpentCoinsLocal, addSpentGemsLocal, getInventoryLocal, addToInventoryLocal
} from '../../localDatabase';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';

import { CATALOG, RARITY_COLORS, ShopTab, ItemRarity } from '../../constants/catalog';

function renderItemIcon(item: any, size: number, color: string) {
    if (item.iconLib === 'Ionicons') return <Ionicons name={item.icon as any} size={size} color={color} />;
    if (item.iconLib === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={item.icon as any} size={size} color={color} />;
    return <FontAwesome5 name={item.icon as any} size={size} color={color} />;
}

// ─── Product Card ───
function ProductCard({ item, inventory, isDeal, onBuy, onEquip, colors, isDarkMode }: any) {
    const scale = useRef(new Animated.Value(1)).current;
    const rarityStyle = RARITY_COLORS[item.rarity as ItemRarity];
    const isGemStore = item.tab === 'gem_store';
    const isConsumable = item.tab === 'consumable';
    const isHighlighted = item.id === colors.highlightId; // Hack to pass through colors or props
    
    // Contar quantas unidades o usuário já tem (para consumíveis)
    const quantity = inventory.filter((id: string) => id === item.id).length;
    const isOwned = !isConsumable && quantity > 0;

    const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 20 }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

    return (
        <Pressable style={{ width: '48%' }} onPressIn={onPressIn} onPressOut={onPressOut} onPress={isOwned ? onEquip : onBuy}>
            <Animated.View style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: isHighlighted ? colors.primary : colors.border,
                    borderWidth: isHighlighted ? 2 : 1,
                    transform: [{ scale }],
                    shadowColor: isHighlighted ? colors.primary : 'transparent',
                    shadowOpacity: isHighlighted ? 0.5 : 0,
                    shadowRadius: 10,
                    elevation: isHighlighted ? 5 : 0
                }
            ]}>
                {/* Rarity indicator line */}
                <View style={[styles.rarityLine, { backgroundColor: rarityStyle.border }]} />

                {/* Icon */}
                <View style={[styles.itemIconBg, { backgroundColor: isDarkMode ? rarityStyle.darkBg : rarityStyle.bg }]}>
                    {renderItemIcon(item, 26, rarityStyle.border)}
                    {(isOwned || (isConsumable && quantity > 0)) && (
                        <View style={[styles.ownedBadge, { backgroundColor: isConsumable ? '#FFD700' : colors.primary }]}>
                            {isConsumable ? (
                                <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>x{quantity}</Text>
                            ) : (
                                <Ionicons name="checkmark" size={10} color="#FFF" />
                            )}
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
                        {isOwned ? 'Equipar' : (isConsumable && quantity > 0 ? 'Comprar +' : 'Comprar')}
                    </Text>
                </Pressable>
            </Animated.View>
        </Pressable>
    );
}

// ─── Main Screen ───
export default function ShopScreen() {
    const { colors, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [coins, setCoins] = useState(0);
    const [gems, setGems] = useState(0);
    const [inventory, setInventory] = useState<string[]>([]);
    const { highlight, tab } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState<ShopTab>((tab as ShopTab) || 'accessory');
    const [dailyDealId, setDailyDealId] = useState<string | null>(null);
    const [highlightId, setHighlightId] = useState<string | null>((highlight as string) || null);

    // Modals Custom
    const [confirmModal, setConfirmModal] = useState<{ visible: boolean; item: any | null }>({ visible: false, item: null });
    const [successModal, setSuccessModal] = useState<{ visible: boolean; item: any; extraMsg: string; title?: string }>({ 
        visible: false, 
        item: null, 
        extraMsg: '',
        title: 'Sucesso!'
    });

    const scrollY = useRef(new Animated.Value(0)).current;
    const tabTranslateY = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(30)).current;
    const lastScrollY = useRef(0);
    const isHeaderHidden = useRef(false);

    useFocusEffect(
        React.useCallback(() => {
            loadBalances();
            if (highlight) {
                setHighlightId(highlight as string);
                if (tab) setActiveTab(tab as ShopTab);
            }
            const coinItems = CATALOG.filter(i => i.currency === 'coins' && i.tab !== 'gem_store');
            const randomItem = coinItems[Math.floor(Math.random() * coinItems.length)];
            setDailyDealId(randomItem.id);
            Animated.parallel([
                Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
                Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            ]).start();
            
            // Auto clear highlight after some time
            const timer = setTimeout(() => setHighlightId(null), 5000);
            return () => clearTimeout(timer);
        }, [highlight, tab])
    );

    const onScroll = (event: any) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;
        
        // Estabilização: Evita triggers repetitivos e "bugs" de animação
        if (currentY < 60) {
            if (isHeaderHidden.current) {
                isHeaderHidden.current = false;
                Animated.spring(tabTranslateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start();
            }
        } else if (diff > 15 && !isHeaderHidden.current) {
            // Rolando para baixo: Esconde
            isHeaderHidden.current = true;
            Animated.spring(tabTranslateY, { toValue: -180, useNativeDriver: true, tension: 120, friction: 14 }).start();
        } else if (diff < -25 && isHeaderHidden.current) {
            // Rolando para cima: Mostra
            isHeaderHidden.current = false;
            Animated.spring(tabTranslateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start();
        }
        
        lastScrollY.current = currentY;
    };

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
        setConfirmModal({ visible: true, item });
    };

    const processPurchase = async (item: any) => {
        setConfirmModal({ visible: false, item: null });
        
        const balance = item.currency === 'coins' ? coins : gems;
        if (balance < item.price) {
            Alert.alert('Saldo Insuficiente', `Você precisa de mais ${item.currency === 'coins' ? 'moedas' : 'gemas'} para comprar este item.`);
            return;
        }

        if (item.currency === 'coins') {
            const newCoins = coins - item.price;
            await saveCoinsLocal(newCoins);
            await addSpentCoinsLocal(item.price);
            setCoins(newCoins);
        } else {
            const newGems = gems - item.price;
            await saveGemsLocal(newGems);
            await addSpentGemsLocal(item.price);
            setGems(newGems);
        }

        if (item.tab === 'accessory' || item.tab === 'player_accessory') {
            await addToInventoryLocal(item.id, false);
            setInventory([...inventory, item.id]);
            if (item.tab === 'accessory') {
                await updatePetAccessoryLocal(item.id);
            }
            const xpResult = await addXPLocal(100);
            const levelMsg = xpResult.leveledUp ? `\n\n🎉 Você subiu para o nível ${xpResult.level}!` : "";
            const target = item.tab === 'accessory' ? 'seu pet' : 'você, Explorador';
            
            setSuccessModal({ 
                visible: true, 
                item, 
                extraMsg: `${item.name} foi adicionado à sua Mochila e equipado em ${target}!${levelMsg}` 
            });
        } else if (item.tab === 'consumable' || item.tab === 'home') {
            await addToInventoryLocal(item.id, true);
            const newInv = await getInventoryLocal();
            setInventory(newInv);
            setSuccessModal({ 
                visible: true, 
                item, 
                extraMsg: `${item.name} foi adicionado à sua Mochila!` 
            });
        }
    };

    const handleEquip = async (item: any) => {
        if (item.tab === 'accessory') {
            await updatePetAccessoryLocal(item.id);
            setSuccessModal({
                visible: true,
                item,
                title: 'Equipado!',
                extraMsg: `${item.name} foi colocado no seu pet.`
            });
        } else {
            setSuccessModal({
                visible: true,
                item,
                title: 'Estilo Selecionado!',
                extraMsg: `${item.name} agora faz parte do seu visual.`
            });
            // Futuramente: updatePlayerAccessoryLocal(item.id);
        }
    };

    const activeList = CATALOG.filter(i => i.tab === activeTab);

    const shopTabs: { id: ShopTab; label: string; icon: string }[] = [
        { id: 'accessory', label: 'Moda Pet', icon: 'paw-outline' },
        { id: 'player_accessory', label: 'Seu Estilo', icon: 'person-outline' },
        { id: 'consumable', label: 'Itens', icon: 'flask-outline' },
        { id: 'home', label: 'Casa', icon: 'home-outline' },
        { id: 'gem_store', label: 'Gemas', icon: 'diamond-outline' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Multi-Layer Fade Overlay (Evita corte seco) */}
            <Animated.View 
                style={{ 
                    position: 'absolute', 
                    top: 0, left: 0, right: 0, 
                    height: insets.top + 60, 
                    zIndex: 95, 
                    opacity: tabTranslateY.interpolate({
                        inputRange: [-100, 0],
                        outputRange: [1, 0],
                        extrapolate: 'clamp'
                    })
                }} 
                pointerEvents="none"
            >
                {/* Simulação de Gradiente com camadas de opacidade */}
                <View style={{ height: insets.top + 20, backgroundColor: colors.background }} />
                <View style={{ height: 15, backgroundColor: colors.background, opacity: 0.8 }} />
                <View style={{ height: 15, backgroundColor: colors.background, opacity: 0.4 }} />
                <View style={{ height: 10, backgroundColor: colors.background, opacity: 0.1 }} />
            </Animated.View>

            {/* Header & Tabs Unified Container */}
            <Animated.View style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: tabTranslateY }], 
                zIndex: 100, 
                backgroundColor: colors.background,
                paddingTop: insets.top,
                opacity: tabTranslateY.interpolate({
                    inputRange: [-100, 0],
                    outputRange: [0, 1],
                    extrapolate: 'clamp'
                })
            }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable 
                            onPress={() => router.back()} 
                            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                        </Pressable>
                        <View>
                            <Text style={[styles.title, { color: colors.text }]}>Loja</Text>
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

            {/* Floating Currencies */}
            <View style={[styles.floatingWallets, { top: insets.top + 12 }]}>
                <View style={[styles.walletBadge, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: colors.primary + '80' }]}>
                    <Ionicons name="wallet" size={12} color={colors.primary} />
                    <Text style={[styles.walletText, { color: '#FFF' }]}>{String(coins)}</Text>
                </View>
                <View style={[styles.walletBadge, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: '#60A5FA80' }]}>
                    <Ionicons name="diamond" size={12} color="#60A5FA" />
                    <Text style={[styles.walletText, { color: '#FFF' }]}>{String(gems)}</Text>
                </View>
            </View>

            {/* Content */}
            <ScrollView 
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 110 }]} 
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {/* Dynamic Tab Description Banner */}
                <View style={[
                    styles.gemBanner, 
                    { 
                        backgroundColor: activeTab === 'gem_store' ? '#60A5FA0C' : colors.primary + '0C', 
                        borderColor: activeTab === 'gem_store' ? '#60A5FA20' : colors.primary + '20' 
                    }
                ]}>
                    <Ionicons 
                        name={shopTabs.find(t => t.id === activeTab)?.icon as any} 
                        size={20} 
                        color={activeTab === 'gem_store' ? '#60A5FA' : colors.primary} 
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.gemBannerTitle, { color: activeTab === 'gem_store' ? '#60A5FA' : colors.primary }]}>
                            {shopTabs.find(t => t.id === activeTab)?.label}
                        </Text>
                        <Text style={[styles.gemBannerSub, { color: colors.subtext }]}>
                            {activeTab === 'accessory' && "Estilo e charme para o seu melhor amigo"}
                            {activeTab === 'player_accessory' && "Expresse sua personalidade como explorador"}
                            {activeTab === 'consumable' && "Poções, alimentos e utilitários para sua jornada"}
                            {activeTab === 'home' && "Móveis e decorações para o lar do seu pet"}
                            {activeTab === 'gem_store' && "WanderGems: Moeda premium para itens exclusivos"}
                        </Text>
                    </View>
                </View>

                <View style={styles.grid}>
                    {activeList.map(item => (
                        <ProductCard
                            key={item.id}
                            item={item}
                            inventory={inventory}
                            isDeal={item.id === dailyDealId}
                            onBuy={() => handleBuy(item)}
                            onEquip={() => handleEquip(item)}
                            colors={{ ...colors, highlightId }}
                            isDarkMode={isDarkMode}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* Custom Modals */}
            <Modal 
                visible={confirmModal.visible} 
                transparent 
                animationType="fade"
                onRequestClose={() => setConfirmModal({ visible: false, item: null })}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal({ visible: false, item: null })}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="cart-outline" size={48} color={colors.primary} />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar Compra</Text>
                        <Text style={[styles.modalSub, { color: colors.subtext }]}>
                            Deseja comprar <Text style={{ color: colors.text, fontWeight: '800' }}>{confirmModal.item?.name}</Text>?
                        </Text>
                        
                        <View style={styles.priceRowLarge}>
                            <Ionicons 
                                name={confirmModal.item?.currency === 'coins' ? "wallet" : "diamond"} 
                                size={28} 
                                color={confirmModal.item?.currency === 'coins' ? colors.primary : '#60A5FA'} 
                            />
                            <Text style={[styles.priceTextLarge, { color: '#FFF' }]}>
                                {confirmModal.item?.price}
                            </Text>
                        </View>

                        <View style={styles.modalActionRow}>
                            <Pressable 
                                style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]} 
                                onPress={() => setConfirmModal({ visible: false, item: null })}
                            >
                                <Text style={{ color: colors.subtext, fontWeight: '700' }}>Cancelar</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
                                onPress={() => processPurchase(confirmModal.item)}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Confirmar</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal 
                visible={successModal.visible} 
                transparent 
                animationType="fade"
                onRequestClose={() => setSuccessModal({ visible: false, item: null, extraMsg: '', title: 'Sucesso!' })}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSuccessModal({ visible: false, item: null, extraMsg: '', title: 'Sucesso!' })}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <View style={[styles.modalIconContainer, { backgroundColor: colors.primary + '20', position: 'relative' }]}>
                            <Ionicons name="sparkles" size={48} color={colors.primary} />
                            {successModal.item && (
                                <View style={{ position: 'absolute', bottom: -5, right: -5, backgroundColor: '#1C1C21', borderRadius: 18, padding: 6, borderWidth: 2, borderColor: colors.primary }}>
                                    {renderItemIcon(successModal.item, 24, colors.primary)}
                                </View>
                            )}
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{successModal.title || 'Sucesso!'}</Text>
                        <Text style={[styles.modalSub, { color: colors.subtext, textAlign: 'center' }]}>
                            {successModal.extraMsg}
                        </Text>
                        
                        <Pressable 
                            style={[styles.modalBtn, { backgroundColor: colors.primary, width: '100%', marginTop: 10 }]} 
                            onPress={() => setSuccessModal({ visible: false, item: null, extraMsg: '', title: 'Sucesso!' })}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '800' }}>Excelente!</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.7 },
    cardDescription: { fontSize: 10, color: '#AAA', marginTop: 4, textAlign: 'center' },
    floatingWallets: { 
        position: 'absolute', 
        right: 16, 
        zIndex: 110, 
        flexDirection: 'row',
        gap: 8, 
        alignItems: 'center' 
    },
    walletsCol: { flexDirection: 'row', gap: 6 },
    walletBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        gap: 6,
        minWidth: 70,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    walletText: { fontSize: 12, fontWeight: '900' },

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

    // ─── Modals ───
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    modalContent: { width: '100%', backgroundColor: '#1C1C21', borderRadius: 32, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    modalIconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#2C2C31', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
    modalSub: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
    priceRowLarge: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#000', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 24 },
    priceTextLarge: { fontSize: 24, fontWeight: '900' },
    modalActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    modalBtn: { flex: 1, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
