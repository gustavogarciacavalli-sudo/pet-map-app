import React from 'react';

export interface MapViewProviderProps {
    region: { 
        latitude: number; 
        longitude: number; 
        latitudeDelta?: number; 
        longitudeDelta?: number;
    };
    onPress?: (coord: { latitude: number; longitude: number }) => void;
    children?: React.ReactNode;
}

export const MapViewProvider: React.FC<MapViewProviderProps>;

export interface MapMarkerProps {
    coordinate: { latitude: number; longitude: number };
    onPress?: () => void;
    children?: React.ReactNode;
}

export const MapMarker: React.FC<MapMarkerProps>;

export const MapPolyline: React.FC<any>;
