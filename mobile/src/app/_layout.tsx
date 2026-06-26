import { useEffect, useState } from 'react';
import { useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Slot, useRouter, useSegments, useNavigationContainerRef } from 'expo-router';
import { useStore } from '../store/useStore';
import NetInfo from '@react-native-community/netinfo';
import { checkCompromisedDevice } from '../utils/security';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { CustomSplashScreen } from '../components/CustomSplashScreen';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { Lexend_700Bold } from '@expo-google-fonts/lexend';
import '../global.css';

// Prevent the splash screen from auto-hiding before asset/store hydration
SplashScreen.preventAutoHideAsync().catch(() => {});

const integrations: any[] = [];
let navigationIntegration: any = null;

try {
  navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: true,
  });
  if (navigationIntegration) {
    integrations.push(navigationIntegration);
  }
} catch (e) {
  console.warn('[Sentry] Failed to create reactNavigationIntegration:', e);
}

try {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "https://dummy@o0.ingest.sentry.io/0",
    integrations,
    tracesSampleRate: 1.0,
  });
} catch (e) {
  console.warn('[Sentry] Initialization failed:', e);
}

function RootLayout() {
  const ref = useNavigationContainerRef();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
    Lexend_700Bold,
  });

  useEffect(() => {
    if (ref && navigationIntegration) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);
  const colorScheme = useColorScheme();
  const token = useStore((state) => state.token);
  const initializeAuth = useStore((state) => state.initializeAuth);
  const hasHydrated = useStore((state) => state.hasHydrated);
  const setOffline = useStore((state) => state.setOffline);
  const syncOfflineOutbox = useStore((state) => state.syncOfflineOutbox);
  const segments = useSegments();
  const router = useRouter();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [deviceCompromised, setDeviceCompromised] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  // Proactive connection listener (active only after Zustand hydrates)
  useEffect(() => {
    if (!hasHydrated) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = useStore.getState().isOffline;
      const isNowConnected = state.isConnected ?? false;
      setOffline(!isNowConnected);
      
      // Auto-flush the outbox immediately when returning online
      if (wasOffline && isNowConnected) {
        console.log('[Sync] Network connection restored. Initializing outbox sync.');
        syncOfflineOutbox();
      }
    });
    return () => unsubscribe();
  }, [hasHydrated, setOffline, syncOfflineOutbox]);

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
          // Try flushing outbox immediately on startup if online
          const isConnected = !useStore.getState().isOffline;
          if (isConnected) {
            syncOfflineOutbox();
          }
        });
      }
    };

    runSecurityChecks();
  }, [initializeAuth, hasHydrated, syncOfflineOutbox]);

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

  const appReady = hasHydrated && (authInitialized || deviceCompromised) && fontsLoaded;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View className="flex-1">
        {/* Render underlying views once Zustand hydrates */}
        {hasHydrated && (
          deviceCompromised ? (
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
          ) : (
            <Slot />
          )
        )}

        {/* Overlay premium splash screen */}
        {isSplashVisible && (
          <CustomSplashScreen
            appReady={appReady}
            onAnimationComplete={() => setIsSplashVisible(false)}
          />
        )}
      </View>
    </ThemeProvider>
  );
}

const isSentryInitialized = !!Sentry.getClient();
export default isSentryInitialized ? Sentry.wrap(RootLayout) : RootLayout;
