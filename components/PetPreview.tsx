import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  withTiming 
} from 'react-native-reanimated';

// Importamos o estilo e os tipos para manter consistência
import { useTheme } from './ThemeContext';

interface PetPreviewProps {
  species: string;
  accessory?: string;
  name?: string;
  size?: number;
  onPress?: () => void;
}

export function PetPreview({ species, accessory, name, size = 150, onPress }: PetPreviewProps) {
  const { isDarkMode } = useTheme();
  
  // Valor para animação de pulo/esguicho
  const scaleY = useSharedValue(1);
  const scaleX = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: scaleX.value },
      { scaleY: scaleY.value }
    ],
  }));

  const handlePress = () => {
    // Efeito "Boing" (esmaga e pula)
    scaleY.value = withSequence(
      withSpring(0.8, { damping: 2, stiffness: 150 }), // Esmaga
      withSpring(1, { damping: 10, stiffness: 100 })  // Volta ao normal
    );
    scaleX.value = withSequence(
      withSpring(1.2, { damping: 2, stiffness: 150 }), // Alarga
      withSpring(1, { damping: 10, stiffness: 100 })  // Volta ao normal
    );
    
    if (onPress) onPress();
  };

  const getPetImage = () => {
    // Corrigido para os nomes de arquivo que existem na pasta assets/images
    if (species === 'cachorro') return require('../assets/images/dog-chibi.png');
    return require('../assets/images/cat-chibi.png');
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
        <Image 
          source={getPetImage()} 
          style={styles.petImage} 
          resizeMode="contain"
        />
        {accessory && (
           <View style={styles.accessoryContainer}>
              {/* Lógica de renderização de acessórios viria aqui */}
           </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  accessoryContainer: {
    position: 'absolute',
    top: '20%',
    width: '40%',
    height: '40%',
  }
});
