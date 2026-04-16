import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

interface PremiumSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    trackColor?: { false: string; true: string };
    thumbColor?: string;
}

export function PremiumSwitch({ value, onValueChange, trackColor }: PremiumSwitchProps) {
    const { colors } = useTheme();
    // UseRef para manter o valor animado sem re-criar
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        // Stop any currently running animations before starting a new one
        animatedValue.stopAnimation();
        
        Animated.spring(animatedValue, {
            toValue: value ? 1 : 0,
            friction: 9, // Um pouco mais de fricção para ser mais controlado
            tension: 80, // Um pouco mais de tensão para ser mais "snappy"
            useNativeDriver: false, // Necessário para interpolação de BACKGROUND e layouts complexos
        }).start();
    }, [value, animatedValue]);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 22],
    });

    const backgroundColor = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [trackColor?.false || 'rgba(150, 150, 150, 0.2)', trackColor?.true || colors.primary],
    });

    return (
        <Pressable 
            onPress={() => onValueChange(!value)} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
        >
            <Animated.View style={[styles.track, { backgroundColor }]}>
                <Animated.View 
                    style={[
                        styles.thumb, 
                        { 
                            transform: [{ translateX }],
                            backgroundColor: '#FFFFFF',
                            shadowColor: '#000',
                        }
                    ]} 
                />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    track: {
        width: 48,
        height: 28,
        borderRadius: 14,
        padding: 2,
        justifyContent: 'center',
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        elevation: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});
