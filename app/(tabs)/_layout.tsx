import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';

export default function TabLayout() {
  const { colors, isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Localização',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeTab, { backgroundColor: colors.primary }] : undefined}>
              <Ionicons name="location" size={focused ? 18 : 22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Comunidade',
          href: null,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeTab, { backgroundColor: colors.primary }] : undefined}>
              <Ionicons name="people" size={focused ? 18 : 22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Missões',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeTab, { backgroundColor: colors.primary }] : undefined}>
              <Ionicons name="shield-checkmark" size={focused ? 18 : 22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Loja',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? [styles.activeTab, { backgroundColor: colors.primary }] : undefined}>
              <Ionicons name="storefront" size={focused ? 18 : 22} color={focused ? '#FFF' : color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});