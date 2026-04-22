import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    const [imageLoaded, setImageLoaded] = useState(false);
    
    // In React Native New Architecture (Fabric) + Expo SDK 52, react-native-maps markers
    // MUST NOT use Animated components or complex bounds, otherwise they disappear or clip.
    // They also require explicitly scaled container sizes to not crop their contents.
    
    const imageUri = avatarUri || pet?.customImageUri;
    const hasImage = !!imageUri;

    // Use pure numbers to guarantee Fabric's strict rendering tree doesn't crash on Android
    return (
        <MapMarkerLibre 
            id={id} 
            coordinate={[longitude, latitude]} 
            onPress={onPress}
        >
            <View style={styles.fabricSafeContainer}>
                
                {/* Cone of Light using stacked basic Views (No SVG, No Transforms OUTSIDE bounds) */}
                <View style={[styles.coneRotator, { transform: [{ rotate: `${heading || 0}deg` }] }]}>
                    <View style={styles.coneOffset}>
                        <View style={[styles.coneShape, { borderTopWidth: 60, borderLeftWidth: 32, borderRightWidth: 32, borderTopColor: primaryColor + '2A' }]} />
                        <View style={[styles.coneShape, { borderTopWidth: 44, borderLeftWidth: 20, borderRightWidth: 20, borderTopColor: primaryColor + '40', position: 'absolute', bottom: 0 }]} />
                        <View style={[styles.coneShape, { borderTopWidth: 28, borderLeftWidth: 10, borderRightWidth: 10, borderTopColor: primaryColor + '70', position: 'absolute', bottom: 0 }]} />
                    </View>
                </View>

                {/* Outer Safe Background Ring */}
                <View style={[styles.glowRing, { backgroundColor: primaryColor + '20' }]} />

                {/* Avatar Component */}
                <View style={[styles.avatarOuter, { borderColor: isMe ? primaryColor : '#FFFFFF90' }]}>
                    <View style={[styles.avatarInner, { backgroundColor: isMe ? '#1A1A2E' : '#2C2C36' }]}>
                        {imageUri ? (
                            <Image 
                                source={{ uri: imageUri }} 
                                style={styles.avatarImage} 
                                onLoad={() => setImageLoaded(true)}
                                key={imageUri + (imageLoaded ? 'loaded' : 'loading')}
                                fadeDuration={0} // Disable react-native image fade (often breaks inside markers)
                            />
                        ) : (
                            <View style={[styles.personIconBg, { backgroundColor: isMe ? primaryColor + '20' : '#FFFFFF20' }]}>
                                <Ionicons name={isMe ? "person" : "person-outline"} size={22} color={isMe ? primaryColor : '#FFFFFFCC'} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Name Tag */}
                <View style={[styles.nameTag, { backgroundColor: isMe ? primaryColor : '#1A1A2ECC' }]}>
                    <Text style={styles.nameText} numberOfLines={1}>{name || 'Explorador'}</Text>
                </View>
            </View>
        </MapMarkerLibre>
    );
};

const styles = StyleSheet.create({
    fabricSafeContainer: {
        width: 140, // Strict, large explicit bounds prevent Fabric from aggressively clipping
        height: 180, 
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 10, // Gives top clearance for rotation
    },
    coneRotator: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: -30, // Pulls the avatar OVER the base of the cone (safe inside container bounds)
        zIndex: 1,
    },
    coneOffset: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        transform: [{ translateY: -15 }], // Nudges only inside its rotator box
    },
    coneShape: {
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        backgroundColor: 'transparent',
    },
    glowRing: {
        width: 58,
        height: 58,
        borderRadius: 29,
        position: 'absolute',
        top: 60, // Calculated explicitly
        zIndex: 2,
    },
    avatarOuter: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3,
        backgroundColor: '#1A1A2E',
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
    personIconBg: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameTag: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 6,
        zIndex: 4,
    },
    nameText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
});
