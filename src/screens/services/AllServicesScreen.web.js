import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import AllServicesScreenMobile from './AllServicesScreen.js';
import WebBackButton from '../../components/web/WebBackButton';
import { isDesktopLayout } from '../../utils/responsiveLayoutHelper';

// ─────────────────────────────────────────────────
// Brand Palette — consistent with HomeScreen.web.js
// ─────────────────────────────────────────────────
const PALETTE = {
  teal: '#00B894',
  tealDark: '#009879',
  tealLight: '#ECFDF5',
  navyBlue: '#1E3A8A',
  slate: '#64748B',
  border: '#DCE7EC',
  white: '#FFFFFF',
  textDark: '#0F172A',
};

// ─────────────────────────────────────────────────
// All currently active & available MediUnify services
// ─────────────────────────────────────────────────
const ALL_SERVICES = [
  {
    id: 'videocall',
    title: 'Video Consultation',
    subtitle: 'Online video with certified doctors',
    iconFamily: 'Ionicons',
    icon: 'videocam-outline',
    iconColor: '#1170CF',
    iconBg: '#EEF2FF',
    accentColor: '#1170CF',
    route: 'VideoConsultation',
    badge: 'Available Now',
    keywords: 'video call consultation teleconsult online doctor hd call instant care',
  },
  {
    id: 'pharmacy',
    title: 'Order Medicine',
    subtitle: 'Medicines delivered to your door',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'pill',
    iconColor: '#6B46C1',
    iconBg: '#F0EBFF',
    accentColor: '#6B46C1',
    route: 'Pharmacy',
    badge: 'Fast Delivery',
    keywords: 'order medicine pharmacy prescription pills generic drugs medicines',
  },
  {
    id: 'lab',
    title: 'Lab Tests',
    subtitle: 'Certified tests with home sample pickup',
    iconFamily: 'Ionicons',
    icon: 'flask-outline',
    iconColor: '#00B894',
    iconBg: '#ECFDF5',
    accentColor: '#00B894',
    route: 'LabTests',
    badge: 'Free Pickup',
    keywords: 'lab tests blood test diagnostics health checkup urine sample collection',
  },
  {
    id: 'radiology',
    title: 'Scan & X-Ray',
    subtitle: 'MRI, CT & X-Ray at certified centres',
    iconFamily: 'Ionicons',
    icon: 'scan-outline',
    iconColor: '#1E3A8A',
    iconBg: '#EEF2FF',
    accentColor: '#1E3A8A',
    route: 'Imaging',
    badge: 'Same Day',
    keywords: 'scans scan x-ray radiology mri ct scan ultrasound 2d echo ecg',
  },
  {
    id: 'doctors',
    title: 'In-Clinic Visit',
    subtitle: 'In-clinic doctor consultations',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'hospital-building',
    iconColor: '#00B894',
    iconBg: '#ECFDF5',
    accentColor: '#00B894',
    route: 'DoctorList',
    badge: 'Top Rated',
    keywords: 'in-clinic visit doctor appointment specialist consultation clinic',
  },
  {
    id: 'nurse',
    title: 'Home Nurse & Caregiver',
    subtitle: 'Certified nurses and caregivers at home',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'home-heart',
    iconColor: '#DB2777',
    iconBg: '#FCE7F3',
    accentColor: '#DB2777',
    route: 'NurseBooking',
    badge: 'Home Visit',
    keywords: 'home nursing caregiver attendant elderly care injections post-op',
  },
  {
    id: 'surgery',
    title: 'Hospital & Surgery',
    subtitle: 'NABH accredited hospitals with cashless TPA',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'domain',
    iconColor: '#1E3A8A',
    iconBg: '#EEF2FF',
    accentColor: '#1E3A8A',
    route: 'HospitalCare',
    badge: 'NABH Certified',
    keywords: 'hospital surgery admission nabh cashless operation procedure',
  },
  {
    id: 'equipment',
    title: 'Equipment Rental',
    subtitle: 'Medical equipment rental with free setup in 4h',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'wheelchair-accessibility',
    iconColor: '#0F766E',
    iconBg: '#E0F7F4',
    accentColor: '#0F766E',
    route: 'EquipmentRental',
    badge: 'Free Setup',
    keywords: 'medical equipment rental hospital bed oxygen concentrator wheelchair bipap icu',
  },
  {
    id: 'ayurveda',
    title: 'Ayurveda & Wellness',
    subtitle: 'Certified Ayurvedic & Panchakarma therapies',
    iconFamily: 'Ionicons',
    icon: 'leaf-outline',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
    accentColor: '#16A34A',
    route: 'AyurvedaWellness',
    badge: 'AYUSH Certified',
    keywords: 'ayurveda wellness herbal natural therapy panchakarma holistic nadi',
  },
  {
    id: 'insurance',
    title: 'Health Insurance',
    subtitle: 'Compare & buy health insurance plans easily',
    iconFamily: 'Ionicons',
    icon: 'shield-checkmark-outline',
    iconColor: '#1E3A8A',
    iconBg: '#EEF2FF',
    accentColor: '#1E3A8A',
    route: 'HealthInsurance',
    badge: 'Cashless Claims',
    keywords: 'health insurance policy claim cashless hospitalization medical cover tpa',
  },
  {
    id: 'healthmonitor',
    title: 'Health Monitor',
    subtitle: 'Track vitals, BP, sugar & heart rate daily',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'heart-pulse',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
    accentColor: '#DC2626',
    route: 'HealthMonitor',
    badge: 'Track & Monitor',
    keywords: 'health monitor vitals blood pressure sugar heart rate bmi tracker',
  },
  {
    id: 'emergency',
    title: 'Emergency SOS',
    subtitle: '24/7 ambulance dispatch & emergency helpline',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'ambulance',
    iconColor: '#B91C1C',
    iconBg: '#FEE2E2',
    accentColor: '#B91C1C',
    route: 'Emergency',
    badge: '24/7 Active',
    keywords: 'emergency ambulance sos 24x7 urgent helpline critical dispatch 108',
  },
];

// ─────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────
const AllServicesScreenWeb = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const { t, language, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);

  const isDesktop = width >= 992;

  const [searchQuery, setSearchQuery] = useState('');
  const [storedCity, setStoredCity] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchCity = async () => {
      try {
        const saved =
          (await AsyncStorage.getItem('@mediunify_selected_city')) ||
          (await AsyncStorage.getItem('@unnathi_user_location'));
        if (isMounted && saved) setStoredCity(saved);
      } catch (e) {}
    };
    fetchCity();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeCity =
    route?.params?.city || route?.params?.location || storedCity || 'Mysuru';

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_SERVICES;
    return ALL_SERVICES.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.keywords.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleServicePress = (service) => {
    navigation.navigate(service.route, {
      city: activeCity,
      location: activeCity,
    });
  };

  const numColumns = isDesktop ? 3 : 2;
  const maxContentWidth = isDesktop ? 1100 : 760;

  // Inject CSS for hover transitions
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'all-services-web-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .svc-card-web {
            transition: transform 0.22s ease, box-shadow 0.22s ease;
          }
          .svc-card-web:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 36px rgba(0, 61, 52, 0.13) !important;
          }
          .svc-back-btn:hover {
            background-color: #D1FAE5 !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const cardWidthStyle =
    numColumns === 3
      ? { width: 'calc(33.33% - 14px)' }
      : { width: 'calc(50% - 8px)' };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && { backgroundColor: theme.background }]}>
      {/* ─── PAGE HEADER ─── */}
      <View style={[styles.pageHeader, isDarkMode && { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <View style={[styles.pageHeaderInner, { maxWidth: maxContentWidth }]}>
          <WebBackButton
            onPress={() => navigation.goBack()}
            accessibilityLabel={t('back', 'Back')}
          />

          <View style={styles.headerTitleBlock}>
            <Text style={[styles.pageTitle, isDarkMode && { color: theme.text }]}>{t('all_services', 'All Services')}</Text>
            <View style={[styles.locationRow, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }]}>
              <Ionicons name="location" size={13} color="#00B894" />
              <Text style={[styles.locationText, isDarkMode && { color: theme.textSecondary }]}>{activeCity}</Text>
            </View>
          </View>

          <View style={[styles.searchBar, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={17} color={isDarkMode ? '#94A3B8' : PALETTE.slate} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, isDarkMode && { color: theme.text }]}
              placeholder={t('search_services', 'Search all services...')}
              placeholderTextColor={isDarkMode ? theme.inputPlaceholder : "#94A3B8"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={17} color={isDarkMode ? '#94A3B8' : "#94A3B8"} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ─── CONTENT ─── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.contentInner, { maxWidth: maxContentWidth }]}>

          {/* Results summary row */}
          <View style={styles.resultsRow}>
            <View style={styles.resultsLeft}>
              <View style={[styles.resultsBadge, isDarkMode && { backgroundColor: 'rgba(0, 184, 148, 0.15)', borderColor: 'rgba(0, 184, 148, 0.35)' }]}>
                <Ionicons name="grid" size={14} color={isDarkMode ? '#00E5B0' : PALETTE.tealDark} />
                <Text style={[styles.resultsBadgeText, isDarkMode && { color: '#00E5B0' }]}>
                  {filteredServices.length}{' '}
                  {t('services_count', filteredServices.length === 1 ? 'service' : 'services')}
                </Text>
              </View>
              {searchQuery.trim().length > 0 && (
                <Text style={[styles.resultsQuery, isDarkMode && { color: '#94A3B8' }]}>
                  {t('matching_query', ' matching ')}
                  <Text style={{ fontWeight: '800', color: isDarkMode ? '#FFFFFF' : PALETTE.navyBlue }}>
                    &ldquo;{searchQuery}&rdquo;
                  </Text>
                </Text>
              )}
            </View>
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Text style={[styles.clearLink, isDarkMode && { color: '#00E5B0' }]}>{t('clear_search', 'Clear search')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ─── EMPTY STATE ─── */}
          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, isDarkMode && { backgroundColor: '#17243E' }]}>
                <Ionicons name="search-outline" size={42} color={isDarkMode ? '#64748B' : '#94A3B8'} />
              </View>
              <Text style={[styles.emptyTitle, isDarkMode && { color: '#FFFFFF' }]}>{t('no_services_found', 'No services found')}</Text>
              <Text style={[styles.emptySub, isDarkMode && { color: '#94A3B8' }]}>
                {t('try_searching_again', 'Try searching for "Doctor", "Lab Test", "Surgery", "Nursing", "Pharmacy" or "Scan".')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyResetBtn, isDarkMode && { backgroundColor: '#00B894' }]}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyResetText}>{t('view_services', 'View All Services')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ─── SERVICES GRID ─── */
            <View style={[styles.servicesGrid, { gap: isDesktop ? 20 : 16 }]}>
              {filteredServices.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    isDesktop ? styles.serviceCardDesktop : styles.serviceCardTablet,
                    cardWidthStyle,
                    isDarkMode && {
                      backgroundColor: '#111C35',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 10px 26px rgba(0, 0, 0, 0.45)',
                    },
                  ]}
                  // @ts-ignore
                  className="svc-card-web"
                  onPress={() => handleServicePress(service)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={service.title}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : service.iconBg }]}>
                      {service.iconFamily === 'MaterialCommunityIcons' ? (
                        <MaterialCommunityIcons
                          name={service.icon}
                          size={26}
                          color={isDarkMode && service.iconColor === '#1E3A8A' ? '#38BDF8' : service.iconColor}
                        />
                      ) : (
                        <Ionicons
                          name={service.icon}
                          size={26}
                          color={isDarkMode && service.iconColor === '#1E3A8A' ? '#38BDF8' : service.iconColor}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.serviceBadge,
                        {
                          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : service.accentColor + '33',
                          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : service.iconBg,
                        },
                      ]}
                    >
                      <Text style={[styles.serviceBadgeText, { color: isDarkMode && service.accentColor === '#1E3A8A' ? '#38BDF8' : service.accentColor }]}>
                        {t(service.badge, service.badge)}
                      </Text>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, isDarkMode && { color: '#FFFFFF' }]}>{t(service.title, service.title)}</Text>
                    <Text style={[styles.cardSubtitle, isDarkMode && { color: '#94A3B8' }]} numberOfLines={2}>
                      {t(service.subtitle, service.subtitle)}
                    </Text>
                  </View>

                  {/* Card CTA */}
                  <View style={styles.cardFooter}>
                    <View
                      style={[
                        styles.bookBtn,
                        {
                          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : service.iconBg,
                          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : service.accentColor + '33',
                        },
                      ]}
                    >
                      <Text style={[styles.bookBtnText, { color: isDarkMode && service.accentColor === '#1E3A8A' ? '#38BDF8' : service.accentColor }]}>
                        {t('book_now_btn', 'Book Now')}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color={isDarkMode && service.accentColor === '#1E3A8A' ? '#38BDF8' : service.accentColor}
                        style={{ marginLeft: 5 }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Trust strip */}
          <View style={[styles.trustStrip, isDarkMode && { backgroundColor: '#111C35', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            {[
              { icon: 'shield-checkmark', label: '3,200+ Verified Doctors' },
              { icon: 'lock-closed', label: '256-Bit SSL Encrypted' },
              { icon: 'ribbon', label: 'NABH Accredited' },
              { icon: 'medal', label: '4.9/5 Patient Rating' },
            ].map((item, i) => (
              <View key={i} style={styles.trustItem}>
                <Ionicons name={item.icon} size={15} color={isDarkMode ? '#00E5B0' : PALETTE.tealDark} />
                <Text style={[styles.trustItemText, isDarkMode && { color: '#94A3B8' }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 52 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F6FA',
  },

  // ─── HEADER ─────────────────────────────────────
  pageHeader: {
    width: '100%',
    backgroundColor: PALETTE.white,
    borderBottomWidth: 1.5,
    borderBottomColor: PALETTE.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 100,
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore
          boxShadow: '0 2px 16px rgba(0,61,52,0.06)',
          position: 'sticky',
          top: 0,
        }
      : {
          shadowColor: '#1E3A8A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 4,
        }),
  },
  pageHeaderInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PALETTE.tealLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: PALETTE.tealDark,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 120,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: PALETTE.navyBlue,
    letterSpacing: -0.4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.tealDark,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    minWidth: 220,
    flex: 1,
    maxWidth: 420,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: PALETTE.textDark,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },

  // ─── SCROLL & CONTENT ───────────────────────────
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  contentInner: {
    width: '100%',
  },

  // ─── RESULTS ROW ────────────────────────────────
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  resultsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE.tealLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resultsBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: PALETTE.tealDark,
  },
  resultsQuery: {
    fontSize: 13,
    color: PALETTE.slate,
    marginLeft: 8,
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.tealDark,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },

  // ─── SERVICES GRID ──────────────────────────────
  servicesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  serviceCard: {
    backgroundColor: PALETTE.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }),
  },
  serviceCardDesktop: {
    padding: 22,
  },
  serviceCardTablet: {
    padding: 18,
  },

  // Card sections
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardContent: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.navyBlue,
    letterSpacing: -0.3,
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: PALETTE.slate,
    lineHeight: 19,
  },
  cardFooter: {
    alignItems: 'flex-start',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  bookBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // ─── EMPTY STATE ────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: PALETTE.slate,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 400,
    marginBottom: 22,
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.tealDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  emptyResetText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ─── TRUST STRIP ────────────────────────────────
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 40,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: PALETTE.tealLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  trustItemText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: PALETTE.tealDark,
  },
});

const AllServicesScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  return !isDesktopLayout(width) ? (
    <AllServicesScreenMobile {...props} />
  ) : (
    <AllServicesScreenWeb {...props} />
  );
};

export default AllServicesScreenResponsive;
