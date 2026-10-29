import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Platform,
  Modal,
  ActivityIndicator,
  Linking,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../theme/colors';
import { showAlert } from '../../../utils/alert';
import { isGuestUser, promptLoginRequired } from '../../../utils/authHelper';
// WebFooter omitted for native mobile
import WebBackButton from '../../../components/web/WebBackButton';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';
import {
  RADIOLOGY_CATEGORIES,
  RADIOLOGY_TESTS,
  RADIOLOGY_PROVIDERS,
  INITIAL_RADIOLOGY_BOOKINGS,
  RADIOLOGY_3D_ICONS,
  getTestsByCategory,
  getCategoryById,
  getTestById,
  getProvidersForTest,
  getAvailableCategoriesForCity,
  getAvailableTestsForCity,
  RADIOLOGY_CENTRES_FILTERED,
  getGoogleMapsDirectionsUrl,
  normalizeRadiologyCity,
} from '../../../data/radiologyCatalogData';
import {
  getSlotStatus,
  validateAndBookSlot,
  cancelBookedSlot,
  subscribeToSlotChanges,
} from '../../../services/slotBookingService';

const ASYNC_STORAGE_KEY = '@mediunify_radiology_bookings';

// Mock Patient Directory
const DEFAULT_PATIENTS = [
  { id: 'pat-self', name: 'User Profile', relation: 'Self', age: 28, gender: 'Male', phone: '' },
];

const CITIES = ['Mysuru', 'Bengaluru', 'Hassan', 'All Cities'];

const POPULAR_SEARCH_CHIPS = [
  'MRI Brain',
  'Chest X-Ray',
  'CT Chest',
  'Ultrasound Pelvis',
];

// Design tokens per category: Light, clean card colors matching the button color family
const CATEGORY_DESIGN_MAP = {
  mri: {
    gradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 55%, #BAE6FD 100%)',
    bg: '#F0F9FF',
    border: '#7DD3FC',
    cardShadow: 'rgba(2, 132, 199, 0.16)',
    btnGradient: 'linear-gradient(90deg, #0284C7 0%, #0369A1 100%)',
    btnBg: '#0284C7',
    btnShadow: 'rgba(2, 132, 199, 0.35)',
    discBg: '#BAE6FD',
    discGradient: 'linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 100%)',
  },
  ct: {
    gradient: 'linear-gradient(135deg, #F0FDF9 0%, #E6FAF4 55%, #CCFBF1 100%)',
    bg: '#F0FDF9',
    border: '#5EEAD4',
    cardShadow: 'rgba(0, 187, 149, 0.16)',
    btnGradient: 'linear-gradient(90deg, #00BB95 0%, #009E7E 100%)',
    btnBg: '#00BB95',
    btnShadow: 'rgba(0, 187, 149, 0.35)',
    discBg: '#CCFBF1',
    discGradient: 'linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%)',
  },
  xray: {
    gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 55%, #BFDBFE 100%)',
    bg: '#EFF6FF',
    border: '#93C5FD',
    cardShadow: 'rgba(37, 99, 235, 0.16)',
    btnGradient: 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)',
    btnBg: '#1D4ED8',
    btnShadow: 'rgba(37, 99, 235, 0.35)',
    discBg: '#DBEAFE',
    discGradient: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
  },
  usg: {
    gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 55%, #A7F3D0 100%)',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    cardShadow: 'rgba(16, 185, 129, 0.16)',
    btnGradient: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
    btnBg: '#059669',
    btnShadow: 'rgba(16, 185, 129, 0.35)',
    discBg: '#D1FAE5',
    discGradient: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
  },
  mammo: {
    gradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 55%, #FECDD3 100%)',
    bg: '#FFF1F2',
    border: '#FDA4AF',
    cardShadow: 'rgba(225, 29, 72, 0.16)',
    btnGradient: 'linear-gradient(90deg, #F43F5E 0%, #E11D48 100%)',
    btnBg: '#E11D48',
    btnShadow: 'rgba(225, 29, 72, 0.35)',
    discBg: '#FFE4E6',
    discGradient: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
  },
  pet: {
    gradient: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 55%, #A5F3FC 100%)',
    bg: '#ECFEFF',
    border: '#67E8F9',
    cardShadow: 'rgba(8, 145, 178, 0.16)',
    btnGradient: 'linear-gradient(90deg, #0891B2 0%, #0E7490 100%)',
    btnBg: '#0891B2',
    btnShadow: 'rgba(8, 145, 178, 0.35)',
    discBg: '#CFFAFE',
    discGradient: 'linear-gradient(135deg, #CFFAFE 0%, #A5F3FC 100%)',
  },
  dexa: {
    gradient: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 55%, #DDD6FE 100%)',
    bg: '#F5F3FF',
    border: '#C4B5FD',
    cardShadow: 'rgba(124, 58, 237, 0.16)',
    btnGradient: 'linear-gradient(90deg, #8B5CF6 0%, #7C3AED 100%)',
    btnBg: '#7C3AED',
    btnShadow: 'rgba(124, 58, 237, 0.35)',
    discBg: '#EDE9FE',
    discGradient: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
  },
  doppler: {
    gradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 55%, #BAE6FD 100%)',
    bg: '#F0F9FF',
    border: '#7DD3FC',
    cardShadow: 'rgba(2, 132, 199, 0.16)',
    btnGradient: 'linear-gradient(90deg, #0284C7 0%, #0369A1 100%)',
    btnBg: '#0284C7',
    btnShadow: 'rgba(2, 132, 199, 0.35)',
    discBg: '#BAE6FD',
    discGradient: 'linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 100%)',
  },
  ecg: {
    gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 55%, #FDE68A 100%)',
    bg: '#FFFBEB',
    border: '#FCD34D',
    cardShadow: 'rgba(217, 119, 6, 0.16)',
    btnGradient: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
    btnBg: '#D97706',
    btnShadow: 'rgba(217, 119, 6, 0.35)',
    discBg: '#FEF3C7',
    discGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
  },
  echo: {
    gradient: 'linear-gradient(135deg, #F0FDF9 0%, #E6FAF4 55%, #CCFBF1 100%)',
    bg: '#F0FDF9',
    border: '#5EEAD4',
    cardShadow: 'rgba(0, 187, 149, 0.16)',
    btnGradient: 'linear-gradient(90deg, #00BB95 0%, #009E7E 100%)',
    btnBg: '#00BB95',
    btnShadow: 'rgba(0, 187, 149, 0.35)',
    discBg: '#CCFBF1',
    discGradient: 'linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%)',
  },
  cardio: {
    gradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 55%, #FECDD3 100%)',
    bg: '#FFF1F2',
    border: '#FDA4AF',
    cardShadow: 'rgba(225, 29, 72, 0.16)',
    btnGradient: 'linear-gradient(90deg, #F43F5E 0%, #E11D48 100%)',
    btnBg: '#E11D48',
    btnShadow: 'rgba(225, 29, 72, 0.35)',
  },
  cardiology: {
    gradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 55%, #FECDD3 100%)',
    bg: '#FFF1F2',
    border: '#FDA4AF',
    cardShadow: 'rgba(225, 29, 72, 0.16)',
    btnGradient: 'linear-gradient(90deg, #F43F5E 0%, #E11D48 100%)',
    btnBg: '#E11D48',
    btnShadow: 'rgba(225, 29, 72, 0.35)',
  },
  other: {
    gradient: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 55%, #E2E8F0 100%)',
    bg: '#F8FAFC',
    border: '#94A3B8',
    cardShadow: 'rgba(71, 85, 105, 0.16)',
    btnGradient: 'linear-gradient(90deg, #475569 0%, #334155 100%)',
    btnBg: '#475569',
    btnShadow: 'rgba(71, 85, 105, 0.35)',
    discBg: '#F1F5F9',
    discGradient: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
  },
};

const DARK_CATEGORY_ACCENTS = {
  mri: { btnBg: '#38BDF8', btnShadow: 'rgba(56, 189, 248, 0.35)' },
  ct: { btnBg: '#00E5B0', btnShadow: 'rgba(0, 229, 176, 0.35)' },
  xray: { btnBg: '#60A5FA', btnShadow: 'rgba(96, 165, 250, 0.35)' },
  ultrasound: { btnBg: '#FBBF24', btnShadow: 'rgba(251, 191, 36, 0.35)' },
  petct: { btnBg: '#F87171', btnShadow: 'rgba(248, 113, 113, 0.35)' },
  nuclear: { btnBg: '#C084FC', btnShadow: 'rgba(192, 132, 252, 0.35)' },
};

const getCategoryDesign = (catId, isDarkMode = false) => {
  const base =
    CATEGORY_DESIGN_MAP[catId] || {
      gradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 55%, #BAE6FD 100%)',
      bg: '#F0F9FF',
      border: '#7DD3FC',
      cardShadow: 'rgba(2, 132, 199, 0.16)',
      btnGradient: 'linear-gradient(90deg, #0284C7 0%, #0369A1 100%)',
      btnBg: '#0284C7',
      btnShadow: 'rgba(2, 132, 199, 0.35)',
      discBg: '#BAE6FD',
      discGradient: 'linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 100%)',
    };
  if (isDarkMode) {
    const accent = DARK_CATEGORY_ACCENTS[catId] || { btnBg: '#00E5B0', btnShadow: 'rgba(0, 229, 176, 0.35)' };
    return {
      ...base,
      bg: '#111C35',
      gradient: 'radial-gradient(ellipse 100% 90% at 50% -10%, rgba(0, 229, 176, 0.12) 0%, rgba(17, 28, 53, 0.95) 55%, #0B132B 100%)',
      border: 'rgba(255, 255, 255, 0.08)',
      cardShadow: 'rgba(0, 0, 0, 0.45)',
      btnBg: accent.btnBg,
      btnShadow: accent.btnShadow,
      discBg: '#16223D',
      discGradient: 'none',
    };
  }
  return base;
};

function ImagingScreen({ navigation, route }) {
  const { t, isIndic, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const isDark = isDarkMode;
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);
  const isMobile = !desktopSiteMode && (width < 768);

  const mainScrollRef = useRef(null);

  // ==================================================
  // PRIMARY NAVIGATION STATE MACHINE & DYNAMIC HISTORY STACK
  // 'categories' | 'tests' | 'providers' | 'centre-details' | 'booking' | 'payment' | 'confirmation' | 'my-bookings'
  // ==================================================
  const [viewMode, setViewMode] = useState('categories');
  const historyStackRef = useRef([]);

  // Push state snapshot to navigation history
  const pushHistory = useCallback((snapshot) => {
    historyStackRef.current.push(snapshot);
  }, []);

  // Responsive card dimension calculators (2 cards per row on Tablet, 3 on Desktop, 1 on Mobile)
  const getCategoryCardWidth = () => {
    if (desktopSiteMode) return '31.5%';
    if (width < 640) return '100%';
    if (width < 1024) return '48%'; // Exactly 2 cards per row on Tablet
    return '31.5%'; // 3 cards per row on Desktop
  };

  const getTestCardWidth = () => {
    if (desktopSiteMode) return '31.5%';
    if (width < 600) return '100%';
    if (width < 1024) return '48%'; // Exactly 2 cards per row on Tablet
    return '31.5%'; // 3 cards per row on Desktop
  };

  const getProviderCardWidth = () => {
    if (desktopSiteMode) return '48%';
    if (width < 768) return '100%';
    if (width < 1200) return '48%'; // 2 cards per row on Tablet
    return '48%';
  };
  const [selectedCity, setSelectedCity] = useState('Mysuru');
  const [globalSearch, setGlobalSearch] = useState('');

  // Selected Entities
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Active Category Design Scheme (Dynamic colors for cards, buttons, accents)
  const activeCategoryDesign = selectedCategory
    ? getCategoryDesign(selectedCategory.id, isDarkMode)
    : (selectedTest?.categoryId ? getCategoryDesign(selectedTest.categoryId, isDarkMode) : getCategoryDesign('mri', isDarkMode));

  // Filters & Sorting in Provider List
  const [sortBy, setSortBy] = useState('price-low'); // 'price-low' | 'price-high' | 'distance' | 'rating' | 'earliest'
  const [filterRating, setFilterRating] = useState(0); // 0 or 4.5
  const [filterOpen24x7, setFilterOpen24x7] = useState(false);
  const [filterCashless, setFilterCashless] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [maxDistance, setMaxDistance] = useState(50); // km

  // Booking Wizard State
  const [bookingStep, setBookingStep] = useState(1); // 1: Patient, 2: Date & Slot, 3: Review
  const [patientsList, setPatientsList] = useState(DEFAULT_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState(DEFAULT_PATIENTS[0]);
  const [prescriptionDoc, setPrescriptionDoc] = useState(null);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', relation: 'Family', age: '', gender: 'Male', phone: '' });

  // Date & Slot
  const [selectedDateIndex, setSelectedDateIndex] = useState(0); // 0 = Today, 1 = Tomorrow, etc.
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Card-level Slot Selection & Expansion State
  const [cardSelectedSlots, setCardSelectedSlots] = useState({});
  const [expandedSlots, setExpandedSlots] = useState({});

  const handleSelectCardSlot = (providerId, slot) => {
    setCardSelectedSlots((prev) => ({
      ...prev,
      [providerId]: prev[providerId] === slot ? null : slot,
    }));
  };

  const handleToggleMoreTimes = (providerId) => {
    setExpandedSlots((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  // Real-time slot update ticker
  const [slotRefreshTick, setSlotRefreshTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeToSlotChanges(() => {
      setSlotRefreshTick((t) => t + 1);
    });
    return unsub;
  }, []);

  const getFirstAvailableSlot = (dateIso, providerId, preferredSlot = null) => {
    const allSlots = [
      '08:30 AM', '09:30 AM', '10:30 AM', '11:30 AM',
      '12:30 PM', '01:30 PM', '02:30 PM', '03:30 PM',
      '04:30 PM', '05:30 PM', '06:30 PM', '07:30 PM',
    ];
    if (preferredSlot) {
      const prefStatus = getSlotStatus({
        date: dateIso,
        time: preferredSlot,
        serviceType: 'radiology',
        providerId,
      });
      if (prefStatus.available) return preferredSlot;
    }
    for (const s of allSlots) {
      const st = getSlotStatus({
        date: dateIso,
        time: s,
        serviceType: 'radiology',
        providerId,
      });
      if (st.available) return s;
    }
    return '';
  };

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'pay_at_centre'
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Confirmed Order
  const [latestBooking, setLatestBooking] = useState(null);

  // My Bookings
  const [userBookings, setUserBookings] = useState([]);
  const [myBookingsTab, setMyBookingsTab] = useState('Upcoming'); // 'Upcoming' | 'Completed' | 'Cancelled'

  // Modals
  const [testDetailsModal, setTestDetailsModal] = useState(null);
  const [reportModal, setReportModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleDateIndex, setRescheduleDateIndex] = useState(0);
  const [rescheduleSlot, setRescheduleSlot] = useState('');

  // Load Home Location (Single Source of Truth)
  const loadHomeLocation = async () => {
    try {
      const savedCity = await AsyncStorage.getItem('@mediunify_selected_city');
      const savedLoc = await AsyncStorage.getItem('@unnathi_user_location');
      let effective = savedCity || savedLoc || 'Mysuru';
      const lower = effective.toLowerCase().trim();
      let normalized = 'Mysuru';
      if (lower.includes('mys')) normalized = 'Mysuru';
      else if (lower.includes('bengal') || lower.includes('bangal')) normalized = 'Bengaluru';
      else if (lower.includes('hassan')) normalized = 'Hassan';
      else if (lower.includes('mandya')) normalized = 'Mandya';
      else if (lower.includes('mangal')) normalized = 'Mangaluru';
      else normalized = effective;
      setSelectedCity(normalized);
    } catch (e) {
      console.warn('[ImagingScreenWeb] Error loading home location:', e);
      setSelectedCity('Mysuru');
    }
  };

    // Scroll to top on view changes
  const scrollToTop = () => {
    if (mainScrollRef.current) {
      try {
        mainScrollRef.current.scrollTo({ y: 0, animated: true });
      } catch (e) {}
    }

  };

  // ==================================================
  // BULLETPROOF NAVIGATION HISTORY GO BACK HANDLER
  // Guarantees: Back button ALWAYS returns to immediately previous screen/step in history.
  // ==================================================
  const handleGoBack = useCallback(() => {
    // 1. Close any active modal first
    if (testDetailsModal) {
      setTestDetailsModal(null);
      return true;
    }
    if (reportModal) {
      setReportModal(null);
      return true;
    }
    if (receiptModal) {
      setReceiptModal(null);
      return true;
    }
    if (rescheduleModal) {
      setRescheduleModal(null);
      return true;
    }
    if (showAddPatientForm) {
      setShowAddPatientForm(false);
      return true;
    }

    // 2. Pop from dynamic history stack
    if (historyStackRef.current.length > 0) {
      const prev = historyStackRef.current.pop();
      if (prev.viewMode) setViewMode(prev.viewMode);
      if (prev.selectedCategory !== undefined) setSelectedCategory(prev.selectedCategory);
      if (prev.selectedTest !== undefined) setSelectedTest(prev.selectedTest);
      if (prev.selectedProvider !== undefined) setSelectedProvider(prev.selectedProvider);
      if (prev.bookingStep !== undefined) setBookingStep(prev.bookingStep);
      scrollToTop();
      return true;
    }

    // 3. Fallback ladder if history stack is empty
    if (viewMode === 'payment') {
      setViewMode('booking');
      setBookingStep(3);
      scrollToTop();
      return true;
    }
    if (viewMode === 'booking') {
      if (bookingStep > 1) {
        setBookingStep((s) => s - 1);
        scrollToTop();
        return true;
      }
      if (selectedProvider) {
        setViewMode('centre-details');
      } else {
        setViewMode('providers');
      }
      scrollToTop();
      return true;
    }
    if (viewMode === 'centre-details') {
      setViewMode('providers');
      scrollToTop();
      return true;
    }
    if (viewMode === 'providers') {
      setViewMode('tests');
      scrollToTop();
      return true;
    }
    if (viewMode === 'tests') {
      setViewMode('categories');
      scrollToTop();
      return true;
    }
    if (viewMode === 'my-bookings' || viewMode === 'confirmation') {
      setViewMode('categories');
      scrollToTop();
      return true;
    }

    // 4. Root screen: return to previous navigation screen in app (Home)
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return true;
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
      return true;
    }
    return false;
  }, [
    testDetailsModal,
    reportModal,
    receiptModal,
    rescheduleModal,
    showAddPatientForm,
    viewMode,
    bookingStep,
    selectedProvider,
    navigation,
  ]);

  // Android System Hardware Back Button Handler
  useEffect(() => {
    const onBackPress = () => {
      // If at root and history is empty, let system exit screen to Home
      if (
        viewMode === 'categories' &&
        historyStackRef.current.length === 0 &&
        !testDetailsModal &&
        !reportModal &&
        !receiptModal &&
        !rescheduleModal &&
        !showAddPatientForm
      ) {
        if (navigation?.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        return false;
      }
      return handleGoBack();
    };

    const sub = BackHandler?.addEventListener
      ? BackHandler.addEventListener('hardwareBackPress', onBackPress)
      : null;
    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, [
    viewMode,
    handleGoBack,
    testDetailsModal,
    reportModal,
    receiptModal,
    rescheduleModal,
    showAddPatientForm,
    navigation,
  ]);

  // Load Bookings, User Info & Location on Mount and on Navigation Focus
  useEffect(() => {
    loadHomeLocation();
    loadBookingsFromStorage();
    loadUserData();
    const unsub = navigation?.addListener ? navigation.addListener('focus', loadHomeLocation) : null;
    return () => {
      if (unsub) unsub();
    };
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const storedPrimary = await AsyncStorage.getItem('@unnathi_primary_user');
      const storedUser = await AsyncStorage.getItem('user');
      const storedName = await AsyncStorage.getItem('userName');
      const storedPhone = await AsyncStorage.getItem('userPhone');

      let userName = '';
      let userPhone = storedPhone || '';
      let userAge = 28;
      let userGender = 'Male';

      if (storedPrimary) {
        try {
          const p = JSON.parse(storedPrimary);
          if (p?.name && p.name.trim()) userName = p.name.replace(/\s*\(Self\)$/i, '').trim();
          if (p?.phone && p.phone.trim()) userPhone = p.phone.trim();
          if (p?.age) userAge = parseInt(p.age, 10) || 28;
          if (p?.gender) userGender = p.gender;
        } catch (e) {}
      }
      if (!userName && storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u?.name && u.name.trim()) userName = u.name.replace(/\s*\(Self\)$/i, '').trim();
          if (u?.phone && u.phone.trim()) userPhone = u.phone.trim();
          if (u?.age) userAge = parseInt(u.age, 10) || 28;
          if (u?.gender) userGender = u.gender;
        } catch (e) {}
      }
      if (!userName && storedName && storedName.trim()) {
        userName = storedName.replace(/\s*\(Self\)$/i, '').trim();
      }

      const effectiveName = userName || 'User Profile';
      const selfPat = {
        id: 'pat-self',
        name: effectiveName,
        relation: 'Self',
        age: userAge,
        gender: userGender,
        phone: userPhone || '',
      };

      const storedEmail = await AsyncStorage.getItem('userEmail');
      const userKey = (storedEmail || userPhone || effectiveName).toLowerCase().replace(/[^a-z0-9]/g, '_');
      const userFamKey = `@unnathi_family_members_${userKey}`;
      const savedUserFam = await AsyncStorage.getItem(userFamKey);
      let familyList = [];

      if (savedUserFam) {
        try {
          const parsed = JSON.parse(savedUserFam);
          if (Array.isArray(parsed) && parsed.length > 0) familyList = parsed;
        } catch (e) {}
      }

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
          } catch (e) {}
        }
      }

      const otherPats = (Array.isArray(familyList) && familyList.length > 0)
        ? familyList
            .filter(m => m && m.id !== 'self' && m.relation !== 'Self' && !m.isPrimary)
            .map((m, idx) => ({
              id: m.id || `pat-${idx + 2}`,
              name: (m.name || m.displayName || 'Family Member').replace(/\s*\(.*?\)$/, '').trim(),
              relation: m.relation || 'Family',
              age: parseInt(m.age, 10) || 30,
              gender: m.gender || 'Female',
              phone: m.phone || userPhone || '',
            }))
        : [];

      const list = [selfPat, ...otherPats];
      setPatientsList(list);
      setSelectedPatient(selfPat);
    } catch (e) {
      console.warn('[ImagingScreenWeb] Error loading user data:', e);
    }
  };

  const loadBookingsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserBookings(parsed);
          return;
        }
      }
      // Initialize with default mock data
      setUserBookings(INITIAL_RADIOLOGY_BOOKINGS);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(INITIAL_RADIOLOGY_BOOKINGS));
    } catch (e) {
      setUserBookings(INITIAL_RADIOLOGY_BOOKINGS);
    }
  };

  const saveBookingsToStorage = async (newList) => {
    try {
      setUserBookings(newList);
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {}
  };

  // Sync route params & city
  useEffect(() => {
    if (route?.params?.city) {
      setSelectedCity(normalizeRadiologyCity(route.params.city));
    }
    if (route?.params?.initialCategory) {
      const cat = getCategoryById(route.params.initialCategory);
      if (cat) {
        setSelectedCategory(cat);
        setViewMode('tests');
      }
    }
    if (route?.params?.testId) {
      const t = getTestById(route.params.testId);
      if (t) {
        setSelectedTest(t);
        const cat = getCategoryById(t.categoryId);
        if (cat) setSelectedCategory(cat);
        setViewMode('providers');
      }
    } else if (route?.params?.searchTest) {
      setGlobalSearch(route.params.searchTest);
    }
    if (route?.params?.initialView === 'my-bookings' || route?.name === 'RadiologyOrderSuccess') {
      setViewMode('my-bookings');
    } else if (route?.params?.initialView === 'categories' || route?.name === 'RadiologyLabs' || route?.name === 'Imaging') {
      if (route?.params?.testId) {
        // Handled by testId
      } else if (route?.params?.initialCategory) {
        // Handled by initialCategory
      } else {
        setViewMode('categories');
      }
    } else if (route?.params?.initialView === 'providers' || route?.name === 'RadiologistList' || route?.name === 'RadiologyReportUpload') {
      if (route?.params?.testId || selectedTest) {
        setViewMode('providers');
      } else {
        setViewMode('categories');
      }
    } else if (route?.params?.initialView) {
      setViewMode(route.params.initialView);
    }
  }, [route?.params, route?.name]);

  // Safety guard: Never stay in an invalid state where viewMode expects an entity that is null
  useEffect(() => {
    if (viewMode === 'providers' && !selectedTest) {
      setViewMode('categories');
    } else if (viewMode === 'tests' && !selectedCategory) {
      setViewMode('categories');
    }
  }, [viewMode, selectedTest, selectedCategory]);

  // Generate Next 7 Days for Slot Picking
  const appointmentDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dayName = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const fullLabel = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      const isoDate = d.toISOString().split('T')[0];
      days.push({
        index: i,
        dayName,
        dateNum,
        monthName,
        fullLabel,
        isoDate,
      });
    }
    return days;
  }, []);


  // Switch View Helper
  const navigateToView = (newView) => {
    pushHistory({
      viewMode,
      selectedCategory,
      selectedTest,
      selectedProvider,
      bookingStep,
    });
    setViewMode(newView);
    scrollToTop();
  };

  // 1. CATEGORY CLICK -> SHOW TESTS
  const handleSelectCategory = (category) => {
    pushHistory({
      viewMode: 'categories',
      selectedCategory: null,
      selectedTest: null,
      selectedProvider: null,
      bookingStep: 1,
    });
    setSelectedCategory(category);
    setSelectedTest(null);
    setSelectedProvider(null);
    setViewMode('tests');
    scrollToTop();
  };

  // 2. TEST CLICK -> SHOW CENTRES (PROVIDERS)
  const handleSelectTest = (test) => {
    pushHistory({
      viewMode: 'tests',
      selectedCategory,
      selectedTest: null,
      selectedProvider: null,
      bookingStep: 1,
    });
    setSelectedTest(test);
    setSelectedProvider(null);
    setViewMode('providers');
    scrollToTop();
  };

  // 3. CENTRE CLICK / DETAILS -> SHOW CENTRE DETAILS
  const handleOpenCentreDetails = (provider) => {
    pushHistory({
      viewMode: 'providers',
      selectedCategory,
      selectedTest,
      selectedProvider: null,
      bookingStep: 1,
    });
    setSelectedProvider(provider);
    setViewMode('centre-details');
    scrollToTop();
  };

  // 4. FROM CENTRE DETAILS -> SELECT DATE & TIME / BOOKING
  const handleProceedFromCentreDetails = () => {
    pushHistory({
      viewMode: 'centre-details',
      selectedCategory,
      selectedTest,
      selectedProvider,
      bookingStep: 1,
    });
    setBookingStep(1);
    setSelectedDateIndex(0);
    const chosenDay = appointmentDays[0] || { isoDate: new Date().toISOString().split('T')[0] };
    const preferred = (selectedProvider?.availableSlots && selectedProvider.availableSlots[0]) || '10:00 AM';
    const validSlot = getFirstAvailableSlot(chosenDay.isoDate, selectedProvider?.id, preferred);
    setSelectedTimeSlot(validSlot);
    setViewMode('booking');
    scrollToTop();
  };

  // 5. BOOK PROVIDER CLICK DIRECTLY -> OPEN BOOKING WIZARD
  const handleStartBooking = (provider, test = null, preferredSlot = null) => {
    const activeTest = test || selectedTest || getTestsByCategory(selectedCategory?.id)[0];
    setSelectedTest(activeTest);
    setSelectedProvider(provider);
    pushHistory({
      viewMode,
      selectedCategory,
      selectedTest: activeTest,
      selectedProvider: provider,
      bookingStep: 1,
    });
    setBookingStep(1);
    setSelectedDateIndex(0);
    const chosenDay = appointmentDays[0] || { isoDate: new Date().toISOString().split('T')[0] };

    // Use slot picked on card, or calculate next available slot
    let slotToUse = preferredSlot || cardSelectedSlots[provider.id];
    if (slotToUse) {
      const st = getSlotStatus({
        date: chosenDay.isoDate,
        time: slotToUse,
        serviceType: 'radiology',
        providerId: provider.id,
      });
      if (!st.available) {
        slotToUse = null;
      }
    }
    if (!slotToUse) {
      const fallbackPref = (provider.availableSlots && provider.availableSlots[0]) || '10:00 AM';
      slotToUse = getFirstAvailableSlot(chosenDay.isoDate, provider.id, fallbackPref);
    }
    setSelectedTimeSlot(slotToUse);
    setViewMode('booking');
    scrollToTop();
  };

  // Forward transition helpers in Booking Wizard
  const handleContinueToStep2 = () => {
    if (!selectedPatient) {
      showAlert('Select Patient', 'Select a patient to continue.');
      return;
    }
    pushHistory({
      viewMode: 'booking',
      selectedCategory,
      selectedTest,
      selectedProvider,
      bookingStep: 1,
    });
    setBookingStep(2);
    scrollToTop();
  };

  const handleContinueToStep3 = () => {
    if (!selectedTimeSlot) {
      showAlert('Select Time', 'Select an appointment time.');
      return;
    }
    pushHistory({
      viewMode: 'booking',
      selectedCategory,
      selectedTest,
      selectedProvider,
      bookingStep: 2,
    });
    setBookingStep(3);
    scrollToTop();
  };

  const handleOpenMyBookings = () => {
    if (viewMode !== 'my-bookings') {
      pushHistory({
        viewMode,
        selectedCategory,
        selectedTest,
        selectedProvider,
        bookingStep,
      });
      setViewMode('my-bookings');
      scrollToTop();
    }
  };

  // --------------------------------------------------
  // 4. ADD NEW PATIENT
  // --------------------------------------------------
  const handleAddNewPatient = () => {
    if (!newPatient.name.trim()) {
      showAlert('Patient Name', 'Enter the patient name.');
      return;
    }
    if (!newPatient.age || isNaN(newPatient.age)) {
      showAlert('Patient Age', 'Enter a valid age.');
      return;
    }
    const created = {
      id: `pat-${Date.now()}`,
      name: newPatient.name.trim(),
      relation: newPatient.relation || 'Family',
      age: parseInt(newPatient.age, 10),
      gender: newPatient.gender || 'Male',
      phone: newPatient.phone.trim() || selectedPatient.phone,
    };
    const updated = [...patientsList, created];
    setPatientsList(updated);
    setSelectedPatient(created);
    setShowAddPatientForm(false);
    setNewPatient({ name: '', relation: 'Family', age: '', gender: 'Male', phone: '' });
  };

  // --------------------------------------------------
  // 5. PROCEED TO PAYMENT
  // --------------------------------------------------
  const handleProceedToPayment = () => {
    if (!selectedPatient) {
      showAlert('Select Patient', 'Select a patient to continue.');
      return;
    }
    if (!selectedTimeSlot) {
      showAlert('Select Time', 'Select an appointment time.');
      return;
    }
    const chosenDay = appointmentDays[selectedDateIndex] || appointmentDays[0];
    const status = getSlotStatus({
      date: chosenDay.isoDate,
      time: selectedTimeSlot,
      serviceType: 'radiology',
      providerId: selectedProvider?.id,
    });
    if (!status.available) {
      showAlert('Slot Unavailable', 'This slot is no longer available. Please select another time.');
      return;
    }
    pushHistory({
      viewMode: 'booking',
      selectedCategory,
      selectedTest,
      selectedProvider,
      bookingStep: 3,
    });
    setViewMode('payment');
    scrollToTop();
  };

  // --------------------------------------------------
  // 6. PROCESS PAYMENT & CONFIRM
  // --------------------------------------------------
  const handleExecutePayment = async () => {
    if (isProcessingPayment) return;

    const isGuest = await isGuestUser();
    if (isGuest) {
      promptLoginRequired(navigation, { service: 'radiology' });
      return;
    }

    if (!selectedTest || !selectedProvider || !selectedPatient || !selectedTimeSlot) {
      showAlert('Incomplete Details', 'Please complete patient and slot selection before proceeding.');
      return;
    }

    if (selectedProvider.supportedCategories && !selectedProvider.supportedCategories.includes(selectedTest.categoryId)) {
      showAlert('Service Unavailable', `${selectedProvider.name} does not offer this scan modality.`);
      return;
    }

    const chosenDay = appointmentDays[selectedDateIndex] || appointmentDays[0];
    const slotValidation = await validateAndBookSlot({
      date: chosenDay.isoDate,
      time: selectedTimeSlot,
      serviceType: 'radiology',
      providerId: selectedProvider?.id || selectedProvider?.name,
      bookingDetails: {
        testName: selectedTest?.name,
        patientName: selectedPatient?.name,
      },
    });

    if (!slotValidation.success) {
      showAlert('Slot Unavailable', slotValidation.message || 'This slot is no longer available. Please select another time.');
      return;
    }

    setIsProcessingPayment(true);

    setTimeout(async () => {
      setIsProcessingPayment(false);

      const chosenDay = appointmentDays[selectedDateIndex] || appointmentDays[0];
      const basePrice = selectedTest.mrp || 3000;
      const finalPrice = Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier);
      const discountAmount = basePrice - finalPrice;

      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const cityPrefix = (selectedCity.slice(0, 3) || 'MYS').toUpperCase();
      const bookingId = `RAD-${cityPrefix}-${randomSuffix}`;
      const isSelf = selectedPatient.relation === 'Self' || selectedPatient.id === 'pat-self';
      const patientDisplayName = `${selectedPatient.name} (${selectedPatient.relation || 'Self'})`;
      const familyName = !isSelf ? selectedPatient.name : '';

      const newBookingRecord = {
        id: bookingId,
        bookingRef: bookingId,
        testName: selectedTest.name,
        bookingType: 'Radiology',
        modality: 'Radiology & Scans',
        modalityType: (selectedCategory?.name ? selectedCategory.name.split(' ')[0] : 'Radiology') || 'Radiology',
        testCategory: selectedCategory?.name || 'Radiology Scan',
        categoryLabel: selectedCategory?.name || 'Radiology Scan',
        testType: 'Centre Visit',
        providerName: selectedProvider.name,
        centerName: selectedProvider.name,
        department: 'Department of Radiology & Advanced Imaging',
        providerAddress: `${selectedProvider.area}, ${selectedProvider.city}`,
        address: `${selectedProvider.area}, ${selectedProvider.city}`,
        location: `${selectedProvider.area}, ${selectedProvider.city}`,
        patientId: isSelf ? 'self' : (selectedPatient.id || 'fam'),
        patientName: patientDisplayName,
        familyMemberName: familyName,
        patientAge: selectedPatient.age,
        patientGender: selectedPatient.gender,
        patientPhone: selectedPatient.phone,
        providerId: selectedProvider.id,
        facilityId: selectedProvider.id,
        facilityName: selectedProvider.name,
        latitude: selectedProvider.latitude,
        longitude: selectedProvider.longitude,
        city: selectedProvider.city,
        directionsUrl: getGoogleMapsDirectionsUrl(selectedProvider),
        date: chosenDay.isoDate,
        appointmentDate: chosenDay.fullLabel || chosenDay.isoDate,
        formattedDate: chosenDay.fullLabel,
        timeSlot: selectedTimeSlot,
        basePrice,
        discountAmount,
        price: finalPrice,
        paidAmount: finalPrice,
        paymentStatus: paymentMethod === 'pay_at_centre' ? 'Pay at Centre' : `Paid Online (${paymentMethod.toUpperCase()})`,
        bookingStatus: 'Confirmed',
        status: 'Scan Scheduled',
        reportStatus: 'Scheduled',
        bookingDate: new Date().toISOString().split('T')[0],
        instructions: selectedTest.preparation || 'Wear loose comfortable clothing without metal fasteners or jewelry.',
        doctorPrescription: prescriptionDoc ? prescriptionDoc.name : 'Physical referral at centre',
        prescriptionAttached: !!prescriptionDoc,
        prescriptionFileName: prescriptionDoc?.name || null,
        contactPhone: selectedPatient.phone || '+91 80 4342 0100',
        canReschedule: true,
        canCancel: true,
      };

      const updated = [newBookingRecord, ...userBookings];
      await saveBookingsToStorage(updated);

      // Save to @mediunify_patient_booked_tests for My Tests screen
      try {
        const storedRaw = await AsyncStorage.getItem('@mediunify_patient_booked_tests');
        const existingList = storedRaw ? JSON.parse(storedRaw) : [];
        const nextList = [newBookingRecord, ...(Array.isArray(existingList) ? existingList : [])];
        await AsyncStorage.setItem('@mediunify_patient_booked_tests', JSON.stringify(nextList));
      } catch (e) {}

      // Save to @radiologyBookings & radiologyBookings
      for (const k of ['@radiologyBookings', 'radiologyBookings']) {
        try {
          const exRaw = await AsyncStorage.getItem(k);
          const exList = exRaw ? JSON.parse(exRaw) : [];
          const nList = [newBookingRecord, ...(Array.isArray(exList) ? exList : [])];
          await AsyncStorage.setItem(k, JSON.stringify(nList));
        } catch (e) {}
      }

      // Save to @unnathi_appointments for global appointments
      try {
        const apptRaw = await AsyncStorage.getItem('@unnathi_appointments');
        const existingAppts = apptRaw ? JSON.parse(apptRaw) : [];
        const newAppt = {
          id: bookingId,
          type: 'radiology',
          serviceType: 'Radiology Scan',
          testName: selectedTest.name,
          bookingType: 'Radiology',
          facilityName: selectedProvider.name,
          providerName: selectedProvider.name,
          centerName: selectedProvider.name,
          address: selectedProvider.address || `${selectedProvider.area}, ${selectedProvider.city}`,
          latitude: selectedProvider.latitude,
          longitude: selectedProvider.longitude,
          city: selectedProvider.city,
          directionsUrl: getGoogleMapsDirectionsUrl(selectedProvider),
          date: chosenDay.isoDate,
          day: chosenDay.fullLabel,
          time: selectedTimeSlot,
          timeSlot: selectedTimeSlot,
          patientName: patientDisplayName,
          patient: { name: selectedPatient.name, relation: selectedPatient.relation, age: selectedPatient.age, gender: selectedPatient.gender },
          amount: finalPrice,
          status: 'Confirmed',
          paymentStatus: newBookingRecord.paymentStatus,
        };
        await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify([newAppt, ...(Array.isArray(existingAppts) ? existingAppts : [])]));
      } catch (e) {}

      setLatestBooking(newBookingRecord);
      navigateToView('confirmation');
    }, 1200);
  };

  // --------------------------------------------------
  // 7. CANCEL BOOKING
  // --------------------------------------------------
  const handleCancelBooking = async (bookingId) => {
    const targetBooking = userBookings.find((b) => b.id === bookingId);
    if (targetBooking) {
      cancelBookedSlot({
        date: targetBooking.date || targetBooking.appointmentDate,
        time: targetBooking.timeSlot || targetBooking.time,
        serviceType: 'radiology',
        providerId: targetBooking.providerName || targetBooking.centerName,
      });
    }

    const updated = userBookings.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          bookingStatus: 'Cancelled',
          status: 'Cancelled',
          reportStatus: 'Cancelled by patient',
          canReschedule: false,
          canCancel: false,
          paymentStatus: b.paymentStatus.includes('Paid Online') ? `Refunded (₹${b.paidAmount})` : 'Cancelled',
        };
      }
      return b;
    });
    await saveBookingsToStorage(updated);

    // Sync cancelled status with @mediunify_patient_booked_tests
    try {
      const storedRaw = await AsyncStorage.getItem('@mediunify_patient_booked_tests');
      if (storedRaw) {
        const existing = JSON.parse(storedRaw);
        if (Array.isArray(existing)) {
          const synced = existing.map(item => item.id === bookingId ? { ...item, status: 'Cancelled', bookingStatus: 'Cancelled', canReschedule: false, canCancel: false } : item);
          await AsyncStorage.setItem('@mediunify_patient_booked_tests', JSON.stringify(synced));
        }
      }
    } catch (e) {}

    showAlert('Booking Cancelled', `Appointment #${bookingId} has been successfully cancelled. Refund has been initiated.`);
  };

  // --------------------------------------------------
  // 8. RESCHEDULE BOOKING
  // --------------------------------------------------
  const handleOpenReschedule = (booking) => {
    setRescheduleModal(booking);
    setRescheduleDateIndex(1);
    setRescheduleSlot(booking.timeSlot || '10:00 AM');
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal) return;
    const chosenDay = appointmentDays[rescheduleDateIndex] || appointmentDays[1];

    const bookValidation = await validateAndBookSlot({
      date: chosenDay.isoDate,
      time: rescheduleSlot,
      serviceType: 'radiology',
      providerId: rescheduleModal.centerName || rescheduleModal.providerName,
      bookingDetails: {
        testName: rescheduleModal.testName,
        patientName: rescheduleModal.patientName,
      },
    });

    if (!bookValidation.success) {
      showAlert('Slot Unavailable', bookValidation.message || 'This slot is no longer available. Please select another time.');
      return;
    }

    cancelBookedSlot({
      date: rescheduleModal.date || rescheduleModal.appointmentDate,
      time: rescheduleModal.timeSlot,
      serviceType: 'radiology',
      providerId: rescheduleModal.centerName || rescheduleModal.providerName,
    });

    const updated = userBookings.map((b) => {
      if (b.id === rescheduleModal.id) {
        return {
          ...b,
          date: chosenDay.isoDate,
          appointmentDate: chosenDay.fullLabel,
          formattedDate: chosenDay.fullLabel,
          timeSlot: rescheduleSlot,
        };
      }
      return b;
    });
    await saveBookingsToStorage(updated);

    // Sync reschedule with @mediunify_patient_booked_tests
    try {
      const storedRaw = await AsyncStorage.getItem('@mediunify_patient_booked_tests');
      if (storedRaw) {
        const existing = JSON.parse(storedRaw);
        if (Array.isArray(existing)) {
          const synced = existing.map(item => item.id === rescheduleModal.id ? { ...item, date: chosenDay.isoDate, appointmentDate: chosenDay.fullLabel, formattedDate: chosenDay.fullLabel, timeSlot: rescheduleSlot } : item);
          await AsyncStorage.setItem('@mediunify_patient_booked_tests', JSON.stringify(synced));
        }
      }
    } catch (e) {}

    setRescheduleModal(null);
    showAlert('Rescheduled!', `Appointment rescheduled to ${chosenDay.fullLabel} at ${rescheduleSlot}.`);
  };

  // --------------------------------------------------
  // FILTERED DATA HELPERS
  // --------------------------------------------------
  // Categories available in selected city (Strict City Isolation)
  const cityCategories = useMemo(() => {
    return getAvailableCategoriesForCity(selectedCity);
  }, [selectedCity]);

  // Filtered categories for main view
  const displayedCategories = useMemo(() => {
    const base = cityCategories;
    if (!globalSearch.trim()) return base;
    const q = globalSearch.toLowerCase().trim();
    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q)
    );
  }, [cityCategories, globalSearch]);

  // Filtered tests in active category
  const displayedTests = useMemo(() => {
    if (!selectedCategory) return [];
    let list = getTestsByCategory(selectedCategory.id);
    list = list.filter((t) => getProvidersForTest(t, selectedCity).length > 0);
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.purpose.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, selectedCity, globalSearch]);

  // Filtered providers for active test
  const displayedProviders = useMemo(() => {
    if (!selectedTest) return [];
    let list = getProvidersForTest(selectedTest, selectedCity);

    // Search filter
    if (providerSearch.trim()) {
      const q = providerSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q)
      );
    }

    // Rating filter
    if (filterRating > 0) {
      list = list.filter((p) => p.rating >= filterRating);
    }

    // Open 24x7 filter
    if (filterOpen24x7) {
      list = list.filter((p) => p.openHours && p.openHours.toLowerCase().includes('24x7'));
    }

    // Cashless filter
    if (filterCashless) {
      list = list.filter((p) => p.cashlessSupported);
    }

    // Distance filter
    list = list.filter((p) => parseFloat(p.distance) <= maxDistance);

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
      if (sortBy === 'earliest') return (a.availableSlots[0] || '').localeCompare(b.availableSlots[0] || '');
      return 0;
    });

    return list;
  }, [selectedTest, selectedCity, providerSearch, filterRating, filterOpen24x7, filterCashless, maxDistance, sortBy]);

  // Filtered My Bookings
  const displayedUserBookings = useMemo(() => {
    return userBookings.filter((b) => {
      if (myBookingsTab === 'Upcoming') return b.bookingStatus === 'Confirmed';
      if (myBookingsTab === 'Completed') return b.bookingStatus === 'Completed';
      if (myBookingsTab === 'Cancelled') return b.bookingStatus === 'Cancelled';
      return true;
    });
  }, [userBookings, myBookingsTab]);

  // Card Display Helpers (Clean, Compact, Formatted)
  const getProviderModalitiesText = (provider) => {
    if (provider.facilities && Array.isArray(provider.facilities) && provider.facilities.length > 0) {
      const cleanList = provider.facilities
        .map((f) => {
          let s = f.replace(/^GE\s+/i, '').replace(/^Siemens\s+/i, '').replace(/^Philips\s+/i, '');
          s = s.replace(/High\s+Def(inition)?/i, '').replace(/1\.5T\s+HD/i, '1.5T MRI');
          return s.trim();
        })
        .filter(Boolean);
      return cleanList.slice(0, 2).join(' · ');
    }
    if (provider.supportedCategories && Array.isArray(provider.supportedCategories)) {
      return provider.supportedCategories.slice(0, 2).map((c) => c.toUpperCase()).join(' · ');
    }
    return 'MRI · CT Scan';
  };

  const getProviderNextAvailableSlot = (provider) => {
    if (!provider.availableSlots || provider.availableSlots.length === 0) return 'Contact Centre';
    const todayIso = new Date().toISOString().split('T')[0];
    for (const s of provider.availableSlots) {
      const st = getSlotStatus({
        date: todayIso,
        time: s,
        serviceType: 'radiology',
        providerId: provider.id,
      });
      if (st.available) return s;
    }
    return 'Tomorrow';
  };

  const getProviderReportTime = (provider) => {
    const rt = provider.turnaroundTime || provider.reportTurnaround;
    if (!rt) return 'Within 24 hours';
    return rt.replace(/^Reports?\s+within\s+/i, 'Within ');
  };

  return (
    <SafeAreaView style={[styles.safeContainer, isDark && { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* ============================================================
          PINNED TOP APP BAR (Back button, Context Title, Location, My Bookings)
          Visible & accessible across iOS, Android, and Tablet
      ============================================================ */}
      <View style={[styles.pinnedTopAppBar, isDark && { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <WebBackButton
          onPress={handleGoBack}
          accessibilityLabel="Go back to previous screen"
        />

        <View style={styles.pinnedTitleContainer}>
          <Text style={[styles.pinnedTitleText, isIndic && { lineHeight: 20 }, isDark && { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            {viewMode === 'categories'
              ? t('navigation.scans_xray', 'Scan & X-Ray')
              : viewMode === 'tests'
              ? selectedCategory?.name ? t(selectedCategory.name, selectedCategory.name) : t('Select Scan')
              : viewMode === 'providers'
              ? t('Choose Centre')
              : viewMode === 'centre-details'
              ? t('Centre Details')
              : viewMode === 'booking'
              ? bookingStep === 1
                ? 'Select Patient'
                : bookingStep === 2
                ? 'Select Date & Time'
                : 'Review Booking'
              : viewMode === 'payment'
              ? t('common.price', 'Payment')
              : viewMode === 'confirmation'
              ? t('booking.confirmed', 'Confirmed')
              : viewMode === 'my-bookings'
              ? t('booking.my_appointments', 'My Bookings')
              : t('navigation.scans_xray', 'Scan & X-Ray')}
          </Text>
          <View style={styles.pinnedCityBadge}>
            <Ionicons name="location-sharp" size={10} color="#00BB95" />
            <Text style={styles.pinnedCityText} numberOfLines={1} ellipsizeMode="tail">
              {width < 360 ? selectedCity : `${selectedCity} • Home`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.pinnedMyBookingsBtn,
            viewMode === 'my-bookings' && styles.pinnedMyBookingsBtnActive,
            width < 380 && { paddingHorizontal: 8 },
          ]}
          onPress={handleOpenMyBookings}
          activeOpacity={0.7}
          accessibilityLabel="View My Bookings"
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={viewMode === 'my-bookings' ? '#FFFFFF' : '#1E3A8A'}
          />
          {width >= 360 && (
            <Text
              style={[
                styles.pinnedMyBookingsBtnText,
                viewMode === 'my-bookings' && styles.pinnedMyBookingsBtnTextActive,
              ]}
              numberOfLines={1}
            >
              {width < 420 ? 'Bookings' : 'My Bookings'}
            </Text>
          )}
          {userBookings.length > 0 && (
            <View style={styles.pinnedBadgeDot}>
              <Text style={styles.pinnedBadgeDotText}>{userBookings.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BANNER SECTION */}
        {viewMode === 'categories' && (
          <View style={styles.heroBannerWrap}>
            {/* Decorative Translucent Medical Cross Watermark in Top Right */}
            <View style={styles.heroWatermarkContainer} pointerEvents="none">
              <View style={styles.heroWatermarkGlow} />
              <View style={styles.heroCrossWrap}>
                <View style={styles.heroCrossH} />
                <View style={styles.heroCrossV} />
              </View>
            </View>

            <View style={styles.heroInnerContainer}>
              <View style={styles.heroContentBlock}>
                <View style={styles.cityLocationRow}>
                  <Ionicons name="location-sharp" size={15} color="#00BB95" />
                  <Text style={styles.cityLocationText}>{selectedCity}</Text>
                </View>

                <Text style={styles.heroHeading}>Scan & X-Ray</Text>
                <Text style={styles.heroSubheading}>
                  Find and book diagnostic scans near you.
                </Text>

                {/* Search Bar */}
                <View style={styles.heroSearchBox}>
                  <Ionicons name="search" size={19} color="#00BB95" style={styles.searchIcon} />
                  <TextInput
                    style={styles.heroSearchInput}
                    placeholder="Search scans or centres"
                    placeholderTextColor="#94A3B8"
                    value={globalSearch}
                    onChangeText={setGlobalSearch}
                  />
                  {globalSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setGlobalSearch('')}
                      style={styles.clearSearchBtn}
                    >
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.heroSearchSubmitBtn}
                    activeOpacity={0.85}
                    accessibilityLabel="Search"
                  >
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Popular Search Chips */}
                <View style={styles.popularChipsWrap}>
                  <Text style={styles.popularChipsLabel}>Popular:</Text>
                  <View style={styles.popularChipsRow}>
                    {['MRI Brain', 'Chest X-Ray', 'CT Chest', 'Ultrasound Pelvis'].map((chip) => (
                      <TouchableOpacity
                        key={chip}
                        style={styles.popularChipPill}
                        onPress={() => setGlobalSearch(chip)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.popularChipText}>{chip}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================
            MAIN CONTENT AREA BASED ON VIEW MODE
        ============================================================ */}
        <View style={styles.mainBodyContainer}>
          {/* VIEW 1: CATEGORIES (MAIN PAGE) */}
          {viewMode === 'categories' && (
            <View style={styles.sectionWrap}>
              {/* Background ambient medical glows (web light mode only, since RN native does not support CSS filter blur) */}
              {!isDark && Platform.OS === 'web' && (
                <>
                  <View style={styles.categoriesAmbientGlow} pointerEvents="none" />
                  <View style={styles.categoriesAmbientGlowLeft} pointerEvents="none" />
                </>
              )}

              {/* Categories Grid or Empty State */}
              {displayedCategories.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="location-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyStateTitle}>
                    {globalSearch.trim() ? 'No Matching Scans Found' : 'No scans available in this city yet.'}
                  </Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {globalSearch.trim()
                      ? `No scan modalities match "${globalSearch}". Try clearing your search.`
                      : `Diagnostic scans are currently available in Mysuru, Bengaluru, and Hassan.`}
                  </Text>
                  {globalSearch.trim() ? (
                    <TouchableOpacity
                      style={styles.emptyResetBtn}
                      onPress={() => setGlobalSearch('')}
                    >
                      <Text style={styles.emptyResetBtnText}>Clear Search</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.emptyResetBtn}
                      onPress={() => {
                        if (navigation?.navigate) navigation.navigate('Home');
                      }}
                    >
                      <Text style={styles.emptyResetBtnText}>Change City on Home Screen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.categoriesGrid}>
                  {displayedCategories.map((cat) => {
                    const design = getCategoryDesign(cat.id, isDarkMode);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        className="rad-category-card"
                        style={[
                          styles.categoryBannerCard,
                          {
                            width: getCategoryCardWidth(),
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : design.border,
                            backgroundColor: isDark ? '#111C35' : design.bg,
                            ...(Platform.OS === 'web'
                              ? {
                                  
                                  boxShadow: `0 8px 24px -4px ${design.cardShadow}`,
                                }
                              : {}),
                          },
                        ]}
                        onPress={() => handleSelectCategory(cat)}
                        activeOpacity={0.88}
                      >
                        {/* 1. Left Column: Title, test count & Explore button */}
                        <View style={styles.catBannerLeftCol}>
                          <Text style={[styles.catBannerTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                            {cat.name}
                          </Text>
                          <Text style={[styles.catBannerSubtitle, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                            {cat.testCount} Tests available
                          </Text>
                          {/* Circular Arrow & Book Now CTA */}
                          <View style={styles.organicCtaRow}>
                            <View style={[styles.organicArrowCircle, { borderColor: design.btnBg }]}>
                              <Ionicons name="arrow-forward" size={11} color={design.btnBg} />
                            </View>
                            <Text style={[styles.organicCtaText, { color: design.btnBg }]}>
                              Book Now
                            </Text>
                          </View>
                        </View>

                        {/* 2. Right Column: 3D Machine floating seamlessly with no circle backdrop */}
                        <View style={styles.catBannerRightCol}>
                          {RADIOLOGY_3D_ICONS[cat.id] ? (
                            <Image
                              source={RADIOLOGY_3D_ICONS[cat.id]}
                              style={styles.catBannerImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons name={cat.icon || 'scan-outline'} size={46} color={design.btnBg} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* VIEW 2: TESTS IN SELECTED CATEGORY */}
          {viewMode === 'tests' && selectedCategory && (
            <View style={styles.sectionWrap}>
              {/* Category Header Hero Card */}
              <View
                style={[
                  styles.categoryBannerHero,
                  {
                    backgroundColor: isDark ? '#111C35' : activeCategoryDesign.bg,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : activeCategoryDesign.border,
                    boxShadow: `0 8px 24px -4px ${activeCategoryDesign.cardShadow}`,
                  },
                ]}
              >
                <View style={styles.catBannerLeft}>
                  <View style={styles.catLargeIconWrap}>
                    {RADIOLOGY_3D_ICONS[selectedCategory.id] ? (
                      <Image
                        source={RADIOLOGY_3D_ICONS[selectedCategory.id]}
                        style={[
                          styles.catBanner3DImage,
                          { filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.14))' },
                        ]}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name={selectedCategory.icon} size={36} color={activeCategoryDesign.btnBg} />
                    )}
                  </View>
                  <View style={styles.catBannerInfo}>
                    <View style={styles.catBannerTagRow}>
                      <Text style={[styles.catBannerBadge, { color: activeCategoryDesign.btnBg }]}>
                        {selectedCategory.badge}
                      </Text>
                      <Text style={styles.catBannerDot}>•</Text>
                      <Text style={styles.catBannerTestCount}>
                        {displayedTests.length} Tests Available
                      </Text>
                    </View>
                    <Text style={[styles.catBannerTitle, isDark && { color: '#FFFFFF' }]}>{selectedCategory.name}</Text>
                    <Text style={styles.catBannerDesc}>Select a scan to compare diagnostic centres in {selectedCity}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.changeCategoryBtn,
                    {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : activeCategoryDesign.border,
                      backgroundColor: isDark ? '#16223D' : '#FFFFFF',
                      boxShadow: `0 2px 8px ${activeCategoryDesign.cardShadow}`,
                    },
                  ]}
                  onPress={() => navigateToView('categories')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="grid-outline" size={15} color={activeCategoryDesign.btnBg} />
                  <Text style={[styles.changeCategoryBtnText, { color: activeCategoryDesign.btnBg }]}>All Categories</Text>
                </TouchableOpacity>
              </View>

              {/* Tests Grid */}
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {selectedCategory.name.toLowerCase().endsWith('scan')
                      ? `Available ${selectedCategory.name}s`
                      : `Available ${selectedCategory.name} Scans`}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Compare prices across centres in {selectedCity}
                  </Text>
                </View>
              </View>

              {displayedTests.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="medical-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyStateTitle}>No {selectedCategory.name} scans in {selectedCity}</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Diagnostic centres offering this scan are not listed in {selectedCity} yet.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyResetBtn,
                      {
                        backgroundColor: activeCategoryDesign.btnBg,
                        
                        boxShadow: `0 4px 14px ${activeCategoryDesign.btnShadow}`,
                      },
                    ]}
                    onPress={() => navigateToView('categories')}
                  >
                    <Text style={styles.emptyResetBtnText}>View All Categories</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.testsGrid}>
                  {displayedTests.map((test) => (
                    <View
                      key={test.id}
                      className="rad-test-card"
                      style={[
                        styles.testCard,
                        {
                          width: getTestCardWidth(),
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : activeCategoryDesign.border,
                          backgroundColor: isDark ? '#111C35' : '#FFFFFF',
                          boxShadow: `0 8px 24px -4px ${activeCategoryDesign.cardShadow}`,
                        },
                      ]}
                    >
                      {/* 1. Top Fixed Image Container */}
                      <View
                        style={[
                          styles.cardImageContainer,
                          {
                            backgroundColor: isDark ? '#16223D' : activeCategoryDesign.bg,
                          },
                        ]}
                      >
                        <Image
                          source={RADIOLOGY_3D_ICONS[selectedCategory.id] || RADIOLOGY_3D_ICONS.mri}
                          style={[
                            styles.cardImage,
                            { filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.12))' },
                          ]}
                          resizeMode="contain"
                        />
                        <View style={styles.testCardBadgeRow}>
                          <View
                            style={[
                              styles.testCategoryTag,
                              {
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : activeCategoryDesign.border,
                                backgroundColor: isDark ? '#16223D' : '#FFFFFF',
                              },
                            ]}
                          >
                            <Text style={[styles.testCategoryTagText, { color: activeCategoryDesign.btnBg }]}>
                              {selectedCategory.name}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.fastingPill,
                              test.fastingRequired ? styles.fastingPillActive : styles.fastingPillNone,
                            ]}
                          >
                            <Ionicons
                              name={test.fastingRequired ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                              size={11}
                              color={test.fastingRequired ? '#D97706' : '#059669'}
                            />
                            <Text
                              style={[
                                styles.fastingPillText,
                                test.fastingRequired ? styles.fastingPillTextActive : styles.fastingPillTextNone,
                              ]}
                            >
                              {test.fastingRequired ? 'Preparation required' : 'No preparation needed'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* 2. Card Body Content */}
                      <View style={styles.cardBody}>
                        <Text style={styles.testCardName} numberOfLines={2}>
                          {test.name}
                        </Text>

                        {/* Specs Row */}
                        <View style={styles.testKeyParamsRow}>
                          {test.reportTime ? (
                            <View style={[styles.testParamItem, { borderColor: activeCategoryDesign.border }]}>
                              <Ionicons name="document-text-outline" size={12} color={activeCategoryDesign.btnBg} />
                              <Text style={styles.testParamText}>Report in {test.reportTime}</Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Price Row */}
                        <View style={styles.testPriceRow}>
                          <Text style={styles.startsAtLabel}>Starts at </Text>
                          <Text style={[styles.discountedPrice, { color: activeCategoryDesign.btnBg }]}>
                            ₹{test.typicalPrice.toLocaleString('en-IN')}
                          </Text>
                          {test.mrp && (
                            <Text style={styles.mrpPrice}>
                              ₹{test.mrp.toLocaleString('en-IN')}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* 3. Action Row: Details & Circular Arrow Book Now CTA */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.cardDetailsLink}
                          onPress={() => setTestDetailsModal(test)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="information-circle-outline" size={13} color="#64748B" />
                          <Text style={styles.cardDetailsLinkText}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          className="rad-cta-btn"
                          style={styles.organicCtaBtn}
                          onPress={() => handleSelectTest(test)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.organicArrowCircle, { borderColor: activeCategoryDesign.btnBg }]}>
                            <Ionicons name="arrow-forward" size={11} color={activeCategoryDesign.btnBg} />
                          </View>
                          <Text style={[styles.organicCtaText, { color: activeCategoryDesign.btnBg }]}>
                            Book Now
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* VIEW 3: PROVIDERS / LABS COMPARISON FOR SELECTED TEST */}
          {viewMode === 'providers' && selectedTest && (
            <View style={styles.sectionWrap}>
              {/* Selected Test Summary Banner (Redesigned & Responsive) */}
              <View
                style={[
                  styles.selectedTestHeroCard,
                  {
                    backgroundColor: isDark ? '#111C35' : activeCategoryDesign.bg,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : activeCategoryDesign.border,
                    borderLeftWidth: 4,
                    borderLeftColor: activeCategoryDesign.btnBg,
                    boxShadow: `0 8px 24px -4px ${activeCategoryDesign.cardShadow}`,
                  },
                ]}
              >
                {/* Header Row: Category Badge & Quick Actions */}
                <View style={styles.selectedTestHeroTopRow}>
                  <View
                    style={[
                      styles.selectedTestModalityPill,
                      {
                        backgroundColor: isDark ? '#16223D' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : activeCategoryDesign.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Ionicons name="scan-outline" size={13} color={activeCategoryDesign.btnBg} />
                    <Text style={[styles.selectedTestModalityText, { color: activeCategoryDesign.btnBg }]}>
                      {selectedCategory?.name?.toUpperCase() || 'RADIOLOGY SCAN'}
                    </Text>
                  </View>

                  <View style={styles.selectedTestHeroActions}>
                    <TouchableOpacity
                      style={[styles.changeTestPillBtn, { borderColor: activeCategoryDesign.border }]}
                      onPress={() => navigateToView('tests')}
                      activeOpacity={0.8}
                      accessibilityLabel="Change selected test"
                    >
                      <Ionicons name="swap-horizontal" size={13} color={activeCategoryDesign.btnBg} />
                      <Text style={[styles.changeTestPillBtnText, { color: activeCategoryDesign.btnBg }]}>Change Scan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.viewProtocolBtn, { borderColor: activeCategoryDesign.border }]}
                      onPress={() => setTestDetailsModal(selectedTest)}
                      activeOpacity={0.8}
                      accessibilityLabel="View scan details"
                    >
                      <Ionicons name="information-circle-outline" size={14} color={activeCategoryDesign.btnBg} />
                      <Text style={[styles.viewProtocolBtnText, { color: activeCategoryDesign.btnBg }]}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Content Row: Test Info & Contained Equipment Thumbnail */}
                <View style={styles.selectedTestHeroContentRow}>
                  <View style={styles.selectedTestHeroTextCol}>
                    <Text style={styles.selectedTestHeroTitle} numberOfLines={2}>
                      {selectedTest.name}
                    </Text>
                    <View style={styles.selectedTestHeroBadges}>
                      <View style={styles.heroMiniBadge}>
                        <Ionicons name="time-outline" size={12} color="#1E3A8A" />
                        <Text style={styles.heroMiniBadgeText}>{selectedTest.duration}</Text>
                      </View>
                      <View style={styles.heroMiniBadge}>
                        <Ionicons name="calendar-outline" size={12} color="#059669" />
                        <Text style={styles.heroMiniBadgeText}>Report: {selectedTest.reportTime?.replace(/^Within\s+/i, '') || '24 hrs'}</Text>
                      </View>
                      <View style={styles.heroMiniBadge}>
                        <Ionicons
                          name={selectedTest.fastingRequired ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                          size={12}
                          color={selectedTest.fastingRequired ? '#D97706' : '#059669'}
                        />
                        <Text style={styles.heroMiniBadgeText}>
                          {selectedTest.fastingRequired ? 'Prep Required' : 'No Prep Needed'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Responsive Contained Medical Equipment Thumbnail */}
                  <View
                    style={[
                      styles.heroEquipmentThumbContainer,
                      width >= 768 && styles.heroEquipmentThumbContainerWide,
                      { backgroundColor: 'transparent', borderWidth: 0 },
                    ]}
                  >
                    {RADIOLOGY_3D_ICONS[selectedCategory?.id] ? (
                      <Image
                        source={RADIOLOGY_3D_ICONS[selectedCategory.id]}
                        style={[
                          styles.heroEquipmentImage,
                          { filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.12))' },
                        ]}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name="medical" size={32} color={activeCategoryDesign.btnBg} />
                    )}
                  </View>
                </View>
              </View>

              {/* Filters & Sorting Toolbar */}
              <View style={styles.filterToolbarCard}>
                {/* Search in providers */}
                <View style={styles.providerSearchInputWrap}>
                  <Ionicons name="search" size={16} color="#64748B" />
                  <TextInput
                    style={styles.providerSearchInput}
                    placeholder="Search centres or area..."
                    placeholderTextColor="#94A3B8"
                    value={providerSearch}
                    onChangeText={setProviderSearch}
                  />
                  {providerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setProviderSearch('')}>
                      <Ionicons name="close" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Clean Sort Selector Bar */}
                <View style={styles.sortBarContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortSelectorWrap}>
                    <Ionicons name="swap-vertical" size={13} color="#64748B" />
                    <Text style={styles.sortLabel}>Sort By:</Text>
                    {[
                      { key: 'price-low', label: 'Price: Low to High' },
                      { key: 'price-high', label: 'Price: High to Low' },
                      { key: 'rating', label: 'Highest Rated' },
                      { key: 'distance', label: 'Nearest' },
                      { key: 'earliest', label: 'Earliest Slot' },
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.sortOptionBtn, sortBy === s.key && styles.sortOptionBtnActive]}
                        onPress={() => setSortBy(s.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.sortOptionText, sortBy === s.key && styles.sortOptionTextActive]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Providers Comparison List */}
              <View style={styles.providersListingHeader}>
                <Text style={styles.providersListingTitle}>
                  Diagnostic Centres in {selectedCity} ({displayedProviders.length})
                </Text>
              </View>

              {displayedProviders.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="business-outline" size={44} color="#94A3B8" />
                  <Text style={styles.emptyStateTitle}>No centres found in this city</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {providerSearch.trim()
                      ? `No centres match "${providerSearch.trim()}" in ${selectedCity}. Try a different search term.`
                      : `No diagnostic centres currently offering this scan in ${selectedCity}.`}
                  </Text>
                  {providerSearch.trim() ? (
                    <TouchableOpacity
                      style={styles.emptyResetBtn}
                      onPress={() => {
                        setFilterRating(0);
                        setFilterOpen24x7(false);
                        setFilterCashless(false);
                        setProviderSearch('');
                      }}
                    >
                      <Text style={styles.emptyResetBtnText}>Clear Search</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <View style={styles.providersList}>
                  {displayedProviders.map((provider) => {
                    return (
                      <View
                        key={provider.id}
                        className="rad-provider-card"
                        style={[
                          styles.compactCentreCard,
                          {
                            width: getProviderCardWidth(),
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : activeCategoryDesign.border,
                            backgroundColor: isDark ? '#111C35' : activeCategoryDesign.bg,
                            
                            boxShadow: `0 8px 24px -4px ${activeCategoryDesign.cardShadow}`,
                          },
                        ]}
                      >
                        {/* Top: Centre Name & Rating */}
                        <View style={styles.compactCardTopRow}>
                          <TouchableOpacity
                            style={styles.compactNameContainer}
                            onPress={() => handleOpenCentreDetails(provider)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.compactCentreName} numberOfLines={2}>
                              {provider.name}
                            </Text>
                          </TouchableOpacity>

                          {provider.rating ? (
                            <View style={styles.compactRatingWrap}>
                              <Ionicons name="star" size={12} color="#F59E0B" />
                              <Text style={styles.compactRatingScore}>{provider.rating}</Text>
                              {provider.reviewsCount ? (
                                <Text style={styles.compactReviewsCount}>({provider.reviewsCount})</Text>
                              ) : null}
                            </View>
                          ) : null}
                        </View>

                        {/* Location (km removed as requested) */}
                        <View style={styles.compactLocationRow}>
                          <Ionicons name="location-outline" size={13} color={isDark ? '#94A3B8' : '#475569'} style={styles.compactMetaIcon} />
                          <Text style={styles.compactMetaText} numberOfLines={1}>
                            {provider.area}
                          </Text>
                        </View>

                        {/* Price Row: Prominent current price, original price, discount */}
                        <View
                          style={[
                            styles.compactPriceRow,
                            { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)' },
                          ]}
                        >
                          <View style={styles.compactPriceLeft}>
                            <Text style={styles.compactCurrentPrice}>
                              ₹{provider.price.toLocaleString('en-IN')}
                            </Text>
                            {provider.mrp && provider.mrp > provider.price ? (
                              <Text style={styles.compactStrikeMrp}>
                                ₹{provider.mrp.toLocaleString('en-IN')}
                              </Text>
                            ) : null}
                            {provider.discountPercent ? (
                              <View style={styles.discountBadge}>
                                <Text style={styles.discountBadgeText}>
                                  {provider.discountPercent}% OFF
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Essential Actions: Directions & Book Now */}
                        <View style={styles.compactCardActionsRow}>
                          <TouchableOpacity
                            style={styles.compactSecondaryBtn}
                            onPress={() => {
                              const url = getGoogleMapsDirectionsUrl(provider);
                              Linking.openURL(url);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="navigate-outline" size={13} color="#475569" />
                            <Text style={styles.compactSecondaryBtnText}>Directions</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="rad-cta-btn"
                            style={styles.organicCtaBtn}
                            onPress={() => handleStartBooking(provider, selectedTest)}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.organicArrowCircle, { borderColor: activeCategoryDesign.btnBg }]}>
                              <Ionicons name="arrow-forward" size={11} color={activeCategoryDesign.btnBg} />
                            </View>
                            <Text style={[styles.organicCtaText, { color: activeCategoryDesign.btnBg }]}>
                              Book Now
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

                    {/* VIEW: CENTRE DETAILS (Dedicated screen in navigation history) */}
          {viewMode === 'centre-details' && selectedProvider && selectedTest && (
            <View style={styles.sectionWrap}>
              <View style={styles.centreDetailsCard}>
                {/* Top Row: Centre Identity & Rating */}
                <View style={styles.centreDetailsTopRow}>
                  <View style={styles.centreDetailsNameCol}>
                    <Text style={styles.centreDetailsTitle}>{selectedProvider.name}</Text>
                    <View style={styles.centreLocationRow}>
                      <Ionicons name="location-outline" size={15} color="#64748B" />
                      <Text style={styles.centreAddressText}>
                        {selectedProvider.address || `${selectedProvider.area}, ${selectedProvider.city}`}
                      </Text>
                      <Text style={styles.centreDot}>•</Text>
                      <Ionicons name="navigate-outline" size={13} color="#1E3A8A" />
                      <Text style={styles.centreDistanceText}>{selectedProvider.distance} away</Text>
                    </View>
                  </View>

                  <View style={styles.centreRatingBox}>
                    <View style={styles.ratingNumberRow}>
                      <Ionicons name="star" size={15} color="#F59E0B" />
                      <Text style={styles.centreRatingScore}>{selectedProvider.rating}</Text>
                    </View>
                    <Text style={styles.centreReviewsText}>{selectedProvider.reviewsCount} reviews</Text>
                  </View>
                </View>

                {/* Accreditations & Badges */}
                <View style={styles.centreAccredRow}>
                  {selectedProvider.accreditations?.[0] && (
                    <View style={styles.centreAccredChip}>
                      <Ionicons name="shield-checkmark" size={12} color="#00BB95" />
                      <Text style={styles.centreAccredText}>{selectedProvider.accreditations[0]}</Text>
                    </View>
                  )}
                  <View style={styles.centreAccredChip}>
                    <Ionicons name="time-outline" size={12} color="#64748B" />
                    <Text style={styles.centreAccredText}>{selectedProvider.openHours}</Text>
                  </View>
                </View>

                {/* Google Maps Directions Action */}
                <TouchableOpacity
                  style={styles.centreDirectionsBtn}
                  onPress={() => {
                    const url = getGoogleMapsDirectionsUrl(selectedProvider);
                    Linking.openURL(url);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={16} color="#00BB95" />
                  <Text style={styles.centreDirectionsBtnText}>Get Directions</Text>
                  <Ionicons name="open-outline" size={14} color="#00BB95" />
                </TouchableOpacity>

                <View style={styles.centreDivider} />

                {/* Facilities & Equipment Section */}
                <Text style={styles.centreSectionHeading}>Key Facilities</Text>
                <View style={styles.centreFacilitiesList}>
                  {selectedProvider.facilities?.slice(0, 3).map((fac) => (
                    <View key={fac} style={styles.centreFacilityItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#00BB95" />
                      <Text style={styles.centreFacilityText}>{fac}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.centreDivider} />

                {/* Selected Test Details Box */}
                <Text style={styles.centreSectionHeading}>Selected Scan</Text>
                <View style={styles.centreTestSummaryBox}>
                  <View style={styles.centreTestSummaryTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.centreTestName}>{selectedTest.name}</Text>
                      <Text style={styles.centreTestModality}>{selectedCategory?.name || 'Radiology Scan'}</Text>
                    </View>
                    <View style={styles.centrePriceCol}>
                      <Text style={styles.centreFinalPrice}>
                        ₹{Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.centreMrpPrice}>₹{selectedTest.mrp.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  <View style={styles.centreTestMetaRow}>
                    <View style={styles.centreMetaItem}>
                      <Ionicons name="time-outline" size={13} color="#64748B" />
                      <Text style={styles.centreMetaText}>Duration: {selectedTest.duration}</Text>
                    </View>
                    <View style={styles.centreMetaItem}>
                      <Ionicons name="document-text-outline" size={13} color="#00BB95" />
                      <Text style={[styles.centreMetaText, { color: '#00BB95', fontWeight: '700' }]}>
                        Report in {selectedProvider.turnaroundTime?.replace(/^Within\s+/i, '') || '24 hrs'}
                      </Text>
                    </View>
                  </View>

                  {/* Preparation Guidelines */}
                  <View style={styles.centrePrepBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#1E3A8A" />
                    <Text style={styles.centrePrepText}>
                      {selectedTest.preparation}
                      {selectedTest.fastingRequired ? ` Requires ${selectedTest.fastingHours} hrs fasting.` : ''}
                    </Text>
                  </View>
                </View>

                {/* Primary Action Buttons */}
                <View style={styles.centreActionFooterRow}>
                  <TouchableOpacity
                    style={styles.centreBackActionBtn}
                    onPress={handleGoBack}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={16} color="#64748B" />
                    <Text style={styles.centreBackActionBtnText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.centreBookActionBtn}
                    onPress={handleProceedFromCentreDetails}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.centreBookActionBtnText}>Select Date & Time</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* VIEW 4: APPOINTMENT BOOKING FLOW (3 STEPS) */}
          {viewMode === 'booking' && selectedTest && selectedProvider && (
            <View style={styles.bookingFlowContainer}>
              {/* Stepper Header (100% responsive, no fixed width clipping) */}
              <View style={styles.stepperHeader}>
                <View style={styles.stepperProgressRow}>
                  {[
                    { num: 1, label: 'Patient' },
                    { num: 2, label: 'Date & Time' },
                    { num: 3, label: 'Review' },
                  ].map((s, idx) => (
                    <React.Fragment key={s.num}>
                      <TouchableOpacity
                        style={styles.stepItem}
                        onPress={() => {
                          if (s.num < bookingStep) setBookingStep(s.num);
                        }}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.stepCircle,
                            bookingStep === s.num && styles.stepCircleActive,
                            bookingStep > s.num && styles.stepCircleCompleted,
                          ]}
                        >
                          {bookingStep > s.num ? (
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          ) : (
                            <Text
                              style={[
                                styles.stepCircleNum,
                                bookingStep === s.num && styles.stepCircleNumActive,
                              ]}
                            >
                              {s.num}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.stepLabel,
                            bookingStep === s.num && styles.stepLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                      {idx < 2 && (
                        <View
                          style={[
                            styles.stepConnector,
                            bookingStep > s.num && styles.stepConnectorActive,
                          ]}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>

              {/* Main Booking Content Grid (Left Wizard, Right Summary) */}
              <View style={[styles.bookingMainLayout, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                {/* Left Column: Active Step Content */}
                <View style={[styles.bookingWizardLeftCol, isDesktop && { flex: 2 }]}>
                  {/* STEP 1: SELECT PATIENT */}
                  {bookingStep === 1 && (
                    <View style={styles.wizardCard}>
                      <View style={styles.wizardStepTitleRow}>
                        <Ionicons name="person-circle-outline" size={24} color="#00BB95" />
                        <Text style={styles.wizardStepHeading}>Select Patient</Text>
                      </View>

                      {/* Patients List */}
                      <View style={styles.patientCardsList}>
                        {patientsList.map((pat) => {
                          const isSelected = selectedPatient?.id === pat.id;
                          const metaItems = [
                            pat.age ? `${pat.age} Yrs` : null,
                            pat.gender ? pat.gender : null,
                            pat.phone ? pat.phone : null,
                          ].filter(Boolean);
                          return (
                            <TouchableOpacity
                              key={pat.id}
                              style={[
                                styles.patientCard,
                                isSelected && styles.patientCardSelected,
                              ]}
                              onPress={() => setSelectedPatient(pat)}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.patientAvatarWrap, isSelected && styles.patientAvatarWrapSelected]}>
                                <Ionicons name="person" size={18} color={isSelected ? '#00BB95' : '#64748B'} />
                              </View>

                              <View style={styles.patientInfoCol}>
                                <View style={styles.patientNameRelationRow}>
                                  <Text style={styles.patientNameText} numberOfLines={1} ellipsizeMode="tail">{pat.name}</Text>
                                  {pat.relation ? (
                                    <View style={styles.relationBadge}>
                                      <Text style={styles.relationBadgeText}>{pat.relation}</Text>
                                    </View>
                                  ) : null}
                                </View>
                                {metaItems.length > 0 && (
                                  <Text style={styles.patientMetaText} numberOfLines={1} ellipsizeMode="tail">
                                    {metaItems.join(' • ')}
                                  </Text>
                                )}
                              </View>

                              <View style={[styles.patientSelectIndicator, isSelected && styles.patientSelectIndicatorSelected]}>
                                {isSelected ? (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                ) : null}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Add New Patient Form Toggle */}
                      {!showAddPatientForm ? (
                        <TouchableOpacity
                          style={styles.addNewPatientBtn}
                          onPress={() => setShowAddPatientForm(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={18} color="#00BB95" />
                          <Text style={styles.addNewPatientBtnText}>Add Family Member</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.newPatientFormBox}>
                          <Text style={styles.formSectionTitle}>Add Family Member</Text>
                          <View style={styles.formRow}>
                            <View style={styles.formInputGroup}>
                              <Text style={styles.inputLabel}>Full Name *</Text>
                              <TextInput
                                style={styles.textInputBox}
                                placeholder="e.g. Ananya Kumar"
                                placeholderTextColor="#94A3B8"
                                value={newPatient.name}
                                onChangeText={(t) => setNewPatient((p) => ({ ...p, name: t }))}
                              />
                            </View>
                            <View style={styles.formInputGroupSmall}>
                              <Text style={styles.inputLabel}>Age *</Text>
                              <TextInput
                                style={styles.textInputBox}
                                placeholder="Age"
                                placeholderTextColor="#94A3B8"
                                keyboardType="numeric"
                                value={newPatient.age}
                                onChangeText={(t) => setNewPatient((p) => ({ ...p, age: t }))}
                              />
                            </View>
                          </View>

                          <View style={styles.formRow}>
                            <View style={styles.formInputGroup}>
                              <Text style={styles.inputLabel}>Gender</Text>
                              <View style={styles.genderSelectRow}>
                                {['Male', 'Female', 'Other'].map((g) => (
                                  <TouchableOpacity
                                    key={g}
                                    style={[
                                      styles.genderPill,
                                      newPatient.gender === g && styles.genderPillActive,
                                    ]}
                                    onPress={() => setNewPatient((p) => ({ ...p, gender: g }))}
                                  >
                                    <Text
                                      style={[
                                        styles.genderPillText,
                                        newPatient.gender === g && styles.genderPillTextActive,
                                      ]}
                                    >
                                      {g}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>

                            <View style={styles.formInputGroup}>
                              <Text style={styles.inputLabel}>Relationship</Text>
                              <TextInput
                                style={styles.textInputBox}
                                placeholder="e.g. Mother, Father, Child"
                                placeholderTextColor="#94A3B8"
                                value={newPatient.relation}
                                onChangeText={(t) => setNewPatient((p) => ({ ...p, relation: t }))}
                              />
                            </View>
                          </View>

                          <View style={styles.formInputGroup}>
                            <Text style={styles.inputLabel}>Contact Phone Number</Text>
                            <TextInput
                              style={styles.textInputBox}
                              placeholder="+91 Mobile Number"
                              placeholderTextColor="#94A3B8"
                              keyboardType="phone-pad"
                              value={newPatient.phone}
                              onChangeText={(t) => setNewPatient((p) => ({ ...p, phone: t }))}
                            />
                          </View>

                          <View style={styles.formActionsRow}>
                            <TouchableOpacity
                              style={styles.cancelFormBtn}
                              onPress={() => setShowAddPatientForm(false)}
                            >
                              <Text style={styles.cancelFormBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.savePatientBtn}
                              onPress={handleAddNewPatient}
                            >
                              <Text style={styles.savePatientBtnText}>Save Patient</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Prescription Upload (Optional) */}
                      <View style={styles.prescriptionUploadCard}>
                        <View style={styles.prescriptionCardHeaderRow}>
                          <View style={styles.prescriptionIconWrap}>
                            <Ionicons name="document-text-outline" size={20} color="#00BB95" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prescriptionTitle}>Upload prescription (optional)</Text>
                            <Text style={styles.prescriptionSubtitle}>Attach doctor's referral slip (PDF, JPG, PNG)</Text>
                          </View>
                          {prescriptionDoc ? (
                            <TouchableOpacity
                              onPress={() => setPrescriptionDoc(null)}
                              style={styles.prescriptionRemoveBtn}
                              accessibilityLabel="Remove prescription"
                            >
                              <Ionicons name="trash-outline" size={15} color="#EF4444" />
                              <Text style={styles.prescriptionRemoveText}>Remove</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.prescriptionAttachPillBtn}
                              onPress={() => {
                                setPrescriptionDoc({
                                  name: `Rx_${(selectedTest?.name || 'Scan').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}_Referral.pdf`,
                                  size: '1.4 MB',
                                  date: new Date().toLocaleDateString(),
                                });
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="cloud-upload-outline" size={16} color="#00BB95" />
                              <Text style={styles.prescriptionAttachPillText}>Attach File</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {prescriptionDoc && (
                          <View style={styles.attachedFilePill}>
                            <Ionicons name="checkmark-circle" size={16} color="#00BB95" />
                            <Text style={styles.attachedFileName} numberOfLines={1}>{prescriptionDoc.name}</Text>
                            <Text style={styles.attachedFileSize}>({prescriptionDoc.size})</Text>
                          </View>
                        )}
                      </View>

                      {/* Step 1 Footer Actions */}
                      <View style={styles.wizardFooterBtnRow}>
                        <TouchableOpacity
                          style={styles.wizardBackBtn}
                          onPress={handleGoBack}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-back" size={16} color="#64748B" />
                          <Text style={styles.wizardBackBtnText}>Back</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.wizardNextBtn}
                          onPress={handleContinueToStep2}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.wizardNextBtnText}>Continue</Text>
                          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* STEP 2: SELECT DATE & TIME SLOT */}
                  {bookingStep === 2 && (
                    <View style={styles.wizardCard}>
                      <View style={styles.wizardStepTitleRow}>
                        <Ionicons name="calendar-outline" size={24} color="#00BB95" />
                        <Text style={styles.wizardStepHeading}>Choose Date & Time</Text>
                      </View>

                      {/* Compact Summary of Selected Scan & Centre */}
                      <View style={styles.stepSummaryBanner}>
                        <View style={styles.stepSummaryItem}>
                          <Ionicons name="scan-outline" size={15} color="#00BB95" />
                          <Text style={styles.stepSummaryMain} numberOfLines={1}>{selectedTest.name}</Text>
                        </View>
                        <Text style={styles.stepSummaryDivider}>•</Text>
                        <View style={styles.stepSummaryItem}>
                          <Ionicons name="location-outline" size={14} color="#64748B" />
                          <Text style={styles.stepSummarySub} numberOfLines={1}>{selectedProvider.name} · {selectedProvider.area}</Text>
                        </View>
                      </View>

                      {/* Next 7 Days Horizontal Bar */}
                      <Text style={styles.subSectionTitle}>Date</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.datesScrollRow}
                      >
                        {appointmentDays.map((d) => {
                          const isSelected = selectedDateIndex === d.index;
                          return (
                            <TouchableOpacity
                              key={d.index}
                              style={[
                                styles.datePillCard,
                                isSelected && styles.datePillCardActive,
                              ]}
                              onPress={() => setSelectedDateIndex(d.index)}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.datePillDayName,
                                  isSelected && styles.datePillDayNameActive,
                                ]}
                              >
                                {d.dayName}
                              </Text>
                              <Text
                                style={[
                                  styles.datePillDateNum,
                                  isSelected && styles.datePillDateNumActive,
                                ]}
                              >
                                {d.dateNum}
                              </Text>
                              <Text
                                style={[
                                  styles.datePillMonthName,
                                  isSelected && styles.datePillMonthNameActive,
                                ]}
                              >
                                {d.monthName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* Time Slots Categorized */}
                      <View style={styles.slotSectionHeaderRow}>
                        <Text style={styles.subSectionTitle}>Available Time Slots</Text>
                      </View>

                      {/* Morning Slots */}
                      <View style={styles.slotCategoryGroup}>
                        <View style={styles.slotCategoryHeader}>
                          <Ionicons name="sunny-outline" size={15} color="#D97706" />
                          <Text style={styles.slotCategoryTitle}>Morning (8 AM - 12 PM)</Text>
                        </View>
                        <View style={styles.slotsPillsGrid}>
                          {['08:30 AM', '09:30 AM', '10:30 AM', '11:30 AM'].map((slot) => {
                            const chosenDay = appointmentDays[selectedDateIndex] || appointmentDays[0];
                            const slotStatus = getSlotStatus({
                              date: chosenDay?.isoDate,
                              time: slot,
                              serviceType: 'radiology',
                              providerId: selectedProvider?.id,
                            });
                            const isAvailable = slotStatus.available;
                            const isSelected = selectedTimeSlot === slot;
                            return (
                              <TouchableOpacity
                                key={slot}
                                style={[
                                  styles.timeSlotBtn,
                                  isSelected && styles.timeSlotBtnActive,
                                  !isAvailable && styles.timeSlotBtnDisabled,
                                ]}
                                disabled={!isAvailable}
                                onPress={() => setSelectedTimeSlot(slot)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.timeSlotText,
                                    isSelected && styles.timeSlotTextActive,
                                    !isAvailable && styles.timeSlotTextDisabled,
                                  ]}
                                >
                                  {slot}
                                </Text>
                                {!isAvailable && (
                                  <View style={styles.slotStatusBadge}>
                                    <Text style={styles.slotStatusBadgeText}>
                                      {slotStatus.status === 'PASSED' ? 'Passed' : 'Booked'}
                                    </Text>
                                  </View>
                                )}
                                {isSelected && isAvailable && (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Afternoon Slots */}
                      <View style={styles.slotCategoryGroup}>
                        <View style={styles.slotCategoryHeader}>
                          <Ionicons name="partly-sunny-outline" size={15} color="#0284C7" />
                          <Text style={styles.slotCategoryTitle}>Afternoon (12 PM - 4 PM)</Text>
                        </View>
                        <View style={styles.slotsPillsGrid}>
                          {['12:30 PM', '01:30 PM', '02:30 PM', '03:30 PM'].map((slot) => {
                            const chosenDay = appointmentDays[selectedDateIndex] || appointmentDays[0];
                            const slotStatus = getSlotStatus({
                              date: chosenDay?.isoDate,
                              time: slot,
                              serviceType: 'radiology',
                              providerId: selectedProvider?.id,
                            });
                            const isAvailable = slotStatus.available;
                            const isSelected = selectedTimeSlot === slot;
                            return (
                              <TouchableOpacity
                                key={slot}
                                style={[
                                  styles.timeSlotBtn,
                                  isSelected && styles.timeSlotBtnActive,
                                  !isAvailable && styles.timeSlotBtnDisabled,
                                ]}
                                disabled={!isAvailable}
                                onPress={() => setSelectedTimeSlot(slot)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.timeSlotText,
                                    isSelected && styles.timeSlotTextActive,
                                    !isAvailable && styles.timeSlotTextDisabled,
                                  ]}
                                >
                                  {slot}
                                </Text>
                                {!isAvailable && (
                                  <View style={styles.slotStatusBadge}>
                                    <Text style={styles.slotStatusBadgeText}>
                                      {slotStatus.status === 'PASSED' ? 'Passed' : 'Booked'}
                                    </Text>
                                  </View>
                                )}
                                {isSelected && isAvailable && (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Evening Slots */}
                      <View style={styles.slotCategoryGroup}>
                        <View style={styles.slotCategoryHeader}>
                          <Ionicons name="moon-outline" size={15} color="#1E3A8A" />
                          <Text style={styles.slotCategoryTitle}>Evening (4 PM - 8 PM)</Text>
                        </View>
                        <View style={styles.slotsPillsGrid}>
                          {['04:30 PM', '05:30 PM', '06:30 PM', '07:30 PM'].map((slot) => {
                            const chosenDay = appointmentDays[selectedDateIndex] || appointmentDays[0];
                            const slotStatus = getSlotStatus({
                              date: chosenDay?.isoDate,
                              time: slot,
                              serviceType: 'radiology',
                              providerId: selectedProvider?.id,
                            });
                            const isAvailable = slotStatus.available;
                            const isSelected = selectedTimeSlot === slot;
                            return (
                              <TouchableOpacity
                                key={slot}
                                style={[
                                  styles.timeSlotBtn,
                                  isSelected && styles.timeSlotBtnActive,
                                  !isAvailable && styles.timeSlotBtnDisabled,
                                ]}
                                disabled={!isAvailable}
                                onPress={() => setSelectedTimeSlot(slot)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.timeSlotText,
                                    isSelected && styles.timeSlotTextActive,
                                    !isAvailable && styles.timeSlotTextDisabled,
                                  ]}
                                >
                                  {slot}
                                </Text>
                                {!isAvailable && (
                                  <View style={styles.slotStatusBadge}>
                                    <Text style={styles.slotStatusBadgeText}>
                                      {slotStatus.status === 'PASSED' ? 'Passed' : 'Booked'}
                                    </Text>
                                  </View>
                                )}
                                {isSelected && isAvailable && (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Selected Slot Feedback Banner */}
                      {selectedTimeSlot ? (
                        <View style={styles.selectedDateNotice}>
                          <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          <Text style={styles.selectedDateNoticeText}>
                            Selected: <Text style={styles.boldText}>{appointmentDays[selectedDateIndex]?.fullLabel}</Text> at <Text style={styles.boldText}>{selectedTimeSlot}</Text>
                          </Text>
                        </View>
                      ) : null}

                      {/* Step 2 Footer Actions */}
                      <View style={styles.wizardFooterBtnRow}>
                        <TouchableOpacity
                          style={styles.wizardBackBtn}
                          onPress={handleGoBack}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-back" size={16} color="#64748B" />
                          <Text style={styles.wizardBackBtnText}>Back</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.wizardNextBtn}
                          onPress={handleContinueToStep3}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.wizardNextBtnText}>Continue</Text>
                          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* STEP 3: REVIEW BOOKING */}
                  {bookingStep === 3 && (
                    <View style={styles.wizardCard}>
                      <View style={styles.wizardStepTitleRow}>
                        <Ionicons name="checkmark-done-circle-outline" size={24} color="#00BB95" />
                        <Text style={styles.wizardStepHeading}>Review Booking</Text>
                      </View>

                      {/* Summary Blocks */}
                      <View style={styles.reviewBlocksWrap}>
                        {/* Patient Block */}
                        <View style={styles.reviewCard}>
                          <View style={styles.reviewCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="person-outline" size={15} color="#00BB95" />
                              <Text style={styles.reviewCardTitle}>Patient</Text>
                            </View>
                            <TouchableOpacity onPress={() => setBookingStep(1)}>
                              <Text style={styles.reviewEditLink}>Edit</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.reviewMainText}>{selectedPatient?.name}</Text>
                          <Text style={styles.reviewSubText}>
                            {[selectedPatient?.relation, selectedPatient?.age ? `${selectedPatient.age} Yrs` : null, selectedPatient?.gender, selectedPatient?.phone].filter(Boolean).join(' • ')}
                          </Text>
                        </View>

                        {/* Scan & Centre Block */}
                        <View style={styles.reviewCard}>
                          <View style={styles.reviewCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="scan-outline" size={15} color="#00BB95" />
                              <Text style={styles.reviewCardTitle}>Scan & Diagnostic Centre</Text>
                            </View>
                          </View>
                          <Text style={styles.reviewMainText}>{selectedTest.name}</Text>
                          <View style={styles.dividerSubtle} />
                          <Text style={styles.reviewSecondaryTitle}>{selectedProvider.name}</Text>
                          <Text style={styles.reviewSubText}>{selectedProvider.area}, {selectedProvider.city}</Text>
                        </View>

                        {/* Date & Time Block */}
                        <View style={styles.reviewCard}>
                          <View style={styles.reviewCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="calendar-outline" size={15} color="#00BB95" />
                              <Text style={styles.reviewCardTitle}>Date & Time</Text>
                            </View>
                            <TouchableOpacity onPress={() => setBookingStep(2)}>
                              <Text style={styles.reviewEditLink}>Edit</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.reviewMainText}>{appointmentDays[selectedDateIndex]?.fullLabel}</Text>
                          <Text style={styles.reviewSubText}>Slot: <Text style={styles.boldText}>{selectedTimeSlot}</Text></Text>
                        </View>

                        {/* Prescription Review Card (Only shown if attached) */}
                        {prescriptionDoc ? (
                          <View style={styles.reviewCard}>
                            <View style={styles.reviewCardHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="document-attach-outline" size={15} color="#00BB95" />
                                <Text style={styles.reviewCardTitle}>Prescription</Text>
                              </View>
                              <TouchableOpacity onPress={() => setBookingStep(1)}>
                                <Text style={styles.reviewEditLink}>Edit</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.reviewMainText}>{prescriptionDoc.name}</Text>
                            <Text style={styles.reviewSubText}>{prescriptionDoc.size} • Attached</Text>
                          </View>
                        ) : null}

                        {/* Clinical Prep Instructions */}
                        {selectedTest.preparation ? (
                          <View style={styles.instructionsAlertBox}>
                            <Ionicons name="information-circle-outline" size={18} color="#1E3A8A" />
                            <View style={styles.instructionsAlertCol}>
                              <Text style={styles.instructionsAlertTitle}>Preparation Guidelines</Text>
                              <Text style={styles.instructionsAlertText}>
                                {selectedTest.preparation}
                              </Text>
                              {selectedTest.fastingRequired && (
                                <Text style={styles.instructionsFastingWarning}>
                                  Requires {selectedTest.fastingHours} hours fasting.
                                </Text>
                              )}
                            </View>
                          </View>
                        ) : null}
                      </View>

                      {/* Step 3 Footer Actions */}
                      <View style={styles.wizardFooterBtnRow}>
                        <TouchableOpacity
                          style={styles.wizardBackBtn}
                          onPress={handleGoBack}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-back" size={16} color="#64748B" />
                          <Text style={styles.wizardBackBtnText}>Back</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.wizardNextBtn}
                          onPress={handleProceedToPayment}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.wizardNextBtnText}>
                            Confirm & Pay ₹{Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier).toLocaleString('en-IN')}
                          </Text>
                          <Ionicons name="lock-closed" size={15} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Right Column: Persistent Order Summary Breakdown */}
                <View style={[styles.bookingSummaryRightCol, isDesktop && { flex: 1,  top: 90, alignSelf: 'flex-start' }]}>
                  <View style={styles.summaryCard}>
                    {/* Mini scan header */}
                    <View style={styles.summaryScanHeader}>
                      <Text style={styles.summaryScanName} numberOfLines={1}>{selectedTest.name}</Text>
                      <Text style={styles.summaryCentreName} numberOfLines={1}>{selectedProvider.name}</Text>
                    </View>
                    <View style={styles.summaryDivider} />

                    <Text style={styles.summaryCardTitle}>Price Breakdown</Text>
                    <View style={styles.summaryMiniDivider} />

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryRowLabel}>MRP</Text>
                      <Text style={styles.summaryRowValue}>
                        ₹{selectedTest.mrp.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryDiscountLabel}>Discount</Text>
                      <Text style={styles.summaryDiscountValue}>
                        -₹{(selectedTest.mrp - Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier)).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryRowLabel}>Booking Fee</Text>
                      <Text style={styles.summaryFreeValue}>FREE</Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryTotalRow}>
                      <Text style={styles.summaryTotalLabel}>Total Payable</Text>
                      <Text style={styles.summaryTotalValue}>
                        ₹{Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    {/* Guarantee Box */}
                    <View style={styles.guaranteeBox}>
                      <Ionicons name="shield-checkmark" size={16} color="#00BB95" />
                      <Text style={styles.guaranteeText}>
                        Free cancellation up to 2 hours before appointment.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* VIEW 5: SECURE PAYMENT PAGE */}
          {viewMode === 'payment' && selectedTest && selectedProvider && (
            <View style={styles.sectionWrap}>
              <View style={[styles.paymentContainer, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                {/* Left: Payment Method Selection */}
                <View style={[styles.paymentMethodsCol, isDesktop && { flex: 2 }]}>
                  <View style={styles.paymentCard}>
                    <View style={styles.paymentHeaderRow}>
                      <Ionicons name="lock-closed" size={20} color="#00BB95" />
                      <View>
                        <Text style={styles.paymentHeading}>Secure Payment</Text>
                        <Text style={styles.paymentSub}>
                          Select your preferred payment method
                        </Text>
                      </View>
                    </View>

                    {/* Payment Tabs */}
                    <View style={styles.paymentTabOptions}>
                      {[
                        { id: 'upi', label: 'UPI / QR Code', icon: 'qr-code-outline' },
                        { id: 'card', label: 'Credit / Debit Card', icon: 'card-outline' },
                        { id: 'netbanking', label: 'Net Banking', icon: 'business-outline' },
                        { id: 'pay_at_centre', label: 'Pay at Centre', icon: 'cash-outline' },
                      ].map((tab) => {
                        const isSelected = paymentMethod === tab.id;
                        return (
                          <TouchableOpacity
                            key={tab.id}
                            style={[
                              styles.paymentTabBtn,
                              isSelected && styles.paymentTabBtnActive,
                            ]}
                            onPress={() => setPaymentMethod(tab.id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={tab.icon}
                              size={18}
                              color={isSelected ? '#00BB95' : '#64748B'}
                            />
                            <Text
                              style={[
                                styles.paymentTabText,
                                isSelected && styles.paymentTabTextActive,
                              ]}
                            >
                              {tab.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Payment Method Details Form */}
                    <View style={styles.paymentMethodFormArea}>
                      {paymentMethod === 'upi' && (
                        <View style={styles.upiFormWrap}>
                          <Text style={styles.formLabelBold}>Instant UPI</Text>
                          <Text style={styles.formSub}>Enter your UPI ID</Text>

                          <View style={styles.upiInputRow}>
                            <TextInput
                              style={styles.upiTextInput}
                              placeholder="Enter UPI ID (e.g. mobile@upi)"
                              placeholderTextColor="#94A3B8"
                              value={upiId}
                              onChangeText={setUpiId}
                            />
                            <TouchableOpacity
                              style={styles.verifyUpiBtn}
                              onPress={() => showAlert('UPI Verified', 'UPI handle verified successfully.')}
                            >
                              <Text style={styles.verifyUpiBtnText}>Verify</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.upiAppsRow}>
                            <View style={styles.upiAppBadge}>
                              <Text style={styles.upiAppBadgeText}>Google Pay</Text>
                            </View>
                            <View style={styles.upiAppBadge}>
                              <Text style={styles.upiAppBadgeText}>PhonePe</Text>
                            </View>
                            <View style={styles.upiAppBadge}>
                              <Text style={styles.upiAppBadgeText}>Paytm</Text>
                            </View>
                            <View style={styles.upiAppBadge}>
                              <Text style={styles.upiAppBadgeText}>BHIM</Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {paymentMethod === 'card' && (
                        <View style={styles.cardFormWrap}>
                          <Text style={styles.formLabelBold}>Card Details</Text>
                          <Text style={styles.formSub}>Visa, MasterCard, RuPay accepted</Text>

                          <View style={styles.formInputGroup}>
                            <Text style={styles.inputLabel}>Card Number</Text>
                            <TextInput
                              style={styles.textInputBox}
                              placeholder="XXXX XXXX XXXX XXXX"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              maxLength={19}
                              value={cardNumber}
                              onChangeText={setCardNumber}
                            />
                          </View>

                          <View style={styles.formRow}>
                            <View style={styles.formInputGroup}>
                              <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
                              <TextInput
                                style={styles.textInputBox}
                                placeholder="MM/YY"
                                placeholderTextColor="#94A3B8"
                                maxLength={5}
                                value={cardExpiry}
                                onChangeText={setCardExpiry}
                              />
                            </View>
                            <View style={styles.formInputGroup}>
                              <Text style={styles.inputLabel}>CVV</Text>
                              <TextInput
                                style={styles.textInputBox}
                                placeholder="3 digits"
                                placeholderTextColor="#94A3B8"
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                                value={cardCvv}
                                onChangeText={setCardCvv}
                              />
                            </View>
                          </View>
                        </View>
                      )}

                      {paymentMethod === 'netbanking' && (
                        <View style={styles.netbankingFormWrap}>
                          <Text style={styles.formLabelBold}>Select Bank</Text>
                          <View style={styles.bankPillsGrid}>
                            {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Canara Bank'].map((b) => (
                              <TouchableOpacity key={b} style={styles.bankPill}>
                                <Ionicons name="business" size={14} color="#1E3A8A" />
                                <Text style={styles.bankPillText}>{b}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {paymentMethod === 'pay_at_centre' && (
                        <View style={styles.payAtCentreBox}>
                          <Ionicons name="cash" size={32} color="#00BB95" />
                          <Text style={styles.payAtCentreHeading}>Pay at Centre</Text>
                          <Text style={styles.payAtCentreText}>
                            Slot reserved immediately. Settle{' '}
                            <Text style={styles.boldText}>
                              ₹{Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier).toLocaleString('en-IN')}
                            </Text>{' '}
                            at the reception desk upon arrival.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Payment Footer Actions */}
                    <View style={styles.wizardFooterBtnRow}>
                      <TouchableOpacity
                        style={styles.wizardBackBtn}
                        onPress={handleGoBack}
                        activeOpacity={0.8}
                        disabled={isProcessingPayment}
                      >
                        <Ionicons name="arrow-back" size={16} color="#64748B" />
                        <Text style={styles.wizardBackBtnText}>Back</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.executePayBtn,
                          isProcessingPayment && styles.executePayBtnDisabled,
                        ]}
                        onPress={handleExecutePayment}
                        disabled={isProcessingPayment}
                        activeOpacity={0.85}
                      >
                        {isProcessingPayment ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                            <Text style={styles.executePayBtnText}>
                              {paymentMethod === 'pay_at_centre'
                                ? 'Confirm Booking'
                                : `Pay ₹${Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier).toLocaleString('en-IN')}`}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Right: Payment Recap */}
                <View style={[styles.paymentRecapCol, isDesktop && { flex: 1 }]}>
                  <View style={styles.recapCard}>
                    <Text style={styles.recapCardTitle}>Booking Summary</Text>
                    <View style={styles.summaryDivider} />

                    <View style={styles.recapItem}>
                      <Text style={styles.recapLabel}>Patient</Text>
                      <Text style={styles.recapVal}>{selectedPatient?.name} ({selectedPatient?.relation})</Text>
                    </View>

                    <View style={styles.recapItem}>
                      <Text style={styles.recapLabel}>Scan</Text>
                      <Text style={styles.recapVal}>{selectedTest.name}</Text>
                    </View>

                    <View style={styles.recapItem}>
                      <Text style={styles.recapLabel}>Centre</Text>
                      <Text style={styles.recapVal}>{selectedProvider.name}</Text>
                    </View>

                    <View style={styles.recapItem}>
                      <Text style={styles.recapLabel}>Date & Time</Text>
                      <Text style={styles.recapVal}>
                        {appointmentDays[selectedDateIndex]?.fullLabel} at {selectedTimeSlot}
                      </Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryRowLabel}>MRP</Text>
                      <Text style={styles.summaryRowValue}>₹{selectedTest.mrp.toLocaleString('en-IN')}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryDiscountLabel}>Discount</Text>
                      <Text style={styles.summaryDiscountValue}>
                        -₹{(selectedTest.mrp - Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier)).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.summaryTotalRow}>
                      <Text style={styles.summaryTotalLabel}>Total Payable</Text>
                      <Text style={styles.summaryTotalValue}>
                        ₹{Math.round(selectedTest.typicalPrice * selectedProvider.discountMultiplier).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* VIEW 6: BOOKING CONFIRMATION */}
          {viewMode === 'confirmation' && latestBooking && (
            <View style={styles.confirmationWrap}>
              <View style={styles.confirmationCard}>
                {/* Success Animation & Badge */}
                <View style={styles.confirmIconWrap}>
                  <Ionicons name="checkmark-done" size={44} color="#FFFFFF" />
                </View>
                <Text style={styles.confirmTitle}>Booking Confirmed</Text>
                <Text style={styles.confirmSubtitle}>
                  Your scan appointment has been confirmed.
                </Text>

                <View style={styles.bookingIdBadge}>
                  <Text style={styles.bookingIdLabel}>Booking ID:</Text>
                  <Text style={styles.bookingIdValue}>{latestBooking.id}</Text>
                </View>

                {/* Appointment Card Summary */}
                <View style={styles.confirmDetailsBox}>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Patient:</Text>
                    <Text style={styles.confirmDetailVal}>{latestBooking.patientName}</Text>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Scan:</Text>
                    <Text style={styles.confirmDetailVal}>{latestBooking.testName}</Text>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Centre:</Text>
                    <Text style={styles.confirmDetailVal}>{latestBooking.providerName}</Text>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Address:</Text>
                    <Text style={styles.confirmDetailVal}>{latestBooking.providerAddress}</Text>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Date & Time:</Text>
                    <Text style={styles.confirmDetailVal}>
                      {latestBooking.formattedDate} at {latestBooking.timeSlot}
                    </Text>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Amount:</Text>
                    <Text style={styles.confirmDetailVal}>
                      ₹{latestBooking.paidAmount.toLocaleString('en-IN')} ({latestBooking.paymentStatus})
                    </Text>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Status:</Text>
                    <View style={styles.confirmedStatusPill}>
                      <Text style={styles.confirmedStatusText}>{latestBooking.bookingStatus}</Text>
                    </View>
                  </View>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Prescription:</Text>
                    <Text style={styles.confirmDetailVal}>
                      {latestBooking.prescriptionAttached ? latestBooking.prescriptionFileName : 'Carry original'}
                    </Text>
                  </View>
                </View>

                {/* Instructions Box */}
                <View style={styles.patientArrivalNotice}>
                  <Ionicons name="information-circle" size={18} color="#1E3A8A" />
                  <Text style={styles.patientArrivalNoticeText}>
                    Please arrive 15 minutes early with your prescription and valid ID.
                  </Text>
                </View>

                {/* Confirmation Actions */}
                <View style={styles.confirmActionsRow}>
                  <TouchableOpacity
                    style={styles.confirmDirectionsBtn}
                    onPress={() => {
                      const url = latestBooking.directionsUrl || getGoogleMapsDirectionsUrl({
                        name: latestBooking.providerName,
                        address: latestBooking.providerAddress,
                        latitude: latestBooking.latitude,
                        longitude: latestBooking.longitude,
                        city: latestBooking.city,
                      });
                      Linking.openURL(url);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={16} color="#00BB95" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmDirectionsBtnText}>Get Directions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmReceiptBtn}
                    onPress={() => setReceiptModal(latestBooking)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#1E3A8A" />
                    <Text style={styles.confirmReceiptBtnText}>Download Receipt</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmCalendarBtn}
                    onPress={() => showAlert('Calendar', 'Appointment added to your device calendar.')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#00BB95" />
                    <Text style={styles.confirmCalendarBtnText}>Add to Calendar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmMyBookingsBtn}
                    onPress={handleOpenMyBookings}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="documents-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmMyBookingsBtnText}>View My Bookings</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.backToRadioBtn}
                  onPress={() => navigateToView('categories')}
                >
                  <Text style={styles.backToRadioBtnText}>Back to Radiology Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* VIEW 7: MY RADIOLOGY BOOKINGS */}
          {viewMode === 'my-bookings' && (
            <View style={styles.sectionWrap}>
              <View style={styles.myBookingsHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>My Bookings</Text>
                  <Text style={styles.sectionSubtitle}>
                    Track appointments, download receipts, and view reports
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.bookNewScanBtn}
                  onPress={() => navigateToView('categories')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.bookNewScanBtnText}>Book New Scan</Text>
                </TouchableOpacity>
              </View>

              {/* Tabs: Upcoming / Completed / Cancelled */}
              <View style={styles.myBookingsTabsRow}>
                {['Upcoming', 'Completed', 'Cancelled'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.myBookingsTabBtn,
                      myBookingsTab === tab && styles.myBookingsTabBtnActive,
                    ]}
                    onPress={() => setMyBookingsTab(tab)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.myBookingsTabText,
                        myBookingsTab === tab && styles.myBookingsTabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Bookings List */}
              {displayedUserBookings.length === 0 ? (
                <View style={styles.emptyBookingsBox}>
                  <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyStateTitle}>No {myBookingsTab} Appointments</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    No {myBookingsTab.toLowerCase()} appointments found.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyExploreBtn}
                    onPress={() => navigateToView('categories')}
                  >
                    <Text style={styles.emptyExploreBtnText}>Browse Scans</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.userBookingsGrid}>
                  {displayedUserBookings.map((b) => (
                    <View key={b.id} style={styles.userBookingCard}>
                      {/* Top Row: ID, Category & Status */}
                      <View style={styles.userBookingTopRow}>
                        <View style={styles.bookingIdTag}>
                          <Text style={styles.bookingIdTagText}>{b.id}</Text>
                        </View>
                        <View
                          style={[
                            styles.userBookingStatusPill,
                            b.bookingStatus === 'Confirmed' && styles.statusConfirmed,
                            b.bookingStatus === 'Completed' && styles.statusCompleted,
                            b.bookingStatus === 'Cancelled' && styles.statusCancelled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.userBookingStatusText,
                              b.bookingStatus === 'Confirmed' && styles.statusTextConfirmed,
                              b.bookingStatus === 'Completed' && styles.statusTextCompleted,
                              b.bookingStatus === 'Cancelled' && styles.statusTextCancelled,
                            ]}
                          >
                            {b.bookingStatus}
                          </Text>
                        </View>
                      </View>

                      {/* Main Info */}
                      <Text style={styles.userBookingTestTitle}>{b.testName}</Text>
                      <Text style={styles.userBookingCategory}>{b.categoryLabel}</Text>

                      <View style={styles.userBookingDetailsCol}>
                        <View style={styles.bookingMetaRow}>
                          <Ionicons name="business-outline" size={14} color="#64748B" />
                          <Text style={styles.bookingMetaText}>
                            {b.providerName} ({b.providerAddress})
                          </Text>
                        </View>
                        <View style={styles.bookingMetaRow}>
                          <Ionicons name="person-outline" size={14} color="#64748B" />
                          <Text style={styles.bookingMetaText}>{b.patientName}</Text>
                        </View>
                        <View style={styles.bookingMetaRow}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.bookingMetaText}>
                            {b.formattedDate} at <Text style={styles.boldText}>{b.timeSlot}</Text>
                          </Text>
                        </View>
                        <View style={styles.bookingMetaRow}>
                          <Ionicons name="cash-outline" size={14} color="#64748B" />
                          <Text style={styles.bookingMetaText}>
                            ₹{b.paidAmount.toLocaleString('en-IN')} • {b.paymentStatus}
                          </Text>
                        </View>
                        <View style={styles.bookingMetaRow}>
                          <Ionicons name="document-text-outline" size={14} color="#00BB95" />
                          <Text style={[styles.bookingMetaText, { color: '#00BB95', fontWeight: '600' }]}>
                            Report: {b.reportStatus}
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.userBookingActionsRow}>
                        <TouchableOpacity
                          style={styles.bookingActionDirectionsBtn}
                          onPress={() => {
                            const url = b.directionsUrl || getGoogleMapsDirectionsUrl({
                              name: b.providerName || b.centerName,
                              address: b.providerAddress || b.address,
                              latitude: b.latitude,
                              longitude: b.longitude,
                              city: b.city,
                            });
                            Linking.openURL(url);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="navigate-outline" size={14} color="#00BB95" />
                          <Text style={styles.bookingActionDirectionsText}>Get Directions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.bookingActionReceiptBtn}
                          onPress={() => setReceiptModal(b)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="receipt-outline" size={14} color="#1E3A8A" />
                          <Text style={styles.bookingActionReceiptText}>Receipt</Text>
                        </TouchableOpacity>

                        {b.canReschedule && (
                          <TouchableOpacity
                            style={styles.bookingActionRescheduleBtn}
                            onPress={() => handleOpenReschedule(b)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="calendar-outline" size={14} color="#D97706" />
                            <Text style={styles.bookingActionRescheduleText}>Reschedule</Text>
                          </TouchableOpacity>
                        )}

                        {b.canCancel && (
                          <TouchableOpacity
                            style={styles.bookingActionCancelBtn}
                            onPress={() => handleCancelBooking(b.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.bookingActionCancelText}>Cancel</Text>
                          </TouchableOpacity>
                        )}

                        {b.bookingStatus === 'Completed' && (
                          <TouchableOpacity
                            style={styles.bookingActionReportBtn}
                            onPress={() => setReportModal(b)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.bookingActionReportText}>View Report</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ============================================================
            WEB FOOTER
        ============================================================ */}
        {/* WebFooter omitted for native mobile */}
      </ScrollView>

      {/* ============================================================
          MODAL 1: TEST DETAILS & CLINICAL PROTOCOL MODAL
      ============================================================ */}
      <Modal
        visible={!!testDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setTestDetailsModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderBadge}>Scan Details</Text>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>{testDetailsModal?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setTestDetailsModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* About the Scan */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>About the Scan</Text>
                <Text style={styles.modalSectionText}>
                  {testDetailsModal?.purpose || testDetailsModal?.summary || testDetailsModal?.description}
                </Text>
              </View>

              {/* Preparation */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Preparation</Text>
                <Text style={styles.modalSectionText}>
                  {testDetailsModal?.preparation || 'No specific preparation needed. Wear comfortable clothing.'}
                </Text>
                {testDetailsModal?.fastingRequired && (
                  <View style={styles.fastingAlert}>
                    <Ionicons name="alert-circle" size={16} color="#D97706" />
                    <Text style={styles.fastingAlertText}>
                      Fasting required: {testDetailsModal?.fastingHours || '4-6'} hours prior to appointment.
                    </Text>
                  </View>
                )}
                {testDetailsModal?.contrastUsed && (
                  <View style={[styles.fastingAlert, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginTop: 8 }]}>
                    <Ionicons name="information-circle" size={16} color="#1E3A8A" />
                    <Text style={[styles.fastingAlertText, { color: '#1E3A8A' }]}>
                      Contrast scan: Please inform the centre if you have kidney conditions or dye allergies.
                    </Text>
                  </View>
                )}
              </View>

              {/* Centre & Location */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Centre & Location</Text>
                <Text style={styles.modalSectionText}>
                  {testDetailsModal?.provider
                    ? `${testDetailsModal.provider.name} • ${testDetailsModal.provider.area}, ${testDetailsModal.provider.city}`
                    : `Available at certified radiology centres in ${selectedCity}.`}
                </Text>
              </View>

              {/* Price & Appointment Parameters */}
              <View style={styles.modalParamsGrid}>
                <View style={styles.modalParamBox}>
                  <Text style={styles.modalParamLabel}>Duration</Text>
                  <Text style={styles.modalParamVal}>{testDetailsModal?.duration || '15-30 mins'}</Text>
                </View>
                <View style={styles.modalParamBox}>
                  <Text style={styles.modalParamLabel}>Report Turnaround</Text>
                  <Text style={styles.modalParamVal}>{testDetailsModal?.reportTime || 'Within 24 hours'}</Text>
                </View>
                <View style={styles.modalParamBox}>
                  <Text style={styles.modalParamLabel}>Price</Text>
                  <Text style={styles.modalParamVal}>Starts at ₹{testDetailsModal?.typicalPrice?.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {testDetailsModal?.provider && (
                <TouchableOpacity
                  style={[styles.modalDirectionsBtn, { borderColor: activeCategoryDesign.border }]}
                  onPress={() => {
                    const url = getGoogleMapsDirectionsUrl(testDetailsModal.provider);
                    Linking.openURL(url);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={15} color={activeCategoryDesign.btnBg} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalDirectionsBtnText, { color: activeCategoryDesign.btnBg }]}>Directions</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTestDetailsModal(null)}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBookCtaBtn,
                  {
                    backgroundColor: activeCategoryDesign.btnBg,
                    
                    boxShadow: `0 4px 14px ${activeCategoryDesign.btnShadow}`,
                  },
                ]}
                onPress={() => {
                  const testToBook = testDetailsModal;
                  setTestDetailsModal(null);
                  if (testToBook.provider) {
                    handleStartBooking(testToBook.provider, testToBook);
                  } else {
                    handleSelectTest(testToBook);
                  }
                }}
              >
                <Text style={styles.modalBookCtaBtnText}>Book Now</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          MODAL 2: CLINICAL PACS REPORT VIEWER
      ============================================================ */}
      <Modal
        visible={!!reportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderBadge}>Certified PACS Diagnostic Report</Text>
                <Text style={styles.modalHeaderTitle}>{reportModal?.testName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReportModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Report Header */}
              <View style={styles.reportLetterhead}>
                <View>
                  <Text style={styles.letterheadHospital}>{reportModal?.providerName}</Text>
                  <Text style={styles.letterheadSub}>Department of Radiodiagnosis & Imaging</Text>
                  <Text style={styles.letterheadAddress}>{reportModal?.providerAddress}</Text>
                </View>
                <View style={styles.nablSeal}>
                  <Text style={styles.nablSealText}>NABL & NABH ACCREDITED</Text>
                </View>
              </View>

              <View style={styles.reportDivider} />

              {/* Patient Demographics Table */}
              <View style={styles.reportPatientMeta}>
                <View style={styles.reportMetaCol}>
                  <Text style={styles.reportMetaLabel}>Patient Name:</Text>
                  <Text style={styles.reportMetaVal}>{reportModal?.patientName}</Text>
                  <Text style={styles.reportMetaLabel}>Age / Gender:</Text>
                  <Text style={styles.reportMetaVal}>{reportModal?.patientAge} Yrs / {reportModal?.patientGender}</Text>
                </View>
                <View style={styles.reportMetaCol}>
                  <Text style={styles.reportMetaLabel}>Scan Date:</Text>
                  <Text style={styles.reportMetaVal}>{reportModal?.formattedDate}</Text>
                  <Text style={styles.reportMetaLabel}>Report ID:</Text>
                  <Text style={styles.reportMetaVal}>{reportModal?.id}</Text>
                </View>
              </View>

              <View style={styles.reportDivider} />

              {/* Clinical Findings */}
              <View style={styles.clinicalFindingsBlock}>
                <Text style={styles.findingsHeading}>TECHNIQUE & SCAN PROTOCOL:</Text>
                <Text style={styles.findingsBody}>
                  Multi-slice high-resolution scan performed using standardized diagnostic protocols. Volumetric reformations in axial, coronal, and sagittal planes analyzed at 1mm thickness.
                </Text>

                <Text style={[styles.findingsHeading, { marginTop: 14 }]}>OBSERVATIONS & FINDINGS:</Text>
                <Text style={styles.findingsBody}>
                  • Normal anatomical contour and attenuation values observed across the examined region.{'\n'}
                  • No evidence of acute localized mass lesion, pathological enhancement, or abnormal calcification.{'\n'}
                  • Major vascular structures demonstrate normal caliber and patent flow signals.{'\n'}
                  • Visualized bony framework and adjacent soft tissue compartments are within normal physiological limits.
                </Text>

                <Text style={[styles.findingsHeading, { marginTop: 14 }]}>IMPRESSION & CLINICAL SUMMARY:</Text>
                <View style={styles.impressionBox}>
                  <Text style={styles.impressionText}>
                    NO ACUTE PATHOLOGICAL ABNORMALITY DETECTED. CORRELATE CLINICALLY WITH RELEVANT LAB MARKERS.
                  </Text>
                </View>

                {/* Radiologist Signature */}
                <View style={styles.signatureRow}>
                  <View style={styles.qrSeal}>
                    <Ionicons name="qr-code" size={40} color="#1E3A8A" />
                    <Text style={styles.qrText}>Digitally Verified</Text>
                  </View>
                  <View style={styles.doctorSignBlock}>
                    <Text style={styles.docSignature}>Dr. K. Srinivas, MD (Radio-Diagnosis)</Text>
                    <Text style={styles.docReg}>Consultant Radiologist • KMC Reg # 48291</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReportModal(null)}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBookCtaBtn}
                onPress={() => showAlert('Download Report', `PACS Report for ${reportModal?.id} downloaded to your device as PDF.`)}
              >
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={styles.modalBookCtaBtnText}>Download PDF Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          MODAL 3: TAX INVOICE & RECEIPT MODAL
      ============================================================ */}
      <Modal
        visible={!!receiptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderBadge}>Payment Receipt & Tax Invoice</Text>
                <Text style={styles.modalHeaderTitle}>Invoice #{receiptModal?.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReceiptModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <View style={styles.receiptInvoiceBox}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptBrand}>MediUnify Healthcare Platform</Text>
                  <Text style={styles.receiptGst}>GSTIN: 29AABCM9124K1Z0</Text>
                </View>

                <View style={styles.receiptMetaGrid}>
                  <View>
                    <Text style={styles.receiptLabel}>Billed To:</Text>
                    <Text style={styles.receiptVal}>{receiptModal?.patientName}</Text>
                    <Text style={styles.receiptValSub}>{receiptModal?.patientPhone}</Text>
                  </View>
                  <View>
                    <Text style={styles.receiptLabel}>Centre Details:</Text>
                    <Text style={styles.receiptVal}>{receiptModal?.providerName}</Text>
                    <Text style={styles.receiptValSub}>{receiptModal?.providerAddress}</Text>
                  </View>
                </View>

                <View style={styles.receiptTable}>
                  <View style={styles.receiptTableHeader}>
                    <Text style={styles.thDesc}>Description</Text>
                    <Text style={styles.thAmount}>Amount (INR)</Text>
                  </View>
                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tdDesc}>{receiptModal?.testName}</Text>
                    <Text style={styles.tdAmount}>₹{receiptModal?.basePrice?.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tdDiscount}>MediUnify Promotional Discount</Text>
                    <Text style={styles.tdDiscountAmount}>-₹{receiptModal?.discountAmount?.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tdDesc}>PACS Cloud Archival & Digital Film</Text>
                    <Text style={styles.tdAmount}>₹0 (FREE)</Text>
                  </View>
                </View>

                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Net Amount Paid:</Text>
                  <Text style={styles.receiptTotalAmount}>₹{receiptModal?.paidAmount?.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.receiptPaymentMode}>
                  Payment Mode: {receiptModal?.paymentStatus}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReceiptModal(null)}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBookCtaBtn}
                onPress={() => showAlert('Printed', 'Receipt sent to printer and saved as PDF.')}
              >
                <Ionicons name="print-outline" size={16} color="#FFFFFF" />
                <Text style={styles.modalBookCtaBtnText}>Print / Download Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          MODAL 4: RESCHEDULE APPOINTMENT MODAL
      ============================================================ */}
      <Modal
        visible={!!rescheduleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRescheduleModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderBadge}>Reschedule Appointment</Text>
                <Text style={styles.modalHeaderTitle}>{rescheduleModal?.testName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRescheduleModal(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.subSectionTitle}>Select New Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesScrollRow}>
                {appointmentDays.map((d) => {
                  const isSelected = rescheduleDateIndex === d.index;
                  return (
                    <TouchableOpacity
                      key={d.index}
                      style={[
                        styles.datePillCard,
                        isSelected && styles.datePillCardActive,
                      ]}
                      onPress={() => setRescheduleDateIndex(d.index)}
                    >
                      <Text style={[styles.datePillDayName, isSelected && styles.datePillDayNameActive]}>
                        {d.dayName}
                      </Text>
                      <Text style={[styles.datePillDateNum, isSelected && styles.datePillDateNumActive]}>
                        {d.dateNum}
                      </Text>
                      <Text style={[styles.datePillMonthName, isSelected && styles.datePillMonthNameActive]}>
                        {d.monthName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.subSectionTitle, { marginTop: 20 }]}>Select New Time Slot</Text>
              <View style={styles.slotsPillsGrid}>
                {['08:30 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '05:30 PM'].map((slot) => {
                  const chosenDay = appointmentDays[rescheduleDateIndex] || appointmentDays[1];
                  const slotStatus = getSlotStatus({
                    date: chosenDay?.isoDate,
                    time: slot,
                    serviceType: 'radiology',
                    providerId: rescheduleModal?.centerName || rescheduleModal?.providerName,
                  });
                  const isAvailable = slotStatus.available;
                  const isSelected = rescheduleSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeSlotBtn,
                        isSelected && styles.timeSlotBtnActive,
                        !isAvailable && styles.timeSlotBtnDisabled,
                      ]}
                      disabled={!isAvailable}
                      onPress={() => setRescheduleSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotTextActive,
                          !isAvailable && styles.timeSlotTextDisabled,
                        ]}
                      >
                        {slot}
                      </Text>
                      {!isAvailable && (
                        <View style={styles.slotStatusBadge}>
                          <Text style={styles.slotStatusBadgeText}>
                            {slotStatus.status === 'PASSED' ? 'Passed' : 'Booked'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRescheduleModal(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBookCtaBtn}
                onPress={handleConfirmReschedule}
              >
                <Text style={styles.modalBookCtaBtnText}>Confirm Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================
const baseStyles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F0FDF9',
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100vh',
        }
      : {}),
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'web' ? 0 : 180,
  },

  // Pinned Top App Bar (iOS, Android, Tablet, Web)
  pinnedTopAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
    maxHeight: 62,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  pinnedBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
  },
  pinnedTitleContainer: {
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
    minWidth: 0,
  },
  pinnedTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
    lineHeight: 20,
  },
  pinnedCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  pinnedCityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 14,
  },
  pinnedMyBookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    position: 'relative',
    gap: 5,
    flexShrink: 0,
  },
  pinnedMyBookingsBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  pinnedMyBookingsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  pinnedMyBookingsBtnTextActive: {
    color: '#FFFFFF',
  },
  pinnedBadgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00BB95',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pinnedBadgeDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Centre Details View Styles
  centreDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  centreDetailsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  centreDetailsNameCol: {
    flex: 1,
    minWidth: 200,
  },
  centreDetailsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  centreLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  centreAddressText: {
    fontSize: 13,
    color: '#64748B',
  },
  centreDot: {
    color: '#94A3B8',
    fontSize: 13,
  },
  centreDistanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  centreRatingBox: {
    alignItems: 'flex-end',
  },
  centreRatingScore: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  centreReviewsText: {
    fontSize: 11,
    color: '#64748B',
  },
  centreAccredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  centreAccredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  centreAccredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  centreDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E6F8F2',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  centreDirectionsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BB95',
  },
  centreDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  centreSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 10,
  },
  centreFacilitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  centreFacilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  centreFacilityText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  centreTestSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  centreTestSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  centreTestName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  centreTestModality: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '600',
    marginTop: 2,
  },
  centrePriceCol: {
    alignItems: 'flex-end',
  },
  centreFinalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00BB95',
  },
  centreMrpPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  centreTestPurpose: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  centreTestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  centreMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  centreMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  centrePrepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  centrePrepText: {
    flex: 1,
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  centreActionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  centreBackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  centreBackActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  centreBookActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00BB95',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  centreBookActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Hero Section
  heroBannerWrap: {
    width: '100%',
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  heroWatermarkContainer: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 260,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 1,
  },
  heroWatermarkGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(167, 243, 208, 0.45)',
    ...(Platform.OS === 'web' ? { filter: 'blur(35px)' } : {}),
  },
  heroCrossWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    opacity: 0.5,
  },
  heroCrossH: {
    position: 'absolute',
    width: 78,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5EEAD4',
  },
  heroCrossV: {
    position: 'absolute',
    width: 24,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#5EEAD4',
  },
  heroInnerContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
    zIndex: 2,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  topUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  citySelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  cityPillOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityOptionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cityOptionBtnActive: {
    backgroundColor: '#00BB95',
  },
  cityOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  cityOptionTextActive: {
    color: '#FFFFFF',
  },
  myBookingsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  myBookingsHeaderBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  myBookingsHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  myBookingsHeaderBtnTextActive: {
    color: '#FFFFFF',
  },
  bookingCountBadge: {
    backgroundColor: '#00BB95',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  bookingCountBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Hero Content Block
  heroContentBlock: {
    marginTop: 6,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  accreditedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 5,
  },
  accreditedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00BB95',
  },
  pacsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 5,
  },
  pacsTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  cityLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  cityLocationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BB95',
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#113247',
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  heroSubheading: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    maxWidth: 820,
    marginBottom: 18,
    fontWeight: '500',
  },
  heroSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#00BB95',
    paddingLeft: 16,
    paddingRight: 6,
    height: 50,
    shadowColor: '#00BB95',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 14,
    maxWidth: 860,
  },
  searchIcon: {
    marginRight: 10,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#1E293B',
    outlineStyle: 'none',
  },
  clearSearchBtn: {
    padding: 6,
    marginRight: 4,
  },
  heroSearchSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00BB95',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularChipsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  popularChipsLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  popularChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  popularChipPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  popularChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },

  // Main Body
  mainBodyContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'relative',
  },
  sectionWrap: {
    width: '100%',
    position: 'relative',
  },
  categoriesAmbientGlow: {
    position: 'absolute',
    top: 20,
    right: -20,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(167, 243, 208, 0.4)',
    ...(Platform.OS === 'web' ? { filter: 'blur(60px)' } : {}),
    pointerEvents: 'none',
    zIndex: 0,
  },
  categoriesAmbientGlowLeft: {
    position: 'absolute',
    bottom: 40,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(204, 251, 241, 0.35)',
    ...(Platform.OS === 'web' ? { filter: 'blur(55px)' } : {}),
    pointerEvents: 'none',
    zIndex: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitleBlock: {
    flexDirection: 'column',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccentBar: {
    width: 4.5,
    height: 24,
    backgroundColor: '#00BB95',
    borderRadius: 3,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginLeft: 14.5,
  },
  categoryCountBadge: {
    backgroundColor: '#E6FAF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  categoryCountLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00BB95',
  },

  // Category Cards Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  categoryBannerCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingLeft: 22,
    paddingRight: 10,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 144,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  catBannerLeftCol: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  catBannerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0A1C3E',
    letterSpacing: -0.3,
  },
  catBannerSubtitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#5B7B9D',
    marginTop: 4,
    marginBottom: 16,
  },
  catExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    gap: 7,
  },
  catExploreBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  catBannerRightCol: {
    width: 125,
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  catBannerImage: {
    width: 122,
    height: 122,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardImageContainer: {
    width: '100%',
    height: 126,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    maxHeight: 88,
  },
  catBadgePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  catBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: 14,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  catCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  catCardSubText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  catCardTagline: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  catCardDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
    flex: 1,
  },
  cardAvailabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 'auto',
    paddingTop: 6,
  },
  cardAvailabilityText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00BB95',
  },
  cardTestCountText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  cardActionsRowSingle: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
    marginTop: 'auto',
  },
  cardDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardDetailsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  organicCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  organicCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 20,
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
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  cardSecondaryBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  cardPrimaryBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#00BB95',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardPrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Trust Pillars Section
  trustHighlightsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 20,
  },
  trustItem: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trustIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTextCol: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  trustDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // VIEW 2: CATEGORY TESTS
  categoryBannerHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 22,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  catBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 280,
  },
  catLargeIconWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  catBanner3DImage: {
    width: '100%',
    height: '100%',
    maxWidth: 84,
    maxHeight: 84,
  },
  catBannerInfo: {
    flex: 1,
  },
  catBannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  catBannerBadge: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  catBannerDot: {
    fontSize: 11,
    color: '#64748B',
  },
  catBannerTestCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catBannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  catBannerDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  changeCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changeCategoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // Tests Grid
  testsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    boxShadow: '0 10px 28px -6px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  testCardBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testCategoryTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  testCategoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  fastingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  fastingPillActive: {
    backgroundColor: '#FEF3C7',
  },
  fastingPillNone: {
    backgroundColor: '#ECFDF5',
  },
  fastingPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fastingPillTextActive: {
    color: '#D97706',
  },
  fastingPillTextNone: {
    color: '#059669',
  },
  testCardName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    minHeight: 40,
    lineHeight: 20,
  },
  testCardSummary: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
  },
  testKeyParamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  testParamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  testParamText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  testPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 4,
  },
  startsAtLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  mrpPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  testCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewDetailsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  compareCentresBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BB95',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  compareCentresBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // VIEW 3: PROVIDERS
  selectedTestHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
    width: '100%',
  },
  selectedTestHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectedTestModalityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E6F8F2',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  selectedTestModalityText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00BB95',
    letterSpacing: 0.3,
  },
  selectedTestHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeTestPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  changeTestPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  viewProtocolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  viewProtocolBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00BB95',
  },
  selectedTestHeroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectedTestHeroTextCol: {
    flex: 1,
    minWidth: 0,
  },
  selectedTestHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  selectedTestHeroPurpose: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16.5,
    marginBottom: 8,
  },
  selectedTestHeroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  heroMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  heroMiniBadgeText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  heroEquipmentThumbContainer: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 2,
    flexShrink: 0,
  },
  heroEquipmentThumbContainerWide: {
    width: 96,
    height: 96,
    borderRadius: 16,
  },
  heroEquipmentImage: {
    width: '100%',
    height: '100%',
    maxWidth: 88,
    maxHeight: 88,
  },

  // Filter Toolbar
  filterToolbarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
  },
  providerSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  providerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    outlineStyle: 'none',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: '#00BB95',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortBarContainer: {
    width: '100%',
    paddingVertical: 2,
    marginBottom: 6,
  },
  sortSelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 2,
  },
  sortOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortOptionBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  sortOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  providersListingHeader: {
    marginBottom: 14,
  },
  providersListingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  providersListingHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Provider Card List & Compact Centre Cards
  providersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  compactCentreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 145,
  },
  compactCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 10,
  },
  compactLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  compactNameContainer: {
    flex: 1,
  },
  compactCentreName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  compactRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignSelf: 'flex-start',
  },
  compactRatingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  compactReviewsCount: {
    fontSize: 11,
    color: '#64748B',
  },
  compactMetaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 12,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactMetaIcon: {
    width: 14,
  },
  compactMetaText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    flex: 1,
  },
  compactSlotsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  compactSlotsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactSlotsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moreTimesLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00BB95',
  },
  compactSlotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  compactSlotChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactSlotChipSelected: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  compactSlotChipDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.55,
  },
  compactSlotChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  compactSlotChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  compactSlotChipTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  compactPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  compactPriceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  compactCurrentPrice: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
  },
  compactStrikeMrp: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  compactCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 'auto',
  },
  compactSecondaryBtn: {
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
  },
  compactSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  compactBookCtaBtn: {
    height: 38,
    borderWidth: 1.5,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  compactBookCtaBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  compactPrimaryBtn: {
    height: 38,
    backgroundColor: '#00BB95',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  compactPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Legacy providerCard fallback
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // VIEW 4: BOOKING FLOW CONTAINER
  bookingFlowContainer: {
    width: '100%',
  },
  stepperHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    shadowColor: '#64748B',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stepperProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepCircleActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  stepCircleCompleted: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  stepCircleNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepCircleNumActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelActive: {
    fontWeight: '800',
    color: '#0F172A',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  stepConnectorActive: {
    backgroundColor: '#00BB95',
  },

  bookingMainLayout: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  bookingWizardLeftCol: {
    flex: 1,
    width: '100%',
  },
  bookingSummaryRightCol: {
    width: '100%',
  },
  wizardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    width: '100%',
  },
  wizardStepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  wizardStepHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  wizardStepSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Patients
  patientCardsList: {
    gap: 10,
    marginBottom: 16,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
    width: '100%',
    shadowColor: '#64748B',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  patientCardSelected: {
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
    shadowOpacity: 0.08,
    shadowColor: '#00BB95',
    shadowRadius: 8,
  },
  patientAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patientAvatarWrapSelected: {
    backgroundColor: '#E6F8F3',
    borderColor: '#A7F3D0',
  },
  patientSelectIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  patientSelectIndicatorSelected: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  patientInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  patientNameRelationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  relationBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  patientMetaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  addNewPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#00BB95',
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#F0FDF9',
  },
  addNewPatientBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BB95',
  },
  newPatientFormBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formInputGroup: {
    flex: 1,
  },
  formInputGroupSmall: {
    width: 80,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  textInputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#1E293B',
  },
  genderSelectRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  genderPillActive: {
    borderColor: '#00BB95',
    backgroundColor: '#E6F8F2',
  },
  genderPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  genderPillTextActive: {
    color: '#00BB95',
    fontWeight: '700',
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  cancelFormBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  cancelFormBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  savePatientBtn: {
    backgroundColor: '#00BB95',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  savePatientBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Wizard Footer
  wizardFooterBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
    width: '100%',
  },
  wizardBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    minWidth: 88,
  },
  wizardBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  wizardNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00BB95',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 46,
    shadowColor: '#00BB95',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  wizardNextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Prescription Upload Component Styles
  prescriptionUploadCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prescriptionCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prescriptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E6F8F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  prescriptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  prescriptionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  prescriptionAttachPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#00BB95',
    backgroundColor: '#FFFFFF',
  },
  prescriptionAttachPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
  },
  prescriptionRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  prescriptionRemoveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  attachedFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  attachedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flexShrink: 1,
  },
  attachedFileSize: {
    fontSize: 11,
    color: '#047857',
  },

  // Step 2 Summary Banner & Slot Header
  stepSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    gap: 8,
    flexWrap: 'wrap',
  },
  stepSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepSummaryMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  stepSummaryDivider: {
    color: '#86EFAC',
    fontWeight: '700',
  },
  stepSummarySub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  slotSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  reviewSecondaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // STEP 2: DATES & SLOTS
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 10,
  },
  datesScrollRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 6,
  },
  datePillCard: {
    width: 74,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 2,
  },
  datePillCardActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
    shadowColor: '#00BB95',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  datePillDayName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  datePillDayNameActive: {
    color: '#FFFFFF',
  },
  datePillDateNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  datePillDateNumActive: {
    color: '#FFFFFF',
  },
  datePillMonthName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  datePillMonthNameActive: {
    color: '#FFFFFF',
  },
  selectedDateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedDateNoticeText: {
    fontSize: 12,
    color: '#065F46',
  },
  boldText: {
    fontWeight: '700',
  },
  slotCategoryGroup: {
    marginBottom: 18,
  },
  slotCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  slotCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  slotsPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  timeSlotBtnActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
    shadowColor: '#00BB95',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  timeSlotBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  timeSlotTextActive: {
    color: '#FFFFFF',
  },
  timeSlotTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  slotStatusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  slotStatusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },

  // STEP 3: REVIEW SUMMARY
  reviewBlocksWrap: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reviewEditLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewMainText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  dividerSubtle: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  instructionsAlertBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  instructionsAlertCol: {
    flex: 1,
  },
  instructionsAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  instructionsAlertText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  instructionsFastingWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 6,
  },

  // Right Column Price Breakdown Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    borderTopWidth: 3.5,
    borderTopColor: '#00BB95',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    boxShadow: '0 8px 24px -2px rgba(0, 184, 148, 0.08)',
  },
  summaryScanHeader: {
    paddingBottom: 6,
  },
  summaryScanName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  summaryCentreName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryMiniDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 6,
    marginBottom: 10,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
    width: '100%',
  },
  summaryRowLabel: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
  },
  summaryRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
  },
  summaryDiscountLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#00BB95',
  },
  summaryDiscountValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00BB95',
    textAlign: 'right',
  },
  summaryFreeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'right',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    gap: 8,
    width: '100%',
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00BB95',
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  guaranteeText: {
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
    flex: 1,
  },

  // VIEW 5: PAYMENT CONTAINER
  paymentContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  paymentMethodsCol: {
    flex: 1,
    width: '100%',
  },
  paymentRecapCol: {
    width: '100%',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  paymentSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  paymentTabOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  paymentTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  paymentTabBtnActive: {
    backgroundColor: '#E6F8F2',
    borderColor: '#00BB95',
  },
  paymentTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  paymentTabTextActive: {
    color: '#00BB95',
    fontWeight: '800',
  },
  paymentMethodFormArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  upiFormWrap: {},
  formLabelBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  formSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  upiInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  upiTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  verifyUpiBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  verifyUpiBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  upiAppsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  upiAppBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  upiAppBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  cardFormWrap: {
    gap: 12,
  },
  netbankingFormWrap: {},
  bankPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  bankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bankPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  payAtCentreBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  payAtCentreHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  payAtCentreText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 420,
  },
  executePayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00BB95',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  executePayBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recapCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  recapItem: {
    marginBottom: 8,
  },
  recapLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  recapVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },

  // VIEW 6: CONFIRMATION
  confirmationWrap: {
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 20,
  },
  confirmationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  confirmIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00BB95',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#00BB95',
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 480,
    marginBottom: 18,
  },
  bookingIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  bookingIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  bookingIdValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  confirmDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  confirmDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  confirmedStatusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmedStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  patientArrivalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  patientArrivalNoticeText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
    flex: 1,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmReceiptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  confirmCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmCalendarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
  },
  confirmMyBookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00BB95',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmMyBookingsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToRadioBtn: {
    paddingVertical: 6,
  },
  backToRadioBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  // VIEW 7: MY RADIOLOGY BOOKINGS
  myBookingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  bookNewScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00BB95',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookNewScanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myBookingsTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  myBookingsTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  myBookingsTabBtnActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  myBookingsTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  myBookingsTabTextActive: {
    color: '#FFFFFF',
  },
  emptyBookingsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyExploreBtn: {
    backgroundColor: '#00BB95',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  emptyExploreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userBookingsGrid: {
    gap: 14,
  },
  userBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  userBookingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingIdTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookingIdTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  userBookingStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusConfirmed: {
    backgroundColor: '#ECFDF5',
  },
  statusCompleted: {
    backgroundColor: '#E0F2FE',
  },
  statusCancelled: {
    backgroundColor: '#FEF2F2',
  },
  userBookingStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextConfirmed: {
    color: '#059669',
  },
  statusTextCompleted: {
    color: '#1E3A8A',
  },
  statusTextCancelled: {
    color: '#DC2626',
  },
  userBookingTestTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  userBookingCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00BB95',
    marginBottom: 10,
  },
  userBookingDetailsCol: {
    gap: 4,
    marginBottom: 14,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  userBookingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
  },
  bookingActionReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bookingActionReceiptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  bookingActionRescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bookingActionRescheduleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  bookingActionCancelBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bookingActionCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  bookingActionReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00BB95',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  bookingActionReportText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty State Box
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 380,
  },
  emptyResetBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 6,
  },
  emptyResetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // MODAL SHARED STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxWidth: 620,
    width: '100%',
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00BB95',
    textTransform: 'uppercase',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  modalSectionText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  fastingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  fastingAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  modalParamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalParamBox: {
    width: '46%',
    flexGrow: 1,
  },
  modalParamLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  modalParamVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFCFD',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modalBookCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00BB95',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalBookCtaBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // REPORT LETTERHEAD
  reportLetterhead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  letterheadHospital: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  letterheadSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00BB95',
  },
  letterheadAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  nablSeal: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nablSealText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  reportPatientMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportMetaCol: {
    gap: 2,
  },
  reportMetaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  reportMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  clinicalFindingsBlock: {
    marginTop: 8,
  },
  findingsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  findingsBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginTop: 4,
  },
  impressionBox: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#00BB95',
    padding: 10,
    marginVertical: 8,
  },
  impressionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
    lineHeight: 16,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qrSeal: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 9,
    color: '#1E3A8A',
    fontWeight: '700',
  },
  doctorSignBlock: {
    alignItems: 'flex-end',
  },
  docSignature: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  docReg: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  // RECEIPT INVOICE
  receiptInvoiceBox: {
    backgroundColor: '#FAFCFD',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  receiptBrand: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00BB95',
  },
  receiptGst: {
    fontSize: 11,
    color: '#64748B',
  },
  receiptMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  receiptValSub: {
    fontSize: 11,
    color: '#64748B',
  },
  receiptTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  receiptTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    padding: 8,
  },
  thDesc: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  thAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  receiptTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tdDesc: {
    fontSize: 11,
    color: '#1E293B',
  },
  tdAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  tdDiscount: {
    fontSize: 11,
    color: '#00BB95',
    fontWeight: '600',
  },
  tdDiscountAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00BB95',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: 4,
  },
  receiptTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  receiptTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00BB95',
  },
  receiptPaymentMode: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  // MOBILE APP BAR & ENHANCED RESPONSIVE STYLES
  mobileAppBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  mobileBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileAppBarTitleWrap: {
    flex: 1,
  },
  mobileAppBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  mobileAppBarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  mobileAppBarBookingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mobileAppBarBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#00BB95',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  mobileAppBarBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  homeLocationTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  homeLocationTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  cityLocationBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 4,
  },
  providerDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  providerDirectionsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#00BB95',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalDirectionsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00BB95',
  },
  confirmDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#00BB95',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  confirmDirectionsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00BB95',
  },
  bookingActionDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  bookingActionDirectionsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});


// ============================================================

export default ImagingScreen;
