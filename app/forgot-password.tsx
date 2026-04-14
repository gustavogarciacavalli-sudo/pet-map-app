import { useRouter, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, { FadeIn, ZoomIn, SlideInRight } from 'react-native-reanimated';
import { TapSparkles } from '../components/TapSparkles';
import { AuthService } from '../services/AuthService';
import { Ionicons } from '@expo/vector-icons';

const C = {
    sky: '#D4ECFF',
    grass: '#7DBF72',
    card: '#FFFDF7',
    cardBorder: '#EAD9C8',
    text: '#5C4033',
    textLight: '#9B7B6A',
    primary: '#7BBF72',
    inputBg: '#F5F2E8',
    inputBorder: '#E0D9C8',
    white: '#FFFFFF',
    error: '#E74C3C',
    success: '#27AE60'
};

type Step = 'EMAIL' | 'TOKEN' | 'SECURITY';

export default function ForgotPasswordScreen() {
    const { height } = useWindowDimensions();
    const router = useRouter();
    
    // States
    const [step, setStep] = useState<Step>('EMAIL');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [twoFactorPin, setTwoFactorPin] = useState('');
    
    // UI States
    const [loading, setLoading] = useState(false);
    const [sparksActive, setSparksActive] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);

    /**
     * Passo 1: Solicitar Token por E-mail
     */
    const handleRequestToken = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('E-mail Inválido', 'Por favor, digite um e-mail válido.');
            return;
        }
        setLoading(true);
        try {
            await AuthService.requestPasswordReset(email);
            Alert.alert(
                'E-mail Enviado!', 
                'Um código de redefinição foi enviado para o seu e-mail. Verifique sua caixa de entrada (ou spam).',
                [{ text: 'Inserir Código', onPress: () => setStep('TOKEN') }]
            );
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Passo 2: Validar Token do E-mail
     */
    const handleVerifyToken = async () => {
        if (token.length < 6) {
            Alert.alert('Atenção', 'O código deve ter 6 dígitos.');
            return;
        }
        setLoading(true);
        try {
            const res = await AuthService.verifyToken(email, token);
            setRequires2FA(res.requires2FA);
            setStep('SECURITY');
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Passo 3: Reset Final (Com ou sem 2FA)
     */
    const handleFinalReset = async () => {
        if (!newPassword.trim() || newPassword.length < 6) {
            Alert.alert('Senha Fraca', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (requires2FA && twoFactorPin.length < 4) {
            Alert.alert('2FA Obrigatório', 'Por favor, insira seu PIN de segurança.');
            return;
        }

        setLoading(true);
        try {
            await AuthService.executePasswordReset(email, token, newPassword, twoFactorPin);
            Alert.alert('Sucesso!', 'Sua senha foi redefinida. Agora você pode entrar na sua conta.', [
                { text: 'Ir para Login', onPress: () => router.replace('/login') }
            ]);
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const triggerSparks = () => {
        setSparksActive(true);
        setTimeout(() => setSparksActive(false), 100);
    };

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.sky, { height: height * 0.5 }]} />
            <View style={styles.grassContainer} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Animated.View entering={FadeIn.duration(600)} style={styles.card}>
                        
                        {/* Header Dinâmico */}
                        <View style={styles.header}>
                            <Ionicons 
                                name={step === 'EMAIL' ? 'mail-open' : (step === 'TOKEN' ? 'shield-checkmark' : 'key')} 
                                size={40} 
                                color={C.primary} 
                                style={{ marginBottom: 10 }}
                            />
                            <Text style={styles.titleText}>Recuperar Senha</Text>
                            <Text style={styles.subtitle}>
                                {step === 'EMAIL' && "Digite seu e-mail para receber um código de validação."}
                                {step === 'TOKEN' && "Insira o código de 6 dígitos enviado para seu e-mail."}
                                {step === 'SECURITY' && "Defina sua nova senha e confirme sua identidade."}
                            </Text>
                        </View>

                        {/* Campos Dinâmicos */}
                        <View style={styles.fields}>
                            
                            {/* PASSO 1: EMAIL */}
                            {step === 'EMAIL' && (
                                <Animated.View entering={FadeIn}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>E-mail da conta:</Text>
                                        <TextInput 
                                            style={styles.input} 
                                            placeholder="seu@email.com" 
                                            value={email} 
                                            onChangeText={setEmail} 
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </Animated.View>
                            )}

                            {/* PASSO 2: TOKEN */}
                            {step === 'TOKEN' && (
                                <Animated.View entering={SlideInRight}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Código de 6 dígitos:</Text>
                                        <TextInput 
                                            style={[styles.input, { textAlign: 'center', letterSpacing: 8, fontSize: 20, fontWeight: '800' }]} 
                                            placeholder="000000" 
                                            value={token} 
                                            onChangeText={setToken} 
                                            keyboardType="numeric"
                                            maxLength={6}
                                        />
                                    </View>
                                </Animated.View>
                            )}

                            {/* PASSO 3: NOVA SENHA + 2FA */}
                            {step === 'SECURITY' && (
                                <Animated.View entering={ZoomIn}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Nova Senha:</Text>
                                        <TextInput 
                                            style={styles.input} 
                                            placeholder="Mínimo 6 caracteres" 
                                            value={newPassword} 
                                            onChangeText={setNewPassword} 
                                            secureTextEntry 
                                        />
                                    </View>

                                    {requires2FA && (
                                        <View style={[styles.inputGroup, { marginTop: 15 }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Ionicons name="lock-closed" size={14} color={C.error} />
                                                <Text style={[styles.inputLabel, { color: C.error }]}>PIN de Segurança (2FA):</Text>
                                            </View>
                                            <TextInput 
                                                style={[styles.input, { borderColor: C.error }]} 
                                                placeholder="Digite seu PIN de 4 dígitos" 
                                                value={twoFactorPin} 
                                                onChangeText={setTwoFactorPin} 
                                                keyboardType="numeric"
                                                maxLength={4}
                                                secureTextEntry
                                            />
                                            <Text style={styles.helperText}>Sua conta possui proteção extra ativada.</Text>
                                        </View>
                                    )}
                                </Animated.View>
                            )}
                        </View>

                        {/* Ações */}
                        <View style={styles.actions}>
                            <Pressable 
                                style={[styles.mainBtn, loading && { opacity: 0.7 }]} 
                                disabled={loading}
                                onPress={() => {
                                    triggerSparks();
                                    if (step === 'EMAIL') handleRequestToken();
                                    else if (step === 'TOKEN') handleVerifyToken();
                                    else handleFinalReset();
                                }}
                            >
                                <TapSparkles active={sparksActive} color={C.white} />
                                <Text style={styles.mainBtnText}>
                                    {loading ? 'Processando...' : (
                                        step === 'EMAIL' ? 'Enviar Código' : 
                                        step === 'TOKEN' ? 'Validar Código' : 'Redefinir Senha'
                                    )}
                                </Text>
                            </Pressable>
                            
                            <Pressable 
                                style={styles.backBtn} 
                                onPress={() => {
                                    if (step === 'TOKEN') setStep('EMAIL');
                                    else if (step === 'SECURITY') setStep('TOKEN');
                                    else router.back();
                                }}
                            >
                                <Text style={styles.backBtnText}>Voltar</Text>
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
    grassContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: C.grass, borderTopLeftRadius: 60, borderTopRightRadius: 60 },
    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 400, backgroundColor: C.card, borderRadius: 32, padding: 24, borderWidth: 3, borderColor: C.cardBorder, elevation: 10 },
    header: { alignItems: 'center', marginBottom: 20 },
    titleText: { fontSize: 24, fontWeight: '900', color: C.text, marginBottom: 8 },
    subtitle: { fontSize: 13, color: C.textLight, textAlign: 'center', lineHeight: 18 },
    fields: { gap: 16, marginBottom: 24 },
    inputGroup: { gap: 4 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: C.textLight, marginLeft: 10, textTransform: 'uppercase' },
    input: { backgroundColor: C.inputBg, borderWidth: 2, borderColor: C.inputBorder, borderRadius: 18, padding: 15, fontSize: 15, color: C.text },
    helperText: { fontSize: 10, color: C.textLight, marginLeft: 10, marginTop: 4 },
    actions: { gap: 12 },
    mainBtn: { backgroundColor: C.primary, borderRadius: 22, padding: 18, alignItems: 'center', elevation: 4 },
    mainBtnText: { fontSize: 16, fontWeight: '900', color: 'white' },
    backBtn: { padding: 10, alignItems: 'center' },
    backBtnText: { fontSize: 14, fontWeight: '700', color: C.textLight, textDecorationLine: 'underline' },
});
