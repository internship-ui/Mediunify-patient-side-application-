import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../../../theme/colors';
import { useCart } from '../../../context/CartContext';
import pharmacyProducts from '../../../data/pharmacyProducts';
import {
  getPharmacyStoreForCity,
  getPharmacyCityConfig,
  normalizePharmacyCity,
} from '../../../data/pharmacyStores';
import WebFooter from '../../../components/web/WebFooter';
import WebBackButton from '../../../components/web/WebBackButton';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import OptimizedImage from '../../../components/common/OptimizedImage';
import Pagination from '../../../components/common/Pagination';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';

const pharmaVitaminC = require('../../../../assets/pharmacy/pharma_vitamin_c.jpg');
const pharmaMultivitamin = require('../../../../assets/pharmacy/pharma_multivitamin.jpg');
const pharmaThermometer = require('../../../../assets/pharmacy/pharma_thermometer.jpg');

// ==================================================
// 1. HERO ADS SLIDES (Exact HomeScreen.web.js Standard)
// ==================================================
const PHARMACY_HERO_SLIDES = [
  {
    id: 'pharma-slide-1',
    pillText: '60-MIN EXPRESS',
    pillBg: '#FFF5F0',
    pillColor: '#FF7F50',
    certText: 'Flat 20% OFF',
    certIcon: 'flash',
    title: 'Genuine Medicines & Jan Aushadhi',
    priceText: 'Flat 20% OFF',
    priceSub: 'Code: MEDI20',
    priceColor: '#FF7F50',
    subTitle: 'Branded and affordable generic medicines delivered in 60 minutes.',
    bullets: [
      'Express 60-min delivery to your doorstep',
      'Verified genuine medicines & trusted brands',
      'Cold-chain delivery for insulin & vaccines',
    ],
    ctaText: 'Order Medicines',
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
    subTitle: 'Explore herbal supplements, immunity boosters, and pure natural Ayurvedic care.',
    bullets: [
      'Authentic certified herbal formulations',
      'Doctor recommended wellness remedies',
      'Natural immunity & vitality boosters',
    ],
    ctaText: 'Explore Wellness',
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
    title: 'Diabetes, BP & Vital Health Devices',
    priceText: 'Save up to 35%',
    priceSub: 'Certified Devices',
    priceColor: '#00C2CB',
    subTitle: 'Glucometers, BP monitors, and test strips with warranty.',
    bullets: [
      'Clinical-grade precision ISO standards',
      'Fast doorstep delivery & setup guide',
      'Discounted combo strips & refill packs',
    ],
    ctaText: 'View Devices',
    ctaBg: '#00B894',
    bgColor: '#EEF2FF',
    borderColor: '#BFDBFE',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=900',
    trustBadge: 'Certified Clinical Accuracy',
    actionType: 'filter-devices',
  },
];

// ==================================================
// 2. BROWSE HEALTH CONDITIONS (MediUnify Brand Palette)
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
    bg: '#1E3A8A',
    accentColor: '#1E3A8A',
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
// 3. BROWSE CATEGORIES (8 Curated Everyday Care Categories)
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
// 3. 4 FEATURED ACTION CARDS (Below Hero)
// ==================================================
const ACTION_CARDS = [
  {
    id: 'discount-upload',
    title: 'Order Genuine\nMedicines',
    ctaText: 'FLAT 20% OFF',
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
    ctaText: 'BOOK VIDEO SLOT',
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
    title: 'Diagnostic Lab Tests\nat Home',
    ctaText: 'BOOK CHECKUP',
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
    ctaText: '100% CASHLESS',
    iconName: 'shield-checkmark-outline',
    iconType: 'ionicons',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    iconBg: '#DCFCE7',
    iconColor: '#7BC96F',
    ctaColor: '#7BC96F',
    badge: 'New',
    actionType: 'navigate',
    route: 'HealthInsurance',
  },
];

// ==================================================
// 4. BROWSE BY HEALTH CONDITIONS
// ==================================================
const HEALTH_CONDITIONS = [
  {
    id: 'diabetes',
    name: 'Diabetes Care',
    iconName: 'water-outline',
    iconType: 'ionicons',
    color: '#00C2CB',
    bg: '#E0F7FA',
    filterKeywords: ['glucose', 'sugar', 'diabet', 'accu-chek', 'metformin', 'strip'],
  },
  {
    id: 'cardiac',
    name: 'Cardiac Care',
    iconName: 'heart-pulse',
    iconType: 'mci',
    color: '#FF7F50',
    bg: '#FFF5F0',
    filterKeywords: ['bp', 'blood pressure', 'omron', 'cardiac', 'heart', 'cholesterol'],
  },
  {
    id: 'stomach',
    name: 'Stomach Care',
    iconName: 'stomach',
    iconType: 'mci',
    color: '#7BC96F',
    bg: '#F0FDF4',
    filterKeywords: ['antacid', 'digestion', 'stomach', 'pantocid', 'gelusil', 'gas', 'acid'],
  },
  {
    id: 'pain-relief',
    name: 'Pain Relief',
    iconName: 'human-handsdown',
    iconType: 'mci',
    color: '#1E3A8A',
    bg: '#EFF6FF',
    filterKeywords: ['pain', 'volini', 'spray', 'dolo', 'paracetamol', 'sprain', 'ache', 'joint', 'moov'],
  },
  {
    id: 'liver',
    name: 'Liver Care',
    iconName: 'pill',
    iconType: 'mci',
    color: '#00B894',
    bg: '#ECFDF5',
    filterKeywords: ['liv.52', 'liver', 'himalaya', 'detox', 'herbal', 'appetite'],
  },
  {
    id: 'oral',
    name: 'Oral Care',
    iconName: 'tooth-outline',
    iconType: 'mci',
    color: '#00C2CB',
    bg: '#E0F7FA',
    filterKeywords: ['tooth', 'oral', 'cleanser', 'mouth', 'dental', 'paste', 'gum', 'sensodyne'],
  },
  {
    id: 'respiratory',
    name: 'Respiratory',
    iconName: 'lungs',
    iconType: 'mci',
    color: '#1E3A8A',
    bg: '#EFF6FF',
    filterKeywords: ['antibiotic', 'respiratory', 'cough', 'cold', 'chest', 'augmentin', 'inhaler', 'vicks'],
  },
  {
    id: 'cold-immunity',
    name: 'Cold & Immunity',
    iconName: 'shield-check-outline',
    iconType: 'mci',
    color: '#7BC96F',
    bg: '#F0FDF4',
    filterKeywords: ['vitamin c', 'zinc', 'immunity', 'antiseptic', 'dettol', 'sanitizer', 'fever'],
  },
];

// ==================================================
// 5. HIGH-RESOLUTION PRODUCT IMAGES DICTIONARY
// ==================================================
export const PRODUCT_IMAGES = {
  '1': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500', // Dolo Paracetamol
  '2': pharmaVitaminC, // Vitamin C Limcee on pure white
  '3': pharmaMultivitamin, // Daily Multivitamin Becadexamin on pure white
  '4': pharmaThermometer, // Digital Thermometer on pure white
  '5': 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=500', // Dettol Antiseptic
  '6': 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400', // Hand Sanitizer
  '7': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400', // First Aid Kit
  '8': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400', // Augmentin Antibiotic
  '9': 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=400', // Volini Spray
  '10': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400', // Accu-Chek Monitor
  '11': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', // CeraVe Cleanser
  '12': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400', // Pampers Diapers
  '13': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400', // Himalaya Liv.52
  '14': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400', // Omron BP Monitor
  '15': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400', // Glucose Monitor
  '16': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400', // Glucose Monitor
  'ext-1': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400', // Gelusil Antacid
  'ext-2': 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400', // Sensodyne
  'ext-3': 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=400', // Moov Ointment
  'ext-4': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400', // Accu-Chek Strips
  'ext-5': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', // Vicks VapoRub
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
// 6. EXTENDED PRODUCTS LIST
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
    uses: 'Acidity, heartburn, gas and stomach discomfort',
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
    uses: 'Fast relief from tooth sensitivity within 60 seconds',
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
    uses: 'Back pain, joint aches, muscle spasms and stiff neck',
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
    uses: 'Quantitative blood glucose measurement with Accu-Chek meter',
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
    uses: 'Cough, cold, blocked nose, breathing difficulty and body aches',
  },
];



import PharmacyScreenMobile from './PharmacyScreen.js';

// Helper: Format category names to short, concise tags
const getShortCategory = (category) => {
  if (!category) return 'Medicines';
  const c = String(category).trim().toLowerCase();
  if (c.includes('vitamin') || c.includes('mineral')) return 'Vitamins';
  if (c.includes('device') || c.includes('monitor') || c.includes('thermometer') || c.includes('glucometer')) return 'Devices';
  if (c.includes('first aid')) return 'First Aid';
  if (c.includes('covid') || c.includes('sanitizer')) return 'Covid Care';
  if (c.includes('pain')) return 'Pain Relief';
  if (c.includes('stomach') || c.includes('antacid') || c.includes('digestion')) return 'Stomach';
  if (c.includes('skin') || c.includes('derma')) return 'Skin Care';
  if (c.includes('ayurved') || c.includes('herbal')) return 'Ayurveda';
  if (c.includes('baby')) return 'Baby Care';
  if (c.includes('oral') || c.includes('dental')) return 'Oral Care';
  if (c.includes('cardiac') || c.includes('heart')) return 'Cardiac';
  if (c.includes('diabet')) return 'Diabetes';
  return 'Medicines';
};

// Helper: Shorten ratings and review count to compact format: e.g. 4.8 (1.2k)
const formatReviewCount = (count) => {
  const num = Number(count) || 850;
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `(${formatted}k)`;
  }
  return `(${num})`;
};

// Helper: Format clean discount text
const formatDiscountText = (discount, mrp, price) => {
  if (discount && typeof discount === 'string' && discount.trim()) {
    const d = discount.trim().toUpperCase();
    if (d.includes('OFF')) return d;
    return `${d} OFF`;
  }
  if (mrp && price && Number(mrp) > Number(price)) {
    const pct = Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100);
    if (pct > 0) return `${pct}% OFF`;
  }
  return 'FLAT 20% OFF';
};

const PharmacyScreenWeb = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);

  // Responsive card width: 5 cols on desktop (>=1200), 4 on laptop (>=992), 3 on tablet (>=640), 2 on mobile
  const cardWidth = useMemo(() => {
    const horizontalPad = width < 768 ? 32 : 48;
    const containerWidth = Math.min(width - horizontalPad, 1320);
    if (width >= 1200) {
      return Math.floor((containerWidth - 56) / 5);
    }
    if (width >= 992) {
      return Math.floor((containerWidth - 42) / 4);
    }
    if (width >= 640) {
      return Math.floor((containerWidth - 24) / 3);
    }
    return Math.floor((containerWidth - 10) / 2);
  }, [width]);

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

  // Active Hero Slide Index
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  // Auto-scroll hero ads every 6 seconds (matching HomeScreen)
  useEffect(() => {
    if (isSlidePaused) return;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % PHARMACY_HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isSlidePaused]);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState(route?.params?.query || route?.params?.search || '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleStorage = (e) => {
        if (!e || e.key === '@mediunify_selected_city' || e.key === '@unnathi_user_location') {
          loadHomeLocation();
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => {
        if (unsub) unsub();
        window.removeEventListener('storage', handleStorage);
      };
    }

    return () => {
      if (unsub) unsub();
    };
  }, [navigation, loadHomeLocation]);

  const cityConfig = useMemo(() => getPharmacyCityConfig(currentCity), [currentCity]);

  // Scroll ref & auto-scroll to products
  const mainScrollRef = useRef(null);
  const conditionScrollRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const [conditionScrollX, setConditionScrollX] = useState(0);
  const [categoryScrollX, setCategoryScrollX] = useState(0);

  const handleScrollCondition = (direction) => {
    const delta = direction === 'next' ? 320 : -320;
    const target = Math.max(0, conditionScrollX + delta);
    setConditionScrollX(target);
    conditionScrollRef.current?.scrollTo({ x: target, animated: true });
  };

  const handleScrollCategory = (direction) => {
    const delta = direction === 'next' ? 320 : -320;
    const target = Math.max(0, categoryScrollX + delta);
    setCategoryScrollX(target);
    categoryScrollRef.current?.scrollTo({ x: target, animated: true });
  };

  const [catalogY, setCatalogY] = useState(0);

  const scrollToProducts = () => {
    setTimeout(() => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const el = document.getElementById('pharmacy-products-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({
          y: Math.max(0, catalogY - 20),
          animated: true,
        });
      }
    }, 80);
  };



  // Handle Route Params
  useEffect(() => {
    if (route?.params?.query !== undefined) {
      setSearchQuery(route.params.query);
    } else if (route?.params?.search !== undefined) {
      setSearchQuery(route.params.search);
    }
  }, [route?.params?.query, route?.params?.search]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = EXTENDED_PRODUCTS;

    // Filter by condition if selected
    if (selectedCondition) {
      const condObj =
        BROWSE_HEALTH_CONDITIONS.find((c) => c.id === selectedCondition) ||
        HEALTH_CONDITIONS.find((c) => c.id === selectedCondition);
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
  // PAGINATION: 15 ITEMS PER PAGE
  // ==========================================
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedCondition]);

  // Inject Premium Hover CSS for Product Cards & Buttons
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'pharmacy-premium-cards-css';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        .pharmacy-prod-card {
          transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.26s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease !important;
        }
        .pharmacy-prod-card:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 20px 36px -10px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.04) !important;
          border-color: #CBD5E1 !important;
        }
        .pharmacy-prod-card .pharmacy-card-img {
          transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .pharmacy-prod-card:hover .pharmacy-card-img {
          transform: scale(1.06) !important;
        }
        .pharmacy-add-btn {
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease !important;
        }
        .pharmacy-add-btn:hover {
          transform: translateY(-1.5px) !important;
          box-shadow: 0 6px 18px rgba(0, 184, 148, 0.42) !important;
          filter: brightness(1.05) !important;
        }
        .pharmacy-add-btn:active {
          transform: translateY(0px) scale(0.98) !important;
        }
      `;
    }
  }, []);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleConditionSelect = (conditionId) => {
    if (selectedCondition === conditionId) {
      setSelectedCondition(null);
    } else {
      setSelectedCondition(conditionId);
      setSelectedCategory('all');
      setCurrentPage(1);
      scrollToProducts();
    }
  };

  const handleTriggerUpload = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          setSelectedFile(file.name);
          setShowUploadModal(true);
        }
      };
      input.click();
    } else {
      setShowUploadModal(true);
    }
  };

  const handleConfirmUpload = () => {
    setShowUploadModal(false);
    setUploadSuccessToast(true);
    setTimeout(() => {
      setUploadSuccessToast(false);
    }, 4000);
  };

  const handleHeroCta = (slide) => {
    if (slide.actionType === 'upload') {
      handleTriggerUpload();
    } else if (slide.actionType === 'filter-devices') {
      setSelectedCategory('Healthcare Devices');
      setSelectedCondition(null);
    } else {
      setSelectedCategory('all');
      setSelectedCondition(null);
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
    <SafeAreaView style={styles.container}>
      {/* MOBILE TOP HEADER (SHOWN ON MOBILE WEBPAGE WIDTHS) */}
      {!isDesktop && (
        <View style={styles.mobileHeader}>
          <WebBackButton
            onPress={() => navigation?.goBack()}
          />

          <View style={styles.headerLocalityBtn}>
            <View style={styles.headerLocalityIconWrap}>
              <Ionicons name="location" size={14} color="#00B894" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerDeliverTo}>Deliver to</Text>
              <Text style={styles.headerLocalityName} numberOfLines={1}>
                {currentCity}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerCartBtn}
            onPress={() => navigation?.navigate('Cart', { initialTab: 'pharmacy' })}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={22} color="#1E3A8A" />
            {pharmacyCartCount > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>
                  {pharmacyCartCount > 99 ? '99+' : pharmacyCartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          !isDesktop && { paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            1. FULL-WIDTH HERO SHOWCASE BANNER (Exact HomeScreen Standard)
        ============================================================ */}
        <View
          style={styles.heroCarouselWrap}
          {...(Platform.OS === 'web'
            ? {
                onMouseEnter: () => setIsSlidePaused(true),
                onMouseLeave: () => setIsSlidePaused(false),
              }
            : {})}
        >
          <View style={styles.heroCarouselInner}>
            <View
              key={activeSlide.id}
              style={[
                styles.fullWidthBannerCard,
                {
                  backgroundColor: activeSlide.bgColor,
                  borderColor: activeSlide.borderColor || '#E2E8F0',
                },
              ]}
            >
              {/* Left Navigation Chevron Button */}
              <TouchableOpacity
                style={styles.carouselNavArrowLeft}
                onPress={() =>
                  setActiveSlideIndex((prev) => (prev - 1 + PHARMACY_HERO_SLIDES.length) % PHARMACY_HERO_SLIDES.length)
                }
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-back" size={20} color="#1E3A8A" />
              </TouchableOpacity>

              {/* Left Column: Offer Details, Bullets & CTAs */}
              <View style={styles.fullWidthLeftCol}>
                <View style={styles.bannerBadgeRow}>
                  <View style={[styles.brandPillYellow, { backgroundColor: activeSlide.pillBg }]}>
                    <Text style={[styles.brandPillYellowText, { color: activeSlide.pillColor }]}>
                      {activeSlide.pillText}
                    </Text>
                  </View>
                  <View style={styles.brandTagFlipkart}>
                    <Ionicons
                      name={activeSlide.certIcon || 'shield-checkmark'}
                      size={12}
                      color={activeSlide.priceColor || '#00B894'}
                    />
                    <Text style={[styles.brandTagFlipkartText, { color: activeSlide.priceColor || '#00B894' }]}>
                      {activeSlide.certText}
                    </Text>
                  </View>
                  <View style={styles.adNoticePill}>
                    <Text style={styles.adNoticePillText}>VERIFIED PHARMACY</Text>
                  </View>
                </View>

                <Text style={styles.fullWidthTitle}>{activeSlide.title}</Text>

                <View style={styles.fullWidthPriceRow}>
                  <Text style={[styles.fullWidthPriceText, { color: activeSlide.priceColor }]}>
                    {activeSlide.priceText}
                  </Text>
                  {Boolean(activeSlide.priceSub) ? (
                    <Text style={styles.fullWidthPriceSubText}>• {activeSlide.priceSub}</Text>
                  ) : null}
                </View>

                <Text style={styles.fullWidthSubTitle} numberOfLines={2}>
                  {activeSlide.subTitle}
                </Text>

                {/* Feature Bullets */}
                <View style={styles.fullWidthBulletsCol}>
                  {activeSlide.bullets.map((b, bIdx) => (
                    <View key={bIdx} style={styles.fullWidthBulletItem}>
                      <Ionicons name="checkmark-circle" size={15} color={activeSlide.priceColor || '#00B894'} />
                      <Text style={styles.fullWidthBulletText} numberOfLines={1}>
                        {b}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Dual CTA Buttons */}
                <View style={styles.fullWidthCtaRow}>
                  <TouchableOpacity
                    style={[styles.fullWidthCtaBtn, { backgroundColor: activeSlide.ctaBg }]}
                    onPress={() => handleHeroCta(activeSlide)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.fullWidthCtaText}>{activeSlide.ctaText}</Text>
                    <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right Column: High-Res Lifestyle Photo with Trust Badge */}
              <View style={styles.fullWidthRightCol}>
                <Image
                  source={{ uri: activeSlide.image }}
                  style={styles.fullWidthImage}
                  resizeMode="cover"
                />
                {Boolean(activeSlide.trustBadge) ? (
                  <View style={styles.floatingTrustBadge}>
                    <Ionicons name="shield-checkmark" size={13} color="#00B894" />
                    <Text style={styles.floatingTrustBadgeText}>{activeSlide.trustBadge}</Text>
                  </View>
                ) : null}
              </View>

              {/* Right Navigation Chevron Button */}
              <TouchableOpacity
                style={styles.carouselNavArrowRight}
                onPress={() => setActiveSlideIndex((prev) => (prev + 1) % PHARMACY_HERO_SLIDES.length)}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-forward" size={20} color="#1E3A8A" />
              </TouchableOpacity>
            </View>

            {/* Pagination Dots */}
            <View style={styles.dotsRow}>
              {PHARMACY_HERO_SLIDES.map((slide, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setActiveSlideIndex(idx)}
                  style={[styles.dot, activeSlideIndex === idx && styles.dotActive]}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ============================================================
            2. PROMINENT SEARCH BAR (High-Visibility Design)
        ============================================================ */}
        <View style={styles.searchSectionWrap}>
          <View style={styles.searchSectionInner}>
            <View style={styles.searchBarBox}>
              <View style={styles.searchIconBox}>
                <Ionicons name="search" size={20} color="#00B894" />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search medicines, vitamins, wellness products..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={20} color="#64748B" />
                </TouchableOpacity>
              ) : null}

              {/* Action Buttons inside Search Bar */}
              <View style={styles.searchBarActions}>
                <TouchableOpacity
                  style={styles.searchSubmitBtn}
                  onPress={() => {}}
                  activeOpacity={0.88}
                >
                  <Text style={styles.searchSubmitBtnText}>Search</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            3. BROWSE MEDICINES & HEALTH PRODUCTS (Creative Mockup Layout)
        ============================================================ */}
        <View style={styles.browseSectionWrap}>
          <View style={styles.browseSectionInner}>
            <View style={styles.browseHeaderBadgeRow}>
              <Text style={styles.browseMainHeading}>Browse by Need & Category</Text>
              <View style={styles.browseHeaderPill}>
                <Ionicons name="sparkles" size={13} color="#00B894" />
                <Text style={styles.browseHeaderPillText}>100% Genuine & Verified</Text>
              </View>
            </View>

            {/* SUBSECTION 1: HEALTH CONDITION */}
            <View style={styles.browseSubSection}>
              <View style={styles.subSectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.browseSubHeading}>Health Conditions</Text>
                  <Text style={styles.subSectionCountText}>{BROWSE_HEALTH_CONDITIONS.length} conditions</Text>
                </View>
                {Boolean(selectedCondition) ? (
                  <TouchableOpacity
                    onPress={() => setSelectedCondition(null)}
                    style={styles.activeFilterChip}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.activeFilterChipText}>Clear Filter</Text>
                    <Ionicons name="close-circle" size={14} color="#FF7F50" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.browseCardsRow}>
                {conditionScrollX > 0 ? (
                  <TouchableOpacity
                    style={styles.carouselPrevBtn}
                    onPress={() => handleScrollCondition('prev')}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="chevron-back" size={18} color="#1E293B" />
                  </TouchableOpacity>
                ) : null}

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
                        {/* Decorative Background Glow Disc */}
                        <View style={styles.cardBackdropGlow} />

                        {/* Top Micro Pill */}
                        <View style={styles.bannerMicroPill}>
                          <Text style={styles.bannerMicroPillText}>{item.badge}</Text>
                        </View>

                        {/* Left Column (Typography) */}
                        <View style={styles.bannerTextCol}>
                          <Text style={styles.bannerTitlePrimary}>{item.titlePrimary}</Text>
                          <Text style={styles.bannerTitleSecondary}>{item.titleSecondary}</Text>
                          <Text style={styles.bannerTagline} numberOfLines={1}>{item.tagline}</Text>

                          <View style={[styles.bannerExploreChip, isSelected && styles.bannerExploreChipActive]}>
                            <Text style={styles.bannerExploreText}>
                              {isSelected ? 'Selected' : 'Explore'}
                            </Text>
                            <Ionicons
                              name={isSelected ? 'checkmark-circle' : 'arrow-forward'}
                              size={12}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>

                        {/* Right Column (Elevated Circle Product Showcase) */}
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

                <TouchableOpacity
                  style={styles.carouselNextBtn}
                  onPress={() => handleScrollCondition('next')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chevron-forward" size={18} color="#1E293B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* SUBSECTION 2: CATEGORIES */}
            <View style={styles.browseSubSection}>
              <View style={styles.subSectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.browseSubHeading}>Popular Categories</Text>
                  <Text style={styles.subSectionCountText}>{BROWSE_CATEGORIES.length} categories</Text>
                </View>
                {Boolean(selectedCategory !== 'all' && !selectedCondition) ? (
                  <TouchableOpacity
                    onPress={() => setSelectedCategory('all')}
                    style={styles.activeFilterChip}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.activeFilterChipText}>View All</Text>
                    <Ionicons name="close-circle" size={14} color="#FF7F50" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.browseCardsRow}>
                {categoryScrollX > 0 ? (
                  <TouchableOpacity
                    style={styles.carouselPrevBtn}
                    onPress={() => handleScrollCategory('prev')}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="chevron-back" size={18} color="#1E293B" />
                  </TouchableOpacity>
                ) : null}

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
                        {/* Decorative Background Glow Disc */}
                        <View style={styles.cardBackdropGlow} />

                        {/* Top Micro Pill */}
                        <View style={styles.bannerMicroPill}>
                          <Text style={styles.bannerMicroPillText}>{item.badge}</Text>
                        </View>

                        {/* Left Column (Typography) */}
                        <View style={styles.bannerTextCol}>
                          <Text style={styles.bannerTitlePrimary}>{item.titlePrimary}</Text>
                          <Text style={styles.bannerTitleSecondary}>{item.titleSecondary}</Text>
                          <Text style={styles.bannerTagline} numberOfLines={1}>{item.tagline}</Text>

                          <View style={[styles.bannerExploreChip, isSelected && styles.bannerExploreChipActive]}>
                            <Text style={styles.bannerExploreText}>
                              {isSelected ? 'Selected' : 'Explore'}
                            </Text>
                            <Ionicons
                              name={isSelected ? 'checkmark-circle' : 'arrow-forward'}
                              size={12}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>

                        {/* Right Column (Elevated Circle Product Showcase) */}
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

                <TouchableOpacity
                  style={styles.carouselNextBtn}
                  onPress={() => handleScrollCategory('next')}
                  activeOpacity={0.88}
                >
                  <Ionicons name="chevron-forward" size={18} color="#1E293B" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            6. GUARANTEE / TRUST STRIP
        ============================================================ */}
        <View style={styles.guaranteeSectionWrap}>
          <View style={styles.guaranteeCard}>
            <View style={styles.cardGradientBarMulticolor} />
            <View style={styles.guaranteeItem}>
              <View style={[styles.guaranteeIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#00B894" />
              </View>
              <View>
                <Text style={styles.guaranteeTitle}>100% Genuine Medicines</Text>
                <Text style={styles.guaranteeSub}>Verified manufacturers & labs</Text>
              </View>
            </View>

            <View style={styles.guaranteeDivider} />

            <View style={styles.guaranteeItem}>
              <View style={[styles.guaranteeIconCircle, { backgroundColor: '#FFF5F0' }]}>
                <Ionicons name="flash" size={20} color="#FF7F50" />
              </View>
              <View>
                <Text style={styles.guaranteeTitle}>60-Min Express Delivery</Text>
                <Text style={styles.guaranteeSub}>Express doorstep delivery</Text>
              </View>
            </View>

            <View style={styles.guaranteeDivider} />

            <View style={styles.guaranteeItem}>
              <View style={[styles.guaranteeIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="medkit" size={20} color="#1E3A8A" />
              </View>
              <View>
                <Text style={styles.guaranteeTitle}>Pharmacist Review 24/7</Text>
                <Text style={styles.guaranteeSub}>24/7 dosage verification</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================
            POPULAR PRODUCTS (Matching Mockup Heading)
        ============================================================ */}
        <View
          style={styles.pharmacySectionWrap}
          nativeID="pharmacy-products-section"
          {...(Platform.OS === 'web' ? { id: 'pharmacy-products-section' } : {})}
          onLayout={(event) => {
            const layout = event.nativeEvent.layout;
            if (layout && layout.y) {
              setCatalogY(layout.y);
            }
          }}
        >
          <View style={styles.sectionHeaderLine}>
            <View>
              <Text style={styles.sectionHeadingTitle}>
                {selectedCondition
                  ? `${BROWSE_HEALTH_CONDITIONS.find((c) => c.id === selectedCondition)?.titlePrimary || 'Selected'} Care Products`
                  : selectedCategory !== 'all'
                  ? `${selectedCategory} Products`
                  : searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : 'Popular Products'}
              </Text>
              <Text style={styles.sectionSubHeading}>
                Showing {filteredProducts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
              </Text>
            </View>

            {Boolean(selectedCategory !== 'all' || selectedCondition || (searchQuery && searchQuery.trim())) ? (
              <TouchableOpacity
                style={styles.viewStoreBtn}
                onPress={() => {
                  setSelectedCategory('all');
                  setSelectedCondition(null);
                  setSearchQuery('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.viewStoreBtnText}>View All Products</Text>
                <Ionicons name="arrow-forward" size={14} color="#00B894" />
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProductsState}>
              <Ionicons name="search-outline" size={48} color="#94A3B8" />
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
              >
                <Text style={styles.resetCatalogBtnText}>Show All Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.pharmacyCardsGrid}>
                {paginatedProducts.map((prod) => {
                  const cartItem = (pharmacyCart || []).find((ci) => ci.id === prod.id);
                  const quantity = cartItem?.quantity || 0;
                  const prodImg = getProductImage(prod);
                  const shortCat = getShortCategory(prod.category);
                  const reviewsStr = formatReviewCount(prod.reviewsCount);
                  const discountStr = formatDiscountText(prod.discount, prod.mrp || prod.oldPrice, prod.price);

                return (
                  <View
                    key={prod.id}
                    style={[styles.pharmacyCard, { width: cardWidth }]}
                    // @ts-ignore
                    className="pharmacy-prod-card"
                  >
                    {/* Badge */}
                    <View style={styles.pharmacyBadge}>
                      <Text style={styles.pharmacyBadgeText}>
                        {discountStr}
                      </Text>
                    </View>

                    {Boolean(prod.requiresPrescription) ? (
                      <View style={styles.pharmacyRxBadge}>
                        <Text style={styles.pharmacyRxBadgeText}>Rx</Text>
                      </View>
                    ) : null}

                    {/* Image */}
                    <TouchableOpacity
                      onPress={() => navigation?.navigate('ProductDetails', { product: prod, productId: prod.id })}
                      activeOpacity={0.9}
                      style={styles.pharmacyCardImgWrap}
                    >
                      <OptimizedImage
                        source={typeof prodImg === 'number' ? prodImg : { uri: prodImg }}
                        style={styles.pharmacyCardImg}
                        // @ts-ignore
                        className="pharmacy-card-img"
                        resizeMode="contain"
                        placeholderColor="transparent"
                        fallbackIcon="medkit-outline"
                        fallbackColor="#007D69"
                      />
                    </TouchableOpacity>

                    {/* Card Content */}
                    <View style={styles.pharmacyCardBody}>
                      <View style={styles.pharmacyCardContent}>
                        <Text style={styles.pharmacyCat}>{shortCat}</Text>
                        <TouchableOpacity
                          onPress={() => navigation?.navigate('ProductDetails', { product: prod, productId: prod.id })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.pharmacyName} numberOfLines={2} ellipsizeMode="tail">
                            {prod.name}
                          </Text>
                        </TouchableOpacity>

                        {/* Compact Rating: 4.8 (1.2k) */}
                        <View style={styles.pharmacyRatingRow}>
                          <Ionicons name="star" size={12} color="#FF9F43" />
                          <Text style={styles.ratingNumberText}>{prod.rating || 4.8}</Text>
                          <Text style={styles.reviewsCountText}>{reviewsStr}</Text>
                        </View>
                      </View>

                      {/* Bottom Footer: Price & Add to Cart Action */}
                      <View style={styles.pharmacyCardFooter}>
                        <View style={styles.pharmacyPriceRow}>
                          <Text style={styles.pharmacyPrice}>₹{prod.price}</Text>
                          {Boolean(prod.mrp || prod.oldPrice) ? (
                            <Text style={styles.pharmacyMrp}>MRP ₹{prod.mrp || prod.oldPrice}</Text>
                          ) : null}
                        </View>

                        {/* Add to Cart or Stepper */}
                        {quantity > 0 ? (
                          <View style={styles.quantityStepper}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => decreaseQuantity(prod.id, 'pharmacy')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="remove" size={14} color="#00B894" />
                            </TouchableOpacity>
                            <Text style={styles.stepperQuantity}>{quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => increaseQuantity(prod.id, 'pharmacy')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add" size={14} color="#00B894" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addToCartButton}
                            // @ts-ignore
                            className="pharmacy-add-btn"
                            onPress={() => addToCart(prod, 1, 'pharmacy')}
                            activeOpacity={0.88}
                          >
                            <Ionicons name="cart-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                          </TouchableOpacity>
                        )}
                      </View>
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
                onPageChange={(pageNum) => setCurrentPage(pageNum)}
              />
            )}
            </>
          )}
        </View>


        {/* ============================================================
            10. ENTERPRISE FOOTER
        ============================================================ */}
        <WebFooter navigation={navigation} />

        {/* ============================================================
            11. MODAL: PRESCRIPTION UPLOAD DIALOG
        ============================================================ */}
        <Modal
          visible={showUploadModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Doctor's Prescription</Text>
                <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.uploadDropzone}>
                  <Ionicons name="cloud-upload" size={48} color="#00B894" />
                  <Text style={styles.dropzoneTitle}>
                    {selectedFile ? `Selected: ${selectedFile}` : 'Drag & Drop prescription image or PDF here'}
                  </Text>
                  <Text style={styles.dropzoneSub}>Supports JPG, PNG, PDF up to 10MB</Text>
                  <TouchableOpacity style={styles.dropzoneBrowseBtn} onPress={handleTriggerUpload}>
                    <Text style={styles.dropzoneBrowseText}>Browse File</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.rxGuidelinesBox}>
                  <Text style={styles.guidelinesTitle}>Prescription Guidelines:</Text>
                  <Text style={styles.guidelineItem}>• Patient name & doctor's stamp/signature clearly visible</Text>
                  <Text style={styles.guidelineItem}>• Valid date within last 6 months</Text>
                  <Text style={styles.guidelineItem}>• Do not crop or blur medication details</Text>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowUploadModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmUpload}>
                  <Text style={styles.modalConfirmText}>Confirm & Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>


        {/* Upload Success Toast */}
        {Boolean(uploadSuccessToast) ? (
          <View style={styles.successToastWrap}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.successToastText}>
              Prescription submitted! Our pharmacist will review it shortly.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Cart FAB */}
      <TouchableOpacity
        style={[
          styles.floatingCartFab,
          pharmacyCartCount > 0 && styles.floatingCartFabActive,
        ]}
        onPress={() => navigation?.navigate('Cart', { initialTab: 'pharmacy' })}
        activeOpacity={0.85}
      >
        <Ionicons name="cart" size={24} color="#FFFFFF" />
        {pharmacyCartCount > 0 ? (
          <View style={styles.fabCountBadge}>
            <Text style={styles.fabCountText}>{pharmacyCartCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ==================================================
// STYLESHEET (Exact HomeScreen.web.js Design System)
// ==================================================
const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFD', // Match healthcare background
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // MOBILE HEADER
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7EC',
    gap: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLocalityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFCFD',
    borderWidth: 1,
    borderColor: '#DCE7EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  headerLocalityIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDeliverTo: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  headerLocalityName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  headerCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FF7F50',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // 1. HERO SHOWCASE CAROUSEL
  heroCarouselWrap: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  heroCarouselInner: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
  },
  carouselNavArrowLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -21 }],
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    cursor: 'pointer',
  },
  carouselNavArrowRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -21 }],
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    cursor: 'pointer',
  },
  fullWidthBannerCard: {
    width: '100%',
    minHeight: 290,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fullWidthLeftCol: {
    flex: 1.15,
    paddingVertical: 26,
    paddingLeft: 76,
    paddingRight: 24,
    justifyContent: 'center',
  },
  fullWidthRightCol: {
    flex: 0.85,
    height: '100%',
    minHeight: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  fullWidthImage: {
    width: '100%',
    height: '100%',
    minHeight: 280,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  floatingTrustBadge: {
    position: 'absolute',
    bottom: 18,
    right: 76,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  floatingTrustBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandPillYellow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  brandPillYellowText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.4,
  },
  brandTagFlipkart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  brandTagFlipkartText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00B894',
  },
  adNoticePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adNoticePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  fullWidthTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E3A8A',
    lineHeight: 34,
    marginTop: 8,
    letterSpacing: -0.6,
  },
  fullWidthPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  fullWidthPriceText: {
    fontSize: 20,
    fontWeight: '900',
  },
  fullWidthPriceSubText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  fullWidthSubTitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '500',
    maxWidth: '92%',
  },
  fullWidthBulletsCol: {
    marginTop: 10,
    marginBottom: 14,
    gap: 6,
  },
  fullWidthBulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullWidthBulletText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  fullWidthCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  fullWidthCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  fullWidthCtaText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSecondaryUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  heroSecondaryUploadText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    cursor: 'pointer',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#00B894',
    borderRadius: 4,
  },

  // 2. PROMINENT SEARCH BAR
  searchSectionWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    width: '100%',
  },
  searchSectionInner: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  searchBarBox: {
    width: '100%',
    maxWidth: 1080,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    height: '100%',
    outlineStyle: 'none',
  },
  searchClearBtn: {
    padding: 6,
    marginRight: 8,
  },
  searchBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchUploadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  searchUploadChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF7F50',
  },
  searchSubmitBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Pagination Styles
  paginationRow: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    cursor: 'pointer',
  },
  pageNavBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    cursor: 'not-allowed',
  },
  pageNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  pageNavBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageNumbersTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNumberChip: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  pageNumberChipActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  localityLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  localityValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // 3. BROWSE MEDICINES & HEALTH PRODUCTS (Creative Rich)
  browseSectionWrap: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
  },
  browseSectionInner: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
  },
  browseHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  browseMainHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  browseHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  browseHeaderPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00B894',
  },
  browseSubSection: {
    marginBottom: 26,
  },
  subSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  browseSubHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  subSectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeFilterChipText: {
    fontSize: 11,
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
    paddingRight: 50,
  },
  browseBannerCard: {
    width: 300,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 4,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    cursor: 'pointer',
  },
  browseBannerCardActive: {
    borderWidth: 3,
    borderColor: '#0F172A',
    shadowOpacity: 0.2,
    transform: [{ scale: 1.02 }],
  },
  cardBackdropGlow: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bannerMicroPill: {
    position: 'absolute',
    top: 10,
    left: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
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
    maxWidth: '54%',
    paddingTop: 18,
  },
  bannerTitlePrimary: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 23,
    textShadow: '0px 1px 2px rgba(0, 0, 0, 0.15)',
  },
  bannerTitleSecondary: {
    fontSize: 10.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  bannerTagline: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  bannerExploreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
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
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  imageBackdropDisc: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.75)',
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
    borderRadius: 50,
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

  // 4. 4 FEATURED ACTION CARDS
  featuredServicesWrap: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  featuredServicesInner: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featuredServiceCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 60%, #F0FDF9 100%)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    borderTopWidth: 3.5,
    borderTopColor: '#00B894',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    boxShadow: '0 6px 20px -2px rgba(0, 184, 148, 0.07)',
    justifyContent: 'space-between',
    minHeight: 160,
  },
  featuredCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featuredTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  featuredCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 10,
  },
  featuredCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  featuredPriceBox: {
    justifyContent: 'center',
  },
  featuredPriceLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  featuredPriceVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  featuredCtaBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 5. BROWSE BY HEALTH CONDITIONS
  bestQualitySectionWrap: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  bestQualityHeaderRow: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bestQualityTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.4,
  },
  clearConditionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  clearConditionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF7F50',
  },
  conditionsGrid: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  conditionCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  conditionCardSelected: {
    borderColor: '#00B894',
    borderWidth: 1.5,
    backgroundColor: '#ECFDF5',
  },
  conditionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionInfo: {
    flex: 1,
  },
  conditionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  conditionNameSelected: {
    color: '#00B894',
  },
  conditionActionText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  // 6. GUARANTEE / TRUST STRIP
  guaranteeSectionWrap: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  guaranteeCard: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF9 50%, #EFF6FF 100%)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    boxShadow: '0 8px 24px -2px rgba(0, 184, 148, 0.08)',
  },
  guaranteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 220,
    marginVertical: 4,
  },
  guaranteeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  guaranteeSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  // 7. ESSENTIAL MEDICINES & DAILY CARE (Flipkart Cards Standard)
  pharmacySectionWrap: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  sectionHeaderLine: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeadingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.4,
  },
  sectionSubHeading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  viewStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  viewStoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  pharmacyCardsGrid: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cardGradientBarMulticolor: {
    display: 'none',
  },
  pharmacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EFF5',
    padding: 13,
    paddingTop: 12,
    paddingBottom: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.02)',
    justifyContent: 'space-between',
    minHeight: 330,
    cursor: 'pointer',
  },
  pharmacyBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 5.5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#FED7AA',
    zIndex: 2,
  },
  pharmacyBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#EA580C',
    letterSpacing: 0.2,
  },
  pharmacyRxBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    zIndex: 2,
  },
  pharmacyRxBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  pharmacyCardImgWrap: {
    width: '100%',
    height: 140,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pharmacyCardImg: {
    width: '94%',
    height: '94%',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  pharmacyCardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  pharmacyCardContent: {
    flex: 1,
  },
  pharmacyCat: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  pharmacyName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 19,
    height: 38,
    overflow: 'hidden',
    letterSpacing: -0.1,
  },
  pharmacyBrand: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pharmacyRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingNumberText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
  },
  reviewsCountText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pharmacyCardFooter: {
    marginTop: 10,
  },
  pharmacyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginBottom: 8,
  },
  pharmacyPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pharmacyMrp: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#00B894',
    backgroundImage: 'linear-gradient(135deg, #00C29A 0%, #009E7E 100%)',
    borderRadius: 10,
    height: 38,
    cursor: 'pointer',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    boxShadow: '0 4px 14px rgba(0, 184, 148, 0.28)',
  },
  addToCartButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    height: 38,
    paddingHorizontal: 6,
    boxShadow: '0 2px 8px rgba(0, 184, 148, 0.12)',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  stepperQuantity: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#065F46',
  },
  emptyProductsState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  resetCatalogBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetCatalogBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // 8. WALLET / RX PRESCRIPTION HOME BANNER
  walletHomeSectionWrap: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  walletHomeCard: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
  },
  walletHomeLeft: {
    flex: 1,
    minWidth: 280,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  walletIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletHomeInfo: {
    flex: 1,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  walletHomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  walletStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E6FAF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  walletGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7BC96F',
  },
  walletStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
  },
  walletHomeSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  walletHomeRight: {
    alignItems: 'flex-end',
  },
  topUpWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00B894',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  topUpWalletBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 9. TOP PHARMA BRANDS
  brandsGrid: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  brandCard: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCardText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // 11. MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalBody: {
    paddingVertical: 16,
  },
  uploadDropzone: {
    borderWidth: 2,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dropzoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
    textAlign: 'center',
  },
  dropzoneSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 12,
  },
  dropzoneBrowseBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dropzoneBrowseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  rxGuidelinesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  guidelinesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  guidelineItem: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Locality Modal
  localitySelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  localitySelectItemActive: {
    borderColor: '#00B894',
    backgroundColor: '#ECFDF5',
  },
  localityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  localityNameActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  localitySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Toast Notification
  successToastWrap: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  successToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // 13. FLOATING BOTTOM CART DOCK (Navy Blue & Teal Theme)
  floatingCartDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E3A8A', // Deep navy matching brand palette
    borderTopWidth: 1,
    borderTopColor: '#1E3A8A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 900,
  },
  floatingCartInner: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  floatingCartIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatingCartMiniBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FF7F50',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
  },
  floatingCartMiniBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingCartInfo: {
    justifyContent: 'center',
  },
  floatingCartTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  floatingCartSub: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  floatingCartPriceBold: {
    color: '#00C2CB',
    fontWeight: '800',
    fontSize: 13,
  },
  floatingCartActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00B894',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingCartActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Floating FAB
  floatingCartFab: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    right: 32,
    bottom: 108,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 99999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'transform 0.2s ease, background-color 0.2s ease' } : {}),
  },
  floatingCartFabActive: {
    backgroundColor: '#00B894',
    shadowColor: '#00B894',
    shadowOpacity: 0.45,
  },
  fabCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF7F50',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fabCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});

const PharmacyScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  if (!isDesktopLayout(width)) {
    return <PharmacyScreenMobile {...props} />;
  }
  return <PharmacyScreenWeb {...props} />;
};

export default PharmacyScreenResponsive;
