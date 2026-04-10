import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeContext';

interface MapViewProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onPress?: (coord: { latitude: number, longitude: number }) => void;
  children?: React.ReactNode;
}

export function MapMarker({ coordinate, children, onPress }: any) {
    return null; // Mock para Web
}

export function MapPolyline({ coordinates, strokeWidth, strokeColor }: any) {
    return null; // Mock para Web
}

export function MapViewProvider({ region, onPress, children }: MapViewProps) {
  const { colors, isDarkMode } = useTheme();

  // Aplica filtros artísticos para o visual de jogo
  const gameFilters = isDarkMode 
    ? { filter: 'invert(100%) hue-rotate(180deg) brightness(80%) contrast(110%) grayscale(30%)' }
    : { filter: 'sepia(30%) brightness(105%) hue-rotate(-10deg) saturate(90%)' };

  return (
    <View style={styles.webContainer}>
        <View style={[styles.mapClippingContainer, gameFilters]}>
            <iframe
                title="WanderMap-Final-Clean"
                width="125%" // Aumentado significativamente para expulsar os controles
                height="125%" // Aumentado significativamente para expulsar os créditos do rodapé
                frameBorder="0"
                style={{ 
                    border: 0, 
                    position: 'absolute',
                    top: '-12.5%', // Deslocamento agressivo para cima (esconde o zoom)
                    left: '-12.5%', // Deslocamento agressivo para o lado
                }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${region.longitude - 0.005}%2C${region.latitude - 0.005}%2C${region.longitude + 0.005}%2C${region.latitude + 0.005}&layer=mapnik`}
                allowFullScreen
            />
        </View>
        
        <View style={styles.webOverlay} pointerEvents="box-none">
            {children}
        </View>
        
        <View style={[styles.webInstructions, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)' }]}>
            <Text style={{color: colors.text, fontSize: 9, fontWeight: '900', textTransform: 'uppercase'}}>
                {isDarkMode ? 'Exploração Noturna 🌙' : 'Mundo de Aventura ☀️'}
            </Text>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  mapClippingContainer: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
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
  webInstructions: {
    position: 'absolute',
    top: 15,
    left: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  }
});
