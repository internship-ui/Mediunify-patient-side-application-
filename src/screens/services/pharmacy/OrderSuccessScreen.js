import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../theme/colors';
import WebFooter from '../../../components/web/WebFooter';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const OrderSuccessScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const initialOrder = route?.params?.order || null;
  const [order, setOrder] = useState(initialOrder);
  const fallbackOrderId = useMemo(() => `UNC${Math.floor(10000 + Math.random() * 90000)}`, []);

  // If order param wasn't passed directly (e.g. navigation state drop or refresh), restore from storage
  useEffect(() => {
    let isMounted = true;
    if (!order) {
      (async () => {
        try {
          const storedStr = await AsyncStorage.getItem('@mediunify_patient_medicine_orders');
          if (storedStr && isMounted) {
            const list = JSON.parse(storedStr);
            if (Array.isArray(list) && list.length > 0) {
              setOrder(list[0]);
            }
          }
        } catch (e) {
          console.log('[OrderSuccess] Error fetching cached order:', e);
        }
      })();
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const orderId = order?.id || order?.orderId || fallbackOrderId;

  const handleGoHome = useCallback(() => {
    try {
      if (typeof navigation.reset === 'function') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        return;
      }
    } catch (e) {}
    try {
      navigation.navigate('Home');
    } catch (e) {}
  }, [navigation]);

  const handleViewOrders = useCallback(() => {
    try {
      navigation.navigate('MyMedicineOrders', {
        orderId: orderId,
        highlightOrderId: orderId,
        autoOpenDetails: true,
      });
      return;
    } catch (e) {}
    try {
      navigation.navigate('MyOrders', {
        orderId: orderId,
        highlightOrderId: orderId,
        autoOpenDetails: true,
      });
      return;
    } catch (e) {}
    handleGoHome();
  }, [orderId, navigation, handleGoHome]);

  const handleContinueShopping = useCallback(() => {
    try {
      navigation.navigate('Pharmacy');
      return;
    } catch (e) {}
    handleGoHome();
  }, [navigation, handleGoHome]);

  // Safe delivery address representation
  const formattedAddress = useMemo(() => {
    if (!order) return 'Registered Delivery Address';
    if (order.address && typeof order.address === 'object') {
      const parts = [
        order.address.addressLine,
        order.address.city,
        order.address.state,
        order.address.pincode,
      ].filter((p) => p && typeof p === 'string' && p.trim().length > 0 && p !== 'undefined');
      if (parts.length > 0) return parts.join(', ');
    }
    if (order.deliveryAddress && typeof order.deliveryAddress === 'string') {
      return order.deliveryAddress;
    }
    return 'Registered Delivery Address';
  }, [order]);

  const recipientName = order?.patientName || order?.address?.name || 'Valued Patient';
  const recipientPhone = order?.patientPhone || order?.address?.phone || '+91 98765 43210';
  const pharmacyStoreName = order?.pharmacyName || 'Apollo Pharmacy (Kuvempunagar)';
  const pharmacyCity = order?.city || 'Mysuru';
  const itemsList = Array.isArray(order?.items) ? order.items : [];
  const totalPayable = order?.total || order?.totalAmount || itemsList.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* TOP HEADER BAR */}
      <View style={styles.topHeader}>
        <View style={styles.headerInner}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleGoHome}
            activeOpacity={0.8}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={isDarkMode ? theme.text : colors.secondary} />
          </TouchableOpacity>

          <Text style={styles.topHeaderTitle}>Order Confirmation</Text>

          <TouchableOpacity
            style={styles.homeIconBtn}
            onPress={handleGoHome}
            activeOpacity={0.8}
            accessibilityLabel="Go to Home"
          >
            <Ionicons name="home-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      >
        <View style={styles.contentWrapper}>
          {/* CELEBRATION ICON */}
          <View style={styles.successRing}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark-sharp" size={44} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.successHeading}>Order Placed Successfully!</Text>
          <Text style={styles.successSub}>
            Thank you for ordering with MediUnify Pharmacy. Your prescription & medicines are verified and being packed for rapid delivery.
          </Text>

          {/* QUICK TRACK & RETURN BANNER */}
          <TouchableOpacity
            style={styles.autoRedirectBanner}
            onPress={handleViewOrders}
            activeOpacity={0.8}
            accessibilityLabel="View Order in My Pharmacy Orders"
          >
            <Ionicons name="receipt-outline" size={16} color="#007D69" />
            <Text style={styles.autoRedirectText}>
              Track live updates & return items in Orders
            </Text>
            <Text style={styles.viewNowLink}>View Order →</Text>
          </TouchableOpacity>

          {/* ESTIMATED ARRIVAL BANNER */}
          <View style={styles.etaCard}>
            <View style={styles.etaHeader}>
              <View style={styles.etaIconWrap}>
                <Ionicons name="bicycle" size={24} color={colors.primary} />
              </View>
              <View style={styles.etaInfo}>
                <Text style={styles.etaTitle}>Estimated Express Arrival</Text>
                <Text style={styles.etaTime}>{order?.deliverySlot || '30 - 45 Minutes (Express)'}</Text>
              </View>
              <View style={styles.statusPill}>
                <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" />
                <Text style={styles.statusPillText}>Confirmed</Text>
              </View>
            </View>
            <View style={styles.orderIdBar}>
              <Text style={styles.orderIdLabel}>Order Reference ID:</Text>
              <Text style={styles.orderIdVal}>#{orderId}</Text>
            </View>
          </View>

          {/* FULFILLMENT PHARMACY STORE BANNER */}
          <View style={styles.storeBannerCard}>
            <View style={styles.storeIconWrap}>
              <MaterialCommunityIcons name="storefront-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeLabel}>Dispensing Partner Pharmacy</Text>
              <Text style={styles.storeName}>{pharmacyStoreName}</Text>
              <Text style={styles.storeLoc}>{order?.pharmacyAddress || `${pharmacyCity} Central Dispensing Unit`}</Text>
            </View>
            <View style={styles.storeCityBadge}>
              <Ionicons name="location-sharp" size={12} color={colors.primary} />
              <Text style={styles.storeCityBadgeText}>{pharmacyCity}</Text>
            </View>
          </View>

          {/* ORDER DETAILS & BILL RECEIPT */}
          <View style={styles.orderCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSectionTitle}>Order Summary & Receipt</Text>
              <View style={styles.receiptTag}>
                <Text style={styles.receiptTagText}>TAX INVOICE</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Mode</Text>
              <View style={styles.paymentPill}>
                <Ionicons
                  name={order?.paymentMethod?.includes('Cash') ? 'cash-outline' : 'card-outline'}
                  size={13}
                  color={colors.primary}
                />
                <Text style={styles.paymentPillText}>{order?.paymentMethod || 'Paid Online'}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Status</Text>
              <View style={styles.payStatusBadge}>
                <Text style={styles.payStatusText}>{order?.paymentStatus || 'Paid Online (Verified)'}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order Placed At</Text>
              <Text style={styles.metaValue}>{order?.date || order?.orderDate || 'Just now'}</Text>
            </View>

            <View style={styles.divider} />

            {/* DELIVERY ADDRESS */}
            <Text style={styles.subHeading}>Delivery Recipient & Address</Text>
            <View style={styles.addressBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="person" size={14} color={colors.secondary} />
                <Text style={styles.addressName}>{recipientName}</Text>
                <Text style={styles.addressPhone}>• {recipientPhone}</Text>
              </View>
              <Text style={styles.addressText}>{formattedAddress}</Text>
            </View>

            {/* ATTACHED PRESCRIPTION */}
            {order?.prescriptionAttached && (
              <>
                <View style={styles.divider} />
                <Text style={styles.subHeading}>Doctor Prescription</Text>
                <View style={styles.rxAttachedRow}>
                  <Ionicons name="document-text" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rxAttachedText} numberOfLines={1}>
                      {order.prescriptionAttached}
                    </Text>
                    <Text style={styles.rxAttachedSub}>Attached for pharmacist verification</Text>
                  </View>
                  <View style={styles.verifiedTag}>
                    <Ionicons name="checkmark-done" size={12} color="#00A382" />
                    <Text style={styles.verifiedTagText}>Verified</Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.divider} />

            {/* ORDERED MEDICINES */}
            <View style={styles.itemsHeaderRow}>
              <Text style={styles.subHeading}>
                Items Ordered ({itemsList.length || 0})
              </Text>
              <Text style={styles.itemHeaderPriceLabel}>Price</Text>
            </View>

            {itemsList.map((item, index) => {
              const qty = Number(item.quantity || 1);
              const price = Number(item.price || 0);
              const itemTotal = qty * price;

              return (
                <View key={`${item.id || index}-${index}`} style={styles.itemRow}>
                  <View style={styles.medIconWrap}>
                    <Ionicons name="medical" size={13} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name || 'Medicine item'}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Qty: {qty} {item.packSize || item.strength ? `• ${item.packSize || item.strength}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>₹{itemTotal.toLocaleString('en-IN')}</Text>
                </View>
              );
            })}

            <View style={styles.divider} />

            {/* TOTAL PAYABLE */}
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total Paid / Payable</Text>
                <Text style={styles.totalSub}>Inclusive of all taxes & delivery fees</Text>
              </View>
              <Text style={styles.totalValue}>₹{Number(totalPayable).toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* LIVE TRACKING TIMELINE PREVIEW */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineCardTitle}>Live Order Tracking</Text>
            <View style={styles.timelineSteps}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotDone]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineStepTitle}>Order Placed & Confirmed</Text>
                  <Text style={styles.timelineStepSub}>Order received and logged in system</Text>
                </View>
              </View>

              <View style={styles.timelineConnector} />

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]}>
                  <Ionicons name="time" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text style={[styles.timelineStepTitle, { color: colors.primary }]}>Pharmacist Packing</Text>
                  <Text style={styles.timelineStepSub}>Prescription verified; medicines packed</Text>
                </View>
              </View>

              <View style={styles.timelineConnector} />

              <View style={styles.timelineItem}>
                <View style={styles.timelineDot}>
                  <Ionicons name="bicycle-outline" size={12} color="#94A3B8" />
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineStepTitleMuted}>Out for Express Delivery</Text>
                  <Text style={styles.timelineStepSub}>Assigned to doorstep delivery partner</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 24/7 SUPPORT CARD */}
          <View style={styles.supportCard}>
            <Ionicons name="headset" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.supportTitle}>Need Assistance?</Text>
              <Text style={styles.supportText}>
                Our 24/7 MediUnify Pharmacist Careline is ready to help at 1800-MEDIUNIFY (Toll Free).
              </Text>
            </View>
          </View>

          {Platform.OS === 'web' && (
            <View style={{ marginTop: 24, width: '100%', gap: 10 }}>
              <TouchableOpacity
                style={styles.floatingHomeBtn}
                activeOpacity={0.88}
                onPress={handleViewOrders}
                accessibilityLabel="View Order"
              >
                <Ionicons name="receipt" size={18} color="#FFFFFF" />
                <Text style={styles.floatingHomeText}>View Order Details</Text>
              </TouchableOpacity>
              <View style={styles.secondaryBtnRow}>
                <TouchableOpacity
                  style={styles.trackOrdersBtn}
                  activeOpacity={0.85}
                  onPress={handleViewOrders}
                  accessibilityLabel="My Pharmacy Orders"
                >
                  <Ionicons name="list-outline" size={16} color={colors.primary} />
                  <Text style={styles.trackOrdersText}>My Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueShoppingBtn}
                  activeOpacity={0.85}
                  onPress={handleContinueShopping}
                  accessibilityLabel="Pharmacy Store"
                >
                  <Ionicons name="medkit-outline" size={16} color={colors.secondary} />
                  <Text style={styles.continueShoppingText}>Pharmacy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueShoppingBtn}
                  activeOpacity={0.85}
                  onPress={handleGoHome}
                  accessibilityLabel="Home Screen"
                >
                  <Ionicons name="home-outline" size={16} color={colors.secondary} />
                  <Text style={styles.continueShoppingText}>Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: Platform.OS === 'web' ? 40 : 160 }} />
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* FLOATING BOTTOM ACTION BAR (Native only) */}
      {Platform.OS !== 'web' && (
        <View style={styles.floatingBottomBarWrapper}>
          <View style={styles.floatingBottomBar}>
            {/* PRIMARY: VIEW ORDER */}
            <TouchableOpacity
              style={styles.floatingHomeBtn}
              activeOpacity={0.88}
              onPress={handleViewOrders}
              accessibilityLabel="View Order"
            >
              <Ionicons name="receipt" size={18} color="#FFFFFF" />
              <Text style={styles.floatingHomeText}>View Order</Text>
            </TouchableOpacity>

            {/* SECONDARY ROW */}
            <View style={styles.secondaryBtnRow}>
              <TouchableOpacity
                style={styles.trackOrdersBtn}
                activeOpacity={0.85}
                onPress={handleViewOrders}
                accessibilityLabel="My Pharmacy Orders"
              >
                <Ionicons name="list-outline" size={16} color={colors.primary} />
                <Text style={styles.trackOrdersText}>My Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueShoppingBtn}
                activeOpacity={0.85}
                onPress={handleContinueShopping}
                accessibilityLabel="Pharmacy Store"
              >
                <Ionicons name="medkit-outline" size={16} color={colors.secondary} />
                <Text style={styles.continueShoppingText}>Pharmacy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueShoppingBtn}
                activeOpacity={0.85}
                onPress={handleGoHome}
                accessibilityLabel="Home Screen"
              >
                <Ionicons name="home-outline" size={16} color={colors.secondary} />
                <Text style={styles.continueShoppingText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FA',
  },
  topHeader: {
    height: 56,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInner: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  homeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    alignItems: 'center',
  },
  scrollContentTablet: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 24,
    paddingBottom: Platform.OS === 'web' ? 0 : 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 580,
    alignItems: 'center',
  },
  successRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#D1F4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  successHeading: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.secondary,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  etaCard: {
    width: '100%',
    backgroundColor: '#E8F7F4',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#C0EFE5',
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  etaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C0EFE5',
  },
  etaInfo: {
    flex: 1,
  },
  etaTitle: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaTime: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00B894',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  orderIdBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#C0EFE5',
  },
  orderIdLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  orderIdVal: {
    fontSize: 12.5,
    fontWeight: '900',
    color: colors.primary,
  },
  storeBannerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  storeName: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 1,
  },
  storeLoc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  storeCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FAF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C0EFE5',
  },
  storeCityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  orderCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.secondary,
  },
  receiptTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.secondary,
  },
  paymentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F7F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  paymentPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.primary,
  },
  payStatusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  payStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  addressBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  addressPhone: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  rxAttachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FAF8',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C0EFE5',
  },
  rxAttachedText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '800',
  },
  rxAttachedSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F8F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00A382',
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemHeaderPriceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  medIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '800',
  },
  itemMeta: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
  },
  totalSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  timelineCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
    marginBottom: 12,
  },
  timelineSteps: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#00B894',
  },
  timelineDotActive: {
    backgroundColor: '#00B894',
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  timelineStepTitleMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  timelineStepSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  timelineConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#00B894',
    marginLeft: 11,
    marginVertical: 2,
  },
  supportCard: {
    width: '100%',
    backgroundColor: '#E6FAF7',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C0EFE5',
  },
  supportTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.secondary,
  },
  supportText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
    marginTop: 1,
  },
  floatingBottomBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 24 : 16,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  floatingBottomBar: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  floatingHomeBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingHomeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trackOrdersBtn: {
    flex: 1.4,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8F7F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#C0EFE5',
  },
  trackOrdersText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  continueShoppingBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  continueShoppingText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '800',
  },
  autoRedirectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F8F5',
    borderWidth: 1,
    borderColor: '#99E7DC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 12,
    gap: 6,
    alignSelf: 'center',
  },
  autoRedirectText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#007D69',
  },
  viewNowLink: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0D9488',
    textDecorationLine: 'underline',
  },
});

export default OrderSuccessScreen;