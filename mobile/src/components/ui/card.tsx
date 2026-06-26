import React, { useCallback } from 'react';
import { View, Text, ViewProps, TextProps, Platform, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedView = Animated.createAnimatedComponent(View);

interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
}

export function Card({ children, className = '', onPress, ...props }: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, { damping: 20, stiffness: 300 });
    if (onPress) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [onPress]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress ? onPress : undefined}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      style={[
        Platform.OS === 'android' ? { elevation: 2 } : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        },
      ]}
    >
      <AnimatedView
        className={`bg-[#1A1F2E] border border-gray-800 rounded-2xl p-5 ${className}`}
        style={[animatedStyle, props.style]}
        {...props}
      >
        {children}
      </AnimatedView>
    </Wrapper>
  );
}

Card.Header = function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <View
      className={`pb-3 mb-2 border-b border-gray-800/40 flex-row justify-between items-center ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};

Card.Title = function CardTitle({ children, className = '', ...props }: TextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.2}
      className={`text-white font-lexend font-bold text-base md:text-lg ${className}`}
      {...props}
    >
      {children}
    </Text>
  );
};

Card.Content = function CardContent({ children, className = '', ...props }: CardProps) {
  return (
    <View className={`py-1 ${className}`} {...props}>
      {children}
    </View>
  );
};

Card.Footer = function CardFooter({ children, className = '', ...props }: CardProps) {
  return (
    <View
      className={`pt-3 mt-2 border-t border-gray-800/40 flex-row justify-between items-center ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};
