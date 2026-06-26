import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';

const AnimatedImage = Animated.createAnimatedComponent(Image);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CustomSplashScreenProps {
  appReady: boolean;
  onAnimationComplete: () => void;
}

export function CustomSplashScreen({ appReady, onAnimationComplete }: CustomSplashScreenProps) {
  const containerOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.6);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(24);
  const loaderOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const versionOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.2)) });
    logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.4)) });

    textOpacity.value = withDelay(350, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(350, withTiming(0, { duration: 600 }));

    loaderOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    progressWidth.value = withTiming(1, { duration: 2200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });

    versionOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    if (appReady) {
      containerOpacity.value = withTiming(
        0,
        { duration: 400, easing: Easing.bezier(0.25, 1, 0.5, 1) },
        (finished) => { if (finished) runOnJS(onAnimationComplete)(); }
      );
    }
  }, [appReady, onAnimationComplete]);

  const onLayoutRootView = useCallback(async () => {
    try { await SplashScreen.hideAsync(); } catch (e) { console.warn('[SplashScreen] Error hiding native splash:', e); }
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));
  const loaderStyle = useAnimatedStyle(() => ({ opacity: loaderOpacity.value }));
  const progressBarStyle = useAnimatedStyle(() => ({
    width: (progressWidth.value / 1) * 160,
  }));
  const versionStyle = useAnimatedStyle(() => ({ opacity: versionOpacity.value }));

  return (
    <Animated.View onLayout={onLayoutRootView} style={[StyleSheet.absoluteFill, styles.container, containerStyle]}>
      <LinearGradient
        colors={['#0A0F1D', '#152238', '#0A0F1D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Radial glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        <AnimatedImage
          source={require('@/assets/images/groww_you_erp_logo_icon.png')}
          style={[styles.logo, logoStyle]}
          contentFit="contain"
        />

        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.brandTitle}>
            GROWW <Text style={styles.brandAccent}>YOU</Text>
          </Text>
          <Text style={styles.brandTagline}>Enterprise Resource Planning</Text>
        </Animated.View>
      </View>

      {/* Bottom section */}
      <Animated.View style={[styles.bottomSection, loaderStyle]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressBarStyle]} />
        </View>
        <View style={styles.loaderRow}>
          <View style={styles.loaderDot} />
          <Text style={styles.loaderText}>Preparing your workspace...</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.versionContainer, versionStyle]}>
        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  glowTop: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: (SCREEN_WIDTH * 1.2) / 2,
    backgroundColor: '#1E3A8F',
    top: -SCREEN_WIDTH * 0.4,
    left: -SCREEN_WIDTH * 0.6,
    opacity: 0.15,
  },
  glowBottom: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    borderRadius: (SCREEN_WIDTH * 1.2) / 2,
    backgroundColor: '#F7941D',
    bottom: -SCREEN_WIDTH * 0.6,
    right: -SCREEN_WIDTH * 0.5,
    opacity: 0.08,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 24,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    textAlign: 'center',
  },
  brandAccent: {
    color: '#F7941D',
  },
  brandTagline: {
    fontSize: 12,
    color: '#9CA3AF',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 10,
    fontWeight: '600',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  progressTrack: {
    width: 160,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F7941D',
    borderRadius: 2,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F7941D',
    marginRight: 8,
  },
  loaderText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '400',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 40,
  },
  versionText: {
    color: '#4B5563',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },
});