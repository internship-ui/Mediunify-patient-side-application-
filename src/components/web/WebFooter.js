import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { isDesktopSiteRequested } from '../../utils/responsiveLayoutHelper';
import { navigationRef } from '../../navigation/navigationRef';

const OUR_SERVICES = [
  { labelKey: 'card_lab_tests', label: 'Lab Tests', route: 'LabTests' },
  { labelKey: 'card_scans_xray', label: 'Scan & X-Ray', route: 'Imaging' },
  { labelKey: 'card_video_consult', label: 'Video Consultation', route: 'VideoConsultation' },
  { labelKey: 'card_order_medicines', label: 'Order Medicines', route: 'Pharmacy' },
  { labelKey: 'card_surgeries', label: 'Surgeries', route: 'HospitalCare' },
  { labelKey: 'card_health_insurance', label: 'Health Insurance', route: 'HealthInsurance' },
  { labelKey: 'card_ayurveda', label: 'Ayurveda & Wellness', route: 'AyurvedaWellness' },
  { labelKey: 'card_fertility', label: 'Fertility & IVF', route: 'FertilityIvf' },
  { labelKey: 'card_equipment_rental', label: 'Equipment Rental', route: 'EquipmentRental' },
  { labelKey: 'card_emergency', label: 'Emergency SOS', route: 'Emergency' },
];

const SUPPORT_LINKS = [
  { labelKey: 'help_support', label: 'Help & Support', route: 'HelpSupport' },
  { labelKey: 'support_faqs', label: 'FAQs', route: 'HelpSupport' },
  { labelKey: 'support_contact', label: 'Contact Us', route: 'HelpSupport' },
  { labelKey: 'support_providers', label: 'Join as Doctor or Lab', route: 'HelpSupport' },
  { labelKey: 'support_corporates', label: 'Corporate Health Plans', route: 'HelpSupport' },
  { labelKey: 'support_terms', label: 'Terms of Service', route: 'HelpSupport' },
  { labelKey: 'support_privacy', label: 'Privacy Policy & HIPAA', route: 'HelpSupport' },
  { labelKey: 'support_refund', label: 'Refund Policy', route: 'HelpSupport' },
];

const SOCIAL_LINKS = [
  { id: 'linkedin', icon: 'logo-linkedin', bg: '#1E3A8A', url: 'https://www.linkedin.com' },
  { id: 'instagram', icon: 'logo-instagram', bg: '#00B894', url: 'https://www.instagram.com' },
  { id: 'facebook', icon: 'logo-facebook', bg: '#1E3A8A', url: 'https://www.facebook.com' },
  { id: 'youtube', icon: 'logo-youtube', bg: '#00C2CB', url: 'https://www.youtube.com' },
];

const WebFooter = ({ navigation, style }) => {
  const { width } = useWindowDimensions();
  const { t, isIndic, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const desktopSiteMode = isDesktopSiteRequested();

  // Responsive device categorization
  const isDesktop = width >= 1024 || desktopSiteMode;
  const isTablet = width >= 768 && width < 1024 && !desktopSiteMode;
  const isMobile = width < 768 && !desktopSiteMode;

  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Preserve native mobile app layout — WebFooter only renders on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const handleNavigate = (route) => {
    if (navigation?.navigate) {
      try {
        navigation.navigate(route);
      } catch (e) {
        navigation.navigate('MainApp', { screen: route });
      }
    } else if (navigationRef?.navigate) {
      try {
        navigationRef.navigate(route);
      } catch (e) {
        navigationRef.navigate('MainApp', { screen: route });
      }
    }
  };

  const handleSubscribe = () => {
    if (emailInput.trim().includes('@')) {
      setSubscribed(true);
      setEmailInput('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  const handleSocialClick = (url) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleStoreClick = (url) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const scrollToTop = (e) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 1. Scroll window and document elements
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      } catch (err) {
        try { window.scrollTo(0, 0); } catch (_) {}
      }

      try {
        if (document.documentElement && document.documentElement.scrollTop > 0) {
          document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
        if (document.body && document.body.scrollTop > 0) {
          document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
      } catch (err) {}

      // 2. Walk up the DOM tree from the footer to find parent ScrollView containers
      try {
        const clickedTarget = e?.target || e?.nativeEvent?.target;
        const footerElem = clickedTarget || document.getElementById('mediunify-footer');
        let current = footerElem;
        while (current) {
          if (current.scrollTop > 0) {
            try {
              current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            } catch (err) {
              current.scrollTop = 0;
            }
          }
          current = current.parentElement;
        }
      } catch (err) {}

      // 3. Scan all scrollable elements in the document to ensure ANY scrolled container returns to top
      try {
        const allElements = document.querySelectorAll('*');
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (el && el.scrollTop > 0) {
            try {
              el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            } catch (err) {
              el.scrollTop = 0;
            }
          }
        }
      } catch (err) {}

      // 4. Dispatch a custom window event for any custom listeners
      try {
        window.dispatchEvent(new CustomEvent('mediunify_scroll_to_top'));
      } catch (_) {}
    }
  };

  const containerPadding = isDesktop ? 40 : isTablet ? 24 : 16;

  return (
    <View
      style={[
        styles.footerWrapper,
        isDarkMode && {
          backgroundColor: '#0B132B',
          backgroundImage: 'none',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
        },
        desktopSiteMode && { minWidth: 1200, width: '100%' },
        style,
      ]}
      nativeID="mediunify-footer"
      {...(Platform.OS === 'web' ? { id: 'mediunify-footer' } : {})}
    >
      <View
        style={[
          styles.footerContainer,
          { paddingHorizontal: containerPadding },
          desktopSiteMode && { minWidth: 1200, width: '100%' },
        ]}
      >
        {/* ============================================================
            MAIN 5-COLUMN ROW (Spans full available width)
        ============================================================ */}
        <View
          style={[
            styles.colsRow,
            isTablet && styles.colsRowTablet,
            isMobile && styles.colsRowMobile,
          ]}
        >
          {/* Column 1: MediUnify Brand Info & Socials */}
          <View style={[styles.footerCol, styles.footerColBrand]}>
            <View style={styles.brandRow}>
              <View>
                <View style={styles.brandTitleRow}>
                  <Text style={[styles.brandTitle, isDarkMode && { color: '#FFFFFF' }]}>Medi</Text>
                  <Text style={[styles.brandTitleAccent, isDarkMode && { color: '#00E5B0' }]}>Unify</Text>
                </View>
                <Text style={[styles.brandTagline, isDarkMode && { color: '#94A3B8' }]}>
                  {t('brand_tagline', 'All your healthcare. One intelligent platform.')}
                </Text>
              </View>
            </View>

            <Text style={[styles.brandDesc, isIndic && { lineHeight: 22 }, isDarkMode && { color: '#94A3B8' }]}>
              {t(
                'footer_brand_desc',
                'All your healthcare on one intelligent platform. Trusted doctors, diagnostics, and hospital care.'
              )}
            </Text>

            {/* Social Icons */}
            <View style={styles.socialRow}>
              {SOCIAL_LINKS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.socialIconBtn, { backgroundColor: item.bg }]}
                  onPress={() => handleSocialClick(item.url)}
                  activeOpacity={0.8}
                  accessibilityLabel={item.id}
                >
                  <Ionicons name={item.icon} size={15} color="#FFFFFF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Column 2: Patient Services */}
          <View style={[styles.footerCol, styles.footerColLinks]}>
            <Text style={[styles.colHeading, isDarkMode && { color: '#FFFFFF' }]}>
              {t('footer_patient_services', 'Patient Services')}
            </Text>
            {OUR_SERVICES.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.footerLinkItem}
                onPress={() => handleNavigate(item.route)}
                activeOpacity={0.7}
              >
                <Text style={[styles.footerLinkText, isDarkMode && { color: '#94A3B8' }]}>
                  {item.labelKey ? t(item.labelKey, item.label) : item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Column 3: Support & Trust */}
          <View style={[styles.footerCol, styles.footerColLinks]}>
            <Text style={[styles.colHeading, isDarkMode && { color: '#FFFFFF' }]}>
              {t('footer_support_trust', 'Support & Trust')}
            </Text>
            {SUPPORT_LINKS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.footerLinkItem}
                onPress={() => handleNavigate(item.route)}
                activeOpacity={0.7}
              >
                <Text style={[styles.footerLinkText, isDarkMode && { color: '#94A3B8' }]}>
                  {item.labelKey ? t(item.labelKey, item.label) : item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Column 4: Download App */}
          <View style={[styles.footerCol, styles.footerColApps]}>
            <Text style={[styles.colHeading, isDarkMode && { color: '#FFFFFF' }]}>{t('app_download', 'Download App')}</Text>

            <TouchableOpacity
              style={[styles.storeBadge, isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1 }]}
              onPress={() => handleStoreClick('https://play.google.com/store')}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google-playstore" size={20} color="#FFFFFF" />
              <View style={styles.storeBadgeTextWrap}>
                <Text style={styles.storeBadgeSmall}>{t('get_it_on', 'GET IT ON')}</Text>
                <Text style={styles.storeBadgeLarge}>Google Play</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.storeBadge, { marginTop: 10 }, isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1 }]}
              onPress={() => handleStoreClick('https://www.apple.com/app-store/')}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              <View style={styles.storeBadgeTextWrap}>
                <Text style={styles.storeBadgeSmall}>{t('download_on', 'Download on the')}</Text>
                <Text style={styles.storeBadgeLarge}>App Store</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Column 5: Subscribe to our newsletter */}
          <View style={[styles.footerCol, styles.footerColNewsletter]}>
            <Text style={[styles.colHeading, isDarkMode && { color: '#FFFFFF' }]}>
              {t('newsletter_subscribe', 'Subscribe to our newsletter')}
            </Text>
            <Text style={[styles.newsletterSub, isDarkMode && { color: '#94A3B8' }]}>
              {t('newsletter_desc', 'Get health tips, offers and updates.')}
            </Text>

            <View style={[styles.subscribeInputRow, isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.14)' }]}>
              <TextInput
                style={[styles.newsletterInput, isDarkMode && { color: '#FFFFFF' }]}
                placeholder={t('enter_email', 'Enter your email')}
                placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.subscribeBtn, isDarkMode && { backgroundColor: '#00E5B0' }]}
                onPress={handleSubscribe}
                activeOpacity={0.88}
                accessibilityLabel="Subscribe"
              >
                <Ionicons name="arrow-forward" size={17} color={isDarkMode ? '#080E1A' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
            {subscribed && (
              <View style={styles.subscribedRow}>
                <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                <Text style={styles.subscribedSuccess}>
                  {t('newsletter_success', 'Thank you for subscribing!')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ============================================================
            BOTTOM STRIP: COPYRIGHT, BRAND PROMISE & SCROLL TO TOP
        ============================================================ */}
        <View style={[styles.bottomStrip, isDarkMode && { borderTopColor: 'rgba(255, 255, 255, 0.08)' }, isMobile && styles.bottomStripMobile]}>
          <Text style={[styles.copyrightText, isIndic && { lineHeight: 18 }, isDarkMode && { color: '#64748B' }]}>
            {t(
              'footer_rights',
              '© 2026 Unnathi Healthcare / MediUnify • All rights reserved. Registered Telemedicine Network in India.'
            )}
          </Text>

          <View style={[styles.bottomRightWrap, isMobile && styles.bottomRightWrapMobile]}>
            <View style={styles.madeWithWrap}>
              <Text style={[styles.madeWithText, isDarkMode && { color: '#64748B' }]}>{t('made_with_love', 'Made with')}</Text>
              <Ionicons name="heart" size={13} color="#EF4444" style={{ marginHorizontal: 4 }} />
              <Text style={[styles.madeWithText, isDarkMode && { color: '#64748B' }]}>
                {t('healthier_tomorrow', 'for a healthier tomorrow.')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.scrollTopBtn, isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1 }]}
              onPress={scrollToTop}
              activeOpacity={0.8}
              accessibilityLabel="Scroll to top"
            >
              <Ionicons name="arrow-up" size={18} color={isDarkMode ? '#00E5B0' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const baseStyles = StyleSheet.create({
  footerWrapper: {
    backgroundColor: '#E0ECF6',
    backgroundImage: 'linear-gradient(180deg, #DDEAF5 0%, #E5F0F8 45%, #DCE8F3 100%)',
    borderTopWidth: 1.5,
    borderTopColor: '#C4D8E7',
    width: '100%',
    alignSelf: 'stretch',
    paddingTop: 36,
    paddingBottom: 22,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  footerContainer: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    boxSizing: 'border-box',
  },
  colsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 24,
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 26,
  },
  colsRowTablet: {
    flexWrap: 'wrap',
    gap: 24,
  },
  colsRowMobile: {
    flexDirection: 'column',
    gap: 28,
    marginBottom: 32,
  },
  footerCol: {
    flex: 1,
    minWidth: 150,
  },
  footerColBrand: {
    flex: 1.35,
    minWidth: 220,
  },
  footerColLinks: {
    flex: 1,
    minWidth: 150,
  },
  footerColApps: {
    flex: 1,
    minWidth: 165,
  },
  footerColNewsletter: {
    flex: 1.25,
    minWidth: 230,
  },

  // Brand Info
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  brandTitleAccent: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00B894',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
    marginTop: -1,
  },
  brandDesc: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#64748B',
    marginBottom: 18,
    maxWidth: 340,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  socialIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    cursor: 'pointer',
  },

  // Headings & Links
  colHeading: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1E3A8A',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  footerLinkItem: {
    paddingVertical: 5,
    cursor: 'pointer',
  },
  footerLinkText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Download Badges
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 10,
    maxWidth: 180,
    width: '100%',
    cursor: 'pointer',
  },
  storeBadgeTextWrap: {
    justifyContent: 'center',
  },
  storeBadgeSmall: {
    fontSize: 9,
    color: '#DCE7EC',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  storeBadgeLarge: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Newsletter
  newsletterSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  subscribeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    height: 44,
    maxWidth: 380,
    width: '100%',
    boxShadow: '0 2px 6px rgba(30, 58, 138, 0.05)',
  },
  newsletterInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E3A8A',
    outlineStyle: 'none',
  },
  subscribeBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  subscribedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  subscribedSuccess: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '700',
  },

  // Bottom Strip
  bottomStrip: {
    borderTopWidth: 1,
    borderTopColor: '#C4D8E7',
    paddingTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  bottomStripMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  copyrightText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
    minWidth: 260,
  },
  bottomRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bottomRightWrapMobile: {
    width: '100%',
    justifyContent: 'space-between',
  },
  madeWithWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  madeWithText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  scrollTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#13BE9C',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    shadowColor: '#13BE9C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 999,
  },
});

export default WebFooter;
