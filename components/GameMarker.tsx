import React from 'react';
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
    onPress 
}) => {
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

    return (
        <MapMarkerLibre id={id} coordinate={[longitude, latitude]} onPress={onPress}>
            <View style={styles.container}>
                {/* Nome Tag */}
                <View style={[styles.nameTag, { backgroundColor: isMe ? primaryColor : '#2C2C31CC' }]}>
                    <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
                </View>

                {/* Avatar Container */}
                <View style={[
                   styles.avatarContainer, 
                   { borderColor: isMe ? primaryColor : '#FFF', borderWidth: 2 }
                ]}>
                    <View style={[styles.headingIndicator, { transform: [{ rotate: `${heading}deg` }] }]}>
                        <View style={[styles.arrow, { borderBottomColor: isMe ? primaryColor : '#FFF' }]} />
                    </View>
                    
                    <View style={styles.avatarCircle}>
                        {pet?.customImageUri ? (
                            <Image source={{ uri: pet.customImageUri }} style={styles.image} />
                        ) : (
                            <Text style={styles.emoji}>{getAvatarEmoji()}</Text>
                        )}
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
        width: 100,
        height: 100,
    },
    nameTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginBottom: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    nameText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    emoji: {
        fontSize: 24,
    },
    headingIndicator: {
        position: 'absolute',
        top: -12,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    arrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    }
});
