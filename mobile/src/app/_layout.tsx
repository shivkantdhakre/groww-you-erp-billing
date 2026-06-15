import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Slot, useRouter, useSegments } from 'expo-router';
import { useStore } from '../store/useStore';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const token = useStore((state) => state.token);
  const initializeAuth = useStore((state) => state.initializeAuth);
  const segments = useSegments();
  const router = useRouter();
  const [authInitialized, setAuthInitialized] = useState(false);

  // Load JWT token from SecureStore on app launch
  useEffect(() => {
    initializeAuth().then(() => {
      setAuthInitialized(true);
    });
  }, [initializeAuth]);

  // Handle route guards (redirect unauthorized to login and authorized to app tabs)
  useEffect(() => {
    if (!authInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      // Redirect to sign-in
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      // Redirect to main home dashboard
      router.replace('/(app)');
    }
  }, [token, segments, authInitialized]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
