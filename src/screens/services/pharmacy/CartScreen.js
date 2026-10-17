import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../../utils/alert';
import { useCart } from '../../../context/CartContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { requestLocationPermissionWebSafe, getCurrentPositionWebSafe, reverseGeocodeWebSafe } from '../../../utils/locationHelper';
import pharmacyProducts from '../../../data/pharmacyProducts';
import { LAB_PACKAGES } from '../../../data/labTestData';
import { enrichLabItemDetails } from '../../../utils/labPackageMatcher.js';
import WebFooter from '../../../components/web/WebFooter';
import { useAuthGuard } from '../../../context/AuthGuardContext';
import { saveTransaction } from '../../../services/transactionService';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';
import {
  getSlotStatus,
  validateAndBookSlot,
  subscribeToSlotChanges,
} from '../../../services/slotBookingService';

const pharmaVitaminC = require('../../../../assets/pharmacy/pharma_vitamin_c.jpg');
const pharmaMultivitamin = require('../../../../assets/pharmacy/pharma_multivitamin.jpg');
const pharmaThermometer = require('../../../../assets/pharmacy/pharma_thermometer.jpg');

const CART_PRODUCT_IMAGES = {
  '1': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500',
  '2': pharmaVitaminC,
  '3': pharmaMultivitamin,
  '4': pharmaThermometer,
  '5': 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=500',
  '6': 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=500',
  '7': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=500',
  '8': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500',
  '9': 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=500',
  '10': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500',
};

const getCartItemImage = (item) => {
  if (typeof item?.image === 'number') return item.image;
  if (item?.id && CART_PRODUCT_IMAGES[item.id]) {
    const mapped = CART_PRODUCT_IMAGES[item.id];
    return typeof mapped === 'number' ? mapped : { uri: mapped };
  }
  if (item?.image) return typeof item.image === 'string' ? { uri: item.image } : item.image;
  return { uri: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300' };
};

const getDealImage = (deal) => {
  if (typeof deal?.image === 'number') return deal.image;
  if (deal?.id === 'deal-1' || deal?.id === 'quick-1') return pharmaVitaminC;
  if (deal?.id === 'deal-2' || deal?.id === 'deal-7' || deal?.id === 'deal-8' || deal?.id === 'deal-10' || deal?.id === 'quick-3') return pharmaMultivitamin;
  if (deal?.id === 'quick-4' || deal?.id === 'quick-5' || deal?.id === 'quick-6' || deal?.id === 'deal-5') return pharmaThermometer;
  if (deal?.image) return typeof deal.image === 'string' ? { uri: deal.image } : deal.image;
  return pharmaVitaminC;
};

// PAYMENT CONSTANTS MATCHED TO CHECKOUT MODAL
const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', icon: 'logo-google', color: '#4285F4' },
  { id: 'phonepe', name: 'PhonePe', icon: 'flash', color: '#5F259F' },
  { id: 'paytm', name: 'Paytm UPI', icon: 'wallet', color: '#00BAF2' },
  { id: 'bhim', name: 'BHIM UPI', icon: 'qr-code', color: '#00529C' },
  { id: 'cred', name: 'CRED Pay', icon: 'shield-checkmark', color: '#1A1A1A' },
];

const POPULAR_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank' },
  { id: 'icici', name: 'ICICI Bank' },
  { id: 'sbi', name: 'State Bank of India' },
  { id: 'axis', name: 'Axis Bank' },
  { id: 'kotak', name: 'Kotak Mahindra' },
];

const PAYMENT_METHODS_CHECKOUT = [
  { id: 'UPI', label: 'UPI / Google Pay / PhonePe', icon: 'phone-portrait-outline', iconColor: '#00B894' },
  { id: 'CARD', label: 'Credit / Debit Card', icon: 'card-outline', iconColor: '#1E3A8A' },
  { id: 'NETBANKING', label: 'Net Banking', icon: 'business-outline', iconColor: '#00C2CB' },
  { id: 'WALLET', label: 'Health Wallet Balance', icon: 'wallet-outline', iconColor: '#7BC96F' },
  { id: 'COD', label: 'Cash on Delivery (Pay at Doorstep)', icon: 'cash-outline', iconColor: '#64748B' },
];

const RADIOLOGY_PAYMENT_METHODS = [
  { id: 'UPI', label: 'Instant UPI (GPay / PhonePe / Paytm)', icon: 'phone-portrait-outline', iconColor: '#00B894' },
  { id: 'CARD', label: 'Credit / Debit Card (Visa, MasterCard, RuPay)', icon: 'card-outline', iconColor: '#1E3A8A' },
  { id: 'NETBANKING', label: 'Net Banking (All Indian Banks)', icon: 'business-outline', iconColor: '#00C2CB' },
  { id: 'WALLET', label: 'MediUnify Health Wallet', icon: 'wallet-outline', iconColor: '#7BC96F' },
];

const POPULAR_RADIOLOGY_RECOMMENDED = [
  {
    id: 'REC-CAR-1',
    name: '2D Echo + Color Doppler',
    category: 'Cardiology',
    modality: '2D Echo',
    price: 1899,
    mrp: 2600,
    centerName: 'Unnathi Advanced Diagnostics',
    labName: 'Unnathi Advanced Diagnostics',
    labArea: 'Kuvempunagar, Mysore',
    reportTime: 'Within 2 Hours',
    fastingRequired: false,
  },
  {
    id: 'REC-CAR-2',
    name: '12-Lead Digital ECG',
    category: 'Cardiology',
    modality: 'Digital ECG',
    price: 299,
    mrp: 450,
    centerName: 'MediCare Precision Scan Lab',
    labName: 'MediCare Precision Scan Lab',
    labArea: 'Jayalakshmipuram, Mysore',
    reportTime: 'Instant (30 Mins)',
    fastingRequired: false,
  },
  {
    id: 'REC-1',
    name: 'MRI Brain (Plain)',
    category: 'Radiology',
    modality: '3.0T MRI',
    price: 4500,
    mrp: 6500,
    centerName: 'Mysore Scan & Diagnostic Centre',
    labName: 'Mysore Scan & Diagnostic Centre',
    labArea: 'Saraswathipuram, Mysore',
    reportTime: 'Within 4 Hours',
    fastingRequired: false,
  },
  {
    id: 'REC-2',
    name: 'CT Chest (High Resolution)',
    category: 'Radiology',
    modality: '128-Slice CT',
    price: 3200,
    mrp: 4200,
    centerName: 'Apollo BGS Hospitals',
    labName: 'Apollo BGS Hospitals',
    labArea: 'Kuvempunagar, Mysore',
    reportTime: 'Within 4 Hours',
    fastingRequired: true,
  },
  {
    id: 'REC-3',
    name: 'Ultrasound Whole Abdomen',
    category: 'Radiology',
    modality: 'USG Scan',
    price: 1000,
    mrp: 1400,
    centerName: 'Narayana Health City',
    labName: 'Narayana Health City',
    labArea: 'Hebbal, Mysore',
    reportTime: 'Within 2 Hours',
    fastingRequired: true,
  },
  {
    id: 'REC-4',
    name: 'Digital X-Ray Chest PA View',
    category: 'Radiology',
    modality: 'Digital X-Ray',
    price: 350,
    mrp: 500,
    centerName: 'Spark Diagnostic Centre',
    labName: 'Spark Diagnostic Centre',
    labArea: 'Vijayanagar 2nd Stage, Mysore',
    reportTime: 'Instant (1 Hour)',
    fastingRequired: false,
  },
];

// CURATED TOP DEALS (Matching Sanofi top deals in reference image)
const TOP_DEALS = [
  {
    id: 'deal-1',
    name: 'Depura 60000 IU Vitamin D3 Oral Solution',
    packSize: 'Bottle of 5 ml oral solution',
    price: 100,
    mrp: 116.87,
    discount: '14% off',
    rating: 4.4,
    reviews: '2648',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300',
    brand: 'Sanofi',
    category: 'Vitamins & Minerals',
  },
  {
    id: 'deal-2',
    name: 'Enterogermina Probiotic Supplement | For Gut Health',
    packSize: 'Strip of 4 capsules',
    price: 172,
    mrp: 201.9,
    discount: '15% off',
    rating: 4.6,
    reviews: '1820',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300',
    brand: 'Sanofi',
    category: 'Digestive Care',
  },
  {
    id: 'deal-3',
    name: 'Lactacyd Feminine Hygiene Wash',
    packSize: 'Bottle of 100 ml gentle wash',
    price: 327,
    mrp: 329,
    discount: '7% off',
    rating: 4.7,
    reviews: '721',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300',
    brand: 'Sanofi',
    category: 'Personal Care',
  },
  {
    id: 'deal-4',
    name: 'Combiflam Pain Relief Cream',
    packSize: 'Tube of 30 gm cream',
    price: 121,
    mrp: 131.25,
    discount: '8% off',
    rating: 4.5,
    reviews: '3410',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=300',
    brand: 'Sanofi',
    category: 'Pain Relief',
  },
  {
    id: 'deal-5',
    name: 'Buscogast Hyoscine Butylbromide Tablets',
    packSize: 'Strip of 10 tablets',
    price: 43.5,
    mrp: 45.78,
    discount: '5% off',
    rating: 4.3,
    reviews: '237',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300',
    brand: 'Sanofi',
    category: 'Stomach Care',
  },
  {
    id: 'deal-6',
    name: 'Volini Pain Relief Gel Fast Acting Formula',
    packSize: 'Tube of 75 gm gel',
    price: 210,
    mrp: 245,
    discount: '14% off',
    rating: 4.6,
    reviews: '1420',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=300',
    brand: 'Sun Pharma',
    category: 'Pain Relief',
  },
  {
    id: 'deal-7',
    name: 'Zincovit Daily Multivitamin & Minerals Tablet',
    packSize: 'Strip of 15 tablets',
    price: 95,
    mrp: 110,
    discount: '13% off',
    rating: 4.8,
    reviews: '4890',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300',
    brand: 'Apex',
    category: 'Vitamins & Minerals',
  },
  {
    id: 'deal-8',
    name: 'Revital H Daily Health Supplement Capsules',
    packSize: 'Bottle of 30 capsules',
    price: 285,
    mrp: 330,
    discount: '14% off',
    rating: 4.5,
    reviews: '3120',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300',
    brand: 'Sun Pharma',
    category: 'Daily Wellness',
  },
  {
    id: 'deal-9',
    name: 'Otrivin Oxy Fast Relief Adult Nasal Spray',
    packSize: 'Bottle of 10 ml spray',
    price: 92,
    mrp: 105,
    discount: '12% off',
    rating: 4.7,
    reviews: '980',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300',
    brand: 'GSK',
    category: 'Cold & Allergy',
  },
  {
    id: 'deal-10',
    name: 'Becosules Z Multivitamin & Zinc Capsules',
    packSize: 'Strip of 20 capsules',
    price: 45,
    mrp: 52,
    discount: '13% off',
    rating: 4.8,
    reviews: '5120',
    eta: 'Get by 7pm, Today',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300',
    brand: 'Pfizer',
    category: 'Vitamins & Minerals',
  },
];

// LAST MINUTE BUYS
const LAST_MINUTE_BUYS = [
  {
    id: 'quick-1',
    name: 'Vicks Vaporub 25ml Relief Balm',
    packSize: 'Jar of 25 ml',
    price: 85,
    mrp: 95,
    discount: '11% off',
    rating: 4.8,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300',
    brand: 'Procter & Gamble',
    category: 'Cold & Cough',
  },
  {
    id: 'quick-2',
    name: 'Hansaplast Waterproof Bandages (Pack of 20)',
    packSize: 'Box of 20 strips',
    price: 65,
    mrp: 75,
    discount: '13% off',
    rating: 4.7,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300',
    brand: 'Hansaplast',
    category: 'First Aid',
  },
  {
    id: 'quick-3',
    name: 'Dettol Instant Hand Sanitizer 50ml',
    packSize: 'Bottle of 50 ml',
    price: 25,
    mrp: 30,
    discount: '17% off',
    rating: 4.9,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300',
    brand: 'Reckitt',
    category: 'Hygiene',
  },
  {
    id: 'quick-4',
    name: 'Dolo 650mg Paracetamol Tablets',
    packSize: 'Strip of 15 tablets',
    price: 31,
    mrp: 34.5,
    discount: '10% off',
    rating: 4.9,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300',
    brand: 'Micro Labs',
    category: 'Medicines',
  },
  {
    id: 'quick-5',
    name: 'Eno Fast Relief Fruit Salt Regular',
    packSize: 'Sachet of 5 gm',
    price: 8.5,
    mrp: 10,
    discount: '15% off',
    rating: 4.8,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1550572017-ed24058d844c?w=300',
    brand: 'GSK',
    category: 'Acidity & Digestion',
  },
  {
    id: 'quick-6',
    name: 'Digene Antacid Chewable Tablets Mint',
    packSize: 'Strip of 15 tablets',
    price: 22,
    mrp: 26,
    discount: '15% off',
    rating: 4.7,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300',
    brand: 'Abbott',
    category: 'Digestive Care',
  },
  {
    id: 'quick-7',
    name: 'Strepsils Honey & Lemon Lozenges',
    packSize: 'Strip of 8 lozenges',
    price: 36,
    mrp: 40,
    discount: '10% off',
    rating: 4.9,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300',
    brand: 'Reckitt',
    category: 'Throat Care',
  },
  {
    id: 'quick-8',
    name: 'Soframycin Skin Antibacterial Cream',
    packSize: 'Tube of 30 gm cream',
    price: 58,
    mrp: 65,
    discount: '11% off',
    rating: 4.8,
    eta: 'Express 30 mins',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300',
    brand: 'Sanofi',
    category: 'First Aid',
  },
];

// DEFAULT MOCKUP ITEMS (Matches the user's uploaded screenshot)
const DEFAULT_MOCKUP_ITEMS = [
  {
    id: 'mock-1',
    name: 'Tetmosol Medicated Soap with 5% Monosulfiram for Skin Infections',
    packSize: 'Packet of 100 gm soap',
    price: 97,
    mrp: 105.7,
    discount: '8% off',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=300',
    brand: 'Tetmosol',
    category: 'Skin Care',
  },
  {
    id: 'mock-2',
    name: 'Brilante Intense Brightening Serum | For Dark Spots | Paraben & Allergen-Free',
    packSize: 'Bottle of 50 ml serum',
    price: 669,
    mrp: 769,
    discount: '13% off',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300',
    brand: 'Brilante',
    category: 'Skin Care',
  },
];

const CartScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopLayout(width);
  const { requireLogin } = useAuthGuard();
  const {
    pharmacyCart = [],
    labCart = [],
    radiologyCart = [],
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    pharmacySubtotal = 0,
    pharmacyMrpTotal = 0,
    pharmacySavings = 0,
    pharmacyDiscountAmount = 0,
    pharmacyDeliveryFee = 0,
    pharmacyPackagingFee = 0,
    pharmacyFinalTotal = 0,
    labSubtotal = 0,
    labMrpTotal = 0,
    labSavings = 0,
    labDiscountAmount = 0,
    labSampleFee = 0,
    labFinalTotal = 0,
    radiologySubtotal = 0,
    radiologyMrpTotal = 0,
    radiologySavings = 0,
    radiologyDiscountAmount = 0,
    radiologyFinalTotal = 0,
    pharmacyCartCount = 0,
    labCartCount = 0,
    radiologyCartCount = 0,
    totalCartCount = 0,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    selectedAddress,
    selectedPharmacyStore,
    selectedCity,
    pharmacyCityConfig,
    syncLocationWithHome,
    updateAddress,
    addOrder,
    clearCart,
  } = useCart();

  useEffect(() => {
    syncLocationWithHome?.();
    const unsub = navigation?.addListener ? navigation.addListener('focus', () => {
      syncLocationWithHome?.();
    }) : null;
    return () => {
      if (unsub) unsub();
    };
  }, [navigation, syncLocationWithHome]);

  const [activeCartTab, setActiveCartTab] = useState(() => {
    // Radiology/Scans & X-Ray are no longer part of the cart — they use a dedicated booking flow.
    if (route?.params?.initialTab === 'lab') return 'lab';
    if (route?.params?.initialTab === 'pharmacy') return 'pharmacy';
    if (labCart?.length > 0 && (!pharmacyCart || pharmacyCart.length === 0)) return 'lab';
    return 'pharmacy';
  });

  useEffect(() => {
    if (route?.params?.initialTab && route.params.initialTab !== 'radiology') {
      setActiveCartTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Carousel scroll refs & handlers for horizontal cards
  const topDealsScrollRef = useRef(null);
  const lastMinuteScrollRef = useRef(null);
  const radiologyDealsScrollRef = useRef(null);
  const labDealsScrollRef = useRef(null);

  const topDealsScrollX = useRef(0);
  const lastMinuteScrollX = useRef(0);
  const radiologyDealsScrollX = useRef(0);
  const labDealsScrollX = useRef(0);

  const scrollDeals = (direction, ref, xRef) => {
    const delta = direction === 'next' ? 380 : -380;
    const currentX = xRef.current || 0;
    const targetX = Math.max(0, currentX + delta);
    xRef.current = targetX;
    if (ref.current) {
      if (typeof ref.current.scrollTo === 'function') {
        ref.current.scrollTo({ x: targetX, animated: true });
      } else {
        const node = ref.current.getScrollableNode ? ref.current.getScrollableNode() : ref.current;
        if (node && node.scrollTo) {
          node.scrollTo({ left: targetX, behavior: 'smooth' });
        }
      }
    }
  };

  const handleSelectProduct = (deal) => {
    try {
      navigation?.navigate('ProductDetails', {
        product: {
          ...deal,
          inStock: true,
          requiresPrescription: Boolean(deal.requiresPrescription),
          description: deal.description || `${deal.name} is clinically evaluated to deliver authentic, high-grade therapeutic support and verified patient wellness.`,
          packSize: deal.packSize || '1 unit',
          brand: deal.brand || 'Sanofi',
          category: deal.category || 'Pharmacy Essentials',
        },
        productId: deal.id,
      });
    } catch (e) {
      console.warn('Could not navigate to ProductDetails', e);
    }
  };


  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  const [labCheckoutModalVisible, setLabCheckoutModalVisible] = useState(false);
  const [labCollectionMode, setLabCollectionMode] = useState('HOME');
  const [labBookingDate, setLabBookingDate] = useState('Tomorrow');
  const [labBookingSlot, setLabBookingSlot] = useState('08:00 AM - 09:00 AM (Fasting)');
  const [isSubmittingLabOrder, setIsSubmittingLabOrder] = useState(false);
  const [selectedLabItemDetails, setSelectedLabItemDetails] = useState(null);

  // Radiology Scan Booking & Checkout State
  const [radiologyCheckoutModalVisible, setRadiologyCheckoutModalVisible] = useState(false);
  const [radiologyPatientName, setRadiologyPatientName] = useState('Hemanth (Self)');
  const [radiologyPatientAge, setRadiologyPatientAge] = useState('28');
  const [radiologyPatientGender, setRadiologyPatientGender] = useState('Male');
  const [radiologyPatientPhone, setRadiologyPatientPhone] = useState('+91 97414 22544');
  const [radiologyBookingDate, setRadiologyBookingDate] = useState('Tomorrow');
  const [radiologyBookingSlot, setRadiologyBookingSlot] = useState('09:30 AM - 10:30 AM');
  const [radiologyPreparationAcknowledged, setRadiologyPreparationAcknowledged] = useState(true);
  const [selectedRadiologyPaymentMethod, setSelectedRadiologyPaymentMethod] = useState('UPI');
  const [isSubmittingRadiologyOrder, setIsSubmittingRadiologyOrder] = useState(false);

  // Real-time slot update ticker
  const [, setSlotTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeToSlotChanges(() => {
      setSlotTick((t) => t + 1);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (route?.params?.openCheckout) {
      (async () => {
        const isAuthed = await ensureLoggedIn('order medicines & tablets');
        if (isAuthed) {
          setCheckoutModalVisible(true);
        }
      })();
    }
  }, [route?.params?.openCheckout]);

  const [recipientName, setRecipientName] = useState('Hemanth (Self)');
  const [contactPhone, setContactPhone] = useState('+91 97414 22544');
  const [deliveryMode, setDeliveryMode] = useState('Express');
  const [selectedSlot, setSelectedSlot] = useState('Today, Express (30–45 Mins)');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI');
  const [walletBalance, setWalletBalance] = useState(2498);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderProcessStep, setOrderProcessStep] = useState(1);

  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('');
  const [isUpiVerified, setIsUpiVerified] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('hdfc');
  const [deliveryAddress, setDeliveryAddress] = useState(
    selectedAddress?.addressLine || 'Flat 402, Green Valley Apartments, Kuvempunagar, Mysore'
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState(null);

  const handleGpsAutofill = async () => {
    try {
      setGpsLoading(true);
      const perm = await requestLocationPermissionWebSafe();
      if (!perm.granted && perm.status !== 'granted') {
        showAlert('Permission Required', 'Location permission is required to detect delivery address.');
        setGpsLoading(false);
        return;
      }
      const pos = await getCurrentPositionWebSafe({ accuracy: 3 });
      if (pos?.coords) {
        const geo = await reverseGeocodeWebSafe(pos.coords.latitude, pos.coords.longitude);
        if (geo) {
          const formatted = `${geo.name ? geo.name + ', ' : ''}${geo.street ? geo.street + ', ' : ''}${geo.district || geo.city || ''}`;
          setDeliveryAddress(formatted || 'Current GPS Location, Kuvempunagar, Mysore');
        }
      }
      setGpsLoading(false);
    } catch (e) {
      setGpsLoading(false);
      setDeliveryAddress('Kuvempunagar 5th Main, Mysore');
    }
  };

  const handlePickDocument = async (typeChoice = 'any') => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && typeChoice !== 'camera') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = typeChoice === 'pdf' ? 'application/pdf' : 'image/*,application/pdf';
        input.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            setUploadedDocument({
              name: file.name,
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
              type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
              uri: URL.createObjectURL(file),
            });
          }
        };
        input.click();
        return;
      }

      if (typeChoice === 'camera') {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            showAlert('Permission Required', 'Camera permission is required to capture documents.');
            return;
          }
        }
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setUploadedDocument({
            name: `Camera_Rx_${Date.now().toString().slice(-4)}.jpg`,
            uri: asset.uri,
            type: 'image/jpeg',
            size: '1.2 MB',
          });
        }
      } else if (typeChoice === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setUploadedDocument({
            name: asset.fileName || `Rx_Image_${Date.now().toString().slice(-4)}.jpg`,
            uri: asset.uri,
            type: 'image/jpeg',
            size: asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB` : '1.4 MB',
          });
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setUploadedDocument({
            name: asset.name || 'Prescription.pdf',
            uri: asset.uri,
            type: asset.mimeType || 'application/pdf',
            size: asset.size ? `${(asset.size / 1024 / 1024).toFixed(2)} MB` : '1.5 MB',
          });
        }
      }
    } catch (e) {
      console.log('Error picking document:', e);
    }
  };


  useEffect(() => {
    (async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName && storedName.trim()) {
          setRecipientName(`${storedName.trim()} (Self)`);
        }
        const storedPhone = await AsyncStorage.getItem('userPhone');
        if (storedPhone && storedPhone.trim()) {
          setContactPhone(
            storedPhone.trim().startsWith('+91')
              ? storedPhone.trim()
              : `+91 ${storedPhone.trim()}`
          );
        }
        const bal = await AsyncStorage.getItem('@unnathi_wallet_balance');
        if (bal) setWalletBalance(parseInt(bal, 10) || 2498);
      } catch (e) {}
    })();
  }, []);

  const handleCardNumberChange = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setCardExpiry(cleaned);
    }
  };

  const ensureLoggedIn = useCallback(async (actionDesc = 'proceed with your order') => {
    try {
      const stored = await AsyncStorage.getItem('isLoggedIn');
      const isGuest = await AsyncStorage.getItem('@unnathi_is_guest');
      if (stored === 'true' && isGuest !== 'true') {
        return true;
      }
    } catch (e) {}
    return new Promise((resolve) => {
      requireLogin(
        () => resolve(true),
        `Please log in to ${actionDesc}.`,
        'Login Required'
      );
    });
  }, [requireLogin]);


  const handleConfirmPharmacyOrder = () => {
    requireLogin(() => _doConfirmPharmacyOrder());
  };

  const _doConfirmPharmacyOrder = async () => {

    if (!recipientName.trim()) {
      showAlert('Name Required', 'Please enter recipient name.');
      return;
    }
    if (!contactPhone.trim()) {
      showAlert('Phone Required', 'Please enter mobile number.');
      return;
    }
    if (!deliveryAddress.trim()) {
      showAlert('Address Required', 'Please enter complete delivery address.');
      return;
    }

    if (selectedPaymentMethod === 'WALLET') {
      if (walletBalance < netPayable) {
        showAlert(
          'Insufficient Wallet Balance',
          `Your wallet balance is ₹${walletBalance.toLocaleString('en-IN')}, but the payable amount is ₹${netPayable.toLocaleString('en-IN')}.\n\nPlease top up or choose another payment method.`,
          [
            { text: 'Top Up Wallet', onPress: () => navigation.navigate('Wallet') },
            { text: 'Change Method', style: 'cancel' },
          ]
        );
        return;
      }
    }

    if (selectedPaymentMethod === 'CARD') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        showAlert('Invalid Card', 'Please enter a valid 16-digit card number.');
        return;
      }
      if (cardExpiry.length < 5) {
        showAlert('Invalid Expiry', 'Please enter card expiry in MM/YY format.');
        return;
      }
      if (cardCvv.length < 3) {
        showAlert('Invalid CVV', 'Please enter a valid 3-digit CVV.');
        return;
      }
    }

    if (selectedPaymentMethod === 'UPI' && !selectedUpiApp && !upiId.trim()) {
      showAlert('UPI Required', 'Please select a UPI app or enter your UPI ID.');
      return;
    }

    setIsSubmittingOrder(true);
    setOrderProcessStep(1);

    setTimeout(() => {
      setOrderProcessStep(2);
      setTimeout(async () => {
        setOrderProcessStep(3);

        const orderId = `UNC${Math.floor(10000 + Math.random() * 90000)}`;

        if (selectedPaymentMethod === 'WALLET') {
          const newBal = Math.max(0, walletBalance - netPayable);
          setWalletBalance(newBal);
          try {
            await AsyncStorage.setItem('@unnathi_wallet_balance', newBal.toString());
            const storedTx = await AsyncStorage.getItem('@unnathi_wallet_transactions');
            const existingTx = storedTx ? JSON.parse(storedTx) : [];
            const newTx = {
              id: `tx-${Date.now()}`,
              title: 'Paid via MediUnify Wallet',
              subtitle: `Pharmacy Order #${orderId}`,
              amount: `-₹${netPayable}`,
              type: 'debit',
              date: 'Just Now',
              icon: 'wallet-outline',
            };
            await AsyncStorage.setItem('@unnathi_wallet_transactions', JSON.stringify([newTx, ...existingTx]));
          } catch (e) {}
        }

        let paymentLabel = 'Cash on Delivery';
        if (selectedPaymentMethod === 'WALLET') paymentLabel = 'MediUnify Health Wallet';
        else if (selectedPaymentMethod === 'UPI') paymentLabel = `UPI (${selectedUpiApp.toUpperCase()})`;
        else if (selectedPaymentMethod === 'CARD') paymentLabel = `Card (Ending with ${cardNumber.slice(-4) || '4242'})`;
        else if (selectedPaymentMethod === 'NETBANKING') paymentLabel = `Net Banking (${selectedBank.toUpperCase()})`;

        const orderCartItems = (pharmacyCart && pharmacyCart.length > 0) ? pharmacyCart : (typeof items !== 'undefined' ? items : []);
        const storedUserId = (await AsyncStorage.getItem('@unnathi_user_phone')) || (await AsyncStorage.getItem('userPhone')) || 'patient-primary-001';
        const cleanRecipient = recipientName.replace(/\s*\(Self\)$/i, '').trim() || 'Hemanth Gowda';
        const nowFormatted = new Date().toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const newOrder = {
          id: orderId,
          orderId: orderId,
          date: nowFormatted,
          orderDate: nowFormatted,
          status: 'Confirmed',
          orderStatus: 'Confirmed',
          deliveryStatus: 'Preparing Order at Pharmacy Store',
          paymentMethod: paymentLabel,
          paymentStatus: selectedPaymentMethod === 'COD' ? 'Pay on Delivery' : 'Paid Online (Verified)',
          total: netPayable,
          totalAmount: netPayable,
          subtotal: calculatedSubtotal,
          deliveryFee: pharmacyDeliveryFee || 0,
          packagingFee: 5,
          discountAmount: totalDiscount || 0,
          city: selectedCity || selectedPharmacyStore?.city || 'Mysuru',
          locationId: pharmacyCityConfig?.cityId || 'CITY_MYSORE',
          pharmacyId: selectedPharmacyStore?.id || 'store-apollo-kuvempu',
          pharmacyName: selectedPharmacyStore?.name || (orderCartItems[0]?.storeName) || 'Apollo Pharmacy',
          pharmacyAddress: selectedPharmacyStore?.address || '#45, 8th Cross, Complex Road, Kuvempunagar, Mysore - 570023',
          pharmacyPhone: selectedPharmacyStore?.phone || '+91 821 2548901',
          userId: storedUserId,
          accountId: storedUserId,
          patientName: cleanRecipient,
          patientPhone: contactPhone,
          items: orderCartItems.map((i, idx) => ({
            id: i.id || `itm-${idx + 1}`,
            name: i.name || 'Medicine',
            brand: i.brand || i.manufacturer || 'MediUnify Certified',
            strength: i.strength || i.packSize || 'Standard',
            price: Number(i.price || 0),
            quantity: Number(i.quantity || 1),
            total: Number(i.price || 0) * Number(i.quantity || 1),
            rxRequired: Boolean(i.rxRequired || i.requiresPrescription),
            isReturnEligible: true,
            returnedQuantity: 0,
            returnStatus: 'Eligible',
          })),
          deliveryAddress: deliveryAddress.trim(),
          address: {
            name: cleanRecipient,
            phone: contactPhone,
            addressLine: deliveryAddress.trim(),
            city: selectedCity || selectedPharmacyStore?.city || 'Mysuru',
            state: 'Karnataka',
            pincode: '570023',
          },
          prescriptionAttached: uploadedDocument ? uploadedDocument.name : null,
          deliverySlot: `${selectedSlot} (${deliveryMode})`,
          expectedDelivery: 'Today (30-45 mins)',
          isReturnEligible: false,
          returnRequested: false,
          returnRequests: [],
          trackingStep: 1,
          trackingHistory: [
            { title: 'Order Placed', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), done: true },
            { title: 'Confirmed by Pharmacist', time: 'Just now', done: true },
            { title: 'Packed at Pharmacy Store', time: 'In Progress', done: false },
            { title: 'Out for Delivery', time: 'Pending', done: false },
            { title: 'Delivered', time: 'Pending', done: false },
          ],
          invoiceNumber: `INV-MU-${Date.now().toString().slice(-6)}`,
        };

        if (addOrder) await addOrder(newOrder);

        try {
          const storedStr = await AsyncStorage.getItem('@mediunify_patient_medicine_orders');
          const currentList = storedStr ? JSON.parse(storedStr) : [];
          const mergedList = [newOrder, ...currentList.filter((o) => o.id !== newOrder.id)];
          await AsyncStorage.setItem('@mediunify_patient_medicine_orders', JSON.stringify(mergedList));
          await AsyncStorage.setItem('@unnathi_pharmacy_orders', JSON.stringify(mergedList));
          await AsyncStorage.setItem('@orders', JSON.stringify(mergedList));

          // ── Save to Payment History ────────────────────────────
          try {
            await saveTransaction({
              id:          `TXN-${newOrder.id}`,
              refId:       newOrder.id,
              service:     'Pharmacy',
              serviceType: 'pharmacy',
              title:       'Medicine Order',
              facility:    newOrder.pharmacyName || 'MediUnify Pharmacy',
              rawDate:     new Date().toISOString(),
              amount:      Number(newOrder.total || newOrder.totalAmount || 0),
              mrp:         Number(newOrder.subtotal || newOrder.total || 0),
              status:      newOrder.paymentMethod === 'COD' ? 'Pending' : 'Paid',
              paymentMode: newOrder.paymentMethod || 'Online',
              gstin:       '29AABCU9603R1ZX',
              items:       (newOrder.items || []).map(i => ({
                name:  i.name,
                qty:   i.quantity || 1,
                price: i.price || 0,
              })),
            });
          } catch (_txErr) {}
          // ─────────────────────────────────────────────────

          try {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
              window.dispatchEvent(new CustomEvent('mediunify_orders_updated', { detail: newOrder }));
              if (typeof Event === 'function') {
                window.dispatchEvent(new Event('storage'));
              }
            }
          } catch (_e) {}
        } catch (e) {}

        if (clearCart) clearCart('pharmacy');
        setLocalDemoItems([]);

        // Show successful completion indicator, then cleanly unmount modals before navigation
        setTimeout(() => {
          setIsSubmittingOrder(false);
          setCheckoutModalVisible(false);

          // Allow native modal unmount before navigation to prevent UI thread lock on iOS/Android
          setTimeout(() => {
            let navigated = false;
            try {
              if (typeof navigation.replace === 'function') {
                navigation.replace('OrderSuccess', { order: newOrder });
                navigated = true;
              }
            } catch (err) {
              console.log('[Pharmacy] navigation.replace error:', err);
            }

            if (!navigated) {
              try {
                if (typeof navigation.navigate === 'function') {
                  navigation.navigate('OrderSuccess', { order: newOrder });
                  navigated = true;
                }
              } catch (err) {
                console.log('[Pharmacy] navigation.navigate error:', err);
              }
            }

            if (!navigated) {
              showAlert(
                'Order Placed Successfully!',
                `Your pharmacy order #${newOrder.id} has been confirmed.\n\nTotal Paid: ₹${newOrder.total}\nDelivery: ${newOrder.deliverySlot}`,
                [
                  {
                    text: 'Track Order',
                    onPress: () => {
                      try {
                        navigation.navigate('MyMedicineOrders');
                      } catch (e) {
                        navigation.navigate('Home');
                      }
                    },
                  },
                  {
                    text: 'Go to Home',
                    onPress: () => navigation.navigate('Home'),
                  },
                ]
              );
            }
          }, 350);
        }, 900);
      }, 1400);
    }, 1200);
  };

  const handleConfirmLabBooking = async () => {
    const isAuthed = await ensureLoggedIn('book diagnostic lab tests');
    if (!isAuthed) return;

    if (!recipientName.trim()) {
      showAlert('Name Required', 'Please enter patient name.');
      return;
    }
    if (!contactPhone.trim()) {
      showAlert('Phone Required', 'Please enter patient contact number.');
      return;
    }
    if (labCollectionMode === 'HOME' && !deliveryAddress.trim()) {
      showAlert('Address Required', 'Please enter home sample collection address.');
      return;
    }

    setIsSubmittingLabOrder(true);

    setTimeout(async () => {
      const labBookingId = `LAB-${Date.now().toString().slice(-6)}`;
      const testsSummary = labCart.map((t) => t.name).join(', ');
      const centerTitle = labCart[0]?.centerName || labCart[0]?.labName || 'Unnathi Certified Diagnostics';

      const slotValidation = await validateAndBookSlot({
        date: labBookingDate,
        time: labBookingSlot,
        serviceType: 'lab',
        providerId: centerTitle,
        bookingDetails: {
          bookingId: labBookingId,
          patientName: recipientName,
        },
      });

      if (!slotValidation.success) {
        setIsSubmittingLabOrder(false);
        showAlert('Slot Unavailable', slotValidation.message || 'This slot is no longer available. Please select another time.');
        return;
      }

      const newLabAppointment = {
        id: labBookingId,
        bookingId: labBookingId,
        title: labCart.length === 1 ? labCart[0].name : `${labCart[0].name} (+${labCart.length - 1} more)`,
        testName: testsSummary,
        tests: labCart.map((t) => ({ id: t.id, name: t.name, price: t.price })),
        doctorName: centerTitle,
        centerName: centerTitle,
        department: 'Diagnostic & Pathology',
        category: 'Lab Tests',
        serviceType: 'lab',
        type: 'Diagnostic Test',
        date: labBookingDate,
        time: labBookingSlot,
        timeSlot: labBookingSlot,
        patientName: recipientName,
        patientPhone: contactPhone,
        address: labCollectionMode === 'HOME' ? deliveryAddress.trim() : centerTitle,
        collectionMethod: labCollectionMode,
        status: 'Confirmed',
        paymentStatus: 'Paid Online',
        paymentMethod: selectedPaymentMethod,
        totalAmount: labFinalTotal,
        amount: labFinalTotal,
        bookedAt: new Date().toISOString(),
      };

      try {
        const existingAppts = await AsyncStorage.getItem('@unnathi_appointments');
        const parsedAppts = existingAppts ? JSON.parse(existingAppts) : [];
        await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify([newLabAppointment, ...parsedAppts]));

        const existingLab = await AsyncStorage.getItem('@labBookings');
        const parsedLab = existingLab ? JSON.parse(existingLab) : [];
        await AsyncStorage.setItem('@labBookings', JSON.stringify([newLabAppointment, ...parsedLab]));

        const existingMy = await AsyncStorage.getItem('@my_service_bookings');
        const parsedMy = existingMy ? JSON.parse(existingMy) : [];
        await AsyncStorage.setItem('@my_service_bookings', JSON.stringify([newLabAppointment, ...parsedMy]));

        try {
          const { syncActiveUser } = require('../../../services/dataSyncService');
          await syncActiveUser();
        } catch (e) {}
      } catch (err) {
        console.log('Error saving lab booking:', err);
      }

      if (clearCart) clearCart('lab');
      setIsSubmittingLabOrder(false);
      setLabCheckoutModalVisible(false);

      setTimeout(() => {
        showAlert(
          'Diagnostic Tests Booked',
          `Your lab tests appointment (${labBookingId}) has been successfully booked.\n\nTotal Paid: ₹${labFinalTotal.toLocaleString('en-IN')}\nMode: ${labCollectionMode === 'HOME' ? 'Home Sample Collection' : 'Lab Visit'}\nSlot: ${labBookingDate}, ${labBookingSlot}`,
          [
            {
              text: 'View My Tests',
              onPress: () => {
                try {
                  navigation.navigate('MyTests', { initialTab: 'lab' });
                } catch (e) {
                  navigation.navigate('Home');
                }
              },
            },
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      }, 350);
    }, 1200);
  };

  const handleConfirmRadiologyBooking = async () => {
    const isAuthed = await ensureLoggedIn('book radiology scans');
    if (!isAuthed) return;

    if (!radiologyPatientName.trim() || !radiologyPatientPhone.trim()) {
      showAlert('Required Fields', 'Please fill patient name and mobile number.');
      return;
    }
    if (!radiologyPreparationAcknowledged) {
      showAlert('Preparation Notice', 'Please acknowledge pre-scan preparation instructions.');
      return;
    }

    setIsSubmittingRadiologyOrder(true);

    setTimeout(async () => {
      const radiologyBookingId = `RAD-${Math.floor(100000 + Math.random() * 900000)}`;
      const centerTitle = radiologyCart[0]?.labName || radiologyCart[0]?.centerName || 'MediUnify Imaging & Scan Centre';
      const centerArea = radiologyCart[0]?.labArea || 'Kuvempunagar, Mysore';

      const slotValidation = await validateAndBookSlot({
        date: radiologyBookingDate,
        time: radiologyBookingSlot,
        serviceType: 'radiology',
        providerId: centerTitle,
        bookingDetails: {
          bookingId: radiologyBookingId,
          patientName: radiologyPatientName,
        },
      });

      if (!slotValidation.success) {
        setIsSubmittingRadiologyOrder(false);
        showAlert('Slot Unavailable', slotValidation.message || 'This slot is no longer available. Please select another time.');
        return;
      }

      const newRadiologyAppointment = {
        id: radiologyBookingId,
        bookingId: radiologyBookingId,
        category: 'Radiology Scans',
        serviceType: 'radiology',
        title: radiologyCart.map((it) => it.name).join(', '),
        centerName: centerTitle,
        centerArea: centerArea,
        items: radiologyCart,
        itemsCount: radiologyCart.length,
        date: radiologyBookingDate,
        appointmentDate: radiologyBookingDate,
        time: radiologyBookingSlot,
        timeSlot: radiologyBookingSlot,
        patientName: radiologyPatientName,
        patientAge: radiologyPatientAge,
        patientGender: radiologyPatientGender,
        patientPhone: radiologyPatientPhone,
        status: 'Confirmed',
        paymentStatus: 'Paid Online',
        paymentMethod: selectedRadiologyPaymentMethod,
        totalAmount: radiologyFinalTotal,
        amount: radiologyFinalTotal,
        bookedAt: new Date().toISOString(),
      };

      try {
        const existingAppts = await AsyncStorage.getItem('@unnathi_appointments');
        const parsedAppts = existingAppts ? JSON.parse(existingAppts) : [];
        await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify([newRadiologyAppointment, ...parsedAppts]));

        const existingRad = await AsyncStorage.getItem('@radiologyBookings');
        const parsedRad = existingRad ? JSON.parse(existingRad) : [];
        await AsyncStorage.setItem('@radiologyBookings', JSON.stringify([newRadiologyAppointment, ...parsedRad]));

        const existingMy = await AsyncStorage.getItem('@my_service_bookings');
        const parsedMy = existingMy ? JSON.parse(existingMy) : [];
        await AsyncStorage.setItem('@my_service_bookings', JSON.stringify([newRadiologyAppointment, ...parsedMy]));

        try {
          const { syncActiveUser } = require('../../../services/dataSyncService');
          await syncActiveUser();
        } catch (e) {}
      } catch (err) {
        console.log('Error saving radiology booking:', err);
      }

      if (clearCart) clearCart('radiology');
      setIsSubmittingRadiologyOrder(false);
      setRadiologyCheckoutModalVisible(false);

      setTimeout(() => {
        showAlert(
          'Radiology Scan Booked',
          `Your scan appointment (${radiologyBookingId}) has been successfully confirmed.\n\nCenter: ${centerTitle}\nTotal Paid Online: ₹${radiologyFinalTotal.toLocaleString('en-IN')}\nSlot: ${radiologyBookingDate}, ${radiologyBookingSlot}`,
          [
            {
              text: 'View My Scan Bookings',
              onPress: () => {
                try {
                  navigation.navigate('Imaging', { initialView: 'my-bookings' });
                } catch (e) {
                  try {
                    navigation.navigate('RadiologyLabs', { initialView: 'my-bookings' });
                  } catch (e2) {
                    navigation.navigate('Home');
                  }
                }
              },
            },
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      }, 350);
    }, 1200);
  };

  const [localDemoItems, setLocalDemoItems] = useState(DEFAULT_MOCKUP_ITEMS);

  // Active items in pharmacy cart
  const items = (pharmacyCart && pharmacyCart.length > 0) ? pharmacyCart : localDemoItems;
  const itemsCount = items.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const handleIncrease = (item) => {
    if (pharmacyCart && pharmacyCart.some((i) => i.id === item.id)) {
      increaseQuantity(item.id, 'pharmacy');
    } else {
      setLocalDemoItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it))
      );
    }
  };

  const handleDecrease = (item) => {
    if (pharmacyCart && pharmacyCart.some((i) => i.id === item.id)) {
      decreaseQuantity(item.id, 'pharmacy');
    } else {
      setLocalDemoItems((prev) =>
        prev
          .map((it) => (it.id === item.id ? { ...it, quantity: (it.quantity || 1) - 1 } : it))
          .filter((it) => it.quantity > 0)
      );
    }
  };

  const handleAddDealToCart = (deal) => {
    if (addToCart) {
      addToCart({
        id: deal.id,
        name: deal.name,
        price: deal.price,
        mrp: deal.mrp,
        discount: deal.discount,
        image: deal.image,
        packSize: deal.packSize,
        category: deal.category,
        brand: deal.brand,
      }, 1, 'pharmacy');
    } else {
      setLocalDemoItems((prev) => [
        ...prev,
        {
          id: deal.id,
          name: deal.name,
          price: deal.price,
          mrp: deal.mrp,
          discount: deal.discount,
          quantity: 1,
          image: deal.image,
          packSize: deal.packSize,
          category: deal.category,
          brand: deal.brand,
        },
      ]);
    }
    showAlert('Added to Cart', `${deal.name} has been added to your cart.`);
  };

  const getDealQty = (dealId) => {
    const match = items.find((it) => it.id === dealId);
    return match ? (match.quantity || 1) : 0;
  };

  const handleIncreaseDealQty = (deal) => {
    if (increaseQuantity) {
      increaseQuantity(deal.id, 'pharmacy');
    } else {
      setLocalDemoItems((prev) =>
        prev.map((it) => (it.id === deal.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it))
      );
    }
  };

  const handleDecreaseDealQty = (deal) => {
    if (decreaseQuantity) {
      decreaseQuantity(deal.id, 'pharmacy');
    } else {
      setLocalDemoItems((prev) =>
        prev
          .map((it) => (it.id === deal.id ? { ...it, quantity: (it.quantity || 1) - 1 } : it))
          .filter((it) => it.quantity > 0)
      );
    }
  };

  // Care Plan state
  const [hasCarePlan, setHasCarePlan] = useState(false);
  const [isExistingMember, setIsExistingMember] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@mediunify_membership').then((memStr) => {
      if (memStr) {
        try {
          const parsed = JSON.parse(memStr);
          if (parsed && parsed.status === 'active') {
            setHasCarePlan(true);
            setIsExistingMember(true);
          }
        } catch (e) {}
      }
    }).catch(() => {});
  }, []);

  // Organ vital package checkup upsell state
  const [includeHealthPackage, setIncludeHealthPackage] = useState(false);
  const healthPackageFee = 649;

  // Coupon modal state
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState(null);

  // Address edit modal state
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [tempAddress, setTempAddress] = useState(selectedAddress?.addressLine || 'Gurgaon');

  const handleApplyPromo = (code) => {
    const promo = code || couponInput.trim().toUpperCase();
    if (!promo) {
      setCouponMessage({ success: false, text: 'Please enter a valid coupon code.' });
      return;
    }
    const res = applyCoupon ? applyCoupon(promo) : { success: true, coupon: { code: promo, discount: 50 } };
    if (res && res.success) {
      setCouponMessage({ success: true, text: `${res.coupon?.code || promo} applied!` });
      setTimeout(() => setCouponModalVisible(false), 1200);
    } else {
      setCouponMessage({ success: false, text: 'Invalid promo code. Try MEDI20 or HEALTH50.' });
    }
  };

  const handleAddMembership = () => {
    setHasCarePlan(true);
    showAlert('Care Plan Added', 'You have unlocked extra ₹92 savings on this order.');
  };

  const handleToggleHealthPackage = () => {
    setIncludeHealthPackage(!includeHealthPackage);
  };

  // Exact calculations
  const calculatedSubtotal = pharmacySubtotal > 0
    ? pharmacySubtotal
    : items.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0);

  const calculatedMrpTotal = pharmacyMrpTotal > 0
    ? pharmacyMrpTotal
    : items.reduce((sum, it) => sum + ((parseFloat(it.mrp) || (it.price * 1.15)) * (it.quantity || 1)), 0);

  const calculatedSavings = pharmacySavings > 0
    ? pharmacySavings
    : Math.max(0, calculatedMrpTotal - calculatedSubtotal);

  const carePlanSavings = hasCarePlan ? 92 : 0;
  const carePlanCost = isExistingMember ? 0 : (hasCarePlan ? 165 : 0);
  const totalHandlingCharges = 12;
  const totalDiscount = calculatedSavings + (pharmacyDiscountAmount || 0) + carePlanSavings;
  const netPayable = Math.max(
    0,
    calculatedSubtotal +
      totalHandlingCharges +
      (includeHealthPackage ? healthPackageFee : 0) +
      carePlanCost -
      carePlanSavings -
      (pharmacyDiscountAmount || 0)
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Mobile Header (Desktop breadcrumbs removed per user request) */}
        {!isDesktop && (
          <View style={styles.mobileAppHeader}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack && navigation.canGoBack() ? navigation.goBack() : navigation.navigate(activeCartTab === 'radiology' ? (Platform.OS === 'web' ? 'Imaging' : 'RadiologyLabs') : activeCartTab === 'lab' ? 'LabTests' : 'Pharmacy'))}
              style={styles.mobileBackBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mobileHeaderTitle, isIndic && { lineHeight: 20 }]}>
                {activeCartTab === 'radiology'
                  ? t('Radiology & Scans Cart')
                  : activeCartTab === 'lab'
                  ? t('Diagnostic & Lab Cart')
                  : t('Pharmacy Cart')}
              </Text>
              <Text style={[styles.mobileHeaderSub, isIndic && { lineHeight: 16 }]}>
                {activeCartTab === 'radiology'
                  ? (radiologyCart.length > 0 ? `${radiologyCart.length} ${t('scans added')}` : t('0 scans added'))
                  : activeCartTab === 'lab'
                  ? (labCart.length > 0 ? `${labCart.length} ${t('tests added')}` : t('0 tests added'))
                  : (items.length > 0 ? `${items.length} ${t('items added')}` : t('0 items'))}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate(activeCartTab === 'radiology' ? (Platform.OS === 'web' ? 'Imaging' : 'RadiologyLabs') : activeCartTab === 'lab' ? 'LabTests' : 'Pharmacy')}
              style={styles.mobileAddMoreBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.mobileAddMoreText, isIndic && { lineHeight: 14 }]}>{t('+ Add More')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CATEGORY SWITCHER SEGMENTED TABS (100% VISIBLE ON ALL PHONES & TABLETS) */}
        <View style={styles.cartCategoryTabsWrap}>
          <View style={styles.cartCategoryTabsInner}>
            <TouchableOpacity
              style={[
                styles.cartCategoryTab,
                activeCartTab === 'pharmacy' && styles.cartCategoryTabActive,
              ]}
              onPress={() => setActiveCartTab('pharmacy')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="medkit"
                size={13}
                color={activeCartTab === 'pharmacy' ? '#007D69' : '#64748B'}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.cartCategoryTabText,
                  activeCartTab === 'pharmacy' && styles.cartCategoryTabTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {t('pharmacy.pharmacy_title', 'Pharmacy')}
              </Text>
              <View
                style={[
                  styles.cartTabBadge,
                  activeCartTab === 'pharmacy' && styles.cartTabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.cartTabBadgeText,
                    activeCartTab === 'pharmacy' && styles.cartTabBadgeTextActive,
                  ]}
                >
                  {items.length || pharmacyCartCount || pharmacyCart?.length || 0}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cartCategoryTab,
                activeCartTab === 'lab' && styles.cartCategoryTabActiveLab,
              ]}
              onPress={() => setActiveCartTab('lab')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="flask"
                size={13}
                color={activeCartTab === 'lab' ? '#007D69' : '#64748B'}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.cartCategoryTabText,
                  activeCartTab === 'lab' && styles.cartCategoryTabTextActiveLab,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {t('navigation.lab_tests', 'Lab Tests')}
              </Text>
              <View
                style={[
                  styles.cartTabBadge,
                  activeCartTab === 'lab' && styles.cartTabBadgeActiveLab,
                ]}
              >
                <Text
                  style={[
                    styles.cartTabBadgeText,
                    activeCartTab === 'lab' && styles.cartTabBadgeTextActiveLab,
                  ]}
                >
                  {labCart.length || labCartCount || 0}
                </Text>
              </View>
            </TouchableOpacity>



          </View>
        </View>

        {/* MAIN LAYOUT WRAPPER */}
        <View style={[styles.mainLayoutWrapper, !isDesktop && styles.mainLayoutWrapperMobile]}>
          {/* ============================================================
              LEFT COLUMN: CART ITEMS & DEALS SECTIONS
          ============================================================ */}
          {activeCartTab === 'radiology' ? (
            <View style={[styles.leftColumn, !isDesktop && styles.columnMobile]}>
              <View style={styles.cartItemsCard}>
                <View style={styles.cartHeaderRow}>
                  <Text style={styles.cartHeaderTitle}>
                    {radiologyCart.length > 0
                      ? `${radiologyCart.length} scan${radiologyCart.length > 1 ? 's' : ''} added`
                      : 'Radiology Cart (0 scans)'}
                  </Text>
                  {radiologyCart.length > 0 && (
                    <TouchableOpacity onPress={() => clearCart && clearCart('radiology')} activeOpacity={0.7}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF7F50' }}>Clear Radiology Cart</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.labCertifiedPillRow, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                  <Ionicons name="shield-checkmark" size={14} color="#0284C7" />
                  <Text style={[styles.labCertifiedPillText, { color: '#0369A1' }]}>
                    3.0T MRI • Low-Dose CT • NABH & NABL Accredited Diagnostic Imaging Centres
                  </Text>
                </View>

                {radiologyCart.length === 0 ? (
                  <View style={styles.emptyCartBox}>
                    <Ionicons name="radio-outline" size={54} color="#CBD5E1" />
                    <Text style={styles.emptyCartTitle}>Your Radiology Cart is empty</Text>
                    <Text style={styles.emptyCartSub}>
                      Add MRI, CT scans, Digital X-Ray, Ultrasound, 2D Echo, Mammography, or PET-CT with verified radiologist reports.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.browseProductsBtn,
                        {
                          backgroundColor: '#0284C7',
                          width: '100%',
                          maxWidth: 280,
                          justifyContent: 'center',
                          marginTop: 10,
                        },
                      ]}
                      onPress={() => navigation.navigate(Platform.OS === 'web' ? 'Imaging' : 'RadiologyLabs')}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.browseProductsBtnText}>Browse Radiology Scans</Text>
                      <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.itemsListWrap}>
                    {radiologyCart.map((item, index) => {
                      const itemPrice = Number(item.price || 0);
                      const itemMrp = Number(item.mrp || Math.round(itemPrice * 1.3));
                      const discountPct = itemMrp > itemPrice ? Math.round(((itemMrp - itemPrice) / itemMrp) * 100) : null;

                      return (
                        <View key={item.id || index} style={[styles.labItemCardContainer, { borderColor: '#E0F2FE' }]}>
                          <View style={[styles.labItemIconWrap, { backgroundColor: '#F0F9FF' }]}>
                            <Ionicons
                              name="radio-outline"
                              size={22}
                              color="#0284C7"
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <Text style={styles.labItemTitleText} numberOfLines={2}>
                                {item.name}
                              </Text>
                              <TouchableOpacity
                                onPress={() => removeFromCart && removeFromCart(item.id, 'radiology')}
                                style={styles.labRemoveItemBtn}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="trash-outline" size={16} color="#FF7F50" />
                              </TouchableOpacity>
                            </View>

                            <Text style={styles.labItemCenterText} numberOfLines={1}>
                              {item.centerName || item.labName || 'MediUnify Imaging Centre'} • {item.labArea || 'Mysuru'}
                            </Text>

                            <View style={styles.labItemBadgesRow}>
                              <View style={[styles.labBadgePill, { backgroundColor: '#EFF6FF' }]}>
                                <Ionicons name="scan-outline" size={11} color="#2563EB" />
                                <Text style={[styles.labBadgePillText, { color: '#1D4ED8' }]}>
                                  {item.modality || item.categoryLabel || item.category || 'Diagnostic Scan'}
                                </Text>
                              </View>
                              <View style={styles.labBadgePill}>
                                <Ionicons name="time-outline" size={11} color="#64748B" />
                                <Text style={styles.labBadgePillText}>
                                  Report: {item.reportTime || 'Within 4 Hours'}
                                </Text>
                              </View>
                              <View style={[styles.labBadgePill, { backgroundColor: item.fastingRequired ? '#FFFBEB' : '#F0FDF4' }]}>
                                <Ionicons name="restaurant-outline" size={11} color={item.fastingRequired ? '#D97706' : '#16A34A'} />
                                <Text style={[styles.labBadgePillText, { color: item.fastingRequired ? '#B45309' : '#15803D', fontWeight: '700' }]}>
                                  {item.fastingRequired ? 'Fasting Needed' : 'No Fasting'}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.labItemPriceRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                <Text style={[styles.labPriceVal, { color: '#0284C7' }]}>₹{itemPrice}</Text>
                                {itemMrp > itemPrice && <Text style={styles.labMrpVal}>₹{itemMrp}</Text>}
                                {discountPct && <Text style={styles.labDiscountVal}>{discountPct}% off</Text>}
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="checkmark-done-circle" size={14} color="#0284C7" />
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#0369A1' }}>Center Slot Included</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Radiology Recommended Scans Carousel */}
              <View style={styles.dealsSectionCard}>
                <View style={styles.dealsHeaderRow}>
                  <Text style={styles.dealsSectionTitle}>Recommended Radiology & Cardiac Scans</Text>
                </View>

                <View style={styles.carouselContainerWrap}>
                  <TouchableOpacity
                    style={[styles.carouselSideArrowBtn, styles.carouselLeftArrowBtn]}
                    onPress={() => scrollDeals('prev', radiologyDealsScrollRef, radiologyDealsScrollX)}
                    activeOpacity={0.85}
                    accessibilityLabel="Previous scans"
                  >
                    <Ionicons name="chevron-back" size={20} color="#0F172A" />
                  </TouchableOpacity>

                  <ScrollView
                    ref={radiologyDealsScrollRef}
                    horizontal
                    nestedScrollEnabled={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dealsScrollContainer}
                    onScroll={(e) => {
                      radiologyDealsScrollX.current = e.nativeEvent.contentOffset.x;
                    }}
                    scrollEventThrottle={16}
                    style={styles.dealsScrollView}
                  >
                    {POPULAR_RADIOLOGY_RECOMMENDED.map((scan) => {
                      const inCart = radiologyCart.some((it) => it.id === scan.id);
                      return (
                        <View key={scan.id} style={styles.dealCard}>
                          <View style={[styles.dealImageWrap, { backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="radio" size={32} color="#0284C7" />
                          </View>
                          <Text style={styles.dealNameText} numberOfLines={2}>{scan.name}</Text>
                          <Text style={styles.dealPackSize} numberOfLines={1}>{scan.centerName}</Text>
                          <View style={styles.dealPriceRow}>
                            <Text style={styles.dealPriceText}>₹{scan.price}</Text>
                            {scan.mrp && <Text style={styles.dealMrpText}>₹{scan.mrp}</Text>}
                          </View>
                          <TouchableOpacity
                            style={[styles.dealAddBtn, inCart && { backgroundColor: '#0284C7' }]}
                            onPress={() => {
                              if (inCart) {
                                removeFromCart(scan.id, 'radiology');
                              } else {
                                addToCart({
                                  id: scan.id,
                                  name: scan.name,
                                  price: scan.price,
                                  mrp: scan.mrp,
                                  category: 'Radiology',
                                  categoryLabel: scan.category,
                                  modality: scan.modality,
                                  centerName: scan.centerName,
                                  labName: scan.centerName,
                                  reportTime: scan.reportTime,
                                  itemType: 'radiology',
                                }, 1, 'radiology');
                                showAlert('Added to Radiology Cart', `${scan.name} added to your radiology cart.`);
                              }
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.dealAddBtnText, inCart && { color: '#FFFFFF' }]}>
                              {inCart ? 'In Cart' : '+ Add Scan'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    style={[styles.carouselSideArrowBtn, styles.carouselRightArrowBtn]}
                    onPress={() => scrollDeals('next', radiologyDealsScrollRef, radiologyDealsScrollX)}
                    activeOpacity={0.85}
                    accessibilityLabel="Next scans"
                  >
                    <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : activeCartTab === 'lab' ? (
            <View style={[styles.leftColumn, !isDesktop && styles.columnMobile]}>
              <View style={styles.cartItemsCard}>
                <View style={styles.cartHeaderRow}>
                  <Text style={styles.cartHeaderTitle}>
                    {labCart.length > 0 ? `${labCart.length} diagnostic test${labCart.length > 1 ? 's' : ''} added` : 'Diagnostic Cart (0 tests)'}
                  </Text>
                  {labCart.length > 0 && (
                    <TouchableOpacity onPress={() => clearCart && clearCart('lab')} activeOpacity={0.7}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF7F50' }}>Clear Lab Cart</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.labCertifiedPillRow}>
                  <Ionicons name="shield-checkmark" size={14} color="#00B894" />
                  <Text style={styles.labCertifiedPillText}>
                    100% NABL & ICMR Certified Labs • Free Doorstep Collection • Digital Reports
                  </Text>
                </View>

                {labCart.length === 0 ? (
                  <View style={styles.emptyCartBox}>
                    <Ionicons name="flask-outline" size={54} color="#CBD5E1" />
                    <Text style={styles.emptyCartTitle}>Your Diagnostic Cart is empty</Text>
                    <Text style={styles.emptyCartSub}>
                      Add pathology tests, full body checkup packages, or radiology imaging scans.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.browseProductsBtn,
                        {
                          backgroundColor: '#00B894',
                          width: '100%',
                          maxWidth: 280,
                          justifyContent: 'center',
                          marginTop: 10,
                        },
                      ]}
                      onPress={() => navigation.navigate('LabTests')}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.browseProductsBtnText}>Browse Lab Tests</Text>
                      <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.itemsListWrap}>
                    {labCart.map((item, index) => {
                      const itemPrice = Number(item.price || 0);
                      const itemMrp = Number(item.mrp || Math.round(itemPrice * 1.25));
                      const discountPct = itemMrp > itemPrice ? Math.round(((itemMrp - itemPrice) / itemMrp) * 100) : null;
                      const isPkg = Boolean(item.isPackage || (item.testsCount && item.testsCount > 1) || (Array.isArray(item.tests) && item.tests.length > 1));

                      return (
                        <TouchableOpacity
                          key={item.id || index}
                          style={[
                            styles.labItemCardContainer,
                            { cursor: 'pointer' },
                          ]}
                          onPress={() => setSelectedLabItemDetails(enrichLabItemDetails(item))}
                          activeOpacity={0.88}
                          accessibilityRole="button"
                          accessibilityLabel={`View full details for ${item.name}`}
                        >
                          <View style={[styles.labItemIconWrap, isPkg && { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons
                              name={isPkg ? 'shield-checkmark' : item.category === 'Radiology' || item.modality ? 'scan-outline' : 'flask'}
                              size={22}
                              color="#00B894"
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text style={styles.labItemTitleText} numberOfLines={2}>
                                    {item.name}
                                  </Text>
                                  {isPkg && (
                                    <View style={styles.labPackageTypePill}>
                                      <Text style={styles.labPackageTypePillText}>PACKAGE</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              <TouchableOpacity
                                onPress={(e) => {
                                  if (e?.stopPropagation) e.stopPropagation();
                                  removeFromCart && removeFromCart(item.id, 'lab');
                                }}
                                style={styles.labRemoveItemBtn}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${item.name}`}
                              >
                                <Ionicons name="trash-outline" size={16} color="#FF7F50" />
                              </TouchableOpacity>
                            </View>

                            <Text style={styles.labItemCenterText} numberOfLines={1}>
                              {item.centerName || item.labName || 'Unnathi Diagnostic Partner'}
                            </Text>

                            <View style={styles.labItemBadgesRow}>
                              <View style={styles.labBadgePill}>
                                <Ionicons name={isPkg ? 'fitness-outline' : 'water-outline'} size={11} color="#0284C7" />
                                <Text style={styles.labBadgePillText}>
                                  {item.sampleType || item.categoryLabel || (isPkg ? 'Full Body Tests' : 'Sample Test')}
                                </Text>
                              </View>
                              <View style={styles.labBadgePill}>
                                <Ionicons name="time-outline" size={11} color="#64748B" />
                                <Text style={styles.labBadgePillText}>
                                  TAT: {item.reportTime || item.tat || item.reportTAT || 'Within 24 hrs'}
                                </Text>
                              </View>
                              <View style={[styles.labBadgePill, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="home-outline" size={11} color="#00B894" />
                                <Text style={[styles.labBadgePillText, { color: '#00B894', fontWeight: '700' }]}>
                                  {item.homeSample !== false ? 'Home Collection' : 'Lab Visit'}
                                </Text>
                              </View>
                            </View>

                            <View style={[styles.labItemPriceRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                <Text style={styles.labPriceVal}>₹{itemPrice}</Text>
                                {itemMrp > itemPrice && <Text style={styles.labMrpVal}>₹{itemMrp}</Text>}
                                {discountPct && <Text style={styles.labDiscountVal}>{discountPct}% off</Text>}
                              </View>

                              <View style={styles.labDetailsActionPill}>
                                <Ionicons name="information-circle-outline" size={13} color="#007D69" />
                                <Text style={styles.labDetailsActionPillText}>View Details</Text>
                                <Ionicons name="chevron-forward" size={12} color="#007D69" />
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Lab Packages Carousel Upsell */}
              {LAB_PACKAGES && LAB_PACKAGES.length > 0 && (
                <View style={styles.dealsSectionCard}>
                  <View style={styles.dealsHeaderRow}>
                    <Text style={styles.dealsSectionTitle}>Recommended Diagnostic Health Packages</Text>
                  </View>

                  <View style={styles.carouselContainerWrap}>
                    <TouchableOpacity
                      style={[styles.carouselSideArrowBtn, styles.carouselLeftArrowBtn]}
                      onPress={() => scrollDeals('prev', labDealsScrollRef, labDealsScrollX)}
                      activeOpacity={0.85}
                      accessibilityLabel="Previous packages"
                    >
                      <Ionicons name="chevron-back" size={18} color="#00BB95" />
                    </TouchableOpacity>

                    <ScrollView
                      ref={labDealsScrollRef}
                      horizontal
                      nestedScrollEnabled={true}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.dealsScrollContainer}
                      onScroll={(e) => {
                        labDealsScrollX.current = e.nativeEvent.contentOffset.x;
                      }}
                      scrollEventThrottle={16}
                      style={styles.dealsScrollView}
                    >
                      {LAB_PACKAGES.map((pkg) => {
                        const inCart = labCart.some((it) => it.id === pkg.id);
                        const catLower = (pkg.category || '').toLowerCase();
                        let catBg = '#EFF6FF';
                        let catBorder = '#DBEAFE';
                        let catColor = '#1D4ED8';
                        let catLabel = 'Executive Health';

                        if (catLower.includes('body') || catLower.includes('check')) {
                          catBg = '#ECFDF5'; catBorder = '#A7F3D0'; catColor = '#00BB95'; catLabel = 'Full Body';
                        } else if (catLower.includes('diabet')) {
                          catBg = '#FFFBEB'; catBorder = '#FDE68A'; catColor = '#B45309'; catLabel = 'Diabetes';
                        } else if (catLower.includes('cardiac') || catLower.includes('heart')) {
                          catBg = '#FEF2F2'; catBorder = '#FEE2E2'; catColor = '#DC2626'; catLabel = 'Heart Health';
                        }

                        const isFastingRequired = (pkg.preparationSummary || '').toLowerCase().includes('fasting');
                        const tatLabel = (pkg.tatSummary && (pkg.tatSummary.includes('6–8') || pkg.tatSummary.includes('6-8')))
                          ? 'Reports in 6–8 hrs'
                          : 'Reports in 24 hrs';

                        return (
                          <View key={pkg.id} style={styles.labPkgCard}>
                            {/* Top Badges Row: Category Pill & TAT Badge */}
                            <View style={styles.labPkgCardHeaderRow}>
                              <View style={[styles.labPkgCategoryBadge, { backgroundColor: catBg, borderColor: catBorder }]}>
                                <Text style={[styles.labPkgCategoryText, { color: catColor }]} numberOfLines={1}>
                                  {catLabel}
                                </Text>
                              </View>
                              <View style={styles.labPkgTatBadge}>
                                <Ionicons name="flash" size={11} color="#00BB95" style={{ marginRight: 3 }} />
                                <Text style={styles.labPkgTatText} numberOfLines={1}>
                                  {tatLabel}
                                </Text>
                              </View>
                            </View>

                            {/* Package Title */}
                            <TouchableOpacity
                              onPress={() => setSelectedLabItemDetails({ ...pkg, isPackage: true, centerName: 'Unnathi Comprehensive Diagnostic Care' })}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.labPkgNameText} numberOfLines={2}>
                                {pkg.name}
                              </Text>
                            </TouchableOpacity>

                            {/* Clinical Key Details */}
                            <View style={styles.labPkgDetailsRow}>
                              <View style={styles.labPkgDetailItem}>
                                <Ionicons name="cube-outline" size={13} color="#00BB95" style={{ marginRight: 5 }} />
                                <Text style={styles.labPkgDetailText} numberOfLines={1}>
                                  {pkg.includedCount || pkg.testsCount || 10} Tests Included
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.labPkgDetailItem,
                                  isFastingRequired
                                    ? { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }
                                    : { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
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
                                    styles.labPkgDetailText,
                                    { color: isFastingRequired ? '#B45309' : '#15803D', fontWeight: '700' },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {isFastingRequired ? 'Fasting required' : 'No fasting required'}
                                </Text>
                              </View>
                            </View>

                            {/* Footer: Price Row & Action Buttons */}
                            <View style={styles.labPkgFooterWrap}>
                              <View style={styles.labPkgPriceRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                  <Text style={styles.labPkgPrice}>₹{pkg.price}</Text>
                                  {pkg.mrp && <Text style={styles.labPkgMrp}>₹{pkg.mrp}</Text>}
                                </View>
                                {pkg.discount && (
                                  <View style={styles.labPkgDiscountBadge}>
                                    <Text style={styles.labPkgDiscountText}>{pkg.discount}</Text>
                                  </View>
                                )}
                              </View>

                              <View style={styles.labPkgActionRow}>
                                <TouchableOpacity
                                  style={styles.labPkgDetailsBtn}
                                  onPress={() => setSelectedLabItemDetails({ ...pkg, isPackage: true, centerName: 'Unnathi Comprehensive Diagnostic Care' })}
                                  activeOpacity={0.8}
                                  accessibilityRole="button"
                                  accessibilityLabel="Package Details"
                                >
                                  <Ionicons name="information-circle-outline" size={14} color="#475569" style={{ marginRight: 4 }} />
                                  <Text style={styles.labPkgDetailsBtnText}>Details</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.labPkgCartBtn, inCart && styles.labPkgCartBtnActive]}
                                  onPress={() => {
                                    if (inCart) {
                                      removeFromCart(pkg.id, 'lab');
                                    } else {
                                      addToCart({
                                        id: pkg.id,
                                        name: pkg.name,
                                        price: pkg.price,
                                        mrp: pkg.mrp,
                                        centerName: 'Unnathi Comprehensive Diagnostic Care',
                                        sampleType: `${pkg.includedCount || pkg.testsCount || 10} Parameters`,
                                        homeSample: true,
                                      }, 1, 'lab');
                                      showAlert('Added to Cart', `${pkg.name} added to cart.`);
                                    }
                                  }}
                                  activeOpacity={0.85}
                                  accessibilityRole="button"
                                  accessibilityLabel={inCart ? "In Cart" : "Add to Cart"}
                                >
                                  <Ionicons
                                    name={inCart ? 'checkmark-circle' : 'cart-outline'}
                                    size={15}
                                    color={inCart ? '#FFFFFF' : '#00BB95'}
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text style={[styles.labPkgCartBtnText, inCart && styles.labPkgCartBtnTextActive]}>
                                    {inCart ? 'In Cart' : '+ Add'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>

                    <TouchableOpacity
                      style={[styles.carouselSideArrowBtn, styles.carouselRightArrowBtn]}
                      onPress={() => scrollDeals('next', labDealsScrollRef, labDealsScrollX)}
                      activeOpacity={0.85}
                      accessibilityLabel="Next packages"
                    >
                      <Ionicons name="chevron-forward" size={18} color="#00BB95" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.leftColumn, !isDesktop && styles.columnMobile]}>
            {/* 1. CART ITEMS SECTION */}
            <View style={styles.cartItemsCard}>
              <View style={styles.cartHeaderRow}>
                <Text style={styles.cartHeaderTitle}>
                  {items.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''} added` : '0 items added'}
                </Text>
              </View>

              <Text style={styles.prescriptionNote}>Items not requiring prescription</Text>

              {items.length === 0 ? (
                <View style={styles.emptyCartBox}>
                  <Ionicons name="cart-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
                  <Text style={styles.emptyCartSub}>Add medicines, healthcare devices, and wellness products.</Text>
                  <TouchableOpacity
                    style={styles.browseProductsBtn}
                    onPress={() => navigation.navigate('Pharmacy')}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.browseProductsBtnText}>Browse Medicines</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.itemsListWrap}>
                  {items.map((item, index) => {
                    const price = item.price || 97;
                    const mrp = item.mrp || (price * 1.15).toFixed(1);
                    const qty = item.quantity || 1;
                    const discountText = item.discount || '8% off';

                    return (
                      <View key={item.id || index} style={styles.itemRowContainer}>
                        {/* Product Thumbnail */}
                        <View style={styles.itemImageWrap}>
                          <Image
                            source={getCartItemImage(item)}
                            style={styles.itemImage}
                            resizeMode="contain"
                          />
                        </View>

                        {/* Product Details & Actions */}
                        <View style={styles.itemDetailsCol}>
                          {/* Full Product Name */}
                          <Text style={styles.itemNameText} numberOfLines={3}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemSubtitleText}>
                            {item.packSize || item.category || 'Packet of 100 gm soap'}
                          </Text>

                          {/* Bottom Row: Price & Quantity Stepper */}
                          <View style={styles.itemBottomRow}>
                            <View style={styles.itemPriceRow}>
                              <Text style={styles.itemPriceVal}>₹{price}</Text>
                              {mrp && <Text style={styles.itemMrpVal}>₹{mrp}</Text>}
                              {discountText && (
                                <View style={styles.itemDiscountBadge}>
                                  <Text style={styles.itemDiscountVal}>{discountText}</Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.qtySelectorBox}>
                              <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => handleDecrease(item)}
                                activeOpacity={0.7}
                              >
                                {(item.quantity || 1) > 1 ? (
                                  <Text style={styles.qtyMinusText}>−</Text>
                                ) : (
                                  <Ionicons name="trash-outline" size={14} color="#FF7F50" />
                                )}
                              </TouchableOpacity>

                              <Text style={styles.qtyValueText}>{item.quantity || 1}</Text>

                              <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => handleIncrease(item)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.qtyPlusText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 2. TOP DEALS SECTION (Matching "Sanofi top deals") */}
            <View style={styles.dealsSectionCard}>
              <View style={styles.dealsHeaderRow}>
                <Text style={styles.dealsSectionTitle}>Sanofi top deals</Text>
              </View>

              <View style={styles.carouselContainerWrap}>
                {/* Left Floating Arrow Button */}
                <TouchableOpacity
                  style={[styles.carouselSideArrowBtn, styles.carouselLeftArrowBtn]}
                  onPress={() => scrollDeals('prev', topDealsScrollRef, topDealsScrollX)}
                  activeOpacity={0.85}
                  accessibilityLabel="Scroll previous deals"
                >
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <ScrollView
                  ref={topDealsScrollRef}
                  horizontal
                  nestedScrollEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dealsScrollContainer}
                  onScroll={(e) => {
                    topDealsScrollX.current = e.nativeEvent.contentOffset.x;
                  }}
                  scrollEventThrottle={16}
                  style={styles.dealsScrollView}
                >
                  {TOP_DEALS.map((deal) => {
                    const dealImg = getDealImage(deal);
                    const dealQty = getDealQty(deal.id);
                    return (
                      <TouchableOpacity
                        key={deal.id}
                        style={styles.dealCard}
                        onPress={() => handleSelectProduct(deal)}
                        activeOpacity={0.92}
                      >
                        {/* Discount Badge */}
                        <View style={styles.pharmacyBadge}>
                          <Text style={styles.pharmacyBadgeText}>{deal.discount || '12% OFF'}</Text>
                        </View>

                        {/* Product Image */}
                        <View style={styles.pharmacyCardImgWrap}>
                          <Image
                            source={typeof dealImg === 'number' ? dealImg : { uri: dealImg }}
                            style={styles.pharmacyCardImg}
                            resizeMode="contain"
                          />
                        </View>

                        {/* Card Content matching Pharmacy page */}
                        <View style={styles.pharmacyCardBody}>
                          <View style={styles.pharmacyCardContent}>
                            <Text style={styles.pharmacyCat} numberOfLines={1}>
                              {(deal.brand || 'SANOFI').toUpperCase()} • {(deal.category || 'HEALTH').toUpperCase()}
                            </Text>

                            <Text style={styles.pharmacyName} numberOfLines={2} ellipsizeMode="tail">
                              {deal.name}
                            </Text>

                            <Text style={styles.pharmacyBrand} numberOfLines={1}>
                              {deal.packSize || deal.eta}
                            </Text>

                            {/* Compact Star Rating */}
                            <View style={styles.pharmacyRatingRow}>
                              <Ionicons name="star" size={12} color="#FF9F43" />
                              <Text style={styles.ratingNumberText}>{deal.rating || 4.5}</Text>
                              <Text style={styles.reviewsCountText}>({deal.reviews || '850'})</Text>
                            </View>
                          </View>

                          {/* Footer: Price & Add to Cart Action */}
                          <View style={styles.pharmacyCardFooter}>
                            <View style={styles.pharmacyPriceRow}>
                              <Text style={styles.pharmacyPrice}>₹{deal.price}</Text>
                              {Boolean(deal.mrp) && (
                                <Text style={styles.pharmacyMrp}>MRP ₹{deal.mrp}</Text>
                              )}
                            </View>

                            {/* Add to Cart or Stepper */}
                            {dealQty > 0 ? (
                              <View style={styles.quantityStepper}>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    handleDecreaseDealQty(deal);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  {dealQty === 1 ? (
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  ) : (
                                    <Ionicons name="remove" size={14} color="#00B894" />
                                  )}
                                </TouchableOpacity>
                                <Text style={styles.stepperQuantity}>{dealQty}</Text>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    handleIncreaseDealQty(deal);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="add" size={14} color="#00B894" />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.addToCartButton}
                                onPress={(e) => {
                                  e?.stopPropagation?.();
                                  handleAddDealToCart(deal);
                                }}
                                activeOpacity={0.88}
                              >
                                <Ionicons name="bag-add" size={15} color="#FFFFFF" />
                                <Text style={styles.addToCartText}>Add to Cart</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Right Floating Arrow Button */}
                <TouchableOpacity
                  style={[styles.carouselSideArrowBtn, styles.carouselRightArrowBtn]}
                  onPress={() => scrollDeals('next', topDealsScrollRef, topDealsScrollX)}
                  activeOpacity={0.85}
                  accessibilityLabel="Scroll next deals"
                >
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. LAST MINUTE BUYS SECTION */}
            <View style={styles.dealsSectionCard}>
              <View style={styles.dealsHeaderRow}>
                <Text style={styles.dealsSectionTitle}>Last minute buys</Text>
              </View>

              <View style={styles.carouselContainerWrap}>
                {/* Left Floating Arrow Button */}
                <TouchableOpacity
                  style={[styles.carouselSideArrowBtn, styles.carouselLeftArrowBtn]}
                  onPress={() => scrollDeals('prev', lastMinuteScrollRef, lastMinuteScrollX)}
                  activeOpacity={0.85}
                  accessibilityLabel="Previous last minute buys"
                >
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <ScrollView
                  ref={lastMinuteScrollRef}
                  horizontal
                  nestedScrollEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dealsScrollContainer}
                  onScroll={(e) => {
                    lastMinuteScrollX.current = e.nativeEvent.contentOffset.x;
                  }}
                  scrollEventThrottle={16}
                  style={styles.dealsScrollView}
                >
                  {LAST_MINUTE_BUYS.map((buy) => {
                    const buyImg = getDealImage(buy);
                    const buyQty = getDealQty(buy.id);
                    return (
                      <TouchableOpacity
                        key={buy.id}
                        style={styles.dealCard}
                        onPress={() => handleSelectProduct(buy)}
                        activeOpacity={0.92}
                      >
                        {/* Discount Badge */}
                        <View style={styles.pharmacyBadge}>
                          <Text style={styles.pharmacyBadgeText}>{buy.discount || '10% OFF'}</Text>
                        </View>

                        {/* Product Image */}
                        <View style={styles.pharmacyCardImgWrap}>
                          <Image
                            source={typeof buyImg === 'number' ? buyImg : { uri: buyImg }}
                            style={styles.pharmacyCardImg}
                            resizeMode="contain"
                          />
                        </View>

                        {/* Card Content matching Pharmacy page */}
                        <View style={styles.pharmacyCardBody}>
                          <View style={styles.pharmacyCardContent}>
                            <Text style={styles.pharmacyCat} numberOfLines={1}>
                              {(buy.brand || 'ESSENTIALS').toUpperCase()} • {(buy.category || 'QUICK BUY').toUpperCase()}
                            </Text>

                            <Text style={styles.pharmacyName} numberOfLines={2} ellipsizeMode="tail">
                              {buy.name}
                            </Text>

                            <Text style={styles.pharmacyBrand} numberOfLines={1}>
                              {buy.packSize || buy.eta}
                            </Text>

                            {/* Compact Star Rating */}
                            <View style={styles.pharmacyRatingRow}>
                              <Ionicons name="star" size={12} color="#FF9F43" />
                              <Text style={styles.ratingNumberText}>{buy.rating || 4.7}</Text>
                              <Text style={styles.reviewsCountText}>(Quick Delivery)</Text>
                            </View>
                          </View>

                          {/* Footer: Price & Add to Cart Action */}
                          <View style={styles.pharmacyCardFooter}>
                            <View style={styles.pharmacyPriceRow}>
                              <Text style={styles.pharmacyPrice}>₹{buy.price}</Text>
                              {Boolean(buy.mrp) && (
                                <Text style={styles.pharmacyMrp}>MRP ₹{buy.mrp}</Text>
                              )}
                            </View>

                            {/* Add to Cart or Stepper */}
                            {buyQty > 0 ? (
                              <View style={styles.quantityStepper}>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    handleDecreaseDealQty(buy);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  {buyQty === 1 ? (
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  ) : (
                                    <Ionicons name="remove" size={14} color="#00B894" />
                                  )}
                                </TouchableOpacity>
                                <Text style={styles.stepperQuantity}>{buyQty}</Text>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={(e) => {
                                    e?.stopPropagation?.();
                                    handleIncreaseDealQty(buy);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="add" size={14} color="#00B894" />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.addToCartButton}
                                onPress={(e) => {
                                  e?.stopPropagation?.();
                                  handleAddDealToCart(buy);
                                }}
                                activeOpacity={0.88}
                              >
                                <Ionicons name="bag-add" size={15} color="#FFFFFF" />
                                <Text style={styles.addToCartText}>Add to Cart</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Right Floating Arrow Button */}
                <TouchableOpacity
                  style={[styles.carouselSideArrowBtn, styles.carouselRightArrowBtn]}
                  onPress={() => scrollDeals('next', lastMinuteScrollRef, lastMinuteScrollX)}
                  activeOpacity={0.85}
                  accessibilityLabel="Next last minute buys"
                >
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================
            RIGHT COLUMN: CARE PLAN, COUPON, VITAL UPSELL, BILL SUMMARY
        ============================================================ */}
        {activeCartTab === 'radiology' ? (
          <View style={[styles.rightColumn, !isDesktop && styles.rightColumnMobile]}>
            {/* Radiology Centre Details Card */}
            <View style={styles.carePlanCard}>
              <View style={[styles.carePlanBadge, { backgroundColor: '#0284C7' }]}>
                <Text style={styles.carePlanBadgeText}>Accredited Imaging</Text>
              </View>
              <Text style={styles.carePlanHeading}>High-Precision Diagnostic Imaging</Text>
              <Text style={styles.carePlanSub}>
                Certified Radiologist verification & digital DICOM image viewer included
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Ionicons name="shield-checkmark" size={14} color="#0284C7" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>
                  Zero Waiting Slot Booking at Partner Hospital Labs
                </Text>
              </View>
            </View>

            {/* Radiology Bill Summary */}
            <View style={styles.billSummaryCard}>
              <Text style={styles.billSummaryTitle}>Radiology Scans Bill Summary</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Scans Total (MRP)</Text>
                <Text style={styles.billValue}>
                  ₹{radiologyMrpTotal > 0 ? radiologyMrpTotal : Math.round(radiologyFinalTotal * 1.3)}
                </Text>
              </View>

              {radiologySavings > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Diagnostic Centre Discount</Text>
                  <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '700' }]}>
                    -₹{radiologySavings}
                  </Text>
                </View>
              )}

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Radiologist Consultation & Report</Text>
                <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '700' }]}>FREE</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Direct Slot Reservation</Text>
                <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '700' }]}>FREE</Text>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.billTotalRow}>
                <Text style={styles.toPayLabel}>Total Payable</Text>
                <Text style={[styles.toPayVal, { color: '#0284C7' }]}>₹{radiologyFinalTotal}</Text>
              </View>
            </View>

            {/* Radiology Continue Checkout Button */}
            <TouchableOpacity
              style={[
                styles.continueBtn,
                { backgroundColor: '#0284C7' },
                radiologyCart.length === 0 && { opacity: 0.5 },
              ]}
              onPress={async () => {
                if (radiologyCart.length === 0) {
                  showAlert('Cart is Empty', 'Please add radiology scans to your cart first.');
                  return;
                }
                const isAuthed = await ensureLoggedIn('book radiology scans');
                if (!isAuthed) return;
                const firstItem = radiologyCart[0];
                navigation.navigate('RadiologyBooking', {
                  selectedTests: radiologyCart,
                  lab: firstItem?.labId ? {
                    id: firstItem.labId,
                    name: firstItem.labName || 'Diagnostic Center',
                    area: firstItem.labArea || 'Mysore',
                    address: firstItem.labAddress || '',
                    phone: firstItem.labPhone || '',
                  } : null,
                });
              }}
              disabled={radiologyCart.length === 0}
              activeOpacity={0.88}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.continueBtnText}>
                Fill Booking Details & Pay ({radiologyCart.length}) • ₹{radiologyFinalTotal}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        ) : activeCartTab === 'lab' ? (
          <View style={[styles.rightColumn, !isDesktop && styles.rightColumnMobile]}>
            {/* Collection mode preference card */}
            <View style={styles.vitalOrgansCard}>
              <View style={styles.vitalHeaderRow}>
                <Text style={styles.vitalHeaderTitle}>Sample Collection Preference</Text>
                <Ionicons name="information-circle-outline" size={16} color="#64748B" />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.labModeSelectBtn,
                    labCollectionMode === 'HOME' && styles.labModeSelectBtnActive,
                  ]}
                  onPress={() => setLabCollectionMode('HOME')}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="home"
                    size={16}
                    color={labCollectionMode === 'HOME' ? '#00B894' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.labModeSelectBtnText,
                      labCollectionMode === 'HOME' && styles.labModeSelectBtnTextActive,
                    ]}
                  >
                    Doorstep Collection
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.labModeSelectBtn,
                    labCollectionMode === 'CENTRE' && styles.labModeSelectBtnActive,
                  ]}
                  onPress={() => setLabCollectionMode('CENTRE')}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="business"
                    size={16}
                    color={labCollectionMode === 'CENTRE' ? '#00B894' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.labModeSelectBtnText,
                      labCollectionMode === 'CENTRE' && styles.labModeSelectBtnTextActive,
                    ]}
                  >
                    Lab Visit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Lab Bill Summary */}
            <View style={styles.billSummaryCard}>
              <Text style={styles.billSummaryTitle}>Diagnostic Bill Summary</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Tests Total (MRP)</Text>
                <Text style={styles.billValue}>
                  ₹{labMrpTotal > 0 ? labMrpTotal : Math.round(labFinalTotal * 1.25)}
                </Text>
              </View>

              {labSavings > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Partner Discount</Text>
                  <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '700' }]}>
                    -₹{labSavings}
                  </Text>
                </View>
              )}

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Home Sample Collection</Text>
                <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '700' }]}>FREE</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Verified Digital Reports</Text>
                <Text style={[styles.billValue, { color: '#16A34A', fontWeight: '700' }]}>FREE</Text>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.billTotalRow}>
                <Text style={styles.toPayLabel}>Total Payable</Text>
                <Text style={[styles.toPayVal, { color: '#00B894' }]}>₹{labFinalTotal}</Text>
              </View>
            </View>

            {/* Lab Continue Checkout Button */}
            <TouchableOpacity
              style={[
                styles.continueBtn,
                { backgroundColor: '#00B894' },
                labCart.length === 0 && { opacity: 0.5 },
              ]}
              onPress={async () => {
                if (labCart.length === 0) {
                  showAlert('Cart is Empty', 'Please add diagnostic tests to your cart first.');
                  return;
                }
                const isAuthed = await ensureLoggedIn('schedule lab tests');
                if (!isAuthed) return;
                setLabCheckoutModalVisible(true);
              }}
              disabled={labCart.length === 0}
              activeOpacity={0.88}
            >
              <Text style={styles.continueBtnText}>
                Schedule & Book Tests ({labCart.length}) • ₹{labFinalTotal}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.rightColumn, !isDesktop && styles.rightColumnMobile]}>
            {/* 1. CARE PLAN / VIP MEMBERSHIP CARD */}
            <View style={styles.carePlanCard}>
              <View style={[styles.carePlanBadge, isExistingMember && { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.carePlanBadgeText, isExistingMember && { color: '#15803D' }]}>
                  {isExistingMember ? 'Membership Active' : 'Care Plan'}
                </Text>
              </View>

              <Text style={styles.carePlanHeading}>
                {isExistingMember
                  ? 'VIP Membership savings applied (-₹92)'
                  : 'You can save extra ₹92 on this order'}
              </Text>
              <Text style={styles.carePlanSub}>
                {isExistingMember
                  ? 'Your exclusive member discount is automatically included in this order'
                  : 'Become a careplan member'}
              </Text>
              {!isExistingMember && (
                <Text style={styles.carePlanPriceText}>
                  3 months membership for only <Text style={{ fontWeight: '800', color: '#0F172A' }}>₹165</Text>{' '}
                  <Text style={styles.carePlanMrp}>₹549</Text> <Text style={styles.carePlanDiscount}>70% off</Text>
                </Text>
              )}

              <View style={styles.carePlanActionsRow}>
                <TouchableOpacity
                  style={styles.knowMoreBtn}
                  onPress={() => navigation.navigate('Membership')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.knowMoreText}>View Perks</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addMembershipBtn, hasCarePlan && { backgroundColor: '#10B981' }]}
                  onPress={isExistingMember ? () => navigation.navigate('Membership') : handleAddMembership}
                  activeOpacity={0.88}
                >
                  <Text style={styles.addMembershipBtnText}>
                    {isExistingMember ? 'Member ✓' : (hasCarePlan ? 'Added' : 'Add membership')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. APPLY COUPON CARD */}
            <TouchableOpacity
              style={styles.couponCard}
              onPress={() => setCouponModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.couponCardLeft}>
                <View style={styles.couponIconBox}>
                  <Ionicons name="pricetag" size={16} color="#00C2CB" />
                </View>
                <Text style={styles.couponCardText}>
                  {appliedCoupon ? `Applied: ${appliedCoupon.code} (-₹${appliedCoupon.discount})` : 'Apply coupon'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>

            {/* 3. HEALTH CHECKUP UPSELL ("Check the health of your vital organs") */}
            <View style={styles.vitalOrgansCard}>
              <View style={styles.vitalHeaderRow}>
                <Text style={styles.vitalHeaderTitle}>Check the health of your vital organs</Text>
                <Ionicons name="information-circle-outline" size={16} color="#64748B" />
              </View>

              <TouchableOpacity
                style={styles.vitalCheckboxRow}
                onPress={handleToggleHealthPackage}
                activeOpacity={0.85}
              >
                <View style={[styles.customCheckbox, includeHealthPackage && styles.customCheckboxChecked]}>
                  {includeHealthPackage && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.vitalPackageTitle}>
                  Book Good Health Silver Package for just ₹649
                </Text>
              </TouchableOpacity>

              <Text style={styles.vitalPackageDesc}>
                Get the tests done easily from your home. This package will help you in identifying potential disorders and deficiencies at an early stage.
              </Text>
              <Text style={styles.vitalPackageSubText}>Pay later on home sample collection</Text>
            </View>

            {/* 4. BILL SUMMARY CARD */}
            <View style={styles.billSummaryCard}>
              <Text style={styles.billSummaryTitle}>Bill summary</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item total (MRP)</Text>
                <Text style={styles.billValue}>₹{calculatedMrpTotal.toFixed(1)}</Text>
              </View>

              <View style={styles.billRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.billLabel}>Handling charges</Text>
                  <Ionicons name="help-circle-outline" size={13} color="#94A3B8" />
                </View>
                <Text style={styles.billValue}>₹{totalHandlingCharges}</Text>
              </View>

              {totalDiscount > 0 && (
                <View style={styles.billRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.billLabel}>Total discount</Text>
                    <Ionicons name="help-circle-outline" size={13} color="#94A3B8" />
                  </View>
                  <Text style={[styles.billValue, { color: '#7BC96F', fontWeight: '700' }]}>
                    -₹{totalDiscount.toFixed(1)}
                  </Text>
                </View>
              )}

              {includeHealthPackage && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Good Health Package</Text>
                  <Text style={styles.billValue}>₹{healthPackageFee}</Text>
                </View>
              )}

              {hasCarePlan && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Care Plan Membership (3 Mo)</Text>
                  <Text style={styles.billValue}>₹165</Text>
                </View>
              )}

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Shipping fee</Text>
                <Text style={styles.billValue}>FREE</Text>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.billTotalRow}>
                <Text style={styles.toPayLabel}>To be paid</Text>
                <Text style={styles.toPayVal}>₹{netPayable.toFixed(0)}</Text>
              </View>
            </View>



            {/* 6. PRIMARY CONTINUE / CHECKOUT BUTTON */}
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={async () => {
                const isAuthed = await ensureLoggedIn('order medicines & tablets');
                if (!isAuthed) return;
                setCheckoutModalVisible(true);
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>

        {/* WEB FOOTER */}
        {Platform.OS === 'web' && isDesktop && (
          <View style={{ width: '100%', marginTop: 50 }}>
            <WebFooter navigation={navigation} />
          </View>
        )}
      </ScrollView>

      {/* ============================================================
          APPLY COUPON MODAL
      ============================================================ */}
      <Modal
        visible={couponModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCouponModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCouponModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Promo Code</Text>
              <TouchableOpacity onPress={() => setCouponModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputRow}>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Enter promo code (e.g. MEDI20)"
                placeholderTextColor="#94A3B8"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => handleApplyPromo()}
                activeOpacity={0.85}
              >
                <Text style={styles.modalApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* Quick chips */}
            <View style={styles.promoChipsRow}>
              {['MEDI20', 'HEALTH50', 'FLAT100'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.promoChip}
                  onPress={() => handleApplyPromo(chip)}
                >
                  <Text style={styles.promoChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {couponMessage && (
              <Text
                style={[
                  styles.couponMessageText,
                  { color: couponMessage.success ? '#16A34A' : '#DC2626' },
                ]}
              >
                {couponMessage.text}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          CHANGE ADDRESS MODAL
      ============================================================ */}
      <Modal
        visible={addressModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAddressModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalTextInput, { height: 70, textAlignVertical: 'top', marginTop: 10 }]}
              placeholder="Enter complete house address & locality"
              placeholderTextColor="#94A3B8"
              value={tempAddress}
              onChangeText={setTempAddress}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalApplyBtn, { width: '100%', marginTop: 14, height: 44 }]}
              onPress={() => {
                if (updateAddress) {
                  updateAddress({ addressLine: tempAddress });
                }
                setAddressModalVisible(false);
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.modalApplyBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          CHECKOUT & PAYMENT MODAL OVERLAY (CART SCREEN AS BACKSIDE)
      ============================================================ */}
      <Modal
        visible={checkoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <View style={styles.checkoutModalBackdrop}>
          <View style={styles.checkoutModalCard}>
            {/* MODAL HEADER */}
            <View style={styles.checkoutModalHeader}>
              <View>
                <View style={styles.checkoutConfidentialPill}>
                  <Ionicons name="lock-closed" size={11} color="#00B894" />
                  <Text style={styles.checkoutConfidentialPillText}>100% SECURE & VERIFIED PHARMACY</Text>
                </View>
                <Text style={styles.checkoutModalTitle}>Confirm Pharmacy Order</Text>
                <Text style={styles.checkoutModalSub} numberOfLines={1}>
                  Express Doorstep Delivery (30–45 Mins) • 100% Genuine
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCheckoutModalVisible(false)}
                style={styles.checkoutModalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* FORM BODY */}
            <ScrollView style={styles.checkoutModalForm} showsVerticalScrollIndicator={false}>
              {/* RECIPIENT NAME */}
              <Text style={styles.checkoutInputLabel}>Recipient / Patient Name</Text>
              <TextInput
                style={styles.checkoutTextInput}
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Enter recipient full name"
                placeholderTextColor="#94A3B8"
              />

              {/* MOBILE NUMBER */}
              <Text style={styles.checkoutInputLabel}>Contact Mobile Number</Text>
              <TextInput
                style={styles.checkoutTextInput}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                placeholder="+91 98450 12345"
                placeholderTextColor="#94A3B8"
              />


              {/* DELIVERY ADDRESS */}
              <View style={styles.checkoutLabelWithActionRow}>
                <Text style={styles.checkoutInputLabelNoMargin}>Delivery Address & Landmark</Text>
                <TouchableOpacity
                  style={styles.checkoutGpsChip}
                  onPress={handleGpsAutofill}
                  disabled={gpsLoading}
                  activeOpacity={0.8}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color="#00B894" />
                  ) : (
                    <Ionicons name="navigate" size={12} color="#00B894" />
                  )}
                  <Text style={styles.checkoutGpsText}>
                    {gpsLoading ? 'Locating...' : 'Auto-locate GPS'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.checkoutTextInput, { height: 60, textAlignVertical: 'top' }]}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Flat / House No., Apartment name, Street, Area & Landmark"
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* ORDERED MEDICINES & TABLETS SUMMARY */}
              <View style={styles.checkoutTabletsHeaderRow}>
                <Text style={styles.checkoutInputLabelNoMargin}>Ordered Medicines & Tablets ({items.length})</Text>
                <Text style={styles.checkoutTabletsSub}>Verified Stock</Text>
              </View>
              <View style={styles.checkoutTabletsContainer}>
                {items.map((item, idx) => (
                  <View key={item.id || idx} style={styles.checkoutTabletRow}>
                    <View style={styles.checkoutTabletIconWrap}>
                      <Ionicons name="medkit-outline" size={16} color="#00B894" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={styles.checkoutTabletName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.checkoutTabletPack}>
                        {item.packSize || item.category || 'Tablets / Health Product'} • Qty: {item.quantity || 1}
                      </Text>
                    </View>
                    <Text style={styles.checkoutTabletPrice}>
                      ₹{(item.price * (item.quantity || 1)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>

              {/* UPLOAD PRESCRIPTION OPTION */}
              <Text style={styles.checkoutInputLabel}>Doctor Prescription / Rx (Optional)</Text>
              {!uploadedDocument ? (
                <View style={styles.checkoutUploadBox}>
                  <View style={styles.checkoutUploadBtnRow}>
                    <TouchableOpacity
                      style={styles.checkoutUploadBtn}
                      onPress={() => handlePickDocument('pdf')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text" size={15} color="#DC2626" />
                      <Text style={styles.checkoutUploadBtnText}>Upload PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkoutUploadBtn}
                      onPress={() => handlePickDocument('image')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="image" size={15} color="#00C2CB" />
                      <Text style={styles.checkoutUploadBtnText}>Upload Image</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkoutUploadBtn}
                      onPress={() => handlePickDocument('camera')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera" size={15} color="#2563EB" />
                      <Text style={styles.checkoutUploadBtnText}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.checkoutUploadHint}>
                    Attach doctor prescription or medicine pack photo for pharmacist review.
                  </Text>
                </View>
              ) : (
                <View style={styles.checkoutUploadedFileCard}>
                  <View style={styles.checkoutUploadedIconWrap}>
                    <Ionicons
                      name={uploadedDocument.type?.includes('pdf') ? 'document-text' : 'image'}
                      size={20}
                      color="#00B894"
                    />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={styles.checkoutUploadedFileName} numberOfLines={1}>
                      {uploadedDocument.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={styles.checkoutUploadedFileSize}>{uploadedDocument.size}</Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>•</Text>
                      <Text style={styles.checkoutUploadedFileBadge}>Attached to Order</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setUploadedDocument(null)}
                    style={styles.checkoutRemoveFileBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF7F50" />
                  </TouchableOpacity>
                </View>
              )}


              {/* PREFERRED DELIVERY TIME */}
              <Text style={styles.checkoutInputLabel}>Preferred Delivery Time</Text>
              <View style={styles.checkoutSlotPickerRow}>
                {['Today, Express (30–45 Mins)', 'Tomorrow, 11:00 AM', 'Tomorrow, 04:00 PM'].map((slot, i) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.checkoutSlotChip, isSelected && styles.checkoutSlotChipSelected]}
                      onPress={() => setSelectedSlot(slot)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.checkoutSlotChipText, isSelected && styles.checkoutSlotChipTextSelected]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* SELECT PAYMENT METHOD */}
              <Text style={styles.checkoutInputLabel}>Select Payment Method</Text>
              <View style={styles.checkoutPaymentMethodsWrap}>
                {PAYMENT_METHODS_CHECKOUT.map((pm) => {
                  const isSelected = selectedPaymentMethod === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[
                        styles.checkoutPaymentMethodRow,
                        isSelected && styles.checkoutPaymentMethodRowSelected,
                      ]}
                      onPress={() => setSelectedPaymentMethod(pm.id)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.checkoutPaymentRadio,
                          isSelected && styles.checkoutPaymentRadioSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.checkoutPaymentRadioDot} />}
                      </View>
                      <Ionicons
                        name={pm.icon}
                        size={18}
                        color={isSelected ? '#00B894' : pm.iconColor || '#64748B'}
                      />
                      <Text
                        style={[
                          styles.checkoutPaymentMethodLabel,
                          isSelected && styles.checkoutPaymentMethodLabelSelected,
                        ]}
                      >
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* METHOD-SPECIFIC INTERACTIVE DETAILS */}
              {selectedPaymentMethod === 'UPI' && (
                <View style={styles.checkoutMethodDetailBox}>
                  <Text style={styles.checkoutSubInputLabel}>Choose Instant UPI App</Text>
                  <View style={styles.checkoutUpiAppsRow}>
                    {UPI_APPS.map((app) => (
                      <TouchableOpacity
                        key={app.id}
                        style={[
                          styles.checkoutUpiAppBtn,
                          selectedUpiApp === app.id && styles.checkoutUpiAppBtnActive,
                        ]}
                        onPress={() => setSelectedUpiApp(app.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={app.icon}
                          size={15}
                          color={selectedUpiApp === app.id ? '#00B894' : app.color}
                        />
                        <Text
                          style={[
                            styles.checkoutUpiAppBtnText,
                            selectedUpiApp === app.id && styles.checkoutUpiAppBtnTextActive,
                          ]}
                        >
                          {app.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.checkoutSubInputLabel, { marginTop: 8 }]}>Or Enter UPI ID / VPA</Text>
                  <View style={styles.checkoutUpiInputRow}>
                    <TextInput
                      style={[styles.checkoutTextInput, { flex: 1 }]}
                      placeholder="username@okhdfcbank"
                      placeholderTextColor="#94A3B8"
                      value={upiId}
                      onChangeText={setUpiId}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={[styles.checkoutUpiVerifyBtn, isUpiVerified && styles.checkoutUpiVerifyBtnDone]}
                      onPress={() => {
                        if (upiId.trim()) setIsUpiVerified(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.checkoutUpiVerifyBtnText}>
                        {isUpiVerified ? 'Verified' : 'Verify'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {selectedPaymentMethod === 'CARD' && (
                <View style={styles.checkoutMethodDetailBox}>
                  <Text style={styles.checkoutSubInputLabel}>Card Number</Text>
                  <TextInput
                    style={styles.checkoutTextInput}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    maxLength={19}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checkoutSubInputLabel}>Expiry (MM/YY)</Text>
                      <TextInput
                        style={styles.checkoutTextInput}
                        placeholder="MM/YY"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        value={cardExpiry}
                        onChangeText={handleExpiryChange}
                        maxLength={5}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checkoutSubInputLabel}>CVV</Text>
                      <TextInput
                        style={styles.checkoutTextInput}
                        placeholder="•••"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        secureTextEntry
                        value={cardCvv}
                        onChangeText={(t) => setCardCvv(t.slice(0, 3))}
                        maxLength={3}
                      />
                    </View>
                  </View>
                </View>
              )}

              {selectedPaymentMethod === 'NETBANKING' && (
                <View style={styles.checkoutMethodDetailBox}>
                  <Text style={styles.checkoutSubInputLabel}>Select Bank</Text>
                  <View style={styles.checkoutBankPickerGrid}>
                    {POPULAR_BANKS.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.checkoutBankChip,
                          selectedBank === b.id && styles.checkoutBankChipActive,
                        ]}
                        onPress={() => setSelectedBank(b.id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.checkoutBankChipText,
                            selectedBank === b.id && styles.checkoutBankChipTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                        {selectedBank === b.id && (
                          <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {selectedPaymentMethod === 'WALLET' && (
                <View style={styles.checkoutMethodDetailBox}>
                  <View style={styles.checkoutWalletBalanceRow}>
                    <View>
                      <Text style={styles.checkoutWalletBalLabel}>Available Wallet Balance</Text>
                      <Text
                        style={[
                          styles.checkoutWalletBalValue,
                          walletBalance < netPayable && { color: '#FF7F50' },
                        ]}
                      >
                        ₹{walletBalance.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.checkoutWalletTopUpBtn}
                      onPress={() => navigation.navigate('Wallet')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.checkoutWalletTopUpBtnText}>Top Up</Text>
                    </TouchableOpacity>
                  </View>

                  {walletBalance >= netPayable ? (
                    <View style={styles.checkoutWalletNoticeSuccess}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.checkoutWalletNoticeTextSuccess}>
                        Sufficient balance. ₹{(walletBalance - netPayable).toLocaleString('en-IN')} will remain after payment.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.checkoutWalletNoticeWarning}>
                      <Ionicons name="warning" size={14} color="#FF7F50" />
                      <Text style={styles.checkoutWalletNoticeTextWarning}>
                        Insufficient balance. Please top up ₹{(netPayable - walletBalance).toLocaleString('en-IN')}.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {selectedPaymentMethod === 'COD' && (
                <View style={styles.checkoutMethodDetailBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="cash-outline" size={20} color="#D97706" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                      Cash on Delivery (Pay at Doorstep)
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                    Pay ₹{netPayable.toLocaleString('en-IN')} in cash or UPI QR scan when your order arrives.
                  </Text>
                </View>
              )}

              {/* PRICING SUMMARY BOX */}
              <View style={styles.checkoutPricingSummaryBox}>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Total Amount Payable</Text>
                  <Text style={styles.checkoutSummaryValue}>₹{netPayable.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.checkoutSummaryNote}>
                  Zero cancellation fee • 100% genuine medicines • Instant confirmation
                </Text>
              </View>

              {/* PRIVACY ASSURANCE BOX */}
              <View style={styles.checkoutPrivacyAssuranceBox}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.checkoutPrivacyAssuranceText}>
                  Your privacy is sacred to us. Sealed cold-chain packaging, discrete bill descriptions, and tamper-proof delivery.
                </Text>
              </View>
            </ScrollView>

            {/* STICKY BOTTOM CONFIRM BUTTON */}
            <View style={styles.checkoutModalFooter}>
              <TouchableOpacity
                style={[
                  styles.checkoutConfirmBtn,
                  isSubmittingOrder && styles.checkoutConfirmBtnDisabled,
                ]}
                onPress={handleConfirmPharmacyOrder}
                activeOpacity={0.88}
                disabled={isSubmittingOrder}
              >
                {isSubmittingOrder ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkoutConfirmBtnText}>
                    Confirm Order & Pay ₹{netPayable.toLocaleString('en-IN')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PROCESSING MODAL */}
      <Modal visible={isSubmittingOrder} transparent animationType="fade">
        <View style={styles.procModalOverlay}>
          <View style={styles.processModal}>
            {orderProcessStep < 3 ? (
              <>
                <ActivityIndicator size="large" color="#00B894" />
                <Text style={styles.processTitle}>
                  {orderProcessStep === 1 ? 'Connecting to Payment Gateway...' : 'Authorizing Payment...'}
                </Text>
                <Text style={styles.processSub}>
                  {orderProcessStep === 1
                    ? 'Establishing secure 256-bit SSL encrypted tunnel'
                    : 'Verifying payment credentials with the issuing bank'}
                </Text>
                <View style={styles.processStepRow}>
                  {[1, 2, 3].map((s) => (
                    <View
                      key={s}
                      style={[styles.processDot, orderProcessStep >= s && styles.processDotActive]}
                    />
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                </View>
                <Text style={[styles.processTitle, { color: '#059669' }]}>Payment Successful</Text>
                <Text style={styles.processSub}>Generating your official medicine order receipt...</Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================
          LAB CHECKOUT MODAL
      ============================================================ */}
      <Modal
        visible={labCheckoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLabCheckoutModalVisible(false)}
      >
        <View style={styles.checkoutModalBackdrop}>
          <View style={styles.checkoutModalCard}>
            <View style={styles.checkoutModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkoutModalTitle}>Schedule Diagnostic Tests</Text>
                <Text style={styles.checkoutModalSubTitle}>
                  {labCart.length} Test{labCart.length > 1 ? 's' : ''} • NABL Certified Partner Labs
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLabCheckoutModalVisible(false)}
                style={styles.checkoutModalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.checkoutModalScroll} showsVerticalScrollIndicator={false}>
              {/* 1. Collection Mode */}
              <View style={styles.checkoutSectionBlock}>
                <Text style={styles.checkoutSectionTitle}>1. Collection Preference</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.labModeSelectBtn,
                      labCollectionMode === 'HOME' && styles.labModeSelectBtnActive,
                    ]}
                    onPress={() => setLabCollectionMode('HOME')}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="home"
                      size={16}
                      color={labCollectionMode === 'HOME' ? '#00B894' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.labModeSelectBtnText,
                        labCollectionMode === 'HOME' && styles.labModeSelectBtnTextActive,
                      ]}
                    >
                      Home Doorstep (Free)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.labModeSelectBtn,
                      labCollectionMode === 'CENTRE' && styles.labModeSelectBtnActive,
                    ]}
                    onPress={() => setLabCollectionMode('CENTRE')}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="business"
                      size={16}
                      color={labCollectionMode === 'CENTRE' ? '#00B894' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.labModeSelectBtnText,
                        labCollectionMode === 'CENTRE' && styles.labModeSelectBtnTextActive,
                      ]}
                    >
                      Diagnostic Centre Visit
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Patient Details */}
              <View style={styles.checkoutSectionBlock}>
                <Text style={styles.checkoutSectionTitle}>2. Patient Details</Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  <TextInput
                    style={styles.checkoutTextInput}
                    placeholder="Patient Full Name"
                    placeholderTextColor="#94A3B8"
                    value={recipientName}
                    onChangeText={setRecipientName}
                  />
                  <TextInput
                    style={styles.checkoutTextInput}
                    placeholder="Mobile Number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                  />
                </View>
              </View>

              {/* 3. Address (if home collection) */}
              {labCollectionMode === 'HOME' && (
                <View style={styles.checkoutSectionBlock}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.checkoutSectionTitle}>3. Home Sample Collection Address</Text>
                    <TouchableOpacity onPress={handleGpsAutofill} style={styles.gpsUseCurrentBtn}>
                      {gpsLoading ? (
                        <ActivityIndicator size="small" color="#00B894" />
                      ) : (
                        <>
                          <Ionicons name="locate" size={13} color="#00B894" />
                          <Text style={[styles.gpsUseCurrentText, { color: '#00B894' }]}>Use GPS</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.checkoutTextInput, { height: 60, textAlignVertical: 'top', marginTop: 8 }]}
                    placeholder="Enter complete home address & landmark"
                    placeholderTextColor="#94A3B8"
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                    multiline
                  />
                </View>
              )}

              {/* 4. Date & Slot */}
              <View style={styles.checkoutSectionBlock}>
                <Text style={styles.checkoutSectionTitle}>
                  {labCollectionMode === 'HOME' ? '4. Select Date & Slot' : '3. Select Date & Slot'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {['Tomorrow', 'In 2 Days', 'In 3 Days'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.checkoutDateChip,
                        labBookingDate === d && styles.checkoutDateChipActive,
                      ]}
                      onPress={() => setLabBookingDate(d)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.checkoutDateChipText,
                          labBookingDate === d && styles.checkoutDateChipTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ gap: 8, marginTop: 10 }}>
                  {[
                    '07:00 AM - 08:00 AM (Fasting Ideal)',
                    '08:00 AM - 09:00 AM',
                    '09:00 AM - 10:00 AM',
                    '04:00 PM - 05:00 PM',
                  ].map((slot) => {
                    const centerTitle = labCart[0]?.centerName || labCart[0]?.labName || 'Unnathi Certified Diagnostics';
                    const status = getSlotStatus({
                      date: labBookingDate,
                      time: slot,
                      serviceType: 'lab',
                      providerId: centerTitle,
                    });
                    const isAvailable = status.available;
                    const isSelected = labBookingSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.checkoutSlotRow,
                          isSelected && styles.checkoutSlotRowActive,
                          !isAvailable && { opacity: 0.55, backgroundColor: '#F8FAFC' },
                        ]}
                        disabled={!isAvailable}
                        onPress={() => setLabBookingSlot(slot)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? '#00B894' : isAvailable ? '#94A3B8' : '#CBD5E1'}
                        />
                        <Text
                          style={[
                            styles.checkoutSlotText,
                            isSelected && styles.checkoutSlotTextActive,
                            !isAvailable && { color: '#94A3B8', textDecorationLine: 'line-through' },
                          ]}
                        >
                          {slot}
                        </Text>
                        {!isAvailable && (
                          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' }}>
                              {status.status === 'PASSED' ? 'Passed' : 'Booked'}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. 100% Online Payment */}
              <View style={styles.checkoutSectionBlock}>
                <Text style={styles.checkoutSectionTitle}>
                  {labCollectionMode === 'HOME' ? '5. Payment Method (100% Online)' : '4. Payment Method (100% Online)'}
                </Text>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {[
                    { id: 'UPI', label: 'UPI / Google Pay / PhonePe', icon: 'phone-portrait-outline', color: '#00B894' },
                    { id: 'CARD', label: 'Credit / Debit Card', icon: 'card-outline', color: '#1E3A8A' },
                    { id: 'NETBANKING', label: 'Net Banking', icon: 'business-outline', color: '#00C2CB' },
                    { id: 'WALLET', label: 'Health Wallet Balance', icon: 'wallet-outline', color: '#7BC96F' },
                  ].map((pm) => (
                    <TouchableOpacity
                      key={pm.id}
                      style={[
                        styles.checkoutPaymentMethodCard,
                        selectedPaymentMethod === pm.id && styles.checkoutPaymentMethodCardActive,
                      ]}
                      onPress={() => setSelectedPaymentMethod(pm.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={pm.icon} size={18} color={pm.color} />
                      <Text style={styles.checkoutPaymentMethodLabel}>{pm.label}</Text>
                      {selectedPaymentMethod === pm.id && (
                        <Ionicons name="checkmark-circle" size={18} color="#00B894" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Pricing breakdown summary */}
              <View style={styles.checkoutPricingSummaryBox}>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Diagnostic Total Amount</Text>
                  <Text style={[styles.checkoutSummaryValue, { color: '#00B894' }]}>
                    ₹{labFinalTotal.toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={styles.checkoutSummaryNote}>
                  Free doorstep collection • Digital verified reports • NABL accredited partner labs
                </Text>
              </View>
            </ScrollView>

            <View style={styles.checkoutModalFooter}>
              <TouchableOpacity
                style={[
                  styles.checkoutConfirmBtn,
                  { backgroundColor: '#00B894' },
                  isSubmittingLabOrder && styles.checkoutConfirmBtnDisabled,
                ]}
                onPress={handleConfirmLabBooking}
                activeOpacity={0.88}
                disabled={isSubmittingLabOrder}
              >
                {isSubmittingLabOrder ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkoutConfirmBtnText}>
                    Confirm & Pay ₹{labFinalTotal.toLocaleString('en-IN')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LAB PROCESSING MODAL */}
      <Modal visible={isSubmittingLabOrder} transparent animationType="fade">
        <View style={styles.procModalOverlay}>
          <View style={styles.processModal}>
            <ActivityIndicator size="large" color="#00B894" />
            <Text style={styles.processTitle}>Confirming Diagnostic Booking...</Text>
            <Text style={styles.processSub}>Scheduling lab appointment and processing payment</Text>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          RADIOLOGY CHECKOUT MODAL (100% ONLINE PAYMENT)
      ============================================================ */}
      <Modal
        visible={radiologyCheckoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRadiologyCheckoutModalVisible(false)}
      >
        <View style={styles.checkoutModalBackdrop}>
          <View style={styles.checkoutModalCard}>
            <View style={styles.checkoutModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkoutModalTitle}>Schedule Radiology Scan</Text>
                <Text style={styles.checkoutModalSubTitle}>
                  {radiologyCart.length} Scan{radiologyCart.length > 1 ? 's' : ''} • NABH & NABL Accredited Center
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRadiologyCheckoutModalVisible(false)}
                style={styles.checkoutModalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.checkoutModalScroll} showsVerticalScrollIndicator={false}>
              {/* 1. Selected Scan Center Details */}
              <View style={styles.checkoutSectionBlock}>
                <Text style={styles.checkoutSectionTitle}>1. Diagnostic Scan Center</Text>
                <View style={[styles.checkoutMethodDetailBox, { marginTop: 8, borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="business" size={20} color="#0284C7" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0369A1' }}>
                        {radiologyCart[0]?.labName || radiologyCart[0]?.centerName || 'MediUnify Imaging & Scan Centre'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {radiologyCart[0]?.labAddress || radiologyCart[0]?.labArea || 'Kuvempunagar, Mysore'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 2. Patient Details */}
              <View style={styles.checkoutSectionBlock}>
                <Text style={styles.checkoutSectionTitle}>2. Patient Details</Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  <TextInput
                    style={styles.checkoutTextInput}
                    placeholder="Patient Full Name"
                    placeholderTextColor="#94A3B8"
                    value={radiologyPatientName}
                    onChangeText={setRadiologyPatientName}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[styles.checkoutTextInput, { flex: 1 }]}
                      placeholder="Age (e.g. 28)"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      value={radiologyPatientAge}
                      onChangeText={setRadiologyPatientAge}
                    />
                    <View style={{ flexDirection: 'row', gap: 6, flex: 1.5 }}>
                      {['Male', 'Female', 'Other'].map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[
                            styles.checkoutDateChip,
                            { flex: 1, paddingHorizontal: 4 },
                            radiologyPatientGender === g && { backgroundColor: '#0284C7', borderColor: '#0284C7' },
                          ]}
                          onPress={() => setRadiologyPatientGender(g)}
                        >
                          <Text
                            style={[
                              styles.checkoutDateChipText,
                              radiologyPatientGender === g && { color: '#FFFFFF', fontWeight: '800' },
                            ]}
                          >
                            {g}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TextInput
                    style={styles.checkoutTextInput}
                    placeholder="Contact Mobile Number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={radiologyPatientPhone}
                    onChangeText={setRadiologyPatientPhone}
                  />
                </View>
              </View>

              {/* 3. Appointment Date & Slot */}
              <View style={styles.checkoutSectionBlock}>
                <Text style={styles.checkoutSectionTitle}>3. Appointment Date & Slot</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {['Today', 'Tomorrow', 'In 2 Days'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.checkoutDateChip,
                        radiologyBookingDate === d && { backgroundColor: '#0284C7', borderColor: '#0284C7' },
                      ]}
                      onPress={() => setRadiologyBookingDate(d)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.checkoutDateChipText,
                          radiologyBookingDate === d && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ gap: 8, marginTop: 10 }}>
                  {[
                    '08:30 AM - 09:30 AM (Morning)',
                    '10:30 AM - 11:30 AM (Peak Slot)',
                    '01:30 PM - 02:30 PM (Afternoon)',
                    '04:30 PM - 05:30 PM (Evening)',
                  ].map((slot) => {
                    const centerTitle = radiologyCart[0]?.labName || radiologyCart[0]?.centerName || 'MediUnify Imaging & Scan Centre';
                    const status = getSlotStatus({
                      date: radiologyBookingDate,
                      time: slot,
                      serviceType: 'radiology',
                      providerId: centerTitle,
                    });
                    const isAvailable = status.available;
                    const isSelected = radiologyBookingSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.checkoutSlotRow,
                          isSelected && { borderColor: '#0284C7', backgroundColor: '#F0F9FF' },
                          !isAvailable && { opacity: 0.55, backgroundColor: '#F8FAFC' },
                        ]}
                        disabled={!isAvailable}
                        onPress={() => setRadiologyBookingSlot(slot)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? '#0284C7' : isAvailable ? '#94A3B8' : '#CBD5E1'}
                        />
                        <Text
                          style={[
                            styles.checkoutSlotText,
                            isSelected && { color: '#0369A1', fontWeight: '700' },
                            !isAvailable && { color: '#94A3B8', textDecorationLine: 'line-through' },
                          ]}
                        >
                          {slot}
                        </Text>
                        {!isAvailable && (
                          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' }}>
                              {status.status === 'PASSED' ? 'Passed' : 'Booked'}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Preparation & Fasting Acknowledgement */}
              <View style={styles.checkoutSectionBlock}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
                  onPress={() => setRadiologyPreparationAcknowledged(!radiologyPreparationAcknowledged)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={radiologyPreparationAcknowledged ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={radiologyPreparationAcknowledged ? '#0284C7' : '#94A3B8'}
                  />
                  <Text style={{ fontSize: 12, color: '#334155', flex: 1, lineHeight: 17 }}>
                    I acknowledge that certain scans (Abdominal USG, Contrast MRI/CT) may require 4-6 hours prior fasting. I will carry prior medical reports.
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 5. 100% Online Payment (Strictly Online, No COD) */}
              <View style={styles.checkoutSectionBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.checkoutSectionTitle}>4. Payment Method</Text>
                  <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#0369A1' }}>100% ONLINE PAYMENT</Text>
                  </View>
                </View>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {RADIOLOGY_PAYMENT_METHODS.map((pm) => (
                    <TouchableOpacity
                      key={pm.id}
                      style={[
                        styles.checkoutPaymentMethodCard,
                        selectedRadiologyPaymentMethod === pm.id && { borderColor: '#0284C7', backgroundColor: '#F0F9FF' },
                      ]}
                      onPress={() => setSelectedRadiologyPaymentMethod(pm.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={pm.icon} size={18} color={pm.iconColor} />
                      <Text style={styles.checkoutPaymentMethodLabel}>{pm.label}</Text>
                      {selectedRadiologyPaymentMethod === pm.id && (
                        <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Pricing breakdown summary */}
              <View style={[styles.checkoutPricingSummaryBox, { borderColor: '#BAE6FD', backgroundColor: '#F8FAFC' }]}>
                <View style={styles.checkoutSummaryRow}>
                  <Text style={styles.checkoutSummaryLabel}>Radiology Scans Total</Text>
                  <Text style={[styles.checkoutSummaryValue, { color: '#0284C7' }]}>
                    ₹{radiologyFinalTotal.toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={styles.checkoutSummaryNote}>
                  Verified Radiologist Reporting • Priority Slot Reservation • Digital DICOM Reports
                </Text>
              </View>
            </ScrollView>

            <View style={styles.checkoutModalFooter}>
              <TouchableOpacity
                style={[
                  styles.checkoutConfirmBtn,
                  { backgroundColor: '#0284C7' },
                  isSubmittingRadiologyOrder && styles.checkoutConfirmBtnDisabled,
                ]}
                onPress={handleConfirmRadiologyBooking}
                activeOpacity={0.88}
                disabled={isSubmittingRadiologyOrder}
              >
                {isSubmittingRadiologyOrder ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkoutConfirmBtnText}>
                    Confirm & Pay Online ₹{radiologyFinalTotal.toLocaleString('en-IN')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RADIOLOGY PROCESSING MODAL */}
      <Modal visible={isSubmittingRadiologyOrder} transparent animationType="fade">
        <View style={styles.procModalOverlay}>
          <View style={styles.processModal}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.processTitle}>Confirming Radiology Booking...</Text>
            <Text style={styles.processSub}>Securing imaging slot & connecting to 100% online payment</Text>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          LAB TEST / PACKAGE FULL CLINICAL DETAILS MODAL
      ============================================================ */}
      <Modal
        visible={Boolean(selectedLabItemDetails)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedLabItemDetails(null)}
      >
        <View style={styles.labDetailsModalBackdrop}>
          <View style={styles.labDetailsModalCard}>
            {/* Modal Header */}
            <View style={styles.labDetailsModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.labDetailsIconBox, selectedLabItemDetails?.isPackage && { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons
                    name={selectedLabItemDetails?.isPackage ? 'shield-checkmark' : 'flask'}
                    size={24}
                    color="#00B894"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={styles.labDetailsCategoryBadge}>
                      {selectedLabItemDetails?.isPackage ? 'DIAGNOSTIC HEALTH PACKAGE' : 'LABORATORY TEST'}
                    </Text>
                    {selectedLabItemDetails?.discount && (
                      <Text style={styles.labDetailsDiscountBadge}>{selectedLabItemDetails.discount}</Text>
                    )}
                  </View>
                  <Text style={styles.labDetailsModalTitle} numberOfLines={2}>
                    {selectedLabItemDetails?.name}
                  </Text>
                  <Text style={styles.labDetailsModalCenter}>
                    {selectedLabItemDetails?.centerName} • 100% NABL & CAP Accredited
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedLabItemDetails(null)}
                style={styles.labDetailsCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close test details"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Details Body */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.labDetailsModalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Highlights 4-Grid */}
              <View style={styles.labDetailsMetricsGrid}>
                <View style={styles.labDetailsMetricBox}>
                  <Ionicons name="water-outline" size={18} color="#0284C7" />
                  <Text style={styles.labDetailsMetricLabel}>SAMPLE TYPE</Text>
                  <Text style={styles.labDetailsMetricValue} numberOfLines={2}>
                    {selectedLabItemDetails?.sampleType || 'Blood Sample'}
                  </Text>
                </View>

                <View style={styles.labDetailsMetricBox}>
                  <Ionicons
                    name={selectedLabItemDetails?.fastingRequired ? 'restaurant-outline' : 'checkmark-circle-outline'}
                    size={18}
                    color={selectedLabItemDetails?.fastingRequired ? '#F59E0B' : '#10B981'}
                  />
                  <Text style={styles.labDetailsMetricLabel}>FASTING RULES</Text>
                  <Text style={styles.labDetailsMetricValue} numberOfLines={2}>
                    {selectedLabItemDetails?.fastingRequired ? 'Fasting Required' : 'No Fasting Required'}
                  </Text>
                </View>

                <View style={styles.labDetailsMetricBox}>
                  <Ionicons name="time-outline" size={18} color="#6366F1" />
                  <Text style={styles.labDetailsMetricLabel}>REPORT TAT</Text>
                  <Text style={styles.labDetailsMetricValue} numberOfLines={2}>
                    {selectedLabItemDetails?.reportTime || 'Within 24 Hours'}
                  </Text>
                </View>

                <View style={styles.labDetailsMetricBox}>
                  <Ionicons name="home-outline" size={18} color="#00B894" />
                  <Text style={styles.labDetailsMetricLabel}>COLLECTION</Text>
                  <Text style={styles.labDetailsMetricValue} numberOfLines={2}>
                    Free Doorstep Pickup
                  </Text>
                </View>
              </View>

              {/* Price & Summary Banner */}
              <View style={styles.labDetailsPriceCard}>
                <View>
                  <Text style={styles.labDetailsPriceSub}>TOTAL PRICE IN CART</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                    <Text style={styles.labDetailsPriceMain}>₹{selectedLabItemDetails?.price}</Text>
                    {selectedLabItemDetails?.mrp > selectedLabItemDetails?.price && (
                      <Text style={styles.labDetailsMrpCross}>₹{selectedLabItemDetails?.mrp}</Text>
                    )}
                    {selectedLabItemDetails?.mrp > selectedLabItemDetails?.price && (
                      <Text style={styles.labDetailsSaveText}>
                        Save ₹{selectedLabItemDetails?.mrp - selectedLabItemDetails?.price}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.labDetailsAccreditedBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#00B894" />
                  <Text style={styles.labDetailsAccreditedText}>Verified NABL Partner</Text>
                </View>
              </View>

              {/* Clinical Description / Purpose */}
              {Boolean(selectedLabItemDetails?.description) && (
                <View style={styles.labDetailsSectionBox}>
                  <View style={styles.labDetailsSectionHeader}>
                    <Ionicons name="medical-outline" size={18} color="#0F172A" />
                    <Text style={styles.labDetailsSectionTitle}>Clinical Purpose & Overview</Text>
                  </View>
                  <Text style={styles.labDetailsDescriptionText}>
                    {selectedLabItemDetails?.description}
                  </Text>
                </View>
              )}

              {/* Preparation & Fasting Guidelines */}
              <View style={styles.labDetailsSectionBox}>
                <View style={styles.labDetailsSectionHeader}>
                  <Ionicons name="clipboard-outline" size={18} color="#0F172A" />
                  <Text style={styles.labDetailsSectionTitle}>Preparation & Fasting Instructions</Text>
                </View>
                <View style={styles.labDetailsPrepNote}>
                  <Ionicons name="information-circle" size={18} color="#0284C7" style={{ marginTop: 2 }} />
                  <Text style={styles.labDetailsPrepNoteText}>
                    {selectedLabItemDetails?.preparation || 'No special dietary instructions needed. Drink adequate water.'}
                  </Text>
                </View>
              </View>

              {/* If PACKAGE: List of Included Tests */}
              {selectedLabItemDetails?.isPackage && Array.isArray(selectedLabItemDetails?.tests) && selectedLabItemDetails.tests.length > 0 && (
                <View style={styles.labDetailsSectionBox}>
                  <View style={styles.labDetailsSectionHeader}>
                    <Ionicons name="layers-outline" size={18} color="#007D69" />
                    <Text style={styles.labDetailsSectionTitle}>
                      Included Tests & Panels ({selectedLabItemDetails.tests.length})
                    </Text>
                  </View>
                  <Text style={styles.labDetailsSubNote}>
                    All the following investigation panels are covered under this checkup package:
                  </Text>

                  <View style={{ gap: 10, marginTop: 10 }}>
                    {selectedLabItemDetails.tests.map((testItem, tIdx) => {
                      const tName = typeof testItem === 'string' ? testItem : testItem.name;
                      const tParams = typeof testItem === 'string' ? '' : testItem.parameters;
                      const tTube = typeof testItem === 'string' ? '' : testItem.tube || testItem.sample;
                      const tPrep = typeof testItem === 'string' ? '' : testItem.preparation;
                      const tTat = typeof testItem === 'string' ? '' : testItem.tat;

                      return (
                        <View key={tIdx} style={styles.labDetailsSubTestCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <View style={styles.labDetailsSubTestNumber}>
                              <Text style={styles.labDetailsSubTestNumberText}>{tIdx + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.labDetailsSubTestName}>{tName}</Text>
                              {Boolean(tParams) && (
                                <Text style={styles.labDetailsSubTestParams}>
                                  <Text style={{ fontWeight: '700', color: '#475569' }}>Parameters: </Text>
                                  {tParams}
                                </Text>
                              )}
                              <View style={styles.labDetailsSubTestTagsRow}>
                                {Boolean(tTube) && (
                                  <View style={styles.labDetailsMiniTag}>
                                    <Ionicons name="flask-outline" size={10} color="#0284C7" />
                                    <Text style={styles.labDetailsMiniTagText}>{tTube}</Text>
                                  </View>
                                )}
                                {Boolean(tPrep) && (
                                  <View style={styles.labDetailsMiniTag}>
                                    <Ionicons name="information-circle-outline" size={10} color="#64748B" />
                                    <Text style={styles.labDetailsMiniTagText}>{tPrep}</Text>
                                  </View>
                                )}
                                {Boolean(tTat) && (
                                  <View style={styles.labDetailsMiniTag}>
                                    <Ionicons name="time-outline" size={10} color="#16A34A" />
                                    <Text style={[styles.labDetailsMiniTagText, { color: '#16A34A' }]}>{tTat}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* If INDIVIDUAL TEST: Parameters Breakdown */}
              {!selectedLabItemDetails?.isPackage && Array.isArray(selectedLabItemDetails?.parametersList) && selectedLabItemDetails.parametersList.length > 0 && (
                <View style={styles.labDetailsSectionBox}>
                  <View style={styles.labDetailsSectionHeader}>
                    <Ionicons name="list-outline" size={18} color="#007D69" />
                    <Text style={styles.labDetailsSectionTitle}>
                      Parameters Evaluated ({selectedLabItemDetails.parametersList.length})
                    </Text>
                  </View>
                  <View style={styles.labDetailsParamsGrid}>
                    {selectedLabItemDetails.parametersList.map((param, pIdx) => (
                      <View key={pIdx} style={styles.labDetailsParamChip}>
                        <Ionicons name="checkmark-circle" size={13} color="#00B894" />
                        <Text style={styles.labDetailsParamChipText}>{param}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Quality & Safety Assurance */}
              <View style={styles.labDetailsGuaranteeCard}>
                <Ionicons name="ribbon-outline" size={24} color="#007D69" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.labDetailsGuaranteeTitle}>MediUnify Diagnostic Quality Assurance</Text>
                  <Text style={styles.labDetailsGuaranteeDesc}>
                    Every test report is signed by an MD Pathologist and processed using barcoded vacuum tubes for 100% sample integrity.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Action Footer */}
            <View style={styles.labDetailsModalFooter}>
              <TouchableOpacity
                style={styles.labDetailsRemoveBtn}
                onPress={() => {
                  removeFromCart && removeFromCart(selectedLabItemDetails.id, 'lab');
                  setSelectedLabItemDetails(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.labDetailsRemoveBtnText}>Remove from Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.labDetailsDoneBtn}
                onPress={() => setSelectedLabItemDetails(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.labDetailsDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  cartCategoryTabsWrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderTopWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cartCategoryTabsInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  cartCategoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 9,
  },
  cartCategoryTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cartCategoryTabActiveLab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cartCategoryTabActiveRad: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cartCategoryTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  cartCategoryTabTextActive: {
    color: '#007D69',
    fontWeight: '800',
  },
  cartCategoryTabTextActiveLab: {
    color: '#007D69',
    fontWeight: '800',
  },
  cartCategoryTabTextActiveRad: {
    color: '#0284C7',
    fontWeight: '800',
  },
  cartTabBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 3,
  },
  cartTabBadgeActive: {
    backgroundColor: '#E6F4F1',
  },
  cartTabBadgeActiveLab: {
    backgroundColor: '#E6F4F1',
  },
  cartTabBadgeActiveRad: {
    backgroundColor: '#E0F2FE',
  },
  cartTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  cartTabBadgeTextActive: {
    color: '#007D69',
  },
  cartTabBadgeTextActiveLab: {
    color: '#007D69',
  },
  cartTabBadgeTextActiveRad: {
    color: '#0284C7',
  },
  labCertifiedPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  labCertifiedPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#16A34A',
    flex: 1,
  },
  labItemCardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  labItemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labItemTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  labItemCenterText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  labItemBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  labBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  labBadgePillText: {
    fontSize: 11,
    color: '#475569',
  },
  labItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  labPriceVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  labMrpVal: {
    fontSize: 12.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  labDiscountVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  labRemoveItemBtn: {
    padding: 4,
  },
  labModeSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  labModeSelectBtnActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  labModeSelectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  labModeSelectBtnTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  checkoutDateChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  checkoutDateChipActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  checkoutDateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  checkoutDateChipTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  checkoutSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  checkoutSlotRowActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  checkoutSlotText: {
    fontSize: 12.5,
    color: '#334155',
  },
  checkoutSlotTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 80,
  },

  // BREADCRUMB
  breadcrumbWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  breadcrumbInner: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  breadcrumbActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  // MOBILE HEADER
  mobileAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  mobileBackBtn: {
    padding: 6,
    marginLeft: -6,
  },
  mobileHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  mobileHeaderSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  mobileAddMoreBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  mobileAddMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },

  // MAIN LAYOUT WRAPPER (2-Column Desktop Grid / 1-Col Mobile)
  mainLayoutWrapper: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  mainLayoutWrapperMobile: {
    paddingHorizontal: 14,
    paddingTop: 12,
    flexDirection: 'column',
    gap: 16,
  },
  columnMobile: {
    width: '100%',
    flex: undefined,
  },
  rightColumnMobile: {
    width: '100%',
    position: 'relative',
    top: 0,
    marginTop: 8,
  },

  // LEFT COLUMN
  leftColumn: {
    flex: 1.4,
    gap: 28,
  },

  // CART ITEMS CARD
  cartItemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  cartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cartHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  prescriptionNote: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },

  // Empty Cart
  emptyCartBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyCartTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCartSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: 12,
  },
  browseProductsBtn: {
    backgroundColor: '#00B894',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseProductsBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Items List Rows
  itemsListWrap: {
    gap: 12,
  },
  itemRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EFF5',
    marginBottom: 8,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
  },
  itemImageWrap: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '94%',
    height: '94%',
    ...(Platform.OS === 'web' ? { mixBlendMode: 'multiply' } : {}),
  },
  itemDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  itemSubtitleText: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 8,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemPriceVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemMrpVal: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  itemDiscountBadge: {
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 5.5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#FED7AA',
  },
  itemDiscountVal: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EA580C',
  },

  // Quantity Selector Box
  qtySelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    height: 34,
    paddingHorizontal: 4,
    boxShadow: '0 2px 8px rgba(0, 184, 148, 0.12)',
  },
  qtyBtn: {
    paddingHorizontal: 8,
    height: 26,
    width: 26,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  qtyMinusText: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '800',
  },
  qtyPlusText: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '800',
  },
  qtyValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    paddingHorizontal: 6,
  },

  // DEALS SECTIONS (Sanofi Top Deals & Last Minute Buys)
  dealsSectionCard: {
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
  },
  dealsHeaderRow: {
    marginBottom: 14,
  },
  carouselContainerWrap: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  carouselSideArrowBtn: {
    position: 'absolute',
    top: '46%',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.14), 0 1px 3px rgba(15, 23, 42, 0.08)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }
      : {}),
  },
  carouselLeftArrowBtn: {
    left: -14,
  },
  carouselRightArrowBtn: {
    right: -14,
  },
  dealsScrollView: {
    width: '100%',
    ...(Platform.OS === 'web'
      ? {
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }
      : {}),
  },
  dealsSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  dealsScrollContainer: {
    gap: 14,
    paddingRight: 20,
    paddingBottom: 6,
  },
  dealCard: {
    width: 196,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EFF5',
    padding: 13,
    paddingTop: 12,
    paddingBottom: 14,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    minHeight: 330,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.02)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }
      : {}),
  },
  labPkgCard: {
    width: 295,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 250,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 20px -4px rgba(0, 187, 149, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03)',
          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease',
        }
      : {}),
  },
  labPkgCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  labPkgCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '65%',
  },
  labPkgCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labPkgTatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7.5,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  labPkgTatText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00BB95',
  },
  labPkgNameText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 21,
    minHeight: 42,
    marginBottom: 10,
  },
  labPkgDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  labPkgDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labPkgDetailText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  labPkgFooterWrap: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 'auto',
    gap: 10,
  },
  labPkgPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labPkgPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  labPkgMrp: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  labPkgDiscountBadge: {
    backgroundColor: '#FFF2ED',
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  labPkgDiscountText: {
    color: '#FF7F50',
    fontSize: 10.5,
    fontWeight: '800',
  },
  labPkgActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labPkgDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labPkgDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  labPkgCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00BB95',
    backgroundColor: '#F0FDF9',
  },
  labPkgCartBtnActive: {
    backgroundColor: '#00BB95',
    borderColor: '#00BB95',
  },
  labPkgCartBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00BB95',
  },
  labPkgCartBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
  pharmacyCardImgWrap: {
    width: '100%',
    height: 125,
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pharmacyCardImg: {
    width: '92%',
    height: '92%',
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
    gap: 6,
    backgroundColor: '#00B894',
    paddingVertical: 9,
    borderRadius: 20,
    height: 38,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #00C29A 0%, #009E7E 100%)',
          boxShadow: '0 4px 12px rgba(0, 194, 154, 0.28)',
          transition: 'all 0.2s ease',
        }
      : {}),
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 20,
    backgroundColor: '#F0FDF9',
    height: 38,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0, 184, 148, 0.15)' } : {}),
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  stepperQuantity: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00B894',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 8,
    paddingVertical: 7,
    height: 36,
    backgroundColor: '#00B894',
    marginTop: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  addToCartBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dealAddBtn: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dealAddBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
  },

  // ============================================================
  // RIGHT COLUMN (STICKY SIDEBAR)
  // ============================================================
  rightColumn: {
    width: 380,
    gap: 16,
    position: Platform.OS === 'web' ? 'sticky' : 'relative',
    top: Platform.OS === 'web' ? 20 : 0,
  },

  // 1. CARE PLAN CARD
  carePlanCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  carePlanBadge: {
    backgroundColor: '#FF7F50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  carePlanBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  carePlanHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  carePlanSub: {
    fontSize: 12,
    color: '#64748B',
  },
  carePlanPriceText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  carePlanMrp: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  carePlanDiscount: {
    color: '#7BC96F',
    fontWeight: '700',
  },
  carePlanActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  knowMoreBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  knowMoreText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  addMembershipBtn: {
    flex: 1.2,
    backgroundColor: '#FF7F50',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { cursor: 'pointer', boxShadow: '0px 3px 8px rgba(255, 127, 80, 0.25)' }
      : {
          shadowColor: '#FF7F50',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 2,
        }),
  },
  addMembershipBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 2. APPLY COUPON CARD
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  couponCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // 3. VITAL ORGANS UPSELL CARD
  vitalOrgansCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  vitalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vitalHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  vitalCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  customCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  customCheckboxChecked: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  vitalPackageTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    lineHeight: 18,
  },
  vitalPackageDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  vitalPackageSubText: {
    fontSize: 11,
    color: '#00C2CB',
    fontWeight: '600',
  },

  // 4. BILL SUMMARY CARD
  billSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 18,
    gap: 10,
  },
  billSummaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  billTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  toPayLabel: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  toPayVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E3A8A',
  },

  // 5. DELIVERING TO CARD
  deliveringToCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deliveringLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deliveringLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  deliveringAddress: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 220,
  },
  addAddressLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00B894',
  },

  // 6. PRIMARY CONTINUE BUTTON
  continueBtn: {
    backgroundColor: '#00B894',
    backgroundImage: 'linear-gradient(135deg, #00C29A 0%, #009E7E 100%)',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 16px rgba(0, 184, 148, 0.32)',
    cursor: 'pointer',
    ...(Platform.OS === 'web'
      ? { cursor: 'pointer', boxShadow: '0px 4px 16px rgba(0, 184, 148, 0.32)' }
      : {
          shadowColor: '#00B894',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }),
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // MODALS
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.2)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          elevation: 8,
        }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modalTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  modalApplyBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  promoChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  promoChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  promoChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  couponMessageText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  // ==========================================
  // CHECKOUT MODAL OVERLAY STYLES (MATCHED TO BRAND TEAL)
  // ==========================================
  checkoutModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  checkoutModalCard: {
    width: '100%',
    maxWidth: 490,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 12px 28px rgba(0, 0, 0, 0.18)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 28,
          elevation: 10,
        }),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkoutModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  checkoutConfidentialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkoutConfidentialPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00B894',
    letterSpacing: 0.3,
  },
  checkoutModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  checkoutModalSub: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
    maxWidth: 320,
    marginTop: 2,
  },
  checkoutModalCloseBtn: {
    padding: 4,
  },
  checkoutModalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  checkoutModalScroll: {
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  checkoutSectionBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkoutSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  checkoutDateChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutDateChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  checkoutDateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  checkoutDateChipTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  checkoutSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  checkoutSlotRowActive: {
    borderColor: '#00B894',
    backgroundColor: '#ECFDF5',
  },
  checkoutSlotText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  checkoutSlotTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  labModeSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  labModeSelectBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  labModeSelectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  labModeSelectBtnTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  gpsUseCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsUseCurrentText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  checkoutPaymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  checkoutPaymentMethodCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#ECFDF5',
  },
  checkoutPaymentMethodLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  checkoutModalForm: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  checkoutInputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  checkoutSubInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  checkoutTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    minWidth: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },

  // ADDRESS & GPS
  checkoutLabelWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  checkoutInputLabelNoMargin: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  checkoutGpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkoutGpsText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00B894',
  },

  // TABLETS & MEDICINES SUMMARY
  checkoutTabletsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  checkoutTabletsSub: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00B894',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkoutTabletsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    gap: 8,
    marginBottom: 4,
  },
  checkoutTabletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  checkoutTabletIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutTabletName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkoutTabletPack: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkoutTabletPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },

  // PRESCRIPTION UPLOAD
  checkoutUploadBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    padding: 10,
    marginBottom: 4,
  },
  checkoutUploadBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkoutUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
  },
  checkoutUploadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  checkoutUploadHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  checkoutUploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
  },
  checkoutUploadedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkoutUploadedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkoutUploadedFileSize: {
    fontSize: 10,
    color: '#64748B',
  },
  checkoutUploadedFileBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00B894',
  },
  checkoutRemoveFileBtn: {
    padding: 6,
  },

  // MODE TOGGLE
  checkoutModeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkoutModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkoutModeBtnSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  checkoutModeBtnText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  checkoutModeBtnTextSelected: {
    color: '#00B894',
    fontWeight: '800',
  },

  // SLOTS
  checkoutSlotPickerRow: {
    gap: 6,
    marginTop: 2,
  },
  checkoutSlotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkoutSlotChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  checkoutSlotChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },
  checkoutSlotChipTextSelected: {
    fontWeight: '800',
    color: '#00B894',
  },

  // PAYMENT METHODS
  checkoutPaymentMethodsWrap: {
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  checkoutPaymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  checkoutPaymentMethodRowSelected: {
    borderColor: '#00B894',
    backgroundColor: '#ECFDF5',
  },
  checkoutPaymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutPaymentRadioSelected: {
    borderColor: '#00B894',
  },
  checkoutPaymentRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#00B894',
  },
  checkoutPaymentMethodLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  checkoutPaymentMethodLabelSelected: {
    color: '#00B894',
    fontWeight: '800',
  },

  // METHOD DETAILS
  checkoutMethodDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 8,
  },
  checkoutUpiAppsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  checkoutUpiAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  checkoutUpiAppBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  checkoutUpiAppBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  checkoutUpiAppBtnTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  checkoutUpiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkoutUpiVerifyBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  checkoutUpiVerifyBtnDone: {
    backgroundColor: '#059669',
  },
  checkoutUpiVerifyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  checkoutBankPickerGrid: {
    gap: 6,
  },
  checkoutBankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkoutBankChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  checkoutBankChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  checkoutBankChipTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },

  checkoutWalletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkoutWalletBalLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  checkoutWalletBalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  checkoutWalletTopUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  checkoutWalletTopUpBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkoutWalletNoticeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkoutWalletNoticeTextSuccess: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  checkoutWalletNoticeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F0',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFD3C4',
  },
  checkoutWalletNoticeTextWarning: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FF7F50',
    flex: 1,
  },

  checkoutPricingSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkoutSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkoutSummaryLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  checkoutSummaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  checkoutSummaryNote: {
    fontSize: 10,
    color: '#059669',
    marginTop: 6,
  },

  checkoutPrivacyAssuranceBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  checkoutPrivacyAssuranceText: {
    fontSize: 11,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },

  checkoutModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  checkoutConfirmBtn: {
    backgroundColor: '#00B894',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0, 184, 148, 0.3)' }
      : {
          shadowColor: '#00B894',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }),
  },
  checkoutConfirmBtnDisabled: {
    opacity: 0.65,
  },
  checkoutConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // PROCESSING MODAL
  procModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  processModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.25,
          shadowRadius: 24,
          elevation: 10,
        }),
  },
  processTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
    textAlign: 'center',
  },
  processSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  processStepRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  processDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  processDotActive: {
    backgroundColor: '#00B894',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  // Lab Package & Details Pill & Modal Styles
  labPackageTypePill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
  },
  labPackageTypePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  labDetailsActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  labDetailsActionPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#007D69',
  },
  labDetailsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  labDetailsModalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.25)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.25,
          shadowRadius: 28,
          elevation: 12,
        }),
  },
  labDetailsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFCFC',
  },
  labDetailsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labDetailsCategoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007D69',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labDetailsDiscountBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  labDetailsModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  labDetailsModalCenter: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  labDetailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labDetailsModalScrollContent: {
    padding: 20,
    gap: 16,
  },
  labDetailsMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  labDetailsMetricBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labDetailsMetricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  labDetailsMetricValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  labDetailsPriceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  labDetailsPriceSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  labDetailsPriceMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
  },
  labDetailsMrpCross: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  labDetailsSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  labDetailsAccreditedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  labDetailsAccreditedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  labDetailsSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labDetailsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  labDetailsSectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  labDetailsDescriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  labDetailsPrepNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  labDetailsPrepNoteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#1E40AF',
  },
  labDetailsSubNote: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  labDetailsSubTestCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labDetailsSubTestNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007D69',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labDetailsSubTestNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  labDetailsSubTestName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  labDetailsSubTestParams: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748B',
    marginTop: 3,
  },
  labDetailsSubTestTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  labDetailsMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labDetailsMiniTagText: {
    fontSize: 11,
    color: '#475569',
  },
  labDetailsParamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  labDetailsParamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  labDetailsParamChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  labDetailsGuaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDFA',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  labDetailsGuaranteeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  labDetailsGuaranteeDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#115E59',
    marginTop: 2,
  },
  labDetailsModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  labDetailsRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  labDetailsRemoveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  labDetailsDoneBtn: {
    flex: 1,
    maxWidth: 160,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labDetailsDoneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default CartScreen;
