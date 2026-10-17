import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../theme/colors';
import WebFooter from '../../../components/web/WebFooter';
import DoctorBookingModal from '../../../components/booking/DoctorBookingModal';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';

const DoctorDetailsScreen = ({ route, navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = Platform.OS === 'web' && isDesktopLayout(width);
  const doctor = route?.params?.doctor;
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  if (!doctor) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={55} color="#D32F2F" />
          <Text style={[styles.errorText, isIndic && { lineHeight: 22 }]}>{t('Doctor information unavailable.')}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>{t('back', 'Go Back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Open Turn-by-Turn GPS Navigation
  const handleOpenNavigation = () => {
    const lat = doctor.latitude || 12.2858;
    const lng = doctor.longitude || 76.6341;
    const label = encodeURIComponent(`${doctor.clinicName}, ${doctor.clinicAddress}`);

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : colors.secondary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isIndic && { lineHeight: 22 }]}>{t('Doctor Profile')}</Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleOpenNavigation}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 72 + Math.max(insets.bottom, 12) },
        ]}
      >
        {/* DESKTOP BREADCRUMBS */}
        {isDesktopWeb && (
          <View style={styles.breadcrumbsRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
              <Text style={styles.breadcrumbLink}>{t('Home')}</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSlash}>/</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorList')}>
              <Text style={styles.breadcrumbLink}>{t('nav_find_doctors', 'Find Doctors')}</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSlash}>/</Text>
            <Text style={styles.breadcrumbCurrent}>{doctor.name}</Text>
          </View>
        )}

        {/* DOCTOR PROFILE CARD */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: doctor.image }}
            style={styles.avatar}
          />

          <View style={styles.doctorHeaderInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, isIndic && { lineHeight: 24 }]}>{doctor.name}</Text>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            </View>

            <Text style={[styles.specialty, isIndic && { lineHeight: 20 }]}>{t(doctor.specialty, doctor.specialty)}</Text>
            <Text style={styles.qualification}>{doctor.qualification}</Text>

            <View style={styles.experienceBadge}>
              <Ionicons name="ribbon" size={13} color="#D97706" />
              <Text style={styles.experienceBadgeText}>
                {doctor.experience || `${doctor.experienceYears || 10}+ ${t('years_exp', 'Years Experience')}`}
              </Text>
            </View>
          </View>
        </View>

        {/* METRICS ROW (RATING, EXPERIENCE, PATIENTS) */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricBox}>
            <View style={styles.metricValRow}>
              <Ionicons name="star" size={16} color="#FFA000" />
              <Text style={styles.metricValText}>{doctor.rating || '4.9'}</Text>
            </View>
            <Text style={[styles.metricSubText, isIndic && { lineHeight: 16 }]}>{doctor.reviewCount || 300}+ {t('reviews', 'Reviews')}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricBox}>
            <Text style={styles.metricValText}>{doctor.experienceYears || 12}+ {t('years', 'Yrs')}</Text>
            <Text style={[styles.metricSubText, isIndic && { lineHeight: 16 }]}>{t('Clinical Practice')}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricBox}>
            <Text style={[styles.metricValText, { color: colors.primary }]}>₹{doctor.fee || 500}</Text>
            <Text style={[styles.metricSubText, isIndic && { lineHeight: 16 }]}>{t('consultation_fee', 'Consultation Fee')}</Text>
          </View>
        </View>

        {/* CLINIC LOCATION & NAVIGATION CARD */}
        <View style={styles.clinicCard}>
          <View style={styles.clinicCardHeader}>
            <View style={styles.clinicIconCircle}>
              <Ionicons name="business" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>{doctor.clinicName}</Text>
              <Text style={styles.clinicArea}>{doctor.clinicArea}</Text>
            </View>
            <View style={styles.distancePill}>
              <Ionicons name="navigate-outline" size={11} color={colors.secondary} />
              <Text style={styles.distancePillText}>{doctor.distance || '1.2 km away'}</Text>
            </View>
          </View>

          <View style={styles.addressBox}>
            <Ionicons name="location" size={16} color={colors.textSecondary} style={{ marginTop: 2 }} />
            <Text style={styles.addressText}>{doctor.clinicAddress}</Text>
          </View>

          {/* TIMINGS */}
          <View style={styles.timingsRow}>
            <Ionicons name="time-outline" size={15} color={colors.secondary} />
            <Text style={[styles.timingsText, isIndic && { lineHeight: 18 }]}>
              {t('In-Clinic Hours:')} {doctor.openHours || '09:30 AM - 01:30 PM, 05:00 PM - 08:30 PM'}
            </Text>
          </View>

          {/* DUAL NAVIGATION / CALL ACTIONS */}
          <View style={styles.clinicActionsRow}>
            <TouchableOpacity
              style={styles.navigateBtn}
              activeOpacity={0.85}
              onPress={handleOpenNavigation}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={[styles.navigateBtnText, isIndic && { lineHeight: 18 }]}>{t('Get Directions (GPS)')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callClinicBtn}
              activeOpacity={0.85}
              onPress={() => Linking.openURL(`tel:${doctor.phone || '+918212459901'}`)}
            >
              <Ionicons name="call" size={16} color={colors.secondary} />
              <Text style={[styles.callClinicBtnText, isIndic && { lineHeight: 18 }]}>{t('Call Clinic')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ABOUT DOCTOR */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, isIndic && { lineHeight: 22 }]}>{t('About Doctor')}</Text>
          <Text style={[styles.description, isIndic && { lineHeight: 20 }]}>
            {doctor.about ||
              `${doctor.name} is a highly qualified ${doctor.specialty} with ${doctor.experience || 'over a decade of experience'}. Known for compassionate and thorough patient consultations.`}
          </Text>
        </View>

        {/* SERVICES OFFERED */}
        {doctor.servicesOffered && doctor.servicesOffered.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, isIndic && { lineHeight: 22 }]}>{t('Services & Treatments Offered')}</Text>
            <View style={styles.servicesList}>
              {doctor.servicesOffered.map((service, idx) => (
                <View key={idx} style={styles.serviceItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={[styles.serviceItemText, isIndic && { lineHeight: 18 }]}>{t(service, service)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {isDesktopWeb && (
          <View style={{ marginTop: 40, marginHorizontal: -16 }}>
            <WebFooter />
          </View>
        )}
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomBarInner}>
          <View style={styles.bottomPriceCol}>
            <Text style={[styles.bottomFeeLabel, isIndic && { lineHeight: 16 }]}>{t('In-Person Fee')}</Text>
            <Text style={styles.bottomFeeAmount}>₹{doctor.fee || 500}</Text>
          </View>

          <TouchableOpacity
            style={styles.bookMainButton}
            activeOpacity={0.88}
            onPress={() => setBookingModalVisible(true)}
          >
            <Text style={[styles.bookMainButtonText, isIndic && { lineHeight: 20 }]}>{t('Book In-Person Visit')}</Text>
            <Ionicons name="calendar" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* IN-CLINIC DOCTOR BOOKING MODAL */}
      <DoctorBookingModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        doctor={doctor}
        consultationType="In-Person"
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.secondary,
  },

  content: {
    padding: 16,
    paddingBottom: 110,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  breadcrumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  breadcrumbLink: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  breadcrumbSlash: {
    fontSize: 12,
    color: '#94A3B8',
  },
  breadcrumbCurrent: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // PROFILE CARD
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 14,
  },
  doctorHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.secondary,
  },
  specialty: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  qualification: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  experienceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },

  // METRICS
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricBox: {
    alignItems: 'center',
  },
  metricValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricValText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondary,
  },
  metricSubText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },

  // CLINIC CARD
  clinicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clinicCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  clinicIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  clinicName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
  },
  clinicArea: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightTeal,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  distancePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  timingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  timingsText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },
  clinicActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navigateBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  navigateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  callClinicBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  callClinicBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },

  // SECTION CARD
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
  },
  servicesList: {
    gap: 6,
    marginTop: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceItemText: {
    fontSize: 12,
    color: colors.text,
  },

  // BOTTOM BAR
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  bottomBarInner: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPriceCol: {},
  bottomFeeLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bottomFeeAmount: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primary,
  },
  bookMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    height: 44,
    gap: 8,
  },
  bookMainButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // ERROR
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: colors.secondary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default DoctorDetailsScreen;