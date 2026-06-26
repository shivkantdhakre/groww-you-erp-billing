import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Dimensions } from 'react-native';
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
  // Animation shared values
  const containerOpacity = useSharedValue(1);
  
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const logoTranslateY = useSharedValue(20);
  
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(15);
  
  const loaderOpacity = useSharedValue(0);

  // Trigger entrance animations on mount
  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 850,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
    logoScale.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.back(1.4)),
    });
    logoTranslateY.value = withTiming(0, {
      duration: 850,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });

    textOpacity.value = withDelay(
      350,
      withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      })
    );
    textTranslateY.value = withDelay(
      350,
      withTiming(0, {
        duration: 800,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      })
    );

    loaderOpacity.value = withDelay(
      550,
      withTiming(1, {
        duration: 500,
      })
    );
  }, []);

  // Trigger exit transition when appReady becomes true
  useEffect(() => {
    if (appReady) {
      // Zoom out/fade out transition
      logoScale.value = withTiming(1.15, {
        duration: 500,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      });
      logoTranslateY.value = withTiming(-20, {
        duration: 500,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      });
      containerOpacity.value = withTiming(
        0,
        {
          duration: 500,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(onAnimationComplete)();
          }
        }
      );
    }
  }, [appReady, onAnimationComplete]);

  // Handoff from native splash once this component is painted
  const onLayoutRootView = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn('[SplashScreen] Error hiding native splash:', e);
    }
  }, []);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));

  return (
    <Animated.View
      onLayout={onLayoutRootView}
      style={[StyleSheet.absoluteFill, styles.container, containerStyle]}
    >
      <LinearGradient
        colors={['#0A0F1D', '#152238', '#0A0F1D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      {/* Decorative premium background light orbs */}
      <View style={styles.orbContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orbTop]} />
        <View style={[styles.orb, styles.orbBottom]} />
      </View>

      <View style={styles.content}>
        {/* Animated Logo */}
        <AnimatedImage
          source={require('@/assets/images/logo-glow.png')}
          style={[styles.logo, logoStyle]}
          contentFit="contain"
        />

        {/* Animated Branding Text */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.brandTitle}>
            GROWW <Text style={styles.brandAccent}>YOU</Text>
          </Text>
          <Text style={styles.brandTagline}>Enterprise Resource Planning</Text>
        </Animated.View>
      </View>

      {/* Animated Loading Indicator */}
      <Animated.View style={[styles.loaderContainer, loaderStyle]}>
        <ActivityIndicator size="small" color="#F7941D" />
        <Text style={styles.loaderText}>Initializing ERP Shell...</Text>
      </Animated.View>

      {/* Elegant Version Info */}
      <Animated.View style={[styles.versionContainer, textStyle]}>
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
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textAlign: 'center',
  },
  brandAccent: {
    color: '#F7941D',
  },
  brandTagline: {
    fontSize: 12,
    color: '#9CA3AF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
    fontWeight: '600',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 110,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  loaderText: {
    color: '#D1D5DB',
    fontSize: 13,
    marginLeft: 12,
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
  orbContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    borderRadius: (SCREEN_WIDTH * 1.5) / 2,
    opacity: 0.4,
  },
  orbTop: {
    backgroundColor: '#1E3A8F',
    top: -SCREEN_WIDTH * 0.5,
    left: -SCREEN_WIDTH * 0.7,
  },
  orbBottom: {
    backgroundColor: '#F7941D',
    bottom: -SCREEN_WIDTH * 0.7,
    right: -SCREEN_WIDTH * 0.6,
    opacity: 0.15,
  },
});
