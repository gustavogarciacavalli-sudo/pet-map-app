import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate, withSpring } from 'react-native-reanimated';
import { MapMarkerLibre } from './MapViewLibre';
import { Ionicons } from '@expo/vector-icons';

export type SpotType = 'park' | 'shop' | 'mall' | 'vet' | 'food';

interface SpotMarkerProps {
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    type: SpotType;
    isNear?: boolean;
    onPress?: () => void;
}

const SPOT_CONFIG = {
    park: { icon: 'leaf', color: '#4CAF50' },
    shop: { icon: 'cart', color: '#7C3AED' },
    mall: { icon: 'business', color: '#3498DB' },
    vet: { icon: 'medkit', color: '#E74C3C' },
    food: { icon: 'restaurant', color: '#F1C40F' },
};

export const SpotMarker: React.FC<SpotMarkerProps> = ({ 
    id, 
    latitude, 
    longitude, 
    name, 
    type, 
    isNear, 
    onPress 
}) => {
    const config = SPOT_CONFIG[type] || SPOT_CONFIG.shop;
    const pulse = useSharedValue(1);

    React.useEffect(() => {
        if (isNear) {
            pulse.value = withRepeat(withTiming(1.3, { duration: 1000 }), -1, true);
        } else {
            pulse.value = withSpring(1);
        }
    }, [isNear]);

    const auraStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: interpolate(pulse.value, [1, 1.3], [0.3, 0.6]),
    }));

    return (
        <MapMarkerLibre id={id} coordinate={[longitude, latitude]}>
            <View style={styles.container}>
                <View style={styles.labelContainer}>
                    <Text style={styles.labelText}>{name}</Text>
                </View>

                <View style={styles.markerWrapper}>
                    <Animated.View style={[styles.aura, { backgroundColor: config.color }, auraStyle]} />
                    <View style={[styles.mainCircle, { backgroundColor: config.color }]}>
                        <Ionicons name={config.icon as any} size={20} color="#FFF" />
                    </View>
                </View>
            </View>
        </MapMarkerLibre>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelContainer: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    labelText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
    },
    markerWrapper: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    aura: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
    }
});
