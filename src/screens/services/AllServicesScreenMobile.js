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

// All currently active & available MediUnify Mobile services
// Strictly reusing the exact icon set, labels/names, libraries, and colors from Mobile Home Screen
const ALL_SERVICES = [
  {
    id: 'videocall',
    title: 'Video Call Consultation',
    iconFamily: 'Ionicons',
    icon: 'videocam-outline',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'VideoConsultation',
    keywords: 'video call consultation teleconsult online doctor hd call instant care',
  },
  {
    id: 'pharmacy',
    title: 'Order Medicine',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'pill',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'Pharmacy',
    keywords: 'order medicine pharmacy prescription pills generic drugs medicines',
  },
  {
    id: 'lab',
    title: 'Lab Tests',
    iconFamily: 'Ionicons',
    icon: 'flask-outline',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'LabTests',
    keywords: 'lab tests blood test diagnostics health checkup urine sample collection',
  },
  {
    id: 'radiology',
    title: 'Scan & X-Ray',
    iconFamily: 'Ionicons',
    icon: 'scan-outline',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'RadiologyLabs',
    keywords: 'scans scan x-ray radiology mri ct scan ultrasound 2d echo ecg cardiology',
  },
  {
    id: 'doctors',
    title: 'In-Clinic Visit',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'hospital-building',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'DoctorList',
    keywords: 'in-clinic visit in clinic doctor visit appointment specialist consultation clinic',
  },
  {
    id: 'nurse',
    title: 'Home Nursing & Caregiver',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'home-heart',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'NurseBooking',
    keywords: 'home nursing caregiver attendant elderly care injections post-op',
  },
  {
    id: 'surgery',
    title: 'Hospital & Surgery',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'domain',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'HospitalCare',
    keywords: 'hospital surgery surgery care hospital admission nabh cashless operation procedure',
  },
  {
    id: 'equipment',
    title: 'Equipment Rental',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'wheelchair-accessibility',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'EquipmentRental',
    keywords: 'medical equipment rental hospital bed oxygen concentrator wheelchair bipap icu',
  },
  {
    id: 'ayurveda',
    title: 'Ayurveda & Wellness',
    iconFamily: 'Ionicons',
    icon: 'leaf-outline',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'AyurvedaWellness',
    keywords: 'ayurveda wellness herbal natural therapy panchakarma holistic nadi',
  },
  {
    id: 'insurance',
    title: 'Health Insurance',
    iconFamily: 'Ionicons',
    icon: 'shield-checkmark-outline',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'HealthInsurance',
    keywords: 'health insurance policy claim cashless hospitalization medical cover tpa',
  },
  {
    id: 'healthmonitor',
    title: 'Health Monitor',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'heart-pulse',
    iconColor: '#007D69',
    iconBg: '#E8F6F6',
    route: 'HealthMonitor',
    keywords: 'health monitor vitals blood pressure sugar heart rate bmi tracker',
  },
  {
    id: 'emergency',
    title: 'Emergency SOS',
    iconFamily: 'MaterialCommunityIcons',
    icon: 'ambulance',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
    route: 'Emergency',
    keywords: 'emergency ambulance sos 24x7 urgent helpline critical dispatch 108',
  },
];

const AllServicesScreen = ({ navigation, route }) => {
  const { t, language } = useTheme();
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER: ← All Services with Home Screen Location badge */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Back to Home"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('all_services', 'All Services')}</Text>
          <View style={styles.locationBadge}>
            <Ionicons name="location" size={13} color="#007D69" />
            <Text style={styles.locationBadgeText} numberOfLines={1}>
              {activeCity}
            </Text>
          </View>
        </View>
      </View>

      {/* SEARCH BAR (reusing existing lightweight search) */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchInputBox}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_all_services', 'Search all services...')}
            placeholderTextColor="#94A3B8"
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
          <Text style={styles.countText}>
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
            <Text style={styles.emptyTitle}>{t('no_matching_service', 'No matching service found')}</Text>
            <Text style={styles.emptySub}>
              {t('try_searching_again', 'Try searching for Doctor, Medicine, Lab Tests, Scan, or Nursing')}
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyResetBtnText}>{t('view_services', 'View All Services')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.gridContainer, { gap }]}>
            {filteredServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  { width: cardWidth },
                  isTablet && styles.serviceCardTablet,
                ]}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.72}
              >
                {/* Clean Home Screen Style Icon Container */}
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: service.iconBg || '#E8F6F6' },
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
                      color={service.iconColor || '#007D69'}
                    />
                  ) : (
                    <Ionicons
                      name={service.icon}
                      size={isTablet ? 28 : 25}
                      color={service.iconColor || '#007D69'}
                    />
                  )}
                </View>

                {/* Short Service Name */}
                <Text
                  style={[
                    styles.serviceName,
                    isTablet && styles.serviceNameTablet,
                  ]}
                  numberOfLines={3}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.82}
                >
                  {t(service.title, service.title)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom spacer: clears fixed bottom navigation bar on all platforms */}
        <View style={{ height: Platform.OS === 'ios' ? 110 : 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 124,
  },
  serviceCardTablet: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    minHeight: 142,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F6F6',
    borderWidth: 1.2,
    borderColor: '#C0ECE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBoxTablet: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginBottom: 12,
  },
  serviceIconImg: {
    width: 32,
    height: 32,
  },
  serviceIconImgTablet: {
    width: 38,
    height: 38,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2,
    ...Platform.select({
      ios: {
        lineHeight: 16,
      },
      android: {
        includeFontPadding: false,
      },
      default: {
        lineHeight: 16,
      },
    }),
  },
  serviceNameTablet: {
    fontSize: 14.5,
    ...Platform.select({
      ios: {
        lineHeight: 20,
      },
      android: {
        includeFontPadding: false,
      },
      default: {
        lineHeight: 20,
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
