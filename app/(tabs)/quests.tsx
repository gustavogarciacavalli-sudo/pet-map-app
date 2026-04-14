import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Alert } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getCoinsLocal, saveCoinsLocal, addXPLocal, getLevelDataLocal, getTotalDistanceLocal, getClaimedQuestsLocal, claimQuestLocal, getWeeklyActivityLocal, getPetLocal, getSpentCoinsLocal, getCurrentUserLocal } from '../../localDatabase';
import { AuthService } from '../../services/AuthService';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MAIN_QUESTS, DAILY_QUESTS, WEEKLY_QUESTS, MONTHLY_QUESTS, QuestDef, QuestType } from '../../data/questsData';

export default function QuestsScreen() {
    const { colors, isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState<QuestType>('main');
    
    // Status Locais
    const [stats, setStats] = useState({
        coins: 0,
        level: 1,
        distTotal: 0,
        distDaily: 0,
        distWeekly: 0,
        friendsCount: 0,
        groupCount: 0,
        hasPhoto: false,
        spentCoins: 0,
        maxGroupMembers: 0,
    });
    
    const [claimedIds, setClaimedIds] = useState<string[]>([]);

    useFocusEffect(
        React.useCallback(() => {
            loadStats();
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
            coins,
            level: lvl.level,
            distTotal,
            distDaily,
            distWeekly,
            friendsCount: friends.length,
            groupCount: cloudGroups.length,
            hasPhoto: !!pet?.customImageUri,
            spentCoins,
            maxGroupMembers: maxMems,
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
            val = stats.coins; // Lifetime meta wealth (placeholder as current bank)
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

        // Efetua resgate
        await claimQuestLocal(quest.id);
        const newBalance = stats.coins + quest.reward;
        await saveCoinsLocal(newBalance);
        
        const xpResult = await addXPLocal(quest.xpReward);
        
        loadStats(); // Recarrega os status atualizados
        
        const msg = xpResult.leveledUp ? `\n\nSeu explorador subiu para o Nível ${xpResult.level}!` : "";
        Alert.alert('Recompensa Resgatada', `Você recebeu ${quest.reward} PetCoins e ${quest.xpReward} XP.${msg}`);
    };

    const renderTabSelector = () => {
        const tabs: { id: QuestType; label: string; icon: any }[] = [
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
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <LinearGradient
                                colors={isActive ? [colors.primary, colors.primary + '99'] : [colors.card, colors.card]}
                                style={[styles.tabContent, !isActive && { borderWidth: 1, borderColor: colors.border }]}
                            >
                                <FontAwesome5 
                                    name={tab.icon} 
                                    size={12} 
                                    color={isActive ? (isDarkMode ? '#000' : '#FFF') : colors.subtext} 
                                />
                                <Text style={[styles.tabText, { color: isActive ? (isDarkMode ? '#000' : '#FFF') : colors.subtext }]}>{tab.label}</Text>
                            </LinearGradient>
                        </Pressable>
                    );
                })}
            </ScrollView>
        );
    };

    const getActiveList = () => {
        if (activeTab === 'daily') return DAILY_QUESTS;
        if (activeTab === 'weekly') return WEEKLY_QUESTS;
        if (activeTab === 'monthly') return MONTHLY_QUESTS;
        
        // Paginador Elegante para Main Quests (Mostra as primeiras 5 não-resgatadas completas + 5 em progresso)
        const uncompleted = MAIN_QUESTS.filter(q => !claimedIds.includes(q.id));
        return uncompleted.slice(0, 10);
    };

    const activeList = getActiveList();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Missões</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Cumpra desafios e ganhe recompensas</Text>
                </View>
                <View style={[styles.coinBadge, { backgroundColor: isDarkMode ? '#2D2440' : '#F0EDFA', borderColor: colors.primary + '44' }]}>
                    <Ionicons name="wallet" size={14} color={colors.primary} />
                    <Text style={[styles.coinText, { color: colors.text }]}>{String(stats.coins)}</Text>
                </View>
            </View>

            <View>
                {renderTabSelector()}
            </View>

            {activeTab === 'main' && (
                <View style={[styles.mainQuestBanner, { backgroundColor: colors.primary + '11' }]}>
                    <Ionicons name="leaf" size={16} color={colors.primary} />
                    <Text style={[styles.mainQuestBannerText, { color: colors.primary }]}>
                        Complete as missões atuais para desbloquear as próximas. Total: {MAIN_QUESTS.length} missões.
                    </Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scroll}>
                {activeList.map((quest, index) => {
                    const progRaw = calculateProgress(quest);
                    const isCompleted = progRaw >= 1;
                    const isClaimed = claimedIds.includes(quest.id);

                    return (
                        <Pressable 
                            key={quest.id} 
                            style={[
                                styles.questCard, 
                                { backgroundColor: colors.card, borderColor: colors.border },
                                isCompleted && [styles.questCardCompleted, { borderColor: colors.primary, backgroundColor: isDarkMode ? '#2D3A1F' : '#F8FBF8' }],
                                isClaimed && [styles.questCardClaimed, { opacity: isDarkMode ? 0.3 : 0.5 }]
                            ]}
                            onPress={() => handleClaim(quest)}
                            disabled={!isCompleted || isClaimed}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F5F5F5' }]}>
                                <MaterialCommunityIcons 
                                    name={isClaimed ? "check-circle" : isCompleted ? "medal" : "sword-cross"} 
                                    size={24} 
                                    color={isClaimed ? colors.primary : isCompleted ? "#DAA520" : colors.subtext} 
                                />
                            </View>
                            
                            <View style={styles.content}>
                                <View style={styles.titleRow}>
                                    <Text style={[styles.questTitle, { color: colors.text }]}>{quest.title}</Text>
                                    {isCompleted && !isClaimed && <View style={styles.claimBadge}><Text style={styles.claimText}>RESGATAR</Text></View>}
                                </View>
                                <Text style={[styles.questDescription, { color: colors.subtext }]} numberOfLines={2}>{quest.description}</Text>
                                
                                {!isClaimed && (
                                    <View style={styles.progressContainer}>
                                        <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F0F0F0' }]}>
                                            <View style={[styles.progressFill, { width: `${progRaw * 100}%`, backgroundColor: isCompleted ? '#DAA520' : colors.primary }]} />
                                        </View>
                                        <Text style={[styles.progressText, { color: colors.subtext }]}>{String(Math.round(progRaw * 100))}%</Text>
                                    </View>
                                )}
                            </View>

                            <View style={[styles.rewardContainer, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F9F2E8', borderColor: colors.border }]}>
                                <Ionicons name="wallet" size={10} color={colors.primary} style={{marginBottom: 2}} />
                                <Text style={[styles.rewardText, { color: colors.text }]}>{String(quest.reward)}</Text>
                                <Text style={[styles.xpText, { color: colors.subtext }]}>{String(quest.xpReward)} XP</Text>
                            </View>
                        </Pressable>
                    );
                })}

                {activeList.length === 0 && (
                    <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.6 }}>
                        <Ionicons name="checkmark-done-circle" size={48} color={colors.subtext} />
                        <Text style={{ color: colors.subtext, marginTop: 10, fontWeight: '700' }}>Tudo concluído por aqui</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    coinBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, gap: 6 },
    coinText: { fontSize: 14, fontWeight: '800' },
    
    tabContainer: { paddingHorizontal: 20, paddingBottom: 10, gap: 10 },
    tabContent: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, elevation: 2 },
    tabText: { fontSize: 12, fontWeight: '800' },

    mainQuestBanner: { marginHorizontal: 20, padding: 12, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
    mainQuestBannerText: { fontSize: 10, fontWeight: '800', flex: 1 },
    
    scroll: { paddingHorizontal: 20, paddingBottom: 100 },
    questCard: { flexDirection: 'row', borderRadius: 24, padding: 16, marginBottom: 15, borderWidth: 2, alignItems: 'center', elevation: 2 },
    questCardCompleted: { borderWidth: 2, elevation: 4 },
    questCardClaimed: {  },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    content: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    questTitle: { fontSize: 14, fontWeight: '900' },
    claimBadge: { backgroundColor: '#FF8C42', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, elevation: 2 },
    claimText: { color: 'white', fontSize: 9, fontWeight: '900' },
    questDescription: { fontSize: 11, marginVertical: 4, lineHeight: 16 },
    
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
    progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%' },
    progressText: { fontSize: 10, fontWeight: '900' },
    
    rewardContainer: { alignItems: 'center', justifyContent: 'center', marginLeft: 10, padding: 8, borderRadius: 15, borderWidth: 1, minWidth: 50 },
    rewardText: { fontSize: 12, fontWeight: '900', marginTop: 2 },
    xpText: { fontSize: 9, fontWeight: '900', marginTop: 2 }
});
