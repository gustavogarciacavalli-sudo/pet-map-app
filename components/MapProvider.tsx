import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MapProviderProps {
  location: any;
  markerRef: any;
}

export default function MapProvider({ location }: MapProviderProps) {
  return (
    <View style={styles.webMapPlaceholder}>
      <Text style={styles.webMapEmoji}>📍</Text>
      <Text style={styles.webMapTitle}>Visualização Web</Text>
      <Text style={styles.webMapSubtitle}>
        O mapa real está disponível apenas no celular.{"\n"}
        Use esta versão para testar a interface e os botões.
      </Text>
      {location && (
        <Text style={styles.locationText}>
          Posição: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#BBDEFB',
    width: '100%',
    height: '100%',
  },
  webMapEmoji: { fontSize: 60, marginBottom: 15 },
  webMapTitle: { fontSize: 20, fontWeight: 'bold', color: '#1565C0', marginBottom: 8 },
  webMapSubtitle: { fontSize: 14, color: '#1976D2', textAlign: 'center', marginBottom: 15 },
  locationText: { fontSize: 11, color: '#444', fontStyle: 'italic' },
});
