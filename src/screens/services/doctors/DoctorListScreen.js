import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Linking,
  Platform,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  requestLocationPermissionWebSafe,
  getCurrentPositionWebSafe,
  reverseGeocodeWebSafe,
  calculateDistanceKm,
} from '../../../utils/locationHelper';
import doctors, { doctorSpecialties, SPECIALIZATION_CATEGORIES } from '../../../data/doctors';
import colors from '../../../theme/colors';
import WebFooter from '../../../components/web/WebFooter';
import DoctorBookingModal from '../../../components/booking/DoctorBookingModal';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';
import Pagination from '../../../components/common/Pagination';
import GuestLeadModal from '../../../components/common/GuestLeadModal';
import { shouldShowGuestLeadPopup } from '../../../services/guestLeadService';

export const POPULAR_LOCALITIES = [
  { id: '1', name: 'Kuvempunagar', city: 'Mysore', full: 'Kuvempunagar, Mysore', latitude: 12.2858, longitude: 76.6341 },
  { id: '2', name: 'Jayalakshmipuram', city: 'Mysore', full: 'Jayalakshmipuram, Mysore', latitude: 12.3168, longitude: 76.6285 },
  { id: '3', name: 'Saraswathipuram', city: 'Mysore', full: 'Saraswathipuram, Mysore', latitude: 12.3021, longitude: 76.6318 },
  { id: '4', name: 'Vijayanagar 2nd Stage', city: 'Mysore', full: 'Vijayanagar 2nd Stage, Mysore', latitude: 12.3312, longitude: 76.6120 },
  { id: '5', name: 'Gokulam 3rd Stage', city: 'Mysore', full: 'Gokulam 3rd Stage, Mysore', latitude: 12.3355, longitude: 76.6310 },
  { id: '6', name: 'V.V. Mohalla', city: 'Mysore', full: 'V.V. Mohalla, Mysore', latitude: 12.3210, longitude: 76.6390 },
  { id: '7', name: 'Bannimantap', city: 'Mysore', full: 'Bannimantap, Mysore', latitude: 12.3380, longitude: 76.6520 },
  { id: '8', name: 'Nazarbad', city: 'Mysore', full: 'Nazarbad, Mysore', latitude: 12.3080, longitude: 76.6650 },
  { id: '9', name: 'Hebbal 1st Stage', city: 'Mysore', full: 'Hebbal, Mysore', latitude: 12.3610, longitude: 76.6150 },
  { id: '10', name: 'Mysore Central', city: 'Mysore', full: 'Mysore Central, Mysore', latitude: 12.3050, longitude: 76.6550 },
];

export const MOCKUP_SPECIALTIES = [
  { id: 'general', name: 'General', icon: 'person-outline', color: '#00B894', bg: '#E6F8F4' },
  { id: 'derma', name: 'Derma', icon: 'sparkles-outline', color: '#00C2CB', bg: '#E0F7FA' },
  { id: 'pedia', name: 'Pediatric', icon: 'happy-outline', color: '#7BC96F', bg: '#EBF8E7' },
  { id: 'gynae', name: 'Gynecology', icon: 'female-outline', color: '#1E3A8A', bg: '#EFF6FF' },
  { id: 'ortho', name: 'Orthopedic', icon: 'body-outline', color: '#1E3A8A', bg: '#EFF6FF' },
  { id: 'cardio', name: 'Cardiology', icon: 'heart-outline', color: '#FF7F50', bg: '#FFF2ED' },
  { id: 'neuro', name: 'Neurology', icon: 'pulse-outline', color: '#00C2CB', bg: '#E0F7FA' },
  { id: 'dental', name: 'Dentist', icon: 'medical-outline', color: '#00B894', bg: '#E6F8F4' },
];

export const TOP_QUICK_SPECIALTIES = [
  { id: 'all', label: 'All Doctors', icon: 'apps-outline' },
  { id: 'General Physician', label: 'General Physician', icon: 'person-outline' },
  { id: 'Cardiology', label: 'Cardiology', icon: 'heart-outline' },
  { id: 'Pediatrics', label: 'Pediatrics', icon: 'happy-outline' },
  { id: 'Orthopedics', label: 'Orthopedics', icon: 'body-outline' },
  { id: 'Dermatology', label: 'Dermatology', icon: 'sparkles-outline' },
  { id: 'Obstetrics & Gynecology', label: 'Gynecology', icon: 'female-outline' },
  { id: 'General Dentistry', label: 'Dentist', icon: 'medical-outline' },
  { id: 'ENT (Otorhinolaryngology)', label: 'ENT', icon: 'headset-outline' },
  { id: 'Neurology', label: 'Neurology', icon: 'pulse-outline' },
  { id: 'Gastroenterology', label: 'Gastroenterology', icon: 'flask-outline' },
  { id: 'Ophthalmology', label: 'Eye Care', icon: 'eye-outline' },
];

// ATTRACTIVE LIGHT CARD PALETTE (Soft, Professional & Vibrant - Fully Coloured Cards)
const DOCTOR_CARD_THEMES = [
  {
    // 1. Soft Emerald / Mint
    bgColor: '#E6F8F2',
    cardBg: 'linear-gradient(135deg, #ECFDF5 0%, #E2F8F0 50%, #D1F4E8 100%)',
    borderColor: '#86EFAC',
    accentColor: '#00B894',
    feeColor: '#007D69',
    badgeBorder: '#A7F3D0',
    btnBg: 'linear-gradient(135deg, #00B894 0%, #009677 100%)',
    shadowColor: 'rgba(0, 184, 148, 0.16)',
  },
  {
    // 2. Soft Sky Ice Blue
    bgColor: '#E0F2FE',
    cardBg: 'linear-gradient(135deg, #EFF6FF 0%, #E0F2FE 50%, #BAE6FD 100%)',
    borderColor: '#93C5FD',
    accentColor: '#0284C7',
    feeColor: '#0369A1',
    badgeBorder: '#BAE6FD',
    btnBg: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    shadowColor: 'rgba(2, 132, 199, 0.16)',
  },
  {
    // 3. Soft Lilac / Lavender
    bgColor: '#F3E8FF',
    cardBg: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 50%, #E9D5FF 100%)',
    borderColor: '#C4B5FD',
    accentColor: '#7C3AED',
    feeColor: '#6D28D9',
    badgeBorder: '#DDD6FE',
    btnBg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    shadowColor: 'rgba(124, 58, 237, 0.16)',
  },
  {
    // 4. Soft Sunset Coral / Peach
    bgColor: '#FFEDD5',
    cardBg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FED7AA 100%)',
    borderColor: '#FDBA74',
    accentColor: '#EA580C',
    feeColor: '#C2410C',
    badgeBorder: '#FED7AA',
    btnBg: 'linear-gradient(135deg, #FF7F50 0%, #EA580C 100%)',
    shadowColor: 'rgba(255, 127, 80, 0.16)',
  },
];

const DoctorAvatar = ({ image, name }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    ? name
        .replace(/^Dr\.\s*/i, '')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DR';

  return (
    <View style={styles.avatarWrapper}>
      {!imageFailed && image ? (
        <Image
          source={{ uri: image }}
          style={styles.avatar}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{initials}</Text>
          <Ionicons name="medical" size={12} color="#0D9488" style={styles.avatarFallbackIcon} />
        </View>
      )}
      <View style={styles.onlineStatusDot} />
    </View>
  );
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.0;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

const DoctorListScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && (isDesktopLayout(width) || width >= 600);
  const isWideScreen = isDesktopLayout(width);
  const scrollViewRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const DOCTORS_PER_PAGE = 6;

  const [search, setSearch] = useState(route?.params?.query || route?.params?.search || '');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');

  const handleSearchSubmit = async () => {
    const q = search.trim() || 'Doctors & Specialists';
    const shouldShow = await shouldShowGuestLeadPopup();
    if (shouldShow) {
      setPendingSearchQuery(q);
      setShowLeadModal(true);
      return;
    }
    Keyboard.dismiss();
  };
  const [selectedSpecialty, setSelectedSpecialty] = useState(route?.params?.specialty || route?.params?.categoryId || 'all');
  const [sidebarSpecSearch, setSidebarSpecSearch] = useState('');
  const [modalSpecSearch, setModalSpecSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    'general-primary': true,
    'cardiology-group': true,
  });

  const toggleCategory = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  useEffect(() => {
    if (route?.params?.query !== undefined) {
      setSearch(route.params.query);
    } else if (route?.params?.search !== undefined) {
      setSearch(route.params.search);
    }
  }, [route?.params?.query, route?.params?.search]);

  useEffect(() => {
    if (route?.params?.specialty !== undefined) {
      setSelectedSpecialty(route.params.specialty);
    } else if (route?.params?.categoryId !== undefined) {
      setSelectedSpecialty(route.params.categoryId);
    }
  }, [route?.params?.specialty, route?.params?.categoryId]);

  // Location State
  const initialLocality = route?.params?.locality || 'Kuvempunagar, Mysore';
  const [userLocality, setUserLocality] = useState(initialLocality);
  const [userCoords, setUserCoords] = useState({ latitude: 12.2858, longitude: 76.6341 });
  const [loadingGps, setLoadingGps] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [customLocalityInput, setCustomLocalityInput] = useState('');
  const [locationToast, setLocationToast] = useState(null);

  // Filter & Sort State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [maxDistance, setMaxDistance] = useState('all'); // 'all' | '2' | '5' | '10'
  const [minExperience, setMinExperience] = useState('all'); // 'all' | '5' | '10' | '15'
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);
  const [maxFee, setMaxFee] = useState('all'); // 'all' | '500' | '700'
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest' | 'rating' | 'experience' | 'fee'

  // Navigation / Directions Modal state
  const [directionsDoctor, setDirectionsDoctor] = useState(null);

  // In-Clinic Booking Modal state
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);

  // Detect Live GPS Location
  const detectLocation = async () => {
    try {
      setLoadingGps(true);
      const perm = await requestLocationPermissionWebSafe();
      if (!perm.granted && perm.status !== 'granted') {
        setLoadingGps(false);
        showAlert(
          'Location Permission Required',
          'Please enable device location permission or pick an area from the list below.'
        );
        return;
      }
      const position = await getCurrentPositionWebSafe({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserCoords(newCoords);

      const reverse = await reverseGeocodeWebSafe(newCoords);
      let detectedName = 'Current Location';
      if (reverse && reverse.length > 0) {
        const item = reverse[0];
        detectedName = item.formattedAddress || `${item.district || item.subregion || item.name || 'Current Area'}, ${item.city || 'Mysore'}`;
      }
      setUserLocality(detectedName);
      setLocationModalVisible(false);
      showToast(`Location set to: ${detectedName}`);
    } catch (e) {
      console.log('GPS detection error:', e);
      showAlert('GPS Notice', 'Could not detect live position. You can select any neighborhood from the list.');
    } finally {
      setLoadingGps(false);
    }
  };

  const showToast = (msg) => {
    setLocationToast(msg);
    setTimeout(() => {
      setLocationToast(null);
    }, 2500);
  };

  // Filtered Localities for Location Picker
  const filteredLocalities = useMemo(() => {
    if (!locationSearchQuery.trim()) return POPULAR_LOCALITIES;
    return POPULAR_LOCALITIES.filter((loc) =>
      loc.full.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
      loc.name.toLowerCase().includes(locationSearchQuery.toLowerCase())
    );
  }, [locationSearchQuery]);

  // Handle Select Location from list
  const handleSelectLocality = (loc) => {
    Keyboard.dismiss();
    setUserLocality(loc.full);
    setUserCoords({ latitude: loc.latitude, longitude: loc.longitude });
    setLocationModalVisible(false);
    setLocationSearchQuery('');
    showToast(`Location updated to ${loc.name}!`);
  };

  // Handle Custom Location Set
  const handleSetCustomLocation = () => {
    Keyboard.dismiss();
    if (!customLocalityInput.trim()) return;
    const name = customLocalityInput.trim();
    setUserLocality(name);
    // Find if matching or default center
    const match = POPULAR_LOCALITIES.find(
      (p) => p.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.name.toLowerCase())
    );
    if (match) {
      setUserCoords({ latitude: match.latitude, longitude: match.longitude });
    } else {
      setUserCoords({ latitude: 12.3050, longitude: 76.6550 });
    }
    setCustomLocalityInput('');
    setLocationModalVisible(false);
    showToast(`Location updated to ${name}!`);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSpecialty !== 'all') count++;
    if (maxDistance !== 'all') count++;
    if (minExperience !== 'all') count++;
    if (onlyAvailableToday) count++;
    if (maxFee !== 'all') count++;
    if (sortBy !== 'nearest') count++;
    return count;
  }, [selectedSpecialty, maxDistance, minExperience, onlyAvailableToday, maxFee, sortBy]);

  const resetFilters = () => {
    setSelectedSpecialty('all');
    setMaxDistance('all');
    setMinExperience('all');
    setOnlyAvailableToday(false);
    setMaxFee('all');
    setSortBy('nearest');
  };

  // Filtered & Dynamically Distance-Calculated Doctors
  const filteredDoctors = useMemo(() => {
    let result = doctors.map((doc) => {
      // Calculate dynamic distance from user's current selected location
      const calculatedKm = calculateDistanceKm(
        userCoords.latitude,
        userCoords.longitude,
        doc.latitude,
        doc.longitude
      );
      return {
        ...doc,
        distanceKm: calculatedKm,
        distance: `${calculatedKm} km away`,
      };
    });

    result = result.filter((doc) => {
      // 1. Search filter
      const matchesSearch =
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(search.toLowerCase()) ||
        doc.clinicName.toLowerCase().includes(search.toLowerCase()) ||
        doc.clinicArea.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Specialty filter
      if (selectedSpecialty !== 'all') {
        const specObj = doctorSpecialties.find(
          (s) => s.id === selectedSpecialty || s.key === selectedSpecialty
        );
        const catObj = SPECIALIZATION_CATEGORIES.find((c) => c.id === selectedSpecialty);

        const matchesKey =
          doc.specialtyKey === selectedSpecialty ||
          (specObj && (doc.specialtyKey === specObj.key || doc.specialtyKey === specObj.id));

        const matchesName =
          doc.specialty &&
          (doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase() ||
            (specObj &&
              (doc.specialty.toLowerCase().includes(specObj.name.toLowerCase()) ||
                specObj.name.toLowerCase().includes(doc.specialty.toLowerCase()))));

        const matchesCategory =
          (doc.categoryId && doc.categoryId === selectedSpecialty) ||
          (catObj &&
            (doc.categoryId === catObj.id ||
              catObj.specialties.some(
                (s) =>
                  s.key === doc.specialtyKey ||
                  s.id === doc.specialtyKey ||
                  (doc.specialty && doc.specialty.toLowerCase().includes(s.name.toLowerCase()))
              )));

        if (!matchesKey && !matchesName && !matchesCategory) {
          return false;
        }
      }

      // 3. Distance filter
      if (maxDistance !== 'all') {
        const maxD = parseFloat(maxDistance);
        if (doc.distanceKm > maxD) return false;
      }

      // 4. Experience filter
      if (minExperience !== 'all') {
        const minExp = parseInt(minExperience, 10);
        if (doc.experienceYears < minExp) return false;
      }

      // 5. Availability today
      if (onlyAvailableToday && !doc.availableToday) {
        return false;
      }

      // 6. Fee filter
      if (maxFee !== 'all') {
        const feeLimit = parseInt(maxFee, 10);
        if (doc.fee > feeLimit) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'nearest') {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'experience') {
        return b.experienceYears - a.experienceYears;
      }
      if (sortBy === 'fee') {
        return a.fee - b.fee;
      }
      return 0;
    });

    return result;
  }, [userCoords, search, selectedSpecialty, maxDistance, minExperience, onlyAvailableToday, maxFee, sortBy]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userCoords, search, selectedSpecialty, maxDistance, minExperience, onlyAvailableToday, maxFee, sortBy, userLocality]);

  const totalDoctors = filteredDoctors.length;
  const totalPages = Math.max(1, Math.ceil(totalDoctors / DOCTORS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDoctors = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * DOCTORS_PER_PAGE;
    return filteredDoctors.slice(startIndex, startIndex + DOCTORS_PER_PAGE);
  }, [filteredDoctors, safeCurrentPage]);

  // Open Turn-by-Turn Navigation Map
  const openExternalNavigation = (doc) => {
    const lat = doc.latitude;
    const lng = doc.longitude;
    const label = encodeURIComponent(`${doc.clinicName}, ${doc.clinicAddress}`);

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
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
          );
        }
      })
      .catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        );
      });
  };

  const handleOpenDirectionsModal = (doc) => {
    setDirectionsDoctor(doc);
  };

  const renderDoctor = ({ item, index = 0 }) => {
    const theme = DOCTOR_CARD_THEMES[index % DOCTOR_CARD_THEMES.length];

    return (
      <View
        style={[
          styles.card,
          isDesktopWeb && styles.cardDesktop,
          {
            backgroundColor: theme.bgColor,
            backgroundImage: theme.cardBg,
            borderColor: theme.borderColor,
            boxShadow: `0 8px 24px -2px ${theme.shadowColor}, 0 2px 6px rgba(0, 0, 0, 0.04)`,
          },
        ]}
      >
        {/* Doctor Main Details */}
        <TouchableOpacity
          style={styles.doctorMainRow}
          activeOpacity={0.88}
          onPress={() =>
            navigation.navigate('DoctorDetails', {
              doctor: item,
            })
          }
        >
          <DoctorAvatar image={item.image} name={item.name} />

          <View style={styles.doctorInfoCol}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.doctorName} numberOfLines={1}>{item.name}</Text>
              <Ionicons name="checkmark-circle" size={15} color={theme.accentColor} />
            </View>

            <Text style={styles.specialtyText} numberOfLines={1}>
              {item.specialty} • {item.experienceYears || '10+'} yrs exp
            </Text>

            <View style={[styles.clinicLocationWrap, { borderColor: theme.badgeBorder }]}>
              <Ionicons name="business-outline" size={12} color={theme.accentColor} />
              <Text style={styles.clinicNameText} numberOfLines={1}>
                {item.clinicName}
              </Text>
              <Text style={styles.distanceBadgeText}>• {item.distance}</Text>
            </View>

            {/* Ratings & Slot Badges */}
            <View style={styles.metricsRow}>
              <View style={[styles.ratingChip, { borderColor: theme.badgeBorder }]}>
                <Ionicons name="star" size={11} color="#FFA000" />
                <Text style={styles.ratingChipText}>{item.rating}</Text>
                <Text style={styles.reviewsCountText}>({item.reviewCount})</Text>
              </View>

              <View style={[styles.slotBadge, { borderColor: theme.badgeBorder }]}>
                <Ionicons name="flash-outline" size={11} color={theme.accentColor} />
                <Text style={[styles.slotBadgeText, { color: theme.accentColor }]}>{item.nextSlot}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* BOTTOM FOOTER: FEE & SIDE-BY-SIDE ACTIONS */}
        <View style={[styles.cardFooterRow, isDesktopWeb && styles.cardFooterRowDesktop]}>
          <View style={[styles.feeWrap, { borderColor: theme.badgeBorder }]}>
            <Text style={[styles.feeLabel, { color: theme.feeColor }]}>Fee</Text>
            <Text style={[styles.feeAmount, { color: theme.feeColor }]}>₹{item.fee}</Text>
          </View>

          <View style={styles.cardActionsWrap}>
            <TouchableOpacity
              style={[styles.navigateButton, { borderColor: theme.badgeBorder }]}
              activeOpacity={0.82}
              onPress={() => handleOpenDirectionsModal(item)}
            >
              <Ionicons name="navigate-outline" size={13} color="#1E3A8A" />
              <Text style={styles.navigateButtonText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookAppointmentButton,
                { backgroundImage: theme.btnBg, backgroundColor: theme.accentColor },
              ]}
              activeOpacity={0.88}
              onPress={() => setSelectedDoctorForBooking(item)}
            >
              <Text style={styles.bookAppointmentButtonText}>Book Visit</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // DESKTOP LEFT FILTER SIDEBAR
  const renderDesktopSidebar = () => (
    <View style={styles.desktopSidebarCard}>
      {/* 1. Header Row */}
      <View style={styles.sidebarHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="options" size={18} color="#1E3A8A" />
          <Text style={styles.sidebarTitle}>Filters</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.sidebarBadge}>
              <Text style={styles.sidebarBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={resetFilters} activeOpacity={0.7}>
          <Text style={styles.sidebarResetLink}>Reset All</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Availability Today Toggle */}
      <View style={styles.sidebarSection}>
        <TouchableOpacity
          style={styles.sidebarToggleCard}
          onPress={() => setOnlyAvailableToday(!onlyAvailableToday)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.sidebarDot, onlyAvailableToday && { backgroundColor: '#10B981' }]} />
              <Text style={styles.sidebarToggleTitle}>Available Today</Text>
            </View>
            <Text style={styles.sidebarToggleSub}>In-clinic walk-in & appointments</Text>
          </View>
          <View style={[styles.miniSwitch, onlyAvailableToday && styles.miniSwitchActive]}>
            <View style={[styles.miniKnob, onlyAvailableToday && styles.miniKnobActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. Distance from You */}
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarSectionTitle}>Distance from You</Text>
        <View style={styles.sidebarOptionsCol}>
          {[
            { label: 'Any Distance', value: 'all' },
            { label: 'Within 2 km', value: '2' },
            { label: 'Within 5 km', value: '5' },
            { label: 'Within 10 km', value: '10' },
          ].map((opt) => {
            const isSelected = maxDistance === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.sidebarRadioRow}
                onPress={() => setMaxDistance(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={isSelected ? '#00B894' : '#94A3B8'}
                />
                <Text style={[styles.sidebarOptionText, isSelected && styles.sidebarOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Doctor Specialization */}
      <View style={styles.sidebarSection}>
        <View style={styles.sidebarSectionHeaderRow}>
          <Text style={styles.sidebarSectionTitle}>Specialization ({doctorSpecialties.length - 1})</Text>
          {selectedSpecialty !== 'all' && (
            <TouchableOpacity onPress={() => setSelectedSpecialty('all')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.sidebarClearSpecLink}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* In-sidebar search input */}
        <View style={styles.sidebarSpecSearchBox}>
          <Ionicons name="search-outline" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.sidebarSpecSearchInput}
            placeholder="Search 80+ specializations..."
            placeholderTextColor="#94A3B8"
            value={sidebarSpecSearch}
            onChangeText={setSidebarSpecSearch}
          />
          {sidebarSpecSearch.length > 0 && (
            <TouchableOpacity onPress={() => setSidebarSpecSearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={14} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* If searching within specializations */}
        {sidebarSpecSearch.trim() !== '' ? (
          <ScrollView
            style={styles.sidebarSpecScrollList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {/* Full Category matches in search */}
            {SPECIALIZATION_CATEGORIES
              .filter((c) => c.name.toLowerCase().includes(sidebarSpecSearch.toLowerCase()))
              .map((cat) => {
                const isSelected = selectedSpecialty === cat.id;
                return (
                  <TouchableOpacity
                    key={`cat-${cat.id}`}
                    style={[styles.sidebarSpecialtyRow, styles.sidebarFullCatSearchRow, isSelected && styles.sidebarSpecialtyRowActive]}
                    onPress={() => setSelectedSpecialty(isSelected ? 'all' : cat.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={cat.icon || 'layers-outline'}
                      size={14}
                      color={isSelected ? '#00B894' : '#0D9488'}
                      style={{ width: 16 }}
                    />
                    <View style={{ flex: 1, marginLeft: 4 }}>
                      <Text
                        style={[styles.sidebarSpecialtyText, { fontWeight: '700', color: isSelected ? '#00B894' : '#0F766E' }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      <Text style={styles.sidebarSpecCategoryHint} numberOfLines={1}>
                        {cat.specialties.length} specializations
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={14} color="#00B894" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}

            {/* Individual sub-specialty matches */}
            {doctorSpecialties
              .filter(
                (s) =>
                  s.id !== 'all' &&
                  (s.name.toLowerCase().includes(sidebarSpecSearch.toLowerCase()) ||
                    (s.categoryName && s.categoryName.toLowerCase().includes(sidebarSpecSearch.toLowerCase())))
              )
              .map((spec) => {
                const isSelected = selectedSpecialty === spec.id || selectedSpecialty === spec.key;
                return (
                  <TouchableOpacity
                    key={spec.id}
                    style={[styles.sidebarSpecialtyRow, isSelected && styles.sidebarSpecialtyRowActive]}
                    onPress={() => setSelectedSpecialty(isSelected ? 'all' : spec.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={spec.icon || 'medkit-outline'}
                      size={13}
                      color={isSelected ? '#00B894' : '#64748B'}
                      style={{ width: 16 }}
                    />
                    <View style={{ flex: 1, marginLeft: 4 }}>
                      <Text
                        style={[styles.sidebarSpecialtyText, isSelected && styles.sidebarSpecialtyTextActive]}
                        numberOfLines={1}
                      >
                        {spec.name}
                      </Text>
                      {spec.categoryName && (
                        <Text style={styles.sidebarSpecCategoryHint} numberOfLines={1}>
                          {spec.categoryName}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={14} color="#00B894" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        ) : (
          /* Categorized Accordion List */
          <ScrollView
            style={styles.sidebarSpecScrollList}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {/* All Specializations Option */}
            <TouchableOpacity
              style={[
                styles.sidebarSpecialtyRow,
                selectedSpecialty === 'all' && styles.sidebarSpecialtyRowActive,
                { marginBottom: 4 },
              ]}
              onPress={() => setSelectedSpecialty('all')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="medkit-outline"
                size={14}
                color={selectedSpecialty === 'all' ? '#00B894' : '#64748B'}
                style={{ width: 18 }}
              />
              <Text
                style={[
                  styles.sidebarSpecialtyText,
                  selectedSpecialty === 'all' && styles.sidebarSpecialtyTextActive,
                ]}
              >
                All Specializations
              </Text>
              {selectedSpecialty === 'all' && (
                <Ionicons name="checkmark-circle" size={14} color="#00B894" style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>

            {SPECIALIZATION_CATEGORIES.map((cat) => {
              const isExpanded = !!expandedCategories[cat.id];
              const isFullCatSelected = selectedSpecialty === cat.id;
              const hasActiveChild = cat.specialties.some(
                (s) => s.id === selectedSpecialty || s.key === selectedSpecialty
              );
              const isCategoryActive = isFullCatSelected || hasActiveChild;

              return (
                <View key={cat.id} style={styles.sidebarCategoryGroup}>
                  {/* Category Header Row */}
                  <View
                    style={[
                      styles.sidebarCategoryHeader,
                      isCategoryActive && styles.sidebarCategoryHeaderActive,
                    ]}
                  >
                    {/* Selectable category button to select the whole specialization section */}
                    <TouchableOpacity
                      style={styles.sidebarCategorySelectBtn}
                      onPress={() => {
                        if (isFullCatSelected) {
                          setSelectedSpecialty('all');
                        } else {
                          setSelectedSpecialty(cat.id);
                          if (!isExpanded) {
                            toggleCategory(cat.id);
                          }
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={cat.icon || 'medkit-outline'}
                        size={15}
                        color={isCategoryActive ? '#00B894' : '#64748B'}
                        style={{ marginRight: 8, width: 16 }}
                      />
                      <Text
                        style={[
                          styles.sidebarCategoryTitle,
                          isCategoryActive && styles.sidebarCategoryTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      {isFullCatSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={15}
                          color="#00B894"
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </TouchableOpacity>

                    {/* Expand/Collapse Chevron Button */}
                    <TouchableOpacity
                      style={styles.sidebarCategoryExpandBtn}
                      onPress={() => toggleCategory(cat.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <View style={[styles.sidebarCategoryBadge, isCategoryActive && styles.sidebarCategoryBadgeActive]}>
                        <Text style={[styles.sidebarCategoryCount, isCategoryActive && styles.sidebarCategoryCountActive]}>
                          {cat.specialties.length}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={isCategoryActive ? '#00B894' : '#94A3B8'}
                        style={{ marginLeft: 2 }}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Expanded Sub-options (Clean individual sub-specialties) */}
                  {isExpanded && (
                    <View style={styles.sidebarCategoryChildren}>
                      {cat.specialties.map((spec) => {
                        const isSelected =
                          selectedSpecialty === spec.id || selectedSpecialty === spec.key;
                        return (
                          <TouchableOpacity
                            key={spec.id}
                            style={[
                              styles.sidebarChildSpecRow,
                              isSelected && styles.sidebarChildSpecRowActive,
                            ]}
                            onPress={() => setSelectedSpecialty(isSelected ? 'all' : spec.id)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name={isSelected ? 'checkmark-circle' : (spec.icon || 'ellipse')}
                              size={isSelected ? 13 : 10}
                              color={isSelected ? '#00B894' : '#94A3B8'}
                              style={{ marginRight: 8, width: 14 }}
                            />
                            <Text
                              style={[
                                styles.sidebarChildSpecText,
                                isSelected && styles.sidebarChildSpecTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {spec.name}
                            </Text>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={14}
                                color="#00B894"
                                style={{ marginLeft: 'auto' }}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 5. Consultation Fee */}
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarSectionTitle}>Consultation Fee</Text>
        <View style={styles.sidebarOptionsCol}>
          {[
            { label: 'All Fees', value: 'all' },
            { label: 'Under ₹500', value: '500' },
            { label: 'Under ₹700', value: '700' },
          ].map((opt) => {
            const isSelected = maxFee === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.sidebarRadioRow}
                onPress={() => setMaxFee(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={isSelected ? '#00B894' : '#94A3B8'}
                />
                <Text style={[styles.sidebarOptionText, isSelected && styles.sidebarOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 6. Doctor Experience */}
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarSectionTitle}>Experience</Text>
        <View style={styles.sidebarOptionsCol}>
          {[
            { label: 'Any Experience', value: 'all' },
            { label: '5+ Years', value: '5' },
            { label: '10+ Years', value: '10' },
            { label: '15+ Years', value: '15' },
          ].map((opt) => {
            const isSelected = minExperience === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.sidebarRadioRow}
                onPress={() => setMinExperience(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={isSelected ? '#00B894' : '#94A3B8'}
                />
                <Text style={[styles.sidebarOptionText, isSelected && styles.sidebarOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 7. Sort By */}
      <View style={[styles.sidebarSection, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
        <Text style={styles.sidebarSectionTitle}>Sort Doctors</Text>
        <View style={styles.sidebarOptionsCol}>
          {[
            { label: 'Nearest First', value: 'nearest' },
            { label: 'Highest Rated', value: 'rating' },
            { label: 'Most Experienced', value: 'experience' },
            { label: 'Fee: Low to High', value: 'fee' },
          ].map((opt) => {
            const isSelected = sortBy === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.sidebarRadioRow}
                onPress={() => setSortBy(opt.value)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={isSelected ? '#00B894' : '#94A3B8'}
                />
                <Text style={[styles.sidebarOptionText, isSelected && styles.sidebarOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={isDesktopWeb}
      >
        {/* ==================================================
            HEADER (MOBILE ONLY)
        ================================================== */}
        {!isDesktopWeb && (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Doctors</Text>
              <TouchableOpacity
                style={styles.headerLocationBtn}
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-sharp" size={11} color="#0D9488" />
                <Text style={styles.headerLocationText} numberOfLines={1}>
                  {loadingGps ? 'Detecting...' : userLocality.split(',')[0]}
                </Text>
                <Ionicons name="chevron-down" size={10} color="#0D9488" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.filterHeaderBtn, activeFiltersCount > 0 && styles.filterHeaderBtnActive]}
              activeOpacity={0.8}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={activeFiltersCount > 0 ? '#FFFFFF' : '#1E3A8A'}
              />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadgeCount}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================
            TOAST FEEDBACK MESSAGE
        ================================================== */}
        {locationToast && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.toastBannerText}>{locationToast}</Text>
          </View>
        )}

        {/* ==================================================
            UNIFIED SEARCH & LOCATION CONSOLE (DESKTOP & MOBILE)
        ================================================== */}
        <View style={[styles.searchConsoleContainer, isDesktopWeb && styles.searchConsoleContainerDesktop]}>
          {isDesktopWeb && (
            <TouchableOpacity
              style={[styles.standaloneLocationCard, styles.standaloneLocationCardDesktop]}
              onPress={() => setLocationModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.consoleLocIconWrap}>
                <Ionicons name="location-sharp" size={18} color="#0D9488" />
              </View>
              <View style={styles.consoleLocInfo}>
                <Text style={styles.consoleLocLabel}>LOCATION</Text>
                <Text style={styles.consoleLocValue} numberOfLines={1}>
                  {loadingGps ? 'Detecting GPS...' : userLocality}
                </Text>
              </View>
              <View style={styles.consoleChangeBadge}>
                <Text style={styles.consoleChangeBtnText}>Change</Text>
                <Ionicons name="chevron-down" size={13} color="#0D9488" />
              </View>
            </TouchableOpacity>
          )}

          {/* STANDALONE SEARCH CARD */}
          <View style={[styles.standaloneSearchCard, isDesktopWeb && styles.standaloneSearchCardDesktop]}>
            <Ionicons name="search-outline" size={18} color="#0D9488" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.consoleSearchInput, isDesktopWeb && { fontSize: 14.5 }]}
              placeholder="Search doctors, specialties, clinics..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4, marginRight: 4 }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {!isDesktopWeb && (
              <TouchableOpacity
                style={[styles.consoleGpsBtn, loadingGps && { opacity: 0.6 }]}
                onPress={() => detectLocation()}
                disabled={loadingGps}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {loadingGps ? (
                  <ActivityIndicator size="small" color="#0D9488" />
                ) : (
                  <Ionicons name="locate" size={16} color="#0D9488" />
                )}
              </TouchableOpacity>
            )}

            {isDesktopWeb && (
              <TouchableOpacity
                style={styles.consoleSearchActionBtn}
                activeOpacity={0.85}
                onPress={handleSearchSubmit}
              >
                <Ionicons name="search" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.consoleSearchActionBtnText}>Search</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ==================================================
            MAIN CONTENT AREA: DESKTOP 2-COLUMN (VISIBLE FILTER SIDEBAR + DOCTORS LIST)
        ================================================== */}
        <View style={[styles.mainLayoutWrap, isWideScreen && styles.mainLayoutWrapDesktop]}>
          {/* Left Filter Sidebar - Visible on Desktop & Tablets! */}
          {isWideScreen && (
            <View style={styles.desktopSidebarCol}>
              {renderDesktopSidebar()}
            </View>
          )}

          {/* Right Content Column: Results count & Doctors Cards */}
          <View style={[styles.doctorsColWrap, isWideScreen && styles.doctorsColWrapDesktop]}>
            <View style={styles.resultsHeaderRow}>
              <View style={styles.resultsHeadingWrap}>
                <Text style={styles.sectionHeadingTitle}>Doctors</Text>
                <View style={styles.resultsCountBadge}>
                  <Text style={styles.resultsCountBadgeText}>{totalDoctors}</Text>
                </View>
              </View>

              {/* Interactive Horizontal Sort Options */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sortPillsScroll}
              >
                {[
                  { id: 'nearest', label: 'Nearest' },
                  { id: 'rating', label: 'Top Rated' },
                  { id: 'experience', label: 'Experience' },
                  { id: 'fee', label: 'Lowest Fee' },
                ].map((item) => {
                  const isSortActive = sortBy === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sortPillBtn, isSortActive && styles.sortPillBtnActive]}
                      onPress={() => setSortBy(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sortPillText, isSortActive && styles.sortPillTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {selectedSpecialty !== 'all' && (
              <View style={styles.activeSpecChipRow}>
                <View style={styles.activeSpecChip}>
                  <Text style={styles.activeSpecChipLabel}>Specialization:</Text>
                  <Text style={styles.activeSpecChipValue}>
                    {SPECIALIZATION_CATEGORIES.find((c) => c.id === selectedSpecialty)?.name ||
                      doctorSpecialties.find((s) => s.id === selectedSpecialty || s.key === selectedSpecialty)?.name ||
                      selectedSpecialty}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedSpecialty('all')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 6 }}
                  >
                    <Ionicons name="close-circle" size={16} color="#00B894" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={styles.clearAllFiltersText}>Reset Filter</Text>
                </TouchableOpacity>
              </View>
            )}

            {filteredDoctors.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={54} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Nearby Doctors Found</Text>
                <Text style={styles.emptySubtitle}>
                  Try picking another area or resetting distance and specialty filters.
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSearch('');
                    setSelectedSpecialty('all');
                    resetFilters();
                  }}
                >
                  <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.doctorsCardsList}>
                  {paginatedDoctors.map((doc, idx) => (
                    <View key={doc.id}>
                      {renderDoctor({ item: doc, index: idx })}
                    </View>
                  ))}
                </View>

                {/* PAGINATION (5 DOCTORS PER PAGE) */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={safeCurrentPage}
                    totalPages={totalPages}
                    onPageChange={(pageNum) => {
                      setCurrentPage(pageNum);
                      scrollViewRef.current?.scrollTo({ y: isDesktopWeb ? 90 : 140, animated: true });
                    }}
                  />
                )}
              </>
            )}
          </View>
        </View>
        {isDesktopWeb && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* ==================================================
          LOCATION SELECTION & GPS MODAL
      ================================================== */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setLocationModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          >
            <TouchableOpacity
              style={[styles.locationModalCard, { maxHeight: '85%' }]}
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* MODAL HEADER */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.locationModalIconBox}>
                  <Ionicons name="location" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalHeaderTitle}>Select Location</Text>
                  <Text style={styles.modalHeaderSub}>Find doctors near your area</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    Keyboard.dismiss();
                    setLocationModalVisible(false);
                  }}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* SEARCH LOCALITY INPUT */}
              <View style={styles.localitySearchBox}>
                <Ionicons name="search-outline" size={16} color="#94A3B8" />
                <TextInput
                  style={styles.localitySearchInput}
                  placeholder="Search area, locality, or city..."
                  placeholderTextColor="#94A3B8"
                  value={locationSearchQuery}
                  onChangeText={setLocationSearchQuery}
                />
                {locationSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setLocationSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* DUAL QUICK ACTIONS: CURRENT GPS & LIVE MAP */}
              <View style={styles.quickLocActionsRow}>
                <TouchableOpacity
                  style={[styles.quickLocActionBtn, styles.quickLocActionBtnActive]}
                  activeOpacity={0.8}
                  onPress={() => {
                    Keyboard.dismiss();
                    detectLocation();
                  }}
                  disabled={loadingGps}
                >
                  {loadingGps ? (
                    <ActivityIndicator size="small" color="#0D9488" />
                  ) : (
                    <Ionicons name="navigate" size={15} color="#0D9488" />
                  )}
                  <Text style={styles.quickLocActionText}>
                    {loadingGps ? 'Locating...' : 'Use Current GPS'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickLocActionBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    Keyboard.dismiss();
                    setLocationModalVisible(false);
                    navigation.navigate('PharmacyLocation', {
                      onLocationSelected: (selectedLoc) => {
                        const full = selectedLoc.addressLine || `${selectedLoc.city}`;
                        setUserLocality(full);
                        if (selectedLoc.latitude && selectedLoc.longitude) {
                          setUserCoords({
                            latitude: selectedLoc.latitude,
                            longitude: selectedLoc.longitude,
                          });
                        }
                        showToast(`Location set from Live Map: ${full}`);
                      },
                    });
                  }}
                >
                  <Ionicons name="map-outline" size={15} color="#0D9488" />
                  <Text style={styles.quickLocActionText}>Pick on Map</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                bounces={false}
              >
                {/* POPULAR LOCALITIES LIST */}
                <Text style={styles.popularLocTitle}>POPULAR AREAS</Text>
                <View style={styles.localitiesListContainer}>
                  {filteredLocalities.map((loc) => {
                    const isSelected = userLocality === loc.full;
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        style={[styles.localityRow, isSelected && styles.localityRowActive]}
                        activeOpacity={0.7}
                        onPress={() => handleSelectLocality(loc)}
                      >
                        <Ionicons
                          name={isSelected ? 'location-sharp' : 'location-outline'}
                          size={16}
                          color={isSelected ? '#00B894' : '#94A3B8'}
                          style={{ marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.localityName, isSelected && styles.localityNameActive]}>
                            {loc.name}
                          </Text>
                        </View>
                        <Text style={styles.localityCity}>{loc.city}</Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#00B894" style={{ marginLeft: 6 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* CUSTOM ADDRESS MANUAL ENTRY */}
                <View style={styles.customLocBox}>
                  <Text style={styles.customLocLabel}>Or enter custom area</Text>
                  <View style={styles.customLocInputRow}>
                    <TextInput
                      style={styles.customLocInput}
                      placeholder="e.g. Bogadi 2nd Stage, Mysore"
                      placeholderTextColor="#94A3B8"
                      value={customLocalityInput}
                      onChangeText={setCustomLocalityInput}
                    />
                    <TouchableOpacity
                      style={[
                        styles.customLocApplyBtn,
                        !customLocalityInput.trim() && { opacity: 0.5 },
                      ]}
                      disabled={!customLocalityInput.trim()}
                      onPress={handleSetCustomLocation}
                    >
                      <Text style={styles.customLocApplyText}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================================================
          DIRECTIONS & NAVIGATION MODAL
      ================================================== */}
      <Modal
        visible={!!directionsDoctor}
        transparent
        animationType="slide"
        onRequestClose={() => setDirectionsDoctor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.directionsModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.directionsHeaderIcon}>
                <Ionicons name="navigate" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.modalHeaderTitle}>Clinic Location & Route</Text>
                <Text style={styles.modalHeaderSub}>Turn-by-turn Navigation</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setDirectionsDoctor(null)}
              >
                <Ionicons name="close" size={20} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            {directionsDoctor && (
              <View style={styles.modalBodyContent}>
                {/* CLINIC CARD */}
                <View style={styles.directionsClinicCard}>
                  <Text style={styles.directionsClinicName}>
                    {directionsDoctor.clinicName}
                  </Text>
                  <Text style={styles.directionsDoctorConsultant}>
                    Consultant: {directionsDoctor.name} ({directionsDoctor.specialty})
                  </Text>
                  <View style={styles.directionsAddressRow}>
                    <Ionicons name="location" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.directionsAddressText}>
                      {directionsDoctor.clinicAddress}
                    </Text>
                  </View>
                </View>

                {/* DISTANCE & TRAVEL ESTIMATE */}
                <View style={styles.travelStatsRow}>
                  <View style={styles.travelStatItem}>
                    <Ionicons name="navigate" size={16} color={colors.secondary} />
                    <Text style={styles.travelStatValue}>{directionsDoctor.distance}</Text>
                    <Text style={styles.travelStatLabel}>From {userLocality.split(',')[0]}</Text>
                  </View>
                  <View style={styles.travelStatDivider} />
                  <View style={styles.travelStatItem}>
                    <Ionicons name="car-outline" size={18} color="#059669" />
                    <Text style={styles.travelStatValue}>
                      ~{Math.max(2, Math.round(directionsDoctor.distanceKm * 3))} Mins
                    </Text>
                    <Text style={styles.travelStatLabel}>Approx Drive Time</Text>
                  </View>
                  <View style={styles.travelStatDivider} />
                  <View style={styles.travelStatItem}>
                    <Ionicons name="time-outline" size={16} color={colors.coral} />
                    <Text style={styles.travelStatValue}>Open Today</Text>
                    <Text style={styles.travelStatLabel}>{directionsDoctor.openHours.split(',')[0]}</Text>
                  </View>
                </View>

                {/* ACTION BUTTONS */}
                <View style={styles.modalActionButtonsCol}>
                  <TouchableOpacity
                    style={styles.openGoogleMapsBtn}
                    activeOpacity={0.88}
                    onPress={() => {
                      openExternalNavigation(directionsDoctor);
                      setDirectionsDoctor(null);
                    }}
                  >
                    <Ionicons name="map" size={18} color="#FFFFFF" />
                    <Text style={styles.openGoogleMapsBtnText}>
                      Start Turn-by-Turn GPS Navigation
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callClinicModalBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      Linking.openURL(`tel:${directionsDoctor.phone}`);
                    }}
                  >
                    <Ionicons name="call" size={16} color={colors.secondary} />
                    <Text style={styles.callClinicModalBtnText}>
                      Call Clinic Reception ({directionsDoctor.phone})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================================================
          FILTERS & SORT BOTTOM SHEET / MODAL
      ================================================== */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheetCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Filter & Sort Doctors</Text>
                <Text style={styles.modalHeaderSub}>Refine by Distance, Experience & Fee</Text>
              </View>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetTextBtn}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* 1. DOCTOR SPECIALIZATION */}
              <View style={styles.modalSpecHeaderRow}>
                <Text style={styles.filterGroupTitle}>Doctor Specialization ({doctorSpecialties.length - 1})</Text>
                {selectedSpecialty !== 'all' && (
                  <TouchableOpacity onPress={() => setSelectedSpecialty('all')}>
                    <Text style={styles.modalClearSpecLink}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Search within specializations in mobile modal */}
              <View style={styles.modalSpecSearchBox}>
                <Ionicons name="search-outline" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.modalSpecSearchInput}
                  placeholder="Search 80+ specializations..."
                  placeholderTextColor="#94A3B8"
                  value={modalSpecSearch}
                  onChangeText={setModalSpecSearch}
                />
                {modalSpecSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setModalSpecSearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={15} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filterOptionsGrid}>
                {modalSpecSearch.trim() !== '' ? (
                  <>
                    {/* Matching Full Categories */}
                    {SPECIALIZATION_CATEGORIES
                      .filter((c) => c.name.toLowerCase().includes(modalSpecSearch.toLowerCase()))
                      .map((cat) => {
                        const isSelected = selectedSpecialty === cat.id;
                        return (
                          <TouchableOpacity
                            key={`modal-cat-${cat.id}`}
                            style={[
                              styles.filterOptionPill,
                              styles.modalFullCatPill,
                              isSelected && styles.filterOptionPillActive,
                            ]}
                            onPress={() => setSelectedSpecialty(isSelected ? 'all' : cat.id)}
                          >
                            <Ionicons
                              name={cat.icon || 'layers-outline'}
                              size={13}
                              color={isSelected ? colors.primary : '#0D9488'}
                              style={{ marginRight: 5 }}
                            />
                            <Text
                              style={[
                                styles.filterOptionText,
                                { fontWeight: '700' },
                                isSelected && styles.filterOptionTextActive,
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                    {/* Matching Sub-specialties */}
                    {doctorSpecialties
                      .filter(
                        (s) =>
                          s.id !== 'all' &&
                          (s.name.toLowerCase().includes(modalSpecSearch.toLowerCase()) ||
                            (s.categoryName && s.categoryName.toLowerCase().includes(modalSpecSearch.toLowerCase())))
                      )
                      .map((spec) => {
                        const isSelected = selectedSpecialty === spec.id || selectedSpecialty === spec.key;
                        return (
                          <TouchableOpacity
                            key={spec.id}
                            style={[
                              styles.filterOptionPill,
                              { flexDirection: 'row', alignItems: 'center' },
                              isSelected && styles.filterOptionPillActive,
                            ]}
                            onPress={() => setSelectedSpecialty(isSelected ? 'all' : spec.id)}
                          >
                            <Ionicons
                              name={spec.icon || 'medkit-outline'}
                              size={13}
                              color={isSelected ? colors.primary : colors.textSecondary}
                              style={{ marginRight: 5 }}
                            />
                            <Text
                              style={[
                                styles.filterOptionText,
                                isSelected && styles.filterOptionTextActive,
                              ]}
                            >
                              {spec.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </>
                ) : (
                  <>
                    {/* All Option */}
                    <TouchableOpacity
                      style={[
                        styles.filterOptionPill,
                        selectedSpecialty === 'all' && styles.filterOptionPillActive,
                      ]}
                      onPress={() => setSelectedSpecialty('all')}
                    >
                      <Ionicons
                        name="medkit-outline"
                        size={13}
                        color={selectedSpecialty === 'all' ? colors.primary : colors.textSecondary}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedSpecialty === 'all' && styles.filterOptionTextActive,
                        ]}
                      >
                        All Specializations
                      </Text>
                    </TouchableOpacity>

                    {/* Top Full Categories */}
                    {SPECIALIZATION_CATEGORIES.slice(0, 6).map((cat) => {
                      const isSelected = selectedSpecialty === cat.id;
                      return (
                        <TouchableOpacity
                          key={`modal-full-${cat.id}`}
                          style={[
                            styles.filterOptionPill,
                            styles.modalFullCatPill,
                            isSelected && styles.filterOptionPillActive,
                          ]}
                          onPress={() => setSelectedSpecialty(isSelected ? 'all' : cat.id)}
                        >
                          <Ionicons
                            name={cat.icon || 'layers-outline'}
                            size={13}
                            color={isSelected ? colors.primary : '#0D9488'}
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            style={[
                              styles.filterOptionText,
                              { fontWeight: '700' },
                              isSelected && styles.filterOptionTextActive,
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* Sub-specialties */}
                    {doctorSpecialties.slice(1, 15).map((spec) => {
                      const isSelected = selectedSpecialty === spec.id || selectedSpecialty === spec.key;
                      return (
                        <TouchableOpacity
                          key={spec.id}
                          style={[
                            styles.filterOptionPill,
                            { flexDirection: 'row', alignItems: 'center' },
                            isSelected && styles.filterOptionPillActive,
                          ]}
                          onPress={() => setSelectedSpecialty(isSelected ? 'all' : spec.id)}
                        >
                          <Ionicons
                            name={spec.icon || 'medkit-outline'}
                            size={13}
                            color={isSelected ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            style={[
                              styles.filterOptionText,
                              isSelected && styles.filterOptionTextActive,
                            ]}
                          >
                            {spec.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </View>

              {/* 2. DISTANCE RADIUS */}
              <Text style={styles.filterGroupTitle}>Distance from Selected Location</Text>
              <View style={styles.filterOptionsGrid}>
                {[
                  { label: 'All Distances', value: 'all' },
                  { label: '< 2 km (Nearest)', value: '2' },
                  { label: '< 5 km', value: '5' },
                  { label: '< 10 km', value: '10' },
                ].map((opt) => {
                  const isSelected = maxDistance === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterOptionPill, isSelected && styles.filterOptionPillActive]}
                      onPress={() => setMaxDistance(opt.value)}
                    >
                      <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 3. EXPERIENCE YEARS */}
              <Text style={styles.filterGroupTitle}>Doctor's Experience</Text>
              <View style={styles.filterOptionsGrid}>
                {[
                  { label: 'Any Experience', value: 'all' },
                  { label: '5+ Years', value: '5' },
                  { label: '10+ Years', value: '10' },
                  { label: '15+ Years', value: '15' },
                ].map((opt) => {
                  const isSelected = minExperience === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterOptionPill, isSelected && styles.filterOptionPillActive]}
                      onPress={() => setMinExperience(opt.value)}
                    >
                      <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 4. CONSULTATION FEE */}
              <Text style={styles.filterGroupTitle}>Consultation Fee Range</Text>
              <View style={styles.filterOptionsGrid}>
                {[
                  { label: 'Any Fee', value: 'all' },
                  { label: 'Under ₹500', value: '500' },
                  { label: 'Under ₹700', value: '700' },
                ].map((opt) => {
                  const isSelected = maxFee === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterOptionPill, isSelected && styles.filterOptionPillActive]}
                      onPress={() => setMaxFee(opt.value)}
                    >
                      <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 5. SORT BY */}
              <Text style={styles.filterGroupTitle}>Sort Results By</Text>
              <View style={styles.filterOptionsGrid}>
                {[
                  { label: 'Nearest First', value: 'nearest' },
                  { label: 'Highest Rated', value: 'rating' },
                  { label: 'Most Experienced', value: 'experience' },
                  { label: 'Fee: Low to High', value: 'fee' },
                ].map((opt) => {
                  const isSelected = sortBy === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterOptionPill, isSelected && styles.filterOptionPillActive]}
                      onPress={() => setSortBy(opt.value)}
                    >
                      <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 6. ONLY AVAILABLE TODAY TOGGLE */}
              <TouchableOpacity
                style={styles.toggleRow}
                activeOpacity={0.8}
                onPress={() => setOnlyAvailableToday(!onlyAvailableToday)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Available Today Only</Text>
                  <Text style={styles.toggleSub}>Show doctors accepting in-person patients today</Text>
                </View>
                <View
                  style={[
                    styles.toggleSwitch,
                    onlyAvailableToday && styles.toggleSwitchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      onlyAvailableToday && styles.toggleKnobActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.applyFilterBtn}
              activeOpacity={0.88}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFilterBtnText}>
                Show {filteredDoctors.length} Matching Doctors
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* In-Clinic Doctor Booking Modal */}
      <DoctorBookingModal
        visible={!!selectedDoctorForBooking}
        onClose={() => setSelectedDoctorForBooking(null)}
        doctor={selectedDoctorForBooking}
        consultationType="In-Person"
        navigation={navigation}
      />

      {/* Guest Lead-Generation Popup */}
      <GuestLeadModal
        visible={showLeadModal}
        searchQuery={pendingSearchQuery}
        selectedCity={userLocality || 'Mysore'}
        onSuccess={() => {
          setShowLeadModal(false);
          Keyboard.dismiss();
        }}
        onClose={() => {
          setShowLeadModal(false);
          Keyboard.dismiss();
        }}
      />
    </SafeAreaView>
  );
};

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F1F2F4', // Matches HomeScreen Flipkart-style background
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 115,
  },
  doctorsCardsList: {
    width: '100%',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  headerLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  headerLocationText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D9488',
    maxWidth: 160,
  },
  filterHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterHeaderBtnActive: {
    backgroundColor: colors.secondary,
  },
  filterBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.coral,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // TOAST BANNER
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  toastBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // DOCTOR LOCATION ACCESS & NEARBY HOSPITALS TOOLBAR
  doctorLocationToolbar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'column',
    gap: 10,
  },
  doctorLocationToolbarDesktop: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 16,
  },
  docLocationLeftCol: {
    flexDirection: 'column',
    gap: 8,
  },
  docLocationLeftColDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
  },
  docLocMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docLocPinBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docLocInfoWrap: {
    justifyContent: 'center',
  },
  docLocLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  docLocValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  docLocActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  docGpsBtnDisabled: {
    opacity: 0.6,
  },
  docGpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  docChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  docChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },

  // NEARBY HOSPITALS BUTTON / CARD
  nearbyHospitalBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  nearbyHospitalBannerBtnDesktop: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 320,
  },
  hospitalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hospitalBannerTextWrap: {
    flex: 1,
  },
  hospitalBannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hospitalBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  emergencyTagBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  emergencyTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  hospitalBannerSub: {
    fontSize: 10,
    color: '#FF7F50',
    marginTop: 1,
  },
  hospitalArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // DESKTOP CONTAINER HELPER
  desktopContentMaxWidth: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
  },

  // SEPARATE SEARCH & LOCATION CARDS (REDESIGNED)
  searchConsoleContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    gap: 8,
  },
  searchConsoleContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 14,
    gap: 16,
  },
  standaloneLocationCard: {
    backgroundColor: '#E6F8F3',
    backgroundImage: 'linear-gradient(135deg, #ECFDF5 0%, #E0F7F0 100%)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    boxShadow: '0 4px 14px rgba(0, 184, 148, 0.08)',
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    minHeight: 44,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  standaloneLocationCardDesktop: {
    width: 360,
    paddingVertical: 7,
  },
  standaloneSearchCard: {
    backgroundColor: '#F0F9FF',
    backgroundImage: 'linear-gradient(135deg, #F8FAFC 0%, #E0F2FE 100%)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.08)',
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    minHeight: 44,
  },
  standaloneSearchCardDesktop: {
    flex: 1,
    paddingVertical: 6,
  },
  consoleLocIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consoleLocInfo: {
    flex: 1,
  },
  consoleLocLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  consoleLocValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  consoleChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  consoleChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  consoleGpsBtn: {
    padding: 7,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  consoleDivider: {
    width: 1.5,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  consoleSearchSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  consoleSearchSectionDesktop: {
    paddingVertical: 4,
  },
  consoleSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 6,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  consoleSearchActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  consoleSearchActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  filterTriggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    marginLeft: 6,
  },
  filterTriggerPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  filterTriggerPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  filterTriggerPillTextActive: {
    color: '#FFFFFF',
  },

  // PAGINATION STYLES
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginTop: 8,
    marginBottom: 20,
    gap: 10,
    flexWrap: 'wrap',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  pageNavBtnDisabled: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' } : {}),
  },
  pageNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pageNavBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageNumbersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNumberBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  pageNumberBtnActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // QUICK FILTER BAR
  quickFilterBarWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
  },
  quickFilterBarScroll: {
    paddingHorizontal: 0,
    paddingVertical: 2,
    gap: 8,
  },
  quickFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  quickFilterPillActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  quickFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  quickFilterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // SPECIALTIES SCROLL
  specialtyContainer: {
    paddingVertical: 6,
  },
  specialtiesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    rowGap: 8,
  },
  specialtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    gap: 5,
  },
  specialtyPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  specialtyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  specialtyPillTextActive: {
    color: '#FFFFFF',
  },

  // RESULTS HEADER
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 4,
    marginBottom: 10,
    gap: 10,
  },
  resultsHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeadingTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  resultsCountBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  resultsCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  sortPillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  sortPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortPillBtnActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  sortPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  sortPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // MAIN 2-COLUMN LAYOUT
  mainLayoutWrap: {
    width: '100%',
    paddingHorizontal: 16,
  },
  mainLayoutWrapDesktop: {
    flexDirection: 'row',
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 24,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  desktopSidebarCol: {
    width: 310,
  },
  doctorsColWrap: {
    width: '100%',
  },
  doctorsColWrapDesktop: {
    flex: 1,
    minWidth: 0,
  },

  // DESKTOP SIDEBAR CARD
  desktopSidebarCard: {
    backgroundColor: '#F0FDF9',
    backgroundImage: 'linear-gradient(180deg, #F4FDF9 0%, #E8F9F3 50%, #EFF6FF 100%)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    boxShadow: '0 8px 28px -4px rgba(0, 184, 148, 0.10)',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sidebarBadge: {
    backgroundColor: '#00B894',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sidebarBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sidebarResetLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00B894',
  },
  sidebarSection: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sidebarSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sidebarToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  sidebarDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#94A3B8',
  },
  sidebarToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  sidebarToggleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  miniSwitch: {
    width: 38,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  miniSwitchActive: {
    backgroundColor: '#00B894',
  },
  miniKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  miniKnobActive: {
    alignSelf: 'flex-end',
  },
  sidebarSpecialtyList: {
    gap: 4,
  },
  sidebarSpecialtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  sidebarSpecialtyRowActive: {
    backgroundColor: '#F0FDFA',
  },
  sidebarSpecialtyText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 4,
  },
  sidebarSpecialtyTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  sidebarSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sidebarClearSpecLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  sidebarSpecSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    height: 34,
    marginBottom: 8,
  },
  sidebarSpecSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    paddingVertical: 0,
  },
  sidebarSpecScrollList: {
    maxHeight: 340,
  },
  sidebarSpecCategoryHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  sidebarCategoryGroup: {
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 2,
  },
  sidebarCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: 'space-between',
  },
  sidebarCategoryHeaderActive: {
    backgroundColor: '#F0FDFA',
  },
  sidebarCategorySelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  sidebarCategoryExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  sidebarFullActivePill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
  },
  sidebarFullActivePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  sidebarFullOptionRow: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 4,
  },
  sidebarFullCatSearchRow: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 4,
  },
  sidebarFullSpecBadgeText: {
    fontSize: 10,
    color: '#0D9488',
    fontWeight: '600',
  },
  sidebarFullSubText: {
    fontSize: 10,
    color: '#0D9488',
    fontWeight: '500',
    marginTop: 1,
  },
  modalFullCatPill: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  sidebarCategoryTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  sidebarCategoryTitleActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  sidebarCategoryBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginRight: 4,
  },
  sidebarCategoryBadgeActive: {
    backgroundColor: '#CCFBF1',
  },
  sidebarCategoryCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  sidebarCategoryCountActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  sidebarCategoryChildren: {
    paddingLeft: 12,
    paddingTop: 2,
    paddingBottom: 4,
    gap: 2,
  },
  sidebarChildSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  sidebarChildSpecRowActive: {
    backgroundColor: '#CCFBF1',
  },
  sidebarChildSpecText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 4,
    flex: 1,
  },
  sidebarChildSpecTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  modalSpecHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalClearSpecLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  modalSpecSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
  },
  modalSpecSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  activeSpecChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  activeSpecChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSpecChipLabel: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '500',
    marginRight: 4,
  },
  activeSpecChipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  clearAllFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  sidebarOptionsCol: {
    gap: 8,
  },
  sidebarRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 3,
  },
  sidebarOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  sidebarOptionTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },

  // LIST & CARD
  list: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  cardGradientBarMulticolor: {
    height: 4,
    width: '100%',
    backgroundImage: 'linear-gradient(90deg, #00B894 0%, #00C2CB 50%, #1E3A8A 100%)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    paddingTop: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardDesktop: {
    padding: 16,
    paddingTop: 16,
    marginBottom: 14,
  },

  // DOCTOR MAIN & AVATAR
  doctorMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    position: 'relative',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  avatarFallbackIcon: {
    position: 'absolute',
    bottom: 3,
    right: 3,
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  doctorInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  clinicLocationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.04)',
    alignSelf: 'flex-start',
  },
  clinicNameText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0D9488',
    maxWidth: '70%',
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  // METRICS & BADGES
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    gap: 4,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  },
  ratingChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  reviewsCountText: {
    fontSize: 9.5,
    color: '#92400E',
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    gap: 4,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  },
  slotBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0D9488',
  },

  // CARD FOOTER & ACTIONS
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
  },
  cardFooterRowDesktop: {
    paddingTop: 14,
    marginTop: 14,
  },
  feeWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  },
  feeLabel: {
    fontSize: 10,
    color: '#0D9488',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D9488',
  },
  cardActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  },
  navigateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  bookAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    backgroundImage: 'linear-gradient(135deg, #00B894 0%, #009677 100%)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
    boxShadow: '0 4px 12px rgba(0, 184, 148, 0.28)',
  },
  bookAppointmentButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // EMPTY
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  resetFilterBtn: {
    marginTop: 16,
    backgroundColor: colors.secondary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // MODAL OVERLAY
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  // LOCATION MODAL
  locationModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  locationModalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // LOCATION MODAL QUICK ACTIONS & LIST
  quickLocActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickLocActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 6,
  },
  quickLocActionBtnActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  quickLocActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },

  localitySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  localitySearchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12.5,
    color: colors.text,
  },

  popularLocTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  localitiesListContainer: {
    gap: 2,
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 3,
  },
  localityRowActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#00B894',
  },
  localityName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  localityNameActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  localityCity: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  customLocBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customLocLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  customLocInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customLocInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customLocApplyBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customLocApplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // DIRECTIONS MODAL
  directionsModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  directionsHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  modalHeaderSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBodyContent: {},
  directionsClinicCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  directionsClinicName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 2,
  },
  directionsDoctorConsultant: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  directionsAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  directionsAddressText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },

  travelStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  travelStatItem: {
    alignItems: 'center',
  },
  travelStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  travelStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  travelStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },

  modalActionButtonsCol: {
    gap: 10,
  },
  openGoogleMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  openGoogleMapsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  callClinicModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  callClinicModalBtnText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '800',
  },

  // FILTER SHEET
  filterSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  resetTextBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coral,
  },
  filterGroupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.secondary,
    marginTop: 12,
    marginBottom: 8,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionPillActive: {
    backgroundColor: colors.lightTeal,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterOptionTextActive: {
    color: colors.primary,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },

  applyFilterBtn: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  applyFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  webBreadcrumbWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  webBreadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webBreadcrumbLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0071DC',
  },
  webBreadcrumbCurrent: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  webBreadcrumbQuery: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  desktopContentMaxWidth: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
});

export default DoctorListScreen;