import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
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
    onRegionChangeComplete?: (region: any) => void;
    children?: React.ReactNode;
}

export interface MapMarkerLibreProps {
    id: string;
    coordinate: [number, number];
    onPress?: () => void;
    children?: React.ReactNode;
    anchor?: { x: number; y: number };
    icon?: any;
}

export interface MapCircleLibreProps {
    center: [number, number];
    radius: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
}

export const MapMarkerLibre: React.FC<MapMarkerLibreProps> = ({ coordinate, children, onPress, anchor, icon }) => {
    return (
        <Marker 
            coordinate={{ latitude: coordinate[1], longitude: coordinate[0] }} 
            onPress={onPress}
            anchor={anchor}
            icon={icon}
        >
            {icon ? null : children}
        </Marker>
    );
};

export const MapCircleLibre: React.FC<MapCircleLibreProps> = (props) => (
    <Circle
        center={{ latitude: props.center[1], longitude: props.center[0] }}
        radius={props.radius}
        fillColor={props.fillColor}
        strokeColor={props.strokeColor}
        strokeWidth={props.strokeWidth}
    />
);

export const MapViewLibre = React.forwardRef<MapView, MapViewLibreProps>(({ region, onPress, onRegionChangeComplete, children }, ref) => {
    const { isDarkMode } = useTheme();

    return (
        <View style={styles.container}>
            <MapView
                ref={ref}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={region}
                onRegionChangeComplete={onRegionChangeComplete}
                onPress={(e) => onPress && onPress([e.nativeEvent.coordinate.longitude, e.nativeEvent.coordinate.latitude])}
                customMapStyle={isDarkMode ? gameDarkStyle : gameLightStyle}
                zoomControlEnabled={false}
                rotateEnabled={false}
                scrollEnabled={true}
                pitchEnabled={false}
                loadingEnabled={true}
                loadingBackgroundColor={isDarkMode ? '#121218' : '#F7F7FA'}
                loadingIndicatorColor="#A78BFF"
            >
                {children}
            </MapView>
        </View>
    );
});

const gameLightStyle = [
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "all", "stylers": [{ "visibility": "off" }] }
];

const gameDarkStyle = [
  { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#8d8d8d" }] },
  { "featureType": "landscape", "elementType": "geometry.fill", "stylers": [{ "color": "#121212" }] },
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] }
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
});
