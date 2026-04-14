import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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
    const [activeTopTab, setActiveTopTab] = useState<'perfil' | 'social' | 'clas'>('social');
    const [activeSocialSubTab, setActiveSocialSubTab] = useState<'amigos' | 'recomendados' | 'inbox'>('amigos');
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
    const [clansSearch, setClansSearch] = useState('');

    // Estados para Chat
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [chatTarget, setChatTarget] = useState<{ id: string, name: string, avatar?: string | null } | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatScrollRef = useRef<ScrollView>(null);
    const chatSubscription = useRef<any>(null);

    // Estados para Preview
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

            // 0. Likes da Nuvem
            const cloudLikes = await AuthService.getLikesCloud(loggedUser.id);
            setLikedIds(cloudLikes);

            // 1. Amigos da Nuvem
            const friends = await AuthService.getFriendsCloud(user.id);
            setFriendIds(friends);

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

    // Carrega exploradores próximos para a "Teia"
    useEffect(() => {
        if (activeSocialSubTab === 'recomendados' && activeTopTab === 'social') {
            const loadNearby = async () => {
                setIsLoadingNearby(true);
                try {
                    const user = await getCurrentUserLocal();
                    if (user) {
                        const results = await AuthService.getNearbyExplorers(user.id);
                        setNearbyExplorers(results);
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
                            placeholder="Buscar amigos..."
                            placeholderTextColor={colors.subtext}
                            value={socialSearch}
                            onChangeText={setSocialSearch}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable style={styles.searchActionBtn} onPress={() => setIsAddFriendModalVisible(true)}>
                            <Ionicons name="person-add" size={18} color="#FFF" />
                        </Pressable>
                    </View>

                    {/* SUB TAB BAR SOCIAL */}
                    <View style={styles.subTabBar}>
                        <Pressable onPress={() => setActiveSocialSubTab('amigos')} style={[styles.subTabBtn, activeSocialSubTab === 'amigos' && { backgroundColor: colors.accent }]}>
                            <Text style={[styles.subTabText, { color: activeSocialSubTab === 'amigos' ? colors.primary : colors.subtext }]}>Amigos</Text>
                        </Pressable>
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
                        {activeSocialSubTab === 'amigos' ? (
                            <View style={styles.membersSection}>
                                {[...allMembersMap.values()]
                                    .filter(m => m.id !== 'me')
                                    .filter(m => m.name.toLowerCase().includes(socialSearch.toLowerCase()))
                                    .sort((a, b) => {
                                        const aLiked = likedIds.includes(a.id);
                                        const bLiked = likedIds.includes(b.id);
                                        if (aLiked && !bLiked) return -1;
                                        if (!aLiked && bLiked) return 1;
                                        return 0;
                                    }).map(member => {
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

                                                    <View style={[
                                                        styles.presenceCircle,
                                                        {
                                                            backgroundColor: member?.online ? '#4CAF50' : '#E74C3C',
                                                            borderColor: colors.background
                                                        }
                                                    ]} />
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => {
                                                        setActivePreviewMember(member);
                                                        setIsMemberCardVisible(true);
                                                    }}
                                                    style={styles.memberInfo}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text style={[styles.memberName, { color: colors.text }]}>{member?.name}</Text>
                                                        {isLiked && <Ionicons name="heart" size={14} color="#E74C3C" />}
                                                    </View>
                                                    <Text style={[styles.memberLoc, { color: colors.subtext }]}>{member?.location}</Text>
                                                    <Text style={[styles.memberSince, { color: colors.subtext }]}>Desde às {member?.since}</Text>
                                                </Pressable>
                                                <Pressable onPress={() => handleOpenChat(member.id, member.name, member.avatar)}>
                                                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.subtext} />
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                            </View>
                        ) : activeSocialSubTab === 'recomendados' ? (
                            <View style={{ flex: 1, backgroundColor: colors.background }}>
                                {isLoadingNearby ? (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: colors.subtext }}>Lançando a teia...</Text>
                                    </View>
                                ) : nearbyExplorers.length > 0 ? (
                                    <NearbyWeb 
                                        explorers={nearbyExplorers} 
                                        userAvatar={pet?.customImageUri || undefined}
                                        userColor={colors.primary}
                                        onSelectExplorer={(ex) => {
                                            setActivePreviewMember({
                                                id: ex.id,
                                                name: ex.name,
                                                avatar: ex.avatar,
                                                species: ex.species || 'bunny',
                                                location: ex.location || 'Explorador próximo',
                                                level: ex.level || 5,
                                                xp: ex.xp || 120,
                                                online: true,
                                                since: 'agora'
                                            });
                                            setIsMemberCardVisible(true);
                                        }}
                                    />
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

            {/* MODAL: CHAT (Mensagens Efêmeras) */}
            <Modal visible={isChatVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                        <Pressable onPress={() => {
                            setIsChatVisible(false);
                            if (chatSubscription.current) {
                                supabase.removeChannel(chatSubscription.current);
                                chatSubscription.current = null;
                            }
                        }} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="chevron-back" size={24} color={colors.text} />
                            <Pressable
                                onPress={() => {
                                    if (chatTargetMember) {
                                        setActivePreviewMember(chatTargetMember);
                                        setIsAvatarZoomVisible(true);
                                    }
                                }}
                                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, marginLeft: 10, alignItems: 'center', justifyContent: 'center' }}
                            >
                                {chatTarget?.avatar ? (
                                    <Text style={{ fontSize: 16 }}>{chatTarget?.avatar}</Text>
                                ) : chatTargetMember?.species ? (
                                    <PetPreview species={chatTargetMember.species} size={16} />
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
                                <Text style={[styles.title, { color: colors.text, marginLeft: 10, fontSize: 18 }]}>{chatTarget?.name}</Text>
                            </Pressable>
                        </Pressable>
                        <Ionicons name="time-outline" size={18} color={colors.subtext} />
                    </View>

                    <ScrollView
                        style={{ flex: 1, padding: 20 }}
                        ref={chatScrollRef}
                        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                    >
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ backgroundColor: isDarkMode ? '#2A2A36' : '#F0EDFA', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                                <Text style={{ fontSize: 10, color: colors.subtext, fontWeight: '700' }}>MENSAGENS EXPIRAM EM 1 HORA</Text>
                            </View>
                        </View>

                        {chatMessages.length === 0 && (
                            <Text style={{ textAlign: 'center', color: colors.subtext, marginTop: 40, fontSize: 12 }}>Nenhuma mensagem recente. Diga oi!</Text>
                        )}

                        {chatMessages.map(msg => (
                            <View key={msg.id} style={{
                                alignSelf: msg.senderId === 'me' ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.senderId === 'me' ? colors.primary : (isDarkMode ? '#333340' : '#F2F1F7'),
                                padding: 12,
                                borderRadius: 18,
                                borderBottomRightRadius: msg.senderId === 'me' ? 4 : 18,
                                borderBottomLeftRadius: msg.senderId === 'me' ? 18 : 4,
                                marginBottom: 10,
                                maxWidth: '80%'
                            }}>
                                <Text style={{
                                    color: msg.senderId === 'me' ? '#FFFFFF' : (isDarkMode ? '#F7F7FA' : '#1A1A2E'),
                                    fontSize: 14
                                }}>{msg.text}</Text>
                            </View>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <View style={{ padding: 15, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <TextInput
                            style={[
                                styles.modalInput,
                                {
                                    flex: 1,
                                    height: 45,
                                    backgroundColor: isDarkMode ? '#121218' : '#F7F7FA',
                                    borderColor: colors.border,
                                    color: colors.text
                                }
                            ]}
                            value={chatInput}
                            onChangeText={setChatInput}
                            placeholder="Enviar mensagem..."
                            placeholderTextColor={colors.subtext}
                        />
                        <Pressable
                            onPress={handleSendMessage}
                            style={{ width: 45, height: 45, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="send" size={20} color="#FFF" />
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* MODAL: ZOOM DO AVATAR */}
            <Modal visible={isAvatarZoomVisible} transparent animationType="fade">
                <Pressable onPress={() => setIsAvatarZoomVisible(false)} style={styles.modalBg}>
                    <View style={{ padding: 20 }}>
                        <View style={[styles.avatarZoomCircle, { borderColor: colors.primary, backgroundColor: colors.card }]}>
                            {activePreviewMember?.species ? (
                                <PetPreview species={activePreviewMember.species} size={220} />
                            ) : (
                                <Ionicons name="person" size={120} color={colors.primary} />
                            )}
                        </View>
                        <Text style={{ color: '#FFF', textAlign: 'center', marginTop: 20, fontWeight: '700' }}>Toque em qualquer lugar para fechar</Text>
                    </View>
                </Pressable>
            </Modal>
            {/* MODAL: CARD DE PERFIL DO MEMBRO (Refinado) */}
            <Modal visible={isMemberCardVisible} transparent animationType="fade">
                <Pressable onPress={() => setIsMemberCardVisible(false)} style={styles.modalBg}>
                    <Pressable style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
                        {/* Header com Background Colorido */}
                        <View style={{ height: 100, backgroundColor: colors.accent, width: '100%' }} />
                        
                        <View style={{ padding: 24, marginTop: -50 }}>
                            <View style={styles.profileCardHeader}>
                                <View style={[styles.cardAvatar, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 4, elevation: 5 }]}>
                                    <View style={{ width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden' }}>
                                        {activePreviewMember?.species ? (
                                            <PetPreview species={activePreviewMember.species} size={72} customImageUri={activePreviewMember.avatar} />
                                        ) : (
                                            <Ionicons name="person" size={40} color={colors.primary} />
                                        )}
                                    </View>
                                    <View style={[styles.presenceCircleLarge, { backgroundColor: activePreviewMember?.online ? '#4CAF50' : '#E74C3C', borderColor: colors.card }]} />
                                </View>
                                <View style={{ flex: 1, paddingTop: 40 }}>
                                    <Text style={[styles.cardName, { color: colors.text, fontSize: 22 }]}>{activePreviewMember?.name || 'Explorador'}</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext }}>#{activePreviewMember?.id?.substring(0, 8) || '?'}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                <View style={{ flex: 1, backgroundColor: isDarkMode ? '#2A2A36' : '#F0EDFA', padding: 12, borderRadius: 16, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 10, color: colors.subtext, fontWeight: '800' }}>LEVEL</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{activePreviewMember?.level || 1}</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: isDarkMode ? '#2A2A36' : '#F0EDFA', padding: 12, borderRadius: 16, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 10, color: colors.subtext, fontWeight: '800' }}>XP</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{activePreviewMember?.xp || 0}</Text>
                                </View>
                            </View>

                            <View style={[styles.cardDataRow, { borderColor: colors.border, borderTopWidth: 1, paddingTop: 15 }]}>
                                <View style={styles.cardDataItem}>
                                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                                    <Text style={[styles.cardDataText, { color: colors.subtext, flex: 1 }]} numberOfLines={1}>
                                        {activePreviewMember?.location || 'Área Selvagem'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardActions}>
                                <Pressable
                                    onPress={() => {
                                        setIsMemberCardVisible(false);
                                        handleOpenChat(activePreviewMember.id, activePreviewMember.name, activePreviewMember.avatar);
                                    }}
                                    style={[styles.cardBtn, { backgroundColor: colors.primary, flex: 2 }]}
                                >
                                    <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontWeight: '800', marginLeft: 8 }}>Chat</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleToggleLike(activePreviewMember.id)}
                                    style={[styles.cardBtn, { backgroundColor: likedIds.includes(activePreviewMember?.id) ? colors.primary + '22' : colors.accent, flex: 1 }]}
                                >
                                    <Ionicons
                                        name={likedIds.includes(activePreviewMember?.id) ? "heart" : "heart-outline"}
                                        size={22}
                                        color={colors.primary}
                                    />
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* MODAL: VERIFICAÇÃO DE SENHA (Privados) */}
            <Modal visible={isPassModalVisible} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="lock-closed" size={40} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 10 }} />
                        <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>Clã Privado</Text>
                        <Text style={{ color: colors.subtext, textAlign: 'center', marginBottom: 20 }}>Insira a senha para visualizar e participar deste clã.</Text>

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
                            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleVerifyPassword}>
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Acessar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Criar Círculo */}
            <Modal visible={isCreateModalVisible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Criar Clã</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#121218' : '#F7F7FA' }]}
                            value={circleName}
                            onChangeText={setCircleName}
                            placeholder="Nome do clã"
                            placeholderTextColor={colors.subtext}
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                            <Text style={{ color: colors.text, fontWeight: '700' }}>Tornar Clã Público</Text>
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
                        <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 4 }}>
                            {isPublicNewClan
                                ? 'Clãs públicos podem ser acessados por qualquer usuário.'
                                : 'Clãs privados exigem senha para visualização e entrada.'}
                        </Text>

                        <View style={styles.modalActions}>
                            <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setIsCreateModalVisible(false)}>
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleCreateCircle}>
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Criar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Adicionar Amigo */}
            <Modal visible={isAddFriendModalVisible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Adicionar Amigo</Text>
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
                            <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleAddFriend}>
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

    // Top Tab Bar
    topNavRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 12, marginBottom: 12, gap: 12 },
    univBackBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    topTabBar: { flex: 1, height: 42, flexDirection: 'row', backgroundColor: 'transparent', borderRadius: 21, padding: 3, borderWidth: 1, borderColor: '#33334020' },
    topTabBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
    topTabText: { fontWeight: '700', fontSize: 13 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800' },

    // Search Bar
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 10, marginBottom: 10, borderRadius: 24, borderWidth: 1, borderColor: '#33334020', padding: 4, paddingLeft: 12 },
    searchInput: { flex: 1, height: 40, paddingHorizontal: 8, fontSize: 14, fontWeight: '600' },
    searchActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },

    // Circle rows
    circleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 14 },

    // Sub Tab Bar Social
    subTabBar: { flexDirection: 'row', marginBottom: 20, marginTop: 10, justifyContent: 'space-around', alignItems: 'center' },
    subTabBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: 'transparent', minWidth: 100, alignItems: 'center' },
    subTabText: { fontSize: 13, fontWeight: '700' },

    circleAvatars: { flexDirection: 'row', alignItems: 'center' },
    stackedAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    countBadge: {},
    countBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    circleName: { flex: 1, fontSize: 15, fontWeight: '600' },

    // Action buttons
    circleActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 20 },
    circleActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 28, alignItems: 'center' },
    circleActionText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

    // Share card
    shareCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 20, padding: 18, borderRadius: 20, borderWidth: 1, gap: 12 },
    shareTitle: { fontSize: 14, fontWeight: '700' },
    shareSub: { fontSize: 12, fontWeight: '500', marginTop: 3, opacity: 0.7 },

    // Members section
    membersSection: { marginTop: 4, paddingBottom: 40 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8 },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
    memberAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    batteryMini: { position: 'absolute', bottom: -4, left: -4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
    batteryMiniText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '700' },
    memberLoc: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    memberSince: { fontSize: 11, fontWeight: '500', marginTop: 1 },

    // Modals
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', borderRadius: 24, padding: 24, borderWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    modalInput: { borderWidth: 1, borderRadius: 16, padding: 14, fontSize: 14 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
    modalBtnText: { fontWeight: '700', fontSize: 14 },

    memberItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },

    // Novos estilos de presença (Bolinha do Avatar)
    presenceCircle: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, zIndex: 10 },
    presenceCircleLarge: { position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: 10, borderWidth: 3, zIndex: 10 },

    avatarZoomCircle: { width: 300, height: 300, borderRadius: 150, borderWidth: 4, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
    profileCard: { width: '90%', borderRadius: 28, padding: 24, borderWidth: 2, elevation: 10 },
    profileCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    cardAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    cardName: { fontSize: 24, fontWeight: '900' },
    cardStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    cardDataRow: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 15, marginVertical: 10, gap: 10 },
    cardDataItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardDataText: { fontSize: 13, fontWeight: '600' },
    cardActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
    cardBtn: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});