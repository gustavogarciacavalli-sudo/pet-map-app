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
  customImageUri?: string | null;
  onPress?: () => void;
}

export function PetPreview({ species, accessory, name, size = 150, customImageUri, onPress }: PetPreviewProps) {
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
    if (onPress) onPress();
  };

  const getPetImage = () => {
    // Corrigido para os nomes de arquivo que existem na pasta assets/images
    if (species === 'cachorro') return require('../assets/images/dog-chibi.png');
    return require('../assets/images/cat-chibi.png');
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.container, { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, animatedStyle]}>
        {customImageUri ? (
          <Image 
            source={typeof customImageUri === 'string' ? { uri: customImageUri } : customImageUri} 
            style={[styles.petImage, { borderRadius: size / 2 }]} 
            resizeMode="cover"
          />
        ) : (
          <Image 
            source={getPetImage()} 
            style={[styles.petImage, { borderRadius: size / 2 }]} 
            resizeMode="contain"
          />
        )}
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
