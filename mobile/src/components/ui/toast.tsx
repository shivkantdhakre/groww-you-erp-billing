import { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  icon?: any;
}

let showToastFn: ((config: ToastConfig) => void) | null = null;

export function showToast(config: ToastConfig) {
  if (showToastFn) showToastFn(config);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const show = useCallback((config: ToastConfig) => {
    setToast(config);
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 300 });

    const dur = config.duration || 2500;
    translateY.value = withDelay(
      dur,
      withTiming(100, { duration: 300, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setToast)(null);
      })
    );
    opacity.value = withDelay(
      dur,
      withTiming(0, { duration: 300 })
    );
  }, []);

  useEffect(() => {
    showToastFn = show;
    return () => { showToastFn = null; };
  }, [show]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const iconMap: Record<string, any> = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    info: 'information-circle',
    warning: 'warning',
  };

  const bgMap: Record<string, string> = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-amber-600',
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
      {toast && (
        <Animated.View
          style={[styles.toast, animatedStyle]}
          className={`absolute bottom-24 left-4 right-4 ${bgMap[toast.type || 'info']} rounded-2xl px-5 py-4 flex-row items-center shadow-2xl`}
        >
          <Ionicons
            name={toast.icon || iconMap[toast.type || 'info'] || 'information-circle'}
            size={22}
            color="#FFFFFF"
            style={{ marginRight: 12 }}
          />
          <Text className="text-white text-sm font-semibold flex-1 font-inter" numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    zIndex: 9999,
    elevation: 10,
  },
});
