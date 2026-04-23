import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions, Alert, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { MapViewLibre } from '@/components/MapViewLibre';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabaseConfig';
import { useSupabaseRealtime } from '@/components/SupabaseRealtimeProvider';
import { clusterPlayers, MarkerData, PlayerData } from '@/utils/clusterPlayers';
import { MergedMarker } from '@/components/MergedMarker';
import { GameMarker } from '@/components/GameMarker';
import { SpotMarker } from '@/components/SpotMarker';
import { getCurrentUserLocal, getPetLocal } from '@/localDatabase';

// Habilitar LayoutAnimation no Android (mesmo que usemos Animated para o Morph, é bom ter)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fallback de Spots caso GameService não seja encontrado
const PET_SPOTS = [
    { id: 'spot-1', latitude: -25.4330, longitude: -49.2810, type: 'park' as const, name: 'Parque de Treino' },
];

export default function PetMapScreen() {
    const router = useRouter();
    const colors = {
        primary: '#A78BFF',
        secondary: '#1C1C21',
        background: '#121218',
        text: '#FFFFFF',
        accent: '#FFD700'
    };

    // States
    const [user, setUser] = useState<any>(null);
    const [location, setLocation] = useState<any>(null);
    const [currentRegion, setCurrentRegion] = useState<any>(null);
    const [visibleMarkers, setVisibleMarkers] = useState<MarkerData[]>([]);
    const [pet, setPet] = useState<any>(null);
    const [userName, setUserName] = useState('Você');
    const [userAvatarUri, setUserAvatarUri] = useState<string | null>(null);

    const { remoteUsers, broadcastSyncInvite } = useSupabaseRealtime();
    
    // Refs e Estados para Animação Pre-Merge
    const preMergeTimerRef = useRef<any>(null);
    const previousMarkersRef = useRef<MarkerData[]>([]);
    const [displayMarkers, setDisplayMarkers] = useState<MarkerData[]>([]);
    const knownIdsRef = useRef<Set<string>>(new Set());

    // 1. Carregar Dados Iniciais
    useEffect(() => {
        const init = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
            setCurrentRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            });

            const currentUser = await getCurrentUserLocal();
            setUser(currentUser);
            
            const p = await getPetLocal();
            setPet(p);

            if (currentUser) {
                const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
                if (data) {
                    setUserName(data.username || 'Explorador');
                    setUserAvatarUri(data.avatar_url);
                }
            }
        };
        init();
    }, []);

    // 2. Lógica de Clustering com Pre-Merge Animation
    useEffect(() => {
        if (!location) return;

        const players: PlayerData[] = [];
        players.push({
            id: user?.id || 'me',
            name: userName,
            coordinates: { latitude: location.latitude, longitude: location.longitude },
            color: colors.primary,
            imageUri: userAvatarUri,
            pet: pet,
            isMe: true,
            heading: location.heading
        });

        Object.values(remoteUsers).forEach(u => {
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

        const newClusters = clusterPlayers(players, currentRegion || location, 0.001);
        const prevClusters = previousMarkersRef.current;

        // Detectar IDs novos para Pop-In
        const newIds = new Set(newClusters.map(m => m.id));
        const newMarkers = newClusters.map(m => ({
            ...m,
            isNew: !knownIdsRef.current.has(m.id)
        }));
        knownIdsRef.current = newIds;

        // Lógica de Pre-Merge (Fusão Líquida)
        const prevHadIndividuals = prevClusters.some(m => m.type !== 'merged');
        const nowHasMerge = newClusters.some(m => m.type === 'merged');
        const mergeHappened = nowHasMerge && prevHadIndividuals && newClusters.length < prevClusters.length;

        if (mergeHappened) {
            const mergedMarker = newClusters.find(m => m.type === 'merged')!;
            const centroid = mergedMarker.coordinates;

            const preMergeDisplay = prevClusters.map(prev => {
                if (prev.type === 'merged') return prev;
                return {
                    ...prev,
                    coordinates: centroid,
                    isNew: false,
                };
            });

            setDisplayMarkers(preMergeDisplay);

            if (preMergeTimerRef.current) clearTimeout(preMergeTimerRef.current);
            preMergeTimerRef.current = setTimeout(() => {
                setDisplayMarkers(newMarkers);
                previousMarkersRef.current = newClusters;
            }, 350);
        } else {
            if (preMergeTimerRef.current) clearTimeout(preMergeTimerRef.current);
            setDisplayMarkers(newMarkers);
            previousMarkersRef.current = newClusters;
        }

        setVisibleMarkers(newClusters);
    }, [remoteUsers, location, currentRegion, user, userName, userAvatarUri, pet]);

    useEffect(() => {
        return () => { if (preMergeTimerRef.current) clearTimeout(preMergeTimerRef.current); };
    }, []);

    const handleSyncPress = () => {
        if (!location?.latitude) return;
        broadcastSyncInvite({
            latitude: location.latitude,
            longitude: location.longitude,
            heading: location.heading || 0,
            timestamp: Date.now()
        });
        Alert.alert("Convite Enviado!", "Chamando jogadores em um raio de 1km para sincronizar.");
    };

    return (
        <View style={styles.container}>
            <MapViewLibre
                region={currentRegion}
                onRegionChangeComplete={setCurrentRegion}
            >
                {displayMarkers.map(m => {
                    if (m.type === 'merged' && m.players) {
                        return (
                            <MergedMarker 
                                key={m.id}
                                id={m.id}
                                latitude={m.coordinates.latitude}
                                longitude={m.coordinates.longitude}
                                imageUris={m.players.map(p => p.imageUri || null)}
                                primaryColor={colors.primary}
                            />
                        );
                    }

                    const playerData = (m as any).player || (m as any);

                    return (
                        <GameMarker 
                            key={m.id}
                            id={m.id}
                            latitude={m.coordinates.latitude}
                            longitude={m.coordinates.longitude}
                            name={playerData.name || 'Explorador'}
                            primaryColor={playerData.color || colors.primary}
                            pet={playerData.pet}
                            avatarUri={playerData.imageUri}
                            isMe={(m as any).isMe}
                            isNew={(m as any).isNew}
                            onPress={() => {}}
                        />
                    );
                })}

                {(currentRegion?.latitudeDelta || 0.01) < 0.05 && PET_SPOTS.map((spot: any) => (
                    <SpotMarker 
                        key={spot.id}
                        {...spot}
                    />
                ))}
            </MapViewLibre>

            <View style={styles.hudContainer}>
                <Pressable style={styles.syncBtn} onPress={handleSyncPress}>
                    <Ionicons name="pulse" size={24} color="#FFF" />
                    <Text style={styles.syncText}>Sincronizar</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121218' },
    hudContainer: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        alignItems: 'center',
    },
    syncBtn: {
        backgroundColor: '#A78BFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        elevation: 10,
    },
    syncText: { color: '#FFF', fontWeight: '900', marginLeft: 8 }
});