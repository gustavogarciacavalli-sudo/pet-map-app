import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import Svg, { Circle, G, Defs, Filter, FeGaussianBlur, FeColorMatrix } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface LiquidMergeOverlayProps {
  visible: boolean;
  points: { x: number, y: number }[];
  color: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const LiquidMergeOverlay: React.FC<LiquidMergeOverlayProps> = ({ visible, points, color }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      animValue.setValue(0);
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  // Burst central com pontos extras para o efeito líquido
  const drawPoints = [
    { x: width / 2, y: height / 2 },
    { x: width / 2 + 15, y: height / 2 - 10 },
    { x: width / 2 - 15, y: height / 2 + 10 },
    { x: width / 2, y: height / 2 + 5 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          <Filter id="goo">
            <FeGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <FeColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
            />
          </Filter>
        </Defs>
        <G filter="url(#goo)">
          {drawPoints.map((p, i) => (
            <AnimatedCircle
              key={i}
              cx={p.x}
              cy={p.y}
              r={animValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 80, 60],
              })}
              fill={color}
              opacity={animValue.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 0.9, 0.7],
              })}
            />
          ))}
        </G>
      </Svg>
      
      {/* Fallback Glow - Garante visibilidade se o filtro SVG falhar */}
      <Animated.View style={[
        styles.fallbackGlow,
        {
            backgroundColor: color,
            opacity: animValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.4, 0]
            }),
            transform: [{ scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 3]
            })}]
        }
      ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackGlow: {
    position: 'absolute',
    top: height / 2 - 50,
    left: width / 2 - 50,
    width: 100,
    height: 100,
    borderRadius: 50,
  }
});
