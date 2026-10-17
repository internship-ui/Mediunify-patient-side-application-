import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActivePatient,
  getMedicineOrders,
  saveMedicineOrders,
  matchMedicineOrderToAccount,
} from '../../../data/patientDashboardData';
import { saveTransaction } from '../../../services/transactionService';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const STATUS_FILTERS = ['All Orders', 'Active', 'Delivered', 'Return Requested', 'Cancelled'];

const RETURN_REASONS = [
  'Damaged packaging or broken seal',
  'Wrong medicine or strength delivered',
  'Product expired or near-expiry date',
  'Doctor changed or stopped medication',
  'Quality issue or defective strip',
  'Other reason',
];

const MyMedicineOrdersScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // View state: 'list' | 'details' | 'return_select' | 'return_reason' | 'return_success'
  const [currentView, setCurrentView] = useState('list');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All Orders');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Details / Return
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Return Selection State
  const [selectedReturnItems, setSelectedReturnItems] = useState({}); // { [itemId]: qty }
  const [selectedReturnReason, setSelectedReturnReason] = useState(RETURN_REASONS[0]);
  const [selectedRefundMode, setSelectedRefundMode] = useState('wallet'); // 'wallet' | 'source'
  const [returnError, setReturnError] = useState('');
  const [lastReturnId, setLastReturnId] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Load user-specific orders
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const activePatient = await getActivePatient();
      const allOrders = await getMedicineOrders();
      // Ensure only orders belonging to logged-in user are shown
      const userOrders = (allOrders || []).filter((o) =>
        matchMedicineOrderToAccount(o, activePatient)
      );

      // Sort newest first
      userOrders.sort((a, b) => {
        const tA = new Date(a.rawDate || a.date || 0).getTime() || 0;
        const tB = new Date(b.rawDate || b.date || 0).getTime() || 0;
        return tB - tA;
      });

      setOrders(userOrders);

      // Check if routed with specific orderId
      const targetId = route?.params?.orderId || route?.params?.highlightOrderId;
      if (targetId) {
        const found = userOrders.find((o) => o.id === targetId);
        if (found) {
          setSelectedOrder(found);
          if (route?.params?.autoOpenDetails) {
            setCurrentView('details');
          }
        }
      }
    } catch (e) {
      console.warn('[MyMedicineOrdersScreen] Error loading orders:', e);
    } finally {
      setLoading(false);
    }
  }, [route?.params?.orderId, route?.params?.highlightOrderId, route?.params?.autoOpenDetails]);

  useEffect(() => {
    loadOrders();
    const unsub = navigation?.addListener ? navigation.addListener('focus', loadOrders) : null;
    return () => {
      if (typeof unsub === 'function') {
        unsub();
      } else if (unsub && typeof unsub.remove === 'function') {
        unsub.remove();
      }
    };
  }, [loadOrders, navigation]);

  // Filtered orders for List view
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const s = (order.status || '').toLowerCase();

      // Filter tab
      if (selectedFilter === 'Active') {
        if (!['order placed', 'placed', 'confirmed', 'preparing', 'out for delivery'].includes(s)) {
          return false;
        }
      } else if (selectedFilter === 'Delivered') {
        if (!['delivered', 'returned', 'partially returned'].includes(s)) {
          return false;
        }
      } else if (selectedFilter === 'Return Requested') {
        if (s !== 'return requested' && !order.returnRequested && s !== 'partially returned') {
          return false;
        }
      } else if (selectedFilter === 'Cancelled') {
        if (s !== 'cancelled') return false;
      }

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const id = (order.id || '').toLowerCase();
        const hasMed = order.items?.some((i) => (i.name || '').toLowerCase().includes(q));
        return id.includes(q) || hasMed;
      }

      return true;
    });
  }, [orders, selectedFilter, searchQuery]);

  // Status badge styling
  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('delivered')) {
      return { text: 'Delivered', color: '#16A34A', bg: '#DCFCE7', dot: '#16A34A' };
    }
    if (s.includes('return')) {
      return { text: status || 'Return Requested', color: '#EA580C', bg: '#FFEDD5', dot: '#EA580C' };
    }
    if (s.includes('cancel')) {
      return { text: 'Cancelled', color: '#DC2626', bg: '#FEE2E2', dot: '#DC2626' };
    }
    if (s.includes('delivery')) {
      return { text: 'Out for Delivery', color: '#0284C7', bg: '#E0F2FE', dot: '#0284C7' };
    }
    if (s.includes('preparing')) {
      return { text: 'Preparing', color: '#2563EB', bg: '#EFF6FF', dot: '#2563EB' };
    }
    return { text: status || 'Confirmed', color: '#007D69', bg: '#E6F8F5', dot: '#007D69' };
  };

  // Eligibility check for return
  const isOrderEligibleForReturn = (order) => {
    if (!order || !Array.isArray(order.items)) return false;
    if (order.status === 'Cancelled') return false;
    const isDeliverable = ['Delivered', 'Partially Returned', 'Confirmed', 'Order Placed'].includes(
      order.status
    );
    if (!isDeliverable) return false;
    return order.items.some((i) => {
      const totalQty = Number(i.quantity || 1);
      const retQty = Number(i.returnedQuantity || 0);
      return i.isReturnEligible !== false && retQty < totalQty;
    });
  };

  // Open return items selection
  const handleStartReturn = () => {
    setSelectedReturnItems({});
    setReturnError('');
    setCurrentView('return_select');
  };

  // Toggle item checkbox in return flow
  const handleToggleReturnItem = (item) => {
    setReturnError('');
    setSelectedReturnItems((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = 1;
      }
      return next;
    });
  };

  // Change quantity for returned item
  const handleChangeReturnQty = (item, delta) => {
    const maxQty = (item.quantity || 1) - (item.returnedQuantity || 0);
    setSelectedReturnItems((prev) => {
      const current = prev[item.id] || 1;
      const nextQty = Math.max(1, Math.min(maxQty, current + delta));
      return { ...prev, [item.id]: nextQty };
    });
  };

  // Summary of selected return items
  const returnSummary = useMemo(() => {
    if (!selectedOrder?.items) return { items: [], totalRefund: 0, count: 0 };
    const itemsList = [];
    let totalRefund = 0;
    let count = 0;

    Object.entries(selectedReturnItems).forEach(([id, qty]) => {
      const item = selectedOrder.items.find((i) => i.id === id);
      if (item && qty > 0) {
        const itemRefund = Number(item.price || 0) * qty;
        totalRefund += itemRefund;
        count += qty;
        itemsList.push({
          ...item,
          returnQty: qty,
          refundAmount: itemRefund,
        });
      }
    });

    return { items: itemsList, totalRefund, count };
  }, [selectedOrder, selectedReturnItems]);

  // Proceed to return reason step
  const handleProceedToReason = () => {
    if (returnSummary.count === 0) {
      setReturnError('Please select at least one medicine to return.');
      return;
    }
    setReturnError('');
    setCurrentView('return_reason');
  };

  // Submit return
  const handleSubmitReturn = async () => {
    if (!selectedOrder || returnSummary.items.length === 0) return;
    setSubmittingReturn(true);

    try {
      const returnId = `RET-MU-${Date.now().toString().slice(-5)}`;
      const nowStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      // Update items in selected order
      const updatedItems = selectedOrder.items.map((it) => {
        const chosenQty = selectedReturnItems[it.id];
        if (chosenQty && chosenQty > 0) {
          const newRetQty = (it.returnedQuantity || 0) + chosenQty;
          return {
            ...it,
            returnedQuantity: newRetQty,
            returnStatus: 'Return Requested',
            lastReturnDate: nowStr,
            lastReturnReason: selectedReturnReason,
          };
        }
        return it;
      });

      const allItemsFullyReturned = updatedItems.every(
        (i) => (i.returnedQuantity || 0) >= (i.quantity || 1)
      );

      const updatedOrder = {
        ...selectedOrder,
        status: allItemsFullyReturned ? 'Returned' : 'Partially Returned',
        returnRequested: true,
        items: updatedItems,
        refundInfo: {
          returnId,
          amount: returnSummary.totalRefund,
          status: 'Refund Pending',
          mode: selectedRefundMode === 'wallet' ? 'Care Wallet' : 'Original Payment Source',
          date: nowStr,
        },
        returnRequests: [
          {
            returnId,
            date: nowStr,
            reason: selectedReturnReason,
            amount: returnSummary.totalRefund,
            items: returnSummary.items.map((i) => ({
              name: i.name,
              quantity: i.returnQty,
              price: i.price,
            })),
            status: 'Return Requested',
          },
          ...(selectedOrder.returnRequests || []),
        ],
      };

      const updatedList = orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o));
      setOrders(updatedList);
      setSelectedOrder(updatedOrder);
      setLastReturnId(returnId);

      await saveMedicineOrders(updatedList);

      // Save refund transaction to Payment History
      try {
        await saveTransaction({
          id: `TXN-${returnId}`,
          refId: returnId,
          service: 'Pharmacy Refund',
          serviceType: 'pharmacy',
          title: `Return Refund: ${selectedOrder.items?.[0]?.name || 'Medicine'}`,
          facility: selectedOrder.pharmacyName || 'MediUnify Pharmacy',
          date: 'Today, Just now',
          rawDate: new Date().toISOString(),
          amount: returnSummary.totalRefund,
          mrp: returnSummary.totalRefund,
          status: 'Pending',
          paymentMode: selectedRefundMode === 'wallet' ? 'Care Wallet' : 'Original Source',
          items: returnSummary.items.map((i) => ({
            name: `Return: ${i.name}`,
            qty: i.returnQty,
            price: i.refundAmount,
          })),
        });
      } catch (_e) {}

      setSubmittingReturn(false);
      setCurrentView('return_success');
    } catch (e) {
      console.warn('Error submitting return:', e);
      setReturnError('Could not process return. Please try again.');
      setSubmittingReturn(false);
    }
  };

  // Back button handler respecting navigation stack
  const handleBack = () => {
    if (currentView === 'return_reason') {
      setCurrentView('return_select');
      return;
    }
    if (currentView === 'return_select') {
      setCurrentView('details');
      return;
    }
    if (currentView === 'return_success') {
      setCurrentView('details');
      return;
    }
    if (currentView === 'details') {
      setCurrentView('list');
      return;
    }
    navigation.goBack();
  };

  // =========================================================================
  // VIEW 1: MY PHARMACY ORDERS LIST (Compact Cards)
  // =========================================================================
  if (currentView === 'list') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Pharmacy Orders</Text>
          </View>
          <TouchableOpacity
            style={styles.orderMedsBtn}
            onPress={() => navigation.navigate('Pharmacy')}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={16} color="#007D69" />
            <Text style={styles.orderMedsBtnText}>Order Meds</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {STATUS_FILTERS.map((f) => {
              const active = selectedFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Orders Content */}
        <ScrollView
          contentContainerStyle={[styles.listContent, isTablet && styles.listContentTablet]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#007D69" />
              <Text style={styles.loadingText}>Loading pharmacy orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            /* Empty State (Requirement 16) */
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No pharmacy orders yet</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('Pharmacy')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Order Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Compact Cards List (Requirement 3) */
            filteredOrders.map((order) => {
              const badge = getStatusBadge(order.status);
              const itemCount = order.items?.length || 1;
              const dateText = order.date || order.orderDate || '03 Oct 2026';
              const totalAmount = order.total || order.totalAmount || 0;

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.compactCard}
                  onPress={() => {
                    setSelectedOrder(order);
                    setCurrentView('details');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardOrderId}>Order #{order.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
                      <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardItemCount}>
                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                  </Text>

                  <View style={styles.cardBottomRow}>
                    <View>
                      <Text style={styles.cardTotal}>₹{totalAmount}</Text>
                      <Text style={styles.cardDate}>{dateText}</Text>
                    </View>

                    <View style={styles.viewLinkBox}>
                      <Text style={styles.viewLinkText}>View →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: Platform.OS === 'web' ? 40 : 110 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 2: ORDER DETAILS (Requirement 5, 10, 11)
  // =========================================================================
  if (currentView === 'details' && selectedOrder) {
    const badge = getStatusBadge(selectedOrder.status);
    const dateText = selectedOrder.date || selectedOrder.orderDate || 'Recently placed';
    const totalAmount = selectedOrder.total || selectedOrder.totalAmount || 0;
    const items = selectedOrder.items || [];
    const formattedAddress =
      selectedOrder.address?.addressLine ||
      selectedOrder.deliveryAddress ||
      'House #42, Kuvempunagar, Mysuru';
    const recipientName =
      selectedOrder.patientName || selectedOrder.address?.name || 'Hemanth Gowda';
    const eligibleForReturn = isOrderEligibleForReturn(selectedOrder);

    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Order Details</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.detailsContent, isTablet && styles.detailsContentTablet]}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Header Card */}
          <View style={styles.detailCard}>
            <View style={styles.detailRowBetween}>
              <View>
                <Text style={styles.detailOrderNum}>Order #{selectedOrder.id}</Text>
                <Text style={styles.detailDateText}>{dateText}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
              </View>
            </View>
          </View>

          {/* Items Card (Requirement 5 & 10) */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Items</Text>
            {items.map((it, idx) => {
              const isReturned = it.returnStatus && it.returnStatus !== 'Eligible';
              return (
                <View
                  key={it.id || idx}
                  style={[styles.itemRow, idx !== items.length - 1 && styles.itemBorderBottom]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.name}</Text>
                    <Text style={styles.itemQty}>
                      Qty: {it.quantity || 1} • ₹{it.price} each
                    </Text>

                    {/* Return status for returned item (Requirement 10) */}
                    {isReturned ? (
                      <View style={styles.itemReturnBadge}>
                        <Ionicons name="return-up-back" size={12} color="#EA580C" />
                        <Text style={styles.itemReturnBadgeText}>{it.returnStatus}</Text>
                      </View>
                    ) : selectedOrder.status === 'Delivered' ? (
                      <View style={styles.itemDeliveredBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                        <Text style={styles.itemDeliveredBadgeText}>Delivered</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.itemPrice}>
                    ₹{Number(it.price || 0) * (it.quantity || 1)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Total & Payment Card */}
          <View style={styles.detailCard}>
            <View style={styles.detailRowBetween}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>₹{totalAmount}</Text>
            </View>
            <View style={styles.detailRowBetween}>
              <Text style={styles.metaLabel}>Payment Status</Text>
              <Text style={styles.metaVal}>
                {selectedOrder.paymentMethod || 'Paid Online'} • Paid
              </Text>
            </View>
          </View>

          {/* Delivery Address Card */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Delivery Address</Text>
            <Text style={styles.addressName}>{recipientName}</Text>
            <Text style={styles.addressText}>{formattedAddress}</Text>
          </View>

          {/* Refund Info (Requirement 11 - Only when applicable) */}
          {selectedOrder.refundInfo ? (
            <View style={styles.refundCard}>
              <View style={styles.detailRowBetween}>
                <View>
                  <Text style={styles.refundTitle}>Refund</Text>
                  <Text style={styles.refundAmount}>₹{selectedOrder.refundInfo.amount}</Text>
                </View>
                <View style={styles.refundStatusPill}>
                  <Text style={styles.refundStatusText}>
                    {selectedOrder.refundInfo.status || 'Refund Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.refundSub}>
                Destination: {selectedOrder.refundInfo.mode || 'Care Wallet'}
              </Text>
            </View>
          ) : null}

          {/* Action: Return Button (Requirement 6) */}
          {eligibleForReturn ? (
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={handleStartReturn}
              activeOpacity={0.85}
            >
              <Ionicons name="return-up-back-outline" size={18} color="#FFFFFF" />
              <Text style={styles.returnBtnText}>Return Items</Text>
            </TouchableOpacity>
          ) : null}

          <View style={{ height: Platform.OS === 'web' ? 40 : 110 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 3: SELECT ITEMS TO RETURN (Requirement 7)
  // =========================================================================
  if (currentView === 'return_select' && selectedOrder) {
    const items = selectedOrder.items || [];
    const returnableItems = items.filter(
      (i) =>
        i.isReturnEligible !== false &&
        (Number(i.quantity || 1) - Number(i.returnedQuantity || 0)) > 0
    );

    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Return Items</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.detailsContent, isTablet && styles.detailsContentTablet]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionSubtitle}>
            Select the medicine(s) you wish to return:
          </Text>

          {Boolean(returnError) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{returnError}</Text>
            </View>
          )}

          {/* Item Checkboxes (Requirement 7) */}
          <View style={styles.detailCard}>
            {returnableItems.map((it, idx) => {
              const isSelected = Boolean(selectedReturnItems[it.id]);
              const chosenQty = selectedReturnItems[it.id] || 1;
              const maxQty = (it.quantity || 1) - (it.returnedQuantity || 0);

              return (
                <View
                  key={it.id || idx}
                  style={[
                    styles.checkboxRow,
                    idx !== returnableItems.length - 1 && styles.itemBorderBottom,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.checkboxTouchable}
                    onPress={() => handleToggleReturnItem(it)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isSelected ? '#007D69' : '#94A3B8'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={styles.itemPrice}>₹{it.price}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Quantity selector if item had multiple units */}
                  {isSelected && maxQty > 1 ? (
                    <View style={styles.qtyBox}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleChangeReturnQty(it, -1)}
                        disabled={chosenQty <= 1}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyNum}>{chosenQty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => handleChangeReturnQty(it, 1)}
                        disabled={chosenQty >= maxQty}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Bottom Continue Button */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              returnSummary.count === 0 && styles.primaryBtnDisabled,
            ]}
            onPress={handleProceedToReason}
            disabled={returnSummary.count === 0}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>
              Continue ({returnSummary.count} selected • ₹{returnSummary.totalRefund})
            </Text>
          </TouchableOpacity>
          <View style={{ height: Platform.OS === 'web' ? 40 : 110 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 4: RETURN REASON (Requirement 8)
  // =========================================================================
  if (currentView === 'return_reason' && selectedOrder) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Return Reason</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.detailsContent, isTablet && styles.detailsContentTablet]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionSubtitle}>Select reason for return:</Text>

          {/* Reasons List */}
          <View style={styles.detailCard}>
            {RETURN_REASONS.map((reason, idx) => {
              const active = selectedReturnReason === reason;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.radioRow,
                    idx !== RETURN_REASONS.length - 1 && styles.itemBorderBottom,
                  ]}
                  onPress={() => setSelectedReturnReason(reason)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? '#007D69' : '#94A3B8'}
                  />
                  <Text style={[styles.radioText, active && styles.radioTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Refund Destination */}
          <Text style={styles.sectionSubtitle}>Refund destination:</Text>
          <View style={styles.detailCard}>
            <TouchableOpacity
              style={[styles.radioRow, styles.itemBorderBottom]}
              onPress={() => setSelectedRefundMode('wallet')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={selectedRefundMode === 'wallet' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedRefundMode === 'wallet' ? '#007D69' : '#94A3B8'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.radioText}>MediUnify Care Wallet</Text>
                <Text style={styles.radioSub}>Instant refund credit</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setSelectedRefundMode('source')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={selectedRefundMode === 'source' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedRefundMode === 'source' ? '#007D69' : '#94A3B8'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.radioText}>Original Payment Source</Text>
                <Text style={styles.radioSub}>3-5 business days</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Total Refund Preview */}
          <View style={styles.refundPreviewCard}>
            <Text style={styles.refundPreviewLabel}>Total Refund Amount</Text>
            <Text style={styles.refundPreviewValue}>₹{returnSummary.totalRefund}</Text>
          </View>

          {/* Submit Return Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSubmitReturn}
            disabled={submittingReturn}
            activeOpacity={0.88}
          >
            {submittingReturn ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Submit Return</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: Platform.OS === 'web' ? 40 : 110 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 5: RETURN CONFIRMATION (Requirement 9)
  // =========================================================================
  if (currentView === 'return_success') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.successWrapper}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark" size={38} color="#FFFFFF" />
          </View>

          <Text style={styles.successTitle}>Return Requested</Text>
          <Text style={styles.successId}>Return ID: {lastReturnId}</Text>
          <Text style={styles.successSub}>
            Pickup will be completed within 24-48 hours. Refund of ₹{returnSummary.totalRefund}{' '}
            will be processed upon verification.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setCurrentView('details')}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>View Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setCurrentView('list')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>All Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderMedsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  orderMedsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#007D69',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#007D69',
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentTablet: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 14,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: '#007D69',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardOrderId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardItemCount: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  cardTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  viewLinkBox: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007D69',
  },
  detailsContent: {
    padding: 16,
    gap: 12,
  },
  detailsContentTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailOrderNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailDateText: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  itemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemQty: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemReturnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  itemReturnBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
  },
  itemDeliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  itemDeliveredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#007D69',
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 6,
  },
  addressName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },
  refundCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFD8A8',
    borderRadius: 14,
    padding: 14,
  },
  refundTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9A3412',
  },
  refundAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA580C',
    marginTop: 2,
  },
  refundStatusPill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  refundStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },
  refundSub: {
    fontSize: 12,
    color: '#9A3412',
    marginTop: 6,
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7F50',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 6,
  },
  returnBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  checkboxTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginLeft: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  qtyNum: {
    paddingHorizontal: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: '#007D69',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioText: {
    fontSize: 13.5,
    color: '#334155',
    marginLeft: 10,
    flex: 1,
  },
  radioTextActive: {
    fontWeight: '700',
    color: '#007D69',
  },
  radioSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  refundPreviewCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refundPreviewLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F766E',
  },
  refundPreviewValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#007D69',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
  },
  successWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  successId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007D69',
    marginTop: 4,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 280,
  },
});

export default MyMedicineOrdersScreen;
