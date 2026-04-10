import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface TapSparklesProps {
    active: boolean;
    color?: string;
}

export const TapSparkles = ({ active, color = '#5C4033' }: TapSparklesProps) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (active) {
            scale.value = 0;
            opacity.value = 1;
            scale.value = withSpring(1, { damping: 10, stiffness: 100 });
            opacity.value = withTiming(0, { duration: 600 });
        }
    }, [active]);

    const sparkleStyle = (angle: number, distance: number) => useAnimatedStyle(() => {
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * distance * scale.value;
        const ty = Math.sin(rad) * distance * scale.value;
        return {
            opacity: opacity.value,
            transform: [
                { translateX: tx },
                { translateY: ty },
                { rotate: `${angle + 90}deg` },
                { scale: scale.value }
            ],
        };
    });

    const Spark = ({ angle, distance }: { angle: number; distance: number }) => (
        <Animated.View style={[styles.sparkle, { backgroundColor: color }, sparkleStyle(angle, distance)]} />
    );

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Lado Esquerdo */}
            <Spark angle={160} distance={55} />
            <Spark angle={180} distance={65} />
            <Spark angle={200} distance={55} />
            {/* Lado Direito */}
            <Spark angle={-20} distance={55} />
            <Spark angle={0} distance={65} />
            <Spark angle={20} distance={55} />
        </View>
    );
};

const styles = StyleSheet.create({
    sparkle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 6,
        height: 18,
        borderRadius: 3,
        marginTop: -9,
        marginLeft: -3,
    },
});
