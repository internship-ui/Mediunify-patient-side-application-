import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Linking,
  Image,
  StatusBar,
  useWindowDimensions,
  FlatList,
  Keyboard,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../utils/alert';
import {
  requestLocationPermissionWebSafe,
  getCurrentPositionWebSafe,
  reverseGeocodeWebSafe,
  detectAutoLocation,
  detectPhoneGPSLocation,
  normalizeCityName,
} from '../../utils/locationHelper';

import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { saveTransaction } from '../../services/transactionService';
import GuestLeadModal from '../../components/common/GuestLeadModal';
import { shouldShowGuestLeadPopup } from '../../services/guestLeadService';

// Real Data Sources for Search
import { doctors } from '../../data/doctors';
import videoDoctors from '../../data/videoDoctors';
import { LAB_TESTS_MASTER, LAB_PACKAGES, ALL_CITY_DIAGNOSTIC_CENTRES } from '../../data/labTestData';
import pharmacyProducts from '../../data/pharmacyProducts';
import { RADIOLOGY_TESTS } from '../../data/radiologyCatalogData';
import { surgeryHospitals } from '../../data/surgeryHospitalsData';
import { availableNursingServices } from '../../data/homeNursingData';
import { medicalEquipments } from '../../data/equipmentData';

const CITIES = ['Mysuru', 'Bengaluru', 'Hassan', 'Mangaluru', 'Hubballi', 'Belagavi'];

const SPECIALIZED_PROGRAMS = [
  {
    id: 'prog-surgery',
    pillText: 'ZERO HIDDEN COSTS',
    pillBg: '#EFF6FF',
    pillColor: '#1E3A8A',
    title: 'Surgical Care',
    subtitle: 'Accredited Hospitals • Free Quotes',
    priceText: 'Cashless TPA',
    badgeText: 'Explore',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    route: 'HospitalCare',
  },
  {
    id: 'prog-checkup',
    pillText: 'FLAT 50% OFF',
    pillBg: '#E0F2FE',
    pillColor: '#0284C7',
    title: 'Health Checkup',
    subtitle: '68 Vital Tests • Free Pickup',
    priceText: 'From ₹999*',
    badgeText: 'Book',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    route: 'LabTests',
  },
  {
    id: 'prog-ayurveda',
    pillText: 'AYUSH CERTIFIED',
    pillBg: '#DCFCE7',
    pillColor: '#16A34A',
    title: 'Ayurveda Care',
    subtitle: 'Certified Consultations & Therapies',
    priceText: 'From ₹400',
    badgeText: 'Consult',
    bgColor: '#F2FBF4',
    borderColor: '#BBF7D0',
    route: 'AyurvedaWellness',
  },
  {
    id: 'prog-equipment',
    pillText: 'FREE SETUP IN 4H',
    pillBg: '#E0F7F4',
    pillColor: '#0F766E',
    title: 'Medical Equipment',
    subtitle: 'Hospital Beds & Concentrators',
    priceText: 'From ₹80/day',
    badgeText: 'Rent',
    bgColor: '#F0FDFB',
    borderColor: '#99F6E4',
    route: 'EquipmentRental',
  },
];

const HomeScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const isLargeTablet = width >= 900;
  const maxContentWidth = 780;

  // Single Banner width: Available width with 16px margins on each side
  const contentWidth = isTablet ? Math.min(width, maxContentWidth) : width;
  const bannerWidth = contentWidth - 32;

  // Carousel State & Ref for Specialized Care & Programs
  const [activeProgramIndex, setActiveProgramIndex] = useState(0);
  const programCarouselRef = useRef(null);

  // Automatic Rotating Carousel: Rotates every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveProgramIndex((prev) => {
        const next = (prev + 1) % SPECIALIZED_PROGRAMS.length;
        try {
          programCarouselRef.current?.scrollToIndex({ index: next, animated: true });
        } catch (e) {}
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const { t, isIndic } = useTheme();

  const searchPlaceholder = width < 360
    ? t('search_placeholder_short', 'Search doctors, clinics...')
    : width < 420
    ? t('search_placeholder_med', 'Search doctors, clinics, tests...')
    : t('search_placeholder', 'Search doctors, clinics, hospitals, tests...');

  // User & Profile State
  const [userName, setUserName] = useState('Hemanth');
  const [selectedCity, setSelectedCity] = useState('Mysuru');
  const [locationName, setLocationName] = useState('Mysuru');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationToast, setLocationToast] = useState(null);

  // Wallet & Emergency State
  const [walletBalance, setWalletBalance] = useState(744);
  const [carePoints, setCarePoints] = useState(500);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [quickTopUpAmount, setQuickTopUpAmount] = useState('500');
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [activeMembership, setActiveMembership] = useState(null);

  // ============================================================
  // SEARCH STATE & SEARCH ENGINE (MOBILE HOME SEARCH BAR)
  // ============================================================
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState(route?.params?.searchQuery || '');
  const [selectedSearchCategory, setSelectedSearchCategory] = useState('All');
  const [searchDebounceQuery, setSearchDebounceQuery] = useState(route?.params?.searchQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const searchInputRef = useRef(null);

  const handleSearchSubmit = async () => {
    const q = searchQuery.trim() || 'All Services';
    const shouldShow = await shouldShowGuestLeadPopup();
    if (shouldShow) {
      setPendingSearchQuery(q);
      setPendingAction(() => () => {
        Keyboard.dismiss();
      });
      setShowLeadModal(true);
      return;
    }
    Keyboard.dismiss();
  };

  const POPULAR_SEARCHES = [
    'CBC Test',
    'Paracetamol',
    'General Physician',
    'Cardiologist',
    'CT Scan',
    'Home Nursing',
    'Ultrasound',
    'Full Body Checkup',
  ];

  const handleExitSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchDebounceQuery('');
    setSelectedSearchCategory('All');
    setIsSearchActive(false);
  }, []);

  // Android Hardware Back button closes search
  useEffect(() => {
    if (!isSearchActive) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExitSearch();
      return true;
    });
    return () => backHandler.remove();
  }, [isSearchActive, handleExitSearch]);

  // Activate search if routed with autoFocusSearch param
  useEffect(() => {
    if (route?.params?.autoFocusSearch) {
      setIsSearchActive(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [route?.params?.autoFocusSearch]);

  // Debounce input to prevent UI lag while typing
  useEffect(() => {
    if (!isSearchActive) return;
    setIsSearching(true);
    const handler = setTimeout(() => {
      setSearchDebounceQuery(searchQuery);
      setIsSearching(false);
    }, 120);
    return () => clearTimeout(handler);
  }, [searchQuery, isSearchActive]);

  const handleVoiceSearch = () => {
    const voiceSuggestions = ['Doctor', 'CBC Test', 'Paracetamol', 'CT Scan'];
    const chosen = voiceSuggestions[Math.floor(Math.random() * voiceSuggestions.length)];
    setSearchQuery(chosen);
    showToast(`Voice input: "${chosen}"`);
  };

  // Real Search Algorithm matching user query across all existing data sources
  const allSearchResults = useMemo(() => {
    const rawQuery = searchDebounceQuery.trim().toLowerCase();
    if (!rawQuery) return [];

    const cityLower = (selectedCity || 'Mysuru').toLowerCase();
    const isMysore = cityLower === 'mysuru' || cityLower === 'mysore';
    const isBangalore = cityLower === 'bengaluru' || cityLower === 'bangalore';

    const results = [];

    const match = (str) => {
      if (!str || typeof str !== 'string') return false;
      return str.toLowerCase().includes(rawQuery);
    };

    const matchesCity = (locationStr) => {
      if (!locationStr || typeof locationStr !== 'string') return true;
      const l = locationStr.toLowerCase();
      if (l.includes(cityLower)) return true;
      if (isMysore && (l.includes('mysuru') || l.includes('mysore'))) return true;
      if (isBangalore && (l.includes('bengaluru') || l.includes('bangalore'))) return true;
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
              handleExitSearch();
              navigation.navigate('DoctorBooking', { doctor: doc });
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
              handleExitSearch();
              navigation.navigate('VideoBooking', { doctor: doc });
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
              handleExitSearch();
              navigation.navigate('LabTests', { searchTest: test.name });
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
            category: 'Lab Test Packages',
            subtitle: `Health Package • ${pkg.testsCount || 'Comprehensive'}`,
            badge: pkg.price ? `₹${pkg.price}` : '',
            icon: 'fitness',
            iconType: 'ionicons',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            priority: match(pkg.name) ? 1 : 2,
            onPress: () => {
              handleExitSearch();
              navigation.navigate('LabTests', { category: 'packages' });
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
              handleExitSearch();
              navigation.navigate('RadiologyLabs', { searchTest: scan.name, testId: scan.id });
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
              handleExitSearch();
              navigation.navigate('ProductDetails', { product: med });
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
              handleExitSearch();
              navigation.navigate('LabTests');
            },
          });
        }
      });
    }

    // 7. HOSPITALS & SURGERY
    if (Array.isArray(surgeryHospitals)) {
      const isHospWord = ['hospital', 'surgery', 'icu', 'emergency', 'care'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      surgeryHospitals.forEach((hosp) => {
        if (!matchesCity(hosp.city) && !matchesCity(hosp.location)) return;
        if (
          match(hosp.name) ||
          match(hosp.location) ||
          match(hosp.overview) ||
          (isHospWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `hosp-${hosp.id}`,
            name: hosp.name,
            category: 'Hospitals',
            subtitle: `Hospital & Surgery • ${hosp.location || selectedCity}`,
            badge: hosp.rating ? `★ ${hosp.rating}` : 'NABH',
            icon: 'hospital-building',
            iconType: 'material',
            iconBg: '#EFF6FF',
            iconColor: '#1D4ED8',
            priority: match(hosp.name) ? 1 : 2,
            onPress: () => {
              handleExitSearch();
              navigation.navigate('HospitalCare');
            },
          });
        }
      });
    }

    // 8. HOME NURSING
    if (Array.isArray(availableNursingServices)) {
      const isNurseWord = ['nurse', 'nursing', 'attendant', 'elder', 'caregiver', 'injection', 'dressing'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      availableNursingServices.forEach((serv) => {
        const title = serv.title || serv.name;
        if (
          match(title) ||
          match(serv.desc) ||
          match(serv.serviceType) ||
          (isNurseWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `nurse-${serv.id}`,
            name: title,
            category: 'Home Nursing',
            subtitle: `Home Nursing • ${serv.duration || 'Certified Staff'}`,
            badge: serv.price ? `₹${serv.price}` : '',
            icon: 'home-heart',
            iconType: 'material',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            priority: match(title) ? 1 : 2,
            onPress: () => {
              handleExitSearch();
              navigation.navigate('NurseBooking');
            },
          });
        }
      });
    }

    // 9. MEDICAL EQUIPMENT RENTAL
    if (Array.isArray(medicalEquipments)) {
      const isEquipWord = ['equipment', 'rental', 'rent', 'oxygen', 'bed', 'wheelchair', 'bipap'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
      medicalEquipments.forEach((eq) => {
        if (
          match(eq.name) ||
          match(eq.category) ||
          (isEquipWord && rawQuery.length >= 3)
        ) {
          results.push({
            id: `eq-${eq.id}`,
            name: eq.name,
            category: 'Equipment Rental',
            subtitle: `Equipment Rental • ${eq.category || 'Home Delivery'}`,
            badge: eq.rentPerMonth ? `₹${eq.rentPerMonth}/mo` : '',
            icon: 'fitness',
            iconType: 'ionicons',
            iconBg: '#F3E8FF',
            iconColor: '#7E22CE',
            priority: match(eq.name) ? 1 : 2,
            onPress: () => {
              handleExitSearch();
              navigation.navigate('EquipmentRental');
            },
          });
        }
      });
    }

    // 10. AYURVEDA & WELLNESS
    const isAyurWord = ['ayurveda', 'wellness', 'panchakarma', 'herbal', 'nadi', 'dosha'].some((w) => rawQuery.includes(w) || w.includes(rawQuery));
    if (isAyurWord) {
      results.push({
        id: 'ayurveda-wellness',
        name: 'Ayurveda & Panchakarma Therapies',
        category: 'Ayurveda & Wellness',
        subtitle: 'Authentic Herbal Therapies & Nadi Pariksha',
        badge: 'AYUSH',
        icon: 'leaf',
        iconType: 'ionicons',
        iconBg: '#ECFDF5',
        iconColor: '#059669',
        priority: 1,
        onPress: () => {
          handleExitSearch();
          navigation.navigate('AyurvedaWellness');
        },
      });
    }

    // Sort: priority 1 (direct title/name match) first, then alphabetical
    results.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });

    return results;
  }, [searchDebounceQuery, selectedCity, handleExitSearch, navigation]);

  // Compute available matching categories for filter chips (only show categories that actually have matching results)
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

  // Filtered by selected category chip if user tapped a chip
  const displayedSearchResults = useMemo(() => {
    if (selectedSearchCategory === 'All') return allSearchResults.slice(0, 30);
    return allSearchResults
      .filter((r) => r.category === selectedSearchCategory)
      .slice(0, 30);
  }, [allSearchResults, selectedSearchCategory]);

  // Load User Info & Sync on Screen Focus
  useEffect(() => {
    loadUserData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const storedIsLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const storedIsGuest = await AsyncStorage.getItem('@unnathi_is_guest');
      const isGuest = storedIsGuest === 'true' || storedIsLoggedIn !== 'true';

      if (isGuest) {
        setUserName('Guest');
        setActiveMembership(null);
      } else {
        const savedActive = await AsyncStorage.getItem('@unnathi_active_patient');
        let foundName = '';
        if (savedActive) {
          try {
            const parsedActive = JSON.parse(savedActive);
            if (parsedActive && (parsedActive.displayName || parsedActive.name)) {
              const raw = (parsedActive.displayName || parsedActive.name).trim();
              foundName = raw.replace(/\s*\([Ss]elf\)/g, '').split(' ')[0] || raw;
            }
          } catch (e) {
            console.log('Error parsing active patient:', e);
          }
        }

        if (foundName) {
          setUserName(foundName);
        } else {
          const storedName = await AsyncStorage.getItem('userName');
          if (storedName && storedName.trim()) {
            setUserName(storedName.trim());
          }
        }
      }

      const savedCity = await AsyncStorage.getItem('@mediunify_selected_city');
      const savedLoc = await AsyncStorage.getItem('@unnathi_user_location');
      if (savedCity && CITIES.includes(savedCity)) {
        setSelectedCity(savedCity);
        setLocationName(savedCity);
      } else if (savedLoc && savedLoc.trim()) {
        const found = CITIES.find((c) => savedLoc.toLowerCase().includes(c.toLowerCase()));
        if (found) {
          setSelectedCity(found);
          setLocationName(found);
        } else {
          setLocationName(savedLoc.trim());
        }
      }

      // Automatically fetch location from Phone GPS hardware
      detectPhoneGPSLocation(false)
        .then((gpsRes) => {
          if (gpsRes && gpsRes.success && gpsRes.city) {
            const matched = CITIES.find((c) => gpsRes.city.toLowerCase().includes(c.toLowerCase().slice(0, 4))) || gpsRes.city;
            setSelectedCity(matched);
            setLocationName(gpsRes.locality || matched);
          }
        })
        .catch(() => {});

      const savedWallet = await AsyncStorage.getItem('@unnathi_wallet_balance');
      if (savedWallet) {
        setWalletBalance(parseInt(savedWallet, 10) || 744);
      }

      try {
        const memStr = await AsyncStorage.getItem('@mediunify_membership');
        if (memStr) {
          const parsedMem = JSON.parse(memStr);
          if (parsedMem && parsedMem.status === 'active') {
            setActiveMembership(parsedMem);
          } else {
            setActiveMembership(null);
          }
        } else {
          setActiveMembership(null);
        }
      } catch (e) {}
    } catch (e) {
      console.log('Error loading home user data:', e);
    }
  };

  const showToast = (msg) => {
    setLocationToast(msg);
    setTimeout(() => {
      setLocationToast(null);
    }, 2500);
  };

  const handleQuickAddMoney = async (amt) => {
    const num = parseInt(amt, 10);
    if (isNaN(num) || num <= 0) return;
    const newBal = walletBalance + num;
    setWalletBalance(newBal);
    await AsyncStorage.setItem('@unnathi_wallet_balance', newBal.toString());
    try {
      await saveTransaction({
        id:          `TXN-WLT-${Date.now()}`,
        refId:       `WLT-${Date.now()}`,
        service:     'Wallet Top-Up',
        serviceType: 'other',
        title:       'Care Wallet Recharge',
        facility:    'MediUnify Wallet',
        date:        'Today, Just now',
        rawDate:     new Date().toISOString(),
        amount:      num,
        mrp:         num,
        status:      'Paid',
        paymentMode: 'Instant UPI',
        items:       [{ name: 'Wallet Balance Top-Up', qty: 1, price: num }],
      });
    } catch (_txErr) {}
    setWalletModalVisible(false);
    showToast(`₹${num.toLocaleString('en-IN')} added to Care Wallet!`);
  };

  // GPS Location Detection directly from phone GPS
  const handleDetectGPSLocation = async () => {
    try {
      setLoadingLocation(true);
      const gpsRes = await detectPhoneGPSLocation(true);
      if (gpsRes && gpsRes.success && gpsRes.city) {
        const matchedCity = CITIES.find((c) => gpsRes.city.toLowerCase().includes(c.toLowerCase().slice(0, 4))) || gpsRes.city;
        setSelectedCity(matchedCity);
        setLocationName(gpsRes.locality || matchedCity);
        setLocationModalVisible(false);
        showToast(`📍 Phone GPS: ${gpsRes.locality || matchedCity}`);
      } else {
        showAlert('Location Permission', gpsRes?.message || 'Could not detect GPS location. Please check your device location settings.');
      }
      setLoadingLocation(false);
    } catch (e) {
      setLoadingLocation(false);
      showAlert('Location Error', 'Could not detect GPS location. Please select your city from the list.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, isTablet && styles.tabletContainer]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ============================================================
          TOP APP HEADER BAR
          - Left: Logo Mark
          - Center: City / Location selector pill
          - Right: User Profile Avatar
      ============================================================ */}
      <View style={[styles.topHeaderBar, isTablet && { maxWidth: maxContentWidth, width: '100%', alignSelf: 'center' }]}>
        {/* Left: Brand Logo Mark */}
        <Image
          source={require('../../../assets/logo-mark.png')}
          style={styles.brandLogoMark}
          resizeMode="contain"
        />

        {/* Center: Location Selector Pill */}
        <TouchableOpacity
          style={styles.locationPill}
          activeOpacity={0.8}
          onPress={() => setLocationModalVisible(true)}
        >
          <Ionicons name="location-sharp" size={14} color="#007D69" />
          <Text style={styles.locationText} numberOfLines={1}>
            {selectedCity || locationName || 'Mysuru'}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#64748B" />
        </TouchableOpacity>

        {/* Right: User Avatar with Dynamic Initial & Membership Ring */}
        <TouchableOpacity
          style={styles.avatarButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile')}
        >
          <View
            style={[
              styles.avatarCircle,
              activeMembership && activeMembership.status === 'active'
                ? {
                    borderColor: activeMembership.tierId?.includes('gold')
                      ? '#F59E0B'
                      : activeMembership.tierId?.includes('plat')
                      ? '#2563EB'
                      : activeMembership.tierId?.includes('silver')
                      ? '#94A3B8'
                      : '#007D69',
                    borderWidth: 2.5,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                  }
                : {
                    borderColor: '#007D69',
                    borderWidth: 0,
                    backgroundColor: '#007D69',
                    borderRadius: 20,
                  },
            ]}
          >
            <View
              style={[
                styles.avatarInnerCircle,
                activeMembership && activeMembership.status === 'active'
                  ? {
                      backgroundColor: activeMembership.tierId?.includes('gold')
                        ? '#FEF3C7'
                        : activeMembership.tierId?.includes('plat')
                        ? '#EFF6FF'
                        : activeMembership.tierId?.includes('silver')
                        ? '#F1F5F9'
                        : '#CCFBF1',
                      borderRadius: 15,
                    }
                  : {
                      backgroundColor: '#007D69',
                      borderRadius: 15,
                    },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitialText,
                  activeMembership && activeMembership.status === 'active'
                    ? {
                        color: activeMembership.tierId?.includes('gold')
                          ? '#D97706'
                          : activeMembership.tierId?.includes('plat')
                          ? '#1D4ED8'
                          : activeMembership.tierId?.includes('silver')
                          ? '#475569'
                          : '#007D69',
                      }
                    : { color: '#FFFFFF' },
                ]}
              >
                {userName?.trim() ? userName.trim().charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>

            {activeMembership && activeMembership.status === 'active' && (
              <View
                style={[
                  styles.homeMembershipCrownBadge,
                  {
                    backgroundColor: activeMembership.tierId?.includes('gold')
                      ? '#D97706'
                      : activeMembership.tierId?.includes('plat')
                      ? '#1D4ED8'
                      : activeMembership.tierId?.includes('silver')
                      ? '#64748B'
                      : '#007D69',
                    borderRadius: 7,
                  },
                ]}
              >
                <Ionicons name="star" size={7.5} color="#FFFFFF" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* TOAST NOTIFICATION */}
      {locationToast && (
        <View style={styles.toastCard}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.toastText}>{locationToast}</Text>
        </View>
      )}

      <ScrollView
        style={[styles.scrollView, isTablet && styles.tabletScrollView]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
      >
        {/* ============================================================
            1. ASK MEDIUNIFY AI BANNER (TOP HERO) - Shown when not searching
        ============================================================ */}
        {!isSearchActive && (
          <View style={styles.aiBannerCard}>
            <View style={styles.aiBannerLeft}>
              <View style={styles.aiPillBadge}>
                <Ionicons name="sparkles" size={11} color="#007D69" />
                <Text style={styles.aiPillText}>AI ASSISTANT</Text>
              </View>
              <Text style={styles.aiBannerTitle}>MediUnify AI</Text>
              <Text style={styles.aiBannerSubtitle}>
                Ask about symptoms, medicines & reports.
              </Text>
              <TouchableOpacity
                style={styles.aiChatButton}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Chatbot')}
              >
                <Text style={styles.aiChatButtonText}>Chat with AI →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aiBannerRight}>
              <Image
                source={require('../../../assets/ai-bot-avatar.png')}
                style={styles.aiBannerAvatar}
                resizeMode="contain"
              />
              <View style={styles.aiSpeechBubble}>
                <Text style={styles.aiSpeechText}>Hi!</Text>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================
            2. FULLY FUNCTIONAL HEALTHCARE SEARCH BAR
        ============================================================ */}
        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchBarBox, isSearchActive && styles.searchBarBoxActive]}>
            {isSearchActive ? (
              <TouchableOpacity
                onPress={handleExitSearch}
                style={styles.searchBackIconBtn}
                activeOpacity={0.7}
                accessibilityLabel="Back to Home"
              >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSearchSubmit}
                style={{ padding: 4 }}
                activeOpacity={0.7}
                accessibilityLabel="Submit Search"
              >
                <Ionicons name="search-outline" size={19} color="#007D69" />
              </TouchableOpacity>
            )}

            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, isIndic && { fontSize: 12.5 }]}
              placeholder={searchPlaceholder}
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (selectedSearchCategory !== 'All') {
                  setSelectedSearchCategory('All');
                }
              }}
              onFocus={() => setIsSearchActive(true)}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="never"
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                style={styles.searchClearBtn}
                activeOpacity={0.7}
                accessibilityLabel="Clear Search"
              >
                <Ionicons name="close-circle" size={19} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSearchSubmit}
                style={styles.mobileSearchBtn}
                activeOpacity={0.8}
                accessibilityLabel="Search"
              >
                <Text style={styles.mobileSearchBtnText}>Search</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isSearchActive ? (
          /* ============================================================
              CLEAN SEARCH RESULTS VIEW
          ============================================================ */
          <View style={styles.searchResultsContainer}>
            {isSearching && (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color="#007D69" />
                <Text style={styles.searchLoadingText}>Searching services in {selectedCity}...</Text>
              </View>
            )}

            {/* 1. SMART EMPTY SEARCH STATE */}
            {!searchQuery.trim() && (
              <View style={styles.emptySearchWrapper}>
                <View style={styles.emptySearchPromptCard}>
                  <View style={styles.emptySearchIconCircle}>
                    <Ionicons name="search-outline" size={26} color="#007D69" />
                  </View>
                  <Text style={styles.emptySearchPromptTitle}>
                    Search for doctors, tests, medicines or services
                  </Text>
                  <Text style={styles.emptySearchPromptSubtitle}>
                    Showing providers and items available in {selectedCity}
                  </Text>
                </View>

                {/* POPULAR SEARCHES */}
                <View style={styles.popularSearchesBlock}>
                  <Text style={styles.popularSearchesHeading}>POPULAR SEARCHES</Text>
                  <View style={styles.popularChipsWrap}>
                    {POPULAR_SEARCHES.map((chip, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.popularChip}
                        activeOpacity={0.75}
                        onPress={async () => {
                          setSearchQuery(chip);
                          const shouldShow = await shouldShowGuestLeadPopup();
                          if (shouldShow) {
                            setPendingSearchQuery(chip);
                            setPendingAction(() => () => {
                              searchInputRef.current?.focus();
                            });
                            setShowLeadModal(true);
                            return;
                          }
                          searchInputRef.current?.focus();
                        }}
                      >
                        <Ionicons name="trending-up-outline" size={13} color="#007D69" />
                        <Text style={styles.popularChipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* 2. NO RESULTS FOUND */}
            {searchQuery.trim() && !isSearching && allSearchResults.length === 0 && (
              <View style={styles.noResultsCard}>
                <View style={styles.noResultsIconCircle}>
                  <Ionicons name="search-outline" size={30} color="#94A3B8" />
                </View>
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsSubtitle}>
                  Try searching for a doctor, test, medicine or service.
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchPromptBtn}
                  onPress={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearSearchPromptText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 3. MATCHING SEARCH RESULTS */}
            {searchQuery.trim() && allSearchResults.length > 0 && (
              <View style={styles.resultsListBlock}>
                {/* Category Filter Chips (Only show categories that actually have matching results) */}
                {matchingCategories.length > 2 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryChipsScroll}
                  >
                    {matchingCategories.map((catItem) => {
                      const isSelected = selectedSearchCategory === catItem.name;
                      return (
                        <TouchableOpacity
                          key={catItem.name}
                          style={[
                            styles.categoryFilterChip,
                            isSelected && styles.categoryFilterChipActive,
                          ]}
                          activeOpacity={0.75}
                          onPress={() => setSelectedSearchCategory(catItem.name)}
                        >
                          <Text
                            style={[
                              styles.categoryFilterChipText,
                              isSelected && styles.categoryFilterChipTextActive,
                            ]}
                          >
                            {catItem.name} ({catItem.count})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Result Items */}
                <View style={styles.resultCardsWrapper}>
                  {displayedSearchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.searchResultRow}
                      activeOpacity={0.7}
                      onPress={async () => {
                        const shouldShow = await shouldShowGuestLeadPopup();
                        if (shouldShow) {
                          setPendingSearchQuery(item.name || searchQuery || 'Service');
                          setPendingAction(() => item.onPress);
                          setShowLeadModal(true);
                          return;
                        }
                        item.onPress();
                      }}
                    >
                      <View style={[styles.resultIconBox, { backgroundColor: item.iconBg }]}>
                        {item.iconType === 'material' ? (
                          <MaterialCommunityIcons name={item.icon} size={20} color={item.iconColor} />
                        ) : (
                          <Ionicons name={item.icon} size={20} color={item.iconColor} />
                        )}
                      </View>

                      <View style={styles.resultInfoCol}>
                        <Text style={styles.resultItemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.resultItemSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>

                      <View style={styles.resultRightCol}>
                        {item.badge ? (
                          <View style={styles.resultPriceBadge}>
                            <Text style={styles.resultPriceBadgeText}>{item.badge}</Text>
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 120 }} />
          </View>
        ) : (
          /* ============================================================
              REGULAR HOME CONTENT (CARE HUB, SERVICES, PROGRAMS)
          ============================================================ */
          <>

        {/* ============================================================
            3. CARE HUB
            - Header: "Care Hub \n Instant & Secure"
            - Right badge: "Invite Friends + Get Rewards"
            - 4 Circular Action Buttons:
                1. Video Call Consultation (Replaced Instant Care)
                2. Lab Tests
                3. Care Wallet
                4. Health Records
            - Highlight Cards (Smart Health Checkups & Partner Benefits)
        ============================================================ */}
        <View style={styles.hubSection}>
          <View style={styles.hubHeaderRow}>
            <View>
              <Text style={styles.hubTitle}>{t('care_hub', 'Care Hub')}</Text>
              <Text style={styles.hubSubtitle}>{t('instant_secure', 'Instant & Secure')}</Text>
            </View>

            {/* Orange / Peach Pill Reward Badge */}
            <TouchableOpacity
              style={styles.rewardsPillBadge}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('ReferEarn')}
            >
              <View style={styles.rewardIconBadge}>
                <Ionicons name="gift" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.rewardsPillText}>{t('invite_friends', 'Invite Friends + Get Rewards')}</Text>
            </TouchableOpacity>
          </View>

          {/* 4 Circular Action Buttons in a Balanced Row */}
          <View style={styles.circularActionsRow}>
            {/* 1. Video Call Consultation */}
            <TouchableOpacity
              style={styles.circularActionItem}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('VideoConsultation')}
            >
              <View style={styles.actionCircle}>
                <Ionicons name="videocam-outline" size={26} color="#007D69" />
              </View>
              <Text style={[styles.actionLabel, isIndic && { fontSize: 10, lineHeight: 14 }]}>
                {t('service_video_consult', 'Video Call Consultation')}
              </Text>
            </TouchableOpacity>

            {/* 2. Lab Tests */}
            <TouchableOpacity
              style={styles.circularActionItem}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('LabTests')}
            >
              <View style={styles.actionCircle}>
                <Ionicons name="flask-outline" size={25} color="#007D69" />
              </View>
              <Text style={[styles.actionLabel, isIndic && { fontSize: 10, lineHeight: 14 }]}>
                {t('card_lab_tests', 'Lab Tests')}
              </Text>
            </TouchableOpacity>

            {/* 3. Care Wallet */}
            <TouchableOpacity
              style={styles.circularActionItem}
              activeOpacity={0.82}
              onPress={() => setWalletModalVisible(true)}
            >
              <View style={styles.actionCircle}>
                <MaterialCommunityIcons name="wallet-outline" size={26} color="#007D69" />
              </View>
              <Text style={[styles.actionLabel, isIndic && { fontSize: 10, lineHeight: 14 }]}>
                {t('care_wallet', 'Care Wallet')}
              </Text>
            </TouchableOpacity>

            {/* 4. Health Records */}
            <TouchableOpacity
              style={styles.circularActionItem}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('HealthRecords')}
            >
              <View style={styles.actionCircle}>
                <Ionicons name="documents-outline" size={25} color="#007D69" />
              </View>
              <Text style={[styles.actionLabel, isIndic && { fontSize: 10, lineHeight: 14 }]}>
                {t('health_records', 'Health Records')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Highlight Cards (Directly below 4 circular items in Care Hub) */}
          <View style={styles.highlightStrip}>
            {/* Card 1: Smart Checkups */}
            <TouchableOpacity
              style={styles.highlightCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LabTests')}
            >
              <View style={[styles.highlightIconSquare, { backgroundColor: '#E0F7F4' }]}>
                <Ionicons name="shield-checkmark" size={17} color="#007D69" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.highlightTitle} numberOfLines={1}>{t('smart_checkups', 'Smart Health Checkups')}</Text>
                <Text style={styles.highlightSub} numberOfLines={1}>{t('save_up_to_50', 'Save up to 50% on tests')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#007D69" />
            </TouchableOpacity>

            {/* Card 2: Membership / Partner Benefits */}
            <TouchableOpacity
              style={styles.highlightCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Membership')}
            >
              <View style={[styles.highlightIconSquare, { backgroundColor: activeMembership ? '#FEF3C7' : '#EEF2FF' }]}>
                <Ionicons
                  name={activeMembership ? 'ribbon' : 'card'}
                  size={17}
                  color={activeMembership ? '#D97706' : '#1E3A8A'}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.highlightTitle} numberOfLines={1}>{t('membership', 'Membership')}</Text>
                <Text style={styles.highlightSub} numberOfLines={1}>
                  {activeMembership
                    ? `${activeMembership.tierName} ${t('member_view_benefits', 'Member • View Benefits →')}`
                    : t('explore_memberships', 'Explore Memberships →')}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={15}
                color={activeMembership ? '#D97706' : '#1E3A8A'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================
            4. HEALTHCARE & SERVICES
            - In-Clinic Visit
            - Home Nursing & Caregiver
            - Scans & X-Ray
            - Order Medicine
        ============================================================ */}
        <View style={styles.billsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.billsSectionTitle}>{t('healthcare_services', 'Healthcare & Services')}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AllServices', { city: selectedCity, location: locationName })}
            >
              <Text style={styles.viewAllLink}>{t('view_all_arrow', 'View All →')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.billsGrid, isTablet && styles.billsGridTablet]}>
            {/* Tile 1: In-Clinic Visit */}
            <TouchableOpacity
              style={[styles.billTile, isTablet && styles.billTileTablet]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('DoctorList')}
            >
              <View style={styles.billTileIconBox}>
                <MaterialCommunityIcons name="hospital-building" size={26} color="#007D69" />
              </View>
              <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                {t('service_in_clinic', 'In-Clinic Visit')}
              </Text>
            </TouchableOpacity>

            {/* Tile 2: Home Nursing & Caregiver */}
            <TouchableOpacity
              style={[styles.billTile, isTablet && styles.billTileTablet]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('NurseBooking')}
            >
              <View style={styles.billTileIconBox}>
                <MaterialCommunityIcons name="home-heart" size={26} color="#007D69" />
              </View>
              <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                {t('card_home_nurse', 'Home Nursing & Caregiver')}
              </Text>
            </TouchableOpacity>

            {/* Tile 3: Scan & X-Ray */}
            <TouchableOpacity
              style={[styles.billTile, isTablet && styles.billTileTablet]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('RadiologyLabs', { city: selectedCity })}
            >
              <View style={styles.billTileIconBox}>
                <Ionicons name="scan-outline" size={25} color="#007D69" />
              </View>
              <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                {t('card_scans_xray', 'Scan & X-Ray')}
              </Text>
            </TouchableOpacity>

            {/* Tile 4: Order Medicine */}
            <TouchableOpacity
              style={[styles.billTile, isTablet && styles.billTileTablet]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('Pharmacy')}
            >
              <View style={styles.billTileIconBox}>
                <MaterialCommunityIcons name="pill" size={26} color="#007D69" />
              </View>
              <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                {t('card_order_medicines', 'Order Medicine')}
              </Text>
            </TouchableOpacity>

            {/* Tablet-Only Services: 4 More Services */}
            {isTablet && (
              <>
                {/* Tile 5: Hospital & Surgery */}
                <TouchableOpacity
                  style={[styles.billTile, styles.billTileTablet]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('HospitalCare')}
                >
                  <View style={styles.billTileIconBox}>
                    <MaterialCommunityIcons name="domain" size={26} color="#007D69" />
                  </View>
                  <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                    {t('card_surgeries', 'Hospital & Surgery')}
                  </Text>
                </TouchableOpacity>

                {/* Tile 6: Equipment Rental */}
                <TouchableOpacity
                  style={[styles.billTile, styles.billTileTablet]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('EquipmentRental')}
                >
                  <View style={styles.billTileIconBox}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={26} color="#007D69" />
                  </View>
                  <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                    {t('card_equipment_rental', 'Equipment Rental')}
                  </Text>
                </TouchableOpacity>

                {/* Tile 7: Ayurveda & Wellness */}
                <TouchableOpacity
                  style={[styles.billTile, styles.billTileTablet]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('AyurvedaWellness')}
                >
                  <View style={styles.billTileIconBox}>
                    <Ionicons name="leaf-outline" size={25} color="#007D69" />
                  </View>
                  <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                    {t('card_ayurveda', 'Ayurveda & Wellness')}
                  </Text>
                </TouchableOpacity>

                {/* Tile 8: Health Insurance */}
                <TouchableOpacity
                  style={[styles.billTile, styles.billTileTablet]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('HealthInsurance')}
                >
                  <View style={styles.billTileIconBox}>
                    <Ionicons name="shield-checkmark-outline" size={25} color="#007D69" />
                  </View>
                  <Text style={[styles.billTileText, isIndic && { fontSize: 11, lineHeight: 15 }]}>
                    {t('card_health_insurance', 'Health Insurance')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ============================================================
            5. SPECIALIZED CARE & PROGRAMS (SINGLE BANNER ROTATING CAROUSEL)
        ============================================================ */}
        <View style={styles.programsSection}>
          <View style={styles.programsHeaderRow}>
            <Text style={styles.programsTitle}>{t('specialized_care_programs', 'Featured Care')}</Text>
          </View>

          <FlatList
            ref={programCarouselRef}
            data={SPECIALIZED_PROGRAMS}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={bannerWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.singleBannerCarouselContainer}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
              if (idx >= 0 && idx < SPECIALIZED_PROGRAMS.length) {
                setActiveProgramIndex(idx);
              }
            }}
            getItemLayout={(data, index) => ({
              length: bannerWidth,
              offset: bannerWidth * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={{ width: bannerWidth, paddingHorizontal: 0 }}>
                <TouchableOpacity
                  style={[
                    styles.singleProgramCard,
                    { backgroundColor: item.bgColor, borderColor: item.borderColor },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate(item.route)}
                >
                  <View style={styles.programCardHeader}>
                    <View style={[styles.programPillBadge, { backgroundColor: item.pillBg }]}>
                      <Text style={[styles.programPillText, { color: item.pillColor }]}>
                        {t(item.pillText, item.pillText)}
                      </Text>
                    </View>
                    <Text style={styles.programPrice}>{t(item.priceText, item.priceText)}</Text>
                  </View>

                  <Text style={[styles.programCardTitle, isIndic && { lineHeight: 22 }]} numberOfLines={1}>
                    {t(item.title, item.title)}
                  </Text>
                  <Text style={[styles.programCardSubtitle, isIndic && { lineHeight: 18 }]} numberOfLines={2}>
                    {t(item.subtitle, item.subtitle)}
                  </Text>

                  <View style={styles.programCardFooter}>
                    <Text style={[styles.programActionText, isIndic && { lineHeight: 18 }]}>
                      {t(item.badgeText, item.badgeText)} →
                    </Text>
                    <View style={styles.programCircleArrow}>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Small pagination dots */}
          <View style={styles.carouselDotsRow}>
            {SPECIALIZED_PROGRAMS.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  setActiveProgramIndex(i);
                  try {
                    programCarouselRef.current?.scrollToIndex({ index: i, animated: true });
                  } catch (e) {}
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.carouselDot,
                    activeProgramIndex === i && styles.carouselDotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </>
        )}

        {/* Extra Bottom Spacing for Bottom Navigation Bar */}
        <View style={{ height: 95 }} />
      </ScrollView>

      {/* ============================================================
          EMERGENCY & 24x7 HELPLINE MODAL
      ============================================================ */}
      <Modal
        visible={emergencyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmergencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('emergency_support', 'Emergency & 24x7 Support')}</Text>
                <Text style={styles.modalSubtitle}>{t('emergency_sub', 'Immediate medical transport & assistance')}</Text>
              </View>
              <TouchableOpacity onPress={() => setEmergencyModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* 1. 108 AMBULANCE SOS */}
            <TouchableOpacity
              style={styles.emergencyCard}
              onPress={() => {
                setEmergencyModalVisible(false);
                Linking.openURL('tel:108');
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.emergencyIconSquare, { backgroundColor: '#FF7F50' }]}>
                <Ionicons name="medical" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.emergencyCardTitle}>{t('call_108', 'Call 108 Ambulance SOS')}</Text>
                <Text style={styles.emergencyCardSub}>{t('govt_emergency', 'Government Emergency Medical Services (Free)')}</Text>
              </View>
              <View style={[styles.callPill, { backgroundColor: '#FFF2ED' }]}>
                <Ionicons name="call" size={13} color="#FF7F50" />
                <Text style={[styles.callPillText, { color: '#FF7F50' }]}>108</Text>
              </View>
            </TouchableOpacity>

            {/* 2. 24x7 DOCTOR HELPLINE */}
            <TouchableOpacity
              style={styles.emergencyCard}
              onPress={() => {
                setEmergencyModalVisible(false);
                Linking.openURL('tel:18001089999');
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.emergencyIconSquare, { backgroundColor: '#007D69' }]}>
                <Ionicons name="headset" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.emergencyCardTitle}>{t('support_helpline', '24x7 Doctor Helpline')}</Text>
                <Text style={styles.emergencyCardSub}>{t('doctor_helpline_sub', 'Speak with an on-duty general physician')}</Text>
              </View>
              <View style={[styles.callPill, { backgroundColor: '#E0F7F4' }]}>
                <Ionicons name="call" size={13} color="#007D69" />
                <Text style={[styles.callPillText, { color: '#007D69' }]}>{t('call_btn', 'Call')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          CITY SELECTION MODAL
      ============================================================ */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.cityModalOverlay}
          activeOpacity={1}
          onPress={() => setLocationModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.cityModalCard}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.cityModalHeader}>
              <Text style={styles.cityModalTitle}>Select Your City</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cityModalSub}>
              Verified clinics, labs & home delivery available across Karnataka
            </Text>

            <View style={styles.cityList}>
              {CITIES.map((city) => {
                const isSelected = selectedCity === city || locationName === city;
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityItem, isSelected && styles.cityItemActive]}
                    onPress={async () => {
                      setSelectedCity(city);
                      setLocationName(city);
                      await AsyncStorage.setItem('@mediunify_selected_city', city);
                      await AsyncStorage.setItem('@unnathi_user_location', city);
                      setLocationModalVisible(false);
                      showToast(`City changed to ${city}`);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color={isSelected ? '#007D69' : '#64748B'}
                    />
                    <Text style={[styles.cityItemText, isSelected && styles.cityItemTextActive]}>
                      {city}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#007D69"
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* GPS QUICK DETECT */}
            <TouchableOpacity
              style={styles.cityGpsOption}
              onPress={handleDetectGPSLocation}
              disabled={loadingLocation}
              activeOpacity={0.8}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#007D69" />
              ) : (
                <>
                  <Ionicons name="locate" size={16} color="#007D69" />
                  <Text style={styles.cityGpsOptionText}>Use Current GPS Location</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          CARE WALLET TOP-UP MODAL
      ============================================================ */}
      <Modal
        visible={walletModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MediUnify Care Wallet</Text>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.walletCard}>
              <Text style={styles.walletCardLabel}>Available Balance</Text>
              <Text style={styles.walletCardVal}>₹{walletBalance.toLocaleString('en-IN')}</Text>
              <Text style={styles.walletCardPts}>🎁 {carePoints} Health Care Points</Text>
            </View>

            <Text style={styles.walletModalSectionLabel}>Quick Top-Up Amount</Text>
            <View style={styles.topUpChipsRow}>
              {['200', '500', '1000', '2000'].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.topUpChip, quickTopUpAmount === amt && styles.topUpChipActive]}
                  onPress={() => setQuickTopUpAmount(amt)}
                >
                  <Text style={[styles.topUpChipText, quickTopUpAmount === amt && styles.topUpChipTextActive]}>
                    + ₹{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.addMoneyBtn}
              onPress={() => handleQuickAddMoney(quickTopUpAmount)}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.addMoneyBtnText}>Add ₹{quickTopUpAmount} to Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            Keyboard.dismiss();
          }
        }}
        onClose={() => {
          setShowLeadModal(false);
          if (pendingAction) {
            const act = pendingAction;
            setPendingAction(null);
            act();
          } else {
            Keyboard.dismiss();
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabletContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  tabletScrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  scrollContentTablet: {
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    paddingBottom: 76,
  },

  // ============================================================
  // TOP APP HEADER BAR
  // ============================================================
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  brandLogoMark: {
    width: 44,
    height: 38,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 120,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarInnerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitialText: {
    fontSize: 14.5,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  homeMembershipCrownBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
  },

  // ============================================================
  // 1. ASK MEDIUNIFY AI BANNER (TOP HERO)
  // ============================================================
  aiBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBF8F5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D0F2E9',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  aiBannerLeft: {
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
  },
  aiPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0F2E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 6,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#007D69',
    letterSpacing: 0.3,
  },
  aiBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  aiBannerSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 17,
  },
  aiChatButton: {
    backgroundColor: '#007D69',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'flex-start',
    marginTop: 12,
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  aiChatButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  aiBannerRight: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 90,
    height: 90,
  },
  aiBannerAvatar: {
    width: 82,
    height: 82,
  },
  aiSpeechBubble: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#007D69',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiSpeechText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  aiMiniDotsRow: {
    position: 'absolute',
    bottom: -2,
    right: 2,
    flexDirection: 'row',
    gap: 3,
  },
  aiMiniDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  aiMiniDotActive: {
    backgroundColor: '#007D69',
    opacity: 1,
    width: 7,
  },

  // ============================================================
  // 2. SEARCH BAR & RESULTS
  // ============================================================
  searchBarWrapper: {
    paddingHorizontal: 16,
    marginTop: 12,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
    width: '100%',
    overflow: 'hidden',
  },
  searchBarBoxActive: {
    borderColor: '#007D69',
    shadowColor: '#007D69',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  searchBackIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  searchClearBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  mobileSearchBtn: {
    backgroundColor: '#007D69',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  mobileSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchPlaceholder: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Search Results Container
  searchResultsContainer: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchLoadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Smart Empty State
  emptySearchWrapper: {
    marginTop: 8,
  },
  emptySearchPromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emptySearchIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E6F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptySearchPromptTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySearchPromptSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  popularSearchesBlock: {
    marginTop: 22,
  },
  popularSearchesHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  popularChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  popularChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // No Results Card
  noResultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  noResultsIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  noResultsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  noResultsSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
    maxWidth: 240,
  },
  clearSearchPromptBtn: {
    marginTop: 14,
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  clearSearchPromptText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#007D69',
  },

  // Results List
  resultsListBlock: {
    marginTop: 6,
  },
  categoryChipsScroll: {
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  categoryFilterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryFilterChipActive: {
    backgroundColor: '#007D69',
    borderColor: '#007D69',
  },
  categoryFilterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  categoryFilterChipTextActive: {
    color: '#FFFFFF',
  },
  resultCardsWrapper: {
    gap: 8,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  resultIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfoCol: {
    flex: 1,
  },
  resultItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  resultItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  resultRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resultPriceBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  resultPriceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007D69',
  },

  // ============================================================
  // 3. CARE HUB
  // ============================================================
  hubSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hubTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  hubSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  rewardsPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0E6',
    borderWidth: 1,
    borderColor: '#FFDCC7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    gap: 5,
  },
  rewardIconBadge: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },

  // 4 CIRCULAR ACTIONS
  circularActionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  circularActionItem: {
    alignItems: 'center',
    width: '23%',
  },
  actionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E8F6F6',
    borderWidth: 1.2,
    borderColor: '#C0ECE9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
  },

  // HIGHLIGHT STRIP (SMART CHECKUPS & PARTNER BENEFITS)
  highlightStrip: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  highlightCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  highlightIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  highlightSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },

  // ============================================================
  // 4. HEALTHCARE & SERVICES
  // ============================================================
  billsSection: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billsSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllLink: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#007D69',
  },
  billsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billsGridTablet: {
    flexWrap: 'wrap',
    rowGap: 12,
  },
  billTile: {
    width: '23%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billTileTablet: {
    width: '23.5%',
    paddingVertical: 18,
  },
  billTileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  billTileText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },

  // ============================================================
  // 5. SPECIALIZED CARE & PROGRAMS (SINGLE BANNER CAROUSEL)
  // ============================================================
  programsSection: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  programsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  programsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  singleBannerCarouselContainer: {
    paddingHorizontal: 0,
  },
  singleProgramCard: {
    width: '100%',
    minHeight: 140,
    height: 140,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  programCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  programPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  programPrice: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  programCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  programCardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  programCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  programActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#007D69',
  },
  programCircleArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007D69',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CAROUSEL PAGINATION DOTS
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  carouselDotActive: {
    backgroundColor: '#007D69',
    width: 18,
    borderRadius: 4,
  },

  // ============================================================
  // TOAST NOTIFICATION
  // ============================================================
  toastCard: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ============================================================
  // MODALS
  // ============================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  emergencyIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  emergencyCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  callPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // CITY MODAL
  cityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cityModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  cityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cityModalSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  cityList: {
    gap: 8,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  cityItemActive: {
    backgroundColor: '#E0F7F4',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  cityItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  cityItemTextActive: {
    color: '#007D69',
    fontWeight: '800',
  },
  cityGpsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 10,
    marginTop: 14,
    gap: 6,
  },
  cityGpsOptionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#007D69',
  },

  // WALLET MODAL
  walletCard: {
    backgroundColor: '#007D69',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  walletCardLabel: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  walletCardVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  walletCardPts: {
    fontSize: 12,
    color: '#E6F8F4',
    marginTop: 6,
    fontWeight: '600',
  },
  walletModalSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  topUpChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  topUpChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  topUpChipActive: {
    backgroundColor: '#E0F7F4',
    borderColor: '#007D69',
  },
  topUpChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  topUpChipTextActive: {
    color: '#007D69',
  },
  addMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007D69',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  addMoneyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default HomeScreen;
