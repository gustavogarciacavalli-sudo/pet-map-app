import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
    SharedValue,
    ZoomIn
} from 'react-native-reanimated';
import { signInLocal, signUpLocal, getPetLocal } from '../localDatabase';
import { TapSparkles } from '../components/TapSparkles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Interfaces ───
interface DecoRect {
    top: number;
    color: string;
    left?: number;
    right?: number;
}

// ─── Paleta de Cores ───
const C = {
    sky: '#D4ECFF',
    skyDeep: '#A8D4F5',
    grass: '#7DBF72',
    grassDark: '#5FA855',
    mint: '#B5EAD7',
    mintDark: '#7DD4B5',
    lavender: '#C7CEEA',
    lavenderDark: '#9AA5D4',
    peach: '#FFDAC1',
    pink: '#F9C6CF',
    pinkDark: '#F097AA',
    yellow: '#FFF0A0',
    card: '#FFFDF7',
    cardBorder: '#EAD9C8',
    cardShadow: '#D4C2A8',
    text: '#5C4033',
    textLight: '#9B7B6A',
    sage: '#8BA888',
    wood: '#7B5C3E',
    inputBg: '#F5F2E8',
    inputBorder: '#E0D9C8',
    white: '#FFFFFF',
};

// ─── Sub-Componentes ───

const CloudDecor = ({ style }: { style?: ViewStyle }) => (
    <View style={[styles.cloud, style]}>
        <View style={styles.cloudBubble1} />
        <View style={styles.cloudBubble2} />
    </View>
);

const FloatStar = ({ x, y, color, delay }: { x: string | number; y: string | number; color: string; delay: number }) => {
    const op = useSharedValue(0.4);
    const scale = useSharedValue(1);

    useEffect(() => {
        op.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })), -1, false));
        scale.value = withDelay(delay, withRepeat(withSequence(withTiming(1.4, { duration: 800 }), withTiming(1, { duration: 800 })), -1, false));
    }, [delay, op, scale]);

    const styleAnim = useAnimatedStyle(() => ({
        opacity: op.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[{
            position: 'absolute', left: x as any, top: y as any,
            width: 8, height: 8, borderRadius: 4, backgroundColor: color,
        }, styleAnim]} />
    );
};

const BunnyPet = ({ translateY }: { translateY: SharedValue<number> }) => {
    const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    return (
        <Animated.View style={[styles.petLeft, animStyle]}>
            <View style={styles.petHead}>
                <View style={[styles.ear, styles.earLeft, { backgroundColor: '#FFD6E8' }]}><View style={[styles.earInner, { backgroundColor: '#FFC2DC' }]} /></View>
                <View style={[styles.ear, styles.earRight, { backgroundColor: '#FFD6E8' }]}><View style={[styles.earInner, { backgroundColor: '#FFC2DC' }]} /></View>
                <View style={styles.headCircle}>
                    <View style={styles.eyesRow}>
                        <View style={styles.eyeOuter}><View style={styles.eyeInner} /><View style={styles.eyeShine} /></View>
                        <View style={styles.eyeOuter}><View style={styles.eyeInner} /><View style={styles.eyeShine} /></View>
                    </View>
                    <View style={styles.blushRow}><View style={[styles.blush, { backgroundColor: '#FFB0C8' }]} /><View style={[styles.blush, { backgroundColor: '#FFB0C8' }]} /></View>
                    <View style={styles.nose} />
                </View>
                <View style={styles.pawsRow}>
                    <View style={[styles.paw, { backgroundColor: '#FFF0F5', borderColor: '#F0C0D8' }]}><View style={[styles.pawToe, { backgroundColor: '#FFE0EE' }]} /><View style={[styles.pawToe, { backgroundColor: '#FFE0EE' }]} /></View>
                    <View style={[styles.paw, { backgroundColor: '#FFF0F5', borderColor: '#F0C0D8' }]}><View style={[styles.pawToe, { backgroundColor: '#FFE0EE' }]} /><View style={[styles.pawToe, { backgroundColor: '#FFE0EE' }]} /></View>
                </View>
            </View>
        </Animated.View>
    );
};

const PuppyPet = ({ translateY }: { translateY: SharedValue<number> }) => {
    const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    return (
        <Animated.View style={[styles.petRight, animStyle]}>
            <View style={styles.petHead}>
                <View style={[styles.flopEar, styles.flopEarLeft, { backgroundColor: '#DEB887', borderColor: '#C8A060' }]}><View style={[styles.flopEarInner, { backgroundColor: '#CC9050' }]} /></View>
                <View style={[styles.flopEar, styles.flopEarRight, { backgroundColor: '#DEB887', borderColor: '#C8A060' }]}><View style={[styles.flopEarInner, { backgroundColor: '#CC9050' }]} /></View>
                <View style={[styles.headCircle, { backgroundColor: '#FAEBD7', borderColor: '#D4B896' }]}>
                    <View style={styles.puppySpot} />
                    <View style={styles.eyesRow}>
                        <View style={styles.eyeOuter}><View style={[styles.eyeInner, { backgroundColor: '#2A1A0A' }]} /><View style={styles.eyeShine} /></View>
                        <View style={styles.eyeOuter}><View style={[styles.eyeInner, { backgroundColor: '#2A1A0A' }]} /><View style={styles.eyeShine} /></View>
                    </View>
                    <View style={styles.blushRow}><View style={[styles.blush, { backgroundColor: '#FFCCAA' }]} /><View style={[styles.blush, { backgroundColor: '#FFCCAA' }]} /></View>
                    <View style={[styles.nose, { backgroundColor: '#A0522D', width: 14, height: 10, borderRadius: 7 }]} />
                </View>
                <View style={styles.pawsRow}>
                    <View style={[styles.paw, { backgroundColor: '#FAEBD7', borderColor: '#D4B896' }]}><View style={[styles.pawToe, { backgroundColor: '#EDD5B5' }]} /><View style={[styles.pawToe, { backgroundColor: '#EDD5B5' }]} /></View>
                    <View style={[styles.paw, { backgroundColor: '#FAEBD7', borderColor: '#D4B896' }]}><View style={[styles.pawToe, { backgroundColor: '#EDD5B5' }]} /><View style={[styles.pawToe, { backgroundColor: '#EDD5B5' }]} /></View>
                </View>
            </View>
        </Animated.View>
    );
};

// ─── Tela Principal ───

export default function LoginScreen() {
    const { height } = useWindowDimensions();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('Qual o nome do seu primeiro pet?');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [twoFactorPin, setTwoFactorPin] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const cardScale = useSharedValue(1);
    const cardOpacity = useSharedValue(1);
    const bunnyY = useSharedValue(0);
    const puppyY = useSharedValue(0);
    const btnScale = useSharedValue(1);
    const shakeTx = useSharedValue(0);
    const [sparksActive, setSparksActive] = useState(false);

    useEffect(() => {
        bunnyY.value = withRepeat(withSequence(withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })), -1, false);
        puppyY.value = withDelay(600, withRepeat(withSequence(withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })), -1, false));
    }, [bunnyY, puppyY, height]);

    const petsCelebrate = () => {
        bunnyY.value = withSequence(withSpring(-22, { damping: 6 }), withSpring(0, { damping: 10 }));
        puppyY.value = withDelay(120, withSequence(withSpring(-22, { damping: 6 }), withSpring(0, { damping: 10 })));
    };

    const shakeCard = () => {
        shakeTx.value = withSequence(withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(6, { duration: 60 }), withTiming(0, { duration: 60 }));
    };

    const cardStyleAnim = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }, { translateX: shakeTx.value }],
        opacity: cardOpacity.value,
    }));

    const btnStyleAnim = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    const handleAuth = async () => {
        if (!email.trim() || !password) {
            shakeCard();
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }
        setLoading(true);
        try {
            if (isRegistering) {
                if (!securityAnswer || twoFactorPin.length < 4) {
                    throw new Error("Preencha a pergunta de segurança e defina um PIN de 4+ dígitos.");
                }
                await signUpLocal(email.trim(), password, securityQuestion, securityAnswer, twoFactorPin);
                petsCelebrate();
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    setIsRegistering(false);
                    setEmail('');
                    setPassword('');
                    setSecurityAnswer('');
                    setTwoFactorPin('');
                }, 2200);
            } else {
                const user = await signInLocal(email.trim(), password);
                petsCelebrate();
                
                // Em vez de ir pro mapa, vai pra verificação de PIN (2FA)
                router.push({
                    pathname: '/two-factor',
                    params: { email: email.trim() }
                });
            }
        } catch (error: any) {
            shakeCard();
            Alert.alert('Erro', error.message || "Erro ao autenticar.");
        } finally {
            setLoading(false);
        }
    };

    const decoRects: DecoRect[] = [
        { top: 50, left: -12, color: C.mint }, { top: 90, left: -12, color: C.lavender }, { top: 130, left: -12, color: C.peach },
        { top: 50, right: -12, color: C.pink }, { top: 90, right: -12, color: C.yellow }, { top: 130, right: -12, color: C.mint },
    ];

    const stars = [
        { x: '8%', y: '6%', color: C.peach, delay: 0 }, { x: '20%', y: '12%', color: C.lavender, delay: 300 },
        { x: '75%', y: '8%', color: C.mint, delay: 600 }, { x: '88%', y: '15%', color: C.yellow, delay: 900 },
        { x: '50%', y: '4%', color: C.pink, delay: 200 },
    ];

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={C.sky} />
            <View style={[styles.sky, { height: height * 0.6 }]} />
            <View style={[styles.grassBottom, { height: height * 0.22 }]} />
            <View style={[styles.grassTop, { height: height * 0.06 }]} />
            {stars.map((s, i) => <FloatStar key={i} {...s} />)}
            <CloudDecor style={{ top: height * 0.06, left: '5%' }} />
            <CloudDecor style={{ top: height * 0.11, right: '10%', transform: [{ scaleX: 0.75 }] } as ViewStyle} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
                <ScrollView contentContainerStyle={[styles.scroll, { minHeight: height }]} keyboardShouldPersistTaps="handled">
                    <Animated.View style={[styles.cardWrap, cardStyleAnim]}>
                        <BunnyPet translateY={bunnyY} />
                        <PuppyPet translateY={puppyY} />
                        {decoRects.map((r, i) => (
                            <View key={i} style={[styles.decoRect, { top: r.top, left: r.left, right: r.right, backgroundColor: r.color }]} />
                        ))}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.leafRow}><Text style={styles.appName}>WanderPet</Text></View>
                                <Text style={styles.titleText}>{isRegistering ? 'Nova Aventura' : 'Bem-vindo de volta'}</Text>
                            </View>

                            <View style={styles.tabs}>
                                <Pressable style={[styles.tab, !isRegistering && styles.tabActive]} onPress={() => setIsRegistering(false)}><Text style={styles.tabText}>Entrar</Text></Pressable>
                                <Pressable style={[styles.tab, isRegistering && styles.tabActive]} onPress={() => setIsRegistering(true)}><Text style={styles.tabText}>Cadastrar</Text></Pressable>
                            </View>

                            <View style={styles.fields}>
                                <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                                <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
                                
                                {isRegistering && (
                                    <Animated.View entering={ZoomIn.duration(400)} style={{ gap: 12 }}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Pergunta de Segurança:</Text>
                                            <TextInput style={styles.input} value={securityQuestion} onChangeText={setSecurityQuestion} />
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Resposta:</Text>
                                            <TextInput style={styles.input} placeholder="Sua resposta..." value={securityAnswer} onChangeText={setSecurityAnswer} />
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>PIN de 2 Etapas (ex: 1234):</Text>
                                            <TextInput style={styles.input} placeholder="Digite 4 números" value={twoFactorPin} onChangeText={setTwoFactorPin} keyboardType="numeric" maxLength={4} secureTextEntry />
                                        </View>
                                    </Animated.View>
                                )}

                                {!isRegistering && (
                                    <Pressable onPress={() => router.push('/forgot-password')}>
                                        <Text style={styles.forgotText}>Esqueceu a senha?</Text>
                                    </Pressable>
                                )}
                            </View>

                            {showSuccess && (
                                <Animated.View entering={ZoomIn.springify()} style={styles.successOverlay}>
                                    <View style={styles.successBall}>
                                        <Ionicons name="checkmark-circle" size={48} color={C.mint} />
                                        <Text style={styles.successTitle}>Conta criada com sucesso</Text>
                                        <Text style={styles.successSub}>A aventura vai começar!</Text>
                                    </View>
                                </Animated.View>
                            )}

                            <Animated.View style={btnStyleAnim}>
                                <Pressable
                                    onPressIn={() => { 
                                        btnScale.value = withSpring(0.94); 
                                        setSparksActive(false);
                                    }}
                                    onPressOut={() => { btnScale.value = withSpring(1); }}
                                    onPress={() => {
                                        setSparksActive(true);
                                        handleAuth();
                                    }}
                                    style={[styles.mainBtn, { backgroundColor: isRegistering ? C.mint : C.lavender }]}
                                >
                                    <TapSparkles active={sparksActive} />
                                    <Text style={styles.mainBtnText}>{loading ? '...' : isRegistering ? 'Criar conta' : 'Entrar'}</Text>
                                </Pressable>
                            </Animated.View>

                            <Pressable 
                                onPress={async () => {
                                    await AsyncStorage.clear();
                                    Alert.alert('Reset completo', 'Banco de dados local foi limpo. Você pode criar uma conta nova.');
                                }}
                                style={{ marginTop: 20, alignItems: 'center' }}
                            >
                                <Text style={{ color: C.textLight, fontSize: 13, textDecorationLine: 'underline', fontWeight: 'bold' }}>[DEV] Limpar Banco de Dados</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.sky },
    sky: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.sky },
    grassBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.grass, borderTopLeftRadius: 60, borderTopRightRadius: 60 },
    grassTop: { position: 'absolute', bottom: '18%', left: 0, right: 0, backgroundColor: C.grassDark, borderTopLeftRadius: 80, borderTopRightRadius: 80 },
    kav: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    cardWrap: { width: '100%', maxWidth: 400, position: 'relative', alignItems: 'center' },
    card: { width: '100%', backgroundColor: C.card, borderRadius: 32, padding: 24, borderWidth: 3, borderColor: C.cardBorder, elevation: 8 },
    decoRect: { position: 'absolute', width: 24, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.white, zIndex: 5 },
    cardHeader: { alignItems: 'center', marginBottom: 20 },
    leafRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    leafEmoji: { fontSize: 14 },
    appName: { fontSize: 11, fontWeight: '800', color: C.sage, textTransform: 'uppercase', letterSpacing: 3 },
    titleText: { fontSize: 26, fontWeight: '900', color: C.text, textAlign: 'center' },
    tabs: { flexDirection: 'row', backgroundColor: '#F0EBE0', borderRadius: 16, padding: 3, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    tabActive: { backgroundColor: C.white, elevation: 2 },
    tabText: { fontSize: 13, fontWeight: '700', color: C.text },
    fields: { gap: 12, marginBottom: 20, width: '100%' },
    input: { backgroundColor: C.inputBg, borderWidth: 2, borderColor: C.inputBorder, borderRadius: 18, padding: 15, fontSize: 15, color: C.text },
    mainBtn: { borderRadius: 22, padding: 16, alignItems: 'center', elevation: 5, width: '100%' },
    mainBtnText: { fontSize: 17, fontWeight: '900' },
    petLeft: { position: 'absolute', left: -50, bottom: 20, zIndex: 10, width: 70 },
    petRight: { position: 'absolute', right: -50, bottom: 20, zIndex: 10, width: 70 },
    petHead: { alignItems: 'center' },
    headCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    ear: { position: 'absolute', width: 20, height: 35, borderRadius: 10, top: -15 },
    earLeft: { left: 0 }, earRight: { right: 0 },
    earInner: { width: 10, height: 25, borderRadius: 5, marginTop: 5, alignSelf: 'center' },
    flopEar: { position: 'absolute', width: 22, height: 35, borderRadius: 10, top: -5 },
    flopEarLeft: { left: -5, transform: [{ rotate: '-10deg' }] }, 
    flopEarRight: { right: -5, transform: [{ rotate: '10deg' }] },
    flopEarInner: { width: 10, height: 25, borderRadius: 5, marginTop: 5, alignSelf: 'center' },
    puppySpot: { position: 'absolute', width: 30, height: 20, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.05)', top: 5, left: 5 },
    eyesRow: { flexDirection: 'row', gap: 10, marginBottom: 5 },
    eyeOuter: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
    eyeInner: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#333' },
    eyeShine: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFF', top: 2, right: 2 },
    blushRow: { flexDirection: 'row', gap: 20 },
    blush: { width: 10, height: 5, borderRadius: 5, opacity: 0.5 },
    nose: { width: 8, height: 5, borderRadius: 4, backgroundColor: '#444' },
    pawsRow: { flexDirection: 'row', gap: 5, marginTop: 5 },
    paw: { width: 25, height: 15, borderRadius: 8, borderWidth: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 2 },
    pawToe: { width: 6, height: 8, borderRadius: 3 },
    cloud: { position: 'absolute', width: 80, height: 30, backgroundColor: '#FFF', borderRadius: 20, opacity: 0.8 },
    cloudBubble1: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', top: -20, left: 10 },
    cloudBubble2: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', top: -10, left: 35 },
    successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 32, zIndex: 50, alignItems: 'center', justifyContent: 'center' },
    successBall: { alignItems: 'center', backgroundColor: C.white, padding: 20, borderRadius: 24, borderWidth: 3, borderColor: C.mint },
    successEmoji: { fontSize: 40, marginBottom: 10 },
    successTitle: { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 5 },
    successSub: { fontSize: 14, fontWeight: '600', color: C.textLight },
    forgotText: { fontSize: 13, color: C.textLight, textAlign: 'right', fontWeight: '700', textDecorationLine: 'underline' },
    inputGroup: { gap: 4 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: C.textLight, marginLeft: 10, textTransform: 'uppercase' },
});
