import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from './ThemeContext';

export interface MapViewLibreProps {
    region: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
        heading?: number;
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

export const MapMarkerLibre: React.FC<MapMarkerLibreProps> = ({ coordinate, children, onPress }) => {
    return (
        <Marker 
            coordinate={{ latitude: coordinate[1], longitude: coordinate[0] }} 
            onPress={onPress}
        >
            {children}
        </Marker>
    );
};

export const MapViewLibre: React.FC<MapViewLibreProps> = ({ region, onPress, children }) => {
  const { isDarkMode } = useTheme();

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={region}
      onPress={(e) => onPress && onPress([e.nativeEvent.coordinate.longitude, e.nativeEvent.coordinate.latitude])}
      customMapStyle={isDarkMode ? gameDarkStyle : gameLightStyle}
      zoomControlEnabled={false}
      rotateEnabled={false}
      scrollEnabled={true}
      pitchEnabled={false}
      toolbarEnabled={false}
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
};

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
