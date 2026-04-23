import React from 'react';
import { Platform } from 'react-native';

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
    isNew?: boolean;
}

export interface MapCircleLibreProps {
    center: [number, number];
    radius: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
}

export const MapViewLibre = React.forwardRef<any, MapViewLibreProps>((props, ref) => {
    // Metro selecionará .web ou .native automaticamente
    const Impl = Platform.OS === 'web' 
        ? require('./MapViewLibre.web').MapViewLibre 
        : require('./MapViewLibre.native').MapViewLibre;
    return <Impl {...props} ref={ref} />;
});

export const MapMarkerLibre: React.FC<MapMarkerLibreProps> = (props) => {
    const Impl = Platform.OS === 'web' 
        ? require('./MapViewLibre.web').MapMarkerLibre 
        : require('./MapViewLibre.native').MapMarkerLibre;
    return <Impl {...props} />;
};

export const MapCircleLibre: React.FC<MapCircleLibreProps> = (props) => {
    const Impl = Platform.OS === 'web' 
        ? require('./MapViewLibre.web').MapCircleLibre 
        : require('./MapViewLibre.native').MapCircleLibre;
    return <Impl {...props} />;
};
