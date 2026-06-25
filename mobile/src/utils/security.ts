import { Platform } from 'react-native';
import * as Device from 'expo-device';
import JailMonkey from 'jail-monkey';

/**
 * Checks if the current hardware device has been compromised (Jailbroken, Rooted, or Location Mocking enabled).
 * Gracefully bypasses checks for emulators and Web platforms to facilitate developer testing.
 */
export const checkCompromisedDevice = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  // Bypass checks for emulators / simulators during local development
  if (!Device.isDevice) {
    return false;
  }

  try {
    // Check both standard jailbreak/root signatures and active mock location tools
    const isJailbroken = JailMonkey.isJailBroken();
    const isMockLocation = JailMonkey.canMockLocation();

    if (isJailbroken || isMockLocation) {
      console.warn(`[Security Alert] Device Compromised: jailbroken=${isJailbroken}, mockLocation=${isMockLocation}`);
      return true;
    }
    return false;
  } catch (err) {
    // Bypasses checks if the native module is not compiled/linked (e.g. running in standard Expo Go)
    console.warn('[Security] Root/Jailbreak detection module not linked, skipping checks:', err);
    return false;
  }
};
