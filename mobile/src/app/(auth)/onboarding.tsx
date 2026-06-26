import React, { useRef, useState } from 'react';
import { View, Text, Dimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: "Welcome to Groww You",
    description: "Your comprehensive mobile wholesale ERP. Manage inventory, process sales, and track analytics from your pocket.",
    icon: "cube-outline" as const
  },
  {
    id: 2,
    title: "Lightning Fast Billing",
    description: "Use the built-in hardware scanner to rapidly build carts. Supports both A4 and 80mm thermal receipt printing.",
    icon: "barcode-outline" as const
  },
  {
    id: 3,
    title: "Always Offline Capable",
    description: "Internet connection dropped? No problem. Continue billing and we will automatically sync your outbox when you're back online.",
    icon: "cloud-offline-outline" as const
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setHasSeenOnboarding = useStore((state) => state.setHasSeenOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setHasSeenOnboarding(true);
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0F1D]">
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={{ width, paddingHorizontal: 40 }} className="flex-1 justify-center items-center">
            <View className="w-32 h-32 rounded-full bg-[#1B3A5C]/20 border border-[#1B3A5C]/40 justify-center items-center mb-10">
              <Ionicons name={slide.icon} size={64} color="#60A5FA" />
            </View>
            <Text className="text-white text-3xl font-black text-center mb-4 font-lexend">
              {slide.title}
            </Text>
            <Text className="text-gray-400 text-base text-center leading-relaxed font-inter">
              {slide.description}
            </Text>
          </View>
        ))}
      </Animated.ScrollView>

      <View className="px-10 pb-10">
        <View className="flex-row justify-center items-center gap-2 mb-10">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? "w-8 bg-[#F7941D]" : "w-2 bg-gray-800"
              }`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          className="w-full bg-[#1B3A5C] py-4 rounded-2xl flex-row justify-center items-center"
        >
          <Text className="text-white font-bold text-base mr-2">
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          {currentIndex < SLIDES.length - 1 && (
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
