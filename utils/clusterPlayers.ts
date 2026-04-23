export interface PlayerData {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  color: string;
  imageUri?: string | null;
  pet?: any;
  isMe?: boolean;
  heading?: number;
}

export interface MarkerData {
  id: string;
  type: 'single' | 'merged';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  player?: PlayerData;
  players?: PlayerData[];
}

export function clusterPlayers(players: PlayerData[], region: any, distanceThreshold: number = 0.002): MarkerData[] {
  const clusters: MarkerData[] = [];
  const processedIds = new Set<string>();

  players.forEach((player, idx) => {
    if (processedIds.has(player.id)) return;

    const nearbyPlayers = players.filter((other, otherIdx) => {
      if (idx === otherIdx || processedIds.has(other.id)) return false;
      
      const latDiff = Math.abs(player.coordinates.latitude - other.coordinates.latitude);
      const lonDiff = Math.abs(player.coordinates.longitude - other.coordinates.longitude);
      
      return latDiff < distanceThreshold && lonDiff < distanceThreshold;
    });

    if (nearbyPlayers.length > 0) {
      const allPlayersInCluster = [player, ...nearbyPlayers];
      
      // Média das coordenadas para o centro do cluster
      const avgLat = allPlayersInCluster.reduce((sum, p) => sum + p.coordinates.latitude, 0) / allPlayersInCluster.length;
      const avgLon = allPlayersInCluster.reduce((sum, p) => sum + p.coordinates.longitude, 0) / allPlayersInCluster.length;

      clusters.push({
        id: `cluster-${player.id}`,
        type: 'merged',
        coordinates: { latitude: avgLat, longitude: avgLon },
        players: allPlayersInCluster
      });

      allPlayersInCluster.forEach(p => processedIds.add(p.id));
    } else {
      clusters.push({
        id: player.id,
        type: 'single',
        coordinates: player.coordinates,
        player: player
      });
      processedIds.add(player.id);
    }
  });

  return clusters;
}
