import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withSequence,
  runOnJS,
  Easing
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface ParticleInstance {
  id: string;
  x: number;
  y: number;
  icon: string;
  color: string;
}

export interface ParticleSystemRef {
  burst: (x: number, y: number, type: 'star' | 'heart') => void;
}

const Particle = ({ item, onComplete }: { item: ParticleInstance, onComplete: (id: string) => void }) => {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  React.useEffect(() => {
    // Ângulo e distância aleatória para a explosão
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 60;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 50; // Sobe um pouco mais

    scale.value = withSpring(1.2, { damping: 10 });
    
    translateX.value = withTiming(destX, { duration: 800, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(destY, { duration: 800, easing: Easing.out(Easing.quad) });
    
    opacity.value = withSequence(
      withDelay(400, withTiming(0, { duration: 400 }, () => {
        runOnJS(onComplete)(item.id);
      }))
    );
  }, []);

  return (
    <Animated.View style={[styles.particle, { left: item.x, top: item.y }, animatedStyle]}>
      <FontAwesome5 name={item.icon} size={20} color={item.color} />
    </Animated.View>
  );
};

// Precisamos do withSpring mas importamos do Reanimated
import { withSpring } from 'react-native-reanimated';

export const ParticleSystem = forwardRef<ParticleSystemRef>((props, ref) => {
  const [particles, setParticles] = useState<ParticleInstance[]>([]);

  const removeParticle = useCallback((id: string) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({
    burst: (x, y, type) => {
      const newParticles: ParticleInstance[] = [];
      const count = type === 'star' ? 8 : 5;
      const icon = type === 'star' ? 'star' : 'heart';
      const color = type === 'star' ? '#FFD700' : '#FF6B6B';

      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: Math.random().toString(),
          x,
          y,
          icon,
          color
        });
      }
      setParticles(prev => [...prev, ...newParticles]);
    }
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <Particle key={p.id} item={p} onComplete={removeParticle} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    zIndex: 9999,
  },
});
