import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_FAQS,
} from '../../../data/membershipData';
import { saveTransaction } from '../../../services/transactionService';
import { showAlert } from '../../../utils/alert';
import { isGuestUser, promptLoginRequired } from '../../../utils/authHelper';
import { useTheme } from '../../../context/ThemeContext';

const PAYMENT_METHODS = [
  { id: 'upi-gpay', name: 'Google Pay / PhonePe / UPI', icon: 'flash-outline', iconType: 'ionicons' },
  { id: 'card', name: 'Credit or Debit Card', icon: 'card-outline', iconType: 'ionicons' },
  { id: 'netbanking', name: 'Net Banking', icon: 'business-outline', iconType: 'ionicons' },
  { id: 'wallet', name: 'MediUnify Care Wallet', icon: 'wallet-outline', iconType: 'material' },
];

const MembershipScreen = ({ navigation }) => {
  const { t, isIndic } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const isDesktop = width >= 1024;
  const scrollViewRef = useRef(null);

  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi-gpay');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showActivatedModal, setShowActivatedModal] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  useEffect(() => {
    loadMembershipStatus();
  }, []);

  const loadMembershipStatus = async () => {
    try {
      const isGuest = await isGuestUser();
      if (isGuest) {
        setActiveMembership(null);
        setLoading(false);
        return;
      }
      const stored = await AsyncStorage.getItem('@mediunify_membership');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.status) {
          // Check if expired
          const now = new Date();
          const expDate = new Date(parsed.expiresAt);
          if (expDate < now && parsed.status === 'active') {
            parsed.status = 'expired';
            await AsyncStorage.setItem('@mediunify_membership', JSON.stringify(parsed));
          }
          setActiveMembership(parsed);
        }
      }
    } catch (e) {
      console.log('Error loading membership:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPlanDetails = (plan) => {
    setSelectedPlanForDetails(plan);
    setIsDetailsModalVisible(true);
  };

  const handleChoosePlan = async (plan) => {
    const isGuest = await isGuestUser();
    if (isGuest) {
      setIsDetailsModalVisible(false);
      promptLoginRequired(navigation, { service: 'membership' });
      return;
    }
    setSelectedPlanForDetails(plan);
    setIsDetailsModalVisible(false);
    setIsPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    const isGuest = await isGuestUser();
    if (isGuest) {
      setIsPaymentModalVisible(false);
      promptLoginRequired(navigation, { service: 'membership' });
      return;
    }
    if (!selectedPlanForDetails) return;
    setProcessingPayment(true);

    try {
      const plan = selectedPlanForDetails;
      const now = new Date();
      const expiry = new Date();
      const durationMonths = plan.id === 'silver' ? 3 : 12;
      expiry.setMonth(expiry.getMonth() + durationMonths);

      const membershipId = `MU-MEM-${Math.floor(100000 + Math.random() * 900000)}`;

      const newMembership = {
        status: 'active',
        tierId: plan.id,
        tierName: plan.title,
        price: plan.price,
        duration: plan.duration,
        activatedAt: now.toISOString(),
        expiresAt: expiry.toISOString(),
        membershipId,
        benefits: plan.benefits || plan.perks,
        vouchers: (plan.vouchers || []).map((v) => ({ ...v, redeemed: false })),
        isFamily: plan.isFamily || false,
        maxMembers: plan.maxMembers || 1,
        savingsToDate: 0,
      };

      // 1. Save Transaction to Payment History
      await saveTransaction({
        id: `TXN-${membershipId}`,
        refId: membershipId,
        service: 'Membership',
        serviceType: 'membership',
        title: `${plan.title} Membership`,
        facility: 'MediUnify Health Care',
        rawDate: now.toISOString(),
        amount: Number(plan.price),
        mrp: Number(plan.originalPrice || plan.price),
        status: 'Paid',
        paymentMode: selectedPaymentMethod === 'upi-gpay' ? 'Instant UPI' : selectedPaymentMethod === 'card' ? 'Credit/Debit Card' : selectedPaymentMethod === 'wallet' ? 'Care Wallet' : 'Net Banking',
        items: [{ name: `${plan.title} Membership (${plan.duration})`, qty: 1, price: Number(plan.price) }],
      });

      // 2. Save active membership state
      await AsyncStorage.setItem('@mediunify_membership', JSON.stringify(newMembership));
      setActiveMembership(newMembership);
      setActivatedPlan(newMembership);

      setIsPaymentModalVisible(false);
      setShowActivatedModal(true);
    } catch (e) {
      console.warn('Membership activation error:', e);
      showAlert('Payment Failed', 'Could not process membership payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const scrollToPlans = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 260, animated: true });
    }
  };

  // Expiry check: within 30 days
  const isCloseToExpiry = () => {
    if (!activeMembership || activeMembership.status !== 'active') return false;
    const now = new Date();
    const exp = new Date(activeMembership.expiresAt);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007D69" />
        <Text style={styles.loadingText}>Loading MediUnify Membership...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, isIndic && { lineHeight: 22 }]}>{t('profile.membership', 'MediUnify Membership')}</Text>
          <Text style={[styles.headerSub, isIndic && { lineHeight: 18 }]}>{t('Get more benefits with your membership')}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && { maxWidth: 960, alignSelf: 'center', width: '100%' },
        ]}
      >
        {/* ============================================================
            5 & 6 & 8. MY MEMBERSHIP STATUS
        ============================================================ */}
        {activeMembership && activeMembership.status === 'active' ? (
          <View style={styles.myMembershipCard}>
            <View style={styles.myMembershipHeader}>
              <View style={styles.myMembershipLeft}>
                <View style={styles.myMembershipIconBox}>
                  <Ionicons name="ribbon" size={22} color="#007D69" />
                </View>
                <View>
                  <Text style={[styles.myMembershipLabel, isIndic && { lineHeight: 16 }]}>{t('profile.membership', 'My Membership')}</Text>
                  <Text style={styles.myMembershipTier}>{activeMembership.tierName}</Text>
                </View>
              </View>
              <View style={styles.statusPillActive}>
                <View style={styles.statusDotActive} />
                <Text style={styles.statusPillActiveText}>{t('Active')}</Text>
              </View>
            </View>

            <View style={styles.validityRow}>
              <View style={styles.validityCol}>
                <Text style={[styles.validityLabel, isIndic && { lineHeight: 14 }]}>{t('Started')}</Text>
                <Text style={styles.validityValue}>{formatDate(activeMembership.activatedAt)}</Text>
              </View>
              <View style={styles.validityDivider} />
              <View style={styles.validityCol}>
                <Text style={[styles.validityLabel, isIndic && { lineHeight: 14 }]}>{t('profile.valid_until', 'Valid Until')}</Text>
                <Text style={styles.validityValue}>{formatDate(activeMembership.expiresAt)}</Text>
              </View>
              <View style={styles.validityDivider} />
              <View style={styles.validityCol}>
                <Text style={styles.validityLabel}>ID</Text>
                <Text style={styles.validityValue}>{activeMembership.membershipId}</Text>
              </View>
            </View>

            {/* Expiry Warning */}
            {isCloseToExpiry() && (
              <View style={styles.expiryWarningBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                <Text style={styles.expiryWarningText}>Membership expires soon</Text>
                <TouchableOpacity
                  style={styles.renewBtnSmall}
                  onPress={() => {
                    const planObj = MEMBERSHIP_PLANS.find((p) => p.id === activeMembership.tierId) || MEMBERSHIP_PLANS[0];
                    handleChoosePlan(planObj);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.renewBtnSmallText}>Renew</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.viewBenefitsButton}
              onPress={() => {
                const planObj = MEMBERSHIP_PLANS.find((p) => p.id === activeMembership.tierId) || MEMBERSHIP_PLANS[0];
                handleOpenPlanDetails(planObj);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.viewBenefitsButtonText}>View Benefits</Text>
              <Ionicons name="arrow-forward" size={15} color="#007D69" />
            </TouchableOpacity>
          </View>
        ) : activeMembership && activeMembership.status === 'expired' ? (
          <View style={styles.myMembershipCard}>
            <View style={styles.myMembershipHeader}>
              <View style={styles.myMembershipLeft}>
                <View style={[styles.myMembershipIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={22} color="#DC2626" />
                </View>
                <View>
                  <Text style={styles.myMembershipLabel}>My Membership</Text>
                  <Text style={styles.myMembershipTier}>{activeMembership.tierName}</Text>
                </View>
              </View>
              <View style={styles.statusPillExpired}>
                <Text style={styles.statusPillExpiredText}>Expired</Text>
              </View>
            </View>

            <Text style={styles.expiredSub}>
              Your membership expired on {formatDate(activeMembership.expiresAt)}. Renew now to restore healthcare discounts and benefits.
            </Text>

            <TouchableOpacity
              style={styles.renewMainBtn}
              onPress={() => {
                const planObj = MEMBERSHIP_PLANS.find((p) => p.id === activeMembership.tierId) || MEMBERSHIP_PLANS[0];
                handleChoosePlan(planObj);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.renewMainBtnText}>Renew Membership</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noMembershipCard}>
            <View style={styles.noMembershipLeft}>
              <View style={styles.noMembershipIconBox}>
                <Ionicons name="ribbon-outline" size={26} color="#007D69" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.noMembershipTitle}>No active membership</Text>
                <Text style={styles.noMembershipSub}>
                  Unlock doctor consultations, free home sample pickup & discounts.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewPlansBtn}
              onPress={scrollToPlans}
              activeOpacity={0.85}
            >
              <Text style={styles.viewPlansBtnText}>View Membership Plans</Text>
              <Ionicons name="arrow-down" size={14} color="#007D69" />
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================
            2. MEMBERSHIP PLANS LIST
        ============================================================ */}
        <View style={styles.plansSectionHeader}>
          <Text style={styles.plansSectionTitle}>Choose a Membership Plan</Text>
          <Text style={styles.plansSectionSub}>Select from our curated healthcare plans</Text>
        </View>

        <View style={[styles.plansGrid, isTablet && styles.plansGridTablet]}>
          {MEMBERSHIP_PLANS.map((plan) => {
            const isCurrentActive = activeMembership?.status === 'active' && activeMembership?.tierId === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  isTablet && styles.planCardTablet,
                  isCurrentActive && styles.planCardActiveBorder,
                ]}
              >
                {/* Top Badge */}
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: plan.badgeBg }]}>
                    <Text style={[styles.planBadgeText, { color: plan.badgeColor }]}>
                      {plan.badge}
                    </Text>
                  </View>
                )}

                {/* Plan Name & Tagline */}
                <Text style={styles.planTitle}>{plan.title.toUpperCase()}</Text>

                {/* Price */}
                <View style={styles.planPriceRow}>
                  <Text style={styles.planPriceText}>₹{plan.price}</Text>
                  <Text style={styles.planDurationText}>/ {plan.duration}</Text>
                </View>

                {/* Checklist (Clean 4-point overview) */}
                <View style={styles.planOverviewPerks}>
                  {(plan.overviewPerks || []).map((perk, idx) => (
                    <View key={idx} style={styles.overviewPerkRow}>
                      <Ionicons name="checkmark" size={16} color="#007D69" style={{ marginTop: 1 }} />
                      <Text style={styles.overviewPerkText}>{perk}</Text>
                    </View>
                  ))}
                </View>

                {/* Action CTA */}
                <TouchableOpacity
                  style={[
                    styles.planCardButton,
                    isCurrentActive ? styles.planCardButtonActive : null,
                  ]}
                  onPress={() => handleOpenPlanDetails(plan)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.planCardButtonText,
                      isCurrentActive ? styles.planCardButtonTextActive : null,
                    ]}
                  >
                    {isCurrentActive ? 'Current Plan • View Benefits' : 'View Benefits'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* ============================================================
            FREQUENTLY ASKED QUESTIONS
        ============================================================ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqSectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqsCard}>
            {MEMBERSHIP_FAQS.map((faq, i) => {
              const isOpen = expandedFaq === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.faqItem, i === MEMBERSHIP_FAQS.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => setExpandedFaq(isOpen ? null : i)}
                  activeOpacity={0.8}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#64748B"
                    />
                  </View>
                  {isOpen && <Text style={styles.faqAnswer}>{faq.a}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================
          3. PLAN DETAILS MODAL (Checklist-style layout)
      ============================================================ */}
      <Modal
        visible={isDetailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDetailsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailsModalCard, isTablet && { maxWidth: 520 }]}>
            <View style={styles.detailsModalHeader}>
              <View>
                <Text style={styles.detailsModalTitle}>
                  {selectedPlanForDetails?.title} Membership
                </Text>
                <View style={styles.detailsModalPriceRow}>
                  <Text style={styles.detailsModalPrice}>₹{selectedPlanForDetails?.price}</Text>
                  <Text style={styles.detailsModalDuration}>/ {selectedPlanForDetails?.duration}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.detailsModalCloseBtn}
                onPress={() => setIsDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.detailsModalScroll}>
              <Text style={styles.detailsBenefitsHeading}>Benefits</Text>
              <View style={styles.detailsBenefitsList}>
                {(selectedPlanForDetails?.benefits || selectedPlanForDetails?.perks || []).map((b, i) => (
                  <View key={i} style={styles.detailsBenefitRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#007D69" style={{ marginTop: 2 }} />
                    <Text style={styles.detailsBenefitText}>{b}</Text>
                  </View>
                ))}
              </View>

              {/* Service-Specific Highlights */}
              {selectedPlanForDetails?.serviceDiscounts && (
                <View style={styles.serviceDiscountsBox}>
                  <Text style={styles.serviceDiscountsHeading}>Service Benefits</Text>
                  <View style={styles.serviceDiscountItem}>
                    <Text style={styles.serviceDiscountLabel}>Pharmacy</Text>
                    <Text style={styles.serviceDiscountVal}>{selectedPlanForDetails.serviceDiscounts.pharmacy}</Text>
                  </View>
                  <View style={styles.serviceDiscountItem}>
                    <Text style={styles.serviceDiscountLabel}>Lab Tests</Text>
                    <Text style={styles.serviceDiscountVal}>{selectedPlanForDetails.serviceDiscounts.lab}</Text>
                  </View>
                  <View style={styles.serviceDiscountItem}>
                    <Text style={styles.serviceDiscountLabel}>Scan & X-Ray</Text>
                    <Text style={styles.serviceDiscountVal}>{selectedPlanForDetails.serviceDiscounts.scans}</Text>
                  </View>
                  <View style={styles.serviceDiscountItem}>
                    <Text style={styles.serviceDiscountLabel}>Medicine Delivery</Text>
                    <Text style={styles.serviceDiscountVal}>{selectedPlanForDetails.serviceDiscounts.delivery}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.choosePlanBtn}
              onPress={() => handleChoosePlan(selectedPlanForDetails)}
              activeOpacity={0.88}
            >
              <Text style={styles.choosePlanBtnText}>
                {activeMembership?.tierId === selectedPlanForDetails?.id
                  ? `Renew ${selectedPlanForDetails?.title}`
                  : `Choose ${selectedPlanForDetails?.title}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          4. EXISTING PAYMENT SHEET MODAL
      ============================================================ */}
      <Modal
        visible={isPaymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!processingPayment) setIsPaymentModalVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.paymentModalCard, isTablet && { maxWidth: 520 }]}>
            <View style={styles.paymentModalHeader}>
              <View>
                <Text style={styles.paymentModalTitle}>Select Payment Method</Text>
                <Text style={styles.paymentModalSub}>
                  {selectedPlanForDetails?.title} Membership • ₹{selectedPlanForDetails?.price}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.detailsModalCloseBtn}
                onPress={() => setIsPaymentModalVisible(false)}
                disabled={processingPayment}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Payment Options */}
            <View style={styles.paymentOptionsList}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedPaymentMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentOptionRow,
                      isSelected && styles.paymentOptionRowActive,
                    ]}
                    onPress={() => setSelectedPaymentMethod(method.id)}
                    activeOpacity={0.8}
                    disabled={processingPayment}
                  >
                    <View style={styles.paymentOptionLeft}>
                      <View style={[styles.paymentOptionIconWrap, isSelected && { backgroundColor: '#E0F7F4' }]}>
                        {method.iconType === 'material' ? (
                          <MaterialCommunityIcons name={method.icon} size={20} color={isSelected ? '#007D69' : '#64748B'} />
                        ) : (
                          <Ionicons name={method.icon} size={20} color={isSelected ? '#007D69' : '#64748B'} />
                        )}
                      </View>
                      <Text style={[styles.paymentOptionName, isSelected && { color: '#007D69', fontWeight: '800' }]}>
                        {method.name}
                      </Text>
                    </View>
                    <View style={[styles.paymentRadio, isSelected && styles.paymentRadioActive]}>
                      {isSelected && <View style={styles.paymentRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Security Guarantee */}
            <View style={styles.paymentSecurityRow}>
              <Ionicons name="shield-checkmark" size={15} color="#007D69" />
              <Text style={styles.paymentSecurityText}>100% Safe & Secure Payment via MediUnify</Text>
            </View>

            <TouchableOpacity
              style={styles.payConfirmBtn}
              onPress={handleConfirmPayment}
              disabled={processingPayment}
              activeOpacity={0.88}
            >
              {processingPayment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.payConfirmBtnText}>
                  Pay ₹{selectedPlanForDetails?.price} & Activate
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          4. ACTIVATED CONFIRMATION MODAL
      ============================================================ */}
      <Modal
        visible={showActivatedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActivatedModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.activatedModalCard, isTablet && { maxWidth: 460 }]}>
            <View style={styles.activatedIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#007D69" />
            </View>

            <Text style={styles.activatedTitle}>Membership Activated</Text>

            <View style={styles.activatedDetailsBox}>
              <View style={styles.activatedDetailRow}>
                <Text style={styles.activatedDetailLabel}>Plan:</Text>
                <Text style={styles.activatedDetailVal}>{activatedPlan?.tierName}</Text>
              </View>
              <View style={styles.activatedDetailRow}>
                <Text style={styles.activatedDetailLabel}>Valid Until:</Text>
                <Text style={styles.activatedDetailVal}>{formatDate(activatedPlan?.expiresAt)}</Text>
              </View>
              <View style={styles.activatedDetailRow}>
                <Text style={styles.activatedDetailLabel}>Status:</Text>
                <Text style={[styles.activatedDetailVal, { color: '#007D69' }]}>Active</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.activatedContinueBtn}
              onPress={() => setShowActivatedModal(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.activatedContinueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // TOP HEADER
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },

  // MY MEMBERSHIP CARD
  myMembershipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  myMembershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myMembershipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myMembershipIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myMembershipLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myMembershipTier: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusPillActiveText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803D',
  },
  statusPillExpired: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillExpiredText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  validityCol: {
    alignItems: 'center',
    flex: 1,
  },
  validityDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  validityLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  validityValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  expiryWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
    gap: 8,
  },
  expiryWarningText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
  renewBtnSmall: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  renewBtnSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewBenefitsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F7F4',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  viewBenefitsButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#007D69',
  },
  expiredSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 10,
  },
  renewMainBtn: {
    backgroundColor: '#007D69',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  renewMainBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // NO ACTIVE MEMBERSHIP CARD
  noMembershipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  noMembershipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noMembershipIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#E0F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMembershipTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  noMembershipSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  viewPlansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    paddingVertical: 9,
    marginTop: 12,
    gap: 6,
  },
  viewPlansBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#007D69',
  },

  // PLANS SECTION
  plansSectionHeader: {
    marginBottom: 12,
  },
  plansSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  plansSectionSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  plansGrid: {
    gap: 12,
  },
  plansGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // PLAN CARD
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  planCardTablet: {
    width: '48.5%',
  },
  planCardActiveBorder: {
    borderColor: '#007D69',
    borderWidth: 1.5,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  planBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 10,
    gap: 4,
  },
  planPriceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  planDurationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  planOverviewPerks: {
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  overviewPerkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  overviewPerkText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  planCardButton: {
    backgroundColor: '#007D69',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardButtonActive: {
    backgroundColor: '#E0F7F4',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  planCardButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planCardButtonTextActive: {
    color: '#007D69',
  },

  // FAQ SECTION
  faqSection: {
    marginTop: 24,
  },
  faqSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  faqsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    paddingRight: 10,
  },
  faqAnswer: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 6,
  },

  // MODAL BACKDROP
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  // DETAILS MODAL
  detailsModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '85%',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailsModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailsModalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
    gap: 4,
  },
  detailsModalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#007D69',
  },
  detailsModalDuration: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  detailsModalCloseBtn: {
    padding: 4,
  },
  detailsModalScroll: {
    maxHeight: 320,
    marginVertical: 14,
  },
  detailsBenefitsHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  detailsBenefitsList: {
    gap: 8,
  },
  detailsBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailsBenefitText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  serviceDiscountsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceDiscountsHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  serviceDiscountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  serviceDiscountLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  serviceDiscountVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#007D69',
  },
  choosePlanBtn: {
    backgroundColor: '#007D69',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  choosePlanBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // PAYMENT MODAL
  paymentModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  paymentModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  paymentOptionsList: {
    gap: 8,
    marginVertical: 14,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentOptionRowActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#007D69',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  paymentOptionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionName: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  paymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioActive: {
    borderColor: '#007D69',
  },
  paymentRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#007D69',
  },
  paymentSecurityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  paymentSecurityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007D69',
  },
  payConfirmBtn: {
    backgroundColor: '#007D69',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  payConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ACTIVATED MODAL
  activatedModalCard: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  activatedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  activatedTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },
  activatedDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 18,
  },
  activatedDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activatedDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  activatedDetailVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  activatedContinueBtn: {
    width: '100%',
    backgroundColor: '#007D69',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  activatedContinueBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default MembershipScreen;
