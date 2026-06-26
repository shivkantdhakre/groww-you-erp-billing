import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface ScanTargetOverlayProps {
  label?: string;
  size?: number;
  borderColor?: string;
}

function CornerPiece({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const opacity = useSharedValue(0.6);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    scale.value = withRepeat(
      withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const posClasses: Record<string, string> = {
    tl: 'top-0 left-0 border-t-4 border-l-4',
    tr: 'top-0 right-0 border-t-4 border-r-4',
    bl: 'bottom-0 left-0 border-b-4 border-l-4',
    br: 'bottom-0 right-0 border-b-4 border-r-4',
  };

  return (
    <Animated.View
      style={style}
      className={`absolute w-6 h-6 ${posClasses[position]} border-action-orange`}
    />
  );
}

export function ScanTargetOverlay({
  label = 'Align item barcode inside target box',
  size = 250,
  borderColor = 'rgba(255,255,255,0.25)',
}: ScanTargetOverlayProps) {
  return (
    <View style={styles.overlayContainer}>
      <View style={[styles.scanTargetBox, { width: size, height: size, borderColor }]}>
        <CornerPiece position="tl" />
        <CornerPiece position="tr" />
        <CornerPiece position="bl" />
        <CornerPiece position="br" />
      </View>
      <Text className="text-white font-bold text-sm text-center mt-6 bg-[#0A0F1D]/80 px-4 py-2 rounded-full border border-gray-800 overflow-hidden">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanTargetBox: {
    borderWidth: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
});
