import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getCurrentUserLocal } from '../localDatabase';
import { ThemeProvider } from '../components/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SupabaseRealtimeProvider } from '../components/SupabaseRealtimeProvider';
import { ToastProvider } from '../components/ToastProvider';
import * as NavigationBar from 'expo-navigation-bar';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Configuração Imersiva (Game Mode) via código para evitar avisos no app.json
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  useEffect(() => {
    async function checkUser() {
      try {
        const localUser = await getCurrentUserLocal();
        setUser(localUser);
      } catch (e) {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    }
    checkUser();
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(tabs)';

    async function syncAndNavigate() {
      let currentUser = user;
      
      if (!currentUser && inAuthGroup) {
        router.replace('/login');
      } else if (currentUser && segments[0] === 'login') {
        router.replace('/(tabs)');
      }
    }

    syncAndNavigate();
  }, [user, segments, initializing]);

  if (initializing) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <SupabaseRealtimeProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="social" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="pet-home" options={{ animation: 'slide_from_right' }} />
            </Stack>
            <StatusBar style="auto" />
          </SupabaseRealtimeProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
