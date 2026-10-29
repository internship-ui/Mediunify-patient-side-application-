import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../theme/colors';
import { showAlert } from '../../../utils/alert';
import WebFooter from '../../../components/web/WebFooter';
import {
  popularServices,
  ayurvedaCentres,
  initialAyurvedaAppointments,
  initialCallbackRequests,
  mockAyurvedaNotifications,
} from '../../../data/ayurvedaData';
import {
  getSlotStatus,
  validateAndBookSlot,
  cancelBookedSlot,
  subscribeToSlotChanges,
} from '../../../services/slotBookingService';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';

const ASYNC_KEY_BOOKINGS = '@unnathi_ayurveda_bookings';
const ASYNC_KEY_REQUESTS = '@unnathi_ayurveda_callback_requests';

const AyurvedaWellnessScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktopWeb = Platform.OS === 'web' && (desktopSiteMode || width >= 992);
  const isTablet = !desktopSiteMode && (width >= 768 && width < 992);
  const { t, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);

  // Root Navigation View: 'DISCOVERY' | 'DETAILS' | 'APPOINTMENTS' | 'REQUESTS'
  const [activeView, setActiveView] = useState('DISCOVERY');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(route?.params?.search || route?.params?.query || '');
  const [selectedPopularService, setSelectedPopularService] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    if (route?.params?.query !== undefined) {
      setSearchQuery(route.params.query);
    } else if (route?.params?.search !== undefined) {
      setSearchQuery(route.params.search);
    }
  }, [route?.params?.query, route?.params?.search]);

  // Filters
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterService, setFilterService] = useState('All');
  const [filterConsultation, setFilterConsultation] = useState('All');
  const [filterTherapy, setFilterTherapy] = useState('All');
  const [filterPriceRange, setFilterPriceRange] = useState('All');
  const [filterRating, setFilterRating] = useState('All');

  // Centre Details State
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [detailsTab, setDetailsTab] = useState('about'); // 'about' | 'services' | 'therapies' | 'practitioners' | 'pricing' | 'location'
  const [selectedPractitionerModal, setSelectedPractitionerModal] = useState(null);

  // Dynamic Date Generator for Ayurveda
  const generateAyurvedaDates = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const list = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dayName = days[d.getDay()];
      const dayNum = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let label = `${dayName}, ${dayNum} ${month}`;
      let date = `${dayName}, ${dayNum} ${month} ${year}`;
      if (i === 0) {
        label = 'Today';
        date = `Today, ${dayNum} ${month} ${year}`;
      } else if (i === 1) {
        label = 'Tomorrow';
        date = `Tomorrow, ${dayNum} ${month} ${year}`;
      }
      list.push({ label, date });
    }
    return list;
  };

  // Direct Booking State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingCentre, setBookingCentre] = useState(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: Service, 2: Practitioner, 3: Date, 4: Time, 5: Summary, 6: Confirmation
  const [bookingService, setBookingService] = useState(null);
  const [bookingPractitioner, setBookingPractitioner] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => generateAyurvedaDates()[1]?.date || 'Tomorrow');
  const [bookingTime, setBookingTime] = useState('11:00 AM');

  // Real-time slot update ticker
  const [slotTick, setSlotTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeToSlotChanges(() => {
      setSlotTick((t) => t + 1);
    });
    return unsub;
  }, []);

  const getFirstAvailableSlot = (dateStr, centreId, preferred = null) => {
    if (preferred) {
      const prefSt = getSlotStatus({
        date: dateStr,
        time: preferred,
        serviceType: 'ayurveda',
        providerId: centreId,
      });
      if (prefSt.available) return preferred;
    }
    for (const s of TIME_SLOTS) {
      const st = getSlotStatus({
        date: dateStr,
        time: s.label,
        serviceType: 'ayurveda',
        providerId: centreId,
      });
      if (st.available) return s.label;
    }
    return '';
  };

  useEffect(() => {
    if (isBookingModalOpen && bookingDate) {
      const currentSt = getSlotStatus({
        date: bookingDate,
        time: bookingTime,
        serviceType: 'ayurveda',
        providerId: bookingCentre?.id,
      });
      if (!currentSt.available) {
        const nextSlot = getFirstAvailableSlot(bookingDate, bookingCentre?.id);
        setBookingTime(nextSlot);
      }
    }
  }, [bookingDate, isBookingModalOpen, slotTick, bookingCentre]);

  const [patientName, setPatientName] = useState('Ramesh Kumar (Self)');
  const [patientPhone, setPatientPhone] = useState('+91 98450 12345');
  const [patientHealthNote, setPatientHealthNote] = useState('Seeking Ayurvedic consultation for joint stiffness and stress');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Callback Flow State
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
  const [callbackCentre, setCallbackCentre] = useState(null);
  const [cbPatientName, setCbPatientName] = useState('Ramesh Kumar');
  const [cbMobileNumber, setCbMobileNumber] = useState('+91 98450 12345');
  const [cbService, setCbService] = useState('');
  const [cbDate, setCbDate] = useState(() => generateAyurvedaDates()[2]?.date || 'In 2 Days');
  const [cbTime, setCbTime] = useState('Morning (9:00 AM - 12:00 PM)');
  const [cbMessage, setCbMessage] = useState('Please share available dates and doctor slot details.');
  const [cbErrors, setCbErrors] = useState({});
  const [confirmedCallback, setConfirmedCallback] = useState(null);

  // Appointments & Requests Data State
  const [appointments, setAppointments] = useState(initialAyurvedaAppointments);
  const [appointmentTab, setAppointmentTab] = useState('Upcoming'); // 'Upcoming' | 'Completed' | 'Cancelled'
  const [selectedApptDetail, setSelectedApptDetail] = useState(null);

  const [callbackRequests, setCallbackRequests] = useState(initialCallbackRequests);
  const [requestStatusFilter, setRequestStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Contacted' | 'Confirmed' | 'Closed'
  const [selectedReqDetail, setSelectedReqDetail] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState(mockAyurvedaNotifications);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  // Info Modals (Directions / Contact)
  const [directionsModalCentre, setDirectionsModalCentre] = useState(null);
  const [contactModalCentre, setContactModalCentre] = useState(null);

  // Available dates for booking
  const AVAILABLE_DATES = useMemo(() => generateAyurvedaDates(), []);

  // Available time slots
  const TIME_SLOTS = [
    { label: '09:30 AM', period: 'Morning' },
    { label: '10:30 AM', period: 'Morning' },
    { label: '11:30 AM', period: 'Morning' },
    { label: '03:30 PM', period: 'Afternoon' },
    { label: '04:30 PM', period: 'Evening' },
    { label: '05:30 PM', period: 'Evening' },
    { label: '06:30 PM', period: 'Evening' },
  ];

  // Load persisted appointments and callback requests from AsyncStorage
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedBookings = await AsyncStorage.getItem(ASYNC_KEY_BOOKINGS);
        if (storedBookings) {
          const parsed = JSON.parse(storedBookings);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // merge with mock initial without duplicating IDs
            const merged = [...parsed];
            initialAyurvedaAppointments.forEach((mockItem) => {
              if (!merged.some((item) => item.id === mockItem.id)) {
                merged.push(mockItem);
              }
            });
            setAppointments(merged);
          }
        }

        const storedRequests = await AsyncStorage.getItem(ASYNC_KEY_REQUESTS);
        if (storedRequests) {
          const parsedReq = JSON.parse(storedRequests);
          if (Array.isArray(parsedReq) && parsedReq.length > 0) {
            const mergedReq = [...parsedReq];
            initialCallbackRequests.forEach((mockReq) => {
              if (!mergedReq.some((item) => item.id === mockReq.id)) {
                mergedReq.push(mockReq);
              }
            });
            setCallbackRequests(mergedReq);
          }
        }
      } catch (err) {
        console.log('Error loading local Ayurveda data:', err);
      }
    };
    loadStoredData();
  }, []);

  // Save changes to AsyncStorage helper
  const saveBookingsToStorage = async (newList) => {
    try {
      await AsyncStorage.setItem(ASYNC_KEY_BOOKINGS, JSON.stringify(newList));
    } catch (e) {
      console.log('Error saving bookings:', e);
    }
  };

  const saveRequestsToStorage = async (newList) => {
    try {
      await AsyncStorage.setItem(ASYNC_KEY_REQUESTS, JSON.stringify(newList));
    } catch (e) {
      console.log('Error saving requests:', e);
    }
  };

  // Filter count helper
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterLocation !== 'All') count++;
    if (filterService !== 'All') count++;
    if (filterConsultation !== 'All') count++;
    if (filterTherapy !== 'All') count++;
    if (filterPriceRange !== 'All') count++;
    if (filterRating !== 'All') count++;
    if (selectedPopularService) count++;
    return count;
  }, [
    filterLocation,
    filterService,
    filterConsultation,
    filterTherapy,
    filterPriceRange,
    filterRating,
    selectedPopularService,
  ]);

  // Main Filtering Logic
  const filteredCentres = useMemo(() => {
    return ayurvedaCentres.filter((centre) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = centre.name.toLowerCase().includes(q);
        const matchesLocation =
          centre.location.toLowerCase().includes(q) || centre.city.toLowerCase().includes(q);
        const matchesService = centre.mainServices.some((s) => s.toLowerCase().includes(q));
        const matchesDetailedService = centre.services?.some(
          (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
        );
        const matchesTherapy = centre.therapies?.some((t) => t.name.toLowerCase().includes(q));
        const matchesDoctor = centre.practitioners?.some((p) => p.name.toLowerCase().includes(q));

        if (
          !matchesName &&
          !matchesLocation &&
          !matchesService &&
          !matchesDetailedService &&
          !matchesTherapy &&
          !matchesDoctor
        ) {
          return false;
        }
      }

      // 2. Popular Service Selection
      if (selectedPopularService) {
        const matchesPopular =
          centre.mainServices.some(
            (s) => s.toLowerCase() === selectedPopularService.toLowerCase()
          ) ||
          centre.services?.some(
            (s) =>
              s.category.toLowerCase().includes(selectedPopularService.toLowerCase()) ||
              s.name.toLowerCase().includes(selectedPopularService.toLowerCase())
          );
        if (!matchesPopular) return false;
      }

      // 3. Location Filter
      if (filterLocation !== 'All') {
        if (centre.city.toLowerCase() !== filterLocation.toLowerCase()) {
          return false;
        }
      }

      // 4. Specific Service Filter
      if (filterService !== 'All') {
        const matchesSrv =
          centre.mainServices.includes(filterService) ||
          centre.services?.some((s) => s.category.includes(filterService));
        if (!matchesSrv) return false;
      }

      // 5. Consultation Available
      if (filterConsultation === 'Available Only' && !centre.consultationAvailable) {
        return false;
      }

      // 6. Therapy Available
      if (filterTherapy === 'Available Only' && (!centre.therapies || centre.therapies.length === 0)) {
        return false;
      }

      // 7. Price Range
      if (filterPriceRange === 'Under ₹500') {
        if (centre.priceRange !== 'low') return false;
      } else if (filterPriceRange === '₹500 - ₹1,500') {
        if (centre.priceRange !== 'mid') return false;
      } else if (filterPriceRange === 'Above ₹1,500') {
        if (centre.priceRange !== 'high') return false;
      }

      // 8. Rating Filter
      if (filterRating === '4.8+ Only' && centre.rating < 4.8) {
        return false;
      } else if (filterRating === '4.5+ Only' && centre.rating < 4.5) {
        return false;
      }

      return true;
    });
  }, [
    searchQuery,
    selectedPopularService,
    filterLocation,
    filterService,
    filterConsultation,
    filterTherapy,
    filterPriceRange,
    filterRating,
  ]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedPopularService(null);
    setFilterLocation('All');
    setFilterService('All');
    setFilterConsultation('All');
    setFilterTherapy('All');
    setFilterPriceRange('All');
    setFilterRating('All');
  };

  // Open Centre Details
  const handleOpenCentre = (centre) => {
    setSelectedCentre(centre);
    setDetailsTab('about');
    setActiveView('DETAILS');
  };

  // Open Direct Booking Modal
  const handleOpenBooking = (centre, preselectedService = null) => {
    setBookingCentre(centre);
    setBookingService(preselectedService || (centre.services && centre.services[0]) || null);
    setBookingPractitioner((centre.practitioners && centre.practitioners[0]) || null);
    const chosenDate = AVAILABLE_DATES[1]?.date || AVAILABLE_DATES[0]?.date;
    setBookingDate(chosenDate);
    const validSlot = getFirstAvailableSlot(chosenDate, centre.id, '11:00 AM');
    setBookingTime(validSlot);
    setBookingStep(1);
    setConfirmedBooking(null);
    setIsBookingModalOpen(true);
  };

  // Confirm Direct Booking
  const handleConfirmDirectBooking = async () => {
    if (!patientName.trim() || !patientPhone.trim()) {
      showAlert('Required', 'Please enter your name and phone number.');
      return;
    }

    const slotValidation = await validateAndBookSlot({
      date: bookingDate,
      time: bookingTime,
      serviceType: 'ayurveda',
      providerId: bookingCentre?.id || bookingCentre?.name,
      bookingDetails: {
        centreName: bookingCentre?.name,
        serviceName: bookingService?.name,
        patientName,
      },
    });

    if (!slotValidation.success) {
      showAlert('Slot Unavailable', slotValidation.message || 'This slot is no longer available. Please select another time.');
      return;
    }

    const tokenNumber = `AYU-${Math.floor(100 + Math.random() * 900)}`;
    const newBooking = {
      id: `ayu-appt-${Date.now()}`,
      tokenNumber,
      centreId: bookingCentre.id,
      centreName: bookingCentre.name,
      service: bookingService?.name || 'Ayurvedic Consultation',
      practitioner: bookingPractitioner?.name || 'Senior Consultant Vaidya',
      date: bookingDate,
      time: bookingTime,
      fee: bookingService?.price || bookingCentre.startingPrice || '₹400',
      paidAmount: bookingService?.priceNumber || 400,
      status: 'Upcoming',
      location: bookingCentre.location,
      fullAddress: bookingCentre.address,
      patientName,
      patientPhone,
      serviceType: 'ayurveda',
      bookingDate: 'Just now',
      notes: patientHealthNote || 'Ayurveda consultation',
    };

    const updated = [newBooking, ...appointments];
    setAppointments(updated);
    saveBookingsToStorage(updated);
    setConfirmedBooking(newBooking);
    setBookingStep(6); // Step 6 = Confirmation Screen

    // Add mock notification
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: 'Appointment Confirmed',
      message: `Your booking for ${newBooking.service} at ${bookingCentre.name} on ${bookingDate} at ${bookingTime} is confirmed.`,
      time: 'Just now',
      read: false,
      type: 'confirmation',
      token: tokenNumber,
    };
    setNotifications([newNotif, ...notifications]);
  };

  // Open Callback Request Modal
  const handleOpenCallback = (centre, preselectedService = null) => {
    setCallbackCentre(centre);
    setCbService(preselectedService?.name || (centre.services && centre.services[0]?.name) || 'Ayurveda Consultation & Wellness Package');
    setCbPatientName('Ramesh Kumar');
    setCbMobileNumber('+91 98450 12345');
    setCbDate(AVAILABLE_DATES[2]?.date || 'In 2 Days');
    setCbTime('Morning (9:00 AM - 12:00 PM)');
    setCbMessage('Please contact me with consultation details and treatment availability.');
    setCbErrors({});
    setConfirmedCallback(null);
    setIsCallbackModalOpen(true);
  };

  // Submit Callback Request with Validation
  const handleSubmitCallback = () => {
    const errors = {};
    if (!cbPatientName.trim() || cbPatientName.trim().length < 2) {
      errors.name = 'Please enter a valid full name.';
    }
    const cleanPhone = cbMobileNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = 'Please provide a valid 10-digit mobile number.';
    }
    if (!cbService.trim()) {
      errors.service = 'Please select or enter the service of interest.';
    }

    if (Object.keys(errors).length > 0) {
      setCbErrors(errors);
      return;
    }

    const requestId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest = {
      id: `req-cb-${Date.now()}`,
      centreId: callbackCentre.id,
      centreName: callbackCentre.name,
      service: cbService,
      requestDate: AVAILABLE_DATES[0]?.date || 'Today',
      preferredDate: cbDate,
      preferredTime: cbTime,
      patientName: cbPatientName,
      mobileNumber: cbMobileNumber,
      status: 'Pending',
      notes: cbMessage,
      lastUpdated: 'Just now - Request submitted to Centre care desk',
    };

    const updated = [newRequest, ...callbackRequests];
    setCallbackRequests(updated);
    saveRequestsToStorage(updated);
    setConfirmedCallback(newRequest);

    // Add mock notification
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: 'Callback Request Submitted',
      message: `Your enquiry for ${cbService} has been sent to ${callbackCentre.name}. Their team will contact you shortly.`,
      time: 'Just now',
      read: false,
      type: 'request_sent',
    };
    setNotifications([newNotif, ...notifications]);
  };

  // Unread notifications count
  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAllNotifsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
  };

  // Cancel an appointment
  const handleCancelAppointment = (apptId) => {
    const toCancel = appointments.find((a) => a.id === apptId);
    if (toCancel) {
      cancelBookedSlot({
        date: toCancel.date,
        time: toCancel.time,
        serviceType: 'ayurveda',
        providerId: toCancel.centreId || toCancel.centreName,
      });
    }

    const updated = appointments.map((a) => {
      if (a.id === apptId) {
        return { ...a, status: 'Cancelled' };
      }
      return a;
    });
    setAppointments(updated);
    saveBookingsToStorage(updated);
    setSelectedApptDetail(null);
    showAlert('Appointment Cancelled', 'Your Ayurveda appointment has been marked as cancelled.');
  };

  // ==========================================
  // RENDER: NOTIFICATIONS MODAL
  // ==========================================
  const renderNotificationsModal = () => (
    <Modal
      visible={isNotifModalOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setIsNotifModalOpen(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheetBox, isDesktopWeb && styles.desktopModalSheet]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.notifHeaderBadge}>
                <Ionicons name="notifications" size={18} color="#059669" />
              </View>
              <Text style={styles.modalSheetTitle}>Ayurveda Notifications</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {unreadNotifCount > 0 && (
                <TouchableOpacity onPress={markAllNotifsRead} style={styles.markReadBtn}>
                  <Text style={styles.markReadBtnText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setIsNotifModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {notifications.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.notifItemCard,
                  !item.read && styles.notifItemUnread,
                ]}
              >
                <View style={styles.notifIconCircle}>
                  <Ionicons
                    name={
                      item.type === 'confirmation'
                        ? 'checkmark-circle'
                        : item.type === 'reminder'
                        ? 'alarm'
                        : item.type === 'callback_update'
                        ? 'call'
                        : 'information-circle'
                    }
                    size={20}
                    color="#059669"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.notifMessage}>{item.message}</Text>
                  {item.token && (
                    <View style={styles.notifTokenChip}>
                      <Text style={styles.notifTokenText}>Token: {item.token}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalBottomCloseBtn}
            onPress={() => setIsNotifModalOpen(false)}
          >
            <Text style={styles.modalBottomCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // RENDER: FILTER MODAL / BOTTOM SHEET
  // ==========================================
  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsFilterModalOpen(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.filterSheetBox, isDesktopWeb && styles.desktopFilterBox]}>
          <View style={styles.modalSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="options-outline" size={20} color="#059669" style={{ marginRight: 8 }} />
              <Text style={styles.modalSheetTitle}>{t('Filter Ayurveda Centres')}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
              <Ionicons name="close" size={24} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
            {/* 1. Location */}
            <Text style={styles.filterSectionTitle}>{t('Location / City')}</Text>
            <View style={styles.filterChipRow}>
              {['All', 'Mysuru', 'Bengaluru'].map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.filterChip,
                    filterLocation === city && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterLocation(city)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterLocation === city && styles.filterChipTextActive,
                    ]}
                  >
                    {city === 'All' ? t('All Locations') : `${city}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2. Services */}
            <Text style={styles.filterSectionTitle}>{t('Main Services')}</Text>
            <View style={styles.filterChipRow}>
              {[
                'All',
                'Ayurveda Consultation',
                'Panchakarma',
                'Ayurvedic Therapies',
                'Yoga & Wellness',
                'Nutrition & Lifestyle',
                'Wellness Programs',
              ].map((srv) => (
                <TouchableOpacity
                  key={srv}
                  style={[
                    styles.filterChip,
                    filterService === srv && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterService(srv)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterService === srv && styles.filterChipTextActive,
                    ]}
                  >
                    {srv === 'All' ? t('All') : t(srv)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Consultation Available */}
            <Text style={styles.filterSectionTitle}>{t('Consultation Available')}</Text>
            <View style={styles.filterChipRow}>
              {['All', 'Available Only'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.filterChip,
                    filterConsultation === opt && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterConsultation(opt)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterConsultation === opt && styles.filterChipTextActive,
                    ]}
                  >
                    {opt === 'All' ? t('All Centres') : t('Doctor Consultation Available')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 4. Therapy Available */}
            <Text style={styles.filterSectionTitle}>{t('Therapies Available')}</Text>
            <View style={styles.filterChipRow}>
              {['All', 'Available Only'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.filterChip,
                    filterTherapy === opt && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterTherapy(opt)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterTherapy === opt && styles.filterChipTextActive,
                    ]}
                  >
                    {opt === 'All' ? t('All') : t('Therapies Offered')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Price Range */}
            <Text style={styles.filterSectionTitle}>{t('Starting Price Range')}</Text>
            <View style={styles.filterChipRow}>
              {['All', 'Under ₹500', '₹500 - ₹1,500', 'Above ₹1,500'].map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.filterChip,
                    filterPriceRange === range && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterPriceRange(range)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterPriceRange === range && styles.filterChipTextActive,
                    ]}
                  >
                    {range === 'All' ? t('All') : range}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 6. Rating */}
            <Text style={styles.filterSectionTitle}>{t('Minimum Rating')}</Text>
            <View style={styles.filterChipRow}>
              {['All', '4.5+ Only', '4.8+ Only'].map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.filterChip,
                    filterRating === rate && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterRating(rate)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterRating === rate && styles.filterChipTextActive,
                    ]}
                  >
                    {rate === 'All' ? t('All Ratings') : `${rate}/5`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Filter Footer */}
          <View style={styles.filterFooterRow}>
            <TouchableOpacity style={styles.filterClearBtn} onPress={clearAllFilters}>
              <Text style={styles.filterClearBtnText}>{t('Clear All')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyBtn}
              onPress={() => setIsFilterModalOpen(false)}
            >
              <Text style={styles.filterApplyBtnText}>{t('Apply Filters')} ({activeFiltersCount})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // RENDER: PRACTITIONER BIO MODAL
  // ==========================================
  const renderPractitionerModal = () => {
    if (!selectedPractitionerModal) return null;
    const doc = selectedPractitionerModal;
    return (
      <Modal
        visible={!!selectedPractitionerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPractitionerModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetBox, isDesktopWeb && styles.desktopModalSheet]}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Practitioner Profile</Text>
              <TouchableOpacity onPress={() => setSelectedPractitionerModal(null)}>
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.docModalTopRow}>
                <Image source={{ uri: doc.profileImage }} style={styles.docModalImage} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.docModalName}>{doc.name}</Text>
                  <Text style={styles.docModalRole}>{doc.role}</Text>
                  <Text style={styles.docModalQual}>{doc.qualification}</Text>
                  <View style={styles.docBadgeRow}>
                    <View style={styles.docExpBadge}>
                      <Ionicons name="ribbon-outline" size={12} color="#059669" />
                      <Text style={styles.docExpBadgeText}>{doc.experience}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.docInfoSection}>
                <Text style={styles.docInfoLabel}>Specialization</Text>
                <Text style={styles.docInfoVal}>{doc.specialization}</Text>
              </View>

              <View style={styles.docInfoSection}>
                <Text style={styles.docInfoLabel}>Languages Spoken</Text>
                <Text style={styles.docInfoVal}>{doc.languages}</Text>
              </View>

              <View style={styles.docInfoSection}>
                <Text style={styles.docInfoLabel}>Availability Schedule</Text>
                <Text style={styles.docInfoVal}>{doc.availability}</Text>
              </View>

              <View style={styles.docInfoSection}>
                <Text style={styles.docInfoLabel}>Biography & Clinical Approach</Text>
                <Text style={styles.docInfoVal}>{doc.bio}</Text>
              </View>

              <View style={styles.docFeeHighlight}>
                <Text style={styles.docFeeHighlightLabel}>Consultation Fee</Text>
                <Text style={styles.docFeeHighlightVal}>₹{doc.consultationFee}</Text>
              </View>

              {/* Service Provider Disclosure */}
              <View style={styles.disclosureCard}>
                <Ionicons name="information-circle-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.disclosureTextSmall}>
                  Practitioner provides clinical services on behalf of {selectedCentre?.name || 'the respective centre'}. MediUnify facilitates coordination and appointment management.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedPractitionerModal(null)}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  const centre = selectedCentre;
                  setSelectedPractitionerModal(null);
                  if (centre?.directBooking) {
                    handleOpenBooking(centre);
                  } else {
                    handleOpenCallback(centre);
                  }
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  {selectedCentre?.directBooking ? 'Book with Doctor' : 'Request Callback'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================
  // RENDER: DIRECT BOOKING FLOW MODAL
  // ==========================================
  const renderDirectBookingModal = () => {
    if (!bookingCentre) return null;

    return (
      <Modal
        visible={isBookingModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBookingModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.bookingSheetBox, isDesktopWeb && styles.desktopBookingBox]}>
            {/* Header */}
            <View style={styles.modalSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSheetTitle}>
                  {bookingStep === 6 ? 'Booking Confirmed' : 'Book Appointment'}
                </Text>
                <Text style={styles.modalSheetSub} numberOfLines={1}>
                  {bookingCentre.name}
                </Text>
              </View>
              {bookingStep !== 6 && (
                <TouchableOpacity onPress={() => setIsBookingModalOpen(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </TouchableOpacity>
              )}
            </View>

            {/* Stepper Progress Bar (Steps 1 to 5) */}
            {bookingStep < 6 && (
              <View style={styles.stepperContainer}>
                {['Service', 'Doctor', 'Date', 'Time', 'Review'].map((stepName, idx) => {
                  const stepNum = idx + 1;
                  const isDone = bookingStep > stepNum;
                  const isCurrent = bookingStep === stepNum;
                  return (
                    <View key={stepName} style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepBadge,
                          isDone && styles.stepBadgeDone,
                          isCurrent && styles.stepBadgeCurrent,
                        ]}
                      >
                        {isDone ? (
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        ) : (
                          <Text
                            style={[
                              styles.stepBadgeText,
                              isCurrent && styles.stepBadgeTextCurrent,
                            ]}
                          >
                            {stepNum}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepNameText,
                          isCurrent && styles.stepNameTextCurrent,
                        ]}
                      >
                        {stepName}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <ScrollView style={styles.bookingScrollArea} showsVerticalScrollIndicator={false}>
              {/* STEP 1: Select Service */}
              {bookingStep === 1 && (
                <View>
                  <Text style={styles.stepHeaderTitle}>1. Select Desired Service</Text>
                  <Text style={styles.stepHeaderSub}>
                    Choose from available consultations and therapies at this centre:
                  </Text>
                  {bookingCentre.services?.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.selectOptionCard,
                        bookingService?.id === item.id && styles.selectOptionCardActive,
                      ]}
                      onPress={() => setBookingService(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.selectOptionTitle}>{item.name}</Text>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{item.category}</Text>
                          </View>
                        </View>
                        <Text style={styles.selectOptionDesc}>{item.description}</Text>
                        <View style={styles.selectOptionMetaRow}>
                          <Text style={styles.selectOptionDuration}>{item.duration}</Text>
                          <Text style={styles.selectOptionPrice}>{item.price}</Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          bookingService?.id === item.id && styles.radioCircleActive,
                        ]}
                      >
                        {bookingService?.id === item.id && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* STEP 2: Select Practitioner */}
              {bookingStep === 2 && (
                <View>
                  <Text style={styles.stepHeaderTitle}>2. Choose Ayurvedic Vaidya</Text>
                  <Text style={styles.stepHeaderSub}>
                    Select an expert practitioner for your appointment:
                  </Text>
                  {bookingCentre.practitioners?.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.selectOptionCard,
                        bookingPractitioner?.id === doc.id && styles.selectOptionCardActive,
                      ]}
                      onPress={() => setBookingPractitioner(doc)}
                    >
                      <Image source={{ uri: doc.profileImage }} style={styles.docSelectImage} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.selectOptionTitle}>{doc.name}</Text>
                        <Text style={styles.docSelectRole}>{doc.role}</Text>
                        <Text style={styles.docSelectExp}>
                          {doc.qualification} • {doc.experience}
                        </Text>
                        <Text style={styles.docSelectFee}>Fee: ₹{doc.consultationFee}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          bookingPractitioner?.id === doc.id && styles.radioCircleActive,
                        ]}
                      >
                        {bookingPractitioner?.id === doc.id && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* STEP 3: Select Date */}
              {bookingStep === 3 && (
                <View>
                  <Text style={styles.stepHeaderTitle}>3. Choose Appointment Date</Text>
                  <Text style={styles.stepHeaderSub}>
                    Select your preferred day for the visit:
                  </Text>
                  <View style={styles.datePickerGrid}>
                    {AVAILABLE_DATES.map((item) => (
                      <TouchableOpacity
                        key={item.date}
                        style={[
                          styles.dateCard,
                          bookingDate === item.date && styles.dateCardActive,
                        ]}
                        onPress={() => setBookingDate(item.date)}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color={bookingDate === item.date ? '#FFFFFF' : '#059669'}
                        />
                        <Text
                          style={[
                            styles.dateCardLabel,
                            bookingDate === item.date && styles.dateCardTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.dateCardSub,
                            bookingDate === item.date && styles.dateCardTextActive,
                          ]}
                        >
                          {item.date.split(',')[1] || item.date}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* STEP 4: Select Time */}
              {bookingStep === 4 && (
                <View>
                  <Text style={styles.stepHeaderTitle}>4. Select Time Slot</Text>
                  <Text style={styles.stepHeaderSub}>
                    Selected Date: <Text style={{ fontWeight: '700' }}>{bookingDate}</Text>
                  </Text>
                  <View style={styles.timeSlotGrid}>
                    {TIME_SLOTS.map((slot) => {
                      const status = getSlotStatus({
                        date: bookingDate,
                        time: slot.label,
                        serviceType: 'ayurveda',
                        providerId: bookingCentre?.id,
                      });
                      const isAvailable = status.available;
                      const isSelected = bookingTime === slot.label;
                      return (
                        <TouchableOpacity
                          key={slot.label}
                          style={[
                            styles.timeSlotCard,
                            isSelected && styles.timeSlotCardActive,
                            !isAvailable && styles.timeSlotCardDisabled,
                          ]}
                          disabled={!isAvailable}
                          onPress={() => setBookingTime(slot.label)}
                        >
                          <Text
                            style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextActive,
                              !isAvailable && styles.timeSlotTextDisabled,
                            ]}
                          >
                            {slot.label}
                          </Text>
                          <Text
                            style={[
                              styles.timeSlotPeriod,
                              isSelected && styles.timeSlotTextActive,
                              !isAvailable && styles.timeSlotTextDisabled,
                            ]}
                          >
                            {slot.period}
                          </Text>
                          {!isAvailable && (
                            <View style={styles.slotStatusBadge}>
                              <Text style={styles.slotStatusBadgeText}>
                                {status.status === 'PASSED' ? 'Passed' : 'Booked'}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* STEP 5: Patient Details & Summary */}
              {bookingStep === 5 && (
                <View>
                  <Text style={styles.stepHeaderTitle}>5. Review & Confirm Booking</Text>
                  <Text style={styles.stepHeaderSub}>
                    Verify appointment details and enter patient information:
                  </Text>

                  {/* Summary Box */}
                  <View style={styles.bookingSummaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Centre</Text>
                      <Text style={styles.summaryValue}>{bookingCentre.name}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Service</Text>
                      <Text style={styles.summaryValue}>{bookingService?.name || 'Ayurveda Consultation'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Practitioner</Text>
                      <Text style={styles.summaryValue}>{bookingPractitioner?.name || 'Chief Vaidya'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Schedule</Text>
                      <Text style={styles.summaryValue}>{bookingDate} at {bookingTime}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Centre Location</Text>
                      <Text style={styles.summaryValue}>{bookingCentre.location}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                      <Text style={styles.summaryTotalLabel}>Payable Fee</Text>
                      <Text style={styles.summaryTotalValue}>
                        {bookingService?.price || `₹${bookingPractitioner?.consultationFee || 400}`}
                      </Text>
                    </View>
                  </View>

                  {/* Form Inputs */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Patient Full Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={patientName}
                      onChangeText={setPatientName}
                      placeholder="e.g. Ramesh Kumar"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mobile Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={patientPhone}
                      onChangeText={setPatientPhone}
                      placeholder="+91 98450 XXXXX"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Health Concern / Symptoms (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, { height: 64, textAlignVertical: 'top' }]}
                      value={patientHealthNote}
                      onChangeText={setPatientHealthNote}
                      placeholder="e.g. Chronic back ache, sleep issues..."
                      placeholderTextColor="#94A3B8"
                      multiline={true}
                    />
                  </View>

                  {/* Disclosure */}
                  <View style={styles.disclosureCard}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.disclosureTextSmall}>
                      Service provided by {bookingCentre.name}. MediUnify is a discovery, enquiry, booking and coordination platform. Ayurveda and wellness services are provided by the respective centre.
                    </Text>
                  </View>
                </View>
              )}

              {/* STEP 6: Confirmation Screen */}
              {bookingStep === 6 && confirmedBooking && (
                <View style={styles.confirmationContainer}>
                  <View style={styles.confirmedIconCircle}>
                    <Ionicons name="checkmark-circle" size={60} color="#059669" />
                  </View>
                  <Text style={styles.confirmedTitle}>Appointment Confirmed</Text>
                  <Text style={styles.confirmedSubtitle}>
                    Your appointment has been successfully scheduled with the centre.
                  </Text>

                  <View style={styles.confirmedCard}>
                    <View style={styles.confirmedTokenRow}>
                      <Text style={styles.confirmedTokenLabel}>Token Number</Text>
                      <Text style={styles.confirmedTokenVal}>{confirmedBooking.tokenNumber}</Text>
                    </View>
                    <View style={styles.confirmedDivider} />

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="business-outline" size={16} color="#059669" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Centre: </Text>
                        {confirmedBooking.centreName}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="leaf-outline" size={16} color="#059669" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Service: </Text>
                        {confirmedBooking.service}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="person-outline" size={16} color="#059669" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Practitioner: </Text>
                        {confirmedBooking.practitioner}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#059669" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Date & Time: </Text>
                        {confirmedBooking.date} at {confirmedBooking.time}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="cash-outline" size={16} color="#059669" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Consultation Fee: </Text>
                        {confirmedBooking.fee}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="location-outline" size={16} color="#059669" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Location: </Text>
                        {confirmedBooking.fullAddress}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="checkmark-done-circle-outline" size={16} color="#059669" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Status: </Text>
                        <Text style={{ color: '#059669', fontWeight: '700' }}>Confirmed</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Disclosure */}
                  <View style={[styles.disclosureCard, { marginTop: 14 }]}>
                    <Text style={styles.disclosureTextSmall}>
                      Service provided by {confirmedBooking.centreName}. MediUnify is a discovery, enquiry, booking and coordination platform. Ayurveda and wellness services are provided by the respective centre.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Stepper Navigation Buttons */}
            {bookingStep < 6 ? (
              <View style={styles.modalActionsRow}>
                {bookingStep > 1 ? (
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setBookingStep(bookingStep - 1)}
                  >
                    <Text style={styles.modalCancelBtnText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setIsBookingModalOpen(false)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                {bookingStep < 5 ? (
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => setBookingStep(bookingStep + 1)}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Continue</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={handleConfirmDirectBooking}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Confirm Appointment</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setIsBookingModalOpen(false);
                    setActiveView('DISCOVERY');
                  }}
                >
                  <Text style={styles.modalCancelBtnText}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setIsBookingModalOpen(false);
                    setActiveView('APPOINTMENTS');
                    setAppointmentTab('Upcoming');
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>View My Appointments</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================
  // RENDER: REQUEST CALLBACK FLOW MODAL
  // ==========================================
  const renderCallbackModal = () => {
    if (!callbackCentre) return null;

    return (
      <Modal
        visible={isCallbackModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCallbackModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.bookingSheetBox, isDesktopWeb && styles.desktopBookingBox]}>
            {/* Header */}
            <View style={styles.modalSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSheetTitle}>
                  {confirmedCallback ? 'Callback Request Submitted' : 'Request Callback'}
                </Text>
                <Text style={styles.modalSheetSub} numberOfLines={1}>
                  {callbackCentre.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCallbackModalOpen(false)}>
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bookingScrollArea} showsVerticalScrollIndicator={false}>
              {!confirmedCallback ? (
                <View>
                  <View style={styles.cbIntroBanner}>
                    <Ionicons name="call" size={20} color="#0284C7" style={{ marginRight: 8 }} />
                    <Text style={styles.cbIntroBannerText}>
                      This centre requires intake review. Submit your details below and their care coordinator will contact you to confirm the appointment.
                    </Text>
                  </View>

                  {/* Form Fields */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Patient Full Name *</Text>
                    <TextInput
                      style={[styles.textInput, cbErrors.name && styles.textInputError]}
                      value={cbPatientName}
                      onChangeText={(t) => {
                        setCbPatientName(t);
                        if (cbErrors.name) setCbErrors({ ...cbErrors, name: null });
                      }}
                      placeholder="e.g. Ramesh Kumar"
                      placeholderTextColor="#94A3B8"
                    />
                    {cbErrors.name && <Text style={styles.errorHint}>{cbErrors.name}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mobile Number *</Text>
                    <TextInput
                      style={[styles.textInput, cbErrors.phone && styles.textInputError]}
                      value={cbMobileNumber}
                      onChangeText={(t) => {
                        setCbMobileNumber(t);
                        if (cbErrors.phone) setCbErrors({ ...cbErrors, phone: null });
                      }}
                      placeholder="+91 98450 XXXXX"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                    />
                    {cbErrors.phone && <Text style={styles.errorHint}>{cbErrors.phone}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Service of Interest *</Text>
                    <TextInput
                      style={[styles.textInput, cbErrors.service && styles.textInputError]}
                      value={cbService}
                      onChangeText={(t) => {
                        setCbService(t);
                        if (cbErrors.service) setCbErrors({ ...cbErrors, service: null });
                      }}
                      placeholder="e.g. Panchakarma or Consultation"
                      placeholderTextColor="#94A3B8"
                    />
                    {cbErrors.service && <Text style={styles.errorHint}>{cbErrors.service}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Preferred Date</Text>
                    <View style={styles.filterChipRow}>
                      {[
                        AVAILABLE_DATES[1]?.label || 'Tomorrow',
                        AVAILABLE_DATES[2]?.date || 'In 2 Days',
                        AVAILABLE_DATES[3]?.date || 'In 3 Days',
                        'Next Week',
                      ].map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.filterChip, cbDate === d && styles.filterChipActive]}
                          onPress={() => setCbDate(d)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              cbDate === d && styles.filterChipTextActive,
                            ]}
                          >
                            {d}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Preferred Time for Call</Text>
                    <View style={styles.filterChipRow}>
                      {[
                        'Morning (9:00 AM - 12:00 PM)',
                        'Afternoon (12:00 PM - 4:00 PM)',
                        'Evening (4:00 PM - 7:00 PM)',
                      ].map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.filterChip, cbTime === t && styles.filterChipActive]}
                          onPress={() => setCbTime(t)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              cbTime === t && styles.filterChipTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Additional Message / Medical Concern</Text>
                    <TextInput
                      style={[styles.textInput, { height: 72, textAlignVertical: 'top' }]}
                      value={cbMessage}
                      onChangeText={setCbMessage}
                      placeholder="Mention any specific health concerns, past treatments, or queries..."
                      placeholderTextColor="#94A3B8"
                      multiline={true}
                    />
                  </View>

                  {/* Disclosure */}
                  <View style={styles.disclosureCard}>
                    <Ionicons name="information-circle-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.disclosureTextSmall}>
                      Service provided by {callbackCentre.name}. MediUnify is a discovery, enquiry, booking and coordination platform. Ayurveda and wellness services are provided by the respective centre.
                    </Text>
                  </View>
                </View>
              ) : (
                /* Confirmation view for callback */
                <View style={styles.confirmationContainer}>
                  <View style={[styles.confirmedIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="checkmark-circle" size={60} color="#0284C7" />
                  </View>
                  <Text style={styles.confirmedTitle}>Callback Request Submitted</Text>
                  <Text style={[styles.confirmedSubtitle, { color: '#0369A1', fontWeight: '600' }]}>
                    "The centre or MediUnify team will contact you to confirm the appointment."
                  </Text>

                  <View style={styles.confirmedCard}>
                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="business-outline" size={16} color="#0284C7" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Centre: </Text>
                        {confirmedCallback.centreName}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="leaf-outline" size={16} color="#0284C7" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Requested Service: </Text>
                        {confirmedCallback.service}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Preferred Date: </Text>
                        {confirmedCallback.preferredDate}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="time-outline" size={16} color="#0284C7" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Preferred Call Time: </Text>
                        {confirmedCallback.preferredTime}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="call-outline" size={16} color="#0284C7" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Contact Number: </Text>
                        {confirmedCallback.mobileNumber}
                      </Text>
                    </View>

                    <View style={styles.confirmedInfoRow}>
                      <Ionicons name="hourglass-outline" size={16} color="#0284C7" />
                      <Text style={styles.confirmedInfoText}>
                        <Text style={{ fontWeight: '700' }}>Status: </Text>
                        <Text style={{ color: '#D97706', fontWeight: '700' }}>Pending Callback</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.disclosureCard, { marginTop: 14 }]}>
                    <Text style={styles.disclosureTextSmall}>
                      Service provided by {confirmedCallback.centreName}. MediUnify is a discovery, enquiry, booking and coordination platform. Ayurveda and wellness services are provided by the respective centre.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            {!confirmedCallback ? (
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsCallbackModalOpen(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: '#0284C7' }]}
                  onPress={handleSubmitCallback}
                >
                  <Text style={styles.modalPrimaryBtnText}>Submit Callback Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setIsCallbackModalOpen(false);
                    setActiveView('DISCOVERY');
                  }}
                >
                  <Text style={styles.modalCancelBtnText}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, { backgroundColor: '#0284C7' }]}
                  onPress={() => {
                    setIsCallbackModalOpen(false);
                    setActiveView('REQUESTS');
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>View My Requests</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================
  // RENDER: APPOINTMENT DETAIL MODAL
  // ==========================================
  const renderApptDetailModal = () => {
    if (!selectedApptDetail) return null;
    const a = selectedApptDetail;
    return (
      <Modal
        visible={!!selectedApptDetail}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedApptDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetBox, isDesktopWeb && styles.desktopModalSheet]}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Appointment Details</Text>
                <Text style={styles.modalSheetSub}>Token: {a.tokenNumber}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedApptDetail(null)}>
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.apptDetailHero}>
                <Text style={styles.apptDetailCentre}>{a.centreName}</Text>
                <Text style={styles.apptDetailService}>{a.service}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    a.status === 'Upcoming' && styles.statusBadgeUpcoming,
                    a.status === 'Completed' && styles.statusBadgeCompleted,
                    a.status === 'Cancelled' && styles.statusBadgeCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      a.status === 'Upcoming' && styles.statusBadgeTextUpcoming,
                      a.status === 'Completed' && styles.statusBadgeTextCompleted,
                      a.status === 'Cancelled' && styles.statusBadgeTextCancelled,
                    ]}
                  >
                    {a.status}
                  </Text>
                </View>
              </View>

              <View style={styles.apptInfoBlock}>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="person-outline" size={16} color="#059669" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Practitioner: </Text>
                    {a.practitioner}
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="calendar-outline" size={16} color="#059669" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Date & Time: </Text>
                    {a.date} at {a.time}
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="cash-outline" size={16} color="#059669" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Fee: </Text>
                    {a.fee} (Paid)
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="location-outline" size={16} color="#059669" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Address: </Text>
                    {a.fullAddress || a.location}
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="document-text-outline" size={16} color="#059669" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Notes: </Text>
                    {a.notes || 'Routine consultation'}
                  </Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>Pre-Consultation Instructions:</Text>
                <Text style={styles.instructionsItem}>• For Nadi Pariksha, avoid eating heavy meals 2.5 hours prior to your visit.</Text>
                <Text style={styles.instructionsItem}>• Wear loose and comfortable cotton garments.</Text>
                <Text style={styles.instructionsItem}>• Carry past medical reports, lipid profiles, and prescriptions if available.</Text>
              </View>

              {/* Service Provider Disclosure */}
              <View style={styles.disclosureCard}>
                <Text style={styles.disclosureTextSmall}>
                  Service provided by {a.centreName}. MediUnify is a discovery, enquiry, booking and coordination platform. Ayurveda and wellness services are provided by the respective centre.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              {a.status === 'Upcoming' && (
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: '#EF4444' }]}
                  onPress={() => handleCancelAppointment(a.id)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: '#EF4444' }]}>
                    Cancel Booking
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setSelectedApptDetail(null)}
              >
                <Text style={styles.modalPrimaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================
  // RENDER: CALLBACK REQUEST DETAIL MODAL
  // ==========================================
  const renderReqDetailModal = () => {
    if (!selectedReqDetail) return null;
    const req = selectedReqDetail;
    return (
      <Modal
        visible={!!selectedReqDetail}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedReqDetail(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetBox, isDesktopWeb && styles.desktopModalSheet]}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Callback Request</Text>
                <Text style={styles.modalSheetSub}>ID: {req.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReqDetail(null)}>
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.apptDetailHero}>
                <Text style={styles.apptDetailCentre}>{req.centreName}</Text>
                <Text style={styles.apptDetailService}>{req.service}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    req.status === 'Pending' && styles.statusBadgePending,
                    req.status === 'Contacted' && styles.statusBadgeContacted,
                    req.status === 'Confirmed' && styles.statusBadgeConfirmed,
                    req.status === 'Closed' && styles.statusBadgeClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      req.status === 'Pending' && styles.statusBadgeTextPending,
                      req.status === 'Contacted' && styles.statusBadgeTextContacted,
                      req.status === 'Confirmed' && styles.statusBadgeTextConfirmed,
                      req.status === 'Closed' && styles.statusBadgeTextClosed,
                    ]}
                  >
                    {req.status}
                  </Text>
                </View>
              </View>

              <View style={styles.apptInfoBlock}>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="person-outline" size={16} color="#0284C7" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Patient: </Text>
                    {req.patientName} ({req.mobileNumber})
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Preferred Date: </Text>
                    {req.preferredDate}
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="time-outline" size={16} color="#0284C7" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Preferred Time: </Text>
                    {req.preferredTime}
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="chatbox-outline" size={16} color="#0284C7" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Message: </Text>
                    {req.notes || 'Callback requested'}
                  </Text>
                </View>
                <View style={styles.apptInfoLine}>
                  <Ionicons name="time-outline" size={16} color="#0284C7" />
                  <Text style={styles.apptInfoVal}>
                    <Text style={{ fontWeight: '700' }}>Latest Update: </Text>
                    {req.lastUpdated}
                  </Text>
                </View>
              </View>

              <View style={styles.disclosureCard}>
                <Text style={styles.disclosureTextSmall}>
                  Service provided by {req.centreName}. MediUnify is a discovery, enquiry, booking and coordination platform.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setSelectedReqDetail(null)}
              >
                <Text style={styles.modalPrimaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================
  // RENDER: DIRECTIONS & CONTACT MODALS
  // ==========================================
  const renderDirectionsModal = () => {
    if (!directionsModalCentre) return null;
    const c = directionsModalCentre;
    return (
      <Modal
        visible={!!directionsModalCentre}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDirectionsModalCentre(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetBox, isDesktopWeb && styles.desktopModalSheet]}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Directions to Centre</Text>
              <TouchableOpacity onPress={() => setDirectionsModalCentre(null)}>
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                {c.name}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                {c.address}
              </Text>
              <View style={styles.mapGraphicPlaceholder}>
                <Ionicons name="navigate-circle" size={48} color="#059669" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669', marginTop: 8 }}>
                  GPS Coordinates: {c.mapCoordinates?.lat}, {c.mapCoordinates?.lng}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                  {c.mapNote || 'Easily accessible via main road transport.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                showAlert('Navigating', `Opening maps navigation to ${c.name}...`);
                setDirectionsModalCentre(null);
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>Start Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderContactModal = () => {
    if (!contactModalCentre) return null;
    const c = contactModalCentre;
    return (
      <Modal
        visible={!!contactModalCentre}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setContactModalCentre(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetBox, isDesktopWeb && styles.desktopModalSheet]}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Contact Centre</Text>
              <TouchableOpacity onPress={() => setContactModalCentre(null)}>
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
                {c.name}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
                {c.location}
              </Text>

              <View style={styles.contactRowItem}>
                <Ionicons name="call" size={18} color="#059669" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Helpline / Direct Phone</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}>
                    {c.contactNumber}
                  </Text>
                </View>
              </View>

              <View style={styles.contactRowItem}>
                <Ionicons name="mail" size={18} color="#059669" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Official Email</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}>
                    {c.contactEmail}
                  </Text>
                </View>
              </View>

              <View style={styles.contactRowItem}>
                <Ionicons name="time" size={18} color="#059669" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Working Hours</Text>
                  <Text style={{ fontSize: 14, color: '#1E293B' }}>{c.workingHours}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setContactModalCentre(null)}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  showAlert('Calling Centre', `Dialing ${c.contactNumber}...`);
                  setContactModalCentre(null);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================
  // VIEW: CENTRE DETAILS PROFILE
  // ==========================================
  const renderCentreDetailsView = () => {
    if (!selectedCentre) return null;
    const c = selectedCentre;

    return (
      <View style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.detailsTopBar}>
          <TouchableOpacity
            style={styles.detailsBackBtn}
            onPress={() => setActiveView('DISCOVERY')}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
            <Text style={styles.detailsBackBtnText}>All Centres</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setContactModalCentre(c)}
            >
              <Ionicons name="call-outline" size={20} color="#059669" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setDirectionsModalCentre(c)}
            >
              <Ionicons name="navigate-outline" size={20} color="#059669" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktopWeb && styles.desktopContainer,
            { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner Hero */}
          <View style={styles.centreHeroCard}>
            <Image source={{ uri: c.bannerImage || c.image }} style={styles.centreHeroBanner} />
            <View style={styles.centreHeroOverlay}>
              <View style={styles.centreHeroRatingBadge}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.centreHeroRatingText}>{c.rating} ({c.reviewsCount} reviews)</Text>
              </View>
              <View
                style={[
                  styles.bookingBadge,
                  c.directBooking ? styles.bookingBadgeDirect : styles.bookingBadgeCallback,
                ]}
              >
                <Ionicons
                  name={c.directBooking ? 'flash' : 'call'}
                  size={12}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.bookingBadgeText}>
                  {c.directBooking ? 'Instant Booking Available' : 'Request Callback'}
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Header Details */}
          <View style={styles.profileHeaderBox}>
            <Text style={styles.profileTitle}>{c.name}</Text>
            <Text style={styles.profileTagline}>{c.tagline}</Text>

            <View style={styles.profileMetaRow}>
              <View style={styles.profileMetaItem}>
                <Ionicons name="location-outline" size={15} color="#059669" />
                <Text style={styles.profileMetaText}>{c.location}</Text>
              </View>
              <View style={styles.profileMetaItem}>
                <Ionicons name="ribbon-outline" size={15} color="#059669" />
                <Text style={styles.profileMetaText}>{c.experience.split('•')[0]}</Text>
              </View>
            </View>

            {/* Service Provider Disclosure Banner */}
            <View style={styles.providerDisclosureBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="shield-outline" size={16} color="#047857" style={{ marginRight: 6 }} />
                <Text style={styles.providerDisclosureTitle}>
                  Service provided by {c.name}
                </Text>
              </View>
              <Text style={styles.providerDisclosureBody}>
                MediUnify is a discovery, enquiry, booking and coordination platform. Ayurveda and wellness services are provided by the respective centre.
              </Text>
            </View>
          </View>

          {/* Details Section Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.detailsTabScroll}
            contentContainerStyle={styles.detailsTabContainer}
          >
            {[
              { id: 'about', label: 'About Centre', icon: 'information-circle-outline' },
              { id: 'services', label: `Services (${c.services?.length || 0})`, icon: 'leaf-outline' },
              { id: 'therapies', label: `Therapies (${c.therapies?.length || 0})`, icon: 'water-outline' },
              { id: 'practitioners', label: `Vaidyas (${c.practitioners?.length || 0})`, icon: 'people-outline' },
              { id: 'pricing', label: 'Pricing & Packages', icon: 'pricetag-outline' },
              { id: 'location', label: 'Location & Hours', icon: 'map-outline' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.detailsTabBtn,
                  detailsTab === tab.id && styles.detailsTabBtnActive,
                ]}
                onPress={() => setDetailsTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={detailsTab === tab.id ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.detailsTabBtnText,
                    detailsTab === tab.id && styles.detailsTabBtnTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* TAB 1: ABOUT */}
          {detailsTab === 'about' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.blockHeading}>About the Centre</Text>
              <Text style={styles.blockParagraph}>{c.description}</Text>

              <Text style={[styles.blockHeading, { marginTop: 18 }]}>Wellness Approach</Text>
              <Text style={styles.blockParagraph}>{c.wellnessApproach}</Text>

              <Text style={[styles.blockHeading, { marginTop: 18 }]}>Experience & Credentials</Text>
              <View style={styles.experienceCard}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.experienceCardText}>{c.experience}</Text>
              </View>

              <Text style={[styles.blockHeading, { marginTop: 18 }]}>Facilities & Amenities</Text>
              <View style={styles.facilitiesGrid}>
                {c.facilities?.map((fac, idx) => (
                  <View key={idx} style={styles.facilityItem}>
                    <Ionicons name="sparkles" size={14} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.facilityItemText}>{fac}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 2: SERVICES */}
          {detailsTab === 'services' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.blockHeading}>Available Services</Text>
              <Text style={styles.blockSubheading}>
                Individualized clinical treatments supervised by qualified Vaidyas:
              </Text>
              {c.services?.map((srv) => (
                <View key={srv.id} style={styles.serviceDetailCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.serviceDetailName}>{srv.name}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{srv.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.serviceDetailDesc}>{srv.description}</Text>
                    <View style={styles.serviceDetailMetaRow}>
                      <Text style={styles.serviceDetailDuration}>{srv.duration}</Text>
                      <Text style={styles.serviceDetailAvail}>• {srv.availability}</Text>
                    </View>
                    <Text style={styles.serviceDetailPrice}>{srv.price}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.serviceSelectActionBtn,
                      !c.directBooking && { backgroundColor: '#0284C7' },
                    ]}
                    onPress={() => {
                      if (c.directBooking) {
                        handleOpenBooking(c, srv);
                      } else {
                        handleOpenCallback(c, srv);
                      }
                    }}
                  >
                    <Text style={styles.serviceSelectActionText}>
                      {c.directBooking ? 'Book' : 'Enquire'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* TAB 3: THERAPIES */}
          {detailsTab === 'therapies' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.blockHeading}>Therapeutic Treatments & Panchakarma</Text>
              <Text style={styles.blockSubheading}>
                Traditional external and internal healing therapies:
              </Text>
              <View style={styles.therapyCardsGrid}>
                {c.therapies?.map((th) => (
                  <View key={th.id} style={styles.therapyCard}>
                    <View style={styles.therapyCardHeader}>
                      <Ionicons name="leaf" size={16} color="#059669" />
                      <Text style={styles.therapyCardPrice}>{th.price}</Text>
                    </View>
                    <Text style={styles.therapyCardTitle}>{th.name}</Text>
                    <Text style={styles.therapyCardDesc}>{th.description}</Text>
                    <View style={styles.therapyCardFooter}>
                      <Text style={styles.therapyCardDuration}>{th.duration}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (c.directBooking) {
                            handleOpenBooking(c);
                          } else {
                            handleOpenCallback(c);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.therapyCardActionText,
                            !c.directBooking && { color: '#0284C7' },
                          ]}
                        >
                          {c.directBooking ? 'Book' : 'Request'} →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 4: PRACTITIONERS */}
          {detailsTab === 'practitioners' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.blockHeading}>Doctors & Ayurvedic Physicians</Text>
              <Text style={styles.blockSubheading}>
                Consult with verified BAMS & MD Ayurvedic practitioners:
              </Text>
              {c.practitioners?.map((doc) => (
                <View key={doc.id} style={styles.practitionerProfileCard}>
                  <Image source={{ uri: doc.profileImage }} style={styles.practitionerProfileImg} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.practitionerProfileName}>{doc.name}</Text>
                    <Text style={styles.practitionerProfileRole}>{doc.role}</Text>
                    <Text style={styles.practitionerProfileQual}>{doc.qualification}</Text>
                    <Text style={styles.practitionerProfileSpec}>
                      Specialization: {doc.specialization}
                    </Text>
                    <View style={styles.practitionerProfileMetaRow}>
                      <Text style={styles.practitionerProfileFee}>Fee: ₹{doc.consultationFee}</Text>
                      <Text style={styles.practitionerProfileAvail}>• {doc.experience}</Text>
                    </View>
                    <View style={styles.practitionerActionsRow}>
                      <TouchableOpacity
                        style={styles.viewProfileBtn}
                        onPress={() => setSelectedPractitionerModal(doc)}
                      >
                        <Text style={styles.viewProfileBtnText}>View Profile</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.bookDoctorBtn,
                          !c.directBooking && { backgroundColor: '#0284C7' },
                        ]}
                        onPress={() => {
                          if (c.directBooking) {
                            handleOpenBooking(c);
                          } else {
                            handleOpenCallback(c);
                          }
                        }}
                      >
                        <Text style={styles.bookDoctorBtnText}>
                          {c.directBooking ? 'Book Slot' : 'Enquire'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 5: PRICING */}
          {detailsTab === 'pricing' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.blockHeading}>Transparent Pricing & Packages</Text>
              <Text style={styles.blockSubheading}>
                Verified rates directly from the centre. Packages with customized treatment plans show price on enquiry:
              </Text>

              {/* Consultations */}
              <View style={styles.pricingSectionBox}>
                <View style={styles.pricingSectionHeader}>
                  <Ionicons name="medkit-outline" size={16} color="#059669" />
                  <Text style={styles.pricingSectionTitle}>Consultation Fees</Text>
                </View>
                {c.pricing?.consultation?.map((item, i) => (
                  <View key={i} style={styles.pricingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pricingRowTitle}>{item.title}</Text>
                      <Text style={styles.pricingRowDuration}>{item.duration}</Text>
                    </View>
                    <Text style={styles.pricingRowFee}>{item.fee}</Text>
                  </View>
                ))}
              </View>

              {/* Therapies */}
              <View style={styles.pricingSectionBox}>
                <View style={styles.pricingSectionHeader}>
                  <Ionicons name="water-outline" size={16} color="#059669" />
                  <Text style={styles.pricingSectionTitle}>Therapy Rates</Text>
                </View>
                {c.pricing?.therapies?.map((item, i) => (
                  <View key={i} style={styles.pricingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pricingRowTitle}>{item.title}</Text>
                      <Text style={styles.pricingRowDuration}>{item.duration}</Text>
                    </View>
                    <Text style={styles.pricingRowFee}>{item.fee}</Text>
                  </View>
                ))}
              </View>

              {/* Packages */}
              <View style={styles.pricingSectionBox}>
                <View style={styles.pricingSectionHeader}>
                  <Ionicons name="gift-outline" size={16} color="#059669" />
                  <Text style={styles.pricingSectionTitle}>Wellness & Detox Packages</Text>
                </View>
                {c.pricing?.packages?.map((item, i) => (
                  <View key={i} style={styles.pricingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pricingRowTitle}>{item.title}</Text>
                      <Text style={styles.pricingRowDuration}>{item.duration}</Text>
                    </View>
                    <Text
                      style={[
                        styles.pricingRowFee,
                        item.fee.includes('enquiry') && styles.pricingRowEnquiry,
                      ]}
                    >
                      {item.fee}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 6: LOCATION */}
          {detailsTab === 'location' && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.blockHeading}>Location & Visiting Hours</Text>

              <View style={styles.locationDetailsCard}>
                <View style={styles.locLineItem}>
                  <Ionicons name="business" size={18} color="#059669" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.locLineLabel}>Full Address</Text>
                    <Text style={styles.locLineValue}>{c.address}</Text>
                  </View>
                </View>

                <View style={styles.locLineItem}>
                  <Ionicons name="call" size={18} color="#059669" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.locLineLabel}>Contact</Text>
                    <Text style={styles.locLineValue}>{c.contactNumber} • {c.contactEmail}</Text>
                  </View>
                </View>

                <View style={styles.locLineItem}>
                  <Ionicons name="time" size={18} color="#059669" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.locLineLabel}>Working Hours</Text>
                    <Text style={styles.locLineValue}>{c.workingHours}</Text>
                  </View>
                </View>

                {/* Map Placeholder */}
                <View style={styles.mapContainerBox}>
                  <View style={styles.mapInner}>
                    <Ionicons name="map" size={36} color="#059669" />
                    <Text style={styles.mapTitleText}>{c.name}</Text>
                    <Text style={styles.mapSubtitleText}>
                      Coordinates: {c.mapCoordinates?.lat}, {c.mapCoordinates?.lng}
                    </Text>
                    <Text style={styles.mapNoteText}>{c.mapNote}</Text>
                  </View>
                </View>

                <View style={styles.locationActionsRow}>
                  <TouchableOpacity
                    style={styles.locActionBtn}
                    onPress={() => setDirectionsModalCentre(c)}
                  >
                    <Ionicons name="navigate" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.locActionBtnText}>{t('Get Directions')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.locActionBtn}
                    onPress={() => setContactModalCentre(c)}
                  >
                    <Ionicons name="call" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.locActionBtnText}>{t('Contact Centre')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {isDesktopWeb && <WebFooter />}
        </ScrollView>

        {/* Dynamic Sticky Bottom CTA Bar */}
        <View style={styles.stickyCtaBar}>
          <View style={styles.stickyCtaPriceWrap}>
            <Text style={styles.stickyCtaLabel}>{t('Starting from')}</Text>
            <Text style={styles.stickyCtaValue}>{c.startingPrice}</Text>
          </View>

          {/* Dynamic Button based on directBooking */}
          {c.directBooking ? (
            <TouchableOpacity
              style={styles.stickyPrimaryBtn}
              onPress={() => handleOpenBooking(c)}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.stickyPrimaryBtnText}>{t('Book Appointment')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.stickyPrimaryBtn, { backgroundColor: '#0284C7' }]}
              onPress={() => handleOpenCallback(c)}
            >
              <Ionicons name="call-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.stickyPrimaryBtnText}>{t('Request Callback')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ==========================================
  // VIEW: MY AYURVEDA APPOINTMENTS
  // ==========================================
  const renderMyAppointmentsView = () => {
    const filteredAppts = appointments.filter((a) => a.status === appointmentTab);

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopWeb && styles.desktopContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.viewHeroBox}>
          <TouchableOpacity
            style={styles.detailsBackBtn}
            onPress={() => setActiveView('DISCOVERY')}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
            <Text style={styles.detailsBackBtnText}>{t('Back to Centres')}</Text>
          </TouchableOpacity>
          <Text style={[styles.viewHeroTitle, { marginTop: 12 }]}>{t('My Ayurveda Appointments')}</Text>
          <Text style={styles.viewHeroSub}>
            {t('Track scheduled consultations, therapy sessions, and booking status')}
          </Text>
        </View>

        {/* Status Sub-Tabs */}
        <View style={styles.subTabRow}>
          {['Upcoming', 'Completed', 'Cancelled'].map((tab) => {
            const count = appointments.filter((a) => a.status === tab).length;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.subTabItem,
                  appointmentTab === tab && styles.subTabItemActive,
                ]}
                onPress={() => setAppointmentTab(tab)}
              >
                <Text
                  style={[
                    styles.subTabItemText,
                    appointmentTab === tab && styles.subTabItemTextActive,
                  ]}
                >
                  {t(tab)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Appointment Cards */}
        {filteredAppts.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Ionicons name="calendar-clear-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>{t('No Appointments')}</Text>
            <Text style={styles.emptyStateSub}>
              {appointmentTab === 'Upcoming'
                ? t('You do not have any upcoming visits scheduled right now.')
                : `${t('No')} ${t(appointmentTab).toLowerCase()} ${t('appointments found')}.`}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateBtn}
              onPress={() => setActiveView('DISCOVERY')}
            >
              <Text style={styles.emptyStateBtnText}>{t('Explore Ayurveda Centres')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredAppts.map((item) => (
            <View key={item.id} style={styles.apptCard}>
              <View style={styles.apptCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.apptCardCentre}>{item.centreName}</Text>
                  <Text style={styles.apptCardService}>{item.service}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'Upcoming' && styles.statusBadgeUpcoming,
                    item.status === 'Completed' && styles.statusBadgeCompleted,
                    item.status === 'Cancelled' && styles.statusBadgeCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.status === 'Upcoming' && styles.statusBadgeTextUpcoming,
                      item.status === 'Completed' && styles.statusBadgeTextCompleted,
                      item.status === 'Cancelled' && styles.statusBadgeTextCancelled,
                    ]}
                  >
                    {t(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.apptCardBody}>
                <View style={styles.apptMetaLine}>
                  <Ionicons name="person-outline" size={15} color="#059669" />
                  <Text style={styles.apptMetaText}>
                    <Text style={{ fontWeight: '600' }}>{t('Vaidya')}: </Text>
                    {item.practitioner}
                  </Text>
                </View>
                <View style={styles.apptMetaLine}>
                  <Ionicons name="calendar-outline" size={15} color="#059669" />
                  <Text style={styles.apptMetaText}>
                    <Text style={{ fontWeight: '600' }}>{t('Schedule')}: </Text>
                    {item.date} {t('at')} {item.time}
                  </Text>
                </View>
                <View style={styles.apptMetaLine}>
                  <Ionicons name="location-outline" size={15} color="#059669" />
                  <Text style={styles.apptMetaText}>
                    <Text style={{ fontWeight: '600' }}>{t('Location')}: </Text>
                    {item.location}
                  </Text>
                </View>
              </View>

              <View style={styles.apptCardFooter}>
                <View>
                  <Text style={styles.apptCardToken}>{t('Token')}: {item.tokenNumber}</Text>
                  <Text style={styles.apptCardFee}>{t('Fee')}: {item.fee}</Text>
                </View>
                <TouchableOpacity
                  style={styles.apptViewDetailsBtn}
                  onPress={() => setSelectedApptDetail(item)}
                >
                  <Text style={styles.apptViewDetailsText}>{t('View Details')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {isDesktopWeb && <WebFooter />}
      </ScrollView>
    );
  };

  // ==========================================
  // VIEW: MY CALLBACK REQUESTS
  // ==========================================
  const renderMyCallbackRequestsView = () => {
    const filteredRequests = callbackRequests.filter((r) => {
      if (requestStatusFilter === 'All') return true;
      return r.status.toLowerCase() === requestStatusFilter.toLowerCase();
    });

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopWeb && styles.desktopContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.viewHeroBox}>
          <TouchableOpacity
            style={styles.detailsBackBtn}
            onPress={() => setActiveView('DISCOVERY')}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
            <Text style={styles.detailsBackBtnText}>{t('Back to Centres')}</Text>
          </TouchableOpacity>
          <Text style={[styles.viewHeroTitle, { marginTop: 12 }]}>{t('My Ayurveda Requests')}</Text>
          <Text style={styles.viewHeroSub}>
            {t('Enquiries and callback requests submitted to specialized retreats and ashrams')}
          </Text>
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {['All', 'Pending', 'Contacted', 'Confirmed', 'Closed'].map((status) => {
            const count =
              status === 'All'
                ? callbackRequests.length
                : callbackRequests.filter((r) => r.status.toLowerCase() === status.toLowerCase())
                    .length;
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  requestStatusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setRequestStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    requestStatusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === 'All' ? t('All') : t(status)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Ionicons name="call-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>{t('No Requests Found')}</Text>
            <Text style={styles.emptyStateSub}>
              {t('You do not have any callback requests in this status.')}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateBtn}
              onPress={() => setActiveView('DISCOVERY')}
            >
              <Text style={styles.emptyStateBtnText}>{t('Browse Retreats & Ashrams')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredRequests.map((req) => (
            <View key={req.id} style={styles.apptCard}>
              <View style={styles.apptCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.apptCardCentre}>{req.centreName}</Text>
                  <Text style={styles.apptCardService}>{req.service}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    req.status === 'Pending' && styles.statusBadgePending,
                    req.status === 'Contacted' && styles.statusBadgeContacted,
                    req.status === 'Confirmed' && styles.statusBadgeConfirmed,
                    req.status === 'Closed' && styles.statusBadgeClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      req.status === 'Pending' && styles.statusBadgeTextPending,
                      req.status === 'Contacted' && styles.statusBadgeTextContacted,
                      req.status === 'Confirmed' && styles.statusBadgeTextConfirmed,
                      req.status === 'Closed' && styles.statusBadgeTextClosed,
                    ]}
                  >
                    {t(req.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.apptCardBody}>
                <View style={styles.apptMetaLine}>
                  <Ionicons name="calendar-outline" size={15} color="#0284C7" />
                  <Text style={styles.apptMetaText}>
                    <Text style={{ fontWeight: '600' }}>{t('Request Date')}: </Text>
                    {req.requestDate}
                  </Text>
                </View>
                <View style={styles.apptMetaLine}>
                  <Ionicons name="time-outline" size={15} color="#0284C7" />
                  <Text style={styles.apptMetaText}>
                    <Text style={{ fontWeight: '600' }}>{t('Preferred Date & Slot')}: </Text>
                    {req.preferredDate} ({req.preferredTime})
                  </Text>
                </View>
                <View style={styles.apptMetaLine}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#0284C7" />
                  <Text style={styles.apptMetaText} numberOfLines={1}>
                    <Text style={{ fontWeight: '600' }}>{t('Update')}: </Text>
                    {req.lastUpdated}
                  </Text>
                </View>
              </View>

              <View style={styles.apptCardFooter}>
                <Text style={styles.apptCardToken}>{t('Patient')}: {req.patientName}</Text>
                <TouchableOpacity
                  style={[styles.apptViewDetailsBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
                  onPress={() => setSelectedReqDetail(req)}
                >
                  <Text style={[styles.apptViewDetailsText, { color: '#0284C7' }]}>{t('View Details')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {isDesktopWeb && <WebFooter />}
      </ScrollView>
    );
  };

  // ==========================================
  // VIEW: MAIN DISCOVERY SCREEN
  // ==========================================
  const renderDiscoveryView = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[
        styles.scrollContent,
        isDesktopWeb && styles.desktopContainer,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title & Subtitle */}
      <View style={styles.heroSection}>
        <View style={styles.titleWithBackRow}>
          <TouchableOpacity
            style={styles.simpleBackBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.mainTitle}>{t('Ayurveda & Wellness')}</Text>
            <Text style={styles.mainSubtitle}>
              {t('Find the right centre for your wellness needs')}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('Search Ayurvedic doctors, Vaidyas, centres or therapies...')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle Button */}
        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            activeFiltersCount > 0 && styles.filterTriggerBtnActive,
          ]}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFiltersCount > 0 ? '#FFFFFF' : '#059669'}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filter Indicators Bar */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFilterPillsRow}>
          <Text style={styles.activeFilterLabel}>{t('Active Filters:')}</Text>
          {selectedPopularService && (
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>{t(selectedPopularService)}</Text>
              <TouchableOpacity onPress={() => setSelectedPopularService(null)}>
                <Ionicons name="close" size={14} color="#059669" />
              </TouchableOpacity>
            </View>
          )}
          {filterLocation !== 'All' && (
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>{filterLocation}</Text>
              <TouchableOpacity onPress={() => setFilterLocation('All')}>
                <Ionicons name="close" size={14} color="#059669" />
              </TouchableOpacity>
            </View>
          )}
          {filterService !== 'All' && (
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>{t(filterService)}</Text>
              <TouchableOpacity onPress={() => setFilterService('All')}>
                <Ionicons name="close" size={14} color="#059669" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllFiltersLink}>
            <Text style={styles.clearAllFiltersLinkText}>{t('Clear All')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Popular Services Section */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>{t('Popular Services')}</Text>
          <Text style={styles.sectionSub}>{t('Select a category to filter verified centres')}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularServicesScroll}
      >
        {popularServices.map((item) => {
          const isSelected = selectedPopularService === item.filterKey;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.popularCard,
                isSelected && styles.popularCardActive,
                { borderTopColor: item.color, borderTopWidth: 3 },
              ]}
              onPress={() => {
                if (isSelected) {
                  setSelectedPopularService(null);
                } else {
                  setSelectedPopularService(item.filterKey);
                }
              }}
            >
              <View style={[styles.popularIconWrap, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.popularCardTitle}>{item.name}</Text>
              <Text style={styles.popularCardDesc} numberOfLines={2}>
                {item.shortDesc}
              </Text>
              <View style={styles.popularCardFooter}>
                <Text
                  style={[
                    styles.popularCardActionText,
                    isSelected && { color: '#059669', fontWeight: '700' },
                  ]}
                >
                  {isSelected ? t('Filtered') : `${t('Explore')} →`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Featured Centres Section */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <View>
          <Text style={styles.sectionTitle}>{t('Featured Centres')}</Text>
          <Text style={styles.sectionSub}>
            Showing {filteredCentres.length} accredited Ayurvedic hospitals and wellness sanatoria
          </Text>
        </View>
      </View>

      {/* Centres Grid */}
      {filteredCentres.length === 0 ? (
        <View style={styles.noResultsBox}>
          <Ionicons name="search-outline" size={52} color="#94A3B8" />
          <Text style={styles.noResultsTitle}>{t('No Centres Found')}</Text>
          <Text style={styles.noResultsSub}>
            We couldn't find any centres matching "{searchQuery || 'your filter criteria'}".
            Try searching for "Panchakarma", "Shirodhara", "Mysuru", or clear your filters.
          </Text>
          <TouchableOpacity style={styles.resetSearchBtn} onPress={clearAllFilters}>
            <Text style={styles.resetSearchBtnText}>{t('Reset Search & Filters')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.centresGrid, isDesktopWeb && styles.desktopCentresGrid]}>
          {filteredCentres.map((centre) => (
            <View
              key={centre.id}
              style={[styles.centreCard, isDesktopWeb && styles.desktopCentreCard]}
            >
              {/* Centre Image & Badges */}
              <View style={styles.centreCardMedia}>
                <Image source={{ uri: centre.image }} style={styles.centreCardImage} />
                <View style={styles.cardImageBadgeTop}>
                  <View style={styles.ratingPill}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.ratingPillText}>{centre.rating} ({centre.reviewsCount})</Text>
                  </View>
                  <View
                    style={[
                      styles.bookingTypePill,
                      centre.directBooking
                        ? styles.bookingTypePillDirect
                        : styles.bookingTypePillCallback,
                    ]}
                  >
                    <Ionicons
                      name={centre.directBooking ? 'flash' : 'call'}
                      size={11}
                      color="#FFFFFF"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.bookingTypePillText}>
                      {centre.directBooking ? t('Direct Booking') : t('Callback Enquiry')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Centre Card Content */}
              <View style={styles.centreCardBody}>
                <Text style={styles.centreCardName}>{centre.name}</Text>
                <View style={styles.centreCardLocationRow}>
                  <Ionicons name="location-sharp" size={14} color="#059669" />
                  <Text style={styles.centreCardLocationText}>{centre.location}</Text>
                </View>

                {/* Main Services Tags */}
                <View style={styles.serviceTagsRow}>
                  {centre.mainServices.slice(0, 3).map((srv, idx) => (
                    <View key={idx} style={styles.serviceTagPill}>
                      <Text style={styles.serviceTagText}>{srv}</Text>
                    </View>
                  ))}
                  {centre.mainServices.length > 3 && (
                    <View style={styles.serviceTagPillMore}>
                      <Text style={styles.serviceTagTextMore}>
                        +{centre.mainServices.length - 3} more
                      </Text>
                    </View>
                  )}
                </View>

                {/* Features & Availability indicators */}
                <View style={styles.highlightsContainer}>
                  <View style={styles.highlightLine}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.highlightLineText}>
                      {centre.consultationAvailable
                        ? t('Doctor Consultation Available')
                        : t('Consultation on request')}
                    </Text>
                  </View>
                  <View style={styles.highlightLine}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.highlightLineText}>
                      {centre.therapiesCount}+ {t('Classical Therapies Available')}
                    </Text>
                  </View>
                </View>

                {/* Footer Pricing & CTA */}
                <View style={styles.centreCardFooter}>
                  <View>
                    <Text style={styles.centreFeeLabel}>{t('Starting price / Fee')}</Text>
                    <Text style={styles.centreFeeValue}>{centre.startingPrice}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.viewCentreBtn}
                    onPress={() => handleOpenCentre(centre)}
                  >
                    <Text style={styles.viewCentreBtnText}>{t('View Centre')}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Service Provider Disclosure */}
                <View style={styles.cardDisclosure}>
                  <Text style={styles.cardDisclosureText} numberOfLines={1}>
                    Service provided by {centre.name}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Platform Disclosure at bottom */}
      <View style={styles.bottomPlatformDisclosure}>
        <Ionicons name="shield-checkmark" size={18} color="#059669" style={{ marginRight: 8 }} />
        <Text style={styles.bottomPlatformDisclosureText}>
          MediUnify is a discovery, enquiry, booking and coordination platform. Ayurveda and wellness services are provided by the respective accredited centres.
        </Text>
      </View>

      {isDesktopWeb && <WebFooter />}
    </ScrollView>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeContainer}>
      {/* Main View Switcher */}
      <View style={{ flex: 1 }}>
        {activeView === 'DISCOVERY' && renderDiscoveryView()}
        {activeView === 'DETAILS' && renderCentreDetailsView()}
        {activeView === 'APPOINTMENTS' && renderMyAppointmentsView()}
        {activeView === 'REQUESTS' && renderMyCallbackRequestsView()}
      </View>

      {/* Modals */}
      {renderFilterModal()}
      {renderDirectBookingModal()}
      {renderCallbackModal()}
      {renderPractitionerModal()}
      {renderApptDetailModal()}
      {renderReqDetailModal()}
      {renderNotificationsModal()}
      {renderDirectionsModal()}
      {renderContactModal()}
    </SafeAreaView>
  );
};

export default AyurvedaWellnessScreen;

const baseStyles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  desktopContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 115,
  },

  // Top Nav Bar
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  desktopTopNav: {
    paddingHorizontal: 32,
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavBrandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  topNavBrandSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  topNavTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  navTabBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  navTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  navTabBtnTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 4,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // Hero Section
  heroSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  ayushBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  ayushBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
    marginLeft: 4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '400',
  },
  titleWithBackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  simpleBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  filterTriggerBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTriggerBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Active Filter Pills
  activeFilterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  activeFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  activeFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  clearAllFiltersLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearAllFiltersLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    textDecorationLine: 'underline',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Popular Services
  popularServicesScroll: {
    paddingRight: 16,
    gap: 12,
    paddingVertical: 4,
  },
  popularCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  popularCardActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  popularIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  popularCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  popularCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    minHeight: 30,
  },
  popularCardFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  popularCardActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  // Centres Grid
  centresGrid: {
    gap: 16,
  },
  desktopCentresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  centreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  desktopCentreCard: {
    width: '48.5%',
  },
  centreCardMedia: {
    height: 180,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  centreCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImageBadgeTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  ratingPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bookingTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bookingTypePillDirect: {
    backgroundColor: '#059669',
  },
  bookingTypePillCallback: {
    backgroundColor: '#0284C7',
  },
  bookingTypePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Centre Card Body
  centreCardBody: {
    padding: 16,
  },
  centreCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  centreCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  centreCardLocationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  serviceTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  serviceTagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  serviceTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
  },
  serviceTagPillMore: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  serviceTagTextMore: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  highlightsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  highlightLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  highlightLineText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  centreCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  centreFeeLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  centreFeeValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#059669',
  },
  viewCentreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  viewCentreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDisclosure: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  cardDisclosureText: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // No results
  noResultsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  noResultsSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 360,
  },
  resetSearchBtn: {
    marginTop: 16,
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetSearchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },

  // Bottom Platform Disclosure
  bottomPlatformDisclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    marginBottom: 16,
  },
  bottomPlatformDisclosureText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },

  // Details View Header
  detailsTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailsBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsBackBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Centre Hero Banner
  centreHeroCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  centreHeroBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  centreHeroOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centreHeroRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  centreHeroRatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  bookingBadgeDirect: {
    backgroundColor: '#059669',
  },
  bookingBadgeCallback: {
    backgroundColor: '#0284C7',
  },
  bookingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Profile Header Box
  profileHeaderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileTagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  profileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  profileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileMetaText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  providerDisclosureBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  providerDisclosureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  providerDisclosureBody: {
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
  },

  // Details Tab Navigation
  detailsTabScroll: {
    marginBottom: 14,
  },
  detailsTabContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  detailsTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  detailsTabBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  detailsTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  detailsTabBtnTextActive: {
    color: '#FFFFFF',
  },

  // Content Blocks
  tabContentBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  blockHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  blockSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  blockParagraph: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  experienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  experienceCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  facilityItemText: {
    fontSize: 12,
    color: '#334155',
  },

  // Services in Details
  serviceDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  serviceDetailName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  serviceDetailDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  serviceDetailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  serviceDetailDuration: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  serviceDetailAvail: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  serviceDetailPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginTop: 4,
  },
  serviceSelectActionBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  serviceSelectActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Therapies in Details
  therapyCardsGrid: {
    gap: 12,
  },
  therapyCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  therapyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  therapyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  therapyCardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  therapyCardPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  therapyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  therapyCardDuration: {
    fontSize: 11,
    color: '#64748B',
  },
  therapyCardActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Practitioners in Details
  practitionerProfileCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  practitionerProfileImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#CBD5E1',
  },
  practitionerProfileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  practitionerProfileRole: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  practitionerProfileQual: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  practitionerProfileSpec: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  practitionerProfileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  practitionerProfileFee: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  practitionerProfileAvail: {
    fontSize: 11,
    color: '#64748B',
  },
  practitionerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  viewProfileBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewProfileBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  bookDoctorBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookDoctorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Pricing in Details
  pricingSectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  pricingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  pricingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pricingRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  pricingRowDuration: {
    fontSize: 11,
    color: '#64748B',
  },
  pricingRowFee: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  pricingRowEnquiry: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    fontStyle: 'italic',
  },

  // Location in Details
  locationDetailsCard: {
    gap: 12,
  },
  locLineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locLineLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  locLineValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
    marginTop: 1,
  },
  mapContainerBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  mapInner: {
    alignItems: 'center',
  },
  mapTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 6,
  },
  mapSubtitleText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  mapNoteText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 4,
    fontStyle: 'italic',
  },
  locationActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  locActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  locActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Sticky Bottom CTA Bar
  stickyCtaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  stickyCtaPriceWrap: {
    justifyContent: 'center',
  },
  stickyCtaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  stickyCtaValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  stickyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  stickyPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modals General
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  desktopModalSheet: {
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 20,
    marginBottom: 40,
  },
  filterSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  desktopFilterBox: {
    maxWidth: 600,
    alignSelf: 'center',
    borderRadius: 20,
    marginBottom: 40,
  },
  bookingSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
  },
  desktopBookingBox: {
    maxWidth: 640,
    alignSelf: 'center',
    borderRadius: 20,
    marginBottom: 40,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSheetSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalPrimaryBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBottomCloseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginTop: 12,
  },
  modalBottomCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  // Stepper Bar
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  stepBadgeCurrent: {
    backgroundColor: '#059669',
  },
  stepBadgeDone: {
    backgroundColor: '#10B981',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepBadgeTextCurrent: {
    color: '#FFFFFF',
  },
  stepNameText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  stepNameTextCurrent: {
    color: '#059669',
    fontWeight: '700',
  },

  // Stepper Contents
  bookingScrollArea: {
    maxHeight: 460,
  },
  stepHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  selectOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  selectOptionCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  selectOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  selectOptionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  selectOptionDuration: {
    fontSize: 11,
    color: '#475569',
  },
  selectOptionPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  radioCircleActive: {
    borderColor: '#059669',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  docSelectImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CBD5E1',
  },
  docSelectRole: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  docSelectExp: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  docSelectFee: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },

  // Date & Time Picker Grids
  datePickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCardActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  dateCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  dateCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  dateCardTextActive: {
    color: '#FFFFFF',
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlotCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSlotCardActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  timeSlotCardDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeSlotPeriod: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  timeSlotTextActive: {
    color: '#FFFFFF',
  },
  timeSlotTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  slotStatusBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    marginTop: 3,
  },
  slotStatusBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
  },

  // Summary Box
  bookingSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    width: '32%',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  summaryTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },

  // Inputs
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  errorHint: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },

  // Confirmation Containers
  confirmationContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  confirmedIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  confirmedSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 340,
  },
  confirmedCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    gap: 8,
  },
  confirmedTokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmedTokenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmedTokenVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  confirmedDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  confirmedInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  confirmedInfoText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },

  // Disclosure inside modals
  disclosureCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 10,
  },
  disclosureTextSmall: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
    flex: 1,
  },

  // Callback Flow Intro Banner
  cbIntroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 14,
  },
  cbIntroBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },

  // Filter Modal Controls
  filterScrollView: {
    maxHeight: 440,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterFooterRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterClearBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterClearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterApplyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  filterApplyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Practitioner Bio Modal
  docModalTopRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  docModalImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#CBD5E1',
  },
  docModalName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  docModalRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 1,
  },
  docModalQual: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  docBadgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  docExpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  docExpBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  docInfoSection: {
    marginBottom: 10,
  },
  docInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  docInfoVal: {
    fontSize: 12,
    color: '#1E293B',
    marginTop: 2,
    lineHeight: 17,
  },
  docFeeHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  docFeeHighlightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  docFeeHighlightVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },

  // Notifications Modal
  notifHeaderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  markReadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  modalCloseBtn: {
    padding: 4,
  },
  notifItemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifItemUnread: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  notifMessage: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    lineHeight: 16,
  },
  notifTokenChip: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  notifTokenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },

  // Appointments & Requests Common Views
  viewHeroBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  viewHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewHeroSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  subTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabItemTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 300,
  },
  emptyStateBtn: {
    marginTop: 16,
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyStateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Appointment & Request Cards
  apptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  apptCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  apptCardCentre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  apptCardService: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeUpcoming: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgePending: {
    backgroundColor: '#FFFBEB',
  },
  statusBadgeContacted: {
    backgroundColor: '#F0F9FF',
  },
  statusBadgeConfirmed: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextUpcoming: {
    color: '#059669',
  },
  statusBadgeTextCompleted: {
    color: '#64748B',
  },
  statusBadgeTextCancelled: {
    color: '#EF4444',
  },
  statusBadgeTextPending: {
    color: '#D97706',
  },
  statusBadgeTextContacted: {
    color: '#0284C7',
  },
  statusBadgeTextConfirmed: {
    color: '#059669',
  },
  statusBadgeTextClosed: {
    color: '#64748B',
  },
  apptCardBody: {
    paddingVertical: 10,
    gap: 6,
  },
  apptMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  apptMetaText: {
    fontSize: 12,
    color: '#334155',
  },
  apptCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  apptCardToken: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  apptCardFee: {
    fontSize: 11,
    color: '#64748B',
  },
  apptViewDetailsBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  apptViewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  // Appointment Modal Details Hero
  apptDetailHero: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  apptDetailCentre: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  apptDetailService: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
    marginBottom: 8,
  },
  apptInfoBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 8,
  },
  apptInfoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  apptInfoVal: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  instructionsBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  instructionsItem: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginTop: 2,
  },

  // Directions / Map Graphic Placeholder
  mapGraphicPlaceholder: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginVertical: 8,
  },
  contactRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
