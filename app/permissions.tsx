import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { NotificationService } from '../services/NotificationService';
import { useTheme } from '../components/ThemeContext';

const PERMISSIONS_KEY = '@wanderpet_permissions_done';

type PermStep = 'intro' | 'location' | 'notifications' | 'done';

export default function PermissionsScreen() {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    const [step, setStep] = useState<PermStep>('intro');
    const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
    const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

    // Animations
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(40)).current;
    const iconScale = useRef(new Animated.Value(0.5)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        animateIn();
    }, [step]);

    const animateIn = () => {
        fadeIn.setValue(0);
        slideUp.setValue(40);
        iconScale.setValue(0.5);
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
            Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
            Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();
    };

    const animateProgress = (toPercent: number) => {
        Animated.timing(progressWidth, { toValue: toPercent, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    };

    const handleStart = () => {
        setStep('location');
        animateProgress(33);
    };

    const handleLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationGranted(status === 'granted');
        } catch (e) {
            setLocationGranted(false);
        }
        setStep('notifications');
        animateProgress(66);
    };

    const handleNotificationPermission = async () => {
        try {
            const result = await NotificationService.requestPermissions();
            setNotifGranted(result.granted);
        } catch (e) {
            setNotifGranted(false);
        }
        setStep('done');
        animateProgress(100);
    };

    const handleFinish = async () => {
        await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
        router.replace('/(tabs)');
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
        router.replace('/(tabs)');
    };

    const stepConfig = {
        intro: {
            icon: 'paw' as const,
            iconColor: colors.primary,
            iconBg: colors.primary + '15',
            iconBorder: colors.primary + '30',
            title: 'Bem-vindo ao WanderPet!',
            subtitle: 'Precisamos de algumas permissões para que seu companheiro possa acompanhar suas aventuras.',
            buttonLabel: 'Começar',
            onPress: handleStart,
        },
        location: {
            icon: 'location' as const,
            iconColor: '#60A5FA',
            iconBg: '#60A5FA15',
            iconBorder: '#60A5FA30',
            title: 'Localização',
            subtitle: 'Usamos sua localização para rastrear expedições, calcular distância percorrida e mostrar seu pet no mapa.',
            buttonLabel: 'Permitir Localização',
            onPress: handleLocationPermission,
        },
        notifications: {
            icon: 'notifications' as const,
            iconColor: '#F59E0B',
            iconBg: '#F59E0B15',
            iconBorder: '#F59E0B30',
            title: 'Notificações',
            subtitle: 'Enviaremos alertas sobre missões, recompensas e quando seu pet precisar de atenção.',
            buttonLabel: 'Permitir Notificações',
            onPress: handleNotificationPermission,
        },
        done: {
            icon: 'checkmark-circle' as const,
            iconColor: '#34D399',
            iconBg: '#34D39915',
            iconBorder: '#34D39930',
            title: 'Tudo pronto!',
            subtitle: locationGranted && notifGranted
                ? 'Todas as permissões foram concedidas. Seu pet está preparado para a aventura!'
                : 'Você pode alterar as permissões a qualquer momento nas configurações do dispositivo.',
            buttonLabel: 'Entrar no WanderPet',
            onPress: handleFinish,
        },
    };

    const config = stepConfig[step];

    const progressPercent = progressWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#ffffff0D' : '#0000000A' }]}>
                    <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary, width: progressPercent }]} />
                </View>
                {step !== 'intro' && (
                    <Pressable onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={[styles.skipText, { color: colors.subtext }]}>Pular</Text>
                    </Pressable>
                )}
            </View>

            {/* Content */}
            <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
                {/* Icon */}
                <Animated.View style={[
                    styles.iconContainer,
                    {
                        backgroundColor: config.iconBg,
                        borderColor: config.iconBorder,
                        transform: [{ scale: iconScale }],
                    }
                ]}>
                    <Ionicons name={config.icon} size={48} color={config.iconColor} />
                </Animated.View>

                {/* Text */}
                <Text style={[styles.title, { color: colors.text }]}>{config.title}</Text>
                <Text style={[styles.subtitle, { color: colors.subtext }]}>{config.subtitle}</Text>

                {/* Permission status badges */}
                {step === 'done' && (
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: locationGranted ? '#34D39912' : '#EF444412' }]}>
                            <Ionicons
                                name={locationGranted ? 'checkmark-circle' : 'close-circle'}
                                size={18}
                                color={locationGranted ? '#34D399' : '#EF4444'}
                            />
                            <Text style={[styles.statusText, { color: locationGranted ? '#34D399' : '#EF4444' }]}>
                                Localização {locationGranted ? 'ativa' : 'negada'}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: notifGranted ? '#34D39912' : '#EF444412' }]}>
                            <Ionicons
                                name={notifGranted ? 'checkmark-circle' : 'close-circle'}
                                size={18}
                                color={notifGranted ? '#34D399' : '#EF4444'}
                            />
                            <Text style={[styles.statusText, { color: notifGranted ? '#34D399' : '#EF4444' }]}>
                                Notificações {notifGranted ? 'ativas' : 'negadas'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Features list (intro only) */}
                {step === 'intro' && (
                    <View style={styles.featuresList}>
                        {[
                            { icon: 'location', color: '#60A5FA', label: 'Rastrear suas expedições' },
                            { icon: 'notifications', color: '#F59E0B', label: 'Receber alertas do pet' },
                        ].map((feat, i) => (
                            <View key={i} style={[styles.featureItem, { backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A' }]}>
                                <View style={[styles.featureIcon, { backgroundColor: feat.color + '15' }]}>
                                    <Ionicons name={feat.icon as any} size={18} color={feat.color} />
                                </View>
                                <Text style={[styles.featureLabel, { color: colors.text }]}>{feat.label}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </Animated.View>

            {/* Bottom button */}
            <View style={styles.bottomSection}>
                <Pressable
                    style={[styles.primaryBtn, { backgroundColor: config.iconColor }]}
                    onPress={config.onPress}
                >
                    <Ionicons name={config.icon} size={20} color="#FFF" />
                    <Text style={styles.primaryBtnText}>{config.buttonLabel}</Text>
                </Pressable>

                {step === 'intro' && (
                    <Text style={[styles.disclaimer, { color: colors.subtext }]}>
                        Seus dados ficam no dispositivo. Nenhuma informação é compartilhada sem seu consentimento.
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Progress
    progressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, gap: 12 },
    progressBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    skipBtn: { paddingVertical: 4, paddingHorizontal: 8 },
    skipText: { fontSize: 13, fontWeight: '600' },

    // Content
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22, opacity: 0.7 },

    // Status badges
    statusContainer: { marginTop: 28, gap: 10, width: '100%' },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 14,
    },
    statusText: { fontSize: 14, fontWeight: '700' },

    // Features list
    featuresList: { marginTop: 32, gap: 10, width: '100%' },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureLabel: { fontSize: 14, fontWeight: '600' },

    // Bottom
    bottomSection: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
    primaryBtn: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    disclaimer: { fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 16, opacity: 0.5 },
});
