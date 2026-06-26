import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Vibration,
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { OfflineBanner } from "../../components/offline-banner";
import api from "../../utils/api";

interface CartItem {
  item: any;
  qty: number;
}

export default function BillingScreen() {
  const items = useStore((state) => state.items);
  const customers = useStore((state) => state.customers);
  const selectedBranchId = useStore((state) => state.selectedBranchId);
  const isOffline = useStore((state) => state.isOffline);
  
  const fetchItems = useStore((state) => state.fetchItems);
  const fetchCustomers = useStore((state) => state.fetchCustomers);
  const queueOfflineInvoice = useStore((state) => state.queueOfflineInvoice);
  const fetchInvoices = useStore((state) => state.fetchInvoices);
  const fetchSummary = useStore((state) => state.fetchSummary);

  // Read cart and actions from Zustand store
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateCartQty = useStore((state) => state.updateCartQty);
  const clearCart = useStore((state) => state.clearCart);

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "BANK" | "UPI">("CASH");
  const [submitting, setSubmitting] = useState(false);

  // Modals visibility
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Search queries
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Initial fetch of master logs
    if (items.length === 0) fetchItems().catch(console.error);
    if (customers.length === 0) fetchCustomers().catch(console.error);
  }, []);

  // Helper: Get item stock for selected branch
  const getBranchStock = (item: any) => {
    if (!item.branchStocks || item.branchStocks.length === 0) {
      return item.openingStock || 0;
    }
    const bs = item.branchStocks.find((s: any) => s.branchId === selectedBranchId);
    return bs ? bs.stock : 0;
  };

  const handleAddProduct = (product: any) => {
    const stock = getBranchStock(product);
    if (stock <= 0) {
      Alert.alert("Out of Stock", `"${product.name}" has no stock available in this branch.`);
      return;
    }

    const existingItem = cart.find((c) => c.item.id === product.id);
    if (existingItem) {
      const currentQty = existingItem.qty;
      if (currentQty + 1 > stock) {
        Alert.alert("Stock Limit Reached", `Only ${stock} units are available for "${product.name}".`);
        return;
      }
      updateCartQty(product.id, currentQty + 1);
    } else {
      addToCart(product);
    }
    setItemModalVisible(false);
  };

  const handleUpdateQty = (productId: number, change: number) => {
    const cartItem = cart.find((c) => c.item.id === productId);
    if (!cartItem) return;

    const stock = getBranchStock(cartItem.item);
    const newQty = cartItem.qty + change;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > stock) {
      Alert.alert("Stock Limit Reached", `Only ${stock} units are available for "${cartItem.item.name}".`);
      return;
    }

    updateCartQty(productId, newQty);
  };

  const handleRemoveProduct = (productId: number) => {
    removeFromCart(productId);
  };

  // Barcode Scanning
  const handleScanBarcode = async () => {
    if (!permission) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan barcodes.");
        return;
      }
    } else if (!permission.granted) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert("Permission Required", "Camera access is needed to scan barcodes.");
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    const code = data.trim();
    Vibration.vibrate(100);
    setScannerVisible(false);

    const product = items.find((i: any) => i.sku === code);
    if (!product) {
      Alert.alert("SKU Not Found", `Product with barcode "${code}" was not found in the catalog.`);
      return;
    }

    handleAddProduct(product);
  };

  // Cart calculations
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.item.salePrice * item.qty, 0);
  };

  const calculateGST = () => {
    return cart.reduce((sum, item) => {
      const sub = item.item.salePrice * item.qty;
      const gst = (sub * (item.item.gstPercentage || 0)) / 100;
      return sum + gst;
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  // Submit invoice
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert("Validation Error", "Please select a customer first.");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Validation Error", "Please add at least one product to the cart.");
      return;
    }

    const payload = {
      customerId: selectedCustomer.id,
      items: cart.map((c) => ({
        itemId: c.item.id,
        qty: c.qty
      })),
      invoiceDate: new Date().toISOString()
    };

    if (isOffline) {
      // Offline transaction
      queueOfflineInvoice(payload);
      Alert.alert(
        "Offline Saved",
        "Invoice saved offline and queued in the outbox. Inventory stocks have been adjusted optimistically.",
        [
          {
            text: "OK",
            onPress: () => {
              clearCart();
              setSelectedCustomer(null);
            }
          }
        ]
      );
      return;
    }

    // Online submission
    setSubmitting(true);
    try {
      await api.post("/transactions/sales-invoices", payload);
      Alert.alert("Success", "Sales invoice created successfully.", [
        {
          text: "OK",
          onPress: () => {
            clearCart();
            setSelectedCustomer(null);
            fetchInvoices().catch(console.error);
            fetchSummary().catch(console.error);
          }
        }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "Submission Failed",
        err.response?.data?.error || err.message || "Failed to create sales invoice."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered registers
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.mobile.includes(q);
  });

  const filteredItems = items.filter((i) => {
    const q = itemSearch.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.sku && i.sku.toLowerCase().includes(q));
  });

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#0A0F1D] px-5 pt-4">
      <OfflineBanner />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Customer Section */}
        <View className="bg-[#1A1F2E] border border-gray-800 rounded-3xl p-5 mb-4 shadow-lg">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Customer</Text>
          {selectedCustomer ? (
            <View className="flex-row items-center justify-between bg-[#0A0F1D]/50 border border-gray-900 rounded-2xl p-4">
              <View className="flex-1 pr-2">
                <Text className="text-white text-base font-bold">{selectedCustomer.name}</Text>
                <Text className="text-gray-500 text-xs mt-1">Mob: {selectedCustomer.mobile}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setCustomerModalVisible(true)}
              className="flex-row items-center justify-between bg-[#0A0F1D]/50 border border-gray-900 border-dashed rounded-2xl p-4"
            >
              <Text className="text-gray-500 text-sm font-semibold">Select Customer Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Toolbar Section */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={() => setItemModalVisible(true)}
            className="flex-1 bg-[#1A1F2E] border border-gray-800 py-3.5 rounded-2xl flex-row justify-center items-center shadow-lg"
          >
            <Ionicons name="add-circle-outline" size={20} color="#F7941D" />
            <Text className="text-white font-bold ml-2 text-sm">Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleScanBarcode}
            className="flex-1 bg-[#F7941D] py-3.5 rounded-2xl flex-row justify-center items-center shadow-lg shadow-[#F7941D]/10"
          >
            <Ionicons name="scan-outline" size={20} color="#FFF" />
            <Text className="text-white font-black ml-2 text-sm">Scan Barcode</Text>
          </TouchableOpacity>
        </View>

        {/* Cart Listing */}
        <View className="bg-[#1A1F2E] border border-gray-800 rounded-3xl p-5 mb-4 min-h-[160px] shadow-lg">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Cart Items</Text>
          
          {cart.length === 0 ? (
            <View className="flex-1 justify-center items-center py-10">
              <Ionicons name="cart-outline" size={36} color="#4B5563" />
              <Text className="text-gray-500 text-xs font-semibold mt-2">Billing cart is empty.</Text>
            </View>
          ) : (
            cart.map((cartItem) => {
              const subtotal = cartItem.item.salePrice * cartItem.qty;
              const gst = (subtotal * (cartItem.item.gstPercentage || 0)) / 100;
              const total = subtotal + gst;
              
              return (
                <View key={cartItem.item.id} className="flex-row justify-between items-center py-3 border-b border-gray-800/40">
                  <View className="flex-1 pr-3">
                    <Text className="text-white text-sm font-bold" numberOfLines={1}>
                      {cartItem.item.name}
                    </Text>
                    <Text className="text-gray-500 text-[10px] mt-0.5">
                      Rate: ₹{cartItem.item.salePrice} | GST: {cartItem.item.gstPercentage}% (₹{gst.toFixed(1)})
                    </Text>
                  </View>

                  {/* Quantity Actions */}
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => handleUpdateQty(cartItem.item.id, -1)}
                      className="w-8 h-8 rounded-full bg-[#0A0F1D] border border-gray-800 justify-center items-center"
                    >
                      <Ionicons name="remove" size={16} color="#FFF" />
                    </TouchableOpacity>
                    
                    <Text className="text-white font-bold text-sm w-6 text-center">{cartItem.qty}</Text>

                    <TouchableOpacity
                      onPress={() => handleUpdateQty(cartItem.item.id, 1)}
                      className="w-8 h-8 rounded-full bg-[#0A0F1D] border border-gray-800 justify-center items-center"
                    >
                      <Ionicons name="add" size={16} color="#FFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemoveProduct(cartItem.item.id)}
                      className="w-8 h-8 rounded-full bg-red-500/10 justify-center items-center ml-2"
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Payment Type */}
        <View className="bg-[#1A1F2E] border border-gray-800 rounded-3xl p-5 mb-4 shadow-lg">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Payment Mode</Text>
          <View className="flex-row gap-2 bg-[#0A0F1D]/50 p-1.5 rounded-2xl border border-gray-900">
            {(["CASH", "BANK", "UPI"] as const).map((mode) => {
              const active = paymentMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setPaymentMode(mode)}
                  className={`flex-1 py-2.5 rounded-xl justify-center items-center ${
                    active ? "bg-[#F7941D]" : ""
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? "text-white" : "text-gray-400"}`}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Calculations Summary */}
        <View className="bg-[#1A1F2E] border border-gray-800 rounded-3xl p-5 mb-6 shadow-lg">
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Invoice Details</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-500 text-xs">Total Items</Text>
              <Text className="text-white text-xs font-bold">{cart.length}</Text>
            </View>
            <View className="flex-row justify-between border-t border-gray-800/40 pt-2.5">
              <Text className="text-gray-500 text-xs">Subtotal (excl. Tax)</Text>
              <Text className="text-white text-xs font-bold">₹{calculateSubtotal().toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between border-t border-gray-800/40 pt-2.5">
              <Text className="text-gray-500 text-xs">Tax (GST)</Text>
              <Text className="text-white text-xs font-bold">₹{calculateGST().toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between border-t border-gray-800/40 pt-2.5">
              <Text className="text-gray-400 text-sm font-black">Grand Total</Text>
              <Text className="text-[#F7941D] text-base font-black">₹{calculateGrandTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Action button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.9}
          className="bg-[#F7941D] py-4.5 rounded-2xl flex-row justify-center items-center shadow-lg shadow-[#F7941D]/20 mb-10"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#FFF" />
              <Text className="text-white font-extrabold text-base ml-2">Submit Invoice</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Picker Modal */}
      <Modal
        visible={customerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomerModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#1A1F2E] border-t border-gray-800 rounded-t-3xl p-6 h-[75%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">Select Customer</Text>
              <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Customer Search Bar */}
            <View className="flex-row items-center bg-[#0A0F1D] border border-gray-800 rounded-xl px-3 py-1 mb-4">
              <Ionicons name="search" size={16} color="#6B7280" />
              <TextInput
                className="flex-1 ml-2 h-10 text-white text-xs font-medium focus:outline-none"
                placeholder="Search by customer name or phone..."
                placeholderTextColor="#6B7280"
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
            </View>

            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <Text className="text-gray-500 text-center py-4">No customers found.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModalVisible(false);
                    setCustomerSearch("");
                  }}
                  className="bg-[#0A0F1D] border border-gray-800 p-4 rounded-xl mb-2 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-white font-bold text-sm">{item.name}</Text>
                    <Text className="text-gray-500 text-xs mt-1">Mob: {item.mobile}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#F7941D" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Item Picker Modal */}
      <Modal
        visible={itemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setItemModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#1A1F2E] border-t border-gray-800 rounded-t-3xl p-6 h-[75%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">Add Product Item</Text>
              <TouchableOpacity onPress={() => setItemModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Item Search Bar */}
            <View className="flex-row items-center bg-[#0A0F1D] border border-gray-800 rounded-xl px-3 py-1 mb-4">
              <Ionicons name="search" size={16} color="#6B7280" />
              <TextInput
                className="flex-1 ml-2 h-10 text-white text-xs font-medium focus:outline-none"
                placeholder="Search by product name or SKU..."
                placeholderTextColor="#6B7280"
                value={itemSearch}
                onChangeText={setItemSearch}
              />
            </View>

            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <Text className="text-gray-500 text-center py-4">No products found.</Text>
              }
              renderItem={({ item }) => {
                const stock = getBranchStock(item);
                const isOutOfStock = stock <= 0;
                return (
                  <TouchableOpacity
                    disabled={isOutOfStock}
                    onPress={() => {
                      handleAddProduct(item);
                      setItemSearch("");
                    }}
                    className={`bg-[#0A0F1D] border border-gray-800 p-4 rounded-xl mb-2 flex-row justify-between items-center ${
                      isOutOfStock ? "opacity-40" : ""
                    }`}
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-white font-bold text-sm" numberOfLines={1}>{item.name}</Text>
                      <Text className="text-gray-500 text-[10px] mt-1">
                        SKU: {item.sku || "N/A"} | Price: ₹{item.salePrice} | Tax: {item.gstPercentage}%
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-xs font-bold ${isOutOfStock ? "text-red-500" : "text-emerald-500"}`}>
                        {isOutOfStock ? "Out of Stock" : `${stock} ${item.unit || "pcs"}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={scannerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setScannerVisible(false)}
      >
        <View className="flex-1 bg-[#0A0F1D] justify-center">
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "code128", "code39"],
            }}
          />
          <View style={styles.overlayContainer}>
            <View style={styles.scanTargetBox}>
              <View className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-secondary" />
              <View className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-secondary" />
              <View className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-secondary" />
              <View className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-secondary" />
            </View>
            <Text className="text-white font-bold text-sm text-center mt-6 bg-[#0A0F1D]/80 px-4 py-2 rounded-full overflow-hidden border border-gray-800">
              Align item barcode inside target box
            </Text>
            <TouchableOpacity
              onPress={() => setScannerVisible(false)}
              className="mt-8 bg-red-600 px-6 py-3.5 rounded-2xl flex-row items-center"
            >
              <Ionicons name="close-circle" size={18} color="#FFF" />
              <Text className="text-white font-bold text-sm ml-2">Cancel Scanning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanTargetBox: {
    width: 260,
    height: 260,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "transparent",
    position: "relative",
  },
});
