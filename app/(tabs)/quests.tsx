import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Animated, Easing, DeviceEventEmitter, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getCoinsLocal, saveCoinsLocal, addXPLocal, getLevelDataLocal, getTotalDistanceLocal, getClaimedQuestsLocal, claimQuestLocal, getWeeklyActivityLocal, getPetLocal, getSpentCoinsLocal, getCurrentUserLocal } from '../../localDatabase';
import { AuthService } from '../../services/AuthService';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import { MAIN_QUESTS, DAILY_QUESTS, WEEKLY_QUESTS, MONTHLY_QUESTS, QuestDef, QuestType } from '../../data/questsData';
import { useSupabaseRealtime } from '../../components/SupabaseRealtimeProvider';
import * as Location from 'expo-location';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Reward Modal Component ───
function RewardModal({ visible, onClose, reward, xp, levelUp, level, colors }: any) {
    const scale = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (visible) {
            Animated.spring(scale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true
            }).start();
        } else {
            scale.setValue(0);
        }
    }, [visible]);

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.modalOverlay}>
                <Animated.View style={[
                    styles.rewardModal,
                    { 
                        backgroundColor: colors.card,
                        borderColor: colors.primary + '40',
                        transform: [{ scale }]
                    }
                ]}>
                    <View style={[styles.rewardIconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="trophy" size={40} color={colors.primary} />
                    </View>
                    
                    <Text style={[styles.rewardModalTitle, { color: colors.text }]}>Missão Concluída!</Text>
                    
                    <View style={styles.rewardStatsRow}>
                        <View style={styles.rewardStatItem}>
                            <Ionicons name="wallet" size={20} color={colors.primary} />
                            <Text style={[styles.rewardStatValue, { color: colors.text }]}>+{reward}</Text>
                            <Text style={[styles.rewardStatLabel, { color: colors.subtext }]}>PetCoins</Text>
                        </View>
                        <View style={styles.rewardStatItem}>
                            <Ionicons name="sparkles" size={20} color="#DAA520" />
                            <Text style={[styles.rewardStatValue, { color: colors.text }]}>+{xp}</Text>
                            <Text style={[styles.rewardStatLabel, { color: colors.subtext }]}>Experiência</Text>
                        </View>
                    </View>

                    {levelUp && (
                        <View style={styles.levelUpBadge}>
                            <Text style={styles.levelUpText}>NÍVEL {level} ALCANÇADO!</Text>
                        </View>
                    )}

                    <Pressable 
                        style={[styles.modalButton, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonText}>Incrível!</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Animated Tab Indicator ───
function TabSelector({ activeTab, onTabChange, colors, isDarkMode }: any) {
    const tabs: { id: QuestType; label: string; icon: string }[] = [
        { id: 'main', label: 'Principais', icon: 'star' },
        { id: 'daily', label: 'Diárias', icon: 'calendar-day' },
        { id: 'weekly', label: 'Semanais', icon: 'calendar-week' },
        { id: 'monthly', label: 'Mensais', icon: 'calendar-alt' },
    ];

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onTabChange(tab.id)}
                        style={[
                            styles.tabPill,
                            { borderColor: isActive ? colors.primary : colors.border },
                            isActive && { backgroundColor: colors.primary }
                        ]}
                    >
                        <FontAwesome5
                            name={tab.icon}
                            size={11}
                            color={isActive ? '#FFF' : colors.subtext}
                        />
                        <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.subtext }]}>
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

// ─── Quest Card ───
function QuestCard({ quest, progress, isClaimed, isCompleted, onClaim, colors, isDarkMode }: any) {
    const scale = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let loop: Animated.CompositeAnimation | null = null;
        if (isCompleted && !isClaimed) {
            loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
                ])
            );
            loop.start();
        } else {
            glowAnim.setValue(0);
        }
        return () => loop?.stop();
    }, [isCompleted, isClaimed]);

    const onPressIn = () => {
        if (isCompleted && !isClaimed) {
            Animated.spring(scale, { toValue: 0.97, useNativeDriver: false, tension: 300, friction: 20 }).start();
        }
    };
    const onPressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: false, tension: 300, friction: 20 }).start();
    };

    const claimableBorderColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.primary],
    });

    const cardBorderColor = isClaimed
        ? colors.border
        : isCompleted
            ? claimableBorderColor
            : colors.border;

    return (
        <Pressable
            onPress={onClaim}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={!isCompleted || isClaimed}
        >
            <Animated.View style={[
                styles.questCard,
                {
                    backgroundColor: colors.card,
                    borderColor: cardBorderColor,
                    transform: [{ scale }],
                    opacity: isClaimed ? 0.4 : 1,
                }
            ]}>
                {/* Icon */}
                <View style={[styles.iconCircle, {
                    backgroundColor: isClaimed
                        ? colors.primary + '15'
                        : isCompleted
                            ? '#DAA52015'
                            : (isDarkMode ? '#ffffff08' : '#00000006')
                }]}>
                    {isCompleted && !isClaimed ? (
                        <Animated.View style={{
                            transform: [{
                                scale: glowAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [1, 1.2, 1]
                                })
                            }]
                        }}>
                            <MaterialCommunityIcons name="treasure-chest" size={26} color="#DAA520" />
                        </Animated.View>
                    ) : (
                        <MaterialCommunityIcons
                            name={isClaimed ? "check-circle" : "sword-cross"}
                            size={22}
                            color={isClaimed ? colors.primary : colors.subtext}
                        />
                    )}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.questTitle, { color: colors.text }]} numberOfLines={1}>{quest.title}</Text>
                        {isCompleted && !isClaimed && (
                            <View style={[styles.claimBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.claimText}>RESGATAR</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.questDescription, { color: colors.subtext }]} numberOfLines={2}>{quest.description}</Text>

                    {!isClaimed && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#ffffff0D' : '#0000000A' }]}>
                                <View style={[
                                    styles.progressFill,
                                    {
                                        width: `${progress * 100}%`,
                                        backgroundColor: isCompleted ? '#DAA520' : colors.primary,
                                    }
                                ]} />
                            </View>
                            <Text style={[styles.progressText, { color: colors.subtext }]}>{String(Math.round(progress * 100))}%</Text>
                        </View>
                    )}
                </View>

                {/* Reward */}
                <View style={[styles.rewardChip, { backgroundColor: isDarkMode ? '#ffffff08' : '#0000000A' }]}>
                    <Ionicons name="wallet" size={12} color={colors.primary} />
                    <Text style={[styles.rewardText, { color: colors.text }]}>{String(quest.reward)}</Text>
                    <Text style={[styles.xpText, { color: colors.subtext }]}>{String(quest.xpReward)} XP</Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

// ─── Main Screen ───
export default function QuestsScreen() {
    const { colors, isDarkMode } = useTheme();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<QuestType>('main');

    const [stats, setStats] = useState({
        coins: 0, level: 1, distTotal: 0, distDaily: 0, distWeekly: 0,
        friendsCount: 0, groupCount: 0, hasPhoto: false, spentCoins: 0, maxGroupMembers: 0,
        nearbyClanMembers: 0,
    });
    const { remoteUsers } = useSupabaseRealtime();

    const [claimedIds, setClaimedIds] = useState<string[]>([]);
    const [rewardModalData, setRewardModalData] = useState<any>(null);

    // Entry animation
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(30)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadStats();
            Animated.parallel([
                Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: false }),
                Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: false }),
            ]).start();
            
            return () => {
                fadeIn.setValue(0);
                slideUp.setValue(30);
            };
        }, [])
    );
    
    // Escutar atualizações em tempo real (GPS, Moedas, Outras missões resgatadas)
    useEffect(() => {
        const statsSub = DeviceEventEmitter.addListener('statsUpdated', () => {
            loadStats();
        });
        const claimSub = DeviceEventEmitter.addListener('questClaimed', () => {
            loadStats();
        });

        return () => {
            statsSub.remove();
            claimSub.remove();
        };
    }, []);

    const loadStats = async () => {
        const coins = await getCoinsLocal();
        const lvl = await getLevelDataLocal();
        const distTotal = await getTotalDistanceLocal();
        const user = await getCurrentUserLocal();
        const friends = user ? await AuthService.getFriendsCloud(user.id) : [];
        const cloudGroups = await AuthService.getGroups();
        const claimed = await getClaimedQuestsLocal();
        const weeklyRaw = await getWeeklyActivityLocal();
        const pet = await getPetLocal();

        const todayDate = new Date().toISOString().split('T')[0];
        const todayData = weeklyRaw.find(d => d.date === todayDate);
        const distDaily = todayData ? todayData.distance : 0;
        const distWeekly = weeklyRaw.reduce((sum, d) => sum + d.distance, 0);

        const spentCoins = await getSpentCoinsLocal();
        const maxMems = cloudGroups.reduce((acc: number, g: any) => {
            const memCount = (g.group_members?.length || 0);
            return Math.max(acc, memCount);
        }, 0);

        // Lógica de Membros do Clã Próximos
        let nearbyClanMembers = 1; // O próprio usuário
        if (user && cloudGroups.length > 0) {
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const myLat = loc.coords.latitude;
                const myLon = loc.coords.longitude;

                // Filtrar usuários remotos que estão no mesmo clã e próximos
                const myClanIds = cloudGroups
                    .filter((g: any) => g.group_members?.some((m: any) => m.user_id === user.id))
                    .map((g: any) => g.id);

                const nearbyClanMemsSet = new Set<string>();
                nearbyClanMemsSet.add(user.id);

                Object.values(remoteUsers).forEach((u: any) => {
                    if (u.location) {
                        const d = calculateDistance(myLat, myLon, u.location.latitude, u.location.longitude);
                        if (d <= 100) { // Raio de 100 metros
                            // Verificar se esse usuário está em algum clã do usuário logado
                            // Nota: remoteUsers precisa ter informação de clã ou precisamos cruzar dados
                            // Por simplicidade aqui, vamos assumir que se ele é um remoteUser visível e está no raio, 
                            // verificamos se ele pertence aos mesmos clãs buscados em cloudGroups
                            const isInMyClan = cloudGroups.some((g: any) => 
                                myClanIds.includes(g.id) && g.group_members?.some((m: any) => m.user_id === u.id)
                            );
                            
                            if (isInMyClan) {
                                nearbyClanMemsSet.add(u.id);
                            }
                        }
                    }
                });
                nearbyClanMembers = nearbyClanMemsSet.size;
            } catch (err) {
                console.log("Erro ao buscar localização para missão:", err);
            }
        }

        setStats({
            coins, level: lvl.level, distTotal, distDaily, distWeekly,
            friendsCount: friends.length, groupCount: cloudGroups.length,
            hasPhoto: !!pet?.customImageUri, spentCoins, maxGroupMembers: maxMems,
            nearbyClanMembers,
        });
        setClaimedIds(claimed);
    };

    const calculateProgress = (q: QuestDef): number => {
        let val = 0;
        if (q.goalType === 'distance') {
            if (q.type === 'daily') val = stats.distDaily;
            else if (q.type === 'weekly') val = stats.distWeekly;
            else val = stats.distTotal;
        } else if (q.goalType === 'coins') {
            val = stats.coins;
        } else if (q.goalType === 'level') {
            val = stats.level;
        } else if (q.goalType === 'friends') {
            val = stats.friendsCount;
        } else if (q.goalType === 'group') {
            val = stats.groupCount;
        } else if (q.goalType === 'group_members') {
            val = stats.maxGroupMembers;
        } else if (q.goalType === 'shop_spend') {
            val = stats.spentCoins;
        } else if (q.goalType === 'profile_pic') {
            val = stats.hasPhoto ? 1 : 0;
        } else if (q.goalType === 'clan_event') {
            val = stats.nearbyClanMembers;
        }
        return Math.max(0, Math.min(1, val / q.target));
    };

    const handleClaim = async (quest: QuestDef) => {
        const prog = calculateProgress(quest);
        if (prog < 1 || claimedIds.includes(quest.id)) return;

        await claimQuestLocal(quest.id);
        const newBalance = stats.coins + quest.reward;
        await saveCoinsLocal(newBalance);

        const xpResult = await addXPLocal(quest.xpReward);

        loadStats();
        setRewardModalData({
            reward: quest.reward,
            xp: quest.xpReward,
            levelUp: xpResult.leveledUp,
            level: xpResult.level
        });
    };

    const getActiveList = () => {
        if (activeTab === 'daily') return DAILY_QUESTS;
        if (activeTab === 'weekly') return WEEKLY_QUESTS;
        if (activeTab === 'monthly') return MONTHLY_QUESTS;
        const uncompleted = MAIN_QUESTS.filter(q => !claimedIds.includes(q.id));
        return uncompleted.slice(0, 10);
    };

    const activeList = getActiveList();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable 
                            onPress={() => router.back()} 
                            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                        </Pressable>
                        <View>
                            <Text style={[styles.title, { color: colors.text }]}>Missões</Text>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>Cumpra desafios e ganhe recompensas</Text>
                        </View>
                    </View>
                    <View style={[styles.coinBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                        <Ionicons name="wallet" size={14} color={colors.primary} />
                        <Text style={[styles.coinText, { color: colors.text }]}>{String(stats.coins)}</Text>
                    </View>
                </View>

                {/* Tab Selector */}
                <TabSelector activeTab={activeTab} onTabChange={setActiveTab} colors={colors} isDarkMode={isDarkMode} />

                {/* Main quest banner */}
                {activeTab === 'main' && (
                    <View style={[styles.mainQuestBanner, { backgroundColor: colors.primary + '0A', borderColor: colors.primary + '20' }]}>
                        <Ionicons name="sparkles" size={14} color={colors.primary} />
                        <Text style={[styles.mainQuestBannerText, { color: colors.primary }]}>
                            Complete as missões atuais para desbloquear as próximas. Total: {MAIN_QUESTS.length} missões.
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Quest List */}
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {activeList.map((quest) => {
                    const progRaw = calculateProgress(quest);
                    const isCompleted = progRaw >= 1;
                    const isClaimed = claimedIds.includes(quest.id);

                    return (
                        <QuestCard
                            key={quest.id}
                            quest={quest}
                            progress={progRaw}
                            isClaimed={isClaimed}
                            isCompleted={isCompleted}
                            onClaim={() => handleClaim(quest)}
                            colors={colors}
                            isDarkMode={isDarkMode}
                        />
                    );
                })}

                {activeList.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="checkmark-done-circle" size={40} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo concluído!</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>Volte mais tarde para novas missões.</Text>
                    </View>
                )}
            </ScrollView>

            <RewardModal 
                visible={!!rewardModalData} 
                onClose={() => setRewardModalData(null)}
                reward={rewardModalData?.reward}
                xp={rewardModalData?.xp}
                levelUp={rewardModalData?.levelUp}
                level={rewardModalData?.level}
                colors={colors}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ─── Header ───
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
    },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
    subtitle: { fontSize: 13, fontWeight: '500', marginTop: 2, opacity: 0.7 },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        gap: 6,
    },
    coinText: { fontSize: 14, fontWeight: '800' },

    // ─── Tabs ───
    tabContainer: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    tabText: { fontSize: 12, fontWeight: '700' },

    // ─── Banner ───
    mainQuestBanner: {
        marginHorizontal: 20,
        padding: 14,
        borderRadius: 14,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
    },
    mainQuestBannerText: { fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },

    // ─── Scroll ───
    scroll: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 4 },

    // ─── Quest Card ───
    questCard: {
        flexDirection: 'row',
        borderRadius: 18,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    content: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    questTitle: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
    claimBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    claimText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    questDescription: { fontSize: 12, marginVertical: 4, lineHeight: 17, fontWeight: '500' },

    // ─── Progress ───
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 11, fontWeight: '800', minWidth: 32, textAlign: 'right' },

    // ─── Reward ───
    rewardChip: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 14,
        minWidth: 48,
    },
    rewardText: { fontSize: 13, fontWeight: '800', marginTop: 3 },
    xpText: { fontSize: 9, fontWeight: '700', marginTop: 2 },

    // ─── Empty State ───
    emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    emptySubtitle: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },

    // ─── Modal ───
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    rewardModal: {
        width: '100%',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    rewardIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    rewardModalTitle: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 24,
        textAlign: 'center',
    },
    rewardStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 32,
    },
    rewardStatItem: {
        alignItems: 'center',
    },
    rewardStatValue: {
        fontSize: 20,
        fontWeight: '900',
        marginTop: 8,
    },
    rewardStatLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    levelUpBadge: {
        backgroundColor: '#DAA520',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 24,
    },
    levelUpText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    modalButton: {
        width: '100%',
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
