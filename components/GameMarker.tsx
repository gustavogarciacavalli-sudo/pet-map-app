import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Platform, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapMarkerLibre } from './MapViewLibre';
import { useMarkerCapture } from './MarkerCaptureProvider';
import { useMarkerAnimation } from '@/hooks/useMarkerAnimation';

interface GameMarkerProps {
  id: string;
  latitude: number;
  longitude: number;
  avatarUri?: string | null;
  primaryColor?: string;
  name?: string;
  isMe?: boolean;
  pet?: any;
  isNew?: boolean;
  onPress?: () => void;
}

export const GameMarkerVisual: React.FC<GameMarkerProps & { scale?: Animated.Value }> = (props) => {
  const { avatarUri, primaryColor = '#7C3AED', isMe, name, scale } = props;

  return (
    <Animated.View style={[
      styles.markerContainer,
      scale ? { transform: [{ scale }] } : undefined
    ]}>
      {name && !isMe && (
        <View style={styles.nameTag}>
          <Text style={styles.nameText}>{name}</Text>
        </View>
      )}
      <View style={[styles.avatarWrapper, { borderColor: primaryColor }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.placeholderAvatar, { backgroundColor: primaryColor }]}>
            <Ionicons name="person" size={30} color="#FFF" />
          </View>
        )}
        {isMe && (
          <View style={styles.meBadge}>
            <Ionicons name="star" size={10} color="#FFF" />
          </View>
        )}
      </View>
      <View style={[styles.pinTip, { borderTopColor: primaryColor }]} />
    </Animated.View>
  );
};

export const GameMarker: React.FC<GameMarkerProps> = (props) => {
  const { id, latitude, longitude, onPress, isNew = false } = props;
  const { registerMarker, unregisterMarker } = useMarkerCapture();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const { latAnim, lngAnim, scaleAnim } = useMarkerAnimation(latitude, longitude, isNew);

  // Sincronia de coordenadas animadas para o componente nativo
  const [animCoords, setAnimCoords] = useState({ lat: latitude, lng: longitude });

  useEffect(() => {
    const latId = latAnim.addListener(({ value }) =>
      setAnimCoords(prev => ({ ...prev, lat: value }))
    );
    const lngId = lngAnim.addListener(({ value }) =>
      setAnimCoords(prev => ({ ...prev, lng: value }))
    );
    return () => {
      latAnim.removeListener(latId);
      lngAnim.removeListener(lngId);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const capture = async () => {
        const cacheKey = `game-marker-v4-${id}-${props.primaryColor}-${props.avatarUri}-${props.isMe}`;
        const uri = await registerMarker(
          cacheKey,
          <GameMarkerVisual {...props} />,
          { width: 100, height: 120 }
        );
        if (uri) setCapturedUri(uri);
      };
      capture();
    }
    return () => {
      if (Platform.OS === 'android') unregisterMarker(id);
    };
  }, [id, props.primaryColor, props.avatarUri, props.isMe]);

  const icon = Platform.OS === 'android'
    ? (capturedUri ? { uri: capturedUri } : null)
    : null;

  return (
    <MapMarkerLibre
      id={id}
      coordinate={[animCoords.lng, animCoords.lat]}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
      icon={icon as any}
      isNew={isNew}
    >
      {Platform.OS !== 'android' && <GameMarkerVisual {...props} scale={scaleAnim} />}
    </MapMarkerLibre>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 100,
    height: 120,
    paddingBottom: 2,
  },
  nameTag: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  nameText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  avatarWrapper: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3,
    backgroundColor: '#1C1C21', justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  avatarImage: { width: 54, height: 54, borderRadius: 27 },
  placeholderAvatar: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center'
  },
  meBadge: {
    position: 'absolute', bottom: -5, right: -5, backgroundColor: '#1C1C21',
    borderRadius: 12, padding: 2, borderWidth: 1, borderColor: '#333',
  },
  pinTip: {
    width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid',
    borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 15,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -5,
    zIndex: -1,
  }
});
