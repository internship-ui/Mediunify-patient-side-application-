import React, { useState, useEffect, useMemo, useRef } from 'react';
import { validateAddressMatchesCity } from '../../../utils/addressLocationValidator';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  useWindowDimensions,
  Modal,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../../utils/alert';
import { saveTransaction } from '../../../services/transactionService';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import {
  availableNursingServices,
  howItWorksSteps,
  careTimelineStages,
  NURSING_WORKFLOW_STAGES,
  getNursingStageIndex,
  assignedNursesData,
  initialNursingRequests,
} from '../../../data/homeNursingData';
import { useAuthGuard } from '../../../context/AuthGuardContext';
import { isGuestUser, promptLoginRequired } from '../../../utils/authHelper';

const ASYNC_KEY_NURSING_REQUESTS = '@unnathi_home_nursing_requests';
const NURSING_CARE_NEEDS = [
  'General Nursing Consultation',
  'Post-Surgical Wound Dressing',
  'Daily Injection Administration (IM/IV)',
  'Catheter Care & Changing',
  'IV Infusion & Drip Management',
  '12-Hour Day Shift Nursing',
  '12-Hour Night Shift Nursing',
  '24-Hour Critical Bedridden Care',
  'Elderly Care & Vitals Monitoring',
  'Tracheostomy & Suctioning Care',
  'Mother & Newborn Care',
];

const PREFERRED_TIME_SLOTS = [
  'Morning (08:00 AM - 11:00 AM)',
  'Afternoon (12:00 PM - 03:00 PM)',
  'Evening (04:00 PM - 07:00 PM)',
  'Night (08:00 PM - 11:00 PM)',
  'Within 2-4 Hours (Immediate)',
];


// Extended pricing and duration metadata for services
const SERVICE_METADATA = {
  'ns-1': { price: '₹299', duration: '30 mins', shiftType: 'Per Visit', popular: true, tag: 'Most Booked' },
  'ns-2': { price: '₹349', duration: '45 mins', shiftType: 'Per Visit', popular: false },
  'ns-3': { price: '₹449', duration: '45 mins', shiftType: 'Per Visit', popular: true, tag: 'Post-Surgery Favorite' },
  'ns-4': { price: '₹249', duration: '30 mins', shiftType: 'Per Visit', popular: false },
  'ns-5': { price: '₹199', duration: '20 mins', shiftType: 'Per Visit', popular: false },
  'ns-6': { price: '₹799', duration: '90 mins', shiftType: 'Per Visit / Shift', popular: true, tag: 'Doctor Recommended' },
  'ns-7': { price: '₹549', duration: '45 mins', shiftType: 'Per Visit', popular: false },
  'ns-8': { price: '₹1,199', duration: '8 Hours', shiftType: 'Day Shift', popular: false },
  'ns-9': { price: '₹1,299', duration: '12 Hours', shiftType: 'Full Day / Night', popular: true, tag: 'Elderly Care' },
  'ns-10': { price: '₹999', duration: '2 Hours', shiftType: 'Transition Care', popular: false },
  'ns-11': { price: 'Custom Quote', duration: 'Flexible', shiftType: 'Tailored Scope', popular: false },
};

const SERVICE_NUMERIC_PRICES = {
  'ns-1': 299,
  'ns-2': 349,
  'ns-3': 449,
  'ns-4': 249,
  'ns-5': 199,
  'ns-6': 799,
  'ns-7': 549,
  'ns-8': 1199,
  'ns-9': 1299,
  'ns-10': 999,
  'ns-11': 899,
};

const getServicePriceByName = (srvName) => {
  const found = availableNursingServices.find((s) => s.name === srvName);
  if (found && SERVICE_NUMERIC_PRICES[found.id]) {
    return SERVICE_NUMERIC_PRICES[found.id];
  }
  return 299;
};

const CALENDAR_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SERVICE_CATEGORIES = [
  'All Services',
  'Post-Surgical',
  'Wound & Dressing',
  'Injections & IV',
  'Geriatric Care',
  'Monitoring',
  'Intensive & Bedridden',
];

const PATIENT_TESTIMONIALS = [
  {
    id: 't1',
    patient: 'S. Venkataram (76 yrs)',
    family: 'Booked by son Arun V.',
    location: 'Saraswathipuram, Mysuru',
    rating: 5,
    service: 'Post-Op Hip Surgery & Dressing',
    text: 'Nurse Anita was exceptionally gentle with my mother after her hip replacement. Sterile dressing, daily vitals, and very polite. Coordinator called in 10 mins. Truly hospital-grade care at home.',
    date: '3 days ago',
  },
  {
    id: 't2',
    patient: 'Savithri Devi (72 yrs)',
    family: 'Booked by daughter Deepa M.',
    location: 'Gokulam 3rd Stage, Mysuru',
    rating: 5,
    service: 'Daily Insulin & Vital Monitoring',
    text: 'We were struggling with managing morning insulin injections and blood sugar spikes. MediUnify assigned a licensed B.Sc nurse who arrives exactly at 8 AM every day. Zero advance deposit needed.',
    date: '1 week ago',
  },
  {
    id: 't3',
    patient: 'Anand Murthy (68 yrs)',
    family: 'Booked by spouse Lakshmi M.',
    location: 'Jayalakshmipuram, Mysuru',
    rating: 5,
    service: '12-Hour Night Nursing Care',
    text: 'Post-stroke night supervision was our biggest worry. Nurse Suresh is attentive, highly trained in catheter care and patient repositioning. Gives our family immense peace of mind.',
    date: '2 weeks ago',
  },
];

const FAQS = [
  {
    q: 'How quickly can a certified nurse visit our home?',
    a: 'For urgent requirements (injections, acute wound dressing, post-discharge catheter care), a verified nurse can arrive within 2 to 4 hours in Mysuru and Bengaluru. Routine shifts can be scheduled at your preferred time slot.',
  },
  {
    q: 'Are the nurses qualified and background-verified?',
    a: 'Yes, 100% of our nursing personnel are licensed GNM (General Nursing and Midwifery) or B.Sc Nursing degree holders registered with the Karnataka Nursing Council (KNC), with rigorous police verification and hospital experience.',
  },
  {
    q: 'Do nurses bring their own sterile medical consumables?',
    a: 'Yes! Nurses arrive equipped with sterile single-use medical kits including gloves, alcohol swabs, sterile gauze, betadine, disposable syringes, and digital vital instruments (BP, SpO2, thermometer).',
  },
  {
    q: 'Do I need to make an advance payment before booking?',
    a: 'No advance payment is required! You only pay after your care request is reviewed by our clinical coordinator and the visit is completed.',
  },
  {
    q: 'Can we request the same nurse for recurring daily visits?',
    a: 'Absolutely. In Step 3 of our booking flow, you can choose "Prefer the Same Nurse for Future Visits" to ensure continuity of care with a familiar clinician.',
  },
];

const NurseBookingScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const { requireLogin } = useAuthGuard();

  // Active top-level view: 'LANDING' | 'REQUEST_FLOW' | 'MY_REQUESTS' | 'REQUEST_DETAILS'
  const [currentView, setCurrentView] = useState('LANDING');

  // Multi-step request flow: 1: Services, 2: Patient, 3: Preferences, 4: Review, 5: Confirmation
  const [flowStep, setFlowStep] = useState(1);

  // Filter & Search states on Landing
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Services');
  const [activeFaqIndex, setActiveFaqIndex] = useState(null);

  // Form State: Step 1 Services
  const [selectedServices, setSelectedServices] = useState(['Wound Dressing']);
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceError, setServiceError] = useState(null);

  // Form State: Step 2 Patient Details
  const [patientName, setPatientName] = useState('Ramesh Kumar');
  const [patientAge, setPatientAge] = useState('58');
  const [patientGender, setPatientGender] = useState('Male');
  const [relationship, setRelationship] = useState('Self');
  const [contactNumber, setContactNumber] = useState('+91 98450 12345');
  const [address, setAddress] = useState('No. 44, 2nd Cross, Saraswathipuram, Mysuru - 570009');
  const [careInfo, setCareInfo] = useState('Post-abdominal surgery stitch dressing and morning BP monitoring.');
  const [formErrors, setFormErrors] = useState({});

  // Form State: Step 3 Document Upload & Preferences
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [shiftDuration, setShiftDuration] = useState('Single Procedure Visit');
  const [startDateOption, setStartDateOption] = useState('Today');
  const [careDays, setCareDays] = useState(1);
  const [languagePreference, setLanguagePreference] = useState('Kannada / English');
  const [continuityPreference, setContinuityPreference] = useState('Prefer the Same Nurse for Future Visits');
  // Location single source of truth from Home Screen
  const [selectedCity, setSelectedCity] = useState('Mysuru');
  const [addressValidationModalVisible, setAddressValidationModalVisible] = useState(false);
  const [citySelectionModalVisible, setCitySelectionModalVisible] = useState(false);
  const [addressValidationMsg, setAddressValidationMsg] = useState('');
  const addressInputRef = useRef(null);

  // Quick Consultation Hero Form State (matching Web HospitalCare & NurseBooking references)
  const [selectedCareNeed, setSelectedCareNeed] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickMobile, setQuickMobile] = useState('');
  const [quickAddress, setQuickAddress] = useState('No. 44, 2nd Cross, Saraswathipuram, Mysuru, Karnataka - 570009');
  const [quickAddressError, setQuickAddressError] = useState(null);
  const [quickBookingLoading, setQuickBookingLoading] = useState(false);
  const [careNeedModalVisible, setCareNeedModalVisible] = useState(false);
  const [quickDate, setQuickDate] = useState('Today (Immediate)');
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // Active Role / View Mode: 'PATIENT' | 'ADMIN'
  // Role Switcher & Filter Tabs
  const [activeRoleMode, setActiveRoleMode] = useState('PATIENT');
  const [adminFilterTab, setAdminFilterTab] = useState('All');
  const [requestsHistoryTab, setRequestsHistoryTab] = useState('CURRENT'); // 'CURRENT' | 'PAST'
  const [requestsCurrentPage, setRequestsCurrentPage] = useState(1);

  // Admin Enquiry Modal State
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false);
  const [selectedEnquiryReq, setSelectedEnquiryReq] = useState(null);
  const [enquiryForm, setEnquiryForm] = useState({
    service: '',
    visits: '1 Visit',
    duration: '45 mins',
    specialReqs: '',
    agreedDateTime: '',
    charges: '349',
    adminInternalNotes: '',
    userNotes: '',
  });

  // Admin Do Not Confirm / Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRejectReq, setSelectedRejectReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('Nurse unavailable on selected date');
  const [rejectReasonPreset, setRejectReasonPreset] = useState('Nurse unavailable on selected date');

  // User Payment Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentReq, setSelectedPaymentReq] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi');

  // Confirmation Modal State
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [submittedBookingDetail, setSubmittedBookingDetail] = useState(null);

  // In-App Notification Toast State
  const [inAppToast, setInAppToast] = useState({ visible: false, title: '', message: '' });

  // Family Members & Active Patient selection
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState('self');

  // Preferred Time Slot (Step 3)
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Morning (08:00 AM - 11:00 AM)');


  // Interactive Calendar State for Custom Date
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedCalDate, setSelectedCalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  });
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  });

  const isCurrentMonthOrPast = useMemo(() => {
    const today = new Date();
    return calYear === today.getFullYear() && calMonth <= today.getMonth();
  }, [calYear, calMonth]);

  const handlePrevCalMonth = () => {
    const today = new Date();
    if (calYear === today.getFullYear() && calMonth <= today.getMonth()) return;
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextCalMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectCalendarDay = (day) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${day} ${months[calMonth]} ${calYear}`;
    setSelectedCalDate({ year: calYear, month: calMonth, day });
    setCustomStartDate(formatted);
  };

  
  // Requests Data List
  const [requestsList, setRequestsList] = useState(initialNursingRequests);
  const [requestsTabFilter, setRequestsTabFilter] = useState('All');
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);
  const [newlyCreatedRequest, setNewlyCreatedRequest] = useState(null);

  // Dynamic Pricing Details that vary as careDays or services change
  const pricingDetails = useMemo(() => {
    let dailyRate = 0;
    if (selectedServices && selectedServices.length > 0) {
      selectedServices.forEach((srvName) => {
        dailyRate += getServicePriceByName(srvName);
      });
    } else {
      dailyRate = 299;
    }

    if (shiftDuration === '4-Hour Care Shift') {
      dailyRate = Math.max(dailyRate, 699);
    } else if (shiftDuration === '12-Hour Day Shift') {
      dailyRate = Math.max(dailyRate, 1299);
    } else if (shiftDuration === '24-Hour Live-in Care') {
      dailyRate = Math.max(dailyRate, 2499);
    }

    const days = Math.max(1, parseInt(careDays, 10) || 1);
    const grossTotal = dailyRate * days;
    let discountPercent = 0;
    if (days >= 30) {
      discountPercent = 15;
    } else if (days >= 15) {
      discountPercent = 10;
    } else if (days >= 7) {
      discountPercent = 5;
    }

    const discountAmount = Math.round((grossTotal * discountPercent) / 100);
    const finalTotal = grossTotal - discountAmount;

    return {
      dailyRate,
      days,
      grossTotal,
      discountPercent,
      discountAmount,
      finalTotal,
    };
  }, [selectedServices, shiftDuration, careDays]);

  // Load stored requests from AsyncStorage on mount
  useEffect(() => {
    const loadStoredRequests = async () => {
      try {
        const stored = await AsyncStorage.getItem(ASYNC_KEY_NURSING_REQUESTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = [...parsed];
            initialNursingRequests.forEach((initialItem) => {
              if (!merged.some((m) => m.id === initialItem.id)) {
                merged.push(initialItem);
              }
            });
            setRequestsList(merged);
          }
        }
      } catch (err) {
        console.log('Error reading stored nursing requests:', err);
      }
    };
    loadStoredRequests();
  }, []);

  const saveRequests = async (updated, singleNewReq = null) => {
    try {
      await AsyncStorage.setItem(ASYNC_KEY_NURSING_REQUESTS, JSON.stringify(updated));

      if (singleNewReq) {
        try {
          const rawNurseBookings = await AsyncStorage.getItem('@unnathi_nurse_bookings');
          const nurseBookings = rawNurseBookings ? JSON.parse(rawNurseBookings) : [];
          const updatedNurseBookings = [
            singleNewReq,
            ...(Array.isArray(nurseBookings) ? nurseBookings.filter((b) => b.id !== singleNewReq.id) : [])
          ];
          await AsyncStorage.setItem('@unnathi_nurse_bookings', JSON.stringify(updatedNurseBookings));
        } catch (e1) {
          console.log('Error syncing to @unnathi_nurse_bookings:', e1);
        }

        try {
          const rawAppts = await AsyncStorage.getItem('@unnathi_appointments');
          const appts = rawAppts ? JSON.parse(rawAppts) : [];
          const updatedAppts = [
            singleNewReq,
            ...(Array.isArray(appts) ? appts.filter((a) => a.id !== singleNewReq.id) : [])
          ];
          await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify(updatedAppts));
        } catch (e2) {
          console.log('Error syncing to @unnathi_appointments:', e2);
        }
      }
    } catch (e) {
      console.log('Error writing nursing requests:', e);
    }
  };

  useEffect(() => {
    loadUserAndLocationContext();
    if (navigation && typeof navigation.addListener === 'function') {
      const unsub = navigation.addListener('focus', () => {
        loadUserAndLocationContext();
      });
      return unsub;
    }
  }, [navigation]);

  // Handle route params
  useEffect(() => {
    if (route?.params?.view) {
      setCurrentView(route.params.view);
    }
    if (route?.params?.service) {
      setSelectedServices([route.params.service]);
      setShowAllServices(false);
      setFlowStep(1);
      setCurrentView('REQUEST_FLOW');
    }
    if (route?.params?.reqId && requestsList && requestsList.length > 0) {
      const found = requestsList.find((r) => r.id === route.params.reqId);
      if (found) {
        setSelectedRequestDetail(found);
        setCurrentView('REQUEST_DETAILS');
      }
    }
  }, [route?.params]);

  const loadUserAndLocationContext = async () => {
    try {
      const storedCity = await AsyncStorage.getItem('@mediunify_selected_city');
      const storedLoc = await AsyncStorage.getItem('@unnathi_user_location');
      const activeCity = storedCity || (storedLoc ? storedLoc.split(',')[0].trim() : 'Mysuru');
      if (activeCity) {
        setSelectedCity(activeCity);
      }

      const storedName = await AsyncStorage.getItem('userName');
      const storedPhone = await AsyncStorage.getItem('userPhone');
      if (storedName) {
        setQuickName(storedName);
      }
      if (storedPhone) {
        setQuickMobile(storedPhone);
      }

      const activePtStr = await AsyncStorage.getItem('@unnathi_active_patient');
      let activePatient = null;
      if (activePtStr) {
        try {
          activePatient = JSON.parse(activePtStr);
        } catch (e) {}
      }

      const savedFam = await AsyncStorage.getItem('@unnathi_family_members');
      let famList = [];
      if (savedFam) {
        try {
          famList = JSON.parse(savedFam);
        } catch (e) {}
      }
      if (Array.isArray(famList)) {
        setFamilyMembers(famList);
      }

      if (activePatient && (activePatient.name || activePatient.displayName)) {
        const pName = (activePatient.displayName || activePatient.name || '').replace(/\s*\([Ss]elf\)/g, '').trim();
        setPatientName(pName || storedName || 'Self');
        if (activePatient.age) setPatientAge(String(activePatient.age));
        if (activePatient.gender) setPatientGender(activePatient.gender);
        if (activePatient.relation) setRelationship(activePatient.relation);
        if (activePatient.phone) setContactNumber(activePatient.phone);
        else if (storedPhone) setContactNumber(storedPhone);
      } else if (storedName) {
        setPatientName(storedName);
        if (storedPhone) setContactNumber(storedPhone);
      }

      if (activeCity) {
        setAddress((prev) => prev ? prev.replace(/Mysuru|Bengaluru|Hassan/gi, activeCity) : `No. 44, 2nd Cross, Saraswathipuram, ${activeCity}, Karnataka - 570009`);
        setQuickAddress((prev) => prev ? prev.replace(/Mysuru|Bengaluru|Hassan/gi, activeCity) : `No. 44, 2nd Cross, Saraswathipuram, ${activeCity}, Karnataka - 570009`);
      }
    } catch (e) {
      console.log('Error loading context in NurseBookingScreen:', e);
    }
  };

  const sendInAppNotification = async (title, message, category = 'Bookings', reqId = null) => {
    try {
      const notifItem = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        category: 'Bookings',
        title,
        message,
        time: 'Just now',
        unread: true,
        icon: 'heart',
        iconColor: '#00B894',
        iconBg: '#E6F8F5',
        route: 'NurseBooking',
        ctaText: 'View Request',
        reqId,
        createdAt: new Date().toISOString(),
      };

      const stored = await AsyncStorage.getItem('@mediunify_user_notifications');
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [notifItem, ...(Array.isArray(existing) ? existing : [])];
      await AsyncStorage.setItem('@mediunify_user_notifications', JSON.stringify(updated));

      setInAppToast({ visible: true, title, message });
      setTimeout(() => {
        setInAppToast((prev) => ({ ...prev, visible: false }));
      }, 5000);
    } catch (e) {
      console.log('Error saving in-app notification:', e);
    }
  };

  const handleSelectFamilyMember = (member) => {
    if (member === 'self') {
      setSelectedFamilyMemberId('self');
      setPatientName(quickName || 'Self');
      setRelationship('Self');
      if (quickMobile) setContactNumber(quickMobile);
      return;
    }
    setSelectedFamilyMemberId(member.id || member._id || member.name);
    setPatientName(member.name || member.displayName || '');
    if (member.age) setPatientAge(String(member.age));
    if (member.gender) setPatientGender(member.gender);
    if (member.relation || member.relationship) setRelationship(member.relation || member.relationship);
    if (member.phone) setContactNumber(member.phone);
  };

  const handleQuickBookNurse = async () => {
    const isGuest = await isGuestUser();
    if (isGuest) {
      promptLoginRequired(navigation, { service: 'nursing' });
      return;
    }
    requireLogin(() => _doQuickBookNurse(), 'Please login to submit your care request.');
  };

  const _doQuickBookNurse = async () => {
    if (!quickName.trim()) {
      showAlert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!quickMobile.trim() || quickMobile.trim().replace(/\D/g, '').length < 10) {
      showAlert('Valid Mobile Required', 'Please enter a valid 10-digit mobile number to receive your callback.');
      return;
    }

    if (!quickAddress.trim() || quickAddress.trim().length < 5) {
      const msg = 'Please enter complete service address (House/Flat No, Street/Area, City, State, Pincode).';
      setQuickAddressError(msg);
      showAlert('Address Required', msg);
      return;
    }

    // Location rule: service address city must match Home Screen city
    const validation = validateAddressMatchesCity(quickAddress, selectedCity);
    if (!validation.isValid) {
      setQuickAddressError(validation.errorMessage);
      setAddressValidationMsg(validation.errorMessage);
      setAddressValidationModalVisible(true);
      return;
    }

    setQuickAddressError(null);
    setQuickBookingLoading(true);
    try {
      const careNeed = selectedCareNeed || 'General Nursing Consultation';
      const cleanPhone = quickMobile.trim();
      const chosenDate = quickDate || 'Today (Immediate)';
      const newId = `MU-NUR-${Math.floor(1000 + Math.random() * 9000)}`;
      const price = getServicePriceByName(careNeed);

      const newRequest = {
        id: newId,
        bookingId: newId,
        tokenNumber: newId,
        type: 'Home Nurse Care',
        serviceType: 'nurse',
        serviceName: careNeed,
        services: [careNeed],
        selectedServices: [careNeed],
        patientName: quickName.trim(),
        contactNumber: cleanPhone,
        phone: cleanPhone,
        address: quickAddress.trim(),
        city: selectedCity,
        homeCity: selectedCity,
        shiftDuration: 'General Visit',
        preferredTimeSlot: 'Morning (08:00 AM - 11:00 AM)',
        startDate: chosenDate,
        requiredDate: chosenDate,
        date: new Date().toISOString().split('T')[0],
        time: 'Morning (08:00 AM - 11:00 AM)',
        careDays: 1,
        totalPrice: `₹${price}`,
        fee: price,
        paidAmount: 0,
        paymentStatus: 'Pending',
        status: 'Request Submitted',
        currentStageIndex: 0,
        assignedNurse: null,
        createdAt: new Date().toISOString(),
        requestDate: 'Just now',
        timeline: [
          { stage: 'Request Submitted', completed: true, timestamp: 'Just now' },
          { stage: 'Admin Contacting', completed: false, timestamp: 'Pending call from Care Coordinator' },
          { stage: 'Enquiry Completed', completed: false, timestamp: 'Awaiting coordinator enquiry' },
          { stage: 'Payment Pending', completed: false, timestamp: 'Pending payment link generation' },
          { stage: 'Booking Confirmed', completed: false, timestamp: 'Pending payment' },
          { stage: 'Service In Progress', completed: false, timestamp: 'Nurse visit pending' },
          { stage: 'Completed', completed: false, timestamp: 'Visit pending' },
        ],
      };

      const updated = [newRequest, ...requestsList];
      setRequestsList(updated);
      await saveRequests(updated, newRequest);

      setQuickBookingLoading(false);
      setSubmittedBookingDetail(newRequest);
      setConfirmationModalVisible(true);

      // Send in-app notification
      sendInAppNotification(
        `Home Nursing Request #${newId}`,
        'Your request has been submitted successfully. Our coordinator will contact you shortly.',
        'Bookings',
        newId
      );
    } catch (e) {
      setQuickBookingLoading(false);
      showAlert('Request Error', 'Unable to submit request. Please try again.');
    }
  };

  // =========================================================================
  // ADMIN / COORDINATOR WORKFLOW HANDLERS
  // =========================================================================
  const handleAdminStartContacting = async (req) => {
    try {
      const nowStr = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const updatedList = requestsList.map((r) => {
        if (r.id === req.id) {
          return {
            ...r,
            status: 'Request Sent',
            currentStageIndex: 0,
          };
        }
        return r;
      });
      setRequestsList(updatedList);
      await saveRequests(updatedList);

      sendInAppNotification(
        `Home Nursing Request #${req.id}`,
        'Care coordinator is reviewing your request and will contact you shortly.',
        'Bookings',
        req.id
      );
      showAlert('Status Updated', `Request #${req.id} is active under coordinator review.`);
    } catch (e) {
      console.log('Error updating admin contacting:', e);
    }
  };

  const handleOpenEnquiryModal = (req) => {
    setSelectedEnquiryReq(req);
    setEnquiryForm({
      service: req.serviceName || (Array.isArray(req.selectedServices) ? req.selectedServices.join(', ') : 'Wound Dressing'),
      visits: '1 Visit',
      duration: '45 mins',
      specialReqs: req.careInformation || 'Sterile clinical procedure kit included',
      agreedDateTime: req.confirmedVisitDate ? `${req.confirmedVisitDate} at ${req.confirmedVisitTime || '10:00 AM'}` : 'Tomorrow at 10:30 AM',
      charges: String(req.fee || 349),
      adminInternalNotes: 'Prescription verified; coordinator confirmed patient availability.',
      userNotes: 'Care plan confirmed with nurse assignment. Please complete payment to confirm your booking.',
    });
    setEnquiryModalVisible(true);
  };

  const handleSaveEnquiryAndSendPaymentLink = async () => {
    if (!selectedEnquiryReq) return;
    try {
      const nowStr = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const parsedFee = Number(enquiryForm.charges) || selectedEnquiryReq.fee || 349;
      const updatedList = requestsList.map((r) => {
        if (r.id === selectedEnquiryReq.id) {
          const updatedTimeline = [
            { stage: 'Request Sent', completed: true, timestamp: r.requestDate || 'Request Submitted' },
            { stage: 'Payment Done', completed: false, isPending: true, timestamp: `Payment Link Generated (₹${parsedFee})` },
            { stage: 'Booking Confirmed', completed: false, timestamp: 'Pending payment & confirmation' },
            { stage: 'Service Completed', completed: false, timestamp: 'Scheduled visit pending' },
          ];
          return {
            ...r,
            status: 'Payment Pending',
            currentStageIndex: 0.5,
            fee: parsedFee,
            totalPrice: `₹${parsedFee}`,
            enquiryNotes: { ...enquiryForm },
            timeline: updatedTimeline,
          };
        }
        return r;
      });

      setRequestsList(updatedList);
      await saveRequests(updatedList);
      setEnquiryModalVisible(false);

      sendInAppNotification(
        `Home Nursing Request #${selectedEnquiryReq.id}`,
        `Your Home Nursing request is reviewed. Payment link for ₹${parsedFee} is generated. Click to Pay Now.`,
        'Bookings',
        selectedEnquiryReq.id
      );

      showAlert(
        'Payment Link Sent',
        `Payment link for ₹${parsedFee} generated and sent to ${selectedEnquiryReq.patientName}. Request status is now "Payment Pending".`
      );
    } catch (e) {
      console.log('Error sending payment link:', e);
    }
  };

  // 1. Confirm Booking Action
  const handleAdminConfirmBooking = async (req) => {
    try {
      const nowStr = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const parsedFee = req.fee || 349;
      const updatedList = requestsList.map((r) => {
        if (r.id === req.id) {
          const updatedTimeline = [
            { stage: 'Request Sent', completed: true, timestamp: r.requestDate || 'Initial Request' },
            { stage: 'Payment Done', completed: true, timestamp: nowStr },
            { stage: 'Booking Confirmed', completed: true, timestamp: nowStr },
            { stage: 'Service Completed', completed: false, timestamp: 'Assigned nurse visit scheduled' },
          ];
          return {
            ...r,
            status: 'Booking Confirmed',
            currentStageIndex: 2,
            paymentStatus: 'Paid',
            paidAmount: parsedFee,
            timeline: updatedTimeline,
          };
        }
        return r;
      });

      setRequestsList(updatedList);
      await saveRequests(updatedList);

      // Save transaction
      await saveTransaction({
        refId: req.id,
        service: 'Home Nursing Care',
        serviceType: 'nursing',
        title: req.serviceName || (Array.isArray(req.selectedServices) ? req.selectedServices.join(', ') : 'Nursing Visit'),
        amount: parsedFee,
        status: 'Paid',
        paymentMode: 'Online Payment (Verified)',
      });

      sendInAppNotification(
        `Home Nursing Request #${req.id}`,
        'Your Home Nursing booking has been confirmed.',
        'Bookings',
        req.id
      );

      showAlert('Booking Confirmed', `Booking #${req.id} has been confirmed successfully.`);
    } catch (e) {
      console.log('Error confirming booking:', e);
    }
  };

  // 2. Open Do Not Confirm Modal
  const handleAdminOpenRejectModal = (req) => {
    setSelectedRejectReq(req);
    setRejectReason('Nurse unavailable on selected date');
    setRejectReasonPreset('Nurse unavailable on selected date');
    setRejectModalVisible(true);
  };

  // 3. Submit Do Not Confirm with Mandatory Reason
  const handleAdminSubmitRejectBooking = async () => {
    if (!selectedRejectReq) return;
    const trimmed = (rejectReason || '').trim();
    if (!trimmed) {
      showAlert('Reason Required', 'Please enter or select a mandatory reason for not confirming this booking.');
      return;
    }

    try {
      const nowStr = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const updatedList = requestsList.map((r) => {
        if (r.id === selectedRejectReq.id) {
          const updatedTimeline = [
            { stage: 'Request Sent', completed: true, timestamp: r.requestDate || 'Initial Request' },
            { stage: 'Payment Done', completed: r.paymentStatus === 'Paid' || r.paidAmount > 0, timestamp: nowStr },
            { stage: 'Booking Not Confirmed', completed: false, isRejected: true, timestamp: nowStr, reason: trimmed },
          ];
          return {
            ...r,
            status: 'Booking Not Confirmed',
            rejectionReason: trimmed,
            currentStageIndex: 2,
            timeline: updatedTimeline,
          };
        }
        return r;
      });

      setRequestsList(updatedList);
      await saveRequests(updatedList);
      setRejectModalVisible(false);

      sendInAppNotification(
        `Home Nursing Request #${selectedRejectReq.id}`,
        `Your Home Nursing booking could not be confirmed. Reason: ${trimmed}`,
        'Bookings',
        selectedRejectReq.id
      );

      showAlert('Booking Not Confirmed', `Booking #${selectedRejectReq.id} has been marked as Not Confirmed.`);
    } catch (e) {
      console.log('Error not confirming booking:', e);
    }
  };

  const handleAdminStartService = async (req) => {
    try {
      const nowStr = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const updatedList = requestsList.map((r) => {
        if (r.id === req.id) {
          const updatedTimeline = [
            { stage: 'Request Sent', completed: true, timestamp: r.requestDate || 'Initial Request' },
            { stage: 'Payment Done', completed: true, timestamp: 'Paid' },
            { stage: 'Booking Confirmed', completed: true, timestamp: 'Confirmed' },
            { stage: 'Service Completed', completed: false, timestamp: `Service In Progress (${nowStr})` },
          ];
          return {
            ...r,
            status: 'Service In Progress',
            currentStageIndex: 2.5,
            timeline: updatedTimeline,
          };
        }
        return r;
      });

      setRequestsList(updatedList);
      await saveRequests(updatedList);

      sendInAppNotification(
        `Home Nursing Request #${req.id}`,
        'Your Home Nursing service is currently in progress.',
        'Bookings',
        req.id
      );

      showAlert('Status Updated', `Request #${req.id} is now "Service In Progress".`);
    } catch (e) {
      console.log('Error starting service:', e);
    }
  };

  // 4. Mark as Completed Action
  const handleAdminMarkCompleted = async (req) => {
    try {
      const nowStr = new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const updatedList = requestsList.map((r) => {
        if (r.id === req.id) {
          const updatedTimeline = [
            { stage: 'Request Sent', completed: true, timestamp: r.requestDate || 'Initial Request' },
            { stage: 'Payment Done', completed: true, timestamp: 'Paid' },
            { stage: 'Booking Confirmed', completed: true, timestamp: 'Confirmed' },
            { stage: 'Service Completed', completed: true, timestamp: nowStr },
          ];
          return {
            ...r,
            status: 'Service Completed',
            currentStageIndex: 3,
            completedDate: nowStr,
            serviceCompletedDate: nowStr,
            timeline: updatedTimeline,
          };
        }
        return r;
      });

      setRequestsList(updatedList);
      await saveRequests(updatedList);

      sendInAppNotification(
        `Home Nursing Request #${req.id}`,
        'Your Home Nursing service has been completed.',
        'Bookings',
        req.id
      );

      showAlert('Service Completed', `Request #${req.id} marked as Completed.`);
    } catch (e) {
      console.log('Error marking completed:', e);
    }
  };

  const handleAdminCancelRequest = async (req) => {
    handleAdminOpenRejectModal(req);
  };

  const handleAdminVerifyPayment = async (req) => {
    handleAdminConfirmBooking(req);
  };

  // =========================================================================
  // PATIENT PAYMENT HANDLERS
  // =========================================================================
  const handleInitiatePayment = (req) => {
    setSelectedPaymentReq(req);
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentReq) return;
    setPaymentProcessing(true);
    try {
      const req = selectedPaymentReq;
      const updatedList = requestsList.map((r) => {
        if (r.id === req.id) {
          const updatedTimeline = (r.timeline || []).map((t, idx) => {
            if (idx <= 4) return { ...t, completed: true, timestamp: t.timestamp || 'Just now' };
            return t;
          });
          return {
            ...r,
            status: 'Booking Confirmed',
            currentStageIndex: 4,
            paymentStatus: 'Paid',
            paidAmount: r.fee || 349,
            timeline: updatedTimeline,
          };
        }
        return r;
      });

      setRequestsList(updatedList);
      await saveRequests(updatedList);

      // Save transaction record for payment history
      await saveTransaction({
        refId: req.id,
        service: 'Home Nursing Care',
        serviceType: 'nursing',
        title: req.serviceName || (Array.isArray(req.selectedServices) ? req.selectedServices.join(', ') : 'Nursing Visit'),
        amount: req.fee || 349,
        status: 'Paid',
        paymentMode: selectedPaymentMethod === 'upi' ? 'UPI (Google Pay)' : selectedPaymentMethod === 'card' ? 'Credit Card' : 'Net Banking',
      });

      sendInAppNotification(
        `Home Nursing Request #${req.id}`,
        'Your Home Nursing booking has been confirmed successfully.',
        'Bookings',
        req.id
      );

      setPaymentProcessing(false);
      setPaymentModalVisible(false);

      showAlert(
        'Payment Successful!',
        `Your payment of ₹${req.fee || 349} for Request #${req.id} was successful. Your Home Nursing booking is now Confirmed.`
      );
    } catch (e) {
      setPaymentProcessing(false);
      showAlert('Payment Error', 'Unable to process payment. Please try again.');
    }
  };

  const handleCallHelpline = () => {
    Linking.openURL('tel:+918045685554').catch(() => {
      showAlert('Helpline', 'Please dial +91-8045685554 to reach our Nursing Care Desk.');
    });
  };

  const handleWhatsAppCare = () => {
    const text = encodeURIComponent('Hi, I would like to book a certified home nurse on MediUnify.');
    Linking.openURL(`https://wa.me/917353101441?text=${text}`).catch(() => {
      showAlert('WhatsApp', 'Please message +91-7353101441 on WhatsApp.');
    });
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: 'empty', key: `empty-${i}` });
    }

    for (let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(calYear, calMonth, day);
      cellDate.setHours(0, 0, 0, 0);
      const isPast = cellDate < today;
      const isToday =
        today.getDate() === day &&
        today.getMonth() === calMonth &&
        today.getFullYear() === calYear;
      const isSelected =
        selectedCalDate.year === calYear &&
        selectedCalDate.month === calMonth &&
        selectedCalDate.day === day;

      cells.push({
        type: 'day',
        day,
        isPast,
        isToday,
        isSelected,
        key: `day-${day}`,
      });
    }

    return cells;
  }, [calYear, calMonth, selectedCalDate]);

  // Toggle service selection
  const handleToggleService = (serviceName) => {
    if (serviceError) setServiceError(null);
    if (selectedServices.includes(serviceName)) {
      if (selectedServices.length === 1) {
        showAlert('Requirement', 'Please keep at least one nursing service selected.');
        return;
      }
      setSelectedServices(selectedServices.filter((s) => s !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  // Start booking with specific service
  const handleStartBookingWithService = (serviceName) => {
    requireLogin(() => _doStartBookingWithService(serviceName));
  };

  const _doStartBookingWithService = (serviceName) => {

    setSelectedServices([serviceName]);
    setShowAllServices(false);
    setServiceError(null);
    setFlowStep(1);
    setCurrentView('REQUEST_FLOW');
  };

  // Validate step 1
  const handleProceedFromServices = () => {
    if (selectedServices.length === 0) {
      setServiceError('Please select at least one nursing service to proceed.');
      return;
    }
    setServiceError(null);
    setFlowStep(2);
  };

  const handleSelectNewCity = async (newCity) => {
    setSelectedCity(newCity);
    setCitySelectionModalVisible(false);
    try {
      await AsyncStorage.setItem('@mediunify_selected_city', newCity);
      await AsyncStorage.setItem('@unnathi_user_location', newCity);
    } catch (e) {}

    // Re-validate address if user has typed something
    if (address && address.trim()) {
      const val = validateAddressMatchesCity(address, newCity);
      if (val.isValid) {
        setFormErrors((prev) => ({ ...prev, address: null }));
        setAddressValidationModalVisible(false);
      } else {
        setFormErrors((prev) => ({ ...prev, address: val.errorMessage }));
        setAddressValidationMsg(val.errorMessage);
      }
    }
  };

  // Validate step 2 with strict location-based address verification
  const handleProceedFromPatientDetails = () => {
    if (!patientName.trim()) {
      showAlert('Required Field', 'Please enter patient name.');
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim().length < 10) {
      showAlert('Invalid Phone', 'Please enter a valid 10-digit contact number.');
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      const msg = `Service is not available for this address. Please enter a ${selectedCity} address or change your Home Screen location and try again.`;
      setFormErrors((prev) => ({ ...prev, address: msg }));
      setAddressValidationMsg(msg);
      setAddressValidationModalVisible(true);
      return;
    }

    // Validate that entered address matches selected Home Screen city
    const validation = validateAddressMatchesCity(address, selectedCity);
    if (!validation.isValid) {
      setFormErrors((prev) => ({ ...prev, address: validation.errorMessage }));
      setAddressValidationMsg(validation.errorMessage);
      setAddressValidationModalVisible(true);
      return;
    }

    setFormErrors((prev) => ({ ...prev, address: null }));
    setFlowStep(3);
  };
  const handleProceedFromPatient = handleProceedFromPatientDetails;

  // Validate step 3
  const handleProceedFromPreferences = () => {
    if (startDateOption === 'Custom') {
      if (!customStartDate.trim()) {
        showAlert('Required Field', 'Please select a custom start date from the calendar.');
        return;
      }
    }
    setFlowStep(4);
  };

  // Simulated Document Upload
  const handleSimulateDocumentUpload = () => {
    const mockFiles = [
      { name: 'discharge_summary_columbia_asia.pdf', size: '1.4 MB', type: 'PDF' },
      { name: 'doctor_prescription_dressing.jpg', size: '2.1 MB', type: 'Image' },
      { name: 'post_op_wound_care_chart.pdf', size: '840 KB', type: 'PDF' },
    ];
    const picked = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setUploadedDoc(picked);
    showAlert('Document Attached', `Attached "${picked.name}" to your care request.`);
  };

  // Submit Care Request
  const handleSubmitCareRequest = async () => {
    const isGuest = await isGuestUser();
    if (isGuest) {
      promptLoginRequired(navigation, { service: 'nursing' });
      return;
    }
    requireLogin(() => _doSubmitCareRequest(), 'Please login to submit your care request.');
  };

  const _doSubmitCareRequest = async () => {
    // Validate address against selected Home Screen city before final booking
    const validation = validateAddressMatchesCity(address, selectedCity);
    if (!validation.isValid) {
      setFlowStep(2);
      setFormErrors((prev) => ({ ...prev, address: validation.errorMessage }));
      setAddressValidationMsg(validation.errorMessage);
      setAddressValidationModalVisible(true);
      return;
    }

    const newId = `MU-NUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = 'Just now';

    const startDt = startDateOption === 'Custom' ? (customStartDate.trim() || 'Custom Date') : startDateOption;
    let formattedDate = startDt;
    if (startDt === 'Today') {
      formattedDate = new Date().toISOString().split('T')[0];
    } else if (startDt === 'Tomorrow') {
      formattedDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    }

    const newReq = {
      id: newId,
      bookingId: newId,
      tokenNumber: newId,
      type: 'Home Nurse Care',
      serviceType: 'nurse',
      serviceName: selectedServices.join(', '),
      doctorName: 'Licensed Home Nurse',
      specialty: 'Home Nursing & Clinical Care',
      date: formattedDate,
      time: preferredTimeSlot || 'Morning (08:00 AM - 11:00 AM)',
      fee: pricingDetails.finalTotal,
      paidAmount: 0,
      paymentStatus: 'Pending',
      hospitalName: 'MediUnify Home Care Network',
      requestDate: nowStr,
      patientName,
      patientAge,
      patientGender,
      relationship,
      contactNumber,
      phone: contactNumber,
      address,
      city: selectedCity,
      homeCity: selectedCity,
      selectedServices: [...selectedServices],
      careInformation: careInfo || 'None specified',
      uploadedDoc: uploadedDoc ? uploadedDoc.name : null,
      preferences: {
        shiftDuration,
        startDate: startDt,
        careDays: pricingDetails.days,
        dailyRate: pricingDetails.dailyRate,
        estimatedTotalCost: pricingDetails.finalTotal,
        discountAmount: pricingDetails.discountAmount,
        discountPercent: pricingDetails.discountPercent,
        preferredTimeSlot,
        languagePreference,
        continuityPreference,
      },
      status: 'Request Submitted',
      currentStageIndex: 0,
      assignedNurse: null,
      confirmedVisitDate: null,
      confirmedVisitTime: null,
      isRecurring: shiftDuration.includes('Shift') || shiftDuration.includes('Live-in'),
      timeline: [
        { stage: 'Request Submitted', completed: true, timestamp: 'Just now' },
        { stage: 'Admin Contacting', completed: false, timestamp: 'Pending call from Care Coordinator' },
        { stage: 'Enquiry Completed', completed: false, timestamp: 'Awaiting coordinator enquiry' },
        { stage: 'Payment Pending', completed: false, timestamp: 'Pending payment link generation' },
        { stage: 'Booking Confirmed', completed: false, timestamp: 'Pending payment' },
        { stage: 'Service In Progress', completed: false, timestamp: 'Nurse visit pending' },
        { stage: 'Completed', completed: false, timestamp: 'Visit pending' },
      ],
    };

    const updated = [newReq, ...requestsList];
    setRequestsList(updated);
    saveRequests(updated, newReq);
    setNewlyCreatedRequest(newReq);
    setSubmittedBookingDetail(newReq);
    setConfirmationModalVisible(true);

    sendInAppNotification(
      `Home Nursing Request #${newId}`,
      'Your request has been submitted successfully. Our coordinator will contact you shortly.',
      'Bookings',
      newId
    );
    setFlowStep(5);
  };

  // Filter services on landing
  const filteredServices = useMemo(() => {
    return availableNursingServices.filter((srv) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.equipmentProvided.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === 'All Services') return true;
      if (activeCategory === 'Post-Surgical' && (srv.name.includes('Post-Operative') || srv.name.includes('Wound') || srv.category === 'Specialized')) return true;
      if (activeCategory === 'Wound & Dressing' && (srv.name.includes('Wound') || srv.name.includes('Dressing'))) return true;
      if (activeCategory === 'Injections & IV' && (srv.name.includes('Injection') || srv.name.includes('Medication') || srv.category === 'Procedure')) return true;
      if (activeCategory === 'Geriatric Care' && (srv.name.includes('Elderly') || srv.name.includes('Bedridden'))) return true;
      if (activeCategory === 'Monitoring' && (srv.name.includes('Vital') || srv.name.includes('Blood Sugar') || srv.category === 'Monitoring')) return true;
      if (activeCategory === 'Intensive & Bedridden' && (srv.name.includes('Bedridden') || srv.name.includes('Catheter') || srv.category === 'Intensive')) return true;

      return srv.category === activeCategory;
    });
  }, [searchQuery, activeCategory]);

  // Filter requests list
  const filteredRequests = useMemo(() => {
    if (requestsTabFilter === 'All') return requestsList;
    if (requestsTabFilter === 'In Progress') {
      return requestsList.filter((r) =>
        ['Care Team Will Call You', 'Requirement Confirmed', 'Nurse Assigned'].includes(r.status)
      );
    }
    if (requestsTabFilter === 'Confirmed') {
      return requestsList.filter((r) =>
        ['Visit Confirmed', 'Schedule Confirmed'].includes(r.status)
      );
    }
    if (requestsTabFilter === 'Completed') {
      return requestsList.filter((r) => r.status === 'Visit Completed');
    }
    return requestsList;
  }, [requestsList, requestsTabFilter]);

  // =========================================================================
  // VIEW 1: SIMPLE, CLEAN HOME NURSING LANDING PAGE
  // =========================================================================
  const renderLandingView = () => {
    const isPastStatus = (st) => {
      if (!st) return false;
      const s = st.toLowerCase();
      return s.includes('completed') || s.includes('not confirmed') || s.includes('cancelled') || s.includes('rejected') || s.includes('concluded');
    };
    const activeRequests = requestsList.filter((r) => !isPastStatus(r.status));
    const relevantRequests = activeRequests.length > 0 ? activeRequests : requestsList;
    const displayRequests = relevantRequests.slice(0, 2);

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Header Bar */}
          <View style={styles.topBarRow}>
            <View style={styles.headerLeftGroup}>
              <TouchableOpacity
                style={styles.backCircleBtn}
                onPress={() => {
                  if (navigation?.canGoBack && navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation?.navigate('Home');
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={isDarkMode ? theme.text : "#0F172A"} />
              </TouchableOpacity>

              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle} numberOfLines={1}>Home Nursing Care</Text>
                <View style={styles.cityLocationPill}>
                  <Ionicons name="location-sharp" size={11} color="#0D9488" />
                  <Text style={styles.cityLocationText}>{selectedCity || 'Mysuru'}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.helplineBtn}
              onPress={() => showAlert('Care Helpline', 'Connecting to 24/7 Support: 1800-425-0099')}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={12} color="#0D9488" />
              <Text style={styles.helplineBtnText}>1800-425-0099</Text>
            </TouchableOpacity>
          </View>

          {/* 1. REDUCED HERO SECTION */}
          <View style={styles.simpleHeroSection}>
            <Text style={styles.simpleHeroTitle}>Home Nursing Care</Text>
            <Text style={styles.simpleHeroSubtitle}>Professional nursing care at home.</Text>

            {/* Small Compact Trust Points */}
            <View style={styles.compactTrustRow}>
              <View style={styles.compactTrustBadge}>
                <Ionicons name="checkmark" size={13} color="#0D9488" />
                <Text style={styles.compactTrustText}>Verified Nurses</Text>
              </View>
              <View style={styles.compactTrustBadge}>
                <Ionicons name="checkmark" size={13} color="#0D9488" />
                <Text style={styles.compactTrustText}>24/7 Support</Text>
              </View>
            </View>
          </View>

          {/* 2. REQUEST NURSING CARE FORM */}
          <View style={styles.simpleFormCard}>
            <Text style={styles.simpleFormHeading}>Request Nursing Care</Text>
            <Text style={styles.simpleFormSubheading}>Request a nursing service</Text>

            {/* Field 1: Nursing Service */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nursing Service</Text>
              <TouchableOpacity
                style={styles.fieldPickerBtn}
                onPress={() => setCareNeedModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                  <Ionicons name="medkit-outline" size={18} color="#0D9488" />
                  <Text style={[styles.pickerBtnText, !selectedCareNeed && styles.placeholderText]} numberOfLines={1}>
                    {selectedCareNeed || 'Select service'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Field 2: Patient Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Patient Name</Text>
              <TextInput
                style={styles.simpleTextInput}
                placeholder="Enter name"
                placeholderTextColor="#94A3B8"
                value={quickName}
                onChangeText={setQuickName}
              />
            </View>

            {/* Field 3: Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.simpleTextInput}
                placeholder="Enter phone number"
                placeholderTextColor="#94A3B8"
                value={quickMobile}
                onChangeText={setQuickMobile}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            {/* Field 4: Service Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Service Address</Text>
              <TextInput
                ref={addressInputRef}
                style={[styles.simpleTextInput, styles.simpleAddressInput]}
                placeholder="Enter your full address"
                placeholderTextColor="#94A3B8"
                value={quickAddress}
                onChangeText={(t) => {
                  setQuickAddress(t);
                  if (quickAddressError) setQuickAddressError(null);
                }}
                multiline={true}
                numberOfLines={2}
              />
              {quickAddressError ? (
                <View style={styles.fieldErrorRow}>
                  <Ionicons name="alert-circle" size={13} color="#DC2626" />
                  <Text style={styles.fieldErrorText}>{quickAddressError}</Text>
                </View>
              ) : null}
            </View>

            {/* Field 5: Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TouchableOpacity
                style={styles.fieldPickerBtn}
                onPress={() => setDateModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                  <Ionicons name="calendar-outline" size={18} color="#0D9488" />
                  <Text style={styles.pickerBtnText} numberOfLines={1}>
                    {quickDate || 'Select date'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Submit Primary Button */}
            <TouchableOpacity
              style={styles.primaryRequestBtn}
              onPress={handleQuickBookNurse}
              activeOpacity={0.9}
              disabled={quickBookingLoading}
            >
              <Text style={styles.primaryRequestBtnText}>
                {quickBookingLoading ? 'Submitting...' : 'Request Nursing Care'}
              </Text>
            </TouchableOpacity>

            {/* Compact Contact Options */}
            <View style={styles.compactContactRow}>
              <TouchableOpacity style={styles.compactContactBtn} onPress={handleCallHelpline} activeOpacity={0.8}>
                <Ionicons name="call" size={14} color="#0D9488" />
                <Text style={styles.compactContactBtnText}>Call Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactContactBtn} onPress={handleWhatsAppCare} activeOpacity={0.8}>
                <Ionicons name="logo-whatsapp" size={14} color="#16A34A" />
                <Text style={[styles.compactContactBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. QUICK SERVICES SECTION */}
          <View style={styles.quickServicesSection}>
            <Text style={styles.sectionHeaderTitle}>Quick Services</Text>
            <View style={styles.quickChipsGrid}>
              {[
                { name: 'Wound Dressing', careNeed: 'Post-Surgical Wound Dressing', icon: 'cut-outline' },
                { name: 'Injection', careNeed: 'Daily Injection Administration (IM/IV)', icon: 'bandage-outline' },
                { name: 'Vital Monitoring', careNeed: 'Elderly Care & Vitals Monitoring', icon: 'pulse-outline' },
                { name: 'Elderly Care', careNeed: 'Elderly Care & Vitals Monitoring', icon: 'heart-outline' },
              ].map((s) => {
                const isSelected = selectedCareNeed === s.careNeed || selectedCareNeed === s.name;
                return (
                  <TouchableOpacity
                    key={s.name}
                    style={[styles.quickServiceCard, isSelected && styles.quickServiceCardSelected]}
                    onPress={() => setSelectedCareNeed(s.careNeed)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={s.icon} size={18} color={isSelected ? '#0D9488' : '#64748B'} />
                    <Text style={[styles.quickServiceCardText, isSelected && styles.quickServiceCardTextSelected]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. MY REQUESTS & STATUS TRACKING SECTION */}
          <View style={styles.myRequestsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>My Requests</Text>
              {requestsList.length > 0 && (
                <TouchableOpacity onPress={() => setCurrentView('MY_REQUESTS')}>
                  <Text style={styles.viewAllRequestsText}>View All ({requestsList.length}) →</Text>
                </TouchableOpacity>
              )}
            </View>

            {requestsList.length === 0 ? (
              <View style={styles.emptyInlineRequestsCard}>
                <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyInlineRequestsText}>No requests submitted yet</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {displayRequests.map((req) => {
                  const isRejected = req.status === 'Booking Not Confirmed' || req.status === 'Cancelled' || req.status === 'Rejected' || !!req.rejectionReason;
                  const isServiceDone = ['Service Completed', 'Completed', 'Visit Completed'].includes(req.status);
                  const isBookingDone = isServiceDone || ['Booking Confirmed', 'Service In Progress'].includes(req.status);
                  const isPayDone = isBookingDone || isRejected || req.paymentStatus === 'Paid' || req.status === 'Payment Done';
                  const isEnquiryDone = isPayDone || req.status === 'Payment Pending' || req.status === 'Admin Contacting' || req.status === 'Enquiry Completed';

                  return (
                    <TouchableOpacity
                      key={req.id}
                      style={styles.simpleReqCard}
                      onPress={() => {
                        setSelectedRequestDetail(req);
                        setCurrentView('REQUEST_DETAILS');
                      }}
                      activeOpacity={0.88}
                    >
                      <View style={styles.simpleReqCardHeader}>
                        <Text style={styles.simpleReqIdText}>Request #{req.id}</Text>
                        <View
                          style={[
                            styles.simpleStatusBadge,
                            isRejected && { backgroundColor: '#FEE2E2' },
                            isServiceDone && { backgroundColor: '#F1F5F9' },
                            isBookingDone && !isServiceDone && { backgroundColor: '#DCFCE7' },
                            !isRejected && !isServiceDone && !isBookingDone && { backgroundColor: '#E0F2FE' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.simpleStatusBadgeText,
                              isRejected && { color: '#DC2626' },
                              isServiceDone && { color: '#475569' },
                              isBookingDone && !isServiceDone && { color: '#15803D' },
                              !isRejected && !isServiceDone && !isBookingDone && { color: '#0369A1' },
                            ]}
                          >
                            {isRejected ? 'Booking Not Confirmed' : isServiceDone ? 'Completed' : isBookingDone ? 'Booking Confirmed' : req.status === 'Payment Pending' ? 'Payment Pending' : 'Request Sent'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.simpleReqDetailsText} numberOfLines={1}>
                        {req.patientName} • {req.serviceName || (Array.isArray(req.selectedServices) ? req.selectedServices[0] : 'Home Nursing')}
                      </Text>

                      {/* 5-Step Simple Status Flow */}
                      <View style={styles.simpleStatusFlowContainer}>
                        <Text style={styles.simpleStatusFlowTitle}>Request Status</Text>

                        {isRejected ? (
                          <View style={styles.rejectedReasonBox}>
                            <Text style={styles.rejectedTitleText}>Booking not confirmed</Text>
                            <Text style={styles.rejectedReasonText}>
                              Reason: {req.rejectionReason || 'Service unavailable for the selected date.'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.statusStepsRow}>
                            {[
                              { label: 'Request Sent', done: true },
                              { label: 'Admin Enquiry', done: isEnquiryDone },
                              { label: 'Payment', done: isPayDone },
                              { label: 'Booking Confirmed', done: isBookingDone },
                              { label: 'Completed', done: isServiceDone },
                            ].map((st, sIdx, arr) => (
                              <React.Fragment key={st.label}>
                                <View style={styles.statusStepNode}>
                                  <View style={[styles.statusStepDot, st.done ? styles.statusStepDotDone : styles.statusStepDotPending]}>
                                    {st.done ? (
                                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                    ) : (
                                      <View style={styles.statusStepDotHollow} />
                                    )}
                                  </View>
                                  <Text style={[styles.statusStepLabel, st.done ? styles.statusStepLabelDone : styles.statusStepLabelPending]}>
                                    {st.label}
                                  </Text>
                                </View>
                                {sIdx < arr.length - 1 && (
                                  <Ionicons
                                    name="arrow-forward"
                                    size={12}
                                    color={arr[sIdx + 1].done ? '#00B894' : '#CBD5E1'}
                                    style={{ marginTop: -14 }}
                                  />
                                )}
                              </React.Fragment>
                            ))}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  // =========================================================================
  // VIEW 2: STEP-BY-STEP CARE REQUEST FLOW
  // =========================================================================
  const renderRequestFlowView = () => (
    <View style={styles.flowRoot}>
      {/* Top Flow Header */}
      <View style={styles.flowHeader}>
        <TouchableOpacity
          style={styles.flowBackBtn}
          onPress={() => {
            if (flowStep > 1 && flowStep < 5) {
              setFlowStep(flowStep - 1);
            } else {
              setCurrentView('LANDING');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.flowHeaderTitle}>
            {flowStep === 1 && 'Step 1: Care Requirement'}
            {flowStep === 2 && 'Step 2: Patient & Address'}
            {flowStep === 3 && 'Step 3: Shift & Preferences'}
            {flowStep === 4 && 'Step 4: Review Request'}
            {flowStep === 5 && 'Request Submitted'}
          </Text>
          <Text style={styles.flowHeaderSub}>
            {flowStep < 5 ? `Step ${flowStep} of 4 • Zero Advance Deposit Required` : 'MediUnify Care Coordination'}
          </Text>
        </View>

        {flowStep < 5 && (
          <TouchableOpacity
            style={styles.flowCloseBtn}
            onPress={() => setCurrentView('LANDING')}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stepper Progress Bar */}
      {flowStep < 5 && (
        <View style={styles.stepperContainer}>
          {[1, 2, 3, 4].map((stepNum) => {
            const isDone = flowStep > stepNum;
            const isCurrent = flowStep === stepNum;
            return (
              <View key={stepNum} style={styles.stepItemWrapper}>
                <View
                  style={[
                    styles.stepperCircle,
                    isDone && styles.stepperCircleDone,
                    isCurrent && styles.stepperCircleCurrent,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.stepperCircleText,
                        isCurrent && styles.stepperCircleTextCurrent,
                      ]}
                    >
                      {stepNum}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepperLabelText,
                    isCurrent && styles.stepperLabelTextCurrent,
                  ]}
                >
                  {stepNum === 1 && 'Services'}
                  {stepNum === 2 && 'Patient'}
                  {stepNum === 3 && 'Schedule'}
                  {stepNum === 4 && 'Confirm'}
                </Text>
                {stepNum < 4 && (
                  <View
                    style={[
                      styles.stepperConnectingLine,
                      flowStep > stepNum && styles.stepperConnectingLineActive,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Form Content Area */}
      <ScrollView
        style={styles.flowScroll}
        contentContainerStyle={styles.flowScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: SELECT CARE SERVICES */}
        {flowStep === 1 && (
          <View>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepMainHeading}>
                {selectedServices.length > 0 && !showAllServices
                  ? 'Selected Home Care Service'
                  : 'What care do you need at home?'}
              </Text>
              <Text style={styles.stepSubHeading}>
                {selectedServices.length > 0 && !showAllServices
                  ? 'Review your selected nursing procedure below before entering patient details:'
                  : 'Select one or multiple nursing procedures required for the patient:'}
              </Text>
            </View>

            {serviceError && (
              <View style={styles.errorAlertBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorAlertText}>{serviceError}</Text>
              </View>
            )}

            {/* When a service is selected and not expanding, show ONLY the selected service(s) */}
            {selectedServices.length > 0 && !showAllServices ? (
              <View style={styles.selectedConfirmedWrap}>
                {selectedServices.map((srvName) => {
                  const item = availableNursingServices.find((s) => s.name === srvName) || {
                    id: 'srv-default',
                    name: srvName,
                    shortDesc: 'Professional nursing procedure administered at home by certified nurse.',
                    equipmentProvided: 'Sterile syringes, gloves, antiseptic kit',
                    icon: 'medkit-outline',
                    color: '#00B894',
                    bgColor: '#E6F9F4',
                  };
                  const meta = SERVICE_METADATA[item.id] || { price: '₹299', duration: '30 mins', shiftType: 'Per Visit' };

                  return (
                    <View key={srvName} style={styles.singleSelectedCard}>
                      <View style={styles.singleSelectedTopRow}>
                        <View style={[styles.selectCardIconWrap, { backgroundColor: item.bgColor, width: 42, height: 42, marginLeft: 0 }]}>
                          <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={styles.selectCardHeaderRow}>
                            <Text style={styles.singleSelectedTitle}>{item.name}</Text>
                            <Text style={styles.singleSelectedPrice}>{meta.price}</Text>
                          </View>
                          <View style={styles.singleSelectedMetaRow}>
                            <View style={styles.greenCheckBadge}>
                              <Ionicons name="checkmark-circle" size={12} color="#00B894" />
                              <Text style={styles.greenCheckBadgeText}>Selected for Booking</Text>
                            </View>
                            <Text style={styles.singleSelectedDuration}>
                              • {meta.duration} • {meta.shiftType}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text style={styles.singleSelectedDesc}>{item.shortDesc}</Text>

                      <View style={styles.singleSelectedKitRow}>
                        <Ionicons name="shield-checkmark" size={14} color="#0D9488" />
                        <Text style={styles.singleSelectedKitText}>
                          <Text style={{ fontWeight: '700' }}>Kit Provided:</Text> {item.equipmentProvided}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Button to add another procedure or change */}
                <TouchableOpacity
                  style={styles.addMoreServicesBtn}
                  onPress={() => setShowAllServices(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add-circle-outline" size={17} color="#0D9488" />
                  <Text style={styles.addMoreServicesBtnText}>+ Add another procedure or change service</Text>
                </TouchableOpacity>

                {/* Trust & Pricing Guarantee Banner */}
                <View style={styles.bookingSelectedTrustBanner}>
                  <Ionicons name="shield-checkmark" size={17} color="#00B894" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.bookingSelectedTrustTitle}>Zero Advance Deposit • Pay Post-Procedure</Text>
                    <Text style={styles.bookingSelectedTrustSub}>
                      KNC registered nurse assigned in 15 mins. Standard sterile care kit included.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Full Services List */
              <View>
                {selectedServices.length > 0 && (
                  <View style={styles.selectedCountBanner}>
                    <Ionicons name="checkbox" size={16} color="#00B894" />
                    <Text style={styles.selectedCountBannerText}>
                      <Text style={{ fontWeight: '800' }}>{selectedServices.length}</Text> service
                      {selectedServices.length === 1 ? '' : 's'} selected
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowAllServices(false)}
                      style={styles.doneAddingPill}
                    >
                      <Text style={styles.doneAddingPillText}>Done Selecting</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.servicesSelectList}>
                  {availableNursingServices.map((item) => {
                    const isChecked = selectedServices.includes(item.name);
                    const meta = SERVICE_METADATA[item.id] || { price: '₹299', duration: '30 mins' };

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.serviceSelectCard,
                          isChecked && styles.serviceSelectCardChecked,
                        ]}
                        onPress={() => handleToggleService(item.name)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.customCheckbox,
                            isChecked && styles.customCheckboxChecked,
                          ]}
                        >
                          {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                        </View>

                        <View style={[styles.selectCardIconWrap, { backgroundColor: item.bgColor }]}>
                          <Ionicons name={item.icon} size={18} color={item.color} />
                        </View>

                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={styles.selectCardHeaderRow}>
                            <Text style={styles.selectCardTitle}>{item.name}</Text>
                            <Text style={styles.selectCardPrice}>{meta.price}</Text>
                          </View>
                          <Text style={styles.selectCardDesc}>{item.shortDesc}</Text>
                          <Text style={styles.selectCardKit}>
                            <Text style={{ fontWeight: '600' }}>Kit:</Text> {item.equipmentProvided}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {requestsList.length > 2 && (
                    <TouchableOpacity
                      style={styles.viewMoreOnNextPageBtn}
                      onPress={() => setCurrentView('MY_REQUESTS')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewMoreOnNextPageText}>
                        View other {requestsList.length - 2} requests on next page
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color="#0D9488" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Step 1 Footer Action */}
            <View style={styles.stepActionFooter}>
              <TouchableOpacity
                style={styles.primaryProceedBtn}
                onPress={handleProceedFromServices}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryProceedBtnText}>Continue to Patient Details</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 2: PATIENT & VISIT ADDRESS DETAILS */}
        {flowStep === 2 && (
          <View>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepMainHeading}>Patient & Visit Details</Text>
              <Text style={styles.stepSubHeading}>
                Tell us who will be receiving care so our coordinator can plan appropriately:
              </Text>
            </View>

            {/* Patient Selection: Self vs Family Member */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Select Who Needs Care *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyPillsRow}>
                <TouchableOpacity
                  style={[
                    styles.familyMemberPill,
                    selectedFamilyMemberId === 'self' && styles.familyMemberPillActive,
                  ]}
                  onPress={() => handleSelectFamilyMember('self')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="person"
                    size={14}
                    color={selectedFamilyMemberId === 'self' ? '#FFFFFF' : '#0D9488'}
                  />
                  <Text
                    style={[
                      styles.familyMemberPillText,
                      selectedFamilyMemberId === 'self' && styles.familyMemberPillTextActive,
                    ]}
                  >
                    Self {quickName ? `(${quickName.split(' ')[0]})` : ''}
                  </Text>
                </TouchableOpacity>

                {familyMembers.map((member, idx) => {
                  const mId = member.id || member._id || `fam-${idx}`;
                  const isSelected = selectedFamilyMemberId === mId;
                  const label = member.name || member.displayName || `Member ${idx + 1}`;
                  const rel = member.relation || member.relationship || 'Family';
                  return (
                    <TouchableOpacity
                      key={mId}
                      style={[styles.familyMemberPill, isSelected && styles.familyMemberPillActive]}
                      onPress={() => handleSelectFamilyMember(member)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="people"
                        size={14}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.familyMemberPillText,
                          isSelected && styles.familyMemberPillTextActive,
                        ]}
                      >
                        {label} ({rel})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Patient Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Patient Full Name *</Text>
              <TextInput
                style={[styles.formInput, formErrors.name && styles.formInputError]}
                value={patientName}
                onChangeText={(t) => {
                  setPatientName(t);
                  if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                }}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#94A3B8"
              />
              {formErrors.name && <Text style={styles.formErrorText}>{formErrors.name}</Text>}
            </View>

            {/* Age & Gender Row */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Age *</Text>
                <TextInput
                  style={[styles.formInput, formErrors.age && styles.formInputError]}
                  value={patientAge}
                  onChangeText={(t) => {
                    setPatientAge(t);
                    if (formErrors.age) setFormErrors({ ...formErrors, age: null });
                  }}
                  placeholder="e.g. 58"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
                {formErrors.age && <Text style={styles.formErrorText}>{formErrors.age}</Text>}
              </View>

              <View style={[styles.formGroup, { flex: 1.5 }]}>
                <Text style={styles.formLabel}>Gender *</Text>
                <View style={styles.pillsRow}>
                  {['Male', 'Female', 'Other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.choicePill, patientGender === g && styles.choicePillActive]}
                      onPress={() => setPatientGender(g)}
                    >
                      <Text style={[styles.choicePillText, patientGender === g && styles.choicePillTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Relationship */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Relationship to Patient *</Text>
              <View style={styles.pillsRow}>
                {['Self', 'Mother', 'Father', 'Spouse', 'Child', 'Relative'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.choicePill, relationship === r && styles.choicePillActive]}
                    onPress={() => setRelationship(r)}
                  >
                    <Text style={[styles.choicePillText, relationship === r && styles.choicePillTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Contact Number */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contact Number for Coordinator *</Text>
              <TextInput
                style={[styles.formInput, formErrors.phone && styles.formInputError]}
                value={contactNumber}
                onChangeText={(t) => {
                  setContactNumber(t);
                  if (formErrors.phone) setFormErrors({ ...formErrors, phone: null });
                }}
                placeholder="+91 98450 XXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />
              {formErrors.phone && <Text style={styles.formErrorText}>{formErrors.phone}</Text>}
            </View>

            {/* Address */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.formLabel}>Service Address *</Text>
                <TouchableOpacity
                  onPress={() => setCitySelectionModalVisible(true)}
                  style={styles.cityBadgePill}
                  activeOpacity={0.8}
                >
                  <Ionicons name="location-sharp" size={11} color="#0D9488" />
                  <Text style={styles.cityBadgePillText}>{selectedCity}</Text>
                  <Ionicons name="chevron-down" size={10} color="#0D9488" />
                </TouchableOpacity>
              </View>
              <TextInput
                ref={addressInputRef}
                style={[
                  styles.formInput,
                  { height: 75, textAlignVertical: 'top' },
                  formErrors.address && styles.formInputError,
                ]}
                value={address}
                onChangeText={(t) => {
                  setAddress(t);
                  if (formErrors.address) setFormErrors({ ...formErrors, address: null });
                }}
                placeholder={`Enter your complete address in ${selectedCity} (Flat/House No, Street, Area, Pincode)`}
                placeholderTextColor="#94A3B8"
                multiline={true}
              />
              {formErrors.address && (
                <View style={styles.addressErrorCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginTop: 2 }} />
                    <Text style={styles.addressErrorCardText}>{formErrors.address}</Text>
                  </View>
                  <View style={styles.addressErrorActionsRow}>
                    <TouchableOpacity
                      style={styles.changeLocBtnSmall}
                      onPress={() => setCitySelectionModalVisible(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="swap-horizontal" size={13} color="#FFFFFF" />
                      <Text style={styles.changeLocBtnSmallText}>Change Location</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editAddrBtnSmall}
                      onPress={() => addressInputRef.current?.focus()}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={13} color="#0D9488" />
                      <Text style={styles.editAddrBtnSmallText}>Edit Address</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Clinical Background Info */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Patient Condition & History <Text style={{ fontWeight: '400', color: '#94A3B8' }}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.formInput, { height: 65, textAlignVertical: 'top' }]}
                value={careInfo}
                onChangeText={setCareInfo}
                placeholder="e.g. Post-surgery dressing, diabetic, needs morning vitals check..."
                placeholderTextColor="#94A3B8"
                multiline={true}
              />
            </View>

            {/* Actions */}
            <View style={styles.stepDualActionsRow}>
              <TouchableOpacity
                style={styles.stepBackOutlineBtn}
                onPress={() => setFlowStep(1)}
              >
                <Text style={styles.stepBackOutlineBtnText}>← Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryProceedBtn, { flex: 1 }]}
                onPress={handleProceedFromPatientDetails}
              >
                <Text style={styles.primaryProceedBtnText}>Continue to Schedule</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: SHIFT TIMING & PREFERENCES */}
        {flowStep === 3 && (
          <View>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepMainHeading}>Visit Schedule & Preferences</Text>
              <Text style={styles.stepSubHeading}>
                Configure your preferred duration and language to match the best nurse:
              </Text>
            </View>

            {/* Shift Duration Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Required Shift Duration *</Text>
              <View style={styles.shiftDurationGrid}>
                {[
                  { title: 'Single Procedure Visit', desc: '30-45 mins for dressing or injection', icon: 'flash-outline' },
                  { title: '4-Hour Care Shift', desc: 'Half-day assistance & vitals', icon: 'time-outline' },
                  { title: '12-Hour Day Shift', desc: 'Daytime monitoring & medication', icon: 'sunny-outline' },
                  { title: '24-Hour Live-in Care', desc: 'Continuous round-the-clock bedside nursing', icon: 'moon-outline' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.title}
                    style={[styles.shiftCard, shiftDuration === s.title && styles.shiftCardActive]}
                    onPress={() => setShiftDuration(s.title)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.shiftCardTop}>
                      <Ionicons
                        name={s.icon}
                        size={16}
                        color={shiftDuration === s.title ? '#00B894' : '#64748B'}
                      />
                      <Text style={[styles.shiftCardTitle, shiftDuration === s.title && styles.shiftCardTitleActive]}>
                        {s.title}
                      </Text>
                    </View>
                    <Text style={styles.shiftCardDesc}>{s.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preferred Time Slot (Matching Web) */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Preferred Time Slot *</Text>
              <View style={styles.timeSlotGrid}>
                {PREFERRED_TIME_SLOTS.map((slot) => {
                  const isSelected = preferredTimeSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timeSlotBtn, isSelected && styles.timeSlotBtnActive]}
                      onPress={() => setPreferredTimeSlot(slot)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={isSelected ? '#00B894' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.timeSlotBtnText,
                          isSelected && styles.timeSlotBtnTextActive,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Care Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Care Start Date *</Text>
              <View style={styles.dateOptionRow}>
                {[
                  { id: 'Today', label: 'Today', sub: 'Immediate / Urgent', icon: 'flash-outline' },
                  { id: 'Tomorrow', label: 'Tomorrow', sub: 'Next Day Planned', icon: 'calendar-outline' },
                  { id: 'Custom', label: 'Custom Date', sub: 'Choose Date', icon: 'calendar-number-outline' },
                ].map((d) => {
                  const isSelected = startDateOption === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.dateOptionCard, isSelected && styles.dateOptionCardActive]}
                      onPress={() => setStartDateOption(d.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dateOptionTop}>
                        <Ionicons
                          name={d.icon}
                          size={15}
                          color={isSelected ? '#00B894' : '#64748B'}
                        />
                        <View style={[styles.dateRadioCircle, isSelected && styles.dateRadioCircleActive]}>
                          {isSelected && <View style={styles.dateRadioInnerCircle} />}
                        </View>
                      </View>
                      <Text style={[styles.dateOptionLabel, isSelected && styles.dateOptionLabelActive]}>
                        {d.label}
                      </Text>
                      <Text style={styles.dateOptionSub}>{d.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {startDateOption === 'Custom' && (
                <View style={styles.calendarContainer}>
                  {/* Calendar Month Navigation Header */}
                  <View style={styles.calNavHeader}>
                    <TouchableOpacity
                      style={[styles.calNavBtn, isCurrentMonthOrPast && styles.calNavBtnDisabled]}
                      onPress={handlePrevCalMonth}
                      disabled={isCurrentMonthOrPast}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={17}
                        color={isCurrentMonthOrPast ? '#CBD5E1' : '#0F172A'}
                      />
                    </TouchableOpacity>

                    <View style={styles.calMonthYearBox}>
                      <Ionicons name="calendar-outline" size={15} color="#00B894" style={{ marginRight: 5 }} />
                      <Text style={styles.calMonthYearText}>
                        {CALENDAR_MONTH_NAMES[calMonth]} {calYear}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.calNavBtn}
                      onPress={handleNextCalMonth}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={17} color="#0F172A" />
                    </TouchableOpacity>
                  </View>

                  {/* Weekdays Row */}
                  <View style={styles.calWeekdaysRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <View key={d} style={styles.calWeekdayCell}>
                        <Text style={styles.calWeekdayText}>{d}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Calendar Days Grid */}
                  <View style={styles.calGrid}>
                    {calendarDays.map((cell) => {
                      if (cell.type === 'empty') {
                        return <View key={cell.key} style={styles.calDayCell} />;
                      }

                      return (
                        <TouchableOpacity
                          key={cell.key}
                          style={[
                            styles.calDayCell,
                            cell.isSelected && styles.calDayCellSelected,
                            cell.isToday && !cell.isSelected && styles.calDayCellToday,
                          ]}
                          onPress={() => !cell.isPast && handleSelectCalendarDay(cell.day)}
                          disabled={cell.isPast}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.calDayText,
                              cell.isPast && styles.calDayTextPast,
                              cell.isToday && !cell.isSelected && styles.calDayTextToday,
                              cell.isSelected && styles.calDayTextSelected,
                            ]}
                          >
                            {cell.day}
                          </Text>
                          {cell.isToday && !cell.isSelected && <View style={styles.calTodayDot} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Calendar Footer: Selected Date Banner */}
                  <View style={styles.calFooterBar}>
                    <View style={styles.calFooterLeft}>
                      <Ionicons name="checkmark-circle" size={15} color="#00B894" />
                      <Text style={styles.calFooterText}>
                        Selected Date: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{customStartDate}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.calQuickTodayBtn}
                      onPress={() => {
                        const now = new Date();
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        setCalMonth(now.getMonth());
                        setCalYear(now.getFullYear());
                        setSelectedCalDate({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() });
                        setCustomStartDate(`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.calQuickTodayText}>Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Duration of Care - How Many Days */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithOptional}>
                <Text style={styles.formLabel}>How Many Days is Care Required? *</Text>
                <View style={styles.daysBadge}>
                  <Ionicons name="time-outline" size={12} color="#0D9488" />
                  <Text style={styles.daysBadgeText}>
                    {careDays} {careDays === 1 ? 'Day (Single Visit)' : `Days (${careDays} Daily Visits)`}
                  </Text>
                </View>
              </View>

              {/* Quick Preset Days Pills */}
              <View style={styles.daysPresetsRow}>
                {[
                  { days: 1, label: '1 Day' },
                  { days: 3, label: '3 Days' },
                  { days: 7, label: '7 Days (1 Wk)' },
                  { days: 15, label: '15 Days' },
                  { days: 30, label: '30 Days' },
                ].map((preset) => {
                  const isSelected = careDays === preset.days;
                  return (
                    <TouchableOpacity
                      key={preset.days}
                      style={[styles.presetDayPill, isSelected && styles.presetDayPillActive]}
                      onPress={() => setCareDays(preset.days)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetDayText, isSelected && styles.presetDayTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Interactive Counter Stepper */}
              <View style={styles.daysCounterContainer}>
                <Text style={styles.daysCounterTitle}>Adjust Exact Days:</Text>
                <View style={styles.daysCounterBox}>
                  <TouchableOpacity
                    style={[styles.daysCounterBtn, careDays <= 1 && styles.daysCounterBtnDisabled]}
                    onPress={() => setCareDays(Math.max(1, careDays - 1))}
                    disabled={careDays <= 1}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={17} color={careDays <= 1 ? '#CBD5E1' : '#0F172A'} />
                  </TouchableOpacity>

                  <View style={styles.daysCounterCenter}>
                    <Text style={styles.daysCounterNumber}>{careDays}</Text>
                    <Text style={styles.daysCounterUnit}>{careDays === 1 ? 'Day' : 'Days'}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.daysCounterBtn, careDays >= 90 && styles.daysCounterBtnDisabled]}
                    onPress={() => setCareDays(Math.min(90, careDays + 1))}
                    disabled={careDays >= 90}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={17} color={careDays >= 90 ? '#CBD5E1' : '#0F172A'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dynamic Estimated Pricing Card */}
              <View style={styles.pricingSummaryCard}>
                <View style={styles.pricingTopRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.pricingTagRow}>
                      <Ionicons name="calculator" size={15} color="#00B894" />
                      <Text style={styles.pricingTagText}>
                        Estimated Cost ({pricingDetails.days} {pricingDetails.days === 1 ? 'Day' : 'Days'})
                      </Text>
                      {pricingDetails.discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>
                            {pricingDetails.discountPercent}% Off
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pricingCalcSubtitle}>
                      ₹{pricingDetails.dailyRate.toLocaleString('en-IN')} / day × {pricingDetails.days} {pricingDetails.days === 1 ? 'visit' : 'daily visits'}
                    </Text>
                  </View>

                  <View style={styles.pricingAmountWrap}>
                    {pricingDetails.discountAmount > 0 && (
                      <Text style={styles.pricingStrikePrice}>
                        ₹{pricingDetails.grossTotal.toLocaleString('en-IN')}
                      </Text>
                    )}
                    <Text style={styles.pricingFinalAmount}>
                      ₹{pricingDetails.finalTotal.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.pricingPerVisitNote}>Total for {pricingDetails.days} {pricingDetails.days === 1 ? 'Day' : 'Days'}</Text>
                  </View>
                </View>

                {pricingDetails.discountAmount > 0 && (
                  <View style={styles.pricingSavingsRow}>
                    <Ionicons name="sparkles" size={12} color="#059669" />
                    <Text style={styles.pricingSavingsText}>
                      Multi-day package discount: -₹{pricingDetails.discountAmount.toLocaleString('en-IN')} ({pricingDetails.discountPercent}% off)
                    </Text>
                  </View>
                )}

                <View style={styles.pricingDivider} />

                <View style={styles.pricingGuaranteeRow}>
                  <Ionicons name="shield-checkmark" size={13} color="#0D9488" />
                  <Text style={styles.pricingGuaranteeText}>
                    Zero advance deposit • Pay after visit completion
                  </Text>
                </View>
              </View>
            </View>

            {/* Document Upload */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithOptional}>
                <Text style={styles.formLabel}>Prescription or Discharge Summary</Text>
                <View style={styles.optionalTag}>
                  <Text style={styles.optionalTagText}>Optional</Text>
                </View>
              </View>

              {uploadedDoc ? (
                <View style={styles.uploadedDocCard}>
                  <Ionicons name="document-text" size={22} color="#00B894" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.uploadedDocName} numberOfLines={1}>{uploadedDoc.name}</Text>
                    <Text style={styles.uploadedDocSize}>{uploadedDoc.type} • {uploadedDoc.size}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setUploadedDoc(null)} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadDropZone}
                  onPress={handleSimulateDocumentUpload}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-upload-outline" size={26} color="#00B894" />
                  <Text style={styles.uploadDropTitle}>Attach Prescription / Doctor Notes</Text>
                  <Text style={styles.uploadDropSub}>PDF, JPG, PNG up to 10 MB</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Nurse Language Preference */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nurse Language Preference</Text>
              <View style={styles.pillsRow}>
                {['Kannada / English', 'Kannada', 'English', 'Hindi', 'No Preference'].map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.choicePill, languagePreference === lang && styles.choicePillActive]}
                    onPress={() => setLanguagePreference(lang)}
                  >
                    <Text style={[styles.choicePillText, languagePreference === lang && styles.choicePillTextActive]}>
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.stepDualActionsRow}>
              <TouchableOpacity
                style={styles.stepBackOutlineBtn}
                onPress={() => setFlowStep(2)}
              >
                <Text style={styles.stepBackOutlineBtnText}>← Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryProceedBtn, { flex: 1 }]}
                onPress={() => setFlowStep(4)}
              >
                <Text style={styles.primaryProceedBtnText}>Review & Confirm</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {flowStep === 4 && (
          <View>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepMainHeading}>Review Your Care Request</Text>
              <Text style={styles.stepSubHeading}>
                Please confirm details before our care coordinator contacts you:
              </Text>
            </View>

            {/* Summary Card */}
            <View style={styles.reviewCard}>
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Selected Nursing Procedures</Text>
                <View style={styles.reviewPillsWrap}>
                  {selectedServices.map((s) => (
                    <View key={s} style={styles.reviewServicePill}>
                      <Ionicons name="checkmark-circle" size={13} color="#00B894" />
                      <Text style={styles.reviewServicePillText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Patient Information</Text>
                <View style={styles.reviewGrid}>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Patient Name:</Text>
                    <Text style={styles.reviewValue}>{patientName} ({patientAge} yrs, {patientGender})</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Relationship:</Text>
                    <Text style={styles.reviewValue}>{relationship}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Phone:</Text>
                    <Text style={styles.reviewValue}>{contactNumber}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Address:</Text>
                    <Text style={styles.reviewValue}>{address}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Shift & Schedule</Text>
                <View style={styles.reviewGrid}>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Duration:</Text>
                    <Text style={styles.reviewValue}>{shiftDuration}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Start Date:</Text>
                    <Text style={styles.reviewValue}>
                      {startDateOption === 'Custom' ? (customStartDate.trim() || 'Custom Date') : (startDateOption === 'Today' ? 'Today (Immediate)' : 'Tomorrow')}
                    </Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Care Duration:</Text>
                    <Text style={styles.reviewValue}>
                      {careDays} {careDays === 1 ? 'Day (Single Visit)' : `Days (${careDays} Daily Visits)`}
                    </Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Language:</Text>
                    <Text style={styles.reviewValue}>{languagePreference}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Estimated Pricing & Payment</Text>
                <View style={styles.reviewGrid}>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Daily Base Rate:</Text>
                    <Text style={styles.reviewValue}>₹{pricingDetails.dailyRate.toLocaleString('en-IN')} / day</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Care Duration:</Text>
                    <Text style={styles.reviewValue}>{pricingDetails.days} {pricingDetails.days === 1 ? 'Day (Single Visit)' : `Days (${pricingDetails.days} Daily Visits)`}</Text>
                  </View>
                  {pricingDetails.discountAmount > 0 && (
                    <View style={styles.reviewRow}>
                      <Text style={[styles.reviewLabel, { color: '#059669' }]}>Multi-Day Package Savings ({pricingDetails.discountPercent}%):</Text>
                      <Text style={[styles.reviewValue, { color: '#059669', fontWeight: '700' }]}>-₹{pricingDetails.discountAmount.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { fontWeight: '800', color: '#0F172A' }]}>Estimated Total Cost:</Text>
                    <Text style={[styles.reviewValue, { fontWeight: '800', color: '#00B894', fontSize: 15 }]}>
                      ₹{pricingDetails.finalTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Payment Terms:</Text>
                    <Text style={styles.reviewValue}>Zero advance • Pay post visit</Text>
                  </View>
                </View>
              </View>

              {/* Zero Deposit Promise */}
              <View style={styles.zeroDepositNotice}>
                <Ionicons name="shield-checkmark" size={17} color="#00B894" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.zeroDepositTitle}>Zero Advance Payment Needed</Text>
                  <Text style={styles.zeroDepositSub}>
                    Our clinical care coordinator will call your registered number within 15 minutes to confirm nurse availability and exact schedule. Payment is due only after care delivery.
                  </Text>
                </View>
              </View>
            </View>

            {/* Step 4 Actions */}
            <View style={styles.stepDualActionsRow}>
              <TouchableOpacity
                style={styles.stepBackOutlineBtn}
                onPress={() => setFlowStep(3)}
              >
                <Text style={styles.stepBackOutlineBtnText}>← Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmFinalSubmitBtn, { flex: 1 }]}
                onPress={handleSubmitCareRequest}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmFinalSubmitBtnText}>Submit Care Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 5: SUCCESS STATE */}
        {flowStep === 5 && newlyCreatedRequest && (
          <View style={styles.successStateBox}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.successTitle}>Care Request Submitted!</Text>
            <Text style={styles.successSub}>
              Your request ID is <Text style={{ fontWeight: '800', color: '#0F172A' }}>{newlyCreatedRequest.id}</Text>
            </Text>

            <View style={styles.successPricingPill}>
              <Ionicons name="pricetag" size={15} color="#00B894" />
              <Text style={styles.successPricingPillText}>
                Estimated Total: <Text style={{ fontWeight: '800', color: '#0F172A' }}>₹{(newlyCreatedRequest.preferences?.estimatedTotalCost || pricingDetails.finalTotal).toLocaleString('en-IN')}</Text> ({newlyCreatedRequest.preferences?.careDays || pricingDetails.days} {newlyCreatedRequest.preferences?.careDays === 1 ? 'Day' : 'Days'}) • Pay after visit
              </Text>
            </View>

            <View style={styles.nextStepsCard}>
              <Text style={styles.nextStepsHeader}>What happens next?</Text>
              <View style={styles.nextStepItem}>
                <Text style={styles.nextStepNum}>1</Text>
                <Text style={styles.nextStepText}>
                  MediUnify clinical coordinator calls you at {newlyCreatedRequest.contactNumber} within 15 minutes.
                </Text>
              </View>
              <View style={styles.nextStepItem}>
                <Text style={styles.nextStepNum}>2</Text>
                <Text style={styles.nextStepText}>
                  A suitable licensed nurse (GNM / B.Sc) is assigned with sterile procedure kit.
                </Text>
              </View>
              <View style={styles.nextStepItem}>
                <Text style={styles.nextStepNum}>3</Text>
                <Text style={styles.nextStepText}>
                  Visit schedule and arrival time are confirmed via SMS and live notifications.
                </Text>
              </View>
            </View>

            <View style={styles.successActionsRow}>
              <TouchableOpacity
                style={[styles.trackRequestBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  if (navigation?.navigate) {
                    navigation.navigate('MyAppointments', { initialTab: 'upcoming', newAppointment: newlyCreatedRequest });
                  } else {
                    setSelectedRequestDetail(newlyCreatedRequest);
                    setCurrentView('MY_REQUESTS');
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.trackRequestBtnText}>View in My Bookings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.trackRequestBtn}
                onPress={() => {
                  setSelectedRequestDetail(newlyCreatedRequest);
                  setCurrentView('MY_REQUESTS');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="receipt-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.trackRequestBtnText}>Track My Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToHomeBtn}
                onPress={() => setCurrentView('LANDING')}
                activeOpacity={0.8}
              >
                <Text style={styles.backToHomeBtnText}>Back to Home Care</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  // =========================================================================
  // VIEW 3: MY REQUESTS & LIVE TRACKING
  // =========================================================================
  const renderMyRequestsView = () => {
    const isPastStatus = (st) => {
      if (!st) return false;
      const s = st.toLowerCase();
      return s.includes('completed') || s.includes('not confirmed') || s.includes('cancelled') || s.includes('rejected') || s.includes('concluded');
    };
    const activeRequests = requestsList.filter((r) => !isPastStatus(r.status));
    const pastRequests = requestsList.filter((r) => isPastStatus(r.status));
    const currentList = requestsHistoryTab === 'CURRENT' ? activeRequests : pastRequests;

    const REQUESTS_PER_PAGE = 2;
    const totalPages = Math.ceil(currentList.length / REQUESTS_PER_PAGE) || 1;
    const safeCurrentPage = Math.min(Math.max(1, requestsCurrentPage), totalPages);
    const startIndex = (safeCurrentPage - 1) * REQUESTS_PER_PAGE;
    const paginatedList = currentList.slice(startIndex, startIndex + REQUESTS_PER_PAGE);

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header - Note: "+ New Request" button is removed per requirements */}
        <View style={styles.myRequestsHeaderRow}>
          <TouchableOpacity
            style={styles.flowBackBtn}
            onPress={() => setCurrentView('LANDING')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.myRequestsMainTitle}>My Home Care Requests</Text>
            <Text style={styles.myRequestsSub}>
              Track status, enquiry details, payments & nurse visits
            </Text>
          </View>
        </View>

        {/* Primary Tab Toggle: CURRENT REQUESTS vs PAST REQUESTS */}
        <View style={styles.historySegmentWrap}>
          <TouchableOpacity
            style={[styles.historySegmentBtn, requestsHistoryTab === 'CURRENT' && styles.historySegmentBtnActive]}
            onPress={() => {
              setRequestsHistoryTab('CURRENT');
              setRequestsCurrentPage(1);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="pulse" size={14} color={requestsHistoryTab === 'CURRENT' ? '#00B894' : '#64748B'} />
            <Text style={[styles.historySegmentText, requestsHistoryTab === 'CURRENT' && styles.historySegmentTextActive]}>
              Current Requests ({activeRequests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.historySegmentBtn, requestsHistoryTab === 'PAST' && styles.historySegmentBtnActive]}
            onPress={() => {
              setRequestsHistoryTab('PAST');
              setRequestsCurrentPage(1);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done-circle" size={14} color={requestsHistoryTab === 'PAST' ? '#00B894' : '#64748B'} />
            <Text style={[styles.historySegmentText, requestsHistoryTab === 'PAST' && styles.historySegmentTextActive]}>
              Past Requests ({pastRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Requests List */}
        {currentList.length === 0 ? (
          <View style={styles.emptyRequestsBox}>
            <Ionicons name="clipboard-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyRequestsTitle}>
              {requestsHistoryTab === 'CURRENT' ? 'No Active Nursing Requests' : 'No Past Requests Found'}
            </Text>
            <Text style={styles.emptyRequestsSub}>
              {requestsHistoryTab === 'CURRENT'
                ? 'No ongoing care requests. View your previous history in the Past Requests tab.'
                : 'Completed or concluded care requests will be listed here.'}
            </Text>
          </View>
        ) : (
          <View style={styles.requestsCardsList}>
            {paginatedList.map((req) => {
              const isRejected = req.status === 'Booking Not Confirmed' || req.status === 'Cancelled' || req.status === 'Rejected' || !!req.rejectionReason;
              const isServiceDone = ['Service Completed', 'Completed', 'Visit Completed'].includes(req.status);
              const isBookingDone = isServiceDone || ['Booking Confirmed', 'Service In Progress'].includes(req.status);
              const isPayDone = isBookingDone || isRejected || req.paymentStatus === 'Paid' || req.status === 'Payment Done';
              const isPayPending = req.status === 'Payment Pending' && !isPayDone;

              return (
                <View key={req.id} style={styles.requestItemCard}>
                  {/* Card Top */}
                  <View style={styles.reqCardHeader}>
                    <View>
                      <View style={styles.reqIdRow}>
                        <Text style={styles.reqIdText}>{req.id}</Text>
                        <View
                          style={[
                            styles.reqStatusPill,
                            isRejected && { backgroundColor: '#FEE2E2' },
                            isServiceDone && { backgroundColor: '#F1F5F9' },
                            isBookingDone && !isServiceDone && { backgroundColor: '#DCFCE7' },
                            isPayPending && { backgroundColor: '#FFEDD5' },
                            !isRejected && !isServiceDone && !isBookingDone && !isPayPending && { backgroundColor: '#E0F2FE' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.reqStatusText,
                              isRejected && { color: '#DC2626' },
                              isServiceDone && { color: '#475569' },
                              isBookingDone && !isServiceDone && { color: '#15803D' },
                              isPayPending && { color: '#C2410C' },
                              !isRejected && !isServiceDone && !isBookingDone && !isPayPending && { color: '#0369A1' },
                            ]}
                          >
                            {isRejected ? 'Booking Not Confirmed' : isServiceDone ? 'Service Completed' : isBookingDone ? 'Booking Confirmed' : isPayPending ? 'Payment Pending' : 'Request Sent'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.reqDateText}>
                        {isServiceDone && req.completedDate ? `Completed: ${req.completedDate}` : `Requested: ${req.requestDate || req.date}`}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.viewTimelineBtn}
                      onPress={() => {
                        setSelectedRequestDetail(req);
                        setCurrentView('REQUEST_DETAILS');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewTimelineBtnText}>Timeline →</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Patient Name */}
                  <View style={styles.reqPatientRow}>
                    <Ionicons name="person-outline" size={14} color="#64748B" />
                    <Text style={styles.reqPatientText}>
                      Patient: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{req.patientName}</Text>
                      {req.patientAge ? ` (${req.patientAge} yrs, ${req.patientGender || 'Self'})` : ''}
                    </Text>
                  </View>

                  {/* Service Address */}
                  <View style={styles.reqAddressRow}>
                    <Ionicons name="location-outline" size={14} color="#00B894" />
                    <Text style={styles.reqAddressText} numberOfLines={2}>
                      {req.address}
                    </Text>
                  </View>

                  {/* Services Chips */}
                  <View style={styles.reqServicesRow}>
                    {(req.selectedServices || [req.serviceName || 'Home Nursing']).map((s) => (
                      <View key={s} style={styles.reqServiceChip}>
                        <Text style={styles.reqServiceChipText}>{s}</Text>
                      </View>
                    ))}
                  </View>

                  {/* 4-Step Simplified Status Stepper */}
                  <View style={styles.compactWorkflowBox}>
                    <View style={styles.fourStepStepperRow}>
                      {/* Step 1: Request Sent */}
                      <View style={styles.fourStepItem}>
                        <View style={[styles.fourStepDot, styles.fourStepDotDone]}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.fourStepLabel, styles.fourStepLabelDone]}>Request Sent</Text>
                      </View>

                      <View style={[styles.fourStepLine, isPayDone ? styles.fourStepLineDone : styles.fourStepLinePending]} />

                      {/* Step 2: Payment Done */}
                      <View style={styles.fourStepItem}>
                        <View
                          style={[
                            styles.fourStepDot,
                            isPayDone && styles.fourStepDotDone,
                            isPayPending && styles.fourStepDotPending,
                            !isPayDone && !isPayPending && styles.fourStepDotTodo,
                          ]}
                        >
                          {isPayDone ? (
                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                          ) : isPayPending ? (
                            <Ionicons name="time" size={10} color="#B45309" />
                          ) : (
                            <View style={styles.fourStepDotHollow} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.fourStepLabel,
                            isPayDone && styles.fourStepLabelDone,
                            isPayPending && styles.fourStepLabelPending,
                            !isPayDone && !isPayPending && styles.fourStepLabelTodo,
                          ]}
                        >
                          {isPayPending ? 'Payment Pending' : 'Payment Done'}
                        </Text>
                      </View>

                      <View style={[styles.fourStepLine, (isBookingDone || isRejected) ? (isRejected ? styles.fourStepLineRejected : styles.fourStepLineDone) : styles.fourStepLinePending]} />

                      {/* Step 3: Booking Confirmed / Booking Not Confirmed */}
                      <View style={styles.fourStepItem}>
                        <View
                          style={[
                            styles.fourStepDot,
                            isBookingDone && styles.fourStepDotDone,
                            isRejected && styles.fourStepDotRejected,
                            !isBookingDone && !isRejected && styles.fourStepDotTodo,
                          ]}
                        >
                          {isBookingDone ? (
                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                          ) : isRejected ? (
                            <Ionicons name="close" size={11} color="#FFFFFF" />
                          ) : (
                            <View style={styles.fourStepDotHollow} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.fourStepLabel,
                            isBookingDone && styles.fourStepLabelDone,
                            isRejected && styles.fourStepLabelRejected,
                            !isBookingDone && !isRejected && styles.fourStepLabelTodo,
                          ]}
                        >
                          {isRejected ? 'Booking Not Confirmed' : 'Booking Confirmed'}
                        </Text>
                      </View>

                      {/* Step 4: Service Completed (Only shown if booking is not rejected) */}
                      {!isRejected && (
                        <>
                          <View style={[styles.fourStepLine, isServiceDone ? styles.fourStepLineDone : styles.fourStepLinePending]} />
                          <View style={styles.fourStepItem}>
                            <View
                              style={[
                                styles.fourStepDot,
                                isServiceDone && styles.fourStepDotDone,
                                !isServiceDone && styles.fourStepDotTodo,
                              ]}
                            >
                              {isServiceDone ? (
                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                              ) : (
                                <View style={styles.fourStepDotHollow} />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.fourStepLabel,
                                isServiceDone && styles.fourStepLabelDone,
                                !isServiceDone && styles.fourStepLabelTodo,
                              ]}
                            >
                              Service Completed
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Booking Not Confirmed Reason Card */}
                  {isRejected && (
                    <View style={styles.notConfirmedReasonCard}>
                      <View style={styles.notConfirmedHead}>
                        <Ionicons name="alert-circle" size={15} color="#DC2626" />
                        <Text style={styles.notConfirmedTitle}>Booking Not Confirmed</Text>
                      </View>
                      <Text style={styles.notConfirmedReasonLabel}>Reason:</Text>
                      <Text style={styles.notConfirmedReasonText}>
                        {req.rejectionReason || req.rejectReason || 'The requested nursing service is not available on the selected date.'}
                      </Text>
                    </View>
                  )}

                  {/* Payment Pending Action Banner */}
                  {isPayPending && (
                    <View style={styles.paymentActionBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentBannerTitle}>Enquiry Completed • Payment Required</Text>
                        <Text style={styles.paymentBannerSub}>
                          Amount: <Text style={{ fontWeight: '800', color: '#0F172A' }}>₹{req.fee || 349}</Text> • Click Pay Now to confirm booking
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.payNowBtn}
                        onPress={() => handleInitiatePayment(req)}
                        activeOpacity={0.88}
                      >
                        <Ionicons name="card" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text style={styles.payNowBtnText}>Pay Now</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Booking Confirmed / Active Nurse Note */}
                  {isBookingDone && !isServiceDone && (
                    <View style={styles.confirmedNoticeBox}>
                      <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                      <Text style={styles.confirmedNoticeText}>
                        Booking Confirmed • Assigned nurse will visit as scheduled on {req.confirmedVisitDate || req.date || 'Scheduled Date'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View style={styles.paginationCard}>
            <Text style={styles.paginationSummaryText}>
              Showing <Text style={styles.paginationHighlightText}>{startIndex + 1} - {Math.min(startIndex + REQUESTS_PER_PAGE, currentList.length)}</Text> of <Text style={styles.paginationHighlightText}>{currentList.length}</Text> requests
            </Text>

            <View style={styles.paginationNavRow}>
              <TouchableOpacity
                style={[styles.paginationArrowBtn, safeCurrentPage === 1 && styles.paginationBtnDisabled]}
                onPress={() => setRequestsCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={15} color={safeCurrentPage === 1 ? '#94A3B8' : '#0D9488'} />
                <Text style={[styles.paginationArrowText, safeCurrentPage === 1 && styles.paginationTextDisabled]}>Prev</Text>
              </TouchableOpacity>

              <View style={styles.paginationNumbersWrap}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <TouchableOpacity
                    key={`p-${pageNum}`}
                    style={[styles.paginationNumBtn, safeCurrentPage === pageNum && styles.paginationNumBtnActive]}
                    onPress={() => setRequestsCurrentPage(pageNum)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.paginationNumText, safeCurrentPage === pageNum && styles.paginationNumTextActive]}>
                      {pageNum}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.paginationArrowBtn, safeCurrentPage === totalPages && styles.paginationBtnDisabled]}
                onPress={() => setRequestsCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                activeOpacity={0.8}
              >
                <Text style={[styles.paginationArrowText, safeCurrentPage === totalPages && styles.paginationTextDisabled]}>Next</Text>
                <Ionicons name="chevron-forward" size={15} color={safeCurrentPage === totalPages ? '#94A3B8' : '#0D9488'} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  // =========================================================================
  // VIEW 4: ADMIN / COORDINATOR MANAGEMENT VIEW
  // =========================================================================
  const renderAdminCoordinatorView = () => {
    const totalCount = requestsList.length;
    const submittedCount = requestsList.filter((r) => r.status === 'Request Sent' || r.status === 'Request Submitted').length;
    const paymentPendingCount = requestsList.filter((r) => r.status === 'Payment Pending').length;
    const confirmedCount = requestsList.filter((r) => r.status === 'Booking Confirmed').length;
    const completedCount = requestsList.filter((r) => ['Service Completed', 'Completed', 'Visit Completed'].includes(r.status)).length;

    const filteredAdminList = requestsList.filter((r) => {
      if (adminFilterTab === 'All') return true;
      if (adminFilterTab === 'New Requests') return r.status === 'Request Sent' || r.status === 'Request Submitted' || r.status === 'Admin Contacting';
      if (adminFilterTab === 'Payment Pending') return r.status === 'Payment Pending';
      if (adminFilterTab === 'Confirmed') return r.status === 'Booking Confirmed';
      if (adminFilterTab === 'Not Confirmed') return r.status === 'Booking Not Confirmed' || r.status === 'Cancelled';
      if (adminFilterTab === 'Completed') return ['Service Completed', 'Completed', 'Visit Completed'].includes(r.status);
      return r.status === adminFilterTab;
    });

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin Header */}
        <View style={styles.adminHeaderCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.adminShieldIcon}>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.adminHeaderTitle}>Nursing Coordinator Desk</Text>
                <Text style={styles.adminHeaderSub}>MediUnify Care Operations • City: {selectedCity}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.switchPatientViewBtn}
              onPress={() => setActiveRoleMode('PATIENT')}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal" size={14} color="#0D9488" />
              <Text style={styles.switchPatientViewBtnText}>Patient View</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.adminStatsGrid}>
            <View style={styles.adminStatItem}>
              <Text style={styles.adminStatNumber}>{totalCount}</Text>
              <Text style={styles.adminStatLabel}>Total Requests</Text>
            </View>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#0284C7' }]}>{submittedCount}</Text>
              <Text style={styles.adminStatLabel}>New Received</Text>
            </View>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#EA580C' }]}>{paymentPendingCount}</Text>
              <Text style={styles.adminStatLabel}>Pay Pending</Text>
            </View>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#16A34A' }]}>{confirmedCount}</Text>
              <Text style={styles.adminStatLabel}>Confirmed</Text>
            </View>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#4F46E5' }]}>{completedCount}</Text>
              <Text style={styles.adminStatLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.adminFilterScroll}
        >
          {['All', 'New Requests', 'Payment Pending', 'Confirmed', 'Not Confirmed', 'Completed'].map((tab) => {
            const isSel = adminFilterTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.adminFilterChip, isSel && styles.adminFilterChipActive]}
                onPress={() => setAdminFilterTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.adminFilterChipText, isSel && styles.adminFilterChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Admin Request Cards */}
        {filteredAdminList.length === 0 ? (
          <View style={styles.emptyRequestsBox}>
            <Ionicons name="folder-open-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyRequestsTitle}>No Requests in "{adminFilterTab}"</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredAdminList.map((req) => {
              const isCompleted = ['Service Completed', 'Completed', 'Visit Completed'].includes(req.status);
              const isRejected = req.status === 'Booking Not Confirmed' || req.status === 'Cancelled' || !!req.rejectionReason;
              const isConfirmed = req.status === 'Booking Confirmed' || req.status === 'Service In Progress';

              return (
                <View key={req.id} style={styles.adminReqCard}>
                  {/* Card Header */}
                  <View style={styles.adminReqCardHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.adminReqIdText}>{req.id}</Text>
                        <View style={styles.adminCityTag}>
                          <Text style={styles.adminCityTagText}>{req.city || req.homeCity || selectedCity}</Text>
                        </View>
                      </View>
                      <Text style={styles.adminReqDateText}>Received: {req.requestDate || req.date}</Text>
                    </View>

                    <View
                      style={[
                        styles.reqStatusPill,
                        isRejected && { backgroundColor: '#FEE2E2' },
                        isCompleted && { backgroundColor: '#F1F5F9' },
                        isConfirmed && { backgroundColor: '#DCFCE7' },
                        req.status === 'Payment Pending' && { backgroundColor: '#FFEDD5' },
                        !isRejected && !isCompleted && !isConfirmed && req.status !== 'Payment Pending' && { backgroundColor: '#E0F2FE' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reqStatusText,
                          isRejected && { color: '#DC2626' },
                          isCompleted && { color: '#475569' },
                          isConfirmed && { color: '#15803D' },
                          req.status === 'Payment Pending' && { color: '#C2410C' },
                          !isRejected && !isCompleted && !isConfirmed && req.status !== 'Payment Pending' && { color: '#0369A1' },
                        ]}
                      >
                        {isRejected ? 'Booking Not Confirmed' : isCompleted ? 'Service Completed' : isConfirmed ? 'Booking Confirmed' : req.status}
                      </Text>
                    </View>
                  </View>

                  {/* Patient Info & Direct Contact */}
                  <View style={styles.adminPatientRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminPatientName}>{req.patientName}</Text>
                      <Text style={styles.adminPatientMeta}>
                        Phone: {req.contactNumber || req.phone} • Age: {req.patientAge || '58'} yrs
                      </Text>
                    </View>

                    <View style={styles.adminContactBtnsRow}>
                      <TouchableOpacity
                        style={styles.adminCallBtn}
                        onPress={() => Linking.openURL(`tel:${req.contactNumber || req.phone}`).catch(() => showAlert('Call', `Dial ${req.contactNumber}`)) }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="call" size={13} color="#FFFFFF" />
                        <Text style={styles.adminCallBtnText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.adminWhatsAppBtn}
                        onPress={() => Linking.openURL(`https://wa.me/${(req.contactNumber || req.phone || '').replace(/[^0-9]/g, '')}`).catch(() => {}) }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                        <Text style={styles.adminCallBtnText}>Chat</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Service & Requested Date */}
                  <View style={styles.adminDetailRow}>
                    <Text style={styles.adminDetailLabel}>Service:</Text>
                    <Text style={styles.adminDetailVal}>
                      {req.serviceName || (Array.isArray(req.selectedServices) ? req.selectedServices.join(', ') : 'Home Nursing')}
                    </Text>
                  </View>

                  <View style={styles.adminDetailRow}>
                    <Text style={styles.adminDetailLabel}>Req Date:</Text>
                    <Text style={styles.adminDetailVal}>{req.startDate || req.date || 'Immediate'}</Text>
                  </View>

                  {/* Full Service Address */}
                  <View style={styles.adminDetailRow}>
                    <Text style={styles.adminDetailLabel}>Address:</Text>
                    <Text style={[styles.adminDetailVal, { flex: 1 }]}>{req.address}</Text>
                  </View>

                  {/* Rejection Note if not confirmed */}
                  {isRejected && (
                    <View style={[styles.adminEnquiryNotesBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <Text style={[styles.adminEnquiryNotesTitle, { color: '#B91C1C' }]}>Non-Confirmation Reason:</Text>
                      <Text style={[styles.adminEnquiryNotesText, { color: '#991B1B' }]}>
                        {req.rejectionReason || 'Nurse unavailable for the selected date.'}
                      </Text>
                    </View>
                  )}

                  {/* Enquiry Notes if any */}
                  {req.enquiryNotes && !isRejected && (
                    <View style={styles.adminEnquiryNotesBox}>
                      <Text style={styles.adminEnquiryNotesTitle}>Enquiry & Quote Summary:</Text>
                      <Text style={styles.adminEnquiryNotesText}>
                        • Visits: {req.enquiryNotes.visits} ({req.enquiryNotes.duration})
                      </Text>
                      <Text style={styles.adminEnquiryNotesText}>
                        • Agreed Time: {req.enquiryNotes.agreedDateTime} • Fee: ₹{req.fee || 349}
                      </Text>
                    </View>
                  )}

                  {/* 4 Admin Actions: 1. Send Payment Link, 2. Confirm Booking, 3. Do Not Confirm Booking, 4. Mark Completed */}
                  <View style={styles.adminActionButtonsGrid}>
                    {/* Action 1: Send Payment Link */}
                    {['Request Sent', 'Request Submitted', 'Admin Contacting', 'Enquiry Completed'].includes(req.status) && (
                      <TouchableOpacity
                        style={styles.adminEnquiryActionBtn}
                        onPress={() => handleOpenEnquiryModal(req)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.adminPrimaryActionBtnText}>Send Payment Link</Text>
                      </TouchableOpacity>
                    )}

                    {/* Action 2: Confirm Booking */}
                    {['Request Sent', 'Request Submitted', 'Admin Contacting', 'Payment Pending', 'Enquiry Completed'].includes(req.status) && (
                      <TouchableOpacity
                        style={[styles.adminPrimaryActionBtn, { backgroundColor: '#0D9488' }]}
                        onPress={() => handleAdminConfirmBooking(req)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.adminPrimaryActionBtnText}>Confirm Booking</Text>
                      </TouchableOpacity>
                    )}

                    {/* Action 3: Do Not Confirm Booking (with mandatory reason modal) */}
                    {!isCompleted && !isRejected && (
                      <TouchableOpacity
                        style={[styles.adminCancelBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                        onPress={() => handleAdminOpenRejectModal(req)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close-circle-outline" size={13} color="#DC2626" style={{ marginRight: 3 }} />
                        <Text style={[styles.adminCancelBtnText, { color: '#DC2626', fontWeight: '800' }]}>Do Not Confirm</Text>
                      </TouchableOpacity>
                    )}

                    {/* Action 4: Mark Service Completed */}
                    {isConfirmed && (
                      <TouchableOpacity
                        style={[styles.adminPrimaryActionBtn, { backgroundColor: '#16A34A' }]}
                        onPress={() => handleAdminMarkCompleted(req)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark-done-circle-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.adminPrimaryActionBtnText}>Mark Completed</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // =========================================================================
  // VIEW 5: DETAILED REQUEST & STAGE TIMELINE
  // =========================================================================
  const renderRequestDetailsView = () => {
    if (!selectedRequestDetail) return null;
    const req = requestsList.find((r) => r.id === selectedRequestDetail.id) || selectedRequestDetail;
    const assignedNurse = req.assignedNurse;
    const isRejected = req.status === 'Booking Not Confirmed' || req.status === 'Cancelled' || req.status === 'Rejected' || !!req.rejectionReason;
    const isServiceDone = ['Service Completed', 'Completed', 'Visit Completed'].includes(req.status);
    const isBookingDone = isServiceDone || ['Booking Confirmed', 'Service In Progress'].includes(req.status);
    const isPayDone = isBookingDone || isRejected || req.paymentStatus === 'Paid' || req.status === 'Payment Done';
    const isPayPending = req.status === 'Payment Pending' && !isPayDone;

    const timelineItems = isRejected
      ? [
          { label: 'Request Sent', status: 'done', desc: 'Care request submitted by patient', timestamp: req.requestDate || 'Initial Request' },
          { label: 'Payment Done', status: isPayDone ? 'done' : 'pending', desc: isPayDone ? 'Service payment confirmed' : 'Payment link sent', timestamp: req.paymentStatus === 'Paid' ? 'Paid' : 'Pending' },
          { label: 'Booking Not Confirmed', status: 'rejected', desc: 'Booking could not be confirmed by coordinator', timestamp: req.completedDate || 'Recent', reason: req.rejectionReason || 'Nurse is unavailable for the selected date.' },
        ]
      : [
          { label: 'Request Sent', status: 'done', desc: 'Care request submitted by patient', timestamp: req.requestDate || 'Initial Request' },
          { label: 'Payment Done', status: isPayDone ? 'done' : isPayPending ? 'pending' : 'todo', desc: isPayDone ? 'Service payment confirmed' : isPayPending ? `Payment link active (₹${req.fee || 349})` : 'Awaiting quote & payment link', timestamp: isPayDone ? 'Payment Verified' : isPayPending ? 'Pending Payment' : '' },
          { label: 'Booking Confirmed', status: isBookingDone ? 'done' : 'todo', desc: isBookingDone ? 'Nurse scheduled and booking confirmed' : 'Pending coordinator confirmation', timestamp: isBookingDone ? 'Confirmed' : '' },
          { label: 'Service Completed', status: isServiceDone ? 'done' : 'todo', desc: isServiceDone ? 'Home nursing visit delivered successfully' : 'Visit pending as scheduled', timestamp: req.completedDate || '' },
        ];

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailHeaderRow}>
          <TouchableOpacity
            style={styles.flowBackBtn}
            onPress={() => setCurrentView('MY_REQUESTS')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.detailMainTitle}>Home Care Request Details</Text>
            <Text style={styles.detailSub}>ID: {req.id} • Status: {isRejected ? 'Booking Not Confirmed' : req.status}</Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.detailStatusCard}>
          <View style={styles.detailStatusTop}>
            <View style={[styles.detailPulseWrap, isRejected && { backgroundColor: '#FEE2E2' }]}>
              <View style={[styles.detailLiveDot, isRejected && { backgroundColor: '#DC2626' }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailStatusTitle, isRejected && { color: '#DC2626' }]}>
                {isRejected ? 'Booking Not Confirmed' : req.status}
              </Text>
              <Text style={styles.detailStatusDesc}>
                {isRejected && 'Your booking could not be confirmed. Please check the coordinator reason below.'}
                {!isRejected && req.status === 'Request Sent' && 'Your request has been submitted. Clinical coordinator will review and contact you.'}
                {!isRejected && req.status === 'Payment Pending' && `Coordinator has reviewed requirements. Please complete payment of ₹${req.fee || 349} to confirm booking.`}
                {!isRejected && req.status === 'Booking Confirmed' && 'Booking Confirmed. Certified nurse is scheduled to visit with sterile care kits.'}
                {!isRejected && req.status === 'Service Completed' && 'Home nursing service successfully delivered and concluded.'}
              </Text>
            </View>
          </View>

          {/* Pay Now Button if pending */}
          {isPayPending && (
            <TouchableOpacity
              style={[styles.payNowBtn, { width: '100%', marginTop: 8, paddingVertical: 12 }]}
              onPress={() => handleInitiatePayment(req)}
              activeOpacity={0.88}
            >
              <Ionicons name="card" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={[styles.payNowBtnText, { fontSize: 14 }]}>Pay ₹{req.fee || 349} Now to Confirm Booking</Text>
            </TouchableOpacity>
          )}

          {/* 4-Stage Stepper List */}
          <View style={styles.timelineList}>
            {timelineItems.map((st, idx) => {
              return (
                <View key={st.label} style={styles.timelineRow}>
                  <View style={styles.timelineLeftCol}>
                    <View
                      style={[
                        styles.timelineBullet,
                        st.status === 'done' && styles.timelineBulletPast,
                        st.status === 'rejected' && { backgroundColor: '#DC2626' },
                        st.status === 'pending' && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
                      ]}
                    >
                      {st.status === 'done' ? (
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      ) : st.status === 'rejected' ? (
                        <Ionicons name="close" size={11} color="#FFFFFF" />
                      ) : st.status === 'pending' ? (
                        <Ionicons name="time" size={9} color="#B45309" />
                      ) : (
                        <View style={styles.timelineBulletFuture} />
                      )}
                    </View>
                    {idx < timelineItems.length - 1 && (
                      <View
                        style={[
                          styles.timelineConnectingLine,
                          (st.status === 'done' || st.status === 'rejected') && styles.timelineConnectingLinePast,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineContentCol}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.timelineStageLabel,
                          st.status === 'done' && styles.timelineStageLabelActive,
                          st.status === 'rejected' && { color: '#DC2626', fontWeight: '800' },
                        ]}
                      >
                        {st.label}
                      </Text>
                      {st.timestamp ? (
                        <Text style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: '600' }}>{st.timestamp}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.timelineStageDesc}>{st.desc}</Text>

                    {st.reason && (
                      <View style={[styles.notConfirmedReasonCard, { marginTop: 8 }]}>
                        <View style={styles.notConfirmedHead}>
                          <Ionicons name="alert-circle" size={14} color="#DC2626" />
                          <Text style={styles.notConfirmedTitle}>Reason for non-confirmation:</Text>
                        </View>
                        <Text style={styles.notConfirmedReasonText}>{st.reason}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Patient & Service Address Summary */}
        <View style={styles.summaryInfoCard}>
          <Text style={styles.summaryInfoCardHeader}>Patient & Service Information</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Patient Name:</Text>
            <Text style={styles.summaryValue}>{req.patientName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Contact Number:</Text>
            <Text style={styles.summaryValue}>{req.contactNumber || req.phone}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Address:</Text>
            <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]}>{req.address}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service City:</Text>
            <Text style={styles.summaryValue}>{req.city || req.homeCity || selectedCity}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected Service:</Text>
            <Text style={styles.summaryValue}>
              {req.serviceName || (Array.isArray(req.selectedServices) ? req.selectedServices.join(', ') : 'Home Nursing')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Status:</Text>
            <Text style={[styles.summaryValue, { color: req.paymentStatus === 'Paid' ? '#16A34A' : '#EA580C', fontWeight: '800' }]}>
              {req.paymentStatus || (req.paidAmount ? 'Paid' : 'Pending')} (₹{req.fee || 349})
            </Text>
          </View>
        </View>

        {/* Enquiry Notes if available */}
        {req.enquiryNotes && (
          <View style={[styles.summaryInfoCard, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.summaryInfoCardHeader, { color: '#166534' }]}>Enquiry & Service Scope</Text>
            <Text style={styles.enquiryUserNotesText}>{req.enquiryNotes.userNotes || 'Care plan confirmed with nurse assignment.'}</Text>
            <View style={{ marginTop: 8, gap: 4 }}>
              <Text style={styles.enquiryBullet}>• Number of Visits: {req.enquiryNotes.visits}</Text>
              <Text style={styles.enquiryBullet}>• Duration per Visit: {req.enquiryNotes.duration}</Text>
              <Text style={styles.enquiryBullet}>• Agreed Schedule: {req.enquiryNotes.agreedDateTime}</Text>
              {req.enquiryNotes.specialReqs ? (
                <Text style={styles.enquiryBullet}>• Special Scope: {req.enquiryNotes.specialReqs}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Assigned Nurse Card if available */}
        {assignedNurse && (
          <View style={styles.assignedNurseCard}>
            <Text style={styles.assignedCardHeader}>Assigned Clinical Nurse</Text>
            <View style={styles.assignedCardBody}>
              <Image source={{ uri: assignedNurse.photo }} style={styles.assignedPhotoLarge} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.assignedNameLarge}>{assignedNurse.name}</Text>
                <Text style={styles.assignedQualLarge}>{assignedNurse.qualification} • {assignedNurse.experience} exp</Text>
                <Text style={styles.assignedSpecLarge}>
                  Specialization: {assignedNurse.specialization || 'General Clinical Nursing'}
                </Text>
                <Text style={styles.assignedRegLarge}>Council Reg: {assignedNurse.councilReg || 'KNC Verified'}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.rootContainer}>
      {/* Floating In-App Toast Notification Banner */}
      {inAppToast.visible && (
        <View style={styles.floatingToastWrap}>
          <View style={styles.floatingToastCard}>
            <View style={styles.floatingToastIconWrap}>
              <Ionicons name="notifications" size={16} color="#00B894" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.floatingToastTitle}>{inAppToast.title}</Text>
              <Text style={styles.floatingToastMessage} numberOfLines={2}>{inAppToast.message}</Text>
            </View>
            <TouchableOpacity onPress={() => setInAppToast({ visible: false, title: '', message: '' })}>
              <Ionicons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Role-based Landing View or Admin View */}
      {currentView === 'LANDING' && (
        activeRoleMode === 'ADMIN' ? renderAdminCoordinatorView() : renderLandingView()
      )}
      {currentView === 'REQUEST_FLOW' && renderRequestFlowView()}
      {currentView === 'MY_REQUESTS' && renderMyRequestsView()}
      {currentView === 'REQUEST_DETAILS' && renderRequestDetailsView()}

      {/* ============================================================
          CARE NEED SELECTION MODAL
      ============================================================ */}
      <Modal
        visible={careNeedModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCareNeedModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCareNeedModalVisible(false)}
        >
          <View style={styles.modalContentCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Nursing Need</Text>
              <TouchableOpacity onPress={() => setCareNeedModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={true}>
              {NURSING_CARE_NEEDS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.modalListItem,
                    selectedCareNeed === item && styles.modalListItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCareNeed(item);
                    setCareNeedModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalListItemText,
                      selectedCareNeed === item && styles.modalListItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedCareNeed === item && (
                    <Ionicons name="checkmark-circle" size={18} color="#00B894" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          DATE SELECTION MODAL (TODAY, TOMORROW, CUSTOM)
      ============================================================ */}
      <Modal
        visible={dateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDateModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDateModalVisible(false)}
        >
          <View style={styles.modalContentCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 8 }}>
              {[
                'Today (Immediate)',
                'Tomorrow',
                'In 2 Days',
                'Next Week',
              ].map((dStr, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.modalListItem,
                    quickDate === dStr && styles.modalListItemSelected,
                  ]}
                  onPress={() => {
                    setQuickDate(dStr);
                    setDateModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalListItemText,
                      quickDate === dStr && styles.modalListItemTextSelected,
                    ]}
                  >
                    {dStr}
                  </Text>
                  {quickDate === dStr && (
                    <Ionicons name="checkmark-circle" size={18} color="#00B894" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          CONFIRMATION MODAL (AFTER SUBMITTING REQUEST)
      ============================================================ */}
      <Modal
        visible={confirmationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setConfirmationModalVisible(false)}
        >
          <View style={[styles.modalContentCard, { maxWidth: 440 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.confirmModalHeader}>
              <View style={styles.confirmSuccessCircle}>
                <Ionicons name="checkmark-circle" size={36} color="#00B894" />
              </View>
              <Text style={styles.confirmModalTitle}>Request Submitted Successfully</Text>
              <Text style={styles.confirmModalMsg}>
                Your nursing request has been submitted successfully. Our coordinator will contact you shortly.
              </Text>
            </View>

            {submittedBookingDetail && (
              <View style={styles.confirmDetailsBox}>
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmLabel}>Request ID:</Text>
                  <Text style={styles.confirmValueBold}>{submittedBookingDetail.id}</Text>
                </View>
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmLabel}>Service:</Text>
                  <Text style={styles.confirmValue}>
                    {submittedBookingDetail.serviceName || (Array.isArray(submittedBookingDetail.selectedServices) ? submittedBookingDetail.selectedServices.join(', ') : 'Home Nursing')}
                  </Text>
                </View>
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmLabel}>Requested Date:</Text>
                  <Text style={styles.confirmValue}>{submittedBookingDetail.startDate || submittedBookingDetail.date}</Text>
                </View>
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmLabel}>Address:</Text>
                  <Text style={[styles.confirmValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                    {submittedBookingDetail.address}
                  </Text>
                </View>
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmLabel}>Current Status:</Text>
                  <View style={styles.confirmStatusPill}>
                    <Text style={styles.confirmStatusText}>{submittedBookingDetail.status}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmTrackBtn}
                onPress={() => {
                  setConfirmationModalVisible(false);
                  setCurrentView('MY_REQUESTS');
                }}
                activeOpacity={0.88}
              >
                <Ionicons name="receipt-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmTrackBtnText}>Track Request Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCloseBtn}
                onPress={() => setConfirmationModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCloseBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          ADMIN ENQUIRY & PAYMENT LINK MODAL
      ============================================================ */}
      <Modal
        visible={enquiryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setEnquiryModalVisible(false)}
        >
          <View style={[styles.modalContentCard, { maxWidth: 480, maxHeight: '88%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Coordinator Enquiry & Quote</Text>
                <Text style={styles.modalSubtitle}>Request: {selectedEnquiryReq?.id} • {selectedEnquiryReq?.patientName}</Text>
              </View>
              <TouchableOpacity onPress={() => setEnquiryModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 10 }} showsVerticalScrollIndicator={true}>
              <View style={styles.enquiryFormField}>
                <Text style={styles.enquiryFieldLabel}>Required Nursing Service *</Text>
                <TextInput
                  style={styles.enquiryInput}
                  value={enquiryForm.service}
                  onChangeText={(t) => setEnquiryForm({ ...enquiryForm, service: t })}
                  placeholder="e.g. Wound Dressing & Vital Monitoring"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.enquiryFormField, { flex: 1 }]}>
                  <Text style={styles.enquiryFieldLabel}>Number of Visits *</Text>
                  <TextInput
                    style={styles.enquiryInput}
                    value={enquiryForm.visits}
                    onChangeText={(t) => setEnquiryForm({ ...enquiryForm, visits: t })}
                    placeholder="e.g. 1 Visit / 3 Visits"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={[styles.enquiryFormField, { flex: 1 }]}>
                  <Text style={styles.enquiryFieldLabel}>Duration *</Text>
                  <TextInput
                    style={styles.enquiryInput}
                    value={enquiryForm.duration}
                    onChangeText={(t) => setEnquiryForm({ ...enquiryForm, duration: t })}
                    placeholder="e.g. 45 mins / 12 Hours"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.enquiryFormField}>
                <Text style={styles.enquiryFieldLabel}>Agreed Visit Date & Time *</Text>
                <TextInput
                  style={styles.enquiryInput}
                  value={enquiryForm.agreedDateTime}
                  onChangeText={(t) => setEnquiryForm({ ...enquiryForm, agreedDateTime: t })}
                  placeholder="e.g. Tomorrow at 10:30 AM"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.enquiryFormField}>
                <Text style={styles.enquiryFieldLabel}>Agreed Charges (₹ Amount to Pay) *</Text>
                <TextInput
                  style={styles.enquiryInput}
                  value={enquiryForm.charges}
                  onChangeText={(t) => setEnquiryForm({ ...enquiryForm, charges: t.replace(/[^0-9]/g, '') })}
                  placeholder="349"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.enquiryFormField}>
                <Text style={styles.enquiryFieldLabel}>Special Clinical Requirements</Text>
                <TextInput
                  style={[styles.enquiryInput, { height: 60, textAlignVertical: 'top' }]}
                  value={enquiryForm.specialReqs}
                  onChangeText={(t) => setEnquiryForm({ ...enquiryForm, specialReqs: t })}
                  placeholder="e.g. Aseptic suture line care with hypoallergenic tape"
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                />
              </View>

              <View style={styles.enquiryFormField}>
                <Text style={styles.enquiryFieldLabel}>Internal Coordinator Notes (Hidden from user)</Text>
                <TextInput
                  style={[styles.enquiryInput, { height: 50, textAlignVertical: 'top' }]}
                  value={enquiryForm.adminInternalNotes}
                  onChangeText={(t) => setEnquiryForm({ ...enquiryForm, adminInternalNotes: t })}
                  placeholder="e.g. Patient is diabetic, verify vitals before injection."
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                />
              </View>

              <View style={styles.enquiryFormField}>
                <Text style={styles.enquiryFieldLabel}>User-Facing Care Notes (Sent with Payment Link)</Text>
                <TextInput
                  style={[styles.enquiryInput, { height: 55, textAlignVertical: 'top' }]}
                  value={enquiryForm.userNotes}
                  onChangeText={(t) => setEnquiryForm({ ...enquiryForm, userNotes: t })}
                  placeholder="e.g. Nurse assigned. Please complete payment of ₹349 to confirm visit."
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                />
              </View>
            </ScrollView>

            <View style={styles.enquiryModalFooter}>
              <TouchableOpacity
                style={styles.sendPaymentLinkBtn}
                onPress={handleSaveEnquiryAndSendPaymentLink}
                activeOpacity={0.88}
              >
                <Ionicons name="paper-plane" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.sendPaymentLinkBtnText}>Send Payment Link (₹{enquiryForm.charges || 349})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          PATIENT PAYMENT MODAL (PAY NOW FLOW)
      ============================================================ */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !paymentProcessing && setPaymentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => !paymentProcessing && setPaymentModalVisible(false)}
        >
          <View style={[styles.modalContentCard, { maxWidth: 420 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Confirm Home Nursing Payment</Text>
                <Text style={styles.modalSubtitle}>Request #{selectedPaymentReq?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => !paymentProcessing && setPaymentModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedPaymentReq && (
              <View style={{ paddingVertical: 10 }}>
                {/* Bill Amount Box */}
                <View style={styles.paymentBillCard}>
                  <Text style={styles.paymentBillLabel}>Total Payable Amount</Text>
                  <Text style={styles.paymentBillAmount}>₹{selectedPaymentReq.fee || 349}</Text>
                  <Text style={styles.paymentBillService}>
                    For: {selectedPaymentReq.serviceName || (Array.isArray(selectedPaymentReq.selectedServices) ? selectedPaymentReq.selectedServices.join(', ') : 'Nursing Care')}
                  </Text>
                </View>

                {/* Payment Methods */}
                <Text style={styles.paymentMethodTitle}>Select Payment Method:</Text>
                {[
                  { id: 'upi', label: 'UPI / Google Pay / PhonePe / Paytm', icon: 'flash-outline', color: '#00B894' },
                  { id: 'card', label: 'Credit / Debit Card (Visa, MC, RuPay)', icon: 'card-outline', color: '#1E3A8A' },
                  { id: 'netbanking', label: 'Net Banking (All Major Banks)', icon: 'business-outline', color: '#00C2CB' },
                ].map((pm) => {
                  const isSel = selectedPaymentMethod === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[styles.paymentMethodOption, isSel && styles.paymentMethodOptionActive]}
                      onPress={() => setSelectedPaymentMethod(pm.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={pm.icon} size={18} color={pm.color} />
                      <Text style={[styles.paymentMethodText, isSel && styles.paymentMethodTextActive]}>{pm.label}</Text>
                      {isSel && <Ionicons name="checkmark-circle" size={18} color="#00B894" style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.payConfirmSubmitBtn}
                  onPress={handleConfirmPayment}
                  activeOpacity={0.9}
                  disabled={paymentProcessing}
                >
                  <Ionicons name="lock-closed" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.payConfirmSubmitBtnText}>
                    {paymentProcessing ? 'Processing Secure Payment...' : `Pay ₹${selectedPaymentReq.fee || 349} & Confirm Booking`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          ADMIN DO NOT CONFIRM / REJECTION MODAL
      ============================================================ */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRejectModalVisible(false)}
        >
          <View style={[styles.modalContentCard, { maxWidth: 460 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: '#B91C1C' }]}>Booking Not Confirmed</Text>
                  <Text style={styles.modalSubtitle}>Request #{selectedRejectReq?.id} • {selectedRejectReq?.patientName}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12 }}>
              <Text style={styles.enquiryFieldLabel}>Reason for not confirming * (Mandatory)</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                Select a standard reason or enter custom details below. This will be clearly shown to the patient.
              </Text>

              {/* Quick Preset Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {[
                  'Service unavailable on selected date',
                  'Nurse unavailable',
                  'Address outside service area',
                  'Required service not available',
                  'Payment issue',
                  'Patient requested cancellation',
                  'Other',
                ].map((preset) => {
                  const isSel = rejectReasonPreset === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.rejectReasonChip,
                        isSel && styles.rejectReasonChipActive,
                      ]}
                      onPress={() => {
                        setRejectReasonPreset(preset);
                        if (preset === 'Other') {
                          setRejectReason('');
                        } else {
                          setRejectReason(preset);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.rejectReasonChipText, isSel && styles.rejectReasonChipTextActive]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.enquiryInput, { height: 80, textAlignVertical: 'top', borderColor: !rejectReason.trim() ? '#FCA5A5' : '#CBD5E1' }]}
                value={rejectReason}
                onChangeText={(t) => {
                  setRejectReason(t);
                  setRejectReasonPreset('');
                }}
                placeholder="Enter specific reason for not confirming this booking..."
                placeholderTextColor="#94A3B8"
                multiline={true}
              />
              {!rejectReason.trim() && (
                <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 4, fontWeight: '600' }}>
                  * Reason is required to reject/not confirm booking.
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={styles.rejectCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rejectConfirmBtn,
                  !rejectReason.trim() && styles.rejectConfirmBtnDisabled,
                ]}
                onPress={handleAdminSubmitRejectBooking}
                disabled={!rejectReason.trim()}
                activeOpacity={0.88}
              >
                <Text style={styles.rejectConfirmBtnText}>Confirm Non-Confirmation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  // CITY LOCATION PILL
  cityLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  cityLocationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007D69',
  },

  // QUICK FORM CARD
  quickFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  quickFormTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  quickFormSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  dropdownFieldText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  quickInputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  quickTextInput: {
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  quickSubmitBtn: {
    backgroundColor: '#007D69',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  quickSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  quickContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },

  // FAMILY MEMBERS PILLS ROW
  familyPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  familyMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  familyMemberPillActive: {
    backgroundColor: '#007D69',
    borderColor: '#007D69',
  },
  familyMemberPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  familyMemberPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // PREFERRED TIME SLOTS
  timeSlotGrid: {
    gap: 8,
  },
  timeSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  timeSlotBtnActive: {
    backgroundColor: '#E6F4F1',
    borderColor: '#007D69',
  },
  timeSlotBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  timeSlotBtnTextActive: {
    color: '#007D69',
    fontWeight: '700',
  },

  // MODAL STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  modalListItemSelected: {
    backgroundColor: '#E6F4F1',
  },
  modalListItemText: {
    fontSize: 14,
    color: '#334155',
  },
  cityBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cityBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  addressErrorCard: {
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
  },
  addressErrorCardText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 17,
  },
  addressErrorActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  changeLocBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeLocBtnSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAddrBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editAddrBtnSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  alertModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  alertModalMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  alertModalActionsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  alertChangeLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
  },
  alertChangeLocBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertEditAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
  },
  alertEditAddrBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  modalListItemTextSelected: {
    fontWeight: '700',
    color: '#007D69',
  },

  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 115,
  },

  // Top Bar Row
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 4 : 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
    gap: 8,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitleWrap: {
    marginLeft: 8,
    flex: 1,
  },
  backCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  liveVerifiedPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
  },
  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 4,
  },
  helplineBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },

  // Simplified Hero Section - Clean Mobile with No Banner Color
  simpleHeroSection: {
    backgroundColor: 'transparent',
    padding: 0,
    borderWidth: 0,
    marginBottom: 14,
  },
  simpleHeroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  simpleHeroSubtitle: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 12,
  },
  compactTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  compactTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  compactTrustText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },

  // Simplified Form Card
  simpleFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  simpleFormHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  simpleFormSubheading: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
  pickerBtnText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  simpleTextInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 46,
  },
  simpleAddressInput: {
    minHeight: 68,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  primaryRequestBtn: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryRequestBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compactContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    gap: 6,
  },
  compactContactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },

  // Quick Services Section
  quickServicesSection: {
    marginBottom: 22,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  quickChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickServiceCardSelected: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDFA',
  },
  quickServiceCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  quickServiceCardTextSelected: {
    color: '#0D9488',
    fontWeight: '800',
  },

  // My Requests Inline Section
  myRequestsSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  viewAllRequestsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  viewMoreOnNextPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  viewMoreOnNextPageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  emptyInlineRequestsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyInlineRequestsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  simpleReqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  simpleReqCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  simpleReqIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  simpleStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  simpleStatusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  simpleReqDetailsText: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 12,
  },
  simpleStatusFlowContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  simpleStatusFlowTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rejectedReasonBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectedTitleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 2,
  },
  rejectedReasonText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  statusStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  statusStepNode: {
    alignItems: 'center',
    maxWidth: 60,
  },
  statusStepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusStepDotDone: {
    backgroundColor: '#00B894',
  },
  statusStepDotPending: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusStepDotHollow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  statusStepLabel: {
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 12,
  },
  statusStepLabelDone: {
    fontWeight: '700',
    color: '#0F172A',
  },
  statusStepLabelPending: {
    fontWeight: '500',
    color: '#94A3B8',
  },

  // Legacy Hero Banner Card support (retained for backward compatibility)
  heroBannerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  // Search & Filters
  searchSectionWrap: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  categoryPillsScroll: {
    paddingVertical: 2,
    gap: 8,
  },
  categoryPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  categoryPillBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryPillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Services Grid
  servicesGrid: {
    gap: 14,
    marginBottom: 28,
  },
  serviceElevatedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  serviceElevatedCardSelected: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDFA',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 3,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceCardDuration: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  serviceCardDesc: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  consumablesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginBottom: 12,
  },
  consumablesText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  serviceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pricingCol: {},
  priceSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00B894',
  },
  bookServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  bookServiceBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Nurses Section
  nursesSection: {
    marginBottom: 28,
  },
  nursesScrollRow: {
    gap: 12,
    paddingVertical: 4,
  },
  nurseCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nursePhotoWrapper: {
    position: 'relative',
  },
  nursePhoto: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E2E8F0',
  },
  nurseVerifiedCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nurseInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  nurseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nurseName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  nurseRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    gap: 2,
  },
  nurseRatingText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  nurseQualification: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  nurseRegId: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  nurseSpecializationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  nurseSpecializationText: {
    fontSize: 10.5,
    color: '#0F766E',
    fontWeight: '600',
    flex: 1,
  },
  nurseLanguagesText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },

  // How It Works
  howItWorksSection: {
    marginBottom: 28,
  },
  stepsList: {
    gap: 10,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00B894',
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },

  // Testimonials
  testimonialsSection: {
    marginBottom: 28,
  },
  testimonialsScrollRow: {
    gap: 12,
    paddingVertical: 4,
  },
  testimonialCard: {
    width: 270,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  testimonialStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testimonialVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: 'auto',
    gap: 2,
  },
  testimonialVerifiedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  testimonialQuote: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  testimonialAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  authorFamily: {
    fontSize: 10,
    color: '#64748B',
  },
  authorServiceTag: {
    fontSize: 10,
    color: '#00B894',
    fontWeight: '700',
  },

  // FAQ
  faqSection: {
    marginBottom: 28,
  },
  faqHeader: {
    marginBottom: 12,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  faqSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  faqList: {
    gap: 8,
  },
  faqItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  faqItemCardOpen: {
    borderColor: '#00B894',
    backgroundColor: '#FCFDFE',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  faqQuestionTextActive: {
    color: '#00B894',
  },
  faqAnswerWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  faqAnswerText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },

  // Emergency Strip
  emergencyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  emergencyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emergencySub: {
    fontSize: 11.5,
    color: '#CCFBF1',
    marginTop: 1,
  },
  emergencyCallNowBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emergencyCallNowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },

  // =========================================================================
  // REQUEST FLOW WIZARD STYLES
  // =========================================================================
  flowRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  flowBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  flowHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  flowCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stepper Container
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stepItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stepperCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  stepperCircleDone: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  stepperCircleCurrent: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  stepperCircleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  stepperCircleTextCurrent: {
    color: '#FFFFFF',
  },
  stepperLabelText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  stepperLabelTextCurrent: {
    color: '#00B894',
    fontWeight: '800',
  },
  stepperConnectingLine: {
    width: 10,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginLeft: 3,
  },
  stepperConnectingLineActive: {
    backgroundColor: '#00B894',
  },

  flowScroll: {
    flex: 1,
  },
  flowScrollContent: {
    padding: 16,
    paddingBottom: 115,
  },
  stepTitleBox: {
    marginBottom: 14,
  },
  stepMainHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  stepSubHeading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Selected Confirmed Card Styles
  selectedConfirmedWrap: {
    marginBottom: 16,
  },
  singleSelectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#00B894',
    marginBottom: 12,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  singleSelectedTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  singleSelectedTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  singleSelectedPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00B894',
  },
  singleSelectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  greenCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 3,
  },
  greenCheckBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  singleSelectedDuration: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  singleSelectedDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
  },
  singleSelectedKitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 6,
  },
  singleSelectedKitText: {
    fontSize: 11,
    color: '#0F766E',
    flex: 1,
  },
  addMoreServicesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    gap: 6,
    marginBottom: 12,
  },
  addMoreServicesBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  bookingSelectedTrustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingSelectedTrustTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookingSelectedTrustSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  doneAddingPill: {
    marginLeft: 'auto',
    backgroundColor: '#00B894',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  doneAddingPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  selectedCountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
    marginBottom: 12,
  },
  selectedCountBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 10,
  },
  errorAlertText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '600',
  },

  servicesSelectList: {
    gap: 8,
    marginBottom: 16,
  },
  serviceSelectCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  serviceSelectCardChecked: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDFA',
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  customCheckboxChecked: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  selectCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  selectCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectCardPrice: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#00B894',
  },
  selectCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectCardKit: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 3,
  },

  // Form Controls
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  formInputError: {
    borderColor: '#EF4444',
  },
  formErrorText: {
    fontSize: 10.5,
    color: '#EF4444',
    marginTop: 3,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  choicePillActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  choicePillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Shift Cards
  shiftDurationGrid: {
    gap: 8,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  shiftCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDFA',
  },
  shiftCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  shiftCardTitleActive: {
    color: '#0D9488',
  },
  shiftCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginLeft: 24,
  },

  labelWithOptional: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  optionalTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  optionalTagText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },

  uploadDropZone: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#0D9488',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDropTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F766E',
    marginTop: 4,
  },
  uploadDropSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  uploadedDocName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  uploadedDocSize: {
    fontSize: 10.5,
    color: '#047857',
  },

  // Action Footers
  stepActionFooter: {
    marginTop: 10,
  },
  stepDualActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  stepBackOutlineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  stepBackOutlineBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  primaryProceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  primaryProceedBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmFinalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmFinalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Review Screen
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  reviewSection: {
    marginVertical: 4,
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  reviewPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewServicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  reviewServicePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  reviewGrid: {
    gap: 5,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    width: 100,
  },
  reviewValue: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  zeroDepositNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginTop: 12,
  },
  zeroDepositTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  zeroDepositSub: {
    fontSize: 11,
    color: '#115E59',
    marginTop: 2,
    lineHeight: 16,
  },

  // Success Box
  successStateBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  nextStepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    marginVertical: 18,
  },
  nextStepsHeader: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nextStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    color: '#00B894',
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 8,
  },
  nextStepText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 17,
  },
  successActionsRow: {
    width: '100%',
    gap: 10,
  },
  trackRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 12,
    borderRadius: 10,
  },
  trackRequestBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  backToHomeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  backToHomeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },

  // My Requests View
  paginationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  paginationSummaryText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  paginationHighlightText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  paginationNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  paginationArrowText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  paginationNumbersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paginationNumBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
  },
  paginationNumBtnActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  paginationNumText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  paginationNumTextActive: {
    color: '#FFFFFF',
  },
  paginationBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  paginationTextDisabled: {
    color: '#94A3B8',
  },
  myRequestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  myRequestsMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  myRequestsSub: {
    fontSize: 11,
    color: '#64748B',
  },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  newRequestBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  requestFilterTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  requestFilterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  requestFilterTabActive: {
    backgroundColor: '#0F172A',
  },
  requestFilterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  requestFilterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyRequestsBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyRequestsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  emptyRequestsSub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 14,
  },
  emptyStartBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyStartBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  requestsCardsList: {
    gap: 12,
  },
  requestItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reqIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqIdText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  reqStatusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  reqStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  reqDateText: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  viewTimelineBtn: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewTimelineBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  reqPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reqPatientText: {
    fontSize: 11.5,
    color: '#475569',
  },
  reqAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  reqAddressText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  reqServicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  reqServiceChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  reqServiceChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
  },
  assignedNurseMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginTop: 10,
  },
  assignedNurseMiniPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  assignedNurseMiniTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  assignedNurseMiniSub: {
    fontSize: 10,
    color: '#14B8A6',
    marginTop: 1,
  },
  // 4-Step Simplified Workflow Stepper
  compactWorkflowBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  fourStepStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fourStepItem: {
    alignItems: 'center',
    flex: 1,
  },
  fourStepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  fourStepDotDone: {
    backgroundColor: '#00B894',
  },
  fourStepDotPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  fourStepDotRejected: {
    backgroundColor: '#DC2626',
  },
  fourStepDotTodo: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  fourStepDotHollow: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  fourStepLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
    color: '#94A3B8',
    lineHeight: 12,
  },
  fourStepLabelDone: {
    color: '#0F766E',
    fontWeight: '800',
  },
  fourStepLabelPending: {
    color: '#B45309',
    fontWeight: '800',
  },
  fourStepLabelRejected: {
    color: '#DC2626',
    fontWeight: '800',
  },
  fourStepLabelTodo: {
    color: '#94A3B8',
  },
  fourStepLine: {
    height: 2,
    flex: 0.6,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  fourStepLineDone: {
    backgroundColor: '#00B894',
  },
  fourStepLinePending: {
    backgroundColor: '#CBD5E1',
  },
  fourStepLineRejected: {
    backgroundColor: '#FCA5A5',
  },

  // Booking Not Confirmed Reason Card
  notConfirmedReasonCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  notConfirmedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notConfirmedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },
  notConfirmedReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  notConfirmedReasonText: {
    fontSize: 11.5,
    color: '#7F1D1D',
    lineHeight: 16,
  },

  // Reject Modal Styles
  rejectReasonChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rejectReasonChipActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  rejectReasonChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  rejectReasonChipTextActive: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  rejectCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rejectCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  rejectConfirmBtn: {
    flex: 1.5,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
  },
  rejectConfirmBtnDisabled: {
    backgroundColor: '#FCA5A5',
  },
  rejectConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Details & Timeline View
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailSub: {
    fontSize: 11,
    color: '#64748B',
  },
  detailStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  detailStatusTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  detailPulseWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  detailStatusTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailStatusDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  timelineList: {
    paddingLeft: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 50,
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineBulletPast: {
    backgroundColor: '#00B894',
  },
  timelineBulletCurrent: {
    backgroundColor: '#0F172A',
  },
  timelineBulletFuture: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  timelineConnectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  timelineConnectingLinePast: {
    backgroundColor: '#00B894',
  },
  timelineContentCol: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 14,
  },
  timelineStageLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  timelineStageLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  timelineStageDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  assignedNurseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  assignedCardHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  assignedCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedPhotoLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  assignedNameLarge: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  assignedQualLarge: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  assignedSpecLarge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
    marginTop: 2,
  },
  assignedRegLarge: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  // Date Option Styles
  dateOptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dateOptionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  dateOptionCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  dateOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateRadioCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRadioCircleActive: {
    borderColor: '#00B894',
  },
  dateRadioInnerCircle: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00B894',
  },
  dateOptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  dateOptionLabelActive: {
    color: '#00B894',
  },
  dateOptionSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  customDateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 8,
  },
  customDateInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  // Days Duration Styles
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  daysPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  presetDayPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  presetDayPillActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  presetDayText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  presetDayTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  daysCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  daysCounterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  daysCounterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 2,
  },
  daysCounterBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysCounterBtnDisabled: {
    opacity: 0.4,
  },
  daysCounterCenter: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  daysCounterNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  daysCounterUnit: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  // Dynamic Pricing Card Styles
  pricingSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    padding: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  pricingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  pricingTagText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  discountBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  pricingCalcSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  pricingAmountWrap: {
    alignItems: 'flex-end',
  },
  pricingStrikePrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  pricingFinalAmount: {
    fontSize: 19,
    fontWeight: '800',
    color: '#00B894',
  },
  pricingPerVisitNote: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  pricingSavingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
    gap: 5,
  },
  pricingSavingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  pricingGuaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pricingGuaranteeText: {
    fontSize: 10.5,
    color: '#0D9488',
    fontWeight: '600',
    flex: 1,
  },
  successPricingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    marginTop: 10,
    gap: 6,
  },
  successPricingPillText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  // Mobile Calendar Widget Styles
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 8,
  },
  calNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavBtnDisabled: {
    opacity: 0.35,
  },
  calMonthYearBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calMonthYearText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  calWeekdaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 5,
    marginBottom: 3,
  },
  calWeekdayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calWeekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: '14.28%',
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 8,
    marginVertical: 1,
  },
  calDayCellSelected: {
    backgroundColor: '#00B894',
  },
  calDayCellToday: {
    borderWidth: 1.5,
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  calDayText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  calDayTextPast: {
    color: '#CBD5E1',
  },
  calDayTextToday: {
    color: '#00B894',
    fontWeight: '800',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calTodayDot: {
    position: 'absolute',
    bottom: 2.5,
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#00B894',
  },
  calFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
    paddingTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  calFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calFooterText: {
    fontSize: 11.5,
    color: '#475569',
  },
  calQuickTodayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  calQuickTodayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00B894',
  },

  // Address Input & Error on Quick Form
  quickInputFieldAddress: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
  },
  quickTextInputAddress: {
    fontSize: 12.5,
    color: '#0F172A',
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  quickAddressErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginTop: 2,
  },
  quickAddressErrorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },

  // Requests History Tabs (Current vs Past)
  historySegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 6,
  },
  historySegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  historySegmentBtnActive: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#5EEAD4',
  },
  historySegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  historySegmentTextActive: {
    color: '#0D9488',
    fontWeight: '800',
  },

  // Compact 7-Stage Status Stepper
  compactStepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactStepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  compactStepDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStepDotPast: {
    backgroundColor: '#00B894',
  },
  compactStepDotCurrent: {
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  compactStepDotActive: {
    backgroundColor: '#00B894',
  },
  compactStepDotLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  compactStepDotFuture: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  compactStepLine: {
    position: 'absolute',
    top: 7,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: -1,
  },
  compactStepLinePast: {
    backgroundColor: '#00B894',
  },
  compactStepLineActive: {
    backgroundColor: '#00B894',
  },
  compactStepLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  compactStepLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // Payment Pending Banner & Button
  paymentActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  payNowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Admin Coordinator View Styles
  adminHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  adminStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  adminStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  adminStatNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38BDF8',
  },
  adminStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  adminFilterScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  adminFilterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  adminFilterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  adminFilterChipTextActive: {
    color: '#FFFFFF',
  },
  adminReqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminReqCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  adminReqIdText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  adminCityTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminCityTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0369A1',
  },
  adminReqDateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  adminPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adminPatientName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminPatientMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  adminContactBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  adminCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  adminWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  adminCallBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminDetailRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  adminDetailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    width: 60,
  },
  adminDetailVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
  },
  adminEnquiryNotesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    marginVertical: 6,
  },
  adminEnquiryNotesTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 2,
  },
  adminEnquiryNotesText: {
    fontSize: 10.5,
    color: '#475569',
  },
  adminActionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adminPrimaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  adminPrimaryActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminEnquiryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  adminVerifyPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  adminCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Modal Input Styles
  enquiryInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#0F172A',
  },
  paymentBillCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },

  // In-App Toast
  floatingToastWrap: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  floatingToastContent: {
    flex: 1,
  },
  floatingToastTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floatingToastMessage: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 1,
  },

  // Summary Card on Details
  summaryInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  summaryInfoCardHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    width: 110,
  },
  summaryValue: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  enquiryUserNotesText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  enquiryBullet: {
    fontSize: 11.5,
    color: '#166534',
  },

  // Stepper Timeline in Details View
  timelineBulletLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  timelineBulletFuture: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  timelineConnectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 2,
    marginBottom: 2,
  },
  timelineConnectingLinePast: {
    backgroundColor: '#00B894',
  },
  timelineContentCol: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineStageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timelineStageLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
});

export default NurseBookingScreen;
