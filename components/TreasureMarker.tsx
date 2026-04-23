import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapMarkerLibre } from './MapViewLibre';
import { useMarkerCapture } from './MarkerCaptureProvider';

interface TreasureMarkerProps {
    id: string;
    latitude: number;
    longitude: number;
    type: 'gem' | 'gift' | 'gold';
    onPress?: () => void;
}

export const TreasureMarkerVisual: React.FC<{ type: 'gem' | 'gift' | 'gold' }> = ({ type }) => (
    <View style={styles.container}>
        <View style={[
            styles.treasureBox,
            { backgroundColor: type === 'gem' ? '#7AABE0' : (type === 'gold' ? '#FFD700' : '#FF69B4') }
        ]}>
            <Ionicons name={type === 'gem' ? "diamond" : (type === 'gold' ? "wallet" : "gift")} size={24} color="#FFF" />
        </View>
    </View>
);

export const TreasureMarker: React.FC<TreasureMarkerProps> = (props) => {
    const { id, latitude, longitude, type, onPress } = props;
    const { registerMarker, unregisterMarker } = useMarkerCapture();
    const [capturedUri, setCapturedUri] = useState<string | null>(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const capture = async () => {
                const cacheKey = `treasure-${id}-${type}`;
                const uri = await registerMarker(
                    cacheKey,
                    <TreasureMarkerVisual type={type} />,
                    { width: 60, height: 60 }
                );
                if (uri) setCapturedUri(uri);
            };
            capture();
        }
        return () => {
            if (Platform.OS === 'android') unregisterMarker(id);
        };
    }, [id, type]);

    const icon = Platform.OS === 'android' ? (capturedUri ? { uri: capturedUri } : null) : null;

    return (
        <MapMarkerLibre
            id={id}
            coordinate={[longitude, latitude]}
            onPress={onPress}
            anchor={{ x: 0.5, y: 0.5 }}
            icon={icon as any}
        >
            {Platform.OS !== 'android' && <TreasureMarkerVisual type={type} />}
        </MapMarkerLibre>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    treasureBox: {
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFF',
        elevation: 5,
    },
});
