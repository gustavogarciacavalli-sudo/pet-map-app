import React from 'react';
import { Platform } from 'react-native';

// Este arquivo serve como ponto de entrada para o TypeScript e para o BUNDLER.
// Em tempo de execução, o Metro preferirá .native.tsx no celular e .web.tsx no navegador.

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

// Re-exportamos as implementações. No ambiente de build, o Metro fará a substituição automática
// pelos arquivos .native ou .web, mas ter este arquivo base garante que o TypeScript 
// e o VS Code consigam resolver o módulo corretamente.

export const MapViewLibre: React.FC<MapViewLibreProps> = (props) => {
    const Impl = Platform.OS === 'web' 
        ? require('./MapViewLibre.web').MapViewLibre 
        : require('./MapViewLibre.native').MapViewLibre;
    return <Impl {...props} />;
};

export const MapMarkerLibre: React.FC<MapMarkerLibreProps> = (props) => {
    const Impl = Platform.OS === 'web' 
        ? require('./MapViewLibre.web').MapMarkerLibre 
        : require('./MapViewLibre.native').MapMarkerLibre;
    return <Impl {...props} />;
};
