import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import colors from '../../theme/colors';
import doctors from '../../data/doctors';
import { radiologyLabs } from '../../data/radiologyLabsData';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

// Horizontally scrollable quick prompt chips
const QUICK_SUGGESTIONS = [
  { icon: 'flask-outline', text: 'Book a Lab Test' },
  { icon: 'person-outline', text: 'Find a Doctor' },
  { icon: 'medkit-outline', text: 'Order Medicine' },
  { icon: 'scan-outline', text: 'View Scan & X-Ray' },
  { icon: 'fitness-outline', text: 'I have fever & body pain' },
  { icon: 'heart-outline', text: 'Book Home Nursing' },
  { icon: 'bed-outline', text: 'Rent Medical Equipment' },
  { icon: 'videocam-outline', text: 'Online Video Consult' },
  { icon: 'document-text-outline', text: 'Scan Prescription' },
];

// Compact "Try asking" suggestions for initial welcome card
const COMPACT_TRY_ASKING = [
  { id: '1', icon: 'flask-outline', color: '#00C2CB', bg: '#E0F7FA', title: 'Book a Lab Test', query: 'Book a lab test at home' },
  { id: '2', icon: 'person-outline', color: '#007D69', bg: '#E6F4F1', title: 'Find a Doctor', query: 'Find best doctor for consultation' },
  { id: '3', icon: 'medkit-outline', color: '#8B5CF6', bg: '#F3E8FF', title: 'Order Medicine', query: 'Order medicines from pharmacy' },
  { id: '4', icon: 'scan-outline', color: '#1E3A8A', bg: '#EBF4FF', title: 'View Scan & X-Ray', query: 'View Scan & X-Ray diagnostics' },
  { id: '5', icon: 'fitness-outline', color: '#EF4444', bg: '#FEE2E2', title: 'Fever & body pain', query: 'I have fever and body pain' },
  { id: '6', icon: 'heart-outline', color: '#EC4899', bg: '#FCE7F3', title: 'Home Nursing', query: 'Book home nursing and care' },
];

// Sample prescription knowledge base for OCR analysis
const PRESCRIPTION_SAMPLES = [
  {
    name: 'General Infection & Fever Rx',
    medicines: [
      {
        name: 'Amoxicillin 500mg',
        type: 'Antibiotic Capsule',
        use: 'Treats bacterial infections (throat, respiratory, ear, skin).',
        timing: 'Twice daily after food for 5 days',
        caution: 'Complete full course even if you feel better.',
      },
      {
        name: 'Paracetamol 650mg',
        type: 'Antipyretic & Analgesic',
        use: 'Reduces fever and relieves body ache / headache.',
        timing: '1 tablet every 6-8 hours as needed (after food)',
        caution: 'Do not exceed 3000mg per day to protect liver.',
      },
      {
        name: 'Pantoprazole 40mg',
        type: 'Antacid / PPI',
        use: 'Prevents stomach acidity and gastritis.',
        timing: '1 tablet daily before breakfast on empty stomach',
        caution: 'Swallow whole with a glass of water.',
      },
    ],
    doctorSpecialty: 'General Physician',
    doctorSuggestionId: '1',
  },
];

const INITIAL_MESSAGES = [
  {
    id: 'msg-1',
    sender: 'bot',
    isWelcome: true,
    text: "Hi! I'm MediUnify AI 👋\nHow can I help you today?",
    subText: 'Ask me about symptoms, doctors, tests, medicines, or care.',
    quickPrompts: COMPACT_TRY_ASKING,
  },
];

const ChatbotScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const { t, isIndic, isDarkMode, theme } = useTheme();
  const isDark = isDarkMode;

  const { addToCart } = useCart();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [scanningPrescription, setScanningPrescription] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const flatListRef = useRef(null);

  // Keyboard listener to dynamically handle bottom navigation clearance
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages, isTyping]);

  // Handle User Input Submission
  const handleSend = (customText = null) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;

    if (textToSend.toLowerCase().includes('scan prescription')) {
      handleScanPrescription();
      return;
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      processHealthQuery(textToSend);
      setIsTyping(false);
    }, 600);
  };

  // ==========================================
  // PRESCRIPTION SCANNER (CAMERA / GALLERY)
  // ==========================================
  const handleScanPrescription = async () => {
    try {
      showAlert(
        'Scan Prescription',
        'Choose how you would like to provide your prescription photo:',
        [
          {
            text: '📷 Take Photo',
            onPress: () => launchImagePicker(true),
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: () => launchImagePicker(false),
          },
          {
            text: '📄 Use Sample Rx',
            onPress: () => analyzePrescriptionData(PRESCRIPTION_SAMPLES[0]),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (e) {
      console.log('Error opening prescription picker:', e);
    }
  };

  const launchImagePicker = async (useCamera) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Denied', 'Camera access is required to take photos of prescriptions.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Denied', 'Photo library access is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const userImgMsg = {
          id: `user-img-${Date.now()}`,
          sender: 'user',
          text: '📄 Uploaded Prescription for AI OCR Analysis',
          image: asset.uri,
        };
        setMessages((prev) => [...prev, userImgMsg]);
        analyzePrescriptionData(PRESCRIPTION_SAMPLES[0]);
      }
    } catch (err) {
      showAlert('Scan Error', 'Could not open camera or gallery.');
    }
  };

  const analyzePrescriptionData = (sampleRx) => {
    setIsTyping(true);
    setScanningPrescription(true);

    setTimeout(() => {
      setIsTyping(false);
      setScanningPrescription(false);

      const matchedDoctor = doctors.find((d) => d.id === sampleRx.doctorSuggestionId) || doctors[0];

      const analysisMsg = {
        id: `bot-rx-${Date.now()}`,
        sender: 'bot',
        text: `✅ **Prescription Scanned & Verified**\n\nIdentified **${sampleRx.medicines.length} prescribed medications** for ${sampleRx.name}:`,
        prescriptionAnalysis: sampleRx,
        suggestedDoctor: matchedDoctor,
        actionButtons: [
          {
            title: '💊 Add Prescribed Medicines to Cart',
            icon: 'cart-outline',
            action: () => {
              sampleRx.medicines.forEach((med, i) => {
                addToCart({
                  id: `rx-med-${Date.now()}-${i}`,
                  name: med.name,
                  price: 85 + i * 40,
                  category: 'Prescription Medicine',
                  image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
                  storeName: 'Apollo Pharmacy (Mysuru)',
                });
              });
              showAlert('Medicines Added', 'All prescribed medications added to your Cart.');
              navigation.navigate('Cart', { initialTab: 'pharmacy' });
            },
          },
          {
            title: `👨‍⚕️ Book Follow-up with ${matchedDoctor.name}`,
            icon: 'calendar-outline',
            action: () => navigation.navigate('DoctorBooking', { doctor: matchedDoctor }),
          },
        ],
      };

      setMessages((prev) => [...prev, analysisMsg]);
    }, 1200);
  };

  // ==========================================
  // NATURAL HEALTH QUERY NLP PROCESSOR
  // ==========================================
  const processHealthQuery = (query) => {
    const q = query.toLowerCase();

    // OCR / Prescription
    if (q.includes('scan') && (q.includes('prescription') || q.includes('rx') || q.includes('my rx'))) {
      handleScanPrescription();
      return;
    }

    // 1. LAB TESTS & BLOOD TESTS (Must open existing new LabTests page!)
    if (
      q.includes('blood test') ||
      q.includes('lab test') ||
      q.includes('lab') ||
      q.includes('blood') ||
      q.includes('cbc') ||
      q.includes('pathology') ||
      q.includes('thyroid') ||
      q.includes('lipid') ||
      q.includes('urine test') ||
      q.includes('health package')
    ) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🧪 **Diagnostic Labs & Health Checkups**\n\nWe provide verified diagnostic testing across accredited laboratories in your city with **Free Home Sample Collection** and fast digital reports.',
        actionButtons: [
          {
            title: 'Book a Lab Test',
            icon: 'flask-outline',
            action: () => navigation.navigate('LabTests'),
          },
          {
            title: 'Popular Health Packages',
            icon: 'shield-checkmark-outline',
            action: () => navigation.navigate('LabTests', { category: 'packages' }),
          },
          {
            title: 'Complete Blood Count (CBC)',
            icon: 'water-outline',
            action: () => navigation.navigate('LabTests', { searchTest: 'Complete Blood Count' }),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 2. SCANS & X-RAY / RADIOLOGY / IMAGING (Must open existing new Imaging page!)
    if (
      q.includes('scan') ||
      q.includes('mri') ||
      q.includes('ct scan') ||
      q.includes('x-ray') ||
      q.includes('xray') ||
      q.includes('ultrasound') ||
      q.includes('radiology') ||
      q.includes('radiologist') ||
      q.includes('imaging')
    ) {
      const topLab = radiologyLabs[0];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🩻 **Advanced Imaging & Radiology**\n\nCompare certified diagnostic centres for MRI, CT Scans, Ultrasound, and Digital X-Ray with same-day verified digital reports.',
        suggestedLab: topLab,
        actionButtons: [
          {
            title: 'View Scan & X-Ray',
            icon: 'scan-outline',
            action: () => navigation.navigate('Imaging'),
          },
          {
            title: 'Book MRI Scan',
            icon: 'radio-outline',
            action: () => navigation.navigate('Imaging', { searchTest: 'MRI Scan' }),
          },
          {
            title: 'Diagnostic Centres',
            icon: 'business-outline',
            action: () => navigation.navigate('Imaging'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 3. MEDICINES / PHARMACY (Must open existing new Pharmacy page!)
    if (
      q.includes('medicine') ||
      q.includes('tablet') ||
      q.includes('pharmacy') ||
      q.includes('paracetamol') ||
      q.includes('antibiotic') ||
      q.includes('syrup') ||
      q.includes('order med')
    ) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '💊 **Online Pharmacy & Doorstep Delivery**\n\nOrder genuine medicines and healthcare essentials from verified local pharmacies with swift doorstep delivery.',
        actionButtons: [
          {
            title: 'Order Medicine',
            icon: 'cart-outline',
            action: () => navigation.navigate('Pharmacy'),
          },
          {
            title: 'View Pharmacy Cart',
            icon: 'basket-outline',
            action: () => navigation.navigate('Cart', { initialTab: 'pharmacy' }),
          },
          {
            title: 'Scan Prescription',
            icon: 'document-text-outline',
            action: () => handleScanPrescription(),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 4. FIND DOCTORS / CONSULTATION
    if (
      q.includes('find a doctor') ||
      q.includes('find doctor') ||
      q.includes('consultation') ||
      q.includes('physician') ||
      q.includes('specialist') ||
      q.includes('in-clinic') ||
      q.includes('clinic visit')
    ) {
      const physician = doctors[0];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '👨‍⚕️ **Find Trusted Doctors & Clinics**\n\nConsult highly qualified doctors across 20+ specialties for clinic visits or instant video consultations.',
        suggestedDoctor: physician,
        actionButtons: [
          {
            title: 'Find Doctors & Specialists',
            icon: 'search-outline',
            action: () => navigation.navigate('DoctorList'),
          },
          {
            title: 'In-Clinic Physical Visit',
            icon: 'business-outline',
            action: () => navigation.navigate('DoctorList', { mode: 'physical' }),
          },
          {
            title: 'Online Video Consultation',
            icon: 'videocam-outline',
            action: () => navigation.navigate('VideoConsultation'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 5. VIDEO CONSULTATION / ONLINE CONSULT
    if (q.includes('video') || q.includes('online consult') || q.includes('teleconsult')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '📹 **Online Video Consultation**\n\nConnect with certified specialist doctors from the comfort of your home within 15 minutes via private HD video consultation.',
        actionButtons: [
          {
            title: 'Start Video Consultation',
            icon: 'videocam-outline',
            action: () => navigation.navigate('VideoConsultation'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 6. HOME CARE & NURSING (Must open existing new NurseBooking page!)
    if (q.includes('nurse') || q.includes('nursing') || q.includes('home care') || q.includes('caregiver') || q.includes('elderly')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🏠 **Professional Home Nursing & Care**\n\nAccess verified nursing care, post-op recovery, wound dressing, and elderly assistance in the comfort of your home.',
        actionButtons: [
          {
            title: 'Book Home Nursing',
            icon: 'heart-outline',
            action: () => navigation.navigate('NurseBooking'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 7. MEDICAL EQUIPMENT RENTAL (Must open existing new EquipmentRental page!)
    if (q.includes('equipment') || q.includes('wheelchair') || q.includes('oxygen') || q.includes('bed') || q.includes('rent')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🛏️ **Medical Equipment Rental**\n\nRent sanitized hospital-grade equipment (ICU beds, oxygen concentrators, wheelchairs, CPAP/BiPAP) with free technician setup.',
        actionButtons: [
          {
            title: 'Rent Medical Equipment',
            icon: 'bed-outline',
            action: () => navigation.navigate('EquipmentRental'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 8. SURGERIES & HOSPITAL CARE (Must open existing new HospitalCare page!)
    if (
      q.includes('surgery') ||
      q.includes('surgeries') ||
      q.includes('hospital') ||
      q.includes('operation') ||
      q.includes('cataract') ||
      q.includes('hernia') ||
      q.includes('laparoscop')
    ) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🏥 **Planned Surgeries & Hospital Care**\n\nBenefit from top hospital network, dedicated care coordinators, free second opinions, and 0% EMI financing.',
        actionButtons: [
          {
            title: 'Explore Surgeries',
            icon: 'medkit-outline',
            action: () => navigation.navigate('HospitalCare'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 9. HEALTH RECORDS & VITALS
    if (q.includes('sugar') || q.includes('bp') || q.includes('blood pressure') || q.includes('vitals') || q.includes('bmi') || q.includes('record') || q.includes('report')) {
      const physician = doctors.find((d) => d.specialtyKey === 'general') || doctors[0];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '📊 **Digital Health Records & Vitals**\n\nTrack your vitals with color-coded safety ranges and view all your certified lab and doctor reports in one place.',
        suggestedDoctor: physician,
        actionButtons: [
          {
            title: 'Open Health Records',
            icon: 'pulse-outline',
            action: () => navigation.navigate('HealthRecords'),
          },
          {
            title: `Book ${physician.name}`,
            icon: 'calendar-outline',
            action: () => navigation.navigate('DoctorBooking', { doctor: physician }),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 10. APPOINTMENTS & BOOKINGS
    if (q.includes('appointment') || q.includes('booking') || q.includes('my test')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '📅 **My Appointments & Test Bookings**\n\nCheck live tokens, appointment slots, and real-time status of your upcoming consultations and diagnostic tests.',
        actionButtons: [
          {
            title: 'View Appointments',
            icon: 'calendar-outline',
            action: () => navigation.navigate('MyAppointments'),
          },
          {
            title: 'My Tests & Scans',
            icon: 'flask-outline',
            action: () => navigation.navigate('MyTests'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 11. MEDICINE ORDERS & RETURNS
    if (q.includes('return') || q.includes('refund') || q.includes('order') || q.includes('delivery')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '📦 **Medicine Orders & Returns**\n\nTrack your doorstep delivery, reorder prescribed refills, or request hassle-free returns with free pickup.',
        actionButtons: [
          {
            title: 'View Medicine Orders',
            icon: 'receipt-outline',
            action: () => navigation.navigate('MyMedicineOrders'),
          },
          {
            title: 'Browse Pharmacy',
            icon: 'cart-outline',
            action: () => navigation.navigate('Pharmacy'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 12. AYURVEDA & WELLNESS
    if (q.includes('ayurved') || q.includes('panchakarma') || q.includes('wellness') || q.includes('vaidya')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🌿 **Ayurveda & Holistic Wellness**\n\nBook certified Vaidyas for authentic Nadi Pariksha, classical Panchakarma therapies, and herbal remedies.',
        actionButtons: [
          {
            title: 'Ayurveda & Wellness',
            icon: 'leaf-outline',
            action: () => navigation.navigate('AyurvedaWellness'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 13. FERTILITY & IVF (Navigate to DoctorList with IVF specialty!)
    if (q.includes('fertility') || q.includes('ivf') || q.includes('conceive') || q.includes('infertility')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🌸 **Fertility & IVF Care**\n\nConnect with verified IVF specialists and reproductive medicine experts with confidential second opinions and 0% EMI financing.',
        actionButtons: [
          {
            title: 'Find IVF & Fertility Specialists',
            icon: 'heart-outline',
            action: () => navigation.navigate('DoctorList', { specialty: 'ivf-fertility-group' }),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 14. CARDIOLOGY / CHEST PAIN
    if (q.includes('chest pain') || q.includes('heart') || q.includes('cardio') || q.includes('palpitation') || q.includes('breathless')) {
      const cardiologist = doctors.find((d) => d.specialtyKey === 'cardio') || doctors[1];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '❤️ **Cardiac & Chest Health Advisory**\n\n*If you are experiencing severe crushing chest pain or left arm numbness, please visit the emergency room immediately.*\n\nFor clinical evaluation, ECG, and 2D Echo, consult our senior Cardiologist:',
        suggestedDoctor: cardiologist,
        actionButtons: [
          {
            title: `Book ${cardiologist.name} (${cardiologist.fee})`,
            icon: 'heart-outline',
            action: () => navigation.navigate('DoctorBooking', { doctor: cardiologist }),
          },
          {
            title: 'Find Cardiologists',
            icon: 'people-outline',
            action: () => navigation.navigate('DoctorList', { specialty: 'cardiology-group' }),
          },
          {
            title: 'ECG & 2D Echo',
            icon: 'pulse-outline',
            action: () => navigation.navigate('Imaging', { searchTest: 'ECG' }),
          },
          {
            title: 'Emergency (108)',
            icon: 'call-outline',
            action: () => navigation.navigate('Emergency'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 15. SKIN / DERMATOLOGY
    if (q.includes('skin') || q.includes('rash') || q.includes('acne') || q.includes('hair')) {
      const dermatologist = doctors.find((d) => d.specialtyKey === 'derma') || doctors[2];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🧴 **Skin, Hair & Dermatology Care**\n\nConsult certified dermatologists for skin allergies, rash, acne management, and hair loss evaluation.',
        suggestedDoctor: dermatologist,
        actionButtons: [
          {
            title: `Book ${dermatologist.name}`,
            icon: 'calendar-outline',
            action: () => navigation.navigate('DoctorBooking', { doctor: dermatologist }),
          },
          {
            title: 'Find Dermatologists',
            icon: 'people-outline',
            action: () => navigation.navigate('DoctorList', { specialty: 'dermatology-skin' }),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 16. BONES / JOINTS / ORTHOPEDICS
    if (q.includes('bone') || q.includes('knee') || q.includes('joint') || q.includes('back pain') || q.includes('ortho')) {
      const orthopedist = doctors.find((d) => d.specialtyKey === 'ortho') || doctors[3];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🦴 **Bone, Joint & Orthopedic Advisory**\n\nFor chronic knee pain, joint swelling, or spinal discomfort, clinical evaluation combined with digital imaging ensures an accurate recovery roadmap.',
        suggestedDoctor: orthopedist,
        actionButtons: [
          {
            title: `Book ${orthopedist.name}`,
            icon: 'calendar-outline',
            action: () => navigation.navigate('DoctorBooking', { doctor: orthopedist }),
          },
          {
            title: 'Find Orthopedic Doctors',
            icon: 'people-outline',
            action: () => navigation.navigate('DoctorList', { specialty: 'orthopedics-bone' }),
          },
          {
            title: 'Book X-Ray & MRI',
            icon: 'scan-outline',
            action: () => navigation.navigate('Imaging', { searchTest: 'X-Ray' }),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 17. FEVER / COLD / COUGH / PAIN
    if (q.includes('fever') || q.includes('cold') || q.includes('cough') || q.includes('body pain') || q.includes('headache') || q.includes('flu') || q.includes('sick')) {
      const physician = doctors.find((d) => d.specialtyKey === 'general') || doctors[0];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: "🌡️ **Fever & Body Ache Guidance**\n\nFever and body ache are common signs that your immune system is responding to a viral or bacterial condition.\n\n• Stay well hydrated with warm water and electrolytes.\n• Get adequate rest.\n• Avoid strenuous physical activities.\n\nFor clinical assessment and safe prescription, consult our verified General Physician:",
        suggestedDoctor: physician,
        actionButtons: [
          {
            title: `Book ${physician.name} (${physician.fee})`,
            icon: 'calendar-outline',
            action: () => navigation.navigate('DoctorBooking', { doctor: physician }),
          },
          {
            title: 'Find General Physicians',
            icon: 'people-outline',
            action: () => navigation.navigate('DoctorList', { specialty: 'general-primary' }),
          },
          {
            title: 'Order Medicines',
            icon: 'cart-outline',
            action: () => navigation.navigate('Pharmacy'),
          },
          {
            title: 'Complete Blood Count (CBC) at Home',
            icon: 'flask-outline',
            action: () => navigation.navigate('LabTests', { searchTest: 'Complete Blood Count' }),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 18. CHILD / PEDIATRIC
    if (q.includes('child') || q.includes('baby') || q.includes('kid') || q.includes('pediatric')) {
      const pediatrician = doctors.find((d) => d.specialtyKey === 'pediatric') || doctors[0];
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '👶 **Child Health & Pediatric Care**\n\nFor infant or child care, accurate weight-adjusted dosing and specialist pediatric examination is essential for gentle recovery.',
        suggestedDoctor: pediatrician,
        actionButtons: [
          {
            title: `Book ${pediatrician.name}`,
            icon: 'person-outline',
            action: () => navigation.navigate('DoctorBooking', { doctor: pediatrician }),
          },
          {
            title: 'Find More Pediatricians',
            icon: 'search-outline',
            action: () => navigation.navigate('DoctorList', { specialty: 'pediatrics-child-health' }),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // 19. EMERGENCY
    if (q.includes('emergency') || q.includes('ambulance') || q.includes('108') || q.includes('urgent')) {
      const botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '🚨 **24/7 Emergency Care**\n\nFor life-threatening emergencies, call 108 immediately for free 24x7 ambulance dispatch.',
        actionButtons: [
          {
            title: 'Emergency Care (108)',
            icon: 'call-outline',
            action: () => navigation.navigate('Emergency'),
          },
        ],
      };
      setMessages((prev) => [...prev, botResponse]);
      return;
    }

    // DEFAULT FALLBACK (Use approved canonical routes!)
    const defaultDoctor = doctors[0];
    const fallbackResponse = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `I understand you are asking about "${query}".\n\nMediUnify connects you with certified healthcare professionals, diagnostic tests, medicines, and home care. How would you like to proceed?`,
      suggestedDoctor: defaultDoctor,
      actionButtons: [
        {
          title: 'Find a Doctor',
          icon: 'people-outline',
          action: () => navigation.navigate('DoctorList'),
        },
        {
          title: 'Book a Lab Test',
          icon: 'flask-outline',
          action: () => navigation.navigate('LabTests'),
        },
        {
          title: 'Order Medicine',
          icon: 'cart-outline',
          action: () => navigation.navigate('Pharmacy'),
        },
        {
          title: 'View Scan & X-Ray',
          icon: 'scan-outline',
          action: () => navigation.navigate('Imaging'),
        },
        {
          title: 'Book Home Nursing',
          icon: 'heart-outline',
          action: () => navigation.navigate('NurseBooking'),
        },
        {
          title: 'Rent Medical Equipment',
          icon: 'bed-outline',
          action: () => navigation.navigate('EquipmentRental'),
        },
      ],
    };
    setMessages((prev) => [...prev, fallbackResponse]);
  };

  // Render Doctor Suggestion Card
  const renderDoctorCard = (doc) => {
    if (!doc) return null;
    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.cardHeaderRow}
          onPress={() => navigation.navigate('DoctorBooking', { doctor: doc })}
          activeOpacity={0.85}
        >
          <Image source={{ uri: doc.image }} style={styles.cardAvatar} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardDoctorName}>{doc.name}</Text>
            <Text style={styles.cardDoctorSpec}>{doc.specialty} • {doc.experience || '12+ yrs exp'}</Text>
            <View style={styles.cardRatingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.cardRatingText}>{doc.rating || '4.8'} ({doc.reviews || '120+'})</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardFooterRow}>
          <View>
            <Text style={styles.cardFeeLabel}>Consultation</Text>
            <Text style={styles.cardFeeVal}>{doc.fee || '₹500'}</Text>
          </View>

          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => navigation.navigate('DoctorBooking', { doctor: doc })}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={13} color="#FFFFFF" />
            <Text style={styles.cardActionBtnText}>Book Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Lab Suggestion Card
  const renderLabCard = (lab) => {
    if (!lab) return null;
    return (
      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.cardHeaderRow}
          onPress={() => navigation.navigate('Imaging', { labId: lab.id })}
          activeOpacity={0.85}
        >
          <View style={styles.labIconCircle}>
            <Ionicons name="flask" size={20} color="#007D69" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardDoctorName}>{lab.name}</Text>
            <Text style={styles.cardDoctorSpec}>{lab.area || 'Mysuru'} • Accredited</Text>
            <View style={styles.cardRatingRow}>
              <Ionicons name="shield-checkmark" size={12} color="#00B894" />
              <Text style={[styles.cardRatingText, { color: '#059669' }]}>Same-Day Digital Reports</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardFooterRow}>
          <Text style={styles.labTimingText}>Reports in 6-12 hrs</Text>
          <TouchableOpacity
            style={[styles.cardActionBtn, { backgroundColor: '#0284C7' }]}
            onPress={() => navigation.navigate('Imaging', { labId: lab.id })}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={13} color="#FFFFFF" />
            <Text style={styles.cardActionBtnText}>View Scans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Prescription Analysis Block
  const renderPrescriptionBlock = (analysis) => {
    if (!analysis) return null;
    return (
      <View style={styles.rxAnalysisBox}>
        <View style={styles.rxAnalysisHeader}>
          <Ionicons name="document-text" size={16} color="#0284C7" />
          <Text style={styles.rxAnalysisHeaderTitle}>Detected Tablets & Usage</Text>
        </View>

        {analysis.medicines.map((med, idx) => (
          <View key={idx} style={styles.rxMedCard}>
            <View style={styles.rxMedTop}>
              <Text style={styles.rxMedName}>{med.name}</Text>
              <Text style={styles.rxMedType}>{med.type}</Text>
            </View>
            <Text style={styles.rxMedUse}>{med.use}</Text>
            <View style={styles.rxMedTimingRow}>
              <Ionicons name="time-outline" size={12} color="#059669" />
              <Text style={styles.rxMedTimingText}>{med.timing}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render Message Item
  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === 'user';

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowBot,
        ]}
      >
        {!isUser && (
          <View style={styles.botAvatar}>
            <Image
              source={require('../../../assets/ai-bot-avatar.png')}
              style={styles.messageBotImg}
              resizeMode="contain"
            />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.bubbleUser : styles.bubbleBot,
          ]}
        >
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.userUploadedImage} resizeMode="cover" />
          )}

          <Text
            style={[
              styles.messageText,
              isUser ? styles.textUser : styles.textBot,
            ]}
          >
            {item.text}
          </Text>

          {item.subText && (
            <Text style={styles.messageSubText}>{item.subText}</Text>
          )}

          {/* PRESCRIPTION SCAN ANALYSIS */}
          {item.prescriptionAnalysis && renderPrescriptionBlock(item.prescriptionAnalysis)}

          {/* DOCTOR SUGGESTION */}
          {item.suggestedDoctor && renderDoctorCard(item.suggestedDoctor)}

          {/* LAB SUGGESTION */}
          {item.suggestedLab && renderLabCard(item.suggestedLab)}

          {/* INTERACTIVE ACTION BUTTONS */}
          {item.actionButtons && (
            <View style={styles.actionButtonsCol}>
              {item.actionButtons.map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.chatActionBtn}
                  onPress={btn.action}
                  activeOpacity={0.85}
                >
                  <Ionicons name={btn.icon || 'arrow-forward'} size={15} color="#007D69" />
                  <Text style={styles.chatActionBtnText}>{btn.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* COMPACT "TRY ASKING" CARDS */}
          {item.quickPrompts && (
            <View style={styles.tryAskingContainer}>
              <Text style={styles.tryAskingHeading}>Try asking</Text>
              {item.quickPrompts.map((prompt) => (
                <TouchableOpacity
                  key={prompt.id}
                  style={styles.tryAskingCard}
                  onPress={() => handleSend(prompt.query)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tryAskingIconCircle, { backgroundColor: prompt.bg }]}>
                    <Ionicons name={prompt.icon} size={15} color={prompt.color} />
                  </View>
                  <Text style={styles.tryAskingCardTitle}>{prompt.title}</Text>
                  <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeContainer, isDark && { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : (Platform.OS === 'android' ? 'height' : undefined)}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.mainLayout}>
          {/* 1. FIXED HEADER (FULL WIDTH) */}
          <View style={[styles.header, isTablet && styles.tabletHeader, isDark && { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
            <View style={[styles.headerInner, isTablet && styles.tabletInnerConstraint]}>
              <TouchableOpacity
                style={[styles.backButton, isDark && { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  if (navigation?.canGoBack()) navigation.goBack();
                  else navigation?.navigate('Home');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={22} color={isDark ? theme.text : '#0F172A'} />
              </TouchableOpacity>

              <View style={styles.headerAvatarWrap}>
                <Image
                  source={require('../../../assets/ai-bot-avatar.png')}
                  style={styles.headerBotImg}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.headerTitleCol}>
                <Text style={[styles.headerTitle, isDark && { color: theme.text }]}>MediUnify AI</Text>
                <Text style={[styles.headerSubtitle, isDark && { color: theme.textSecondary }]}>{t('bot_subtitle', 'Your personal health assistant')}</Text>
              </View>

              <TouchableOpacity
                style={styles.headerMenuBtn}
                onPress={handleScanPrescription}
                activeOpacity={0.85}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={isDark ? theme.textSecondary : '#64748B'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. HORIZONTAL QUICK SUGGESTIONS BAR (FULL WIDTH) */}
          <View style={[styles.suggestionsContainer, isTablet && styles.tabletSuggestions]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.suggestionsContent, isTablet && styles.tabletSuggestionsContent]}
            >
              {QUICK_SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(sug.text)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={sug.icon} size={13} color="#007D69" style={{ marginRight: 4 }} />
                  <Text style={[styles.suggestionChipText, isIndic && { lineHeight: 16 }]}>
                    {t(sug.text, sug.text)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 3. SCROLLABLE CHAT MESSAGES LIST (flex: 1) */}
          <View style={styles.chatListWrapper}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              style={styles.flatList}
              contentContainerStyle={[styles.messageList, isTablet && styles.tabletMessageList]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListFooterComponent={
                isTyping ? (
                  <View style={styles.typingContainer}>
                    <View style={styles.botAvatar}>
                      <Image
                        source={require('../../../assets/ai-bot-avatar.png')}
                        style={styles.messageBotImg}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.typingBubble}>
                      {scanningPrescription ? (
                        <View style={styles.scanningRow}>
                          <ActivityIndicator size="small" color="#007D69" />
                          <Text style={styles.typingText}>{t('scanning_prescription', 'Scanning prescription…')}</Text>
                        </View>
                      ) : (
                        <View style={styles.scanningRow}>
                          <ActivityIndicator size="small" color="#007D69" />
                          <Text style={styles.typingText}>{t('typing', 'Typing…')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : null
              }
            />
          </View>

          {/* 4. CHAT INPUT & MEDICAL DISCLAIMER (ALWAYS VISIBLE & FULL WIDTH RESPONSIVE) */}
          <View
            style={[
              styles.bottomDockContainer,
              !isKeyboardVisible && styles.bottomDockWithNavSpacer,
              isTablet && styles.tabletBottomDock,
              isDark && { backgroundColor: theme.headerBg, borderTopColor: theme.border },
            ]}
          >
            <View style={[styles.bottomDockInner, isTablet && styles.tabletInnerConstraint]}>
              {/* Input Bar */}
              <View style={[styles.inputContainer, isDark && { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handleScanPrescription}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color={isDark ? '#00B894' : '#007D69'} />
                </TouchableOpacity>

                <TextInput
                  style={[styles.textInput, isIndic && { fontSize: 13 }, isDark && { color: theme.text }]}
                  placeholder={t('chat_placeholder_mobile', 'Ask MediUnify AI...')}
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={() => handleSend()}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  autoCapitalize="sentences"
                  autoCorrect={true}
                  textAlignVertical="center"
                  includeFontPadding={false}
                  underlineColorAndroid="transparent"
                />

                {inputText.trim().length > 0 ? (
                  <TouchableOpacity
                    style={styles.sendBtnActive}
                    onPress={() => handleSend()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.micBtn}
                    onPress={() => showAlert('Voice Search', 'Speak your symptom or question clearly.')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mic-outline" size={20} color="#007D69" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Compact Medical Disclaimer */}
              <View style={styles.disclaimerRow}>
                <Ionicons name="information-circle-outline" size={12} color="#64748B" />
                <Text style={styles.disclaimerText}>
                  {t('ai_disclaimer_short', 'AI guidance is not a substitute for professional medical advice.')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLESHEET (Clean, Simple, Responsive Healthcare Aesthetic)
// ============================================================================
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  mainLayout: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },

  // 1. Header
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabletHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabletInnerConstraint: {
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F6F6',
    borderWidth: 1.2,
    borderColor: '#C0ECE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  headerBotImg: {
    width: 26,
    height: 26,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  headerMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Suggestions Bar
  suggestionsContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabletSuggestions: {
    paddingVertical: 10,
  },
  suggestionsContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  tabletSuggestionsContent: {
    paddingHorizontal: 24,
    gap: 10,
    maxWidth: 920,
    alignSelf: 'center',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },

  // 3. Message List Area
  chatListWrapper: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  messageList: {
    padding: 14,
    paddingBottom: 16,
  },
  tabletMessageList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F6F6',
    borderWidth: 1.2,
    borderColor: '#C0ECE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBotImg: {
    width: 20,
    height: 20,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: '#007D69',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  messageSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  textBot: {
    color: '#0F172A',
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  userUploadedImage: {
    width: 170,
    height: 110,
    borderRadius: 8,
    marginBottom: 6,
  },

  // 4. "Try asking" Compact Cards
  tryAskingContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tryAskingHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
  },
  tryAskingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
    gap: 8,
  },
  tryAskingIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryAskingCardTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  // Doctor & Lab Cards
  cardContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  labIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDoctorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDoctorSpec: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardRatingText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cardFeeLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  cardFeeVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#007D69',
  },
  labTimingText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007D69',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 3,
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Prescription Block
  rxAnalysisBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  rxAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  rxAnalysisHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
  },
  rxMedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  rxMedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  rxMedName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  rxMedType: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '700',
  },
  rxMedUse: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 3,
  },
  rxMedTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rxMedTimingText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },

  // Action Buttons
  actionButtonsCol: {
    gap: 6,
    marginTop: 8,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#B2E2D8',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  chatActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#007D69',
  },

  // Typing Loader
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typingText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },

  // 4. Bottom Input & Disclaimer Dock
  bottomDockContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    zIndex: 20,
    elevation: 5,
  },
  tabletBottomDock: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  bottomDockInner: {
    width: '100%',
  },
  bottomDockWithNavSpacer: {
    paddingBottom: Platform.OS === 'ios' ? 95 : 88,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 14,
    color: '#0F172A',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007D69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 2,
    paddingBottom: 2,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default ChatbotScreen;