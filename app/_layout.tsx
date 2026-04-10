import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { getCurrentUserLocal } from '../localDatabase';
import { ThemeProvider } from '../components/ThemeContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();

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
        currentUser = await getCurrentUserLocal();
        setUser(currentUser);
      }

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
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
