import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { FloatingOrbitMenu } from '../../components/FloatingOrbitMenu';

export default function TabLayout() {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none', // Esconde a barra feia que estava cortando
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Mapa' }} />
        <Tabs.Screen name="quests" options={{ title: 'Missões' }} />
        <Tabs.Screen name="shop" options={{ title: 'Loja' }} />
        <Tabs.Screen name="friends" options={{ title: 'Amigos' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      </Tabs>

      {/* NOVO MENU RADIAL FLUTUANTE */}
      <FloatingOrbitMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});