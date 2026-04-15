import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    Vibration,
    StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, ZoomIn, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { finalizeLoginLocal, getPetLocal } from '../localDatabase';
import { AuthService } from '../services/AuthService';
import { TapSparkles } from '../components/TapSparkles';

const C = {
    sky: '#D4ECFF',
    grass: '#7DBF72',
    card: '#FFFDF7',
    cardBorder: '#EAD9C8',
    text: '#5C4033',
    textLight: '#9B7B6A',
    primary: '#7BBF72',
    peach: '#FFDAC1',
    white: '#FFFFFF',
};

export default function TwoFactorScreen() {
    const { height } = useWindowDimensions();
    const router = useRouter();
    const { uid, email } = useLocalSearchParams<{ uid: string, email: string }>();
    const [pin, setPin] = useState('');
    const [sparksActive, setSparksActive] = useState(false);
    const shakeX = useSharedValue(0);

    const handleNumber = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
        }
    };

    const handleClear = () => setPin('');

    const shake = () => {
        shakeX.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-7, { duration: 50 }), withTiming(7, { duration: 50 }), withTiming(0, { duration: 50 }));
        Vibration.vibrate(100);
    };

    const handleConfirm = async () => {
        if (pin.length < 4) {
            shake();
            return;
        }

        try {
            // Buscamos o perfil do usuário no SUPABASE real
            const userProfile = await AuthService.getUserProfile(uid);

            if (userProfile && userProfile.twoFactorPin === pin) {
                // Sincronizar dados da nuvem para o local antes de entrar
                try {
                    const fullData = await AuthService.fetchFullUserData(uid);
                    if (fullData) {
                        // Salvar perfil local
                        await finalizeLoginLocal(userProfile as any);
                        
                        // Sincronizar Moedas/XP/Missões se existirem na nuvem
                        if (fullData.profile) {
                            const { coins, gems, xp, level, claimed_quests } = fullData.profile;
                            await AsyncStorage.multiSet([
                                ['@wanderpet_coins', (coins || 150).toString()],
                                ['@wanderpet_gems', (gems || 150).toString()],
                                ['@wanderpet_xp', (xp || 0).toString()],
                                ['@wanderpet_level', (level || 1).toString()],
                                ['@wanderpet_quests_claimed', JSON.stringify(claimed_quests || [])]
                            ]);
                        }
                        
                        // Sincronizar Pet
                        if (fullData.pet) {
                            await AsyncStorage.setItem('@wanderpet_pet', JSON.stringify({
                                name: fullData.pet.name,
                                species: fullData.pet.species,
                                accessory: fullData.pet.accessory,
                                personality: fullData.pet.personality,
                                customImageUri: fullData.pet.custom_image_url
                            }));
                        }
                    } else {
                        await finalizeLoginLocal(userProfile as any);
                    }
                } catch (err) {
                    console.error("Erro ao sincronizar dados na entrada:", err);
                    await finalizeLoginLocal(userProfile as any);
                }

                const pet = await getPetLocal();
                if (!pet) {
                    router.replace('/(onboarding)/create-character');
                } else {
                    router.replace('/(tabs)');
                }
            } else {
                shake();
                setPin('');
            }
        } catch (e) {
            Alert.alert('Erro', 'Ocorreu um problema na verificação real do PIN.');
        }
    };

    const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

    const NumBtn = ({ n }: { n: string }) => (
        <Pressable 
            style={({ pressed }) => [styles.numBtn, pressed && { backgroundColor: '#E0DBCC' }]} 
            onPress={() => handleNumber(n)}
        >
            <Text style={styles.numText}>{n}</Text>
        </Pressable>
    );

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />
            
            <View style={[styles.sky, { height: height * 0.5 }]} />
            <View style={styles.grassContainer} />

            <Animated.View entering={FadeIn} style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.leafRow}><Text style={styles.appName}>WanderPet</Text></View>
                    <Text style={styles.title}>Verificação 2FA</Text>
                    <Text style={styles.subtitle}>Digite seu PIN de 4 dígitos para entrar.</Text>

                    <Animated.View style={[styles.pinDisplay, animStyle]}>
                        {[...Array(4)].map((_, i) => (
                            <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
                        ))}
                    </Animated.View>

                    <View style={styles.keypad}>
                        <View style={styles.row}>
                            <NumBtn n="1" /><NumBtn n="2" /><NumBtn n="3" />
                        </View>
                        <View style={styles.row}>
                            <NumBtn n="4" /><NumBtn n="5" /><NumBtn n="6" />
                        </View>
                        <View style={styles.row}>
                            <NumBtn n="7" /><NumBtn n="8" /><NumBtn n="9" />
                        </View>
                        <View style={styles.row}>
                            <Pressable style={styles.numBtn} onPress={handleClear}>
                                <Text style={[styles.numText, { fontSize: 13, textTransform: 'uppercase' }]}>Limpar</Text>
                            </Pressable>
                            <NumBtn n="0" />
                            <Pressable 
                                style={({ pressed }) => [styles.numBtn, { backgroundColor: C.primary }, pressed && { backgroundColor: '#5FA855' }]} 
                                onPress={() => {
                                    setSparksActive(true);
                                    setTimeout(() => setSparksActive(false), 50);
                                    handleConfirm();
                                }}
                            >
                                <TapSparkles active={sparksActive} color={C.white} />
                                <Text style={[styles.numText, { color: 'white', fontSize: 16 }]}>OK</Text>
                            </Pressable>
                        </View>
                    </View>

                    <Pressable style={styles.cancelBtn} onPress={() => router.replace('/login')}>
                        <Text style={styles.cancelText}>Voltar para o Login</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.sky },
    sky: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.sky },
    grassContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: C.grass, borderTopLeftRadius: 60, borderTopRightRadius: 60 },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 350, backgroundColor: C.card, borderRadius: 32, padding: 30, borderWidth: 3, borderColor: C.cardBorder, elevation: 10, alignItems: 'center' },
    leafRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    leafEmoji: { fontSize: 14 },
    appName: { fontSize: 10, fontWeight: '800', color: C.primary, textTransform: 'uppercase', letterSpacing: 3 },
    title: { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 8 },
    subtitle: { fontSize: 13, color: C.textLight, textAlign: 'center', marginBottom: 25 },
    pinDisplay: { flexDirection: 'row', gap: 15, marginBottom: 30 },
    pinDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#D4C2A8', backgroundColor: 'white' },
    pinDotFilled: { backgroundColor: C.primary, borderColor: C.primary },
    keypad: { width: '100%', gap: 10 },
    row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
    numBtn: { width: 75, height: 75, backgroundColor: '#F0EBE0', borderRadius: 37.5, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    numText: { fontSize: 24, fontWeight: '900', color: C.text },
    cancelBtn: { marginTop: 25 },
    cancelText: { fontSize: 14, fontWeight: '700', color: C.textLight, textDecorationLine: 'underline' },
});
