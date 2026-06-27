import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// In-memory store for Web to prevent XSS credential leaks
const webMemoryStore = new Map<string, string>();

export const getItemAsync = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return webMemoryStore.get(key) || null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.warn('SecureStore getItemAsync failed:', e);
    return null;
  }
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    webMemoryStore.set(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    console.warn('SecureStore setItemAsync failed:', e);
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    webMemoryStore.delete(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn('SecureStore deleteItemAsync failed:', e);
  }
};
