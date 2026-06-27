import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useStore } from "../../store/useStore";
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from '../../utils/secureStoreWrapper';
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Image } from "expo-image";

export default function LoginScreen() {
  const login = useStore((state) => state.login);
  const loading = useStore((state) => state.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    }
  };



  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#0A0F1D]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 justify-center px-6 py-12">
          
          {/* Header Branding */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)} className="items-center mb-10">
            <Image
              source={require('@/assets/images/groww_you_erp_logo_icon.png')}
              style={{ width: 120, height: 120, marginBottom: 16 }}
              contentFit="contain"
            />
            <Text className="text-3xl font-extrabold text-white tracking-wider">
              GROWW <Text className="text-action-orange">YOU</Text>
            </Text>
            <Text className="text-sm text-gray-400 mt-2">Mobile Wholesale ERP Shell</Text>
          </Animated.View>

          {/* Login Card */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Card className="relative">
            <Text className="text-xl font-bold text-white mb-6 font-lexend">Staff Authentication</Text>

            {error && (
              <View className="bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl mb-4">
                <Text className="text-red-500 text-sm font-semibold">{error}</Text>
              </View>
            )}

            {/* Email Input */}
            <Input
              label="Email Address"
              placeholder="email@growwyou.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            {/* Password Input */}
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              trailingIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1"
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              }
            />



            {/* Forgot Password */}
            <TouchableOpacity className="items-end mb-4 -mt-2">
              <Text className="text-gray-500 text-xs font-medium">
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Password Strength Indicator */}
            {password.length > 0 && !loading && (
              <View className="flex-row gap-1 mb-4">
                {[1, 2, 3, 4].map((level) => {
                  const strength = password.length > 12 ? 4 : password.length > 8 ? 3 : password.length > 4 ? 2 : 1;
                  const active = level <= strength;
                  const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
                  return (
                    <View
                      key={level}
                      className="flex-1 h-1 rounded-full"
                      style={{ backgroundColor: active ? colors[strength - 1] : '#1F2937' }}
                    />
                  );
                })}
              </View>
            )}

            {/* Submit Button */}
            <Button
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              variant="primary"
            />



            </Card>
          </Animated.View>

          {/* Footer Warning */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Text className="text-center text-xs text-gray-400 mt-8">
              Access restricted to authorized Groww You tenants.
            </Text>
          </Animated.View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
