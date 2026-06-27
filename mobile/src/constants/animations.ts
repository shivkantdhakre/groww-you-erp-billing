import { withSpring, withTiming, Easing } from 'react-native-reanimated';

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

const bouncySpringConfig = {
  damping: 12,
  stiffness: 180,
  mass: 1,
};

export const animations = {
  // Durations
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  
  // Reanimated Spring Presets
  spring: {
    standard: (toValue: number) => withSpring(toValue, springConfig),
    bouncy: (toValue: number) => withSpring(toValue, bouncySpringConfig),
  },

  // Timing Presets
  timing: {
    easeOut: (toValue: number, duration = 250) => 
      withTiming(toValue, { duration, easing: Easing.out(Easing.quad) }),
    easeIn: (toValue: number, duration = 250) => 
      withTiming(toValue, { duration, easing: Easing.in(Easing.quad) }),
    easeInOut: (toValue: number, duration = 250) => 
      withTiming(toValue, { duration, easing: Easing.inOut(Easing.quad) }),
  },
  
  // Semantic Motion Roles
  motion: {
    press: {
      scaleDown: 0.96,
      scaleUp: 1.0,
      opacityActive: 0.7,
      opacityInactive: 1.0,
    },
    bottomTab: {
      activeScale: 1.15,
      inactiveScale: 1.0,
    },
    modal: {
      enterDuration: 300,
      exitDuration: 200,
    }
  }
} as const;

export type ThemeAnimations = typeof animations;
