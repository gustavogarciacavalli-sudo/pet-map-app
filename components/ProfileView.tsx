import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView, Alert, Switch, Modal, TextInput, Clipboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PetPreview } from './PetPreview';
import { getPetLocal, LocalPet, getCurrentUserLocal, LocalUser, getCoinsLocal, getLevelDataLocal, logoutLocal, updatePetLocal, checkNameAvailabilityLocal, getTotalDistanceLocal, getWeeklyActivityLocal, getPathByDateLocal, generateFakeHistoryLocal } from '../localDatabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { MapViewProvider, MapPolyline } from './MapViewProvider';
import { useTheme } from './ThemeContext';

export function ProfileView() {
    const router = useRouter();
    const { colors, theme, toggleTheme, isDarkMode } = useTheme();
    
    const [pet, setPet] = useState<LocalPet | null>(null);
    const [user, setUser] = useState<LocalUser | null>(null);
    const [coins, setCoins] = useState(0);
    const [levelData, setLevelData] = useState({ xp: 0, level: 1 });
    const [distance, setDistance] = useState(0);
    const [weeklyActivity, setWeeklyActivity] = useState<{date: string, distance: number}[]>([]);

    async function load() {
        const p = await getPetLocal();
        const u = await getCurrentUserLocal();
        const c = await getCoinsLocal();
        const l = await getLevelDataLocal();
        const d = await getTotalDistanceLocal();
        const activity = await getWeeklyActivityLocal();
        
        setPet(p);
        setUser(u);
        setCoins(c);
        setLevelData(l);
        setDistance(d);
        setWeeklyActivity(activity);
        setTempName(p?.name || '');
        setTempSpecies(p?.species || 'bunny');
        setTempImageUri(p?.customImageUri || null);
    }

    useFocusEffect(
        React.useCallback(() => {
            load();
        }, [])
    );

    // Estados para Edição
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [tempName, setTempName] = useState('');
    const [tempSpecies, setTempSpecies] = useState('bunny');
    const [tempImageUri, setTempImageUri] = useState<string | null>(null);

    // Estados para o Diário de Expedição
    const [isDayModalVisible, setIsDayModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState<{date: string, distance: number} | null>(null);
    const [dayPath, setDayPath] = useState<{latitude: number, longitude: number}[]>([]);
    const [mapRegion, setMapRegion] = useState({
        latitude: -23.5505,
        longitude: -46.6333,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
    });

    const handleDayPress = async (item: {date: string, distance: number}) => {
        const path = await getPathByDateLocal(item.date);
        setSelectedDay(item);
        setDayPath(path);
        
        if (path.length > 0) {
            // Centralizamos o mapa no início do trajeto
            setMapRegion({
                latitude: path[0].latitude,
                longitude: path[0].longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005
            });
        }
        setIsDayModalVisible(true);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permissão negada", "Precisamos de acesso à sua galeria para você escolher uma foto.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setTempImageUri(result.assets[0].uri);
        }
    };

    const handleSaveProfile = async () => {
        if (!tempName.trim()) {
            Alert.alert("Erro", "O nome não pode estar vazio!");
            return;
        }

        if (user && tempName !== pet?.name) {
            const isAvailable = await checkNameAvailabilityLocal(tempName, user.id);
            if (!isAvailable) {
                Alert.alert("Nome Ocupado", "Este nome já foi clamado por outro explorador.");
                return;
            }
        }

        const updated = await updatePetLocal({ 
            name: tempName, 
            species: tempSpecies as any,
            customImageUri: tempImageUri || undefined 
        });
        if (updated) {
            setPet(updated);
            setIsEditModalVisible(false);
            Alert.alert("Sucesso", "Seu perfil foi atualizado.");
        }
    };

    const handleLogout = () => {
        Alert.alert('Sair', 'Tem certeza que deseja sair?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: async () => { await logoutLocal(); router.replace('/login'); } }
        ]);
    };

    const copyToClipboard = () => {
        if (user?.wanderId) {
            Clipboard.setString(user.wanderId);
            Alert.alert('Copiado', 'Seu Wander-ID foi copiado.');
        }
    };

    const nextLevelXP = levelData.level * 200;

    return (
        <View style={[{ flex: 1, backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Meu Perfil</Text>
                    <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#FF5252" />
                    </Pressable>
                </View>

                {/* Card do Pet & ID */}
                <View style={[styles.petCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.previewWrapper}>
                        {pet ? (
                            <View style={[styles.avatarCircle, { borderColor: colors.primary }]}>
                                <PetPreview species={pet?.species || 'bunny'} accessory={pet?.accessory} customImageUri={pet?.customImageUri} />
                            </View>
                        ) : (
                            <Text style={{ color: colors.text }}>Carregando...</Text>
                        )}
                    </View>
                    
                    <View style={styles.nameRow}>
                        <Text style={[styles.petName, { color: colors.text }]}>{pet?.name || 'Seu Pet'}</Text>
                        <Pressable style={[styles.editBtn, { backgroundColor: colors.primary + '22' }]} onPress={() => setIsEditModalVisible(true)}>
                            <Ionicons name="pencil" size={16} color={colors.primary} />
                        </Pressable>
                    </View>
                    
                    <View style={[styles.idBadge, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F9F2E8', borderColor: colors.border }]}>
                        <View style={styles.idHeader}>
                            <Text style={[styles.idLabel, { color: colors.subtext }]}>WANDER-ID</Text>
                            <Pressable onPress={copyToClipboard} style={styles.copyBtn}>
                                <Ionicons name="copy-outline" size={14} color={colors.primary} />
                            </Pressable>
                        </View>
                        <Text style={[styles.idValue, { color: colors.primary }]}>{user?.wanderId || '#WP-????'}</Text>
                    </View>
                </View>

                {/* TIMELINE — Hoje (Life360 style) */}
                <View style={[styles.adventureStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>HOJE</Text>
                    
                    {/* Card de estadia */}
                    <View style={[styles.timelineCard, { borderColor: colors.border }]}>
                        <View style={styles.timelineCardContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.timelinePlace, { color: colors.text }]}>Localização Atual</Text>
                                <Text style={[styles.timelineTime, { color: colors.subtext }]}>
                                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <View style={styles.timelineDuration}>
                                    <Ionicons name="time-outline" size={12} color={colors.subtext} />
                                    <Text style={[styles.timelineDurationText, { color: colors.subtext }]}>Desde agora</Text>
                                </View>
                            </View>
                            <View style={[styles.timelinePin, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="location" size={24} color={colors.primary} />
                            </View>
                        </View>
                    </View>

                    {/* Card de viagem */}
                    <View style={[styles.timelineCard, { borderColor: colors.border }]}>
                        <View style={[styles.tripMapPreview, { backgroundColor: isDarkMode ? '#1A1A24' : '#F0F0F4' }]}>
                            <Ionicons name="navigate" size={20} color={colors.primary} />
                            <Text style={[styles.tripRoute, { color: colors.subtext }]}>{(distance / 1000).toFixed(1)} km percorridos</Text>
                        </View>
                        <View style={styles.timelineCardContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.timelinePlace, { color: colors.text }]}>Expedição do Dia</Text>
                                <Text style={[styles.timelineTime, { color: colors.subtext }]}>Total: {(distance / 1000).toFixed(2)} km</Text>
                                <View style={styles.tripStats}>
                                    <View style={styles.tripStat}>
                                        <Ionicons name="speedometer-outline" size={12} color={colors.subtext} />
                                        <Text style={[styles.tripStatText, { color: colors.subtext }]}>- km/h</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Atividade semanal */}
                    <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 50 }}>
                        {weeklyActivity.map((item, i) => {
                            const maxDist = Math.max(...weeklyActivity.map(a => a.distance), 1);
                            const h = (item.distance / maxDist) * 40;
                            return (
                                <Pressable key={item.date} onPress={() => handleDayPress(item)} style={[styles.bar, { height: Math.max(4, h), backgroundColor: i === 6 ? colors.primary : colors.subtext + '33' }]} />
                            );
                        })}
                    </View>
                </View>

                {/* Stats Econômicos */}
                <View style={[styles.metaStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.metaRow}>
                        <Ionicons name="wallet" size={18} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.statLabel, { color: colors.subtext }]}>PetCoins</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{coins} moedas</Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <MaterialCommunityIcons name="trending-up" size={22} color="#2196F3" />
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={[styles.statLabel, { color: colors.subtext }]}>Nível {levelData.level}</Text>
                                <Text style={styles.xpMini}>{levelData.xp}/{nextLevelXP} XP</Text>
                            </View>
                            <View style={[styles.xpBar, { backgroundColor: isDarkMode ? '#444' : '#EEE' }]}>
                                <View style={[styles.xpFill, { width: `${(levelData.xp / nextLevelXP) * 100}%`, backgroundColor: '#2196F3' }]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Configurações */}
                <View style={[styles.optionsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.optionItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="moon" size={20} color={isDarkMode ? '#FFD700' : '#5C4033'} />
                            <Text style={[styles.optionTitle, { color: colors.text }]}>Modo Noturno</Text>
                        </View>
                        <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: '#EEE', true: colors.primary }} />
                    </View>
                    <Pressable style={styles.optionItem} onPress={async () => {
                        await generateFakeHistoryLocal();
                        Alert.alert("Dev Mode", "Histórico de 7 dias gerado com sucesso.");
                        load();
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="flask" size={20} color={colors.primary} />
                            <Text style={[styles.optionTitle, { color: colors.primary }]}>DEV: Gerar Memórias Fake</Text>
                        </View>
                        <Ionicons name="flash" size={20} color={colors.primary} />
                    </Pressable>
                </View>

                <Text style={[styles.version, { color: colors.subtext }]}>WanderPet v2.0.0</Text>
            </ScrollView>

            {/* Modal Edit */}
            <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Perfil</Text>
                        <Text style={styles.inputLabel}>NOME DO EXPLORADOR</Text>
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} value={tempName} onChangeText={setTempName} />
                        
                        <Text style={[styles.inputLabel, { marginTop: 15 }]}>ESCOLHA SEU AVATAR</Text>
                        <View style={styles.avatarGrid}>
                            {['bunny', 'puppy', 'cat', 'fox', 'parrot', 'wolf'].map(s => (
                                <Pressable key={s} onPress={() => { setTempSpecies(s as any); setTempImageUri(null); }} style={[styles.avatarOpt, (tempSpecies === s && !tempImageUri) && { borderColor: colors.primary }]}>
                                    <PetPreview species={s as any} size={40} />
                                </Pressable>
                            ))}
                        </View>

                        <Pressable style={[styles.uploadBtn, { borderColor: colors.primary }]} onPress={pickImage}>
                            <Ionicons name="image-outline" size={20} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: '700' }}>{tempImageUri ? 'Trocar Foto' : 'Usar PNG/Foto Externa'}</Text>
                        </Pressable>

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setIsEditModalVisible(false)}><Text style={{ color: colors.text }}>Cancelar</Text></Pressable>
                            <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProfile}><Text style={{ color: '#000', fontWeight: '900' }}>Salvar</Text></Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Diário de Expedição */}
            <Modal visible={isDayModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.expeditionModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.expeditionHeader}>
                            <View>
                                <Text style={[styles.expDate, { color: colors.subtext }]}>{selectedDay?.date}</Text>
                                <Text style={[styles.expTitle, { color: colors.text }]}>Diário de Expedição</Text>
                            </View>
                            <Pressable onPress={() => setIsDayModalVisible(false)} style={styles.closeExpBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>

                        <View style={[styles.miniMapContainer, { borderColor: colors.border }]}>
                            {dayPath.length > 0 ? (
                                <MapViewProvider region={mapRegion}>
                                    <MapPolyline 
                                        coordinates={dayPath}
                                        strokeWidth={4}
                                        strokeColor={colors.primary}
                                    />
                                </MapViewProvider>
                            ) : (
                                <View style={styles.noPathContent}>
                                    <MaterialCommunityIcons name="map-marker-off" size={40} color={colors.subtext + '44'} />
                                    <Text style={{color: colors.subtext, fontSize: 12, marginTop: 10}}>Nenhum trajeto registrado</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.expStats}>
                            <View style={styles.expStatItem}>
                                <Text style={[styles.expStatLabel, { color: colors.subtext }]}>DISTÂNCIA</Text>
                                <Text style={[styles.expStatValue, { color: colors.primary }]}>{((selectedDay?.distance || 0) / 1000).toFixed(2)} km</Text>
                            </View>
                            <View style={[styles.expDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.expStatItem}>
                                <Text style={[styles.expStatLabel, { color: colors.subtext }]}>PONTOS</Text>
                                <Text style={[styles.expStatValue, { color: colors.text }]}>{dayPath.length}</Text>
                            </View>
                        </View>
                        
                        <Pressable style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={() => setIsDayModalVisible(false)}>
                            <Text style={{ fontWeight: '900' }}>CONFIRMAR</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '900' },
    logoutBtn: { padding: 8 },
    petCard: { borderRadius: 32, padding: 20, alignItems: 'center', borderWidth: 2, elevation: 4 },
    previewWrapper: { width: 120, height: 120, marginBottom: 15 },
    avatarCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    petName: { fontSize: 24, fontWeight: '900' },
    editBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    idBadge: { padding: 12, borderRadius: 16, borderWidth: 1, width: '100%' },
    idHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    idLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    idValue: { fontSize: 16, fontWeight: '900' },
    copyBtn: { padding: 4 },
    adventureStats: { marginTop: 20, borderRadius: 24, padding: 20, borderWidth: 2 },
    sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 15 },
    statsRow: { flexDirection: 'column', gap: 15 },
    statBox: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statLabel: { fontSize: 11, fontWeight: '700' },
    statValue: { fontSize: 16, fontWeight: '900' },
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 35, marginTop: 5 },
    bar: { width: 8, borderRadius: 2 },
    metaStats: { marginTop: 15, borderRadius: 24, padding: 20, borderWidth: 2, gap: 15 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    xpMini: { fontSize: 10, fontWeight: '900' },
    xpBar: { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%', marginTop: 4 },
    xpFill: { height: '100%' },
    optionsGroup: { marginTop: 25, borderRadius: 24, paddingHorizontal: 20, borderWidth: 2 },
    optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    optionTitle: { fontSize: 14, fontWeight: '700' },
    version: { textAlign: 'center', marginTop: 30, fontSize: 11, fontWeight: '700', marginBottom: 50 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 32, padding: 25, borderWidth: 2 },
    modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    inputLabel: { fontSize: 10, fontWeight: '900', color: '#888', marginBottom: 5 },
    input: { height: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, fontSize: 16, fontWeight: '700' },
    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: 10 },
    avatarOpt: { width: 55, height: 55, borderRadius: 27, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    uploadBtn: { height: 48, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 15 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 25 },
    cancelBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    saveBtn: { flex: 2, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    expeditionModal: { width: '100%', borderRadius: 32, padding: 20, borderWidth: 2 },
    expeditionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    expDate: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    expTitle: { fontSize: 18, fontWeight: '900' },
    closeExpBtn: { padding: 4 },
    miniMapContainer: { width: '100%', height: 250, borderRadius: 24, borderWidth: 2, overflow: 'hidden', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
    noPathContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    expStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 25 },
    expStatItem: { alignItems: 'center' },
    expStatLabel: { fontSize: 9, fontWeight: '900', marginBottom: 4 },
    expStatValue: { fontSize: 20, fontWeight: '900' },
    expDivider: { width: 1, height: 30 },
    confirmBtn: { height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    
    // Timeline cards (Life360)
    timelineCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
    timelineCardContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    timelinePlace: { fontSize: 16, fontWeight: '700' },
    timelineTime: { fontSize: 12, fontWeight: '500', marginTop: 4 },
    timelineDuration: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    timelineDurationText: { fontSize: 11, fontWeight: '600' },
    timelinePin: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    tripMapPreview: { padding: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 60 },
    tripRoute: { fontSize: 12, fontWeight: '600' },
    tripStats: { flexDirection: 'row', gap: 12, marginTop: 6 },
    tripStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    tripStatText: { fontSize: 11, fontWeight: '600' },
});
