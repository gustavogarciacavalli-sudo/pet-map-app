import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapMarkerLibre } from './MapViewLibre';
import { useMarkerCapture } from './MarkerCaptureProvider';

export type SpotType = 'park' | 'shop' | 'mall' | 'vet';

interface SpotMarkerProps {
    id: string;
    name: string;
    type: SpotType;
    latitude: number;
    longitude: number;
    isNear?: boolean;
}

const getSpotIcon = (type: SpotType) => {
    switch (type) {
        case 'park': return 'leaf';
        case 'shop': return 'cart';
        case 'mall': return 'business';
        case 'vet': return 'medical';
        default: return 'location';
    }
};

const getSpotColor = (type: SpotType) => {
    switch (type) {
        case 'park': return '#4CAF50';
        case 'shop': return '#FF9800';
        case 'mall': return '#9C27B0';
        case 'vet': return '#F44336';
        default: return '#A78BFF';
    }
};

export const SpotMarkerVisual: React.FC<Partial<SpotMarkerProps>> = ({ type, name, isNear }) => {
    const color = getSpotColor(type || 'park');
    return (
        <View style={styles.markerContainer}>
            <View style={[
                styles.spotPin, 
                { backgroundColor: isNear ? color : '#1C1C21', borderColor: color }
            ]}>
                <Ionicons name={getSpotIcon(type || 'park')} size={20} color={isNear ? "#FFF" : color} />
                {isNear && (
                    <View style={styles.nearBadge}>
                        <Ionicons name="star" size={10} color="#FFF" />
                    </View>
                )}
            </View>
            <View style={styles.labelContainer}>
                <Text style={styles.labelText} numberOfLines={1}>{name}</Text>
            </View>
        </View>
    );
};

export const SpotMarker: React.FC<SpotMarkerProps> = (props) => {
    const { id, latitude, longitude, name, type, isNear } = props;
    const { registerMarker, unregisterMarker } = useMarkerCapture();
    const [capturedUri, setCapturedUri] = useState<string | null>(null);
    
    // Animação de Pop In
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7
        }).start();

        if (Platform.OS === 'android') {
            const capture = async () => {
                const cacheKey = `spot-marker-${id}-${type}-${isNear}-${name}`;
                const uri = await registerMarker(
                    cacheKey,
                    <SpotMarkerVisual type={type} name={name} isNear={isNear} />,
                    { width: 120, height: 100 }
                );
                if (uri) setCapturedUri(uri);
            };
            capture();
        }
        return () => {
            if (Platform.OS === 'android') unregisterMarker(id);
        };
    }, [id, type, isNear, name]);

    const icon = Platform.OS === 'android' ? (capturedUri ? { uri: capturedUri } : null) : null;

    return (
        <MapMarkerLibre
            id={id}
            coordinate={[longitude, latitude]}
            anchor={{ x: 0.5, y: 1 }}
            icon={icon as any}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }}>
                {Platform.OS !== 'android' && <SpotMarkerVisual type={type} name={name} isNear={isNear} />}
            </Animated.View>
        </MapMarkerLibre>
    );
};

const styles = StyleSheet.create({
    markerContainer: {
        alignItems: 'center',
        width: 120,
        height: 100,
        justifyContent: 'flex-end',
        paddingBottom: 2,
    },
    spotPin: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    nearBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#FFD700',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1C1C21',
    },
    labelContainer: {
        marginTop: 4,
        backgroundColor: 'rgba(28, 28, 33, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    labelText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
});
