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

const CONSULTATION_TYPES = [
  {
    id: 'in-clinic',
    title: 'In-Clinic Visit',
    tag: 'IN-PERSON CARE',
    tagBg: '#EFF6FF',
    tagColor: '#1E3A8A',
    tagIcon: 'business-outline',
    subtitle: 'Book confirmed appointment slots with verified doctors near you.',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    cardBg: '#FFFFFF',
    btnBg: '#1E3A8A',
    btnText: 'Book In-Clinic Visit',
    priceText: 'From ₹299',
    route: 'DoctorList',
    params: { mode: 'clinic' },
    features: [
      'In-person clinical examination',
      'Confirmed slot & zero waiting queue',
      '1,500+ verified partner clinics',
      'Pay online or at clinic',
    ],
    popularBadge: 'Physical Care',
  },
  {
    id: 'video-call',
    title: 'Video Consultation',
    tag: 'ONLINE CONSULTATION',
    tagBg: '#E6F8F4',
    tagColor: '#00B894',
    tagIcon: 'videocam-outline',
    subtitle: 'Connect with specialist doctors online in 60 seconds.',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80',
    cardBg: '#FFFFFF',
    btnBg: '#00B894',
    btnText: 'Start Consultation',
    priceText: 'From ₹199',
    route: 'VideoConsultation',
    params: { mode: 'online' },
    features: [
      'Connect in 60 seconds (24/7 doctors)',
      'Private encrypted HD video call',
      'Instant verified digital prescription',
      'Free 3-day follow-up chat included',
    ],
    popularBadge: '60 Secs Connect',
  },
  {
    id: 'ayurveda',
    title: 'Ayurveda & Wellness',
    tag: 'NATURAL HEALING',
    tagBg: '#EBF8E7',
    tagColor: '#7BC96F',
    tagIcon: 'leaf-outline',
    subtitle: 'Consult certified Ayurvedic Vaidyas for natural healing and wellness.',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
    cardBg: '#FFFFFF',
    btnBg: '#7BC96F',
    btnText: 'Consult Vaidya',
    priceText: 'From ₹349',
    route: 'AyurvedaWellness',
    params: { mode: 'ayurveda' },
    features: [
      'Certified BAMS & MD Specialists',
      'Pulse diagnosis (Nadi Pariksha)',
      '100% Pure herbal formulations',
      'Diet, lifestyle & dosha balancing',
    ],
    popularBadge: 'Holistic Care',
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
  const { t, isIndic } = useTheme();

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
        .consult-choice-card {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.28s ease !important;
        }
        .consult-choice-card:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 24px 44px -12px rgba(15, 23, 42, 0.14), 0 10px 20px -6px rgba(15, 23, 42, 0.08) !important;
          border-color: #94A3B8 !important;
        }
        .consult-choice-btn {
          transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease !important;
        }
        .consult-choice-btn:hover {
          opacity: 0.95 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18) !important;
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* MOBILE / TABLET HEADER */}
      {!isDesktop && (
        <View style={styles.mobileHeader}>
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
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>{t('nav_find_doctors', 'Find Doctors')}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 3 Core Consultation Cards */}
        <View style={[styles.cardsSection, { maxWidth: isDesktop ? 1280 : '96%' }]}>
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
                  styles.choiceCard,
                  { flex: isDesktop ? 1 : undefined },
                ]}
                // @ts-ignore
                className="consult-choice-card"
                activeOpacity={0.92}
                onPress={() => handleSelectOption(card)}
              >
                {/* Popularity Badge */}
                <View style={styles.badgeTopWrap}>
                  <Text style={styles.badgeTopText}>{t(card.popularBadge, card.popularBadge)}</Text>
                </View>

                {/* Hero Card Image */}
                <View style={styles.cardImageWrap}>
                  <Image
                    source={{ uri: card.image }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay} />
                  <View style={[styles.cardTagPill, { backgroundColor: card.tagBg }]}>
                    <Ionicons name={card.tagIcon} size={13} color={card.tagColor} />
                    <Text style={[styles.cardTagText, { color: card.tagColor }]}>
                      {t(card.tag, card.tag)}
                    </Text>
                  </View>
                </View>

                {/* Card Main Body */}
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, isIndic && { lineHeight: 22 }]}>{t(card.title, card.title)}</Text>
                    <Text style={styles.pricePill}>{t(card.priceText, card.priceText)}</Text>
                  </View>

                  <Text style={[styles.cardSubtitle, isIndic && { lineHeight: 18 }]}>
                    {t(card.subtitle, card.subtitle)}
                  </Text>

                  {/* Feature Checkpoints */}
                  <View style={styles.featuresList}>
                    {card.features.map((feat, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginTop: 2 }} />
                        <Text style={[styles.featureItemText, isIndic && { lineHeight: 16 }]}>{t(feat, feat)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action CTA Button */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: card.btnBg }]}
                      // @ts-ignore
                      className="consult-choice-btn"
                      activeOpacity={0.88}
                      onPress={() => handleSelectOption(card)}
                    >
                      <Text style={[styles.actionBtnText, isIndic && { lineHeight: 18 }]}>{t(card.btnText, card.btnText)}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
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
    marginTop: 32,
    marginBottom: 56,
  },
  cardsGrid: {
    width: '100%',
  },
  cardsGridDesktop: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'stretch',
  },
  cardsGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  cardsGridMobile: {
    flexDirection: 'column',
    gap: 20,
  },

  // Choice Card
  choiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  badgeTopWrap: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTopText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cardImageWrap: {
    width: '100%',
    height: 190,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  cardTagPill: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardBody: {
    padding: 22,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pricePill: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 18,
    minHeight: 40,
  },
  featuresList: {
    gap: 10,
    marginBottom: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureItemText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  actionRow: {
    marginTop: 'auto',
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
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
