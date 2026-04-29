import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { MapMarkerLibre } from './MapViewLibre';
import { useMarkerCapture } from './MarkerCaptureProvider';

interface MergedMarkerProps {
  id: string;
  latitude: number;
  longitude: number;
  imageUris: (string | null)[];
  primaryColor: string;
  onPress?: () => void;
}

export const MergedMarkerVisual: React.FC<{ images: (string | null)[], color: string }> = ({ images, color }) => (
    <View style={[styles.mergedContainer, { borderColor: color }]}>
        {images.slice(0, 3).map((uri, idx) => (
            <View 
                key={idx} 
                style={[
                    styles.miniAvatar, 
                    { 
                        zIndex: 10 - idx,
                        marginLeft: idx === 0 ? 0 : -15,
                        transform: [{ scale: 1 - idx * 0.1 }]
                    }
                ]}
            >
                {uri ? (
                    <Image source={{ uri }} style={styles.image} />
                ) : (
                    <View style={[styles.placeholder, { backgroundColor: color }]} />
                )}
            </View>
        ))}
    </View>
);

export const MergedMarker: React.FC<MergedMarkerProps> = (props) => {
    const { id, latitude, longitude, onPress } = props;
    const { registerMarker, unregisterMarker } = useMarkerCapture();
    const [capturedUri, setCapturedUri] = useState<string | null>(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const capture = async () => {
                const cacheKey = `merged-marker-${id}-${props.primaryColor}-${props.imageUris.join(',')}`;
                const uri = await registerMarker(
                    cacheKey,
                    <MergedMarkerVisual images={props.imageUris} color={props.primaryColor} />,
                    { width: 120, height: 60 }
                );
                if (uri) setCapturedUri(uri);
            };
            capture();
        }
        return () => {
            if (Platform.OS === 'android') unregisterMarker(id);
        };
    }, [id, props.primaryColor, props.imageUris]);

    const icon = Platform.OS === 'android' ? (capturedUri ? { uri: capturedUri } : null) : null;

    return (
        <MapMarkerLibre
            id={id}
            coordinate={[longitude, latitude]}
            onPress={onPress}
            anchor={{ x: 0.5, y: 0.5 }}
            icon={icon as any}
        >
            {(Platform.OS !== 'android' || !capturedUri) && <MergedMarkerVisual images={props.imageUris} color={props.primaryColor} />}
        </MapMarkerLibre>
    );
};

const styles = StyleSheet.create({
  mergedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 30,
    backgroundColor: '#1C1C21',
    borderWidth: 2,
    width: 120,
    height: 60,
    justifyContent: 'center',
    elevation: 8,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1C1C21',
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
  },
});
