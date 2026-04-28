import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PetPreview } from '../../components/PetPreview';
import { ProfileView } from '../../components/ProfileView';
import { useTheme } from '../../components/ThemeContext';
import {
    getGhostModeLocal,
    getCurrentUserLocal,
    getLikesLocal,
    toggleLikeLocal,
    getPetLocal,
    LocalPet
} from '../../localDatabase';
import { ChatMessage, FriendRequest } from '../../types/social';
import { AuthService } from '../../services/AuthService';
import { supabase } from '../../services/supabaseConfig';
import { NearbyWeb } from '../../components/NearbyWeb';

export default function SocialScreen() {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    const { tab } = useLocalSearchParams<{ tab?: string }>();
    const [activeTopTab, setActiveTopTab] = useState<'perfil' | 'social' | 'clas'>(tab === 'perfil' ? 'perfil' : 'social');
    const [activeSocialSubTab, setActiveSocialSubTab] = useState<'recomendados' | 'inbox'>('recomendados');
    const [activeClansSubTab, setActiveClansSubTab] = useState<'meus' | 'buscar'>('meus');

    // Estados para Clãs
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

    // Estados de Busca
    const [socialSearch, setSocialSearch] = useState('');
    const [nearbyExplorers, setNearbyExplorers] = useState<any[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [recommendationLinks, setRecommendationLinks] = useState<any[]>([]);
    const [clansSearch, setClansSearch] = useState('');

    // Estados para Chat
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [chatTarget, setChatTarget] = useState<{ id: string, name: string, avatar?: string | null } | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatScrollRef = useRef<ScrollView>(null);
    const chatSubscription = useRef<any>(null);
    const [chatMediaUri, setChatMediaUri] = useState<string | null>(null);

    // Estados para Preview
    const [isAvatarZoomVisible, setIsAvatarZoomVisible] = useState(false);
    const [isMemberCardVisible, setIsMemberCardVisible] = useState(false);
    const [activePreviewMember, setActivePreviewMember] = useState<any>(null);
    const [likedIds, setLikedIds] = useState<string[]>([]);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [userLocationName, setUserLocationName] = useState<string>('Localizando...');
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [confirmedFriends, setConfirmedFriends] = useState<any[]>([]);
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

            // 0. Likes da Nuvem
            const cloudLikes = await AuthService.getLikesCloud(loggedUser.id);
            setLikedIds(cloudLikes);

            // 1. Amigos da Nuvem
            const friends = await AuthService.getFriendsCloud(loggedUser.id);
            setFriendIds(friends);

            // 1.1 Perfis dos Amigos
            const friendProfiles = await AuthService.getFriendsProfilesCloud(friends);
            setConfirmedFriends(friendProfiles);

            // 2. Clãs da Nuvem
            const cloudGroups = await AuthService.getGroups();
            const formattedCircles = cloudGroups.map((g: any) => ({
                id: g.id,
                name: g.name,
                isPublic: g.is_public,
                password: g.password,
                members: g.group_members.map((gm: any) => gm.user_id)
            }));
            // @ts-ignore
            setCircles(formattedCircles);
            if (!user) return;
            // 3. Solicitações Pendentes (Inbox)
            const cloudRequests = await AuthService.getPendingRequestsCloud(user.id);
            const formattedRequests = cloudRequests.map((r: any) => ({
                id: r.id,
                fromId: r.user_id1,
                fromName: r.profiles?.name || 'Explorador',
                fromAvatar: r.profiles?.avatar,
                toId: 'me',
                status: 'pending'
            }));
            // @ts-ignore
            setFriendRequests(formattedRequests);
            
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
            if (status !== 'granted') {
                setUserLocationName('Permissão negada');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const [addr] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });

            if (addr) {
                const name = addr.street || addr.district || addr.region || 'Desconhecido';
                setUserLocationName(name);
            }
        } catch (e) {
            setUserLocationName('Erro ao localizar');
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadLikes();
            setupBattery();
            setupLocation();
            loadSocialData();
            getGhostModeLocal().then(setIsGhostMode);
        }, [])
    );

    useEffect(() => {
        let subscription: any;
        if (Platform.OS !== 'web') {
            subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
                setBatteryLevel(Math.round(batteryLevel * 100));
            });
        }
        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    const handleToggleLike = async (targetId: string) => {
        const loggedUser = await getCurrentUserLocal();
        if (!loggedUser) return;
        try {
            const isLiked = await AuthService.toggleLikeCloud(loggedUser.id, targetId);
            setLikedIds(prev => isLiked ? [...prev, targetId] : prev.filter(id => id !== targetId));
        } catch (error) {
            console.error("Erro ao curtir:", error);
        }
    };

    const handleSendRequest = async (targetUser: any) => {
        try {
            const me = await getCurrentUserLocal();
            if (!me) return;

            await AuthService.addFriendCloud(me.id, targetUser.id);
            Alert.alert('Sucesso', `Solicitação de amizade enviada para ${targetUser.name || 'Explorador'}!`);
            loadSocialData();
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível enviar a solicitação.');
        }
    };

    const handleRespondRequest = async (requestId: string, status: 'accepted' | 'declined') => {
        try {
            await AuthService.respondFriendRequestCloud(requestId, status);
            Alert.alert(status === 'accepted' ? 'Aceito!' : 'Recusado', status === 'accepted' ? 'Agora vocês são amigos!' : 'Solicitação removida.');
            loadSocialData();
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível responder à solicitação.');
        }
    };

    const handleRecommend = async (targetId: string) => {
        const loggedUser = await getCurrentUserLocal();
        if (!loggedUser) return;
        try {
            const success = await AuthService.recommendUser(loggedUser.id, targetId);
            if (success) {
                Alert.alert("Recomendado!", "Você adicionou um elo de confiança nesta teia.");
                // Recarrega a teia para mostrar a nova linha
                if (activeSocialSubTab === 'recomendados') {
                    const { explorers, links } = await AuthService.getRecommendationWeb(loggedUser.id);
                    setNearbyExplorers(explorers);
                    setRecommendationLinks(links);
                }
            }
        } catch (error) {
            console.error("Erro ao recomendar:", error);
        }
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

        // Subscribe to real-time
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
        if (user) {
            await AuthService.sendMessageCloud(user.id, chatTarget.id, txt);
            // O Realtime atualizará a lista automaticamente via subscribeToMessages
        }
    };

    const handlePickMedia = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Permita o acesso à galeria para enviar fotos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
            setChatMediaUri(result.assets[0].uri);
        }
    };

    const handleShare = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão Negada', 'Não podemos compartilhar sua localização sem acesso ao GPS.');
                return;
            }

            const currentLoc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = currentLoc.coords;

            const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            const message = `WanderPet: Minha localização em tempo real: ${mapLink}`;

            if (Platform.OS === 'web') {
                // No navegador, tentamos usar a API de Share, mas se falhar (comum), copiamos para o clipboard
                if (navigator.share) {
                    await navigator.share({
                        title: 'Minha Localização',
                        text: message,
                        url: mapLink,
                    });
                } else {
                    await navigator.clipboard.writeText(mapLink);
                    Alert.alert('Link Copiado!', 'O link da sua localização foi copiado para a área de transferência.');
                }
            } else {
                await Share.share({ message });
            }
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível compartilhar sua localização agora.');
        }
    };

    const handleCreateCircle = async () => {
        if (!circleName.trim()) return;
        if (!isPublicNewClan && !newClanPassword.trim()) {
            Alert.alert('Erro', 'Por favor, defina uma senha para seu clã privado.');
            return;
        }

        const user = await getCurrentUserLocal();
        if (!user) return;

        try {
            await AuthService.createGroup(circleName.trim(), user.id, newClanPassword || undefined, isPublicNewClan);
            Alert.alert('Clã Criado', `"${circleName}" foi criado na nuvem.`);
            setCircleName('');
            setNewClanPassword('');
            setIsPublicNewClan(false);
            setIsCreateModalVisible(false);
            loadSocialData();
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível criar o clã.');
        }
    };

    const handleVerifyPassword = () => {
        if (!activeCircle) return;
        if (passAttempt === activeCircle.password) {
            setIsPassModalVisible(false);
            setPassAttempt('');

            // Se já for membro só abre, se não for, entra automaticamente ao acertar a senha
            const isMember = activeCircle.members.some((m: any) => m.id === 'me');
            if (!isMember) {
                handleJoinCircle(activeCircle.id);
            }
            setIsDetailModalVisible(true);
        } else {
            Alert.alert('Senha Incorreta', 'Tente novamente.');
        }
    };

    const handleJoinCircle = async (circleId: string) => {
        const user = await getCurrentUserLocal();
        if (!user) return;

        try {
            await AuthService.joinGroup(circleId, user.id);
            Alert.alert('Sucesso', 'Você entrou no clã!');
            loadSocialData();
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível entrar no clã.');
        }
    };

    useEffect(() => {
        if (activeSocialSubTab === 'recomendados' && activeTopTab === 'social') {
            const loadNearby = async () => {
                setIsLoadingNearby(true);
                try {
                    const user = await getCurrentUserLocal();
                    if (user) {
                        const { explorers, links } = await AuthService.getRecommendationWeb(user.id);
                        setNearbyExplorers(explorers);
                        setRecommendationLinks(links);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoadingNearby(false);
                }
            };
            loadNearby();
        }
    }, [activeSocialSubTab, activeTopTab]);

    const handleAddFriend = () => {
        if (!friendId.trim()) return;
        Alert.alert('Convite Enviado', `Convite enviado para ${friendId}.`);
        setFriendId('');
        setIsAddFriendModalVisible(false);
    };

    // Coleção única da aba social (Membros dos clãs)
    const allMembersMap = new Map();
    circles.forEach((c: any) => {
        if (c && c.members) {
            c.members.forEach((m: any) => {
                if (m && m.id && !allMembersMap.has(m.id)) allMembersMap.set(m.id, m);
            });
        }
    });
    // Mocks de recomendação removidos em favor de dados reais do banco futuramente

    const allMembers = Array.from(allMembersMap.values()).sort((a: any, b: any) => {
        const aLiked = likedIds.includes(a.id);
        const bLiked = likedIds.includes(b.id);
        if (aLiked && !bLiked) return -1;
        if (!aLiked && bLiked) return 1;
        return 0;
    });
    const chatTargetMember = (chatTarget && chatTarget.id) ? allMembers.find((m: any) => m && m.id === chatTarget.id) : null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* TOP TAB BAR */}
            <View style={styles.topNavRow}>
                <Pressable onPress={() => router.replace('/(tabs)')} style={styles.univBackBtn}>
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

            {/* ABA: MEU PERFIL */}
            {activeTopTab === 'perfil' && (
                <View style={{ flex: 1 }}>
                    <ProfileView />
                </View>
            )}

            {/* ABA: SOCIAL (Geral) */}
            {activeTopTab === 'social' && (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={{ marginLeft: 16 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text, outlineStyle: 'none' } as any]}
                            placeholder={
                                activeSocialSubTab === 'recomendados' ? "Descobrir exploradores..." :
                                "Buscar solicitações..."
                            }
                            placeholderTextColor={colors.subtext}
                            value={socialSearch}
                            onChangeText={setSocialSearch}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {activeSocialSubTab === 'inbox' && (
                            <Pressable style={styles.searchActionBtn} onPress={() => setIsAddFriendModalVisible(true)}>
                                <Ionicons name="person-add" size={18} color="#FFF" />
                            </Pressable>
                        )}
                    </View>

                    {/* SUB TAB BAR SOCIAL */}
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

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ flexGrow: 1 }}
                    >
                        {activeSocialSubTab === 'recomendados' ? (
                            <View style={styles.membersSection}>
                                {isLoadingNearby ? (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
                                        <Text style={{ color: colors.subtext }}>Buscando conexões...</Text>
                                    </View>
                                ) : nearbyExplorers.length > 0 ? (
                                    nearbyExplorers.map(member => {
                                        if (!member) return null;
                                        const isLiked = likedIds.includes(member.id);
                                        return (
                                            <View key={member.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                                                <Pressable
                                                    onPress={() => {
                                                        setActivePreviewMember(member);
                                                        setIsAvatarZoomVisible(true);
                                                    }}
                                                    style={[styles.memberAvatar, { backgroundColor: colors.accent }]}
                                                >
                                                    {member?.species ? (
                                                        <PetPreview species={member.species} size={50} customImageUri={member.avatar} />
                                                    ) : (
                                                        <Ionicons name="person" size={24} color={colors.primary} />
                                                    )}
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => {
                                                        setActivePreviewMember({
                                                            ...member,
                                                            species: member.species || 'bunny',
                                                            location: 'Explorador recomendado',
                                                            level: 5,
                                                            xp: 120,
                                                            online: true,
                                                            since: 'agora'
                                                        });
                                                        setIsMemberCardVisible(true);
                                                    }}
                                                    style={styles.memberInfo}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text style={[styles.memberName, { color: colors.text }]}>{member?.name}</Text>
                                                        {isLiked && <Ionicons name="heart" size={14} color="#E74C3C" />}
                                                    </View>
                                                    <Text style={[styles.memberLoc, { color: colors.subtext }]}>{member?.location || 'Explorador Próximo'}</Text>
                                                    <Text style={[styles.memberSince, { color: colors.subtext }]}>Wander-ID: {member?.wander_id}</Text>
                                                </Pressable>
                                                <Pressable onPress={() => handleSendRequest(member)}>
                                                    <Ionicons name="person-add" size={20} color="#FFF" style={{ backgroundColor: colors.primary, padding: 8, borderRadius: 12 }} />
                                                </Pressable>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <View style={[styles.membersSection, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
                                        <Text style={{ fontSize: 40, marginBottom: 20 }}>🔭</Text>
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>O horizonte está vazio...</Text>
                                        <Text style={{ color: colors.subtext, marginTop: 8, textAlign: 'center' }}>
                                            Não encontramos outros exploradores por perto neste momento.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 60 }}>
                                {friendRequests.filter(r => r.toId === 'me' && r.status === 'pending').map(req => (
                                    <View key={req.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                                        <View style={[styles.memberAvatar, { backgroundColor: colors.accent }]}>
                                            <Ionicons name="person" size={24} color={colors.primary} />
                                        </View>
                                        <View style={styles.memberInfo}>
                                            <Text style={[styles.memberName, { color: colors.text }]}>{req.fromName}</Text>
                                            <Text style={[styles.memberLoc, { color: colors.subtext }]}>Quer ser seu amigo!</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <Pressable onPress={() => handleRespondRequest(req.id, 'accepted')} style={{ backgroundColor: colors.primary + '22', padding: 10, borderRadius: 12 }}>
                                                <Ionicons name="checkmark" size={20} color={colors.primary} />
                                            </Pressable>
                                            <Pressable onPress={() => handleRespondRequest(req.id, 'declined')} style={{ backgroundColor: '#E74C3C22', padding: 10, borderRadius: 12 }}>
                                                <Ionicons name="close" size={20} color="#E74C3C" />
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

            {/* ABA: CLÃS */}
            {activeTopTab === 'clas' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {/* SUB TAB BAR CLÃS */}
                    <View style={styles.subTabBar}>
                        <Pressable onPress={() => setActiveClansSubTab('meus')} style={[styles.subTabBtn, activeClansSubTab === 'meus' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeClansSubTab === 'meus' ? colors.primary : colors.subtext }]}>Meus Clãs</Text>
                        </Pressable>
                        <Pressable onPress={() => setActiveClansSubTab('buscar')} style={[styles.subTabBtn, activeClansSubTab === 'buscar' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeClansSubTab === 'buscar' ? colors.primary : colors.subtext }]}>Buscar</Text>
                        </Pressable>
                    </View>

                    {/* Search e Add Button */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.subtext} style={{ marginLeft: 16 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text, outlineStyle: 'none' } as any]}
                            placeholder="Buscar clãs..."
                            placeholderTextColor={colors.subtext}
                            value={clansSearch}
                            onChangeText={setClansSearch}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable style={styles.searchActionBtn} onPress={() => setIsCreateModalVisible(true)}>
                            <Ionicons name="add" size={22} color="#FFF" />
                        </Pressable>
                    </View>

                    {/* Lista de círculos */}
                    {circles
                        .filter((c: any) => {
                            const isMember = c.members.includes(user?.id);
                            if (activeClansSubTab === 'meus') return isMember;
                            return !isMember; 
                        })
                        .filter(c => c.name.toLowerCase().includes(clansSearch.toLowerCase()))
                        .map(circle => (
                            <Pressable
                                key={circle.id}
                                style={[styles.circleRow, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    setSelectedCircleId(circle.id);
                                    const isMember = circle.members.includes(user?.id);
                                    if (isMember || circle.isPublic) {
                                        setIsDetailModalVisible(true);
                                    } else {
                                        setIsPassModalVisible(true);
                                    }
                                }}
                            >
                                <View style={styles.circleAvatars}>
                                    {circle.members.slice(0, 3).map((m: any, i: number) => {
                                        if (!m) return null;
                                        return (
                                            <View key={`${m.id || i}_${i}`} style={[styles.stackedAvatar, {
                                                marginLeft: i > 0 ? -12 : 0,
                                                zIndex: 3 - i,
                                                borderColor: colors.card,
                                                backgroundColor: isDarkMode ? '#2A2A36' : '#F0EDFA',
                                            }]}>
                                                {m.avatar || m.species ? (
                                                    <PetPreview species={m.species || 'bunny'} size={40} customImageUri={m.avatar} />
                                                ) : (
                                                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{(m.name || '?')[0]}</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                    {circle.members.length > 3 && (
                                        <View style={[styles.stackedAvatar, styles.countBadge, { marginLeft: -12, backgroundColor: colors.primary }]}>
                                            <Text style={styles.countBadgeText}>+{String(circle.members.length - 3)}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.circleName, { color: colors.text }]}>{circle.name}</Text>
                                {!circle.isPublic && <Ionicons name="lock-closed-outline" size={14} color={colors.subtext} style={{ marginRight: 4 }} />}
                                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                            </Pressable>
                        ))}

                    <View style={{ height: 20 }} />

                    {/* Card de compartilhar */}
                    <Pressable style={[styles.shareCard, { backgroundColor: isDarkMode ? colors.card : '#FFF', borderColor: colors.border }]} onPress={handleShare}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.shareTitle, { color: colors.text }]}>Compartilhe um link com sua localização</Text>
                            <Text style={[styles.shareSub, { color: colors.subtext }]}>Funciona com qualquer pessoa — sem necessidade de conta</Text>
                        </View>
                        <Ionicons name="share-outline" size={22} color={colors.subtext} />
                    </Pressable>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* MODAL: DETALHES DO CLÃ (Overlay na frente) */}
            <Modal visible={isDetailModalVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={styles.header}>
                        <Pressable onPress={() => setIsDetailModalVisible(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                            <Text style={[styles.title, { color: colors.text, marginLeft: 10 }]}>{activeCircle?.name}</Text>
                        </Pressable>
                        {!activeCircle?.isPublic && <Ionicons name="lock-closed" size={20} color={colors.subtext} />}
                    </View>

                    <ScrollView style={{ flex: 1 }}>
                        {activeCircle && (
                            <View style={styles.membersSection}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20, marginBottom: 15 }}>
                                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>PARTICIPANTES ({String(activeCircle?.members?.length || 0)})</Text>
                                    {activeCircle?.isPublic && !activeCircle?.members?.some((m: any) => m && m.id === 'me') && (
                                        <Pressable
                                            style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                                            onPress={() => handleJoinCircle(activeCircle.id)}
                                        >
                                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Participar</Text>
                                        </Pressable>
                                    )}
                                </View>
                                {(activeCircle?.members || []).sort((a: any, b: any) => {
                                    const aLiked = likedIds.includes(a.id);
                                    const bLiked = likedIds.includes(b.id);
                                    if (aLiked && !bLiked) return -1;
                                    if (!aLiked && bLiked) return 1;
                                    return 0;
                                }).map((member: any) => {
                                    if (!member) return null;
                                    // Ghost Mode: mascarar dados do próprio usuário para simular "como os outros veriam"
                                    const displayMember = (isGhostMode && member.id === 'me') ? {
                                        ...member,
                                        location: '👻 Modo Fantasma',
                                        online: false,
                                        battery: 0,
                                        since: '--:--'
                                    } : member;
                                    return (
                                        <View key={displayMember.id} style={[styles.memberItem, { borderColor: colors.border }]}>
                                            <Pressable
                                                onPress={() => {
                                                    setActivePreviewMember(displayMember);
                                                    setIsAvatarZoomVisible(true);
                                                }}
                                                style={[styles.memberAvatar, { backgroundColor: colors.accent }]}
                                            >
                                                {displayMember?.species ? (
                                                    <PetPreview species={displayMember.species} size={50} customImageUri={displayMember.avatar} />
                                                ) : (
                                                    <Ionicons name="person" size={24} color={colors.primary} />
                                                )}

                                                <View style={[
                                                    styles.presenceCircle,
                                                    {
                                                        backgroundColor: displayMember?.online ? '#4CAF50' : '#E74C3C',
                                                        borderColor: colors.background
                                                    }
                                                ]} />
                                            </Pressable>
                                            <Pressable
                                                onPress={() => {
                                                    setActivePreviewMember(displayMember);
                                                    setIsMemberCardVisible(true);
                                                }}
                                                style={styles.memberInfo}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={[styles.memberName, { color: colors.text }]}>{displayMember?.name}</Text>
                                                    {likedIds.includes(displayMember.id) && <Ionicons name="heart" size={12} color={colors.primary} />}
                                                    {isGhostMode && displayMember.id === 'me' && <FontAwesome5 name="ghost" size={10} color={colors.subtext} />}
                                                </View>
                                                <Text style={[styles.memberLoc, { color: colors.subtext }]}>{displayMember?.location}</Text>
                                                <Text style={[styles.memberSince, { color: colors.subtext }]}>Desde às {displayMember?.since}</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleOpenChat(displayMember.id, displayMember.name, displayMember.avatar)}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.subtext} />
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* MODAL: CHAT — Premium */}
            <Modal visible={isChatVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Pressable onPress={() => {
                            setIsChatVisible(false);
                            if (chatSubscription.current) {
                                supabase.removeChannel(chatSubscription.current);
                                chatSubscription.current = null;
                            }
                        }} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="chevron-back" size={20} color={colors.text} />
                            </View>
                            <Pressable
                                onPress={() => {
                                    if (chatTargetMember) {
                                        setActivePreviewMember(chatTargetMember);
                                        setIsAvatarZoomVisible(true);
                                    }
                                }}
                                style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary + '15', marginLeft: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary + '25' }}
                            >
                                {chatTarget?.avatar ? (
                                    <Text style={{ fontSize: 16 }}>{chatTarget?.avatar}</Text>
                                ) : chatTargetMember?.species ? (
                                    <PetPreview species={chatTargetMember.species} size={18} />
                                ) : (
                                    <Ionicons name="person" size={16} color={colors.primary} />
                                )}
                            </Pressable>
                            <Pressable onPress={() => {
                                if (chatTargetMember) {
                                    setActivePreviewMember(chatTargetMember);
                                    setIsMemberCardVisible(true);
                                }
                            }}>
                                <Text style={{ color: colors.text, marginLeft: 10, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 }}>{chatTarget?.name}</Text>
                            </Pressable>
                        </Pressable>
                        <View style={{ backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Ionicons name="time-outline" size={12} color={colors.subtext} />
                            <Text style={{ fontSize: 9, color: colors.subtext, fontWeight: '700' }}>1H</Text>
                        </View>
                    </View>

                    {/* Messages */}
                    <ScrollView
                        style={{ flex: 1, paddingHorizontal: 16 }}
                        ref={chatScrollRef}
                        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                    >
                        <View style={{ alignItems: 'center', marginVertical: 20 }}>
                            <View style={{ backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 }}>
                                <Text style={{ fontSize: 10, color: colors.subtext, fontWeight: '700', letterSpacing: 0.5 }}>MENSAGENS EFÊMERAS</Text>
                            </View>
                        </View>

                        {chatMessages.length === 0 && (
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
                                </View>
                                <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: '600' }}>Nenhuma mensagem ainda</Text>
                                <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 4, opacity: 0.6 }}>Diga oi! 👋</Text>
                            </View>
                        )}

                        {chatMessages.map(msg => (
                            <View key={msg.id} style={{
                                alignSelf: msg.senderId === 'me' ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.senderId === 'me' ? colors.primary : (isDarkMode ? '#1C1C28' : '#F2F1F7'),
                                paddingVertical: 10,
                                paddingHorizontal: 14,
                                borderRadius: 16,
                                borderBottomRightRadius: msg.senderId === 'me' ? 4 : 16,
                                borderBottomLeftRadius: msg.senderId === 'me' ? 16 : 4,
                                marginBottom: 8,
                                maxWidth: '78%'
                            }}>
                                <Text style={{
                                    color: msg.senderId === 'me' ? '#FFFFFF' : (isDarkMode ? '#EEEDF2' : '#1A1A2E'),
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontWeight: '500'
                                }}>{msg.text}</Text>
                            </View>
                        ))}
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Input Bar */}
                    <View style={{
                        borderTopWidth: 1,
                        borderTopColor: isDarkMode ? '#ffffff10' : '#00000010',
                        backgroundColor: colors.background,
                    }}>
                        {/* Image preview strip */}
                        {chatMediaUri && (
                            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                                <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
                                    <Image
                                        source={{ uri: chatMediaUri }}
                                        style={{ width: 80, height: 80, borderRadius: 14 }}
                                    />
                                    <Pressable
                                        onPress={() => setChatMediaUri(null)}
                                        style={{
                                            position: 'absolute', top: -6, right: -6,
                                            width: 22, height: 22, borderRadius: 11,
                                            backgroundColor: '#FF4444',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        <Ionicons name="close" size={13} color="#FFF" />
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {/* Input row */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: 16 }}>
                            {/* Media button */}
                            <Pressable
                                onPress={handlePickMedia}
                                style={({ pressed }) => ({
                                    width: 42,
                                    height: 42,
                                    borderRadius: 21,
                                    backgroundColor: pressed
                                        ? colors.primary + '30'
                                        : (isDarkMode ? '#1E1E2E' : '#F2F2F7'),
                                    borderWidth: 1,
                                    borderColor: isDarkMode ? '#ffffff15' : '#00000010',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                })}
                            >
                                <Ionicons name="image-outline" size={20} color={colors.primary} />
                            </Pressable>

                            {/* Text input pill */}
                            <View style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDarkMode ? '#1E1E2E' : '#F2F2F7',
                                borderRadius: 28,
                                borderWidth: 1,
                                borderColor: isDarkMode ? '#ffffff15' : '#00000010',
                                paddingHorizontal: 16,
                                minHeight: 48,
                            }}>
                                <TextInput
                                    style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10, outlineStyle: 'none' } as any}
                                    value={chatInput}
                                    onChangeText={setChatInput}
                                    placeholder={`Mensagem para ${chatTarget?.name ?? ''}...`}
                                    placeholderTextColor={colors.subtext}
                                    multiline
                                    onSubmitEditing={handleSendMessage}
                                />
                            </View>

                            {/* Send button */}
                            <Pressable
                                onPress={handleSendMessage}
                                style={({ pressed }) => ({
                                    width: 48,
                                    height: 48,
                                    backgroundColor: (chatInput.trim() || chatMediaUri) ? colors.primary : (isDarkMode ? '#333' : '#DDD'),
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: pressed ? 0.7 : 1,
                                    transform: [{ scale: pressed ? 0.92 : 1 }],
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: (chatInput.trim() || chatMediaUri) ? 0.45 : 0,
                                    shadowRadius: 10,
                                    elevation: (chatInput.trim() || chatMediaUri) ? 6 : 0,
                                })}
                            >
                                <Ionicons name="send" size={20} color={(chatInput.trim() || chatMediaUri) ? '#FFF' : colors.subtext} style={{ marginLeft: 2 }} />
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* MODAL: ZOOM DO AVATAR */}
            <Modal visible={isAvatarZoomVisible} transparent animationType="fade">
                <Pressable onPress={() => setIsAvatarZoomVisible(false)} style={[styles.modalBg, { justifyContent: 'center' }]}>
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <View style={[styles.avatarZoomCircle, { borderColor: colors.primary + '60', backgroundColor: colors.card }]}>
                            {activePreviewMember?.species ? (
                                <PetPreview species={activePreviewMember.species} size={220} />
                            ) : (
                                <Ionicons name="person" size={100} color={colors.primary} />
                            )}
                        </View>
                        <View style={{ marginTop: 16, backgroundColor: isDarkMode ? '#ffffff0D' : '#0000000A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                            <Text style={{ color: isDarkMode ? '#ffffff80' : '#00000060', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Toque para fechar</Text>
                        </View>
                    </View>
                </Pressable>
            </Modal>
            {/* MODAL: CARD DE PERFIL DO MEMBRO — Premium */}
            <Modal visible={isMemberCardVisible} transparent animationType="fade">
                <Pressable onPress={() => setIsMemberCardVisible(false)} style={[styles.modalBg, { justifyContent: 'flex-end' }]}>
                    <Pressable style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
                        {/* Handle bar at top */}
                        <View style={{ paddingTop: 8, paddingBottom: 4, alignItems: 'center' }}>
                            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                        </View>

                        {/* Accent strip */}
                        <View style={{ height: 80, backgroundColor: colors.primary + '15', width: '100%' }} />
                        
                        <View style={{ padding: 24, marginTop: -40 }}>
                            <View style={styles.profileCardHeader}>
                                <View style={[styles.cardAvatar, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 2 }]}>
                                    <View style={{ width: '100%', height: '100%', borderRadius: 18, overflow: 'hidden' }}>
                                        {activePreviewMember?.species ? (
                                            <PetPreview species={activePreviewMember.species} size={64} customImageUri={activePreviewMember.avatar} />
                                        ) : (
                                            <Ionicons name="person" size={36} color={colors.primary} />
                                        )}
                                    </View>
                                    <View style={[styles.presenceCircleLarge, { backgroundColor: activePreviewMember?.online ? '#4CAF50' : '#E74C3C', borderColor: colors.card }]} />
                                </View>
                                <View style={{ flex: 1, paddingTop: 30 }}>
                                    <Text style={[styles.cardName, { color: colors.text }]}>{activePreviewMember?.name || 'Explorador'}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: activePreviewMember?.online ? '#4CAF50' : '#E74C3C' }} />
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.subtext }}>{activePreviewMember?.online ? 'Online' : 'Offline'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Stats Grid */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                <View style={{ flex: 1, backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', padding: 14, borderRadius: 14, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 9, color: colors.subtext, fontWeight: '700', letterSpacing: 0.8 }}>LEVEL</Text>
                                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary, marginTop: 2 }}>{activePreviewMember?.level || 1}</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', padding: 14, borderRadius: 14, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 9, color: colors.subtext, fontWeight: '700', letterSpacing: 0.8 }}>XP</Text>
                                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary, marginTop: 2 }}>{activePreviewMember?.xp || 0}</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', padding: 14, borderRadius: 14, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 9, color: colors.subtext, fontWeight: '700', letterSpacing: 0.8 }}>PET</Text>
                                    <View style={{ marginTop: 4 }}>
                                        <Ionicons name="paw" size={18} color={colors.primary} />
                                    </View>
                                </View>
                            </View>

                            {/* Info Detalhada */}
                            <View style={[styles.cardDataRow, { borderColor: colors.border, borderTopWidth: 1, borderBottomWidth: 0, paddingTop: 14 }]}>
                                <View style={styles.cardDataItem}>
                                    <Ionicons name="finger-print-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.cardDataText, { color: colors.subtext, flex: 1 }]} numberOfLines={1}>
                                        Wander-ID: #{activePreviewMember?.wander_id || activePreviewMember?.id?.substring(0, 8) || '?'}
                                    </Text>
                                </View>
                                <View style={[styles.cardDataItem, { marginTop: 10 }]}>
                                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.cardDataText, { color: colors.subtext, flex: 1 }]} numberOfLines={1}>
                                        {activePreviewMember?.location || 'Área Selvagem'}
                                    </Text>
                                </View>
                                <View style={[styles.cardDataItem, { marginTop: 10 }]}>
                                    <Ionicons name="paw-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.cardDataText, { color: colors.subtext, flex: 1 }]} numberOfLines={1}>
                                        Pet: {activePreviewMember?.species || 'bunny'}
                                    </Text>
                                </View>
                            </View>

                            {/* Ações: apenas Recomendar (quando aplicável) */}
                            {activeSocialSubTab === 'recomendados' && (
                                <View style={[styles.cardActions, { marginTop: 16 }]}>
                                    <Pressable
                                        onPress={() => handleRecommend(activePreviewMember.id)}
                                        style={[styles.cardBtn, { backgroundColor: colors.primary + '15', flex: 1 }]}
                                    >
                                        <Ionicons name="share-social" size={18} color={colors.primary} />
                                        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>Recomendar</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* MODAL: VERIFICAÇÃO DE SENHA — Bottom Sheet */}
            <Modal visible={isPassModalVisible} transparent animationType="slide">
                <View style={[styles.modalBg, { justifyContent: 'flex-end' }]}>
                    <Pressable style={{ flex: 1 }} onPress={() => { setIsPassModalVisible(false); setPassAttempt(''); }} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]}>
                        {/* Handle bar */}
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />

                        {/* Icon + Title */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <Ionicons name="lock-closed" size={24} color={colors.primary} />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 4 }]}>Clã Privado</Text>
                            <Text style={{ color: colors.subtext, fontSize: 13, textAlign: 'center' }}>Insira a senha para acessar este clã</Text>
                        </View>

                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }]}
                            value={passAttempt}
                            onChangeText={setPassAttempt}
                            placeholder="Senha do Clã"
                            secureTextEntry
                            placeholderTextColor={colors.subtext}
                        />

                        <View style={styles.modalActions}>
                            <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setIsPassModalVisible(false); setPassAttempt(''); }}>
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>Voltar</Text>
                            </Pressable>
                            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={handleVerifyPassword}>
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Acessar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Criar Círculo — Bottom Sheet */}
            <Modal visible={isCreateModalVisible} transparent animationType="slide">
                <View style={[styles.modalBg, { justifyContent: 'flex-end' }]}>
                    <Pressable style={{ flex: 1 }} onPress={() => setIsCreateModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]}>
                        {/* Handle bar */}
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />

                        {/* Icon + Title */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <Ionicons name="people" size={24} color={colors.primary} />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Criar Clã</Text>
                        </View>

                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }]}
                            value={circleName}
                            onChangeText={setCircleName}
                            placeholder="Nome do clã"
                            placeholderTextColor={colors.subtext}
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A', padding: 14, borderRadius: 14 }}>
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Tornar Clã Público</Text>
                            <Switch
                                value={isPublicNewClan}
                                onValueChange={setIsPublicNewClan}
                                trackColor={{ true: colors.primary }}
                                thumbColor="#FFF"
                            />
                        </View>
                        {!isPublicNewClan && (
                            <TextInput
                                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA', marginTop: 12 }]}
                                value={newClanPassword}
                                onChangeText={setNewClanPassword}
                                placeholder="Definir Senha do Clã"
                                secureTextEntry
                                placeholderTextColor={colors.subtext}
                            />
                        )}
                        <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 6, fontWeight: '500' }}>
                            {isPublicNewClan
                                ? 'Clãs públicos podem ser acessados por qualquer usuário.'
                                : 'Clãs privados exigem senha para visualização e entrada.'}
                        </Text>

                        <View style={styles.modalActions}>
                            <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setIsCreateModalVisible(false)}>
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={handleCreateCircle}>
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Criar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Adicionar Amigo — Bottom Sheet */}
            <Modal visible={isAddFriendModalVisible} transparent animationType="slide">
                <View style={[styles.modalBg, { justifyContent: 'flex-end' }]}>
                    <Pressable style={{ flex: 1 }} onPress={() => setIsAddFriendModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 40 }]}>
                        {/* Handle bar */}
                        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />

                        {/* Icon + Title */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                <Ionicons name="person-add" size={24} color={colors.primary} />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 4 }]}>Adicionar Amigo</Text>
                            <Text style={{ color: colors.subtext, fontSize: 13 }}>Insira o Wander-ID do seu amigo</Text>
                        </View>

                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }]}
                            value={friendId}
                            onChangeText={setFriendId}
                            placeholder="Wander-ID (#WP-XXXX)"
                            placeholderTextColor={colors.subtext}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setIsAddFriendModalVisible(false)}>
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={handleAddFriend}>
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Enviar</Text>
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

    // ─── Top Tab Bar ───
    topNavRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 12, marginBottom: 12, gap: 10 },
    univBackBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    topTabBar: { flex: 1, height: 44, flexDirection: 'row', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: '#ffffff0D' },
    topTabBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
    topTabText: { fontWeight: '700', fontSize: 13 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

    // ─── Search Bar ───
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginTop: 10, marginBottom: 10,
        borderRadius: 14, borderWidth: 1, borderColor: '#ffffff0D',
        paddingLeft: 14, paddingRight: 4, height: 48,
    },
    searchInput: { flex: 1, height: '100%', paddingHorizontal: 8, fontSize: 14, fontWeight: '600' },
    searchActionBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },

    // ─── Sub Tab Bar ───
    subTabBar: { flexDirection: 'row', marginBottom: 16, marginTop: 8, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
    subTabBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: 'transparent', minWidth: 90, alignItems: 'center' },
    subTabText: { fontSize: 13, fontWeight: '700' },

    // ─── Circle Rows ───
    circleRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, gap: 14,
    },
    circleAvatars: { flexDirection: 'row', alignItems: 'center' },
    stackedAvatar: { width: 38, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    countBadge: {},
    countBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    circleName: { flex: 1, fontSize: 15, fontWeight: '700' },

    // ─── Actions ───
    circleActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 20 },
    circleActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    circleActionText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

    // ─── Share Card ───
    shareCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginTop: 20,
        padding: 18, borderRadius: 18, borderWidth: 1, gap: 12,
    },
    shareTitle: { fontSize: 14, fontWeight: '700' },
    shareSub: { fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.6 },

    // ─── Members Section ───
    membersSection: { marginTop: 4, paddingBottom: 40 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: 20, marginBottom: 8, textTransform: 'uppercase' },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
    memberAvatar: {
        width: 48, height: 48, borderRadius: 16,
        borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', position: 'relative',
    },
    batteryMini: { position: 'absolute', bottom: -4, left: -4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
    batteryMiniText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700' },
    memberLoc: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.7 },
    memberSince: { fontSize: 11, fontWeight: '500', marginTop: 1, opacity: 0.5 },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },

    // ─── Presence ───
    presenceCircle: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, zIndex: 10 },
    presenceCircleLarge: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, borderWidth: 3, zIndex: 10 },

    // ─── Modals ───
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '88%', borderRadius: 24, padding: 24, borderWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 18 },
    modalInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
    modalBtnText: { fontWeight: '700', fontSize: 14 },

    // ─── Avatar Zoom / Profile Card ───
    avatarZoomCircle: { width: 280, height: 280, borderRadius: 140, borderWidth: 3, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
    profileCard: { width: '90%', borderRadius: 24, padding: 24, borderWidth: 1, elevation: 10 },
    profileCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    cardAvatar: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    cardName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    cardStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    cardDataRow: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 15, marginVertical: 10, gap: 10 },
    cardDataItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardDataText: { fontSize: 13, fontWeight: '600' },
    cardActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    cardBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});