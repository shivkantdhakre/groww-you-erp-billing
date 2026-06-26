import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useStore } from "../../store/useStore";
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from '../../utils/secureStoreWrapper';
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const login = useStore((state) => state.login);
  const loading = useStore((state) => state.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  const handleBiometricLogin = async () => {
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Groww You ERP',
        fallbackLabel: 'Enter Password'
      });

      if (result.success) {
        const savedEmail = await SecureStore.getItemAsync('saved_email');
        const savedPassword = await SecureStore.getItemAsync('saved_password');
        
        if (savedEmail && savedPassword) {
          await login(savedEmail, savedPassword);
        } else {
          setError("Saved credentials not found. Please log in with password once.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Biometric authentication failed.");
    }
  };

  // Check if biometrics and saved credentials exist on mount
  useEffect(() => {
    const checkBiometrics = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const savedEmail = await SecureStore.getItemAsync('saved_email');
      const savedOptIn = await SecureStore.getItemAsync('biometric_opt_in');
      
      const enrolled = hasHardware && isEnrolled && savedEmail && savedOptIn === 'true';
      if (enrolled) {
        setHasBiometrics(true);
        
        // Auto-prompt if not manually logged out
        const manualLogout = useStore.getState().manualLogout;
        if (!manualLogout) {
          setTimeout(() => {
            handleBiometricLogin();
          }, 300);
        }
      }
    };
    checkBiometrics();
  }, []);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      await login(email.trim(), password);
      // Save credentials securely for biometric unlock if enabled
      if (biometricsEnabled) {
        await SecureStore.setItemAsync('saved_email', email.trim());
        await SecureStore.setItemAsync('saved_password', password);
        await SecureStore.setItemAsync('biometric_opt_in', 'true');
      } else {
        await SecureStore.deleteItemAsync('saved_email');
        await SecureStore.deleteItemAsync('saved_password');
        await SecureStore.setItemAsync('biometric_opt_in', 'false');
      }
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
          <View className="items-center mb-10">
            <Text className="text-3xl font-extrabold text-white tracking-wider">
              GROWW <Text className="text-secondary">YOU</Text>
            </Text>
            <Text className="text-sm text-gray-400 mt-2">Mobile Wholesale ERP Shell</Text>
          </View>

          {/* Login Card */}
          <View className="bg-[#1A1F2E] border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
            <Text className="text-xl font-bold text-white mb-6">Staff Authentication</Text>

            {error && (
              <View className="bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl mb-4">
                <Text className="text-red-500 text-sm font-semibold">{error}</Text>
              </View>
            )}

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</Text>
              <TextInput
                className="bg-[#0E1321] border border-gray-800 rounded-xl px-4 py-3.5 text-white font-medium focus:border-primary"
                placeholder="email@growwyou.com"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</Text>
              <View className="relative justify-center">
                <TextInput
                  className="bg-[#0E1321] border border-gray-800 rounded-xl pl-4 pr-12 py-3.5 text-white font-medium focus:border-primary"
                  placeholder="••••••••"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 p-1"
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember/Biometric Toggle */}
            <TouchableOpacity
              onPress={() => setBiometricsEnabled(!biometricsEnabled)}
              activeOpacity={0.7}
              className="flex-row items-center mb-6"
            >
              <View className={`w-5 h-5 border rounded mr-2 items-center justify-center ${
                biometricsEnabled ? 'bg-secondary border-secondary' : 'border-gray-600 bg-[#0E1321]'
              }`}>
                {biometricsEnabled && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
              <Text className="text-gray-300 text-xs font-medium">
                Enable biometric quick-login (FaceID/TouchID)
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              className="bg-primary hover:bg-primary/95 py-4 rounded-xl flex-row justify-center items-center shadow-lg shadow-primary/10"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white text-base font-bold">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Biometric Login Option */}
            {hasBiometrics && !loading && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                className="mt-4 border border-gray-700 py-3.5 rounded-xl flex-row justify-center items-center active:bg-gray-800"
              >
                <Text className="text-gray-300 text-sm font-semibold">Unlock with Biometrics</Text>
              </TouchableOpacity>
            )}

          </View>

          {/* Footer Warning */}
          <Text className="text-center text-xs text-gray-500 mt-8">
            Access restricted to authorized Groww You tenants.
          </Text>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
