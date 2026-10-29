import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreenMobile from './HomeScreen.js';
import { filterLocations } from '../../data/locations';
import { FEATURED_SPECIALTIES } from '../../data/featuredSpecialties';
import SpecialtyIcon from '../../components/common/SpecialtyIcon';
import { reverseGeocodeWebSafe, normalizeCityName } from '../../utils/locationHelper';
import { doctors } from '../../data/doctors';
import videoDoctors from '../../data/videoDoctors';
import { LAB_TESTS_MASTER, LAB_PACKAGES, ALL_CITY_DIAGNOSTIC_CENTRES } from '../../data/labTestData';
import pharmacyProducts from '../../data/pharmacyProducts';
import { RADIOLOGY_TESTS } from '../../data/radiologyCatalogData';
import { showAlert } from '../../utils/alert';
import PromotionalAdsSection from '../../components/web/PromotionalAdsSection';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { isDesktopLayout, isDesktopSiteRequested } from '../../utils/responsiveLayoutHelper';
import GuestLeadModal from '../../components/common/GuestLeadModal';
import { shouldShowGuestLeadPopup } from '../../services/guestLeadService';
import WebFooter from '../../components/web/WebFooter';

// ==================================================
// OFFICIAL MEDIUNIFY LOGO & BRAND PALETTE:
// Teal (#00B894), Navy Blue (#1E3A8A), Aqua (#00C2CB), Fresh Green (#7BC96F), Coral (#FF7F50), Slate (#64748B)
// ==================================================
const PALETTE = {
  teal: '#00B894',
  tealDark: '#00B894',
  tealLight: '#ECFDF5',
  tealLightSubtle: '#F0FDF4',
  navyBlue: '#1E3A8A',
  aqua: '#00C2CB',
  freshGreen: '#7BC96F',
  coral: '#FF7F50',
  slate: '#64748B',
  slateLight: '#F1F8FB',
  slateDark: '#1E3A8A',
  border: '#DCE7EC',
  // Pastel service cards
  pastelLightBlue: '#EEF7FC',
  pastelLightMint: '#ECF9F5',
  pastelSoftPurple: '#F2EEFF',
  pastelSoftPeach: '#FFF1E8',
  pastelSoftPink: '#FDEFF3',
};

// 4 Service Cards — exact organic cards matching user reference design
const HERO_PRACTO_CARDS = [
  {
    id: 'video-consult',
    stepNumber: '01',
    titleKey: 'card_video_consult',
    title: 'Video Consultation',
    subtitleKey: 'card_video_desc',
    subtitle: 'Consult doctors from home.',
    accentColor: '#0284C7',
    route: 'VideoConsultation',
    image: require('../../../assets/icons/service_3d_video.jpg'),
  },
  {
    id: 'lab-tests',
    stepNumber: '02',
    titleKey: 'card_lab_tests',
    title: 'Lab Tests',
    subtitleKey: 'card_lab_desc',
    subtitle: 'Book tests with convenient collection.',
    accentColor: '#00B894',
    route: 'LabTests',
    image: require('../../../assets/icons/service_3d_lab.jpg'),
  },
  {
    id: 'pharmacy',
    stepNumber: '03',
    titleKey: 'card_order_medicines',
    title: 'Order Medicines',
    subtitleKey: 'card_medicine_desc',
    subtitle: 'Get medicines delivered to your door.',
    accentColor: '#7C3AED',
    route: 'Pharmacy',
    image: require('../../../assets/icons/service_3d_medicine.jpg'),
  },
  {
    id: 'radiology',
    stepNumber: '04',
    titleKey: 'card_scans_xray',
    title: 'Scan & X-Ray',
    subtitleKey: 'card_scans_desc',
    subtitle: 'Book diagnostic scans near you.',
    accentColor: '#EA580C',
    route: 'Imaging',
    image: require('../../../assets/icons/service_3d_scan.jpg'),
  },
];

// Popular search tags — trimmed to 5 most useful options
const POPULAR_SEARCH_TAGS = [
  { key: 'tag_fever', label: 'Fever', query: 'Fever' },
  { key: 'tag_general_physician', label: 'Doctor', specialty: 'general-primary' },
  { key: 'tag_blood_test', label: 'Blood Test', route: 'LabTests' },
  { key: 'tag_mri_scan', label: 'MRI Scan', route: 'Imaging' },
  { key: 'tag_pharmacy', label: 'Pharmacy', route: 'Pharmacy' },
];

const SPECIALTY_TRANSLATIONS = {
  'general-primary': { title: 'spec_physician_title', sub: 'spec_physician_sub' },
  'womens-health-group': { title: 'spec_women_title', sub: 'spec_women_sub' },
  'ivf-fertility-group': { title: 'spec_fertility_title', sub: 'spec_fertility_sub' },
  'dermatology-skin': { title: 'spec_derma_title', sub: 'spec_derma_sub' },
  'pediatrics-child-health': { title: 'spec_pedia_title', sub: 'spec_pedia_sub' },
  'cardiology-heart': { title: 'spec_cardio_title', sub: 'spec_cardio_sub' },
  'orthopedics-bone-joint': { title: 'spec_ortho_title', sub: 'spec_ortho_sub' },
  'dental-oral-care': { title: 'spec_dental_title', sub: 'spec_dental_sub' },
  'psychiatry-mental-health': { title: 'spec_mental_title', sub: 'spec_mental_sub' },
  'ent-group': { title: 'spec_ent_title', sub: 'spec_ent_sub' },
  'ophthalmology-group': { title: 'spec_eye_title', sub: 'spec_eye_sub' },
  'gastroenterology-group': { title: 'spec_gastro_title', sub: 'spec_gastro_sub' },
};

// Trust Matrix Pillars matching reference design
const TRUST_PILLARS = [
  {
    icon: 'shield-checkmark',
    title: '100% Verified Specialists',
    desc: 'Council-verified doctors with rigorous credential checks.',
    badge: '3,200+ DOCTORS',
    color: '#00B894',
    bg: '#ECF9F5',
  },
  {
    icon: 'lock-closed',
    title: '256-Bit SSL Security',
    desc: 'ABDM integrated with end-to-end data encryption.',
    badge: 'ISO 27001 SECURE',
    color: '#1E3A8A',
    bg: '#EEF7FC',
  },
  {
    icon: 'home',
    title: 'Home Sample Pickup',
    desc: 'Trained phlebotomists with same-day certified reports.',
    badge: 'NABL PARTNERS',
    color: '#00B894',
    bg: '#E9F4F9',
  },
  {
    icon: 'medal',
    title: 'NABH Accredited Centers',
    desc: 'Transparent pricing with dedicated care support.',
    badge: '4.9/5 RATING',
    color: '#00B894',
    bg: '#ECFDF5',
  },
];

const HomeScreenWeb = ({ navigation }) => {
  const { t = (k, fb) => fb || k, isDarkMode, language, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef(null);

  // Search state matching Practo reference
  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSearchCategory, setSelectedSearchCategory] = useState('All');
  const searchInputRef = useRef(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 992;
  const isTablet = !desktopSiteMode && (width >= 640 && width < 992);
  const isMobile = !desktopSiteMode && (width < 640);
  const isWideDesktop = isDesktop && width >= 1200;

  const filteredLocations = filterLocations(locationSearchText);

  // Specialties Horizontal Carousel state & scrolling
  const specialtiesScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollSpecialties = (direction) => {
    const scrollAmount = isDesktop ? 650 : 360;
    const node =
      specialtiesScrollRef.current?.getScrollableNode?.() ||
      specialtiesScrollRef.current;

    if (node && typeof node.scrollBy === 'function') {
      node.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(() => {
        if (node) {
          setCanScrollLeft(node.scrollLeft > 15);
          setCanScrollRight(node.scrollLeft < node.scrollWidth - node.clientWidth - 15);
        }
      }, 350);
    } else if (specialtiesScrollRef.current?.scrollTo) {
      const currentOffset = node?.scrollLeft || 0;
      const targetOffset = direction === 'left' ? Math.max(0, currentOffset - scrollAmount) : currentOffset + scrollAmount;
      specialtiesScrollRef.current.scrollTo({ x: targetOffset, animated: true });
    }
  };

  const handleSpecialtiesScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const currentX = contentOffset?.x || 0;
    const maxScroll = (contentSize?.width || 0) - (layoutMeasurement?.width || 0);

    setCanScrollLeft(currentX > 15);
    setCanScrollRight(currentX < maxScroll - 15);
  };

  // Auth state check: allow guests to browse freely, identify logged-in users
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('isLoggedIn');
        const isGuestStored = await AsyncStorage.getItem('@unnathi_is_guest');
        if (isMounted) {
          if (stored === 'true' && isGuestStored !== 'true') {
            setIsLoggedIn(true);
          } else {
            setIsLoggedIn(false);
            if (isGuestStored !== 'true') {
              AsyncStorage.setItem('@unnathi_is_guest', 'true').catch(() => {});
            }
          }
        }
      } catch (e) {}
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load saved city on mount (preserve user's selection, default to Mysore if first visit)
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@mediunify_selected_city');
        if (saved) {
          setSelectedCity(saved);
        } else {
          const defaultCity = 'Mysore';
          setSelectedCity(defaultCity);
          await AsyncStorage.setItem('@mediunify_selected_city', defaultCity);
          await AsyncStorage.setItem('@unnathi_user_location', defaultCity);
        }
      } catch (e) {
        console.warn('[Location] Saved city load error on mount:', e);
      }
    })();
  }, []);

  const handleSelectLocation = async (locName) => {
    setSelectedCity(locName);
    setShowCityPicker(false);
    setLocationSearchText('');
    try {
      await AsyncStorage.setItem('@mediunify_selected_city', locName);
      await AsyncStorage.setItem('@unnathi_user_location', locName);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {}
  };

  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
      showAlert('Geolocation Unsupported', 'Your browser does not support GPS location. Please select your city manually from the list.');
      return;
    }

    setIsDetectingLocation(true);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos?.coords?.latitude;
          const lon = pos?.coords?.longitude;
          if (!lat || !lon) {
            showAlert('Location Notice', 'Could not obtain coordinates from GPS. Please choose your city manually.');
            setIsDetectingLocation(false);
            return;
          }

          // Reverse geocode to get true city name
          const addresses = await reverseGeocodeWebSafe({ latitude: lat, longitude: lon });
          const first = addresses?.[0];
          const rawCity = first?.city || first?.district || first?.subregion;

          if (rawCity) {
            const detectedCity = normalizeCityName(rawCity);
            setSelectedCity(detectedCity);
            setShowCityPicker(false);
            setLocationSearchText('');

            await AsyncStorage.setItem('@mediunify_selected_city', detectedCity);
            await AsyncStorage.setItem('@unnathi_user_location', first.formattedAddress || detectedCity);
            await AsyncStorage.setItem('@unnathi_user_coords', JSON.stringify({ latitude: lat, longitude: lon }));

            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.dispatchEvent(new Event('storage'));
            }

            showAlert('Location Detected', `Your location has been set to ${detectedCity} via browser GPS.`);
          } else {
            showAlert('Location Notice', 'Could not determine your city from GPS coordinates. Please select your city manually from the list.');
          }
        } catch (err) {
          console.warn('[Location] Reverse geocode error:', err);
          showAlert('Location Error', 'Unable to resolve your location address. Please select your city manually from the list.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        if (error.code === 1) { // PERMISSION_DENIED
          showAlert(
            'Location Permission Denied',
            'Browser location access was denied. Please allow location permissions in your browser address bar/settings, or choose your city manually from the list below.'
          );
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          showAlert(
            'Location Unavailable',
            'GPS position could not be determined. Please ensure your device location is turned on or select your city manually.'
          );
        } else if (error.code === 3) { // TIMEOUT
          showAlert(
            'Location Request Timed Out',
            'GPS location detection timed out. Please select your city manually from the list.'
          );
        } else {
          showAlert(
            'GPS Location Error',
            error.message || 'Could not detect your location. Please select your city manually.'
          );
        }
      },
      geoOptions
    );
  };

  // Real Multi-Service Search Engine
  const allSearchResults = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    if (!rawQuery) return [];

    const cityLower = (selectedCity || '').toLowerCase();
    const isMysore = cityLower.includes('mys') || cityLower.includes('mysuru') || cityLower.includes('mysore');
    const isBangalore = cityLower.includes('bengaluru') || cityLower.includes('bangalore') || cityLower.includes('bangal');

    const results = [];

    const match = (str) => {
      if (!str || typeof str !== 'string') return false;
      return str.toLowerCase().includes(rawQuery);
    };

    const matchesCity = (locationStr) => {
      if (!locationStr || typeof locationStr !== 'string') return true;
      const l = locationStr.toLowerCase();
      if (l.includes(cityLower)) return true;
      if (isMysore && (l.includes('mys') || l.includes('mysuru') || l.includes('mysore'))) return true;
      if (isBangalore && (l.includes('bengaluru') || l.includes('bangalore') || l.includes('bangal'))) return true;
      return false;
    };

    // 1. DOCTORS (In-Clinic)
    if (Array.isArray(doctors)) {
      const isDocWord = ['doctor', 'doc', 'physician', 'specialist', 'dr', 'clinic'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      doctors.forEach((doc) => {
        if (!matchesCity(doc.clinicArea) && !matchesCity(doc.clinicAddress)) return;

        if (
          match(doc.name) ||
          match(doc.specialty) ||
          match(doc.specialtyKey) ||
          match(doc.clinicName) ||
          (isDocWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `doc-${doc.id}`,
            name: doc.name,
            category: 'Doctors',
            subtitle: `${doc.specialty}${doc.clinicArea ? ` • ${doc.clinicArea.split(',')[0]}` : ''}`,
            badge: doc.fee ? `₹${doc.fee}` : '',
            icon: 'person',
            iconType: 'ionicons',
            iconBg: '#E0F2FE',
            iconColor: '#0284C7',
            priority: match(doc.name) ? 1 : 2,
            onPress: () => {
              setIsSearchFocused(false);
              navigation?.navigate('DoctorBooking', { doctor: doc });
            },
          });
        }
      });
    }

    // 2. VIDEO CONSULTATION DOCTORS
    if (Array.isArray(videoDoctors)) {
      const isVideoWord = ['video', 'online', 'teleconsultation', 'call'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      videoDoctors.forEach((doc) => {
        if (
          match(doc.name) ||
          match(doc.specialty) ||
          (isVideoWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `vdoc-${doc.id}`,
            name: doc.name,
            category: 'Video Consultation',
            subtitle: `${doc.specialty} • Video Call`,
            badge: doc.fee ? `₹${doc.fee}` : '',
            icon: 'videocam',
            iconType: 'ionicons',
            iconBg: '#E0F7FA',
            iconColor: '#00C2CB',
            priority: match(doc.name) ? 1 : 3,
            onPress: () => {
              setIsSearchFocused(false);
              navigation?.navigate('VideoBooking', { doctor: doc });
            },
          });
        }
      });
    }

    // 3. LAB TESTS & PACKAGES
    if (Array.isArray(LAB_TESTS_MASTER)) {
      const isLabWord = ['lab', 'test', 'blood', 'pathology', 'diagnostics', 'cbc', 'sugar', 'lipid', 'thyroid'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      LAB_TESTS_MASTER.forEach((test) => {
        if (
          match(test.name) ||
          match(test.category) ||
          match(test.department) ||
          (isLabWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `lab-${test.id}`,
            name: test.name,
            category: 'Lab Tests',
            subtitle: `Lab Test${test.department ? ` • ${test.department}` : ''}`,
            badge: test.price ? `₹${test.price}` : (test.mrp ? `₹${test.mrp}` : 'Home Pickup'),
            icon: 'flask',
            iconType: 'ionicons',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            priority: match(test.name) ? 1 : 2,
            onPress: () => {
              setIsSearchFocused(false);
              navigation?.navigate('LabTests', { searchTest: test.name, city: selectedCity });
            },
          });
        }
      });
    }

    if (Array.isArray(LAB_PACKAGES)) {
      LAB_PACKAGES.forEach((pkg) => {
        if (match(pkg.name) || match(pkg.description) || rawQuery.includes('package') || rawQuery.includes('checkup')) {
          results.push({
            id: `pkg-${pkg.id}`,
            name: pkg.name,
            category: 'Lab Packages',
            subtitle: `Health Package • ${pkg.testsCount || 'Comprehensive'}`,
            badge: pkg.price ? `₹${pkg.price}` : '',
            icon: 'fitness',
            iconType: 'ionicons',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            priority: match(pkg.name) ? 1 : 2,
            onPress: () => {
              setIsSearchFocused(false);
              navigation?.navigate('LabTests', { category: 'packages', city: selectedCity });
            },
          });
        }
      });
    }

    // 4. SCANS & X-RAY (RADIOLOGY)
    if (Array.isArray(RADIOLOGY_TESTS)) {
      const isScanWord = ['scan', 'xray', 'x-ray', 'mri', 'ct', 'ultrasound', 'echo', 'ecg', 'radiology'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      RADIOLOGY_TESTS.forEach((scan) => {
        if (
          match(scan.name) ||
          match(scan.categoryName) ||
          match(scan.shortName) ||
          match(scan.modality) ||
          (isScanWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `rad-${scan.id}`,
            name: scan.name,
            category: 'Scan & X-Ray',
            subtitle: `Scan & X-Ray • ${scan.modality || scan.categoryName || 'Radiology'}`,
            badge: scan.price ? `₹${scan.price}` : (scan.mrp ? `₹${scan.mrp}` : ''),
            icon: 'scan-outline',
            iconType: 'ionicons',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            priority: match(scan.name) ? 1 : 2,
            onPress: () => {
              setIsSearchFocused(false);
              navigation?.navigate('RadiologyLabs', { searchTest: scan.name, testId: scan.id, city: selectedCity });
            },
          });
        }
      });
    }

    // 5. MEDICINES & PHARMACY
    if (Array.isArray(pharmacyProducts)) {
      const isMedWord = ['medicine', 'pharmacy', 'tablet', 'syrup', 'capsule', 'drug', 'med', 'paracetamol', 'dolo'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      pharmacyProducts.forEach((med) => {
        if (
          match(med.name) ||
          match(med.brand) ||
          match(med.activeIngredients) ||
          match(med.uses) ||
          (isMedWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `med-${med.id}`,
            name: med.name,
            category: 'Medicines',
            subtitle: `Medicine • ${med.brand || 'Pharmacy'}`,
            badge: med.price ? `₹${med.price}` : '',
            icon: 'pill',
            iconType: 'material',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            priority: match(med.name) ? 1 : 2,
            onPress: () => {
              setIsSearchFocused(false);
              navigation?.navigate('ProductDetails', { product: med });
            },
          });
        }
      });
    }

    // 6. CLINICS & DIAGNOSTIC CENTRES
    if (Array.isArray(ALL_CITY_DIAGNOSTIC_CENTRES)) {
      const isClinicWord = ['clinic', 'centre', 'center', 'lab', 'hospital'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      ALL_CITY_DIAGNOSTIC_CENTRES.forEach((centre) => {
        if (!matchesCity(centre.city) && !matchesCity(centre.address)) return;
        if (
          match(centre.name) ||
          match(centre.area) ||
          (isClinicWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `clinic-${centre.id}`,
            name: centre.name,
            category: 'Clinics',
            subtitle: `Clinic & Lab • ${centre.area || selectedCity}`,
            badge: centre.rating ? `★ ${centre.rating}` : 'Verified',
            icon: 'business',
            iconType: 'ionicons',
            iconBg: '#F8FAFC',
            iconColor: '#475569',
            priority: match(centre.name) ? 1 : 2,
            onPress: () => {
              setIsSearchFocused(false);
              navigation?.navigate('LabTests', { city: selectedCity });
            },
          });
        }
      });
    }

    results.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [searchQuery, selectedCity, navigation]);

  const matchingCategories = useMemo(() => {
    if (allSearchResults.length === 0) return [];
    const catCounts = {};
    allSearchResults.forEach((r) => {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });
    const categories = Object.keys(catCounts).map((cat) => ({
      name: cat,
      count: catCounts[cat],
    }));
    return [{ name: 'All', count: allSearchResults.length }, ...categories];
  }, [allSearchResults]);

  const displayedSearchResults = useMemo(() => {
    if (selectedSearchCategory === 'All') return allSearchResults.slice(0, 30);
    return allSearchResults
      .filter((r) => r.category === selectedSearchCategory)
      .slice(0, 30);
  }, [allSearchResults, selectedSearchCategory]);

  const executeSearch = (query, city) => {
    const targetCity = city || selectedCity;
    const q = (query || '').trim();
    if (q) {
      setIsSearchFocused(false);
      navigation?.navigate('GlobalSearch', { query: q, city: targetCity });
    }
  };

  const handleSearchSubmit = async () => {
    const q = searchQuery.trim();
    if (!q) {
      // Prevent empty searches from navigating to invalid pages
      return;
    }

    const shouldShow = await shouldShowGuestLeadPopup();
    if (shouldShow) {
      setPendingSearchQuery(q);
      setPendingAction(() => () => {
        executeSearch(q, selectedCity);
      });
      setShowLeadModal(true);
      return;
    }

    executeSearch(q, selectedCity);
  };

  const handleConsultNow = (specialty) => {
    navigation?.navigate('DoctorList', { specialty });
  };

  const handlePopularTagClick = async (tag) => {
    const q = tag.query || tag.label || tag.specialty || 'Healthcare';
    const action = () => {
      if (tag.specialty) {
        handleConsultNow(tag.specialty);
      } else if (tag.route) {
        handleNavigateToService(tag.route);
      } else if (tag.query) {
        setSearchQuery(tag.query);
        handleNavigateToService('DoctorList', { searchQuery: tag.query, city: selectedCity });
      } else {
        const label = tag.label || '';
        setSearchQuery(label);
        handleNavigateToService('DoctorList', { searchQuery: label, city: selectedCity });
      }
    };

    const shouldShow = await shouldShowGuestLeadPopup();
    if (shouldShow) {
      setPendingSearchQuery(q);
      setPendingAction(() => action);
      setShowLeadModal(true);
      return;
    }

    action();
  };

  const handleNavigateToService = (route, params) => {
    if (navigation?.navigate) {
      if (params) {
        navigation.navigate(route, params);
      } else {
        navigation.navigate(route);
      }
    }
  };

  // Inject web interactive CSS
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'mediunify-home-interactive-css';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        /* =============================================
           SERVICE CARDS — RICH HOVER ANIMATIONS
        ============================================= */
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
          transform: scale(1.1) !important;
        }
        .service-card-btn {
          transition: background-color 0.22s ease, transform 0.18s ease, box-shadow 0.22s ease !important;
        }
        .service-card:hover .service-card-btn {
          transform: translateX(3px) !important;
        }
        .service-card-btn-text {
          transition: color 0.2s ease !important;
        }
        .service-card-avail-badge {
          transition: opacity 0.2s ease !important;
        }
        /* Hero search banner gradient visible on all desktop and laptop monitors */
        .hero-search-section-bg {
          background-color: #D8EEF6 !important;
          background-image: linear-gradient(135deg, #CCE8F5 0%, #D4F3EB 45%, #DFFAF3 100%) !important;
          border-bottom: 1px solid #BFDFEB !important;
        }
        /* Promotional offer cards hover */
        .mediunify-promo-ad-card {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.28s ease !important;
          cursor: pointer !important;
        }
        .mediunify-promo-ad-card:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 20px 32px -8px rgba(12, 59, 107, 0.14), 0 6px 16px -4px rgba(12, 59, 107, 0.05) !important;
        }
        /* =============================================
           EXISTING HOVER STYLES
        ============================================= */
        .practo-card-hover {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .practo-card-hover:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 16px 32px -8px rgba(12, 59, 107, 0.10), 0 4px 12px -2px rgba(12, 59, 107, 0.04) !important;
        }
        .practo-spec-card {
          transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.26s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.26s ease !important;
          cursor: pointer !important;
        }
        .practo-spec-card:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 16px 32px -8px rgba(25, 130, 156, 0.16), 0 4px 12px rgba(12, 59, 107, 0.04) !important;
          border-color: #00B894 !important;
        }
        .practo-spec-card img {
          transition: transform 0.35s ease !important;
        }
        .practo-spec-card:hover img {
          transform: scale(1.08) !important;
        }
        .practo-spec-card:hover .consult-btn-hover {
          background-color: #00B894 !important;
          border-color: #00B894 !important;
        }
        .practo-spec-card:hover .consult-btn-hover span,
        .practo-spec-card:hover .consult-btn-hover div {
          color: #FFFFFF !important;
        }
        .practo-search-input:focus {
          outline: none !important;
        }
        .search-btn-hover {
          transition: background-color 0.2s ease, transform 0.15s ease !important;
        }
        .search-btn-hover:hover {
          background-color: #00A884 !important;
          transform: translateY(-1px) !important;
        }
        .chip-hover:hover,
        .popular-chip-hover:hover {
          border-color: #00B894 !important;
          background-color: #ECFDF5 !important;
          color: #00B894 !important;
          transform: translateY(-1px) !important;
        }
        .popular-chip-hover {
          transition: all 0.2s ease !important;
        }
        .medi-ai-btn-hover {
          transition: background-color 0.2s ease, transform 0.15s ease !important;
        }
        .medi-ai-btn-hover:hover {
          background-color: #08284d !important;
          transform: translateY(-1px) !important;
        }
        .carousel-arrow-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          cursor: pointer !important;
        }
        .carousel-arrow-btn:hover:not(:disabled) {
          background-color: #00B894 !important;
          border-color: #00B894 !important;
          transform: scale(1.1) !important;
          box-shadow: 0 8px 22px rgba(25, 130, 156, 0.25) !important;
        }
        .carousel-arrow-btn:hover:not(:disabled) svg,
        .carousel-arrow-btn:hover:not(:disabled) * {
          color: #FFFFFF !important;
        }
        .refer-earn-card {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease !important;
          cursor: pointer !important;
        }
        .refer-earn-card:hover {
          transform: translateY(-2px) !important;
          border-color: #00B894 !important;
          box-shadow: 0 10px 24px -4px rgba(25, 130, 156, 0.16), 0 3px 8px -2px rgba(12, 59, 107, 0.04) !important;
        }
        .refer-earn-card:hover .refer-arrow,
        .refer-earn-card:hover svg.refer-arrow {
          transform: translateX(3px) !important;
        }
        .refer-earn-card:active {
          transform: translateY(0px) !important;
        }
      `;
    }
  }, []);

  // Dismiss dropdown on outside click or Escape key
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleClickOutside = (e) => {
        if (!showCityPicker) return;
        const pickerEl = document.getElementById('home-city-picker-box');
        if (pickerEl && !pickerEl.contains(e.target)) {
          setShowCityPicker(false);
        }
      };
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setShowCityPicker(false);
        }
      };
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showCityPicker]);

  return (
    <SafeAreaView style={[styles.container, desktopSiteMode && { minWidth: 1200, width: '100%' }, isDarkMode && { backgroundColor: '#090E1A' }]}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, desktopSiteMode && { minWidth: 1200, width: '100%' }, isDarkMode && { backgroundColor: '#090E1A' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            1. HERO SEARCH HUB (PRESERVE BRAND MINT GREEN BANNER)
        ============================================================ */}
        <View
          style={[
            styles.heroSearchSection,
            styles.heroSearchSectionBg,
            Platform.OS === 'web' ? (
              isDarkMode ? {
                backgroundColor: '#0B1728',
                backgroundImage: 'radial-gradient(ellipse 100% 90% at 50% -10%, rgba(0, 229, 176, 0.16) 0%, rgba(11, 23, 40, 0.95) 55%, #080E1A 100%)',
                borderBottomColor: 'rgba(255, 255, 255, 0.08)',
              } : {
                backgroundColor: '#D8EEF6',
                backgroundImage: 'linear-gradient(135deg, #CCE8F5 0%, #D4F3EB 45%, #DFFAF3 100%)',
                borderBottomColor: '#BFDFEB',
              }
            ) : {},
          ]}
          // @ts-ignore
          className="hero-search-section-bg"
        >
          <View
            style={[
              styles.heroBannerWrap,
              {
                maxWidth: isDesktop ? 1340 : '96%',
                flexDirection: isDesktop ? 'row' : 'column',
                alignItems: isDesktop ? 'center' : 'stretch',
                flexWrap: isDesktop ? 'nowrap' : 'wrap',
                gap: isDesktop ? (width < 1280 ? 18 : 24) : 20,
              },
            ]}
          >
            {/* Left Column: Headlines, Unified Search Bar & Popular Searches */}
            <View style={[styles.heroLeftCol, isDesktop ? { flex: 1, minWidth: 340, maxWidth: width < 1280 ? 560 : 660 } : { width: '100%' }]}>
              {/* 1. Badge & Refer Earn Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <View style={[styles.trustedBadge, isDarkMode && { backgroundColor: 'rgba(0, 229, 176, 0.12)', borderColor: 'rgba(0, 229, 176, 0.25)' }]}>
                  <Ionicons name="shield-checkmark" size={13} color={isDarkMode ? '#00E5B0' : '#00B894'} style={{ marginRight: 6 }} />
                  <Text style={[styles.trustedBadgeText, isDarkMode && { color: '#00E5B0' }]}>{t('hero_badge', 'Trusted Healthcare')}</Text>
                </View>
                {isLoggedIn && (
                  <TouchableOpacity
                    style={[styles.referEarnPill, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.12)' }]}
                    onPress={() => handleNavigateToService('ReferEarn')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="gift" size={13} color={isDarkMode ? '#00E5B0' : '#00B894'} style={{ marginRight: 5 }} />
                    <Text style={[styles.referEarnPillText, isDarkMode && { color: '#E2E8F0' }]}>{t('refer_earn', 'Refer & Earn ₹250')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 2. Main Title */}
              <View style={styles.heroTitleWrap}>
                <Text style={[styles.heroTitleNavy, isDarkMode && { color: '#FFFFFF' }]}>{t('hero_title_navy', 'Your Healthcare,')}</Text>
                <Text style={[styles.heroTitleTeal, isDarkMode && { color: '#00E5B0' }]}>{t('hero_title_teal', 'Simplified.')}</Text>
              </View>

              {/* 3. Subtitle */}
              <Text style={[styles.heroSubtitle, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 22 }]}>
                {t('hero_subtitle', 'Doctors, tests, medicines and scans in one place.')}
              </Text>

              {/* 4. Unified Search Bar */}
              <View style={[styles.unifiedSearchBar, isDarkMode && { backgroundColor: '#111C35', borderColor: 'rgba(255, 255, 255, 0.12)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }]} nativeID="home-unified-search-box">
                {/* Location selector wrapper */}
                <View style={styles.citySelectorWrap} nativeID="home-city-picker-box">
                  {/* City selector button */}
                  <TouchableOpacity
                    style={styles.citySelector}
                    onPress={() => {
                      setShowCityPicker(!showCityPicker);
                      setIsSearchFocused(false);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Selected location: ${selectedCity}`}
                  >
                    <Ionicons name="location-sharp" size={18} color={isDarkMode ? '#00E5B0' : '#1E3A8A'} />
                    <Text style={[styles.cityText, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={1}>{selectedCity}</Text>
                    <Ionicons name="chevron-down" size={13} color={isDarkMode ? '#94A3B8' : '#64748B'} />
                  </TouchableOpacity>

                  {/* City / Locality Search Dropdown Menu */}
                  {showCityPicker && (
                    <View style={[styles.cityDropdown, isDarkMode && { backgroundColor: '#111C35', borderColor: 'rgba(255, 255, 255, 0.12)', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)' }]}>
                      {/* Search Bar inside Location Picker */}
                      <View style={[styles.locationSearchInputWrap, isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                        <Ionicons name="search" size={15} color={isDarkMode ? '#00E5B0' : '#00B894'} />
                        <TextInput
                          style={[styles.locationSearchInput, isDarkMode && { color: '#FFFFFF' }]}
                          placeholder={t('location_search_placeholder', 'Search city, area, locality...')}
                          placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                          value={locationSearchText}
                          onChangeText={setLocationSearchText}
                          autoFocus
                        />
                        {locationSearchText ? (
                          <TouchableOpacity onPress={() => setLocationSearchText('')} style={{ padding: 2 }}>
                            <Ionicons name="close-circle" size={15} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* Detect GPS Location Button */}
                      <TouchableOpacity
                        style={[styles.detectLocationBtn, isDarkMode && { backgroundColor: 'rgba(0, 229, 176, 0.08)', borderColor: 'rgba(0, 229, 176, 0.25)' }, isDetectingLocation && { opacity: 0.7 }]}
                        onPress={handleDetectLocation}
                        disabled={isDetectingLocation}
                        activeOpacity={0.8}
                      >
                        {isDetectingLocation ? (
                          <ActivityIndicator size="small" color={isDarkMode ? '#00E5B0' : '#00B894'} style={{ marginRight: 6 }} />
                        ) : (
                          <Ionicons name="locate" size={15} color={isDarkMode ? '#00E5B0' : '#00B894'} />
                        )}
                        <Text style={[styles.detectLocationText, isDarkMode && { color: '#00E5B0' }]}>
                          {isDetectingLocation ? t('detecting_gps', 'Detecting your GPS location...') : t('use_gps_location', 'Use Current Location (GPS)')}
                        </Text>
                      </TouchableOpacity>

                      {/* Filtered Locations List */}
                      <ScrollView style={styles.locationListScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                        {locationSearchText.trim() && !filteredLocations.some(l => l.name.toLowerCase() === locationSearchText.trim().toLowerCase()) && (
                          <TouchableOpacity
                            style={[styles.customLocationItem, isDarkMode && { borderBottomColor: 'rgba(255, 255, 255, 0.06)' }]}
                            onPress={() => handleSelectLocation(locationSearchText.trim())}
                          >
                            <Ionicons name="pin" size={14} color={isDarkMode ? '#00E5B0' : '#00B894'} style={{ marginRight: 8 }} />
                            <Text style={[styles.customLocationText, isDarkMode && { color: '#E2E8F0' }]}>
                              {t('use_custom_location', 'Use')} <Text style={{ fontWeight: '800' }}>"{locationSearchText.trim()}"</Text>
                            </Text>
                          </TouchableOpacity>
                        )}

                        {filteredLocations.map((loc) => (
                          <TouchableOpacity
                            key={loc.id}
                            style={[
                              styles.cityOption,
                              isDarkMode && { borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
                              selectedCity === loc.name && (isDarkMode ? { backgroundColor: 'rgba(0, 229, 176, 0.12)' } : styles.cityOptionActive),
                            ]}
                            onPress={() => handleSelectLocation(loc.name)}
                          >
                            <Ionicons
                              name={loc.type === 'city' ? 'business-outline' : 'navigate-outline'}
                              size={14}
                              color={selectedCity === loc.name ? (isDarkMode ? '#00E5B0' : '#00B894') : (isDarkMode ? '#94A3B8' : '#64748B')}
                              style={{ marginRight: 8 }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.cityOptionText,
                                  isDarkMode && { color: '#E2E8F0' },
                                  selectedCity === loc.name && (isDarkMode ? { color: '#00E5B0', fontWeight: '800' } : styles.cityOptionTextActive),
                                ]}
                              >
                                {loc.full}
                              </Text>
                            </View>
                            {selectedCity === loc.name && (
                              <Ionicons name="checkmark-circle" size={15} color={isDarkMode ? '#00E5B0' : '#00B894'} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={[styles.searchDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />

                {/* Keyword Search Input */}
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search-outline" size={18} color={isDarkMode ? '#94A3B8' : '#64748B'} style={styles.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    style={[styles.searchInput, isDarkMode && { color: '#FFFFFF' }]}
                    placeholder={t('search_placeholder', 'Search doctors, clinics, tests, medicines...')}
                    placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      if (selectedSearchCategory !== 'All') {
                        setSelectedSearchCategory('All');
                      }
                      setIsSearchFocused(true);
                      if (showCityPicker) setShowCityPicker(false);
                    }}
                    onFocus={() => {
                      setIsSearchFocused(true);
                      if (showCityPicker) setShowCityPicker(false);
                    }}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {searchQuery ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setIsSearchFocused(false);
                      }}
                      style={{ padding: 4 }}
                      accessibilityLabel="Clear Search"
                    >
                      <Ionicons name="close-circle" size={17} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Dedicated Primary Search Submit Button */}
                <TouchableOpacity
                  style={[styles.searchSubmitBtn, isDarkMode && { backgroundColor: '#00E5B0' }]}
                  // @ts-ignore
                  className="search-btn-hover"
                  onPress={handleSearchSubmit}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                >
                  <Ionicons name="search" size={15} color={isDarkMode ? '#080E1A' : '#FFFFFF'} style={{ marginRight: 6 }} />
                  <Text style={[styles.searchSubmitBtnText, isDarkMode && { color: '#080E1A', fontWeight: '800' }]}>{t('search_btn', 'Search')}</Text>
                </TouchableOpacity>

                {/* Floating Search Results Dropdown Panel */}
                {searchQuery.trim().length > 0 && isSearchFocused && (
                  <View style={[styles.searchResultsDropdown, isDarkMode && { backgroundColor: '#111C35', borderColor: 'rgba(255, 255, 255, 0.12)' }]} nativeID="home-search-results-overlay">
                    {allSearchResults.length > 0 ? (
                      <>
                        {/* Results summary & category filter chips */}
                        <View style={[styles.searchResultsHeaderRow, isDarkMode && { borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
                          <Text style={[styles.searchResultsHeaderText, isDarkMode && { color: '#94A3B8' }]}>
                            {allSearchResults.length} services found in <Text style={{ fontWeight: '800', color: isDarkMode ? '#00E5B0' : '#1E3A8A' }}>{selectedCity}</Text>
                          </Text>
                          {matchingCategories.length > 2 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchCatChipsRow}>
                              {matchingCategories.map((cat) => (
                                <TouchableOpacity
                                  key={cat.name}
                                  style={[
                                    styles.searchCatChip,
                                    isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.1)' },
                                    selectedSearchCategory === cat.name && (isDarkMode ? { backgroundColor: 'rgba(0, 229, 176, 0.15)', borderColor: '#00E5B0' } : styles.searchCatChipActive),
                                  ]}
                                  onPress={() => setSelectedSearchCategory(cat.name)}
                                >
                                  <Text style={[
                                    styles.searchCatChipText,
                                    isDarkMode && { color: '#CBD5E1' },
                                    selectedSearchCategory === cat.name && (isDarkMode ? { color: '#00E5B0', fontWeight: '800' } : styles.searchCatChipTextActive),
                                  ]}>
                                    {cat.name} ({cat.count})
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>

                        {/* Scrollable matching items */}
                        <ScrollView style={styles.searchResultsScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {displayedSearchResults.map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={[styles.searchResultItemRow, isDarkMode && { borderBottomColor: 'rgba(255, 255, 255, 0.06)' }]}
                              onPress={async () => {
                                const shouldShow = await shouldShowGuestLeadPopup();
                                if (shouldShow) {
                                  setPendingSearchQuery(item.name || searchQuery);
                                  setPendingAction(() => item.onPress);
                                  setShowLeadModal(true);
                                  return;
                                }
                                item.onPress();
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.searchResultIconBox, { backgroundColor: isDarkMode ? 'rgba(0, 229, 176, 0.12)' : (item.iconBg || '#F0FDFA') }]}>
                                {item.iconType === 'material' ? (
                                  <MaterialCommunityIcons name={item.icon} size={18} color={isDarkMode ? '#00E5B0' : (item.iconColor || '#00B894')} />
                                ) : (
                                  <Ionicons name={item.icon} size={18} color={isDarkMode ? '#00E5B0' : (item.iconColor || '#00B894')} />
                                )}
                              </View>
                              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.searchResultItemTitle, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={1}>
                                    {item.name}
                                  </Text>
                                  <View style={[styles.searchResultCategoryBadge, isDarkMode && { backgroundColor: '#16223D' }]}>
                                    <Text style={[styles.searchResultCategoryBadgeText, isDarkMode && { color: '#00E5B0' }]}>{item.category}</Text>
                                  </View>
                                </View>
                                <Text style={[styles.searchResultItemSubtitle, isDarkMode && { color: '#94A3B8' }]} numberOfLines={1}>
                                  {item.subtitle}
                                </Text>
                              </View>
                              {item.badge ? (
                                <View style={styles.searchResultPriceBadge}>
                                  <Text style={styles.searchResultPriceBadgeText}>{item.badge}</Text>
                                </View>
                              ) : null}
                              <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        {/* Bottom CTA to view in GlobalSearch */}
                        <TouchableOpacity
                          style={[styles.searchDropdownFooter, isDarkMode && { borderTopColor: 'rgba(255, 255, 255, 0.08)' }]}
                          onPress={handleSearchSubmit}
                        >
                          <Text style={[styles.searchDropdownFooterText, isDarkMode && { color: '#00E5B0' }]}>
                            Press Enter or click here to view all results in Global Search
                          </Text>
                          <Ionicons name="arrow-forward" size={14} color={isDarkMode ? '#00E5B0' : '#00B894'} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.searchNoResultsBox}>
                        <View style={[styles.searchNoResultsIconCircle, isDarkMode && { backgroundColor: '#16223D' }]}>
                          <Ionicons name="search-outline" size={26} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                        </View>
                        <Text style={[styles.searchNoResultsTitle, isDarkMode && { color: '#FFFFFF' }]}>No results found for "{searchQuery}"</Text>
                        <Text style={[styles.searchNoResultsSubtitle, isDarkMode && { color: '#94A3B8' }]}>
                          No doctors, lab tests, medicines, clinics, or scans match in {selectedCity}. Try checking your spelling or searching for another term.
                        </Text>
                        <View style={styles.searchNoResultsSuggestions}>
                          <Text style={[styles.searchNoResultsSuggestionsLabel, isDarkMode && { color: '#CBD5E1' }]}>Popular searches:</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {POPULAR_SEARCH_TAGS.map((tag, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={[styles.searchSuggestionPill, isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.1)' }]}
                                onPress={() => setSearchQuery(tag.label || tag.query)}
                              >
                                <Text style={[styles.searchSuggestionPillText, isDarkMode && { color: '#E2E8F0' }]}>{tag.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.searchClearBtn, isDarkMode && { backgroundColor: '#16223D', borderColor: 'rgba(255, 255, 255, 0.12)' }]}
                          onPress={() => {
                            setSearchQuery('');
                            setIsSearchFocused(false);
                          }}
                        >
                          <Text style={[styles.searchClearBtnText, isDarkMode && { color: '#E2E8F0' }]}>Clear Search</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Popular Searches Row */}
              <View style={styles.popularSearchesRow}>
                <Text style={[styles.popularSearchesLabel, isDarkMode && { color: '#94A3B8' }]}>{t('popular_searches', 'Popular searches:')}</Text>
                <View style={styles.popularChipsContainer}>
                  {POPULAR_SEARCH_TAGS.map((tag, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.popularChip,
                        isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.12)' },
                      ]}
                      // @ts-ignore
                      className="popular-chip-hover"
                      onPress={() => handlePopularTagClick(tag)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.popularChipText, isDarkMode && { color: '#E2E8F0' }, isIndic && { lineHeight: 18 }]}>
                        {t(tag.key, tag.label)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Right Visual Cluster: Family Image & MediUnify AI Card */}
            {isDesktop ? (
              <View style={[styles.heroRightVisualCluster, { gap: width < 1280 ? 12 : 16 }]}>
                {/* Smiling Indian Family Photo */}
                <View style={[
                  styles.heroFamilyPhotoWrap,
                  isDarkMode && { borderColor: 'rgba(255, 255, 255, 0.12)' },
                  { width: width < 1280 ? 210 : 260, height: width < 1280 ? 245 : 275 }
                ]}>
                  <Image
                    source={require('../../../assets/images/hero_family.jpg')}
                    style={styles.heroFamilyPhoto}
                    resizeMode="cover"
                  />
                </View>

                {/* MediUnify AI Guide Card */}
                <View style={[
                  styles.mediAiCard,
                  isDarkMode && { backgroundColor: '#111C35', borderColor: 'rgba(255, 255, 255, 0.12)' },
                  { width: width < 1280 ? 255 : 285 }
                ]}>
                  <View style={styles.mediAiCardHeader}>
                    <View style={styles.mediAiHeaderLeft}>
                      <Image
                        source={require('../../../assets/bot-icon.png')}
                        style={styles.mediAiAvatar}
                        resizeMode="contain"
                      />
                      <Text style={[styles.mediAiTitle, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={2}>
                        {t('ai_guide_title', 'MediUnify AI Assistant')}
                      </Text>
                    </View>
                    <View style={[styles.mediAiBadge, isDarkMode && { backgroundColor: 'rgba(0, 229, 176, 0.15)', borderColor: 'rgba(0, 229, 176, 0.3)' }]}>
                      <Text style={[styles.mediAiBadgeText, isDarkMode && { color: '#00E5B0' }]}>{t('ai_guide_badge', '24/7 AI Guide')}</Text>
                    </View>
                  </View>

                  <Text style={[styles.mediAiQuestion, isDarkMode && { color: '#FFFFFF' }, isIndic && { lineHeight: 20 }]}>
                    {t('ai_guide_question', 'Need help finding a service?')}
                  </Text>
                  <Text style={[styles.mediAiPrompt, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 18 }]}>
                    {t('ai_guide_prompt', 'Ask about symptoms, doctors, or tests.')}
                  </Text>

                  <TouchableOpacity
                    style={[styles.mediAiBtn, isDarkMode && { backgroundColor: '#00E5B0' }]}
                    // @ts-ignore
                    className="medi-ai-btn-hover"
                    onPress={() => handleNavigateToService('Chatbot')}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="Chat with MediUnify AI"
                  >
                    <Text style={[styles.mediAiBtnText, isDarkMode && { color: '#080E1A', fontWeight: '800' }, isIndic && { lineHeight: 18 }]}>
                      {t('chat_with_ai_btn', 'Chat with AI')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.heroMobileCardsWrap}>
                <View style={[styles.mediAiCard, isDarkMode && { backgroundColor: '#111C35', borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                  <View style={styles.mediAiCardHeader}>
                    <View style={styles.mediAiHeaderLeft}>
                      <Image
                        source={require('../../../assets/bot-icon.png')}
                        style={styles.mediAiAvatar}
                        resizeMode="contain"
                      />
                      <Text style={[styles.mediAiTitle, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={2}>
                        {t('ai_guide_title', 'MediUnify AI Assistant')}
                      </Text>
                    </View>
                    <View style={[styles.mediAiBadge, isDarkMode && { backgroundColor: 'rgba(0, 229, 176, 0.15)', borderColor: 'rgba(0, 229, 176, 0.3)' }]}>
                      <Text style={[styles.mediAiBadgeText, isDarkMode && { color: '#00E5B0' }]}>{t('ai_guide_badge', '24/7 AI Guide')}</Text>
                    </View>
                  </View>

                  <Text style={[styles.mediAiQuestion, isDarkMode && { color: '#FFFFFF' }, isIndic && { lineHeight: 20 }]}>
                    {t('ai_guide_question', 'Need help finding a service?')}
                  </Text>
                  <Text style={[styles.mediAiPrompt, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 18 }]}>
                    {t('ai_guide_prompt', 'Ask about symptoms, doctors, or tests.')}
                  </Text>

                  <TouchableOpacity
                    style={[styles.mediAiBtn, isDarkMode && { backgroundColor: '#00E5B0' }]}
                    onPress={() => handleNavigateToService('Chatbot')}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.mediAiBtnText, isDarkMode && { color: '#080E1A', fontWeight: '800' }, isIndic && { lineHeight: 18 }]}>
                      {t('chat_with_ai_btn', 'Chat with AI')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

        </View>

        {/* ============================================================
            2. HEALTHCARE SERVICES — EXACT REFERENCE DESIGN
        ============================================================ */}
        <View style={[styles.practoHeroCardsSection, { maxWidth: isDesktop ? 1340 : '96%' }]}>
          {isDesktop ? (
            <View style={styles.servicesSectionDesktopLayout}>
              {/* Left Column: Heading, Subtitle & Tagline */}
              <View style={styles.servicesLeftColumn}>
                <View style={[styles.servicesHeaderBadgeRow, isDarkMode && { backgroundColor: 'rgba(0, 184, 148, 0.15)', borderColor: 'rgba(0, 184, 148, 0.35)' }]}>
                  <Text style={[styles.servicesHeaderBadgeText, isDarkMode && { color: '#00E5B0' }]}>{t('our_services_badge', 'OUR SERVICES')}</Text>
                  <View style={[styles.servicesHeaderBadgeLine, isDarkMode && { backgroundColor: '#00E5B0' }]} />
                </View>
                <Text style={[styles.servicesSectionMainTitle, isDarkMode && { color: '#FFFFFF' }, isIndic && { lineHeight: 36 }]}>
                  {'Healthcare\nServices'}
                </Text>
                <Text style={[styles.servicesSectionMainSubtitle, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 20 }]}>
                  {t('our_services_subtitle_modern', 'Simple. Trusted. All in one place.')}
                </Text>

                <View style={styles.betterCareRow}>
                  <Ionicons name="apps" size={14} color="#00B894" style={{ marginRight: 6 }} />
                  <View>
                    <Text style={[styles.betterCareText, isDarkMode && { color: '#F8FAFC' }]}>Better care.</Text>
                    <Text style={[styles.togetherText, isDarkMode && { color: '#94A3B8' }]}>Together.</Text>
                  </View>
                </View>
              </View>

              {/* Center: 4 Organic Fluid Cards with Connecting Wave */}
              <View style={styles.servicesCardsRowWrapper}>
                {/* Journey Connecting Wave behind cards */}
                {Platform.OS === 'web' && (
                  <View style={styles.journeyWaveContainer} pointerEvents="none">
                    {/* @ts-ignore */}
                    <svg
                      style={{
                        position: 'absolute',
                        top: 55,
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
                        stroke={isDarkMode ? 'rgba(0, 229, 176, 0.35)' : 'rgba(0, 184, 148, 0.22)'}
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        fill="none"
                      />
                    </svg>
                  </View>
                )}

                <View style={styles.servicesCardsRow}>
                  {HERO_PRACTO_CARDS.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.organicServiceCard,
                        isDarkMode && {
                          backgroundColor: '#121D32',
                          backgroundImage: 'linear-gradient(180deg, #131E35 0%, #0D1627 100%)',
                          boxShadow: '0 14px 34px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                        },
                        {
                          borderBottomColor: card.accentColor,
                          borderLeftColor: isDarkMode ? 'rgba(255, 255, 255, 0.09)' : card.accentColor,
                          borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.09)' : 'transparent',
                          borderRightColor: isDarkMode ? 'rgba(255, 255, 255, 0.09)' : 'transparent',
                        },
                      ]}
                      // @ts-ignore
                      className="service-card"
                      activeOpacity={0.92}
                      onPress={() => handleNavigateToService(card.route, card.route === 'Imaging' ? { city: selectedCity } : undefined)}
                    >
                      {/* Organic Fluid 3D Card Illustration (Matching Reference Design) */}
                      <View style={[styles.organicIllustrationWrap, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.03)' }]}>
                        <View style={[styles.stepNumberBadge, { backgroundColor: card.accentColor }]}>
                          <Text style={styles.stepNumberText}>{card.stepNumber}</Text>
                        </View>
                        <Image
                          source={card.image}
                          style={styles.organicIllustrationImage}
                          resizeMode="contain"
                        />
                      </View>

                      {/* Card Content */}
                      <View style={styles.organicCardContent}>
                        <Text style={[styles.organicCardTitle, isDarkMode && { color: '#FFFFFF' }, isIndic && { lineHeight: 20 }]} numberOfLines={1}>
                          {card.titleKey ? t(card.titleKey, card.title) : card.title}
                        </Text>
                        <Text style={[styles.organicCardSubtitle, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 16 }]} numberOfLines={2}>
                          {card.subtitleKey ? t(card.subtitleKey, card.subtitle) : card.subtitle}
                        </Text>

                        {/* Circular Arrow & Book Now CTA */}
                        <View style={styles.organicCtaRow}>
                          <View style={[styles.organicArrowCircle, { borderColor: card.accentColor }, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                            <Ionicons name="arrow-forward" size={11} color={card.accentColor} />
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

              {/* Far Right Indicator */}
              {isWideDesktop && (
                <View style={styles.onePlatformBadgeWrap}>
                  <View style={[styles.onePlatformPill, isDarkMode && { backgroundColor: '#131E35', borderColor: 'rgba(0, 184, 148, 0.35)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)' }]}>
                    <Ionicons name="sparkles-outline" size={13} color="#00E5B0" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={[styles.onePlatformTitle, isDarkMode && { color: '#FFFFFF' }]}>One platform.</Text>
                      <Text style={[styles.onePlatformSubtitle, isDarkMode && { color: '#00E5B0' }]}>Complete care.</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            // Mobile & Tablet: Stacked layout with organic cards
            <>
              <View style={styles.serviceCardsHeader}>
                <View style={styles.servicesHeaderBadgeRow}>
                  <Text style={styles.servicesHeaderBadgeText}>{t('our_services_badge', 'OUR SERVICES')}</Text>
                  <View style={styles.servicesHeaderBadgeLine} />
                </View>
                <Text style={[styles.servicesSectionMainTitle, isDarkMode && { color: '#FFFFFF' }, isIndic && { lineHeight: 32 }]}>
                  {t('services_section_title', 'Healthcare Services')}
                </Text>
                <Text style={[styles.servicesSectionMainSubtitle, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 22 }]}>
                  {t('our_services_subtitle_modern', 'Simple. Trusted. All in one place.')}
                </Text>
              </View>

              <View
                style={[
                  styles.practoHeroGrid,
                  isTablet ? styles.practoHeroGridTablet : styles.practoHeroGridMobile,
                ]}
              >
                {HERO_PRACTO_CARDS.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.organicServiceCard,
                      isTablet ? { width: '48%' } : { width: '100%' },
                      isDarkMode && {
                        backgroundColor: '#121D32',
                        backgroundImage: 'linear-gradient(180deg, #131E35 0%, #0D1627 100%)',
                        boxShadow: '0 14px 34px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                      },
                      {
                        borderBottomColor: card.accentColor,
                        borderLeftColor: isDarkMode ? 'rgba(255, 255, 255, 0.09)' : card.accentColor,
                        borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.09)' : 'transparent',
                        borderRightColor: isDarkMode ? 'rgba(255, 255, 255, 0.09)' : 'transparent',
                      },
                    ]}
                    // @ts-ignore
                    className="service-card"
                    activeOpacity={0.92}
                    onPress={() => handleNavigateToService(card.route, card.route === 'Imaging' ? { city: selectedCity } : undefined)}
                  >
                    {/* Organic Fluid 3D Card Illustration (Matching Reference Design) */}
                    <View style={[styles.organicIllustrationWrap, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.03)' }]}>
                      <View style={[styles.stepNumberBadge, { backgroundColor: card.accentColor }]}>
                        <Text style={styles.stepNumberText}>{card.stepNumber}</Text>
                      </View>
                      <Image
                        source={card.image}
                        style={styles.organicIllustrationImage}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.organicCardContent}>
                      <Text style={[styles.organicCardTitle, isDarkMode && { color: '#FFFFFF' }, isIndic && { lineHeight: 20 }]} numberOfLines={1}>
                        {card.titleKey ? t(card.titleKey, card.title) : card.title}
                      </Text>
                      <Text style={[styles.organicCardSubtitle, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 16 }]} numberOfLines={2}>
                        {card.subtitleKey ? t(card.subtitleKey, card.subtitle) : card.subtitle}
                      </Text>

                      <View style={styles.organicCtaRow}>
                        <View style={[styles.organicArrowCircle, { borderColor: card.accentColor }, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                          <Ionicons name="arrow-forward" size={11} color={card.accentColor} />
                        </View>
                        <Text style={[styles.organicCtaText, { color: card.accentColor }]}>
                          {t('book_now_btn', 'Book Now')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ============================================================
            PROMOTIONAL HEALTH OFFERS & ADVERTS (PRACTO / APOLLO STYLE)
        ============================================================ */}
        <PromotionalAdsSection onNavigate={handleNavigateToService} />

        {/* ============================================================
            3. CONSULT TOP DOCTORS SPECIALTIES SECTION
        ============================================================ */}
        <View style={[styles.specialtiesSection, { maxWidth: isDesktop ? 1340 : '96%' }]}>
          {/* Header Row */}
          <View style={styles.specialtiesHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={[styles.sectionBadgeWrap, isDarkMode && { backgroundColor: 'rgba(0, 184, 148, 0.15)', borderColor: 'rgba(0, 184, 148, 0.35)' }]}>
                <Text style={[styles.sectionBadge, isDarkMode && { color: '#00E5B0' }]}>{t('specialties_badge', 'SPECIALIZATIONS')}</Text>
              </View>
              <Text style={[styles.specialtiesTitle, isIndic && { lineHeight: 32 }, isDarkMode && { color: '#FFFFFF' }]}>
                {t('specialties_title', 'Top Doctor Specializations')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.viewAllBtn, isDarkMode && { backgroundColor: 'rgba(0, 184, 148, 0.12)', borderColor: '#00B894' }]}
              onPress={() => handleNavigateToService('DoctorList')}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewAllBtnText, isDarkMode && { color: '#00E5B0' }]}>{t('view_all_specialties', 'View All')}</Text>
              <Ionicons name="arrow-forward" size={14} color={isDarkMode ? '#00E5B0' : PALETTE.teal} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          {/* Top Specializations Single-Row Horizontal Carousel */}
          <View style={styles.specialtiesCarouselWrap}>
            {/* Left Floating Navigation Arrow */}
            <TouchableOpacity
              style={[
                styles.carouselArrowBtn,
                styles.carouselArrowLeft,
                isDarkMode && { backgroundColor: '#18253D', borderColor: 'rgba(255, 255, 255, 0.15)', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' },
                !canScrollLeft && styles.carouselArrowDisabled,
                !isDesktop && !isTablet && { display: 'none' },
              ]}
              // @ts-ignore
              className="carousel-arrow-btn"
              onPress={() => scrollSpecialties('left')}
              disabled={!canScrollLeft}
              activeOpacity={0.85}
              accessibilityLabel="Previous specialties"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={canScrollLeft ? (isDarkMode ? '#FFFFFF' : PALETTE.slateDark) : (isDarkMode ? '#475569' : '#94A3B8')}
              />
            </TouchableOpacity>

            {/* Horizontal Scroll Track */}
            <ScrollView
              ref={specialtiesScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.specialtiesScrollContent}
              style={styles.specialtiesScrollView}
              onScroll={handleSpecialtiesScroll}
              scrollEventThrottle={16}
            >
              {FEATURED_SPECIALTIES.map((spec) => (
                <TouchableOpacity
                  key={spec.id}
                  style={[
                    styles.specialtyItem,
                    isDesktop
                      ? styles.specialtyItemDesktop
                      : isTablet
                      ? styles.specialtyItemTablet
                      : styles.specialtyItemMobile,
                    isDarkMode && {
                      backgroundColor: '#121D32',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      borderWidth: 1.5,
                      boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.5)',
                      ...(Platform.OS === 'web' ? { backgroundImage: 'linear-gradient(180deg, #131E35 0%, #0D1627 100%)' } : {}),
                    },
                  ]}
                  // @ts-ignore
                  className="practo-spec-card"
                  onPress={() => handleConsultNow(spec.specialtyId)}
                  activeOpacity={0.88}
                >
                  {/* Unified Medical Specialty Icon / Illustration */}
                  <View style={[styles.specialtyIconWrap, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 20 }]}>
                    {spec.image ? (
                      <Image
                        source={spec.image}
                        style={styles.specialtyImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <SpecialtyIcon id={spec.id} size={46} color={spec.accentColor || (isDarkMode ? '#00E5B0' : PALETTE.teal)} />
                    )}
                  </View>

                  {/* Specialty Title */}
                  <Text style={[styles.specialtyItemTitle, { color: isDarkMode ? '#FFFFFF' : '#1E3A8A' }, isIndic && { lineHeight: 20 }]} numberOfLines={1}>
                    {(SPECIALTY_TRANSLATIONS[spec.id] || SPECIALTY_TRANSLATIONS[spec.specialtyId]) ? t((SPECIALTY_TRANSLATIONS[spec.id] || SPECIALTY_TRANSLATIONS[spec.specialtyId]).title, spec.title) : spec.title}
                  </Text>

                  {/* Subtitle / Common Symptoms */}
                  <Text style={[styles.specialtyItemSubtitle, isDarkMode && { color: '#94A3B8' }, isIndic && { lineHeight: 16 }]} numberOfLines={2}>
                    {(SPECIALTY_TRANSLATIONS[spec.id] || SPECIALTY_TRANSLATIONS[spec.specialtyId]) ? t((SPECIALTY_TRANSLATIONS[spec.id] || SPECIALTY_TRANSLATIONS[spec.specialtyId]).sub, spec.subtitle) : spec.subtitle}
                  </Text>

                  {/* Consult Now CTA */}
                  <View
                    style={[
                      styles.consultNowTouch,
                      spec.btnBg ? { backgroundColor: spec.btnBg, borderColor: spec.btnBorder || spec.cardBorder } : null,
                      isDarkMode && { backgroundColor: 'rgba(0, 184, 148, 0.12)', borderColor: 'rgba(0, 184, 148, 0.35)' },
                      isIndic && { paddingHorizontal: 10, minWidth: 84 },
                    ]}
                    // @ts-ignore
                    className="consult-btn-hover"
                  >
                    <Text style={[styles.consultNowText, spec.btnText ? { color: spec.btnText } : null, isDarkMode && { color: '#00E5B0' }, isIndic && { fontSize: 10, lineHeight: 14 }]}>
                      {t('consult_now_btn', 'CONSULT NOW')}
                    </Text>
                    <Ionicons name="arrow-forward" size={10} color={isDarkMode ? '#00E5B0' : (spec.btnText || PALETTE.teal)} style={{ marginLeft: 3 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Right Floating Navigation Arrow */}
            <TouchableOpacity
              style={[
                styles.carouselArrowBtn,
                styles.carouselArrowRight,
                isDarkMode && { backgroundColor: '#18253D', borderColor: 'rgba(255, 255, 255, 0.15)', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' },
                !canScrollRight && styles.carouselArrowDisabled,
                !isDesktop && !isTablet && { display: 'none' },
              ]}
              // @ts-ignore
              className="carousel-arrow-btn"
              onPress={() => scrollSpecialties('right')}
              disabled={!canScrollRight}
              activeOpacity={0.85}
              accessibilityLabel="Next specialties"
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={canScrollRight ? (isDarkMode ? '#FFFFFF' : PALETTE.slateDark) : (isDarkMode ? '#475569' : '#94A3B8')}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================
            4. RICH WEB FOOTER
        ============================================================ */}
        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* Guest Lead-Generation Popup */}
      <GuestLeadModal
        visible={showLeadModal}
        searchQuery={pendingSearchQuery}
        selectedCity={selectedCity}
        onSuccess={() => {
          setShowLeadModal(false);
          if (pendingAction) {
            const act = pendingAction;
            setPendingAction(null);
            act();
          } else {
            executeSearch(pendingSearchQuery, selectedCity);
          }
        }}
        onClose={() => {
          setShowLeadModal(false);
          if (pendingAction) {
            const act = pendingAction;
            setPendingAction(null);
            act();
          } else {
            executeSearch(pendingSearchQuery, selectedCity);
          }
        }}
      />
    </SafeAreaView>
  );
};

// Web specific inline style objects for raw HTML tags
const webStyles = {
  footerContainer: {
    width: '100%',
    backgroundColor: '#E0ECF6',
    backgroundImage: 'linear-gradient(180deg, #DDEAF5 0%, #E5F0F8 45%, #DCE8F3 100%)',
    borderTop: '1.5px solid #C4D8E7',
    marginTop: 64,
  },
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },

  // ==========================================
  // BRAND LOGO TYPOGRAPHY
  // ==========================================
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: PALETTE.navyBlue,
    letterSpacing: -0.6,
  },
  brandTitleAccent: {
    fontSize: 23,
    fontWeight: '900',
    color: PALETTE.teal,
    letterSpacing: -0.6,
  },

  // ==========================================
  // HERO SEARCH SECTION
  // ==========================================
  heroSearchSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 16,
    backgroundColor: '#D8EEF6',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDFEB',
    position: 'relative',
    zIndex: 9999,
  },
  heroTopActionsRow: {
    width: '100%',
    zIndex: 100,
  },
  heroTopActionsRowDesktop: {
    position: 'absolute',
    top: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  heroTopActionsRowMobile: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTopActionsInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  referEarnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  referEarnIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referEarnInfoCol: {
    justifyContent: 'center',
  },
  referEarnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referEarnHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.2,
  },
  referEarnRewardPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  referEarnRewardPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00B894',
  },
  referEarnSubtext: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  referEarnArrowWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  heroBannerWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
  },
  heroLeftCol: {
    alignItems: 'flex-start',
  },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  trustedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.6,
  },
  heroTitleWrap: {
    marginBottom: 10,
  },
  heroTitleNavy: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  heroTitleTeal: {
    fontSize: 36,
    fontWeight: '900',
    color: '#00B894',
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 22,
    maxWidth: 620,
    marginBottom: 22,
  },
  unifiedSearchBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    borderRadius: 16,
    height: 56,
    paddingLeft: 12,
    paddingRight: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
    position: 'relative',
    zIndex: 9999,
  },
  searchBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    borderRadius: 16,
    height: 56,
    paddingLeft: 12,
    paddingRight: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
    position: 'relative',
    zIndex: 9999,
  },
  citySelectorWrap: {
    position: 'relative',
    zIndex: 10000,
    height: '100%',
    justifyContent: 'center',
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 8,
    height: '100%',
    minWidth: 125,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  cityDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    width: 290,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 10001,
  },
  locationSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E3A8A',
    marginLeft: 6,
    outlineStyle: 'none',
  },
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    marginBottom: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  detectLocationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  locationListScroll: {
    maxHeight: 220,
  },
  customLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    marginBottom: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  customLocationText: {
    fontSize: 12.5,
    color: '#00B894',
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cityOptionActive: {
    backgroundColor: '#ECFDF5',
  },
  cityOptionText: {
    fontSize: 13,
    color: '#334155',
  },
  cityOptionTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  searchDivider: {
    width: 1.5,
    height: 28,
    backgroundColor: '#DCE7EC',
    marginHorizontal: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
    outlineStyle: 'none',
  },
  searchSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 11,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  searchSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  popularSearchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  popularSearchesLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginRight: 4,
  },
  popularChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  popularChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 5.5,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  popularChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  heroRightVisualCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 16,
  },
  heroFamilyPhotoWrap: {
    width: 270,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  heroFamilyPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  mediAiCard: {
    width: 285,
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    padding: 15,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  mediAiCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    width: '100%',
  },
  mediAiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  mediAiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexShrink: 0,
  },
  mediAiTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E3A8A',
    flexShrink: 1,
    minWidth: 0,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  mediAiBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  mediAiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.2,
  },
  // Floating Search Results Dropdown Styles
  searchResultsDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 10002,
    maxHeight: 400,
    overflow: 'hidden',
  },
  searchResultsHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFCFD',
  },
  searchResultsHeaderText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  searchCatChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  searchCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  searchCatChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  searchCatChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  searchCatChipTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  searchResultsScroll: {
    maxHeight: 280,
  },
  searchResultItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  searchResultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  searchResultItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E3A8A',
    flexShrink: 1,
  },
  searchResultCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  searchResultCategoryBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  searchResultItemSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  searchResultPriceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    marginRight: 6,
  },
  searchResultPriceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00B894',
  },
  searchDropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  searchDropdownFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  searchNoResultsBox: {
    padding: 24,
    alignItems: 'center',
  },
  searchNoResultsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  searchNoResultsTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
    textAlign: 'center',
  },
  searchNoResultsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 380,
    marginBottom: 12,
  },
  searchNoResultsSuggestions: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  searchNoResultsSuggestionsLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  searchSuggestionPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  searchSuggestionPillText: {
    fontSize: 11.5,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  searchClearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  searchClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  mediAiQuestion: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  mediAiPrompt: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 12,
  },
  mediAiBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  mediAiBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mediAiFeaturesList: {
    gap: 5,
  },
  mediAiFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediAiFeatureText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '500',
  },
  heroMobileCardsWrap: {
    width: '100%',
    marginTop: 18,
  },
  trustHighlightsRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DCE7EC',
    gap: 12,
    paddingHorizontal: 8,
  },
  trustHighlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustHighlightText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // ==========================================
  // SERVICE CARDS — CREATIVE ILLUSTRATED DESIGN
  // ==========================================
  practoHeroCardsSection: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    marginTop: 48,
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  serviceCardsHeader: {
    marginBottom: 32,
  },
  serviceCardsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.6,
    marginBottom: 8,
    lineHeight: 36,
  },
  serviceCardsSubtitle: {
    fontSize: 14.5,
    color: '#64748B',
    fontWeight: '400',
    lineHeight: 22,
    maxWidth: 520,
  },
  referEarnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  referEarnPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.2,
  },
  practoHeroGrid: {
    width: '100%',
  },
  practoHeroGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    width: '100%',
  },
  practoHeroGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  practoHeroGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  // ORGANIC HEALTHCARE SERVICES SECTION (MATCHING EXACT REFERENCE DESIGN)
  servicesSectionDesktopLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  servicesLeftColumn: {
    width: 220,
    paddingRight: 8,
    justifyContent: 'center',
  },
  servicesHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  servicesHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00B894',
    letterSpacing: 0.8,
  },
  servicesHeaderBadgeLine: {
    width: 28,
    height: 2,
    backgroundColor: '#A7F3D0',
    marginLeft: 8,
    borderRadius: 1,
  },
  servicesSectionMainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 38,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  servicesSectionMainSubtitle: {
    fontSize: 12.5,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 24,
  },
  betterCareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  betterCareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 16,
  },
  togetherText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 16,
  },
  servicesCardsRowWrapper: {
    flex: 1,
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
  journeyStartDot: {
    position: 'absolute',
    top: 60,
    left: -8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0284C7',
    zIndex: 1,
  },
  servicesCardsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'stretch',
    zIndex: 1,
  },
  onePlatformBadgeWrap: {
    width: 125,
    paddingLeft: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
  },
  onePlatformPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 12,
  },
  onePlatformTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 14,
  },
  onePlatformSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 14,
  },
  onePlatformDotsCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    marginLeft: 12,
  },
  dotActive: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#00B894',
  },
  dotInactive: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },

  // ORGANIC FLUID CARD
  organicServiceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 8,
    paddingBottom: 16,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
    boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(0, 0, 0, 0.02)',
    minHeight: 285,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    } : {}),
  },
  organicIllustrationWrap: {
    width: '100%',
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  stepNumberBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  organicIllustrationImage: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  organicCardContent: {
    paddingHorizontal: 8,
    paddingTop: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  organicCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  organicCardSubtitle: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
    minHeight: 32,
  },
  organicCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  organicArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicCtaText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  serviceBookBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  consultNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultNowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1170CF',
  },

  // ==========================================
  // SPECIALTIES SECTION
  // ==========================================
  specialtiesSection: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    marginTop: 48,
    marginBottom: 64,
  },
  specialtiesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16,
  },
  sectionBadgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    marginBottom: 8,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00B894',
    letterSpacing: 0.6,
  },
  specialtiesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  specialtiesSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B894',
  },
  specialtiesCarouselWrap: {
    position: 'relative',
    width: '100%',
    marginVertical: 4,
    justifyContent: 'center',
  },
  specialtiesScrollView: {
    width: '100%',
    ...(Platform.OS === 'web' ? {
      scrollBehavior: 'smooth',
      WebkitOverflowScrolling: 'touch',
    } : {}),
  },
  specialtiesScrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 16,
  },
  carouselArrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      userSelect: 'none',
      boxShadow: '0 4px 14px rgba(12, 59, 107, 0.08)',
    } : {}),
  },
  carouselArrowLeft: {
    left: -14,
  },
  carouselArrowRight: {
    right: -14,
  },
  carouselArrowDisabled: {
    opacity: 0.28,
    ...(Platform.OS === 'web' ? {
      cursor: 'not-allowed',
      pointerEvents: 'none',
      boxShadow: 'none',
    } : {}),
  },
  specialtiesRow: {
    width: '100%',
  },
  specialtiesRowDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 20,
    justifyContent: 'space-between',
  },
  specialtiesRowTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  specialtiesRowMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  specialtiesRowWrapped: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  specialtyItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderRadius: 28,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 6,
    flexShrink: 0,
    boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      boxSizing: 'border-box',
      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    } : {}),
  },
  specialtyItemDesktop: {
    width: 202,
  },
  specialtyItemTablet: {
    width: 175,
  },
  specialtyItemMobile: {
    width: 152,
    paddingHorizontal: 8,
  },
  specialtyIconWrap: {
    width: 136,
    height: 136,
    maxWidth: '92%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  specialtyImage: {
    width: '100%',
    height: '100%',
  },
  specialtyItemTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  specialtyItemSubtitle: {
    fontSize: 11.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
    minHeight: 32,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
  consultNowTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5.5,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  consultNowText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00B894',
    letterSpacing: 0.4,
  },

  // ==========================================
  // TRUST SECTION
  // ==========================================
  trustSection: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    marginTop: 56,
  },
  sectionHeaderCompact: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  trustCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    padding: 22,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  trustCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trustIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  trustDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '400',
  },

  // ==========================================
  // EMERGENCY BANNER
  // ==========================================
  emergencyBanner: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 48,
    backgroundColor: '#FFF1E8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 280,
  },
  emergencyIconPulse: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  emergencyTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  emergencySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
  },
  emergencyRight: {
    alignItems: 'flex-end',
  },
  emergencyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7F50',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
    shadowColor: '#FF7F50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  emergencyCallText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ==========================================
  // RICH FOOTER (CLEAN LIGHT HEALTHCARE)
  // ==========================================
  footerInner: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    justifyContent: 'space-between',
  },
  footerColBrand: {
    flex: 1.4,
    minWidth: 260,
  },
  footerBrandDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 18,
    maxWidth: 340,
  },
  complianceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compliancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C4D8E7',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  compliancePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  footerCol: {
    flex: 1,
    minWidth: 160,
  },
  footerColTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  footerLink: {
    fontSize: 12.5,
    color: '#334155',
    marginBottom: 9,
    fontWeight: '500',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  footerBottomBar: {
    width: '100%',
    alignSelf: 'center',
    borderTopWidth: 1,
    borderTopColor: '#C4D8E7',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#475569',
  },
  footerBottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerBottomLinkText: {
    fontSize: 12,
    color: '#475569',
  },
  footerBottomLinkDot: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // ─── VIEW ALL SERVICES CTA ──────────────────────
  viewAllServicesRow: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  viewAllServicesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  viewAllServicesBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00B894',
    letterSpacing: -0.2,
  },
});

const HomeScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopLayout(width);

  if (!isDesktop) {
    return <HomeScreenMobile {...props} />;
  }

  return <HomeScreenWeb {...props} />;
};

export default HomeScreenResponsive;
