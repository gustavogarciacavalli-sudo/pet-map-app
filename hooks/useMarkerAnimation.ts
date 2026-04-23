import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function useMarkerAnimation(
  targetLat: number,
  targetLng: number,
  isNew: boolean
) {
  const latAnim = useRef(new Animated.Value(targetLat)).current;
  const lngAnim = useRef(new Animated.Value(targetLng)).current;
  const scaleAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const latRef = useRef(targetLat);
  const lngRef = useRef(targetLng);

  // Pop-in ao montar
  useEffect(() => {
    if (isNew) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  // Anima coordenadas quando mudam
  useEffect(() => {
    if (latRef.current !== targetLat || lngRef.current !== targetLng) {
      latRef.current = targetLat;
      lngRef.current = targetLng;
      
      Animated.parallel([
        Animated.spring(latAnim, {
          toValue: targetLat,
          tension: 120,
          friction: 12,
          useNativeDriver: false, // coordenadas não suportam native driver
        }),
        Animated.spring(lngAnim, {
          toValue: targetLng,
          tension: 120,
          friction: 12,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [targetLat, targetLng]);

  return { latAnim, lngAnim, scaleAnim };
}
