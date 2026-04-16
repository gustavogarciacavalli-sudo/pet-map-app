import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TapSparklesProps {
    active: boolean;
    color?: string;
}

export const TapSparkles = ({ active, color = '#5C4033' }: TapSparklesProps) => {
    if (!active) return null;

    const Spark = ({ angle, distance }: { angle: number; distance: number }) => {
        const rad = (angle * Math.PI) / 180;
        const tx = Math.cos(rad) * distance;
        const ty = Math.sin(rad) * distance;
        
        return (
            <View style={[
                styles.sparkle, 
                { 
                    backgroundColor: color,
                    transform: [
                        { translateX: tx },
                        { translateY: ty },
                        { rotate: `${angle + 90}deg` },
                        { scale: 0.8 }
                    ],
                    opacity: 0.6
                }
            ]} />
        );
    };

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
