import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View, Animated, Image } from 'react-native';
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
    const [activeSocialSubTab, setActiveSocialSubTab] = useState<'recomendados' | 'inbox'>('recomendados');
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
    const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);

    const [isChatVisible, setIsChatVisible] = useState(false);
    const [chatTarget, setChatTarget] = useState<{ id: string, name: string, avatar?: string | null } | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatScrollRef = useRef<ScrollView>(null);
    const chatSubscription = useRef<any>(null);

    const [isAvatarZoomVisible, setIsAvatarZoomVisible] = useState(false);
    const [activeClanDetailTab, setActiveClanDetailTab] = useState<'membros' | 'chat'>('membros');
    const [clanChatInput, setClanChatInput] = useState('');
    const [clanChatMessages, setClanChatMessages] = useState<Record<string, ChatMessage[]>>({});
    const clanChatScrollRef = useRef<ScrollView>(null);
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
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'decline'>('success');
    const toastAnim = useRef(new Animated.Value(0)).current;

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

            const cloudGroups = await AuthService.getGroups(loggedUser.id);
            const formattedCircles = cloudGroups.map((g: any) => ({
                id: g.id,
                name: g.name,
                isPublic: g.is_public,
                password: g.password,
                adminId: g.admin_id,
                description: g.description,
                avatar: g.avatar,
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
        if (sentRequestIds.includes(targetUser.id)) return;
        try {
            const me = await getCurrentUserLocal();
            if (!me) return;
            setSentRequestIds(prev => [...prev, targetUser.id]);
            await AuthService.addFriendCloud(me.id, targetUser.id);
            showToast(`Solicitação enviada para ${targetUser.name || 'Explorador'}! 🚀`, 'success');
            loadSocialData();
        } catch (e) {
            setSentRequestIds(prev => prev.filter(id => id !== targetUser.id));
            showToast('Erro ao enviar solicitação', 'decline');
        }
    };

    const showToast = (msg: string, type: 'success' | 'decline') => {
        setToastMsg(msg);
        setToastType(type);
        toastAnim.setValue(0);
        Animated.sequence([
            Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
            Animated.delay(1800),
            Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true })
        ]).start(() => setToastMsg(null));
    };

    const handleRespondRequest = async (requestId: string, status: 'accepted' | 'declined') => {
        try {
            // Optimistic: remove from local state immediately
            setFriendRequests(prev => prev.filter(r => r.id !== requestId));
            
            await AuthService.respondFriendRequestCloud(requestId, status);
            if (status === 'accepted') {
                showToast('Amizade aceita! 🎉', 'success');
            } else {
                showToast('Solicitação recusada', 'decline');
            }
            // Refresh all social data (friends list, requests, etc.)
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

    const handleShareProfile = async () => {
        try {
            const me = await getCurrentUserLocal();
            if (!me) return;
            const wanderId = me.wanderId || '#WP-???';
            const deepLink = `wanderpet://add-friend/${me.id}`;
            const message = `🐾 Me adicione no WanderPet!\n\nMeu Wander-ID: ${wanderId}\n\nLink direto: ${deepLink}\n\nBaixe o app e explore comigo!`;
            if (Platform.OS === 'web') {
                if (navigator.share) await navigator.share({ title: 'Adicione-me no WanderPet', text: message });
                else {
                    await navigator.clipboard.writeText(message);
                    showToast('Link copiado! 📋', 'success');
                }
            } else {
                await Share.share({ message });
            }
            showToast('Convite compartilhado! 🎉', 'success');
        } catch (e) {}
    };

    const handleShareClan = async (clan: any) => {
        try {
            const me = await getCurrentUserLocal();
            if (!me) return;
            const deepLink = `wanderpet://join-clan/${clan.id}`;
            const message = `⚔️ Entre no clã "${clan.name}" no WanderPet!\n\n${clan.members?.length || 0} membros ativos\n\nLink direto: ${deepLink}\n\nVenha explorar com a gente!`;
            
            // Auto-join the user if not already a member
            const isMember = clan.members?.some((m: any) => m.id === me.id);
            if (!isMember) {
                await handleJoinCircle(clan.id);
            }

            if (Platform.OS === 'web') {
                if (navigator.share) await navigator.share({ title: `Clã ${clan.name}`, text: message });
                else {
                    await navigator.clipboard.writeText(message);
                    showToast('Link do clã copiado! 📋', 'success');
                    return;
                }
            } else {
                await Share.share({ message });
            }
            showToast(`Convite do clã compartilhado! ⚔️`, 'success');
        } catch (e) {}
    };

    const handleCreateCircle = async () => {
        if (!circleName.trim()) return;
        const u = await getCurrentUserLocal();
        if (!u) return;
        try {
            await AuthService.createGroup(circleName.trim(), u.id, newClanPassword || undefined, isPublicNewClan);
            setCircleName('');
            setNewClanPassword('');
            setIsPublicNewClan(false);
            setIsCreateModalVisible(false);
            showToast('Clã criado com sucesso! ⚔️', 'success');
            await loadSocialData();
            setActiveClansSubTab('meus');
        } catch (e) {
            showToast('Erro ao criar clã', 'decline');
        }
    };

    const handleVerifyPassword = () => {
        if (!activeCircle) return;
        if (passAttempt === activeCircle.password) {
            setIsPassModalVisible(false);
            setPassAttempt('');
            const isMember = activeCircle.members.some((m: any) => m.id === user?.id);
            if (!isMember) handleJoinCircle(activeCircle.id);
            setIsDetailModalVisible(true);
        } else {
            showToast('Senha incorreta', 'decline');
        }
    };

    const handleJoinCircle = async (circleId: string) => {
        const u = await getCurrentUserLocal();
        if (!u) return;
        try {
            await AuthService.joinGroup(circleId, u.id);
            await loadSocialData();
            setActiveClansSubTab('meus');
        } catch (e) {}
    };

    const handleSendClanMessage = async () => {
        if (!clanChatInput.trim() || !activeCircle) return;
        const u = await getCurrentUserLocal();
        if (!u) return;
        
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: 'me',
            recipientId: activeCircle.id,
            text: clanChatInput.trim(),
            timestamp: Date.now() as any
        };

        setClanChatMessages(prev => {
            const messages = prev[activeCircle.id] || [];
            return {
                ...prev,
                [activeCircle.id]: [...messages, newMessage]
            };
        });
        
        setClanChatInput('');
        setTimeout(() => clanChatScrollRef.current?.scrollToEnd(), 100);
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
                        <Text style={[styles.topTabText, activeTopTab === 'social' ? { color: '#FFF' } : { color: colors.subtext }]}>Adicionar</Text>
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
                            placeholder={activeSocialSubTab === 'recomendados' ? 'Descobrir exploradores...' : 'Buscar solicitações...'}
                            placeholderTextColor={colors.subtext}
                            value={socialSearch}
                            onChangeText={setSocialSearch}
                        />
                        <Pressable style={styles.searchActionBtn} onPress={() => setIsAddFriendModalVisible(true)}>
                            <Ionicons name="person-add" size={18} color="#FFF" />
                        </Pressable>
                    </View>

                    <View style={styles.subTabBar}>
                        <Pressable onPress={() => setActiveSocialSubTab('recomendados')} style={[styles.subTabBtn, activeSocialSubTab === 'recomendados' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeSocialSubTab === 'recomendados' ? colors.primary : colors.subtext }]}>Recomendados</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveSocialSubTab('inbox')} style={[styles.subTabBtn, activeSocialSubTab === 'inbox' && { backgroundColor: colors.accent, position: 'relative' }]}>
                            <Text style={[styles.subTabText, { color: activeSocialSubTab === 'inbox' ? colors.primary : colors.subtext }]}>Inbox</Text>
                            {friendRequests.some(r => r.toId === 'me' && r.status === 'pending') && (
                                <View style={{ position: 'absolute', top: 2, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' }} />
                            )}
                        </Pressable>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
                        {activeSocialSubTab === 'recomendados' ? (
                            <View style={styles.membersSection}>
                                {/* Card de Compartilhar Perfil */}
                                <Pressable
                                    onPress={handleShareProfile}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 14,
                                        backgroundColor: pressed ? colors.primary + '20' : colors.primary + '10',
                                        borderWidth: 1,
                                        borderColor: colors.primary + '30',
                                        borderRadius: 18,
                                        paddingHorizontal: 18,
                                        paddingVertical: 14,
                                        marginBottom: 20
                                    })}
                                >
                                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="share-social" size={22} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>Compartilhar meu perfil</Text>
                                        <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>Envie seu link e vire amigo automaticamente</Text>
                                    </View>
                                    <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
                                </Pressable>

                                {isLoadingNearby ? (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                                        <Text style={{ color: colors.subtext }}>Buscando conexões...</Text>
                                    </View>
                                ) : nearbyExplorers.length > 0 ? (
                                    nearbyExplorers
                                        .filter(m => {
                                            if (!m) return false;
                                            const q = socialSearch.toLowerCase();
                                            const nameMatch = m.name?.toLowerCase().includes(q);
                                            const idMatch = m.wander_id?.toLowerCase().includes(q) || m.id?.toLowerCase().includes(q);
                                            return nameMatch || idMatch;
                                        })
                                        .map(member => {
                                            if (!member) return null;
                                            return (
                                                <View key={member.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                                                    <View style={[styles.memberAvatar, { backgroundColor: colors.accent }]}>
                                                        {member?.species ? (
                                                            <PetPreview species={member.species} size={40} customImageUri={member.avatar} />
                                                        ) : (
                                                            <Ionicons name="person" size={22} color={colors.primary} />
                                                        )}
                                                    </View>
                                                    <View style={styles.memberInfo}>
                                                        <Text style={[styles.memberName, { color: colors.text }]}>{member?.name}</Text>
                                                        <Text style={[styles.memberSince, { color: colors.subtext }]}>Wander-ID: {member?.wander_id}</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                                <Ionicons name="trending-up" size={10} color={colors.primary} />
                                                                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>Lv {member.level || 1}</Text>
                                                            </View>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                                <Ionicons name="paw" size={10} color={colors.subtext} />
                                                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext }}>{member.species || 'bunny'}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    <Pressable
                                                        onPress={() => handleSendRequest(member)}
                                                        disabled={sentRequestIds.includes(member.id)}
                                                        style={({ pressed }) => ({
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            backgroundColor: sentRequestIds.includes(member.id)
                                                                ? '#4ADE8022'
                                                                : pressed
                                                                    ? colors.primary + '90'
                                                                    : colors.primary,
                                                            paddingHorizontal: 14,
                                                            paddingVertical: 10,
                                                            borderRadius: 14
                                                        })}
                                                    >
                                                        <Ionicons
                                                            name={sentRequestIds.includes(member.id) ? 'checkmark-circle' : 'person-add'}
                                                            size={16}
                                                            color={sentRequestIds.includes(member.id) ? '#4ADE80' : '#FFF'}
                                                        />
                                                        <Text style={{
                                                            color: sentRequestIds.includes(member.id) ? '#4ADE80' : '#FFF',
                                                            fontWeight: '800',
                                                            fontSize: 11
                                                        }}>
                                                            {sentRequestIds.includes(member.id) ? 'Enviado' : 'Adicionar'}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            );
                                        })
                                ) : (
                                    <View style={{ justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                                        <Text style={{ fontSize: 40, marginBottom: 20 }}>🔭</Text>
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>O horizonte está vazio...</Text>
                                        <Text style={{ color: colors.subtext, marginTop: 8, textAlign: 'center' }}>
                                            Não encontramos outros exploradores por perto neste momento.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={{ flex: 1, paddingTop: 16 }}>
                                {friendRequests.filter(r => r.toId === 'me' && r.status === 'pending')
                                    .filter(r => {
                                        if (!socialSearch.trim()) return true;
                                        const q = socialSearch.toLowerCase();
                                        return r.fromName?.toLowerCase().includes(q) || r.fromId?.toLowerCase().includes(q);
                                    })
                                    .map(req => (
                                    <View key={req.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                                        <View style={[styles.memberAvatar, { backgroundColor: colors.accent }]}>
                                            {req.fromAvatar ? (
                                                <PetPreview species={'bunny'} size={40} customImageUri={req.fromAvatar} />
                                            ) : (
                                                <Ionicons name="person" size={22} color={colors.primary} />
                                            )}
                                        </View>
                                        <View style={styles.memberInfo}>
                                            <Text style={[styles.memberName, { color: colors.text }]}>{req.fromName}</Text>
                                            <Text style={[styles.memberSince, { color: colors.subtext }]}>Quer ser seu amigo!</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <Pressable
                                                onPress={() => handleRespondRequest(req.id, 'accepted')}
                                                style={({ pressed }) => ({
                                                    backgroundColor: pressed ? colors.primary + '44' : colors.primary + '22',
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 10,
                                                    borderRadius: 14,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6
                                                })}
                                            >
                                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                                                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>Aceitar</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => handleRespondRequest(req.id, 'declined')}
                                                style={({ pressed }) => ({
                                                    backgroundColor: pressed ? '#E74C3C44' : '#E74C3C15',
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 10,
                                                    borderRadius: 14,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6
                                                })}
                                            >
                                                <Ionicons name="close-circle" size={18} color="#E74C3C" />
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                                {friendRequests.filter(r => r.toId === 'me' && r.status === 'pending').length === 0 && (
                                    <View style={{ alignItems: 'center', paddingHorizontal: 40 }}>
                                        <Text style={{ fontSize: 40, marginBottom: 20 }}>🌵</Text>
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Silêncio absoluto por aqui...</Text>
                                        <Text style={{ color: colors.subtext, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                                            Até os grilos foram embora. Que tal quebrar o gelo e mandar uma solicitação para alguém?
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Toast Overlay */}
            {toastMsg && (
                <Animated.View style={{
                    position: 'absolute',
                    top: 80,
                    left: 20,
                    right: 20,
                    alignItems: 'center',
                    zIndex: 9999,
                    opacity: toastAnim,
                    transform: [{
                        translateY: toastAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-30, 0]
                        })
                    }, {
                        scale: toastAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1]
                        })
                    }]
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        backgroundColor: toastType === 'success' ? '#1A3A2A' : '#3A1A1A',
                        borderWidth: 1,
                        borderColor: toastType === 'success' ? '#4ADE8040' : '#FF444440',
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        borderRadius: 16,
                        elevation: 15,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.4,
                        shadowRadius: 12
                    }}>
                        <Ionicons
                            name={toastType === 'success' ? 'checkmark-circle' : 'close-circle'}
                            size={22}
                            color={toastType === 'success' ? '#4ADE80' : '#FF6B6B'}
                        />
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{toastMsg}</Text>
                    </View>
                </Animated.View>
            )}

            {activeTopTab === 'clas' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={{ marginLeft: 16 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text, outlineStyle: 'none' } as any]}
                            placeholder="Buscar clãs..."
                            placeholderTextColor={colors.subtext}
                            value={clansSearch}
                            onChangeText={setClansSearch}
                        />
                        <Pressable style={styles.searchActionBtn} onPress={() => setIsCreateModalVisible(true)}>
                            <Ionicons name="add" size={20} color="#FFF" />
                        </Pressable>
                    </View>
                    <View style={styles.subTabBar}>
                        <Pressable onPress={() => setActiveClansSubTab('meus')} style={[styles.subTabBtn, activeClansSubTab === 'meus' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeClansSubTab === 'meus' ? colors.primary : colors.subtext }]}>Meus Clãs</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveClansSubTab('buscar')} style={[styles.subTabBtn, activeClansSubTab === 'buscar' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeClansSubTab === 'buscar' ? colors.primary : colors.subtext }]}>Buscar</Text>
                        </Pressable>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                        {(() => {
                            const myClans = circles.filter(c => c.members?.some((m: any) => m.id === user?.id));
                            const otherClans = circles.filter(c => !c.members?.some((m: any) => m.id === user?.id));
                            const list = activeClansSubTab === 'meus' ? myClans : otherClans;
                            const filtered = list.filter(c => c.name?.toLowerCase().includes(clansSearch.toLowerCase()));
                            if (filtered.length === 0) {
                                return (
                                    <View style={{ alignItems: 'center', paddingHorizontal: 40, paddingTop: 50 }}>
                                        <Text style={{ fontSize: 40, marginBottom: 20 }}>{activeClansSubTab === 'meus' ? '🏰' : '🔍'}</Text>
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                                            {activeClansSubTab === 'meus' ? 'Nenhum clã ainda' : 'Nenhum clã encontrado'}
                                        </Text>
                                        <Text style={{ color: colors.subtext, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                                            {activeClansSubTab === 'meus' ? 'Crie seu primeiro clã ou entre em um existente!' : 'Tente buscar com outro nome.'}
                                        </Text>
                                    </View>
                                );
                            }
                            return filtered.map(circle => (
                                <View key={circle.id} style={[styles.circleRow, { borderBottomColor: colors.border }]}>
                                    <Pressable style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12, minWidth: 0 }} onPress={() => {
                                        if (!circle.isPublic && circle.password && activeClansSubTab === 'buscar') {
                                            setSelectedCircleId(circle.id);
                                            setIsPassModalVisible(true);
                                        } else {
                                            setSelectedCircleId(circle.id);
                                            setIsDetailModalVisible(true);
                                        }
                                    }}>
                                        <View style={[styles.stackedAvatar, { backgroundColor: colors.accent, overflow: 'hidden' }]}>
                                            {circle.avatar ? (
                                                <Image source={{ uri: circle.avatar }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} alt={circle.name} />
                                            ) : (
                                                <Text style={{ color: colors.primary, fontWeight: '800' }}>{circle.name[0]}</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={[styles.circleName, { color: colors.text }]} numberOfLines={1}>{circle.name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: circle.isPublic ? '#4ADE8018' : '#FF6B6B18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Ionicons name={circle.isPublic ? 'globe-outline' : 'lock-closed'} size={9} color={circle.isPublic ? '#4ADE80' : '#FF6B6B'} />
                                                    <Text style={{ fontSize: 9, fontWeight: '800', color: circle.isPublic ? '#4ADE80' : '#FF6B6B' }}>{circle.isPublic ? 'Aberto' : 'Privado'}</Text>
                                                </View>
                                                <Text style={{ fontSize: 11, color: colors.subtext }}>{circle.members?.length || 0} membros</Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                    {activeClansSubTab === 'meus' && (
                                        <Pressable onPress={() => handleShareClan(circle)} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 12, backgroundColor: pressed ? colors.primary + '30' : colors.primary + '15', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                                            <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                                        </Pressable>
                                    )}
                                    {activeClansSubTab === 'buscar' && (
                                        <Pressable onPress={() => {
                                            if (!circle.isPublic && circle.password) {
                                                setSelectedCircleId(circle.id);
                                                setIsPassModalVisible(true);
                                            } else {
                                                handleJoinCircle(circle.id);
                                                showToast(`Você entrou no clã ${circle.name}! ⚔️`, 'success');
                                            }
                                        }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: pressed ? colors.primary + '90' : colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, flexShrink: 0 })}>
                                            <Ionicons name="enter-outline" size={16} color="#FFF" />
                                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>Entrar</Text>
                                        </Pressable>
                                    )}
                                </View>
                            ));
                        })()}
                        {activeClansSubTab === 'meus' && (
                            <Pressable style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setIsCreateModalVisible(true)}>
                                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}><Text style={[styles.shareTitle, { color: colors.text }]}>Criar novo clã</Text><Text style={[styles.shareSub, { color: colors.subtext }]}>Forme sua tribo e explore junto!</Text></View>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Modal Criar Clã */}
            <Modal visible={isCreateModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
                    <Pressable style={{ flex: 1 }} onPress={() => setIsCreateModalVisible(false)} />
                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <Ionicons name="people" size={24} color={colors.primary} />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Criar Clã</Text>
                        </View>
                        <TextInput style={[styles.modalInput, { color: colors.text, borderWidth: 1, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }]} value={circleName} onChangeText={setCircleName} placeholder="Nome do clã" placeholderTextColor={colors.subtext} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', padding: 14, borderRadius: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name={isPublicNewClan ? 'globe-outline' : 'lock-closed'} size={18} color={isPublicNewClan ? '#4ADE80' : '#FF6B6B'} />
                                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{isPublicNewClan ? 'Clã Público' : 'Clã Privado'}</Text>
                            </View>
                            <Switch value={isPublicNewClan} onValueChange={setIsPublicNewClan} trackColor={{ true: '#4ADE80' }} thumbColor="#FFF" />
                        </View>
                        {!isPublicNewClan && (
                            <TextInput style={[styles.modalInput, { color: colors.text, borderWidth: 1, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA', marginTop: 12 }]} value={newClanPassword} onChangeText={setNewClanPassword} placeholder="Definir senha do clã" secureTextEntry placeholderTextColor={colors.subtext} />
                        )}
                        <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 8, fontWeight: '500' }}>
                            {isPublicNewClan ? 'Qualquer explorador pode entrar livremente.' : 'Apenas quem souber a senha poderá entrar.'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                            <Pressable onPress={() => setIsCreateModalVisible(false)} style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
                            </Pressable>
                            <Pressable onPress={handleCreateCircle} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Criar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Senha Clã Privado */}
            <Modal visible={isPassModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
                    <Pressable style={{ flex: 1 }} onPress={() => { setIsPassModalVisible(false); setPassAttempt(''); }} />
                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FF6B6B15', borderWidth: 1, borderColor: '#FF6B6B30', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <Ionicons name="lock-closed" size={24} color="#FF6B6B" />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Clã Privado</Text>
                            <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 4 }}>Insira a senha para entrar</Text>
                        </View>
                        <TextInput style={[styles.modalInput, { color: colors.text, borderWidth: 1, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }]} value={passAttempt} onChangeText={setPassAttempt} placeholder="Senha do clã" secureTextEntry placeholderTextColor={colors.subtext} />
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                            <Pressable onPress={() => { setIsPassModalVisible(false); setPassAttempt(''); }} style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Voltar</Text>
                            </Pressable>
                            <Pressable onPress={handleVerifyPassword} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Acessar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Detalhe Clã */}
            <Modal visible={isDetailModalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    {activeCircle && (
                        <>
                            <View style={styles.header}>
                                <Pressable onPress={() => setIsDetailModalVisible(false)}>
                                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                                </Pressable>
                                <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' }}>
                                        {activeCircle.avatar ? (
                                            <Image source={{ uri: activeCircle.avatar }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} alt={activeCircle.name} />
                                        ) : (
                                            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>{activeCircle.name[0]}</Text>
                                        )}
                                    </View>
                                    <Text style={[styles.title, { color: colors.text }]}>{activeCircle.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <Ionicons name={activeCircle.isPublic ? 'globe-outline' : 'lock-closed'} size={10} color={activeCircle.isPublic ? '#4ADE80' : '#FF6B6B'} />
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: activeCircle.isPublic ? '#4ADE80' : '#FF6B6B' }}>{activeCircle.isPublic ? 'Público' : 'Privado'}</Text>
                                        <Text style={{ fontSize: 10, color: colors.subtext, marginLeft: 6 }}>{activeCircle.members?.length || 0} membros</Text>
                                        {activeCircle.adminId === user?.id && (
                                            <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 }}>
                                                <Text style={{ fontSize: 9, color: colors.primary, fontWeight: '800' }}>Admin</Text>
                                            </View>
                                        )}
                                    </View>
                                    {activeCircle.description ? (
                                        <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>{activeCircle.description}</Text>
                                    ) : null}
                                </View>
                                <View style={{ width: 24 }} />
                            </View>

                            <View style={styles.subTabBar}>
                                <Pressable onPress={() => setActiveClanDetailTab('membros')} style={[styles.subTabBtn, activeClanDetailTab === 'membros' && { backgroundColor: colors.accent, flex: 1, alignItems: 'center' }, activeClanDetailTab !== 'membros' && { flex: 1, alignItems: 'center' }]}>
                                    <Text style={[styles.subTabText, { color: activeClanDetailTab === 'membros' ? colors.primary : colors.subtext }]}>Membros</Text>
                                </Pressable>
                                <Pressable onPress={() => setActiveClanDetailTab('chat')} style={[styles.subTabBtn, activeClanDetailTab === 'chat' && { backgroundColor: colors.accent, flex: 1, alignItems: 'center' }, activeClanDetailTab !== 'chat' && { flex: 1, alignItems: 'center' }]}>
                                    <Text style={[styles.subTabText, { color: activeClanDetailTab === 'chat' ? colors.primary : colors.subtext }]}>Chat do Clã</Text>
                                </Pressable>
                            </View>

                            {activeClanDetailTab === 'membros' ? (
                                <View style={{ flex: 1, paddingHorizontal: 20 }}>
                                    <ScrollView style={{ flex: 1 }}>
                                        {activeCircle.adminId === user?.id && (
                                            <View style={{ marginTop: 20, marginBottom: 10, padding: 16, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                                                <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 12 }}><Ionicons name="settings-outline" /> Configurações (Admin)</Text>
                                                <TextInput 
                                                    style={[styles.modalInput, { backgroundColor: isDarkMode ? '#121218' : '#F7F7FA', borderWidth: 1, borderColor: colors.border, color: colors.text, marginBottom: 10 }]} 
                                                    placeholder="Nova Descrição" 
                                                    placeholderTextColor={colors.subtext}
                                                    defaultValue={activeCircle.description}
                                                    onEndEditing={(e) => {
                                                        AuthService.updateClanDetailsLocal(activeCircle.id, e.nativeEvent.text, activeCircle.avatar);
                                                        loadSocialData();
                                                        showToast('Descrição atualizada!', 'success');
                                                    }}
                                                />
                                                <TextInput 
                                                    style={[styles.modalInput, { backgroundColor: isDarkMode ? '#121218' : '#F7F7FA', borderWidth: 1, borderColor: colors.border, color: colors.text }]} 
                                                    placeholder="URL da Foto do Clã" 
                                                    placeholderTextColor={colors.subtext}
                                                    defaultValue={activeCircle.avatar}
                                                    onEndEditing={(e) => {
                                                        AuthService.updateClanDetailsLocal(activeCircle.id, activeCircle.description, e.nativeEvent.text);
                                                        loadSocialData();
                                                        showToast('Foto atualizada!', 'success');
                                                    }}
                                                />
                                            </View>
                                        )}
                                        {activeCircle.members?.map((m: any) => (
                                            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                                <View style={[styles.memberAvatar, { backgroundColor: colors.accent, width: 44, height: 44, borderRadius: 22 }]}>
                                                    <PetPreview species={m.species || 'bunny'} size={36} customImageUri={m.avatar} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{m.name || 'Explorador'}</Text>
                                                        {activeCircle.adminId === m.id && (
                                                            <Ionicons name="star" size={12} color="#FBBF24" />
                                                        )}
                                                    </View>
                                                    <Text style={{ color: colors.subtext, fontSize: 12 }}>{m.wander_id || ''}</Text>
                                                </View>
                                                {activeCircle.adminId === user?.id && m.id !== user?.id && (
                                                    <Pressable onPress={() => {
                                                        AuthService.removeMemberLocal(activeCircle.id, m.id);
                                                        showToast(`${m.name} foi removido`, 'decline');
                                                        setIsDetailModalVisible(false);
                                                        loadSocialData();
                                                    }} style={{ padding: 8, backgroundColor: '#FF6B6B15', borderRadius: 8 }}>
                                                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                                    </Pressable>
                                                )}
                                            </View>
                                        ))}
                                    </ScrollView>
                                    <View style={{ paddingVertical: 20 }}>
                                        <Pressable onPress={() => { handleShareClan(activeCircle); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, height: 50, borderRadius: 14 }}>
                                            <Ionicons name="share-social" size={18} color="#FFF" />
                                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>Compartilhar Clã</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <View style={{ flex: 1 }}>
                                    <ScrollView style={{ flex: 1, padding: 20 }} ref={clanChatScrollRef} onContentSizeChange={() => clanChatScrollRef.current?.scrollToEnd()}>
                                        {clanChatMessages[activeCircle.id] && clanChatMessages[activeCircle.id].length > 0 ? (
                                            clanChatMessages[activeCircle.id].map(m => (
                                                <View key={m.id} style={{ alignSelf: m.senderId === 'me' ? 'flex-end' : 'flex-start', backgroundColor: m.senderId === 'me' ? colors.primary : colors.accent, padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '80%' }}>
                                                    <Text style={{ color: m.senderId === 'me' ? '#FFF' : colors.text }}>{m.text}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                                                <Text style={{ color: colors.subtext, fontSize: 14 }}>Nenhuma mensagem ainda.</Text>
                                                <Text style={{ color: colors.subtext, fontSize: 14 }}>Diga olá para o clã!</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                    <View style={{ padding: 20, flexDirection: 'row', gap: 10 }}>
                                        <TextInput 
                                            style={[styles.modalInput, { flex: 1, color: colors.text, backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5' }]} 
                                            value={clanChatInput} 
                                            onChangeText={setClanChatInput} 
                                            placeholder="Digite algo..." 
                                            placeholderTextColor={colors.subtext} 
                                        />
                                        <Pressable onPress={handleSendClanMessage} style={{ width: 45, height: 45, backgroundColor: colors.primary, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="send" size={20} color="#FFF" />
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </SafeAreaView>
            </Modal>

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
