import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
    Alert,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
    Dimensions,
} from 'react-native';
import { getPetLocal, signInLocal, signUpLocal } from '../localDatabase';
import { AuthService } from '../services/AuthService';
import { NotificationService } from '../services/NotificationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ─── Design Tokens ─── (alinhados com ThemeContext DarkTheme)
const C = {
    bg: '#0D0D14',
    card: '#18181F',
    border: '#26263A',
    text: '#EEEDF2',
    subtext: '#6E6E8A',
    primary: '#9B6BF7',
    primaryGlow: '#7C3AED',
    primaryDim: '#2D2440',
    accent: '#C084FC',
    success: '#34D399',
    error: '#F87171',
    inputBg: '#131318',
    white: '#FFFFFF',
    dot: '#9B6BF7',
};

// ─── Animated Gradient Orb ───
function GlowOrb({ color, size, style }: { color: string; size: number; style?: any }) {
    const pulse = useRef(new Animated.Value(0.6)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.6, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: pulse,
            }, style]}
        />
    );
}

// ─── Logo Mark ───
function LogoMark({ scale }: { scale: Animated.Value }) {
    return (
        <Animated.View style={[styles.logo, { transform: [{ scale }] }]}>
            <View style={styles.logoIconWrapper}>
                <Ionicons name="paw" size={32} color={C.white} />
            </View>
        </Animated.View>
    );
}

// ─── Premium Input ───
interface InputProps {
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
    value: string;
    onChangeText: (t: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: any;
    autoCapitalize?: any;
    label?: string;
}
function PremiumInput({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, label }: InputProps) {
    const [focused, setFocused] = useState(false);
    const [secureVisible, setSecureVisible] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    const onFocus = () => {
        setFocused(true);
        Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    };
    const onBlur = () => {
        setFocused(false);
        Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    };

    const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });

    return (
        <View style={{ marginBottom: 12 }}>
            {label && <Text style={styles.inputLabel}>{label}</Text>}
            <Animated.View style={[styles.inputContainer, { borderColor }]}>
                <Ionicons name={icon} size={18} color={focused ? C.primary : C.subtext} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={C.subtext}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry && !secureVisible}
                    keyboardType={keyboardType || 'default'}
                    autoCapitalize={autoCapitalize || 'none'}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
                {secureTextEntry && (
                    <Pressable onPress={() => setSecureVisible(v => !v)} style={styles.eyeBtn}>
                        <Ionicons name={secureVisible ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.subtext} />
                    </Pressable>
                )}
            </Animated.View>
        </View>
    );
}

// ─── Tab Switch ───
function TabSwitch({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
    const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
    const prevActive = useRef(active);
    useEffect(() => {
        if (prevActive.current !== active) {
            Animated.spring(anim, { toValue: active ? 1 : 0, useNativeDriver: false, tension: 280, friction: 22 }).start();
            prevActive.current = active;
        }
    }, [active]);

    const sliderLeft = anim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '50%'] });
    const sliderWidth = '48%';

    return (
        <View style={styles.tabSwitch}>
            <Animated.View style={[styles.tabSlider, { left: sliderLeft, width: sliderWidth }]} />
            <Pressable style={styles.tabBtn} onPress={() => onChange(false)}>
                <Text style={[styles.tabBtnText, !active && styles.tabBtnTextActive]}>Entrar</Text>
            </Pressable>
            <Pressable style={styles.tabBtn} onPress={() => onChange(true)}>
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>Cadastrar</Text>
            </Pressable>
        </View>
    );
}

// ─── Main Button ───
function PremiumButton({ label, onPress, loading, variant = 'primary' }: { label: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'ghost' | 'danger' }) {
    const scale = useRef(new Animated.Value(1)).current;

    const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 20 }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

    const bgColor = variant === 'primary' ? C.primary : variant === 'danger' ? C.error : 'transparent';
    const textColor = variant === 'ghost' ? C.subtext : C.white;
    const borderColor = variant === 'ghost' ? C.border : 'transparent';

    return (
        <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
            <Animated.View style={[styles.mainBtn, { backgroundColor: bgColor, borderColor, transform: [{ scale }] }]}>
                {loading ? (
                    <ActivityDots />
                ) : (
                    <Text style={[styles.mainBtnText, { color: textColor }]}>{label}</Text>
                )}
            </Animated.View>
        </Pressable>
    );
}

function ActivityDots() {
    const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    useEffect(() => {
        dots.forEach((d, i) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 150),
                    Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay(600 - i * 150),
                ])
            ).start();
        });
    }, []);
    return (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {dots.map((d, i) => (
                <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.white, opacity: d }} />
            ))}
        </View>
    );
}

// ─── Main Screen ───
export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('Qual o nome do seu primeiro pet?');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // — entry animation
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(40)).current;
    const logoScale = useRef(new Animated.Value(0.7)).current;

    // — form height animation
    const formHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
            Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        Animated.spring(formHeight, {
            toValue: isRegistering ? 1 : 0,
            tension: 100,
            friction: 16,
            useNativeDriver: false,
        }).start();
    }, [isRegistering]);

    const extraHeight = formHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

    const handleAuth = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }
        setLoading(true);
        try {
            if (isRegistering) {
                if (!securityAnswer) {
                    throw new Error('Preencha a resposta de segurança.');
                }
                await AuthService.signUp(email.trim(), password, securityQuestion, securityAnswer, '');
                Alert.alert(
                    'Conta Criada! 🎉',
                    'Sua conta foi criada com sucesso!\n\nVerifique sua caixa de entrada (ou Spam) para confirmar seu e-mail antes de fazer o login.',
                    [{ text: 'OK', onPress: () => {
                        setIsRegistering(false);
                        setEmail('');
                        setPassword('');
                        setSecurityAnswer('');
                    }}]
                );
            } else {
                const authUser = await AuthService.signIn(email.trim(), password);

                // Salva o usuário localmente com dados base
                const localUser: any = {
                    id: authUser.id,
                    email: email.trim(),
                    password: '',
                    securityQuestion: '',
                    securityAnswer: '',
                    twoFactorPin: '',
                    wanderId: '',
                    name: email.split('@')[0],
                };
                await AsyncStorage.setItem('@wanderpet_current_user', JSON.stringify(localUser));

                // Sincroniza dados completos da nuvem
                try {
                    const fullData = await AuthService.fetchFullUserData(authUser.id);
                    if (fullData) {
                        if (fullData.profile) {
                            const p = fullData.profile;
                            const enriched = { ...localUser, wanderId: p.wander_id || '', name: p.name || localUser.name };
                            await AsyncStorage.setItem('@wanderpet_current_user', JSON.stringify(enriched));
                            await AsyncStorage.multiSet([
                                ['@wanderpet_coins', (p.coins || 150).toString()],
                                ['@wanderpet_gems', (p.gems || 150).toString()],
                                ['@wanderpet_xp', (p.xp || 0).toString()],
                                ['@wanderpet_level', (p.level || 1).toString()],
                                ['@wanderpet_quests_claimed', JSON.stringify(p.claimed_quests || [])],
                            ]);
                        }
                        if (fullData.pet) {
                            await AsyncStorage.setItem('@wanderpet_pet', JSON.stringify({
                                name: fullData.pet.name,
                                species: fullData.pet.species,
                                accessory: fullData.pet.accessory,
                                personality: fullData.pet.personality,
                                customImageUri: fullData.pet.custom_image_url,
                            }));
                        }
                    }
                } catch (syncErr) {
                    console.warn('Aviso: falha ao sincronizar dados da nuvem. Prosseguindo offline.', syncErr);
                }

                // Push Token (opcional)
                try {
                    const { granted } = await NotificationService.requestPermissions();
                    if (granted) {
                        const token = await NotificationService.getPushTokenAsync();
                        if (token) await AuthService.updatePushToken(authUser.id, token);
                    }
                } catch (_) {}

                const pet = await getPetLocal();
                if (!pet) {
                    router.replace('/(onboarding)/create-character');
                } else {
                    router.replace('/(tabs)');
                }
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao autenticar.');
        } finally {
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setLoading(true);
        try {
            let user;
            try { user = await signInLocal('dev@wanderpet.com', 'dev123'); }
            catch (e) { user = await signUpLocal('dev@wanderpet.com', 'dev123', 'Dev?', 'Yes', ''); }
            await AsyncStorage.setItem('@wanderpet_current_user', JSON.stringify(user));
            const pet = await getPetLocal();
            if (!pet) {
                await AsyncStorage.setItem('@wanderpet_pet', JSON.stringify({ name: 'DevBunny', species: 'bunny', accessory: 'none', personality: 'Happy' }));
            }
            router.replace('/(tabs)');
            try {
                const { granted } = await NotificationService.requestPermissions();
                if (granted) {
                    const token = await NotificationService.getPushTokenAsync();
                    if (token) await AuthService.updatePushToken(user.id, token);
                }
            } catch (pushErr) {}
        } catch (error: any) {
            Alert.alert('Erro Dev', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSeedBots = async () => {
        setLoading(true);
        try {
            const result = await AuthService.seedMockBots();
            Alert.alert(result.success ? 'Bots criados! 🤖' : 'Erro', result.success ? 'Luna, Rex e Miau foram populados no Supabase.' : result.message || 'Falha.');
        } catch (e: any) {
            Alert.alert('Falha', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />

            {/* Background orbs */}
            <GlowOrb color="#4C1D95" size={320} style={{ top: -80, left: -60, opacity: 0.35 }} />
            <GlowOrb color="#1E1B4B" size={260} style={{ bottom: 40, right: -80, opacity: 0.5 }} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

                        {/* Logo */}
                        <View style={styles.logoSection}>
                            <LogoMark scale={logoScale} />
                            <Text style={styles.appName}>WanderPet</Text>
                            <Text style={styles.tagline}>Explore. Conecte. Evolua.</Text>
                        </View>

                        {/* Card */}
                        <View style={styles.card}>
                            <TabSwitch active={isRegistering} onChange={setIsRegistering} />

                            <View style={{ marginTop: 24 }}>
                                <PremiumInput
                                    icon="mail-outline"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    label="E-mail"
                                />
                                <PremiumInput
                                    icon="lock-closed-outline"
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    label="Senha"
                                />

                                {/* Extra fields for register */}
                                <Animated.View style={{ overflow: 'hidden', maxHeight: extraHeight }}>
                                    <PremiumInput
                                        icon="help-circle-outline"
                                        placeholder="Qual o nome do seu primeiro pet?"
                                        value={securityQuestion}
                                        onChangeText={setSecurityQuestion}
                                        label="Pergunta de Segurança"
                                    />
                                    <PremiumInput
                                        icon="chatbubble-outline"
                                        placeholder="Sua resposta..."
                                        value={securityAnswer}
                                        onChangeText={setSecurityAnswer}
                                        label="Resposta"
                                    />
                                </Animated.View>

                                {!isRegistering && (
                                    <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotWrapper}>
                                        <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={{ marginTop: 8, gap: 10 }}>
                                <PremiumButton
                                    label={isRegistering ? 'Criar Conta' : 'Entrar'}
                                    onPress={handleAuth}
                                    loading={loading}
                                />
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>DEV</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Dev Tools */}
                        <View style={styles.devSection}>
                            <Pressable style={styles.devBtn} onPress={handleDevLogin}>
                                <Ionicons name="flash-outline" size={16} color={C.primary} />
                                <Text style={styles.devBtnText}>Acesso Rápido Dev</Text>
                            </Pressable>
                            <Pressable style={styles.devBtn} onPress={handleSeedBots}>
                                <Ionicons name="hardware-chip-outline" size={16} color={C.primary} />
                                <Text style={styles.devBtnText}>Criar Bots no Supabase</Text>
                            </Pressable>
                            <Pressable
                                onPress={async () => { await AsyncStorage.clear(); Alert.alert('Reset', 'Banco local limpo.'); }}
                                style={[styles.devBtn, { borderColor: '#F8717122' }]}
                            >
                                <Ionicons name="trash-outline" size={16} color={C.error} />
                                <Text style={[styles.devBtnText, { color: C.error }]}>Limpar Banco Local</Text>
                            </Pressable>
                        </View>

                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        paddingTop: 60,
        paddingBottom: 48,
    },
    content: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
    },

    // ─── Logo ───
    logoSection: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logo: {
        marginBottom: 16,
    },
    logoIconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: C.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    appName: {
        fontSize: 30,
        fontWeight: '800',
        color: C.text,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 14,
        color: C.subtext,
        marginTop: 4,
        letterSpacing: 0.5,
    },

    // ─── Card ───
    card: {
        backgroundColor: C.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: C.border,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
        elevation: 16,
    },

    // ─── Tab Switch ───
    tabSwitch: {
        flexDirection: 'row',
        backgroundColor: C.inputBg,
        borderRadius: 14,
        padding: 4,
        position: 'relative',
        height: 46,
        borderWidth: 1,
        borderColor: C.border,
    },
    tabSlider: {
        position: 'absolute',
        top: 4,
        height: 38,
        backgroundColor: C.primary,
        borderRadius: 10,
        zIndex: 0,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    tabBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: C.subtext,
    },
    tabBtnTextActive: {
        color: C.white,
    },

    // ─── Input ───
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: C.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.inputBg,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: C.text,
        height: '100%',
    },
    eyeBtn: {
        padding: 4,
    },

    // ─── Forgot ───
    forgotWrapper: {
        alignItems: 'flex-end',
        marginTop: 4,
        marginBottom: 4,
    },
    forgotText: {
        fontSize: 13,
        color: C.primary,
        fontWeight: '600',
    },

    // ─── Button ───
    mainBtn: {
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    mainBtnText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // ─── Divider ───
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.border,
    },
    dividerText: {
        fontSize: 11,
        fontWeight: '700',
        color: C.subtext,
        letterSpacing: 2,
    },

    // ─── Dev Section ───
    devSection: {
        gap: 8,
    },
    devBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 14,
        paddingHorizontal: 18,
    },
    devBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: C.primary,
    },
});
