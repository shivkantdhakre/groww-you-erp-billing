import React, { useRef, useState } from 'react';
import { View, Text, Dimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: "Welcome to Groww You",
    description: "Your comprehensive mobile wholesale ERP. Manage inventory, process sales, and track analytics from your pocket.",
    icon: "cube-outline" as const,
    gradient: ['#0A0F1D', '#152238'] as const,
    accentColor: '#60A5FA',
  },
  {
    id: 2,
    title: "Lightning Fast Billing",
    description: "Use the built-in hardware scanner to rapidly build carts. Supports both A4 and 80mm thermal receipt printing.",
    icon: "barcode-outline" as const,
    gradient: ['#0A0F1D', '#1B3A5C'] as const,
    accentColor: '#F7941D',
  },
  {
    id: 3,
    title: "Always Offline Capable",
    description: "Internet connection dropped? No problem. Continue billing and we will automatically sync your outbox when you're back online.",
    icon: "cloud-offline-outline" as const,
    gradient: ['#0A0F1D', '#1E3A8F'] as const,
    accentColor: '#10B981',
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

  const slide = SLIDES[currentIndex];

  return (
    <View className="flex-1">
      <LinearGradient
        colors={slide.gradient}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Decorative orb */}
      <View
        className="absolute rounded-full opacity-10"
        style={{
          width: width * 0.8,
          height: width * 0.8,
          borderRadius: width * 0.4,
          backgroundColor: slide.accentColor,
          top: -width * 0.25,
          right: -width * 0.2,
        }}
      />

      <SafeAreaView className="flex-1">
        <View className="flex-1">
          {/* Skip button */}
          <View className="flex-row justify-end px-6 pt-2">
            {currentIndex < SLIDES.length - 1 && (
              <TouchableOpacity onPress={handleComplete} activeOpacity={0.7}>
                <Text className="text-gray-400 text-sm font-semibold">Skip</Text>
              </TouchableOpacity>
            )}
          </View>

          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            className="flex-1"
          >
            {SLIDES.map((s, index) => (
              <View key={s.id} style={{ width }} className="flex-1 justify-center items-center px-10">
                <View
                  className="w-36 h-36 rounded-full justify-center items-center mb-10"
                  style={{
                    backgroundColor: `${s.accentColor}15`,
                    borderColor: `${s.accentColor}30`,
                    borderWidth: 1,
                  }}
                >
                  <View
                    className="w-28 h-28 rounded-full justify-center items-center"
                    style={{ backgroundColor: `${s.accentColor}10` }}
                  >
                    <Ionicons name={s.icon} size={64} color={s.accentColor} />
                  </View>
                </View>
                <Animated.View entering={FadeInDown.duration(400)}>
                  <Text className="text-white text-3xl font-black text-center mb-4 font-lexend">
                    {s.title}
                  </Text>
                  <Text className="text-gray-400 text-base text-center leading-relaxed font-inter">
                    {s.description}
                  </Text>
                </Animated.View>
              </View>
            ))}
          </Animated.ScrollView>
        </View>

        <View className="px-10 pb-10">
          <View className="flex-row justify-center items-center gap-3 mb-10">
            {SLIDES.map((_, index) => (
              <View
                key={index}
                className={`rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? `w-8 h-2.5`
                    : "w-2.5 h-2.5 bg-gray-800"
                }`}
                style={{
                  backgroundColor: index === currentIndex ? slide.accentColor : undefined,
                }}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            className="w-full py-4 rounded-2xl flex-row justify-center items-center"
            style={{ backgroundColor: slide.accentColor }}
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
    </View>
  );
}
