import React, { useState, useEffect, memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RadarHUDProps {
    initialTimer: number;
    onTimerEnd?: () => void;
    onPress: () => void;
    active?: boolean;
}

const RadarHUD: React.FC<RadarHUDProps> = ({ initialTimer, onTimerEnd, onPress, active }) => {
    const [timer, setTimer] = useState(initialTimer);

    useEffect(() => {
        setTimer(initialTimer);
    }, [initialTimer]);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        if (onTimerEnd) onTimerEnd();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer > 0]);

    const isCooldown = timer > 0;

    return (
        <Pressable 
            onPress={onPress}
            style={[styles.tab, { backgroundColor: isCooldown ? '#444' : '#2C2C31', opacity: active ? 1 : 0.8 }]}
        >
            <MaterialCommunityIcons 
                name="treasure-chest" 
                size={22} 
                color={isCooldown ? "#666" : "#FFD700"} 
            />
            {isCooldown && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {timer < 60 ? `${timer}s` : `${Math.floor(timer / 60)}m`}
                    </Text>
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    tab: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabText: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 2,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#E74C3C',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
    }
});

export default memo(RadarHUD);
