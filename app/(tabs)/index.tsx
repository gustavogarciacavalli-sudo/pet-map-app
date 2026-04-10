import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, useWindowDimensions, Alert, Text, Platform } from 'react-native';
import { PetPreview } from '../../components/PetPreview';
import { getPetLocal, LocalPet, getCoinsLocal, saveCoinsLocal, getLevelDataLocal, addXPLocal } from '../../localDatabase';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import * as Location from 'expo-location';
import { MapViewProvider, MapMarker } from '../../components/MapViewProvider';
import { ParticleSystem, ParticleSystemRef } from '../../components/ParticleSystem';
import { addDistanceLocal, recordVisitLocal, savePathPointLocal, getTotalDistanceLocal } from '../../localDatabase';

// Função para calcular distância entre coordenadas (Haversine) em metros
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

interface CoinSpawn {
    id: string;
    latitude: number;
    longitude: number;
}

export default function MapScreen() {
    const { colors, isDarkMode } = useTheme();
    const particleRef = useRef<ParticleSystemRef>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const { width, height } = useWindowDimensions();
    
    const [pet, setPet] = useState<LocalPet | null>(null);
    const [coins, setCoins] = useState(0);
    const [levelData, setLevelData] = useState({ xp: 0, level: 1 });
    const [spawns, setSpawns] = useState<CoinSpawn[]>([]);
    const [totalDistance, setTotalDistance] = useState(0);
    const [visitCount, setVisitCount] = useState(0);
    
    // Referência para calcular o delta de distância
    const lastLocation = useRef<{latitude: number, longitude: number} | null>(null);

    const [location, setLocation] = useState({
        latitude: -23.5505,
        longitude: -46.6333,
        latitudeDelta: 0.003, // Mais aproximado para sensação de jogo
        longitudeDelta: 0.003,
    });

    const loadData = async () => {
        const data = await getPetLocal();
        const balance = await getCoinsLocal();
        const lvl = await getLevelDataLocal();
        setPet(data);
        setCoins(balance);
        setLevelData(lvl);
    };

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Epa! 📍', 'Precisamos do GPS para rastrear sua aventura!');
            return;
        }

        // Se já houver uma assinatura, limpamos antes de começar outra com segurança
        if (locationSubscription.current) {
            try {
                if (typeof locationSubscription.current.remove === 'function') {
                    locationSubscription.current.remove();
                }
            } catch (e) {
                console.warn("Restart cleanup ignored:", e);
            }
        }

        // RASTREAMENTO EM TEMPO REAL (Watch)
        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 2000, // Atualiza a cada 2 segundos
                distanceInterval: 5, // Ou a cada 5 metros
            },
            (loc) => {
                const newCoords = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                };
                
                // CÁLCULO DE ESTATÍSTICAS DE MOVIMENTO
                if (lastLocation.current) {
                    const delta = calculateDistance(
                        lastLocation.current.latitude, 
                        lastLocation.current.longitude,
                        loc.coords.latitude,
                        loc.coords.longitude
                    );

                    // Só consideramos movimento real acima de 2 metros para evitar "drift" do GPS
                    if (delta > 2) {
                        addDistanceLocal(delta).then(newTotal => setTotalDistance(newTotal));
                        recordVisitLocal(loc.coords.latitude, loc.coords.longitude).then(count => {
                            setVisitCount(count);
                        });
                        savePathPointLocal(loc.coords.latitude, loc.coords.longitude);
                    }
                }

                lastLocation.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setLocation(newCoords);
                
                if (spawns.length === 0) {
                    spawnCoinsNear(loc.coords.latitude, loc.coords.longitude);
                }
            }
        );
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            startTracking();

            return () => {
                if (locationSubscription.current) {
                    try {
                        // Verificamos se a função de remover existe e tentamos limpar com segurança
                        if (typeof locationSubscription.current.remove === 'function') {
                            locationSubscription.current.remove();
                        }
                    } catch (e) {
                        console.warn("Location cleanup ignored:", e);
                    }
                    locationSubscription.current = null;
                }
            };
        }, [spawns.length === 0])
    );

    const spawnCoinsNear = (lat: number, lon: number) => {
        const newSpawns: CoinSpawn[] = [];
        for (let i = 0; i < 5; i++) {
            newSpawns.push({
                id: Math.random().toString(),
                latitude: lat + (Math.random() - 0.5) * 0.002,
                longitude: lon + (Math.random() - 0.5) * 0.002,
            });
        }
        setSpawns(newSpawns);
    };

    const collectCoin = async (coinId: string, reward: number) => {
        setSpawns(prev => prev.filter(c => c.id !== coinId));
        const newTotal = coins + reward;
        setCoins(newTotal);
        await saveCoinsLocal(newTotal);

        if (particleRef.current) {
            particleRef.current.burst(width / 2, height / 2, 'star');
        }

        const result = await addXPLocal(15);
        setLevelData({ xp: result.xp, level: result.level });
        if (result.leveledUp) {
            Alert.alert('LEVEL UP! 🚀✨', `Seu pet subiu para o nível ${result.level}!`);
            loadData();
        }
    };

    const handlePetTap = () => {
        if (particleRef.current) {
            particleRef.current.burst(width / 2, height / 2, 'heart');
        }
    };

    const nextLevelXP = levelData.level * 200;

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            
            <MapViewProvider 
                region={location}
                onPress={(coord) => setLocation({ ...location, ...coord })}
            >
                {/* Moedas Geográficas */}
                {spawns.map(coin => (
                    <MapMarker 
                        key={coin.id}
                        coordinate={{ latitude: coin.latitude, longitude: coin.longitude }}
                        onPress={() => collectCoin(coin.id, 10)}
                    >
                        <View style={[styles.coinMarker, { backgroundColor: isDarkMode ? '#2D2D2D' : 'white', borderColor: colors.primary }]}>
                            <FontAwesome5 name="coins" size={22} color="#FFD700" />
                            <View style={[styles.coinGlow, { backgroundColor: colors.primary }]} />
                        </View>
                    </MapMarker>
                ))}

                {/* Marcador do Usuário/Pet (RASTREAMENTO REAL) */}
                <MapMarker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
                    <View style={styles.petMarker}>
                        {pet && (
                            <PetPreview 
                                species={pet.species} 
                                accessory={pet.accessory} 
                                name={pet.name}
                                size={75}
                                onPress={handlePetTap}
                            />
                        )}
                        <View style={[styles.petAura, { backgroundColor: colors.primary }]} />
                    </View>
                </MapMarker>
            </MapViewProvider>

            <ParticleSystem ref={particleRef} />

            <SafeAreaView style={styles.uiOverlay} pointerEvents="box-none">
                <View style={styles.topBar}>
                    <View style={styles.hudContainer}>
                        <View style={[styles.mainBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.badgeSection}>
                                <FontAwesome5 name="coins" size={14} color="#FFD700" />
                                <Text style={[styles.badgeText, { color: colors.text }]}>{coins}</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <View style={[styles.levelSection, { backgroundColor: colors.primary }]}>
                                <Text style={[styles.badgeText, { color: isDarkMode ? '#1A1A1A' : 'white' }]}>Lvl {levelData.level}</Text>
                            </View>
                        </View>
                        
                        <View style={[styles.locationBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                           <MaterialCommunityIcons name="broadcast" size={12} color="#4CAF50" />
                           <Text numberOfLines={1} style={[styles.locationText, { color: colors.subtext }]}>RASTREAMENTO ATIVO</Text>
                        </View>
                    </View>

                    <View style={styles.xpProgressContainer}>
                        <View style={[styles.xpProgressBarBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                            <View style={[styles.xpProgressBarFill, { width: `${(levelData.xp / nextLevelXP) * 100}%`, backgroundColor: colors.primary }]} />
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    uiOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    topBar: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 10 : 15 },
    hudContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mainBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, borderWidth: 2, overflow: 'hidden', elevation: 4 },
    badgeSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, gap: 8 },
    divider: { width: 2, height: '100%' },
    levelSection: { paddingHorizontal: 15, paddingVertical: 8, justifyContent: 'center' },
    badgeText: { fontSize: 13, fontWeight: '900' },
    locationBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingVertical: 8, paddingHorizontal: 15, borderWidth: 2, gap: 5 },
    locationText: { fontSize: 10, fontWeight: '800' },
    xpProgressContainer: { marginTop: 10, width: '60%' },
    xpProgressBarBg: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
    xpProgressBarFill: { height: '100%' },
    coinMarker: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 3, elevation: 8 },
    coinGlow: { position: 'absolute', width: 50, height: 50, borderRadius: 25, opacity: 0.2, zIndex: -1 },
    petMarker: { alignItems: 'center', justifyContent: 'center' },
    petAura: { position: 'absolute', bottom: 5, width: 80, height: 20, borderRadius: 40, opacity: 0.15, transform: [{ scaleY: 0.5 }], zIndex: -1 },
});