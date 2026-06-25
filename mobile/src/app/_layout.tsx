import { useEffect, useState } from 'react';
import { useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Slot, useRouter, useSegments } from 'expo-router';
import { useStore } from '../store/useStore';
import NetInfo from '@react-native-community/netinfo';
import { checkCompromisedDevice } from '../utils/security';
import { Ionicons } from '@expo/vector-icons';
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
  const [deviceCompromised, setDeviceCompromised] = useState(false);

  // Proactive connection listener (active only after Zustand hydrates)
  useEffect(() => {
    if (!hasHydrated) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, [hasHydrated, setOffline]);

  // Run security checks and load JWT token on app launch
  useEffect(() => {
    if (!hasHydrated) return;

    const runSecurityChecks = async () => {
      const isCompromised = await checkCompromisedDevice();
      if (isCompromised) {
        setDeviceCompromised(true);
        // Wipe local auth tokens instantly to protect backend endpoints
        await useStore.getState().logout();
      } else {
        initializeAuth().then(() => {
          setAuthInitialized(true);
        });
      }
    };

    runSecurityChecks();
  }, [initializeAuth, hasHydrated]);

  // Handle route guards (redirect unauthorized to login and authorized to app tabs)
  useEffect(() => {
    if (!authInitialized || !hasHydrated || deviceCompromised) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [token, segments, authInitialized, hasHydrated, deviceCompromised]);

  // Prevent UI rendering and NetInfo event triggers until Zustand is fully hydrated
  if (!hasHydrated) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center">
        <ActivityIndicator size="large" color="#F7941D" />
      </View>
    );
  }

  // Locked out screen for compromised environments
  if (deviceCompromised) {
    return (
      <View className="flex-1 bg-[#0A0F1D] justify-center items-center px-6">
        <View className="bg-[#1A1F2E] border border-red-900/30 rounded-2xl p-6 items-center shadow-2xl max-w-sm">
          <View className="p-3 bg-red-500/10 rounded-full mb-4">
            <Ionicons name="shield-outline" size={40} color="#EF4444" />
          </View>
          <Text className="text-white text-xl font-bold text-center mb-3">Access Denied</Text>
          <Text className="text-red-400 text-sm font-semibold text-center mb-4">Compromised Device Detected</Text>
          <Text className="text-gray-400 text-xs text-center leading-relaxed">
            This device appears to be jailbroken, rooted, or runs mock location apps.
            For regulatory compliance and data protection, Groww You ERP blocks transactions and credential storage on compromised devices.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
