import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PetPreview } from '../components/PetPreview';
import { ProfileView } from '../components/ProfileView';
import { useTheme } from '../components/ThemeContext';
import {
    getGhostModeLocal,
    getCurrentUserLocal,
    getLikesLocal,
    toggleLikeLocal,
    getPetLocal,
    LocalPet
} from '../localDatabase';
import { ChatMessage, FriendRequest } from '../types/social';
import { AuthService } from '../services/AuthService';
import { supabase } from '../services/supabaseConfig';
import { NearbyWeb } from '../components/NearbyWeb';

export default function SocialScreen() {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    const { tab } = useLocalSearchParams<{ tab?: string }>();
    const [activeTopTab, setActiveTopTab] = useState<'perfil' | 'social' | 'clas'>(tab === 'perfil' ? 'perfil' : 'social');
    const [activeSocialSubTab, setActiveSocialSubTab] = useState<'amigos' | 'recomendados' | 'inbox'>('amigos');
    const [activeClansSubTab, setActiveClansSubTab] = useState<'meus' | 'buscar'>('meus');

    const [circles, setCircles] = useState<any[]>([]);
    const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [isPassModalVisible, setIsPassModalVisible] = useState(false);
    const [isAddFriendModalVisible, setIsAddFriendModalVisible] = useState(false);

    const [circleName, setCircleName] = useState('');
    const [newClanPassword, setNewClanPassword] = useState('');
    const [isPublicNewClan, setIsPublicNewClan] = useState(false);

    const [passAttempt, setPassAttempt] = useState('');
    const [friendId, setFriendId] = useState('');

    const [socialSearch, setSocialSearch] = useState('');
    const [nearbyExplorers, setNearbyExplorers] = useState<any[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [recommendationLinks, setRecommendationLinks] = useState<any[]>([]);
    const [clansSearch, setClansSearch] = useState('');

    const [isChatVisible, setIsChatVisible] = useState(false);
    const [chatTarget, setChatTarget] = useState<{ id: string, name: string, avatar?: string | null } | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatScrollRef = useRef<ScrollView>(null);
    const chatSubscription = useRef<any>(null);

    const [isAvatarZoomVisible, setIsAvatarZoomVisible] = useState(false);
    const [isMemberCardVisible, setIsMemberCardVisible] = useState(false);
    const [activePreviewMember, setActivePreviewMember] = useState<any>(null);
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [userLocationName, setUserLocationName] = useState<string>('Localizando...');
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [isGhostMode, setIsGhostMode] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [pet, setPet] = useState<LocalPet | null>(null);

    const loadLikes = async () => {
        const likes = await getLikesLocal();
        setLikedIds(likes);
    };

    const loadSocialData = async () => {
        try {
            const loggedUser = await getCurrentUserLocal();
            if (!loggedUser) return;
            setUser(loggedUser);

            const localPet = await getPetLocal();
            setPet(localPet);

            const cloudLikes = await AuthService.getLikesCloud(loggedUser.id);
            setLikedIds(cloudLikes);

            const friends = await AuthService.getFriendsCloud(loggedUser.id);
            setFriendIds(friends);

            const cloudGroups = await AuthService.getGroups();
            const formattedCircles = cloudGroups.map((g: any) => ({
                id: g.id,
                name: g.name,
                isPublic: g.is_public,
                password: g.password,
                members: g.group_members.map((gm: any) => gm.profiles)
            }));
            setCircles(formattedCircles);

            const cloudRequests = await AuthService.getPendingRequestsCloud(loggedUser.id);
            const formattedRequests = cloudRequests.map((r: any) => ({
                id: r.id,
                fromId: r.user_id1,
                fromName: r.profiles?.name || 'Explorador',
                fromAvatar: r.profiles?.avatar,
                toId: 'me',
                status: 'pending'
            }));
            setFriendRequests(formattedRequests as any);
            
            const ghost = await getGhostModeLocal();
            setIsGhostMode(ghost);
        } catch (err) {
            console.error("Erro ao carregar dados sociais da nuvem:", err);
        }
    };

    const setupBattery = async () => {
        const level = await Battery.getBatteryLevelAsync();
        setBatteryLevel(Math.round(level * 100));
    };

    const setupLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const [addr] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
            if (addr) {
                const name = addr.street || addr.district || addr.region || 'Desconhecido';
                setUserLocationName(name);
            }
        } catch (e) {}
    };

    useFocusEffect(
        React.useCallback(() => {
            loadLikes();
            setupBattery();
            setupLocation();
            loadSocialData();
        }, [])
    );

    const handleToggleLike = async (targetId: string) => {
        const loggedUser = await getCurrentUserLocal();
        if (!loggedUser) return;
        try {
            const isLiked = await AuthService.toggleLikeCloud(loggedUser.id, targetId);
            setLikedIds(prev => isLiked ? [...prev, targetId] : prev.filter(id => id !== targetId));
        } catch (error) {}
    };

    const handleSendRequest = async (targetUser: any) => {
        try {
            const me = await getCurrentUserLocal();
            if (!me) return;
            await AuthService.addFriendCloud(me.id, targetUser.id);
            Alert.alert('Sucesso', `Solicitação enviada para ${targetUser.name || 'Explorador'}!`);
            loadSocialData();
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível enviar a solicitação.');
        }
    };

    const handleRespondRequest = async (requestId: string, status: 'accepted' | 'declined') => {
        try {
            await AuthService.respondFriendRequestCloud(requestId, status);
            Alert.alert(status === 'accepted' ? 'Aceito!' : 'Recusado');
            loadSocialData();
        } catch (e) {}
    };

    const handleRecommend = async (targetId: string) => {
        const loggedUser = await getCurrentUserLocal();
        if (!loggedUser) return;
        try {
            const success = await AuthService.recommendUser(loggedUser.id, targetId);
            if (success) {
                Alert.alert("Recomendado!", "Você adicionou um elo de confiança.");
                if (activeSocialSubTab === 'recomendados') {
                    const { explorers, links } = await AuthService.getRecommendationWeb(loggedUser.id);
                    setNearbyExplorers(explorers);
                    setRecommendationLinks(links);
                }
            }
        } catch (error) {}
    };

    const activeCircle = circles.find(c => c.id === selectedCircleId);

    const loadChat = async (target: { id: string, name: string }) => {
        const user = await getCurrentUserLocal();
        if (!user) return;
        const msgs = await AuthService.fetchMessages(user.id, target.id);
        const formatted = msgs.map((m: any) => ({
            id: m.id,
            senderId: m.sender_id === user.id ? 'me' : m.sender_id,
            receiverId: m.receiver_id === user.id ? 'me' : m.receiver_id,
            text: m.text,
            timestamp: new Date(m.created_at).getTime()
        }));
        setChatMessages(formatted as any);
    };

    const handleOpenChat = async (id: string, name: string, avatar?: string | null) => {
        setChatTarget({ id, name, avatar });
        setIsChatVisible(true);
        await loadChat({ id, name });
        const user = await getCurrentUserLocal();
        if (user) {
            if (chatSubscription.current) supabase.removeChannel(chatSubscription.current);
            chatSubscription.current = AuthService.subscribeToMessages(user.id, id, (newMsg) => {
                setChatMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, {
                        id: newMsg.id,
                        senderId: newMsg.sender_id === user.id ? 'me' : newMsg.sender_id,
                        receiverId: newMsg.receiver_id === user.id ? 'me' : newMsg.receiver_id,
                        text: newMsg.text,
                        timestamp: new Date(newMsg.created_at).getTime()
                    } as any];
                });
            });
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !chatTarget) return;
        const txt = chatInput.trim();
        setChatInput('');
        const user = await getCurrentUserLocal();
        if (user) await AuthService.sendMessageCloud(user.id, chatTarget.id, txt);
    };

    const handleShare = async () => {
        try {
            const currentLoc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = currentLoc.coords;
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            const message = `WanderPet: Localização: ${mapLink}`;
            if (Platform.OS === 'web') {
                if (navigator.share) await navigator.share({ title: 'Minha Localização', text: message, url: mapLink });
                else {
                    await navigator.clipboard.writeText(mapLink);
                    Alert.alert('Link Copiado!');
                }
            } else await Share.share({ message });
        } catch (e) {}
    };

    const handleCreateCircle = async () => {
        if (!circleName.trim()) return;
        const user = await getCurrentUserLocal();
        if (!user) return;
        try {
            await AuthService.createGroup(circleName.trim(), user.id, newClanPassword || undefined, isPublicNewClan);
            setCircleName('');
            setNewClanPassword('');
            setIsPublicNewClan(false);
            setIsCreateModalVisible(false);
            loadSocialData();
        } catch (e) {}
    };

    const handleVerifyPassword = () => {
        if (!activeCircle) return;
        if (passAttempt === activeCircle.password) {
            setIsPassModalVisible(false);
            setPassAttempt('');
            const isMember = activeCircle.members.some((m: any) => m.id === 'me');
            if (!isMember) handleJoinCircle(activeCircle.id);
            setIsDetailModalVisible(true);
        } else Alert.alert('Senha Incorreta');
    };

    const handleJoinCircle = async (circleId: string) => {
        const user = await getCurrentUserLocal();
        if (!user) return;
        try {
            await AuthService.joinGroup(circleId, user.id);
            loadSocialData();
        } catch (e) {}
    };

    useEffect(() => {
        if (activeSocialSubTab === 'recomendados' && activeTopTab === 'social') {
            const loadNearby = async () => {
                setIsLoadingNearby(true);
                const user = await getCurrentUserLocal();
                if (user) {
                    const { explorers, links } = await AuthService.getRecommendationWeb(user.id);
                    setNearbyExplorers(explorers);
                    setRecommendationLinks(links);
                }
                setIsLoadingNearby(false);
            };
            loadNearby();
        }
    }, [activeSocialSubTab, activeTopTab]);

    const allMembersMap = new Map();
    circles.forEach((c: any) => {
        if (c && c.members) {
            c.members.forEach((m: any) => {
                if (m && m.id && !allMembersMap.has(m.id)) allMembersMap.set(m.id, m);
            });
        }
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.topNavRow}>
                <Pressable onPress={() => router.back()} style={styles.univBackBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <View style={[styles.topTabBar, { flex: 1, marginHorizontal: 0 }]}>
                    <Pressable onPress={() => setActiveTopTab('perfil')} style={[styles.topTabBtn, activeTopTab === 'perfil' && { backgroundColor: colors.primary }]}>
                        <Text style={[styles.topTabText, activeTopTab === 'perfil' ? { color: '#FFF' } : { color: colors.subtext }]}>Meu Perfil</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTopTab('social')} style={[styles.topTabBtn, activeTopTab === 'social' && { backgroundColor: colors.primary }]}>
                        <Text style={[styles.topTabText, activeTopTab === 'social' ? { color: '#FFF' } : { color: colors.subtext }]}>Social</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTopTab('clas')} style={[styles.topTabBtn, activeTopTab === 'clas' && { backgroundColor: colors.primary }]}>
                        <Text style={[styles.topTabText, activeTopTab === 'clas' ? { color: '#FFF' } : { color: colors.subtext }]}>Clãs</Text>
                    </Pressable>
                </View>
            </View>

            {activeTopTab === 'perfil' && <ScrollView style={{ flex: 1 }}><ProfileView /></ScrollView>}

            {activeTopTab === 'social' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={{ marginLeft: 16 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text, outlineStyle: 'none' } as any]}
                            placeholder="Buscar amigos..."
                            placeholderTextColor={colors.subtext}
                            value={socialSearch}
                            onChangeText={setSocialSearch}
                        />
                        <Pressable style={styles.searchActionBtn} onPress={() => setIsAddFriendModalVisible(true)}>
                            <Ionicons name="person-add" size={18} color="#FFF" />
                        </Pressable>
                    </View>

                    <View style={styles.subTabBar}>
                        <Pressable onPress={() => setActiveSocialSubTab('amigos')} style={[styles.subTabBtn, activeSocialSubTab === 'amigos' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeSocialSubTab === 'amigos' ? colors.primary : colors.subtext }]}>Amigos</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveSocialSubTab('recomendados')} style={[styles.subTabBtn, activeSocialSubTab === 'recomendados' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeSocialSubTab === 'recomendados' ? colors.primary : colors.subtext }]}>Teia Wander</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveSocialSubTab('inbox')} style={[styles.subTabBtn, activeSocialSubTab === 'inbox' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeSocialSubTab === 'inbox' ? colors.primary : colors.subtext }]}>Inbox</Text>
                        </Pressable>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.membersSection}>
                        {[...allMembersMap.values()]
                            .filter(m => m.id !== user?.id)
                            .filter(m => m.name?.toLowerCase().includes(socialSearch.toLowerCase()))
                            .map(member => (
                                <View key={member.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                                    <View style={[styles.memberAvatar, { backgroundColor: colors.accent }]}>
                                        <PetPreview species={member.species || 'bunny'} size={40} customImageUri={member.avatar} />
                                        <View style={[styles.presenceCircle, { backgroundColor: member.online ? '#4CAF50' : '#888', borderColor: colors.background }]} />
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                                        <Text style={[styles.memberSince, { color: colors.subtext }]}>Wander-ID: #{member.wander_id}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <Pressable onPress={() => handleOpenChat(member.id, member.name, member.avatar)}>
                                            <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                                        </Pressable>
                                        <Pressable onPress={() => handleToggleLike(member.id)}>
                                            <Ionicons name={likedIds.includes(member.id) ? "heart" : "heart-outline"} size={22} color="#E74C3C" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                    </ScrollView>
                </View>
            )}

            {activeTopTab === 'clas' && (
                <ScrollView style={{ flex: 1 }}>
                    <View style={styles.subTabBar}>
                        <Pressable onPress={() => setActiveClansSubTab('meus')} style={[styles.subTabBtn, activeClansSubTab === 'meus' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeClansSubTab === 'meus' ? colors.primary : colors.subtext }]}>Meus Clãs</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveClansSubTab('buscar')} style={[styles.subTabBtn, activeClansSubTab === 'buscar' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeClansSubTab === 'buscar' ? colors.primary : colors.subtext }]}>Buscar</Text>
                        </Pressable>
                    </View>
                    {circles.map(circle => (
                        <Pressable key={circle.id} style={[styles.circleRow, { borderBottomColor: colors.border }]} onPress={() => { setSelectedCircleId(circle.id); setIsDetailModalVisible(true); }}>
                            <View style={styles.circleAvatars}><View style={[styles.stackedAvatar, { backgroundColor: colors.accent }]}><Text style={{ color: colors.primary, fontWeight: '800' }}>{circle.name[0]}</Text></View></View>
                            <View style={{ flex: 1 }}><Text style={[styles.circleName, { color: colors.text }]}>{circle.name}</Text><Text style={{ fontSize: 11, color: colors.subtext }}>{circle.members.length} membros</Text></View>
                            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                        </Pressable>
                    ))}
                    <Pressable style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleShare}>
                        <View style={{ flex: 1 }}><Text style={[styles.shareTitle, { color: colors.text }]}>Convidar via link</Text><Text style={[styles.shareSub, { color: colors.subtext }]}>Compartilhe sua localização sem conta</Text></View>
                        <Ionicons name="share-social-outline" size={22} color={colors.primary} />
                    </Pressable>
                </ScrollView>
            )}

            <Modal visible={isChatVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={styles.header}><Pressable onPress={() => setIsChatVisible(false)}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable><Text style={[styles.title, { color: colors.text }]}>{chatTarget?.name}</Text><View style={{ width: 24 }} /></View>
                    <ScrollView style={{ flex: 1, padding: 20 }} ref={chatScrollRef} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd()}>{chatMessages.map(m => (<View key={m.id} style={{ alignSelf: m.senderId === 'me' ? 'flex-end' : 'flex-start', backgroundColor: m.senderId === 'me' ? colors.primary : colors.accent, padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '80%' }}><Text style={{ color: m.senderId === 'me' ? '#FFF' : colors.text }}>{m.text}</Text></View>))}</ScrollView>
                    <View style={{ padding: 20, flexDirection: 'row', gap: 10 }}><TextInput style={[styles.modalInput, { flex: 1, color: colors.text, backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5' }]} value={chatInput} onChangeText={setChatInput} placeholder="Digite algo..." placeholderTextColor={colors.subtext} /><Pressable onPress={handleSendMessage} style={{ width: 45, height: 45, backgroundColor: colors.primary, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="send" size={20} color="#FFF" /></Pressable></View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    topNavRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 12, marginBottom: 12, gap: 12 },
    univBackBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    topTabBar: { flex: 1, height: 42, flexDirection: 'row', borderRadius: 21, padding: 3, borderWidth: 1, borderColor: '#33334020' },
    topTabBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
    topTabText: { fontWeight: '700', fontSize: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    title: { fontSize: 20, fontWeight: '800' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 15, borderRadius: 20, backgroundColor: '#33334010', paddingHorizontal: 12 },
    searchInput: { flex: 1, height: 45, fontSize: 14 },
    searchActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
    subTabBar: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, gap: 10 },
    subTabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    subTabText: { fontSize: 12, fontWeight: '700' },
    membersSection: { paddingHorizontal: 20, paddingBottom: 40 },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
    memberAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    presenceCircle: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700' },
    memberSince: { fontSize: 12, marginTop: 2 },
    circleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, gap: 12 },
    circleAvatars: { flexDirection: 'row' },
    stackedAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    circleName: { fontSize: 15, fontWeight: '600' },
    shareCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 20, padding: 15, borderRadius: 15, borderWidth: 1, gap: 12 },
    shareTitle: { fontSize: 14, fontWeight: '700' },
    shareSub: { fontSize: 11, marginTop: 2 },
    modalInput: { borderRadius: 12, paddingHorizontal: 15, height: 45 },
});
