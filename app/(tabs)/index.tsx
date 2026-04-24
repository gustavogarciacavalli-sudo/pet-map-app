import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Alert, Text, Platform, Pressable, Image, ScrollView, Switch, Dimensions, Animated, PanResponder, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { TreasureMarker } from '@/components/TreasureMarker';
import { useSupabaseRealtime } from '@/components/SupabaseRealtimeProvider';
import { ParticleSystem, ParticleSystemRef } from '@/components/ParticleSystem';
import { AuthService } from '@/services/AuthService';
import { supabase } from '@/services/supabaseConfig';
import { PetPreview } from '@/components/PetPreview';
import { MarkerCaptureProvider } from '@/components/MarkerCaptureProvider';
import { isValidUUID } from '@/services/AuthService';
import { clusterPlayers, MarkerData, PlayerData } from '@/utils/clusterPlayers';
import { MergedMarker } from '@/components/MergedMarker';
import { LiquidMergeOverlay } from '@/components/LiquidMergeOverlay';
import { CATALOG } from '../../constants/catalog';
import { ChatMessage } from '../../types/social';

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

const AnimatedLikeButton = ({ isLiked, onToggle }: { isLiked: boolean, onToggle: () => void }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true })
        ]).start();
        onToggle();
    };

    return (
        <Pressable onPress={handlePress}>
            <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={22} 
                    color={isLiked ? "#FF4444" : "#666"} 
                />
            </Animated.View>
        </Pressable>
    );
};

const PET_SPOTS: { id: string, name: string, type: SpotType, lat: number, lon: number }[] = [
    { id: 'spot1', name: 'Parque Dog Feliz', type: 'park', lat: -25.4330, lon: -49.2810 },
    { id: 'spot2', name: 'Pet Shop VIP', type: 'shop', lat: -25.4350, lon: -49.2820 },
    { id: 'spot3', name: 'Shopping Pet Center', type: 'mall', lat: -25.4320, lon: -49.2840 },
    { id: 'spot4', name: 'Clínica Veterina 24h', type: 'vet', lat: -25.4370, lon: -49.2800 },
];

const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (val: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(val, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration: 400, useNativeDriver: true }),
                ])
            ).start();
        };
        animate(dot1, 0);
        animate(dot2, 200);
        animate(dot3, 400);
    }, []);

    const dotStyle = (val: Animated.Value) => ({
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#AAA',
        marginHorizontal: 2,
        opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }]
    });

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, marginLeft: 16 }}>
            <Animated.View style={dotStyle(dot1)} />
            <Animated.View style={dotStyle(dot2)} />
            <Animated.View style={dotStyle(dot3)} />
        </View>
    );
};

export default function MapScreen() {
    const { colors, isDarkMode, batterySaver } = useTheme();
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
    const [userAvatarUri, setUserAvatarUri] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('Explorador');

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
    const [mapReady, setMapReady] = useState(false);

    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showMemberDetail, setShowMemberDetail] = useState(false);
    const [activeCircle, setActiveCircle] = useState('Principal');
    const [userCircles, setUserCircles] = useState<any[]>([]);
    const [showCircleSelector, setShowCircleSelector] = useState(false);
    const [activeCircleMembers, setActiveCircleMembers] = useState<string[]>([]);
    
    // Estados para funcionalidades premium e clustering
    const mapRef = useRef<any>(null);
    const [visibleMarkers, setVisibleMarkers] = useState<MarkerData[]>([]);
    const [currentRegion, setCurrentRegion] = useState<any>(null);
    const lastMarkerCount = useRef(0);
    
    // Estados de Animação Líquida
    const [mergePoints, setMergePoints] = useState<{ x: number, y: number }[]>([]);
    const [showMerge, setShowMerge] = useState(false);
    const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
    
    const [circleMembers, setCircleMembers] = useState<any[]>([]);
    const [showSOSConfirm, setShowSOSConfirm] = useState(false);
    const [incomingSOS, setIncomingSOS] = useState<any>(null);
    const [isNearSpot, setIsNearSpot] = useState(false);
    const [activeSpot, setActiveSpot] = useState<any>(null);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

    // MECÂNICAS ATIVAS
    const [isSynced, setIsSynced] = useState(false);
    const [syncPayload, setSyncPayload] = useState<any>(null); // Convite recebido
    const [showBackpack, setShowBackpack] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [radarTimer, setRadarTimer] = useState(0); // Cooldown em segundos
    const [treasures, setTreasures] = useState<{id: string, lat: number, lon: number, type: 'gold' | 'gem'}[]>([]);

    // Radar Social
    const [showSocialRadar, setShowSocialRadar] = useState(false);
    const [showRadarModal, setShowRadarModal] = useState(false);
    const [showCooldownModal, setShowCooldownModal] = useState(false);
    const [showItemUsedModal, setShowItemUsedModal] = useState(false);
    const [usedItemData, setUsedItemData] = useState<any>(null);
    const [showTreasureModal, setShowTreasureModal] = useState(false);
    const [treasureAmount, setTreasureAmount] = useState(0);
    const [treasureType, setTreasureType] = useState<'coins' | 'gems'>('coins');
    const [radarAnim] = useState(new Animated.Value(0));
    const [discoveredUsers, setDiscoveredUsers] = useState<any[]>([]);

    // Estados para Social Integrado (Likes e Chat)
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [chatTarget, setChatTarget] = useState<{ id: string, name: string, avatar?: string | null } | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatSubscription = useRef<any>(null);
    const chatScrollRef = useRef<ScrollView>(null);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const typingSubscription = useRef<any>(null);
    const typingTimeout = useRef<any>(null);

    const handleSocialRadarScan = async () => {
        setShowSocialRadar(true);
        setDiscoveredUsers([]); // Limpa busca anterior
        
        Animated.loop(
            Animated.sequence([
                Animated.timing(radarAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(radarAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();

        // Garantir pelo menos 2.5s de animação para o "feeling" de busca
        const animationPromise = new Promise(resolve => setTimeout(resolve, 2500));
        
        try {
            const user = await getCurrentUserLocal();
            // Raio de ~1km em graus (aproximado)
            const latDelta = 0.009;
            const lonDelta = 0.01;

            const { data: nearData } = await supabase
                .from('locations')
                .select('*, profiles(name, wander_id)')
                .gte('latitude', location.latitude - latDelta)
                .lte('latitude', location.latitude + latDelta)
                .gte('longitude', location.longitude - lonDelta)
                .lte('longitude', location.longitude + lonDelta)
                .eq('ghost_mode', false)
                .neq('user_id', user?.id) // Exclui a si mesmo
                .limit(20);

            let realUsers: any[] = [];
            if (nearData) {
                realUsers = nearData.map((l: any) => ({
                    id: l.user_id,
                    name: l.profiles?.name || 'Explorador',
                    lat: l.latitude,
                    lon: l.longitude,
                    online: (new Date().getTime() - new Date(l.updated_at).getTime()) < 300000,
                    isBot: false,
                    dist: calculateDistance(location.latitude, location.longitude, l.latitude, l.longitude)
                })).filter(u => u.dist <= 1000);
            }

            // Gerar BOTS se houver poucos usuários reais
            const bots: any[] = [];
            const botNames = ["Felipe M.", "Bruna Lima", "Gustavo G.", "Ana Clara", "Rodrigo S.", "Julia W.", "PetLover99", "Marcos V.", "Tati_Explorer", "Leo_Dog"];
            
            // Garantir que sempre existam pelo menos 5 resultados
            const botsNeeded = Math.max(0, 5 - realUsers.length);
            for (let i = 0; i < botsNeeded; i++) {
                const randomName = botNames[Math.floor(Math.random() * botNames.length)];
                const angle = Math.random() * Math.PI * 2;
                const d = 150 + Math.random() * 800; // metros
                
                // Converter distância (m) para delta graus
                const dLat = (d / 111320) * Math.cos(angle);
                const dLon = (d / (111320 * Math.cos(location.latitude * Math.PI / 180))) * Math.sin(angle);
                
                bots.push({
                    id: `bot-${Date.now()}-${i}`,
                    name: randomName,
                    lat: location.latitude + dLat,
                    lon: location.longitude + dLon,
                    online: true,
                    isBot: true,
                    dist: d
                });
            }

            const allFound = [...realUsers, ...bots].sort((a, b) => a.dist - b.dist);
            
            await animationPromise;
            setDiscoveredUsers(allFound);
        } catch (err) {
            console.error("Erro radar:", err);
            await animationPromise;
            setDiscoveredUsers([
                { id: 'bot-1', name: 'Lucas P.', lat: location.latitude + 0.002, lon: location.longitude - 0.001, online: true, isBot: true, dist: 250 },
                { id: 'bot-2', name: 'Marina Silva', lat: location.latitude - 0.001, lon: location.longitude + 0.003, online: true, isBot: true, dist: 420 }
            ]);
        } finally {
            radarAnim.stopAnimation();
            radarAnim.setValue(0);
        }
    };

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

            // Buscar perfis de todos os amigos (mesmo sem localização recente)
            const friendProfiles = await AuthService.getFriendsProfilesCloud(friendIds);

            const { data: initialLocs } = await supabase
                .from('locations')
                .select('*, profiles(name, wander_id)')
                .in('user_id', friendIds)
                .eq('ghost_mode', false);

            const formatted = friendProfiles.map((p: any) => {
                const loc = initialLocs?.find((l: any) => l.user_id === p.id);
                return {
                    id: p.id,
                    name: p.name || 'Explorador',
                    avatar: p.avatar,
                    lat: loc?.latitude || 0,
                    lon: loc?.longitude || 0,
                    online: loc ? (new Date().getTime() - new Date(loc.updated_at).getTime()) < 60000 : false,
                    battery: 85,
                    since: loc ? 'Agora' : 'Offline',
                    hasLocation: !!loc
                };
            });
            // @ts-ignore
            setCircleMembers(formatted);

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
    
    const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
    const SHEET_MIN = Math.max(80, insets.bottom + 60);
    const SHEET_MAX = SCREEN_HEIGHT - (insets.top + 200); 

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
        
        // Load user profile photo
        if (u) {
            let avatar = u.avatar_url || u.imageUri || (u as any).avatar || null;
            
            // Se não tiver local, tenta buscar do Supabase
            if (!avatar && isValidUUID(u.id)) {
                try {
                    const profile = await AuthService.getUserProfile(u.id);
                    if (profile?.avatar) avatar = profile.avatar;
                } catch (err) {
                    console.log("Erro ao buscar avatar da nuvem:", err);
                }
            }
            
            setUserAvatarUri(avatar);
            if (u.name) setUserName(u.name);
        }

        // Buscar Clãs do Usuário
        if (u) {
            const allGroups = await AuthService.getGroups();
            const filtered = allGroups.filter((g: any) => 
                g.group_members?.some((m: any) => m.user_id === u.id)
            );
            setUserCircles(filtered);

            // Buscar Likes
            const cloudLikes = await AuthService.getLikesCloud(u.id);
            setLikedIds(cloudLikes);
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
    }, [batterySaver]);

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = currentLocation.coords;
        setLocation(prev => ({ ...prev, latitude, longitude }));
        lastLocation.current = { latitude, longitude };
        setMapReady(true);

        const trackingOptions = batterySaver ? {
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
                    if (dist > 3 && dist < 1000) {
                        addDistanceLocal(dist);
                        savePathPointLocal(newLat, newLon);
                    }
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

    // Lógica de Agrupamento de Jogadores (Zenly Style)
    useEffect(() => {
        const players: PlayerData[] = [];
        
        // Adicionar "Eu"
        players.push({
            id: 'me',
            name: userName,
            coordinates: { latitude: location.latitude, longitude: location.longitude },
            color: colors.primary,
            imageUri: userAvatarUri,
            pet: pet,
            isMe: true,
            heading: location.heading
        });

        // Adicionar outros usuários remotos
        Object.values(remoteUsers).forEach(u => {
            if (activeCircle !== 'Principal' && !activeCircleMembers.includes(u.id)) return;
            if (u.location) {
                players.push({
                    id: u.id,
                    name: u.name,
                    coordinates: { latitude: u.location.latitude, longitude: u.location.longitude },
                    color: colors.primary,
                    imageUri: u.imageUri,
                    pet: u.pet,
                    heading: u.location.heading
                });
            }
        });

        const clusters = clusterPlayers(players, currentRegion || location, 0.001);
        
        // Detectar Mudança de Estado (Fusão ou Separação)
        if (lastMarkerCount.current > 0 && clusters.length !== lastMarkerCount.current) {
            console.log("🌊 MUDANÇA DE CLUSTER! Animando líquido...");
            setShowMerge(true);
            setTimeout(() => setShowMerge(false), 1500);
        }
        
        lastMarkerCount.current = clusters.length;
        setVisibleMarkers(clusters);
    }, [remoteUsers, location, currentRegion, activeCircle, activeCircleMembers, userName, userAvatarUri, pet]);

    const handleRegionChangeComplete = (region: any) => {
        setCurrentRegion(region);
    };

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
        else if (itemId === 'xp_potion_mega') { type = 'xp'; amount = 2500; }

        await consumeItemLocal(itemId, type, amount);
        loadData(); // Atualiza HUD
        
        // Atualiza lista local do modal
        const newInv = await getInventoryLocal();
        setInventoryItems(newInv);
        
        const itemDef = CATALOG.find(c => c.id === itemId);
        setUsedItemData({ 
            name: itemDef?.name || itemId, 
            type, 
            amount, 
            icon: itemDef?.icon,
            iconLib: (itemDef as any)?.iconLib
        });
        setShowItemUsedModal(true);
    };

    const handleRadarPress = async () => {
        if (radarTimer > 0) {
            setShowCooldownModal(true);
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
            particleRef.current.burst(W / 2, H - 200, batterySaver ? 'heart' : 'star');
        }
        setShowRadarModal(true);
    };

    const collectTreasure = async (treasure: any) => {
        if (treasure.type === 'gem') {
            const current = await getGemsLocal();
            await saveGemsLocal(current + 2);
            setTreasureAmount(2);
            setTreasureType('gems');
            setShowTreasureModal(true);
        } else {
            setCoins(await addCoinsLocal(25));
            setTreasureAmount(25);
            setTreasureType('coins');
            setShowTreasureModal(true);
        }
        setTreasures(prev => prev.filter(t => t.id !== treasure.id));
        loadData();
    };

    const handleMemberTap = (member: any) => {
        setSelectedMember(member);
        setShowMemberDetail(true);
    };

    const handleToggleLike = async (targetId: string) => {
        const user = await getCurrentUserLocal();
        if (!user) return;
        try {
            const isLiked = await AuthService.toggleLikeCloud(user.id, targetId);
            setLikedIds(prev => isLiked ? [...prev, targetId] : prev.filter(id => id !== targetId));
        } catch (error) {
            console.error("Erro ao curtir:", error);
        }
    };

    const loadChat = async (targetId: string) => {
        const user = await getCurrentUserLocal();
        if (!user) return;
        
        const msgs = await AuthService.fetchMessages(user.id, targetId);
        setChatMessages(msgs.map((m: any) => ({
            id: m.id,
            senderId: m.sender_id === user.id ? 'me' : m.sender_id,
            recipientId: m.recipient_id === user.id ? 'me' : m.recipient_id,
            text: m.text,
            timestamp: new Date(m.created_at).getTime()
        })));
    };

    const handleOpenChat = async (id: string, name: string, avatar?: string | null) => {
        const user = await getCurrentUserLocal();
        if (!user) return;
        
        setChatTarget({ id, name, avatar });
        setIsChatVisible(true);
        setIsOtherTyping(false);
        await loadChat(id);

        if (chatSubscription.current) supabase.removeChannel(chatSubscription.current);
        chatSubscription.current = AuthService.subscribeToMessages(user.id, id, (newMsg) => {
            setChatMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                    id: newMsg.id,
                    senderId: newMsg.sender_id === user.id ? 'me' : newMsg.sender_id,
                    recipientId: newMsg.recipient_id === user.id ? 'me' : newMsg.recipient_id,
                    text: newMsg.text,
                    timestamp: new Date(newMsg.created_at).getTime()
                } as any];
            });
            setIsOtherTyping(false);
        });

        if (typingSubscription.current) supabase.removeChannel(typingSubscription.current);
        typingSubscription.current = AuthService.subscribeToTyping(user.id, (payload) => {
            if (payload.userId === id) {
                setIsOtherTyping(payload.isTyping);
            }
        });
    };

    const handleTyping = async () => {
        const user = await getCurrentUserLocal();
        if (!user || !chatTarget) return;

        AuthService.broadcastTyping(user.id, chatTarget.id, true);

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            AuthService.broadcastTyping(user.id, chatTarget.id, false);
        }, 2000);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !chatTarget) return;
        const user = await getCurrentUserLocal();
        if (user) {
            await AuthService.sendMessageCloud(user.id, chatTarget.id, chatInput.trim());
            setChatInput('');
        }
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
                useNativeDriver: false
            }).start();
        } else {
            dropdownAnim.setValue(0);
        }
    }, [showCircleSelector]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            
            <View style={{ flex: 1, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }}>
                {!mapReady ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="location-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Adquirindo GPS...</Text>
                        <Text style={{ color: colors.subtext, fontSize: 14 }}>Aguarde enquanto localizamos você</Text>
                    </View>
                ) : (
                    <MarkerCaptureProvider>
                        <MapViewLibre 
                            ref={mapRef}
                            region={location} 
                            onPress={() => setShowMemberDetail(false)}
                            onRegionChangeComplete={handleRegionChangeComplete}
                        >
                        
                        {/* Pontos Oficiais no Mapa - Somem com Zoom Out */}
                        {(currentRegion?.latitudeDelta < 0.02 || !currentRegion) && PET_SPOTS.map(spot => (
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
                            <TreasureMarker 
                                key={t.id}
                                id={t.id}
                                latitude={t.lat}
                                longitude={t.lon}
                                type={t.type}
                                onPress={() => collectTreasure(t)}
                            />
                        ))}

                        {/* Renderização Dinâmica de Marcadores (Clustered) */}
                        {visibleMarkers.map(m => {
                            // Esconder marcadores que estão em fase de animação
                            if (showMerge && animatingIds.has(m.id)) {
                                // Mostra um efeito de transição se desejar
                            }

                            if (m.type === 'merged' && m.players) {
                                return (
                                    <MergedMarker 
                                        key={m.id}
                                        id={m.id}
                                        latitude={m.coordinates.latitude}
                                        longitude={m.coordinates.longitude}
                                        imageUris={(m.players || []).map((p: any) => p.imageUri)}
                                        primaryColor={(m.players || [])[0]?.color || colors.primary}
                                        onPress={() => {
                                            if (m.players) handleMemberTap(m.players[0]);
                                        }}
                                    />
                                );
                            }

                            if (m.type === 'single' && m.player) {
                                return (
                                    <GameMarker 
                                        key={m.id}
                                        id={m.id}
                                        latitude={m.coordinates.latitude}
                                        longitude={m.coordinates.longitude}
                                        heading={m.player.heading || 0}
                                        name={m.player.name}
                                        primaryColor={m.player.color}
                                        pet={m.player.pet}
                                        avatarUri={m.player.imageUri}
                                        isMe={m.player.isMe}
                                        onPress={() => {
                                            if (m.player) handleMemberTap(m.player);
                                        }}
                                    />
                                );
                            }

                            return null;
                        })}
                    </MapViewLibre>
                    </MarkerCaptureProvider>
                )}

                <View style={[styles.topOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
                    <View style={styles.topBar}>
                        <Pressable style={styles.hudCircleBtn} onPress={() => router.push('/shop')}>
                            <Ionicons name="pricetag" size={20} color="#A78BFF" />
                        </Pressable>

                        <Pressable style={styles.circleDropdown} onPress={() => setShowCircleSelector(true)}>
                            <Text style={[styles.circleDropdownText, { color: colors.text }]} numberOfLines={1}>{activeCircle}</Text>
                            <Ionicons name="chevron-down" size={14} color="#888" />
                        </Pressable>

                        <Pressable 
                            style={[styles.hudCircleBtn, { overflow: 'hidden', borderWidth: 2, borderColor: colors.primary + '60' }]} 
                            onPress={() => router.push({ pathname: '/social', params: { tab: 'perfil' } })}
                        >
                            {userAvatarUri ? (
                                <Image source={{ uri: userAvatarUri }} style={{ width: '100%', height: '100%', borderRadius: 14 }} />
                            ) : pet ? (
                                <PetPreview species={pet.species} size={24} />
                            ) : (
                                <Ionicons name="person" size={20} color="#A78BFF" />
                            )}
                        </Pressable>
                    </View>

                    <View style={[styles.hudRow, { justifyContent: 'space-between' }]}>
                        <View style={styles.pillBadge}>
                            <Ionicons name="wallet" size={14} color="#A78BFF" />
                            <Text style={[styles.hudText, { color: colors.text }]}>{coins}</Text>
                        </View>
                        
                        {batterySaver && (
                            <View style={[styles.pillBadge, { backgroundColor: '#4CAF5022' }]}>
                                <MaterialCommunityIcons name="leaf" size={14} color="#4CAF50" />
                                <Text style={[styles.hudText, { color: '#4CAF50' }]}>ECO</Text>
                            </View>
                        )}

                        <View style={[styles.pillBadge, { backgroundColor: '#7C3AED', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
                            <Text style={{ color: '#FFF', fontWeight: '900' }}>Lv {levelData.level}</Text>
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 10 }}>
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

                        </ScrollView>
                    </Animated.View>
                </View>

                {showMemberDetail && selectedMember ? (
                    <View style={{ flex: 1 }}>
                        <Pressable onPress={() => setShowMemberDetail(false)} style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="chevron-back" size={24} color="#A78BFF" />
                            <Text style={{ color: '#A78BFF', fontWeight: '700', fontSize: 16 }}>Voltar para a lista</Text>
                        </Pressable>
                        
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={{ alignItems: 'center', marginTop: 10 }}>
                                <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: selectedMember.online ? '#4ADE80' : '#333', overflow: 'hidden', backgroundColor: '#2C2C31' }}>
                                    {selectedMember.avatar ? (
                                        <Image source={{ uri: selectedMember.avatar }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ color: '#FFF', fontSize: 40, fontWeight: '800' }}>{selectedMember.name[0]}</Text>
                                        </View>
                                    )}
                                </View>
                                
                                <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFF', marginTop: 16 }}>{selectedMember.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedMember.online ? '#4ADE80' : '#888' }} />
                                    <Text style={{ color: '#AAA', fontSize: 14 }}>{selectedMember.online ? 'Online agora' : 'Desconectado'}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 30, paddingHorizontal: 20 }}>
                                <Pressable 
                                    style={{ flex: 1, height: 60, borderRadius: 20, backgroundColor: '#2C2C31', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#444' }}
                                    onPress={() => handleToggleLike(selectedMember.id)}
                                >
                                    <Ionicons 
                                        name={likedIds.includes(selectedMember.id) ? "heart" : "heart-outline"} 
                                        size={28} 
                                        color={likedIds.includes(selectedMember.id) ? "#FF4444" : "#FFF"} 
                                    />
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginTop: 4 }}>{likedIds.includes(selectedMember.id) ? 'Curtiu' : 'Curtir'}</Text>
                                </Pressable>

                                <Pressable 
                                    style={{ flex: 1, height: 60, borderRadius: 20, backgroundColor: '#A78BFF', alignItems: 'center', justifyContent: 'center' }}
                                    onPress={() => handleOpenChat(selectedMember.id, selectedMember.name, selectedMember.avatar)}
                                >
                                    <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Chat</Text>
                                </Pressable>
                            </View>

                            <View style={{ padding: 24, marginTop: 20, backgroundColor: '#16161D', borderRadius: 24, marginHorizontal: 20 }}>
                                <Text style={{ color: '#888', fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: 16 }}>INFORMAÇÕES DO EXPLORADOR</Text>
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="location" size={20} color="#A78BFF" />
                                    </View>
                                    <View>
                                        <Text style={{ color: '#FFF', fontWeight: '700' }}>Localização</Text>
                                        <Text style={{ color: '#AAA', fontSize: 13 }}>{selectedMember.hasLocation ? `${selectedMember.lat.toFixed(4)}, ${selectedMember.lon.toFixed(4)}` : 'Oculta pelo usuário'}</Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="time" size={20} color="#A78BFF" />
                                    </View>
                                    <View>
                                        <Text style={{ color: '#FFF', fontWeight: '700' }}>Última Atividade</Text>
                                        <Text style={{ color: '#AAA', fontSize: 13 }}>{selectedMember.since}</Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                ) : (
                    <>
                        <View style={styles.categoryTabs}>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: '#2C2C31' }]} 
                                onPress={handleSocialRadarScan}
                            >
                                <Ionicons name="wifi" size={20} color="#60A5FA" />
                            </Pressable>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: '#2C2C31' }]} 
                                onPress={() => router.push('/pet-home')}
                            >
                                <Ionicons name="paw" size={20} color="#4CAF50" />
                            </Pressable>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: showBackpack ? '#A78BFF' : '#2C2C31' }]} 
                                onPress={handleBackpackPress}
                            >
                                <Ionicons name="bag-handle-outline" size={20} color={showBackpack ? "#FFF" : "#FF4444"} />
                            </Pressable>
                            <Pressable 
                                style={[styles.categoryTab, { backgroundColor: radarTimer > 0 ? '#444' : '#2C2C31' }]} 
                                onPress={handleRadarPress}
                            >
                                <MaterialCommunityIcons name="treasure-chest" size={22} color={radarTimer > 0 ? "#666" : "#FFD700"} />
                                {radarTimer > 0 && (
                                    <View style={{ position: 'absolute', bottom: -12 }}>
                                        <Text style={{ fontSize: 9, color: '#AAA', fontWeight: '800' }}>
                                            {radarTimer < 60 ? `${radarTimer}s` : `${Math.floor(radarTimer / 60)}m`}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            <Pressable style={styles.memberRow}>
                                <View style={[styles.memberAvatar, { borderColor: '#4ADE80', overflow: 'hidden' }]}>
                                    {userAvatarUri ? (
                                        <Image source={{ uri: userAvatarUri }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <Ionicons name="person" size={22} color="#A78BFF" />
                                    )}
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>Você</Text>
                                    <Text style={{ color: '#AAA' }}>Localização atual</Text>
                                </View>
                                <View style={{ backgroundColor: '#2C2C31', padding: 6, borderRadius: 8 }}>
                                    <Text style={{ color: '#FFF', fontSize: 12 }}>Lv {levelData.level}</Text>
                                </View>
                            </Pressable>

                            {circleMembers.map(m => {
                                const isLiked = likedIds.includes(m.id);
                                return (
                                    <View key={m.id} style={styles.memberRow}>
                                        <Pressable 
                                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }}
                                            onPress={() => handleMemberTap(m)}
                                        >
                                            <View style={[styles.memberAvatar, { borderColor: m.online ? '#4ADE80' : '#333', overflow: 'hidden' }]}>
                                                {m.avatar ? (
                                                    <Image source={{ uri: m.avatar }} style={{ width: '100%', height: '100%' }} />
                                                ) : (
                                                    <Text style={{ color: m.online ? '#A78BFF' : '#555', fontWeight: '800' }}>{m.name[0]}</Text>
                                                )}
                                            </View>
                                            <View style={styles.memberInfo}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ color: '#FFF', fontWeight: '800' }}>{m.name}</Text>
                                                </View>
                                                <Text style={{ color: '#AAA', fontSize: 11 }}>
                                                    {m.hasLocation ? `${m.lat.toFixed(4)}, ${m.lon.toFixed(4)}` : 'Localização oculta'}
                                                </Text>
                                            </View>
                                        </Pressable>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                            <AnimatedLikeButton 
                                                isLiked={isLiked} 
                                                onToggle={() => handleToggleLike(m.id)} 
                                            />
                                            <Pressable onPress={() => handleOpenChat(m.id, m.name, m.avatar)}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#AAA" />
                                            </Pressable>
                                            <Pressable onPress={() => handleMemberTap(m)}>
                                                <Ionicons name="chevron-forward" size={18} color="#444" />
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })}
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
                statusBarTranslucent={true}
                onRequestClose={() => setShowBackpack(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#141419' }}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <View 
                            style={{ 
                                flex: 1,
                                padding: 24, 
                            }} 
                        >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons name="bag-handle" size={24} color="#FF4444" />
                                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>Sua Mochila</Text>
                            </View>
                            <Pressable 
                                onPress={() => setShowBackpack(false)}
                                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2C31', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Ionicons name="close" size={20} color="#AAA" />
                            </Pressable>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={{ gap: 2 }}>
                                {Object.entries(inventoryItems.reduce((acc, id) => {
                                    acc[id] = (acc[id] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>))
                                    .filter(([id]) => CATALOG.find(c => c.id === id)?.tab === 'consumable')
                                    .map(([id, quantity]: [string, any], index) => {
                                        const itemDef = CATALOG.find(c => (c as any).id === id);
                                        if (!itemDef) return null;
                                        
                                        return (
                                            <View 
                                                key={`${id}-${index}`} 
                                                style={{ 
                                                    width: '100%', 
                                                    flexDirection: 'row',
                                                    backgroundColor: '#1C1C21', 
                                                    borderRadius: 20, 
                                                    padding: 16,
                                                    alignItems: 'center',
                                                    borderWidth: 1,
                                                    borderColor: '#333',
                                                    marginBottom: 12
                                                }}
                                            >
                                                {/* Icone à Esquerda */}
                                                <View style={{ 
                                                    width: 52, 
                                                    height: 52, 
                                                    borderRadius: 14, 
                                                    backgroundColor: '#2C2C31', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    borderWidth: 1,
                                                    borderColor: '#444'
                                                }}>
                                                    <Ionicons name={(itemDef as any).icon} size={28} color="#A78BFF" />
                                                    {quantity > 1 && (
                                                        <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#000' }}>
                                                            <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>x{quantity}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                
                                                {/* Nome e Descrição Centralizados */}
                                                <View style={{ flex: 1, marginLeft: 16 }}>
                                                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{itemDef.name}</Text>
                                                    <Text style={{ color: '#AAA', fontSize: 12, marginTop: 2, lineHeight: 16 }}>{(itemDef as any).description}</Text>
                                                </View>

                                                {/* Botão de Ação à Direita */}
                                                <Pressable 
                                                    style={({ pressed }) => ({ 
                                                        backgroundColor: pressed ? '#8B5CF6' : '#A78BFF', 
                                                        paddingHorizontal: 16, 
                                                        paddingVertical: 10, 
                                                        borderRadius: 14,
                                                        marginLeft: 8,
                                                        elevation: 4,
                                                        shadowColor: '#A78BFF',
                                                        shadowOffset: { width: 0, height: 4 },
                                                        shadowOpacity: 0.3,
                                                        shadowRadius: 8
                                                    })}
                                                    onPress={() => handleUseItem(id)}
                                                >
                                                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>Utilizar</Text>
                                                </Pressable>
                                            </View>
                                        );
                                    })
                                }
                                {inventoryItems.filter(id => CATALOG.find(c => c.id === id)?.tab === 'consumable').length === 0 && (
                                    <Text style={{ color: '#666', textAlign: 'center', width: '100%', padding: 40 }}>Sua mochila não possui itens consumíveis...</Text>
                                )}
                            </View>
                        </ScrollView>
                        
                        <Text style={{ color: '#555', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
                            Toque num item consumível para usar • Deslize para baixo ou use o X para fechar
                        </Text>
                    </View>
                </SafeAreaView>
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

            {/* Modal Radar Social */}
            <Modal visible={showSocialRadar} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
                    {!discoveredUsers.length ? (
                        <View style={{ alignItems: 'center' }}>
                            <Animated.View style={{
                                width: 150, height: 150, borderRadius: 75,
                                backgroundColor: '#60A5FA', opacity: radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                                transform: [{ scale: radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) }],
                                position: 'absolute'
                            }} />
                            <Ionicons name="wifi" size={48} color="#60A5FA" />
                            <Text style={{ color: '#FFF', fontSize: 18, marginTop: 40, fontWeight: '800' }}>Buscando conexões...</Text>
                            <Text style={{ color: '#60A5FA', fontSize: 13, marginTop: 8 }}>Varrendo raio de 1km</Text>
                        </View>
                    ) : (
                        <View style={{ width: '85%', backgroundColor: '#1C1C21', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#60A5FA' }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 16 }}>{discoveredUsers.length} Pessoas Próximas</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                {discoveredUsers.map((u, i) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#333' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#2C2C31', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#60A5FA' }}>
                                                <Text style={{ color: '#FFF', fontWeight: '800' }}>{u.name[0]}</Text>
                                            </View>
                                            <View>
                                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>{u.name}</Text>
                                                <Text style={{ color: '#AAA', fontSize: 11 }}>
                                                    {u.dist < 100 ? 'Muito perto de você' : `A ${Math.round(u.dist)}m de distância`}
                                                </Text>
                                            </View>
                                        </View>
                                        <Pressable style={{ backgroundColor: '#60A5FA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }} onPress={() => Alert.alert('Pedido Enviado!', `Pedido de amizade enviado para ${u.name}.`)}>
                                            <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>Adicionar</Text>
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                            <Pressable style={{ marginTop: 12, alignItems: 'center', padding: 12 }} onPress={() => { setShowSocialRadar(false); setDiscoveredUsers([]); }}>
                                <Text style={{ color: '#AAA', fontWeight: '700' }}>Fechar</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </Modal>

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

            {/* Overlay de Animação Líquida */}
            <LiquidMergeOverlay 
                visible={showMerge}
                points={mergePoints.length > 0 ? mergePoints : [{ x: SCREEN_WIDTH/2, y: SCREEN_HEIGHT/2 }, { x: SCREEN_WIDTH/2 + 20, y: SCREEN_HEIGHT/2 + 20 }]}
                color={colors.primary}
            />

            {/* Modal de Sucesso do Farejo */}
            <Modal
                visible={showRadarModal}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setShowRadarModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ 
                        width: '85%', 
                        backgroundColor: '#1C1C21', 
                        borderRadius: 32, 
                        padding: 32, 
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#FFD70033',
                        shadowColor: '#FFD700',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.2,
                        shadowRadius: 20,
                        elevation: 10
                    }}>
                        <View style={{ 
                            width: 100, 
                            height: 100, 
                            borderRadius: 50, 
                            backgroundColor: '#FFD70015', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginBottom: 24
                        }}>
                            <MaterialCommunityIcons name="treasure-chest" size={56} color="#FFD700" />
                        </View>
                        
                        <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFF', marginBottom: 12, textAlign: 'center' }}>Farejo Ativo!</Text>
                        <Text style={{ fontSize: 16, color: '#AAA', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
                            Seu pet farejou rastros de tesouros! Verifique os ícones de baú que apareceram no seu mapa.
                        </Text>

                        <Pressable 
                            style={{ 
                                width: '100%', 
                                backgroundColor: '#FFD700', 
                                paddingVertical: 18, 
                                borderRadius: 20, 
                                alignItems: 'center',
                                shadowColor: '#FFD700',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.4,
                                shadowRadius: 8
                            }}
                            onPress={() => setShowRadarModal(false)}
                        >
                            <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>VAMOS BUSCAR!</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal de Cooldown do Farejo */}
            <Modal
                visible={showCooldownModal}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setShowCooldownModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ 
                        width: '85%', 
                        backgroundColor: '#1C1C21', 
                        borderRadius: 32, 
                        padding: 32, 
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#66666633'
                    }}>
                        <View style={{ 
                            width: 100, 
                            height: 100, 
                            borderRadius: 50, 
                            backgroundColor: '#66666620', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginBottom: 24
                        }}>
                            <Ionicons name="bed-outline" size={56} color="#8E8E9A" />
                        </View>
                        
                        <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFF', marginBottom: 12, textAlign: 'center' }}>Pet Cansado</Text>
                        <Text style={{ fontSize: 16, color: '#AAA', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
                            O pet ainda está descansando do último farejo. Volte em {radarTimer < 60 ? `${radarTimer}s` : `${Math.floor(radarTimer / 60)}m ${radarTimer % 60}s`}.
                        </Text>

                        <Pressable 
                            style={{ 
                                width: '100%', 
                                backgroundColor: '#2C2C31', 
                                paddingVertical: 18, 
                                borderRadius: 20, 
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: '#444'
                            }}
                            onPress={() => setShowCooldownModal(false)}
                        >
                            <Text style={{ color: '#AAA', fontWeight: '900', fontSize: 16 }}>ENTENDIDO</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal de Feedback de Uso de Item */}
            <Modal
                visible={showItemUsedModal}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setShowItemUsedModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ 
                        width: '80%', 
                        backgroundColor: '#1C1C21', 
                        borderRadius: 32, 
                        padding: 32, 
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#A78BFF33'
                    }}>
                        <View style={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: 40, 
                            backgroundColor: '#A78BFF15', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginBottom: 20
                        }}>
                            {usedItemData?.iconLib === 'MaterialCommunityIcons' ? (
                                <MaterialCommunityIcons name={usedItemData?.icon} size={40} color="#A78BFF" />
                            ) : (
                                <Ionicons name={usedItemData?.icon || 'sparkles'} size={40} color="#A78BFF" />
                            )}
                        </View>
                        
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFF', marginBottom: 8, textAlign: 'center' }}>Item Usado!</Text>
                        <Text style={{ fontSize: 15, color: '#AAA', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
                            Você consumiu <Text style={{ color: '#FFF', fontWeight: '700' }}>{usedItemData?.name}</Text> e ganhou um bônus de <Text style={{ color: '#A78BFF', fontWeight: '800' }}>{usedItemData?.amount} {usedItemData?.type}</Text>!
                        </Text>

                        <Pressable 
                            style={{ 
                                width: '100%', 
                                backgroundColor: '#A78BFF', 
                                paddingVertical: 14, 
                                borderRadius: 16, 
                                alignItems: 'center'
                            }}
                            onPress={() => setShowItemUsedModal(false)}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>EXCELENTE!</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Modal de Tesouro Encontrado */}
            <Modal
                visible={showTreasureModal}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setShowTreasureModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ 
                        width: '80%', 
                        backgroundColor: '#1C1C21', 
                        borderRadius: 32, 
                        padding: 32, 
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#FFD70033'
                    }}>
                        <View style={{ 
                            width: 90, 
                            height: 90, 
                            borderRadius: 45, 
                            backgroundColor: treasureType === 'gems' ? '#60A5FA15' : '#FFD70015', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: treasureType === 'gems' ? '#60A5FA44' : '#FFD70044'
                        }}>
                            <MaterialCommunityIcons 
                                name={treasureType === 'gems' ? "diamond-stone" : "treasure-chest"} 
                                size={48} 
                                color={treasureType === 'gems' ? "#60A5FA" : "#FFD700"} 
                            />
                        </View>
                        
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 8, textAlign: 'center' }}>
                            {treasureType === 'gems' ? 'GEMAS ENCONTRADAS!' : 'BAÚ ENCONTRADO!'}
                        </Text>
                        <Text style={{ fontSize: 16, color: '#AAA', textAlign: 'center', marginBottom: 28, lineHeight: 24 }}>
                            Parabéns! Você descobriu um tesouro perdido e ganhou <Text style={{ color: treasureType === 'gems' ? '#60A5FA' : '#FFD700', fontWeight: '900' }}>{treasureAmount} {treasureType === 'gems' ? 'WanderGems' : 'Moedas'}</Text>!
                        </Text>

                        <Pressable 
                            style={{ 
                                width: '100%', 
                                backgroundColor: treasureType === 'gems' ? '#60A5FA' : '#FFD700', 
                                paddingVertical: 16, 
                                borderRadius: 16, 
                                alignItems: 'center',
                                elevation: 8,
                                shadowColor: treasureType === 'gems' ? '#60A5FA' : '#FFD700',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.4,
                                shadowRadius: 10
                            }}
                            onPress={() => setShowTreasureModal(false)}
                        >
                            <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>COLETAR</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* MODAL: CHAT INTEGRADO */}
            <Modal 
                visible={isChatVisible} 
                animationType="slide" 
                onRequestClose={() => setIsChatVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }}>
                    {(() => {
                        const targetMember = circleMembers.find(m => m.id === chatTarget?.id);
                        const isOnline = targetMember?.online || false;
                        return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#333' : '#EEE', backgroundColor: isDarkMode ? '#1C1C21' : '#FFF' }}>
                                <Pressable onPress={() => setIsChatVisible(false)} style={{ padding: 8 }}>
                                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                                </Pressable>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#2C2C31', overflow: 'hidden', marginHorizontal: 12 }}>
                                    {chatTarget?.avatar ? (
                                        <Image source={{ uri: chatTarget.avatar }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ color: '#FFF', fontWeight: '800' }}>{chatTarget?.name ? chatTarget.name[0] : '?'}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{chatTarget?.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isOnline ? '#4ADE80' : '#888' }} />
                                        <Text style={{ fontSize: 12, color: isOnline ? '#4ADE80' : colors.subtext }}>
                                            {isOnline ? 'Online agora' : 'Offline'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })()}

                    <ScrollView 
                        ref={chatScrollRef}
                        style={{ flex: 1, padding: 16 }}
                        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                    >
                        {chatMessages.map((msg) => {
                            const isMe = msg.senderId === 'me';
                            return (
                                <View key={msg.id} style={{ 
                                    alignSelf: isMe ? 'flex-end' : 'flex-start', 
                                    backgroundColor: isMe ? colors.primary : (isDarkMode ? '#2C2C31' : '#FFF'), 
                                    paddingHorizontal: 16, 
                                    paddingVertical: 10, 
                                    borderRadius: 20, 
                                    borderBottomRightRadius: isMe ? 4 : 20,
                                    borderBottomLeftRadius: isMe ? 20 : 4,
                                    marginBottom: 12,
                                    maxWidth: '80%',
                                    elevation: 2,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4
                                }}>
                                    <Text style={{ color: isMe ? '#FFF' : colors.text, fontSize: 15 }}>{msg.text}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                                        <Text style={{ color: isMe ? 'rgba(255,255,255,0.6)' : colors.subtext, fontSize: 10 }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        {isMe && <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" />}
                                    </View>
                                </View>
                            );
                        })}
                        {isOtherTyping && <TypingIndicator />}
                    </ScrollView>

                    <View style={{ padding: 16, backgroundColor: isDarkMode ? '#1C1C21' : '#FFF', borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#EEE' }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {QUICK_MESSAGES.map(q => (
                                <Pressable 
                                    key={q.id} 
                                    onPress={() => { setChatInput(q.text); handleSendMessage(); }}
                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#2C2C31' : '#F0F0F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8, gap: 6 }}
                                >
                                    <Ionicons name={q.icon as any} size={14} color={q.color} />
                                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{q.text}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TextInput 
                                style={{ 
                                    flex: 1, 
                                    backgroundColor: isDarkMode ? '#2C2C31' : '#F0F0F0', 
                                    borderRadius: 20, 
                                    paddingHorizontal: 20, 
                                    paddingVertical: 12, 
                                    color: colors.text,
                                    maxHeight: 100
                                }}
                                placeholder="Mensagem..."
                                placeholderTextColor={colors.subtext}
                                value={chatInput}
                                onChangeText={(txt) => {
                                    setChatInput(txt);
                                    handleTyping();
                                }}
                                multiline
                            />
                            <Pressable 
                                onPress={handleSendMessage}
                                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 }}
                            >
                                <Ionicons name="send" size={20} color="#FFF" />
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>
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
    // Estilos de Chat Integrado
    chatBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '80%' },
    quickMsgBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8, borderWidth: 1 },
});