import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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

export { Marker as MapMarker, Polyline as MapPolyline } from 'react-native-maps';

export function MapViewProvider({ region, onPress, children }: MapViewProps) {
  const { isDarkMode } = useTheme();

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={region}
      onPress={(e) => onPress && onPress(e.nativeEvent.coordinate)}
      customMapStyle={isDarkMode ? gameDarkStyle : gameLightStyle}
      
      // DESATIVAMOS TODOS OS CONTROLES TÉCNICOS
      zoomControlEnabled={false} // Remove os botões + e - no Android
      rotateEnabled={false}
      scrollEnabled={true}
      pitchEnabled={false}
      toolbarEnabled={false} // Remove a barra do Google Maps ao clicar em marcadores
      showsCompass={false}
      showsMyLocationButton={false}
      showsPointsOfInterest={false}
      showsBuildings={false}
      showsTraffic={false}
      showsIndoors={false}
    >
      {children}
    </MapView>
  );
}

const gameLightStyle = [
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "labels", "stylers": [{ "visibility": "simplified" }] },
  { "featureType": "landscape.man_made", "elementType": "geometry", "stylers": [{ "color": "#f7f1df" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#d0e3b4" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#a2daf2" }] }
];

const gameDarkStyle = [
  { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#8d8d8d" }] },
  { "featureType": "landscape", "elementType": "geometry.fill", "stylers": [{ "color": "#121212" }] },
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#000000" }] }
];

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});
