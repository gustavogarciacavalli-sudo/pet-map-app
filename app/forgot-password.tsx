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
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { resetPasswordLocal } from '../localDatabase';
import { TapSparkles } from '../components/TapSparkles';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

export default function ForgotPasswordScreen() {
    const { height } = useWindowDimensions();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [foundQuestion, setFoundQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: Question/Answer
    const [loading, setLoading] = useState(false);
    const [sparksActive, setSparksActive] = useState(false);

    const handleCheckEmail = async () => {
        if (!email.trim()) return;
        setLoading(true);
        try {
            const usersJson = await AsyncStorage.getItem('@wanderpet_users');
            const users = JSON.parse(usersJson || '[]');
            const user = users.find((u: any) => u.email === email.trim().toLowerCase());
            
            if (!user) throw new Error("E-mail não encontrado.");
            
            setFoundQuestion(user.securityQuestion);
            setStep(2);
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!answer.trim() || !newPassword.trim()) {
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }

        setLoading(true);
        try {
            await resetPasswordLocal(email.trim().toLowerCase(), answer, newPassword);
            Alert.alert('Sucesso', 'Senha alterada com sucesso.');
            router.replace('/login');
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.sky, { height: height * 0.5 }]} />
            <View style={styles.grassContainer} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Animated.View entering={FadeIn.duration(600)} style={styles.card}>
                        <View style={styles.header}>
                            <Text style={styles.titleText}>Recuperar Senha</Text>
                            <Text style={styles.subtitle}>
                                {step === 1 
                                    ? "Digite seu e-mail para localizarmos sua pergunta de segurança." 
                                    : "Responda à pergunta abaixo para definir sua nova senha."}
                            </Text>
                        </View>

                        <View style={styles.fields}>
                            {step === 1 ? (
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
                            ) : (
                                <Animated.View entering={ZoomIn}>
                                    <View style={styles.questionBox}>
                                        <Text style={styles.questionLabel}>Sua pergunta secreta:</Text>
                                        <Text style={styles.questionValue}>{foundQuestion}</Text>
                                    </View>
                                    
                                    <View style={[styles.inputGroup, { marginTop: 15 }]}>
                                        <Text style={styles.inputLabel}>Sua resposta:</Text>
                                        <TextInput 
                                            style={styles.input} 
                                            placeholder="Sua resposta secreta..." 
                                            value={answer} 
                                            onChangeText={setAnswer} 
                                        />
                                    </View>

                                    <View style={[styles.inputGroup, { marginTop: 15 }]}>
                                        <Text style={styles.inputLabel}>Nova Senha:</Text>
                                        <TextInput 
                                            style={styles.input} 
                                            placeholder="No mínimo 6 caracteres" 
                                            value={newPassword} 
                                            onChangeText={setNewPassword} 
                                            secureTextEntry 
                                        />
                                    </View>
                                </Animated.View>
                            )}
                        </View>

                        <View style={styles.actions}>
                            {step === 1 ? (
                                <Pressable 
                                    style={styles.mainBtn} 
                                    onPress={() => {
                                        setSparksActive(true);
                                        setTimeout(() => setSparksActive(false), 50);
                                        handleCheckEmail();
                                    }}
                                >
                                    <TapSparkles active={sparksActive} color={C.white} />
                                    <Text style={styles.mainBtnText}>{loading ? '...' : 'Buscar Pergunta'}</Text>
                                </Pressable>
                            ) : (
                                <Pressable 
                                    style={styles.mainBtn} 
                                    onPress={() => {
                                        setSparksActive(true);
                                        handleReset();
                                    }} 
                                    disabled={loading}
                                >
                                    <TapSparkles active={sparksActive} color={C.white} />
                                    <Text style={styles.mainBtnText}>{loading ? '...' : 'Alterar Senha'}</Text>
                                </Pressable>
                            )}
                            
                            <Pressable style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : router.back()}>
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
    questionBox: { backgroundColor: '#F0EBE0', padding: 15, borderRadius: 18, borderWidth: 2, borderColor: '#D4C2A8' },
    questionLabel: { fontSize: 10, fontWeight: '800', color: C.textLight, textTransform: 'uppercase', marginBottom: 4 },
    questionValue: { fontSize: 16, fontWeight: '800', color: C.text },
    actions: { gap: 12 },
    mainBtn: { backgroundColor: C.primary, borderRadius: 22, padding: 18, alignItems: 'center', elevation: 4 },
    mainBtnText: { fontSize: 16, fontWeight: '900', color: 'white' },
    backBtn: { padding: 10, alignItems: 'center' },
    backBtnText: { fontSize: 14, fontWeight: '700', color: C.textLight, textDecorationLine: 'underline' },
});
