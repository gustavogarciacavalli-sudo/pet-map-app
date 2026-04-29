import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapMarkerLibre } from './MapViewLibre';
import { PetPreview } from './PetPreview';
import { useMarkerCapture } from './MarkerCaptureProvider';

interface GameMarkerProps {
    id: string;
    latitude: number;
    longitude: number;
    heading?: number;
    name: string;
    primaryColor: string;
    avatarUri?: string | null;
    pet?: any;
    isMe?: boolean;
    onPress?: () => void;
}

export const GameMarkerVisual: React.FC<Partial<GameMarkerProps>> = ({ primaryColor, avatarUri, pet, name, heading, isMe }) => (
    <View style={styles.markerContainer}>
        <View style={[styles.avatarWrapper, { borderColor: primaryColor }]}>
            {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
                <View style={[styles.placeholderAvatar, { backgroundColor: primaryColor + '40' }]}>
                    <Ionicons name="person" size={24} color={primaryColor} />
                </View>
            )}
            
            {pet && (
                <View style={styles.petBadge}>
                    <PetPreview species={pet.species} size={16} />
                </View>
            )}

            {isMe && (
                <View style={[styles.directionArrow, { transform: [{ rotate: `${heading || 0}deg` }] }]}>
                    <Ionicons name="caret-up" size={14} color={primaryColor} />
                </View>
            )}
        </View>
        <View style={[styles.nameTag, { backgroundColor: '#1C1C21EE' }]}>
            <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
        </View>
    </View>
);

export const GameMarker: React.FC<GameMarkerProps> = (props) => {
    const { id, latitude, longitude, onPress } = props;
    const { registerMarker, unregisterMarker } = useMarkerCapture();
    const [capturedUri, setCapturedUri] = useState<string | null>(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const capture = async () => {
                // Arredonda o heading para múltiplos de 15 graus para reduzir snapshots desnecessários
                const roundedHeading = Math.round((props.heading || 0) / 15) * 15;
                const cacheKey = `game-marker-${id}-${props.primaryColor}-${props.avatarUri}-${roundedHeading}-${props.isMe}`;
                
                const uri = await registerMarker(
                    cacheKey,
                    <GameMarkerVisual {...props} heading={roundedHeading} />,
                    { width: 100, height: 120 }
                );
                if (uri) setCapturedUri(uri);
            };
            capture();
        }
        return () => {
            if (Platform.OS === 'android') unregisterMarker(id);
        };
    }, [id, props.primaryColor, props.avatarUri, Math.round((props.heading || 0) / 15), props.isMe]);

    const icon = Platform.OS === 'android' ? (capturedUri ? { uri: capturedUri } : null) : null;

    return (
        <MapMarkerLibre
            id={id}
            coordinate={[longitude, latitude]}
            onPress={onPress}
            anchor={{ x: 0.5, y: 1 }}
            icon={icon as any}
        >
            {Platform.OS !== 'android' && <GameMarkerVisual {...props} />}
        </MapMarkerLibre>
    );
};

const styles = StyleSheet.create({
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 100,
        height: 120,
        paddingBottom: 2, // Pequeno respiro para não cortar a pontinha
    },
    avatarWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        backgroundColor: '#1C1C21',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    avatarImage: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    placeholderAvatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    petBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#1C1C21',
        borderRadius: 12,
        padding: 2,
        borderWidth: 1,
        borderColor: '#333',
    },
    directionArrow: {
        position: 'absolute',
        top: -15,
        alignItems: 'center',
    },
    nameTag: {
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    nameText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
});
