import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  Platform,
  Keyboard,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import WebFooter from '../../components/web/WebFooter';
import { useCart } from '../../context/CartContext';
import { isDesktopLayout } from '../../utils/responsiveLayoutHelper';
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

// Desktop Web Search Data (Preserved for Web view)
const searchData = [
  {
    id: 'doctor-general',
    category: 'Doctors',
    title: 'Find Doctors & Specialists',
    description: 'Book in-clinic consultation with 50+ verified specialists',
    keywords: 'doctor doctors physician general medicine fever cold cough headache consultation clinic specialist dr appointment slots',
    icon: 'person',
    backgroundColor: '#F0FDFA',
    iconColor: colors.primary,
    badgeText: 'Instant Slots',
    badgeColor: '#CCFBF1',
    route: 'DoctorList',
  },
  {
    id: 'doctor-cardio',
    category: 'Doctors',
    title: 'Cardiologist & Heart Care',
    description: 'ECG, Echo, BP management & heart specialists (Dr. Rajesh Sharma)',
    keywords: 'cardiologist heart ecg echo blood pressure hypertension cardiac chest pain dr rajesh sharma',
    icon: 'heart',
    backgroundColor: '#FEF2F2',
    iconColor: '#DC2626',
    badgeText: 'Top Rated',
    badgeColor: '#FEE2E2',
    route: 'DoctorList',
  },
  {
    id: 'doctor-derma',
    category: 'Doctors',
    title: 'Dermatologist & Skin Care',
    description: 'Acne, allergies, hair fall & cosmetic dermatology (Dr. Priya Rao)',
    keywords: 'dermatologist skin hair acne allergy rash eczema cosmetic glow dr priya rao',
    icon: 'sparkles',
    backgroundColor: '#F2FAF0',
    iconColor: '#7BC96F',
    badgeText: 'Specialist',
    badgeColor: '#F2FAF0',
    route: 'DoctorList',
  },
  {
    id: 'doctor-pedia',
    category: 'Doctors',
    title: 'Pediatrician & Child Health',
    description: 'Newborn care, vaccinations & pediatric nutrition (Dr. Ananya Reddy)',
    keywords: 'pediatrician child baby newborn vaccination immunization fever infant dr ananya reddy',
    icon: 'happy',
    backgroundColor: '#E0F7FA',
    iconColor: '#1E3A8A',
    badgeText: 'Child Care',
    badgeColor: '#E0F7FA',
    route: 'DoctorList',
  },
  {
    id: 'video-consult',
    category: 'Doctors',
    title: 'Online Video Consultation',
    description: 'Consult top doctors via 10-minute HD video call with digital Rx',
    keywords: 'video consultation online doctor video call teleconsultation instant call prescription digital rx',
    icon: 'videocam',
    backgroundColor: '#E0F7FA',
    iconColor: '#00C2CB',
    badgeText: '10 Min Connect',
    badgeColor: '#E0F7FA',
    route: 'VideoConsultation',
  },
  {
    id: 'pharmacy-main',
    category: 'Medicines',
    title: 'Online Pharmacy & Medicines',
    description: 'Order genuine medicines with flat 20% OFF & express delivery',
    keywords: 'pharmacy medicine medicines order tablets syrup capsules painkiller antibiotic dolo 650 paracetamol azithromycin discount 20% off delivery',
    icon: 'medkit',
    backgroundColor: '#E6F8F5',
    iconColor: '#00B894',
    badgeText: '20% OFF',
    badgeColor: '#CCFBF1',
    route: 'Pharmacy',
  },
  {
    id: 'pharmacy-return',
    category: 'Medicines',
    title: 'Medicine Return & Refund',
    description: 'Easy return policy for unused sealed medicines with reason feedback',
    keywords: 'return medicine refund exchange product return issue wrong tablet expired sealed return order pharmacy refund',
    icon: 'swap-horizontal',
    backgroundColor: '#FFF2ED',
    iconColor: '#FF7F50',
    badgeText: 'Doorstep Pickup',
    badgeColor: '#FFF2ED',
    route: 'Pharmacy',
  },
  {
    id: 'lab-tests',
    category: 'Labs & Scans',
    title: 'Diagnostic Lab & Blood Tests',
    description: 'CBC, HbA1c, Lipid Profile, Thyroid with Free Home Sample Collection',
    keywords: 'lab tests blood test cbc hba1c thyroid lipid profile sugar fasting urine test pathology diagnostics report doorstep sample',
    icon: 'flask',
    backgroundColor: '#E0F7FA',
    iconColor: '#00C2CB',
    badgeText: 'Free Home Pickup',
    badgeColor: '#E0F7FA',
    route: 'LabTests',
  },
  {
    id: 'lab-full-body',
    category: 'Labs & Scans',
    title: 'Full Body Health Checkup',
    description: '72+ vital tests (Liver, Kidney, Heart, Diabetes & Vitamins)',
    keywords: 'full body checkup health package executive comprehensive preventive master health test',
    icon: 'fitness',
    backgroundColor: '#F2FAF0',
    iconColor: '#7BC96F',
    badgeText: '50% OFF Pack',
    badgeColor: '#F2FAF0',
    route: 'LabTests',
  },
  {
    id: 'radiology-scans',
    category: 'Labs & Scans',
    title: 'Radiology & Cardiology Diagnostic Scans',
    description: 'Book 2D Echo, 12-Lead ECG, 3T MRI, CT Scan, Ultrasound & TMT Stress Test',
    keywords: 'radiology cardiology scans 2d echo echo ecg tmt holter cardiac ct heart scan heart echo 3t mri scan 128 ct scan brain spine abdomen knee xray digital x-ray ultrasound sonography mammography dexa pet ct diagnostic center hospital only',
    icon: 'heart-circle',
    backgroundColor: '#EEF2FF',
    iconColor: '#4F46E5',
    badgeText: 'NABH Centres',
    badgeColor: '#E0E7FF',
    route: 'RadiologyScans',
  },
  {
    id: 'hospital-care',
    category: 'Hospitals',
    title: 'Hospital Surgeries & Cashless Care',
    description: 'NABH accredited network hospitals, cashless insurance & doctor second opinions',
    keywords: 'hospital surgeries surgery admission cashless insurance tpa mediclaim laparoscopic hernia gallbladder cataract knee replacement appendix ortho',
    icon: 'business',
    backgroundColor: '#EFF6FF',
    iconColor: '#2563EB',
    badgeText: 'Cashless TPA',
    badgeColor: '#DBEAFE',
    route: 'HospitalCare',
  },
  {
    id: 'home-nursing',
    category: 'Care Services',
    title: 'Home Nursing & Attendant Care',
    description: '12hr/24hr qualified ICU nursing, post-surgery care, elderly assistance & IV infusion at home',
    keywords: 'home nursing nurse attendant caregiver elder care patient care iv injection catheter dressing wound care physiotherapy',
    icon: 'home',
    backgroundColor: '#F0FDF4',
    iconColor: '#16A34A',
    badgeText: 'Verified Nurses',
    badgeColor: '#DCFCE7',
    route: 'NurseBooking',
  },
  {
    id: 'equipment-rental',
    category: 'Care Services',
    title: 'Medical Equipment Rental',
    description: 'Hospital beds, oxygen concentrators, BiPAP/CPAP, wheelchairs & suction units with doorstep setup',
    keywords: 'equipment rental rent medical equipment oxygen concentrator hospital bed fowler motorized wheelchair bipap cpap suction pump ventilator monitor',
    icon: 'cube',
    backgroundColor: '#FAF5FF',
    iconColor: '#9333EA',
    badgeText: 'Free 4Hr Setup',
    badgeColor: '#F3E8FF',
    route: 'EquipmentRental',
  },
  {
    id: 'ayurveda-wellness',
    category: 'Care Services',
    title: 'Ayurveda & Panchakarma Clinic',
    description: 'Traditional Ayurvedic consultations, herbal medicines, Shirodhara & rejuvenation therapy',
    keywords: 'ayurveda panchakarma ayurvedic doctor vaidya shirodhara abhyanga herbal detox spine joint pain immunity wellness',
    icon: 'leaf',
    backgroundColor: '#ECFDF5',
    iconColor: '#059669',
    badgeText: 'AYUSH Certified',
    badgeColor: '#D1FAE5',
    route: 'AyurvedaWellness',
  },
  {
    id: 'emergency-sos',
    category: 'Care Services',
    title: 'Emergency SOS & Ambulance (108)',
    description: 'One-tap 108 ambulance dispatch and 24x7 doctor helpline calling',
    keywords: 'emergency sos ambulance 108 24x7 doctor helpline call urgent accident trauma help',
    icon: 'alert-circle',
    backgroundColor: '#FEF2F2',
    iconColor: '#DC2626',
    badgeText: '24x7 Emergency',
    badgeColor: '#FEE2E2',
    route: 'Emergency',
  },
  {
    id: 'wallet-points',
    category: 'Care Services',
    title: 'Health Wallet & Care Points',
    description: 'Manage wallet cash, earn cashback & redeem loyalty care points',
    keywords: 'wallet care points money balance topup cashback reward coins payment refund',
    icon: 'wallet',
    backgroundColor: '#ECFDF5',
    iconColor: '#047857',
    badgeText: 'Instant Cashback',
    badgeColor: '#D1FAE5',
    route: 'Wallet',
  },
];

const CATEGORIES = ['All', 'Doctors', 'Medicines', 'Labs & Scans', 'Hospitals', 'Care Services'];

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

const GlobalSearchScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && isDesktopLayout(width);
  const { t, isIndic, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);

  const searchPlaceholder = width < 360
    ? t('search_placeholder_short', 'Search doctors, clinics...')
    : width < 420
    ? t('search_placeholder_med', 'Search doctors, clinics, tests...')
    : t('search_placeholder', 'Search doctors, clinics, hospitals, tests...');

  // Search input state
  const [query, setQuery] = useState(route?.params?.query || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchDebounceQuery, setSearchDebounceQuery] = useState(route?.params?.query || '');
  const [isSearching, setIsSearching] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const handleSearchSubmit = async () => {
    const q = query.trim() || 'All Healthcare Services';
    const shouldShow = await shouldShowGuestLeadPopup();
    if (shouldShow) {
      setPendingSearchQuery(q);
      setShowLeadModal(true);
      return;
    }
    Keyboard.dismiss();
  };

  // Cart Context & City Awareness
  const cartContext = useCart();
  const [storedCity, setStoredCity] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('@mediunify_selected_city')
      .then((val) => {
        if (val) setStoredCity(val);
      })
      .catch(() => {});
  }, []);

  const currentCity = route?.params?.city || cartContext?.selectedCity || storedCity || 'Mysuru';

  // Sync route query if passed
  useEffect(() => {
    if (route?.params?.query !== undefined) {
      setQuery(route.params.query);
      setSearchDebounceQuery(route.params.query);
    }
  }, [route?.params?.query]);

  // Auto-focus search input on mobile on mount
  useEffect(() => {
    if (!isDesktopWeb) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isDesktopWeb]);

  // Hardware Back button on Android
  useEffect(() => {
    if (isDesktopWeb) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [isDesktopWeb, navigation]);

  // Debounce input (120ms) for ultra-fast typing response without stutter
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setSearchDebounceQuery(query);
      setIsSearching(false);
    }, 120);
    return () => clearTimeout(handler);
  }, [query]);

  // Voice Search Simulation
  const handleVoiceSearch = () => {
    const voiceSuggestions = ['Doctor', 'CBC Test', 'Paracetamol', 'CT Scan'];
    const chosen = voiceSuggestions[Math.floor(Math.random() * voiceSuggestions.length)];
    setQuery(chosen);
    setToastMsg(`Voice input: "${chosen}"`);
    setTimeout(() => {
      setToastMsg(null);
    }, 2500);
  };

  // ============================================================
  // REAL SEARCH ENGINE (MOBILE & TABLET)
  // ============================================================
  const mobileSearchResults = useMemo(() => {
    const rawQuery = searchDebounceQuery.trim().toLowerCase();
    if (!rawQuery) return [];

    const cityLower = currentCity.toLowerCase();
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
            category: 'Lab Packages',
            subtitle: `Health Package • ${pkg.testsCount || 'Comprehensive'}`,
            badge: pkg.price ? `₹${pkg.price}` : '',
            icon: 'fitness',
            iconType: 'ionicons',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            priority: match(pkg.name) ? 1 : 2,
            onPress: () => {
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
            subtitle: `Clinic & Lab • ${centre.area || currentCity}`,
            badge: centre.rating ? `★ ${centre.rating}` : 'Verified',
            icon: 'business',
            iconType: 'ionicons',
            iconBg: '#F8FAFC',
            iconColor: '#475569',
            priority: match(centre.name) ? 1 : 2,
            onPress: () => {
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
            subtitle: `Hospital & Surgery • ${hosp.location || currentCity}`,
            badge: hosp.rating ? `★ ${hosp.rating}` : 'NABH',
            icon: 'hospital-building',
            iconType: 'material',
            iconBg: '#EFF6FF',
            iconColor: '#1D4ED8',
            priority: match(hosp.name) ? 1 : 2,
            onPress: () => {
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
  }, [searchDebounceQuery, currentCity, navigation]);

  // Compute available matching categories for filter chips (only show categories that actually have matching results)
  const matchingCategories = useMemo(() => {
    if (mobileSearchResults.length === 0) return [];
    const catCounts = {};
    mobileSearchResults.forEach((r) => {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });
    const categories = Object.keys(catCounts).map((cat) => ({
      name: cat,
      count: catCounts[cat],
    }));
    return [{ name: 'All', count: mobileSearchResults.length }, ...categories];
  }, [mobileSearchResults]);

  // Filtered by selected category chip if user tapped a chip
  const displayedSearchResults = useMemo(() => {
    if (selectedCategory === 'All') return mobileSearchResults.slice(0, 35);
    return mobileSearchResults
      .filter((r) => r.category === selectedCategory)
      .slice(0, 35);
  }, [mobileSearchResults, selectedCategory]);

  // ============================================================
  // DESKTOP WEB ENGINE (Utilizing Real Multi-Service Catalog)
  // ============================================================
  const desktopWebResults = useMemo(() => {
    if (mobileSearchResults && mobileSearchResults.length > 0) {
      if (selectedCategory === 'All') return mobileSearchResults;
      return mobileSearchResults.filter((item) => item.category === selectedCategory);
    }
    const text = query.trim().toLowerCase();
    return searchData.filter((item) => {
      const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
      if (!categoryMatch) return false;
      if (!text) return true;
      const searchableText = `${item.title} ${item.description} ${item.keywords} ${item.category}`.toLowerCase();
      return searchableText.includes(text);
    });
  }, [query, selectedCategory, mobileSearchResults]);

  const openScreen = (screenRoute) => {
    navigation.navigate(screenRoute);
  };

  const renderWebItem = ({ item }) => {
    const title = item.title || item.name;
    const desc = item.description || item.subtitle;
    const badge = item.badgeText || item.badge;
    const iconName = item.icon || 'medkit';
    const bg = item.backgroundColor || item.iconBg || '#F0FDFA';
    const fg = item.iconColor || colors.primary;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => {
          if (typeof item.onPress === 'function') {
            item.onPress();
          } else if (item.route) {
            openScreen(item.route);
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          {item.iconType === 'material' ? (
            <MaterialCommunityIcons name={iconName} size={24} color={fg} />
          ) : (
            <Ionicons name={iconName} size={24} color={fg} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {title}
            </Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: item.badgeColor || '#F1F5F9' }]}>
                <Text style={[styles.badgeText, { color: fg }]}>{badge}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.itemDescription} numberOfLines={2}>
            {desc}
          </Text>

          <View style={styles.categoryTagRow}>
            <Text style={styles.categoryTagText}>{item.category}</Text>
            <View style={styles.actionPrompt}>
              <Text style={styles.actionPromptText}>Book / View</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, isDarkMode && { backgroundColor: '#080E1A' }, isDesktopWeb && styles.webContainer]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#080E1A' : '#FFFFFF'} />

      {/* TOAST MESSAGE */}
      {toastMsg && (
        <View style={styles.toastCard}>
          <Ionicons name="information-circle" size={16} color="#10B981" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* MOBILE FULLY FUNCTIONAL HEALTHCARE SEARCH BAR */}
      {!isDesktopWeb && (
        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchBarBox, styles.searchBarBoxActive, isDarkMode && { backgroundColor: '#111C35', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.searchBackIconBtn}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#F8FAFC' : '#0F172A'} />
            </TouchableOpacity>

            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, isIndic && { fontSize: 12.5 }]}
              placeholder={searchPlaceholder}
              placeholderTextColor="#64748B"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (selectedCategory !== 'All') {
                  setSelectedCategory('All');
                }
              }}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="never"
              autoFocus={true}
            />

            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                style={styles.searchClearBtn}
                activeOpacity={0.7}
                accessibilityLabel="Clear Search"
              >
                <Ionicons name="close-circle" size={19} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {isDesktopWeb ? (
        /* ============================================================
            DESKTOP WEB VIEW (Preserved for Web)
        ============================================================ */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.webScrollContent}>
          <View style={styles.webInnerContainer}>
            {/* SEARCH HEADER */}
            <View style={styles.webBreadcrumbHeader}>
              <View style={styles.webTitleRow}>
                <View>
                  <Text style={styles.webPageTitle}>
                    {query.trim() ? `Search Results for "${query}"` : `${selectedCategory} Directory`}
                  </Text>
                  <Text style={styles.webPageSubtitle}>
                    Verified doctors, branded medicines, diagnostic pathology tests, MRI/CT scans & nursing services
                  </Text>
                </View>
                <View style={styles.webResultCountBadge}>
                  <Text style={styles.webResultCountText}>{desktopWebResults.length} Services Available</Text>
                </View>
              </View>
            </View>

            {/* CATEGORY FILTER PILLS */}
            <View style={styles.categoryPillsContainerWeb}>
              <View style={styles.categoryPillsRowWeb}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* DESKTOP 2-COLUMN GRID OF RESULTS */}
            {desktopWebResults.length > 0 ? (
              <View style={styles.webGrid}>
                {desktopWebResults.map((item) => (
                  <View key={item.id} style={styles.webCardWrapper}>
                    {renderWebItem({ item })}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="search-outline" size={40} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No matching services found</Text>
                <Text style={styles.emptyText}>
                  Try searching for doctors, medicines (Dolo, Paracetamol), 3T MRI, CT scans, blood tests, or home nursing.
                </Text>
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => {
                    setQuery('');
                    setSelectedCategory('All');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyResetBtnText}>View All Services</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* DESKTOP WEB FOOTER */}
          <WebFooter navigation={navigation} />
        </ScrollView>
      ) : (
        /* ============================================================
            MOBILE & TABLET VIEW
        ============================================================ */
        <ScrollView
          style={styles.mobileScroll}
          contentContainerStyle={styles.mobileScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {isSearching && (
            <View style={styles.searchLoadingRow}>
              <ActivityIndicator size="small" color="#007D69" />
              <Text style={styles.searchLoadingText}>Searching services in {currentCity}...</Text>
            </View>
          )}

          {/* 1. SMART EMPTY SEARCH STATE */}
          {!query.trim() && (
            <View style={styles.emptySearchWrapper}>
              <View style={styles.emptySearchPromptCard}>
                <View style={styles.emptySearchIconCircle}>
                  <Ionicons name="search-outline" size={26} color="#007D69" />
                </View>
                <Text style={styles.emptySearchPromptTitle}>
                  Search for doctors, tests, medicines or services
                </Text>
                <Text style={styles.emptySearchPromptSubtitle}>
                  Showing providers and items available in {currentCity}
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
                      onPress={() => {
                        setQuery(chip);
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
          {query.trim() && !isSearching && mobileSearchResults.length === 0 && (
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
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.clearSearchPromptText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. MATCHING SEARCH RESULTS */}
          {query.trim() && mobileSearchResults.length > 0 && (
            <View style={styles.resultsListBlock}>
              {/* Category Filter Chips (Only show categories that actually have matching results) */}
              {matchingCategories.length > 2 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChipsScroll}
                >
                  {matchingCategories.map((catItem) => {
                    const isSelected = selectedCategory === catItem.name;
                    return (
                      <TouchableOpacity
                        key={catItem.name}
                        style={[
                          styles.categoryFilterChip,
                          isSelected && styles.categoryFilterChipActive,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setSelectedCategory(catItem.name)}
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
                    onPress={async () => {
                      const shouldShow = await shouldShowGuestLeadPopup();
                      if (shouldShow) {
                        setPendingSearchQuery(item.name || query || 'Service');
                        setShowLeadModal(true);
                        return;
                      }
                      item.onPress();
                    }}
                    activeOpacity={0.7}
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

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Guest Lead-Generation Popup */}
      <GuestLeadModal
        visible={showLeadModal}
        searchQuery={pendingSearchQuery}
        selectedCity={currentCity}
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

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // MOBILE SEARCH INPUT BAR
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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

  // MOBILE SCROLL & SEARCH RESULTS
  mobileScroll: {
    flex: 1,
  },
  mobileScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
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

  // SMART EMPTY STATE
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

  // NO RESULTS CARD
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

  // RESULTS LIST & FILTER CHIPS
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

  // TOAST NOTIFICATION
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ============================================================
  // DESKTOP WEB STYLES
  // ============================================================
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  itemDescription: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  categoryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  categoryTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionPromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  webContainer: {
    backgroundColor: '#F1F2F4',
  },
  webScrollContent: {
    flexGrow: 1,
    backgroundColor: '#F1F2F4',
  },
  webInnerContainer: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
  webBreadcrumbHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  webTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  webPageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  webPageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  webResultCountBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.lightTeal,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  webResultCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.teal,
  },
  categoryPillsContainerWeb: {
    marginBottom: 18,
  },
  categoryPillsRowWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webCardWrapper: {
    flexBasis: '48.8%',
    flexGrow: 1,
    minWidth: 300,
  },
});

export default GlobalSearchScreen;