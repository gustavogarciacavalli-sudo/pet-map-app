import React, { createContext, useContext } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from './ThemeContext';

const MapContext = createContext<any>(null);

export interface MapViewLibreProps {
    region: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    onPress?: (coord: [number, number]) => void;
    children?: React.ReactNode;
}

export interface MapMarkerLibreProps {
    id: string;
    coordinate: [number, number];
    onPress?: () => void;
    children: React.ReactNode;
}

export function MapMarkerLibre({ coordinate, children, onPress }: MapMarkerLibreProps) {
    const region = useContext(MapContext);
    let top = '50%';
    let left = '50%';

    if (region && coordinate) {
        // Simple linear projection for web demo purposes
        const minLon = region.longitude - 0.005;
        const minLat = region.latitude - 0.005;
        
        const percX = ((coordinate[0] - minLon) / 0.01) * 100;
        const percY = (1 - ((coordinate[1] - minLat) / 0.01)) * 100;

        left = `${percX}%`;
        top = `${percY}%`;
    }

    return (
        <View style={{ 
            position: 'absolute', 
            top: top as any, 
            left: left as any, 
            transform: [{ translateX: -20 }, { translateY: -20 }], 
            zIndex: 10 
        }}>
            <Pressable onPress={onPress}>
                {children}
            </Pressable>
        </View>
    );
}

export function MapViewLibre({ region, onPress, children }: MapViewLibreProps) {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.webContainer}>
        <View style={styles.mapFrame}>
            <iframe
                title="WanderMap"
                width="120%"
                height="120%"
                frameBorder="0"
                style={{ 
                    border: 0, 
                    position: 'absolute',
                    top: '-10%',
                    left: '-10%',
                    pointerEvents: 'none',
                    filter: isDarkMode ? 'brightness(0.7) contrast(1.1) invert(1) hue-rotate(180deg)' : 'none',
                }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${region.longitude - 0.008}%2C${region.latitude - 0.006}%2C${region.longitude + 0.008}%2C${region.latitude + 0.006}&layer=mapnik`}
                allowFullScreen
            />
        </View>
        
        <MapContext.Provider value={region}>
            <View style={styles.webOverlay} pointerEvents="box-none">
                {children}
            </View>
        </MapContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  mapFrame: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  webOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
