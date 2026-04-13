import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, Modal, TextInput, Alert, Share, Switch, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { ProfileView } from '../../components/ProfileView';
import { getChatMessagesLocal, sendMessageLocal, ChatMessage } from '../../localDatabase';
import { PetPreview } from '../../components/PetPreview';

// Mock de clãs
const INITIAL_MOCK_CIRCLES = [
    { id: 'c1', name: 'Bando dos Doguinhos', isPublic: false, password: '123', members: [
        { id: 'm1', name: 'Pedro', avatar: null, species: 'puppy', online: true, battery: 90, location: 'Em Plantacao de algodao', since: '1:24 pm' },
        { id: 'm2', name: 'Ana', avatar: null, species: 'bunny', online: true, battery: 65, location: 'Shopping Morumbi', since: '2:10 pm' },
        { id: 'm3', name: 'Carlos', avatar: null, species: 'cat', online: false, battery: 42, location: 'Em casa', since: '11:00 am' },
    ]},
    { id: 'c2', name: 'babilonicas', isPublic: true, members: [
        { id: 'm4', name: 'Julia', avatar: null, species: 'fox', online: true, battery: 78, location: 'Av. Paulista', since: '3:00 pm' },
        { id: 'm5', name: 'Lucas', avatar: null, species: 'wolf', online: false, battery: 55, location: 'USP', since: '9:30 am' },
    ]},
    { id: 'c3', name: 'unda unda', isPublic: false, password: 'dog', members: [
        { id: 'm7', name: 'Gustavo', avatar: null, species: 'bear', online: true, battery: 88, location: 'Academia', since: '4:15 pm' },
    ]},
    { id: 'c4', name: 'morango do desamor', isPublic: true, members: [
        { id: 'm13', name: 'Sofia', avatar: null, species: 'parrot', online: true, battery: 60, location: 'Café', since: '11:30 am' },
    ]},
];

export default function SocialScreen() {
    const { colors, isDarkMode } = useTheme();
    const [activeTopTab, setActiveTopTab] = useState<'perfil' | 'social' | 'clas'>('clas');
    
    // Estados para Clãs
    const [circles, setCircles] = useState(INITIAL_MOCK_CIRCLES);
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

    // Estados para Chat
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [chatTarget, setChatTarget] = useState<{ id: string, name: string, avatar?: string | null } | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatScrollRef = useRef<ScrollView>(null);

    // Estados para Preview
    const [isAvatarZoomVisible, setIsAvatarZoomVisible] = useState(false);
    const [isMemberCardVisible, setIsMemberCardVisible] = useState(false);
    const [activePreviewMember, setActivePreviewMember] = useState<any>(null);

    const activeCircle = circles.find(c => c.id === selectedCircleId);

    const loadChat = async (target: { id: string, name: string }) => {
        const msgs = await getChatMessagesLocal('me', target.id);
        setChatMessages(msgs);
    };

    const handleOpenChat = (id: string, name: string, avatar?: string | null) => {
        setChatTarget({ id, name, avatar });
        setIsChatVisible(true);
        loadChat({ id, name });
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !chatTarget) return;
        
        const txt = chatInput.trim();
        setChatInput('');
        
        // Salva mensagem do usuário
        await sendMessageLocal('me', chatTarget.id, txt);
        await loadChat(chatTarget);
        
        // Simula resposta do bot após 1.5s
        setTimeout(async () => {
            const botResponses = [
                'Legal! Estou chegando perto.',
                'Opa, acabei de ver sua mensagem!',
                'Beleza, vamos nos falando.',
                'Tudo certo por aqui!',
                '👍',
                'Que legal esse lugar que você está!'
            ];
            const randomResp = botResponses[Math.floor(Math.random() * botResponses.length)];
            await sendMessageLocal(chatTarget.id, 'me', randomResp);
            if (isChatVisible) await loadChat(chatTarget);
        }, 1500);
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

    const handleCreateCircle = () => {
        if (!circleName.trim()) return;
        if (!isPublicNewClan && !newClanPassword.trim()) {
            Alert.alert('Erro', 'Por favor, defina uma senha para seu clã privado.');
            return;
        }
        
        const newCircle = {
            id: 'c' + Date.now(),
            name: circleName.trim(),
            isPublic: isPublicNewClan,
            password: isPublicNewClan ? undefined : newClanPassword,
            members: [
                { id: 'me', name: 'Você', avatar: null, species: 'puppy', online: true, battery: 100, location: 'Localização atual', since: 'Agora' }
            ]
        };
        
        setCircles([newCircle, ...circles]);
        Alert.alert('Clã Criado', `"${circleName}" foi criado.`);
        setCircleName('');
        setNewClanPassword('');
        setIsPublicNewClan(false);
        setIsCreateModalVisible(false);
    };

    const handleVerifyPassword = () => {
        if (!activeCircle) return;
        if (passAttempt === activeCircle.password) {
            setIsPassModalVisible(false);
            setPassAttempt('');
            
            // Se já for membro só abre, se não for, entra automaticamente ao acertar a senha
            const isMember = activeCircle.members.some(m => m.id === 'me');
            if (!isMember) {
                handleJoinCircle(activeCircle.id);
            }
            setIsDetailModalVisible(true);
        } else {
            Alert.alert('Senha Incorreta', 'Tente novamente.');
        }
    };

    const handleJoinCircle = (circleId: string) => {
        setCircles(prev => prev.map(c => {
            if (c.id === circleId) {
                return {
                    ...c,
                    members: [...c.members, { id: 'me', name: 'Você', avatar: null, species: 'puppy', online: true, battery: 100, location: 'Localização atual', since: 'Agora' }] as any
                };
            }
            return c;
        }));
        
        const target = circles.find(c => c.id === circleId);
        if (target?.isPublic) {
            Alert.alert('Sucesso', 'Você entrou no clã!');
        }
    };

    const handleAddFriend = () => {
        if (!friendId.trim()) return;
        Alert.alert('Convite Enviado', `Convite enviado para ${friendId}.`);
        setFriendId('');
        setIsAddFriendModalVisible(false);
    };

    // Coleção única da aba social (Membros dos clãs)
    const allMembersMap = new Map();
    circles.forEach(c => {
        if (c && c.members) {
            c.members.forEach(m => {
                if (m && m.id && !allMembersMap.has(m.id)) allMembersMap.set(m.id, m);
            });
        }
    });
    const allMembers = Array.from(allMembersMap.values());
    const chatTargetMember = (chatTarget && chatTarget.id) ? allMembers.find(m => m && m.id === chatTarget.id) : null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* TOP TAB BAR */}
            <View style={styles.topTabBar}>
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

            {/* ABA: MEU PERFIL */}
            {activeTopTab === 'perfil' && (
                <View style={{ flex: 1 }}>
                    <ProfileView />
                </View>
            )}

            {/* ABA: SOCIAL (Geral) */}
            {activeTopTab === 'social' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Social</Text>
                        <Pressable onPress={() => setIsAddFriendModalVisible(true)}>
                            <Ionicons name="person-add-outline" size={22} color={colors.text} />
                        </Pressable>
                    </View>
                    
                    <View style={styles.membersSection}>
                        {(allMembers || []).map(member => {
                            if (!member) return null;
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
                                            <PetPreview species={member.species} size={30} />
                                        ) : (
                                            <Ionicons name="person" size={24} color={colors.primary} />
                                        )}
                                        {member?.online && <View style={styles.onlineStatus} />}
                                    </Pressable>
                                    <Pressable 
                                        onPress={() => {
                                            setActivePreviewMember(member);
                                            setIsMemberCardVisible(true);
                                        }}
                                        style={styles.memberInfo}
                                    >
                                        <Text style={[styles.memberName, { color: colors.text }]}>{member?.name}</Text>
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
                </ScrollView>
            )}

            {/* ABA: CLÃS */}
            {activeTopTab === 'clas' && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Seus Clãs</Text>
                        <Pressable onPress={() => setIsCreateModalVisible(true)}>
                            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* Lista de círculos */}
                    {circles.map(circle => (
                        <Pressable 
                            key={circle.id} 
                            style={[styles.circleRow, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                setSelectedCircleId(circle.id);
                                const isMember = circle.members.some(m => m.id === 'me');
                                if (isMember || circle.isPublic) {
                                    setIsDetailModalVisible(true);
                                } else {
                                    setIsPassModalVisible(true);
                                }
                            }}
                        >
                            <View style={styles.circleAvatars}>
                                {circle.members.slice(0, 3).map((m, i) => {
                                    if (!m) return null;
                                    return (
                                        <View key={(m.id || i) + i} style={[styles.stackedAvatar, { 
                                            marginLeft: i > 0 ? -12 : 0, 
                                            zIndex: 3 - i,
                                            borderColor: colors.card,
                                            backgroundColor: isDarkMode ? '#2A2A36' : '#F0EDFA',
                                        }]}>
                                            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{(m.name || '?')[0]}</Text>
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
                                    {activeCircle?.isPublic && !activeCircle?.members?.some(m => m && m.id === 'me') && (
                                        <Pressable 
                                            style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                                            onPress={() => handleJoinCircle(activeCircle.id)}
                                        >
                                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Participar</Text>
                                        </Pressable>
                                    )}
                                </View>
                                {(activeCircle?.members || []).map(member => {
                                    if (!member) return null;
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
                                                    <PetPreview species={member.species} size={30} />
                                                ) : (
                                                    <Ionicons name="person" size={24} color={colors.primary} />
                                                )}
                                                {member?.online && <View style={styles.onlineStatus} />}
                                            </Pressable>
                                            <Pressable 
                                                onPress={() => {
                                                    setActivePreviewMember(member);
                                                    setIsMemberCardVisible(true);
                                                }}
                                                style={styles.memberInfo}
                                            >
                                                <Text style={[styles.memberName, { color: colors.text }]}>{member?.name}</Text>
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
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* MODAL: CHAT (Mensagens Efêmeras) */}
            <Modal visible={isChatVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                        <Pressable onPress={() => setIsChatVisible(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                        <Text style={{ color: '#FFF', textAlign: 'center', marginTop: 20, fontWeight: '700' }}>Cliquem em qualquer lugar para fechar</Text>
                    </View>
                </Pressable>
            </Modal>

            {/* MODAL: CARD DE PERFIL DO MEMBRO */}
            <Modal visible={isMemberCardVisible} transparent animationType="slide">
                <Pressable onPress={() => setIsMemberCardVisible(false)} style={styles.modalBg}>
                    <Pressable style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.profileCardHeader}>
                            <View style={[styles.cardAvatar, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
                                {activePreviewMember?.species ? (
                                    <PetPreview species={activePreviewMember.species} size={60} />
                                ) : (
                                    <Ionicons name="person" size={40} color={colors.primary} />
                                )}
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={[styles.cardName, { color: colors.text }]}>{activePreviewMember?.name || 'Explorador'}</Text>
                                <View style={[styles.cardStatus, { backgroundColor: activePreviewMember?.online ? '#4CAF5022' : '#F4433622' }]}>
                                    <View style={[styles.cardStatusDot, { backgroundColor: activePreviewMember?.online ? '#4CAF50' : '#F44336' }]} />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: activePreviewMember?.online ? '#4CAF50' : '#F44336' }}>
                                        {activePreviewMember?.online ? 'Online agora' : 'Offline'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.cardDataRow, { borderColor: colors.border }]}>
                            <View style={styles.cardDataItem}>
                                <Ionicons name="location-outline" size={16} color={colors.primary} />
                                <Text style={[styles.cardDataText, { color: colors.subtext }]}>{activePreviewMember?.location || 'Desconhecida'}</Text>
                            </View>
                            <View style={styles.cardDataItem}>
                                <Ionicons name="battery-charging-outline" size={16} color="#4CAF50" />
                                <Text style={[styles.cardDataText, { color: colors.subtext }]}>{(activePreviewMember?.battery || 0)}% de bateria</Text>
                            </View>
                        </View>

                        <View style={styles.cardActions}>
                            <Pressable 
                                onPress={() => {
                                    if (activePreviewMember?.id) {
                                        setIsMemberCardVisible(false);
                                        handleOpenChat(activePreviewMember.id, activePreviewMember.name || 'Amigo', activePreviewMember.avatar);
                                    }
                                }}
                                style={[styles.cardBtn, { backgroundColor: colors.primary }]}
                            >
                                <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>MENSAGEM</Text>
                            </Pressable>
                            <Pressable 
                                onPress={() => Alert.alert('Like', `Você enviou energia positiva para ${activePreviewMember?.name}!`)}
                                style={[styles.cardBtn, { backgroundColor: colors.accent }]}
                            >
                                <Ionicons name="heart-outline" size={20} color={colors.primary} />
                            </Pressable>
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
    topTabBar: { flexDirection: 'row', backgroundColor: 'transparent', marginHorizontal: 20, marginTop: 10, marginBottom: 10, borderRadius: 24, padding: 4, borderWidth: 1, borderColor: '#33334020' },
    topTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
    topTabText: { fontWeight: '700', fontSize: 13 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800' },

    // Circle rows
    circleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 14 },
    circleAvatars: { flexDirection: 'row', alignItems: 'center' },
    stackedAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    countBadge: { },
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
    membersSection: { marginTop: 24 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8 },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
    memberAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' },
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
    onlineStatus: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FFF' },
    avatarZoomCircle: { width: 300, height: 300, borderRadius: 150, borderWidth: 4, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
    profileCard: { width: '90%', borderRadius: 28, padding: 24, borderWidth: 2, elevation: 10 },
    profileCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    cardAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    cardName: { fontSize: 24, fontWeight: '900' },
    cardStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    cardStatusDot: { width: 8, height: 8, borderRadius: 4 },
    cardDataRow: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 15, marginVertical: 10, gap: 10 },
    cardDataItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardDataText: { fontSize: 13, fontWeight: '600' },
    cardActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
    cardBtn: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
