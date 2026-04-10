import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Dimensions, Modal, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { getCurrentUserLocal, getAllUsersLocal, LocalUser, getCoinsLocal, getLevelDataLocal, getTotalDistanceLocal, getFriendsLocal, addFriendLocal, getGroupsLocal, createGroupLocal } from '../../localDatabase';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolate, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type RankType = 'km' | 'money' | 'level';

const MOCK_LEADERBOARD = [
    { id: 'm1', name: 'Gustavo', species: '🐶', wanderId: '#WP-PLAY', km: 24.5, money: 1250, level: 12 },
    { id: 'm2', name: 'Aline', species: '🐱', wanderId: '#WP-CAT1', km: 18.2, money: 840, level: 8 },
    { id: 'm3', name: 'Marcos', species: '🦜', wanderId: '#WP-BIRD', km: 12.1, money: 3200, level: 15 },
    { id: 'm4', name: 'Sofia', species: '🦊', wanderId: '#WP-FOXX', km: 8.4, money: 450, level: 5 },
    { id: 'm5', name: 'Tiago', species: '🐺', wanderId: '#WP-WOLF', km: 31.2, money: 2100, level: 20 },
];

export default function FriendsScreen() {
    const { colors, isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'groups'>('leaderboard');
    const [activeRank, setActiveRank] = useState<RankType>('km');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [myRankInfo, setMyRankInfo] = useState<any>(null);
    const [groups, setGroups] = useState<any[]>([]);

    // Animação de Scroll e Brilho do Botão
    const scrollY = useSharedValue(0);
    const glowAnim = useSharedValue(1);
    
    useEffect(() => {
        glowAnim.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1500 }),
                withTiming(1, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const animatedGlowStyle = useAnimatedStyle(() => ({
        shadowOpacity: interpolate(glowAnim.value, [1, 1.2], [0.3, 0.7]),
        shadowRadius: interpolate(glowAnim.value, [1, 1.2], [8, 18]),
        backgroundColor: colors.primary,
        borderRadius: 22,
    }));

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const animatedPodiumStyle = useAnimatedStyle(() => {
        const scale = interpolate(scrollY.value, [0, 150], [1, 0.75], Extrapolate.CLAMP);
        const opacity = interpolate(scrollY.value, [0, 180], [1, 0], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [0, 180], [0, -40], Extrapolate.CLAMP);
        return { transform: [{ scale }, { translateY }], opacity };
    });

    const animatedHeaderStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, 100], [1, 0.8], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [0, 100], [0, -10], Extrapolate.CLAMP);
        return { opacity, transform: [{ translateY }] };
    });

    // Estado para o Modal Customizado
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [friendIdInput, setFriendIdInput] = useState('');
    const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
    const [groupNameInput, setGroupNameInput] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            async function load() {
                const me = await getCurrentUserLocal();
                const myCoins = await getCoinsLocal();
                const myLvl = await getLevelDataLocal();
                const myKm = (await getTotalDistanceLocal()) / 1000;
                const myGroups = await getGroupsLocal();

                setGroups(myGroups);

                const myData = {
                    id: me?.id || 'me',
                    name: 'Você',
                    species: '🐾',
                    wanderId: me?.wanderId || '#WP-NEW',
                    km: myKm,
                    money: myCoins,
                    level: myLvl.level,
                    isMe: true
                };

                const friendIds = await getFriendsLocal();
                const allUsers = await getAllUsersLocal();
                const realFriends = allUsers
                    .filter(u => friendIds.includes(u.id))
                    .map(u => ({
                        id: u.id,
                        name: u.name || 'Amigo',
                        species: '🐾',
                        wanderId: u.wanderId,
                        km: Math.random() * 10,
                        money: 200,
                        level: 2
                    }));

                const combined = [...MOCK_LEADERBOARD, ...realFriends, myData];
                sortData(combined, activeRank);
                setMyRankInfo(myData);
            }
            load();
        }, [activeRank])
    );

    const handleAddFriendAction = async () => {
        if (!friendIdInput.trim()) return;
        try {
            const found = await addFriendLocal(friendIdInput);
            Alert.alert("Sucesso! 🎉", `${found.name} foi adicionado à sua lista.`);
            setFriendIdInput('');
            setIsModalVisible(false);
            setActiveRank(prev => prev); 
        } catch (e: any) {
            Alert.alert("Ops! ❌", e.message);
        }
    };

    const sortData = (data: any[], type: RankType) => {
        const sorted = [...data].sort((a, b) => {
            if (type === 'km') return b.km - a.km;
            if (type === 'money') return b.money - a.money;
            return b.level - a.level;
        });
        setLeaderboard(sorted);
    };

    const getVal = (item: any) => {
        if (activeRank === 'km') return `${item.km.toFixed(1)} km`;
        if (activeRank === 'money') return `${item.money} 🪙`;
        return `Nível ${item.level}`;
    };

    const handleCreateGroup = async () => {
        if (!groupNameInput.trim()) return;
        try {
            await createGroupLocal(groupNameInput);
            Alert.alert("Sucesso! 🏘️", `O grupo "${groupNameInput}" foi fundado.`);
            setGroupNameInput('');
            setIsGroupModalVisible(false);
            const updated = await getGroupsLocal();
            setGroups(updated);
        } catch (e: any) {
            Alert.alert("Erro", e.message);
        }
    };

    const getMedalColor = (index: number) => {
        if (index === 0) return '#FFD700';
        if (index === 1) return '#C0C0C0';
        if (index === 2) return '#CD7F32';
        return colors.subtext;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Gradiente de Fundo do Header (Prestígio) */}
            <LinearGradient
                colors={[colors.primary + '33', 'transparent']}
                style={styles.headerBackground}
            />

            <Animated.ScrollView 
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={styles.listScroll}
            >
                <Animated.View style={animatedHeaderStyle}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: colors.text }]}>Arena Social</Text>
                                <View style={styles.mainTabs}>
                                    <Pressable onPress={() => setActiveTab('leaderboard')} style={[styles.mainTab, activeTab === 'leaderboard' && { borderBottomColor: colors.primary }]}>
                                        <Text style={[styles.mainTabText, { color: activeTab === 'leaderboard' ? colors.primary : colors.subtext }]}>Líderes</Text>
                                    </Pressable>
                                    <Pressable onPress={() => setActiveTab('groups')} style={[styles.mainTab, activeTab === 'groups' && { borderBottomColor: colors.primary }]}>
                                        <Text style={[styles.mainTabText, { color: activeTab === 'groups' ? colors.primary : colors.subtext }]}>Grupos</Text>
                                    </Pressable>
                                </View>
                            </View>
                            <View style={styles.headerActions}>
                                {activeTab === 'groups' && (
                                    <Pressable onPress={() => setIsGroupModalVisible(true)} style={[styles.actionBtn, { backgroundColor: colors.primary + '22' }]}>
                                        <Ionicons name="add-circle" size={24} color={colors.primary} />
                                    </Pressable>
                                )}
                                <Animated.View style={[styles.addBtnContainer, animatedGlowStyle]}>
                                    <Pressable onPress={() => setIsModalVisible(true)}>
                                        <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.addBtnGradient}>
                                            <Ionicons name="person-add" size={22} color="#000" />
                                        </LinearGradient>
                                    </Pressable>
                                </Animated.View>
                            </View>
                        </View>
                    </View>

                    {activeTab === 'leaderboard' && (
                        <View style={styles.tabContainer}>
                            {[
                                { id: 'km', icon: 'map', label: 'Exploração' },
                                { id: 'money', icon: 'coins', label: 'Fortuna' },
                                { id: 'level', icon: 'star', label: 'Nível' }
                            ].map(tab => {
                                const isActive = activeRank === tab.id;
                                return (
                                    <Pressable 
                                        key={tab.id}
                                        onPress={() => setActiveRank(tab.id as RankType)}
                                        style={styles.tabWrapper}
                                    >
                                        {isActive ? (
                                            <LinearGradient
                                                colors={[colors.primary, colors.primary + '99']}
                                                style={styles.tabActiveGradient}
                                            >
                                                <FontAwesome5 name={tab.icon} size={12} color={isDarkMode ? '#000' : '#FFF'} />
                                                <Text style={[styles.tabText, { color: isDarkMode ? '#000' : '#FFF' }]}>{tab.label}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <View style={[styles.tab, { backgroundColor: colors.card }]}>
                                                <FontAwesome5 name={tab.icon} size={12} color={colors.subtext} />
                                                <Text style={[styles.tabText, { color: colors.subtext }]}>{tab.label}</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </Animated.View>

                {activeTab === 'leaderboard' ? (
                    <>
                        <Animated.View style={[styles.podiumContainer, animatedPodiumStyle]}>
                            <View style={styles.podiumRow}>
                                {leaderboard.length >= 3 && [leaderboard[1], leaderboard[0], leaderboard[2]].map((item, index) => {
                                    const realRank = index === 0 ? 2 : index === 1 ? 1 : 3;
                                    const pedestalHeight = realRank === 1 ? 110 : realRank === 2 ? 85 : 65;
                                    const medalColor = getMedalColor(realRank - 1);
                                    return (
                                        <View key={item.id} style={styles.podiumItem}>
                                            {realRank === 1 && (
                                                <LinearGradient
                                                    colors={[medalColor + '22', medalColor + '00']}
                                                    style={styles.championHalo}
                                                />
                                            )}
                                            <View style={[styles.avatarContainer, { borderColor: medalColor, bottom: pedestalHeight + 10 }]}>
                                                {realRank === 1 && (
                                                    <View style={styles.crownContainer}>
                                                        <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
                                                    </View>
                                                )}
                                                <Text style={styles.podiumEmoji}>{item.species}</Text>
                                            </View>
                                            <View style={[styles.pedestal, { height: pedestalHeight, backgroundColor: colors.card, borderColor: medalColor, borderTopWidth: 4 }]}>
                                                <Text style={[styles.rankNumberSmall, { color: medalColor }]}>{realRank}</Text>
                                                <Text numberOfLines={1} style={[styles.podiumName, { color: colors.text }]}>{item.name}</Text>
                                                <Text style={[styles.podiumValue, { color: colors.primary }]}>{getVal(item)}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <LinearGradient
                                colors={[colors.background + '00', colors.background]}
                                style={styles.podiumFade}
                            />
                        </Animated.View>

                        <View style={styles.listContainer}>
                            {leaderboard.slice(3).map((item, index) => (
                                <View key={item.id} style={[styles.rankCard, { backgroundColor: colors.card, borderColor: item.isMe ? colors.primary : colors.border }]}>
                                    <LinearGradient
                                        colors={[item.isMe ? colors.primary + '11' : 'transparent', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.cardGradient}
                                    />
                                    <Text style={[styles.rankNumber, { color: colors.subtext }]}>{index + 4}</Text>
                                    <View style={[styles.smallAvatar, { backgroundColor: isDarkMode ? '#333' : '#F0F0F0' }]}>
                                        <Text style={styles.smallEmoji}>{item.species}</Text>
                                    </View>
                                    <View style={styles.rankInfo}>
                                        <Text style={[styles.rankName, { color: colors.text }]}>{item.name} {item.isMe && '(Você)'}</Text>
                                        <Text style={[styles.rankWanderId, { color: colors.subtext }]}>{item.wanderId}</Text>
                                    </View>
                                    <Text style={[styles.rankVal, { color: colors.primary }]}>{getVal(item)}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    <View style={styles.groupsContainer}>
                        {groups.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="account-group-outline" size={80} color={colors.subtext + '44'} />
                                <Text style={[styles.emptyText, { color: colors.subtext }]}>Você ainda não fundou ou participa de nenhum grupo.</Text>
                                <Pressable onPress={() => setIsGroupModalVisible(true)} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
                                    <Text style={{ fontWeight: '900' }}>FUNDAR GRUPO</Text>
                                </Pressable>
                            </View>
                        ) : (
                            groups.map(g => (
                                <View key={g.id} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={[styles.groupIcon, { backgroundColor: colors.primary + '22' }]}>
                                        <FontAwesome5 name="users" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.groupName, { color: colors.text }]}>{g.name}</Text>
                                        <Text style={[styles.groupMembers, { color: colors.subtext }]}>{g.members.length} membros</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
                                </View>
                            ))
                        )}
                    </View>
                )}
            </Animated.ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isGroupModalVisible}
                onRequestClose={() => setIsGroupModalVisible(false)}
            >
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Fundar Grupo 🏘️</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1A1A' : '#FFF' }]}
                            value={groupNameInput}
                            onChangeText={setGroupNameInput}
                            placeholder="Nome do seu Clã"
                            placeholderTextColor={colors.subtext}
                        />
                        <View style={styles.modalButtons}>
                            <Pressable onPress={() => setIsGroupModalVisible(false)} style={styles.modalBtn}>
                                <Text style={{ color: colors.subtext, fontWeight: '700' }}>Sair</Text>
                            </Pressable>
                            <Pressable onPress={handleCreateGroup} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                                <Text style={{ color: isDarkMode ? '#000' : '#FFF', fontWeight: '900' }}>Fundar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
    header: { padding: 24, paddingBottom: 10 },
    headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, fontWeight: '700', marginTop: 4, opacity: 0.8 },
    
    addBtnContainer: { elevation: 8, shadowColor: '#FFA500', shadowOpacity: 0.4, shadowRadius: 10 },
    addBtnGradient: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

    mainTabs: { flexDirection: 'row', gap: 20, marginTop: 10 },
    mainTab: { paddingBottom: 6, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    mainTabText: { fontSize: 16, fontWeight: '900' },

    groupsContainer: { padding: 20 },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 15 },
    emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '600', opacity: 0.7 },
    createBtn: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 15 },

    groupCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, borderWidth: 2, marginBottom: 12, elevation: 4 },
    groupIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    groupName: { fontSize: 18, fontWeight: '900' },
    groupMembers: { fontSize: 12, fontWeight: '700' },
    
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', maxWidth: 400, padding: 25, borderRadius: 32, borderWidth: 2, elevation: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
    modalInput: { width: '100%', height: 55, borderRadius: 16, borderWidth: 2, paddingHorizontal: 20, fontSize: 16, fontWeight: '700', marginBottom: 20 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 15, marginTop: 10, justifyContent: 'center' },
    tabWrapper: { flex: 0, minWidth: 100 },
    tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 6, elevation: 2 },
    tabActiveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, gap: 6, elevation: 4 },
    tabText: { fontSize: 11, fontWeight: '800' },
    
    podiumContainer: { paddingHorizontal: 10, height: 210, marginBottom: 10 },
    podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', flex: 1, zIndex: 1 },
    podiumItem: { alignItems: 'center', flex: 1, position: 'relative', justifyContent: 'flex-end' },
    championHalo: { position: 'absolute', top: 35, width: 100, height: 100, borderRadius: 50, zIndex: 0 },
    podiumFade: { position: 'absolute', bottom: -10, left: 0, right: 0, height: 60, zIndex: 2 },
    avatarContainer: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', position: 'absolute', zIndex: 2, elevation: 5 },
    podiumEmoji: { fontSize: 32 },
    crownContainer: { position: 'absolute', top: -22, zIndex: 3 },
    pedestal: { width: '90%', borderTopLeftRadius: 15, borderTopRightRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 4 },
    rankNumberSmall: { fontSize: 18, fontWeight: '900', opacity: 0.5, marginBottom: 2 },
    podiumName: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
    podiumValue: { fontSize: 10, fontWeight: '800', marginTop: 2 },
    
    listScroll: { paddingBottom: 140 },
    listContainer: { paddingHorizontal: 20 },
    rankCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 24, borderWidth: 2, marginBottom: 12, elevation: 2, overflow: 'hidden' },
    cardGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    rankNumber: { fontSize: 14, fontWeight: '900', width: 25 },
    smallAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    smallEmoji: { fontSize: 22 },
    rankInfo: { flex: 1 },
    rankName: { fontSize: 15, fontWeight: '900' },
    rankWanderId: { fontSize: 10, fontWeight: '700', marginTop: 1, opacity: 0.7 },
    rankVal: { fontSize: 14, fontWeight: '900' },
});
