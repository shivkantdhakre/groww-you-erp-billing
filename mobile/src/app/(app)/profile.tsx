import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useStore, Branch } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { OfflineBanner } from "../../components/offline-banner";

export default function ProfileScreen() {
  const user = useStore((state) => state.user);
  const branches = useStore((state) => state.branches);
  const selectedBranchId = useStore((state) => state.selectedBranchId);
  const offlineOutbox = useStore((state) => state.offlineOutbox);
  const isOffline = useStore((state) => state.isOffline);
  const lastSyncedAt = useStore((state) => state.lastSyncedAt);

  const fetchBranches = useStore((state) => state.fetchBranches);
  const setSelectedBranchId = useStore((state) => state.setSelectedBranchId);
  const syncOfflineOutbox = useStore((state) => state.syncOfflineOutbox);
  const logout = useStore((state) => state.logout);

  const [syncing, setSyncing] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const branchSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (user && (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN")) {
      setLoadingBranches(true);
      fetchBranches()
        .catch((err) => console.error("Failed to load branches:", err))
        .finally(() => setLoadingBranches(false));
    }
  }, [user]);

  const activeBranch = branches.find((b) => b.id === selectedBranchId) || {
    id: selectedBranchId || 0,
    name: user?.branchId ? `Branch #${user.branchId}` : "HQ - Main Branch",
    companyId: user?.companyId || 0,
    isActive: true,
    address: null,
    mobileNumber: null,
    pincode: null
  } as Branch;

  const handleSync = async () => {
    if (isOffline) {
      Alert.alert("Offline Mode", "Cannot sync while device is offline.");
      return;
    }
    setSyncing(true);
    try {
      await syncOfflineOutbox();
      Alert.alert("Sync Complete", "Offline outbox synced successfully.");
    } catch (err: any) {
      Alert.alert("Sync Warning", "Some items failed to sync. Check network connectivity.");
    } finally {
      setSyncing(false);
    }
  };

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "COMPANY_ADMIN";

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "COMPANY_ADMIN":
        return "Company Admin";
      case "STAFF":
        return "Staff Member";
      default:
        return role;
    }
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#0A0F1D] px-5 pt-4">
      <OfflineBanner />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* User Card */}
        <Card className="mb-5 items-center">
          <View className="w-20 h-20 rounded-full bg-[#F7941D]/10 border border-[#F7941D]/20 justify-center items-center mb-4">
            {user?.name ? (
              <Text className="text-[#F7941D] text-2xl font-black font-lexend">
                {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person" size={40} color="#F7941D" />
            )}
          </View>
          <TouchableOpacity className="absolute top-0 right-0 bg-[#1A1F2E] border border-gray-800 rounded-full p-2">
            <Ionicons name="camera-outline" size={16} color="#F7941D" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold font-lexend">{user?.name || "Groww You Member"}</Text>
          <Text className="text-gray-400 text-sm mt-1 font-inter">{user?.email || ""}</Text>
          
          <View className="bg-[#F7941D]/10 border border-[#F7941D]/20 px-3 py-1 rounded-full mt-3">
            <Text className="text-[#F7941D] text-xs font-semibold font-inter">
              {getRoleLabel(user?.role || "")}
            </Text>
          </View>
        </Card>

        {/* Branch Section */}
        <Card className="mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Ionicons name="git-branch-outline" size={22} color="#F7941D" />
              <Text className="text-white text-base font-bold ml-3 font-lexend">Active Branch</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => branchSheetRef.current?.expand()}
                className="bg-[#F7941D] px-3 py-1.5 rounded-xl min-h-[44px] justify-center"
              >
                <Text className="text-white text-xs font-bold font-inter">Switch</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="bg-[#0A0F1D]/50 border border-gray-900 rounded-2xl p-4">
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider font-inter">Branch Name</Text>
            <Text className="text-white text-lg font-bold mt-1 font-lexend">{activeBranch.name}</Text>
            {activeBranch.address && (
              <Text className="text-gray-400 text-xs mt-1 font-inter">{activeBranch.address}</Text>
            )}
          </View>
          
          {loadingBranches && (
            <ActivityIndicator size="small" color="#F7941D" className="mt-3" />
          )}
        </Card>

        {/* Offline Sync Outbox Status Card */}
        <Card className="mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Ionicons name="cloud-upload-outline" size={22} color="#F7941D" />
              <Text className="text-white text-base font-bold ml-3 font-lexend">Sync Outbox</Text>
            </View>
            {offlineOutbox.length > 0 && (
              <TouchableOpacity 
                disabled={syncing}
                onPress={handleSync}
                className="bg-emerald-500 px-3 py-1.5 rounded-xl flex-row items-center min-h-[44px] justify-center"
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="sync" size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text className="text-white text-xs font-bold font-inter">Sync Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row justify-between items-center mb-4 bg-[#0A0F1D]/50 border border-gray-900 rounded-2xl p-4">
            <View>
              <Text className="text-gray-400 text-xs font-semibold uppercase font-inter">Pending Transactions</Text>
              <Text className="text-white text-2xl font-black mt-1 font-lexend">{offlineOutbox.length}</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-xs uppercase font-inter">Last Synced</Text>
              <Text className="text-gray-400 text-xs mt-1 font-inter">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "Never"}
              </Text>
            </View>
          </View>

          {offlineOutbox.length > 0 ? (
            <View className="max-h-40 border-t border-gray-800 pt-3">
              <Text className="text-gray-400 text-xs mb-2 font-inter">Queue details:</Text>
              <FlatList
                data={offlineOutbox}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View className="flex-row justify-between items-center py-2 border-b border-gray-800/30">
                    <View className="flex-row items-center">
                      <Ionicons name="receipt-outline" size={14} color="#9CA3AF" />
                      <Text className="text-gray-300 text-xs ml-2 font-medium font-inter">Invoice</Text>
                    </View>
                    <Text className="text-gray-400 text-[10px] font-inter">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              />
            </View>
          ) : (
            <Text className="text-gray-400 text-xs text-center py-2 font-inter">
              All transactions have been synchronized to Render backend.
            </Text>
          )}
        </Card>

        {/* Security & System Info */}
        <Card className="mb-8">
          <View className="flex-row items-center mb-4">
            <Ionicons name="shield-checkmark-outline" size={22} color="#F7941D" />
            <Text className="text-white text-base font-bold ml-3 font-lexend">System Security</Text>
          </View>
          <View className="gap-3">
            <View className="flex-row justify-between py-1.5">
              <Text className="text-gray-400 text-xs font-inter">Biometrics Enabled</Text>
              <Text className="text-emerald-500 text-xs font-bold font-inter">Secure</Text>
            </View>
            <View className="flex-row justify-between py-1.5 border-t border-gray-800/40">
              <Text className="text-gray-400 text-xs font-inter">Jailbreak Guard</Text>
              <Text className="text-emerald-500 text-xs font-bold font-inter">Active</Text>
            </View>
            <View className="flex-row justify-between py-1.5 border-t border-gray-800/40">
              <Text className="text-gray-400 text-xs font-inter">Client Version</Text>
              <Text className="text-gray-400 text-xs font-semibold font-inter">Groww You v1.0.0</Text>
            </View>
            {__DEV__ && (
              <TouchableOpacity
                onPress={() => {
                  throw new Error("Sentry Test Crash");
                }}
                className="mt-3 bg-red-500/10 border border-red-500/20 py-2.5 min-h-[44px] rounded-xl flex-row justify-center items-center"
              >
                <Ionicons name="bug-outline" size={16} color="#EF4444" />
                <Text className="text-red-500 font-bold ml-2 text-xs font-inter">Trigger Sentry Test Crash</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Confirm Logout",
              "Are you sure you want to log out?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: logout }
              ]
            );
          }}
          activeOpacity={0.9}
          className="bg-red-500/10 border border-red-500/20 py-4 rounded-2xl flex-row justify-center items-center mb-10"
        >
          <Ionicons name="log-out" size={20} color="#EF4444" />
          <Text className="text-red-500 font-bold ml-2 text-base">Logout Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Branch Selector Bottom Sheet */}
      <BottomSheet
        ref={branchSheetRef}
        index={-1}
        snapPoints={['70%']}
        enablePanDownToClose
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />}
        backgroundStyle={{ backgroundColor: '#1A1F2E' }}
        handleIndicatorStyle={{ backgroundColor: '#4B5563', width: 40 }}
      >
        <View className="flex-1 p-6 pt-2">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-lg font-bold">Select Active Branch</Text>
            <TouchableOpacity onPress={() => branchSheetRef.current?.close()}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <BottomSheetFlatList
            data={branches}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text className="text-gray-400 text-center py-4 font-inter">No branches registered.</Text>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === selectedBranchId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBranchId(item.id);
                    branchSheetRef.current?.close();
                  }}
                  className={`flex-row justify-between items-center p-4 mb-2 rounded-2xl border min-h-[44px] ${
                    isSelected
                      ? "bg-[#F7941D]/10 border-[#F7941D]/30"
                      : "bg-[#0A0F1D] border-gray-800"
                  }`}
                >
                  <View>
                    <Text className={`font-bold font-inter ${isSelected ? "text-[#F7941D]" : "text-white"}`}>
                      {item.name}
                    </Text>
                    {item.address && (
                      <Text className="text-gray-400 text-xs mt-1 font-inter">{item.address}</Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#F7941D" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
