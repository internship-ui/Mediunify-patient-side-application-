import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebFooter from '../../../components/web/WebFooter';
import { useTheme } from '../../../context/ThemeContext';

const service3dClinic = require('../../../../assets/icons/service_3d_clinic.jpg');
const service3dVideo = require('../../../../assets/icons/service_3d_video.jpg');
const service3dAyurveda = require('../../../../assets/icons/service_3d_ayurveda.jpg');

const CONSULTATION_TYPES = [
  {
    id: 'in-clinic',
    stepNumber: '01',
    titleKey: 'card_clinic_visit',
    title: 'In-Clinic Visit',
    subtitleKey: 'card_clinic_desc',
    subtitle: 'Book confirmed appointment slots near you.',
    accentColor: '#7C3AED',
    route: 'DoctorList',
    params: { mode: 'clinic' },
    image: service3dClinic,
  },
  {
    id: 'video-call',
    stepNumber: '02',
    titleKey: 'card_video_consult',
    title: 'Video Consultation',
    subtitleKey: 'card_video_desc',
    subtitle: 'Consult doctors from home in 60 seconds.',
    accentColor: '#0284C7',
    route: 'VideoConsultation',
    params: { mode: 'online' },
    image: service3dVideo,
  },
  {
    id: 'ayurveda',
    stepNumber: '03',
    titleKey: 'card_ayurveda',
    title: 'Ayurveda & Wellness',
    subtitleKey: 'card_ayurveda_desc',
    subtitle: 'Natural healing with certified Vaidyas.',
    accentColor: '#00B894',
    route: 'AyurvedaWellness',
    params: { mode: 'ayurveda' },
    image: service3dAyurveda,
  },
];

const TRUST_METRICS = [
  {
    icon: 'shield-checkmark',
    color: '#00B894',
    title: '100% Verified Specialists',
    subtitle: 'MCI & State Board registered',
  },
  {
    icon: 'time',
    color: '#1E3A8A',
    title: 'Zero Waiting Queue',
    subtitle: 'Instant slot confirmation',
  },
  {
    icon: 'lock-closed',
    color: '#00C2CB',
    title: '100% Private & HIPAA Safe',
    subtitle: 'Encrypted medical health records',
  },
  {
    icon: 'heart-half',
    color: '#7BC96F',
    title: '4.8/5 Star Rated Care',
    subtitle: '50,000+ satisfied consultations',
  },
];

const FindDoctorsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const isTablet = width >= 640 && width < 980;
  const { t, isIndic, isDarkMode, theme } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'find-doctors-interactive-css';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        .service-card {
          transition:
            transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .service-card:hover {
          transform: translateY(-10px) scale(1.015) !important;
          box-shadow:
            0 24px 48px -12px rgba(12, 59, 107, 0.14),
            0 8px 20px -6px rgba(12, 59, 107, 0.07) !important;
        }
        .service-card:active {
          transform: translateY(-4px) scale(1.005) !important;
        }
        .service-card-image {
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .service-card:hover .service-card-image {
          transform: scale(1.08) !important;
        }
      `;
    }
  }, []);

  const handleSelectOption = (item) => {
    if (item.route) {
      navigation?.navigate(item.route, item.params || {});
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, isDarkMode && { backgroundColor: theme.background }]}>
      {/* MOBILE / TABLET HEADER */}
      {!isDesktop && (
        <View style={[styles.mobileHeader, isDarkMode && { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation?.navigate('Home');
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color={isDarkMode ? theme.text : "#0F172A"} />
          </TouchableOpacity>
          <Text style={[styles.mobileHeaderTitle, isDarkMode && { color: theme.text }]}>{t('nav_find_doctors', 'Find Doctors')}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Healthcare Services — Exact Reference Design */}
        <View style={[styles.cardsSection, { maxWidth: isDesktop ? 1160 : '96%' }]}>
          <View style={styles.servicesCardsRowWrapper}>
            {/* Journey Connecting Wave behind cards */}
            {Platform.OS === 'web' && (
              <View style={styles.journeyWaveContainer} pointerEvents="none">
                {/* @ts-ignore */}
                <svg
                  style={{
                    position: 'absolute',
                    top: isDesktop ? 80 : 55,
                    left: 0,
                    width: '100%',
                    height: 48,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                  viewBox="0 0 1000 48"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 10 24 Q 160 6 320 26 T 620 20 T 900 26 T 995 24"
                    stroke="rgba(0, 184, 148, 0.22)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </svg>
              </View>
            )}

            <View
              style={[
                styles.cardsGrid,
                isDesktop
                  ? styles.cardsGridDesktop
                  : isTablet
                    ? styles.cardsGridTablet
                    : styles.cardsGridMobile,
              ]}
            >
              {CONSULTATION_TYPES.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.organicServiceCard,
                    isDarkMode && { backgroundColor: theme.card, borderColor: theme.border },
                    {
                      borderBottomColor: card.accentColor,
                      borderLeftColor: card.accentColor,
                      borderTopColor: 'transparent',
                      borderRightColor: 'transparent',
                    },
                  ]}
                  // @ts-ignore
                  className="service-card"
                  activeOpacity={0.92}
                  onPress={() => handleSelectOption(card)}
                >
                  {/* Organic Fluid 3D Card Illustration */}
                  <View style={[styles.organicIllustrationWrap, isDarkMode && { backgroundColor: '#162032' }]}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: card.accentColor }]}>
                      <Text style={styles.stepNumberText}>{card.stepNumber}</Text>
                    </View>
                    <Image
                      source={card.image}
                      style={[styles.organicIllustrationImage, isDarkMode && { mixBlendMode: 'normal' }]}
                      // @ts-ignore
                      className="service-card-image"
                      resizeMode="contain"
                    />
                  </View>

                  {/* Card Content */}
                  <View style={styles.organicCardContent}>
                    <Text style={[styles.organicCardTitle, isIndic && { lineHeight: 20 }, isDarkMode && { color: theme.text }]} numberOfLines={1}>
                      {card.titleKey ? t(card.titleKey, card.title) : card.title}
                    </Text>
                    <Text style={[styles.organicCardSubtitle, isIndic && { lineHeight: 16 }, isDarkMode && { color: theme.textSecondary }]} numberOfLines={2}>
                      {card.subtitleKey ? t(card.subtitleKey, card.subtitle) : card.subtitle}
                    </Text>

                    {/* Circular Arrow & Book Now CTA */}
                    <View style={styles.organicCtaRow}>
                      <View style={[styles.organicArrowCircle, { borderColor: card.accentColor }]}>
                        <Ionicons name="arrow-forward" size={12} color={card.accentColor} />
                      </View>
                      <Text style={[styles.organicCtaText, { color: card.accentColor }]}>
                        {t('book_now_btn', 'Book Now')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {Platform.OS !== 'web' && <View style={{ height: 110 }} />}

        {/* Web Footer */}
        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  mobileHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Breadcrumb
  breadcrumbBar: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  breadcrumbInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  breadcrumbTrail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  breadcrumbActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Hero Section
  heroSection: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 760,
    lineHeight: 23,
  },

  // 3 Cards Section
  cardsSection: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    ...(Platform.OS === 'web' ? {
      minHeight: 'calc(100vh - 40px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    } : {}),
  },
  cardsGrid: {
    width: '100%',
  },
  cardsGridDesktop: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'stretch',
  },
  cardsGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardsGridMobile: {
    flexDirection: 'column',
    gap: 16,
  },

  // Services Cards Wrapper & Wave
  servicesCardsRowWrapper: {
    width: '100%',
    position: 'relative',
  },
  journeyWaveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  // Organic Service Card (Matching exact user reference design)
  organicServiceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1.5,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    padding: 12,
    paddingBottom: 22,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(0, 0, 0, 0.02)',
    minHeight: 410,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'transform 0.24s ease, box-shadow 0.24s ease',
    } : {}),
  },
  organicIllustrationWrap: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  stepNumberBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    width: 27,
    height: 27,
    borderRadius: 13.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  organicIllustrationImage: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  organicCardContent: {
    paddingHorizontal: 8,
    paddingTop: 14,
    flex: 1,
    justifyContent: 'space-between',
  },
  organicCardTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  organicCardSubtitle: {
    fontSize: 12.5,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
    minHeight: 36,
  },
  organicCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 10,
  },
  organicArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicCtaText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Trust Metrics
  trustSection: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  trustInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 20,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 220,
  },
  trustIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextCol: {
    flex: 1,
  },
  trustItemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  trustItemSub: {
    fontSize: 12,
    color: '#64748B',
  },

  // Help Banner
  helpBannerWrap: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginBottom: 44,
  },
  helpBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  helpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 280,
  },
  helpIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  helpTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 2,
  },
  helpSub: {
    fontSize: 12.5,
    color: '#475569',
    maxWidth: 550,
  },
  helpCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  helpCallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default FindDoctorsScreen;
