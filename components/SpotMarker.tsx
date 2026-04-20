import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
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

    return (
        <MapMarkerLibre id={id} coordinate={[longitude, latitude]}>
            <View style={styles.container}>
                <View style={styles.labelContainer}>
                    <Text style={styles.labelText}>{name}</Text>
                </View>

                <View style={styles.markerWrapper}>
                    {isNear && (
                        <View style={[styles.aura, { backgroundColor: config.color, opacity: 0.4 }]} />
                    )}
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
        width: 80,
        height: 80,
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
        // NO ELEVATION
    },
    aura: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
    }
});
