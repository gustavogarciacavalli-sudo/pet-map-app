import { useRouter, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    useWindowDimensions,
    Alert,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { savePetLocal, Species } from '../../localDatabase';
import { PetPreview } from '../../components/PetPreview';
import { TapSparkles } from '../../components/TapSparkles';

// ─── Paleta de Cores ───
const C = {
    sky: '#D4ECFF',
    grass: '#7DBF72',
    mint: '#B5EAD7',
    lavender: '#C7CEEA',
    peach: '#FFDAC1',
    pink: '#F9C6CF',
    yellow: '#FFF0A0',
    card: '#FFFDF7',
    cardBorder: '#EAD9C8',
    text: '#5C4033',
    textLight: '#9B7B6A',
    white: '#FFFFFF',
    primary: '#7BBF72',
};

const SPECIES_LIST: { id: Species; label: string; icon: string }[] = [
    { id: 'bunny', label: 'Coelho', icon: 'B' },
    { id: 'puppy', label: 'Cão', icon: 'C' },
    { id: 'cat', label: 'Gato', icon: 'G' },
    { id: 'fox', label: 'Raposa', icon: 'R' },
    { id: 'wolf', label: 'Lobo', icon: 'L' },
    { id: 'bear', label: 'Urso', icon: 'U' },
    { id: 'raccoon', label: 'Guaxinim', icon: 'X' },
    { id: 'sheep', label: 'Ovelha', icon: 'O' },
    { id: 'mouse', label: 'Rato', icon: 'T' },
    { id: 'parrot', label: 'Papagaio', icon: 'P' },
    { id: 'frog', label: 'Sapo', icon: 'S' },
    { id: 'snake', label: 'Cobra', icon: 'K' },
    { id: 'cockroach', label: 'Barata', icon: 'A' },
];

const ACCESSORIES = [
    { value: 'none', label: 'Nenhum', icon: '-' },
    { value: 'bow', label: 'Laço', icon: 'L' },
    { value: 'hat', label: 'Chapéu', icon: 'H' },
    { value: 'flower', label: 'Flor', icon: 'F' },
    { value: 'glasses', label: 'Óculos', icon: 'O' },
];

const STEPS = ['species', 'accessory', 'name'] as const;
type Step = typeof STEPS[number];

export default function CreateCharacterScreen() {
    const { height } = useWindowDimensions();
    const router = useRouter();
    
    const [step, setStep] = useState<Step>('species');
    const [species, setSpecies] = useState<Species>('bunny');
    const [accessory, setAccessory] = useState('none');
    const [petName, setPetName] = useState('');
    const [loading, setLoading] = useState(false);
    const [sparksActive, setSparksActive] = useState(false);

    const stepIndex = STEPS.indexOf(step);
    const isLast = step === 'name';

    // Animations
    const stepMove = useSharedValue(0);

    const next = () => {
        if (step === 'species') setStep('accessory');
        else if (step === 'accessory') setStep('name');
        stepMove.value = withSequence(withTiming(-20, { duration: 100 }), withTiming(0, { duration: 200 }));
    };

    const back = () => {
        if (step === 'accessory') setStep('species');
        else if (step === 'name') setStep('accessory');
        stepMove.value = withSequence(withTiming(20, { duration: 100 }), withTiming(0, { duration: 200 }));
    };

    const handleCreate = async () => {
        if (!petName.trim()) {
            Alert.alert('Atenção', 'Dê um nome ao seu pet.');
            return;
        }

        setLoading(true);
        try {
            await savePetLocal({
                name: petName.trim(),
                species,
                accessory,
                personality: "friendly",
            });

            try {
                router.replace('/(tabs)');
            } catch (navError: any) {
                Alert.alert('Erro de Rota', 'Falha ao iniciar: ' + navError.message);
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    const animStepStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: stepMove.value }],
        opacity: withTiming(1, { duration: 200 })
    }));

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.sky, { height: height * 0.5 }]} />
            <View style={styles.grassContainer} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <View style={styles.leafRow}><Text style={styles.appName}>WanderPet</Text></View>
                            <Text style={styles.title}>
                                {step === 'species' ? 'Quem é você?' : step === 'accessory' ? 'Um toque final?' : 'Como você será chamado pelos outros?'}
                            </Text>
                        </View>

                        <View style={styles.previewContainer}>
                            <PetPreview
                                species={species}
                                accessory={accessory}
                                name={step === 'name' ? petName : ''}
                            />
                        </View>

                        <Animated.View style={[styles.stepContent, animStepStyle]}>
                            {step === 'species' && (
                                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
                                    <View style={styles.gridSpecies}>
                                        {SPECIES_LIST.map((s) => (
                                            <Pressable key={s.id} onPress={() => setSpecies(s.id)} style={[styles.optionBtn, species === s.id && styles.optionBtnActive]}>
                                                <Text style={styles.optionEmoji}>{s.icon}</Text>
                                                <Text style={styles.optionText}>{s.label}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}

                            {step === 'accessory' && (
                                <View style={styles.accPanel}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accessoryScroll}>
                                        {ACCESSORIES.map((a) => (
                                            <Pressable key={a.value} onPress={() => setAccessory(a.value)} style={[styles.accBtn, accessory === a.value && styles.accBtnActive]}>
                                                <Text style={styles.accEmoji}>{a.icon}</Text>
                                                <Text style={[styles.accLabel, {color: accessory === a.value ? C.primary : C.text}]}>{a.label}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {step === 'name' && (
                                <View style={styles.nameContainer}>
                                    <TextInput
                                        style={styles.nameInput}
                                        placeholder="Ex: Floquinho"
                                        value={petName}
                                        onChangeText={setPetName}
                                        maxLength={15}
                                        onSubmitEditing={() => isLast && handleCreate()}
                                        autoFocus
                                    />
                                    <View style={styles.inputUnderline} />
                                </View>
                            )}
                        </Animated.View>

                        <View style={styles.bottomNav}>
                            {stepIndex > 0 && (
                                <Pressable style={styles.backBtn} onPress={back}>
                                    <Text style={styles.backBtnText}>← Voltar</Text>
                                </Pressable>
                            )}
                            <Pressable 
                                style={[styles.nextBtn, { flex: stepIndex > 0 ? 1.5 : 1 }]} 
                                onPress={() => {
                                    setSparksActive(true);
                                    setTimeout(() => setSparksActive(false), 50);
                                    isLast ? handleCreate() : next();
                                }}
                                disabled={loading}
                            >
                                <TapSparkles active={sparksActive} color={C.white} />
                                <Text style={styles.nextBtnText}>{loading ? '...' : isLast ? 'Começar' : 'Próximo'}</Text>
                            </Pressable>
                        </View>
                    </View>
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
    card: { width: '100%', maxWidth: 450, backgroundColor: C.card, borderRadius: 32, padding: 24, borderWidth: 3, borderColor: C.cardBorder, elevation: 10 },
    header: { alignItems: 'center', marginBottom: 15 },
    leafRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    leafEmoji: { fontSize: 14 },
    appName: { fontSize: 11, fontWeight: '800', color: '#7DBF72', textTransform: 'uppercase', letterSpacing: 3 },
    title: { fontSize: 22, fontWeight: '900', color: C.text, textAlign: 'center' },
    previewContainer: { height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    stepContent: { width: '100%', minHeight: 200 },
    gridSpecies: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 10 },
    optionBtn: { width: '28%', backgroundColor: '#F9F9F9', borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    optionBtnActive: { backgroundColor: '#E8F5E9', borderColor: C.primary },
    optionEmoji: { fontSize: 32, marginBottom: 5 },
    optionText: { fontSize: 11, fontWeight: '800', color: C.text },
    accPanel: { width: '100%', alignItems: 'center', marginTop: 20 },
    accessoryScroll: { paddingVertical: 10, gap: 12 },
    accBtn: { width: 85, backgroundColor: '#F9F9F9', borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    accBtnActive: { borderColor: C.primary, backgroundColor: C.white },
    accEmoji: { fontSize: 26, marginBottom: 4 },
    accLabel: { fontSize: 11, fontWeight: '800' },
    nameContainer: { width: '100%', alignItems: 'center', marginTop: 30 },
    nameInput: { fontSize: 24, fontWeight: '900', color: C.text, textAlign: 'center', width: '100%', padding: 10 },
    inputUnderline: { width: '80%', height: 4, backgroundColor: C.primary, borderRadius: 2, marginTop: -5 },
    bottomNav: { flexDirection: 'row', gap: 10, marginTop: 25 },
    backBtn: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, padding: 16, alignItems: 'center' },
    backBtnText: { fontSize: 15, fontWeight: '700', color: '#888' },
    nextBtn: { backgroundColor: C.primary, borderRadius: 24, padding: 16, alignItems: 'center', elevation: 4 },
    nextBtnText: { fontSize: 16, fontWeight: '900', color: 'white' },
});
