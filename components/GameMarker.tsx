import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { MapMarkerLibre } from './MapViewLibre';
import { LocalPet } from '@/localDatabase';

interface GameMarkerProps {
    id: string;
    latitude: number;
    longitude: number;
    heading: number;
    name: string;
    pet?: LocalPet | null;
    primaryColor: string;
    isMe?: boolean;
    avatarUri?: string | null;
    onPress?: () => void;
}

export const GameMarker: React.FC<GameMarkerProps> = ({ 
    id, 
    latitude, 
    longitude, 
    heading, 
    name, 
    pet, 
    primaryColor, 
    isMe = false,
    avatarUri,
    onPress 
}) => {
    // Triggers a re-render to force react-native-maps to redraw the marker on Android once the remote image loads.
    const [imageLoaded, setImageLoaded] = useState(false);

    const getAvatarEmoji = () => {
        if (!pet) return '👤';
        switch (pet.species) {
            case 'bunny': return '🐰';
            case 'puppy': return '🐶';
            case 'cat': return '🐱';
            case 'sheep': return '🐑';
            case 'mouse': return '🐭';
            case 'snake': return '🐍';
            case 'fox': return '🦊';
            case 'parrot': return '🦜';
            case 'frog': return '🐸';
            case 'cockroach': return '🪳';
            case 'wolf': return '🐺';
            case 'raccoon': return '🦝';
            case 'bear': return '🐻';
            default: return '🐾';
        }
    };

    // Determine which image to show: user avatar photo > pet custom image > emoji
    const imageUri = avatarUri || pet?.customImageUri;

    return (
        <MapMarkerLibre id={id} coordinate={[longitude, latitude]} onPress={onPress}>
            {/* explicit width/height prevents collapsing on Android */}
            <View style={styles.container}>
                {/* Direction cone - styled like a light projection */}
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                    <View style={{ transform: [{ rotate: `${heading}deg` }] }}>
                        {/* The wrapper shifts the cone so its point touches the avatar center exactly */}
                        <View style={{ transform: [{ translateY: -36 }] }}> 
                            <View style={[
                                styles.lightCone,
                                { borderTopColor: isMe ? primaryColor + '50' : '#FFFFFF40' }
                            ]} />
                        </View>
                    </View>
                </View>

                {/* Pulse ring for "me" */}
                {isMe && (
                    <View style={[styles.pulseRing, { borderColor: primaryColor + '40' }]} />
                )}

                {/* Avatar Container */}
                <View style={[
                    styles.avatarOuter,
                    { borderColor: isMe ? primaryColor : '#FFFFFF90' }
                ]}>
                    <View style={[styles.avatarInner, { backgroundColor: isMe ? '#1A1A2E' : '#2C2C36' }]}>
                        {imageUri ? (
                            <Image 
                                source={{ uri: imageUri }} 
                                style={styles.avatarImage} 
                                onLoad={() => setImageLoaded(true)}
                                // Key forces redraw if URI changes
                                key={imageUri + (imageLoaded ? 'loaded' : 'loading')} 
                            />
                        ) : (
                            <Text style={styles.emoji}>{getAvatarEmoji()}</Text>
                        )}
                    </View>
                </View>

                {/* Name Tag */}
                <View style={[
                    styles.nameTag,
                    { backgroundColor: isMe ? primaryColor : '#1A1A2ECC' }
                ]}>
                    <Text style={styles.nameText} numberOfLines={1}>{name || 'Explorador'}</Text>
                </View>
            </View>
        </MapMarkerLibre>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
    },
    // Direction cone
    lightCone: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 26,
        borderRightWidth: 26,
        borderTopWidth: 55, // Slightly longer
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    // Pulse
    pulseRing: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
    },
    // Avatar
    avatarOuter: {
        width: 48,
        height: 48,
        borderRadius: 24, // Use direct squircle approximation or round
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
        backgroundColor: '#1A1A2E',
        // NO ELEVATION OR SHADOWS! Android maps crash/hide markers with elevations
    },
    avatarInner: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
    },
    emoji: {
        fontSize: 22,
    },
    // Name
    nameTag: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
        zIndex: 5,
        // NO ELEVATION
    },
    nameText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
});
