import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Alert } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCoinsLocal, saveCoinsLocal, addXPLocal } from '../../localDatabase';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';

const INITIAL_QUESTS = [
    { id: '1', title: 'Carinho Matinal', description: 'Faça carinho no seu pet 5 vezes.', reward: 20, progress: 0.6, completed: false, claimed: false },
    { id: '2', title: 'Hora do Lanche', description: 'Alimente seu pet com uma maçã.', reward: 50, progress: 0, completed: false, claimed: false },
    { id: '3', title: 'Explorador Solitário', description: 'Caminhe 500 metros no mapa.', reward: 100, progress: 0.2, completed: false, claimed: false },
    { id: '4', title: 'Primeiro Amigo', description: 'Adicione um amigo à sua lista.', reward: 40, progress: 1, completed: true, claimed: false },
];

export default function QuestsScreen() {
    const { colors, isDarkMode } = useTheme();
    const [coins, setCoins] = useState(0);
    const [quests, setQuests] = useState(INITIAL_QUESTS);

    useFocusEffect(
        React.useCallback(() => {
            async function load() {
                const amount = await getCoinsLocal();
                setCoins(amount);
            }
            load();
        }, [])
    );

    const handleClaim = async (questId: string) => {
        const questIndex = quests.findIndex(q => q.id === questId);
        const quest = quests[questIndex];

        if (!quest.completed || quest.claimed) return;

        const newBalance = coins + quest.reward;
        await saveCoinsLocal(newBalance);
        setCoins(newBalance);

        // Ganha XP ao completar missão
        const xpResult = await addXPLocal(100);
        
        const newQuests = [...quests];
        newQuests[questIndex].claimed = true;
        setQuests(newQuests);

        const msg = xpResult.leveledUp ? `\n\n🚀 LEVEL UP! Seu pet subiu para o nível ${xpResult.level}!` : "";
        Alert.alert('Missão Cumprida! 🏆', `Você recebeu ${quest.reward} PetCoins.${msg}`);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Quadro de Missões 📜</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Cumpra tarefas e ganhe PetCoins!</Text>
                </View>
                <View style={[styles.coinBadge, { backgroundColor: isDarkMode ? '#2D2D2D' : '#F9F2E8', borderColor: colors.border }]}>
                    <FontAwesome5 name="coins" size={14} color="#FFD700" />
                    <Text style={[styles.coinText, { color: colors.text }]}>{coins}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {quests.map(quest => (
                    <Pressable 
                        key={quest.id} 
                        style={[
                            styles.questCard, 
                            { backgroundColor: colors.card, borderColor: colors.border },
                            quest.completed && [styles.questCardCompleted, { borderColor: colors.primary, backgroundColor: isDarkMode ? '#2D3A1F' : '#F8FBF8' }],
                            quest.claimed && [styles.questCardClaimed, { opacity: isDarkMode ? 0.3 : 0.5 }]
                        ]}
                        onPress={() => handleClaim(quest.id)}
                        disabled={!quest.completed || quest.claimed}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F5F5F5' }]}>
                            <MaterialCommunityIcons 
                                name={quest.claimed ? "check-circle" : quest.completed ? "medal" : "clipboard-text-outline"} 
                                size={28} 
                                color={quest.claimed ? colors.primary : quest.completed ? "#DAA520" : colors.primary} 
                            />
                        </View>
                        
                        <View style={styles.content}>
                            <View style={styles.titleRow}>
                                <Text style={[styles.questTitle, { color: colors.text }]}>{quest.title}</Text>
                                {quest.completed && !quest.claimed && <View style={styles.claimBadge}><Text style={styles.claimText}>RESGATAR</Text></View>}
                            </View>
                            <Text style={[styles.questDescription, { color: colors.subtext }]}>{quest.description}</Text>
                            
                            {!quest.claimed && (
                                <View style={styles.progressContainer}>
                                    <View style={[styles.progressBg, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F0F0F0' }]}>
                                        <View style={[styles.progressFill, { width: `${quest.progress * 100}%`, backgroundColor: colors.primary }]} />
                                    </View>
                                    <Text style={[styles.progressText, { color: colors.subtext }]}>{Math.round(quest.progress * 100)}%</Text>
                                </View>
                            )}
                        </View>

                        <View style={[styles.rewardContainer, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F9F2E8', borderColor: colors.border }]}>
                            <FontAwesome5 name="coins" size={14} color="#FFD700" />
                            <Text style={[styles.rewardText, { color: colors.text }]}>{quest.reward}</Text>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: '900' },
    subtitle: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    coinBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 2, gap: 6 },
    coinText: { fontSize: 14, fontWeight: '800' },
    
    scroll: { paddingHorizontal: 20, paddingBottom: 20 },
    questCard: { flexDirection: 'row', borderRadius: 24, padding: 16, marginBottom: 15, borderWidth: 2, alignItems: 'center', elevation: 2 },
    questCardCompleted: { borderWidth: 2 },
    questCardClaimed: { opacity: 0.5 },
    iconCircle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    content: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    questTitle: { fontSize: 16, fontWeight: '900' },
    claimBadge: { backgroundColor: '#FF8C42', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    claimText: { color: 'white', fontSize: 9, fontWeight: '900' },
    questDescription: { fontSize: 12, marginVertical: 4 },
    
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
    progressBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%' },
    progressText: { fontSize: 10, fontWeight: '800' },
    
    rewardContainer: { alignItems: 'center', justifyContent: 'center', marginLeft: 10, padding: 8, borderRadius: 15, borderWidth: 1, minWidth: 45 },
    rewardText: { fontSize: 12, fontWeight: '900', marginTop: 2 },
});
