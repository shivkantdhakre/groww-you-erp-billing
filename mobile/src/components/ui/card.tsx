import React from 'react';
import { View, Text, ViewProps, TextProps, Platform } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View 
      className={`bg-[#1A1F2E] border border-gray-800 rounded-2xl p-5 ${className}`}
      style={[
        Platform.OS === 'android' ? { elevation: 4 } : { 
          shadowColor: '#000', 
          shadowOffset: { width: 0, height: 2 }, 
          shadowOpacity: 0.25, 
          shadowRadius: 3.84 
        },
        props.style
      ]}
      {...props}
    >
      {children}
    </View>
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
