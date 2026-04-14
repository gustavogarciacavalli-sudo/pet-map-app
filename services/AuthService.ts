import { supabase } from './supabaseConfig';

// Utilitário para validar UUID e evitar erros 22P02 no banco
const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/**
 * AuthService centraliza a integração real com o Supabase.
 */
export const AuthService = {
    /**
     * Cadastro Real no Supabase
     */
    signUp: async (email: string, password: string, securityQuestion: string, securityAnswer: string, twoFactorPin: string) => {
        try {
            // 1. Criar usuário no Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Erro ao criar usuário.");

            // 2. Criar perfil complementar na tabela 'profiles'
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

    /**
     * Login Real com verificação de perfil
     */
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

    /**
     * Busca dados extras do usuário (PIN, etc) na tabela 'profiles'
     */
    getUserProfile: async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', uid)
                .single();

            if (error) throw error;
            
            // Adaptamos as chaves do banco (snake_case) para o código (camelCase) se necessário,
            // ou apenas retornamos o objeto. Vamos mapear os principais para compatibilidade.
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
     * Recuperação de senha via e-mail oficial do Supabase
     */
    requestPasswordReset: async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            
            return { 
                success: true, 
                message: 'Um link de redefinição foi enviado para o seu e-mail pelo Supabase.' 
            };
        } catch (error: any) {
            throw error;
        }
    },

    /**
     * Passo 2: Valida o código de 6 dígitos (OTP) recebido por e-mail
     */
    verifyToken: async (email: string, token: string) => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'recovery',
            });

            if (error) throw error;
            if (!data.user) throw new Error("Código inválido ou expirado.");

            // Verifica se o usuário tem 2FA ativado
            const { data: profile } = await supabase
                .from('profiles')
                .select('two_factor_pin')
                .eq('id', data.user.id)
                .single();

            return {
                success: true,
                requires2FA: !!profile?.two_factor_pin,
                uid: data.user.id
            };
        } catch (error: any) {
            console.error("Erro ao verificar token:", error);
            throw error;
        }
    },

    /**
     * Passo 3: Executa a troca de senha final no Supabase
     */
    executePasswordReset: async (email: string, token: string, newPassword: string, pin?: string) => {
        try {
            // 2. Se houver PIN, validamos contra o banco
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('two_factor_pin')
                    .eq('id', user.id)
                    .single();
                
                if (profile?.two_factor_pin && profile.two_factor_pin !== pin) {
                    throw new Error("PIN de segurança incorreto.");
                }
            }

            // 3. Atualizar a senha
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;
            return { success: true };
        } catch (error: any) {
            console.error("Erro no executePasswordReset:", error);
            throw error;
        }
    },

    /**
     * Atualiza a senha do usuário logado no Supabase Auth
     */
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

    /**
     * Atualiza campos extras no Firestore/profiles
     */
    updateProfile: async (uid: string, updates: any) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', uid);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao atualizar perfil no Supabase:", error);
            throw error;
        }
    },

    /**
     * Sincroniza estatísticas de jogo (Moedas, XP, Nível)
     */
    syncStats: async (uid: string, stats: { coins?: number, gems?: number, xp?: number, level?: number }) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(stats)
                .eq('id', uid);
            if (error) throw error;
        } catch (error: any) {
            console.error("Erro ao sincronizar stats no Supabase:", error);
        }
    },

    /**
     * Sincroniza dados do Pet (Nuvem)
     */
    syncPet: async (ownerId: string, petData: any) => {
        try {
            const { error } = await supabase
                .from('pets')
                .upsert({
                    owner_id: ownerId,
                    name: petData.name,
                    species: petData.species,
                    accessory: petData.accessory || 'none',
                    personality: petData.personality || 'active',
                    custom_image_url: petData.customImageUri || null,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        } catch (error: any) {
            console.error("Erro ao sincronizar Pet no Supabase:", error);
        }
    },

    /**
     * Busca TODOS os dados do usuário (Perfil + Pet) de uma vez
     */
    fetchFullUserData: async (uid: string) => {
        try {
            const [profileRes, petRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', uid).single(),
                supabase.from('pets').select('*').eq('owner_id', uid).single()
            ]);

            return {
                profile: profileRes.data,
                pet: petRes.data
            };
        } catch (error) {
            console.error("Erro ao buscar dados completos:", error);
            return null;
        }
    },

    /**
     * Sincroniza a localização em tempo real para o mapa social
     */
    updateLocation: async (uid: string, latitude: number, longitude: number, ghostMode: boolean = false) => {
        try {
            const { error } = await supabase
                .from('locations')
                .upsert({
                    user_id: uid,
                    latitude,
                    longitude,
                    ghost_mode: ghostMode,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        } catch (error: any) {
            console.error("Erro ao sincronizar localização:", error);
        }
    },

    /**
     * Salva uma expedição completa na nuvem
     */
    saveExpedition: async (uid: string, distance: number, path: any[], durationMinutes: number) => {
        try {
            const { error } = await supabase
                .from('expeditions')
                .insert([{
                    user_id: uid,
                    distance,
                    path,
                    duration_minutes: durationMinutes,
                    date: new Date().toISOString().split('T')[0]
                }]);
            if (error) throw error;
        } catch (error: any) {
            console.error("Erro ao salvar expedição na nuvem:", error);
        }
    },

    /**
     * Envia uma mensagem para o Supabase
     */
    sendMessageCloud: async (senderId: string, receiverId: string, text: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: senderId,
                    receiver_id: receiverId,
                    text
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error: any) {
            console.error("Erro ao enviar mensagem:", error);
            throw error;
        }
    },

    /**
     * Escuta mensagens em tempo real entre dois usuários
     */
    subscribeToMessages: (userId: string, targetId: string, callback: (payload: any) => void) => {
        return supabase
            .channel(`chat-${userId}-${targetId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${userId}))`
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    },

    /**
     * Busca histórico de mensagens
     */
    fetchMessages: async (userId: string, targetId: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${userId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${userId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
            return [];
        }
    },

    /**
     * GLÃS (GRUPOS)
     */
    createGroup: async (name: string, founderId: string, password?: string, isPublic: boolean = true) => {
        try {
            const { data, error } = await supabase
                .from('groups')
                .insert([{ name, founder_id: founderId, password, is_public: isPublic }])
                .select()
                .single();
            if (error) throw error;

            // Insere o fundador como primeiro membro
            await supabase.from('group_members').insert([{ group_id: data.id, user_id: founderId }]);
            return data;
        } catch (error) {
            console.error("Erro ao criar clã:", error);
            throw error;
        }
    },

    joinGroup: async (groupId: string, userId: string) => {
        try {
            const { error } = await supabase.from('group_members').upsert([{ group_id: groupId, user_id: userId }]);
            if (error) throw error;
        } catch (error) {
            console.error("Erro ao entrar no clã:", error);
            throw error;
        }
    },

    getGroups: async () => {
        try {
            const { data, error } = await supabase
                .from('groups')
                .select('*, group_members(user_id)');
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Erro ao buscar clãs:", error);
            return [];
        }
    },

    /**
     * AMIZADES
     */
    addFriendCloud: async (userId: string, friendId: string) => {
        try {
            // BYPASS DE TESTE: Luna (#WP-LUNA) aceita na hora!
            // ID fixo da Luna para testes: 00000000-0000-0000-0000-000000000001
            const isLuna = friendId === '00000000-0000-0000-0000-000000000001';
            
            const { error } = await supabase
                .from('friendships')
                .upsert([{ 
                    user_id1: userId, 
                    user_id2: friendId, 
                    status: isLuna ? 'accepted' : 'pending' 
                }]);
            if (error) throw error;
        } catch (error) {
            console.error("Erro ao enviar solicitação na nuvem:", error);
            throw error;
        }
    },

    getFriendsCloud: async (userId: string) => {
        if (!isValidUUID(userId)) return [];
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select('*')
                .eq('status', 'accepted')
                .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);
            if (error) throw error;
            return data.map(f => f.user_id1 === userId ? f.user_id2 : f.user_id1);
        } catch (error) {
            console.error("Erro ao buscar amigos na nuvem:", error);
            return [];
        }
    },

    /**
     * Busca exploradores próximos (quem não é amigo ainda)
     */
    getNearbyExplorers: async (userId: string) => {
        if (!isValidUUID(userId)) return [];
        try {
            // 1. Pega lista de amigos para excluir
            const friends = await AuthService.getFriendsCloud(userId);
            const excludeIds = [userId, ...friends];

            // Filtra apenas IDs válidos para a query SQL
            const validExcludeIds = excludeIds.filter(id => isValidUUID(id));
            if (validExcludeIds.length === 0) {
                // Se não houver IDs válidos, busca normalmente mas exclui o próprio usuário se ele for UUID
                const { data, error } = await supabase.from('profiles').select('*').limit(6);
                if (error) throw error;
                return data;
            }

            // 2. Busca perfis aleatórios (simulando proximidade)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .not('id', 'in', `(${validExcludeIds.join(',')})`)
                .limit(6);

            if (error) throw error;
            
            // Mapeia avatares para os bots conhecidos se estiverem sem avatar
            const mappedData = data.map(p => {
                if (p.wander_id === '#WP-LUNA' && !p.avatar) p.avatar = 'https://i.ibb.co/vzrKxXw/luna-bunny.png';
                if (p.wander_id === '#WP-REX' && !p.avatar) p.avatar = 'https://i.ibb.co/M9xYyL7/rex-dog.png';
                if (p.wander_id === '#WP-MIAU' && !p.avatar) p.avatar = 'https://i.ibb.co/L5k6pXN/miau-cat.png';
                return p;
            });

            return mappedData;
        } catch (error) {
            console.error("Erro ao buscar exploradores próximos:", error);
            return [];
        }
    },

    /**
     * Busca solicitações de amizade pendentes para o usuário
     */
    getPendingRequestsCloud: async (userId: string) => {
        if (!isValidUUID(userId)) return [];
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    id,
                    user_id1,
                    profiles!friendships_user_id1_fkey (
                        name,
                        avatar,
                        wander_id
                    )
                `)
                .eq('user_id2', userId)
                .eq('status', 'pending');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Erro ao buscar solicitações pendentes:", error);
            return [];
        }
    },

    /**
     * Aceita ou recusa uma solicitação
     */
    respondFriendRequestCloud: async (requestId: string, status: 'accepted' | 'declined') => {
        try {
            if (status === 'accepted') {
                const { error } = await supabase
                    .from('friendships')
                    .update({ status: 'accepted' })
                    .eq('id', requestId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('friendships')
                    .delete()
                    .eq('id', requestId);
                if (error) throw error;
            }
        } catch (error) {
            console.error("Erro ao responder solicitação:", error);
            throw error;
        }
    },

    /**
     * Busca o histórico de atividade semanal do usuário (Últimos 7 dias)
     */
    fetchWeeklyActivityCloud: async (userId: string) => {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data, error } = await supabase
                .from('expeditions')
                .select('date, distance')
                .eq('user_id', userId)
                .gte('date', sevenDaysAgo.toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (error) throw error;

            // Agregamos por data caso haja múltiplas expedições no mesmo dia
            const activityMap = new Map();
            data.forEach((exp: any) => {
                const current = activityMap.get(exp.date) || 0;
                activityMap.set(exp.date, current + exp.distance);
            });

            return Array.from(activityMap.entries()).map(([date, distance]) => ({
                date,
                distance
            }));
        } catch (error) {
            console.error("Erro ao buscar atividade semanal na nuvem:", error);
            return [];
        }
    },

    /**
     * MISSÕES / CONQUISTAS
     */
    syncQuests: async (userId: string, claimedQuests: string[]) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ claimed_quests: claimedQuests })
                .eq('id', userId);
            if (error) throw error;
        } catch (error) {
            console.error("Erro ao sincronizar missões:", error);
        }
    },

    /**
     * CHAT / MENSAGENS (Sincronizado com UI)
     */
    fetchMessages: async (senderId: string, recipientId: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`)
                .order('created_at', { ascending: true })
                .limit(50);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Erro ao buscar mensagens:", error);
            return [];
        }
    },

    sendMessageCloud: async (senderId: string, recipientId: string, text: string) => {
        try {
            const { error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: senderId,
                    recipient_id: recipientId,
                    text,
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
        return supabase
            .channel(`chat_${senderId}_${recipientId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `recipient_id=eq.${senderId}` 
            }, (payload) => {
                if (payload.new.sender_id === recipientId) {
                    onMessage(payload.new);
                }
            })
            .subscribe();
    },

    /**
     * LIKES SOCIAIS
     */
    toggleLikeCloud: async (userId: string, targetId: string) => {
        try {
            // Verifica se já existe
            const { data: existing } = await supabase
                .from('social_likes')
                .select('*')
                .eq('user_id', userId)
                .eq('target_id', targetId)
                .single();

            if (existing) {
                await supabase.from('social_likes').delete().eq('id', existing.id);
                return false; // Unliked
            } else {
                await supabase.from('social_likes').insert([{ user_id: userId, target_id: targetId }]);
                return true; // Liked
            }
        } catch (error) {
            console.error("Erro ao alternar like:", error);
            return false;
        }
    },

    getLikesCloud: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('social_likes')
                .select('target_id')
                .eq('user_id', userId);
            if (error) throw error;
            return data.map(l => l.target_id);
        } catch (error) {
            console.error("Erro ao buscar likes:", error);
            return [];
        }
    }

    /**
     * Logout
     */
    logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }
};
