import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import WebFooter from '../../components/web/WebFooter';

// All currently active & available MediUnify Mobile services
// 3D icon set matching Mobile Home Screen
const ALL_SERVICES = [
  {
    id: 'videocall',
    cardBg: '#EFF6FF',
    cardBorder: '#BFDBFE',
    titleColor: '#1E3A8A',
    title: 'Video Call Consultation',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_video.png'),
    iconBg: '#FFFFFF',
    route: 'VideoConsultation',
    keywords: 'video call consultation teleconsult online doctor hd call instant care',
  },
  {
    id: 'pharmacy',
    cardBg: '#FFF7ED',
    cardBorder: '#FED7AA',
    titleColor: '#9A3412',
    title: 'Order Medicine',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_medicine.png'),
    iconBg: '#FFFFFF',
    route: 'Pharmacy',
    keywords: 'order medicine pharmacy prescription pills generic drugs medicines',
  },
  {
    id: 'lab',
    cardBg: '#F0FDFA',
    cardBorder: '#99F6E4',
    titleColor: '#0F766E',
    title: 'Lab Tests',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_lab.png'),
    iconBg: '#FFFFFF',
    route: 'LabTests',
    keywords: 'lab tests blood test diagnostics health checkup urine sample collection',
  },
  {
    id: 'radiology',
    cardBg: '#F5F3FF',
    cardBorder: '#DDD6FE',
    titleColor: '#5B21B6',
    title: 'Scan & X-Ray',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_scan.png'),
    iconBg: '#FFFFFF',
    route: 'RadiologyLabs',
    keywords: 'scans scan x-ray radiology mri ct scan ultrasound 2d echo ecg cardiology',
  },
  {
    id: 'doctors',
    cardBg: '#EFF6FF',
    cardBorder: '#BFDBFE',
    titleColor: '#1E3A8A',
    title: 'In-Clinic Visit',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_clinic.png'),
    iconBg: '#FFFFFF',
    route: 'DoctorList',
    keywords: 'in-clinic visit in clinic doctor visit appointment specialist consultation clinic',
  },
  {
    id: 'nurse',
    cardBg: '#ECFDF5',
    cardBorder: '#A7F3D0',
    titleColor: '#065F46',
    title: 'Home Nursing & Caregiver',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_nurse.png'),
    iconBg: '#FFFFFF',
    route: 'NurseBooking',
    keywords: 'home nursing caregiver attendant elderly care injections post-op',
  },
  {
    id: 'surgery',
    cardBg: '#FEF2F2',
    cardBorder: '#FECACA',
    titleColor: '#991B1B',
    title: 'Hospital & Surgery',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_surgery.png'),
    iconBg: '#FFFFFF',
    route: 'HospitalCare',
    keywords: 'hospital surgery surgery care hospital admission nabh cashless operation procedure',
  },
  {
    id: 'equipment',
    cardBg: '#F0FDFA',
    cardBorder: '#99F6E4',
    titleColor: '#0F766E',
    title: 'Equipment Rental',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_equipment.png'),
    iconBg: '#FFFFFF',
    route: 'EquipmentRental',
    keywords: 'medical equipment rental hospital bed oxygen concentrator wheelchair bipap icu',
  },
  {
    id: 'ayurveda',
    cardBg: '#F7FEE7',
    cardBorder: '#D9F99D',
    titleColor: '#3F6212',
    title: 'Ayurveda & Wellness',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_ayurveda.png'),
    iconBg: '#FFFFFF',
    route: 'AyurvedaWellness',
    keywords: 'ayurveda wellness herbal natural therapy panchakarma holistic nadi',
  },
  {
    id: 'insurance',
    cardBg: '#F1F5F9',
    cardBorder: '#CBD5E1',
    titleColor: '#1E293B',
    title: 'Health Insurance',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_insurance.png'),
    iconBg: '#FFFFFF',
    route: 'HealthInsurance',
    keywords: 'health insurance policy claim cashless hospitalization medical cover tpa',
  },
  {
    id: 'healthmonitor',
    cardBg: '#FDF2F8',
    cardBorder: '#FBCFE8',
    titleColor: '#9D174D',
    title: 'Health Monitor',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_monitor.png'),
    iconBg: '#FFFFFF',
    route: 'HealthMonitor',
    keywords: 'health monitor vitals blood pressure sugar heart rate bmi tracker',
  },
  {
    id: 'emergency',
    cardBg: '#FEF2F2',
    cardBorder: '#FECACA',
    titleColor: '#DC2626',
    title: 'Emergency SOS',
    iconFamily: 'Image',
    image: require('../../../assets/icons/service_3d_emergency.png'),
    iconBg: '#FFFFFF',
    route: 'Emergency',
    keywords: 'emergency ambulance sos 24x7 urgent helpline critical dispatch 108',
  },
];

const DARK_SERVICE_STYLES = {
  videocall: { bg: '#132338', border: '#1E40AF', text: '#93C5FD' },
  pharmacy: { bg: '#2F180B', border: '#C2410C', text: '#FDBA74' },
  lab: { bg: '#0C2623', border: '#0F766E', text: '#5EEAD4' },
  radiology: { bg: '#201538', border: '#6D28D9', text: '#C4B5FD' },
  doctors: { bg: '#132338', border: '#1E40AF', text: '#93C5FD' },
  nurse: { bg: '#0D2720', border: '#047857', text: '#6EE7B7' },
  surgery: { bg: '#2F1217', border: '#B91C1C', text: '#FCA5A5' },
  equipment: { bg: '#0C2623', border: '#0F766E', text: '#5EEAD4' },
  ayurveda: { bg: '#1E280B', border: '#4D7C0F', text: '#BEF264' },
  insurance: { bg: '#1E293B', border: '#475569', text: '#CBD5E1' },
  healthmonitor: { bg: '#2F1022', border: '#9D174D', text: '#F472B6' },
  emergency: { bg: '#2F1217', border: '#DC2626', text: '#FCA5A5' },
};

const AllServicesScreen = ({ navigation, route }) => {
  const { t, language, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [storedCity, setStoredCity] = useState('');

  // Location synchronization from Home Screen (Source of Truth)
  useEffect(() => {
    let isMounted = true;
    const fetchCity = async () => {
      try {
        const saved =
          (await AsyncStorage.getItem('@mediunify_selected_city')) ||
          (await AsyncStorage.getItem('@unnathi_user_location'));
        if (isMounted && saved) {
          setStoredCity(saved);
        }
      } catch (e) {
        // Fallback default
      }
    };
    fetchCity();
    return () => {
      isMounted = false;
    };
  }, []);

  // Home Screen is the source of truth for location
  const activeCity =
    route?.params?.city ||
    route?.params?.location ||
    storedCity ||
    'Mysuru';

  // Responsive grid calculation for Mobile & Tablet (iOS, Android, iPad, Android Tablet)
  const isTablet = width >= 768;
  const numColumns = width >= 900 ? 4 : isTablet ? 3 : 2;
  const horizontalPadding = isTablet ? 24 : 16;
  const gap = isTablet ? 14 : 12;
  const cardWidth = Math.floor(
    (width - horizontalPadding * 2 - gap * (numColumns - 1)) / numColumns
  );

  // Filter services by search keywords
  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_SERVICES;
    return ALL_SERVICES.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.keywords.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Navigate to existing service workflow
  const handleServicePress = (service) => {
    navigation.navigate(service.route, {
      city: activeCity,
      location: activeCity,
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, isDarkMode && { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {/* HEADER: ← All Services with Home Screen Location badge */}
      <View style={[styles.header, isDarkMode && { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Back to Home"
        >
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, isDarkMode && { color: theme.text }]}>{t('all_services', 'All Services')}</Text>
          <View style={[styles.locationBadge, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="location" size={13} color="#007D69" />
            <Text style={[styles.locationBadgeText, isDarkMode && { color: theme.textSecondary }]} numberOfLines={1}>
              {activeCity}
            </Text>
          </View>
        </View>
      </View>

      {/* SEARCH BAR (reusing existing lightweight search) */}
      <View style={styles.searchBarWrap}>
        <View style={[styles.searchInputBox, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={[styles.searchInput, isDarkMode && { color: theme.text }]}
            placeholder={t('search_all_services', 'Search all services...')}
            placeholderTextColor={isDarkMode ? theme.inputPlaceholder : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SERVICES GRID */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Count summary */}
        <View style={styles.countRow}>
          <Text style={[styles.countText, isDarkMode && { color: theme.textSecondary }]}>
            {filteredServices.length}{' '}
            {t('services_available', filteredServices.length === 1 ? 'service available' : 'services available')}
          </Text>
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Text style={styles.clearSearchLink}>{t('clear_search', 'Clear search')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={44} color="#94A3B8" />
            <Text style={[styles.emptyTitle, isDarkMode && { color: theme.text }]}>{t('no_matching_service', 'No matching service found')}</Text>
            <Text style={[styles.emptySub, isDarkMode && { color: theme.textSecondary }]}>
              {t('try_searching_again', 'Try searching for Doctor, Medicine, Lab Tests, Scan, or Nursing')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyResetBtn, isDarkMode && { backgroundColor: '#134E4A' }]}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
            >
              <Text style={[styles.emptyResetBtnText, isDarkMode && { color: '#2DD4BF' }]}>{t('view_services', 'View All Services')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.gridContainer, { gap }]}>
            {filteredServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  {
                    width: cardWidth,
                    backgroundColor: isDarkMode
                      ? (DARK_SERVICE_STYLES[service.id]?.bg || '#1E293B')
                      : (service.cardBg || '#FFFFFF'),
                    borderColor: isDarkMode
                      ? (DARK_SERVICE_STYLES[service.id]?.border || '#334155')
                      : (service.cardBorder || '#E2E8F0'),
                  },
                  isTablet && styles.serviceCardTablet,
                ]}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.72}
              >
                {/* Clean Home Screen Style Icon Container */}
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'transparent', borderWidth: 0 },
                    isTablet && styles.iconBoxTablet,
                  ]}
                >
                  {service.iconFamily === 'Image' ? (
                    <Image
                      source={service.image}
                      style={[
                        styles.serviceIconImg,
                        isTablet && styles.serviceIconImgTablet,
                      ]}
                      resizeMode="contain"
                    />
                  ) : service.iconFamily === 'MaterialCommunityIcons' ? (
                    <MaterialCommunityIcons
                      name={service.icon}
                      size={isTablet ? 28 : 25}
                      color={isDarkMode ? (DARK_SERVICE_STYLES[service.id]?.text || '#38BDF8') : (service.iconColor || '#007D69')}
                    />
                  ) : (
                    <Ionicons
                      name={service.icon}
                      size={isTablet ? 28 : 25}
                      color={isDarkMode ? (DARK_SERVICE_STYLES[service.id]?.text || '#38BDF8') : (service.iconColor || '#007D69')}
                    />
                  )}
                </View>

                {/* Short Service Name */}
                <Text
                  style={[
                    styles.serviceName,
                    {
                      color: isDarkMode
                        ? (DARK_SERVICE_STYLES[service.id]?.text || '#F8FAFC')
                        : (service.titleColor || '#0F172A'),
                    },
                    isTablet && styles.serviceNameTablet,
                  ]}
                  numberOfLines={2}
                >
                  {t(service.title, service.title)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {Platform.OS === 'web' ? (
          <WebFooter navigation={navigation} />
        ) : (
          <View style={{ height: Platform.OS === 'ios' ? 110 : 96 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
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
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    maxWidth: 140,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007D69',
  },
  searchBarWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 36,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  clearSearchLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007D69',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 146,
  },
  serviceCardTablet: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    minHeight: 172,
    borderRadius: 22,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  iconBoxTablet: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 12,
  },
  serviceIconImg: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  serviceIconImgTablet: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  serviceName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        lineHeight: 18,
      },
      android: {
        includeFontPadding: false,
        lineHeight: 18,
      },
      default: {
        lineHeight: 18,
      },
    }),
  },
  serviceNameTablet: {
    fontSize: 16.5,
    ...Platform.select({
      ios: {
        lineHeight: 22,
      },
      android: {
        includeFontPadding: false,
        lineHeight: 22,
      },
      default: {
        lineHeight: 22,
      },
    }),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyResetBtn: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: '#007D69',
    borderRadius: 20,
  },
  emptyResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AllServicesScreen;
