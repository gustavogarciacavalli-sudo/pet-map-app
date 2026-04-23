import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface LiquidMergeOverlayProps {
  visible: boolean;
  points: { x: number, y: number }[];
  color: string;
}

export const LiquidMergeOverlay: React.FC<LiquidMergeOverlayProps> = ({ visible, color }) => {
  const scale1 = useRef(new Animated.Value(0)).current;
  const scale2 = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale1.setValue(0);
      scale2.setValue(0);
      opacity.setValue(0);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
        Animated.spring(scale1, {
          toValue: 1,
          tension: 15,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(scale2, {
            toValue: 1.2,
            tension: 10,
            friction: 3,
            useNativeDriver: true,
          }),
        ])
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.fullscreen} pointerEvents="none">
        {/* Burst Camada 1 */}
        <Animated.View style={[
            styles.bubble,
            {
                backgroundColor: color,
                opacity: opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.6]
                }),
                transform: [{ scale: scale1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 6]
                })}]
            }
        ]} />

        {/* Burst Camada 2 */}
        <Animated.View style={[
            styles.bubble,
            {
                backgroundColor: color,
                opacity: opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.4]
                }),
                transform: [{ scale: scale2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 5]
                })}]
            }
        ]} />

        {/* Core de Luz */}
        <Animated.View style={[
            styles.core,
            {
                backgroundColor: '#FFF',
                opacity: opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.9]
                }),
                transform: [{ scale: scale1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 1.5]
                })}]
            }
        ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 999999, // Z-index astronômico
    elevation: 999,
  },
  bubble: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  core: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 25,
  }
});
