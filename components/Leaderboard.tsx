import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabaseConfig';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

export function Leaderboard() {
    const { colors } = useTheme();
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRankings = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('name, wander_id, level, xp')
                .order('level', { ascending: false })
                .order('xp', { ascending: false })
                .limit(10);

            if (data) {
                setRankings(data);
            }
            setLoading(false);
        };

        fetchRankings();
    }, []);

    if (loading) return <ActivityIndicator color={colors.primary} style={{ margin: 20 }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <FontAwesome5 name="crown" size={20} color="#FFD700" />
                <Text style={[styles.title, { color: colors.text }]}>TOP EXPLORADORES</Text>
            </View>

            {rankings.map((user, index) => (
                <View key={user.wander_id} style={[styles.rankItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                        <Text style={[styles.userWanderId, { color: colors.subtext }]}>{user.wander_id}</Text>
                    </View>

                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>NV {user.level}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    rankBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    rankText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    userWanderId: {
        fontSize: 12,
    },
    levelBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: '#4CAF5022',
    },
    levelText: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 12,
    }
});
