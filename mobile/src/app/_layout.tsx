import { useEffect, useState } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Slot, useRouter, useSegments } from 'expo-router';
import { useStore } from '../store/useStore';
import NetInfo from '@react-native-community/netinfo';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const token = useStore((state) => state.token);
  const initializeAuth = useStore((state) => state.initializeAuth);
  const hasHydrated = useStore((state) => state.hasHydrated);
  const setOffline = useStore((state) => state.setOffline);
  const segments = useSegments();
  const router = useRouter();
  const [authInitialized, setAuthInitialized] = useState(false);

  // Proactive connection listener (active only after Zustand hydrates)
  useEffect(() => {
    if (!hasHydrated) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, [hasHydrated, setOffline]);

  // Load JWT token from SecureStore on app launch
  useEffect(() => {
    if (!hasHydrated) return;

    initializeAuth().then(() => {
      setAuthInitialized(true);
    });
  }, [initializeAuth, hasHydrated]);

  // Handle route guards (redirect unauthorized to login and authorized to app tabs)
  useEffect(() => {
    if (!authInitialized || !hasHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [token, segments, authInitialized, hasHydrated]);

  // Prevent UI rendering and NetInfo event triggers until Zustand is fully hydrated
  if (!hasHydrated) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center">
        <ActivityIndicator size="large" color="#F7941D" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
