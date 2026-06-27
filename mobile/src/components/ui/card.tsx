import React, { useCallback } from 'react';
import { View, Text, ViewProps, TextProps, Platform, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedView = Animated.createAnimatedComponent(View);
import { colors, radius, shadows, animations } from '../../constants';

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
    scale.value = animations.spring.standard(animations.motion.press.scaleDown);
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    }
  }, [onPress]);

  const handlePressOut = useCallback(() => {
    scale.value = animations.spring.standard(animations.motion.press.scaleUp);
  }, []);

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress ? handlePress : undefined}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      style={[
        Platform.OS === 'android' ? { elevation: shadows.card.elevation } : shadows.card,
      ]}
    >
      <AnimatedView
        style={[
          animatedStyle, 
          { 
            backgroundColor: colors.surfacePrimary,
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: radius.card,
            padding: 20, // using hardcoded 20 for now or spacing.xl
          },
          props.style
        ]}
        className={`${className}`}
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
      style={{
        paddingBottom: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      }}
      className={`flex-row justify-between items-center ${className}`}
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
      style={{
        color: colors.textPrimary,
      }}
      className={`font-lexend font-bold text-base md:text-lg ${className}`}
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
      style={{
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
      }}
      className={`flex-row justify-between items-center ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};
