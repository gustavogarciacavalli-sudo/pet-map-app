import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    Pressable, 
    ImageBackground, 
    Animated, 
    Dimensions,
    ScrollView,
    Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
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

const { width, height } = Dimensions.get('window');

export default function PetHomeScreen() {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    
    const [pet, setPet] = useState<LocalPet | null>(null);
    const [stats, setStats] = useState({ xp: 0, level: 1 });
    const [energy, setEnergy] = useState(100);
    const [happiness, setHappiness] = useState(100);
    const [coins, setCoins] = useState(0);
    const [inventory, setInventory] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'home' | 'wardrobe' | 'train'>('home');
    
    const bounceAnim = new Animated.Value(0);
    const heartAnim = new Animated.Value(0);

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
        
        // Pequena animação de respiro para o pet
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: -10,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(bounceAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const handleUpdateAccessory = async (acc: string) => {
        await updatePetAccessoryLocal(acc);
        const updatedPet = await getPetLocal();
        setPet(updatedPet);
        Alert.alert("Sucesso", "Acessório atualizado!");
    };

    const handleTrain = async () => {
        if (energy < 20) {
            Alert.alert("Pet Cansado", "Seu pet precisa descansar (caminhar no mapa) para recuperar energia!");
            return;
        }
        
        const newEnergy = energy - 20;
        await saveEnergyLocal(newEnergy);
        setEnergy(newEnergy);
        
        const result = await addXPLocal(50);
        setStats({ xp: result.xp, level: result.level });
        
        if (result.leveledUp) {
            Alert.alert("LEVEL UP!", `Parabéns! Seu pet agora é Nível ${result.level}!`);
        } else {
            Alert.alert("Treino Concluído", "+50 XP ganhos!");
        }
    };

    const handlePetting = async () => {
        const next = await addHappinessLocal(5);
        setHappiness(next);
        
        // Animamos o coração
        heartAnim.setValue(0);
        Animated.sequence([
            Animated.timing(heartAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(heartAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start();
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color="#FFF" />
            </Pressable>
            
            <View style={styles.statsRow}>
                <View style={[styles.statBadge, { backgroundColor: '#1C1C21', borderColor: '#FF444444', borderWidth: 1 }]}>
                    <Ionicons name="heart" size={13} color="#FF4444" />
                    <Text style={styles.statText}>{happiness}%</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: '#1C1C21', borderColor: '#FFD70044', borderWidth: 1 }]}>
                    <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFD700" />
                    <Text style={styles.statText}>{energy}%</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: '#1C1C21', borderColor: '#A78BFF44', borderWidth: 1 }]}>
                    <Ionicons name="wallet" size={13} color="#A78BFF" />
                    <Text style={styles.statText}>{coins}</Text>
                </View>
            </View>
        </View>
    );

    const renderPetHome = () => (
        <View style={styles.homeContent}>
            <Pressable onPress={handlePetting} style={styles.petContainer}>
                <Animated.View 
                    style={{ 
                        position: 'absolute', 
                        top: -40, 
                        opacity: heartAnim,
                        transform: [{ translateY: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }]
                    }}
                >
                    <Ionicons name="heart" size={40} color="#FF6B6B" />
                </Animated.View>
                <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                    <PetPreview species={pet?.species || 'bunny'} size={width * 0.6} />
                </Animated.View>
                <View style={styles.petShadow} />
            </Pressable>
            
            <View style={styles.infoCard}>
                <Text style={styles.petName}>{pet?.name || 'Explorador'}</Text>
                <Text style={styles.petSubtitle}>Nível {stats.level} • {pet?.personality || 'Curioso'}</Text>
                
                <View style={styles.xpBarContainer}>
                    <View style={[styles.xpBarFill, { width: `${(stats.xp / (stats.level * 200)) * 100}%` }]} />
                </View>
                <Text style={styles.xpText}>{stats.xp} / {stats.level * 200} XP</Text>
            </View>
        </View>
    );

    const renderWardrobe = () => (
        <View style={styles.wardrobeContainer}>
            <Text style={styles.sectionTitle}>Guarda-Roupa</Text>
            <ScrollView contentContainerStyle={styles.inventoryGrid}>
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
                                <>
                                    <Ionicons name="close-circle" size={32} color="#666" />
                                    <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>Remover</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name={itemDef?.icon as any} size={32} color="#A78BFF" />
                                    <Text style={{ color: '#AAA', fontSize: 10, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{itemDef?.name}</Text>
                                </>
                            )}
                        </Pressable>
                    );
                })}
                {inventory.length === 0 && (
                    <View style={styles.emptyInventory}>
                        <Text style={{ color: '#888', textAlign: 'center' }}>Você ainda não tem acessórios. Visite a Loja!</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );

    const renderTraining = () => (
        <View style={styles.trainingContainer}>
            <Text style={styles.sectionTitle}>Centro de Treinamento</Text>
            <View style={styles.trainCard}>
                <MaterialCommunityIcons name="weight-lifter" size={64} color="#A78BFF" />
                <Text style={styles.trainTitle}>Treino Intensivo</Text>
                <Text style={styles.trainDesc}>Consome 20 de Energia para ganhar 50 XP.</Text>
                <Pressable 
                    style={[styles.trainBtn, energy < 20 && { opacity: 0.5 }]} 
                    onPress={handleTrain}
                >
                    <Text style={styles.trainBtnText}>Treinar Agora</Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <View 
            style={[styles.container, { backgroundColor: '#141419' }]}
        >
            <SafeAreaView style={{ flex: 1 }}>
                {renderHeader()}
                
                <View style={{ flex: 1 }}>
                    {activeTab === 'home' && renderPetHome()}
                    {activeTab === 'wardrobe' && renderWardrobe()}
                    {activeTab === 'train' && renderTraining()}
                </View>

                {/* Bottom Navigation for PetHome */}
                <View style={styles.bottomNav}>
                    <Pressable 
                        onPress={() => setActiveTab('home')} 
                        style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
                    >
                        <Ionicons name="home" size={20} color={activeTab === 'home' ? '#FFF' : '#888'} />
                        <Text style={[styles.navText, { color: activeTab === 'home' ? '#FFF' : '#888' }]}>Lar</Text>
                    </Pressable>
                    <Pressable 
                        onPress={() => setActiveTab('wardrobe')} 
                        style={[styles.navItem, activeTab === 'wardrobe' && styles.navItemActive]}
                    >
                        <Ionicons name="shirt" size={20} color={activeTab === 'wardrobe' ? '#FFF' : '#888'} />
                        <Text style={[styles.navText, { color: activeTab === 'wardrobe' ? '#FFF' : '#888' }]}>Estilo</Text>
                    </Pressable>
                    <Pressable 
                        onPress={() => setActiveTab('train')} 
                        style={[styles.navItem, activeTab === 'train' && styles.navItemActive]}
                    >
                        <MaterialCommunityIcons name="sword-cross" size={20} color={activeTab === 'train' ? '#FFF' : '#888'} />
                        <Text style={[styles.navText, { color: activeTab === 'train' ? '#FFF' : '#888' }]}>Treino</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingTop: 50, 
        paddingBottom: 10 
    },
    backBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: 'rgba(0,0,0,0.3)', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 20, 
        gap: 5 
    },
    statText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    
    // Home Content
    homeContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    petContainer: { alignItems: 'center', marginBottom: 30 },
    petShadow: { 
        width: 120, 
        height: 20, 
        backgroundColor: 'rgba(0,0,0,0.1)', 
        borderRadius: 10, 
        marginTop: -10 
    },
    infoCard: { 
        backgroundColor: '#1C1C21', 
        padding: 24, 
        borderRadius: 32, 
        width: '90%', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    petName: { fontSize: 28, fontWeight: '900', color: '#FFF' },
    petSubtitle: { fontSize: 14, color: '#AAA', marginTop: 5, fontWeight: '700' },
    xpBarContainer: { 
        width: '100%', 
        height: 10, 
        backgroundColor: '#2C2C31', 
        borderRadius: 5, 
        marginTop: 24, 
        overflow: 'hidden' 
    },
    xpBarFill: { height: '100%', backgroundColor: '#A78BFF' },
    xpText: { fontSize: 11, color: '#AAA', marginTop: 10, fontWeight: '800' },

    // Wardrobe & Train
    sectionTitle: { fontSize: 24, fontWeight: '900', color: '#A78BFF', margin: 25 },
    inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 15, justifyContent: 'center' },
    inventoryItem: { 
        width: 80, 
        height: 80, 
        borderRadius: 20, 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    emptyInventory: { width: '100%', padding: 40 },
    wardrobeContainer: { flex: 1 },
    trainingContainer: { flex: 1, alignItems: 'center' },
    trainCard: { 
        width: '85%', 
        padding: 30, 
        backgroundColor: 'rgba(167, 139, 255, 0.1)', 
        borderRadius: 30, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(167, 139, 255, 0.2)'
    },
    trainTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', marginTop: 15 },
    trainDesc: { textAlign: 'center', color: '#888', marginTop: 10, lineHeight: 20 },
    trainBtn: { 
        backgroundColor: '#A78BFF', 
        paddingHorizontal: 40, 
        paddingVertical: 15, 
        borderRadius: 20, 
        marginTop: 25 
    },
    trainBtnText: { color: '#FFF', fontWeight: '800' },

    // Bottom Navigation
    bottomNav: { 
        flexDirection: 'row', 
        backgroundColor: 'rgba(0,0,0,0.2)', 
        margin: 20, 
        borderRadius: 25, 
        padding: 10,
        height: 70,
        alignItems: 'center'
    },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
    navItemActive: { backgroundColor: '#A78BFF', borderRadius: 20 },
    navText: { fontSize: 10, fontWeight: '800', marginTop: 4 }
});
