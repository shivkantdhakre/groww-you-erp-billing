import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
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
  const removeFailedOutboxItem = useStore((state) => state.removeFailedOutboxItem);
  const retryFailedOutboxItem = useStore((state) => state.retryFailedOutboxItem);
  const logout = useStore((state) => state.logout);

  const pendingItems = offlineOutbox.filter((i: any) => i.syncStatus !== 'failed');
  const failedItems = offlineOutbox.filter((i: any) => i.syncStatus === 'failed');

  const [syncing, setSyncing] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchSheetVisible, setBranchSheetVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user && (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN")) {
      Promise.resolve().then(async () => {
        if (!isMounted) return;
        setLoadingBranches(true);
        try {
          await fetchBranches();
        } catch (err) {
          console.error("Failed to load branches:", err);
        } finally {
          if (isMounted) setLoadingBranches(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user, fetchBranches]);

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
      console.error("Sync error:", err);
      Alert.alert("Sync Warning", "Some items failed to sync. Check network connectivity.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscard = (id: string) => {
    if (syncing) return;
    Alert.alert(
      "Discard Invoice",
      "This invoice will not be saved — are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => removeFailedOutboxItem(id) }
      ]
    );
  };

  const handleRetry = (id: string) => {
    if (syncing) return;
    retryFailedOutboxItem(id);
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
                onPress={() => setBranchSheetVisible(true)}
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
            <View className="flex-row gap-6">
              <View>
                <Text className="text-gray-400 text-xs font-semibold uppercase font-inter">Pending</Text>
                <Text className="text-white text-2xl font-black mt-1 font-lexend">{pendingItems.length}</Text>
              </View>
              <View>
                <Text className="text-gray-400 text-xs font-semibold uppercase font-inter">Failed</Text>
                <Text className={failedItems.length > 0 ? "text-red-500 text-2xl font-black mt-1 font-lexend" : "text-white text-2xl font-black mt-1 font-lexend"}>{failedItems.length}</Text>
              </View>
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
                renderItem={({ item }) => {
                  const isFailed = item.syncStatus === 'failed';
                  return (
                    <View className="py-2 border-b border-gray-800/30">
                      <View className="flex-row justify-between items-center mb-1">
                        <View className="flex-row items-center">
                          <Ionicons name={isFailed ? "alert-circle" : "receipt-outline"} size={14} color={isFailed ? "#EF4444" : "#9CA3AF"} />
                          <Text className={`text-xs ml-2 font-medium font-inter ${isFailed ? "text-red-400" : "text-gray-300"}`}>
                            Invoice {isFailed ? "(Failed)" : "(Pending)"}
                          </Text>
                        </View>
                        <Text className="text-gray-400 text-[10px] font-inter">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </Text>
                      </View>
                      {isFailed && (
                        <View className="mt-1">
                          <Text className="text-red-400/80 text-[10px] font-inter leading-relaxed">{item.errorMessage || "Unknown error"}</Text>
                          <View className="flex-row mt-2 gap-3 justify-end">
                            <TouchableOpacity disabled={syncing} onPress={() => handleDiscard(item.id)} className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 opacity={syncing ? 0.5 : 1}">
                              <Text className="text-red-400 text-xs font-semibold">Discard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={syncing} onPress={() => handleRetry(item.id)} className="bg-[#F7941D]/10 px-3 py-1.5 rounded-lg border border-[#F7941D]/20 opacity={syncing ? 0.5 : 1}">
                              <Text className="text-[#F7941D] text-xs font-semibold">Retry</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                }}
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

      {/* Branch Selector Modal */}
      <Modal
        visible={branchSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBranchSheetVisible(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setBranchSheetVisible(false)}>
          <Pressable className="bg-[#1A1F2E] rounded-t-[28px] pt-6 pb-10 px-6 max-h-[80%]" onPress={() => {}}>
            <View className="w-10 h-1 bg-[#4B5563] rounded-full self-center mb-6" />

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-lg font-bold">Select Active Branch</Text>
              <TouchableOpacity onPress={() => setBranchSheetVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <FlatList
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
                      setBranchSheetVisible(false);
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
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
