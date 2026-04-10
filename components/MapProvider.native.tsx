import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

interface MapProviderProps {
  location: {
    coords: {
      latitude: number;
      longitude: number;
    };
  };
  markerRef: React.RefObject<any>;
}

export default function MapProvider({ location, markerRef }: MapProviderProps) {
  return (
    <MapView 
      style={styles.map} 
      initialRegion={{
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
    >
      <Marker ref={markerRef} coordinate={location.coords} title="Você" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
});
