import { supabase } from './supabaseConfig';
import { Platform, LayoutAnimation } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// Variáveis de memória para os bots (chats e likes locais)
const mockChats: Record<string, any[]> = {};
const mockLikes: Set<string> = new Set();
const botSubscriptions: Record<string, (msg: any) => void> = {};

// Utilitário para validar UUID e evitar erros 22P02 no banco
export const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * AuthService centraliza a integração real com o Supabase.
 */
export const AuthService = {
    /**
     * Cadastro Real no Supabase
     */
    signUp: async (email: string, password: string, securityQuestion: string, securityAnswer: string, twoFactorPin: string) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Erro ao criar usuário.");

            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const wanderId = `#WP-${randomStr}`;

            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        email: email.toLowerCase(),
                        security_question: securityQuestion,
                        security_answer: securityAnswer.toLowerCase().trim(),
                        two_factor_pin: twoFactorPin,
                        wander_id: wanderId,
                        name: email.split('@')[0],
                    }
                ]);

            if (profileError) throw profileError;
            return authData.user;
        } catch (error: any) {
            console.error("Erro no SignUp Supabase:", error);
            throw error;
        }
    },

    signIn: async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return data.user;
        } catch (error: any) {
            console.error("Erro no SignIn Supabase:", error);
            throw error;
        }
    },

    getUserProfile: async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();

            if (error) throw error;
            return {
                ...data,
                twoFactorPin: data.two_factor_pin,
                securityQuestion: data.security_question,
                securityAnswer: data.security_answer,
                wanderId: data.wander_id
            };
        } catch (error: any) {
            console.error("Erro ao buscar perfil no Supabase:", error);
            throw error;
        }
    },

    /**
     * Upload de Avatar para o Supabase Storage
     * Versão robusta usando ArrayBuffer para evitar erro de rede no Android/Expo
     */
    uploadAvatar: async (userId: string, uri: string) => {
        if (!isValidUUID(userId)) return uri; // Permite que modo Offline/Dev funcione usando a imagem local
        
        try {
            // Garante que o Supabase reconhece uma sessão ativa antes de tentar o upload
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error("Sessão Supabase não encontrada durante o upload.");
                throw new Error("Você precisa estar logado para enviar uma foto.");
            }

            // 1. Lê o arquivo local como Base64 usando expo-file-system
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            // 2. Converte Base64 para ArrayBuffer
            // O Supabase lida muito melhor com ArrayBuffer do que com Blobs puros no React Native
            const arrayBuffer = decode(base64);
            
            const fileExt = uri.split('.').pop() || 'jpg';
            const fileName = `${userId}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 3. Faz o upload para o Supabase
            const { data, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, arrayBuffer, {
                    contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 4. Retorna a URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error: any) {
            console.error("=== ERRO UPLOAD AVATAR ===");
            console.error("Mensagem:", error.message);
            console.error("Detalhes:", error.details);
            console.error("Dica:", error.hint);
            console.error("Stack:", error);
            throw error;
        }
    },

    updatePassword: async (newPassword: string) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao atualizar senha no Supabase:", error);
            throw error;
        }
    },

    updateProfile: async (uid: string, updates: any) => {
        if (!isValidUUID(uid)) return { success: false };
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', uid);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            // Se for erro de coluna inexistente (PGRST204), ignoramos para não crashar o App
            if (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache')) {
                console.warn("Aviso: Algumas colunas de configuração não foram encontradas no banco. Atualize o banco com o script SQL mais recente.");
                return { success: false, silentError: true };
            }
            console.error("Erro ao atualizar perfil no Supabase:", error);
            throw error;
        }
    },

    updatePushToken: async (uid: string, token: string) => {
        if (!isValidUUID(uid) || !token) return;
        try {
            await supabase.from('profiles').update({ push_token: token }).eq('id', uid);
        } catch (error) {
            console.error("Erro ao salvar push token no Supabase:", error);
        }
    },

    syncStats: async (uid: string, stats: any) => {
        if (!isValidUUID(uid)) return;
        try {
            await supabase.from('profiles').update(stats).eq('id', uid);
        } catch (error: any) {
            console.error("Erro ao sincronizar stats no Supabase:", error);
        }
    },

    syncPet: async (ownerId: string, petData: any) => {
        if (!isValidUUID(ownerId)) return;
        try {
            await supabase.from('pets').upsert({
                owner_id: ownerId,
                name: petData.name,
                species: petData.species,
                accessory: petData.accessory || 'none',
                custom_image_url: petData.customImageUri || null,
                updated_at: new Date().toISOString()
            });
        } catch (error: any) {
            console.error("Erro ao sincronizar Pet no Supabase:", error);
        }
    },

    updateLocation: async (uid: string, latitude: number, longitude: number, ghostMode: boolean = false) => {
        if (!isValidUUID(uid)) return;
        try {
            await supabase.from('locations').upsert({
                user_id: uid, latitude, longitude, ghost_mode: ghostMode,
                updated_at: new Date().toISOString()
            });
        } catch (error: any) {
            console.error("Erro ao sincronizar localização:", error);
        }
    },

    saveExpedition: async (uid: string, distance: number, path: any[], durationMinutes: number) => {
        if (!isValidUUID(uid)) return;
        try {
            await supabase.from('expeditions').insert([{
                user_id: uid, distance, path, duration_minutes: durationMinutes,
                date: new Date().toISOString().split('T')[0]
            }]);
        } catch (error: any) {
            console.error("Erro ao salvar expedição na nuvem:", error);
        }
    },

    createGroup: async (name: string, founderId: string, password?: string, isPublic: boolean = true) => {
        if (!isValidUUID(founderId)) throw new Error("ID de fundador inválido.");
        try {
            const { data, error } = await supabase
                .from('groups')
                .insert([{ name, founder_id: founderId, password, is_public: isPublic }])
                .select().single();
            if (error) throw error;
            await supabase.from('group_members').insert([{ group_id: data.id, user_id: founderId }]);
            return data;
        } catch (error) {
            console.error("Erro ao criar clã:", error);
            throw error;
        }
    },

    joinGroup: async (groupId: string, userId: string) => {
        if (!isValidUUID(userId)) return;
        try {
            await supabase.from('group_members').upsert([{ group_id: groupId, user_id: userId }]);
        } catch (error: any) {
            console.error("Erro ao entrar no clã:", error);
        }
    },

    getGroups: async () => {
        try {
            // First, get real data
            let realGroups: any[] = [];
            const { data, error } = await supabase.from('groups').select(`
                id, name, is_public, password, founder_id,
                group_members(user_id, profiles(id, name, avatar, location, wander_id))
            `);
            if (!error && data) realGroups = data;

            // INJECT FAKE BOTS/CLAN FOR TESTING!
            const fakeClan = {
                id: 'fake-clan-001',
                name: 'Exploradores Lendários (Demo)',
                is_public: true,
                password: null,
                founder_id: 'bot-1',
                group_members: [
                    { user_id: 'bot-1', profiles: { id: 'bot-1', name: 'Gus', avatar: 'https://i.pravatar.cc/150?u=gus', location: 'Curitiba, BR', wander_id: '#WP-GUS' } },
                    { user_id: 'bot-2', profiles: { id: 'bot-2', name: 'Aline', avatar: 'https://i.pravatar.cc/150?u=aline', location: 'São Paulo, BR', wander_id: '#WP-ALI' } },
                    { user_id: 'bot-3', profiles: { id: 'bot-3', name: 'Marcos', avatar: 'https://i.pravatar.cc/150?u=marcos', location: 'Rio de Janeiro, BR', wander_id: '#WP-MAR' } }
                ]
            };

            return [...realGroups, fakeClan];
        } catch (error) {
            console.error("Erro ao buscar clãs:", error);
            return [];
        }
    },

    addFriendCloud: async (userId: string, friendId: string) => {
        if (!isValidUUID(userId) || !isValidUUID(friendId)) return;
        try {
            const isLuna = friendId === '00000000-0000-0000-0000-000000000001';
            await supabase.from('friendships').upsert([{ 
                user_id1: userId, user_id2: friendId, 
                status: isLuna ? 'accepted' : 'pending' 
            }]);
        } catch (error) {
            console.error("Erro ao enviar solicitação na nuvem:", error);
        }
    },

    getFriendsCloud: async (userId: string) => {
        if (!isValidUUID(userId)) return ['bot-1', 'bot-2']; // Mock some friends by default
        try {
            const { data, error } = await supabase.from('friendships').select('user_id1, user_id2')
                .or(`user_id1.eq.${userId},user_id2.eq.${userId}`).eq('status', 'accepted');
            if (error) throw error;
            const friends = data.map((f: any) => f.user_id1 === userId ? f.user_id2 : f.user_id1);
            
            // INJECT FAKE FRIENDS!
            return [...new Set([...friends, 'bot-1', 'bot-2'])];
        } catch (error) {
            console.error("Erro ao buscar amigos:", error);
            return ['bot-1', 'bot-2'];
        }
    },

    getFriendsProfilesCloud: async (friendIds: string[]) => {
        const mockBotProfiles = [
            { id: 'bot-1', name: 'Gus', avatar: 'https://i.pravatar.cc/150?u=gus', location: 'Curitiba, BR', species: 'puppy', online: true, since: '08:30', wander_id: '#WP-GUS' },
            { id: 'bot-2', name: 'Aline', avatar: 'https://i.pravatar.cc/150?u=aline', location: 'São Paulo, BR', species: 'cat', online: true, since: '09:15', wander_id: '#WP-ALI' }
        ];

        const realIds = friendIds.filter(id => isValidUUID(id));
        const botIdsIncluded = friendIds.filter(id => id.startsWith('bot-'));

        try {
            let realProfiles: any[] = [];
            if (realIds.length > 0) {
                const { data, error } = await supabase.from('profiles').select('*').in('id', realIds);
                if (!error && data) realProfiles = data;
            }

            const matchedBots = mockBotProfiles.filter(b => botIdsIncluded.includes(b.id));
            return [...realProfiles, ...matchedBots];
        } catch (error) {
            console.error("Erro ao buscar perfis de amigos:", error);
            return mockBotProfiles.filter(b => botIdsIncluded.includes(b.id));
        }
    },

    getNearbyExplorers: async (userId: string) => {
        try {
            const friends = await AuthService.getFriendsCloud(userId);
            // Filtrar apenas UUIDs válidos para a query do Supabase para evitar erro 22P02
            const excludeIds = [userId, ...friends].filter(id => isValidUUID(id));
            
            const { data, error } = await supabase.from('profiles').select('*')
                .not('id', 'in', `(${excludeIds.join(',')})`).limit(6);
            
            if (error) throw error;

            // Filtrar bots manualmente do resultado caso algum tenha escapado (embora não devessem estar no DB)
            return data.filter(p => !friends.includes(p.id)).map(p => {
                if (p.wander_id === '#WP-LUNA' && !p.avatar) p.avatar = 'https://i.ibb.co/vzrKxXw/luna-bunny.png';
                if (p.wander_id === '#WP-REX' && !p.avatar) p.avatar = 'https://i.ibb.co/M9xYyL7/rex-dog.png';
                if (p.wander_id === '#WP-MIAU' && !p.avatar) p.avatar = 'https://i.ibb.co/L5k6pXN/miau-cat.png';
                return p;
            });
        } catch (error) {
            console.error("Erro ao buscar exploradores próximos:", error);
            return [];
        }
    },

    getPendingRequestsCloud: async (userId: string) => {
        // INJECT MOCK PENDING REQUEST
        const mockRequests = [
            {
                id: 'mock-req-1',
                user_id1: 'bot-4',
                profiles: { name: 'Lucas', avatar: 'https://i.pravatar.cc/150?u=lucas', wander_id: '#WP-LUC' }
            }
        ];

        if (!isValidUUID(userId)) return mockRequests;
        try {
            const { data, error } = await supabase.from('friendships')
                .select('id, user_id1, profiles!friendships_user_id1_fkey(name, avatar, wander_id)')
                .eq('user_id2', userId).eq('status', 'pending');
            if (error) throw error;
            return [...data, ...mockRequests];
        } catch (error) {
            console.error("Erro ao buscar solicitações pendentes:", error);
            return mockRequests;
        }
    },

    respondFriendRequestCloud: async (requestId: string, status: 'accepted' | 'declined') => {
        try {
            if (status === 'accepted') {
                await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
            } else {
                await supabase.from('friendships').delete().eq('id', requestId);
            }
        } catch (error) {
            console.error("Erro ao responder solicitação:", error);
        }
    },

    fetchWeeklyActivityCloud: async (userId: string) => {
        if (!isValidUUID(userId)) return [];
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { data, error } = await supabase.from('expeditions')
                .select('date, distance').eq('user_id', userId)
                .gte('date', sevenDaysAgo.toISOString().split('T')[0])
                .order('date', { ascending: true });
            if (error) {
                if (error.code === 'PGRST204' || error.message?.includes('schema cache')) return [];
                throw error;
            }
            const activityMap = new Map();
            data.forEach((exp: any) => {
                const current = activityMap.get(exp.date) || 0;
                activityMap.set(exp.date, current + exp.distance);
            });
            return Array.from(activityMap.entries()).map(([date, distance]) => ({ date, distance }));
        } catch (error) {
            console.error("Erro ao buscar atividade semanal na nuvem:", error);
            return [];
        }
    },

    syncQuests: async (userId: string, claimedQuests: string[]) => {
        if (!isValidUUID(userId)) return;
        try {
            await supabase.from('profiles').update({ claimed_quests: claimedQuests }).eq('id', userId);
        } catch (error) {
            console.error("Erro ao sincronizar missões:", error);
        }
    },

    fetchMessages: async (senderId: string, recipientId: string) => {
        if (senderId.startsWith('bot-') || recipientId.startsWith('bot-')) {
            const chatKey = [senderId, recipientId].sort().join('_');
            return mockChats[chatKey] || [];
        }
        if (!isValidUUID(senderId) || !isValidUUID(recipientId)) return [];
        try {
            const { data, error } = await supabase.from('messages').select('*')
                .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`)
                .order('created_at', { ascending: true }).limit(50);
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
            return [];
        }
    },

    sendMessageCloud: async (senderId: string, recipientId: string, text: string) => {
        if (recipientId.startsWith('bot-') || senderId.startsWith('bot-')) {
            const chatKey = [senderId, recipientId].sort().join('_');
            if (!mockChats[chatKey]) mockChats[chatKey] = [];
            
            const userMsg = { id: Date.now().toString(), sender_id: senderId, receiver_id: recipientId, text, created_at: new Date().toISOString() };
            mockChats[chatKey].push(userMsg);
            
            const notify = botSubscriptions[`${recipientId}_${senderId}`] || botSubscriptions[`${senderId}_${recipientId}`];
            if (notify) notify(userMsg);

            // Simular resposta do bot para testar memória!
            if (recipientId.startsWith('bot-')) {
                setTimeout(() => {
                    const botMsg = { id: (Date.now() + 1).toString(), sender_id: recipientId, receiver_id: senderId, text: `Olá! Eu recebi sua mensagem: "${text}". Minha memória está funcionando! 🤖`, created_at: new Date().toISOString() };
                    mockChats[chatKey].push(botMsg);
                    const notifyBot = botSubscriptions[`${senderId}_${recipientId}`];
                    if (notifyBot) notifyBot(botMsg);
                }, 1000);
            }
            return true;
        }

        if (!isValidUUID(senderId) || !isValidUUID(recipientId)) return false;
        try {
            const { error } = await supabase.from('messages').insert([{
                sender_id: senderId, recipient_id: recipientId, text,
                created_at: new Date().toISOString()
            }]);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            return false;
        }
    },

    subscribeToMessages: (senderId: string, recipientId: string, onMessage: (msg: any) => void) => {
        if (recipientId.startsWith('bot-') || senderId.startsWith('bot-')) {
            botSubscriptions[`${senderId}_${recipientId}`] = onMessage;
            return { unsubscribe: () => { delete botSubscriptions[`${senderId}_${recipientId}`]; } } as any;
        }
        return supabase.channel(`chat_${senderId}_${recipientId}`)
            .on('postgres_changes', { 
                event: 'INSERT', schema: 'public', table: 'messages',
                filter: `recipient_id=eq.${senderId}` 
            }, (payload) => {
                if (payload.new.sender_id === recipientId) onMessage(payload.new);
            }).subscribe();
    },

    toggleLikeCloud: async (userId: string, targetId: string) => {
        if (targetId.startsWith('bot-') || userId.startsWith('bot-')) {
            const key = `${userId}_${targetId}`;
            if (mockLikes.has(key)) {
                mockLikes.delete(key);
                return false;
            } else {
                mockLikes.add(key);
                return true;
            }
        }
        if (!isValidUUID(userId) || !isValidUUID(targetId)) return false;
        try {
            const { data: existing } = await supabase.from('social_likes')
                .select('*').eq('user_id', userId).eq('target_id', targetId).single();
            if (existing) {
                await supabase.from('social_likes').delete().eq('id', existing.id);
                return false;
            } else {
                await supabase.from('social_likes').insert([{ user_id: userId, target_id: targetId }]);
                return true;
            }
        } catch (error) {
            console.error("Erro ao alternar like:", error);
            return false;
        }
    },

    getLikesCloud: async (userId: string) => {
        const localBotLikes = Array.from(mockLikes).filter(k => k.startsWith(`${userId}_`)).map(k => k.split('_')[1]);
        if (!isValidUUID(userId)) return localBotLikes;
        try {
            const { data, error } = await supabase.from('social_likes').select('target_id').eq('user_id', userId);
            if (error) throw error;
            return [...data.map((l: any) => l.target_id), ...localBotLikes];
        } catch (error) {
            console.error("Erro ao buscar likes:", error);
            return localBotLikes;
        }
    },

    recommendUser: async (recommenderId: string, recommendedId: string) => {
        if (!isValidUUID(recommenderId) || !isValidUUID(recommendedId)) return false;
        try {
            const { error } = await supabase.from('recommendations')
                .upsert([{ recommender_id: recommenderId, recommended_id: recommendedId }], { onConflict: 'recommender_id,recommended_id' });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error("Erro ao recomendar usuário:", error);
            return false;
        }
    },

    getRecommendationWeb: async (userId: string) => {
        if (!isValidUUID(userId)) return { explorers: [], links: [] };
        try {
            const explorers = await AuthService.getNearbyExplorers(userId);
            const explorerIds = [...explorers.map(e => e.id), userId].filter(id => isValidUUID(id));
            const { data: recommendations, error } = await supabase.from('recommendations')
                .select('recommender_id, recommended_id')
                .in('recommender_id', explorerIds).in('recommended_id', explorerIds);
            if (error) throw error;
            const links = recommendations.map(r => ({ from: r.recommender_id, to: r.recommended_id }));
            return { explorers, links };
        } catch (error) {
            console.error("Erro ao buscar teia de recomendações:", error);
            return { explorers: [], links: [] };
        }
    },

    fetchFullUserData: async (uid: string) => {
        if (!isValidUUID(uid)) return null;
        try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
            const { data: pet } = await supabase.from('pets').select('*').eq('owner_id', uid).single();
            return { profile, pet };
        } catch (error) {
            console.error("Erro ao buscar dados completos:", error);
            return null;
        }
    },

    requestPasswordReset: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return { success: true };
    },

    verifyToken: async (email: string, token: string) => {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'recovery'
        });
        if (error) throw error;
        // Verifica se o usuário tem 2FA ativo no perfil
        const { data: profile } = await supabase.from('profiles').select('two_factor_pin').eq('id', data.user?.id).single();
        return { success: true, requires2FA: !!profile?.two_factor_pin };
    },

    executePasswordReset: async (email: string, token: string, newPassword: string, pin?: string) => {
        // Primeiro verificamos o OTP novamente para garantir a sessão de recovery
        const { error: otpError } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'recovery'
        });
        if (otpError) throw otpError;

        // Se houver PIN, validamos no perfil (opcional dependendo da lógica desejada)
        if (pin) {
            const { data: user } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('two_factor_pin').eq('id', user.user?.id).single();
            if (profile?.two_factor_pin !== pin) throw new Error("PIN de segurança incorreto.");
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { success: true };
    },

    seedMockBots: async () => {
        try {
            const bots = [
                { id: '00000000-0000-0000-0000-000000000001', name: 'Luna', wander_id: '#WP-LUNA', email: 'luna@wanderpet.com' },
                { id: '00000000-0000-0000-0000-000000000002', name: 'Rex', wander_id: '#WP-REX', email: 'rex@wanderpet.com' },
                { id: '00000000-0000-0000-0000-000000000003', name: 'Miau', wander_id: '#WP-MIAU', email: 'miau@wanderpet.com' },
            ];
            const { error } = await supabase.from('profiles').upsert(bots);
            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
    }
};
