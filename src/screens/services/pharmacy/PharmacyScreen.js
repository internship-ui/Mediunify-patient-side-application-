import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import colors from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { useCart } from '../../../context/CartContext';
import pharmacyProducts from '../../../data/pharmacyProducts';
import {
  getPharmacyStoreForCity,
  getPharmacyCityConfig,
  normalizePharmacyCity,
} from '../../../data/pharmacyStores';
import { showAlert } from '../../../utils/alert';
import OptimizedImage from '../../../components/common/OptimizedImage';
import Pagination from '../../../components/common/Pagination';

const pharmaVitaminC = require('../../../../assets/pharmacy/pharma_vitamin_c.jpg');
const pharmaMultivitamin = require('../../../../assets/pharmacy/pharma_multivitamin.jpg');
const pharmaThermometer = require('../../../../assets/pharmacy/pharma_thermometer.jpg');

// ==================================================
// 1. HERO ADS SLIDES (Exact Web Standard)
// ==================================================
export const PHARMACY_HERO_SLIDES = [
  {
    id: 'pharma-slide-1',
    pillText: '60-MIN EXPRESS',
    pillBg: '#FFF5F0',
    pillColor: '#FF7F50',
    certText: 'Flat 20% OFF',
    certIcon: 'flash',
    title: 'Doorstep Medicines & Jan Aushadhi Store',
    priceText: 'Flat 20% OFF',
    priceSub: 'Use Code: MEDI20',
    priceColor: '#FF7F50',
    subTitle: '100% Genuine branded drugs & affordable Jan Aushadhi generic medicines delivered in 60 mins.',
    bullets: [
      'Superfast 60-min delivery to your doorstep across Mysuru',
      'Verified genuine medicines & trusted healthcare brands',
      'Temperature-controlled cold-chain transit for insulin & vaccines',
    ],
    ctaText: 'Order Medicines Now',
    ctaBg: '#00B894',
    bgColor: '#FFF5F0',
    borderColor: '#FED7AA',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=900',
    trustBadge: '100% Genuine Branded Drugs',
    actionType: 'scroll-to-products',
  },
  {
    id: 'pharma-slide-2',
    pillText: 'AYURVEDA & WELLNESS',
    pillBg: '#ECFDF5',
    pillColor: '#007D69',
    certText: '100% Herbal & Pure',
    certIcon: 'leaf',
    title: 'Ayurvedic & Herbal Wellness Care',
    priceText: 'Up to 25% OFF',
    priceSub: 'Natural Healing',
    priceColor: '#007D69',
    subTitle: 'Explore herbal supplements, immunity boosters, and pure natural Ayurvedic remedies.',
    bullets: [
      'Authentic certified herbal formulations',
      'Doctor recommended wellness remedies',
      'Natural immunity & vitality boosters',
    ],
    ctaText: 'Explore Wellness Now',
    ctaBg: '#007D69',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900',
    trustBadge: '100% Herbal & Authentic',
    actionType: 'scroll-to-products',
  },
  {
    id: 'pharma-slide-3',
    pillText: 'CHRONIC CARE',
    pillBg: '#EFF6FF',
    pillColor: '#1E3A8A',
    certText: 'Up to 35% OFF',
    certIcon: 'pulse',
    title: 'Diabetes, BP & Vital Healthcare Devices',
    priceText: 'Save up to 35%',
    priceSub: 'Certified Devices',
    priceColor: '#00C2CB',
    subTitle: 'Accu-Chek glucometers, Omron blood pressure monitors, digital thermometers & test strips with full warranty.',
    bullets: [
      'Clinical-grade precision certified by ISO & CE standards',
      'Instant slot delivery with doorstep demo & calibration',
      'Discounted combo strips & lancet refill packs',
    ],
    ctaText: 'Explore Health Devices',
    ctaBg: '#00B894',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=900',
    trustBadge: 'Certified Clinical Accuracy',
    actionType: 'filter-devices',
  },
];

// ==================================================
// 2. BROWSE HEALTH CONDITIONS (Exact Web Standard)
// ==================================================
export const BROWSE_HEALTH_CONDITIONS = [
  {
    id: 'skin-care',
    titlePrimary: 'SKIN',
    titleSecondary: 'CARE',
    badge: 'DERMA APPROVED',
    tagline: 'Glow, Acne & Hydration',
    bg: '#00C2CB',
    accentColor: '#00C2CB',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['skin', 'derma', 'acne', 'glow', 'face', 'cream', 'lotion', 'sunscreen', 'cleanse', 'serum', 'facewash'],
    categoryFilter: 'Skin Care',
  },
  {
    id: 'diabetes-care',
    titlePrimary: 'DIABETES',
    titleSecondary: 'CARE',
    badge: 'GLYCO MONITOR',
    tagline: 'Sugar Test & Strips',
    bg: '#00B894',
    accentColor: '#00B894',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['diabetes', 'sugar', 'glucose', 'glucometer', 'strips', 'accu', 'insulin', 'glyco', 'onetouch', 'lancet', 'sugar free'],
    categoryFilter: 'Diabetes Care',
  },
  {
    id: 'cardiac-care',
    titlePrimary: 'CARDIAC',
    titleSecondary: 'HEALTH',
    badge: 'HEART VITAL',
    tagline: 'BP, Omega & Cholesterol',
    bg: '#1E3A8A',
    accentColor: '#1E3A8A',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['cardiac', 'heart', 'bp', 'pressure', 'cholesterol', 'omega', 'fish oil', 'artery', 'cardio', 'circulation'],
    categoryFilter: 'Heart Care',
  },
  {
    id: 'pain-relief',
    titlePrimary: 'PAIN',
    titleSecondary: 'RELIEF',
    badge: 'FAST ACTING',
    tagline: 'Joint, Muscle & Sprain',
    bg: '#FF7F50',
    accentColor: '#FF7F50',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['pain', 'volini', 'spray', 'dolo', 'paracetamol', 'sprain', 'ache', 'joint', 'moov', 'relief', 'balm', 'gel', 'fast'],
    categoryFilter: 'Pain Relief',
  },
  {
    id: 'stomach-care',
    titlePrimary: 'STOMACH &',
    titleSecondary: 'DIGESTION',
    badge: 'GUT HEALTH',
    tagline: 'Acidity, Gas & Probiotics',
    bg: '#7BC96F',
    accentColor: '#7BC96F',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['stomach', 'gut', 'acidity', 'gas', 'eno', 'gelusil', 'digene', 'probiotic', 'pantry', 'constipation', 'digestion', 'antacid'],
    categoryFilter: 'Stomach Care',
  },
  {
    id: 'respiratory-care',
    titlePrimary: 'RESPIRATORY',
    titleSecondary: 'CARE',
    badge: 'EASY BREATHE',
    tagline: 'Inhalers, Cough & Cold',
    bg: '#0284C7',
    accentColor: '#0284C7',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['respiratory', 'breathe', 'inhaler', 'cough', 'cold', 'syrup', 'vicks', 'steam', 'broncho', 'asthma', 'lozenge', 'vapor'],
    categoryFilter: 'Cold & Fever',
  },
  {
    id: 'sexual-wellness',
    titlePrimary: 'SEXUAL',
    titleSecondary: 'WELLNESS',
    badge: '100% DISCREET',
    tagline: 'Safe, Vigor & Stamina',
    bg: '#D97706',
    accentColor: '#D97706',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['wellness', 'condom', 'test', 'fertility', 'care', 'stamina', 'energy', 'supplement', 'vigor', 'multivitamin', 'shilajit'],
    categoryFilter: 'Sexual Wellness',
  },
  {
    id: 'weight-management',
    titlePrimary: 'WEIGHT',
    titleSecondary: 'CARE',
    badge: 'ACTIVE DIET',
    tagline: 'Slim, Detox & Green Tea',
    bg: '#059669',
    accentColor: '#059669',
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=600&auto=format&fit=crop&q=80',
    filterKeywords: ['weight', 'slim', 'apple', 'green tea', 'fiber', 'detox', 'burn', 'protein', 'nutrition', 'diet', 'slimming'],
    categoryFilter: 'Weight Care',
  },
];

// ==================================================
// 3. BROWSE CATEGORIES (Exact Web Standard)
// ==================================================
export const BROWSE_CATEGORIES = [
  {
    id: 'baby-care',
    titlePrimary: 'BABY',
    titleSecondary: 'CARE',
    badge: 'PEDIATRIC SAFE',
    tagline: 'Diapers, Gentle Wash & Lotion',
    bg: '#1E3A8A',
    accentColor: '#1E3A8A',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'Baby Care',
  },
  {
    id: 'fitness-wellness',
    titlePrimary: 'FITNESS &',
    titleSecondary: 'WELLNESS',
    badge: 'POWER & IMMUNITY',
    tagline: 'Proteins, BCAA & Creatine',
    bg: '#FF7F50',
    accentColor: '#FF7F50',
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'Vitamins & Minerals',
  },
  {
    id: 'alternate-medicines',
    titlePrimary: 'AYURVEDA &',
    titleSecondary: 'HERBALS',
    badge: '100% HERBAL',
    tagline: 'Ashwagandha, Giloy & Extracts',
    bg: '#7BC96F',
    accentColor: '#7BC96F',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'Ayurvedic',
  },
  {
    id: 'family-care',
    titlePrimary: 'DAILY',
    titleSecondary: 'ESSENTIALS',
    badge: 'FAMILY SAFETY',
    tagline: 'Bandages, Dettol & First Aid',
    bg: '#00B894',
    accentColor: '#00B894',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'all',
  },
  {
    id: 'vitamins-minerals',
    titlePrimary: 'VITAMINS &',
    titleSecondary: 'MINERALS',
    badge: 'NUTRITION BOOST',
    tagline: 'Vitamin C, D3, Zinc & Calcium',
    bg: '#00C2CB',
    accentColor: '#00C2CB',
    image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'Vitamins & Minerals',
  },
  {
    id: 'health-devices',
    titlePrimary: 'MEDICAL',
    titleSecondary: 'DEVICES',
    badge: 'CLINICAL GRADE',
    tagline: 'BP Monitors, Oximeter & Scanners',
    bg: '#475569',
    accentColor: '#475569',
    image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'Healthcare Devices',
  },
  {
    id: 'personal-hygiene',
    titlePrimary: 'PERSONAL',
    titleSecondary: 'HYGIENE',
    badge: 'GERM PROTECTION',
    tagline: 'Hand Sanitizer, Wash & Oral Care',
    bg: '#0F766E',
    accentColor: '#0F766E',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'Personal Care',
  },
  {
    id: 'senior-care',
    titlePrimary: 'SENIOR &',
    titleSecondary: 'ORTHO CARE',
    badge: 'MOBILITY SUPPORT',
    tagline: 'Knee Sleeves, Belts & Joint Care',
    bg: '#1E3A8A',
    accentColor: '#1E3A8A',
    image: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=600&auto=format&fit=crop&q=80',
    categoryFilter: 'Pain Relief',
  },
];

// ==================================================
// 4. FEATURED ACTION CARDS (Exact Web Standard)
// ==================================================
export const ACTION_CARDS = [
  {
    id: 'discount-upload',
    title: 'Order Genuine\nMedicines',
    ctaText: 'Flat 20% OFF',
    iconName: 'medkit-outline',
    iconType: 'ionicons',
    bgColor: '#FFF5F0',
    borderColor: '#FED7AA',
    iconBg: '#FFEBE5',
    iconColor: '#FF7F50',
    ctaColor: '#FF7F50',
    actionType: 'scroll-to-products',
  },
  {
    id: 'doctor-appointment',
    title: 'Consult Doctor\nOnline',
    ctaText: 'Book Video Slot',
    iconName: 'videocam-outline',
    iconType: 'ionicons',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    iconBg: '#DBEAFE',
    iconColor: '#1E3A8A',
    ctaColor: '#1E3A8A',
    actionType: 'navigate',
    route: 'VideoConsultation',
  },
  {
    id: 'lab-tests',
    title: 'Diagnostic\nLab Tests',
    ctaText: 'Book Checkup',
    iconName: 'flask-outline',
    iconType: 'ionicons',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    iconBg: '#D1FAE5',
    iconColor: '#00B894',
    ctaColor: '#00B894',
    actionType: 'navigate',
    route: 'LabTests',
  },
  {
    id: 'health-insurance',
    title: 'Health Insurance\n& Mediclaim',
    ctaText: '100% Cashless',
    iconName: 'shield-checkmark-outline',
    iconType: 'ionicons',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    iconBg: '#DCFCE7',
    iconColor: '#059669',
    ctaColor: '#059669',
    badge: 'New',
    actionType: 'navigate',
    route: 'HealthInsurance',
  },
];

// ==================================================
// 5. HIGH-RESOLUTION PRODUCT IMAGES DICTIONARY
// ==================================================
export const PRODUCT_IMAGES = {
  '1': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500',
  '2': pharmaVitaminC,
  '3': pharmaMultivitamin,
  '4': pharmaThermometer,
  '5': 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=500',
  '6': 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400',
  '7': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400',
  '8': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400',
  '9': 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=400',
  '10': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400',
  '11': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
  '12': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400',
  '13': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
  '14': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
  '15': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400',
  '16': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400',
  'ext-1': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
  'ext-2': 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400',
  'ext-3': 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=400',
  'ext-4': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400',
  'ext-5': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
};

export const getProductImage = (prod) => {
  if (!prod) return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400';
  if (prod.image) return prod.image;
  if (PRODUCT_IMAGES[prod.id]) return PRODUCT_IMAGES[prod.id];
  if (prod.category === 'Healthcare Devices') return 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400';
  if (prod.category === 'Baby Care') return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400';
  if (prod.category === 'Skin Care') return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400';
  if (prod.category === 'Ayurvedic') return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400';
  if (prod.category === 'First Aid') return 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400';
  if (prod.category === 'Pain Relief') return 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=400';
  return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400';
};

// ==================================================
// 6. EXTENDED PRODUCTS LIST (Exact Web Standard)
// ==================================================
export const EXTENDED_PRODUCTS = [
  ...pharmacyProducts,
  {
    id: 'ext-1',
    name: 'Gelusil MPS Antacid Liquid (Mint 200ml)',
    brand: 'Pfizer India',
    category: 'Stomach Care',
    price: 110,
    mrp: 140,
    oldPrice: 140,
    discount: '21% OFF',
    rating: 4.8,
    reviewsCount: 1650,
    requiresPrescription: false,
    inStock: true,
    packSize: 'Bottle of 200ml',
    activeIngredients: 'Aluminium Hydroxide, Magnesium Hydroxide, Dimethicone',
    uses: 'Acidity, heartburn, gas and stomach discomfort',
    dosage: '1-2 teaspoons after meals and at bedtime.',
    description: 'Fast and soothing relief from acidity, heartburn, and gas discomfort with sugar-free mint flavour.',
  },
  {
    id: 'ext-2',
    name: 'Sensodyne Rapid Relief Toothpaste 80g',
    brand: 'GSK Consumer',
    category: 'Oral Care',
    price: 195,
    mrp: 230,
    oldPrice: 230,
    discount: '15% OFF',
    rating: 4.9,
    reviewsCount: 3200,
    requiresPrescription: false,
    inStock: true,
    packSize: '80g Tube',
    activeIngredients: 'Stannous Fluoride 0.454% w/w',
    uses: 'Fast relief from tooth sensitivity within 60 seconds',
    dosage: 'Brush twice daily, not more than three times.',
    description: 'Clinically proven fast relief and long-lasting protection against tooth sensitivity.',
  },
  {
    id: 'ext-3',
    name: 'Moov Fast Pain Relief Ointment 50g',
    brand: 'Reckitt Benckiser',
    category: 'Pain Relief',
    price: 145,
    mrp: 175,
    oldPrice: 175,
    discount: '17% OFF',
    rating: 4.7,
    reviewsCount: 2100,
    requiresPrescription: false,
    inStock: true,
    packSize: '50g Tube',
    activeIngredients: 'Oil of Wintergreen, Pudinah Ka Phool, Nilgiri Tel, Tarpin Ka Tel',
    uses: 'Back pain, joint aches, muscle spasms and stiff neck',
    dosage: 'Apply gently on affected areas 3-4 times a day.',
    description: '100% Ayurvedic fast pain relief formula with 4 active herbal ingredients that penetrate deep to relieve pain quickly.',
  },
  {
    id: 'ext-4',
    name: 'Accu-Chek Active 50 Test Strips',
    brand: 'Roche Diagnostics',
    category: 'Healthcare Devices',
    price: 849,
    mrp: 1050,
    oldPrice: 1050,
    discount: '19% OFF',
    rating: 4.8,
    reviewsCount: 4500,
    requiresPrescription: false,
    inStock: true,
    packSize: 'Pack of 50 Test Strips',
    activeIngredients: 'Glucose dehydrogenase (mut. Q-GDH 2)',
    uses: 'Quantitative blood glucose measurement with Accu-Chek meter',
    dosage: 'Use with Accu-Chek Active meter as per manual.',
    description: 'Accurate and simple blood glucose testing strips for diabetes management.',
  },
  {
    id: 'ext-5',
    name: 'Vicks VapoRub Balm 50ml (Relief from Cold)',
    brand: 'Procter & Gamble',
    category: 'Medicines',
    price: 135,
    mrp: 160,
    oldPrice: 160,
    discount: '16% OFF',
    rating: 4.9,
    reviewsCount: 5200,
    requiresPrescription: false,
    inStock: true,
    packSize: '50ml Jar',
    activeIngredients: 'Menthol, Camphor, Eucalyptus Oil',
    uses: 'Cough, cold, blocked nose, breathing difficulty and body aches',
    dosage: 'Rub gently on chest, neck, and back or use in steam inhalation.',
    description: 'Provides quick relief from 6 cough and cold symptoms to help you and your family sleep peacefully.',
  },
];

const PharmacyScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargeTablet = width >= 960;

  const {
    pharmacyCart,
    pharmacyCartCount,
    pharmacyFinalTotal,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    selectedAddress,
    updateAddress,
  } = useCart();
  const { isDarkMode, theme } = useTheme();

  const safeBottom = Math.max(insets.bottom, 0);
  // Position cart bar above iOS home indicator, Android navigation bar, or browser controls
  const cartBarBottom = Math.max(safeBottom + 10, 14);
  const CART_BAR_HEIGHT = 64;
  // Ensure the product grid, buttons, and pagination can scroll completely clear of the cart bar
  const scrollBottomPadding = pharmacyCartCount > 0
    ? CART_BAR_HEIGHT + cartBarBottom + 72
    : Math.max(safeBottom, 16) + 24;

  const maxCartWidth = isTablet ? 600 : 520;
  const cartWidth = Math.min(width - 32, maxCartWidth);
  const cartLeft = Math.max((width - cartWidth) / 2, 16);

  // Active Hero Slide Index
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Auto-scroll hero ads every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % PHARMACY_HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState(route?.params?.query || route?.params?.search || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Home Screen Location (Single Source of Truth)
  const [currentCity, setCurrentCity] = useState('Mysuru');

  const loadHomeLocation = useCallback(async () => {
    try {
      const saved =
        (await AsyncStorage.getItem('@mediunify_selected_city')) ||
        (await AsyncStorage.getItem('@unnathi_user_location'));
      if (saved) {
        setCurrentCity(normalizePharmacyCity(saved));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadHomeLocation();
    const unsub = navigation?.addListener ? navigation.addListener('focus', loadHomeLocation) : null;
    return () => {
      if (unsub) unsub();
    };
  }, [navigation, loadHomeLocation]);

  const cityConfig = useMemo(() => getPharmacyCityConfig(currentCity), [currentCity]);

  // Handle Route Params
  useEffect(() => {
    if (route?.params?.query !== undefined) {
      setSearchQuery(route.params.query);
    } else if (route?.params?.search !== undefined) {
      setSearchQuery(route.params.search);
    }
  }, [route?.params?.query, route?.params?.search]);

  // Scroll ref & auto-scroll to products
  const mainScrollRef = useRef(null);
  const conditionScrollRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const [conditionScrollX, setConditionScrollX] = useState(0);
  const [categoryScrollX, setCategoryScrollX] = useState(0);
  const [catalogY, setCatalogY] = useState(0);

  const scrollToProducts = () => {
    setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({
          y: Math.max(0, catalogY - 20),
          animated: true,
        });
      }
    }, 80);
  };

  const handleScrollCondition = (direction) => {
    const delta = direction === 'next' ? 280 : -280;
    const target = Math.max(0, conditionScrollX + delta);
    setConditionScrollX(target);
    conditionScrollRef.current?.scrollTo({ x: target, animated: true });
  };

  const handleScrollCategory = (direction) => {
    const delta = direction === 'next' ? 280 : -280;
    const target = Math.max(0, categoryScrollX + delta);
    setCategoryScrollX(target);
    categoryScrollRef.current?.scrollTo({ x: target, animated: true });
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = EXTENDED_PRODUCTS;

    // Filter by condition if selected
    if (selectedCondition) {
      const condObj = BROWSE_HEALTH_CONDITIONS.find((c) => c.id === selectedCondition);
      if (condObj) {
        list = list.filter((p) => {
          const text = `${p.name} ${p.brand} ${p.category} ${p.uses || ''} ${p.description || ''}`.toLowerCase();
          return condObj.filterKeywords.some((k) => text.includes(k));
        });
      }
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter((p) => {
        if (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
          return true;
        }
        if (selectedCategory === 'Pain Relief' && (p.category === 'Pain Relief' || (p.uses && p.uses.toLowerCase().includes('pain')))) {
          return true;
        }
        return false;
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.uses && p.uses.toLowerCase().includes(q))
      );
    }

    return list;
  }, [searchQuery, selectedCategory, selectedCondition]);

  // ==========================================
  // PAGINATION: 15 ITEMS PER PAGE (Exact Web Standard)
  // ==========================================
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedCondition]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Handle Document & Image Picker for Prescription
  const handlePickDocument = async (type = 'any') => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Needed', 'Camera permission is required.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (!res.canceled && res.assets?.[0]) {
          setSelectedFile({
            name: res.assets[0].fileName || `Prescription_Photo_${Date.now()}.jpg`,
            uri: res.assets[0].uri,
            type: 'image',
          });
        }
        return;
      }

      if (type === 'image') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Needed', 'Gallery access is required.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (!res.canceled && res.assets?.[0]) {
          setSelectedFile({
            name: res.assets[0].fileName || `Prescription_${Date.now()}.jpg`,
            uri: res.assets[0].uri,
            type: 'image',
          });
        }
        return;
      }

      // Document / PDF
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        const f = res.assets[0];
        setSelectedFile({
          name: f.name,
          uri: f.uri,
          type: f.mimeType?.includes('pdf') || f.name?.endsWith('.pdf') ? 'pdf' : 'image',
        });
      }
    } catch (err) {
      console.log('Error picking upload:', err);
    }
  };

  const handleConfirmUpload = () => {
    if (!selectedFile) {
      showAlert('Prescription Required', 'Please attach an image or PDF of your prescription.');
      return;
    }
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setShowUploadModal(false);
      showAlert(
        'Prescription Received',
        `Your prescription "${selectedFile.name}" has been uploaded successfully. A verified pharmacist will confirm your medicine order shortly.`
      );
      setSelectedFile(null);
    }, 1000);
  };

  const handleHeroCta = (slide) => {
    if (slide.actionType === 'upload') {
      setShowUploadModal(true);
    } else if (slide.actionType === 'filter-devices') {
      setSelectedCategory('Healthcare Devices');
      setSelectedCondition(null);
      scrollToProducts();
    } else {
      setSelectedCategory('all');
      setSelectedCondition(null);
      scrollToProducts();
    }
  };

  const heroSlides = useMemo(() => {
    return PHARMACY_HERO_SLIDES.map((slide) => {
      if (slide.id === 'pharma-slide-1') {
        return {
          ...slide,
          bullets: [
            cityConfig.bulletDelivery || `Superfast express delivery to your doorstep across ${currentCity}`,
            slide.bullets[1],
            slide.bullets[2],
          ],
        };
      }
      return slide;
    });
  }, [currentCity, cityConfig]);

  const activeSlide = heroSlides[activeSlideIndex] || PHARMACY_HERO_SLIDES[0];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, isDarkMode && { backgroundColor: theme.background }]}>
      {/* MOBILE / TABLET HEADER */}
      <View style={[styles.header, isDarkMode && { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#1E3A8A"} />
        </TouchableOpacity>

        <View style={[styles.headerLocalityBtn, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.headerLocalityIconWrap}>
            <Ionicons name="location" size={14} color="#00B894" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerDeliverTo, isDarkMode && { color: theme.textSecondary }]}>Deliver to</Text>
            <Text style={[styles.headerLocalityName, isDarkMode && { color: theme.text }]} numberOfLines={1}>
              {currentCity}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerOrdersBtn}
          onPress={() => navigation?.navigate('MyMedicineOrders')}
          activeOpacity={0.8}
          accessibilityLabel="My Pharmacy Orders"
        >
          <Ionicons name="receipt-outline" size={20} color={isDarkMode ? theme.text : "#1E3A8A"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCartBtn}
          onPress={() => navigation?.navigate('Cart', { initialTab: 'pharmacy' })}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={22} color={isDarkMode ? theme.text : "#1E3A8A"} />
          {pharmacyCartCount > 0 && (
            <View style={styles.headerCartBadge}>
              <Text style={styles.headerCartBadgeText}>
                {pharmacyCartCount > 99 ? '99+' : pharmacyCartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.tabletContainerWidth,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            1. HERO SHOWCASE CAROUSEL BANNER (Exact Web Standard)
        ============================================================ */}
        <View style={styles.heroWrap}>
          <View
            style={[
              styles.heroBannerCard,
              isDarkMode
                ? { backgroundColor: '#1E293B', borderColor: '#334155' }
                : {
                    backgroundColor: activeSlide.bgColor,
                    borderColor: activeSlide.borderColor || '#FED7AA',
                  },
            ]}
          >
            {/* Left Chevron */}
            <TouchableOpacity
              style={[styles.carouselNavArrowLeft, isDarkMode && { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 }]}
              onPress={() =>
                setActiveSlideIndex(
                  (prev) => (prev - 1 + PHARMACY_HERO_SLIDES.length) % PHARMACY_HERO_SLIDES.length
                )
              }
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={18} color={isDarkMode ? '#F8FAFC' : '#1E3A8A'} />
            </TouchableOpacity>

            {/* Left Content */}
            <View style={styles.heroLeftCol}>
              <View style={styles.bannerBadgeRow}>
                <View style={[styles.brandPillYellow, { backgroundColor: activeSlide.pillBg }]}>
                  <Text style={[styles.brandPillYellowText, { color: activeSlide.pillColor }]}>
                    {activeSlide.pillText}
                  </Text>
                </View>
                <View style={[styles.brandTagFlipkart, isDarkMode && { backgroundColor: '#0F172A', borderColor: '#334155' }]}>
                  <Ionicons
                    name={activeSlide.certIcon || 'shield-checkmark'}
                    size={11}
                    color={activeSlide.priceColor || '#00B894'}
                  />
                  <Text style={[styles.brandTagFlipkartText, { color: activeSlide.priceColor || '#00B894' }]}>
                    {activeSlide.certText}
                  </Text>
                </View>
              </View>

              <Text style={[styles.heroTitle, isDarkMode && { color: theme.text }]}>{activeSlide.title}</Text>

              <View style={styles.heroPriceRow}>
                <Text style={[styles.heroPriceText, { color: activeSlide.priceColor }]}>
                  {activeSlide.priceText}
                </Text>
                {Boolean(activeSlide.priceSub) ? (
                  <Text style={[styles.heroPriceSubText, isDarkMode && { color: theme.textSecondary }]}>• {activeSlide.priceSub}</Text>
                ) : null}
              </View>

              <Text style={[styles.heroSubTitle, isDarkMode && { color: theme.textSecondary }]} numberOfLines={2}>
                {activeSlide.subTitle}
              </Text>

              {/* Feature Bullets (Shown on tablet) */}
              {isTablet && (
                <View style={styles.heroBulletsBox}>
                  {activeSlide.bullets.map((b, bIdx) => (
                    <View key={bIdx} style={styles.heroBulletItem}>
                      <Ionicons name="checkmark-circle" size={13} color={activeSlide.priceColor || '#00B894'} />
                      <Text style={[styles.heroBulletText, isDarkMode && { color: theme.textSecondary }]} numberOfLines={1}>
                        {b}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* CTA Button */}
              <View style={styles.heroCtaRow}>
                <TouchableOpacity
                  style={[styles.heroCtaBtn, { backgroundColor: activeSlide.ctaBg }]}
                  onPress={() => handleHeroCta(activeSlide)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.heroCtaText}>{activeSlide.ctaText}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Photo Column (Shown on tablet) */}
            {isTablet && (
              <View style={styles.heroRightCol}>
                <Image
                  source={{ uri: activeSlide.image }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                {Boolean(activeSlide.trustBadge) && (
                  <View style={styles.floatingTrustBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#00B894" />
                    <Text style={styles.floatingTrustBadgeText}>{activeSlide.trustBadge}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Right Chevron */}
            <TouchableOpacity
              style={[styles.carouselNavArrowRight, isDarkMode && { backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1 }]}
              onPress={() =>
                setActiveSlideIndex((prev) => (prev + 1) % PHARMACY_HERO_SLIDES.length)
              }
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#F8FAFC' : '#1E3A8A'} />
            </TouchableOpacity>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {PHARMACY_HERO_SLIDES.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveSlideIndex(idx)}
                style={[
                  styles.dot,
                  isDarkMode && { backgroundColor: '#334155' },
                  activeSlideIndex === idx && styles.dotActive,
                ]}
                activeOpacity={0.7}
              />
            ))}
          </View>
        </View>

        {/* ============================================================
            2. PROMINENT SEARCH BAR (Clean, Full-Width Design)
        ============================================================ */}
        <View style={styles.searchSectionWrap}>
          <View style={[styles.searchBarBox, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.searchIconBox}>
              <Ionicons name="search" size={18} color="#00B894" />
            </View>
            <TextInput
              style={[styles.searchInput, isDarkMode && { color: theme.text }]}
              placeholder="Search medicines, vitamins & wellness..."
              placeholderTextColor={isDarkMode ? theme.inputPlaceholder : "#64748B"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.searchClearBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={18} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ============================================================
            2.5 QUICK ACCESS: MY PHARMACY ORDERS
        ============================================================ */}
        <View style={styles.myOrdersBannerWrap}>
          <TouchableOpacity
            style={[styles.myOrdersBanner, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation?.navigate('MyMedicineOrders')}
            activeOpacity={0.85}
          >
            <View style={styles.myOrdersBannerLeft}>
              <View style={[styles.myOrdersIconBox, isDarkMode && { backgroundColor: '#134E4A' }]}>
                <Ionicons name="receipt-outline" size={18} color={isDarkMode ? '#2DD4BF' : '#008B94'} />
              </View>
              <View>
                <Text style={[styles.myOrdersBannerTitle, isDarkMode && { color: theme.text }]}>My Pharmacy Orders</Text>
                <Text style={[styles.myOrdersBannerSub, isDarkMode && { color: theme.textSecondary }]}>Track delivery & return items</Text>
              </View>
            </View>
            <View style={[styles.myOrdersBannerRight, isDarkMode && { backgroundColor: '#134E4A' }]}>
              <Text style={[styles.myOrdersBannerCta, isDarkMode && { color: '#2DD4BF' }]}>View Orders →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ============================================================
            3. 4 FEATURED ACTION CARDS (Below Hero)
        ============================================================ */}
        <View style={styles.actionCardsWrap}>
          <View style={styles.actionCardsGrid}>
            {ACTION_CARDS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.actionCard,
                  isDarkMode
                    ? { backgroundColor: theme.card, borderColor: theme.border }
                    : { backgroundColor: item.bgColor, borderColor: item.borderColor },
                  isTablet ? { width: '23.8%' } : { width: '48.2%' },
                ]}
                onPress={() => {
                  if (item.actionType === 'upload') {
                    setShowUploadModal(true);
                  } else if (item.route) {
                    navigation?.navigate(item.route);
                  }
                }}
                activeOpacity={0.88}
              >
                <View style={[styles.actionCardIconWrap, { backgroundColor: isDarkMode ? '#0F172A' : item.iconBg }]}>
                  <Ionicons name={item.iconName} size={18} color={item.iconColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.actionCardTitle, isDarkMode && { color: theme.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.actionCardCta, { color: item.ctaColor }]} numberOfLines={1}>
                    {item.ctaText} →
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ============================================================
            4. BROWSE MEDICINES & HEALTH PRODUCTS
        ============================================================ */}
        <View style={styles.browseSectionWrap}>
          <View style={styles.browseHeaderBadgeRow}>
            <Text style={[styles.browseMainHeading, isDarkMode && { color: theme.text }]}>Browse medicines & health products</Text>
            <View style={[styles.browseHeaderPill, isDarkMode && { backgroundColor: '#134E4A' }]}>
              <Ionicons name="sparkles" size={12} color="#00B894" />
              <Text style={[styles.browseHeaderPillText, isDarkMode && { color: '#2DD4BF' }]}>100% Genuine</Text>
            </View>
          </View>

          {/* SUBSECTION 1: HEALTH CONDITION */}
          <View style={styles.browseSubSection}>
            <View style={styles.subSectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.browseSubHeading, isDarkMode && { color: theme.text }]}>Health condition</Text>
                <Text style={[styles.subSectionCountText, isDarkMode && { color: theme.textSecondary }]}>
                  ({BROWSE_HEALTH_CONDITIONS.length} therapies)
                </Text>
              </View>
              {Boolean(selectedCondition) && (
                <TouchableOpacity
                  onPress={() => setSelectedCondition(null)}
                  style={styles.activeFilterChip}
                  activeOpacity={0.8}
                >
                  <Text style={styles.activeFilterChipText}>Clear Filter</Text>
                  <Ionicons name="close-circle" size={13} color="#FF7F50" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.browseCardsRow}>
              {isTablet && conditionScrollX > 0 && (
                <TouchableOpacity
                  style={styles.carouselPrevBtn}
                  onPress={() => handleScrollCondition('prev')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chevron-back" size={16} color="#1E293B" />
                </TouchableOpacity>
              )}

              <ScrollView
                ref={conditionScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.browseCardsScroll}
                onScroll={(e) => setConditionScrollX(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={16}
              >
                {BROWSE_HEALTH_CONDITIONS.map((item) => {
                  const isSelected = selectedCondition === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.browseBannerCard,
                        { backgroundColor: item.bg },
                        isSelected && styles.browseBannerCardActive,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedCondition(null);
                        } else {
                          setSelectedCategory('all');
                          setSelectedCondition(item.id);
                          setCurrentPage(1);
                          scrollToProducts();
                        }
                      }}
                      activeOpacity={0.88}
                    >
                      <View style={styles.cardBackdropGlow} />

                      {/* Top Micro Pill */}
                      <View style={styles.bannerMicroPill}>
                        <Text style={styles.bannerMicroPillText}>{item.badge}</Text>
                      </View>

                      {/* Text Column */}
                      <View style={styles.bannerTextCol}>
                        <Text style={styles.bannerTitlePrimary}>{item.titlePrimary}</Text>
                        <Text style={styles.bannerTitleSecondary}>{item.titleSecondary}</Text>
                        <Text style={styles.bannerTagline} numberOfLines={1}>
                          {item.tagline}
                        </Text>

                        <View style={[styles.bannerExploreChip, isSelected && styles.bannerExploreChipActive]}>
                          <Text style={styles.bannerExploreText}>
                            {isSelected ? 'Selected' : 'Explore'}
                          </Text>
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'arrow-forward'}
                            size={11}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>

                      {/* Right Circular Photo Showcase */}
                      <View style={styles.bannerImageContainer}>
                        <View style={styles.imageBackdropDisc}>
                          <Image
                            source={{ uri: item.image }}
                            style={styles.bannerCutoutImage}
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {isTablet && (
                <TouchableOpacity
                  style={styles.carouselNextBtn}
                  onPress={() => handleScrollCondition('next')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chevron-forward" size={16} color="#1E293B" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* SUBSECTION 2: CATEGORIES */}
          <View style={styles.browseSubSection}>
            <View style={styles.subSectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.browseSubHeading, isDarkMode && { color: theme.text }]}>Categories</Text>
                <Text style={[styles.subSectionCountText, isDarkMode && { color: theme.textSecondary }]}>
                  ({BROWSE_CATEGORIES.length} everyday)
                </Text>
              </View>
              {Boolean(selectedCategory !== 'all' && !selectedCondition) && (
                <TouchableOpacity
                  onPress={() => setSelectedCategory('all')}
                  style={styles.activeFilterChip}
                  activeOpacity={0.8}
                >
                  <Text style={styles.activeFilterChipText}>View All</Text>
                  <Ionicons name="close-circle" size={13} color="#FF7F50" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.browseCardsRow}>
              {isTablet && categoryScrollX > 0 && (
                <TouchableOpacity
                  style={styles.carouselPrevBtn}
                  onPress={() => handleScrollCategory('prev')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chevron-back" size={16} color="#1E293B" />
                </TouchableOpacity>
              )}

              <ScrollView
                ref={categoryScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.browseCardsScroll}
                onScroll={(e) => setCategoryScrollX(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={16}
              >
                {BROWSE_CATEGORIES.map((item) => {
                  const isSelected = selectedCategory === item.categoryFilter && !selectedCondition;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.browseBannerCard,
                        { backgroundColor: item.bg },
                        isSelected && styles.browseBannerCardActive,
                      ]}
                      onPress={() => {
                        setSelectedCondition(null);
                        setSelectedCategory(item.categoryFilter);
                        setCurrentPage(1);
                        scrollToProducts();
                      }}
                      activeOpacity={0.88}
                    >
                      <View style={styles.cardBackdropGlow} />

                      {/* Top Micro Pill */}
                      <View style={styles.bannerMicroPill}>
                        <Text style={styles.bannerMicroPillText}>{item.badge}</Text>
                      </View>

                      {/* Text Column */}
                      <View style={styles.bannerTextCol}>
                        <Text style={styles.bannerTitlePrimary}>{item.titlePrimary}</Text>
                        <Text style={styles.bannerTitleSecondary}>{item.titleSecondary}</Text>
                        <Text style={styles.bannerTagline} numberOfLines={1}>
                          {item.tagline}
                        </Text>

                        <View style={[styles.bannerExploreChip, isSelected && styles.bannerExploreChipActive]}>
                          <Text style={styles.bannerExploreText}>
                            {isSelected ? 'Selected' : 'Explore'}
                          </Text>
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'arrow-forward'}
                            size={11}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>

                      {/* Right Circular Photo Showcase */}
                      <View style={styles.bannerImageContainer}>
                        <View style={styles.imageBackdropDisc}>
                          <Image
                            source={{ uri: item.image }}
                            style={styles.bannerCutoutImage}
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {isTablet && (
                <TouchableOpacity
                  style={styles.carouselNextBtn}
                  onPress={() => handleScrollCategory('next')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chevron-forward" size={16} color="#1E293B" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ============================================================
            5. GUARANTEE / TRUST STRIP (Exact Web Standard)
        ============================================================ */}
        <View style={styles.guaranteeSectionWrap}>
          <View style={[styles.guaranteeCard, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.guaranteeItem}>
              <View style={[styles.guaranteeIconCircle, { backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#00B894" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.guaranteeTitle, isDarkMode && { color: theme.text }]}>100% Genuine Medicines</Text>
                <Text style={[styles.guaranteeSub, isDarkMode && { color: theme.textSecondary }]}>Directly sourced from verified manufacturers</Text>
              </View>
            </View>

            <View style={[styles.guaranteeDivider, isDarkMode && { backgroundColor: theme.border }]} />

            <View style={styles.guaranteeItem}>
              <View style={[styles.guaranteeIconCircle, { backgroundColor: isDarkMode ? '#431407' : '#FFF5F0' }]}>
                <Ionicons name="flash" size={18} color="#FF7F50" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.guaranteeTitle, isDarkMode && { color: theme.text }]}>60-Min Express Delivery</Text>
                <Text style={[styles.guaranteeSub, isDarkMode && { color: theme.textSecondary }]}>Guaranteed swift delivery in Mysuru</Text>
              </View>
            </View>

            <View style={[styles.guaranteeDivider, isDarkMode && { backgroundColor: theme.border }]} />

            <View style={styles.guaranteeItem}>
              <View style={[styles.guaranteeIconCircle, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF' }]}>
                <Ionicons name="medkit" size={18} color={isDarkMode ? '#38BDF8' : '#1E3A8A'} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.guaranteeTitle, isDarkMode && { color: theme.text }]}>Pharmacist Review 24/7</Text>
                <Text style={[styles.guaranteeSub, isDarkMode && { color: theme.textSecondary }]}>Free dosage & interaction verification</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            6. POPULAR PRODUCTS (Exact Web Standard with Pagination)
        ============================================================ */}
        <View
          style={styles.pharmacySectionWrap}
          onLayout={(event) => {
            const layout = event.nativeEvent.layout;
            if (layout && layout.y) {
              setCatalogY(layout.y);
            }
          }}
        >
          <View style={styles.sectionHeaderLine}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionHeadingTitle, isDarkMode && { color: theme.text }]}>
                {selectedCondition
                  ? `${BROWSE_HEALTH_CONDITIONS.find((c) => c.id === selectedCondition)?.titlePrimary || 'Selected'} Care Products`
                  : selectedCategory !== 'all'
                  ? `${selectedCategory} Products`
                  : searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : 'Popular Products'}
              </Text>
              <Text style={[styles.sectionSubHeading, isDarkMode && { color: theme.textSecondary }]}>
                Showing {filteredProducts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} items (15 per page)
              </Text>
            </View>

            {Boolean(selectedCategory !== 'all' || selectedCondition || searchQuery.trim()) && (
              <TouchableOpacity
                style={[styles.viewStoreBtn, isDarkMode && { backgroundColor: '#134E4A' }]}
                onPress={() => {
                  setSelectedCategory('all');
                  setSelectedCondition(null);
                  setSearchQuery('');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewStoreBtnText, isDarkMode && { color: '#2DD4BF' }]}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color={isDarkMode ? '#2DD4BF' : '#00B894'} />
              </TouchableOpacity>
            )}
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProductsState}>
              <Ionicons name="search-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No matching medicines found</Text>
              <Text style={styles.emptySub}>
                Try another search keyword or explore all categories.
              </Text>
              <TouchableOpacity
                style={styles.resetCatalogBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCondition(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.resetCatalogBtnText}>Show All Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Product Cards Grid */}
              <View style={styles.pharmacyCardsGrid}>
                {paginatedProducts.map((prod) => {
                  const cartItem = (pharmacyCart || []).find((ci) => ci.id === prod.id);
                  const quantity = cartItem?.quantity || 0;
                  const prodImg = getProductImage(prod);

                  return (
                    <View
                      key={prod.id}
                      style={[
                        styles.pharmacyCard,
                        isDarkMode && { backgroundColor: theme.card, borderColor: theme.border },
                        isLargeTablet
                          ? { width: '23.8%' }
                          : isTablet
                          ? { width: '31.8%' }
                          : width < 360
                          ? { width: '47.5%' }
                          : { width: '48.2%' },
                      ]}
                    >
                      {/* Discount Badge */}
                      <View style={[styles.pharmacyBadge, isDarkMode && { backgroundColor: '#431407', borderColor: '#7C2D12' }]}>
                        <Text style={[styles.pharmacyBadgeText, isDarkMode && { color: '#FDBA74' }]} numberOfLines={1}>
                          {prod.discount ? prod.discount.toUpperCase() : 'FLAT 20% OFF'}
                        </Text>
                      </View>

                      {/* Rx Badge */}
                      {Boolean(prod.requiresPrescription) && (
                        <View style={styles.pharmacyRxBadge}>
                          <Text style={styles.pharmacyRxBadgeText}>Rx</Text>
                        </View>
                      )}

                      {/* Image */}
                      <TouchableOpacity
                        onPress={() =>
                          navigation?.navigate('ProductDetails', { product: prod, productId: prod.id })
                        }
                        activeOpacity={0.9}
                        style={[styles.pharmacyCardImgWrap, isDarkMode && { backgroundColor: '#162032', borderRadius: 10 }]}
                      >
                        <OptimizedImage
                          source={typeof prodImg === 'number' ? prodImg : { uri: prodImg }}
                          style={[styles.pharmacyCardImg, isDarkMode && { mixBlendMode: 'normal' }]}
                          resizeMode="contain"
                          placeholderColor="transparent"
                          fallbackIcon="medkit-outline"
                          fallbackColor="#007D69"
                        />
                      </TouchableOpacity>

                      {/* Card Content */}
                      <View style={styles.pharmacyCardBody}>
                        <Text style={styles.pharmacyCat} numberOfLines={1}>
                          {prod.category || 'MEDICINES'}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            navigation?.navigate('ProductDetails', { product: prod, productId: prod.id })
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.pharmacyName, isDarkMode && { color: theme.text }]} numberOfLines={2}>
                            {prod.name}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.pharmacyBrand, isDarkMode && { color: theme.textSecondary }]} numberOfLines={1}>
                          {prod.brand} • {prod.packSize || '1 Unit'}
                        </Text>

                        {/* Rating */}
                        <View style={styles.pharmacyRatingRow}>
                          <View style={[styles.ratingTag, isDarkMode && { backgroundColor: '#431407' }]}>
                            <Ionicons name="star" size={10} color="#FF7F50" />
                            <Text style={styles.ratingTagText}>{prod.rating || 4.8}</Text>
                          </View>
                          <Text style={[styles.reviewsCountText, isDarkMode && { color: theme.textSecondary }]}>({prod.reviewsCount || 850}+)</Text>
                        </View>

                        {/* Price Row */}
                        <View style={styles.pharmacyPriceRow}>
                          <Text style={[styles.pharmacyPrice, isDarkMode && { color: '#38BDF8' }]}>₹{prod.price}</Text>
                          {Boolean(prod.mrp || prod.oldPrice) && (
                            <Text style={[styles.pharmacyMrp, isDarkMode && { color: '#64748B' }]} numberOfLines={1}>MRP ₹{prod.mrp || prod.oldPrice}</Text>
                          )}
                        </View>

                        {/* Add to Cart or Stepper */}
                        {quantity > 0 ? (
                          <View style={styles.quantityStepper}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => decreaseQuantity(prod.id, 'pharmacy')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="remove" size={13} color="#00B894" />
                            </TouchableOpacity>
                            <Text style={styles.stepperQuantity}>{quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => increaseQuantity(prod.id, 'pharmacy')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add" size={13} color="#00B894" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addToCartButton}
                            onPress={() => addToCart(prod, 1, 'pharmacy')}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="cart-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Pagination Controls Bar */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(pageNum) => {
                    setCurrentPage(pageNum);
                    scrollToProducts();
                  }}
                />
              )}
            </>
          )}

          {/* Reserved spacer so product cards never hide behind the floating cart bar */}
          {pharmacyCartCount > 0 && (
            <View style={{ height: CART_BAR_HEIGHT + cartBarBottom + 20 }} />
          )}
        </View>
      </ScrollView>

      {/* ============================================================
          7. FLOATING BOTTOM CART BAR (MOBILE / TABLET)
      ============================================================ */}
      {pharmacyCartCount > 0 && (
        <View
          style={[
            styles.floatingCartBar,
            {
              bottom: cartBarBottom,
              left: cartLeft,
              width: cartWidth,
            },
          ]}
        >
          <View style={styles.cartBarInfo}>
            <View style={styles.cartBarBadge}>
              <Text style={styles.cartBarBadgeText}>{pharmacyCartCount}</Text>
            </View>
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Text style={styles.cartBarItems} numberOfLines={1}>
                {pharmacyCartCount} {pharmacyCartCount === 1 ? 'item' : 'items'} in cart
              </Text>
              <Text style={styles.cartBarTotal} numberOfLines={1}>
                Total: ₹{pharmacyFinalTotal}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cartBarButton}
            onPress={() => navigation?.navigate('Cart', { initialTab: 'pharmacy' })}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="View Cart"
          >
            <Text style={styles.cartBarButtonText}>View Cart</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* ============================================================
          8. PRESCRIPTION UPLOAD MODAL (Exact Web Standard adapted for Native)
      ============================================================ */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isTablet && { maxWidth: 480 }]}>
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.modalTrustBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#00B894" />
                  <Text style={styles.modalTrustBadgeText}>LICENSED PHARMACISTS</Text>
                </View>
                <Text style={styles.modalTitle}>Upload Doctor's Prescription</Text>
                <Text style={styles.modalSub}>Verified medicines in 3 easy steps</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUploadModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {!selectedFile ? (
                <View style={styles.uploadOptionsBox}>
                  <View style={styles.uploadOptionsRow}>
                    <TouchableOpacity
                      style={styles.uploadOptionCard}
                      onPress={() => handlePickDocument('pdf')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="document-text" size={26} color="#DC2626" />
                      <Text style={styles.uploadOptionTitle}>Upload PDF</Text>
                      <Text style={styles.uploadOptionSub}>E-Prescription</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.uploadOptionCard}
                      onPress={() => handlePickDocument('image')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="image" size={26} color="#00B894" />
                      <Text style={styles.uploadOptionTitle}>Gallery Image</Text>
                      <Text style={styles.uploadOptionSub}>From Photos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.uploadOptionCard}
                      onPress={() => handlePickDocument('camera')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="camera" size={26} color="#1E3A8A" />
                      <Text style={styles.uploadOptionTitle}>Camera</Text>
                      <Text style={styles.uploadOptionSub}>Snap Rx Paper</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.uploadNotice}>
                    Supports PDF, JPG, PNG up to 15MB. Encrypted and reviewed only by licensed pharmacists.
                  </Text>
                </View>
              ) : (
                <View style={styles.attachedFileCard}>
                  <View style={styles.attachedFileIconWrap}>
                    {selectedFile.type === 'pdf' ? (
                      <Ionicons name="document-text" size={26} color="#DC2626" />
                    ) : (
                      <Image source={{ uri: selectedFile.uri }} style={styles.attachedThumb} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.attachedFileName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.attachedFileStatus}>Ready for Pharmacist Review</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Guidelines Box */}
              <View style={styles.rxGuidelinesBox}>
                <Text style={styles.guidelinesTitle}>Prescription Guidelines:</Text>
                <Text style={styles.guidelineItem}>• Patient name & doctor's stamp/signature clearly visible</Text>
                <Text style={styles.guidelineItem}>• Valid date within last 6 months</Text>
                <Text style={styles.guidelineItem}>• Do not crop or blur medication details</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowUploadModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isUploading && { opacity: 0.6 }]}
                onPress={handleConfirmUpload}
                activeOpacity={0.88}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm & Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLocalityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 10,
  },
  headerLocalityIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E6F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerDeliverTo: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  headerLocalityName: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '700',
  },
  headerCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF7F50',
    borderRadius: 10,
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
  scrollContent: {
    paddingBottom: 110,
  },
  tabletContainerWidth: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
  },

  // HERO CAROUSEL
  heroWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  heroBannerCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  carouselNavArrowLeft: {
    position: 'absolute',
    left: 6,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
  },
  carouselNavArrowRight: {
    position: 'absolute',
    right: 6,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
  },
  heroLeftCol: {
    flex: 1,
    paddingHorizontal: 18,
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  brandPillYellow: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandPillYellowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandTagFlipkart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  brandTagFlipkartText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3A8A',
    lineHeight: 24,
    marginBottom: 4,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroPriceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  heroPriceSubText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  heroSubTitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  heroBulletsBox: {
    marginBottom: 12,
    gap: 4,
  },
  heroBulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBulletText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  heroCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  heroSecondaryUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  heroSecondaryUploadText: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '700',
  },
  heroRightCol: {
    width: 180,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginLeft: 10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingTrustBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingTrustBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#00B894',
  },

  // SEARCH SECTION
  searchSectionWrap: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIconBox: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: '#1E293B',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  searchClearBtn: {
    padding: 4,
    marginRight: 6,
  },
  searchScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchScanBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00B894',
  },

  // ACTION TILES
  actionCardsWrap: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  actionCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 16,
  },
  actionCardCta: {
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 2,
  },

  // BROWSE SECTION
  browseSectionWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  browseHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  browseMainHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  browseHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  browseHeaderPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00B894',
  },
  browseSubSection: {
    marginBottom: 14,
  },
  subSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  browseSubHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  subSectionCountText: {
    fontSize: 11,
    color: '#64748B',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF7F50',
  },
  browseCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  carouselPrevBtn: {
    position: 'absolute',
    left: -8,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  carouselNextBtn: {
    position: 'absolute',
    right: -8,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  browseCardsScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  browseBannerCard: {
    width: 240,
    height: 125,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  browseBannerCardActive: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  cardBackdropGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bannerMicroPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannerMicroPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bannerTextCol: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 14,
  },
  bannerTitlePrimary: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  bannerTitleSecondary: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  bannerTagline: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.9)',
    marginVertical: 4,
  },
  bannerExploreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  bannerExploreChipActive: {
    backgroundColor: '#1E3A8A',
  },
  bannerExploreText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerImageContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBackdropDisc: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    padding: 3,
    elevation: 3,
  },
  bannerCutoutImage: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },

  // GUARANTEE STRIP
  guaranteeSectionWrap: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  guaranteeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guaranteeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  guaranteeSub: {
    fontSize: 10,
    color: '#64748B',
  },
  guaranteeDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // POPULAR PRODUCTS SECTION
  pharmacySectionWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeadingTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  sectionSubHeading: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  viewStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#E6F8F5',
  },
  viewStoreBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00B894',
  },

  // PRODUCTS GRID
  pharmacyCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pharmacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  pharmacyBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: '#FED7AA',
    zIndex: 5,
  },
  pharmacyBadgeText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  pharmacyRxBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  pharmacyRxBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pharmacyCardImgWrap: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  pharmacyCardImg: {
    width: '90%',
    height: '90%',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  pharmacyCardBody: {
    marginTop: 4,
  },
  pharmacyCat: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00B894',
    textTransform: 'uppercase',
  },
  pharmacyName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 16,
    minHeight: 32,
    marginTop: 2,
  },
  pharmacyBrand: {
    fontSize: 10,
    color: '#64748B',
    marginVertical: 2,
  },
  pharmacyRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 3,
  },
  ratingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF7F50',
  },
  reviewsCountText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  pharmacyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 4,
  },
  pharmacyPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  pharmacyMrp: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#00B894',
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 4,
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F8F5',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 4,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQuantity: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00B894',
  },

  // PAGINATION CONTROLS
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  pageNavBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageNumbersTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  pageNumberChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberChipActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // EMPTY STATE
  emptyProductsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  resetCatalogBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  resetCatalogBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // FLOATING CART BAR
  floatingCartBar: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 999,
  },
  cartBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  cartBarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cartBarBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  cartBarItems: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  cartBarTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  cartBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    flexShrink: 0,
  },
  cartBarButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    padding: 18,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  modalTrustBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00B894',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingVertical: 12,
  },
  uploadOptionsBox: {
    marginBottom: 8,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  uploadOptionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
  },
  uploadOptionSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  uploadNotice: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
  },
  attachedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  attachedFileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  attachedThumb: {
    width: '100%',
    height: '100%',
  },
  attachedFileName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  attachedFileStatus: {
    fontSize: 10,
    color: '#00B894',
    marginTop: 2,
  },
  rxGuidelinesBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  guidelinesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
  },
  guidelineItem: {
    fontSize: 10,
    color: '#0C4A6E',
    lineHeight: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#00B894',
    minWidth: 120,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // LOCALITY MODAL
  localitySelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  localitySelectItemActive: {
    backgroundColor: '#E6F8F5',
  },
  localitySelectIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  localitySelectIconWrapActive: {
    backgroundColor: '#FFFFFF',
  },
  localitySelectName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  localitySelectNameActive: {
    color: '#00B894',
    fontWeight: '900',
  },
  localitySelectCity: {
    fontSize: 10,
    color: '#94A3B8',
  },
  headerOrdersBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  myOrdersBannerWrap: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  myOrdersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  myOrdersBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myOrdersIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myOrdersBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  myOrdersBannerSub: {
    fontSize: 11.5,
    color: '#64748B',
  },
  myOrdersBannerRight: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  myOrdersBannerCta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
});

export default PharmacyScreen;