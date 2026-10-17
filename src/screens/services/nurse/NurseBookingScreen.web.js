import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../theme/colors';
import { showAlert } from '../../../utils/alert';
import { isGuestUser, promptLoginRequired } from '../../../utils/authHelper';
import WebFooter from '../../../components/web/WebFooter';
import WebBackButton from '../../../components/web/WebBackButton';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import {
  availableNursingServices,
  howItWorksSteps,
  careTimelineStages,
  assignedNursesData,
  initialNursingRequests,
  NURSING_WORKFLOW_STAGES,
  getNursingStageIndex,
} from '../../../data/homeNursingData';
import { validateAddressMatchesCity } from '../../../utils/addressLocationValidator';
import { saveTransaction } from '../../../services/transactionService';
import { useAuthGuard } from '../../../context/AuthGuardContext';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';

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
    a: 'No advance payment is required! You only pay after your care request is reviewed by our clinical coordinator and payment link is generated or upon visit completion.',
  },
  {
    q: 'Can we request the same nurse for recurring daily visits?',
    a: 'Absolutely. In Step 3 of our booking flow, you can choose "Prefer the Same Nurse for Future Visits" to ensure continuity of care with a familiar clinician.',
  },
];

import NurseBookingScreenMobile from './NurseBookingScreen.js';

const NurseBookingScreen = ({ navigation, route, ...props }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktopWeb = Platform.OS === 'web' && (desktopSiteMode || width >= 992);
  const isTablet = !desktopSiteMode && (width >= 768 && width < 992);
  const { requireLogin } = useAuthGuard();

  // Active top-level view: 'LANDING' | 'REQUEST_FLOW' | 'MY_REQUESTS' | 'REQUEST_DETAILS'
  const [currentView, setCurrentView] = useState('LANDING');

  // Role Switcher: 'PATIENT' | 'ADMIN'
  const [activeRoleMode, setActiveRoleMode] = useState('PATIENT');
  const [adminFilterTab, setAdminFilterTab] = useState('All');
  const [requestsHistoryTab, setRequestsHistoryTab] = useState('CURRENT'); // 'CURRENT' | 'PAST'
  const [requestsCurrentPage, setRequestsCurrentPage] = useState(1);

  // Location single source of truth from Home Screen
  const [selectedCity, setSelectedCity] = useState('Mysuru');
  const [addressValidationModalVisible, setAddressValidationModalVisible] = useState(false);
  const [addressValidationMsg, setAddressValidationMsg] = useState('');
  const addressInputRef = useRef(null);

  // Quick Consultation Hero Form State
  const [selectedCareNeed, setSelectedCareNeed] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickMobile, setQuickMobile] = useState('');
  const [quickAddress, setQuickAddress] = useState('No. 44, 2nd Cross, Saraswathipuram, Mysuru, Karnataka - 570009');
  const [quickAddressError, setQuickAddressError] = useState(null);
  const [quickBookingLoading, setQuickBookingLoading] = useState(false);
  const [careNeedModalVisible, setCareNeedModalVisible] = useState(false);
  const [quickDate, setQuickDate] = useState('Today (Immediate)');
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [quickCalMonth, setQuickCalMonth] = useState(new Date().getMonth());
  const [quickCalYear, setQuickCalYear] = useState(new Date().getFullYear());
  const [selectedQuickCalDate, setSelectedQuickCalDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  });

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

  // Quick Calendar Generator
  const quickCalendarDays = useMemo(() => {
    const firstDayIndex = new Date(quickCalYear, quickCalMonth, 1).getDay();
    const totalDays = new Date(quickCalYear, quickCalMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ type: 'empty', key: `empty-${i}` });
    }

    for (let day = 1; day <= totalDays; day++) {
      const cellDate = new Date(quickCalYear, quickCalMonth, day);
      cellDate.setHours(0, 0, 0, 0);
      const isPast = cellDate < today;
      const isToday =
        today.getDate() === day &&
        today.getMonth() === quickCalMonth &&
        today.getFullYear() === quickCalYear;
      const isSelected =
        selectedQuickCalDate.year === quickCalYear &&
        selectedQuickCalDate.month === quickCalMonth &&
        selectedQuickCalDate.day === day;

      cells.push({
        type: 'day',
        day,
        isPast,
        isToday,
        isSelected,
        key: `qday-${day}`,
      });
    }

    return cells;
  }, [quickCalYear, quickCalMonth, selectedQuickCalDate]);

  const handlePrevQuickMonth = () => {
    const today = new Date();
    if (quickCalYear === today.getFullYear() && quickCalMonth <= today.getMonth()) return;
    if (quickCalMonth === 0) {
      setQuickCalMonth(11);
      setQuickCalYear((y) => y - 1);
    } else {
      setQuickCalMonth((m) => m - 1);
    }
  };

  const handleNextQuickMonth = () => {
    if (quickCalMonth === 11) {
      setQuickCalMonth(0);
      setQuickCalYear((y) => y + 1);
    } else {
      setQuickCalMonth((m) => m + 1);
    }
  };

  const handleSelectQuickCalDay = (day) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${day} ${months[quickCalMonth]} ${quickCalYear}`;
    setSelectedQuickCalDate({ year: quickCalYear, month: quickCalMonth, day });
    setQuickDate(formatted);
    setDateModalVisible(false);
  };

  const getPresetDates = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return [
      { label: 'Today (Immediate)', value: `Today (${today.getDate()} ${months[today.getMonth()]})` },
      { label: 'Tomorrow', value: `Tomorrow (${tom.getDate()} ${months[tom.getMonth()]})` },
      { label: `In 2 Days (${dayAfter.getDate()} ${months[dayAfter.getMonth()]})`, value: `${dayAfter.getDate()} ${months[dayAfter.getMonth()]} ${dayAfter.getFullYear()}` },
      { label: `Next Week (${nextWeek.getDate()} ${months[nextWeek.getMonth()]})`, value: `${nextWeek.getDate()} ${months[nextWeek.getMonth()]} ${nextWeek.getFullYear()}` },
    ];
  };

  // Load User & Home Screen Location Context
  useEffect(() => {
    loadUserAndLocationContext();
  }, []);

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
      if (storedName) setQuickName(storedName);
      if (storedPhone) setQuickMobile(storedPhone);

      if (activeCity) {
        setAddress((prev) => prev ? prev.replace(/Mysuru|Bengaluru|Bangalore|Hassan/gi, activeCity) : `No. 44, 2nd Cross, Saraswathipuram, ${activeCity}, Karnataka - 570009`);
        setQuickAddress((prev) => prev ? prev.replace(/Mysuru|Bengaluru|Bangalore|Hassan/gi, activeCity) : `No. 44, 2nd Cross, Saraswathipuram, ${activeCity}, Karnataka - 570009`);
      }
    } catch (e) {
      console.log('Error loading context in NurseBookingScreen.web:', e);
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

  const handleQuickBookNurse = () => {
    requireLogin(() => _doQuickBookNurse());
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

  // Multi-step request flow: 1: Services, 2: Patient, 3: Preferences & Timing, 4: Review, 5: Confirmation
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
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Morning (08:00 AM - 11:00 AM)');
  const [startDateOption, setStartDateOption] = useState('Today');
  const [careDays, setCareDays] = useState(1);
  const [languagePreference, setLanguagePreference] = useState('Kannada / English');
  const [continuityPreference, setContinuityPreference] = useState('Prefer the Same Nurse for Future Visits');

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
        key: `cal-${day}`,
      });
    }

    return cells;
  }, [calYear, calMonth, selectedCalDate]);

  // Dynamic Multi-day Pricing Calculation
  const pricingDetails = useMemo(() => {
    let baseRate = 0;
    selectedServices.forEach((srvName) => {
      baseRate += getServicePriceByName(srvName);
    });
    if (baseRate === 0) baseRate = 299;

    let dailyRate = baseRate;
    if (shiftDuration === '4-Hour Care Shift') {
      dailyRate = Math.max(dailyRate, 799);
    } else if (shiftDuration === '12-Hour Day Shift') {
      dailyRate = Math.max(dailyRate, 1499);
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

  // Requests Data List
  const [requestsList, setRequestsList] = useState(initialNursingRequests);
  const [requestsTabFilter, setRequestsTabFilter] = useState('All');
  const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);
  const [newlyCreatedRequest, setNewlyCreatedRequest] = useState(null);

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
        // Also sync to @unnathi_nurse_bookings
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

        // Also sync to central @unnathi_appointments
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

  // =========================================================================
  // ADMIN / COORDINATOR WORKFLOW HANDLERS
  // =========================================================================
  const handleAdminStartContacting = async (req) => {
    try {
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
        'Care coordinator is reviewing your request and contacting you shortly.',
        'Bookings',
        req.id
      );
      showAlert('Status Updated', `Request #${req.id} is now under coordinator review.`);
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

      // Notification to user with Pay Now prompt
      sendInAppNotification(
        `Home Nursing Request #${selectedEnquiryReq.id}`,
        `Your Home Nursing service request has been reviewed. Please complete the payment of ₹${parsedFee} to confirm your booking.`,
        'Bookings',
        selectedEnquiryReq.id
      );

      showAlert('Payment Link Sent', `Payment link for ₹${parsedFee} has been sent to user (${selectedEnquiryReq.patientName}). Request is now "Payment Pending".`);
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
            { stage: 'Service Completed', completed: false, timestamp: 'Scheduled visit pending' },
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

      // Record transaction to global store
      await saveTransaction({
        id: `TXN-NUR-${Date.now().toString().slice(-6)}`,
        title: `Home Nursing - ${req.serviceName || 'Procedure'}`,
        amount: parsedFee,
        type: 'Home Nursing',
        status: 'Success',
        date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        referenceId: req.id,
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
      console.log('Error rejecting booking:', e);
    }
  };

  const handleAdminVerifyPayment = async (req) => {
    handleAdminConfirmBooking(req);
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

      showAlert('Service In Progress', `Request #${req.id} updated to "Service In Progress".`);
    } catch (e) {
      console.log('Error updating service in progress:', e);
    }
  };

  // 4. Mark Service Completed Action
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

      showAlert('Service Completed', `Request #${req.id} marked as "Completed".`);
    } catch (e) {
      console.log('Error marking service completed:', e);
    }
  };

  const handleAdminCancelRequest = async (req) => {
    handleAdminOpenRejectModal(req);
  };

  // =========================================================================
  // USER PAYMENT FLOW HANDLERS
  // =========================================================================
  const handleInitiatePayment = (req) => {
    setSelectedPaymentReq(req);
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentReq) return;
    const isGuest = await isGuestUser();
    if (isGuest) {
      promptLoginRequired(navigation, { service: 'payment' });
      return;
    }
    setPaymentProcessing(true);

    try {
      const parsedFee = selectedPaymentReq.fee || 349;
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const updatedList = requestsList.map((r) => {
        if (r.id === selectedPaymentReq.id) {
          const updatedTimeline = (r.timeline || []).map((t, idx) => {
            if (idx <= 4) return { ...t, completed: true, timestamp: t.timestamp || 'Just now' };
            return t;
          });
          return {
            ...r,
            status: 'Booking Confirmed',
            currentStageIndex: 4,
            paymentStatus: 'Paid',
            paidAmount: parsedFee,
            paymentMethod: selectedPaymentMethod,
            paymentDate: new Date().toISOString(),
            timeline: updatedTimeline,
          };
        }
        return r;
      });

      setRequestsList(updatedList);
      await saveRequests(updatedList);

      // Record transaction to user payment history
      await saveTransaction({
        id: `TXN-NUR-${Date.now().toString().slice(-6)}`,
        title: `Home Nursing - ${selectedPaymentReq.serviceName || 'Procedure'}`,
        amount: parsedFee,
        type: 'Home Nursing',
        status: 'Success',
        date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        referenceId: selectedPaymentReq.id,
      });

      setPaymentProcessing(false);
      setPaymentModalVisible(false);

      sendInAppNotification(
        `Home Nursing Request #${selectedPaymentReq.id}`,
        'Your Home Nursing booking has been confirmed successfully.',
        'Bookings',
        selectedPaymentReq.id
      );

      showAlert(
        'Payment Successful',
        `Payment of ₹${parsedFee} received successfully! Your Home Nursing visit #${selectedPaymentReq.id} is confirmed.`
      );
    } catch (e) {
      setPaymentProcessing(false);
      showAlert('Payment Error', 'Unable to complete transaction. Please try again.');
    }
  };

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

  // Validate step 2
  const handleProceedFromPatientDetails = () => {
    const errors = {};
    if (!patientName.trim() || patientName.trim().length < 2) {
      errors.name = 'Please enter patient full name.';
    }
    if (!patientAge.trim() || isNaN(patientAge) || parseInt(patientAge) <= 0 || parseInt(patientAge) > 120) {
      errors.age = 'Please enter a valid age.';
    }
    const cleanPhone = contactNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = 'Please provide a valid 10-digit contact number.';
    }
    if (!address.trim() || address.trim().length < 5) {
      errors.address = 'Please enter complete service address (House/Flat No, Street, City, State, Pincode).';
    } else {
      // Strict Location Validation against Home Screen City
      const val = validateAddressMatchesCity(address, selectedCity);
      if (!val.isValid) {
        errors.address = val.errorMessage;
        setAddressValidationMsg(val.errorMessage);
        setAddressValidationModalVisible(true);
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setFlowStep(3);
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
    _doSubmitCareRequest();
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
        ['Request Submitted', 'Admin Contacting', 'Enquiry Completed', 'Payment Pending', 'Service In Progress'].includes(r.status)
      );
    }
    if (requestsTabFilter === 'Confirmed') {
      return requestsList.filter((r) =>
        ['Booking Confirmed', 'Visit Confirmed', 'Schedule Confirmed'].includes(r.status)
      );
    }
    if (requestsTabFilter === 'Completed') {
      return requestsList.filter((r) => ['Completed', 'Visit Completed'].includes(r.status));
    }
    return requestsList;
  }, [requestsList, requestsTabFilter]);

  // =========================================================================
  // VIEW 1: WEB LANDING PAGE
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
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainInnerContent, isDesktopWeb && styles.desktopContainer]}>
        {/* Top Header Bar */}
        <View style={styles.topBarRow}>
          <View style={styles.headerLeftGroup}>
            <WebBackButton
              onPress={() => {
                if (navigation?.canGoBack && navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate('Home');
                }
              }}
            />

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Home Nursing Care</Text>
              <View style={styles.cityLocationPill}>
                <Ionicons name="location-sharp" size={12} color="#0D9488" />
                <Text style={styles.cityLocationText}>{selectedCity || 'Mysuru'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.helplineBtn}
            onPress={() => showAlert('Care Helpline', 'Connecting to 24/7 Support: 1800-425-0099')}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={13} color="#0D9488" />
            <Text style={styles.helplineBtnText}>1800-425-0099</Text>
          </TouchableOpacity>
        </View>

        {/* 1. LIGHT BANNER HERO SECTION */}
        <View style={[styles.webHeroBanner, !isDesktopWeb && styles.mobileHeroBanner]}>
          <View style={styles.webHeroContentRow}>
            <View style={styles.webHeroTextCol}>
              <View style={styles.webHeroBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#0D9488" />
                <Text style={styles.webHeroBadgeText}>KNC Verified Clinicians</Text>
              </View>

              <Text style={styles.webHeroTitle}>Home Nursing Care</Text>
              <Text style={styles.webHeroSubtitle}>
                Hospital-grade nursing delivered at your doorstep with certified clinicians.
              </Text>

              {/* Trust Badges */}
              <View style={styles.webTrustRow}>
                <View style={styles.webTrustBadge}>
                  <Ionicons name="checkmark-circle" size={15} color="#0D9488" />
                  <Text style={styles.webTrustText}>Verified Nurses</Text>
                </View>
                <View style={styles.webTrustBadge}>
                  <Ionicons name="checkmark-circle" size={15} color="#0D9488" />
                  <Text style={styles.webTrustText}>24/7 Support</Text>
                </View>
                <View style={styles.webTrustBadge}>
                  <Ionicons name="checkmark-circle" size={15} color="#0D9488" />
                  <Text style={styles.webTrustText}>Sterile Consumables</Text>
                </View>
              </View>
            </View>

            {isDesktopWeb && (
              <View style={styles.webHeroGraphicBox}>
                <View style={styles.webHeroIconCircle}>
                  <Ionicons name="medkit-outline" size={40} color="#0D9488" />
                </View>
                <View style={styles.webHeroFloatingTag}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.webHeroFloatingTagText}>4.9★ Rating</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* MAIN BODY: 2 COLUMN (ON DESKTOP) OR STACKED (ON MOBILE/TABLET) */}
        <View style={[styles.webMainRow, isDesktopWeb && styles.webMainRowDesktop]}>
          {/* LEFT: FORM CARD */}
          <View style={[styles.webFormCol, isDesktopWeb && styles.webFormColDesktop]}>
            <View style={styles.simpleFormCard}>
              {/* Card Banner Header with Light Color (Desktop only) */}
              <View style={[styles.cardBannerHeader, !isDesktopWeb && styles.mobileCardBannerHeader]}>
                <View style={styles.cardBannerHeaderTitleRow}>
                  <View style={styles.cardBannerIconWrap}>
                    <Ionicons name="clipboard-outline" size={17} color="#0D9488" />
                  </View>
                  <View>
                    <Text style={styles.cardBannerTitle}>Request Nursing Care</Text>
                    <Text style={styles.cardBannerSub}>Request a certified nursing visit at home</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBannerBody}>

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
            </View>
          </View>

          {/* RIGHT / SECONDARY COLUMN: QUICK SERVICES & MY REQUESTS */}
          <View style={[styles.webSideCol, isDesktopWeb && styles.webSideColDesktop]}>
            {/* 3. QUICK SERVICES SECTION */}
            <View style={styles.quickServicesSection}>
              {/* Card Banner Header with Light Color (Desktop only) */}
              <View style={[styles.cardBannerHeader, !isDesktopWeb && styles.mobileCardBannerHeader]}>
                <View style={styles.cardBannerHeaderTitleRow}>
                  <View style={styles.cardBannerIconWrap}>
                    <Ionicons name="flash-outline" size={16} color="#0D9488" />
                  </View>
                  <View>
                    <Text style={styles.cardBannerTitle}>Quick Services</Text>
                    <Text style={styles.cardBannerSub}>One-tap common clinical procedures</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBannerBody}>
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
            </View>

            {/* 4. MY REQUESTS & STATUS TRACKING SECTION */}
            <View style={styles.myRequestsSection}>
              {/* Card Banner Header with Light Color (Desktop only) */}
              <View style={[styles.cardBannerHeader, !isDesktopWeb && styles.mobileCardBannerHeader]}>
                <View style={styles.cardBannerHeaderTitleRow}>
                  <View style={styles.cardBannerIconWrap}>
                    <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                  </View>
                  <View>
                    <Text style={styles.cardBannerTitle}>My Requests</Text>
                    <Text style={styles.cardBannerSub}>Live status & visit tracking</Text>
                  </View>
                </View>
                {requestsList.length > 0 && (
                  <TouchableOpacity onPress={() => setCurrentView('MY_REQUESTS')} activeOpacity={0.7}>
                    <Text style={styles.viewAllRequestsText}>View All ({requestsList.length}) →</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardBannerBody}>

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
                                !isRejected && !isServiceDone && !isBookingDone && { color: '#1E3A8A' },
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
              )}
              </View>
            </View>
          </View>
        </View>
        </View>

        {isDesktopWeb && (
          <WebFooter
            navigation={navigation}
          />
        )}
      </ScrollView>
    );
  };

  // =========================================================================
  // VIEW: ADMIN / COORDINATOR DESK VIEW
  // =========================================================================
  const renderAdminCoordinatorView = () => {
    const submittedCount = requestsList.filter((r) => r.status === 'Request Submitted').length;
    const paymentPendingCount = requestsList.filter((r) => r.status === 'Payment Pending').length;
    const inProgressCount = requestsList.filter((r) => r.status === 'Service In Progress').length;
    const completedCount = requestsList.filter((r) => ['Completed', 'Visit Completed'].includes(r.status)).length;

    const filteredAdminList = requestsList.filter((r) => {
      if (adminFilterTab === 'All') return true;
      if (adminFilterTab === 'New Requests') return r.status === 'Request Submitted';
      if (adminFilterTab === 'Contacting') return r.status === 'Admin Contacting';
      if (adminFilterTab === 'Payment Pending') return r.status === 'Payment Pending';
      if (adminFilterTab === 'Confirmed') return ['Booking Confirmed', 'Visit Confirmed'].includes(r.status);
      if (adminFilterTab === 'In Progress') return r.status === 'Service In Progress';
      if (adminFilterTab === 'Completed') return ['Completed', 'Visit Completed'].includes(r.status);
      return true;
    });

    return (
      <View style={styles.adminDeskRoot}>
        {/* Admin Header Card */}
        <View style={styles.adminHeaderCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color="#38BDF8" />
                <Text style={styles.adminDeskTitle}>Coordinator & Request Desk</Text>
              </View>
              <Text style={styles.adminDeskSub}>
                Review requests, call patients, enquire requirements, send payment links, and coordinate nurses
              </Text>
            </View>

            <View style={styles.adminLiveBadge}>
              <View style={styles.adminLiveDot} />
              <Text style={styles.adminLiveText}>{requestsList.length} Total Requests</Text>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.adminStatsGrid}>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#1E3A8A' }]}>{submittedCount}</Text>
              <Text style={styles.adminStatLabel}>New Received</Text>
            </View>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#EA580C' }]}>{paymentPendingCount}</Text>
              <Text style={styles.adminStatLabel}>Pay Pending</Text>
            </View>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#1E3A8A' }]}>{inProgressCount}</Text>
              <Text style={styles.adminStatLabel}>In Progress</Text>
            </View>
            <View style={styles.adminStatItem}>
              <Text style={[styles.adminStatNumber, { color: '#16A34A' }]}>{completedCount}</Text>
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
          {['All', 'New Requests', 'Contacting', 'Payment Pending', 'Confirmed', 'In Progress', 'Completed'].map((tab) => {
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
          <View style={{ gap: 14 }}>
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
                          !isRejected && !isCompleted && !isConfirmed && req.status !== 'Payment Pending' && { color: '#1E3A8A' },
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
      </View>
    );
  };

  // =========================================================================
  // VIEW 2: STEP-BY-STEP CARE REQUEST FLOW
  // =========================================================================
  const renderRequestFlowView = () => (
    <View style={styles.flowRoot}>
      {/* Top Flow Header */}
      <View style={styles.flowHeader}>
        <WebBackButton
          onPress={() => {
            if (flowStep > 1 && flowStep < 5) {
              setFlowStep(flowStep - 1);
            } else {
              setCurrentView('LANDING');
            }
          }}
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.flowHeaderTitle}>
            {flowStep === 1 && 'Step 1: Select Care Requirements'}
            {flowStep === 2 && 'Step 2: Patient & Visit Address'}
            {flowStep === 3 && 'Step 3: Shift Timing & Preferences'}
            {flowStep === 4 && 'Step 4: Review Care Request'}
            {flowStep === 5 && 'Request Submitted Successfully'}
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

      {/* Stepper Progress Bar (Steps 1 to 4) */}
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
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
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
        contentContainerStyle={[
          styles.flowScrollContent,
          isDesktopWeb && styles.flowDesktopContainer,
        ]}
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
                        <View style={[styles.selectCardIconWrap, { backgroundColor: item.bgColor, width: 44, height: 44, marginLeft: 0 }]}>
                          <Ionicons name={item.icon} size={22} color={item.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <View style={styles.selectCardHeaderRow}>
                            <Text style={styles.singleSelectedTitle}>{item.name}</Text>
                            <Text style={styles.singleSelectedPrice}>{meta.price}</Text>
                          </View>
                          <View style={styles.singleSelectedMetaRow}>
                            <View style={styles.greenCheckBadge}>
                              <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                              <Text style={styles.greenCheckBadgeText}>Selected for Home Booking</Text>
                            </View>
                            <Text style={styles.singleSelectedDuration}>
                              • {meta.duration} • {meta.shiftType}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text style={styles.singleSelectedDesc}>{item.shortDesc}</Text>

                      <View style={styles.singleSelectedKitRow}>
                        <Ionicons name="shield-checkmark" size={15} color="#0D9488" />
                        <Text style={styles.singleSelectedKitText}>
                          <Text style={{ fontWeight: '700' }}>Kit Provided:</Text> {item.equipmentProvided}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={styles.addMoreServicesBtn}
                  onPress={() => setShowAllServices(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#0D9488" />
                  <Text style={styles.addMoreServicesBtnText}>+ Add another procedure or change service</Text>
                </TouchableOpacity>

                <View style={styles.bookingSelectedTrustBanner}>
                  <Ionicons name="shield-checkmark" size={18} color="#00B894" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.bookingSelectedTrustTitle}>Zero Advance Deposit • Pay Post-Procedure</Text>
                    <Text style={styles.bookingSelectedTrustSub}>
                      KNC registered nurse assigned in 15 mins. Standard sterile care kit included.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                {selectedServices.length > 0 && (
                  <View style={styles.selectedCountBanner}>
                    <Ionicons name="checkbox" size={17} color="#00B894" />
                    <Text style={styles.selectedCountBannerText}>
                      <Text style={{ fontWeight: '800' }}>{selectedServices.length}</Text> service
                      {selectedServices.length === 1 ? '' : 's'} selected
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowAllServices(false)}
                      style={[styles.doneAddingPill, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="#00B894" />
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
                          {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>

                        <View style={[styles.selectCardIconWrap, { backgroundColor: item.bgColor }]}>
                          <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>

                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={styles.selectCardHeaderRow}>
                            <Text style={styles.selectCardTitle}>{item.name}</Text>
                            <Text style={styles.selectCardPrice}>{meta.price}</Text>
                          </View>
                          <Text style={styles.selectCardDesc}>{item.shortDesc}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="medkit-outline" size={12} color="#00B894" />
                            <Text style={styles.selectCardKit}>
                              <Text style={{ fontWeight: '600' }}>Kit:</Text> {item.equipmentProvided}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.stepActionFooter}>
              <TouchableOpacity
                style={styles.primaryProceedBtn}
                onPress={handleProceedFromServices}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryProceedBtnText}>Continue to Patient Details</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
                Tell us who will be receiving care in {selectedCity} so our coordinator can plan appropriately:
              </Text>
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
              <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
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

            {/* Relationship to Patient */}
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
              <Text style={styles.formLabel}>Contact Number for Care Coordinator *</Text>
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
              <Text style={styles.formLabel}>Complete Home Visit Address * (Must be in {selectedCity})</Text>
              <TextInput
                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }, formErrors.address && styles.formInputError]}
                value={address}
                onChangeText={(t) => {
                  setAddress(t);
                  if (formErrors.address) setFormErrors({ ...formErrors, address: null });
                }}
                placeholder={`House/flat number, building name, street, locality, ${selectedCity}, State, Pincode...`}
                placeholderTextColor="#94A3B8"
                multiline={true}
              />
              {formErrors.address && <Text style={styles.formErrorText}>{formErrors.address}</Text>}
            </View>

            {/* Clinical Background Info */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Patient Condition & Clinical History <Text style={{ fontWeight: '400', color: '#94A3B8' }}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                value={careInfo}
                onChangeText={setCareInfo}
                placeholder="e.g. Recent knee surgery stitch dressing, diabetic patient, needs morning vitals check..."
                placeholderTextColor="#94A3B8"
                multiline={true}
              />
            </View>

            {/* Step 2 Actions */}
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
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
                        size={17}
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
                          size={16}
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
                  <View style={styles.calNavHeader}>
                    <TouchableOpacity
                      style={[styles.calNavBtn, isCurrentMonthOrPast && styles.calNavBtnDisabled]}
                      onPress={handlePrevCalMonth}
                      disabled={isCurrentMonthOrPast}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color={isCurrentMonthOrPast ? '#CBD5E1' : '#0F172A'}
                      />
                    </TouchableOpacity>

                    <View style={styles.calMonthYearBox}>
                      <Ionicons name="calendar-outline" size={16} color="#00B894" style={{ marginRight: 6 }} />
                      <Text style={styles.calMonthYearText}>
                        {CALENDAR_MONTH_NAMES[calMonth]} {calYear}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.calNavBtn}
                      onPress={handleNextCalMonth}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calWeekdaysRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <View key={d} style={styles.calWeekdayCell}>
                        <Text style={styles.calWeekdayText}>{d}</Text>
                      </View>
                    ))}
                  </View>

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
                </View>
              )}
            </View>

            {/* Duration of Care */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithOptional}>
                <Text style={styles.formLabel}>How Many Days is Care Required? *</Text>
                <View style={styles.daysBadge}>
                  <Ionicons name="time-outline" size={13} color="#0D9488" />
                  <Text style={styles.daysBadgeText}>
                    {careDays} {careDays === 1 ? 'Day (Single Visit)' : `Days (${careDays} Daily Visits)`}
                  </Text>
                </View>
              </View>

              <View style={styles.daysPresetsRow}>
                {[
                  { days: 1, label: '1 Day (Single)' },
                  { days: 3, label: '3 Days' },
                  { days: 7, label: '7 Days (1 Wk)' },
                  { days: 15, label: '15 Days (2 Wks)' },
                  { days: 30, label: '30 Days (1 Mo)' },
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

              {/* Dynamic Estimated Pricing Card */}
              <View style={styles.pricingSummaryCard}>
                <View style={styles.pricingTopRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={styles.pricingTagRow}>
                      <Ionicons name="calculator" size={16} color="#00B894" />
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
                  </View>
                </View>
              </View>
            </View>

            {/* Document Upload */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithOptional}>
                <Text style={styles.formLabel}>Prescription or Hospital Discharge Summary</Text>
                <View style={styles.optionalTag}>
                  <Text style={styles.optionalTagText}>Optional</Text>
                </View>
              </View>

              {uploadedDoc ? (
                <View style={styles.uploadedDocCard}>
                  <Ionicons name="document-text" size={24} color="#00B894" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.uploadedDocName} numberOfLines={1}>{uploadedDoc.name}</Text>
                    <Text style={styles.uploadedDocSize}>{uploadedDoc.type} • {uploadedDoc.size}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setUploadedDoc(null)} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadDropzone}
                  onPress={handleSimulateDocumentUpload}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-upload-outline" size={28} color="#00B894" />
                  <Text style={styles.uploadDropzoneTitle}>Upload Prescription / Doctor Notes</Text>
                  <Text style={styles.uploadDropzoneSub}>PDF, JPG, PNG up to 10 MB</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Language Preference */}
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

            {/* Step 3 Actions */}
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
                <Text style={styles.primaryProceedBtnText}>Review & Confirm Request</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
                      <Ionicons name="checkmark-circle" size={14} color="#00B894" />
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
                    <Text style={[styles.reviewValue, { fontWeight: '800', color: '#00B894', fontSize: 16 }]}>
                      ₹{pricingDetails.finalTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Payment Terms:</Text>
                    <Text style={styles.reviewValue}>Zero advance • Pay after coordinator enquiry</Text>
                  </View>
                </View>
              </View>

              <View style={styles.zeroDepositNotice}>
                <Ionicons name="shield-checkmark" size={18} color="#00B894" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.zeroDepositTitle}>Zero Advance Payment Needed</Text>
                  <Text style={styles.zeroDepositSub}>
                    Our clinical care coordinator will call your registered number within 15 minutes to confirm nurse availability and exact schedule. Payment link is sent only after confirming care details.
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
                style={[styles.primaryProceedBtn, { flex: 1, backgroundColor: '#00B894' }]}
                onPress={handleSubmitCareRequest}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryProceedBtnText}>Submit Care Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 5: CONFIRMATION SUCCESS STATE */}
        {flowStep === 5 && newlyCreatedRequest && (
          <View style={styles.successStateBox}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark" size={36} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.successTitle}>Care Request Submitted Successfully!</Text>
            <Text style={styles.successSub}>
              Your request ID is <Text style={{ fontWeight: '800', color: '#0F172A' }}>{newlyCreatedRequest.id}</Text>
            </Text>

            <View style={styles.successPricingPill}>
              <Ionicons name="pricetag" size={16} color="#00B894" />
              <Text style={styles.successPricingPillText}>
                Estimated Total: <Text style={{ fontWeight: '800', color: '#0F172A' }}>₹{(newlyCreatedRequest.preferences?.estimatedTotalCost || pricingDetails.finalTotal).toLocaleString('en-IN')}</Text> ({newlyCreatedRequest.preferences?.careDays || pricingDetails.days} {newlyCreatedRequest.preferences?.careDays === 1 ? 'Day' : 'Days'}) • Zero Advance Deposit
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
                  Coordinator reviews requirements, confirms schedule & sends secure payment link.
                </Text>
              </View>
              <View style={styles.nextStepItem}>
                <Text style={styles.nextStepNum}>3</Text>
                <Text style={styles.nextStepText}>
                  A suitable licensed nurse (GNM / B.Sc) arrives with sterile procedure kit.
                </Text>
              </View>
            </View>

            <View style={styles.successActionsRow}>
              <TouchableOpacity
                style={[styles.trackRequestBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  setSelectedRequestDetail(newlyCreatedRequest);
                  setCurrentView('MY_REQUESTS');
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="receipt-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
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
        <View style={[styles.mainInnerContent, isDesktopWeb && styles.desktopContainer]}>
        {/* Top Header - Note: "+ New Request" button is removed per requirements */}
        <View style={styles.myRequestsHeaderRow}>
          <WebBackButton
            onPress={() => setCurrentView('LANDING')}
          />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.myRequestsMainTitle}>My Home Care Requests</Text>
            <Text style={styles.myRequestsSub}>
              Track status, enquiry details, payments & nurse visits in {selectedCity}
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
            <Ionicons name="pulse" size={15} color={requestsHistoryTab === 'CURRENT' ? '#00B894' : '#64748B'} />
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
            <Ionicons name="checkmark-done-circle" size={15} color={requestsHistoryTab === 'PAST' ? '#00B894' : '#64748B'} />
            <Text style={[styles.historySegmentText, requestsHistoryTab === 'PAST' && styles.historySegmentTextActive]}>
              Past Requests ({pastRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Requests Cards List */}
        {currentList.length === 0 ? (
          <View style={styles.emptyRequestsBox}>
            <Ionicons name="clipboard-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyRequestsTitle}>
              {requestsHistoryTab === 'CURRENT' ? 'No Active Nursing Requests' : 'No Past Requests Found'}
            </Text>
            <Text style={styles.emptyRequestsSub}>
              {requestsHistoryTab === 'CURRENT'
                ? 'No ongoing care requests. View your previous history in the Past Requests tab.'
                : 'Completed or cancelled care requests will be listed here.'}
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
                              !isRejected && !isServiceDone && !isBookingDone && !isPayPending && { color: '#1E3A8A' },
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

                  <View style={styles.reqPatientRow}>
                    <Ionicons name="person-outline" size={15} color="#64748B" />
                    <Text style={styles.reqPatientText}>
                      Patient: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{req.patientName}</Text> ({req.patientAge || '58'} yrs, {req.patientGender || 'Male'})
                    </Text>
                  </View>

                  <View style={styles.reqAddressRow}>
                    <Ionicons name="location-outline" size={15} color="#64748B" />
                    <Text style={styles.reqAddressText} numberOfLines={1}>
                      {req.address}
                    </Text>
                  </View>

                  {/* Services tags */}
                  <View style={styles.reqServicesRow}>
                    {(Array.isArray(req.selectedServices) ? req.selectedServices : [req.serviceName || 'Home Nursing']).map((s) => (
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
                          <Ionicons name="checkmark" size={11} color="#FFFFFF" />
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
                            <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                          ) : isPayPending ? (
                            <Ionicons name="time" size={11} color="#B45309" />
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
                            <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                          ) : isRejected ? (
                            <Ionicons name="close" size={12} color="#FFFFFF" />
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
                                <Ionicons name="checkmark" size={11} color="#FFFFFF" />
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
                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                        <Text style={styles.notConfirmedTitle}>Booking Not Confirmed</Text>
                      </View>
                      <Text style={styles.notConfirmedReasonLabel}>Reason:</Text>
                      <Text style={styles.notConfirmedReasonText}>
                        {req.rejectionReason || req.rejectReason || 'The requested nursing service is not available on the selected date.'}
                      </Text>
                    </View>
                  )}

                  {/* Pay Now Banner when status is Payment Pending */}
                  {isPayPending && (
                    <View style={styles.paymentActionBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
                          Payment Link Ready: ₹{req.fee || 349}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#B45309' }}>
                          Care coordinator verified your requirement. Complete payment to confirm.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.payNowBtn}
                        onPress={() => handleInitiatePayment(req)}
                        activeOpacity={0.88}
                      >
                        <Ionicons name="card" size={13} color="#FFFFFF" />
                        <Text style={styles.payNowBtnText}>Pay Now</Text>
                      </TouchableOpacity>
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
        </View>

        {isDesktopWeb && (
          <WebFooter
            navigation={navigation}
          />
        )}
      </ScrollView>
    );
  };

  // =========================================================================
  // VIEW 4: DETAILED REQUEST & STAGE TIMELINE
  // =========================================================================
  const renderRequestDetailsView = () => {
    if (!selectedRequestDetail) return null;
    const req = requestsList.find((r) => r.id === selectedRequestDetail.id) || selectedRequestDetail;
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
        <View style={[styles.mainInnerContent, isDesktopWeb && styles.desktopContainer]}>
        <View style={styles.detailHeaderRow}>
          <WebBackButton
            onPress={() => setCurrentView('MY_REQUESTS')}
          />

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
              style={[styles.payNowBtn, { width: '100%', marginTop: 12, paddingVertical: 12 }]}
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
                        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>{st.timestamp}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.timelineStageDesc}>{st.desc}</Text>

                    {st.reason && (
                      <View style={[styles.notConfirmedReasonCard, { marginTop: 8 }]}>
                        <View style={styles.notConfirmedHead}>
                          <Ionicons name="alert-circle" size={15} color="#DC2626" />
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
          {req.serviceCompletedDate ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Completed On:</Text>
              <Text style={[styles.summaryValue, { color: '#16A34A' }]}>{req.serviceCompletedDate}</Text>
            </View>
          ) : null}
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
        </View>

        {isDesktopWeb && (
          <WebFooter
            navigation={navigation}
          />
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      {currentView === 'LANDING' && renderLandingView()}
      {currentView === 'REQUEST_FLOW' && renderRequestFlowView()}
      {currentView === 'MY_REQUESTS' && renderMyRequestsView()}
      {currentView === 'REQUEST_DETAILS' && renderRequestDetailsView()}

      {/* CARE NEED SELECTION MODAL */}
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
              <Text style={styles.modalTitle}>Select Nursing Care Need</Text>
              <TouchableOpacity onPress={() => setCareNeedModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={true}>
              {NURSING_CARE_NEEDS.map((need, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.modalListItem,
                    selectedCareNeed === need && styles.modalListItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCareNeed(need);
                    setCareNeedModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalListItemText,
                      selectedCareNeed === need && styles.modalListItemTextSelected,
                    ]}
                  >
                    {need}
                  </Text>
                  {selectedCareNeed === need && (
                    <Ionicons name="checkmark-circle" size={18} color="#00B894" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SERVICE REQUIRED DATE SELECTION MODAL */}
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
          <View style={[styles.modalContentCard, { maxWidth: 460 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>When do you need the service?</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Choose a quick option or pick a preferred date
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quick Preset Chips */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 8, marginBottom: 8 }}>
              Quick Selection:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {getPresetDates().map((preset, idx) => {
                const isSelected = quickDate === preset.value;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.modalPresetChip,
                      isSelected && styles.modalPresetChipSelected,
                    ]}
                    onPress={() => {
                      setQuickDate(preset.value);
                      setDateModalVisible(false);
                    }}
                  >
                    <Ionicons
                      name="flash"
                      size={13}
                      color={isSelected ? '#00B894' : '#64748B'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.modalPresetChipText,
                        isSelected && styles.modalPresetChipTextSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Or Select Specific Date:
            </Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calNavHeader}>
                <TouchableOpacity
                  style={styles.calNavBtn}
                  onPress={handlePrevQuickMonth}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.calMonthYearBox}>
                  <Text style={styles.calMonthYearText}>
                    {CALENDAR_MONTH_NAMES[quickCalMonth]} {quickCalYear}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.calNavBtn}
                  onPress={handleNextQuickMonth}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={16} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <View style={styles.calWeekdaysRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                  <View key={i} style={styles.calWeekdayCell}>
                    <Text style={styles.calWeekdayText}>{d}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calGrid}>
                {quickCalendarDays.map((cell) => {
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
                      onPress={() => !cell.isPast && handleSelectQuickCalDay(cell.day)}
                      disabled={cell.isPast}
                      activeOpacity={0.7}
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
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ADMIN ENQUIRY MODAL */}
      <Modal
        visible={enquiryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setEnquiryModalVisible(false)}
        >
          <View style={[styles.modalContentCard, { maxWidth: 520 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Admin Enquiry & Payment Link</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  Request #{selectedEnquiryReq?.id} • Patient: {selectedEnquiryReq?.patientName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEnquiryModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10, paddingVertical: 6 }}>
                <View>
                  <Text style={styles.formLabel}>Required Nursing Service</Text>
                  <TextInput
                    style={styles.enquiryInput}
                    value={enquiryForm.service}
                    onChangeText={(t) => setEnquiryForm({ ...enquiryForm, service: t })}
                    placeholder="e.g. Wound Dressing & Daily Vitals"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Number of Visits</Text>
                    <TextInput
                      style={styles.enquiryInput}
                      value={enquiryForm.visits}
                      onChangeText={(t) => setEnquiryForm({ ...enquiryForm, visits: t })}
                      placeholder="e.g. 1 Visit / 3 Visits"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Duration per Visit</Text>
                    <TextInput
                      style={styles.enquiryInput}
                      value={enquiryForm.duration}
                      onChangeText={(t) => setEnquiryForm({ ...enquiryForm, duration: t })}
                      placeholder="e.g. 45 mins / 4 Hours"
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.formLabel}>Agreed Date & Timing</Text>
                  <TextInput
                    style={styles.enquiryInput}
                    value={enquiryForm.agreedDateTime}
                    onChangeText={(t) => setEnquiryForm({ ...enquiryForm, agreedDateTime: t })}
                    placeholder="e.g. Tomorrow at 10:30 AM"
                  />
                </View>

                <View>
                  <Text style={styles.formLabel}>Agreed Service Charges (₹)</Text>
                  <TextInput
                    style={styles.enquiryInput}
                    value={enquiryForm.charges}
                    onChangeText={(t) => setEnquiryForm({ ...enquiryForm, charges: t })}
                    keyboardType="numeric"
                    placeholder="e.g. 349"
                  />
                </View>

                <View>
                  <Text style={styles.formLabel}>Special Requirements / Clinical Scope</Text>
                  <TextInput
                    style={[styles.enquiryInput, { height: 50, textAlignVertical: 'top' }]}
                    value={enquiryForm.specialReqs}
                    onChangeText={(t) => setEnquiryForm({ ...enquiryForm, specialReqs: t })}
                    multiline={true}
                    placeholder="e.g. Bring sterile surgical gauze, iodine, BP apparatus"
                  />
                </View>

                <View>
                  <Text style={styles.formLabel}>Internal Admin Notes (Hidden from Patient)</Text>
                  <TextInput
                    style={[styles.enquiryInput, { height: 50, textAlignVertical: 'top' }]}
                    value={enquiryForm.adminInternalNotes}
                    onChangeText={(t) => setEnquiryForm({ ...enquiryForm, adminInternalNotes: t })}
                    multiline={true}
                    placeholder="e.g. Nurse Anita assigned; discharge summary verified."
                  />
                </View>
              </View>
            </ScrollView>

            <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveEnquiryAndSendPaymentLink}
                activeOpacity={0.88}
              >
                <Text style={styles.submitBtnText}>Send Payment Link to User (₹{enquiryForm.charges || 349})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PATIENT PAYMENT MODAL */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !paymentProcessing && setPaymentModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => !paymentProcessing && setPaymentModalVisible(false)}
        >
          <View style={[styles.modalContentCard, { maxWidth: 460 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Confirm & Pay</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  Request #{selectedPaymentReq?.id} • {selectedPaymentReq?.serviceName}
                </Text>
              </View>
              {!paymentProcessing && (
                <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Bill Summary */}
            <View style={styles.paymentBillCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service:</Text>
                <Text style={styles.summaryValue}>{selectedPaymentReq?.serviceName || 'Home Nursing'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Address:</Text>
                <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]}>{selectedPaymentReq?.address}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontWeight: '800', color: '#0F172A' }]}>Amount Payable:</Text>
                <Text style={[styles.summaryValue, { fontSize: 16, fontWeight: '900', color: '#00B894' }]}>
                  ₹{selectedPaymentReq?.fee || 349}
                </Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Select Payment Method:
            </Text>
            <View style={{ gap: 6, marginBottom: 16 }}>
              {[
                { id: 'upi', label: 'UPI / Google Pay / PhonePe', icon: 'qr-code-outline' },
                { id: 'card', label: 'Credit / Debit Card', icon: 'card-outline' },
                { id: 'netbanking', label: 'Net Banking', icon: 'business-outline' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.choicePill,
                    { justifyContent: 'flex-start', paddingVertical: 10, paddingHorizontal: 12 },
                    selectedPaymentMethod === m.id && styles.choicePillActive,
                  ]}
                  onPress={() => setSelectedPaymentMethod(m.id)}
                >
                  <Ionicons name={m.icon} size={16} color={selectedPaymentMethod === m.id ? '#00B894' : '#64748B'} />
                  <Text style={[styles.choicePillText, selectedPaymentMethod === m.id && styles.choicePillTextActive, { marginLeft: 8 }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleConfirmPayment}
              activeOpacity={0.88}
              disabled={paymentProcessing}
            >
              {paymentProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Pay ₹{selectedPaymentReq?.fee || 349} & Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SUBMISSION CONFIRMATION MODAL */}
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
          <View style={[styles.modalContentCard, { maxWidth: 460 }]} onStartShouldSetResponder={() => true}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.modalTitle, { marginTop: 10, textAlign: 'center' }]}>
                Nursing Request Submitted
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                Your nursing request has been submitted successfully. Our coordinator will contact you shortly.
              </Text>
            </View>

            {submittedBookingDetail && (
              <View style={styles.paymentBillCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Request ID:</Text>
                  <Text style={styles.summaryValue}>{submittedBookingDetail.id}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service:</Text>
                  <Text style={styles.summaryValue}>{submittedBookingDetail.serviceName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Requested Date:</Text>
                  <Text style={styles.summaryValue}>{submittedBookingDetail.startDate || submittedBookingDetail.date}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service Address:</Text>
                  <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]}>{submittedBookingDetail.address}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Current Status:</Text>
                  <Text style={[styles.summaryValue, { color: '#1E3A8A', fontWeight: '800' }]}>{submittedBookingDetail.status}</Text>
                </View>
              </View>
            )}

            <View style={{ gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => {
                  setConfirmationModalVisible(false);
                  if (submittedBookingDetail) {
                    setSelectedRequestDetail(submittedBookingDetail);
                  }
                  setCurrentView('MY_REQUESTS');
                }}
              >
                <Text style={styles.submitBtnText}>Track My Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stepBackOutlineBtn}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Text style={[styles.stepBackOutlineBtnText, { textAlign: 'center' }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ADDRESS VALIDATION MISMATCH MODAL */}
      <Modal
        visible={addressValidationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddressValidationModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAddressValidationModalVisible(false)}
        >
          <View style={[styles.modalContentCard, { maxWidth: 440 }]} onStartShouldSetResponder={() => true}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={[styles.successIconInner, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="location-outline" size={28} color="#DC2626" />
              </View>
              <Text style={[styles.modalTitle, { marginTop: 10, textAlign: 'center', color: '#B91C1C' }]}>
                Service Location Notice
              </Text>
              <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                {addressValidationMsg || `Home Nursing is currently unavailable for this address. Please change your location or enter an address within ${selectedCity}.`}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#0F172A' }]}
              onPress={() => setAddressValidationModalVisible(false)}
            >
              <Text style={styles.submitBtnText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ADMIN DO NOT CONFIRM / REJECTION MODAL */}
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

      {/* FLOATING IN-APP NOTIFICATION TOAST */}
      {inAppToast.visible && (
        <View style={styles.floatingToastWrap}>
          <Ionicons name="notifications" size={20} color="#5EEAD4" />
          <View style={styles.floatingToastContent}>
            <Text style={styles.floatingToastTitle}>{inAppToast.title}</Text>
            <Text style={styles.floatingToastMessage}>{inAppToast.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setInAppToast({ visible: false, title: '', message: '' })}>
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// =========================================================================
// STYLES
// =========================================================================
const baseStyles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAFCFD',
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 0,
    width: '100%',
  },
  mainInnerContent: {
    width: '100%',
    paddingBottom: 40,
  },
  desktopContainer: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
  },
  webFooterLightBanner: {
    width: '100%',
  },

  // Top Bar Row
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE7EC',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  cityLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 4,
  },
  cityLocationText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0D9488',
  },
  liveVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00B894',
  },
  liveVerifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  roleTogglePill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 2,
  },
  roleToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  roleToggleBtnActive: {
    backgroundColor: '#0F172A',
  },
  roleToggleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  roleToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  helplineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },

  // Light Banner Web Hero
  webHeroBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  mobileHeroBanner: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: 16,
  },
  cardBannerHeader: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mobileCardBannerHeader: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  cardBannerHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardBannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardBannerSub: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
    marginTop: 1,
  },
  cardBannerBody: {
    padding: 18,
  },
  webHeroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  webHeroTextCol: {
    flex: 1,
  },
  webHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6FFFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  webHeroBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0D9488',
  },
  webHeroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  webHeroSubtitle: {
    fontSize: 14,
    color: '#647488',
    lineHeight: 20,
    marginBottom: 14,
    maxWidth: 620,
  },
  webTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  webTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  webTrustText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  webHeroGraphicBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingRight: 10,
  },
  webHeroIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#99F6E4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  webHeroFloatingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: '#FDE68A',
    position: 'absolute',
    bottom: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  webHeroFloatingTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
  },

  // Web Main Layout
  webMainRow: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 32,
  },
  webMainRowDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  webFormCol: {
    flex: 1,
  },
  webFormColDesktop: {
    flex: 1.1,
  },
  webSideCol: {
    flex: 1,
  },
  webSideColDesktop: {
    flex: 0.9,
  },

  // Simplified Form Card with Light Banner
  simpleFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  simpleFormHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  simpleFormSubheading: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 18,
  },
  fieldGroup: {
    marginBottom: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 46,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
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
    marginTop: 8,
    marginBottom: 14,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  primaryRequestBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compactContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    paddingVertical: 11,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  compactContactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },

  // Quick Services Section with Light Banner
  quickServicesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  quickChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {}),
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

  // My Requests Inline Section with Light Banner
  myRequestsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllRequestsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  viewMoreOnNextPageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  emptyInlineRequestsCard: {
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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

  // HERO SECTION (Legacy fallback)
  heroContainer: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 32,
  },
  networkStatsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  networkStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  networkStatNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  networkStatLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  networkStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },

  // RIGHT COLUMN: FORM CARD
  rightColumn: {
    flex: 1,
  },
  rightColumnDesktop: {
    flex: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  formBody: {
    gap: 10,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dropdownFieldText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 13,
    color: '#0F172A',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  addressInputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
  },
  addressTextInput: {
    fontSize: 12.5,
    color: '#0F172A',
    lineHeight: 18,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
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
  },
  quickAddressErrorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  submitBtn: {
    backgroundColor: '#00B894',
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  formShortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  shortcutBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },

  // DIRECT CONTACT CARD
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  contactNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // POPULAR SERVICES GRID
  procedureCatalogSection: {
    marginTop: 10,
    marginBottom: 30,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionHeaderSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  procedureCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  procedureCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  procedureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  procedureCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  procedureCardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  procedureCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  procedureCardPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00B894',
  },
  procedureBookBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  procedureBookBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0D9488',
  },

  // ADMIN DESK STYLES
  adminDeskRoot: {
    marginBottom: 30,
  },
  adminHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  adminDeskTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  adminDeskSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  adminLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  adminLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  adminLiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  adminStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  adminStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  adminStatNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  adminStatLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  adminFilterScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  adminFilterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  adminFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  adminFilterChipTextActive: {
    color: '#FFFFFF',
  },
  adminReqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminReqCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  adminReqIdText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  adminCityTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminCityTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  adminReqDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  adminPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  adminPatientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminPatientMeta: {
    fontSize: 11.5,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminCallBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminDetailRow: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 6,
  },
  adminDetailLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '700',
    width: 65,
  },
  adminDetailVal: {
    fontSize: 11.5,
    color: '#1E293B',
    fontWeight: '600',
  },
  adminEnquiryNotesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginVertical: 8,
  },
  adminEnquiryNotesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 3,
  },
  adminEnquiryNotesText: {
    fontSize: 11,
    color: '#475569',
  },
  adminActionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adminPrimaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminPrimaryActionBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminEnquiryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminVerifyPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  adminCancelBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },

  // WIZARD FLOW STYLES
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  flowHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  flowHeaderSub: {
    fontSize: 11.5,
    color: '#64748B',
  },
  flowCloseBtn: {
    padding: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  stepItemWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepperCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCircleCurrent: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  stepperCircleDone: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  stepperCircleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  stepperCircleTextCurrent: {
    color: '#FFFFFF',
  },
  stepperLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  stepperLabelTextCurrent: {
    color: '#0F172A',
    fontWeight: '800',
  },
  stepperConnectingLine: {
    position: 'absolute',
    top: 13,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: -1,
  },
  stepperConnectingLineActive: {
    backgroundColor: '#0D9488',
  },
  flowScroll: {
    flex: 1,
  },
  flowScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  flowDesktopContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  stepTitleBox: {
    marginBottom: 16,
  },
  stepMainHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  stepSubHeading: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorAlertText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  selectedConfirmedWrap: {
    gap: 10,
  },
  singleSelectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#00B894',
  },
  singleSelectedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  singleSelectedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  singleSelectedPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00B894',
  },
  singleSelectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greenCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  greenCheckBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  singleSelectedDuration: {
    fontSize: 11,
    color: '#64748B',
  },
  singleSelectedDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  singleSelectedKitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 8,
    borderRadius: 6,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    marginTop: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  addMoreServicesBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  bookingSelectedTrustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 8,
  },
  bookingSelectedTrustTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  bookingSelectedTrustSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  selectedCountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedCountBannerText: {
    fontSize: 12,
    color: '#065F46',
  },
  doneAddingPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00B894',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  doneAddingPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00B894',
  },
  servicesSelectList: {
    gap: 8,
  },
  serviceSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  serviceSelectCardChecked: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDFA',
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  customCheckboxChecked: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  selectCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectCardPrice: {
    fontSize: 13,
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
    color: '#0D9488',
  },
  stepActionFooter: {
    marginTop: 16,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  primaryProceedBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepDualActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  stepBackOutlineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  stepBackOutlineBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },

  // FORM GROUP
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  formInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  formErrorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 3,
    fontWeight: '600',
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
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  choicePillActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#00B894',
  },
  choicePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  choicePillTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },

  // SHIFT CARDS
  shiftDurationGrid: {
    gap: 8,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    fontWeight: '700',
    color: '#334155',
  },
  shiftCardTitleActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  shiftCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginLeft: 25,
  },
  dateOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateOptionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dateOptionCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDFA',
  },
  dateOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateRadioCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dateOptionLabelActive: {
    color: '#00B894',
  },
  dateOptionSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },

  // PRICING SUMMARY CARD
  pricingSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  pricingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pricingTagText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  pricingCalcSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pricingAmountWrap: {
    alignItems: 'flex-end',
  },
  pricingStrikePrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  pricingFinalAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#00B894',
  },
  labelWithOptional: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
  },
  presetDayPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  presetDayPillActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#00B894',
  },
  presetDayText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  presetDayTextActive: {
    color: '#00B894',
    fontWeight: '800',
  },
  optionalTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  optionalTagText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  uploadedDocName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  uploadedDocSize: {
    fontSize: 10.5,
    color: '#14B8A6',
  },
  uploadDropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  uploadDropzoneTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  uploadDropzoneSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },

  // REVIEW CARD
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
    width: 110,
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

  // SUCCESS BOX
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
  successPricingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginTop: 12,
  },
  successPricingPillText: {
    fontSize: 12,
    color: '#065F46',
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backToHomeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },

  // MY REQUESTS VIEW
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'default' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  newRequestBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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

  // COMPACT 7-STAGE STATUS STEPPER
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
    backgroundColor: '#1E3A8A',
    borderWidth: 2,
    borderColor: '#BAE6FD',
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

  // PAYMENT ACTION BANNER
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  payNowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // DETAILS VIEW
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
    backgroundColor: '#00B894',
  },
  detailStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailStatusDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  timelineList: {
    marginTop: 8,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBulletPast: {
    backgroundColor: '#00B894',
  },
  timelineBulletCurrent: {
    backgroundColor: '#1E3A8A',
  },
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
    paddingLeft: 8,
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
  timelineStageDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
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

  // CALENDAR STYLES
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 6,
  },
  calNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  calNavBtnDisabled: {
    opacity: 0.35,
  },
  calMonthYearBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calMonthYearText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  calWeekdaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
    marginBottom: 2,
  },
  calWeekdayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calWeekdayText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 6,
    marginVertical: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  calDayCellSelected: {
    backgroundColor: '#00B894',
  },
  calDayCellToday: {
    borderWidth: 1,
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  calDayText: {
    fontSize: 11.5,
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
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#00B894',
  },

  // MODALS
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
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
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  modalListItemSelected: {
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
  },
  modalListItemText: {
    fontSize: 13.5,
    color: '#334155',
  },
  modalListItemTextSelected: {
    color: '#0D9488',
    fontWeight: '700',
  },
  modalPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  modalPresetChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00B894',
  },
  modalPresetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  modalPresetChipTextSelected: {
    color: '#00B894',
    fontWeight: '700',
  },
  enquiryInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#0F172A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  paymentBillCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },

  // Compact 4-Step Stepper Styles
  compactWorkflowBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
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
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    color: '#94A3B8',
    lineHeight: 13,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  rejectConfirmBtnDisabled: {
    backgroundColor: '#FCA5A5',
  },
  rejectConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // FLOATING IN-APP TOAST
  floatingToastWrap: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    maxWidth: 420,
    alignSelf: 'center',
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
});

const NurseBookingScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  return !isDesktopLayout(width) ? (
    <NurseBookingScreenMobile {...props} />
  ) : (
    <NurseBookingScreen {...props} />
  );
};

export default NurseBookingScreenResponsive;
