import React, { memo } from 'react';
import { MapViewLibre, MapMarkerLibre } from './MapViewLibre';
import { GameMarker } from './GameMarker';
import { MergedMarker } from './MergedMarker';
import { SpotMarker } from './SpotMarker';
import { TreasureMarker } from './TreasureMarker';
import { MarkerData } from '../utils/clusterPlayers';
import { SpotType } from './SpotMarker';

interface GameMapViewProps {
    mapRef: any;
    location: any;
    currentRegion: any;
    onPress: () => void;
    onRegionChangeComplete: (region: any) => void;
    petSpots: { id: string, name: string, type: SpotType, lat: number, lon: number }[];
    activeSpotId?: string;
    treasures: { id: string, lat: number, lon: number, type: 'gold' | 'gem' }[];
    onCollectTreasure: (t: any) => void;
    visibleMarkers: MarkerData[];
    animatingIds: Set<string>;
    showMerge: boolean;
    handleMemberTap: (player: any) => void;
    colors: any;
}

const GameMapView: React.FC<GameMapViewProps> = ({
    mapRef,
    location,
    currentRegion,
    onPress,
    onRegionChangeComplete,
    petSpots,
    activeSpotId,
    treasures,
    onCollectTreasure,
    visibleMarkers,
    animatingIds,
    showMerge,
    handleMemberTap,
    colors
}) => {
    return (
        <MapViewLibre 
            ref={mapRef}
            region={location} 
            onPress={onPress}
            onRegionChangeComplete={onRegionChangeComplete}
        >
            {/* Pontos Oficiais no Mapa - Somem com Zoom Out */}
            {(currentRegion?.latitudeDelta < 0.02 || !currentRegion) && petSpots.map(spot => (
                <SpotMarker 
                    key={spot.id}
                    id={spot.id}
                    name={spot.name}
                    type={spot.type}
                    latitude={spot.lat}
                    longitude={spot.lon}
                    isNear={activeSpotId === spot.id}
                />
            ))}

            {/* Tesouros do Radar */}
            {treasures.map(t => (
                <TreasureMarker 
                    key={t.id}
                    id={t.id}
                    latitude={t.lat}
                    longitude={t.lon}
                    type={t.type === 'gold' ? 'gold' : 'gem'}
                    onPress={() => onCollectTreasure(t)}
                />
            ))}

            {/* Renderização Dinâmica de Marcadores (Clustered) */}
            {visibleMarkers.map(m => {
                if (showMerge && animatingIds.has(m.id)) {
                    return null;
                }

                if (m.type === 'merged' && m.players) {
                    // Evitar criar um novo array a cada render se os jogadores não mudarem
                    const imageUris = m.players.map(p => p.imageUri || null);
                    const firstPlayerColor = m.players[0]?.color || colors.primary;

                    return (
                        <MergedMarker 
                            key={m.id}
                            id={m.id}
                            latitude={m.coordinates.latitude}
                            longitude={m.coordinates.longitude}
                            imageUris={imageUris}
                            primaryColor={firstPlayerColor}
                            onPress={() => {
                                if (m.players) handleMemberTap(m.players[0]);
                            }}
                        />
                    );
                }

                if (m.type === 'single' && m.player) {
                    return (
                        <GameMarker 
                            key={m.id}
                            id={m.id}
                            latitude={m.coordinates.latitude}
                            longitude={m.coordinates.longitude}
                            heading={m.player.heading || 0}
                            name={m.player.name}
                            primaryColor={m.player.color}
                            pet={m.player.pet}
                            avatarUri={m.player.imageUri}
                            status={m.player.status}
                            isMe={m.player.isMe}
                            onPress={() => {
                                if (m.player) handleMemberTap(m.player);
                            }}
                        />
                    );
                }

                return null;
            })}
        </MapViewLibre>
    );
};

export default memo(GameMapView, (prev, next) => {
    // Só re-renderiza se props essenciais mudarem
    return (
        prev.location === next.location &&
        prev.currentRegion === next.currentRegion &&
        prev.visibleMarkers === next.visibleMarkers &&
        prev.treasures === next.treasures &&
        prev.activeSpotId === next.activeSpotId &&
        prev.showMerge === next.showMerge
    );
});
