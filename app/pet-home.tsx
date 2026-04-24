import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    Pressable, 
    Animated, 
    Dimensions,
    ScrollView,
    Alert,
    LayoutAnimation,
    Platform,
    UIManager,
    Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import { PetPreview } from '../components/PetPreview';
import { 
    getPetLocal, 
    getLevelDataLocal, 
    getEnergyLocal, 
    getInventoryLocal, 
    updatePetAccessoryLocal,
    addXPLocal,
    saveEnergyLocal,
    LocalPet,
    getCoinsLocal,
    getHappinessLocal,
    addHappinessLocal
} from '../localDatabase';
import { LinearGradient } from 'expo-linear-gradient';
import { CATALOG } from '../constants/catalog';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width, height } = Dimensions.get('window');
const FURNITURE_CATEGORIES = ['Todos', 'Móveis', 'Luminárias', 'Tapetes', 'Diversos'];

export default function PetHomeScreen() {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    
    const [pet, setPet] = useState<LocalPet | null>(null);
    const [stats, setStats] = useState({ xp: 0, level: 1 });
    const [energy, setEnergy] = useState(100);
    const [happiness, setHappiness] = useState(100);
    const [coins, setCoins] = useState(0);
    const [inventory, setInventory] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'home' | 'pet' | 'train'>('home');
    const [showFurnitureDrawer, setShowFurnitureDrawer] = useState(false);
    const [placedItems, setPlacedItems] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    
    // Purchase Modal States
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedLockedItem, setSelectedLockedItem] = useState<any>(null);

    const bounceAnim = useRef(new Animated.Value(0)).current;
    const heartAnim = useRef(new Animated.Value(0)).current;
    const decorateAnim = useRef(new Animated.Value(0)).current;

    const loadData = async () => {
        const localPet = await getPetLocal();
        const levelData = await getLevelDataLocal();
        const localEnergy = await getEnergyLocal();
        const localHappiness = await getHappinessLocal();
        const localInv = await getInventoryLocal();
        const localCoins = await getCoinsLocal();
        
        setPet(localPet);
        setStats(levelData);
        setEnergy(localEnergy);
        setHappiness(localHappiness);
        setInventory(localInv);
        setCoins(localCoins);
    };

    useEffect(() => {
        loadData();
        
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: -10, duration: 1500, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
            ])
        ).start();
    }, []);

    useEffect(() => {
        Animated.spring(decorateAnim, {
            toValue: showFurnitureDrawer ? 1 : 0,
            useNativeDriver: false,
            friction: 8,
            tension: 40
        }).start();
    }, [showFurnitureDrawer]);

    const handleUpdateAccessory = async (acc: string) => {
        await updatePetAccessoryLocal(acc);
        const updatedPet = await getPetLocal();
        setPet(updatedPet);
        Alert.alert("Sucesso", "Visual atualizado!");
    };

    const handlePetting = async () => {
        const next = await addHappinessLocal(5);
        setHappiness(next);
        heartAnim.setValue(0);
        Animated.sequence([
            Animated.timing(heartAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(heartAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start();
    };

    const toggleDrawer = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowFurnitureDrawer(!showFurnitureDrawer);
    };

    const renderHeader = () => {
        const moveDistance = -(width - 165); 
        const translateX = decorateAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, moveDistance] 
        });

        return (
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={20} color="#FFF" />
                </Pressable>
                
                {showFurnitureDrawer && (
                    <Animated.View style={[styles.headerCategories, { opacity: decorateAnim }]}>
                        <LinearGradient 
                            colors={['#141419', 'transparent']} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 0 }} 
                            style={styles.headerFadeLeft} 
                        />
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={{ paddingLeft: 10, paddingRight: 30 }}
                        >
                            {FURNITURE_CATEGORIES.map(cat => (
                                <Pressable 
                                    key={cat} 
                                    onPress={() => setSelectedCategory(cat)}
                                    style={[styles.categoryChipHeader, selectedCategory === cat && styles.categoryChipActive]}
                                >
                                    <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <LinearGradient 
                            colors={['transparent', '#141419']} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 0 }} 
                            style={styles.headerFadeRight} 
                        />
                    </Animated.View>
                )}

                {activeTab === 'home' && (
                    <Animated.View style={{ transform: [{ translateX }], zIndex: 20 }}>
                        <Pressable 
                            style={[styles.decorateBtnHeader, showFurnitureDrawer && styles.decorateBtnActive]}
                            onPress={toggleDrawer}
                        >
                            <Ionicons name={showFurnitureDrawer ? "close" : "construct"} size={14} color="#FFF" />
                            <Text style={styles.decorateBtnText}>{showFurnitureDrawer ? "Sair" : "Decorar"}</Text>
                        </Pressable>
                    </Animated.View>
                )}
            </View>
        );
    };

    const renderPetHome = () => {
        const allFurniture = CATALOG.filter(item => {
            if (item.tab !== 'home') return false;
            return selectedCategory === 'Todos' || item.category === selectedCategory;
        });

        return (
            <View style={styles.homeContent}>
                {showFurnitureDrawer && (
                    <Pressable 
                        style={styles.drawerOverlay} 
                        onPress={() => setShowFurnitureDrawer(false)}
                    />
                )}

                <View style={styles.roomContainer}>
                    <View style={styles.wallLeft} />
                    <View style={styles.wallRight} />
                    <View style={styles.floor} />

                    <View style={styles.decorLayer}>
                        {placedItems.map((id, idx) => {
                            const item = CATALOG.find(c => c.id === id);
                            let pos = { bottom: 20, left: 20 };
                            if (id === 'pet_bed') pos = { bottom: 40, left: 30 };
                            if (id === 'rug') pos = { bottom: 10, left: 50 };
                            if (id === 'lamp') pos = { bottom: 100, left: 10 };
                            if (id === 'gaming_chair') pos = { bottom: 40, left: 180 };
                            if (id === 'pet_bowl') pos = { bottom: 20, left: 140 };

                            return (
                                <View key={idx} style={[styles.placedItem, { bottom: pos.bottom, left: pos.left }]}>
                                    <Ionicons name={item?.icon as any} size={40} color="#FFD700" />
                                    <View style={styles.itemShadow} />
                                </View>
                            );
                        })}
                    </View>

                    <Pressable onPress={handlePetting} style={styles.petPlacement}>
                        <Animated.View 
                            style={{ 
                                position: 'absolute', top: -40, opacity: heartAnim,
                                transform: [{ translateY: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }]
                            }}
                        >
                            <Ionicons name="heart" size={40} color="#FF6B6B" />
                        </Animated.View>
                        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                            <PetPreview species={pet?.species || 'bunny'} size={width * 0.5} />
                        </Animated.View>
                        <View style={styles.petShadow} />
                    </Pressable>
                </View>

                {showFurnitureDrawer && (
                    <View style={styles.furnitureDrawer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
                            {allFurniture.map((item, idx) => {
                                const isOwned = inventory.includes(item.id);
                                const isPlaced = placedItems.includes(item.id);

                                return (
                                    <Pressable 
                                        key={idx} 
                                        style={[styles.furnitureItem, !isOwned && { opacity: 0.6 }]}
                                        onPress={() => {
                                            if (!isOwned) {
                                                setSelectedLockedItem(item);
                                                setShowPurchaseModal(true);
                                                return;
                                            }
                                            if (!isPlaced) {
                                                setPlacedItems([...placedItems, item.id]);
                                            } else {
                                                setPlacedItems(placedItems.filter(i => i !== item.id));
                                            }
                                        }}
                                    >
                                        <View style={[
                                            styles.furnitureIconBox,
                                            isPlaced && { borderColor: '#FFD700', borderWidth: 2 },
                                            !isOwned && { backgroundColor: '#111' }
                                        ]}>
                                            <Ionicons 
                                                name={item.icon as any} 
                                                size={24} 
                                                color={isOwned ? "#FFD700" : "#444"} 
                                            />
                                            {!isOwned && (
                                                <View style={styles.lockOverlay}>
                                                    <Ionicons name="lock-closed" size={16} color="#FFF" />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.furnitureLabel, !isOwned && { color: '#444' }]}>
                                            {item.name.split(' ')[0]}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    const renderPetTab = () => (
        <View style={styles.petTabContainer}>
            <View style={styles.petStatsHeader}>
                <View style={styles.petMainInfo}>
                    <Text style={styles.petNameLarge}>{pet?.name || 'Explorador'}</Text>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>Lvl {stats.level}</Text>
                    </View>
                </View>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Ionicons name="heart" size={20} color="#FF4444" />
                        <Text style={stats.levelBadgeText}>{happiness}%</Text>
                        <Text style={styles.statLabel}>Felicidade</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="lightning-bolt" size={22} color="#FFD700" />
                        <Text style={styles.statVal}>{energy}%</Text>
                        <Text style={styles.statLabel}>Energia</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="wallet" size={20} color="#A78BFF" />
                        <Text style={styles.statVal}>{coins}</Text>
                        <Text style={styles.statLabel}>Moedas</Text>
                    </View>
                </View>
                <View style={styles.xpProgressContainer}>
                    <View style={styles.xpLabelRow}>
                        <Text style={styles.xpLabel}>Experiência</Text>
                        <Text style={styles.xpValue}>{stats.xp} / {stats.level * 200}</Text>
                    </View>
                    <View style={styles.xpBarBackground}>
                        <View style={[styles.xpBarFill, { width: `${Math.min((stats.xp / (stats.level * 200)) * 100, 100)}%` }]} />
                    </View>
                </View>
            </View>
            <Text style={styles.sectionTitlePet}>Personalizar Visual</Text>
            <ScrollView contentContainerStyle={styles.inventoryGridPet}>
                {['none', ...inventory.filter(id => CATALOG.find(c => c.id === id)?.tab === 'accessory')].map((item, index) => {
                    const itemDef = CATALOG.find(c => c.id === item);
                    return (
                        <Pressable 
                            key={index} 
                            style={[
                                styles.inventoryItem, 
                                pet?.accessory === item && { borderColor: '#A78BFF', borderWidth: 2 }
                            ]}
                            onPress={() => handleUpdateAccessory(item)}
                        >
                            {item === 'none' ? (
                                <Ionicons name="close-circle" size={32} color="#666" />
                            ) : (
                                <Ionicons name={itemDef?.icon as any} size={32} color="#A78BFF" />
                            )}
                            <Text style={styles.itemLabelPet}>{item === 'none' ? 'Nenhum' : itemDef?.name}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: '#141419' }]}>
            <SafeAreaView style={{ flex: 1 }}>
                {renderHeader()}
                <View style={{ flex: 1 }}>
                    {activeTab === 'home' && renderPetHome()}
                    {activeTab === 'pet' && renderPetTab()}
                    {activeTab === 'train' && (
                        <View style={styles.trainingContainer}>
                            <Text style={styles.sectionTitle}>Centro de Treinamento</Text>
                            <View style={styles.trainCard}>
                                <MaterialCommunityIcons name="weight-lifter" size={64} color="#A78BFF" />
                                <Text style={styles.trainTitle}>Treino Intensivo</Text>
                                <Text style={styles.trainDesc}>Consome 20 de Energia para ganhar 50 XP.</Text>
                                <Pressable style={[styles.trainBtn, energy < 20 && { opacity: 0.5 }]} onPress={() => Alert.alert("Treino", "Em breve!")}>
                                    <Text style={styles.trainBtnText}>Treinar Agora</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>

                {/* Bottom Navigation */}
                <View style={styles.bottomNav}>
                    <Pressable onPress={() => setActiveTab('home')} style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}>
                        <Ionicons name="home" size={20} color={activeTab === 'home' ? '#FFF' : '#888'} />
                        <Text style={[styles.navText, { color: activeTab === 'home' ? '#FFF' : '#888' }]}>Lar</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('pet')} style={[styles.navItem, activeTab === 'pet' && styles.navItemActive]}>
                        <Ionicons name="paw" size={20} color={activeTab === 'pet' ? '#FFF' : '#888'} />
                        <Text style={[styles.navText, { color: activeTab === 'pet' ? '#FFF' : '#888' }]}>Pet</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('train')} style={[styles.navItem, activeTab === 'train' && styles.navItemActive]}>
                        <MaterialCommunityIcons name="sword-cross" size={20} color={activeTab === 'train' ? '#FFF' : '#888'} />
                        <Text style={[styles.navText, { color: activeTab === 'train' ? '#FFF' : '#888' }]}>Treino</Text>
                    </Pressable>
                </View>

                {/* Custom Purchase Modal */}
                <Modal
                    visible={showPurchaseModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowPurchaseModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalIconBox}>
                                    <Ionicons name="lock-closed" size={32} color="#A78BFF" />
                                </View>
                                <Text style={styles.modalTitle}>Item Bloqueado</Text>
                                <Text style={styles.modalDesc}>
                                    Você ainda não possui o item <Text style={{ color: '#A78BFF', fontWeight: '900' }}>{selectedLockedItem?.name}</Text>. Deseja ir à loja agora?
                                </Text>
                            </View>

                            <View style={styles.modalFooter}>
                                <Pressable 
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowPurchaseModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>Agora não</Text>
                                </Pressable>
                                <Pressable 
                                    style={styles.modalActionBtn}
                                    onPress={() => {
                                        setShowPurchaseModal(false);
                                        // Redireciona para loja indicando o item
                                        router.push({ pathname: '/shop', params: { tab: 'home', highlight: selectedLockedItem?.id } });
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#A78BFF', '#7C3AED']}
                                        style={styles.modalActionGradient}
                                    >
                                        <Text style={styles.modalActionText}>Ir para Loja</Text>
                                        <Ionicons name="cart" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    decorateBtnHeader: { 
        backgroundColor: '#A78BFF', 
        paddingHorizontal: 16, 
        height: 36, 
        borderRadius: 15, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6 
    },
    decorateBtnActive: { backgroundColor: '#FF4444' },
    decorateBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
    
    homeContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    drawerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 15 },
    roomContainer: { width: width, height: height * 0.7, backgroundColor: '#1C1C21', overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, borderWidth: 1, borderColor: '#333' },
    wallLeft: { position: 'absolute', top: 0, left: 0, bottom: 150, width: '50%', backgroundColor: '#23232A', transform: [{ skewY: '12deg' }], borderRightWidth: 1, borderColor: '#000' },
    wallRight: { position: 'absolute', top: 0, right: 0, bottom: 150, width: '50%', backgroundColor: '#1A1A20', transform: [{ skewY: '-12deg' }] },
    floor: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, backgroundColor: '#2C2C35', borderTopWidth: 2, borderColor: '#111' },
    decorLayer: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
    placedItem: { position: 'absolute', alignItems: 'center' },
    itemShadow: { width: 30, height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, marginTop: -5 },
    petPlacement: { position: 'absolute', bottom: 60, alignSelf: 'center', alignItems: 'center' },
    petShadow: { width: 100, height: 15, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, marginTop: -5 },
    
    furnitureDrawer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1C1C21', paddingVertical: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: '#333', zIndex: 20 },
    headerCategories: { position: 'absolute', right: 0, left: 170, top: 54, height: 40, justifyContent: 'center', zIndex: 10 },
    headerFadeLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 15, zIndex: 11 },
    headerFadeRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 30, zIndex: 11 },
    categoryChipHeader: { paddingHorizontal: 12, height: 32, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center' },
    categoryChipActive: { backgroundColor: '#A78BFF', borderColor: '#A78BFF' },
    categoryText: { color: '#888', fontSize: 11, fontWeight: '700' },
    categoryTextActive: { color: '#FFF' },
    furnitureItem: { alignItems: 'center', marginHorizontal: 10, width: 70 },
    furnitureIconBox: { width: 60, height: 60, borderRadius: 15, backgroundColor: '#2C2C31', alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' },
    lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    furnitureLabel: { color: '#AAA', fontSize: 10, fontWeight: '700' },

    petTabContainer: { flex: 1 },
    petStatsHeader: { padding: 25, backgroundColor: 'rgba(167, 139, 255, 0.05)', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    petMainInfo: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
    petNameLarge: { fontSize: 32, fontWeight: '900', color: '#FFF' },
    levelBadge: { backgroundColor: '#A78BFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    levelBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    statCard: { flex: 1, backgroundColor: '#1C1C21', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statVal: { fontSize: 18, fontWeight: '900', color: '#FFF', marginTop: 8 },
    statLabel: { fontSize: 10, color: '#666', fontWeight: '700', marginTop: 2 },
    xpProgressContainer: { width: '100%' },
    xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    xpLabel: { color: '#AAA', fontSize: 12, fontWeight: '700' },
    xpValue: { color: '#FFF', fontSize: 12, fontWeight: '900' },
    xpBarBackground: { height: 8, backgroundColor: '#2C2C31', borderRadius: 4, overflow: 'hidden' },
    xpBarFill: { height: '100%', backgroundColor: '#A78BFF' },
    sectionTitlePet: { fontSize: 18, fontWeight: '900', color: '#A78BFF', marginHorizontal: 25, marginTop: 25, marginBottom: 15 },
    inventoryGridPet: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
    inventoryItem: { width: (width - 64) / 3, height: 100, borderRadius: 20, backgroundColor: '#1C1C21', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    itemLabelPet: { color: '#666', fontSize: 10, fontWeight: '700', marginTop: 8, textAlign: 'center' },

    trainingContainer: { flex: 1, alignItems: 'center' },
    sectionTitle: { fontSize: 24, fontWeight: '900', color: '#A78BFF', margin: 25 },
    trainCard: { width: '85%', padding: 30, backgroundColor: 'rgba(167, 139, 255, 0.1)', borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(167, 139, 255, 0.2)' },
    trainTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', marginTop: 15 },
    trainDesc: { textAlign: 'center', color: '#888', marginTop: 10, lineHeight: 20 },
    trainBtn: { backgroundColor: '#A78BFF', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 20, marginTop: 25 },
    trainBtnText: { color: '#FFF', fontWeight: '800' },

    bottomNav: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', margin: 20, borderRadius: 25, padding: 10, height: 70, alignItems: 'center' },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
    navItemActive: { backgroundColor: '#A78BFF', borderRadius: 20 },
    navText: { fontSize: 10, fontWeight: '800', marginTop: 4 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width * 0.85, backgroundColor: '#1C1C21', borderRadius: 30, padding: 30, borderWidth: 1, borderColor: 'rgba(167, 139, 255, 0.2)', alignItems: 'center' },
    modalHeader: { alignItems: 'center', marginBottom: 25 },
    modalIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(167, 139, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', marginBottom: 10 },
    modalDesc: { color: '#AAA', textAlign: 'center', fontSize: 14, lineHeight: 22 },
    modalFooter: { flexDirection: 'row', gap: 12, width: '100%' },
    modalCancelBtn: { flex: 1, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { color: '#888', fontWeight: '700' },
    modalActionBtn: { flex: 1.5, height: 50, borderRadius: 15, overflow: 'hidden' },
    modalActionGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    modalActionText: { color: '#FFF', fontWeight: '900' }
});
