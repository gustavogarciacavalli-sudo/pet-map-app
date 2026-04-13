import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@wanderpet_users';
const CURRENT_USER_KEY = '@wanderpet_current_user';
const PET_KEY = '@wanderpet_pet';
const COINS_KEY = '@wanderpet_coins';
const ENERGY_KEY = '@wanderpet_energy';
const XP_KEY = '@wanderpet_xp';
const LEVEL_KEY = '@wanderpet_level';
const THEME_KEY = '@wanderpet_theme';
const DISTANCE_KEY = '@wanderpet_total_distance';
const VISITS_KEY = '@wanderpet_visit_grid';
const PATH_KEY = '@wanderpet_path_history';
const FRIENDS_KEY = '@wanderpet_friends';
const GROUPS_KEY = '@wanderpet_groups';
const QUESTS_CLAIMED_KEY = '@wanderpet_quests_claimed';
const GEMS_KEY = '@wanderpet_gems';
const SPENT_COINS_KEY = '@wanderpet_spent_coins';
const SPENT_GEMS_KEY = '@wanderpet_spent_gems';
const INVENTORY_KEY = '@wanderpet_inventory';
const DAILY_DIST_PREFIX = '@wanderpet_dist_'; // + YYYY-MM-DD
const DAILY_PATH_PREFIX = '@wanderpet_path_'; // + YYYY-MM-DD
const CHAT_MESSAGES_KEY = '@wanderpet_chats';

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string; // Pode ser o ID do amigo ou o ID do Clã
    text: string;
    timestamp: number;
}

export interface LocalGroup {
    id: string;
    name: string;
    founderId: string;
    members: string[]; // Array de IDs de usuários
    createdAt: number;
}

export type Species = 'bunny' | 'puppy' | 'cat' | 'sheep' | 'mouse' | 'snake' | 'fox' | 'parrot' | 'frog' | 'cockroach' | 'wolf' | 'raccoon' | 'bear';

export interface LocalUser {
    id: string;
    email: string;
    password: string;
    securityQuestion: string;
    securityAnswer: string;
    twoFactorPin: string;
    wanderId: string;
    name?: string;
}

export interface LocalPet {
    name: string;
    species: Species;
    accessory: string;
    personality: string;
    customImageUri?: string;
}

// ─── TEMA ───
export const getThemeLocal = async (): Promise<'light' | 'dark'> => {
    try {
        const theme = await AsyncStorage.getItem(THEME_KEY);
        return (theme as 'light' | 'dark') || 'light';
    } catch {
        return 'light';
    }
};

export const saveThemeLocal = async (theme: 'light' | 'dark'): Promise<void> => {
    await AsyncStorage.setItem(THEME_KEY, theme);
};

// ─── ECONOMIA ───
// O saldo real pode cair, o gasto acumulado serve inteiramente para metrificação da árvore de missões
export const getSpentCoinsLocal = async (): Promise<number> => {
    const val = await AsyncStorage.getItem(SPENT_COINS_KEY);
    return val ? parseInt(val, 10) : 0;
};
export const addSpentCoinsLocal = async (amount: number): Promise<void> => {
    const total = (await getSpentCoinsLocal()) + amount;
    await AsyncStorage.setItem(SPENT_COINS_KEY, total.toString());
};

export const getSpentGemsLocal = async (): Promise<number> => {
    const val = await AsyncStorage.getItem(SPENT_GEMS_KEY);
    return val ? parseInt(val, 10) : 0;
};
export const addSpentGemsLocal = async (amount: number): Promise<void> => {
    const total = (await getSpentGemsLocal()) + amount;
    await AsyncStorage.setItem(SPENT_GEMS_KEY, total.toString());
};

export const getGemsLocal = async (): Promise<number> => {
    const gems = await AsyncStorage.getItem(GEMS_KEY);
    // Dinâmica de "Seed": Se a carteira de diamantes não existir, dá 150 gemas grátis como boas vindas MVP
    if (gems === null) {
        await AsyncStorage.setItem(GEMS_KEY, '150');
        return 150;
    }
    return parseInt(gems, 10);
};

export const saveGemsLocal = async (amount: number): Promise<void> => {
    await AsyncStorage.setItem(GEMS_KEY, amount.toString());
};

// ─── INVENTÁRIO (COSMÉTICOS) ───
export const getInventoryLocal = async (): Promise<string[]> => {
    const inv = await AsyncStorage.getItem(INVENTORY_KEY);
    return inv ? JSON.parse(inv) : [];
};
export const addToInventoryLocal = async (itemId: string): Promise<void> => {
    const inv = await getInventoryLocal();
    if (!inv.includes(itemId)) {
        inv.push(itemId);
        await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
    }
};

export const getCoinsLocal = async (): Promise<number> => {
    try {
        const coinsString = await AsyncStorage.getItem(COINS_KEY);
        return coinsString ? parseInt(coinsString, 10) : 150;
    } catch {
        return 0;
    }
};

export const saveCoinsLocal = async (amount: number): Promise<void> => {
    await AsyncStorage.setItem(COINS_KEY, amount.toString());
};

export const addCoinsLocal = async (amount: number): Promise<number> => {
    const current = await getCoinsLocal();
    const next = current + amount;
    await saveCoinsLocal(next);
    return next;
};

// ─── ENERGIA ───
export const getEnergyLocal = async (): Promise<number> => {
    try {
        const energyString = await AsyncStorage.getItem(ENERGY_KEY);
        return energyString ? parseInt(energyString, 10) : 100;
    } catch {
        return 100;
    }
};

export const saveEnergyLocal = async (amount: number): Promise<void> => {
    const bounded = Math.max(0, Math.min(100, amount));
    await AsyncStorage.setItem(ENERGY_KEY, bounded.toString());
};

// ─── XP E NÍVEL ───
export const getLevelDataLocal = async (): Promise<{ xp: number, level: number }> => {
    try {
        const xp = await AsyncStorage.getItem(XP_KEY);
        const level = await AsyncStorage.getItem(LEVEL_KEY);
        return {
            xp: xp ? parseInt(xp, 10) : 0,
            level: level ? parseInt(level, 10) : 1
        };
    } catch {
        return { xp: 0, level: 1 };
    }
};

export const addXPLocal = async (amount: number): Promise<{ xp: number, level: number, leveledUp: boolean }> => {
    let { xp, level } = await getLevelDataLocal();
    xp += amount;
    let leveledUp = false;
    const nextLevelXP = level * 200;
    if (xp >= nextLevelXP) {
        xp = xp - nextLevelXP;
        level += 1;
        leveledUp = true;
        await addCoinsLocal(100);
    }
    await AsyncStorage.setItem(XP_KEY, xp.toString());
    await AsyncStorage.setItem(LEVEL_KEY, level.toString());
    return { xp, level, leveledUp };
};

// ─── USUÁRIOS E AUTH ───
export const signUpLocal = async (
    email: string, 
    password: string, 
    securityQuestion: string, 
    securityAnswer: string, 
    twoFactorPin: string
): Promise<LocalUser> => {
    try {
        const usersJson = await AsyncStorage.getItem(USERS_KEY);
        const users: LocalUser[] = usersJson ? JSON.parse(usersJson) : [];
        const normalizedEmail = email.trim().toLowerCase();
        
        if (users.find(u => u.email === normalizedEmail)) {
            throw new Error('Esta conta já existe');
        }

        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const wanderId = `#WP-${randomStr}`;

        const newUser: LocalUser = { 
            id: Date.now().toString(), 
            email: normalizedEmail, 
            password,
            securityQuestion,
            securityAnswer: securityAnswer.toLowerCase().trim(),
            twoFactorPin,
            wanderId,
            name: email.split('@')[0]
        };
        users.push(newUser);
        
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
        return newUser;
    } catch (error) {
        throw error;
    }
};

export const signInLocal = async (email: string, password?: string): Promise<LocalUser> => {
    try {
        const usersJson = await AsyncStorage.getItem(USERS_KEY);
        const users: LocalUser[] = usersJson ? JSON.parse(usersJson) : [];
        const normalizedEmail = email.trim().toLowerCase();
        
        const user = users.find(u => u.email === normalizedEmail && (!password || u.password === password));
        
        if (!user) {
            throw new Error('Conta não encontrada');
        }

        return user;
    } catch (error) {
        throw error;
    }
};

export const ensureWanderIdLocal = async (user: LocalUser): Promise<LocalUser> => {
    if (!user.wanderId || !user.name) {
        const usersJson = await AsyncStorage.getItem(USERS_KEY);
        const users: LocalUser[] = usersJson ? JSON.parse(usersJson) : [];
        const idx = users.findIndex(u => u.id === user.id);
        
        if (idx !== -1) {
            if (!users[idx].wanderId) {
                users[idx].wanderId = `#WP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            }
            if (!users[idx].name) {
                users[idx].name = users[idx].email.split('@')[0];
            }
            await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
            await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[idx]));
            return users[idx];
        }
    }
    return user;
};

export const getAllUsersLocal = async (): Promise<LocalUser[]> => {
    const usersJson = await AsyncStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
};

export const finalizeLoginLocal = async (user: LocalUser): Promise<void> => {
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const resetPasswordLocal = async (email: string, answer: string, newPassword: string): Promise<LocalUser> => {
    const usersJson = await AsyncStorage.getItem(USERS_KEY);
    const users: LocalUser[] = usersJson ? JSON.parse(usersJson) : [];
    const normalizedEmail = email.trim().toLowerCase();
    
    const idx = users.findIndex(u => u.email === normalizedEmail);
    if (idx === -1) {
        throw new Error('Conta não encontrada.');
    }
    
    if (users[idx].securityAnswer !== answer.trim().toLowerCase()) {
        throw new Error('Resposta de segurança incorreta.');
    }
    
    users[idx].password = newPassword;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    return users[idx];
};

// ─── PET ───
export const savePetLocal = async (petData: LocalPet): Promise<void> => {
    try {
        await AsyncStorage.setItem(PET_KEY, JSON.stringify(petData));
    } catch (error) {
        throw error;
    }
};

export const updatePetAccessoryLocal = async (accessory: string): Promise<void> => {
    const current = await getPetLocal();
    if (current) {
        current.accessory = accessory;
        await savePetLocal(current);
    }
};

export const getPetLocal = async (): Promise<LocalPet | null> => {
    try {
        const petJson = await AsyncStorage.getItem(PET_KEY);
        return petJson ? JSON.parse(petJson) : null;
    } catch (error) {
        return null;
    }
};

export const updatePetLocal = async (updates: Partial<LocalPet>): Promise<LocalPet | null> => {
    // Função de atualização do pet (atualizada)
    const pet = await getPetLocal();
    if (pet) {
        const updated = { ...pet, ...updates };
        await AsyncStorage.setItem(PET_KEY, JSON.stringify(updated));
        
        // Também atualizamos o nome do usuário se for o caso
        if (updates.name) {
            const user = await getCurrentUserLocal();
            if (user) {
                const usersJson = await AsyncStorage.getItem(USERS_KEY);
                let users: LocalUser[] = usersJson ? JSON.parse(usersJson) : [];
                const idx = users.findIndex(u => u.id === user.id);
                if (idx !== -1) {
                    users[idx].name = updates.name;
                    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
                }
                await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ ...user, name: updates.name }));
            }
        }
        return updated;
    }
    return null;
};

/** Verifica se um nome está disponível (não usado por outro usuário) */
export const checkNameAvailabilityLocal = async (name: string, selfId: string): Promise<boolean> => {
    const allUsers = await getAllUsersLocal();
    const normalizedTarget = name.trim().toLowerCase();
    
    // Verifica se existe alguém com esse nome diferente do próprio usuário
    const conflict = allUsers.find(u => 
        u.id !== selfId && 
        u.name?.trim().toLowerCase() === normalizedTarget
    );
    
    return !conflict;
};

export const logoutLocal = async (): Promise<void> => {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUserLocal = async (): Promise<LocalUser | null> => {
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (!userJson) return null;
    return JSON.parse(userJson);
};

// ─── ESTATÍSTICAS DE AVENTURA ───

/** Distância Total em Metros */
export const getTotalDistanceLocal = async (): Promise<number> => {
    try {
        const dist = await AsyncStorage.getItem(DISTANCE_KEY);
        return dist ? parseFloat(dist) : 0;
    } catch {
        return 0;
    }
};

/** Helpers de Data */
const getTodayStr = () => new Date().toISOString().split('T')[0];

export const addDistanceLocal = async (meters: number): Promise<number> => {
    // Adiciona ao total global
    const current = await getTotalDistanceLocal();
    const next = current + meters;
    await AsyncStorage.setItem(DISTANCE_KEY, next.toString());

    // Adiciona ao total do dia
    const today = getTodayStr();
    const dailyKey = DAILY_DIST_PREFIX + today;
    const dailyDistStr = await AsyncStorage.getItem(dailyKey);
    const dailyDist = dailyDistStr ? parseFloat(dailyDistStr) : 0;
    await AsyncStorage.setItem(dailyKey, (dailyDist + meters).toString());

    return next;
};

/** Grade de Visitas (Key: "lat.4_long.4", Value: count) */
export const getVisitGridLocal = async (): Promise<Record<string, number>> => {
    try {
        const gridJson = await AsyncStorage.getItem(VISITS_KEY);
        return gridJson ? JSON.parse(gridJson) : {};
    } catch {
        return {};
    }
};

export const recordVisitLocal = async (lat: number, lon: number): Promise<number> => {
    // Arredondamos para 4 casas decimais (precisão de ~11 metros)
    const key = `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const grid = await getVisitGridLocal();
    grid[key] = (grid[key] || 0) + 1;
    await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(grid));
    return grid[key];
};

/** Histórico de Coordenadas */
export const getPathHistoryLocal = async (): Promise<{latitude: number, longitude: number}[]> => {
    try {
        const pathJson = await AsyncStorage.getItem(PATH_KEY);
        return pathJson ? JSON.parse(pathJson) : [];
    } catch {
        return [];
    }
};

export const savePathPointLocal = async (lat: number, lon: number): Promise<void> => {
    const today = getTodayStr();
    const dailyKey = DAILY_PATH_PREFIX + today;
    
    const pathJson = await AsyncStorage.getItem(dailyKey);
    let path: {latitude: number, longitude: number}[] = pathJson ? JSON.parse(pathJson) : [];

    // Evitamos duplicatas seguidas
    if (path.length > 0) {
        const last = path[path.length - 1];
        if (last.latitude === lat && last.longitude === lon) return;
    }

    path.push({ latitude: lat, longitude: lon });
    
    // Mantemos um limite saudável por dia (Ex: 1000 pontos ~ 2 metros cada = 2km de log fino)
    if (path.length > 1000) path = path.slice(-1000);
    
    await AsyncStorage.setItem(dailyKey, JSON.stringify(path));

    // Também mantemos o histórico global simplificado
    const globalPath = await getPathHistoryLocal();
    globalPath.push({ latitude: lat, longitude: lon });
    await AsyncStorage.setItem(PATH_KEY, JSON.stringify(globalPath.slice(-500)));
};

export const getPathByDateLocal = async (date: string): Promise<{latitude: number, longitude: number}[]> => {
    try {
        const pathJson = await AsyncStorage.getItem(DAILY_PATH_PREFIX + date);
        return pathJson ? JSON.parse(pathJson) : [];
    } catch {
        return [];
    }
};

export const getWeeklyActivityLocal = async (): Promise<{date: string, distance: number}[]> => {
    const activity = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const distStr = await AsyncStorage.getItem(DAILY_DIST_PREFIX + dateStr);
        activity.push({
            date: dateStr,
            distance: distStr ? parseFloat(distStr) : 0
        });
    }
    return activity;
};

/** MODO DEV: Gera dados falsos para os últimos 7 dias para testes */
export const generateFakeHistoryLocal = async (): Promise<void> => {
    const baseLat = -23.5505;
    const baseLon = -46.6333;

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // 1. Gera distância aleatória (500m a 6km)
        const fakeDist = Math.floor(Math.random() * 5500) + 500;
        await AsyncStorage.setItem(DAILY_DIST_PREFIX + dateStr, fakeDist.toString());

        // 2. Gera um trajeto aleatório (20 a 40 pontos)
        const path = [];
        let currLat = baseLat + (Math.random() - 0.5) * 0.01;
        let currLon = baseLon + (Math.random() - 0.5) * 0.01;
        
        for (let p = 0; p < 30; p++) {
            currLat += (Math.random() - 0.5) * 0.001;
            currLon += (Math.random() - 0.5) * 0.001;
            path.push({ latitude: currLat, longitude: currLon });
        }
        await AsyncStorage.setItem(DAILY_PATH_PREFIX + dateStr, JSON.stringify(path));
    }
};

// ─── AMIZADES ───

export const getFriendsLocal = async (): Promise<string[]> => {
    try {
        const friendsJson = await AsyncStorage.getItem(FRIENDS_KEY);
        return friendsJson ? JSON.parse(friendsJson) : [];
    } catch {
        return [];
    }
};

export const addFriendLocal = async (idOrEmailOrWanderId: string): Promise<LocalUser> => {
    const allUsers = await getAllUsersLocal();
    const query = idOrEmailOrWanderId.trim().toLowerCase();
    
    // Busca o usuário pelo WanderId, Email ou Nome
    const found = allUsers.find(u => 
        u.wanderId?.toLowerCase() === query || 
        u.email.toLowerCase() === query ||
        u.name?.toLowerCase() === query
    );

    if (!found) {
        throw new Error('Nenhum explorador encontrado com essa identificação.');
    }

    const currentFriends = await getFriendsLocal();
    if (currentFriends.includes(found.id)) {
        throw new Error('Este explorador já está na sua lista de amigos!');
    }

    currentFriends.push(found.id);
    await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(currentFriends));
    
    return found;
};

// ─── GRUPOS ───

export const getGroupsLocal = async (): Promise<LocalGroup[]> => {
    try {
        const groupsJson = await AsyncStorage.getItem(GROUPS_KEY);
        return groupsJson ? JSON.parse(groupsJson) : [];
    } catch {
        return [];
    }
};

export const createGroupLocal = async (name: string): Promise<LocalGroup> => {
    const user = await getCurrentUserLocal();
    if (!user) throw new Error('Você precisa estar logado para criar um grupo.');

    const groups = await getGroupsLocal();
    const newGroup: LocalGroup = {
        id: 'group_' + Date.now(),
        name,
        founderId: user.id,
        members: [user.id],
        createdAt: Date.now()
    };

    groups.push(newGroup);
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    return newGroup;
};

// ─── QUESTS (MISSÕES) ───
export const getClaimedQuestsLocal = async (): Promise<string[]> => {
    try {
        const json = await AsyncStorage.getItem(QUESTS_CLAIMED_KEY);
        return json ? JSON.parse(json) : [];
    } catch {
        return [];
    }
};

export const claimQuestLocal = async (questId: string): Promise<void> => {
    const claimed = await getClaimedQuestsLocal();
    if (!claimed.includes(questId)) {
        claimed.push(questId);
        await AsyncStorage.setItem(QUESTS_CLAIMED_KEY, JSON.stringify(claimed));
    }
};

// ─── CHAT EFÊMERO ───

const CHAT_EXPIRATION_MS = 60 * 60 * 1000; // 1 Hora

export const getChatMessagesLocal = async (userId: string, targetId: string): Promise<ChatMessage[]> => {
    const chatsJson = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);
    const chats: ChatMessage[] = chatsJson ? JSON.parse(chatsJson) : [];
    
    const now = Date.now();
    
    // Filtramos apenas mensagens entre esses dois usuários E que não expiraram
    return chats.filter(msg => {
        const isParticipant = (msg.senderId === userId && msg.receiverId === targetId) ||
                              (msg.senderId === targetId && msg.receiverId === userId);
        const isNotExpired = (now - msg.timestamp) < CHAT_EXPIRATION_MS;
        return isParticipant && isNotExpired;
    });
};

export const sendMessageLocal = async (senderId: string, receiverId: string, text: string): Promise<ChatMessage> => {
    const chatsJson = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);
    let chats: ChatMessage[] = chatsJson ? JSON.parse(chatsJson) : [];
    
    const newMessage: ChatMessage = {
        id: 'msg_' + Date.now(),
        senderId,
        receiverId,
        text,
        timestamp: Date.now()
    };
    
    chats.push(newMessage);
    
    // Limpeza oportunista ao enviar mensagem
    const now = Date.now();
    chats = chats.filter(msg => (now - msg.timestamp) < CHAT_EXPIRATION_MS);
    
    await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(chats));
    return newMessage;
};

export const clearExpiredChatsLocal = async (): Promise<void> => {
    const chatsJson = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);
    if (!chatsJson) return;
    
    const chats: ChatMessage[] = JSON.parse(chatsJson);
    const now = Date.now();
    const activeChats = chats.filter(msg => (now - msg.timestamp) < CHAT_EXPIRATION_MS);
    
    await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(activeChats));
};
