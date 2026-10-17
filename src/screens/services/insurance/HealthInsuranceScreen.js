import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../../utils/alert';
import WebFooter from '../../../components/web/WebFooter';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const COMING_SOON_FEATURES = [
  {
    icon: 'business',
    title: '10,000+ Cashless Hospitals',
    desc: 'Direct cashless admissions with zero upfront deposit across top hospital networks.',
    color: '#1E3A8A',
    bgColor: '#EFF6FF',
  },
  {
    icon: 'flash',
    title: '20-Minute TPA Approvals',
    desc: 'Instant digital claim pre-authorizations powered by on-ground desk managers.',
    color: '#00B894',
    bgColor: '#ECFDF5',
  },
  {
    icon: 'shield-checkmark',
    title: 'Zero Room-Rent Capping',
    desc: 'Complete financial protection with no hidden sub-limits on single private AC rooms.',
    color: '#0284C7',
    bgColor: '#F0F9FF',
  },
  {
    icon: 'receipt',
    title: 'Tax Benefit under Sec 80D',
    desc: 'Save up to ₹75,000 annually in income tax deductions for self and parents.',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
];

const HealthInsuranceScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && isDesktopLayout(width);

  const [contactInput, setContactInput] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    const checkSubscribed = async () => {
      try {
        const saved = await AsyncStorage.getItem('@unnathi_insurance_notify');
        if (saved) {
          setIsSubscribed(true);
        }
        const phone = await AsyncStorage.getItem('userPhone');
        if (phone && !contactInput) {
          setContactInput(phone);
        }
      } catch (e) {}
    };
    checkSubscribed();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleNotifyMe = async () => {
    if (!contactInput.trim()) {
      showAlert('Contact Required', 'Please enter your mobile number or email to receive launch updates.');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('@unnathi_insurance_notify', contactInput.trim());
      setIsSubscribed(true);
      setLoading(false);
      showToast('You are on the VIP launch list!');
      showAlert(
        'You’re on the VIP List!',
        `Thank you! We will notify ${contactInput.trim()} the moment Health Insurance launches with exclusive zero-deposit benefits.`,
        [{ text: 'Great!', style: 'default' }]
      );
    } catch (e) {
      setLoading(false);
      showAlert('Notification Saved', 'We will notify you when Health Insurance is live!');
      setIsSubscribed(true);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {/* MOBILE TOP HEADER */}
      {!isDesktopWeb && (
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            onPress={() => {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation?.navigate('Home');
              }
            }}
            activeOpacity={0.8}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? theme.text : "#1E3A8A"} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.mobileHeaderTitle}>Health Insurance</Text>
            <Text style={styles.mobileHeaderSub}>MediUnify Care</Text>
          </View>
          <View style={styles.launchingPillSmall}>
            <Text style={styles.launchingPillSmallText}>SOON</Text>
          </View>
        </View>
      )}


      {/* TOAST BANNER */}
      {toastMsg && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainBody, isDesktopWeb && styles.desktopContainer]}>
          {/* ============================================================
              LAUNCHING SOON HERO CARD
          ============================================================ */}
          <View style={styles.heroCard}>
            {/* Decorative Background Glow Discs */}
            <View style={styles.heroGlowCircleTop} />
            <View style={styles.heroGlowCircleBottom} />

            {/* Top decorative glow badge */}
            <View style={styles.pillBadgeRow}>
              <View style={styles.launchingBadge}>
                <Ionicons name="rocket" size={14} color="#00B894" />
                <Text style={styles.launchingBadgeText}>LAUNCHING SOON</Text>
              </View>
              <View style={styles.irdaiBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#1E3A8A" />
                <Text style={styles.irdaiBadgeText}>IRDAI PARTNER NETWORK</Text>
              </View>
            </View>

            {/* Graphic Icon Header */}
            <View style={styles.iconGraphicContainer}>
              <View style={styles.iconOuterRing}>
                <View style={styles.iconInnerRing}>
                  <Ionicons name="shield-checkmark" size={44} color="#00B894" />
                </View>
              </View>
              <View style={styles.floatingSparkleBadge}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
              </View>
            </View>

            {/* Main Title & Subtitle */}
            <Text style={styles.heroTitle}>Health Insurance Will Be Launching Soon</Text>
            <Text style={styles.heroSubtitle}>
              We are finalizing partnerships with India's top insurance providers to bring you 100% cashless hospitalization, zero-deposit admissions, and 20-minute digital claim approvals.
            </Text>

            {/* NOTIFY ME BOX */}
            <View style={styles.notifyCard}>
              <Text style={styles.notifyTitle}>
                {isSubscribed ? 'You are on the Early Access List!' : 'Get Notified When We Go Live'}
              </Text>
              <Text style={styles.notifySub}>
                {isSubscribed
                  ? 'We will send you an exclusive early-bird invitation with zero waiting period benefits as soon as we launch.'
                  : 'Enter your phone number or email to receive an instant alert and exclusive launch benefits.'}
              </Text>

              {!isSubscribed ? (
                <View style={[styles.notifyInputRow, isDesktopWeb && styles.notifyInputRowDesktop]}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={18} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter mobile number or email"
                      placeholderTextColor="#94A3B8"
                      value={contactInput}
                      onChangeText={setContactInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.notifyBtn}
                    onPress={handleNotifyMe}
                    activeOpacity={0.88}
                    disabled={loading}
                  >
                    <Ionicons name="notifications" size={16} color="#FFFFFF" />
                    <Text style={styles.notifyBtnText}>
                      {loading ? 'Saving...' : 'Notify Me'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.subscribedConfirmation}>
                  <Ionicons name="checkmark-circle" size={20} color="#00B894" />
                  <Text style={styles.subscribedConfirmationText}>
                    Notification active for: {contactInput || 'Your account'}
                  </Text>
                </View>
              )}
            </View>

            {/* EXPLORE OTHER SERVICES CTA */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.backHomeBtn}
                onPress={() => navigation?.navigate('Home')}
                activeOpacity={0.88}
              >
                <Ionicons name="home" size={16} color="#FFFFFF" />
                <Text style={styles.backHomeBtnText}>Explore Other Services</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================================
              WHAT TO EXPECT (FEATURE PREVIEWS)
          ============================================================ */}
          <View style={styles.featuresSection}>
            <View style={styles.featuresHeader}>
              <Text style={styles.featuresTitle}>What’s Coming to MediUnify Insurance</Text>
              <Text style={styles.featuresSubtitle}>
                A simpler, faster, and completely cashless health coverage experience designed for you and your family.
              </Text>
            </View>

            <View style={styles.featuresGrid}>
              {COMING_SOON_FEATURES.map((item, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={[styles.featureIconWrap, { backgroundColor: item.bgColor }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureCardTitle}>{item.title}</Text>
                    <Text style={styles.featureCardDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 24/7 SUPPORT HELP */}
          <View style={styles.helpBanner}>
            <View style={styles.helpBannerLeft}>
              <View style={styles.helpIconBox}>
                <Ionicons name="headset" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helpTitle}>Have urgent healthcare needs today?</Text>
                <Text style={styles.helpDesc}>
                  Book top doctor consultations, lab tests, and home care services directly on MediUnify.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.helpActionBtn}
              onPress={() => navigation?.navigate('Home')}
              activeOpacity={0.88}
            >
              <Text style={styles.helpActionBtnText}>View Services</Text>
              <Ionicons name="arrow-forward" size={14} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* WEB FOOTER */}
        {isDesktopWeb && <WebFooter navigation={navigation} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
  },
  mainBody: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 40 : 110,
  },
  desktopContainer: {
    maxWidth: 1040,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  // MOBILE HEADER
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  mobileHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  launchingPillSmall: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  launchingPillSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00B894',
    letterSpacing: 0.5,
  },

  // DESKTOP BREADCRUMB
  desktopBreadcrumbWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  desktopBreadcrumbInner: {
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: '#64748B',
  },
  breadcrumbActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  launchingHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  launchingHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },

  // TOAST BANNER
  toastBanner: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 70 : 60,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#00B894',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // HERO CARD
  heroCard: {
    backgroundColor: '#1E3A8A', // Brand Navy
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlowCircleTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 194, 203, 0.22)', // Aqua glow
    pointerEvents: 'none',
  },
  heroGlowCircleBottom: {
    position: 'absolute',
    bottom: -70,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 184, 148, 0.2)', // Teal glow
    pointerEvents: 'none',
  },
  pillBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    zIndex: 2,
  },
  launchingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 184, 148, 0.25)',
    borderWidth: 1,
    borderColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  launchingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  irdaiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 194, 203, 0.25)',
    borderWidth: 1,
    borderColor: '#00C2CB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  irdaiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 0.5,
  },

  // Graphic Icon
  iconGraphicContainer: {
    position: 'relative',
    marginBottom: 20,
    zIndex: 2,
  },
  iconOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(0, 194, 203, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00C2CB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  floatingSparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Typography
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    maxWidth: 620,
    zIndex: 2,
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  heroSubtitle: {
    fontSize: 14.5,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 600,
    marginBottom: 26,
    zIndex: 2,
  },

  // Notify Card
  notifyCard: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 2,
  },
  notifyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  notifySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  notifyInputRow: {
    width: '100%',
    gap: 10,
  },
  notifyInputRowDesktop: {
    flexDirection: 'row',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  notifyBtn: {
    backgroundColor: '#00B894',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 10,
  },
  notifyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subscribedConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
  },
  subscribedConfirmationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backHomeBtn: {
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backHomeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // FEATURES SECTION
  featuresSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    marginBottom: 24,
  },
  featuresHeader: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  featuresSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    flex: 1,
    minWidth: Platform.OS === 'web' ? 340 : '100%',
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  featureCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },

  // HELP BANNER
  helpBanner: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  helpBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 260,
  },
  helpIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  helpDesc: {
    fontSize: 12,
    color: '#BFDBFE',
    lineHeight: 16,
  },
  helpActionBtn: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  helpActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
});

export default HealthInsuranceScreen;
