import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getItemAsync = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage getItem failed:', e);
      return null;
    }
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
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage setItem failed:', e);
    }
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
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage deleteItem failed:', e);
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    console.warn('SecureStore deleteItemAsync failed:', e);
  }
};
