import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../theme/colors';
import {
  LAB_CATEGORIES,
  LAB_TESTS_MASTER,
  LAB_PACKAGES,
  DIAGNOSTIC_CENTRES,
  ALL_CITY_DIAGNOSTIC_CENTRES,
  getCentresByCity,
  normalizeLabCity,
  isTestAvailableInCity,
  isPackageAvailableInCity,
  getGoogleMapsDirectionsUrl,
  getAvailableDates,
  TIME_SLOTS,
  INITIAL_SAVED_ADDRESSES,
  INITIAL_LAB_BOOKINGS,
  INITIAL_LAB_REPORTS,
} from '../../../data/labTestData';
import { getSlotStatus, validateAndBookSlot, subscribeToSlotChanges } from '../../../services/slotBookingService';
import WebFooter from '../../../components/web/WebFooter';
import Pagination from '../../../components/common/Pagination';
import { showAlert } from '../../../utils/alert';
import {
  NOVUS_POPULAR_PACKAGES,
  NOVUS_CURATED_PACKAGES,
  NOVUS_PACKAGE_CATEGORIES,
} from '../../../data/novusPackagesData';
import { useCart } from '../../../context/CartContext';
import { isPackageItem } from '../../../utils/labPackageMatcher.js';
import { useAuthGuard } from '../../../context/AuthGuardContext';
import LabTestsScreenMobile from './LabTestsScreen.js';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';

const WEB_LAB_CATEGORIES = [
  { id: 'all', name: 'All Tests', icon: 'grid-outline' },
  { id: 'popular', name: 'Popular Tests', icon: 'flame-outline' },
  { id: 'full-body', name: 'Full Body', icon: 'body-outline' },
  { id: 'diabetes', name: 'Diabetes', icon: 'water-outline' },
  { id: 'heart', name: 'Heart Health', icon: 'pulse-outline' },
  { id: 'executive', name: 'Executive Health', icon: 'briefcase-outline' },
  { id: 'fever', name: 'Fever & Infection', icon: 'thermometer-outline' },
  { id: 'women', name: "Women's Health", icon: 'woman-outline' },
  { id: 'routine', name: 'Routine Tests', icon: 'flask-outline' },
  { id: 'thyroid', name: 'Thyroid', icon: 'fitness-outline' },
];

export const LAB_HEALTH_CONDITIONS = [
  {
    id: 'diabetes-care',
    titlePrimary: 'DIABETES',
    titleSecondary: 'CARE',
    badge: 'SUGAR & HbA1c',
    tagline: 'Fasting, PP & HbA1c',
    bg: '#00BB95',
    accentColor: '#00BB95',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
    categoryId: 'diabetes',
  },
  {
    id: 'cardiac-care',
    titlePrimary: 'CARDIAC',
    titleSecondary: 'HEALTH',
    badge: 'LIPID PROFILE',
    tagline: 'Cholesterol & ECG',
    bg: '#1E3A8A',
    accentColor: '#1E3A8A',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
    categoryId: 'heart',
  },
  {
    id: 'thyroid-care',
    titlePrimary: 'THYROID',
    titleSecondary: 'CARE',
    badge: 'HORMONES',
    tagline: 'T3, T4 & TSH Vital',
    bg: '#7BC96F',
    accentColor: '#7BC96F',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80',
    categoryId: 'thyroid',
  },
  {
    id: 'full-body-care',
    titlePrimary: 'FULL BODY',
    titleSecondary: 'CHECKUP',
    badge: '60+ TESTS',
    tagline: 'Complete Wellness',
    bg: '#00C2CB',
    accentColor: '#00C2CB',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    categoryId: 'full-body',
  },
  {
    id: 'fever-care',
    titlePrimary: 'FEVER &',
    titleSecondary: 'INFECTION',
    badge: 'FAST RESULT',
    tagline: 'CBC, Dengue & Viral',
    bg: '#FF7F50',
    accentColor: '#FF7F50',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    categoryId: 'fever',
  },
  {
    id: 'women-wellness',
    titlePrimary: "WOMEN'S",
    titleSecondary: 'WELLNESS',
    badge: 'CARE PANEL',
    tagline: 'PCOD, Iron & Calcium',
    bg: '#D946EF',
    accentColor: '#D946EF',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80',
    categoryId: 'women',
  },
  {
    id: 'liver-care',
    titlePrimary: 'LIVER',
    titleSecondary: 'FUNCTION',
    badge: 'LFT PROFILE',
    tagline: 'Bilirubin, SGOT & SGPT',
    bg: '#00BB95',
    accentColor: '#00BB95',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&auto=format&fit=crop&q=80',
    categoryId: 'routine',
  },
  {
    id: 'kidney-care',
    titlePrimary: 'KIDNEY',
    titleSecondary: 'CARE',
    badge: 'KFT / RFT',
    tagline: 'Creatinine & Urea',
    bg: '#3B82F6',
    accentColor: '#3B82F6',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
    categoryId: 'routine',
  },
  {
    id: 'vitamins-bones',
    titlePrimary: 'VITAMINS &',
    titleSecondary: 'BONES',
    badge: 'DEFICIENCY',
    tagline: 'Vitamin D, B12 & Iron',
    bg: '#F59E0B',
    accentColor: '#F59E0B',
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=600&auto=format&fit=crop&q=80',
    categoryId: 'popular',
  },
  {
    id: 'executive-health',
    titlePrimary: 'EXECUTIVE',
    titleSecondary: 'HEALTH',
    badge: 'MASTER CHECK',
    tagline: 'Comprehensive Panel',
    bg: '#6366F1',
    accentColor: '#6366F1',
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=600&auto=format&fit=crop&q=80',
    categoryId: 'executive',
  },
];

const POPULAR_TESTS_MAP = {
  'all': ['test-cbc', 'test-fbs', 'test-thyroid', 'test-lipid', 'POP-FB-01'],
  'full-body': ['POP-FB-01', 'POP-FB-02', 'POP-FB-03'],
  'diabetes': ['test-fbs', 'test-hba1c', 'POP-DIA-01', 'POP-DIA-02'],
  'heart': ['test-lipid', 'POP-HRT-01', 'POP-HRT-02'],
  'executive': ['POP-EXE-01', 'POP-EXE-02', 'POP-EXE-03'],
  'fever': ['test-cbc', 'test-crp', 'test-throat-swab'],
  'women': ['test-ca125', 'test-thyroid', 'test-vitamind', 'test-ferritin'],
  'routine': ['test-cbc', 'test-urine-routine', 'test-fbs', 'test-lft'],
  'thyroid': ['test-thyroid'],
};

const getShortFastingLabel = (item) => {
  const req = (item.fastingRequirement || item.preparationSummary || item.preparation || '').toLowerCase();
  if (req.includes('no fasting') || req.includes('not required') || req.includes('no special')) {
    return 'No fasting required';
  }
  if (req.includes('fasting') || req.includes('8-10 h') || req.includes('10-12 h') || req.includes('12 h') || req.includes('overnight')) {
    return 'Fasting required';
  }
  return 'No fasting required';
};

const getShortTATLabel = (tat) => {
  if (!tat) return 'Reports in 24 hrs';
  const clean = tat.trim();
  if (clean.toLowerCase().startsWith('report')) return clean;

  if (clean.includes('6–8') || clean.includes('6-8')) return 'Reports in 6–8 hrs';
  if (clean.includes('4–6') || clean.includes('4-6')) return 'Reports in 4–6 hrs';
  if (clean.includes('12-24') || clean.includes('12–24')) return 'Reports in 24 hrs';
  if (clean.toLowerCase().includes('same day')) return 'Reports in same day';

  const formattedHours = clean.replace(/Hours?/i, 'hrs').replace(/\s*h\b/i, ' hrs');
  return `Reports in ${formattedHours}`;
};

const getShortCategoryLabel = (item) => {
  if (item.isPackage) {
    const cat = item.category || '';
    if (cat.toLowerCase().includes('executive')) return 'Executive Health';
    if (cat.toLowerCase().includes('body')) return 'Full Body';
    if (cat.toLowerCase().includes('heart')) return 'Heart Health';
    if (cat.toLowerCase().includes('diabet')) return 'Diabetes';
    return 'Health Package';
  }
  const cat = item.category || '';
  if (cat === 'diabetes') return 'Diabetes';
  if (cat === 'heart') return 'Heart Health';
  if (cat === 'women') return "Women's Health";
  if (cat === 'fever' || cat === 'infection') return 'Fever & Infection';
  if (cat === 'general') return 'Routine Test';
  if (cat === 'thyroid') return 'Thyroid';
  return 'Diagnostic Test';
};

const LabTestsScreenWeb = (props) => {
  const { navigation, route } = props;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);
  const { requireLogin } = useAuthGuard();

  // Open Google Maps Directions for Clinical Lab / Diagnostic Centre
  const handleOpenDirections = (centre, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const url = getGoogleMapsDirectionsUrl(centre);
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Cart integration
  const {
    labCart = [],
    addToCart,
    removeFromCart,
    labCartCount = 0,
    labFinalTotal = 0,
    checkTestInCartPackages,
  } = useCart();

  const isTestInCart = (id) => labCart?.some((item) => item.id === id);

  const handleToggleCartTest = (test) => {
    if (isTestInCart(test.id)) {
      removeFromCart(test.id, 'lab');
      showAlert('Removed from Cart', `${test.name} removed from your diagnostic cart.`);
    } else {
      if (!isTestAvailableInCity(test.id, currentCity) || availableCentres.length === 0) {
        showAlert('Service Unavailable', `${test.name} is not available in ${currentCity}.`);
        return;
      }
      // Check if this test is already included in any cart package!
      const packageCheck = checkTestInCartPackages ? checkTestInCartPackages(test) : { included: false };
      if (packageCheck.included) {
        showAlert(
          'Test Already Included in Package',
          `"${test.name}" is already included in "${packageCheck.packageName}" in your cart.\n\nYou do not need to book or pay for this test separately.`
        );
        return;
      }
      const cartItem = {
        id: test.id,
        name: test.name,
        category: 'Lab Test',
        itemType: 'lab',
        price: test.price,
        mrp: test.mrp || Math.round(test.price * 1.25),
        centerName: availableCentres[0]?.name || 'MediUnify Certified Diagnostic Center',
        reportTime: test.reportTAT || 'Within 24 Hours',
        sampleType: test.sampleType || 'Blood Sample',
        homeSample: Boolean(test.homeCollection),
        fastingRequired: test.fastingRequired,
      };
      const res = addToCart(cartItem, 1, 'lab');
      if (res && res.success === false) return;
      showAlert('Added to Cart', `${test.name} has been added to your cart.`);
    }
  };

  const handleToggleCartPackage = (pkg) => {
    const pkgId = pkg.id || pkg.code;
    if (isTestInCart(pkgId)) {
      removeFromCart(pkgId, 'lab');
      showAlert('Removed from Cart', `${pkg.name} removed from your diagnostic cart.`);
    } else {
      if (!isPackageAvailableInCity(pkgId, currentCity) || availableCentres.length === 0) {
        showAlert('Service Unavailable', `${pkg.name} is not available in ${currentCity}.`);
        return;
      }
      const cartItem = {
        ...pkg,
        id: pkgId,
        name: pkg.name,
        category: 'Lab Test',
        itemType: 'lab',
        price: pkg.price,
        mrp: pkg.mrp || Math.round(pkg.price * 1.3),
        centerName: availableCentres[0]?.name || 'MediUnify Certified Diagnostic Center',
        reportTime: pkg.tatSummary || 'Within 24-48 Hours',
        sampleType: pkg.sampleSummary || `${pkg.includedCount || pkg.testsCount || 'Multiple'} Tests Included`,
        homeSample: true,
        isPackage: true,
        tests: pkg.tests || [],
        testsList: pkg.tests || [],
        parametersList: pkg.parametersList || (pkg.tests ? pkg.tests.map(t => `${t.name} (${t.parameters})`) : []),
        preparationSummary: pkg.preparationSummary,
        sampleSummary: pkg.sampleSummary,
        clinicalNote: pkg.clinicalNote,
      };
      addToCart(cartItem, 1, 'lab');
      showAlert('Added to Cart', `${pkg.name} has been added to your cart.`);
    }
  };

  // Back Navigation Helper (Go to previous screen, or fallback safely to Home)
  const handleGoBack = () => {
    if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Home');
    } else if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      window.history.back();
    }
  };

  // Root Tabs: 'BROWSE' | 'BOOKINGS' | 'REPORTS'
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'BROWSE');

  // Search & Filter States (Simplified: Test Category & Search Tests only)
  const [searchQuery, setSearchQuery] = useState(route?.params?.query || route?.params?.search || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  const [expandedTestIndex, setExpandedTestIndex] = useState(null);
  const DEFAULT_PATIENT_PROFILES = [
    { id: 'p-self', name: 'User Profile', relation: 'Self', age: 28, gender: 'Not specified', phone: '' },
  ];

  const [patientProfiles, setPatientProfiles] = useState(DEFAULT_PATIENT_PROFILES);
  const [selectedPatientId, setSelectedPatientId] = useState('p-self');

  // Modals & Details State
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Selected City & Location Filtering (Synchronized with Home Screen Location as Single Source of Truth)
  const [currentCity, setCurrentCity] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const direct =
          window.localStorage.getItem('@mediunify_selected_city') ||
          window.localStorage.getItem('@unnathi_user_location');
        if (direct) {
          return normalizeLabCity(direct);
        }
      }
    } catch (e) { }
    return 'Mysuru';
  });

  const syncLocation = useCallback(async () => {
    try {
      const saved =
        (await AsyncStorage.getItem('@mediunify_selected_city')) ||
        (await AsyncStorage.getItem('@unnathi_user_location'));
      if (saved) {
        const norm = normalizeLabCity(saved);
        if (norm) {
          setCurrentCity((prev) => (prev !== norm ? norm : prev));
        }
      }
    } catch (e) { }
  }, []);

  // Inject Premium Hover CSS for Lab Test Cards, Buttons, and Chips
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'lab-premium-page-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        .lab-premium-card {
          transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.24s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease !important;
        }
        .lab-premium-card:hover {
          transform: translateY(-5px) !important;
          box-shadow: 0 20px 36px -10px rgba(0, 187, 149, 0.14), 0 6px 18px rgba(15, 23, 42, 0.05) !important;
          border-color: #00BB95 !important;
        }
        .lab-action-btn {
          transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease !important;
        }
        .lab-action-btn:hover {
          transform: translateY(-1.5px) !important;
          filter: brightness(1.04) !important;
        }
        .lab-cta-btn {
          transition: transform 0.2s ease, opacity 0.2s ease !important;
          cursor: pointer !important;
        }
        .lab-cta-btn:hover {
          transform: translateX(3px) !important;
        }
        .lab-category-chip-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          flex-shrink: 0 !important;
          white-space: nowrap !important;
        }
        .lab-category-chip-btn:hover {
          transform: translateY(-1.5px) !important;
          border-color: #00BB95 !important;
        }
        .lab-category-nav-btn {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease !important;
          cursor: pointer !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .lab-category-nav-btn:hover {
          transform: translateY(-50%) scale(1.22) !important;
          opacity: 0.82 !important;
        }
        .lab-quick-search-tag {
          transition: all 0.16s ease !important;
        }
        .lab-quick-search-tag:hover {
          background-color: #ECFDF5 !important;
          border-color: #00BB95 !important;
          color: #00BB95 !important;
        }
      `;
    }
  }, []);

  useEffect(() => {
    syncLocation();

    // Listen to focus event
    const unsubFocus = navigation?.addListener?.('focus', syncLocation);

    // Cross-window and in-tab custom event listeners
    let handleStorage;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      handleStorage = (e) => {
        if (!e || e.key === '@mediunify_selected_city' || e.key === '@unnathi_user_location') {
          syncLocation();
        }
      };
      window.addEventListener('storage', handleStorage);
      window.addEventListener('mediunify_city_changed', syncLocation);
    }

    // Interval check to automatically catch Home Screen location changes in real-time
    const interval = setInterval(syncLocation, 1000);

    return () => {
      unsubFocus?.();
      clearInterval(interval);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('mediunify_city_changed', syncLocation);
      }
    };
  }, [navigation, syncLocation]);

  const availableCentres = useMemo(() => {
    return getCentresByCity(currentCity);
  }, [currentCity]);

  // Formatted city location label with state (e.g., "Mysuru, Karnataka")
  const displayCityLocation = useMemo(() => {
    if (!currentCity) return 'Mysuru, Karnataka';
    return `${currentCity}, Karnataka`;
  }, [currentCity]);

  const prevCityRef = useRef(currentCity);

  // Revalidate cart items ONLY when selected city actually changes to a different city
  useEffect(() => {
    if (!currentCity) return;
    if (prevCityRef.current === currentCity) {
      return;
    }
    prevCityRef.current = currentCity;

    if (!labCart || labCart.length === 0) return;

    const invalidItems = labCart.filter((item) => {
      const isPkg = isPackageItem(item);
      const isAvail = isPkg
        ? isPackageAvailableInCity(item.id, currentCity)
        : isTestAvailableInCity(item.id, currentCity);
      return !isAvail;
    });

    if (invalidItems.length > 0) {
      invalidItems.forEach((inv) => removeFromCart(inv.id, 'lab'));
      showAlert(
        'Cart Updated',
        `${invalidItems.map((i) => i.name).join(', ')} removed because it is unavailable in ${currentCity}.`
      );
    }
  }, [currentCity]);

  // Booking Flow State
  const [bookingFlowStep, setBookingFlowStep] = useState(1);
  const [activeBookingTest, setActiveBookingTest] = useState(null);
  const [collectionMethod, setCollectionMethod] = useState('HOME');
  const [selectedCentreId, setSelectedCentreId] = useState('centre-unnathi-main');

  useEffect(() => {
    if (availableCentres.length > 0 && !availableCentres.some((c) => c.id === selectedCentreId)) {
      setSelectedCentreId(availableCentres[0].id);
    }
  }, [availableCentres, selectedCentreId]);

  const [selectedDate, setSelectedDate] = useState(getAvailableDates()[0].dateStr);
  const [selectedSlotId, setSelectedSlotId] = useState('slot-2');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [slotTick, setSlotTick] = useState(0);

  // Subscribe to real-time clock advancement & slot booking updates
  useEffect(() => {
    const unsub = subscribeToSlotChanges(() => {
      setSlotTick((prev) => prev + 1);
    });
    return unsub;
  }, []);

  // Ensure an available slot is selected when date/collection method changes or slots update
  useEffect(() => {
    const providerId = collectionMethod === 'HOME' ? 'home-collection' : selectedCentreId;
    const currentSlot = TIME_SLOTS.find((s) => s.id === selectedSlotId);
    const status = getSlotStatus({
      date: selectedDate,
      time: currentSlot?.label || '',
      serviceType: 'lab',
      providerId,
    });
    if (!status.available) {
      const firstAvail = TIME_SLOTS.find((s) => {
        return getSlotStatus({
          date: selectedDate,
          time: s.label,
          serviceType: 'lab',
          providerId,
        }).available;
      });
      if (firstAvail) {
        setSelectedSlotId(firstAvail.id);
      }
    }
  }, [selectedDate, collectionMethod, selectedCentreId, slotTick, selectedSlotId]);

  // Manual Home Collection Address Form
  const [homeAddressName, setHomeAddressName] = useState('');
  const [homeAddressPhone, setHomeAddressPhone] = useState('');
  const [homeAddressFlat, setHomeAddressFlat] = useState('Flat 402, Green Meadows');
  const [homeAddressCity, setHomeAddressCity] = useState('Mysuru');
  const [homeAddressPincode, setHomeAddressPincode] = useState('570023');
  const [homeAddressLandmark, setHomeAddressLandmark] = useState('');

  // Automatically load logged in user's profile and family details
  const loadUserProfiles = async () => {
    try {
      const storedPrimary = await AsyncStorage.getItem('@unnathi_primary_user');
      const storedUser = await AsyncStorage.getItem('user');
      const storedName = await AsyncStorage.getItem('userName');
      const storedPhone = await AsyncStorage.getItem('userPhone');
      const storedEmail = await AsyncStorage.getItem('userEmail');

      let userName = '';
      let userPhone = storedPhone || '';
      let userAge = '28';
      let userGender = 'Not specified';
      let userEmail = storedEmail || '';

      if (storedPrimary) {
        try {
          const p = JSON.parse(storedPrimary);
          if (p?.name && p.name.trim()) userName = p.name.replace(/\s*\(Self\)$/i, '').trim();
          if (p?.phone && p.phone.trim()) userPhone = p.phone.trim();
          if (p?.email && p.email.trim()) userEmail = p.email.trim();
          if (p?.age) userAge = p.age.toString().replace(/[^0-9]/g, '') || '28';
          if (p?.gender) userGender = p.gender;
        } catch (e) { }
      }
      if (!userName && storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u?.name && u.name.trim()) userName = u.name.replace(/\s*\(Self\)$/i, '').trim();
          if (u?.phone && u.phone.trim()) userPhone = u.phone.trim();
          if (u?.email && u.email.trim()) userEmail = u.email.trim();
          if (u?.age) userAge = u.age.toString().replace(/[^0-9]/g, '') || '28';
          if (u?.gender) userGender = u.gender;
        } catch (e) { }
      }
      if (!userName && storedName && storedName.trim()) {
        userName = storedName.replace(/\s*\(Self\)$/i, '').trim();
      }

      const effectiveName = userName || 'User Profile';
      const selfProfile = {
        id: 'p-self',
        name: effectiveName,
        relation: 'Self',
        age: parseInt(userAge, 10) || 28,
        gender: userGender || 'Not specified',
        phone: userPhone || '',
      };

      // Query family members specific to current user account
      const userKey = (userEmail || userPhone || effectiveName).toLowerCase().replace(/[^a-z0-9]/g, '_');
      const userFamKey = `@unnathi_family_members_${userKey}`;
      const savedUserFam = await AsyncStorage.getItem(userFamKey);
      let familyList = [];

      if (savedUserFam) {
        try {
          const parsed = JSON.parse(savedUserFam);
          if (Array.isArray(parsed) && parsed.length > 0) {
            familyList = parsed;
          }
        } catch (e) { }
      }

      // Fallback: check session family members only if it belongs to this user
      if (familyList.length === 0) {
        const storedFam = await AsyncStorage.getItem('@unnathi_family_members');
        if (storedFam) {
          try {
            const parsedG = JSON.parse(storedFam);
            if (Array.isArray(parsedG) && parsedG.length > 0) {
              const firstMem = parsedG[0];
              if (firstMem?.name && firstMem.name.toLowerCase().includes(effectiveName.split(' ')[0].toLowerCase())) {
                familyList = parsedG;
              }
            }
          } catch (e) { }
        }
      }

      // Filter out self/primary, ONLY take family members explicitly added by user
      const otherProfiles = (Array.isArray(familyList) && familyList.length > 0)
        ? familyList
          .filter(m => m && m.id !== 'self' && m.relation !== 'Self' && !m.isPrimary)
          .map((m, idx) => ({
            id: m.id || `p-${idx + 2}`,
            name: (m.name || m.displayName || 'Family Member').replace(/\s*\(.*?\)$/, '').trim(),
            relation: m.relation || 'Family',
            age: parseInt(m.age, 10) || 30,
            gender: m.gender || 'Not specified',
            phone: m.phone || userPhone || '',
          }))
        : [];

      const combined = [selfProfile, ...otherProfiles];
      setPatientProfiles(combined);
      setSelectedPatientId('p-self');
      setHomeAddressName(effectiveName);
      if (userPhone) setHomeAddressPhone(userPhone);
    } catch (err) {
      console.warn('[LabTestsScreen] Failed to load user profiles:', err);
    }
  };

  useEffect(() => {
    loadUserProfiles();
  }, [activeBookingTest]);

  // Bookings & Reports State
  const [bookingsList, setBookingsList] = useState(INITIAL_LAB_BOOKINGS);

  useEffect(() => {
    const loadStoredLabBookings = async () => {
      try {
        const raw = await AsyncStorage.getItem('@labBookings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map = new Map();
            parsed.forEach((b) => { if (b && b.id) map.set(b.id, b); });
            INITIAL_LAB_BOOKINGS.forEach((b) => { if (b && b.id && !map.has(b.id)) map.set(b.id, b); });
            setBookingsList(Array.from(map.values()));
          }
        }
      } catch (e) { }
    };
    loadStoredLabBookings();
  }, []);
  const [bookingsFilter, setBookingsFilter] = useState('ALL');
  const [selectedTrackingBooking, setSelectedTrackingBooking] = useState(null);

  const [reportsList, setReportsList] = useState(INITIAL_LAB_REPORTS);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  // Scroll ref
  const mainScrollRef = useRef(null);
  const conditionScrollRef = useRef(null);
  const [conditionScrollX, setConditionScrollX] = useState(0);

  const handleScrollCondition = (direction) => {
    const delta = direction === 'next' ? 320 : -320;
    const target = Math.max(0, conditionScrollX + delta);
    setConditionScrollX(target);
    conditionScrollRef.current?.scrollTo({ x: target, animated: true });
  };

  // Category horizontal slider refs and state
  const categoryScrollRef = useRef(null);
  const [categoryScrollX, setCategoryScrollX] = useState(0);
  const [canCategoryScrollLeft, setCanCategoryScrollLeft] = useState(false);
  const [canCategoryScrollRight, setCanCategoryScrollRight] = useState(true);
  const [categoryContainerWidth, setCategoryContainerWidth] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);

  const handleCategoryScroll = (e) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const offsetX = contentOffset?.x || 0;
    setCategoryScrollX(offsetX);
    setCanCategoryScrollLeft(offsetX > 10);
    const layoutW = layoutMeasurement?.width || categoryContainerWidth;
    const contentW = contentSize?.width || categoryContentWidth;
    if (layoutW && contentW) {
      setCanCategoryScrollRight(offsetX + layoutW < contentW - 12);
    }
  };

  const handleScrollCategory = (direction) => {
    const delta = direction === 'next' ? 280 : -280;
    const target = Math.max(0, categoryScrollX + delta);
    setCategoryScrollX(target);
    if (categoryScrollRef.current) {
      if (typeof categoryScrollRef.current.scrollTo === 'function') {
        categoryScrollRef.current.scrollTo({ x: target, animated: true });
      }
    }
  };

  // Active category object
  const activeCategoryItem = useMemo(() => {
    return WEB_LAB_CATEGORIES.find((c) => c.id === selectedCategory);
  }, [selectedCategory]);

  // ---------------------------------------------------------------------------
  // FILTERING LOGIC (Standardized Categories & Search & City Availability)
  // ---------------------------------------------------------------------------
  const filteredPackages = useMemo(() => {
    // Strict city check: if city has no diagnostic centres, return empty
    if (!availableCentres || availableCentres.length === 0) return [];

    return NOVUS_POPULAR_PACKAGES.filter((pkg) => {
      // 0. Strict City Availability
      const pkgId = pkg.id || pkg.code;
      if (!isPackageAvailableInCity(pkgId, currentCity)) {
        return false;
      }

      // 1. Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'popular') {
          const isPop = pkg.type === 'popular' || pkg.tier === 'Popular Checkup' || pkg.badge?.toLowerCase().includes('popular') || POPULAR_TESTS_MAP['all']?.includes(pkg.id || pkg.code);
          if (!isPop) return false;
        } else if (selectedCategory === 'full-body') {
          if (pkg.categoryId !== 'full-body' && !pkg.category?.toLowerCase().includes('body')) return false;
        } else if (selectedCategory === 'diabetes') {
          if (pkg.categoryId !== 'diabetes' && !pkg.category?.toLowerCase().includes('diabet')) return false;
        } else if (selectedCategory === 'heart') {
          if (pkg.categoryId !== 'heart' && !pkg.category?.toLowerCase().includes('heart')) return false;
        } else if (selectedCategory === 'executive') {
          if (pkg.categoryId !== 'executive' && !pkg.category?.toLowerCase().includes('executive')) return false;
        } else if (selectedCategory === 'women') {
          if (!pkg.category?.toLowerCase().includes('women')) return false;
        } else if (selectedCategory === 'fever') {
          if (!pkg.category?.toLowerCase().includes('fever')) return false;
        } else if (selectedCategory === 'routine') {
          if (!pkg.category?.toLowerCase().includes('routine') && !pkg.category?.toLowerCase().includes('general') && pkg.id !== 'POP-FB-01') return false;
        } else if (selectedCategory === 'thyroid') {
          const hasThy = pkg.tests?.some((t) => t.name.toLowerCase().includes('thyroid'));
          if (!hasThy) return false;
        } else if (pkg.categoryId !== selectedCategory) {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = pkg.name.toLowerCase().includes(q);
        const matchesCode = pkg.code.toLowerCase().includes(q);
        const matchesCategory = pkg.category.toLowerCase().includes(q);
        const matchesTests = pkg.tests.some(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.parameters.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesCode && !matchesCategory && !matchesTests) {
          return false;
        }
      }

      return true;
    });
  }, [availableCentres, currentCity, selectedCategory, searchQuery]);

  const filteredTests = useMemo(() => {
    // Strict city check: if city has no diagnostic centres, return empty
    if (!availableCentres || availableCentres.length === 0) return [];

    return LAB_TESTS_MASTER.filter((test) => {
      // 0. Strict City Availability
      if (!isTestAvailableInCity(test.id, currentCity)) {
        return false;
      }

      // 1. Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'popular') {
          const isPop = test.popular === true || test.featured === true || POPULAR_TESTS_MAP['all']?.includes(test.id);
          if (!isPop) return false;
        } else if (selectedCategory === 'full-body') {
          if (test.category !== 'preventive' && test.category !== 'full-body') return false;
        } else if (selectedCategory === 'diabetes') {
          if (test.category !== 'diabetes') return false;
        } else if (selectedCategory === 'heart') {
          if (test.category !== 'heart') return false;
        } else if (selectedCategory === 'executive') {
          return false;
        } else if (selectedCategory === 'women') {
          if (test.category !== 'women') return false;
        } else if (selectedCategory === 'fever') {
          if (test.category !== 'fever' && test.category !== 'infection' && test.id !== 'test-cbc' && test.id !== 'test-crp' && test.id !== 'test-throat-swab') return false;
        } else if (selectedCategory === 'routine') {
          if (test.category !== 'general' && test.id !== 'test-cbc' && test.id !== 'test-urine-routine' && test.id !== 'test-fbs' && test.id !== 'test-lft' && test.id !== 'test-kft') return false;
        } else if (selectedCategory === 'thyroid') {
          if (test.category !== 'thyroid' && test.id !== 'test-thyroid' && !test.name?.toLowerCase().includes('thyroid')) return false;
        } else if (test.category !== selectedCategory) {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = test.name.toLowerCase().includes(q);
        const matchesDesc = test.description?.toLowerCase().includes(q);
        const matchesKeywords = test.keywords?.some((k) => k.toLowerCase().includes(q));
        const matchesSynonyms = test.synonyms?.some((s) => s.toLowerCase().includes(q));
        const matchesConsumer = test.consumerTerms?.some((c) => c.toLowerCase().includes(q));

        if (!matchesName && !matchesDesc && !matchesKeywords && !matchesSynonyms && !matchesConsumer) {
          return false;
        }
      }

      return true;
    });
  }, [availableCentres, currentCity, selectedCategory, searchQuery]);

  // Unified Lab Tests & Health Checkup Packages
  // CRITICAL REQUIREMENT: Individual tests come FIRST, package tests come AFTER
  const unifiedLabItems = useMemo(() => {
    const testItems = filteredTests.map((test) => ({
      ...test,
      id: test.id,
      isPackage: false,
      sampleLabel: test.sampleType ? `${test.sampleType} Sample` : 'Blood Sample',
      displayCategory: getShortCategoryLabel(test),
      tatSummary: getShortTATLabel(test.reportTAT),
      fastingSummary: getShortFastingLabel(test),
    }));

    const pkgItems = filteredPackages.map((pkg) => ({
      ...pkg,
      id: pkg.id || pkg.code,
      isPackage: true,
      sampleLabel: `${pkg.testsCount || (pkg.tests ? pkg.tests.length : 1)} Tests Included`,
      displayCategory: getShortCategoryLabel({ ...pkg, isPackage: true }),
      tatSummary: getShortTATLabel(pkg.tatSummary),
      fastingSummary: getShortFastingLabel(pkg),
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      // Sort individual tests so prefix/direct name matches come first
      testItems.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 2 : (a.name.toLowerCase().includes(q) ? 1 : 0);
        const bStarts = b.name.toLowerCase().startsWith(q) ? 2 : (b.name.toLowerCase().includes(q) ? 1 : 0);
        return bStarts - aStarts;
      });
      // Sort packages similarly
      pkgItems.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 2 : (a.name.toLowerCase().includes(q) ? 1 : 0);
        const bStarts = b.name.toLowerCase().startsWith(q) ? 2 : (b.name.toLowerCase().includes(q) ? 1 : 0);
        return bStarts - aStarts;
      });
      // Individual tests first, package tests second
      return [...testItems, ...pkgItems];
    }

    // Default view: Individual tests first, packages next
    return [...testItems, ...pkgItems];
  }, [filteredPackages, filteredTests, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(unifiedLabItems.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedLabItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return unifiedLabItems.slice(start, start + ITEMS_PER_PAGE);
  }, [unifiedLabItems, safeCurrentPage]);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const startBooking = (item, preferredMethod = null) => {
    requireLogin(() => _doStartBooking(item, preferredMethod));
  };

  const _doStartBooking = (item, preferredMethod = null) => {
    if (!item) return;

    const isPkg = Boolean(item.tests || item.code || item.isPackage);
    const itemId = item.id || item.code;
    const isAvail = isPkg
      ? isPackageAvailableInCity(itemId, currentCity)
      : isTestAvailableInCity(itemId, currentCity);

    if (!isAvail || !availableCentres || availableCentres.length === 0) {
      showAlert(
        'Service Unavailable',
        `${item.name} is not available for booking in ${currentCity}. Please choose a test available in ${currentCity} or switch your city on the Home Screen.`
      );
      return;
    }

    const bookingItem = {
      ...item,
      id: itemId,
      name: item.name,
      code: item.code,
      isPackage: isPkg,
      testsCount: item.testsCount || (item.tests ? item.tests.length : 1),
      price: item.price,
      mrp: item.mrp || Math.round(item.price * 1.5),
      homeCollection: item.homeCollectionAvailable !== false && item.homeCollection !== false,
      centreCollection: true,
      preparation: item.preparationSummary || item.preparation || 'No special fasting required',
    };
    setActiveBookingTest(bookingItem);
    const freshDates = getAvailableDates();
    if (!freshDates.some((d) => d.dateStr === selectedDate)) {
      setSelectedDate(freshDates[0].dateStr);
    }
    if (preferredMethod) {
      setCollectionMethod(preferredMethod);
    } else if (bookingItem.homeCollection) {
      setCollectionMethod('HOME');
    } else {
      setCollectionMethod('CENTRE');
    }
    setBookingFlowStep(1);
  };

  const handleSimulatePayment = () => {
    requireLogin(() => _doSimulatePayment());
  };

  const _doSimulatePayment = async () => {

    const isHome = collectionMethod === 'HOME';
    if (isHome && (!homeAddressName.trim() || !homeAddressPhone.trim() || !homeAddressFlat.trim() || !homeAddressCity.trim() || !homeAddressPincode.trim())) {
      return;
    }
    const testPrice = activeBookingTest.price;
    const collectionFee = isHome ? 100 : 0;
    const total = testPrice + collectionFee;
    const selectedCentre =
      availableCentres.find((c) => c.id === selectedCentreId) ||
      ALL_CITY_DIAGNOSTIC_CENTRES.find((c) => c.id === selectedCentreId) ||
      availableCentres[0];
    const selectedSlot = TIME_SLOTS.find((s) => s.id === selectedSlotId);

    // Real-Time Atomic Slot Validation (Rules 2, 3, 6)
    const slotValidation = await validateAndBookSlot({
      date: selectedDate,
      time: selectedSlot?.label || '8:30 AM – 9:30 AM',
      serviceType: 'lab',
      providerId: isHome ? 'home-collection' : selectedCentreId,
      slotId: selectedSlotId,
      patientName: homeAddressName.trim() || 'Patient',
    });

    if (!slotValidation.success) {
      showAlert('Slot Unavailable', 'This slot is no longer available. Please select another time.');
      return;
    }

    const manualAddr = isHome
      ? `${homeAddressFlat.trim()}, ${homeAddressCity.trim()} - ${homeAddressPincode.trim()}${homeAddressLandmark.trim() ? ` (${homeAddressLandmark.trim()})` : ''}`
      : null;

    const newBookingId = `LAB-2026-00${Math.floor(100 + Math.random() * 900)}`;

    const newBooking = {
      id: newBookingId,
      testId: activeBookingTest.id,
      testName: activeBookingTest.name,
      collectionMethod: collectionMethod,
      collectionAddress: manualAddr,
      collectionContactName: isHome ? homeAddressName.trim() : null,
      collectionContactPhone: isHome ? homeAddressPhone.trim() : null,
      diagnosticCentre: isHome ? null : { name: selectedCentre?.name, location: selectedCentre?.location },
      bookingDate: selectedDate,
      timeSlot: selectedSlot?.label || '8:30 AM – 9:30 AM',
      amountPaid: total,
      testPrice: testPrice,
      collectionFee: collectionFee,
      status: 'CONFIRMED',
      trackingStage: 1,
      patientName: homeAddressName.trim() || 'Patient',
      phlebotomistName: isHome ? 'Muralidhar Rao (Senior Phlebotomist)' : null,
      phlebotomistPhone: isHome ? '+91 98452 33110' : null,
      reportReady: false,
    };

    setConfirmedBookingData(newBooking);
    setBookingsList([newBooking, ...bookingsList]);
    setBookingFlowStep(5);

    try {
      // 1. Save to @labBookings and labBookings
      for (const k of ['@labBookings', 'labBookings']) {
        const existingRaw = await AsyncStorage.getItem(k);
        const existingList = existingRaw ? JSON.parse(existingRaw) : [];
        const nextList = [newBooking, ...(Array.isArray(existingList) ? existingList : [])];
        await AsyncStorage.setItem(k, JSON.stringify(nextList));
      }

      // 2. Format for @mediunify_patient_booked_tests (for MyTestsScreen)
      const dashboardBooking = {
        id: newBookingId,
        bookingRef: newBookingId,
        testName: newBooking.testName,
        modality: 'Pathology & Blood',
        modalityType: 'Blood Test',
        testCategory: 'Pathology & Blood',
        testType: isHome ? 'Home Sample Collection' : 'Centre Visit',
        centerName: newBooking.diagnosticCentre?.name || 'Unnathi Central Pathology & Diagnostic Center',
        department: 'Automated Clinical Pathology',
        location: isHome ? (manualAddr || 'Mysuru') : (newBooking.diagnosticCentre?.location || 'Kuvempunagar, Mysuru'),
        address: isHome ? (manualAddr || 'Mysuru') : (newBooking.diagnosticCentre?.location || 'Kuvempunagar, Mysuru'),
        appointmentDate: selectedDate,
        timeSlot: selectedSlot?.label || '08:30 AM – 09:30 AM',
        patientId: selectedPatientId || 'self',
        patientName: homeAddressName.trim() || 'Hemanth Gowda (Self)',
        age: 28,
        gender: 'Male',
        status: 'Slot Confirmed',
        badgeColor: '#00BB95',
        price: total,
        paymentStatus: 'Paid Online via UPI',
        instructions: 'Fasting of 10-12 hours required prior to sample collection. Water is permitted.',
        doctorPrescription: 'Diagnostic Lab Screening Referral',
        contactPhone: '+91 821 245 9901',
        canReschedule: true,
        canCancel: true,
        phlebotomist: isHome ? {
          name: newBooking.phlebotomistName || 'Muralidhar Rao (Senior Phlebotomist)',
          phone: newBooking.phlebotomistPhone || '+91 98452 33110',
          vehicle: 'Two-Wheeler (KA-09-ER-5521)',
          eta: '15 mins',
        } : null,
      };

      const existingBookedTestsRaw = await AsyncStorage.getItem('@mediunify_patient_booked_tests');
      const existingBookedTests = existingBookedTestsRaw ? JSON.parse(existingBookedTestsRaw) : [];
      const updatedBookedTests = [dashboardBooking, ...(Array.isArray(existingBookedTests) ? existingBookedTests : [])];
      await AsyncStorage.setItem('@mediunify_patient_booked_tests', JSON.stringify(updatedBookedTests));

      // 3. Save to @unnathi_appointments
      const existingApptsRaw = await AsyncStorage.getItem('@unnathi_appointments');
      const existingAppts = existingApptsRaw ? JSON.parse(existingApptsRaw) : [];
      await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify([dashboardBooking, ...(Array.isArray(existingAppts) ? existingAppts : [])]));
    } catch (saveErr) {
      console.warn('Error saving lab booking to AsyncStorage:', saveErr);
    }
  };

  // ===========================================================================
  // RENDER: DESKTOP CARD
  // ===========================================================================
  const renderDesktopCard = (test) => {
    return (
      <View key={test.id} style={styles.webTestCard}>
        <View style={styles.webCardBadgesRow}>
          {test.popular && (
            <View style={styles.webPopularBadge}>
              <Ionicons name="flame" size={11} color="#FFFFFF" />
              <Text style={styles.webPopularBadgeText}>Popular #{test.popularRank}</Text>
            </View>
          )}
          {test.recommended && (
            <View style={styles.webRecommendedBadge}>
              <Ionicons name="thumbs-up" size={11} color="#1E3A8A" />
              <Text style={styles.webRecommendedBadgeText}>Recommended</Text>
            </View>
          )}
          <View style={styles.webSampleBadge}>
            <Text style={styles.webSampleBadgeText}>{test.sampleType}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => setSelectedTest(test)}>
          <Text style={styles.webCardTitle} numberOfLines={2}>{test.name}</Text>
        </TouchableOpacity>
        <Text style={styles.webCardDesc} numberOfLines={2}>{test.description}</Text>

        <View style={styles.webAvailBox}>
          <View style={styles.webAvailItem}>
            <Ionicons name={test.homeCollection ? 'checkmark-circle' : 'close-circle'} size={14} color={test.homeCollection ? '#00BB95' : '#94A3B8'} />
            <Text style={[styles.webAvailText, !test.homeCollection && styles.webAvailTextDisabled]}>
              {test.homeCollection ? 'Home Collection' : 'No Home Collection'}
            </Text>
          </View>
          <View style={styles.webAvailItem}>
            <Ionicons name={test.centreCollection ? 'checkmark-circle' : 'close-circle'} size={14} color={test.centreCollection ? '#00BB95' : '#94A3B8'} />
            <Text style={[styles.webAvailText, !test.centreCollection && styles.webAvailTextDisabled]}>
              {test.centreCollection ? 'Lab Visit' : 'No Lab Visit'}
            </Text>
          </View>
        </View>

        <View style={styles.webCardFooter}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.webPriceText}>₹{test.price}</Text>
              {test.mrp && <Text style={styles.webMrpText}>₹{test.mrp}</Text>}
            </View>
            <Text style={styles.webTatText}>TAT: {test.reportTAT}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {(() => {
              const inCart = isTestInCart(test.id);
              const inPkg = !inCart && checkTestInCartPackages ? checkTestInCartPackages(test) : { included: false };
              if (inPkg.included) {
                return (
                  <TouchableOpacity
                    style={[styles.webAddToCartBtn, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}
                    onPress={() =>
                      showAlert(
                        'Covered in Cart Package',
                        `"${test.name}" is already included in "${inPkg.packageName}" in your cart.\n\nYou do not need to book or pay for this test separately.`
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shield-checkmark" size={13} color="#00BB95" />
                    <Text style={[styles.webAddToCartBtnText, { color: '#00BB95', fontWeight: '700' }]}>
                      In Package
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  style={[styles.webAddToCartBtn, inCart && styles.webAddToCartBtnActive]}
                  onPress={() => handleToggleCartTest(test)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={inCart ? 'checkmark-circle' : 'cart-outline'}
                    size={13}
                    color={inCart ? '#FFFFFF' : '#00BB95'}
                  />
                  <Text
                    style={[
                      styles.webAddToCartBtnText,
                      inCart && styles.webAddToCartBtnTextActive,
                    ]}
                  >
                    {inCart ? 'In Cart' : 'Add'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
            <TouchableOpacity style={styles.webDetailsBtn} onPress={() => setSelectedTest(test)}>
              <Text style={styles.webDetailsBtnText}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.labOrganicCtaBtn}
              // @ts-ignore
              className="lab-cta-btn"
              onPress={() => startBooking(test)}
              activeOpacity={0.8}
            >
              <View style={styles.labOrganicArrowCircle}>
                <Ionicons name="arrow-forward" size={11} color="#00BB95" />
              </View>
              <Text style={styles.labOrganicCtaText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ===========================================================================
  // RENDER: BROWSE VIEW (WEB)
  // ===========================================================================
  const renderWebBrowse = () => {
    const hasActiveFilter = selectedCategory !== 'all' || searchQuery.trim().length > 0;
    const activeCategoryItem = WEB_LAB_CATEGORIES.find((c) => c.id === selectedCategory);

    return (
      <View style={styles.webMainContentWrapper}>
        {/* 1. COLORFUL HERO HEADER BANNER (REDUCED TEXT, NO QUICK SEARCH) */}
        <View style={styles.webHeroBanner}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleGroup}>
              <TouchableOpacity
                style={styles.heroBackButton}
                onPress={handleGoBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={20} color="#00BB95" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroVerifiedBadge}>
                    <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.heroVerifiedBadgeText}>VERIFIED LAB NETWORK</Text>
                  </View>
                </View>
                <Text style={styles.heroMainTitle}>Diagnostic Lab Tests</Text>
                <Text style={styles.heroSubtitle}>
                  Doorstep sample collection with certified 24-hr digital reports.
                </Text>
              </View>
            </View>

            {/* City Location Indicator Card */}
            <View style={styles.heroCityCard}>
              <View style={styles.heroCityStatusDot} />
              <Ionicons name="location-sharp" size={16} color="#00BB95" style={{ marginRight: 6 }} />
              <View>
                <Text style={styles.heroCityLabel}>City</Text>
                <Text style={styles.heroCityValue}>{displayCityLocation}</Text>
              </View>
            </View>
          </View>


          {/* Floating Search Bar (Quick Search Removed) */}
          <View style={styles.webSearchBarWrap}>
            <Ionicons name="search" size={20} color="#00BB95" style={{ marginLeft: 4, marginRight: 12 }} />
            <TextInput
              style={styles.webSearchInput}
              placeholder="Search tests (e.g. CBC, HbA1c, Thyroid, Lipid Profile) or packages..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
              accessibilityLabel="Search tests or packages"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear Search"
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2. CATEGORIES SELECTOR */}
        <View style={styles.webCategoriesSection}>
          <View style={styles.categoriesHeaderRow}>
            <Text style={styles.categoriesSectionTitle}>Categories</Text>
            {hasActiveFilter && (
              <TouchableOpacity
                onPress={resetAllFilters}
                style={styles.activeFilterChip}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={14} color="#FF7F50" style={{ marginRight: 4 }} />
                <Text style={styles.activeFilterChipText}>Reset Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.categoriesScrollWrapper}>
            {canCategoryScrollLeft && (
              <TouchableOpacity
                // @ts-ignore
                className="lab-category-nav-btn"
                style={[styles.categoryNavBtn, styles.categoryPrevBtn]}
                onPress={() => handleScrollCategory('prev')}
                activeOpacity={0.7}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityLabel="Scroll categories left"
              >
                <Ionicons name="chevron-back" size={30} color="#00BB95" />
              </TouchableOpacity>
            )}

            <ScrollView
              ref={categoryScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
              onScroll={handleCategoryScroll}
              scrollEventThrottle={16}
              onContentSizeChange={(w) => {
                setCategoryContentWidth(w);
                if (categoryContainerWidth > 0) {
                  setCanCategoryScrollRight(categoryScrollX + categoryContainerWidth < w - 12);
                }
              }}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                setCategoryContainerWidth(w);
                if (categoryContentWidth > 0) {
                  setCanCategoryScrollRight(categoryScrollX + w < categoryContentWidth - 12);
                }
              }}
            >
              {WEB_LAB_CATEGORIES.map((cat) => {
                const isSel = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    // @ts-ignore
                    className="lab-category-chip-btn"
                    style={[styles.webCategoryChip, isSel && styles.webCategoryChipActive]}
                    onPress={() => {
                      setSelectedCategory(isSel && cat.id !== 'all' ? 'all' : cat.id);
                      setCurrentPage(1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={15}
                      color={isSel ? '#FFFFFF' : '#00BB95'}
                      style={{ marginRight: 7 }}
                    />
                    <Text
                      style={[styles.webCategoryChipText, isSel && styles.webCategoryChipTextActive]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {canCategoryScrollRight && (
              <TouchableOpacity
                // @ts-ignore
                className="lab-category-nav-btn"
                style={[styles.categoryNavBtn, styles.categoryNextBtn]}
                onPress={() => handleScrollCategory('next')}
                activeOpacity={0.7}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                accessibilityLabel="Scroll categories right"
              >
                <Ionicons name="chevron-forward" size={30} color="#00BB95" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. TEST COUNT & CITY BANNER */}
        <View style={styles.webResultsBar}>
          <View style={styles.resultsBarLeft}>
            <Ionicons name="checkmark-done-circle" size={18} color="#00BB95" style={{ marginRight: 6 }} />
            <Text style={styles.webResultsCountText}>
              Showing <Text style={{ fontWeight: '800', color: '#0F172A' }}>{unifiedLabItems.length}</Text> certified {unifiedLabItems.length === 1 ? 'test' : 'tests'}
              {selectedCategory !== 'all' ? ` in ${activeCategoryItem?.name || selectedCategory}` : ''}
              {` in `}<Text style={{ fontWeight: '700', color: '#00BB95' }}>{currentCity}</Text>
            </Text>
          </View>
          <View style={styles.resultsBarRight}>
            <Ionicons name="home-outline" size={14} color="#00BB95" style={{ marginRight: 4 }} />
            <Text style={styles.resultsBarRightText}>Home Sample Collection in 60 Mins</Text>
          </View>
        </View>

        {/* 4. PREMIUM GRID OF TEST CARDS */}
        {unifiedLabItems.length > 0 ? (
          <>
            <View style={styles.webCardsGrid}>
              {paginatedLabItems.map((item) => {
                const inCart = isTestInCart(item.id);
                const isPkg = item.isPackage;
                const inPkg = !inCart && !isPkg && checkTestInCartPackages ? checkTestInCartPackages(item) : { included: false };

                // Color badge tokens per category
                const catLower = (item.displayCategory || '').toLowerCase();
                let catBg = '#F0FDF4';
                let catBorder = '#DCFCE7';
                let catColor = '#00BB95';
                if (catLower.includes('routine')) {
                  catBg = '#EFF6FF'; catBorder = '#DBEAFE'; catColor = '#1D4ED8';
                } else if (catLower.includes('diabetes')) {
                  catBg = '#FFFBEB'; catBorder = '#FDE68A'; catColor = '#B45309';
                } else if (catLower.includes('heart')) {
                  catBg = '#FEF2F2'; catBorder = '#FEE2E2'; catColor = '#DC2626';
                } else if (catLower.includes('women')) {
                  catBg = '#FDF2F8'; catBorder = '#FCE7F3'; catColor = '#BE185D';
                }

                const isFastingRequired = (item.fastingSummary || '').toLowerCase().includes('fasting required');

                return (
                  <View
                    key={item.id}
                    style={styles.webCardItem}
                    // @ts-ignore
                    className="lab-premium-card"
                  >
                    {/* Top Row: Category Pill & TAT Badge */}
                    <View style={styles.cardHeaderBadgesRow}>
                      <View style={[styles.categoryPillWrap, { backgroundColor: catBg, borderColor: catBorder }]}>
                        <Text style={[styles.cardCategoryText, { color: catColor }]} numberOfLines={1}>
                          {item.displayCategory || (isPkg ? 'Health Checkup' : 'Diagnostic Test')}
                        </Text>
                      </View>
                      <View style={styles.tatBadge}>
                        <Ionicons name="flash" size={12} color="#00BB95" style={{ marginRight: 4 }} />
                        <Text style={styles.tatBadgeText} numberOfLines={1}>
                          {item.tatSummary}
                        </Text>
                      </View>
                    </View>

                    {/* Test / Package Name (Subtitles removed for clean, user-friendly look) */}
                    <TouchableOpacity
                      onPress={() => (isPkg ? setSelectedPackage(item) : setSelectedTest(item))}
                      activeOpacity={0.85}
                      style={{ marginBottom: 12 }}
                    >
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>

                    {/* Clinical Details: Sample & Fasting */}
                    <View style={styles.cardKeyDetailsRow}>
                      <View style={styles.keyDetailItem}>
                        <Ionicons
                          name={isPkg ? 'cube-outline' : 'water-outline'}
                          size={13}
                          color="#00BB95"
                          style={{ marginRight: 5 }}
                        />
                        <Text style={styles.keyDetailText} numberOfLines={1}>
                          {item.sampleLabel}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.keyDetailItem,
                          isFastingRequired ? styles.fastingRequiredBadge : styles.fastingNotRequiredBadge,
                        ]}
                      >
                        <Ionicons
                          name={isFastingRequired ? 'timer-outline' : 'restaurant-outline'}
                          size={13}
                          color={isFastingRequired ? '#B45309' : '#15803D'}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.keyDetailText,
                            { color: isFastingRequired ? '#B45309' : '#15803D', fontWeight: '700' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.fastingSummary}
                        </Text>
                      </View>
                    </View>

                    {/* Footer: Price Row + Action Buttons */}
                    <View style={styles.cardFooterWrap}>
                      <View style={styles.cardPriceRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                          <Text style={styles.cardPrice}>₹{item.price}</Text>
                          {item.mrp && <Text style={styles.cardMrp}>₹{item.mrp}</Text>}
                        </View>
                        {item.discount && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>{item.discount}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.cardActionBtnsRow}>
                        <View style={styles.cardLeftActions}>
                          {/* 1. Details Button */}
                          <TouchableOpacity
                            style={styles.detailsBtn}
                            // @ts-ignore
                            className="lab-action-btn"
                            onPress={() => (isPkg ? setSelectedPackage(item) : setSelectedTest(item))}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Details"
                          >
                            <Ionicons name="information-circle-outline" size={14} color="#475569" style={{ marginRight: 4 }} />
                            <Text style={styles.detailsBtnText}>Details</Text>
                          </TouchableOpacity>

                          {/* 2. Cart / In Package Button */}
                          {inPkg.included ? (
                            <TouchableOpacity
                              style={styles.inPackageBtn}
                              // @ts-ignore
                              className="lab-action-btn"
                              onPress={() =>
                                showAlert(
                                  'Covered in Cart Package',
                                  `"${item.name}" is already included in "${inPkg.packageName}" in your cart.\n\nYou do not need to book or pay for this test separately.`
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Ionicons name="shield-checkmark" size={14} color="#00BB95" style={{ marginRight: 4 }} />
                              <Text style={styles.inPackageBtnText}>In Package</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.cartIconBtn, inCart && styles.cartIconBtnActive]}
                              // @ts-ignore
                              className="lab-action-btn"
                              onPress={() => (isPkg ? handleToggleCartPackage(item) : handleToggleCartTest(item))}
                              activeOpacity={0.8}
                              accessibilityRole="button"
                              accessibilityLabel={inCart ? "In Cart" : "Add to Cart"}
                            >
                              <Ionicons
                                name={inCart ? 'checkmark-circle' : 'cart-outline'}
                                size={15}
                                color={inCart ? '#FFFFFF' : '#00BB95'}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={[styles.cartIconBtnText, inCart && styles.cartIconBtnTextActive]}>
                                {inCart ? 'In Cart' : '+ Add'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* 3. Primary Book Now CTA (User circular arrow design) */}
                        <TouchableOpacity
                          style={styles.labOrganicCtaBtn}
                          // @ts-ignore
                          className="lab-cta-btn"
                          onPress={() => startBooking(item)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel="Book Test"
                        >
                          <View style={styles.labOrganicArrowCircle}>
                            <Ionicons name="arrow-forward" size={11} color="#00BB95" />
                          </View>
                          <Text style={styles.labOrganicCtaText}>Book Now</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={{ marginTop: 28, marginBottom: 8 }}>
                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={(pageNum) => {
                    setCurrentPage(pageNum);
                    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                />
              </View>
            )}
          </>
        ) : (
          /* Clean Empty State with City Messaging */
          <View style={styles.webEmptyState}>
            {availableCentres.length === 0 ? (
              <>
                <Ionicons name="location-outline" size={52} color="#94A3B8" />
                <Text style={styles.webEmptyTitle}>No tests in {currentCity} yet.</Text>
                <Text style={styles.webEmptyDesc}>
                  Try another category or switch city.
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="search-outline" size={48} color="#94A3B8" />
                <Text style={styles.webEmptyTitle}>No Tests Found</Text>
                <Text style={styles.webEmptyDesc}>
                  No tests matching your search in {currentCity}.
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterActionBtn}
                  onPress={resetAllFilters}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetFilterActionBtnText}>Reset Filter</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  // ===========================================================================
  // RENDER: BOOKINGS & REPORTS VIEW (WEB)
  // ===========================================================================
  const renderWebBookings = () => {
    return (
      <View style={styles.webTabContentBox}>
        <View style={styles.webTabHeader}>
          <Text style={styles.webTabHeaderTitle}>My Lab Test Bookings</Text>
          <View style={styles.tabFiltersRow}>
            {['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabFilterBtn, bookingsFilter === tab && styles.tabFilterBtnActive]}
                onPress={() => setBookingsFilter(tab)}
              >
                <Text style={[styles.tabFilterText, bookingsFilter === tab && styles.tabFilterTextActive]}>
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.webBookingsGrid}>
          {bookingsList.map((b) => (
            <View key={b.id} style={styles.webBookingCard}>
              <View style={styles.bookingCardHeader}>
                <Text style={styles.bookingIdText}>{b.id}</Text>
                <Text style={styles.statusBadgeText}>{b.status}</Text>
              </View>
              <Text style={styles.bookingTestName}>{b.testName}</Text>
              <Text style={styles.bookingDetailLabel}>Date & Time: {b.bookingDate} ({b.timeSlot})</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 }}>
                <Ionicons
                  name={b.collectionMethod === 'HOME' ? 'home-outline' : 'business-outline'}
                  size={14}
                  color="#64748B"
                />
                <Text style={styles.bookingDetailLabel}>
                  Method: {b.collectionMethod === 'HOME' ? `Home Collection (${b.collectionAddress})` : `Diagnostic Centre (${b.diagnosticCentre?.name})`}
                </Text>
              </View>
              {b.collectionMethod === 'CENTRE' && (() => {
                const c = DIAGNOSTIC_CENTRES.find(dc => dc.name === b.diagnosticCentre?.name) || b.diagnosticCentre;
                return (
                  <View style={{ backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1', borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                        🏥 {c?.name || 'Diagnostic Centre'}
                      </Text>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0D9488', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 }}
                        onPress={() => handleOpenDirections(c)}
                        accessibilityRole="link"
                        accessibilityLabel="Get Directions to Centre"
                      >
                        <Ionicons name="navigate" size={13} color="#FFFFFF" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Get Directions</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                      📍 {c?.address || b.diagnosticCentre?.location || 'Mysuru Centre'}
                    </Text>
                  </View>
                );
              })()}
              <Text style={styles.bookingPriceVal}>Paid: ₹{b.amountPaid}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {b.collectionMethod === 'CENTRE' && (() => {
                  const c = DIAGNOSTIC_CENTRES.find(dc => dc.name === b.diagnosticCentre?.name) || b.diagnosticCentre;
                  return (
                    <TouchableOpacity
                      style={[styles.modalSecondaryBtn, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderColor: '#0D9488' }]}
                      onPress={() => handleOpenDirections(c)}
                    >
                      <Ionicons name="navigate-outline" size={14} color="#0D9488" />
                      <Text style={[styles.modalSecondaryBtnText, { color: '#0D9488' }]}>Directions</Text>
                    </TouchableOpacity>
                  );
                })()}
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { flex: 1, marginTop: 0 }]}
                  onPress={() => setSelectedTrackingBooking(b)}
                >
                  <Text style={styles.modalPrimaryBtnText}>Track Sample Status</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderWebReports = () => {
    return (
      <View style={styles.webTabContentBox}>
        <View style={styles.webTabHeader}>
          <Text style={styles.webTabHeaderTitle}>My Lab Test Reports</Text>
          <Text style={styles.webSectionSub}>Download digitally signed clinical test reports</Text>
        </View>

        <View style={styles.webBookingsGrid}>
          {reportsList.map((rep) => (
            <View key={rep.id} style={styles.webReportCard}>
              <View style={styles.reportCardTop}>
                <Text style={styles.reportCardId}>{rep.id}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={13} color="#00BB95" />
                  <Text style={styles.reportReadyPillText}>Verified & Released</Text>
                </View>
              </View>
              <Text style={styles.reportTestName}>{rep.testName}</Text>
              <Text style={styles.reportMetaLabel}>Lab: {rep.labName}</Text>
              <Text style={styles.reportMetaLabel}>Collected: {rep.sampleCollectionDate}</Text>
              <Text style={styles.reportMetaLabel}>Reported: {rep.reportDate}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={styles.reportDownloadBtn} onPress={() => setShowDownloadToast(true)}>
                  <Ionicons name="download" size={14} color="#00BB95" />
                  <Text style={styles.reportDownloadBtnText}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reportViewFullBtn} onPress={() => setSelectedReport(rep)}>
                  <Text style={styles.reportViewFullBtnText}>View Full Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {!isDesktop && (
        <View style={styles.mobileHeaderBar}>
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
          <Text style={styles.mobileHeaderTitle}>Lab Tests & Packages</Text>
          <TouchableOpacity
            style={styles.headerCartBtn}
            onPress={() => navigation?.navigate('Cart', { initialTab: 'lab' })}
            activeOpacity={0.8}
            accessibilityLabel="Cart"
          >
            <Ionicons name="cart-outline" size={22} color="#0F172A" />
            {labCartCount > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>
                  {labCartCount > 99 ? '99+' : labCartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        ref={mainScrollRef}
        style={styles.scrollContainer}
        contentContainerStyle={{
          paddingBottom: labCartCount > 0 ? (isDesktop ? 100 : Math.max(insets.bottom + 90, 100)) : 60,
        }}
      >
        {renderWebBrowse()}
        {activeTab === 'BOOKINGS' && renderWebBookings()}
        {activeTab === 'REPORTS' && renderWebReports()}

        {/* Integrated MediUnify Web Footer */}
        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* ─── MODAL 1: TEST DETAILS ─── */}
      {selectedTest && (
        <Modal visible={!!selectedTest} animationType="fade" transparent onRequestClose={() => setSelectedTest(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailsModalContent}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderTitle} numberOfLines={2}>{selectedTest.name}</Text>
                  <Text style={styles.modalHeaderSubtitle}>Clinical Laboratory Assay</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedTest(null)}>
                  <Ionicons name="close" size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <View style={styles.detailsSectionBlock}>
                  <Text style={styles.detailsBlockTitle}>Clinical Overview</Text>
                  <Text style={styles.detailsBlockDesc}>{selectedTest.description}</Text>
                </View>
                <View style={styles.applicabilityRow}>
                  <View style={styles.appliBadge}><Text style={styles.appliBadgeText}>Gender: {selectedTest.genderApplicability}</Text></View>
                  <View style={styles.appliBadge}><Text style={styles.appliBadgeText}>Sample: {selectedTest.sampleType}</Text></View>
                </View>
                <View style={styles.instructionCard}>
                  <Text style={styles.instructionTitle}>Fasting Requirement</Text>
                  <Text style={styles.instructionBody}>{selectedTest.fastingRequirement}</Text>
                </View>
                <View style={styles.instructionCard}>
                  <Text style={styles.instructionTitle}>Preparation Instructions</Text>
                  <Text style={styles.instructionBody}>{selectedTest.preparation}</Text>
                </View>
                <View style={styles.detailsTwoColGrid}>
                  <View style={styles.detailsColBox}>
                    <Text style={styles.colBoxTitle}>Timing</Text>
                    <Text style={styles.colBoxVal}>{selectedTest.timingInstructions}</Text>
                  </View>
                  <View style={styles.detailsColBox}>
                    <Text style={styles.colBoxTitle}>Expected Report TAT</Text>
                    <Text style={styles.colBoxVal}>{selectedTest.reportTAT}</Text>
                  </View>
                </View>
              </ScrollView>
              <View style={styles.modalFooterRow}>
                <View>
                  <Text style={styles.modalPriceText}>₹{selectedTest.price}</Text>
                  {selectedTest.mrp && <Text style={styles.modalMrpText}>₹{selectedTest.mrp}</Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[
                      styles.webAddToCartBtn,
                      isTestInCart(selectedTest.id) && styles.webAddToCartBtnActive,
                      { paddingVertical: 10, paddingHorizontal: 16 },
                    ]}
                    onPress={() => handleToggleCartTest(selectedTest)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={isTestInCart(selectedTest.id) ? 'checkmark-circle' : 'cart-outline'}
                      size={15}
                      color={isTestInCart(selectedTest.id) ? '#FFFFFF' : '#00BB95'}
                    />
                    <Text
                      style={[
                        styles.webAddToCartBtnText,
                        isTestInCart(selectedTest.id) && styles.webAddToCartBtnTextActive,
                        { fontSize: 13 },
                      ]}
                    >
                      {isTestInCart(selectedTest.id) ? 'In Cart' : 'Add to Cart'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => { const t = selectedTest; setSelectedTest(null); startBooking(t); }}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Proceed to Book →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── MODAL 2: PACKAGE DETAILS ─── */}
      {selectedPackage && (
        <Modal visible={!!selectedPackage} animationType="fade" transparent onRequestClose={() => setSelectedPackage(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.detailsModalContent, { maxWidth: 680 }]}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ backgroundColor: '#00BB95', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{selectedPackage.code}</Text>
                    </View>
                    <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#64748B' }}>{selectedPackage.category}</Text>
                  </View>
                  <Text style={styles.modalHeaderTitle}>{selectedPackage.name}</Text>
                  <Text style={styles.modalHeaderSubtitle}>
                    {selectedPackage.testsCount || selectedPackage.tests?.length || selectedPackage.includedCount} Tests Included • {selectedPackage.tatSummary || 'Same Day Reports'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedPackage(null); setExpandedTestIndex(null); }}>
                  <Ionicons name="close" size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Clinical / Pricing Note Box */}
                {Boolean(selectedPackage.clinicalNote) && (
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="information-circle" size={16} color="#1E3A8A" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Clinical / Pricing Note</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>{selectedPackage.clinicalNote}</Text>
                  </View>
                )}

                {/* Key Spec Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  <View style={{ flex: 1, minWidth: 140, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#DCFCE7' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="time-outline" size={13} color="#00BB95" />
                      <Text style={{ fontSize: 11, color: '#00BB95', fontWeight: '700' }}>Turnaround Time (TAT)</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '600', marginTop: 2 }}>{selectedPackage.tatSummary || '6–8 Hours'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 140, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#DBEAFE' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="flask-outline" size={13} color="#1E3A8A" />
                      <Text style={{ fontSize: 11, color: '#1E3A8A', fontWeight: '700' }}>Sample Required</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#0F172A', fontWeight: '600', marginTop: 2 }}>{selectedPackage.sampleSummary || 'Blood / Urine'}</Text>
                  </View>
                  <View style={{ width: '100%', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FEF3C7' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="restaurant-outline" size={13} color="#D97706" />
                      <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}>Preparation Instructions</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#0F172A', marginTop: 2 }}>{selectedPackage.preparationSummary || 'No special fasting required.'}</Text>
                  </View>
                </View>

                {/* Expandable Test Parameters Section */}
                <Text style={[styles.includedSectionHeader, { marginBottom: 6 }]}>
                  Included Tests & Panels ({selectedPackage.tests?.length || selectedPackage.testsCount})
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12 }}>
                  Tap any test to expand its parameters, sample tube, and clinical preparation requirements.
                </Text>

                {selectedPackage.tests && selectedPackage.tests.map((testItem, idx) => {
                  const isExpanded = expandedTestIndex === idx;
                  return (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isExpanded ? '#00BB95' : '#E2E8F0',
                        borderRadius: 10,
                        marginBottom: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                        }}
                        onPress={() => setExpandedTestIndex(isExpanded ? null : idx)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <Ionicons name="checkmark-circle" size={18} color="#00BB95" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{testItem.name}</Text>
                            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }} numberOfLines={isExpanded ? undefined : 1}>
                              {testItem.parameters}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 12, backgroundColor: '#FFFFFF' }}>
                          <View style={{ marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Ionicons name="list-outline" size={13} color="#475569" />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Included Parameters:</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#0F172A', marginTop: 2, lineHeight: 17 }}>{testItem.parameters}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                            <View style={{ minWidth: 120 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="flask-outline" size={12} color="#64748B" />
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>Sample Required:</Text>
                              </View>
                              <Text style={{ fontSize: 11.5, color: '#0F172A' }}>{testItem.sample}</Text>
                            </View>
                            <View style={{ minWidth: 120 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="flask-outline" size={12} color="#64748B" />
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>Tube / Container:</Text>
                              </View>
                              <Text style={{ fontSize: 11.5, color: '#0F172A' }}>{testItem.tube}</Text>
                            </View>
                            <View style={{ minWidth: 120 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="time-outline" size={12} color="#64748B" />
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>Turnaround Time:</Text>
                              </View>
                              <Text style={{ fontSize: 11.5, color: '#0F172A' }}>{testItem.tat}</Text>
                            </View>
                            <View style={{ width: '100%' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="restaurant-outline" size={12} color="#64748B" />
                                <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>Preparation:</Text>
                              </View>
                              <Text style={{ fontSize: 11.5, color: '#0F172A' }}>{testItem.preparation}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooterRow}>
                <View>
                  <Text style={styles.modalPriceText}>₹{selectedPackage.price}</Text>
                  <Text style={styles.modalMrpText}>₹{selectedPackage.mrp || Math.round(selectedPackage.price * 1.5)}</Text>
                  {Boolean(selectedPackage.discount) && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#00BB95' }}>{selectedPackage.discount}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[
                      styles.webAddToCartBtn,
                      isTestInCart(selectedPackage.id) && styles.webAddToCartBtnActive,
                      { paddingVertical: 10, paddingHorizontal: 16 },
                    ]}
                    onPress={() => handleToggleCartPackage(selectedPackage)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={isTestInCart(selectedPackage.id) ? 'checkmark-circle' : 'cart-outline'}
                      size={15}
                      color={isTestInCart(selectedPackage.id) ? '#FFFFFF' : '#00BB95'}
                    />
                    <Text
                      style={[
                        styles.webAddToCartBtnText,
                        isTestInCart(selectedPackage.id) && styles.webAddToCartBtnTextActive,
                        { fontSize: 13 },
                      ]}
                    >
                      {isTestInCart(selectedPackage.id) ? 'In Cart' : 'Add to Cart'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => {
                      const pkgToBook = selectedPackage;
                      setSelectedPackage(null);
                      setExpandedTestIndex(null);
                      startBooking(pkgToBook);
                    }}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Book Package Now →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── MODAL 3: BOOKING FLOW ─── */}
      {activeBookingTest && (() => {
        const test = activeBookingTest;
        const isHome = collectionMethod === 'HOME';
        const testPrice = test.price;
        const collectionFee = isHome ? 100 : 0;
        const totalPrice = testPrice + collectionFee;
        const availableDates = getAvailableDates();
        const selectedCentre =
          availableCentres.find((c) => c.id === selectedCentreId) ||
          ALL_CITY_DIAGNOSTIC_CENTRES.find((c) => c.id === selectedCentreId) ||
          availableCentres[0];
        return (
          <Modal visible={!!activeBookingTest} animationType="fade" transparent onRequestClose={() => setActiveBookingTest(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.bookingModalContent}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingStepHeaderTitle}>
                      {bookingFlowStep === 1 ? '1. Collection Method' : bookingFlowStep === 2 ? '2. Date & Slot' : bookingFlowStep === 3 ? '3. Summary' : bookingFlowStep === 4 ? '4. Payment' : 'Confirmed!'}
                    </Text>
                    <Text style={styles.bookingStepHeaderSub}>{test.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveBookingTest(null)}>
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                {/* STEP 1 */}
                {bookingFlowStep === 1 && (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={[styles.stepPromptText, { marginBottom: 0 }]}>1. Select Patient Profile</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveBookingTest(null);
                          if (navigation && navigation.navigate) {
                            navigation.navigate('FamilyProfiles');
                          }
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 5,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: '#E6F8F4',
                          borderWidth: 1,
                          borderColor: '#A3E9D9',
                          cursor: 'pointer',
                        }}
                      >
                        <Ionicons name="person-add-outline" size={13} color="#00BB95" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#00BB95', marginLeft: 4 }}>+ Add Family Member</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                      {patientProfiles.map((p) => {
                        const isP = selectedPatientId === p.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.methodSelectCard,
                              isP && styles.methodSelectCardActive,
                              { flex: 1, minWidth: 180, marginVertical: 0, paddingVertical: 8, paddingHorizontal: 10 },
                            ]}
                            onPress={() => {
                              setSelectedPatientId(p.id);
                              setHomeAddressName(p.name);
                              setHomeAddressPhone(p.phone);
                            }}
                          >
                            <View style={[styles.methodRadio, isP && styles.methodRadioActive]}>
                              {isP && <View style={styles.methodRadioInner} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              <Text style={[styles.methodSelectTitle, { fontSize: 13 }]}>{p.name} ({p.relation})</Text>
                              <Text style={styles.methodSelectSub}>{p.age} yrs • {p.gender}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={[styles.stepPromptText, { marginTop: 8 }]}>2. How would you like to provide your sample?</Text>
                    {test.homeCollection && (
                      <TouchableOpacity style={[styles.methodSelectCard, isHome && styles.methodSelectCardActive]} onPress={() => setCollectionMethod('HOME')}>
                        <View style={[styles.methodRadio, isHome && styles.methodRadioActive]}>{isHome && <View style={styles.methodRadioInner} />}</View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="home-outline" size={16} color="#00BB95" />
                            <Text style={styles.methodSelectTitle}>Home Sample Collection</Text>
                          </View>
                          <Text style={styles.methodSelectSub}>Trained phlebotomist visits your address.</Text>
                          <Text style={styles.methodFeeTag}>Doorstep Fee: ₹100</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    {test.centreCollection && (
                      <TouchableOpacity style={[styles.methodSelectCard, !isHome && styles.methodSelectCardActive]} onPress={() => setCollectionMethod('CENTRE')}>
                        <View style={[styles.methodRadio, !isHome && styles.methodRadioActive]}>{!isHome && <View style={styles.methodRadioInner} />}</View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="business-outline" size={16} color="#00BB95" />
                            <Text style={styles.methodSelectTitle}>Diagnostic Centre Visit</Text>
                          </View>
                          <Text style={styles.methodSelectSub}>Walk into any verified lab partner in Mysuru.</Text>
                          <Text style={[styles.methodFeeTag, { color: '#00BB95' }]}>Collection Fee: FREE</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}

                {/* STEP 2 */}
                {bookingFlowStep === 2 && (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                    {isHome ? (
                      <View style={styles.stepBlock}>
                        <View style={styles.manualAddressHeader}>
                          <Ionicons name="home" size={18} color="#00BB95" />
                          <Text style={styles.stepBlockTitle}>Sample Collection Address</Text>
                        </View>
                        <Text style={styles.manualAddressSubtitle}>Enter the address where the phlebotomist should visit</Text>

                        <Text style={styles.addressFieldLabel}>Patient / Contact Name *</Text>
                        <TextInput
                          style={styles.addressFieldInput}
                          placeholder="e.g. Hemanth Gowda"
                          placeholderTextColor="#94A3B8"
                          value={homeAddressName}
                          onChangeText={setHomeAddressName}
                        />

                        <Text style={styles.addressFieldLabel}>Contact Phone *</Text>
                        <TextInput
                          style={styles.addressFieldInput}
                          placeholder="e.g. 9741422544"
                          placeholderTextColor="#94A3B8"
                          value={homeAddressPhone}
                          onChangeText={setHomeAddressPhone}
                        />

                        <Text style={styles.addressFieldLabel}>Flat / House No., Street, Area *</Text>
                        <TextInput
                          style={styles.addressFieldInput}
                          placeholder="e.g. 12/A, 3rd Cross, Vijayanagar"
                          placeholderTextColor="#94A3B8"
                          value={homeAddressFlat}
                          onChangeText={setHomeAddressFlat}
                        />

                        <View style={styles.addressRowFields}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.addressFieldLabel}>City *</Text>
                            <TextInput
                              style={styles.addressFieldInput}
                              placeholder="e.g. Mysuru"
                              placeholderTextColor="#94A3B8"
                              value={homeAddressCity}
                              onChangeText={setHomeAddressCity}
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.addressFieldLabel}>Pincode *</Text>
                            <TextInput
                              style={styles.addressFieldInput}
                              placeholder="e.g. 570023"
                              placeholderTextColor="#94A3B8"
                              value={homeAddressPincode}
                              onChangeText={setHomeAddressPincode}
                            />
                          </View>
                        </View>

                        <Text style={styles.addressFieldLabel}>Landmark (Optional)</Text>
                        <TextInput
                          style={styles.addressFieldInput}
                          placeholder="e.g. Near City Hospital"
                          placeholderTextColor="#94A3B8"
                          value={homeAddressLandmark}
                          onChangeText={setHomeAddressLandmark}
                        />
                      </View>
                    ) : (
                      <View style={styles.stepBlock}>
                        <Text style={styles.stepBlockTitle}>Select Diagnostic Centre ({currentCity})</Text>
                        {availableCentres.map((centre) => {
                          const isSel = selectedCentreId === centre.id;
                          return (
                            <View key={centre.id} style={[styles.centreSelectCard, isSel && styles.centreSelectCardActive]}>
                              <TouchableOpacity
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}
                                onPress={() => setSelectedCentreId(centre.id)}
                              >
                                <Ionicons name="business-outline" size={20} color={isSel ? '#00BB95' : '#64748B'} style={{ marginTop: 2 }} />
                                <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                                  <Text style={styles.centreSelectName}>{centre.name}</Text>
                                  <Text style={styles.centreSelectAddress}>{centre.address}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                      <Ionicons name="star" size={12} color="#FF7F50" />
                                      <Text style={styles.centreMetaText}>{centre.rating} • {centre.distanceKm} km away</Text>
                                    </View>
                                    <Text style={styles.centreMetaText}>•</Text>
                                    <Text style={[styles.centreMetaText, { color: '#00BB95', fontWeight: '600' }]}>{centre.timings}</Text>
                                  </View>
                                </View>
                                {isSel && <Ionicons name="checkmark-circle" size={18} color="#00BB95" />}
                              </TouchableOpacity>

                              <View style={styles.centreCardActionsRow}>
                                <TouchableOpacity
                                  style={styles.modalGetDirectionsBtn}
                                  onPress={(e) => handleOpenDirections(centre, e)}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="navigate-outline" size={13} color="#00BB95" style={{ marginRight: 4 }} />
                                  <Text style={styles.modalGetDirectionsBtnText}>Get Directions</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <View style={styles.stepBlock}>
                      <Text style={styles.stepBlockTitle}>Select Date</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datePillsRow}>
                        {availableDates.map((item) => {
                          const isSel = selectedDate === item.dateStr;
                          return (
                            <TouchableOpacity key={item.dateStr} style={[styles.datePill, isSel && styles.datePillActive]} onPress={() => setSelectedDate(item.dateStr)}>
                              <Text style={[styles.datePillDay, isSel && styles.datePillDayActive]}>{item.dayName}</Text>
                              <Text style={[styles.datePillDate, isSel && styles.datePillDateActive]}>{item.dateStr}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                    <View style={styles.stepBlock}>
                      <Text style={styles.stepBlockTitle}>Available Time Slots</Text>
                      <View style={styles.slotGrid}>
                        {TIME_SLOTS.map((slot) => {
                          const isSel = selectedSlotId === slot.id;
                          const statusObj = getSlotStatus({
                            date: selectedDate,
                            time: slot.label,
                            serviceType: 'lab',
                            providerId: collectionMethod === 'HOME' ? 'home-collection' : selectedCentreId,
                          });
                          const isAvail = statusObj.available;
                          return (
                            <TouchableOpacity
                              key={slot.id}
                              disabled={!isAvail}
                              style={[
                                styles.slotCard,
                                isSel && styles.slotCardActive,
                                !isAvail && styles.slotCardDisabled,
                              ]}
                              onPress={() => isAvail && setSelectedSlotId(slot.id)}
                            >
                              <Text style={[styles.slotLabel, isSel && styles.slotLabelActive, !isAvail && styles.slotLabelDisabled]}>
                                {slot.label}
                              </Text>
                              <Text style={[styles.slotPeriod, !isAvail && styles.slotPeriodDisabled]}>
                                {!isAvail ? (statusObj.status === 'BOOKED' ? 'Booked' : 'Passed') : slot.period}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </ScrollView>
                )}

                {/* STEP 3 */}
                {bookingFlowStep === 3 && (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryHeading}>Booking & Package Summary</Text>
                      {Boolean(test.code) && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Package Code:</Text>
                          <Text style={[styles.summaryVal, { fontWeight: '700', color: '#00BB95' }]}>{test.code}</Text>
                        </View>
                      )}
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Package / Test:</Text>
                        <Text style={[styles.summaryVal, { fontWeight: '700', flex: 1, textAlign: 'right' }]}>{test.name}</Text>
                      </View>
                      {Boolean(test.testsCount) && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Tests Included:</Text>
                          <Text style={styles.summaryVal}>{test.testsCount} Diagnostic Tests & Panels</Text>
                        </View>
                      )}
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Patient Name:</Text>
                        <Text style={styles.summaryVal}>{homeAddressName || patientProfiles.find((p) => p.id === selectedPatientId)?.name || 'Patient'} ({patientProfiles.find((p) => p.id === selectedPatientId)?.relation || 'Self'})</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Method:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name={isHome ? 'home-outline' : 'business-outline'} size={14} color="#00BB95" />
                          <Text style={styles.summaryVal}>{isHome ? 'Home' : 'Diagnostic Centre'}</Text>
                        </View>
                      </View>
                      {isHome ? (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Address:</Text>
                          <Text style={styles.summaryVal}>
                            {homeAddressFlat ? `${homeAddressFlat}, ${homeAddressCity} - ${homeAddressPincode}` : 'Not provided'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Centre:</Text>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.summaryVal}>{selectedCentre?.name}</Text>
                            <Text style={[styles.summaryVal, { fontSize: 11.5, color: '#64748B', marginTop: 2, textAlign: 'right' }]}>
                              {selectedCentre?.address}
                            </Text>
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                              onPress={() => handleOpenDirections(selectedCentre)}
                            >
                              <Ionicons name="navigate-outline" size={12} color="#00BB95" />
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#00BB95' }}>Get Directions</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Date & Time:</Text><Text style={styles.summaryVal}>{selectedDate} • {TIME_SLOTS.find((s) => s.id === selectedSlotId)?.label}</Text></View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Test Fee:</Text><Text style={styles.summaryVal}>₹{testPrice}</Text></View>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Collection:</Text><Text style={styles.summaryVal}>{collectionFee === 0 ? 'FREE' : `₹${collectionFee}`}</Text></View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryTotalRow}><Text style={styles.summaryTotalLabel}>Total:</Text><Text style={styles.summaryTotalVal}>₹{totalPrice}</Text></View>
                    </View>
                  </ScrollView>
                )}

                {/* STEP 4 */}
                {bookingFlowStep === 4 && (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                    <View style={styles.demoPaymentAlert}>
                      <Ionicons name="information-circle" size={18} color="#1E3A8A" />
                      <Text style={styles.demoPaymentAlertText}>Frontend prototype: No real payment will occur.</Text>
                    </View>
                    <Text style={styles.stepBlockTitle}>Select Payment Method</Text>
                    {[
                      { id: 'UPI', label: 'UPI / Google Pay / PhonePe', icon: 'flash' },
                      { id: 'CARD', label: 'Credit / Debit Card', icon: 'card' },
                      { id: 'NET_BANKING', label: 'Net Banking', icon: 'globe' },
                      { id: 'WALLET', label: 'Pay at Sample Collection', icon: 'wallet' },
                    ].map((m) => {
                      const isSel = paymentMethod === m.id;
                      return (
                        <TouchableOpacity key={m.id} style={[styles.paymentMethodCard, isSel && styles.paymentMethodCardActive]} onPress={() => setPaymentMethod(m.id)}>
                          <Ionicons name={m.icon} size={20} color={isSel ? '#00BB95' : '#64748B'} />
                          <Text style={[styles.paymentMethodLabel, isSel && styles.paymentMethodLabelActive]}>{m.label}</Text>
                          {isSel && <Ionicons name="checkmark-circle" size={18} color="#00BB95" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* STEP 5: CONFIRMED */}
                {bookingFlowStep === 5 && confirmedBookingData && (
                  <View style={styles.confirmedBox}>
                    <Ionicons name="checkmark-circle" size={60} color="#00BB95" />
                    <Text style={styles.confirmedTitle}>Booking Confirmed!</Text>
                    <Text style={styles.confirmedBookingId}>Booking ID: {confirmedBookingData.id}</Text>
                    <Text style={styles.confirmedDesc}>
                      {confirmedBookingData.testName} booked for {confirmedBookingData.bookingDate} ({confirmedBookingData.timeSlot}).
                    </Text>

                    {confirmedBookingData.collectionMethod === 'CENTRE' && selectedCentre && (
                      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', width: '100%', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Ionicons name="business" size={16} color="#00BB95" />
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>{selectedCentre.name}</Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#64748B', textAlign: 'center', marginBottom: 8 }}>{selectedCentre.address}</Text>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00BB95', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
                          onPress={() => handleOpenDirections(selectedCentre)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="navigate" size={14} color="#FFFFFF" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Get Directions in Google Maps</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.viewBookingsConfirmedBtn}
                      onPress={() => {
                        setActiveBookingTest(null);
                        if (navigation?.navigate) {
                          navigation.navigate('MyTests', { initialTab: 'lab' });
                        } else {
                          setActiveTab('BOOKINGS');
                        }
                      }}
                    >
                      <Text style={styles.viewBookingsConfirmedBtnText}>View My Lab Test Bookings →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {bookingFlowStep < 5 && (
                  <View style={styles.modalFooterRow}>
                    {bookingFlowStep > 1 && (
                      <TouchableOpacity style={styles.stepBackBtn} onPress={() => setBookingFlowStep(bookingFlowStep - 1)}>
                        <Text style={styles.stepBackBtnText}>Back</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.modalPrimaryBtn, { flex: 1, marginLeft: bookingFlowStep > 1 ? 10 : 0 }]}
                      onPress={() => {
                        if (bookingFlowStep === 1) setBookingFlowStep(2);
                        else if (bookingFlowStep === 2) {
                          if (collectionMethod === 'HOME' && (!homeAddressName.trim() || !homeAddressPhone.trim() || !homeAddressFlat.trim() || !homeAddressCity.trim() || !homeAddressPincode.trim())) {
                            showAlert('Incomplete Details', 'Please fill in Patient Name, Phone, Address, City and Pincode for home sample collection.');
                            return;
                          }
                          setBookingFlowStep(3);
                        }
                        else if (bookingFlowStep === 3) setBookingFlowStep(4);
                        else if (bookingFlowStep === 4) handleSimulatePayment();
                      }}
                    >
                      <Text style={styles.modalPrimaryBtnText}>
                        {bookingFlowStep === 1 ? 'Continue to Slots' : bookingFlowStep === 2 ? 'Review Summary' : bookingFlowStep === 3 ? 'Proceed to Pay' : `Pay ₹${totalPrice}`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* ─── MODAL 4: TRACKING ─── */}
      {selectedTrackingBooking && (() => {
        const b = selectedTrackingBooking;
        const stages = [
          { id: 1, title: 'Test Booked', desc: 'Booking confirmed' },
          { id: 2, title: 'Sample Collection Scheduled', desc: `${b.bookingDate}, ${b.timeSlot}` },
          { id: 3, title: 'Sample Collected', desc: 'Barcoded, temperature transport' },
          { id: 4, title: 'Lab Processing', desc: 'Automated clinical analyzers' },
          { id: 5, title: 'Report Ready', desc: 'Verified by Pathologist & available online' },
        ];
        return (
          <Modal visible={!!selectedTrackingBooking} animationType="fade" transparent onRequestClose={() => setSelectedTrackingBooking(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.detailsModalContent}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalHeaderTitle}>Sample Tracking</Text>
                    <Text style={styles.modalHeaderSubtitle}>Booking ID: {b.id}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTrackingBooking(null)}>
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  <Text style={styles.trackingTestTitle}>{b.testName}</Text>
                  {b.collectionMethod === 'CENTRE' && b.diagnosticCentre && (
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                          <Ionicons name="business" size={15} color="#00BB95" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{b.diagnosticCentre.name}</Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: '#64748B' }}>{b.diagnosticCentre.location || b.diagnosticCentre.address}</Text>
                      </View>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#00BB95', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 }}
                        onPress={() => {
                          const c = DIAGNOSTIC_CENTRES.find(dc => dc.name === b.diagnosticCentre?.name) || b.diagnosticCentre;
                          handleOpenDirections(c);
                        }}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="navigate" size={13} color="#FFFFFF" />
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>Get Directions</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.timelineContainer}>
                    {stages.map((stage, idx) => {
                      const isDone = b.trackingStage >= stage.id;
                      const isCurr = b.trackingStage === stage.id;
                      return (
                        <View key={stage.id} style={styles.timelineStepRow}>
                          <View style={styles.timelineIconCol}>
                            <View style={[styles.timelineNode, isDone && styles.timelineNodeDone, isCurr && styles.timelineNodeCurr]}>
                              <Ionicons name={isDone ? 'checkmark' : 'ellipse'} size={12} color="#FFFFFF" />
                            </View>
                            {idx < stages.length - 1 && <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />}
                          </View>
                          <View style={styles.timelineTextCol}>
                            <Text style={[styles.timelineStepTitle, isCurr && styles.timelineStepTitleCurr]}>{stage.title}</Text>
                            <Text style={styles.timelineStepDesc}>{stage.desc}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setSelectedTrackingBooking(null)}>
                  <Text style={styles.modalPrimaryBtnText}>Close Tracker</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* ─── MODAL 5: REPORT VIEWER ─── */}
      {selectedReport && (() => {
        const r = selectedReport;
        return (
          <Modal visible={!!selectedReport} animationType="fade" transparent onRequestClose={() => setSelectedReport(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.reportModalContent}>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reportModalTitle}>{r.testName}</Text>
                    <Text style={styles.reportModalSub}>{r.labName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedReport(null)}>
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  <View style={styles.reportPatientCard}>
                    <View style={styles.reportPatientRow}><Text style={styles.repPatientLabel}>Patient:</Text><Text style={styles.repPatientVal}>{r.patientName} ({r.patientAge}, {r.patientGender})</Text></View>
                    <View style={styles.reportPatientRow}><Text style={styles.repPatientLabel}>Referred By:</Text><Text style={styles.repPatientVal}>{r.doctorReferred}</Text></View>
                    <View style={styles.reportPatientRow}><Text style={styles.repPatientLabel}>Collection Date:</Text><Text style={styles.repPatientVal}>{r.sampleCollectionDate}</Text></View>
                    <View style={styles.reportPatientRow}>
                      <Text style={styles.repPatientLabel}>Status:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={13} color="#00BB95" />
                        <Text style={[styles.repPatientVal, { color: '#00BB95', fontWeight: '700' }]}>Verified & Released</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.tableHeading}>Observed Test Parameters</Text>
                  <View style={styles.paramsTable}>
                    <View style={styles.paramsTableHeader}>
                      <Text style={[styles.paramsTableColHeader, { flex: 2.2 }]}>Parameter</Text>
                      <Text style={[styles.paramsTableColHeader, { flex: 1.2, textAlign: 'right' }]}>Result</Text>
                      <Text style={[styles.paramsTableColHeader, { flex: 1.8, textAlign: 'right' }]}>Ref Range</Text>
                    </View>
                    {r.parameters.map((param, pIdx) => (
                      <View key={pIdx} style={styles.paramTableRow}>
                        <View style={{ flex: 2.2 }}>
                          <Text style={styles.paramNameText}>{param.name}</Text>
                          <Text style={styles.paramUnitText}>{param.unit}</Text>
                        </View>
                        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                          <Text style={[styles.paramResultText, param.status === 'BORDERLINE' && { color: '#D97706' }]}>{param.observed}</Text>
                        </View>
                        <Text style={[styles.paramRefText, { flex: 1.8 }]}>{param.reference}</Text>
                      </View>
                    ))}
                  </View>
                  {r.clinicalConclusion && (
                    <View style={styles.conclusionCard}>
                      <Text style={styles.conclusionTitle}>Pathologist Impression:</Text>
                      <Text style={styles.conclusionText}>{r.clinicalConclusion}</Text>
                    </View>
                  )}
                </ScrollView>
                <View style={styles.reportModalFooter}>
                  <TouchableOpacity style={styles.reportDownloadModalBtn} onPress={() => { setShowDownloadToast(true); setTimeout(() => setShowDownloadToast(false), 3000); }}>
                    <Ionicons name="download" size={16} color="#00BB95" />
                    <Text style={styles.reportDownloadModalBtnText}>Download PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportMyHealthBtn} onPress={() => { setSelectedReport(null); navigation?.navigate?.('HealthRecords'); }}>
                    <Ionicons name="heart" size={16} color="#FFFFFF" />
                    <Text style={styles.reportMyHealthBtnText}>View in My Health</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}


      {/* FLOATING LAB CART BAR */}
      {labCartCount > 0 && (
        <View
          style={[
            styles.webFloatingCartBar,
            !isDesktop && { bottom: Math.max(insets.bottom + 12, 16) },
          ]}
        >
          <View style={styles.floatingCartLeft}>
            <View style={styles.floatingCartIconCircle}>
              <Ionicons name="flask" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.floatingCartTitle} numberOfLines={1}>
                {labCartCount} Diagnostic Test{labCartCount > 1 ? 's' : ''} in Cart
              </Text>
              <Text style={styles.floatingCartSubtitle} numberOfLines={1}>
                Total: ₹{labFinalTotal.toLocaleString('en-IN')} • Doorstep Sample Collection
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.floatingCartBtn}
            onPress={() => navigation.navigate('Cart', { initialTab: 'lab' })}
            activeOpacity={0.88}
          >
            <Text style={styles.floatingCartBtnText}>View Lab Cart</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Download Toast */}
      {showDownloadToast && (
        <View style={styles.downloadToast}>
          <Ionicons name="cloud-download" size={16} color="#FFFFFF" />
          <Text style={styles.downloadToastText}>Report downloaded successfully.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mobileHeaderBar: {
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
  headerCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#00BB95',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  webAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF4',
  },
  webAddToCartBtnActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  webAddToCartBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00BB95',
  },
  webAddToCartBtnTextActive: {
    color: '#FFFFFF',
  },
  webFloatingCartBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    maxWidth: 680,
    alignSelf: 'center',
    marginHorizontal: 'auto',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
  floatingCartLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingCartIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00BB95',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  floatingCartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingCartSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  floatingCartBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00BB95',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: 8,
  },
  floatingCartBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#F1F8F6',
  },
  webHeaderBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7EC',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  webHeaderInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webHeaderLogoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  webHeaderSub: {
    fontSize: 12,
    color: '#64748B',
  },
  webTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  webTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FAFCFD',
    gap: 6,
  },
  webTabBtnActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#00BB95',
  },
  webTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  webTabBtnTextActive: {
    color: '#00BB95',
    fontWeight: '700',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F1F8F6',
  },
  webMainContentWrapper: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 80,
  },
  // Rich Colorful Hero Banner Section
  webHeroBanner: {
    backgroundColor: '#00BB95',
    ...(Platform.OS === 'web'
      ? {
        background: 'linear-gradient(135deg, #00A885 0%, #00BB95 50%, #15D4AA 100%)',
      }
      : {}),
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#00BB95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  heroTitleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
    minWidth: 280,
  },
  heroBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroVerifiedBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroMainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 19,
    maxWidth: 620,
  },
  heroCityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCityStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00BB95',
    marginRight: 8,
  },
  heroCityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroCityValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00BB95',
  },
  heroPerksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 18,
    gap: 12,
  },
  heroPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroPerkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroPerkDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  webSearchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    padding: 0,
    margin: 0,
  },
  // 10 Sliding Health Condition Cards
  conditionsSectionWrap: {
    marginBottom: 20,
  },
  conditionsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  conditionsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  conditionsCountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  conditionsCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00BB95',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2ED',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD8CC',
  },
  activeFilterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FF7F50',
  },
  browseCardsRow: {
    position: 'relative',
    width: '100%',
  },
  browseCardsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 40,
    paddingVertical: 4,
  },
  browseBannerCard: {
    width: 290,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 4,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    cursor: 'pointer',
  },
  browseBannerCardActive: {
    borderWidth: 3,
    borderColor: '#0F172A',
    shadowOpacity: 0.25,
    transform: [{ scale: 1.02 }],
  },
  cardBackdropGlow: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  bannerMicroPill: {
    position: 'absolute',
    top: 10,
    left: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    zIndex: 4,
  },
  bannerMicroPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  bannerTextCol: {
    zIndex: 3,
    justifyContent: 'center',
    maxWidth: '56%',
    paddingTop: 18,
  },
  bannerTitlePrimary: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  bannerTitleSecondary: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  bannerTagline: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 4,
    fontWeight: '600',
  },
  bannerExploreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  bannerExploreChipActive: {
    backgroundColor: '#0F172A',
  },
  bannerExploreText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerImageContainer: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageBackdropDisc: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerCutoutImage: {
    width: '100%',
    height: '100%',
    borderRadius: 49,
  },
  carouselPrevBtn: {
    position: 'absolute',
    left: -14,
    top: '50%',
    transform: [{ translateY: -19 }],
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    cursor: 'pointer',
  },
  carouselNextBtn: {
    position: 'absolute',
    right: -14,
    top: '50%',
    transform: [{ translateY: -19 }],
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    cursor: 'pointer',
  },
  quickSearchTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  quickSearchLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
  },
  quickSearchChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  quickSearchChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  webHeaderSection: {
    marginBottom: 20,
  },
  webHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  webHeaderTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  titleAndLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 2,
  },
  selectedCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 14,
  },
  selectedCityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
  },
  webHeaderTitleRow: {
    marginBottom: 16,
  },
  webPageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  webPageSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 18,
  },
  // Popular Tests Section
  popularSectionWrap: {
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popularHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  popularHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  popularSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  popularCategorySub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  popularViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  popularViewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00BB95',
  },
  popularCardsScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  popularCardItem: {
    width: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    justifyContent: 'space-between',
  },
  popCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  popCategoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    maxWidth: '65%',
  },
  popCategoryText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00BB95',
    textTransform: 'uppercase',
  },
  popDiscountBadge: {
    backgroundColor: '#FFF2ED',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popDiscountText: {
    color: '#FF7F50',
    fontSize: 9.5,
    fontWeight: '800',
  },
  popCardContent: {
    marginVertical: 4,
  },
  popCardName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  popCardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  popCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  popPriceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  popPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  popMrpText: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  popActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popCartBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popCartBtnActive: {
    backgroundColor: '#00BB95',
  },
  popBookBtn: {
    backgroundColor: '#00BB95',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popBookBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Categories Section
  webCategoriesSection: {
    marginBottom: 18,
  },
  categoriesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoriesSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  resetFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resetFilterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00BB95',
  },
  categoriesScrollWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  categoriesScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  categoryNavBtn: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -17 }],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
    padding: 2,
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  categoryPrevBtn: {
    left: -36,
  },
  categoryNextBtn: {
    right: -36,
  },
  webCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    flexShrink: 0,
    cursor: 'pointer',
  },
  webCategoryChipActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
    shadowColor: '#00BB95',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  webCategoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  webCategoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryCountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  categoryCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00BB95',
  },
  // Results count
  webResultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 4,
  },
  resultsBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resultsBarRightText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00BB95',
  },
  webResultsCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  // Cards Grid
  webCardsGrid: {
    ...(Platform.OS === 'web'
      ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
        gap: 20,
      }
      : {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
      }),
  },
  webCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeaderBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  categoryPillWrap: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '65%',
  },
  cardCategoryText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00BB95',
  },
  cardTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    minHeight: 44,
  },
  cardKeyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  keyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  keyDetailText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  fastingRequiredBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  fastingNotRequiredBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  cardFooterWrap: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 'auto',
    gap: 12,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardMrp: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FFF2ED',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FF7F50',
    fontSize: 11,
    fontWeight: '800',
  },
  cardActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labOrganicCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  labOrganicArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00BB95',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  labOrganicCtaText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#00BB95',
    letterSpacing: 0.1,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cartIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  cartIconBtnActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  cartIconBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
  },
  cartIconBtnTextActive: {
    color: '#FFFFFF',
  },
  inPackageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  inPackageBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#00BB95',
  },
  bookPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BB95',
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 10,
    shadowColor: '#00BB95',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 2,
  },
  bookPrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  webEmptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  webEmptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420,
    marginBottom: 16,
  },
  resetFilterActionBtn: {
    backgroundColor: '#00BB95',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFilterActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webTestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webTestCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webCardBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  webPopularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  webPopularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  webRecommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  webRecommendedBadgeText: {
    color: '#1E3A8A',
    fontSize: 10,
    fontWeight: '700',
  },
  webSampleBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  webSampleBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  webCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  webCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
  },
  webAvailBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F8FB',
    borderRadius: 8,
    padding: 8,
    gap: 12,
    marginBottom: 12,
  },
  webAvailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  webAvailText: {
    fontSize: 11,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  webAvailTextDisabled: {
    color: '#94A3B8',
  },
  webCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DCE7EC',
    paddingTop: 10,
  },
  webPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00BB95',
  },
  webMrpText: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  webTatText: {
    fontSize: 11,
    color: '#64748B',
  },
  webDetailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F8FB',
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  webDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  webBookBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#00BB95',
  },
  webBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webEmptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  webEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 10,
  },
  webEmptyDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  webPaginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
    marginBottom: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
  },
  webPageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
    cursor: 'pointer',
  },
  webPageNavBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  webPageNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  webPageNavBtnTextDisabled: {
    color: '#94A3B8',
  },
  webPageNumBtn: {
    minWidth: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
    cursor: 'pointer',
  },
  webPageNumBtnActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
    boxShadow: '0 4px 10px rgba(0, 184, 148, 0.28)',
  },
  webPageNumText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#334155',
  },
  webPageNumTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  webTabContentBox: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 140,
  },
  webTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  webTabHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabFiltersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tabFilterBtnActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  tabFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  webBookingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webBookingCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00BB95',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookingTestName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  bookingDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
  },
  bookingPriceVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00BB95',
    marginTop: 4,
  },
  modalPrimaryBtn: {
    backgroundColor: '#00BB95',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  webReportCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportCardId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  reportReadyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reportTestName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  reportMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  reportDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  reportDownloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
  },
  reportViewFullBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#00BB95',
  },
  reportViewFullBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── MODAL SHARED ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  detailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  bookingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  reportModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  addAddressModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalPriceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00BB95',
  },
  modalMrpText: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  modalPrimaryBtn: {
    backgroundColor: '#00BB95',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ─── TEST DETAILS MODAL ───────────────────────────────────────────
  detailsSectionBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  detailsBlockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  detailsBlockDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  applicabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  appliBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  appliBadgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  instructionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  instructionBody: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  detailsTwoColGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  detailsColBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  colBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  colBoxVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },

  // ─── PACKAGE MODAL ───────────────────────────────────────────────
  packageModalDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
  },
  includedSectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  includedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  includedItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  includedItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  includedItemDetailsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00BB95',
    marginLeft: 8,
  },

  // ─── BOOKING FLOW ────────────────────────────────────────────────
  bookingStepHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookingStepHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stepPromptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 14,
    marginTop: 4,
  },
  methodSelectCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  methodSelectCardActive: {
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  methodRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  methodRadioActive: { borderColor: '#00BB95' },
  methodRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00BB95',
  },
  methodSelectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  methodSelectSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 6,
  },
  methodFeeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepBlock: {
    marginBottom: 16,
  },
  stepBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepBlockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  addAddressLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BB95',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  addressCardActive: {
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  addressTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  addressLineText: {
    fontSize: 12,
    color: '#64748B',
  },
  centreSelectCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  centreSelectCardActive: {
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  centreSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  centreSelectAddress: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 3,
  },
  centreMetaRow: {
    flexDirection: 'row',
    gap: 6,
  },
  centreMetaText: {
    fontSize: 11,
    color: '#00BB95',
    fontWeight: '600',
  },
  datePillsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minWidth: 60,
  },
  datePillActive: {
    borderColor: '#00BB95',
    backgroundColor: '#00BB95',
  },
  datePillDay: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  datePillDayActive: { color: '#FFFFFF' },
  datePillDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  datePillDateActive: { color: '#FFFFFF' },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    minWidth: 120,
    alignItems: 'center',
  },
  slotCardActive: {
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  slotCardDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  slotLabelActive: { color: '#00BB95' },
  slotLabelDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  slotPeriod: {
    fontSize: 10,
    color: '#64748B',
  },
  slotPeriodDisabled: {
    color: '#EF4444',
    fontWeight: '700',
  },

  // ─── SUMMARY ─────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  summaryHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '55%',
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00BB95',
  },

  // ─── PAYMENT ─────────────────────────────────────────────────────
  demoPaymentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  demoPaymentAlertText: {
    fontSize: 12,
    color: '#1E3A8A',
    flex: 1,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  paymentMethodCardActive: {
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  paymentMethodLabelActive: { color: '#00BB95' },
  stepBackBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  // ─── CONFIRMED ───────────────────────────────────────────────────
  confirmedBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  confirmedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 6,
  },
  confirmedBookingId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BB95',
    marginBottom: 10,
  },
  confirmedDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  viewBookingsConfirmedBtn: {
    backgroundColor: '#00BB95',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  viewBookingsConfirmedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ─── TRACKING ────────────────────────────────────────────────────
  trackingTestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineStepRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeDone: { backgroundColor: '#00BB95' },
  timelineNodeCurr: { backgroundColor: '#1E3A8A' },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 2,
    minHeight: 20,
  },
  timelineLineDone: { backgroundColor: '#00BB95' },
  timelineTextCol: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 16,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  timelineStepTitleCurr: { color: '#1E3A8A' },
  timelineStepDesc: {
    fontSize: 11,
    color: '#64748B',
  },

  // ─── REPORT VIEWER ───────────────────────────────────────────────
  reportModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  reportModalSub: {
    fontSize: 12,
    color: '#64748B',
  },
  reportPatientCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  reportPatientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  repPatientLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  repPatientVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  tableHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  paramsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  paramsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  paramsTableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  paramTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paramNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  paramUnitText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  paramUnitSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  paramResultText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00BB95',
  },
  paramRefText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },
  conclusionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  conclusionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  conclusionText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  reportModalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reportDownloadModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  reportDownloadModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BB95',
  },
  reportMyHealthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#00BB95',
  },
  reportMyHealthBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── ADD ADDRESS ─────────────────────────────────────────────────
  addAddressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  tagToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tagToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tagToggleBtnActive: {
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  tagToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tagToggleTextActive: { color: '#00BB95' },
  addressInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  addAddressBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelAddressBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelAddressBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  saveAddressBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#00BB95',
    alignItems: 'center',
  },
  saveAddressBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── TOAST ───────────────────────────────────────────────────────
  downloadToast: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: [{ translateX: -130 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: 260,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  downloadToastText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },

  // ─── MANUAL ADDRESS FORM ───────────────────────────────────────
  manualAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  manualAddressSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  addressFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 5,
    marginTop: 10,
  },
  addressFieldInput: {
    borderWidth: 1.5,
    borderColor: '#DCE7EC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1E3A8A',
    backgroundColor: '#FAFCFD',
  },
  addressRowFields: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },

  // ─── PARTNER DIAGNOSTIC CENTRES SECTION ────────────────────────────
  webCentresSectionWrap: {
    marginTop: 40,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)' } : {}),
  },
  webSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  webSectionSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 4,
    maxWidth: 620,
    lineHeight: 20,
  },
  webLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  webLocationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
  },
  webCentresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  webCentreCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 580,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' } : {}),
  },
  webCentreCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  webCentreIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCentreName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  webCentreLocation: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00BB95',
  },
  webCentreAddressBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  webCentreAddressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webCentreAddressText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  webCentreMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  webCentreMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webCentreMetaPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  webCentreServicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  webCentreServiceTag: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  webCentreServiceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  webCentreActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  webCentreDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BB95',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 6px rgba(0, 184, 148, 0.25)' } : {}),
  },
  webCentreDirectionsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webCentreBookBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00BB95',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  webCentreBookBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00BB95',
  },
  centreCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalGetDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modalGetDirectionsBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00BB95',
  },
});

const LabTestsScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  if (!isDesktopLayout(width)) {
    return <LabTestsScreenMobile {...props} />;
  }
  return <LabTestsScreenWeb {...props} />;
};

export default LabTestsScreenResponsive;
