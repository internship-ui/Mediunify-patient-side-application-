import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Modal,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { navigationRef } from '../../navigation/navigationRef';
import { isDesktopSiteRequested } from '../../utils/responsiveLayoutHelper';
import GuestLeadModal from '../common/GuestLeadModal';
import { shouldShowGuestLeadPopup } from '../../services/guestLeadService';

import { REMAINING_SERVICES } from '../../data/remainingServices';

export { REMAINING_SERVICES };

const REMAINING_KEYS = {
  'nurse': 'card_home_nurse',
  'equipment': 'card_equipment_rental',
  'insurance': 'card_health_insurance',
  'monitor': 'card_health_monitor',
  'emergency': 'card_emergency',
};

const NAV_LINKS = [
  { id: 'doctors', label: 'Find Doctors', labelKey: 'nav_find_doctors', route: 'FindDoctors' },
  { id: 'lab-tests', label: 'Lab Tests', labelKey: 'nav_lab_tests', route: 'LabTests' },
  { id: 'pharmacy', label: 'Order Medicine', labelKey: 'nav_order_medicine', route: 'Pharmacy' },
  { id: 'hospitals', label: 'Surgeries', labelKey: 'nav_surgeries', route: 'HospitalCare' },
  { id: 'radiology', label: 'Scan & X-Ray', labelKey: 'nav_scans_xray', route: 'Imaging' },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Doctor Appointment Confirmed',
    message: 'Dr. Ananya Rao (Cardiologist) • Today at 04:30 PM. MediUnify Heart Center.',
    time: '12m ago',
    unread: true,
    icon: 'calendar',
    iconColor: '#00B894',
    iconBg: '#ECFDF5',
    route: 'MyAppointments',
  },
  {
    id: 'notif-2',
    title: 'Medicine Order Out for Delivery',
    message: 'Order #MU-8842 with 3 items dispatched. Arriving at your doorstep in 30 mins.',
    time: '45m ago',
    unread: true,
    icon: 'cart',
    iconColor: '#00B894',
    iconBg: '#EEF7FC',
    route: 'Pharmacy',
  },
  {
    id: 'notif-3',
    title: 'Lab Test Reports Ready',
    message: 'Full Body Checkup (68 Tests) digital reports are certified & ready to view.',
    time: '2h ago',
    unread: true,
    icon: 'document-text',
    iconColor: '#00B894',
    iconBg: '#F1F8FB',
    route: 'LabTests',
  },
  {
    id: 'notif-4',
    title: '₹150 MediCoins Credited',
    message: 'Health Cashback reward has been credited to your MediUnify Health Wallet.',
    time: 'Yesterday',
    unread: false,
    icon: 'wallet',
    iconColor: '#00B894',
    iconBg: '#E6F8F5',
    route: 'Wallet',
  },
];


const CONSULTATION_ITEMS = [
  {
    label: 'In-Clinic Physical Appointment',
    route: 'DoctorList',
    params: { mode: 'physical' },
    icon: 'business-outline',
    desc: 'Physical appointment at doctor clinic or hospital',
  },
  {
    label: 'Online Video Consultation',
    route: 'VideoConsultation',
    params: { mode: 'online' },
    icon: 'videocam-outline',
    desc: 'Connect in 15 mins via private HD video call',
  },
  {
    label: 'Ayurveda & Panchakarma Vaidya',
    route: 'AyurvedaWellness',
    icon: 'leaf-outline',
    desc: 'Pulse diagnosis, classical detox & herbal care',
  },
];

const FIND_CARE_ITEMS = [
  { label: 'MediUnify AI Assistant', route: 'Chatbot', icon: 'sparkles-outline', desc: 'Instant AI symptom triage & health guidance' },
  { label: '24/7 Emergency Care', route: 'Emergency', icon: 'flash-outline', desc: 'Immediate ambulance & emergency' },
];

const MORE_ITEMS = [
  { label: 'Ask MediUnify AI', route: 'Chatbot', icon: 'sparkles-outline' },
  { label: 'Ayurveda & Wellness', route: 'AyurvedaWellness', icon: 'leaf-outline' },
  { label: 'Fertility & IVF Care', route: 'DoctorList', params: { specialty: 'ivf-fertility-group' }, icon: 'heart-outline' },
  { label: 'Medical Equipment Rental', route: 'EquipmentRental', icon: 'fitness-outline' },
  { label: 'Home Care & Nursing', route: 'NurseBooking', icon: 'heart-outline' },
  { label: 'Digital Health Records', route: 'HealthRecords', icon: 'document-text-outline' },
  { label: 'My Tests & Scans', route: 'MyTests', icon: 'flask-outline' },
  { label: 'Health Wallet', route: 'Wallet', icon: 'wallet-outline' },
  { label: 'MediUnify Care+ VIP', route: 'Membership', icon: 'ribbon-outline' },
  { label: 'Help & Support', route: 'HelpSupport', icon: 'help-circle-outline' },
];

const CITIES = ['Mysuru', 'Bengaluru', 'Mangaluru', 'Hubballi', 'Belagavi'];

const MY_SERVICES_TABLET = [
  {
    id: 'doctors',
    title: 'Find Doctors',
    desc: 'Consult verified specialist doctors & clinics',
    icon: 'people-outline',
    iconColor: '#00B894',
    iconBg: '#ECFDF5',
    route: 'FindDoctors',
  },
  {
    id: 'videocall',
    title: 'Video Consultation',
    desc: 'Instant HD video call with top specialists',
    icon: 'videocam-outline',
    iconColor: '#0284C7',
    iconBg: '#E0F2FE',
    route: 'VideoConsultation',
  },
  {
    id: 'pharmacy',
    title: 'Online Pharmacy',
    desc: 'Flat 20% OFF on medicines & doorstep delivery',
    icon: 'medkit-outline',
    iconColor: '#00B894',
    iconBg: '#E6F8F5',
    route: 'Pharmacy',
  },
  {
    id: 'lab-tests',
    title: 'Lab Tests & Checkups',
    desc: 'NABL certified labs with free home pickup',
    icon: 'flask-outline',
    iconColor: '#0284C7',
    iconBg: '#E0F2FE',
    route: 'LabTests',
  },
  {
    id: 'radiology',
    title: 'Scan & X-Ray',
    desc: '3T MRI, CT Scan, Ultrasound & X-Ray labs',
    icon: 'radio-outline',
    iconColor: '#7E22CE',
    iconBg: '#F3E8FF',
    route: 'Imaging',
  },
  {
    id: 'hospitals',
    title: 'Hospitals & Surgeries',
    desc: 'Top NABH partner hospitals & cashless TPA',
    icon: 'business-outline',
    iconColor: '#4338CA',
    iconBg: '#E0E7FF',
    route: 'HospitalCare',
  },
  {
    id: 'nurse',
    title: 'Home Care & Nursing',
    desc: 'Certified nurses & attendants at your home',
    icon: 'heart-outline',
    iconColor: '#DB2777',
    iconBg: '#FCE7F3',
    route: 'NurseBooking',
  },
  {
    id: 'equipment',
    title: 'Equipment Rental',
    desc: 'Hospital beds, oxygen & wheelchairs',
    icon: 'fitness-outline',
    iconColor: '#0D9488',
    iconBg: '#E0F7F4',
    route: 'EquipmentRental',
  },
  {
    id: 'ayurveda',
    title: 'Ayurveda & Wellness',
    desc: 'Ayush certified Vaidyas & classical therapies',
    icon: 'leaf-outline',
    iconColor: '#15803D',
    iconBg: '#DCFCE7',
    route: 'AyurvedaWellness',
  },
  {
    id: 'insurance',
    title: 'Health Insurance',
    desc: '100% cashless claims & mediclaim support',
    icon: 'shield-checkmark-outline',
    iconColor: '#15803D',
    iconBg: '#DCFCE7',
    route: 'HealthInsurance',
  },
  {
    id: 'ai-assistant',
    title: 'MediUnify AI Assistant',
    desc: 'Instant AI symptom triage & health guidance',
    icon: 'sparkles-outline',
    iconColor: '#00B894',
    iconBg: '#ECFDF5',
    route: 'Chatbot',
  },
  {
    id: 'emergency',
    title: 'Emergency 24/7 SOS',
    desc: 'Immediate ambulance dispatch & trauma help',
    icon: 'flash-outline',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
    route: 'Emergency',
    isEmergency: true,
  },
];

const WebHeader = ({ navigation, currentRoute = 'Home', currentParams = {} }) => {
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && width >= 600 && width < 1024;
  const isCompactDesktop = width >= 1024 && width < 1340;

  const { language, changeLanguage, LANGUAGES, t, isIndic } = useTheme();
  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const [infoModal, setInfoModal] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null); // 'more-services' | 'language' | 'notifications' | 'user-profile' | null
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [isVipMember, setIsVipMember] = useState(false);
  const [notificationsList, setNotificationsList] = useState(INITIAL_NOTIFICATIONS);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);

  const [isTabletDrawerOpen, setIsTabletDrawerOpen] = useState(false);

  const { pharmacyCartCount = 0, pharmacyFinalTotal = 0, labCartCount = 0 } = useCart() || {};
  // Radiology/Scans & X-Ray are excluded from the shopping cart — they use a dedicated booking flow.
  const totalCartCount = (pharmacyCartCount || 0) + (labCartCount || 0);
  const unreadNotifsCount = notificationsList.filter((n) => n.unread).length;

  const displayName = userName && userName.trim() && userName !== 'My Account' ? userName.trim() : 'Account';
  const displayPhone = userPhone || '';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem('isLoggedIn');
        const isGuestStored = await AsyncStorage.getItem('@unnathi_is_guest');
        const isUserLoggedIn = stored === 'true' && isGuestStored !== 'true';
        setIsLoggedIn(isUserLoggedIn);
        setIsGuest(!isUserLoggedIn && isGuestStored === 'true');
        if (isUserLoggedIn) {
          const name = await AsyncStorage.getItem('userName');
          if (name) setUserName(name);
          const phone = (await AsyncStorage.getItem('userPhone')) || (await AsyncStorage.getItem('@unnathi_user_phone'));
          if (phone) setUserPhone(phone);
        } else {
          setUserName('');
          setUserPhone('');
        }
        const memStr = await AsyncStorage.getItem('@mediunify_membership');
        if (memStr) {
          try {
            const mem = JSON.parse(memStr);
            setIsVipMember(mem?.status === 'active');
          } catch (e) {}
        }
      } catch (e) {}
    };
    checkAuth();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleAuthEvent = (e) => {
        if (e && e.detail) {
          if (typeof e.detail.isLoggedIn === 'boolean') {
            setIsLoggedIn(e.detail.isLoggedIn);
            setIsGuest(!e.detail.isLoggedIn);
          }
          if (e.detail.userName) setUserName(e.detail.userName);
          if (e.detail.userPhone) setUserPhone(e.detail.userPhone);
        }
        checkAuth();
      };

      window.addEventListener('storage', checkAuth);
      window.addEventListener('auth-state-changed', handleAuthEvent);
      window.addEventListener('user-login-success', handleAuthEvent);
      return () => {
        window.removeEventListener('storage', checkAuth);
        window.removeEventListener('auth-state-changed', handleAuthEvent);
        window.removeEventListener('user-login-success', handleAuthEvent);
      };
    }
  }, [currentRoute]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'mediunify-profile-dropdown-css';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        .practo-profile-item {
          transition: background-color 0.12s ease !important;
          cursor: pointer !important;
        }
        .mediunify-lang-item:hover {
          background-color: #F0FDF4 !important;
        }
        .practo-profile-item:hover {
          background-color: #F8FAFC !important;
        }
        .practo-provider-footer:hover {
          background-color: #F1F5F9 !important;
        }
        .mediunify-nav-link {
          transition: color 0.15s ease, background-color 0.15s ease !important;
          cursor: pointer !important;
        }
        .mediunify-nav-link:hover {
          color: #00B894 !important;
          background-color: #E6F8F4 !important;
        }
        .mediunify-utility-item {
          transition: color 0.15s ease !important;
          cursor: pointer !important;
        }
        .mediunify-utility-item:hover {
          opacity: 0.8 !important;
        }
        .mediunify-login-btn {
          transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease !important;
          cursor: pointer !important;
        }
        .mediunify-login-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 16px -2px rgba(0, 184, 148, 0.35) !important;
          background-color: #009E7E !important;
        }
        .more-service-item-hover:hover {
          background-color: #F8FAFC !important;
        }
        .more-service-item-hover:hover .service-arrow-hover {
          transform: translateX(3px) !important;
          color: #00B894 !important;
        }
        .more-service-footer-hover:hover {
          background-color: #E6F8F4 !important;
        }
        .mediunify-logout-cancel-btn:hover {
          background-color: #F1F5F9 !important;
          border-color: #CBD5E1 !important;
        }
        .mediunify-logout-confirm-btn:hover {
          background-color: #F46F3F !important;
          box-shadow: 0 6px 18px -2px rgba(255, 127, 80, 0.4) !important;
        }
      `;
    }
  }, []);

  const handleLogout = () => {
    setOpenDropdown(null);
    setShowLogoutConfirmModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirmModal(false);
    try {
      await AsyncStorage.multiRemove([
        'userToken',
        'isLoggedIn',
        '@unnathi_active_patient',
        'user',
        'userName',
        'userEmail',
        'userPhone',
      ]);
      await AsyncStorage.setItem('isLoggedIn', 'false');
      await AsyncStorage.setItem('@unnathi_is_guest', 'true');
      setIsLoggedIn(false);
      setIsGuest(true);
      setUserName('');
      setUserPhone('');
    } catch (e) {}

    // Direct navigation to Login screen and prevent browser back button returning to private session
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window?.location) {
      const path = window.location.pathname || '';
      let basePath = '/#/login';
      if (path.includes('mediunify-patient')) {
        basePath = '/mediunify-patient/#/login';
      } else if (path.includes('Mediunify-patient-side-application-')) {
        basePath = '/Mediunify-patient-side-application-/#/login';
      }
      try {
        window.location.replace(basePath);
        return;
      } catch (e) {}
    }

    const parent = navigation?.getParent?.();
    if (parent?.reset) {
      try {
        parent.reset({
          index: 0,
          routes: [{ name: 'Auth', state: { routes: [{ name: 'Login' }] } }],
        });
        return;
      } catch (e) {}
    }
    if (parent?.navigate) {
      try {
        parent.navigate('Auth', { screen: 'Login' });
        return;
      } catch (e) {}
    }
    if (navigation?.reset) {
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth', state: { routes: [{ name: 'Login' }] } }],
        });
        return;
      } catch (e) {}
    }
    handleNavigate('Login');
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleClickOutside = (e) => {
        if (!openDropdown) return;
        const moreServicesWrap = document.getElementById('mediunify-more-services-wrap');
        const notifWrap = document.getElementById('mediunify-notif-wrap');
        const profileWrap = document.getElementById('mediunify-profile-wrap');
        const langWrap = document.getElementById('mediunify-lang-wrap');

        if (openDropdown === 'more-services' && moreServicesWrap && !moreServicesWrap.contains(e.target)) {
          setOpenDropdown(null);
        } else if (openDropdown === 'notifications' && notifWrap && !notifWrap.contains(e.target)) {
          setOpenDropdown(null);
        } else if (openDropdown === 'user-profile' && profileWrap && !profileWrap.contains(e.target)) {
          setOpenDropdown(null);
        } else if (openDropdown === 'language' && langWrap && !langWrap.contains(e.target)) {
          setOpenDropdown(null);
        }
      };
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          setOpenDropdown(null);
        }
      };
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        window.addEventListener('keydown', handleEscape);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [openDropdown]);

  const handleNavigate = async (routeName, params = {}) => {
    setOpenDropdown(null);
    setShowSearchModal(false);
    if (!navigation) return;

    let targetRoute = routeName;
    if (targetRoute === 'Home') {
      try {
        const stored = await AsyncStorage.getItem('isLoggedIn');
        const isGuestStored = await AsyncStorage.getItem('@unnathi_is_guest');
        if (stored !== 'true' && isGuestStored !== 'true') {
          targetRoute = 'Login';
        }
      } catch (e) {}
    }
    if (targetRoute === 'FertilityIvf') {
      targetRoute = 'DoctorList';
      params = { ...params, specialty: 'ivf-fertility-group' };
    }

    // Navigate smoothly inside MainApp or direct stack
    if (['Login', 'Register', 'Auth'].includes(targetRoute)) {
      const authScreen = targetRoute === 'Register' ? 'Register' : 'Login';
      const parent = navigation?.getParent?.();
      if (parent?.navigate) {
        try {
          parent.navigate('Auth', { screen: authScreen });
          return;
        } catch (e) {}
      }
      if (navigationRef?.isReady?.()) {
        try {
          navigationRef.navigate('Auth', { screen: authScreen });
          return;
        } catch (e) {}
      }
      if (navigation?.navigate) {
        try {
          navigation.navigate('Auth', { screen: authScreen });
          return;
        } catch (e) {}
        try {
          navigation.navigate(targetRoute);
          return;
        } catch (e) {}
      }
    } else {
      // Primary destination is a MainApp screen (e.g. Pharmacy, FindDoctors, LabTests, etc.)
      const parent = navigation?.getParent?.();
      if (parent?.navigate) {
        try {
          parent.navigate('MainApp', { screen: targetRoute, params });
          return;
        } catch (e) {}
      }
      if (navigationRef?.isReady?.()) {
        try {
          navigationRef.navigate('MainApp', { screen: targetRoute, params });
          return;
        } catch (e) {}
      }
      if (navigation?.navigate) {
        const routeNames = navigation.getState?.()?.routeNames || [];
        if (routeNames.includes('MainApp')) {
          try {
            navigation.navigate('MainApp', { screen: targetRoute, params });
            return;
          } catch (e) {}
        }
        if (routeNames.includes(targetRoute)) {
          try {
            navigation.navigate(targetRoute, params);
            return;
          } catch (e) {}
        }
        try {
          navigation.navigate('MainApp', { screen: targetRoute, params });
          return;
        } catch (e) {
          try {
            navigation.navigate(targetRoute, params);
          } catch (e2) {}
        }
      }
    }
  };

  const isTabActive = (item) => {
    if (item.id === 'doctors' && ['FindDoctors', 'DoctorList', 'DoctorDetails'].includes(currentRoute)) return true;
    if (item.id === 'lab-tests' && currentRoute === 'LabTests') return true;
    if (item.id === 'radiology' && ['Imaging', 'RadiologyLabs'].includes(currentRoute)) return true;
    if (item.id === 'consultation' && ['VideoConsultation', 'VideoBooking', 'AyurvedaWellness'].includes(currentRoute)) return true;
    if (item.id === 'pharmacy' && ['Pharmacy', 'PharmacyStoreDetail', 'Cart'].includes(currentRoute)) return true;
    if (item.id === 'hospitals' && ['HospitalCare', 'HospitalSurgeryDetails'].includes(currentRoute)) return true;
    if (item.id === 'insurance' && currentRoute === 'HealthInsurance') return true;
    if (item.id === 'find-care' && ['DoctorList', 'DoctorDetails', 'FertilityIvf', 'EquipmentRental'].includes(currentRoute)) return true;
    if (item.id === 'more' && ['NurseBooking', 'AyurvedaWellness', 'FertilityIvf', 'EquipmentRental'].includes(currentRoute)) return true;
    return false;
  };

  return (
    <View style={[styles.headerRoot, desktopSiteMode && { minWidth: 1200, width: '100%' }]} nativeID="mediunify-web-header">
      <View style={[styles.headerContainer, { paddingHorizontal: isDesktop ? 40 : 16 }, desktopSiteMode && { minWidth: 1200, width: '100%' }]}>
        {/* ============================================================
            LEFT GROUP: BRAND LOGO + NAV LINKS (PINNED TO LEFT EDGE)
        ============================================================ */}
        <View style={[styles.headerLeftGroup, isIndic && { gap: width < 1360 ? 16 : 24 }]}>
          <TouchableOpacity
            style={styles.brandCol}
            onPress={() => handleNavigate('Home')}
            activeOpacity={0.85}
          >
            <View style={styles.brandRow}>
              <View style={styles.brandTextCol}>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandTitle}>Medi</Text>
                  <Text style={styles.brandTitleAccent}>Unify</Text>
                </View>
                {(isDesktop || width >= 768) && (
                  <Text style={styles.brandTagline} numberOfLines={1}>
                    All your healthcare. One intelligent platform.
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* TABLET MENU TRIGGER (iPad & Android Tablets) */}
          {isTablet && (
            <TouchableOpacity
              style={styles.tabletMenuBtn}
              onPress={() => setIsTabletDrawerOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="menu" size={20} color="#00B894" />
              <Text style={styles.tabletMenuBtnText}>Services</Text>
            </TouchableOpacity>
          )}

          {/* ============================================================
              CENTER: NAVIGATION LINKS (Desktop only)
          ============================================================ */}
          {isDesktop && (
            <View style={[styles.navLinksRow, isIndic && { gap: width < 1360 ? 6 : 10 }]}>
              {NAV_LINKS.map((item) => {
                const active = isTabActive(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.navLinkBtn,
                      isIndic && { paddingHorizontal: width < 1360 ? 8 : 10 },
                      active && styles.navLinkBtnActive,
                    ]}
                    // @ts-ignore
                    className="mediunify-nav-link"
                    onPress={() => {
                      handleNavigate(item.route);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.navLinkText,
                        isIndic && {
                          fontSize: width < 1360 ? 12.5 : 13,
                          lineHeight: 18,
                        },
                        active && styles.navLinkTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t(item.labelKey, item.label)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ============================================================
            RIGHT: PRACTO UTILITY LINKS + NOTIFICATION + CART + PROFILE
        ============================================================ */}
        <View style={[styles.rightActionsRow, { gap: isDesktop ? (isIndic && width < 1360 ? 10 : 16) : 10 }]}>
          {/* Practo Utility Links matching Login page */}
          {isDesktop && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: isIndic ? 10 : 14 }}>
              {/* Language Dropdown Trigger & Popover (Matching More Services reference design) */}
              <View style={styles.moreServicesWrapper} nativeID="mediunify-lang-wrap">
                <TouchableOpacity
                  style={[styles.utilityItem, { flexShrink: 0 }]}
                  // @ts-ignore
                  className="mediunify-utility-item"
                  onPress={() => setOpenDropdown(openDropdown === 'language' ? null : 'language')}
                  activeOpacity={0.8}
                  accessibilityLabel="Select Language"
                >
                  <Ionicons
                    name="globe-outline"
                    size={14}
                    color={openDropdown === 'language' ? '#00B894' : '#475569'}
                    style={{ marginRight: 2 }}
                  />
                  <Text style={[styles.utilityText, openDropdown === 'language' && { color: '#00B894' }, isIndic && { fontSize: 12.5, lineHeight: 17 }]}>
                    {currentLangObj.name || currentLangObj.native || 'English'}
                  </Text>
                  <Ionicons
                    name={openDropdown === 'language' ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={openDropdown === 'language' ? '#00B894' : '#475569'}
                    style={{ marginLeft: 2 }}
                  />
                </TouchableOpacity>

                {/* Language Popover Dropdown (Matches More Services Dropdown Design) */}
                {openDropdown === 'language' && (
                  <View style={[styles.moreServicesDropdown, { width: 220, right: 0, left: 'auto' }]}>
                    <View style={styles.moreServicesMenuList}>
                      {LANGUAGES.map((langItem) => {
                        const isSelected = language === langItem.code;
                        return (
                          <TouchableOpacity
                            key={langItem.code}
                            style={[
                              styles.moreServiceMenuItem,
                              isSelected && { backgroundColor: '#F0FDF4' },
                            ]}
                            // @ts-ignore
                            className="practo-profile-item"
                            onPress={() => {
                              changeLanguage(langItem.code);
                              setOpenDropdown(null);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Text
                                style={[
                                  styles.moreServiceMenuText,
                                  isSelected && { color: '#00B894', fontWeight: '700' },
                                ]}
                              >
                                {langItem.name} {langItem.name !== langItem.native ? `(${langItem.native})` : ''}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={16} color="#00B894" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* More Services Dropdown Trigger & Popover */}
              <View style={styles.moreServicesWrapper} nativeID="mediunify-more-services-wrap">
                <TouchableOpacity
                  style={styles.utilityItem}
                  // @ts-ignore
                  className="mediunify-utility-item"
                  onPress={() => setOpenDropdown(openDropdown === 'more-services' ? null : 'more-services')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.utilityText, openDropdown === 'more-services' && { color: '#00B894' }]}>
                    {t('nav_more_services', 'More Services')}
                  </Text>
                  <Ionicons
                    name={openDropdown === 'more-services' ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={openDropdown === 'more-services' ? '#00B894' : '#475569'}
                    style={{ marginLeft: 2 }}
                  />
                </TouchableOpacity>

                {/* More Services Popover Dropdown (Clean, Simple & User-Friendly matching reference) */}
                {openDropdown === 'more-services' && (
                  <View style={styles.moreServicesDropdown}>
                    <View style={styles.moreServicesMenuList}>
                      {REMAINING_SERVICES.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.moreServiceMenuItem}
                          // @ts-ignore
                          className="practo-profile-item"
                          onPress={() => {
                            setOpenDropdown(null);
                            handleNavigate(item.route);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.moreServiceMenuText, isIndic && { lineHeight: 18 }]}>
                            {REMAINING_KEYS[item.id] ? t(REMAINING_KEYS[item.id], item.title) : item.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notification Icon & Dropdown: ONLY WHEN LOGGED IN */}
          {isLoggedIn && (
            <View style={styles.notifWrapper} nativeID="mediunify-notif-wrap">
              <TouchableOpacity
                style={[
                  styles.headerNotifBtn,
                  (openDropdown === 'notifications' || unreadNotifsCount > 0) && styles.headerNotifBtnActive,
                ]}
                onPress={() => setOpenDropdown(openDropdown === 'notifications' ? null : 'notifications')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={openDropdown === 'notifications' ? 'notifications' : 'notifications-outline'}
                  size={19}
                  color={openDropdown === 'notifications' ? '#00B894' : '#1E3A8A'}
                />
                {unreadNotifsCount > 0 && (
                  <View style={styles.headerNotifBadge}>
                    <Text style={styles.headerNotifBadgeText}>{unreadNotifsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Notification Popover Dropdown */}
              {openDropdown === 'notifications' && (
                <View style={styles.notifDropdown}>
                  {/* Popover Header */}
                  <View style={styles.notifDropdownHeader}>
                    <View style={styles.notifDropdownTitleRow}>
                      <Ionicons name="notifications" size={16} color="#00B894" />
                      <Text style={styles.notifDropdownTitle}>Notifications</Text>
                      {unreadNotifsCount > 0 && (
                        <View style={styles.notifBadgeCount}>
                          <Text style={styles.notifBadgeCountText}>{unreadNotifsCount} new</Text>
                        </View>
                      )}
                    </View>
                    {unreadNotifsCount > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setNotificationsList((prev) => prev.map((n) => ({ ...n, unread: false })));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.notifMarkAllText}>Mark all read</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Notification Items List */}
                  <ScrollView style={styles.notifListScroll} showsVerticalScrollIndicator={false}>
                    {notificationsList.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.notifItem, item.unread && styles.notifItemUnread]}
                        onPress={() => {
                          setNotificationsList((prev) =>
                            prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
                          );
                          setOpenDropdown(null);
                          if (item.route) handleNavigate(item.route);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.notifIconBox, { backgroundColor: item.iconBg }]}>
                          <Ionicons name={item.icon} size={17} color={item.iconColor} />
                        </View>
                        <View style={styles.notifContentCol}>
                          <Text style={styles.notifItemTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.notifItemMsg} numberOfLines={2}>
                            {item.message}
                          </Text>
                          <View style={styles.notifItemFooter}>
                            <Text style={styles.notifItemTime}>{item.time}</Text>
                            {item.unread && <View style={styles.notifUnreadDot} />}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Dropdown Footer */}
                  <View style={styles.notifDropdownFooter}>
                    <TouchableOpacity
                      style={styles.notifViewAllBtn}
                      onPress={() => {
                        setOpenDropdown(null);
                        handleNavigate('Notifications');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.notifViewAllText}>View All Notifications</Text>
                      <Ionicons name="arrow-forward" size={13} color="#1E3A8A" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notifSettingsBtn}
                      onPress={() => {
                        setOpenDropdown(null);
                        handleNavigate('Settings');
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="settings-outline" size={15} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Cart Icon & Badge: ALWAYS VISIBLE (Both Guests & Logged-In Users) */}
          <TouchableOpacity
            style={[
              styles.headerCartBtn,
              totalCartCount > 0 && styles.headerCartBtnActive,
              { marginRight: 8 },
            ]}
            onPress={() => {
              let targetTab = 'pharmacy';
              if (pharmacyCartCount > 0) targetTab = 'pharmacy';
              else if (labCartCount > 0) targetTab = 'lab';
              handleNavigate('Cart', { initialTab: targetTab });
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cart-outline"
              size={19}
              color={totalCartCount > 0 ? '#00B894' : '#1E3A8A'}
            />
            {totalCartCount > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>{totalCartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Auth Action Buttons */}
          {isLoggedIn ? (
            <View style={styles.userProfileWrapper} nativeID="mediunify-profile-wrap">
              <TouchableOpacity
                style={[
                  styles.userProfileTrigger,
                  openDropdown === 'user-profile' && styles.userProfileTriggerActive,
                ]}
                onPress={() => setOpenDropdown(openDropdown === 'user-profile' ? null : 'user-profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.userProfileTriggerText} numberOfLines={1}>
                  {displayName.split(' ')[0]}...
                </Text>
                <Ionicons
                  name={openDropdown === 'user-profile' ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color="#475569"
                />
              </TouchableOpacity>

              {/* Practo Profile Dropdown Card */}
              {openDropdown === 'user-profile' && (
                <View style={styles.practoProfileDropdown}>
                  {/* User Info Header matching reference */}
                  <View style={styles.practoProfileHeader}>
                    <View style={styles.practoAvatarBox}>
                      <Ionicons name="person" size={24} color="#94A3B8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.practoProfileName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={styles.practoProfilePhone}>
                        {displayPhone}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.practoProfileDivider} />

                  {/* Menu Items matching Practo */}
                  <View style={styles.practoProfileMenuList}>
                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={() => handleNavigate('MyAppointments')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('my_appointments', 'My Appointments')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={() => handleNavigate('MyTests')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('my_tests', 'My Tests')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={() => handleNavigate('MyMedicineOrders')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('my_medicine_orders', 'My Medicine Orders')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={() => handleNavigate('MyMedicalRecords')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('my_medical_records', 'My Medical Records')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={() => handleNavigate('MyOnlineConsultations')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('my_online_consultations', 'My Online Consultations')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={() => handleNavigate('MyFeedback')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('my_feedback', 'My Feedback')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={() => handleNavigate('Profile', { editMode: true })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('view_update_profile', 'View / Update Profile')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.practoProfileMenuItem}
                      // @ts-ignore
                      className="practo-profile-item"
                      onPress={handleLogout}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.practoProfileMenuText}>{t('logout', 'Logout')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isGuest && (
                <View style={styles.headerGuestPill}>
                  <Ionicons name="person-outline" size={13} color="#1E3A8A" />
                  <Text style={styles.headerGuestPillText}>Guest</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.loginBtn}
                // @ts-ignore
                className="mediunify-login-btn"
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                  } else {
                    handleNavigate('Login', { openAuthModal: true });
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.loginBtnText}>{t('nav_login_signup', 'Login / Signup')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ============================================================
          TABLET HORIZONTAL TOUCH NAVIGATION STRIP (iPad & Android Tablets)
      ============================================================ */}
      {isTablet && (
        <View style={styles.tabletNavStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabletNavScrollContent}
          >
            {NAV_LINKS.map((item) => {
              const active = isTabActive(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tabletNavPill, active && styles.tabletNavPillActive]}
                  onPress={() => {
                    if (item.hasDropdown) {
                      setIsTabletDrawerOpen(true);
                    } else if (item.route) {
                      handleNavigate(item.route);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tabletNavPillText, active && styles.tabletNavPillTextActive]}>
                    {item.shortLabel || item.label}
                  </Text>
                  {item.isAi && (
                    <View style={{ backgroundColor: active ? '#00B894' : '#ECFDF5', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5, marginLeft: 4 }}>
                      <Ionicons name="sparkles" size={9} color={active ? '#FFFFFF' : '#00B894'} />
                    </View>
                  )}
                  {item.isVip && (
                    <View style={{ backgroundColor: active ? '#1E3A8A' : '#E0F7FA', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5, marginLeft: 4 }}>
                      <Text style={{ fontSize: 8.5, fontWeight: '900', color: active ? '#FFFFFF' : '#1E3A8A' }}>VIP</Text>
                    </View>
                  )}
                  {item.hasDropdown && (
                    <Ionicons name="chevron-down" size={10} color={active ? '#00B894' : '#64748B'} style={{ marginLeft: 3 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}



      {/* ============================================================
          LOCATION MODAL WITH SEARCH BAR


      {/* Info Modals */}
      <Modal
        visible={!!infoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.cityModalCard, { maxWidth: 500, width: '92%' }]}>
            <View style={styles.cityModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {infoModal === 'corporates' && <Ionicons name="business-outline" size={20} color="#00B894" />}
                {infoModal === 'providers' && <Ionicons name="medical-outline" size={20} color="#00B894" />}
                {infoModal === 'security' && <Ionicons name="shield-checkmark-outline" size={20} color="#00B894" />}
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {infoModal === 'corporates' && 'Unnathi for Corporates'}
                  {infoModal === 'providers' && 'Partner with Unnathi Healthcare'}
                  {infoModal === 'security' && 'Security, Privacy & 24/7 Helpline'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInfoModal(null)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14 }}>
              {infoModal === 'corporates' && (
                <Text style={{ fontSize: 14, lineHeight: 22, color: '#334155' }}>
                  Empower your workforce with corporate health benefits. We provide annual executive checkups, on-site vaccination camps, 24/7 unlimited teleconsultation, and group cashless health insurance.
                </Text>
              )}
              {infoModal === 'providers' && (
                <Text style={{ fontSize: 14, lineHeight: 22, color: '#334155' }}>
                  Are you a Doctor, Diagnostic Lab, or Specialty Hospital? Join Unnathi Healthcare to connect with thousands of active patients across Karnataka, manage digital prescriptions, and streamline OPD appointments.
                </Text>
              )}
              {infoModal === 'security' && (
                <View>
                  <Text style={{ fontSize: 14, lineHeight: 22, color: '#334155' }}>
                    Your health records and consultations are protected with 256-bit encryption in compliance with Indian Telemedicine & NABH guidelines.
                  </Text>
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="call" size={15} color="#166534" />
                      <Text style={{ fontWeight: '800', color: '#166534', fontSize: 13 }}>
                        24/7 Patient Emergency Helpline:
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '700', color: '#15803D', fontSize: 15, marginTop: 4 }}>
                      1800-425-0099 / +91 80 2345 6789
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#0D9488', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 }}
              onPress={() => setInfoModal(null)}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          LOGOUT CONFIRMATION MODAL
      ============================================================ */}
      <Modal
        visible={showLogoutConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.cityModalCard, { maxWidth: 440, width: '92%', padding: 26, borderRadius: 18 }]}>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF2ED', borderWidth: 1.5, borderColor: '#FFD7C7', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <Ionicons name="log-out-outline" size={26} color="#FF7F50" />
            </View>

            <Text style={{ fontSize: 19, fontWeight: '800', color: '#1E3A8A', textAlign: 'center', marginBottom: 8, letterSpacing: -0.2 }}>
              Logout from MediUnify
            </Text>

            <Text style={{ fontSize: 13.5, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 24, paddingHorizontal: 4 }}>
              Are you sure you want to logout? You will need to sign in again to access your appointments, medical records, and tests.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.2, borderColor: '#DCE7EC', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {}) }}
                // @ts-ignore
                className="mediunify-logout-cancel-btn"
                onPress={() => setShowLogoutConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: '#FF7F50',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#FF7F50',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 3,
                  ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {})
                }}
                // @ts-ignore
                className="mediunify-logout-confirm-btn"
                onPress={confirmLogout}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          SEARCH MODAL
      ============================================================ */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSearchModal(false)}
        >
          <View style={styles.searchModalCard}>
            <View style={styles.searchModalInputRow}>
              <Ionicons name="search" size={20} color="#64748B" />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Search doctors, lab tests, scans, medicines..."
                placeholderTextColor="#94A3B8"
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={async () => {
                  const q = searchQuery.trim();
                  if (!q) return;
                  const shouldShow = await shouldShowGuestLeadPopup();
                  if (shouldShow) {
                    setPendingSearchQuery(q);
                    setShowSearchModal(false);
                    setShowLeadModal(true);
                    return;
                  }
                  setShowSearchModal(false);
                  handleNavigate('GlobalSearch', { query: q });
                }}
              />
              <TouchableOpacity
                style={styles.searchModalSubmit}
                onPress={async () => {
                  const q = searchQuery.trim();
                  if (!q) return;
                  const shouldShow = await shouldShowGuestLeadPopup();
                  if (shouldShow) {
                    setPendingSearchQuery(q);
                    setShowSearchModal(false);
                    setShowLeadModal(true);
                    return;
                  }
                  setShowSearchModal(false);
                  handleNavigate('GlobalSearch', { query: q });
                }}
              >
                <Text style={styles.searchModalSubmitText}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Suggestions */}
            <View style={styles.searchSuggestions}>
              <Text style={styles.suggestionsLabel}>Popular searches:</Text>
              <View style={styles.suggestionPills}>
                {['CBC Test', 'Thyroid Profile', 'Vitamin D', 'MRI Scan', 'CT Scan', 'Cardiologist'].map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionPill}
                    onPress={async () => {
                      const shouldShow = await shouldShowGuestLeadPopup();
                      if (shouldShow) {
                        setPendingSearchQuery(s);
                        setShowSearchModal(false);
                        setShowLeadModal(true);
                        return;
                      }
                      setShowSearchModal(false);
                      handleNavigate('GlobalSearch', { query: s });
                    }}
                  >
                    <Text style={styles.suggestionPillText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          TABLET SERVICES MENU MODAL (iPad & Android Tablets)
      ============================================================ */}
      <Modal
        visible={isTabletDrawerOpen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsTabletDrawerOpen(false)}
      >
        <View style={styles.tabletServicesOverlay}>
          <View style={styles.tabletDrawerCard}>
            {/* Modal Header */}
            <View style={styles.tabletDrawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={{ width: 36, height: 36 }}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.tabletDrawerTitle}>MediUnify Healthcare</Text>
                  <Text style={styles.tabletDrawerSub}>My Services</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.tabletDrawerCloseBtn}
                onPress={() => setIsTabletDrawerOpen(false)}
                activeOpacity={0.8}
                accessibilityLabel="Close Services Menu"
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* My Services List */}
            <ScrollView
              style={styles.tabletDrawerScroll}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.tabletDrawerScrollContent}
            >
              <View style={styles.tabletDrawerGrid}>
                {MY_SERVICES_TABLET.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.tabletDrawerTile,
                      item.isEmergency && styles.tabletDrawerTileEmergency,
                    ]}
                    // @ts-ignore
                    className="more-service-item-hover"
                    onPress={() => {
                      setIsTabletDrawerOpen(false);
                      handleNavigate(item.route);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.tabletDrawerTileIconBox, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon} size={20} color={item.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.tabletDrawerTileTitle,
                          item.isEmergency && { color: '#DC2626' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.tabletDrawerTileDesc} numberOfLines={2}>
                        {item.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Guest Lead-Generation Popup */}
      <GuestLeadModal
        visible={showLeadModal}
        searchQuery={pendingSearchQuery}
        selectedCity="Mysuru"
        onSuccess={() => {
          setShowLeadModal(false);
          handleNavigate('GlobalSearch', { query: pendingSearchQuery });
        }}
        onClose={() => {
          setShowLeadModal(false);
          handleNavigate('GlobalSearch', { query: pendingSearchQuery });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRoot: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7EC',
    zIndex: 9999,
    width: '100%',
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
      },
    }),
  },
  headerContainer: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    height: 72,
    position: 'relative',
    zIndex: 1000,
    flexWrap: 'nowrap',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    flexShrink: 0,
  },

  // Brand Logo
  brandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImg: {
    width: 36,
    height: 36,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.6,
  },
  brandTitleAccent: {
    fontSize: 23,
    fontWeight: '900',
    color: '#00B894',
    letterSpacing: -0.6,
  },
  brandTagline: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: -2,
    letterSpacing: -0.1,
  },

  // Center Navigation Links
  navLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    zIndex: 1001,
  },
  navItemWrapper: {
    position: 'relative',
    zIndex: 1002,
  },
  navLinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  navLinkBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: -0.1,
  },
  navLinkTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },

  // Right Actions
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  newBadge: {
    backgroundColor: '#1E3A8A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 3,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  utilityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  aiChatbotHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.2,
    borderColor: '#DCE7EC',
    gap: 7,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  aiChatbotHeaderBtnActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  aiHeaderIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#00B894',
    letterSpacing: 0.2,
  },
  aiHeaderBtnTextActive: {
    color: '#FFFFFF',
  },
  aiHeaderLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00B894',
  },
  locationSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    backgroundColor: '#FAFCFD',
    gap: 6,
  },
  locationCityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  searchIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  notifWrapper: {
    position: 'relative',
    zIndex: 1002,
  },
  headerNotifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  headerNotifBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  headerNotifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerNotifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  notifDropdown: {
    position: 'absolute',
    top: 48,
    right: -70,
    width: 370,
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 25,
    zIndex: 99999,
    overflow: 'hidden',
  },
  notifDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7EC',
    backgroundColor: '#F1F8FB',
  },
  notifDropdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifDropdownTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  notifBadgeCount: {
    backgroundColor: '#00B894',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notifBadgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifMarkAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  notifListScroll: {
    maxHeight: 350,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F8FB',
    gap: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.15s ease' } : {}),
  },
  notifItemUnread: {
    backgroundColor: '#ECFDF5',
  },
  notifIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  notifContentCol: {
    flex: 1,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  notifItemMsg: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 4,
  },
  notifItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifItemTime: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  notifUnreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00B894',
  },
  notifDropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#DCE7EC',
    backgroundColor: '#FFFFFF',
  },
  notifViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  notifViewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  notifSettingsBtn: {
    padding: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  headerCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    position: 'relative',
  },
  headerCartBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Auth Buttons
  authButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginBtn: {
    backgroundColor: '#00B894',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  loginBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  headerGuestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerGuestPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  userProfileWrapper: {
    position: 'relative',
    zIndex: 1003,
  },
  userProfileTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.15s ease' } : {}),
  },
  userProfileTriggerActive: {
    backgroundColor: '#F1F5F9',
  },
  userProfileTriggerText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },

  // Practo Profile Dropdown
  practoProfileDropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 275,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 99999,
    overflow: 'hidden',
  },
  practoProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  practoAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#F1F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practoProfileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    lineHeight: 18,
  },
  practoProfilePhone: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  practoProfileDivider: {
    height: 1,
    backgroundColor: '#DCE7EC',
    width: '100%',
  },
  practoProfileMenuList: {
    paddingVertical: 6,
  },
  practoProfileMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  practoProfileMenuText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  practoProfileFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F1F8FB',
    borderTopWidth: 1,
    borderTopColor: '#DCE7EC',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  practoFooterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
    marginBottom: 2,
  },
  practoFooterDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 59, 107, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cityModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cityModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  cityModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  cityList: {
    gap: 8,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  cityItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  cityItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  cityItemTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },

  // Search Modal
  searchModalCard: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
  searchModalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchModalInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E3A8A',
    outlineStyle: 'none',
  },
  searchModalSubmit: {
    backgroundColor: '#00B894',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 7,
  },
  searchModalSubmitText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  searchSuggestions: {
    marginTop: 14,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F8FB',
    borderWidth: 1,
    borderColor: '#DCE7EC',
  },
  suggestionPillText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },



  // TABLET RESPONSIVE NAVIGATION STYLES (iPad & Android Tablets)
  tabletMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.2,
    borderColor: '#DCE7EC',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {}),
  },
  tabletMenuBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#00B894',
  },


  tabletNavStrip: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F8FB',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7EC',
    paddingVertical: 7,
    width: '100%',
  },
  tabletNavScrollContent: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabletNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 20,
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap' } : {}),
  },
  tabletNavPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  tabletNavPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  tabletNavPillTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },

  // TABLET SERVICES MENU STYLES (iPad & Android Tablets)
  tabletServicesOverlay: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? { width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 999999 } : {}),
  },
  tabletDrawerCard: {
    width: '96%',
    maxWidth: 720,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  tabletDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7EC',
  },
  tabletDrawerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.2,
  },
  tabletDrawerSub: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  tabletDrawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {}),
  },
  tabletDrawerScroll: {
    marginTop: 14,
    flex: 1,
  },
  tabletDrawerScrollContent: {
    paddingVertical: 4,
  },
  tabletDrawerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  tabletDrawerTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFD',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    width: '48.8%',
    gap: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {}),
  },
  tabletDrawerTileEmergency: {
    backgroundColor: '#FFF7F7',
    borderColor: '#FECACA',
  },
  tabletDrawerTileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletDrawerTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  tabletDrawerTileDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  moreServicesWrapper: {
    position: 'relative',
    zIndex: 10000,
  },
  moreServicesDropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE7EC',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 99999,
    overflow: 'hidden',
  },
  moreServicesMenuList: {
    paddingVertical: 6,
  },
  moreServiceMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  moreServiceMenuText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  moreServicesDivider: {
    height: 1,
    backgroundColor: '#DCE7EC',
    width: '100%',
  },
  moreServicesFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F1F8FB',
    borderTopWidth: 1,
    borderTopColor: '#DCE7EC',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  moreServicesFooterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B894',
  },
  moreServicesFooterDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
});

export default WebHeader;
