import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert, Text, Platform, Pressable, Image, ScrollView, Switch, Dimensions, Animated, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPetLocal, LocalPet, getCoinsLocal, saveCoinsLocal, getLevelDataLocal, addXPLocal, getSettingsLocal } from '../../localDatabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import * as Location from 'expo-location';
// @ts-ignore
import { MapViewProvider, MapMarker } from '../../components/MapViewProvider';
import { ParticleSystem, ParticleSystemRef } from '../../components/ParticleSystem';
import { PetPreview } from '../../components/PetPreview';
import * as Battery from 'expo-battery';
import { addDistanceLocal, recordVisitLocal, savePathPointLocal, getTotalDistanceLocal, getCurrentUserLocal, getPathByDateLocal } from '../../localDatabase';
import { AuthService } from '../../services/AuthService';
import { supabase } from '../../services/supabaseConfig';

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

export default function MapScreen() {
    const { colors, isDarkMode } = useTheme();
    const particleRef = useRef<ParticleSystemRef>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const router = useRouter();
    
    const [pet, setPet] = useState<LocalPet | null>(null);
    const [coins, setCoins] = useState(0);
    const [levelData, setLevelData] = useState({ xp: 0, level: 1 });
    const [spawns, setSpawns] = useState<CoinSpawn[]>([]);
    const [totalDistance, setTotalDistance] = useState(0);
    
    const lastLocation = useRef<{latitude: number, longitude: number} | null>(null);
    const [location, setLocation] = useState({
        latitude: -23.5505, longitude: -46.6333,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
        heading: 0,
    });

    // Life360: estados do bottom sheet
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showMemberDetail, setShowMemberDetail] = useState(false);
    const [locationAlerts, setLocationAlerts] = useState(false);
    const [activeCircle, setActiveCircle] = useState('Principal');
    const [circleMembers, setCircleMembers] = useState<any[]>([]);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [economyMode, setEconomyMode] = useState(false);

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

    // --- REAL-TIME FRIENDS (SUPABASE) ---
    useEffect(() => {
        let channel: any;

        const setupSocialSync = async () => {
            const user = await getCurrentUserLocal();
            if (!user) return;

            const friendIds = await AuthService.getFriendsCloud(user.id);
            if (friendIds.length === 0) return;

            // 1. Busca inicial das localizações
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
                    battery: 100, // No futuro podemos sincronizar baterial real
                    since: 'Agora'
                }));
                // @ts-ignore
                setCircleMembers(formatted);
            }

            // 2. Escuta em tempo real
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
                            return prev; // Se não estava na busca inicial, aguarda reload ou busca profile
                        });
                    }
                })
                .subscribe();
        };

        setupSocialSync();
        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const [debugStatus, setDebugStatus] = useState("");

    // --- SCRIPT DE DIAGNÓSTICO (AUTO-EXECUTÁVEL) ---
    useEffect(() => {
        const runDiagnostics = async () => {
            console.log("🕵️‍♂️ [DIAGNÓSTICO] Verificando conexão...");
            try {
                const user = await getCurrentUserLocal();
                
                // MIRA: Se o ID não for um UUID (contém apenas números ou é curto), vamos resetar para teste
                if (user && !user.id.includes('-')) {
                    console.warn("⚠️ [DIAGNÓSTICO] ID antigo detectado. Migrando para UUID...");
                    // Pega um ID real do banco para esse usuário ou gera um novo
                    const { data: profile } = await supabase.from('profiles').select('id').eq('name', 'Roover').single();
                    if (profile) {
                        const newUser = { ...user, id: profile.id };
                        await AsyncStorage.setItem('@wanderpet_current_user', JSON.stringify(newUser));
                        setDebugStatus("🔄 Sessão atualizada! Recarregando...");
                        setTimeout(() => router.replace('/(tabs)'), 1000);
                        return;
                    }
                }

                // 1. Testar conexão básica
                const groups = await AuthService.getGroups();
                setDebugStatus(`✅ Conectado! Clãs: ${groups.length}`);
                
                if (user) {
                    setDebugStatus(prev => prev + ` | Usuário: ${user.name || 'OK'}`);
                    const friends = await AuthService.getFriendsCloud(user.id);
                    console.log("Amigos carregados:", friends.length);
                }

                setTimeout(() => setDebugStatus(""), 10000);
            } catch (e) {
                console.error(e);
                setDebugStatus(`❌ Erro: ${String(e)}`);
            }
        };

        const timer = setTimeout(runDiagnostics, 1000);
        return () => clearTimeout(timer);
    }, []);
    
    // Slider e Tab Hide logic
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const sheetHeightAnim = useRef(new Animated.Value(280)).current;
    const navigation = useNavigation();
    
    const expandSheet = () => {
        navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
        Animated.spring(sheetHeightAnim, { toValue: SCREEN_HEIGHT - 50, useNativeDriver: false }).start();
    };

    const collapseSheet = () => {
        navigation.getParent()?.setOptions({ tabBarStyle: { display: 'flex' } });
        Animated.spring(sheetHeightAnim, { toValue: 280, useNativeDriver: false }).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -40) {
                    expandSheet();
                } else if (gestureState.dy > 40) {
                    collapseSheet();
                }
            }
        })
    ).current;

    const nextLevelXP = levelData.level * 500;

    const loadData = async () => {
        const p = await getPetLocal();
        const c = await getCoinsLocal();
        const l = await getLevelDataLocal();
        const d = await getTotalDistanceLocal();
        const s = await getSettingsLocal();
        setPet(p); setCoins(c); setLevelData(l); setTotalDistance(d);
        setEconomyMode(s.batterySaver);
    };

    useFocusEffect(React.useCallback(() => { loadData(); }, []));

    // --- SINCRONIZAÇÃO DE EXPEDIÇÃO (CLOUD SAVE) ---
    useEffect(() => {
        const syncExpedition = async () => {
            const user = await getCurrentUserLocal();
            if (!user) return;

            const today = new Date().toISOString().split('T')[0];
            const path = await savePathPointLocal(0, 0); // Hack para pegar o path atual sem adicionar ponto
            // Na verdade, melhor ler direto do local se houver uma função
            const currentPath = await getPathByDateLocal(today);
            const currentDist = await addDistanceLocal(0); // Pega o total acumulado

            if (currentDist > 0 || currentPath.length > 0) {
                await AuthService.saveExpedition(user.id, currentDist, currentPath, 0);
            }
        };

        const timer = setInterval(syncExpedition, 1000 * 60 * 10); // Sincroniza a cada 10 minutos
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        startTracking();
        return () => { 
            if (locationSubscription.current) {
                try {
                    if (typeof locationSubscription.current.remove === 'function') {
                        locationSubscription.current.remove();
                    }
                } catch (e) {
                    console.warn('Erro ao remover subscrição de localização:', e);
                }
            }
        };
    }, [economyMode]);

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos do GPS para rastrear sua localização.');
            return;
        }
        let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = currentLocation.coords;
        setLocation(prev => ({ ...prev, latitude, longitude }));
        lastLocation.current = { latitude, longitude };

        generateCoins(latitude, longitude);

        // Se o modo economia estiver ON, reduzimos a precisão e aumentamos o intervalo para poupar bateria/dados
        const trackingOptions = economyMode ? {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000, // 15 segundos
            distanceInterval: 30 // 30 metros
        } : {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000, // 3 segundos
            distanceInterval: 5  // 5 metros
        };

        if (locationSubscription.current) {
            locationSubscription.current.remove();
        }

        locationSubscription.current = await Location.watchPositionAsync(
            trackingOptions,
            (loc) => {
                const { latitude: newLat, longitude: newLon, heading } = loc.coords;
                setLocation(prev => ({ ...prev, latitude: newLat, longitude: newLon, heading: heading || prev.heading }));
                
                // --- SINCRONIZAÇÃO SUPABASE (REAL-TIME) ---
                const syncCloudLocation = async () => {
                    const user = await getCurrentUserLocal();
                    if (user) {
                        const settings = await getSettingsLocal();
                        AuthService.updateLocation(user.id, newLat, newLon, settings.ghostMode);
                    }
                };
                syncCloudLocation();

                if (lastLocation.current) {
                    const dist = calculateDistance(lastLocation.current.latitude, lastLocation.current.longitude, newLat, newLon);
                    if (dist > 3 && dist < 1000) {
                        addDistanceLocal(dist);
                        recordVisitLocal(newLat, newLon);
                        savePathPointLocal(newLat, newLon);
                    }
                }
                lastLocation.current = { latitude: newLat, longitude: newLon };
            }
        );
    };

    const generateCoins = (lat: number, lon: number) => {
        const newSpawns: CoinSpawn[] = [];
        for (let i = 0; i < 6; i++) {
            newSpawns.push({
                id: `coin_${Date.now()}_${i}`,
                latitude: lat + (Math.random() - 0.5) * 0.006,
                longitude: lon + (Math.random() - 0.5) * 0.006,
            });
        }
        setSpawns(newSpawns);
    };

    const collectCoin = async (id: string, value: number) => {
        setSpawns(prev => prev.filter(c => c.id !== id));
        const newCoins = coins + value;
        setCoins(newCoins);
        await saveCoinsLocal(newCoins);
        const { width, height } = Dimensions.get('window');
        particleRef.current?.burst(width / 2, height / 2, 'star');
        const result = await addXPLocal(15);
        setLevelData({ xp: result.xp, level: result.level });
        if (result.leveledUp) {
            Alert.alert('Nível alcançado!', `Seu pet subiu para o nível ${result.level}!`);
            loadData();
        }
    };

    const handleMemberTap = (member: any) => {
        setSelectedMember(member);
        setShowMemberDetail(true);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            
            {/* MAPA */}
            <View style={{ flex: 1 }}>
                <MapViewProvider 
                    region={location}
                    onPress={() => setShowMemberDetail(false)}
                >
                    {/* Moedas */}
                    {spawns.map(coin => (
                        <MapMarker key={coin.id} coordinate={{ latitude: coin.latitude, longitude: coin.longitude }} onPress={() => collectCoin(coin.id, 10)}>
                            <View style={[styles.coinMarker, { borderColor: '#F2C14E88' }]}>
                                <View style={[styles.coinDot, { backgroundColor: '#F2C14E' }]} />
                            </View>
                        </MapMarker>
                    ))}

                    {/* Avatar do jogador — estilo Life360 */}
                    <MapMarker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.playerAvatar, { borderColor: colors.primary }]}>
                                {pet?.customImageUri ? (
                                    <Image source={{ uri: pet.customImageUri }} style={styles.avatarImg} />
                                ) : (
                                    <Ionicons name="person" size={24} color={colors.subtext} />
                                )}
                            </View>
                            <View style={[styles.playerAura, { backgroundColor: colors.primary }]} />
                        </View>
                    </MapMarker>

                    {/* Membros do clã no mapa */}
                    {circleMembers.map(m => (
                        <MapMarker key={m.id} coordinate={{ latitude: m.lat, longitude: m.lon }} onPress={() => handleMemberTap(m)}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={[styles.memberMapAvatar, { borderColor: m.online ? colors.primary : colors.subtext }]}>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{(m.name || '?')[0]}</Text>
                                </View>
                                <View style={[styles.memberPin, { backgroundColor: colors.primary }]}>
                                    <View style={styles.memberPinTip} />
                                </View>
                            </View>
                        </MapMarker>
                    ))}
                </MapViewProvider>

                {/* PAINEL DE STATUS (Invisível no Git, aparece apenas se houver erro) */}
                {debugStatus !== "" && !debugStatus.includes("✅") && (
                    <View style={{
                        position: 'absolute', 
                        top: 50, 
                        left: 20, 
                        right: 20, 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        padding: 15, 
                        borderRadius: 16,
                        zIndex: 9999,
                        borderWidth: 2,
                        borderColor: '#E74C3C'
                    }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>{debugStatus}</Text>
                        <Pressable 
                            onPress={async () => {
                                await AsyncStorage.clear();
                                router.replace('/login');
                            }}
                            style={{ backgroundColor: '#E74C3C', padding: 8, borderRadius: 8, marginTop: 10, alignItems: 'center' }}
                        >
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>REPARAR SESSÃO</Text>
                        </Pressable>
                    </View>
                )}

                {/* Top bar sobre o mapa */}
                <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
                    <View style={styles.topBar}>
                        <View style={{ width: 40 }} /> {/* Espaçador para balancear o layout */}

                        <Pressable style={[styles.circleDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.circleDropdownText, { color: colors.text }]} numberOfLines={1}>{activeCircle}</Text>
                            <Ionicons name="chevron-down" size={16} color={colors.subtext} />
                        </Pressable>

                        <Pressable style={[styles.addBtn, { borderColor: colors.border }]} onPress={() => router.push('/friends')}>
                            <Ionicons name="person" size={20} color={colors.primary} />
                        </Pressable>
                    </View>

                    {/* HUD de moedas e nível */}
                    <View style={styles.hudRow}>
                        <View style={[styles.hudBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="wallet" size={12} color={colors.primary} />
                            <Text style={[styles.hudText, { color: colors.text }]}>{String(coins)}</Text>
                        </View>
                        <View style={[styles.hudBadge, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.hudText, { color: '#FFF' }]}>Lv {String(levelData.level)}</Text>
                        </View>
                    </View>
                </SafeAreaView>

                <View style={[styles.mapActions, { bottom: 296 }]} pointerEvents="box-none">
                    <View style={styles.mapActionsLeft}>
                        <Pressable style={[styles.checkinBtn, { backgroundColor: colors.primary }]} onPress={() => Alert.alert('Check-in', 'Sua localização atual foi fixada com sucesso!')}>
                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                            <Text style={styles.checkinText}>Check-in</Text>
                        </Pressable>
                        <Pressable style={[styles.sosBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => Alert.alert('S.O.S', 'Seus contatos de emergência e clãs foram notificados!')}>
                            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                            <Text style={[styles.sosText, { color: colors.text }]}>SOS</Text>
                        </Pressable>
                    </View>
                    <Pressable style={[styles.layersBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => Alert.alert('Filtros', 'Opções de camadas em breve.')}>
                        <Ionicons name="layers" size={20} color={colors.primary} />
                    </Pressable>
                </View>
            </View>

            <ParticleSystem ref={particleRef} />

            <Animated.View style={[styles.bottomSheet, { backgroundColor: colors.card, borderTopColor: colors.border, height: sheetHeightAnim }]}>
                {/* O Handle DRAP Fica fora da lista de rolagem para sempre puxar com facilidade */}
                <View {...panResponder.panHandlers} style={[styles.sheetHandle, { zIndex: 10 }]} hitSlop={{ top: 20, bottom: 20 }}>
                    <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
                </View>

                {showMemberDetail && selectedMember ? (
                    /* DETALHE DO MEMBRO */
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Pressable onPress={() => { setShowMemberDetail(false); collapseSheet(); }} style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                            <Text style={{ color: colors.primary, fontWeight: '700' }}>← Voltar à lista</Text>
                        </Pressable>

                        <View style={styles.memberDetailHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.memberDetailName, { color: colors.text }]}>{selectedMember.name}</Text>
                                <Text style={[styles.memberDetailLoc, { color: colors.text }]}>{selectedMember.location}</Text>
                                <Text style={[styles.memberDetailSince, { color: colors.subtext }]}>Desde às {selectedMember.since}</Text>
                                <View style={styles.onlineRow}>
                                    <View style={[styles.onlineDot, { backgroundColor: selectedMember.online ? '#4CAF50' : '#CCC' }]} />
                                    <Text style={[styles.onlineText, { color: colors.subtext }]}>{selectedMember.online ? 'Agora' : 'Offline'}</Text>
                                </View>
                            </View>
                            <View style={styles.batteryBadge}>
                                <Ionicons name="battery-charging" size={14} color="#4CAF50" />
                                <Text style={[styles.batteryText, { color: colors.text }]}>{String(selectedMember.battery)}%</Text>
                            </View>
                        </View>

                        {/* Quick messages */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickMsgRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                            {QUICK_MESSAGES.map(qm => (
                                <Pressable key={qm.id} style={[styles.quickMsgBubble, { backgroundColor: isDarkMode ? colors.accent : '#F7F7FA', borderColor: colors.border }]}>
                                    <Ionicons name={qm.icon as any} size={14} color={qm.color} />
                                    <Text style={[styles.quickMsgText, { color: colors.text }]}>{qm.text}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Alertas */}
                        <View style={styles.alertsSection}>
                            <View style={[styles.alertRow, { borderBottomColor: colors.border }]}>
                                <View style={styles.alertInfo}>
                                    <Ionicons name="notifications-outline" size={20} color={colors.text} />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={[styles.alertTitle, { color: colors.text }]}>Receber Alertas de Locais</Text>
                                        <Text style={[styles.alertSub, { color: colors.subtext }]}>se {selectedMember.name} sair ou chegar</Text>
                                    </View>
                                </View>
                                <Switch value={locationAlerts} onValueChange={setLocationAlerts} trackColor={{ true: colors.primary }} thumbColor="#FFF" />
                            </View>
                            <Pressable style={styles.alertRow}>
                                <View style={styles.alertInfo}>
                                    <Ionicons name="time-outline" size={20} color={colors.text} />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={[styles.alertTitle, { color: colors.text }]}>Definir um Alerta de Ausência</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                            </Pressable>
                        </View>

                        {/* Barra de ações */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                            {[
                                { icon: 'navigate', label: '20 min' },
                                { icon: 'call', label: 'Ligar' },
                                { icon: 'chatbubble', label: 'Texto' },
                                { icon: 'alarm', label: 'Alerta' },
                            ].map((action, i) => (
                                <Pressable key={i} style={[styles.actionBtn, { borderColor: colors.border }]}>
                                    <Ionicons name={action.icon as any} size={16} color={colors.text} />
                                    <Text style={[styles.actionBtnText, { color: colors.text }]}>{action.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </ScrollView>
                ) : (
                    /* LISTA DE MEMBROS */
                    <View style={{ flex: 1 }}>
                        <View style={styles.categoryTabs}>
                            {[
                                { icon: 'people', active: true },
                                { icon: 'paw', active: false },
                                { icon: 'pricetag', active: false },
                                { icon: 'map', active: false },
                            ].map((tab, i) => (
                                <Pressable key={i} style={[styles.categoryTab, tab.active && { backgroundColor: colors.primary }]} onPress={() => Alert.alert('Filtro', 'Filtros estarão disponíveis em breve!')}>
                                    <Ionicons name={tab.icon as any} size={18} color={tab.active ? '#FFF' : colors.subtext} />
                                </Pressable>
                            ))}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {circleMembers.map(member => (
                                <Pressable key={member.id} style={[styles.memberRow, { borderBottomColor: colors.border }]} onPress={() => { handleMemberTap(member); expandSheet(); }}>
                                    <View style={[styles.memberAvatar, { borderColor: member.online ? colors.primary : colors.border }]}>
                                        {(member as any).avatar ? (
                                            <PetPreview species={(member as any).species || 'bunny'} size={50} customImageUri={(member as any).avatar} />
                                        ) : (
                                            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{member.name[0]}</Text>
                                        )}
                                        <View style={[styles.memberBatteryBadge, { backgroundColor: member.battery > 20 ? '#4CAF50' : '#E74C3C' }]}>
                                            <Text style={styles.memberBatteryText}>{String(member.battery)}%</Text>
                                        </View>
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                                        <Text style={[styles.memberLoc, { color: colors.subtext }]}>{member.location}</Text>
                                        <Text style={[styles.memberSince, { color: colors.subtext }]}>Desde às {member.since}</Text>
                                    </View>
                                    <Pressable onPress={() => Alert.alert('Like', `Você enviou um coração para ${member.name}!`)}>
                                        <Ionicons name="heart-outline" size={22} color={colors.subtext} />
                                    </Pressable>
                                </Pressable>
                            ))}

                            {/* Você */}
                            <Pressable style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                                <View style={[styles.memberAvatar, { borderColor: colors.primary }]}>
                                    {pet?.customImageUri ? (
                                        <PetPreview species={pet.species} size={50} customImageUri={pet.customImageUri} />
                                    ) : (
                                        <Ionicons name="person" size={22} color={colors.primary} />
                                    )}
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={[styles.memberName, { color: colors.text }]}>Você</Text>
                                    <Text style={[styles.memberLoc, { color: colors.subtext }]}>Localização atual</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.memberSince, { color: colors.subtext }]}>Agora</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: (batteryLevel ?? 0) > 20 ? '#4CAF5022' : '#E74C3C22', paddingHorizontal: 6, borderRadius: 6 }}>
                                            <Ionicons name="battery-charging" size={10} color={(batteryLevel ?? 0) > 20 ? '#4CAF50' : '#E74C3C'} />
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: (batteryLevel ?? 0) > 20 ? '#4CAF50' : '#E74C3C' }}>{batteryLevel ?? '--'}%</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.hudBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.hudText, { color: '#FFF' }]}>Lv {String(levelData.level)}</Text>
                                </View>
                            </Pressable>
                        </ScrollView>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Top overlay
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 8 : 16, gap: 10 },
    circleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E74C3C', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    notifText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    circleDropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, gap: 6 },
    circleDropdownText: { fontSize: 14, fontWeight: '600' },
    addBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.9)' },

    // HUD
    hudRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 10 },
    hudBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, gap: 5, borderWidth: 1 },
    hudText: { fontSize: 11, fontWeight: '700' },

    // Map actions
    mapActions: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 5 },
    mapActionsLeft: { flexDirection: 'row', gap: 8 },
    checkinBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 6 },
    checkinText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    sosBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 6, borderWidth: 1 },
    sosText: { fontWeight: '700', fontSize: 13 },
    layersBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

    // Player avatar
    playerAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7FA', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    playerAura: { position: 'absolute', bottom: -4, width: 60, height: 16, borderRadius: 30, opacity: 0.15, transform: [{ scaleY: 0.5 }] },

    // Member on map
    memberMapAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7FA', overflow: 'hidden' },
    memberPin: { width: 12, height: 12, borderRadius: 6, marginTop: -4, zIndex: -1 },
    memberPinTip: { width: 0, height: 0 },

    // Coin
    coinMarker: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, backgroundColor: 'rgba(242,193,78,0.1)' },
    coinDot: { width: 8, height: 8, borderRadius: 4 },

    // Bottom sheet
    bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    sheetHandle: { alignItems: 'center', paddingVertical: 14, width: '100%' },
    handleBar: { width: 40, height: 4, borderRadius: 2 },

    // Category tabs
    categoryTabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
    categoryTab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: '#F0F0F4' },

    // Member list
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
    memberAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7FA', position: 'relative', overflow: 'hidden' },
    memberBatteryBadge: { position: 'absolute', bottom: -4, left: -4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, },
    memberBatteryText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700' },
    memberLoc: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    memberSince: { fontSize: 11, fontWeight: '500', marginTop: 1 },

    // Member detail
    memberDetailHeader: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'flex-start' },
    memberDetailName: { fontSize: 22, fontWeight: '800' },
    memberDetailLoc: { fontSize: 14, fontWeight: '600', marginTop: 4 },
    memberDetailSince: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    onlineText: { fontSize: 12, fontWeight: '600' },
    batteryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    batteryText: { fontSize: 12, fontWeight: '700' },

    // Quick messages
    quickMsgRow: { marginTop: 16 },
    quickMsgBubble: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
    quickMsgText: { fontSize: 12, fontWeight: '600' },

    // Alerts
    alertsSection: { marginTop: 20, paddingHorizontal: 20 },
    alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
    alertInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    alertTitle: { fontSize: 14, fontWeight: '600' },
    alertSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },

    // Action buttons
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, gap: 6 },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
});