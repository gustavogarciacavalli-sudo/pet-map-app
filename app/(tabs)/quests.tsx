import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getCoinsLocal, saveCoinsLocal, addXPLocal, getLevelDataLocal, getTotalDistanceLocal, getClaimedQuestsLocal, claimQuestLocal, getWeeklyActivityLocal, getPetLocal, getSpentCoinsLocal, getCurrentUserLocal } from '../../localDatabase';
import { AuthService } from '../../services/AuthService';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import { MAIN_QUESTS, DAILY_QUESTS, WEEKLY_QUESTS, MONTHLY_QUESTS, QuestDef, QuestType } from '../../data/questsData';

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
        if (isCompleted && !isClaimed) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
                ])
            ).start();
        }
    }, [isCompleted, isClaimed]);

    const onPressIn = () => {
        if (isCompleted && !isClaimed) {
            Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
        }
    };
    const onPressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();
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
                    <MaterialCommunityIcons
                        name={isClaimed ? "check-circle" : isCompleted ? "medal" : "sword-cross"}
                        size={22}
                        color={isClaimed ? colors.primary : isCompleted ? "#DAA520" : colors.subtext}
                    />
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
    const [activeTab, setActiveTab] = useState<QuestType>('main');

    const [stats, setStats] = useState({
        coins: 0, level: 1, distTotal: 0, distDaily: 0, distWeekly: 0,
        friendsCount: 0, groupCount: 0, hasPhoto: false, spentCoins: 0, maxGroupMembers: 0,
    });

    const [claimedIds, setClaimedIds] = useState<string[]>([]);

    // Entry animation
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(30)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadStats();
            Animated.parallel([
                Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
                Animated.spring(slideUp, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            ]).start();
        }, [])
    );

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

        setStats({
            coins, level: lvl.level, distTotal, distDaily, distWeekly,
            friendsCount: friends.length, groupCount: cloudGroups.length,
            hasPhoto: !!pet?.customImageUri, spentCoins, maxGroupMembers: maxMems,
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

        const msg = xpResult.leveledUp ? `\n\nSeu explorador subiu para o Nível ${xpResult.level}!` : "";
        Alert.alert('Recompensa Resgatada', `Você recebeu ${quest.reward} PetCoins e ${quest.xpReward} XP.${msg}`);
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
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>Missões</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>Cumpra desafios e ganhe recompensas</Text>
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
});
