import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert, Text, Platform, Pressable, Image, ScrollView, Switch, Dimensions, Animated, PanResponder, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useTheme } from '@/components/ThemeContext';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';

import { MapViewLibre, MapMarkerLibre } from '@/components/MapViewLibre';
import { GameMarker } from '@/components/GameMarker';
import { SpotMarker, SpotType } from '@/components/SpotMarker';
import { useSupabaseRealtime } from '@/components/SupabaseRealtimeProvider';
import { ParticleSystem, ParticleSystemRef } from '@/components/ParticleSystem';
import { AuthService } from '@/services/AuthService';
import { supabase } from '@/services/supabaseConfig';
import { PetPreview } from '@/components/PetPreview';
import { isValidUUID } from '@/services/AuthService';

import { 
    getPetLocal, 
    LocalPet, 
    getCoinsLocal, 
    saveCoinsLocal, 
    getLevelDataLocal, 
    addXPLocal, 
    getHappinessLocal,
    getSettingsLocal,
    consumeItemLocal,
    getRadarCooldownLocal,
    saveRadarCooldownLocal,
    addDistanceLocal, 
    recordVisitLocal, 
    savePathPointLocal, 
    getTotalDistanceLocal, 
    LocalUser, 
    getCurrentUserLocal, 
    getPathByDateLocal,
    getInventoryLocal,
    getGemsLocal,
    saveGemsLocal,
    addCoinsLocal
} from '@/localDatabase';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface CoinSpawn { id: string; latitude: number; longitude: number; }

const QUICK_MESSAGES = [
    { id: 'q1', text: 'Beijos!', icon: 'heart', color: '#E74C3C' },
    { id: 'q2', text: 'A que horas chega?', icon: 'time', color: '#8E8E9A' },
    { id: 'q3', text: 'Estou a caminho', icon: 'car', color: '#7C3AED' },
    { id: 'q4', text: 'Tudo bem?', icon: 'chatbubble-ellipses', color: '#3498DB' },
];

const PET_SPOTS: { id: string, name: string, type: SpotType, lat: number, lon: number }[] = [
    { id: 'spot1', name: 'Parque Dog Feliz', type: 'park', lat: -25.4330, lon: -49.2810 },
    { id: 'spot2', name: 'Pet Shop VIP', type: 'shop', lat: -25.4350, lon: -49.2820 },
    { id: 'spot3', name: 'Shopping Pet Center', type: 'mall', lat: -25.4320, lon: -49.2840 },
    { id: 'spot4', name: 'Clínica Veterina 24h', type: 'vet', lat: -25.4370, lon: -49.2800 },
];

export default function MapScreen() {
    const { colors, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const particleRef = useRef<ParticleSystemRef>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const router = useRouter();
    
    const [pet, setPet] = useState<LocalPet | null>(null);
    const [coins, setCoins] = useState(0);
    const [levelData, setLevelData] = useState({ xp: 0, level: 1 });
    const [spawns, setSpawns] = useState<CoinSpawn[]>([]);
    const [totalDistance, setTotalDistance] = useState(0);
    const [pendingFriendsCount, setPendingFriendsCount] = useState(0);

    const { 
        remoteUsers, 
        broadcastLocation, 
        broadcastSOS, 
        broadcastSyncInvite, 
        broadcastSyncAccept,
        setOnSyncInvite,
        setOnSyncAccept
    } = useSupabaseRealtime();
    
    const lastLocation = useRef<{latitude: number, longitude: number} | null>(null);
    const [location, setLocation] = useState({
        latitude: -23.5505, longitude: -46.6333,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
        heading: 0,
    });

    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showMemberDetail, setShowMemberDetail] = useState(false);
    const [activeCircle, setActiveCircle] = useState('Principal');
    const [userCircles, setUserCircles] = useState<any[]>([]);
    const [showCircleSelector, setShowCircleSelector] = useState(false);
    const [activeCircleMembers, setActiveCircleMembers] = useState<string[]>([]);
    const [circleMembers, setCircleMembers] = useState<any[]>([]);
    const [showSOSConfirm, setShowSOSConfirm] = useState(false);
    const [incomingSOS, setIncomingSOS] = useState<any>(null);
    const [isNearSpot, setIsNearSpot] = useState(false);
    const [activeSpot, setActiveSpot] = useState<any>(null);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [economyMode, setEconomyMode] = useState(false);

    // MECÂNICAS ATIVAS
    const [isSynced, setIsSynced] = useState(false);
    const [syncPayload, setSyncPayload] = useState<any>(null); // Convite recebido
    const [showBackpack, setShowBackpack] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [radarTimer, setRadarTimer] = useState(0); // Cooldown em segundos
    const [treasures, setTreasures] = useState<{id: string, lat: number, lon: number, type: 'gold' | 'gem'}[]>([]);

    const setupBattery = async () => {
        const level = await Battery.getBatteryLevelAsync();
        setBatteryLevel(Math.round(level * 100));
    };

    useEffect(() => {
        setupBattery();
        let subscription: any;
        if (Platform.OS !== 'web') {
            subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
                setBatteryLevel(Math.round(batteryLevel * 100));
            });
        }
        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    useEffect(() => {
        let channel: any;
        const setupSocialSync = async () => {
            const user = await getCurrentUserLocal();
            if (!user) return;
            
            // Buscar pedidos pendentes para o Badge
            const pending = await AuthService.getPendingRequestsCloud(user.id);
            setPendingFriendsCount(pending.length);

            const friendIds = await AuthService.getFriendsCloud(user.id);
            if (friendIds.length === 0) return;

            const { data: initialLocs } = await supabase
                .from('locations')
                .select('*, profiles(name, wander_id)')
                .in('user_id', friendIds)
                .eq('ghost_mode', false);

            if (initialLocs) {
                const formatted = initialLocs.map((l: any) => ({
                    id: l.user_id,
                    name: l.profiles?.name || 'Explorador',
                    lat: l.latitude,
                    lon: l.longitude,
                    online: (new Date().getTime() - new Date(l.updated_at).getTime()) < 60000,
                    battery: 85,
                    since: 'Agora'
                }));
                // @ts-ignore
                setCircleMembers(formatted);
            }

            channel = supabase
                .channel('friend-locations')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'locations',
                    filter: `user_id=in.(${friendIds.join(',')})`
                }, (payload: any) => {
                    const updated = payload.new;
                    if (updated.ghost_mode) {
                        setCircleMembers(prev => prev.filter(m => m.id !== updated.user_id));
                    } else {
                        setCircleMembers(prev => {
                            const idx = prev.findIndex(m => m.id === updated.user_id);
                            if (idx !== -1) {
                                return prev.map(m => m.id === updated.user_id ? { ...m, lat: updated.latitude, lon: updated.longitude, online: true } : m);
                            }
                            return prev;
                        });
                    }
                })
                .on('broadcast', { event: 'location' }, () => {}) // Já tratado pelo Provider
                .on('broadcast', { event: 'SOS_ALERT' }, ({ payload }) => {
                    // Verificar se o remetente é um amigo antes de mostrar (opcional, mas recomendado)
                    setIncomingSOS(payload);
                    // Vibrar ou tocar som se possível
                    setTimeout(() => setIncomingSOS(null), 10000); // Some após 10s
                })
                .subscribe();
        };

        setupSocialSync();

        // Listeners de Sincronia
        setOnSyncInvite((payload) => {
            // Verificar raio de 1km
            if (lastLocation.current) {
                const dist = calculateDistance(lastLocation.current.latitude, lastLocation.current.longitude, payload.location.latitude, payload.location.longitude);
                if (dist <= 1000) {
                    setSyncPayload(payload);
                    setTimeout(() => setSyncPayload(null), 15000); // Some após 15s
                }
            }
        });

        setOnSyncAccept((payload) => {
            setIsSynced(true);
            Alert.alert("Sincronizado!", "Você e seu amigo agora ganham +50% XP e Moedas!");
            setTimeout(() => setIsSynced(false), 300000); // Dura 5 minutos por padrão
        });

        // Carregar Cooldown do Radar
        const loadRadar = async () => {
            const last = await getRadarCooldownLocal();
            const diff = Math.floor((Date.now() - last) / 1000);
            if (diff < 600) setRadarTimer(600 - diff);
        };
        loadRadar();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const [debugStatus, setDebugStatus] = useState("");

    useEffect(() => {
        const runDiagnostics = async () => {
            try {
                const user = await getCurrentUserLocal();
                if (user && !user.id.includes('-')) {
                    const { data: profile } = await supabase.from('profiles').select('id').eq('name', 'Roover').single();
                    if (profile) {
                        const newUser = { ...user, id: profile.id };
                        await AsyncStorage.setItem('@wanderpet_current_user', JSON.stringify(newUser));
                        setDebugStatus("🔄 Sessão atualizada!");
                        setTimeout(() => router.replace('/(tabs)'), 1000);
                        return;
                    }
                }
                const groups = await AuthService.getGroups();
                setDebugStatus(`✅ Conectado! Clãs: ${groups.length}`);
                setTimeout(() => setDebugStatus(""), 10000);
            } catch (e) {
                setDebugStatus(`❌ Erro: ${String(e)}`);
            }
        };
        runDiagnostics();
    }, []);
    
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const SHEET_MIN = Math.max(24, insets.bottom + 12);
    const SHEET_MAX = SCREEN_HEIGHT - (insets.top + 200); // Aumentado para mostrar mais conteúdo, mas com margem para o HUD

    const sheetHeightAnim = useRef(new Animated.Value(SHEET_MIN)).current;
    const lastSheetHeight = useRef(SHEET_MIN);
    const navigation = useNavigation();
    
    const expandSheet = () => {
        navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
        Animated.spring(sheetHeightAnim, { 
            toValue: SHEET_MAX, 
            bounciness: 4,
            speed: 12,
            useNativeDriver: false 
        }).start();
        lastSheetHeight.current = SHEET_MAX;
    };

    const collapseSheet = () => {
        const target = SHEET_MIN;
        if (target === SHEET_MIN) {
            navigation.getParent()?.setOptions({ tabBarStyle: { display: 'flex' } });
        }
        Animated.spring(sheetHeightAnim, { 
            toValue: target, 
            bounciness: 4,
            speed: 12,
            useNativeDriver: false 
        }).start();
        lastSheetHeight.current = target;
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                const newVal = lastSheetHeight.current - gestureState.dy;
                // Clamping the value ensures it doesn't "get stuck" if pulled way beyond limits
                const clampedVal = Math.min(Math.max(newVal, SHEET_MIN), SHEET_MAX);
                sheetHeightAnim.setValue(clampedVal);
            },
            onPanResponderRelease: (_, gestureState) => {
                const finalHeight = lastSheetHeight.current - gestureState.dy;
                const velocity = -gestureState.vy; 

                // Lógica BINÁRIA baseada em velocidade ou posição
                if (velocity > 0.5) { 
                    expandSheet();
                } else if (velocity < -0.5) { 
                    collapseSheet();
                } else {
                    if (finalHeight > (SHEET_MIN + SHEET_MAX) / 2) {
                        expandSheet();
                    } else {
                        collapseSheet();
                    }
                }
            }
        })
    ).current;

    const loadData = async () => {
        const p = await getPetLocal();
        const c = await getCoinsLocal();
        const l = await getLevelDataLocal();
        const d = await getTotalDistanceLocal();
        const s = await getSettingsLocal();
        const u = await getCurrentUserLocal();
        setPet(p); 
        setCoins(c); 
        setLevelData(l); 
        setTotalDistance(d);
        setEconomyMode(s.batterySaver || false);

        // Buscar Clãs do Usuário
        if (u) {
            const allGroups = await AuthService.getGroups();
            const filtered = allGroups.filter((g: any) => 
                g.group_members?.some((m: any) => m.user_id === u.id)
            );
            setUserCircles(filtered);
        }
    };

    useFocusEffect(React.useCallback(() => { loadData(); }, []));

    useEffect(() => {
        startTracking();
        return () => { 
            if (locationSubscription.current) {
                try {
                    if (typeof (locationSubscription.current as any).remove === 'function') {
                        (locationSubscription.current as any).remove();
                    }
                } catch (e) {
                    console.warn('Erro ao remover subscrição:', e);
                }
            }
        };
    }, [economyMode]);

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = currentLocation.coords;
        setLocation(prev => ({ ...prev, latitude, longitude }));
        lastLocation.current = { latitude, longitude };

        const trackingOptions = economyMode ? {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 30
        } : {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5
        };

        if (locationSubscription.current) (locationSubscription.current as any).remove();

        locationSubscription.current = await Location.watchPositionAsync(
            trackingOptions,
            (loc) => {
                // Se estiver em modo economia e o deslocamento for muito pequeno, ignoramos para poupar processamento se desejado
                // Mas aqui apenas respeitamos as opções de intervalo do watchPositionAsync
                const { latitude: newLat, longitude: newLon, heading } = loc.coords;
                setLocation(prev => ({ ...prev, latitude: newLat, longitude: newLon, heading: heading || prev.heading }));
                
                broadcastLocation({
                    latitude: newLat,
                    longitude: newLon,
                    heading: heading || 0,
                    timestamp: Date.now()
                });
                const syncCloudLocation = async () => {
                    const user = await getCurrentUserLocal();
                    if (user && isValidUUID(user.id)) {
                        const settings = await getSettingsLocal();
                        // 1. Persistência no DB (Postgres)
                        AuthService.updateLocation(user.id, newLat, newLon, settings.ghostMode);
                    }
                };
                syncCloudLocation();

                // Detecção de Proximidade de Spots
                let foundSpot = null;
                for (const spot of PET_SPOTS) {
                    const d = calculateDistance(newLat, newLon, spot.lat, spot.lon);
                    if (d < 60) { // Raio de 60 metros para check-in
                        foundSpot = spot;
                        break;
                    }
                }
                setIsNearSpot(!!foundSpot);
                setActiveSpot(foundSpot);

                if (lastLocation.current) {
                    const dist = calculateDistance(lastLocation.current.latitude, lastLocation.current.longitude, newLat, newLon);
                    if (dist > 3 && dist < 1000) addDistanceLocal(dist);
                }
                lastLocation.current = { latitude: newLat, longitude: newLon };
            }
        );
    };

    // --- LÓGICA DE MECÂNICAS ATIVAS ---

    useEffect(() => {
        let interval: any;
        if (radarTimer > 0) {
            interval = setInterval(() => {
                setRadarTimer(prev => prev > 0 ? prev - 1 : 0);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [radarTimer]);

    const handleSyncPress = () => {
        if (!location.latitude) return;
        broadcastSyncInvite({
            latitude: location.latitude,
            longitude: location.longitude,
            heading: location.heading || 0,
            timestamp: Date.now()
        });
        Alert.alert("Convite Enviado!", "Chamando jogadores em um raio de 1km para sincronizar.");
    };

    const acceptSync = () => {
        if (syncPayload) {
            broadcastSyncAccept(syncPayload.userId);
            setIsSynced(true);
            setSyncPayload(null);
        }
    };

    const handleBackpackPress = async () => {
        const inv = await getInventoryLocal();
        // Mapear IDs para objetos reais do catálogo
        // Importando o catálogo dinamicamente ou usando IDs fixos no localDatabase seria ideal, 
        // mas aqui vamos filtrar o inventário para mostrar o que o jogador tem.
        setInventoryItems(inv);
        setShowBackpack(true);
    };

    const handleUseItem = async (itemId: string) => {
        // Lógica simples baseada em IDs conhecidos
        let type: 'energy' | 'xp' | 'happiness' = 'energy';
        let amount = 30;
        
        if (itemId === 'apple') { type = 'energy'; amount = 30; }
        else if (itemId === 'meat') { type = 'energy'; amount = 50; }
        else if (itemId === 'xp_potion_small') { type = 'xp'; amount = 300; }
        else if (itemId === 'milk') { type = 'happiness'; amount = 20; }
        else if (itemId === 'golden_meat') { type = 'energy'; amount = 100; }

        await consumeItemLocal(itemId, type, amount);
        loadData(); // Atualiza HUD
        
        // Atualiza lista local do modal
        const newInv = await getInventoryLocal();
        setInventoryItems(newInv);
        
        Alert.alert("Item Usado!", `Você consumiu ${itemId} e ganhou um bônus de ${amount} ${type}!`);
    };

    const handleRadarPress = async () => {
        if (radarTimer > 0) {
            Alert.alert("Pet Cansado", `O pet ainda está descansando. Volte em ${Math.floor(radarTimer / 60)}m ${radarTimer % 60}s.`);
            return;
        }

        // Spawn de tesouros
        const newTreasures = [];
        for (let i = 0; i < 4; i++) {
            newTreasures.push({
                id: `t-${Date.now()}-${i}`,
                lat: location.latitude + (Math.random() - 0.5) * 0.004,
                lon: location.longitude + (Math.random() - 0.5) * 0.004,
                type: (Math.random() > 0.8 ? 'gem' : 'gold') as 'gold' | 'gem'
            });
        }
        
        setTreasures(newTreasures);
        setRadarTimer(600); // 10 minutos
        await saveRadarCooldownLocal(Date.now());
        
        if (particleRef.current) {
            const { width: W, height: H } = Dimensions.get('window');
            // Reduz contagem de partículas na economia
            particleRef.current.burst(W / 2, H - 200, economyMode ? 'heart' : 'star');
        }
        Alert.alert("Farejo Ativo!", "Seu pet encontrou rastros de tesouros próximos! Verifique o mapa.");
    };

    const collectTreasure = async (treasure: any) => {
        if (treasure.type === 'gem') {
            const current = await getGemsLocal();
            await saveGemsLocal(current + 2);
            Alert.alert("Eba!", "Você encontrou 2 WanderGems!");
        } else {
            await addCoinsLocal(25);
            Alert.alert("Tesouro!", "Você abriu um baú com 25 Moedas!");
        }
        setTreasures(prev => prev.filter(t => t.id !== treasure.id));
        loadData();
    };

    const handleMemberTap = (member: any) => {
        setSelectedMember(member);
        setShowMemberDetail(true);
    };

    const handleCircleSelect = (circleName: string, memberIds: string[] = []) => {
        setActiveCircle(circleName);
        setActiveCircleMembers(memberIds);
        setShowCircleSelector(false);
    };

    const handleCheckIn = async () => {
        if (!isNearSpot) {
            Alert.alert("Longe demais!", "Vá até um Ponto Pet oficial no mapa para marcar seu território.");
            return;
        }

        try {
            // Ganho de XP e Moedas com Bônus de Felicidade e SINCRO
            const hp = await getHappinessLocal();
            const isHappy = hp > 80;
            
            let baseReward = 15;
            let bonus = 0;
            
            if (isHappy) bonus += 8;
            if (isSynced) bonus += baseReward * 0.5; // +50%

            const totalReward = Math.floor(baseReward + bonus);

            await addXPLocal(isSynced ? 30 : 20); // Mais XP se sincronizado
            const currentCoins = await getCoinsLocal();
            await saveCoinsLocal(currentCoins + totalReward);
            setCoins(currentCoins + totalReward);
            
            // Feedback Visual
            const bonusMsg = isHappy ? `\n🎉 Bônus de Felicidade: +8 Moedas!` : "";
            const syncMsg = isSynced ? `\n🔗 Bônus Sincro: +50%!` : "";
            Alert.alert("Território Marcado!", `Você marcou presença no ${activeSpot.name}.\nRecompensa: +${totalReward} Moedas${bonusMsg}${syncMsg}`);
            
            // Opcional: Broadcast via Realtime para mostrar sticker (futuro)
        } catch (error) {
            console.error("Erro ao fazer check-in:", error);
        }
    };

    const handleSOSDispatch = () => {
        broadcastSOS({
            latitude: location.latitude,
            longitude: location.longitude,
            heading: location.heading || 0,
            timestamp: Date.now()
        }, "Socorro! Preciso de ajuda agora!");
        setShowSOSConfirm(false);
        Alert.alert("SOS Enviado!", "Seus amigos foram notificados da sua localização.");
    };

    const dropdownAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showCircleSelector) {
            Animated.timing(dropdownAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
            }).start();
        } else {
            dropdownAnim.setValue(0);
        }
    }, [showCircleSelector]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            
            <View style={{ flex: 1 }}>
                <MapViewLibre region={location} onPress={() => setShowMemberDetail(false)}>

                    {/* Pontos Oficiais no Mapa */}
                    {PET_SPOTS.map(spot => (
                        <SpotMarker 
                            key={spot.id}
                            id={spot.id}
                            name={spot.name}
                            type={spot.type}
                            latitude={spot.lat}
                            longitude={spot.lon}
                            isNear={activeSpot?.id === spot.id}
                        />
                    ))}

                    {/* Tesouros do Radar */}
                    {treasures.map(t => (
                        <MapMarkerLibre 
                            key={t.id}
                            id={t.id}
                            coordinate={[t.lon, t.lat]}
                            onPress={() => collectTreasure(t)}
                        >
                            <View style={{ 
                                backgroundColor: t.type === 'gem' ? '#7AABE0' : '#FFD700', 
                                padding: 6, 
                                borderRadius: 20, 
                                borderWidth: 2, 
                                borderColor: '#FFF',
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 8
                            }}>
                                <Ionicons name={t.type === 'gem' ? "diamond" : "gift"} size={24} color="#FFF" />
                            </View>
                        </MapMarkerLibre>
                    ))}

                    {/* Avatar do jogador — estilo 3D Motor */}
                    <GameMarker 
                        id="me" 
                        latitude={location.latitude} 
                        longitude={location.longitude} 
                        heading={location.heading || 0}
                        name={pet?.name || 'Você'}
                        pet={pet || undefined}
                        primaryColor={colors.primary}
                        isMe={true}
                    />

                    {/* Membros do clã e exploradores no mapa 3D */}
                    {Object.values(remoteUsers)
                        .filter(u => {
                            if (activeCircle === 'Principal') return false;
                            return activeCircleMembers.includes(u.id);
                        })
                        .map(remoteUser => (
                        remoteUser.location && (
                            <GameMarker 
                                key={remoteUser.id}
                                id={remoteUser.id}
                                latitude={remoteUser.location.latitude}
                                longitude={remoteUser.location.longitude}
                                heading={remoteUser.location.heading}
                                name={remoteUser.name}
                                pet={remoteUser.pet}
                                primaryColor={colors.primary}
                            />
                        )
                    ))}
                </MapViewLibre>

                <View style={[styles.topOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
                    <View style={styles.topBar}>
                        <Pressable style={styles.hudCircleBtn} onPress={() => router.push('/shop')}>
                            <Ionicons name="pricetag" size={20} color="#A78BFF" />
                        </Pressable>

                        <Pressable style={styles.circleDropdown} onPress={() => setShowCircleSelector(true)}>
                            <Text style={[styles.circleDropdownText, { color: colors.text }]} numberOfLines={1}>{activeCircle}</Text>
                            <Ionicons name="chevron-down" size={14} color="#888" />
                        </Pressable>

                        <Pressable style={styles.hudCircleBtn} onPress={() => router.push({ pathname: '/social', params: { tab: 'perfil' } })}>
                            <Ionicons name="person" size={20} color="#A78BFF" />
                        </Pressable>
                    </View>

                    <View style={[styles.hudRow, { justifyContent: 'space-between' }]}>
                        <View style={styles.pillBadge}>
                            <Ionicons name="wallet" size={14} color="#A78BFF" />
                            <Text style={[styles.hudText, { color: colors.text }]}>{coins}</Text>
                        </View>
                        <View style={[styles.pillBadge, { backgroundColor: '#7C3AED22' }]}>
                            <Text style={{ color: '#7C3AED', fontWeight: '800' }}>Lv {levelData.level}</Text>
                        </View>
                    </View>

                </View>
            </View>

            <Animated.View style={[styles.bottomSheet, { height: sheetHeightAnim }]}>
                <View {...panResponder.panHandlers} style={styles.sheetHandle}>
                    <View style={styles.handleBar} />
                    
                    <Animated.View 
                        style={[
                            styles.integratedActions, 
                            {
                                opacity: sheetHeightAnim.interpolate({
                                    inputRange: [SHEET_MIN, SHEET_MIN + 80],
                                    outputRange: [0, 1],
                                    extrapolate: 'clamp'
                                }),
                                transform: [
                                    {
                                        translateY: sheetHeightAnim.interpolate({
                                            inputRange: [SHEET_MIN, SHEET_MIN + 80],
                                            outputRange: [40, 0],
                                            extrapolate: 'clamp'
                                        })
                                    }
                                ]
                            }
                        ]} 
                        pointerEvents="box-none"
                    >
                        <Pressable 
                            style={[styles.mapPill, { backgroundColor: isNearSpot ? '#A78BFF' : '#2C2C31', elevation: 8 }]}
                            onPress={handleCheckIn}
                        >
                            <Ionicons name="checkmark-circle" size={18} color={isNearSpot ? "#FFF" : "#666"} />
                            <Text style={[styles.mapPillText, { color: isNearSpot ? "#FFF" : "#666" }]}>Check-in</Text>
                        </Pressable>

                        <Pressable 
                            style={[styles.mapPill, { backgroundColor: '#1C1C21', borderWidth: 1, borderColor: '#333', elevation: 8 }]}
                            onPress={() => router.push('/quests')}
                        >
                            <Ionicons name="shield-checkmark" size={18} color="#A78BFF" />
                            <Text style={styles.mapPillText}>Missões</Text>
                        </Pressable>

                        <Pressable 
                            style={[styles.mapPill, { backgroundColor: '#1C1C21', borderWidth: 1, borderColor: '#333', elevation: 8 }]}
                            onPress={() => setShowSOSConfirm(true)}
                        >
                            <Ionicons name="shield" size={18} color="#FF4444" />
                            <Text style={styles.mapPillText}>SOS</Text>
                        </Pressable>
                    </Animated.View>
                </View>

                {showMemberDetail && selectedMember ? (
                    <ScrollView>
                        <Pressable onPress={() => setShowMemberDetail(false)} style={{ padding: 20 }}>
                            <Text style={{ color: '#A78BFF', fontWeight: '700' }}>← Voltar</Text>
                        </Pressable>
                        <View style={{ paddingHorizontal: 20 }}>
                            <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFF' }}>{selectedMember.name}</Text>
                            <Text style={{ color: '#AAA' }}>{selectedMember.location}</Text>
                        </View>
                    </ScrollView>
                ) : (
                    <>
                        <View style={styles.categoryTabs}>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: isSynced ? '#A78BFF' : '#2C2C31' }]} 
                                onPress={handleSyncPress}
                            >
                                <Ionicons name="people" size={20} color={isSynced ? "#FFF" : "#AAA"} />
                                {pendingFriendsCount > 0 && !isSynced && (
                                    <View style={{ 
                                        position: 'absolute', 
                                        top: 8, 
                                        right: 8, 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: 4, 
                                        backgroundColor: '#FF4444',
                                        borderWidth: 1.5,
                                        borderColor: '#A78BFF'
                                    }} />
                                )}
                            </Pressable>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: '#2C2C31' }]} 
                                onPress={() => router.push('/pet-home')}
                            >
                                <Ionicons name="paw" size={20} color="#AAA" />
                            </Pressable>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: '#2C2C31' }]} 
                                onPress={handleBackpackPress}
                            >
                                <Ionicons name="bag-handle" size={20} color="#AAA" />
                            </Pressable>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: radarTimer > 0 ? '#444' : '#2C2C31' }]} 
                                onPress={handleRadarPress}
                            >
                                <Ionicons name="map" size={20} color={radarTimer > 0 ? "#666" : "#AAA"} />
                                {radarTimer > 0 && (
                                    <View style={{ position: 'absolute', bottom: -12 }}>
                                        <Text style={{ fontSize: 9, color: '#AAA', fontWeight: '800' }}>
                                            {Math.floor(radarTimer / 60)}m
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            <Pressable style={styles.memberRow}>
                                <View style={[styles.memberAvatar, { borderColor: '#A78BFF' }]}>
                                    <Ionicons name="person" size={22} color="#A78BFF" />
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Você</Text>
                                    <Text style={{ color: '#AAA' }}>Localização atual</Text>
                                </View>
                                <View style={{ backgroundColor: '#2C2C31', padding: 6, borderRadius: 8 }}>
                                    <Text style={{ color: '#FFF', fontSize: 12 }}>Lv {levelData.level}</Text>
                                </View>
                            </Pressable>

                            {circleMembers.map(m => (
                                <Pressable key={m.id} style={styles.memberRow} onPress={() => handleMemberTap(m)}>
                                    <View style={[styles.memberAvatar, { borderColor: m.online ? '#A78BFF' : '#333' }]}>
                                        <Text style={{ color: '#A78BFF', fontWeight: '800' }}>{m.name[0]}</Text>
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={{ color: '#FFF', fontWeight: '800' }}>{m.name}</Text>
                                        <Text style={{ color: '#AAA' }}>{m.lat.toFixed(4)}, {m.lon.toFixed(4)}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#444" />
                                </Pressable>
                            ))}
                        </ScrollView>
                    </>
                )}
            </Animated.View>

            {/* Banner Discreto de Convite de Sincronia */}
            {syncPayload && (
                <View style={{
                    position: 'absolute',
                    top: 60 + insets.top,
                    left: 20,
                    right: 20,
                    backgroundColor: '#1C1C21',
                    borderRadius: 20,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#A78BFF',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 2000,
                    elevation: 10
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="infinite" size={20} color="#A78BFF" />
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{syncPayload.name} quer Sincronizar!</Text>
                    </View>
                    <Pressable 
                        style={{ backgroundColor: '#A78BFF', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 }}
                        onPress={acceptSync}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Aceitar</Text>
                    </Pressable>
                </View>
            )}

            {/* Modal da Mochila */}
            <Modal
                visible={showBackpack}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowBackpack(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center' }}>
                    <View style={{ 
                        margin: 20, 
                        backgroundColor: '#141419', 
                        borderRadius: 32, 
                        padding: 24, 
                        maxHeight: '70%',
                        borderWidth: 1,
                        borderColor: '#333'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>Sua Mochila</Text>
                            <Pressable onPress={() => setShowBackpack(false)}>
                                <Ionicons name="close-circle" size={32} color="#444" />
                            </Pressable>
                        </View>

                        <ScrollView>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                {inventoryItems.filter(id => ['apple','meat','milk','xp_potion_small','golden_meat'].includes(id)).map((id, index) => (
                                    <Pressable 
                                        key={`${id}-${index}`} 
                                        style={{ 
                                            width: '30%', 
                                            aspectRatio: 1, 
                                            backgroundColor: '#1C1C21', 
                                            borderRadius: 16, 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            borderWidth: 1,
                                            borderColor: '#333'
                                        }}
                                        onPress={() => handleUseItem(id)}
                                    >
                                        <Ionicons 
                                            name={id === 'apple' ? 'nutrition' : (id === 'meat' ? 'restaurant' : (id === 'milk' ? 'cafe' : 'flask'))} 
                                            size={32} color="#A78BFF" 
                                        />
                                        <Text style={{ color: '#AAA', fontSize: 10, marginTop: 4 }}>Usar</Text>
                                    </Pressable>
                                ))}
                                {inventoryItems.filter(id => ['apple','meat','milk','xp_potion_small','golden_meat'].includes(id)).length === 0 && (
                                    <Text style={{ color: '#666', textAlign: 'center', width: '100%', padding: 40 }}>Sua mochila está vazia...</Text>
                                )}
                            </View>
                        </ScrollView>
                        
                        <Text style={{ color: '#444', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
                            Toque em um item para consumir e ganhar bônus instantâneos.
                        </Text>
                    </View>
                </View>
            </Modal>
            
            <Modal
                visible={showCircleSelector}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowCircleSelector(false)}
            >
                <Pressable 
                    style={StyleSheet.absoluteFill} 
                    onPress={() => setShowCircleSelector(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}>
                        <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
                            <Animated.View style={{
                                marginTop: 65,
                                alignSelf: 'center',
                                width: '70%',
                                backgroundColor: colors.card,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: colors.border,
                                overflow: 'hidden',
                                opacity: dropdownAnim,
                                transform: [{
                                    translateY: dropdownAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-20, 0]
                                    })
                                }],
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.4,
                                shadowRadius: 15,
                                elevation: 20
                            }}>
                                <ScrollView style={{ maxHeight: 280 }} bounces={false}>
                                    <Pressable 
                                        style={({ pressed }) => [
                                            styles.dropdownItem,
                                            { backgroundColor: activeCircle === 'Principal' ? colors.accent : (pressed ? colors.border : 'transparent') }
                                        ]}
                                        onPress={() => handleCircleSelect('Principal', [])}
                                    >
                                        <Ionicons name="home" size={18} color={activeCircle === 'Principal' ? colors.primary : colors.subtext} />
                                        <Text style={[styles.dropdownText, { color: activeCircle === 'Principal' ? colors.text : colors.subtext }]}>Principal</Text>
                                    </Pressable>

                                    {userCircles.map((circle: any) => {
                                        const isSelected = activeCircle === circle.name;
                                        const memberIds = circle.group_members?.map((m: any) => m.user_id) || [];
                                        return (
                                            <Pressable 
                                                key={circle.id}
                                                style={({ pressed }) => [
                                                    styles.dropdownItem,
                                                    { backgroundColor: isSelected ? colors.accent : (pressed ? colors.border : 'transparent') }
                                                ]}
                                                onPress={() => handleCircleSelect(circle.name, memberIds)}
                                            >
                                                <Ionicons name="people" size={18} color={isSelected ? colors.primary : colors.subtext} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.dropdownText, { color: isSelected ? colors.text : colors.subtext }]}>{circle.name}</Text>
                                                    <Text style={{ fontSize: 10, color: colors.subtext }}>{memberIds.length} membros</Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}

                                    {userCircles.length === 0 && (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: colors.subtext, fontSize: 12 }}>Nenhum clã encontrado</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </Animated.View>
                        </SafeAreaView>
                    </View>
                </Pressable>
            </Modal>

            {/* Notificação Flutuante de SOS Recebido */}
            {incomingSOS && (
                <Animated.View style={{
                    position: 'absolute',
                    top: 120,
                    left: 20,
                    right: 20,
                    backgroundColor: '#FF4444',
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    zIndex: 1000,
                    elevation: 15,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.5,
                    shadowRadius: 10
                }}>
                    <Ionicons name="warning" size={32} color="#FFF" />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>ALERTA DE EMERGÊNCIA!</Text>
                        <Text style={{ color: '#FFF', fontSize: 14 }}>{incomingSOS.name} precisa de ajuda urgente!</Text>
                    </View>
                    <Pressable 
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8 }}
                        onPress={() => setIncomingSOS(null)}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '700' }}>OK</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Modal de Confirmação de SOS */}
            <Modal
                visible={showSOSConfirm}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSOSConfirm(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ 
                        width: '85%', 
                        backgroundColor: '#1C1C21', 
                        borderRadius: 32, 
                        padding: 24, 
                        borderWidth: 2, 
                        borderColor: '#FF4444',
                        alignItems: 'center'
                    }}>
                        <View style={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: 40, 
                            backgroundColor: '#FF444422', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginBottom: 20
                        }}>
                            <Ionicons name="alert-circle" size={48} color="#FF4444" />
                        </View>
                        
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 12, textAlign: 'center' }}>Confirmar SOS?</Text>
                        <Text style={{ fontSize: 15, color: '#AAA', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
                            Isso enviará um sinal de socorro imediato para todos os seus amigos com sua localização exata. Use apenas em emergências reais.
                        </Text>

                        <Pressable 
                            style={{ 
                                width: '100%', 
                                backgroundColor: '#FF4444', 
                                paddingVertical: 16, 
                                borderRadius: 16, 
                                alignItems: 'center',
                                shadowColor: '#FF4444',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8
                            }}
                            onPress={handleSOSDispatch}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>ENVIAR ALERTA AGORA</Text>
                        </Pressable>

                        <Pressable 
                            style={{ marginTop: 12, paddingVertical: 12 }}
                            onPress={() => setShowSOSConfirm(false)}
                        >
                            <Text style={{ color: '#777', fontWeight: '700' }}>Cancelar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
    hudCircleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1C1C21', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
    circleDropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C21', paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: '#333', gap: 6 },
    circleDropdownText: { fontSize: 14, fontWeight: '700' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12, borderBottomWidth: 0.5, borderBottomColor: '#ffffff10' },
    dropdownText: { fontSize: 14, fontWeight: '700' },
    hudRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
    pillBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1C1C21', gap: 6 },
    hudText: { fontSize: 13, fontWeight: '800' },
    floatingMapActions: { position: 'absolute', top: 130, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    mapPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 8 },
    mapPillText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    mapCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, backgroundColor: '#1C1C21', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'visible' },
    sheetHandle: { alignItems: 'center', paddingVertical: 10, zIndex: 20 },
    integratedActions: { position: 'absolute', top: -52, left: 6, right: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10 },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444' },
    categoryTabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
    categoryTab: { flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 16 },
    memberAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2C31' },
    memberInfo: { flex: 1 },
});