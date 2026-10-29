import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebFooter from '../../../components/web/WebFooter';
import PaginationBar from '../../../components/web/PaginationBar';
import PatientPageBanner from '../../../components/web/PatientPageBanner';
import { useCart } from '../../../context/CartContext';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import { isGuestUser } from '../../../utils/authHelper';
import {
  getActivePatient,
  getMedicineOrders,
  saveMedicineOrders,
  matchMedicineOrderToAccount,
} from '../../../data/patientDashboardData';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';

/**
 * MediUnify Exact Brand Color Palette:
 * - Teal:        #008B94 (Primary Actions, Icons, Brand Accents)
 * - Navy Blue:   #1E3A8A (Headings, Order IDs, Primary Text)
 * - Aqua:        #00C2CB (Highlights, Live Tracker, Quick Badges)
 * - Fresh Green: #7BC96F (Delivered Status, Verified Badges, Savings)
 * - Coral:       #FF7F50 (Return Items, Return Requests, Urgent Badges)
 * - Slate:       #64748B (Secondary Text, Borders, Neutral Badges)
 */
const BRAND = {
  TEAL: '#00B894',
  NAVY: '#1E3A8A',
  AQUA: '#00C2CB',
  GREEN: '#7BC96F',
  CORAL: '#FF7F50',
  SLATE: '#64748B',

  // Soft Tinted Fills for Maximum Legibility
  TEAL_LIGHT: '#E6F8F4',
  TEAL_BORDER: '#A7F3D0',
  NAVY_LIGHT: '#EFF6FF',
  NAVY_BORDER: '#BFDBFE',
  AQUA_LIGHT: '#E0F7FA',
  AQUA_BORDER: '#B2EBF2',
  GREEN_LIGHT: '#EBF8E7',
  GREEN_BORDER: '#C2EDB7',
  CORAL_LIGHT: '#FFF2ED',
  CORAL_BORDER: '#FED7AA',
  SLATE_LIGHT: '#F1F5F9',
  SLATE_BORDER: '#E2E8F0',
};

const STATUS_FILTERS = ['All Orders', 'Active', 'Delivered', 'Cancelled', 'Return Requested'];

const RETURN_REASONS = [
  'Damaged packaging or broken seal',
  'Wrong medicine / incorrect strength delivered',
  'Product expired or near-expiry date',
  'Doctor altered or stopped prescription',
  'Received duplicate or extra package',
  'Quality issue / defective strip',
];

// Clean up overly verbose address strings (e.g. remove repetitive taluk/district/country)
const formatCleanAddress = (addr) => {
  if (!addr) return 'Srirampura, Mysuru - 570001';
  let clean = addr
    .replace(/,\s*Mysuru taluk/gi, '')
    .replace(/,\s*Mysore taluk/gi, '')
    .replace(/,\s*Mysuru District/gi, '')
    .replace(/,\s*Mysore District/gi, '')
    .replace(/,\s*India/gi, '')
    .trim();
  clean = clean.replace(/,\s*Karnataka,?\s*(\d{6})/gi, ', Karnataka $1');
  return clean;
};

// Clean payment status and avoid duplicate "(Verified) (Verified)"
const formatCleanPayment = (paymentStatus) => {
  if (!paymentStatus) return 'Paid Online • Verified';
  const clean = paymentStatus.replace(/\(Verified\)/gi, '').trim();
  return `${clean || 'Paid Online'} • Verified`;
};

// Simplify long medicine titles by separating specs in parentheses
const splitMedNameAndSpecs = (fullName) => {
  if (!fullName) return { name: 'Medicine', specs: null };
  const match = fullName.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return { name: match[1].trim(), specs: match[2].trim() };
  }
  return { name: fullName.trim(), specs: null };
};

// Shorten tracking step titles for a crisp stepper
const getShortStepTitle = (title) => {
  if (!title) return '';
  if (/placed/i.test(title)) return 'Placed';
  if (/pharmacist|confirmed/i.test(title)) return 'Confirmed';
  if (/packed|pharmacy/i.test(title)) return 'Packed';
  if (/out for delivery/i.test(title)) return 'Out for Delivery';
  if (/delivered/i.test(title)) return 'Delivered';
  return title;
};

import MyMedicineOrdersScreenMobile from './MyMedicineOrdersScreen.js';

const MyMedicineOrdersScreenWeb = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);

  const { addToCart } = useCart() || {};

  const [patient, setPatient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All Orders');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination (4 items per page)
  const ITEMS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = useState(1);

  // Modals: 'details' | 'return' | 'invoice' | 'contact' | null
  const [activeModal, setActiveModal] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Return Selection & Confirmation State (Requirements 4, 5, 6)
  const [returnStep, setReturnStep] = useState('select'); // 'select' | 'confirm'
  const [selectedReturnItems, setSelectedReturnItems] = useState({}); // { [itemId]: returnQuantity }
  const [selectedReturnReason, setSelectedReturnReason] = useState(RETURN_REASONS[0]);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [selectedRefundMode, setSelectedRefundMode] = useState('wallet'); // 'wallet' | 'source'
  const [returnError, setReturnError] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const guest = await isGuestUser();
      if (guest) {
        setIsGuestMode(true);
        setPatient(null);
        setOrders([]);
        setLoading(false);
        return;
      }
      setIsGuestMode(false);
      const p = await getActivePatient();
      setPatient(p);
      const ords = await getMedicineOrders();
      // Ensure strict user matching
      const userOrders = (ords || []).filter((o) => matchMedicineOrderToAccount(o, p));
      setOrders(userOrders);
    } catch (e) {
      console.warn('Error loading medicine orders:', e);
      setError('Unable to load your medicine orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 1. Navigation focus listener - updates automatically when returning to page
    const unsubscribeFocus = navigation?.addListener ? navigation.addListener('focus', () => {
      loadData();
    }) : null;

    // 2. Storage & custom event listeners for real-time auto-refresh without manual refresh
    const handleStorageChange = (e) => {
      if (!e || !e.key || e.key.includes('order') || e.key.includes('pharmacy')) {
        loadData();
      }
    };
    const handleOrdersUpdated = () => {
      loadData();
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('mediunify_orders_updated', handleOrdersUpdated);
    }

    return () => {
      if (typeof unsubscribeFocus === 'function') {
        try { unsubscribeFocus(); } catch (e) {}
      } else if (unsubscribeFocus && typeof unsubscribeFocus.remove === 'function') {
        try { unsubscribeFocus.remove(); } catch (e) {}
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        try {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('mediunify_orders_updated', handleOrdersUpdated);
        } catch (e) {}
      }
    };
  }, [navigation, loadData]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter tab
      if (selectedFilter !== 'All Orders') {
        const s = (order.status || '').toLowerCase();
        if (selectedFilter === 'Active') {
          if (!['order placed', 'confirmed', 'preparing', 'out for delivery'].includes(s)) {
            return false;
          }
        } else if (selectedFilter === 'Delivered') {
          if (s !== 'delivered' && s !== 'returned' && s !== 'partially returned') {
            return false;
          }
        } else if (selectedFilter === 'Return Requested') {
          if (s !== 'return requested' && !order.returnRequested && s !== 'partially returned') {
            return false;
          }
        } else if (s !== selectedFilter.toLowerCase()) {
          return false;
        }
      }

      // Search Query (ID, medicine name, pharmacy name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const id = (order.id || '').toLowerCase();
        const pharmacy = (order.pharmacyName || '').toLowerCase();
        const hasMed = order.items?.some((i) => (i.name || '').toLowerCase().includes(q));
        return id.includes(q) || pharmacy.includes(q) || hasMed;
      }

      return true;
    });
  }, [orders, selectedFilter, searchQuery]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, searchQuery]);

  // Slice orders for current page (4 items per page)
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // =========================================================================
  // RETURN WORKFLOW (Requirements 4, 5, 6)
  // =========================================================================

  // Open return selection modal (starts empty with no items preselected)
  const handleOpenReturnModal = (order) => {
    setSelectedOrder(order);
    setReturnStep('select');
    setSelectedReturnItems({}); // User chooses which items to return
    setSelectedReturnReason(RETURN_REASONS[0]);
    setReturnRemarks('');
    setSelectedRefundMode('wallet');
    setReturnError('');
    setActiveModal('return');
  };

  // Toggle selection of an individual item
  const handleToggleItemSelection = (item) => {
    setReturnError('');
    setSelectedReturnItems((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        // Default to returning 1 unit
        next[item.id] = 1;
      }
      return next;
    });
  };

  // Change return quantity for an item (min: 1, max: remaining returnable qty)
  const handleChangeReturnQuantity = (item, delta) => {
    setReturnError('');
    const remainingQty = (item.quantity || 1) - (item.returnedQuantity || 0);
    setSelectedReturnItems((prev) => {
      const current = prev[item.id] || 1;
      const nextQty = Math.max(1, Math.min(remainingQty, current + delta));
      return {
        ...prev,
        [item.id]: nextQty,
      };
    });
  };

  // Select all eligible items
  const handleSelectAllEligible = () => {
    if (!selectedOrder?.items) return;
    setReturnError('');
    const all = {};
    selectedOrder.items.forEach((item) => {
      const remainingQty = (item.quantity || 1) - (item.returnedQuantity || 0);
      const isEligible = remainingQty > 0 && item.isReturnEligible !== false;
      if (isEligible) {
        all[item.id] = remainingQty;
      }
    });
    setSelectedReturnItems(all);
  };

  // Clear item selections
  const handleDeselectAll = () => {
    setSelectedReturnItems({});
    setReturnError('');
  };

  // Step 1 Validation -> Proceed to Confirmation
  const handleProceedToReturnConfirm = () => {
    const selectedIds = Object.keys(selectedReturnItems);
    if (selectedIds.length === 0) {
      setReturnError('Please select at least one item to proceed with the return.');
      return;
    }

    for (const id of selectedIds) {
      const item = selectedOrder.items?.find((i) => i.id === id);
      if (!item) continue;
      const remainingQty = (item.quantity || 1) - (item.returnedQuantity || 0);
      const chosenQty = selectedReturnItems[id];
      if (chosenQty < 1 || chosenQty > remainingQty) {
        setReturnError(`Invalid return quantity for ${item.name}. Maximum returnable is ${remainingQty}.`);
        return;
      }
    }

    setReturnError('');
    setReturnStep('confirm');
  };

  // Calculate return items summary and total refund
  const returnSummary = useMemo(() => {
    if (!selectedOrder?.items) return { items: [], totalRefund: 0, totalUnits: 0 };
    const itemsList = [];
    let totalRefund = 0;
    let totalUnits = 0;

    Object.entries(selectedReturnItems).forEach(([id, qty]) => {
      const item = selectedOrder.items.find((i) => i.id === id);
      if (item && qty > 0) {
        const itemRefund = Number(item.price || 0) * qty;
        totalRefund += itemRefund;
        totalUnits += qty;
        itemsList.push({
          ...item,
          returnQty: qty,
          refundAmount: itemRefund,
        });
      }
    });

    return { items: itemsList, totalRefund, totalUnits };
  }, [selectedOrder, selectedReturnItems]);

  // Step 2 Submission (Requirement 6)
  const handleSubmitReturnRequest = async () => {
    if (!selectedOrder || returnSummary.items.length === 0) return;
    setSubmittingReturn(true);

    try {
      const returnRequestId = `RET-${Date.now().toString().slice(-5)}`;
      const nowStr = new Date().toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Update item return quantities & statuses
      const updatedItems = selectedOrder.items.map((item) => {
        const returnQty = selectedReturnItems[item.id];
        if (returnQty) {
          const newReturnedQty = (item.returnedQuantity || 0) + returnQty;
          return {
            ...item,
            returnedQuantity: newReturnedQty,
            returnStatus: newReturnedQty >= item.quantity ? 'Returned' : 'Partially Returned',
            lastReturnDate: nowStr,
            lastReturnReason: selectedReturnReason,
          };
        }
        return item;
      });

      const allItemsFullyReturned = updatedItems.every(
        (i) => (i.returnedQuantity || 0) >= i.quantity
      );

      const newReturnRecord = {
        requestId: returnRequestId,
        requestDate: nowStr,
        reason: selectedReturnReason,
        remarks: returnRemarks.trim(),
        refundMode: selectedRefundMode === 'wallet' ? 'MediUnify Health Wallet' : 'Original Payment Source',
        refundAmount: returnSummary.totalRefund,
        items: returnSummary.items.map((i) => ({
          name: i.name,
          quantity: i.returnQty,
          price: i.price,
          refund: i.refundAmount,
        })),
        status: 'Return request submitted successfully. Pickup within 24-48 hours.',
      };

      const updatedOrder = {
        ...selectedOrder,
        status: allItemsFullyReturned ? 'Returned' : 'Partially Returned',
        returnRequested: true,
        returnStatus: 'Return Request Active • Pickup scheduled within 24-48 hours',
        items: updatedItems,
        returnRequests: [newReturnRecord, ...(selectedOrder.returnRequests || [])],
      };

      const updatedOrders = orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o));
      setOrders(updatedOrders);
      setSelectedOrder(updatedOrder);

      await saveMedicineOrders(updatedOrders);

      setSubmittingReturn(false);
      setActiveModal(null);
      showToast('Return request submitted successfully.');
    } catch (err) {
      console.warn('Error submitting return request:', err);
      setReturnError('Failed to submit return request. Please try again.');
      setSubmittingReturn(false);
    }
  };

  // Helper for demo delivery testing (Requirement 7)
  const handleMarkOrderDelivered = async (orderToDeliver) => {
    const updated = orders.map((o) => {
      if (o.id === orderToDeliver.id) {
        return {
          ...o,
          status: 'Delivered',
          orderStatus: 'Delivered',
          deliveryStatus: 'Delivered to Doorstep',
          deliveredDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          isReturnEligible: true,
          trackingHistory: (o.trackingHistory || []).map((step) => ({
            ...step,
            done: true,
            time: step.time && step.time !== 'Pending' && step.time !== 'In Progress' ? step.time : 'Completed',
          })),
          items: (o.items || []).map((itm) => ({
            ...itm,
            isReturnEligible: true,
            returnedQuantity: itm.returnedQuantity || 0,
            returnStatus: itm.returnStatus || 'Eligible',
          })),
        };
      }
      return o;
    });

    setOrders(updated);
    if (selectedOrder && selectedOrder.id === orderToDeliver.id) {
      setSelectedOrder(updated.find((o) => o.id === orderToDeliver.id));
    }
    await saveMedicineOrders(updated);
    showToast(`Order #${orderToDeliver.id} marked as Delivered. You can now test the Return flow.`);
  };

  // Handle Reorder
  const handleReorder = (order) => {
    if (addToCart && order.items) {
      order.items.forEach((item) => {
        addToCart(
          {
            id: `reorder-${item.id}-${Date.now()}`,
            name: item.name,
            price: item.price,
            category: 'Pharmacy',
            itemType: 'pharmacy',
          },
          item.quantity || 1,
          'pharmacy'
        );
      });
      showToast(`Items from Order #${order.id} added to your cart!`);
      navigation?.navigate('Cart');
    } else {
      showToast(`Items from Order #${order.id} reordered.`);
    }
  };

  // Status badge styling harmonized with web app design system
  const getOrderStatusStyle = (status) => {
    switch (status) {
      case 'Delivered':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', icon: 'checkmark-circle' };
      case 'Out for Delivery':
        return { bg: '#EFF6FF', text: '#1E3A8A', border: '#BFDBFE', icon: 'bicycle' };
      case 'Preparing':
      case 'Confirmed':
      case 'Order Placed':
        return { bg: '#EEF2FF', text: '#1E3A8A', border: '#C7D2FE', icon: 'cube' };
      case 'Return Requested':
      case 'Partially Returned':
        return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', icon: 'return-up-back' };
      case 'Returned':
        return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', icon: 'arrow-undo' };
      case 'Cancelled':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: 'close-circle' };
      default:
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', icon: 'time-outline' };
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && { backgroundColor: '#080E1A', backgroundImage: 'none' }]}>
      {/* Toast Notification */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* Page Hero Banner */}
        <View style={styles.innerContainer}>
          <PatientPageBanner
            onBack={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate('Home')}
            title="My Medicine Orders"
            subtitle="Track shipments, active deliveries, and invoices."
            badgeText="Medicine Orders"
            badgeIcon="medkit"
            iconName="cart"
            theme="navy"
            pills={[
              {
                label: `Active: ${orders.filter((o) => ['Order Placed', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.status)).length} Orders`,
                bgColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                textColor: '#047857',
                icon: 'bicycle-outline',
              },
              {
                label: `Delivered: ${orders.filter((o) => ['Delivered', 'Returned', 'Partially Returned'].includes(o.status)).length} Orders`,
                bgColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                textColor: '#1E3A8A',
                icon: 'checkmark-done-circle-outline',
              },
            ]}
            rightContent={
              <TouchableOpacity
                style={styles.organicHeroBtn}
                onPress={() => navigation?.navigate('Pharmacy')}
                activeOpacity={0.85}
              >
                <View style={styles.organicHeroArrowCircle}>
                  <Ionicons name="arrow-forward" size={13} color="#13BE9C" />
                </View>
                <Text style={styles.organicHeroBtnText}>Order Medicine</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <View style={[styles.innerContainer, { paddingTop: 6, paddingBottom: 60 }]}>
          {/* Controls: Search & Tabs */}
          <View style={styles.controlsCard}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#13BE9C" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search medicines or Order ID (#UNC...)"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipsRow}>
              {STATUS_FILTERS.map((filter) => {
                const count =
                  filter === 'All Orders'
                    ? orders.length
                    : filter === 'Active'
                    ? orders.filter((o) => ['Order Placed', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.status)).length
                    : filter === 'Delivered'
                    ? orders.filter((o) => ['Delivered', 'Returned', 'Partially Returned'].includes(o.status)).length
                    : filter === 'Return Requested'
                    ? orders.filter((o) => o.status === 'Return Requested' || o.returnRequested || o.status === 'Partially Returned').length
                    : orders.filter((o) => (o.status || '').toLowerCase() === filter.toLowerCase()).length;
                const active = selectedFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setSelectedFilter(filter)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {filter}
                    </Text>
                    <View style={[styles.statusChipCountBadge, active && styles.statusChipCountBadgeActive]}>
                      <Text style={[styles.statusChipCountText, active && styles.statusChipCountTextActive]}>
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* =========================================================
              STATES: LOADING, ERROR, EMPTY, LIST (Requirement 8)
          ========================================================= */}

          {isGuestMode ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#E6F8F4' }]}>
                <Ionicons name="cart-outline" size={42} color={BRAND.TEAL} />
              </View>
              <Text style={styles.emptyTitle}>Login to view your medicine orders</Text>
              <Text style={styles.emptyDesc}>
                Please sign in to view your placed medicine orders, doorstep deliveries, and invoices.
              </Text>
              <TouchableOpacity
                style={[styles.browsePharmacyBtn, { marginTop: 18, alignSelf: 'center', paddingHorizontal: 32 }]}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                  }
                  navigation?.navigate('Login', { openAuthModal: true });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.browsePharmacyBtnText}>Login</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            /* 1. SKELETON / LOADING UI */
            <View style={styles.skeletonContainer}>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonTopBar} />
                <View style={styles.skeletonMetaRow}>
                  <View style={styles.skeletonBoxLarge} />
                  <View style={styles.skeletonBoxSmall} />
                </View>
                <View style={styles.skeletonItemRow} />
                <View style={styles.skeletonItemRow} />
              </View>
              <View style={styles.skeletonCard}>
                <View style={styles.skeletonTopBar} />
                <View style={styles.skeletonMetaRow}>
                  <View style={styles.skeletonBoxLarge} />
                  <View style={styles.skeletonBoxSmall} />
                </View>
                <View style={styles.skeletonItemRow} />
              </View>
              <View style={styles.loadingSpinnerWrap}>
                <ActivityIndicator size="large" color={BRAND.TEAL} />
                <Text style={styles.loadingText}>Fetching your authenticated pharmacy orders...</Text>
              </View>
            </View>
          ) : error ? (
            /* 2. ERROR STATE */
            <View style={styles.errorCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle-outline" size={48} color={BRAND.CORAL} />
              </View>
              <Text style={styles.errorTitle}>Unable to load your medicine orders</Text>
              <Text style={styles.errorDesc}>
                We encountered an issue synchronizing your pharmacy orders. Please check your network and try again.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredOrders.length === 0 ? (
            /* 3. EMPTY STATE (Requirement 8) */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cart-outline" size={42} color={BRAND.TEAL} />
              </View>
              <Text style={styles.emptyTitle}>No medicine orders yet</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery || selectedFilter !== 'All Orders'
                  ? 'No medicine orders match your current filter criteria.'
                  : 'Your pharmacy orders will appear here after you place an order.'}
              </Text>
              <TouchableOpacity
                style={styles.browsePharmacyBtn}
                onPress={() => navigation?.navigate('Pharmacy')}
                activeOpacity={0.85}
              >
                <Ionicons name="medkit-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.browsePharmacyBtnText}>Order Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* 4. ORDERS LIST (Requirements 1, 2, 3) */
            <View style={styles.ordersList}>
              {paginatedOrders.map((order) => {
                const badge = getOrderStatusStyle(order.status);
                const isDelivered = ['Delivered', 'Returned', 'Partially Returned'].includes(order.status);
                const isDeliveredOrReturnable = order.status === 'Delivered';

                // Check how many items can still be returned
                const returnableItemsCount = (order.items || []).filter((item) => {
                  const rem = (item.quantity || 1) - (item.returnedQuantity || 0);
                  return rem > 0 && item.isReturnEligible !== false;
                }).length;

                return (
                  <View key={order.id} style={styles.orderCard}>
                    {/* Top Row: Order ID + Date + Status Badge */}
                    <View style={styles.orderTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Text style={styles.orderIdText}>Order #{order.id}</Text>
                        <Text style={styles.orderDateText}>Placed on {order.orderDate || order.date}</Text>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Ionicons name={badge.icon} size={13} color={badge.text} style={{ marginRight: 5 }} />
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{order.status}</Text>
                      </View>
                    </View>

                    <View style={styles.orderBody}>
                      {/* Delivery Destination & Status Block */}
                      <View style={styles.deliveryMetaRow}>
                        <View style={styles.deliveryAddressBlock}>
                          <View style={styles.deliveryAddressHeader}>
                            <View style={styles.deliveryIconCircle}>
                              <Ionicons name="location" size={13} color="#1E3A8A" />
                            </View>
                            <Text style={styles.deliveryAddressTitle}>Delivery Address</Text>
                            <View style={styles.verifiedAddressBadge}>
                              <Ionicons name="shield-checkmark" size={11} color="#047857" style={{ marginRight: 3 }} />
                              <Text style={styles.verifiedAddressBadgeText}>Verified</Text>
                            </View>
                          </View>
                          <Text style={styles.deliveryAddressText}>
                            {formatCleanAddress(order.deliveryAddress || order.address?.addressLine)}
                          </Text>
                          {(order.address?.recipientName || order.recipientName || order.address?.name || patient?.name) ? (
                            <Text style={styles.recipientInfoText}>
                              Recipient: <Text style={{ fontWeight: '600', color: '#1E293B' }}>{order.address?.recipientName || order.recipientName || order.address?.name || patient?.name}</Text>
                              {(order.address?.phone || order.recipientPhone) ? ` • ${order.address?.phone || order.recipientPhone}` : ''}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.deliveryPillar}>
                          <Text style={styles.deliveryLabel}>
                            {isDelivered ? 'Delivery Status' : 'Order Status'}
                          </Text>
                          <Text style={styles.deliveryValue}>
                            {order.deliveredDate ? `Delivered on ${order.deliveredDate}` : order.deliveryStatus || order.expectedDelivery || 'Preparing Order at Pharmacy'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                            <Ionicons
                              name={order.paymentStatus?.toLowerCase().includes('paid') ? 'checkmark-circle' : 'time-outline'}
                              size={13}
                              color={order.paymentStatus?.toLowerCase().includes('paid') ? '#047857' : '#EA580C'}
                            />
                            <Text style={[styles.paymentStatusText, order.paymentStatus?.toLowerCase().includes('paid') && { color: '#047857' }]}>
                              {formatCleanPayment(order.paymentStatus)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Visual Tracking Stepper for Active / Delivered Orders */}
                      {order.trackingHistory && order.status !== 'Cancelled' && (() => {
                        const isOrderDelivered = ['delivered', 'returned', 'partially returned'].includes((order.status || '').toLowerCase());
                        const activeTrackColor = '#13BE9C';

                        return (
                          <View style={styles.trackingStepperCard}>
                            <View style={styles.trackingHeaderRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="trail-sign-outline" size={13} color="#1E3A8A" style={{ marginRight: 6 }} />
                                <Text style={styles.trackingHeader}>Delivery Progress</Text>
                              </View>
                              {isOrderDelivered && (
                                <View style={styles.deliveredStepperBadge}>
                                  <Ionicons name="checkmark-circle" size={11} color="#047857" style={{ marginRight: 3 }} />
                                  <Text style={styles.deliveredStepperBadgeText}>Completed</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.stepperContainer}>
                              <View style={styles.stepperRow}>
                                {order.trackingHistory.map((step, idx) => {
                                  const isLast = idx === order.trackingHistory.length - 1;
                                  const isStepDone = isOrderDelivered || (() => {
                                    const s = (order.status || '').toLowerCase();
                                    if (s === 'out for delivery') return idx <= 3;
                                    if (s === 'preparing') return idx <= 2;
                                    if (s === 'confirmed') return idx <= 1;
                                    if (s === 'order placed') return idx === 0;
                                    return !!step.done;
                                  })();
                                  const isNextDone = !isLast && (isOrderDelivered || (() => {
                                    const s = (order.status || '').toLowerCase();
                                    if (s === 'out for delivery') return idx + 1 <= 3;
                                    if (s === 'preparing') return idx + 1 <= 2;
                                    if (s === 'confirmed') return idx + 1 <= 1;
                                    return !!order.trackingHistory[idx + 1]?.done;
                                  })());
                                  const shortTitle = getShortStepTitle(step.title);

                                  let displayTime = step.time || 'Pending';
                                  if (isOrderDelivered) {
                                    if (displayTime === 'Pending' || displayTime === 'In Progress') {
                                      displayTime = 'Completed';
                                    }
                                  } else if (isStepDone && displayTime === 'Pending') {
                                    displayTime = 'Completed';
                                  }

                                  return (
                                    <View key={idx} style={styles.stepCol}>
                                      <View style={styles.stepIconWrap}>
                                        <View style={[
                                          styles.stepDot,
                                          isStepDone && { backgroundColor: activeTrackColor, borderColor: activeTrackColor }
                                        ]}>
                                          <Ionicons
                                            name={isStepDone ? 'checkmark' : 'ellipse'}
                                            size={10}
                                            color={isStepDone ? '#FFFFFF' : '#CBD5E1'}
                                          />
                                        </View>
                                        {!isLast && (
                                          <View style={[
                                            styles.stepConnectorLine,
                                            isNextDone && { backgroundColor: activeTrackColor }
                                          ]} />
                                        )}
                                      </View>
                                      <Text style={[styles.stepTitle, isStepDone && styles.stepTitleDone]} numberOfLines={1}>
                                        {shortTitle}
                                      </Text>
                                      <Text style={[styles.stepTime, isStepDone && isOrderDelivered && { color: '#047857', fontWeight: '500' }]}>
                                        {displayTime}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          </View>
                        );
                      })()}

                      {/* Return Requested Callout if Active */}
                      {(order.status === 'Return Requested' || order.returnRequested || order.status === 'Partially Returned') && (
                        <View style={styles.returnNoticeBox}>
                          <Ionicons name="refresh-circle" size={18} color="#EA580C" style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', color: '#9A3412', fontSize: 12.5 }}>
                              Return Active: {order.returnRequests?.[0]?.reason || order.returnReason || 'Item Return Initiated'}
                            </Text>
                            <Text style={{ fontSize: 11.5, color: '#C2410C', marginTop: 2 }}>
                              {order.returnStatus || 'A pickup executive will arrive within 24-48 hours.'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Compact Medicine Order Summary (Full tablets list available via Order Details) */}
                      <TouchableOpacity
                        style={styles.compactOrderSummaryBar}
                        onPress={() => {
                          setSelectedOrder(order);
                          setActiveModal('details');
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.compactSummaryLeft}>
                          <View style={styles.compactMedIconCircle}>
                            <Ionicons name="medkit" size={13} color="#13BE9C" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.compactItemCountText}>
                                {order.items?.length || 0} {order.items?.length === 1 ? 'Item' : 'Items'} Ordered
                              </Text>
                              <Text style={styles.viewItemsLinkText}>• View in Details →</Text>
                            </View>
                            <Text style={styles.compactItemsPreviewText} numberOfLines={1}>
                              {order.items?.map((item) => splitMedNameAndSpecs(item.name).name).filter(Boolean).join(', ')}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.compactSummaryRight}>
                          <Text style={styles.compactTotalLabel}>Total Paid</Text>
                          <Text style={styles.compactTotalAmount}>₹{order.totalAmount || order.total}</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Action Buttons Row */}
                      <View style={styles.orderActionsRow}>
                        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* View Details Button */}
                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => {
                              setSelectedOrder(order);
                              setActiveModal('details');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.organicArrowCircle}>
                              <Ionicons name="arrow-forward" size={12} color="#13BE9C" />
                            </View>
                            <Text style={styles.organicPrimaryActionText}>Order Details ({order.items?.length || 0})</Text>
                          </TouchableOpacity>

                          {/* Invoice Button */}
                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => {
                              setSelectedOrder(order);
                              setActiveModal('invoice');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.organicActionIconCircle}>
                              <Ionicons name="document-text-outline" size={12} color="#13BE9C" />
                            </View>
                            <Text style={styles.organicActionText}>Invoice</Text>
                          </TouchableOpacity>

                          {/* Support Button */}
                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => {
                              setSelectedOrder(order);
                              setActiveModal('contact');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.organicActionIconCircle}>
                              <Ionicons name="headset-outline" size={12} color="#13BE9C" />
                            </View>
                            <Text style={styles.organicActionText}>Support</Text>
                          </TouchableOpacity>

                          {/* Demo Testing Helper: Mark Delivered */}
                          {!isDelivered && (
                            <TouchableOpacity
                              style={styles.organicActionBtn}
                              onPress={() => handleMarkOrderDelivered(order)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.organicActionIconCircle}>
                                <Ionicons name="checkmark-done" size={12} color="#13BE9C" />
                              </View>
                              <Text style={styles.organicActionText}>Mark Delivered</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Return Items & Reorder Actions */}
                        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                          {isDeliveredOrReturnable && returnableItemsCount > 0 && (
                            <TouchableOpacity
                              style={styles.organicActionBtn}
                              onPress={() => handleOpenReturnModal(order)}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.organicActionIconCircle, { borderColor: '#EA580C' }]}>
                                <Ionicons name="return-down-back-outline" size={12} color="#EA580C" />
                              </View>
                              <Text style={[styles.organicActionText, { color: '#EA580C' }]}>Return Items</Text>
                            </TouchableOpacity>
                          )}

                          {isDelivered && (
                            <TouchableOpacity
                              style={styles.organicActionBtn}
                              onPress={() => handleReorder(order)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.organicArrowCircle}>
                                <Ionicons name="repeat-outline" size={12} color="#13BE9C" />
                              </View>
                              <Text style={styles.organicPrimaryActionText}>Reorder</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {filteredOrders.length > 0 && (
                <PaginationBar
                  currentPage={currentPage}
                  totalItems={filteredOrders.length}
                  pageSize={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  itemLabel="medicine orders"
                />
              )}
            </View>
          )}
        </View>
        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* =========================================================
          MODAL 1: ORDER DETAILS MODAL (Requirement 1 & 6)
      ========================================================= */}
      <Modal visible={activeModal === 'details'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order Breakdown & Details</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.id} • {selectedOrder?.orderDate || selectedOrder?.date}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color={BRAND.SLATE} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* Delivery Destination & Recipient Summary (Pharmacy name removed) */}
                <View style={styles.modalSectionCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="location" size={18} color={BRAND.TEAL} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: BRAND.NAVY }}>
                      Delivery Address & Recipient
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 8 }}>
                    {selectedOrder?.address?.recipientName || selectedOrder?.recipientName || selectedOrder?.address?.name || selectedOrder?.patientName || patient?.name || 'Hemanth Gowda'}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#334155', marginTop: 3, lineHeight: 18 }}>
                    {selectedOrder?.deliveryAddress || selectedOrder?.address?.addressLine || 'Vishwashanti Road, Sriramapura, Mysuru, Karnataka, 570001, India'}
                  </Text>
                  <Text style={{ fontSize: 12, color: BRAND.SLATE, marginTop: 4 }}>
                    Contact Phone: {selectedOrder?.address?.phone || selectedOrder?.recipientPhone || selectedOrder?.patientPhone || patient?.phone || '+91 98450 12345'}
                  </Text>
                </View>

                {/* Multi-Item Breakdown */}
                <Text style={[styles.modalSectionTitle, { marginTop: 16 }]}>Ordered Medicines & Dosages</Text>
                <View style={styles.itemizedTable}>
                  {selectedOrder?.items?.map((item, idx) => {
                    const isReturned = (item.returnedQuantity || 0) >= item.quantity;
                    const isPartReturned = (item.returnedQuantity || 0) > 0 && !isReturned;

                    return (
                      <View key={item.id || idx} style={styles.itemizedRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{item.name}</Text>
                          <Text style={{ fontSize: 11.5, color: BRAND.SLATE, marginTop: 2 }}>
                            Strength: {item.strength || 'Standard'} • Purchased: {item.quantity} units
                          </Text>

                          {isReturned ? (
                            <View style={styles.itemReturnedBadge}>
                              <Text style={styles.itemReturnedBadgeText}>Returned: {item.returnedQuantity} units</Text>
                            </View>
                          ) : isPartReturned ? (
                            <View style={[styles.itemReturnedBadge, { backgroundColor: BRAND.CORAL_LIGHT, borderColor: BRAND.CORAL_BORDER }]}>
                              <Text style={[styles.itemReturnedBadgeText, { color: '#C84E23' }]}>
                                Partially Returned: {item.returnedQuantity} of {item.quantity} units
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: BRAND.NAVY }}>
                            ₹{item.total || Number(item.price || 0) * Number(item.quantity || 1)}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#94A3B8' }}>₹{item.price} each</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Return Request History if Any (Requirement 6 - Coral Accent) */}
                {selectedOrder?.returnRequests && selectedOrder.returnRequests.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.modalSectionTitle}>Return Request Status</Text>
                    {selectedOrder.returnRequests.map((req, rIdx) => (
                      <View key={req.requestId || rIdx} style={styles.returnHistoryCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#C84E23' }}>
                            Request #{req.requestId}
                          </Text>
                          <Text style={{ fontSize: 11, color: BRAND.SLATE }}>{req.requestDate}</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                          Reason: <Text style={{ fontWeight: '600' }}>{req.reason}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: '#237804', fontWeight: '700', marginTop: 2 }}>
                          Refund Credit: ₹{req.refundAmount} via {req.refundMode}
                        </Text>
                        <View style={styles.returnStatusBadgeRow}>
                          <Ionicons name="checkmark-done-circle" size={14} color={BRAND.CORAL} />
                          <Text style={{ fontSize: 11.5, color: '#C84E23', fontWeight: '700' }}>
                            {req.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Financial Summary */}
                <View style={styles.summaryWrap}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryVal}>
                      ₹{selectedOrder?.subtotal || (selectedOrder?.totalAmount ? selectedOrder.totalAmount - 5 : 0)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Charges</Text>
                    <Text style={[styles.summaryVal, { color: '#237804' }]}>
                      {selectedOrder?.deliveryFee ? `₹${selectedOrder.deliveryFee}` : 'FREE'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Packaging & Safety Seal</Text>
                    <Text style={styles.summaryVal}>₹{selectedOrder?.packagingFee || 5}</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Total Amount Paid</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.TEAL }}>₹{selectedOrder?.totalAmount || selectedOrder?.total}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              {selectedOrder?.status === 'Delivered' && (
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: BRAND.CORAL }]}
                  onPress={() => {
                    setActiveModal(null);
                    handleOpenReturnModal(selectedOrder);
                  }}
                >
                  <Ionicons name="return-down-back-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalPrimaryBtnText}>Return Items</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 2: ITEM-LEVEL RETURN MODAL (Requirements 4, 5, 6)
      ========================================================= */}
      <Modal visible={activeModal === 'return'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { maxWidth: 620 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: BRAND.NAVY }]}>
                  {returnStep === 'select' ? 'Select Items to Return' : 'Return Selected Items'}
                </Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.id} • Individual Item Returns</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color={BRAND.SLATE} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {returnStep === 'select' ? (
                  /* ------------------------------------------------------------------
                     STEP 1: ITEM SELECTION & QUANTITIES (Requirements 4 & 5)
                  ------------------------------------------------------------------ */
                  <View>
                    <View style={styles.returnInfoPill}>
                      <Ionicons name="information-circle" size={18} color={BRAND.CORAL} style={{ marginRight: 6 }} />
                      <Text style={styles.returnInfoPillText}>
                        Choose the individual medicine(s) you wish to return. You can return single items, multiple items, or specify partial quantities.
                      </Text>
                    </View>

                    {/* Quick Select Actions */}
                    <View style={styles.quickSelectRow}>
                      <TouchableOpacity style={styles.quickSelectBtn} onPress={handleSelectAllEligible} activeOpacity={0.7}>
                        <Ionicons name="checkmark-done" size={14} color={BRAND.TEAL} />
                        <Text style={styles.quickSelectBtnText}>Select All Eligible</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickSelectBtn} onPress={handleDeselectAll} activeOpacity={0.7}>
                        <Ionicons name="close" size={14} color={BRAND.SLATE} />
                        <Text style={[styles.quickSelectBtnText, { color: BRAND.SLATE }]}>Clear Selection</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Error Banner if validation fails */}
                    {returnError ? (
                      <View style={styles.validationErrorBanner}>
                        <Ionicons name="alert-circle" size={16} color="#FF7F50" />
                        <Text style={styles.validationErrorText}>{returnError}</Text>
                      </View>
                    ) : null}

                    {/* Itemized Selection Cards */}
                    <View style={{ gap: 10, marginTop: 10 }}>
                      {selectedOrder?.items?.map((item) => {
                        const remainingQty = (item.quantity || 1) - (item.returnedQuantity || 0);
                        const isAlreadyReturned = remainingQty <= 0;
                        const isNonReturnable = item.isReturnEligible === false;
                        const isEligible = !isAlreadyReturned && !isNonReturnable;

                        const isSelected = Boolean(selectedReturnItems[item.id]);
                        const currentChosenQty = selectedReturnItems[item.id] || 1;

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.returnItemCard,
                              isSelected && styles.returnItemCardSelected,
                              !isEligible && styles.returnItemCardDisabled,
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                              {/* Checkbox */}
                              <TouchableOpacity
                                disabled={!isEligible}
                                onPress={() => handleToggleItemSelection(item)}
                                style={[
                                  styles.itemCheckbox,
                                  isSelected && styles.itemCheckboxChecked,
                                  !isEligible && styles.itemCheckboxDisabled,
                                ]}
                                activeOpacity={0.8}
                              >
                                {isSelected ? (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                ) : null}
                              </TouchableOpacity>

                              {/* Item Details */}
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Text style={[styles.returnItemTitle, !isEligible && { color: '#94A3B8' }]}>
                                    {item.name}
                                  </Text>
                                  <Text style={styles.returnItemUnitPrice}>₹{item.price} each</Text>
                                </View>

                                <Text style={styles.returnItemMetaText}>
                                  Purchased: {item.quantity} units {item.strength ? `• ${item.strength}` : ''}
                                </Text>

                                {/* Ineligibility Badge (Requirement 5) */}
                                {!isEligible ? (
                                  <View style={styles.ineligibleBadge}>
                                    <Ionicons name="ban-outline" size={12} color="#DC2626" />
                                    <Text style={styles.ineligibleBadgeText}>
                                      Not eligible for return: {isAlreadyReturned ? 'Already returned' : 'Hygiene / Non-returnable item'}
                                    </Text>
                                  </View>
                                ) : (
                                  <View style={{ marginTop: 8 }}>
                                    {isSelected ? (
                                      /* Quantity Selector for eligible checked item (Requirement 4) */
                                      <View style={styles.qtySelectorWrap}>
                                        <Text style={styles.qtySelectorLabel}>Return Quantity:</Text>
                                        <View style={styles.qtyControlRow}>
                                          <TouchableOpacity
                                            style={[styles.qtyBtn, currentChosenQty <= 1 && styles.qtyBtnDisabled]}
                                            disabled={currentChosenQty <= 1}
                                            onPress={() => handleChangeReturnQuantity(item, -1)}
                                          >
                                            <Ionicons name="remove" size={14} color={currentChosenQty <= 1 ? '#94A3B8' : '#0F172A'} />
                                          </TouchableOpacity>
                                          <Text style={styles.qtyNumberText}>{currentChosenQty}</Text>
                                          <TouchableOpacity
                                            style={[styles.qtyBtn, currentChosenQty >= remainingQty && styles.qtyBtnDisabled]}
                                            disabled={currentChosenQty >= remainingQty}
                                            onPress={() => handleChangeReturnQuantity(item, 1)}
                                          >
                                            <Ionicons name="add" size={14} color={currentChosenQty >= remainingQty ? '#94A3B8' : '#0F172A'} />
                                          </TouchableOpacity>
                                        </View>
                                        <Text style={styles.itemRefundSubtotal}>
                                          Refund: ₹{(item.price || 0) * currentChosenQty}
                                        </Text>
                                      </View>
                                    ) : (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="checkmark-circle" size={13} color="#237804" />
                                        <Text style={{ fontSize: 11.5, color: '#237804', fontWeight: '600' }}>
                                          Eligible for return ({remainingQty} available)
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* Subtotal Preview */}
                    <View style={styles.returnPreviewBar}>
                      <Text style={{ fontSize: 12.5, color: '#475569', fontWeight: '600' }}>
                        Selected: <Text style={{ color: BRAND.NAVY, fontWeight: '800' }}>{returnSummary.totalUnits} items</Text>
                      </Text>
                      <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '800' }}>
                        Estimated Refund: <Text style={{ color: BRAND.TEAL }}>₹{returnSummary.totalRefund}</Text>
                      </Text>
                    </View>
                  </View>
                ) : (
                  /* ------------------------------------------------------------------
                     STEP 2: CONFIRMATION & RETURN REASON (Requirement 6)
                  ------------------------------------------------------------------ */
                  <View>
                    <View style={styles.confirmHeaderCard}>
                      <Ionicons name="shield-checkmark" size={24} color={BRAND.TEAL} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: BRAND.NAVY }}>
                          Review Selected Items for Return
                        </Text>
                        <Text style={{ fontSize: 12, color: BRAND.SLATE }}>
                          Free doorstep inspection & pickup within 24-48 hours
                        </Text>
                      </View>
                    </View>

                    {/* Selected Items Breakdown (Requirement 6) */}
                    <Text style={[styles.modalSectionTitle, { marginTop: 14 }]}>Selected Items to Return</Text>
                    <View style={styles.itemizedTable}>
                      {returnSummary.items.map((i) => (
                        <View key={i.id} style={styles.itemizedRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{i.name}</Text>
                            <Text style={{ fontSize: 12, color: BRAND.SLATE }}>
                              Quantity to Return: <Text style={{ fontWeight: '700', color: BRAND.NAVY }}>{i.returnQty}</Text> of {i.quantity} units
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: BRAND.TEAL }}>
                            ₹{i.refundAmount}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Refund Amount (Requirement 6 - Green Accent) */}
                    <View style={styles.refundCalloutBox}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>Total Refund Amount:</Text>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: '#237804' }}>₹{returnSummary.totalRefund}</Text>
                    </View>

                    {/* Refund Mode Selection */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Refund Destination</Text>
                    <TouchableOpacity
                      style={[styles.refundModeBtn, selectedRefundMode === 'wallet' && styles.refundModeBtnActive]}
                      onPress={() => setSelectedRefundMode('wallet')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={selectedRefundMode === 'wallet' ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={selectedRefundMode === 'wallet' ? BRAND.TEAL : '#94A3B8'}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          MediUnify Health Wallet (Instant Credit)
                        </Text>
                        <Text style={{ fontSize: 11.5, color: BRAND.SLATE }}>Immediate credit upon courier verification</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.refundModeBtn, selectedRefundMode === 'source' && styles.refundModeBtnActive]}
                      onPress={() => setSelectedRefundMode('source')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={selectedRefundMode === 'source' ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={selectedRefundMode === 'source' ? BRAND.TEAL : '#94A3B8'}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          Original Payment Source (Bank / UPI / Card)
                        </Text>
                        <Text style={{ fontSize: 11.5, color: BRAND.SLATE }}>Settlement in 2-3 working days</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Return Reason (Requirement 6 - Coral Accent) */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Reason for Return *</Text>
                    {RETURN_REASONS.map((reason) => (
                      <TouchableOpacity
                        key={reason}
                        style={[styles.returnReasonBtn, selectedReturnReason === reason && styles.returnReasonBtnActive]}
                        onPress={() => setSelectedReturnReason(reason)}
                      >
                        <Ionicons
                          name={selectedReturnReason === reason ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={selectedReturnReason === reason ? BRAND.CORAL : '#94A3B8'}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.returnReasonText, selectedReturnReason === reason && { color: '#C84E23', fontWeight: '700' }]}>
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Optional Comments (Requirement 6) */}
                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Optional Comments / Defect Details</Text>
                    <TextInput
                      style={[styles.modalInput, { height: 60 }]}
                      value={returnRemarks}
                      onChangeText={setReturnRemarks}
                      placeholder="Describe any seal damage, broken bottle, or specific batch issue..."
                      placeholderTextColor="#94A3B8"
                      multiline
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {returnStep === 'select' ? (
                <>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { backgroundColor: BRAND.TEAL }]}
                    onPress={handleProceedToReturnConfirm}
                    disabled={Object.keys(selectedReturnItems).length === 0}
                  >
                    <Text style={styles.modalPrimaryBtnText}>
                      Continue to Return Request →
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setReturnStep('select')}>
                    <Text style={styles.modalCancelBtnText}>← Back to Items</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { backgroundColor: BRAND.CORAL }]}
                    onPress={handleSubmitReturnRequest}
                    disabled={submittingReturn}
                  >
                    <Text style={styles.modalPrimaryBtnText}>
                      {submittingReturn ? 'Submitting Request...' : 'Submit Return Request'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 3: INVOICE MODAL
      ========================================================= */}
      <Modal visible={activeModal === 'invoice'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Tax Invoice</Text>
                <Text style={styles.modalSubtitle}>Invoice #{selectedOrder?.invoiceNumber || `INV-MU-${selectedOrder?.id}`}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color={BRAND.SLATE} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.invoiceHeaderBox}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.NAVY }}>
                    MediUnify Healthcare Deliveries
                  </Text>
                  <Text style={{ fontSize: 11, color: BRAND.SLATE }}>GSTIN: 29AABCP8892K1Z9 • Drug License: KA-MYS-02849</Text>
                  <Text style={{ fontSize: 11, color: BRAND.SLATE }}>Billed to: {selectedOrder?.address?.recipientName || selectedOrder?.address?.name || selectedOrder?.recipientName || patient?.name || 'Hemanth Gowda'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>Date: {selectedOrder?.orderDate || selectedOrder?.date}</Text>
                  <Text style={{ fontSize: 11, color: '#237804', fontWeight: '800' }}>PAID ONLINE</Text>
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                  Itemized Summary:
                </Text>
                {selectedOrder?.items?.map((item, idx) => (
                  <View key={item.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, color: '#334155' }}>
                      {item.name} ({item.quantity}x)
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.NAVY }}>
                      ₹{item.total || Number(item.price || 0) * Number(item.quantity || 1)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={[styles.totalRow, { marginTop: 16 }]}>
                <Text style={styles.totalLabel}>Total Invoice Value (Incl. GST):</Text>
                <Text style={styles.totalAmount}>₹{selectedOrder?.totalAmount || selectedOrder?.total}</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  showToast('GST Tax Invoice downloaded successfully.');
                  setActiveModal(null);
                }}
              >
                <Ionicons name="download-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 4: ORDER & DELIVERY SUPPORT MODAL
      ========================================================= */}
      <Modal visible={activeModal === 'contact'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order & Delivery Support</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.id} • MediUnify Logistics</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color={BRAND.SLATE} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.contactItem}>
                <View style={styles.contactIconWrap}>
                  <Ionicons name="headset-outline" size={20} color={BRAND.TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactTitle}>MediUnify Care Desk (Toll-Free)</Text>
                  <Text style={styles.contactSubtitle}>1800-890-4422 (24/7 Priority Support)</Text>
                </View>
                <TouchableOpacity
                  style={styles.callNowBtn}
                  onPress={() => Linking.openURL('tel:18008904422')}
                >
                  <Text style={styles.callNowBtnText}>Call</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.contactItem}>
                <View style={[styles.contactIconWrap, { backgroundColor: BRAND.GREEN_LIGHT }]}>
                  <Ionicons name="logo-whatsapp" size={20} color="#237804" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactTitle}>Live Delivery Support</Text>
                  <Text style={styles.contactSubtitle}>Track courier rider or request safe doorstep drop</Text>
                </View>
                <TouchableOpacity
                  style={[styles.callNowBtn, { backgroundColor: '#237804' }]}
                  onPress={() => Linking.openURL('https://wa.me/918212548901')}
                >
                  <Text style={styles.callNowBtnText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const MyMedicineOrdersScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  if (!isDesktopLayout(width)) {
    return <MyMedicineOrdersScreenMobile {...props} />;
  }
  return <MyMedicineOrdersScreenWeb {...props} />;
};

export default MyMedicineOrdersScreenResponsive;

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  innerContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 9999,
    backgroundColor: BRAND.NAVY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 8px 24px rgba(30, 58, 138, 0.25)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // Image 2 Exact Hero CTA (Circular Outline Arrow + Bold Text in #13BE9C)
  organicHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.8,
    borderColor: '#13BE9C',
    boxShadow: '0 2px 8px rgba(19, 190, 156, 0.15)',
    cursor: 'pointer',
  },
  organicHeroArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicHeroBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#13BE9C',
    letterSpacing: 0.1,
  },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
    gap: 12,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    cursor: 'pointer',
    userSelect: 'none',
  },
  filterChipActive: {
    backgroundColor: '#13BE9C',
    borderColor: '#13BE9C',
    boxShadow: '0 2px 8px rgba(19, 190, 156, 0.2)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    userSelect: 'none',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusChipCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  statusChipCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  statusChipCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  statusChipCountTextActive: {
    color: '#FFFFFF',
  },

  // Skeleton / Loading UI (Requirement 8)
  skeletonContainer: {
    gap: 16,
    paddingVertical: 10,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.SLATE_BORDER,
    padding: 20,
    gap: 14,
  },
  skeletonTopBar: {
    height: 22,
    width: '35%',
    backgroundColor: BRAND.SLATE_BORDER,
    borderRadius: 6,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skeletonBoxLarge: {
    height: 44,
    width: '55%',
    backgroundColor: BRAND.SLATE_LIGHT,
    borderRadius: 8,
  },
  skeletonBoxSmall: {
    height: 44,
    width: '30%',
    backgroundColor: BRAND.SLATE_LIGHT,
    borderRadius: 8,
  },
  skeletonItemRow: {
    height: 36,
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  loadingSpinnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13.5,
    fontWeight: '600',
    color: BRAND.SLATE,
  },

  // Error State (Requirement 8 - Coral Alert)
  errorCard: {
    backgroundColor: BRAND.CORAL_LIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.CORAL_BORDER,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconWrap: {
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#9A3412',
    marginBottom: 6,
  },
  errorDesc: {
    fontSize: 13,
    color: '#C84E23',
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 19,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.CORAL,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Empty State (Requirement 8 - Teal Theme)
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.SLATE_BORDER,
    padding: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BRAND.TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.NAVY,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13.5,
    color: BRAND.SLATE,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  browsePharmacyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.TEAL,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 18,
    boxShadow: '0 4px 14px rgba(0, 139, 148, 0.25)',
  },
  browsePharmacyBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Orders List
  ordersList: {
    gap: 18,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  orderBody: {
    padding: 16,
  },
  orderIdText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  orderDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  deliveryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  deliveryAddressBlock: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  deliveryAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  deliveryIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryAddressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedAddressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 4,
  },
  verifiedAddressBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  deliveryAddressText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  recipientInfoText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  deliveryPillar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    minWidth: 220,
    justifyContent: 'center',
  },
  deliveryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  deliveryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  paymentStatusText: {
    fontSize: 11.5,
    color: '#047857',
    fontWeight: '600',
  },
  trackingStepperCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  trackingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trackingHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  deliveredStepperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  deliveredStepperBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#047857',
  },
  stepperContainer: {
    width: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 2,
  },
  stepIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotDone: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  stepConnectorLine: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
    marginTop: -1,
  },
  stepConnectorLineActive: {
    backgroundColor: '#047857',
  },
  stepTitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
  },
  stepTitleDone: {
    fontWeight: '600',
    color: '#0F172A',
  },
  stepTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 13,
  },
  returnNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  // Multi-Item Medicines Preview
  medicinesPreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  medsHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  medicineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pillIconSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  medItemQty: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  medItemPrice: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemReturnedBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  itemReturnedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C2410C',
  },
  // Compact Order Summary Bar (Tablets List moved to Details Modal)
  compactOrderSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
    marginTop: 2,
    cursor: 'pointer',
  },
  compactSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  compactMedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F8F4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactItemCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewItemsLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#13BE9C',
  },
  compactItemsPreviewText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  compactSummaryRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 14,
  },
  compactTotalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  orderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  // Image 2 Exact Button Design (Circular Outline Icon Ring + Bold Text in #13BE9C)
  organicActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: 'pointer',
  },
  organicArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.8,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicActionIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicPrimaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#13BE9C',
    letterSpacing: 0.1,
  },
  organicActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  demoDeliveredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  demoDeliveredBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  returnBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C2410C',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7.5,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)',
  },
  reorderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 580,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND.NAVY,
  },
  modalSubtitle: {
    fontSize: 12,
    color: BRAND.SLATE,
    marginTop: 2,
  },
  modalCloseIcon: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND.NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  itemizedTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemizedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12.5,
    color: BRAND.SLATE,
  },
  summaryVal: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.TEAL,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },

  // Itemized Return Selection Modal Styles (Coral & Teal Palette)
  returnInfoPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BRAND.CORAL_LIGHT,
    borderWidth: 1,
    borderColor: BRAND.CORAL_BORDER,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  returnInfoPillText: {
    flex: 1,
    fontSize: 12,
    color: '#C84E23',
    lineHeight: 17,
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  quickSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: BRAND.TEAL_LIGHT,
  },
  quickSelectBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BRAND.TEAL,
  },
  validationErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  validationErrorText: {
    fontSize: 12,
    color: '#FF7F50',
    fontWeight: '600',
  },
  returnItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BRAND.SLATE_BORDER,
    borderRadius: 10,
    padding: 12,
  },
  returnItemCardSelected: {
    borderColor: BRAND.TEAL,
    backgroundColor: '#F4FBFC',
  },
  returnItemCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: BRAND.SLATE_BORDER,
    opacity: 0.75,
  },
  itemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemCheckboxChecked: {
    backgroundColor: BRAND.TEAL,
    borderColor: BRAND.TEAL,
  },
  itemCheckboxDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
  returnItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  returnItemUnitPrice: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BRAND.NAVY,
    marginLeft: 8,
  },
  returnItemMetaText: {
    fontSize: 12,
    color: BRAND.SLATE,
    marginTop: 2,
  },
  ineligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  ineligibleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  qtySelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BRAND.TEAL_BORDER,
  },
  qtySelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qtyBtn: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  itemRefundSubtotal: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND.TEAL,
    marginLeft: 'auto',
  },
  returnPreviewBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 14,
  },
  confirmHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.TEAL_LIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND.TEAL_BORDER,
    padding: 12,
  },
  refundCalloutBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BRAND.GREEN_LIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.GREEN_BORDER,
    padding: 12,
    marginTop: 10,
  },
  refundModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  refundModeBtnActive: {
    backgroundColor: BRAND.TEAL_LIGHT,
    borderColor: BRAND.TEAL_BORDER,
  },
  returnReasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  returnReasonBtnActive: {
    backgroundColor: BRAND.CORAL_LIGHT,
    borderColor: BRAND.CORAL,
  },
  returnReasonText: {
    fontSize: 12.5,
    color: '#334155',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BRAND.NAVY,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  returnHistoryCard: {
    backgroundColor: BRAND.CORAL_LIGHT,
    borderWidth: 1,
    borderColor: BRAND.CORAL_BORDER,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  returnStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  invoiceHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#EDF7F9',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBE7EB',
    padding: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBE7EB',
    backgroundColor: '#F7FCFC',
    marginBottom: 10,
  },
  contactIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BRAND.TEAL_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: BRAND.NAVY,
  },
  contactSubtitle: {
    fontSize: 12,
    color: BRAND.SLATE,
    marginTop: 1,
  },
  callNowBtn: {
    backgroundColor: BRAND.TEAL,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  callNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
