import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate,
  withDelay,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

const { width, height } = Dimensions.get('window');

const MENU_ITEMS = [
  { id: 'index', icon: 'map-outline', lib: 'Ionicons', route: '/(tabs)', label: 'Mapa' },
  { id: 'quests', icon: 'scroll', lib: 'FontAwesome5', route: '/(tabs)/quests', label: 'Missões' },
  { id: 'shop', icon: 'storefront-outline', lib: 'MaterialCommunityIcons', route: '/(tabs)/shop', label: 'Loja' },
  { id: 'friends', icon: 'people-outline', lib: 'Ionicons', route: '/(tabs)/friends', label: 'Amigos/Clã' },
  { id: 'profile', icon: 'person-outline', lib: 'Ionicons', route: '/(tabs)/profile', label: 'Perfil' },
];

export function FloatingOrbitMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  
  // Criamos um valor de animação mestre e um para a rotação do botão
  const mainAnim = useSharedValue(0);
  // Criamos valores individuais para cada item para garantir o stagger (atraso) perfeito
  const itemAnims = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

  const toggleMenu = () => {
    const nextValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);

    // Anima o botão principal (rotação)
    mainAnim.value = withSpring(nextValue, { damping: 14, stiffness: 120, mass: 0.8 });

    // Anima cada item com um atraso (stagger)
    itemAnims.forEach((anim, index) => {
      anim.value = withDelay(
        isOpen ? (itemAnims.length - index) * 30 : index * 40,
        withSpring(nextValue, {
          damping: 12,
          stiffness: 150,
          mass: 0.7
        })
      );
    });
  };

  const navigateTo = (route: string) => {
    // @ts-ignore - expo-router types can be tricky
    router.navigate(route as any);
    toggleMenu();
  };

  const renderIcon = (item: typeof MENU_ITEMS[0], color: string) => {
    const size = 24;
    if (item.lib === 'Ionicons') return <Ionicons name={item.icon as any} size={size} color={color} />;
    if (item.lib === 'FontAwesome5') return <FontAwesome5 name={item.icon as any} size={20} color={color} />;
    if (item.lib === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={item.icon as any} size={size} color={color} />;
  };

  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [
        { rotate: `${interpolate(mainAnim.value, [0, 1], [0, 135])}deg` },
        { scale: interpolate(mainAnim.value, [0, 1], [1, 1.1]) }
    ]
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isOpen ? 1 : 0, { damping: 20 }),
    pointerEvents: isOpen ? 'auto' : 'none',
  }));

  return (
    <View style={styles.fullScreenContainer} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={toggleMenu} 
        />
      </Animated.View>

      <View style={styles.orbitContainer} pointerEvents="box-none">
        {MENU_ITEMS.map((item, index) => {
          const angle = (index * (Math.PI / (MENU_ITEMS.length - 1))) - Math.PI;
          const radius = 110;

          const animatedStyle = useAnimatedStyle(() => {
            const animVal = itemAnims[index].value;
            const x = Math.cos(angle) * (radius * animVal);
            const y = Math.sin(angle) * (radius * animVal);
            const scale = interpolate(animVal, [0, 0.8, 1], [0, 1.2, 1]);
            const opacity = interpolate(animVal, [0, 0.2, 1], [0, 1, 1]);

            return {
              transform: [{ translateX: x }, { translateY: y }, { scale }],
              opacity,
            };
          });

          const isActive = pathname === item.route || (item.id === 'index' && pathname === '/');

          return (
            <Animated.View 
              key={item.id} 
              style={[
                  styles.itemCircle, 
                  animatedStyle, 
                  { 
                      backgroundColor: colors.card, 
                      borderColor: isActive ? colors.primary : colors.border,
                      zIndex: isOpen ? 10 : -1 
                  }
              ]}
            >
              <Pressable 
                style={styles.itemPressable} 
                onPress={() => navigateTo(item.route)}
                disabled={!isOpen}
              >
                {renderIcon(item, isActive ? colors.primary : colors.subtext)}
              </Pressable>
            </Animated.View>
          );
        })}

        <Animated.View style={[styles.mainButton, { backgroundColor: colors.primary }]}>
          <Pressable style={styles.mainPressable} onPress={toggleMenu}>
            <Animated.View style={mainButtonStyle}>
              <Ionicons name="add" size={28} color={isDarkMode ? '#14161F' : 'white'} />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  orbitContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 75 : 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 100,
  },
  mainPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCircle: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  itemPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
