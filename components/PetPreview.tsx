import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';

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
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }]}>
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
      </View>
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
