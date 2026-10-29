import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebFooter from '../../../components/web/WebFooter';
import PaginationBar from '../../../components/web/PaginationBar';
import PatientPageBanner from '../../../components/web/PatientPageBanner';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import { isGuestUser, promptLoginRequired } from '../../../utils/authHelper';
import {
  getActivePatient,
  getPatientFamilyMembers,
  addPatientFamilyMember,
  getBookedTests,
  saveBookedTests,
  getTestReports,
  saveTestReports,
  formatAddressString,
  formatSafeText,
  sortAppointmentList,
} from '../../../data/patientDashboardData';
import {
  DIAGNOSTIC_CENTRES,
  getGoogleMapsDirectionsUrl,
} from '../../../data/labTestData';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';

const VIEW_MODES = [
  { id: 'all_appts', label: 'All Tests & Scans', icon: 'apps' },
  { id: 'lab', label: 'Lab Tests', icon: 'flask' },
  { id: 'packages', label: 'Lab Packages', icon: 'medkit' },
  { id: 'radiology', label: 'Radiology', icon: 'scan' },
  { id: 'reports', label: 'Completed Reports', icon: 'document-text' },
];

const MODALITY_FILTERS = [
  'All Appointments (Lab & Radiology)',
  'Radiology & Scans (MRI, CT, X-Ray, USG)',
  'Pathology & Blood Tests',
];

export const MODALITY_OPTIONS = [
  { id: 'All Appointments (Lab & Radiology)', label: 'All Tests & Scans', icon: 'layers-outline' },
  { id: 'Radiology & Scans (MRI, CT, X-Ray, USG)', label: 'Radiology & Scans', icon: 'scan-outline' },
  { id: 'Pathology & Blood Tests', label: 'Pathology & Blood Tests', icon: 'flask-outline' },
];

export const FAMILY_RELATIONS = ['Father', 'Mother', 'Spouse', 'Child', 'Sibling', 'Grandparent', 'Other'];

const STATUS_FILTERS = [
  'All Status',
  'Active & Confirmed',
  'Completed',
  'Cancelled',
];

export const STATUS_OPTIONS = [
  { id: 'All Status', label: 'All Status', icon: 'apps-outline' },
  { id: 'Active & Confirmed', label: 'Active & Confirmed', icon: 'time-outline' },
  { id: 'Completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  { id: 'Cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

const SORT_OPTIONS = [
  { id: 'upcoming', label: 'Upcoming First', icon: 'calendar-outline' },
  { id: 'latest_booked', label: 'Latest Booked', icon: 'time-outline' },
  { id: 'oldest_booked', label: 'Oldest Booked', icon: 'archive-outline' },
  { id: 'date_asc', label: 'Appointment Date: Earliest First', icon: 'arrow-up-circle-outline' },
  { id: 'date_desc', label: 'Appointment Date: Latest First', icon: 'arrow-down-circle-outline' },
];

export const isRadiologyBooking = (item) => {
  if (!item) return false;
  if (item.bookingType === 'Radiology') return true;
  const m = `${item.bookingType || ''} ${item.modality || ''} ${item.testCategory || ''} ${item.category || ''} ${item.categoryLabel || ''} ${item.type || ''} ${item.modalityType || ''} ${item.department || ''} ${item.testName || ''}`.toLowerCase();
  return (
    m.includes('radio') ||
    m.includes('scan') ||
    m.includes('mri') ||
    m.includes('ct ') ||
    m.includes('ct-') ||
    m.includes('computed tom') ||
    m.includes('x-ray') ||
    m.includes('xray') ||
    m.includes('usg') ||
    m.includes('ultrasound') ||
    m.includes('sonography') ||
    m.includes('mammograph') ||
    m.includes('dexa') ||
    m.includes('ecg') ||
    m.includes('echo')
  );
};

export const isLabPackageBooking = (item) => {
  if (!item || isRadiologyBooking(item)) return false;
  if (item.bookingType === 'Lab Package') return true;
  const m = `${item.bookingType || ''} ${item.testCategory || ''} ${item.category || ''} ${item.categoryLabel || ''} ${item.testName || ''}`.toLowerCase();
  return m.includes('package') || m.includes('checkup') || m.includes('profile') || item.isPackage || item.testsCount > 1;
};

export const isLabTestBooking = (item) => {
  if (!item || isRadiologyBooking(item)) return false;
  return !isLabPackageBooking(item);
};

export const isLabBooking = (item) => {
  return !isRadiologyBooking(item);
};

export const getBookingTypeLabel = (item) => {
  if (isRadiologyBooking(item)) return 'Radiology';
  if (isLabPackageBooking(item)) return 'Lab Package';
  return 'Lab Test';
};

export const formatShortTestName = (name) => {
  if (!name) return 'Diagnostic Test';
  return name
    .replace(/\s*\(\s*Right\s*\/\s*Left\s*\)/gi, '')
    .replace(/\s*\(\s*Heart Angio Scan\s*\)/gi, '')
    .replace(/,\s*/g, ' + ')
    .trim();
};

export const formatShortProviderName = (centerName) => {
  if (!centerName) return 'Diagnostic Centre';
  const raw = typeof centerName === 'object' ? (centerName?.name || 'Diagnostic Centre') : String(centerName);
  const parts = raw.split(/[•\-]/);
  return parts[0].trim();
};

export const formatShortLocation = (address) => {
  if (!address) return 'Mysuru';
  const full = formatAddressString(address);
  const parts = full.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }
  return full;
};

export const formatShortInstruction = (instruction) => {
  if (!instruction) return '';
  if (/10[-–]12/i.test(instruction) && /fast/i.test(instruction)) {
    return 'Fasting required: 10–12 hrs';
  }
  if (/fast/i.test(instruction)) {
    return 'Fasting required prior to test';
  }
  const firstSentence = instruction.split('.')[0];
  return firstSentence.length > 50 ? `${firstSentence.slice(0, 48)}...` : firstSentence;
};

const RESCHEDULE_DATES = [
  'Tomorrow, Oct 01, 2026',
  'Friday, Oct 02, 2026',
  'Saturday, Oct 03, 2026',
  'Monday, Oct 05, 2026',
];

const RESCHEDULE_SLOTS = [
  'Morning Slot (08:30 AM - 09:30 AM)',
  'Morning Slot (10:30 AM - 11:30 AM)',
  'Afternoon Slot (02:00 PM - 03:00 PM)',
  'Evening Slot (05:00 PM - 06:00 PM)',
];

import MyTestsScreenMobile from './MyTestsScreen.js';

const MyTestsScreenWeb = ({ navigation, route, ...props }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);

  const [patient, setPatient] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [bookedTests, setBookedTests] = useState([]);
  const [testReports, setTestReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Active view switcher (defaults to all appointments so both lab & radiology appear immediately)
  const rawInitTab = (route?.params?.initialTab || route?.params?.tab || '').toLowerCase();
  const initialMode = rawInitTab === 'reports' ? 'reports' : (route?.params?.initialTab || (route?.params?.tab === 'radiology' ? 'radiology' : route?.params?.tab === 'lab' ? 'lab' : route?.params?.tab === 'packages' ? 'packages' : 'all_appts'));
  const [viewMode, setViewMode] = useState(initialMode); // 'all_appts' | 'lab' | 'packages' | 'radiology' | 'reports'
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('all');
  const [selectedModality, setSelectedModality] = useState('All Appointments (Lab & Radiology)');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [sortBy, setSortBy] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [openMenuCardId, setOpenMenuCardId] = useState(null);

  const currentSortOption = useMemo(() => {
    return SORT_OPTIONS.find((o) => o.id === sortBy) || SORT_OPTIONS[0];
  }, [sortBy]);

  const isModalityActive = selectedModality !== 'All Appointments (Lab & Radiology)';
  const isStatusActive = selectedStatus !== 'All Status';
  const activeFilterCount = (isModalityActive ? 1 : 0) + (isStatusActive ? 1 : 0);
  const hasFilterOrSortChanged = isModalityActive || isStatusActive || sortBy !== 'upcoming' || searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedModality('All Appointments (Lab & Radiology)');
    setSelectedStatus('All Status');
    setSortBy('upcoming');
    setSearchQuery('');
    setIsFilterOpen(false);
    setIsSortOpen(false);
  };

  // Pagination states (8 items per page)
  const ITEMS_PER_PAGE = 8;
  const [bookedPage, setBookedPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);

  // Modals
  const [viewingDetails, setViewingDetails] = useState(null); // Full Test / Scan Details Modal
  const [viewingReport, setViewingReport] = useState(null); // Diagnostic & Radiology Report Viewer
  const [viewingSlip, setViewingSlip] = useState(null); // Digital Booking Pass / QR Slip
  const [reschedulingTest, setReschedulingTest] = useState(null); // Reschedule Modal
  const [cancellingTest, setCancellingTest] = useState(null); // Cancel Booking Modal
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false); // Add Family Member Modal

  // Add Family Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState(FAMILY_RELATIONS[0]);
  const [newMemberAge, setNewMemberAge] = useState('');
  const [newMemberGender, setNewMemberGender] = useState('Female');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  // Reschedule Form State
  const [selectedRescheduleDate, setSelectedRescheduleDate] = useState(RESCHEDULE_DATES[0]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(RESCHEDULE_SLOTS[1]);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  useEffect(() => {
    loadData();

    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      loadData();
    }) : null;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', loadData);
      return () => {
        if (unsubscribe) unsubscribe();
        window.removeEventListener('focus', loadData);
      };
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    const rawTab = (route?.params?.initialTab || route?.params?.tab || '').toLowerCase();
    if (rawTab === 'reports') {
      setViewMode('reports');
    } else if (route?.params?.initialTab) {
      setViewMode(route.params.initialTab);
    } else if (route?.params?.tab) {
      setViewMode(route.params.tab);
    }
    loadData();
  }, [route?.params]);

  const loadData = async () => {
    setLoading(true);
    try {
      const guest = await isGuestUser();
      if (guest) {
        setIsGuestMode(true);
        setPatient(null);
        setFamilyMembers([]);
        setBookedTests([]);
        setTestReports([]);
        setLoading(false);
        return;
      }
      setIsGuestMode(false);
      const p = await getActivePatient();
      setPatient(p);
      const fam = await getPatientFamilyMembers();
      setFamilyMembers(fam);
      const booked = await getBookedTests();
      setBookedTests(booked);
      const reports = await getTestReports();
      setTestReports(reports);
    } catch (e) {
      console.warn('Error loading tests data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFamilyMember = async () => {
    const guest = await isGuestUser();
    if (guest) {
      setIsAddMemberModalOpen(false);
      promptLoginRequired(navigation, { service: 'family' });
      return;
    }
    if (!newMemberName.trim()) {
      showToast('Please enter the family member’s name.');
      return;
    }
    const updated = await addPatientFamilyMember({
      name: newMemberName.trim(),
      relation: newMemberRelation,
      age: newMemberAge || '28',
      gender: newMemberGender,
      phone: newMemberPhone,
    });
    if (updated) {
      setFamilyMembers(updated);
      setIsAddMemberModalOpen(false);
      setNewMemberName('');
      setNewMemberAge('');
      setNewMemberPhone('');
      showToast(`${newMemberName.trim()} (${newMemberRelation}) added to family profiles!`);
      const booked = await getBookedTests();
      setBookedTests(booked);
      const reports = await getTestReports();
      setTestReports(reports);
    }
  };

  // Family member display object
  const activeMemberObj = useMemo(() => {
    if (selectedFamilyMember === 'all') return null;
    return familyMembers.find((m) => m.id === selectedFamilyMember);
  }, [familyMembers, selectedFamilyMember]);

  // Overall Lab vs Radiology appointment breakdown
  const appointmentBreakdown = useMemo(() => {
    let rad = 0;
    let labTests = 0;
    let labPackages = 0;
    bookedTests.forEach((t) => {
      if (isRadiologyBooking(t)) {
        rad++;
      } else if (isLabPackageBooking(t)) {
        labPackages++;
      } else {
        labTests++;
      }
    });
    return { rad, labTests, labPackages, lab: labTests + labPackages, total: bookedTests.length };
  }, [bookedTests]);

  // Filter Booked Tests (All Lab and Radiology Appointments)
  const filteredBookedTests = useMemo(() => {
    return bookedTests.filter((item) => {
      const isRad = isRadiologyBooking(item);
      const isPkg = isLabPackageBooking(item);
      const isLab = !isRad;

      // Primary tab filtering
      if (viewMode === 'lab' && !isLabTestBooking(item)) return false;
      if (viewMode === 'packages' && !isPkg) return false;
      if (viewMode === 'radiology' && !isRad) return false;
      if (viewMode === 'reports') return false;

      // Family member filter
      if (selectedFamilyMember !== 'all') {
        const matchesId = item.patientId === selectedFamilyMember;
        const matchesName = activeMemberObj && (
          (item.patientName || '').toLowerCase().includes(activeMemberObj.name?.toLowerCase()) ||
          (item.familyMemberName || '').toLowerCase().includes(activeMemberObj.name?.toLowerCase()) ||
          (item.patientName || '').toLowerCase().includes(activeMemberObj.relation?.toLowerCase())
        );
        if (!matchesId && !matchesName) return false;
      }

      // Modality filter
      if (selectedModality !== 'All Appointments (Lab & Radiology)' && selectedModality !== 'All Modalities') {
        if (selectedModality.includes('Radiology') && !isRad) return false;
        if (selectedModality.includes('Pathology') && !isLab) return false;
      }

      // Status filter
      if (selectedStatus !== 'All Status') {
        const s = (item.status || '').toLowerCase();
        if (selectedStatus === 'Active & Confirmed') {
          if (s.includes('cancel') || s.includes('complete')) return false;
        } else if (selectedStatus === 'Completed') {
          if (!s.includes('complete')) return false;
        } else if (selectedStatus === 'Cancelled') {
          if (!s.includes('cancel')) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (item.testName || '').toLowerCase();
        const center = (item.centerName || '').toLowerCase();
        const ref = (item.bookingRef || '').toLowerCase();
        const pName = (item.patientName || '').toLowerCase();
        const mod = (item.modality || '').toLowerCase();
        const type = (item.modalityType || '').toLowerCase();
        return name.includes(q) || center.includes(q) || ref.includes(q) || pName.includes(q) || mod.includes(q) || type.includes(q);
      }

      return true;
    });
  }, [bookedTests, viewMode, selectedFamilyMember, selectedModality, selectedStatus, searchQuery, activeMemberObj]);

  // Sort Booked Tests according to selected sort option (Default: Upcoming First)
  const sortedBookedTests = useMemo(() => {
    return sortAppointmentList(filteredBookedTests, sortBy);
  }, [filteredBookedTests, sortBy]);

  // Filter & Sort Completed Reports
  const filteredReports = useMemo(() => {
    const list = testReports.filter((item) => {
      // Family member filter
      if (selectedFamilyMember !== 'all') {
        const matchesId = item.patientId === selectedFamilyMember;
        const matchesName = activeMemberObj && (
          (item.patientName || '').toLowerCase().includes(activeMemberObj.name?.toLowerCase()) ||
          (item.patientName || '').toLowerCase().includes(activeMemberObj.relation?.toLowerCase())
        );
        if (!matchesId && !matchesName) return false;
      }

      // Modality filter
      if (selectedModality !== 'All Appointments (Lab & Radiology)' && selectedModality !== 'All Modalities') {
        const itemMod = `${item.modality || ''} ${item.category || ''} ${item.testCategory || ''} ${item.type || ''}`.toLowerCase();
        if (selectedModality.includes('Radiology') && !itemMod.includes('radio') && !itemMod.includes('scan') && !itemMod.includes('mri') && !itemMod.includes('ct') && !itemMod.includes('x-ray') && !itemMod.includes('usg') && !itemMod.includes('ultrasound')) return false;
        if (selectedModality.includes('Pathology') && !itemMod.includes('patholog') && !itemMod.includes('blood') && !itemMod.includes('lab') && !itemMod.includes('sample')) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (item.testName || '').toLowerCase();
        const lab = (item.labName || '').toLowerCase();
        const pName = (item.patientName || '').toLowerCase();
        return name.includes(q) || lab.includes(q) || pName.includes(q);
      }

      return true;
    });

    return sortAppointmentList(list, sortBy);
  }, [testReports, selectedFamilyMember, selectedModality, searchQuery, activeMemberObj, sortBy]);

  // Reset pagination when filters, tabs, search or sort change
  useEffect(() => {
    setBookedPage(1);
    setReportsPage(1);
  }, [selectedFamilyMember, selectedModality, selectedStatus, searchQuery, viewMode, sortBy]);

  // Slice paginated lists (8 items per page)
  const paginatedBookedTests = useMemo(() => {
    const startIndex = (bookedPage - 1) * ITEMS_PER_PAGE;
    return sortedBookedTests.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedBookedTests, bookedPage]);

  const paginatedReports = useMemo(() => {
    const startIndex = (reportsPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReports, reportsPage]);

  // Handle Open Directions in Maps
  const handleOpenDirections = (test) => {
    if (!test) return;
    const cName = typeof test?.centerName === 'object' ? test.centerName?.name : test?.centerName;
    const matchedCentre = DIAGNOSTIC_CENTRES?.find(
      (c) =>
        c.name?.toLowerCase() === cName?.toLowerCase() ||
        c.id === test?.centerId ||
        c.name?.toLowerCase() === test?.diagnosticCentre?.name?.toLowerCase()
    );
    if (matchedCentre) {
      const mapsUrl = getGoogleMapsDirectionsUrl(matchedCentre);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      } else {
        Linking.openURL(mapsUrl);
      }
      return;
    }

    const rawDest = test.address || test.centerName || test.location || test.providerAddress || '';
    const destination = (typeof rawDest === 'object' ? formatAddressString(rawDest) : String(rawDest || '')).trim();
    if (destination) {
      const query = encodeURIComponent(destination);
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
      } else {
        Linking.openURL(mapsUrl);
      }
    } else {
      showToast('Location details not available for this booking.');
    }
  };

  // Handle Reschedule
  const handleConfirmReschedule = async () => {
    if (!reschedulingTest) return;
    const updated = bookedTests.map((t) => {
      if (t.id === reschedulingTest.id) {
        return {
          ...t,
          appointmentDate: selectedRescheduleDate,
          timeSlot: selectedRescheduleSlot,
          status: 'Slot Confirmed (Rescheduled)',
        };
      }
      return t;
    });
    setBookedTests(updated);
    await saveBookedTests(updated);
    showToast(`Test slot rescheduled to ${selectedRescheduleDate} (${selectedRescheduleSlot})`);
    setReschedulingTest(null);
  };

  // Handle Cancel
  const handleConfirmCancel = async () => {
    if (!cancellingTest) return;
    const updated = bookedTests.map((t) => {
      if (t.id === cancellingTest.id) {
        return {
          ...t,
          status: 'Cancelled',
          paymentStatus: `Refund Initiated (₹${t.price})`,
        };
      }
      return t;
    });
    setBookedTests(updated);
    await saveBookedTests(updated);
    showToast(`Booking cancelled. Refund of ₹${cancellingTest.price} initiated to source account.`);
    setCancellingTest(null);
  };

  const handleDownloadReport = (report) => {
    showToast(`Downloading certified diagnostic report for ${report.testName}... (PDF)`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && { backgroundColor: '#080E1A', backgroundImage: 'none' }]}>
      {/* Notification Toast */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* Page Hero Banner */}
        <View style={styles.innerContainer}>
          <PatientPageBanner
            onBack={() => navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate('Home')}
            title="My Tests & Radiology Scans"
            subtitle="Track lab bookings, diagnostic scans, and doctor-verified reports."
            badgeText="Diagnostics & Scans"
            badgeIcon="scan-circle"
            iconName="flask"
            theme="navy"
            pills={[
              {
                label: `Active Bookings: ${appointmentBreakdown.total}`,
                bgColor: '#DCFCE7',
                borderColor: '#86EFAC',
                textColor: '#166534',
                icon: 'checkmark-circle',
              },
              {
                label: `Verified Reports: ${testReports.length}`,
                bgColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                textColor: '#1E3A8A',
                icon: 'document-text-outline',
              },
            ]}
            rightContent={
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={styles.organicHeroBtn}
                  onPress={() => navigation?.navigate('LabTests')}
                  activeOpacity={0.85}
                >
                  <View style={styles.organicHeroArrowCircle}>
                    <Ionicons name="arrow-forward" size={13} color="#13BE9C" />
                  </View>
                  <Text style={styles.organicHeroBtnText}>Book Lab Test</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.organicHeroBtn}
                  onPress={() => navigation?.navigate('Radiology')}
                  activeOpacity={0.85}
                >
                  <View style={styles.organicHeroArrowCircle}>
                    <Ionicons name="arrow-forward" size={13} color="#13BE9C" />
                  </View>
                  <Text style={styles.organicHeroBtnText}>Book Radiology Scan</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        <View style={[styles.innerContainer, { paddingTop: 6, paddingBottom: 60 }]}>

          {/* =========================================================
              UNIFIED CONTROLS CARD: SEARCH, FAMILY FILTER & CATEGORY TABS
          ========================================================= */}
          <View style={styles.controlsCard}>
            {/* 1. Search Bar & Quick Sort */}
            <View style={styles.searchAndSortRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#13BE9C" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tests, scans, diagnostic centres, or booking ID..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Quick Sort Dropdown */}
              <View style={[styles.controlAnchor, { zIndex: isSortOpen ? 1000 : 10 }]}>
                <TouchableOpacity
                  style={[styles.sortTriggerBtn, isSortOpen && styles.sortTriggerBtnActive]}
                  onPress={() => setIsSortOpen(!isSortOpen)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="swap-vertical" size={14} color="#13BE9C" style={{ marginRight: 6 }} />
                  <Text style={styles.sortTriggerBtnText}>
                    {SORT_OPTIONS.find((s) => s.id === sortBy)?.label?.replace('Appointment Date: ', '') || 'Sort'}
                  </Text>
                  <Ionicons name={isSortOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#64748B" style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                {/* Sort Popover */}
                {isSortOpen && (
                  <>
                    {Platform.OS === 'web' && (
                      <TouchableOpacity
                        style={styles.popoverBackdrop}
                        activeOpacity={1}
                        onPress={() => setIsSortOpen(false)}
                      />
                    )}
                    <View style={[styles.popoverCard, styles.sortPopoverCard]}>
                      <View style={styles.popoverHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="swap-vertical" size={15} color="#13BE9C" />
                          <Text style={styles.popoverHeading}>Sort By</Text>
                        </View>
                        <TouchableOpacity onPress={() => setIsSortOpen(false)} style={styles.popoverCloseBtn}>
                          <Ionicons name="close" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.sortRadioList}>
                        {SORT_OPTIONS.map((opt) => {
                          const isSel = sortBy === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              style={[styles.sortRadioItem, isSel && styles.sortRadioItemActive]}
                              onPress={() => {
                                setSortBy(opt.id);
                                setIsSortOpen(false);
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.sortRadioCircle, isSel && styles.sortRadioCircleActive]}>
                                {isSel && <View style={styles.sortRadioDot} />}
                              </View>
                              <Ionicons name={opt.icon} size={15} color={isSel ? '#13BE9C' : '#64748B'} style={{ marginRight: 8 }} />
                              <Text style={[styles.sortRadioLabel, isSel && styles.sortRadioLabelActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* 2. Family Members Filter Row (Single-Line Compact Horizontal Pills) */}
            {Array.isArray(familyMembers) && familyMembers.length > 0 && (
              <View style={styles.familyFilterSection}>
                <View style={styles.filterSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="people-outline" size={15} color="#13BE9C" />
                    <Text style={styles.filterSectionTitle}>Family Members</Text>
                  </View>
                  {selectedFamilyMember !== 'all' && (
                    <TouchableOpacity
                      onPress={() => setSelectedFamilyMember('all')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterResetLink}>Reset to All</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.familyPillsRow}
                >
                  {/* All Members Option */}
                  <TouchableOpacity
                    style={[styles.familyPill, selectedFamilyMember === 'all' && styles.familyPillActive]}
                    onPress={() => setSelectedFamilyMember('all')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.familyAvatar, selectedFamilyMember === 'all' && styles.familyAvatarActive]}>
                      <Ionicons name="people" size={12} color={selectedFamilyMember === 'all' ? '#FFFFFF' : '#13BE9C'} />
                    </View>
                    <Text style={[styles.familyPillText, selectedFamilyMember === 'all' && styles.familyPillTextActive]}>
                      All Members
                    </Text>
                    <View style={[styles.familyCountBadge, selectedFamilyMember === 'all' && styles.familyCountBadgeActive]}>
                      <Text style={[styles.familyCountText, selectedFamilyMember === 'all' && styles.familyCountTextActive]}>
                        {bookedTests.length + testReports.length}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Individual Family Members */}
                  {familyMembers.map((member) => {
                    const bookedCount = bookedTests.filter((r) => r.patientId === member.id && r.status !== 'Cancelled').length;
                    const rptCount = testReports.filter((r) => r.patientId === member.id).length;
                    const total = bookedCount + rptCount;
                    const isSelected = selectedFamilyMember === member.id;
                    const initial = (member.name || 'M').charAt(0).toUpperCase();
                    const relation = member.relation || (member.id === 'self' ? 'Self' : 'Family');

                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.familyPill, isSelected && styles.familyPillActive]}
                        onPress={() => setSelectedFamilyMember(member.id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.familyAvatar, isSelected && styles.familyAvatarActive]}>
                          <Text style={[styles.familyAvatarInitial, isSelected && { color: '#FFFFFF' }]}>
                            {initial}
                          </Text>
                        </View>
                        <Text style={[styles.familyPillText, isSelected && styles.familyPillTextActive]}>
                          {member.name}
                        </Text>
                        <View style={[styles.familyRelationPill, isSelected && styles.familyRelationPillActive]}>
                          <Text style={[styles.familyRelationPillText, isSelected && styles.familyRelationPillTextActive]}>
                            {relation}
                          </Text>
                        </View>
                        <View style={[styles.familyCountBadge, isSelected && styles.familyCountBadgeActive]}>
                          <Text style={[styles.familyCountText, isSelected && styles.familyCountTextActive]}>
                            {total}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Add Member Button */}
                  <TouchableOpacity
                    style={styles.addMemberPill}
                    onPress={() => setIsAddMemberModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={15} color="#13BE9C" />
                    <Text style={styles.addMemberPillText}>+ Add Member</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* 3. Category Filter Tabs */}
            <View style={styles.categoryFilterSection}>
              <View style={styles.filterSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="funnel-outline" size={14} color="#13BE9C" />
                  <Text style={styles.filterSectionTitle}>Categories</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipRow}
              >
                {VIEW_MODES.map((mode) => {
                  const active = viewMode === mode.id;
                  const count =
                    mode.id === 'all_appts'
                      ? appointmentBreakdown.total
                      : mode.id === 'lab'
                      ? appointmentBreakdown.labTests
                      : mode.id === 'packages'
                      ? appointmentBreakdown.labPackages
                      : mode.id === 'radiology'
                      ? appointmentBreakdown.rad
                      : testReports.length;

                  return (
                    <TouchableOpacity
                      key={mode.id}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => {
                        setViewMode(mode.id);
                        if (mode.id === 'lab' || mode.id === 'radiology') {
                          setSelectedModality('All Appointments (Lab & Radiology)');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={mode.icon}
                        size={14}
                        color={active ? '#FFFFFF' : '#475569'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {mode.label}
                      </Text>
                      <View style={[styles.statusChipCountBadge, active && styles.statusChipCountBadgeActive]}>
                        <Text style={[styles.statusChipCountText, active && styles.statusChipCountTextActive]}>
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>


          {/* =========================================================
              MAIN CONTENT: BOOKED TESTS NOW (ACTIVE)
          ========================================================= */}
          {isGuestMode ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#E6F8F4' }]}>
                <Ionicons name="flask-outline" size={42} color="#00B894" />
              </View>
              <Text style={styles.emptyTitle}>Login to view your tests and reports</Text>
              <Text style={styles.emptyDesc}>
                Please sign in to access your booked diagnostic appointments, lab results, scan images, and test passes.
              </Text>
              <TouchableOpacity
                style={[styles.bookTestBtn, { marginTop: 18, alignSelf: 'center', paddingHorizontal: 32 }]}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                  }
                  navigation?.navigate('Login', { openAuthModal: true });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.bookTestBtnText}>Login</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B894" />
              <Text style={styles.loadingText}>Loading diagnostic records and scheduled appointments...</Text>
            </View>
          ) : (
            <View style={{ gap: 28 }}>
              {/* SECTION 1: LAB & RADIOLOGY APPOINTMENTS */}
              {viewMode !== 'reports' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.pulseDot, { backgroundColor: '#13BE9C' }]} />
                      <Text style={styles.sectionTitle}>
                        {viewMode === 'lab'
                          ? 'Lab Test Appointments'
                          : viewMode === 'radiology'
                          ? 'Radiology Appointments'
                          : viewMode === 'packages'
                          ? 'Lab Packages'
                          : 'Diagnostic Test Appointments'}
                      </Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                      {sortedBookedTests.length} {sortedBookedTests.length === 1 ? 'booking' : 'bookings'}
                    </Text>
                  </View>

                  {sortedBookedTests.length === 0 ? (
                    <View style={styles.emptyBookedCard}>
                      <Ionicons
                        name={viewMode === 'lab' ? 'flask-outline' : viewMode === 'radiology' ? 'scan-outline' : 'calendar-outline'}
                        size={36}
                        color="#94A3B8"
                      />
                      <Text style={styles.emptyBookedTitle}>
                        {viewMode === 'lab'
                          ? 'No active lab test appointments'
                          : viewMode === 'radiology'
                          ? 'No active radiology scan appointments'
                          : 'No active test bookings'}
                      </Text>
                      <Text style={styles.emptyBookedDesc}>
                        {viewMode === 'lab'
                          ? 'You do not currently have any pending laboratory or blood tests booked under this filter.'
                          : viewMode === 'radiology'
                          ? 'You do not currently have any pending radiology or imaging scans booked under this filter.'
                          : 'You do not currently have any pending laboratory or radiology tests booked under this filter.'}
                      </Text>
                      <TouchableOpacity
                        style={[styles.bookTestBtn, { marginTop: 12, backgroundColor: viewMode === 'radiology' ? '#1E3A8A' : '#00B894' }]}
                        onPress={() => navigation?.navigate(viewMode === 'radiology' ? 'Radiology' : 'LabTests')}
                      >
                        <Text style={styles.bookTestBtnText}>
                          {viewMode === 'radiology' ? 'Book a Radiology Scan Now' : 'Book a Lab Test Now'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    paginatedBookedTests.map((test) => {
                      const bType = getBookingTypeLabel(test);
                      const isRadiology = bType === 'Radiology';
                      const isPackage = bType === 'Lab Package';
                      const isHome = test.testType === 'Home Sample Collection';
                      const isCancelled = (test.status || '').toLowerCase() === 'cancelled';

                      return (
                        <View key={test.id} style={styles.bookedCard}>
                          {/* 1. Top Header Row: Modality Badge + Booking ID (Left) & Status (Right) */}
                          <View style={styles.cardHeaderRow}>
                            <View style={styles.cardHeaderLeft}>
                              <View
                                style={[
                                  styles.cardTypePill,
                                  {
                                    backgroundColor: isRadiology ? '#E0F7FA' : isPackage ? '#EFF6FF' : '#E6F8F4',
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={isRadiology ? 'scan' : isPackage ? 'medkit' : 'flask'}
                                  size={12}
                                  color={isRadiology ? '#00838F' : isPackage ? '#1E3A8A' : '#00B894'}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  style={[
                                    styles.cardTypePillText,
                                    { color: isRadiology ? '#00838F' : isPackage ? '#1E3A8A' : '#00B894' },
                                  ]}
                                >
                                  {bType}
                                </Text>
                              </View>
                              <Text style={styles.cardBookingId}>ID: {test.bookingRef || test.id}</Text>
                            </View>

                            {/* Status Indicator (Clean Dot + Text, No Heavy Box) */}
                            <View style={[styles.cardStatusWrap, isCancelled && styles.cardStatusWrapCancelled]}>
                              <View
                                style={[
                                  styles.statusDot,
                                  { backgroundColor: isCancelled ? '#EF4444' : test.status === 'Completed' ? '#00B894' : '#10B981' },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.cardStatusText,
                                  { color: isCancelled ? '#EF4444' : test.status === 'Completed' ? '#059669' : '#047857' },
                                ]}
                              >
                                {test.status}
                              </Text>
                            </View>
                          </View>

                          {/* 2. Main Content Body: Left (Title, Provider, Location) & Right (Date/Time & Price) */}
                          <View style={styles.cardBodyRow}>
                            <View style={styles.cardMainInfoCol}>
                              <Text style={styles.cardTestName} numberOfLines={2}>
                                {formatShortTestName(test.testName)}
                              </Text>

                              <Text style={styles.cardProviderName} numberOfLines={1}>
                                {formatShortProviderName(test.centerName)}
                              </Text>

                              <View style={styles.cardLocationRow}>
                                <Ionicons name="location-outline" size={13} color="#64748B" style={{ marginRight: 3 }} />
                                <Text style={styles.cardLocationText} numberOfLines={1}>
                                  {formatShortLocation(test.address || test.location)}
                                </Text>
                                {isHome && (
                                  <View style={styles.homeVisitBadge}>
                                    <Text style={styles.homeVisitBadgeText}>Home Visit</Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            <View style={styles.cardSchedulePriceCol}>
                              <View style={styles.scheduleTextRow}>
                                <Ionicons name="calendar-outline" size={13} color="#1E3A8A" style={{ marginRight: 5 }} />
                                <Text style={styles.scheduleDateText}>
                                  {test.appointmentDate || test.formattedDate || test.date}
                                </Text>
                              </View>
                              <View style={styles.scheduleTimeRow}>
                                <Ionicons name="time-outline" size={13} color="#0D9488" style={{ marginRight: 5 }} />
                                <Text style={styles.scheduleTimeText}>{test.timeSlot}</Text>
                              </View>
                              <View style={styles.priceRow}>
                                <Text style={styles.priceText}>₹{test.price || test.paidAmount || 0}</Text>
                                <Text style={styles.paymentSubtext}>
                                  {test.paymentStatus ? `• ${test.paymentStatus.replace('Paid Online via UPI', 'Paid Online').replace('Paid Online via NetBanking', 'Paid Online')}` : '• Paid'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* 3. Divider & Patient / Alerts Row */}
                          <View style={styles.cardMetaDivider} />

                          {(() => {
                            const rawName = test.patientName || 'Patient';
                            const cleanPatientName = rawName.replace(/\s*\((self|mother|father|spouse|child|other)\)/gi, '').trim() || rawName;
                            const relationTag = test.familyMemberName || (rawName.toLowerCase().includes('self') || test.patientId === 'self' ? 'Self' : 'Family');

                            return (
                              <View style={styles.cardMetaRow}>
                                <View style={styles.cardPatientWrap}>
                                  <Ionicons name="person-outline" size={12} color="#13BE9C" style={{ marginRight: 5 }} />
                                  <Text style={styles.cardPatientText}>
                                    Patient: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{cleanPatientName}</Text>
                                  </Text>
                                  <View style={styles.patientRelationTag}>
                                    <Text style={styles.patientRelationTagText}>{relationTag}</Text>
                                  </View>
                                </View>

                                {test.instructions && (
                                  <View style={styles.compactWarningPill}>
                                    <Ionicons name="warning-outline" size={12} color="#D97706" style={{ marginRight: 4 }} />
                                    <Text style={styles.compactWarningText} numberOfLines={1}>
                                      {formatShortInstruction(test.instructions)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            );
                          })()}

                          {/* 4. Compact Phlebotomist Notification (if home collection active) */}
                          {test.phlebotomist && !isCancelled && (
                            <View style={styles.compactPhlebBar}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                <Ionicons name="bicycle" size={14} color="#13BE9C" />
                                <Text style={styles.compactPhlebText}>
                                  Collection in <Text style={{ fontWeight: '800' }}>{test.phlebotomist.eta?.replace(' mins', ' min') || '10 min'}</Text> • {test.phlebotomist.name}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.organicCallBtn}
                                onPress={() => showToast(`Calling ${test.phlebotomist.name} at ${test.phlebotomist.phone}...`)}
                                activeOpacity={0.8}
                              >
                                <View style={styles.organicCallIconCircle}>
                                  <Ionicons name="call" size={11} color="#13BE9C" />
                                </View>
                                <Text style={styles.organicCallBtnText}>Call</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* 5. Footer Actions */}
                          <View style={styles.cardFooterRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.referralHintText} numberOfLines={1}>
                                {test.doctorPrescription || 'Specialist Referral Confirmed'}
                              </Text>
                            </View>

                            <View style={styles.cardActionBtnsGroup}>
                              {/* View Details */}
                              <TouchableOpacity
                                style={styles.organicActionBtn}
                                onPress={() => setViewingDetails(test)}
                                activeOpacity={0.8}
                              >
                                <View style={styles.organicArrowCircle}>
                                  <Ionicons name="arrow-forward" size={13} color="#13BE9C" />
                                </View>
                                <Text style={styles.organicActionBtnText}>View Details</Text>
                              </TouchableOpacity>

                              {/* Directions (For diagnostic centres) */}
                              {!isHome && (
                                <TouchableOpacity
                                  style={styles.organicActionBtnSecondary}
                                  onPress={() => handleOpenDirections(test)}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.organicIconCircleSecondary}>
                                    <Ionicons name="navigate-outline" size={12} color="#13BE9C" />
                                  </View>
                                  <Text style={styles.organicActionTextSecondary}>Directions</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {sortedBookedTests.length > 0 && (
                    <PaginationBar
                      currentPage={bookedPage}
                      totalItems={sortedBookedTests.length}
                      pageSize={ITEMS_PER_PAGE}
                      onPageChange={setBookedPage}
                      itemLabel="booked tests"
                    />
                  )}
                </View>
              )}

              {/* SECTION 2: COMPLETED TEST REPORTS (RADIOLOGY & PATHOLOGY) */}
              {viewMode === 'reports' && (
                <View style={{ gap: 14 }}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-done-circle" size={20} color="#00B894" />
                      <Text style={styles.sectionTitle}>Completed Test & Radiology Reports</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                      {filteredReports.length} certified diagnostic {filteredReports.length === 1 ? 'report' : 'reports'} available
                    </Text>
                  </View>

                  {filteredReports.length === 0 ? (
                    <View style={styles.emptyBookedCard}>
                      <Ionicons name="flask-outline" size={36} color="#94A3B8" />
                      <Text style={styles.emptyBookedTitle}>No test reports found</Text>
                      <Text style={styles.emptyBookedDesc}>
                        No clinical or radiology test reports match your current filter selection.
                      </Text>
                    </View>
                  ) : (
                    paginatedReports.map((report) => {
                      const isReady = report.reportAvailable;
                      const isRadiology = report.category === 'Radiology & Scans';

                      return (
                        <View key={report.id} style={styles.reportCard}>
                          {/* Top Row: Category + Availability Badge */}
                          <View style={styles.reportTopRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View
                                style={[
                                  styles.categoryBadge,
                                  {
                                    backgroundColor: isRadiology ? '#E0F7FA' : '#EFF6FF',
                                    borderColor: isRadiology ? '#80DEEA' : '#BFDBFE',
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={isRadiology ? 'scan-outline' : 'flask-outline'}
                                  size={13}
                                  color={isRadiology ? '#00C2CB' : '#1E3A8A'}
                                  style={{ marginRight: 4 }}
                                />
                                <Text style={[styles.categoryBadgeTitle, { color: isRadiology ? '#00838F' : '#1E3A8A' }]}>
                                  {report.category} • {report.modalityType || 'Diagnostic'}
                                </Text>
                              </View>
                              <Text style={styles.bookingRefText}>{report.id}</Text>
                            </View>

                            {isReady ? (
                              <View style={styles.readyBadge}>
                                <Ionicons name="checkmark-circle" size={13} color="#00B894" style={{ marginRight: 4 }} />
                                <Text style={styles.readyBadgeText}>Verified Report Ready</Text>
                              </View>
                            ) : (
                              <View style={styles.pendingBadge}>
                                <Ionicons name="hourglass-outline" size={13} color="#D97706" style={{ marginRight: 4 }} />
                                <Text style={styles.pendingBadgeText}>Sample In Analysis • Pending</Text>
                              </View>
                            )}
                          </View>

                          {/* Main Content */}
                          <View style={styles.reportMainContent}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.testName}>{report.testName}</Text>
                              <View style={styles.labRow}>
                                <Ionicons name="business-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                                <Text style={styles.labName}>{report.labName}</Text>
                              </View>

                              {/* Patient & Sample Details */}
                              <View style={styles.metaRow}>
                                <View style={styles.patientTag}>
                                  <Ionicons name="person" size={12} color="#1E3A8A" style={{ marginRight: 4 }} />
                                  <Text style={styles.patientTagText}>Patient: {report.patientName}</Text>
                                </View>
                                <Text style={styles.sampleTypeText}>Modality: {report.sampleType}</Text>
                              </View>

                              {/* Clinical Impression / Notes Preview */}
                              {(report.impression || report.doctorNotes) && (
                                <View style={styles.impressionPreviewBox}>
                                  <Text style={styles.impressionLabel}>
                                    {isRadiology ? 'Radiological Impression:' : 'Pathologist Remark:'}
                                  </Text>
                                  <Text style={styles.impressionText}>{report.impression || report.doctorNotes}</Text>
                                </View>
                              )}
                            </View>

                            {/* Dates Pillar */}
                            <View style={styles.datesPillar}>
                              <View style={styles.dateItem}>
                                <Text style={styles.dateLabel}>Test Conducted:</Text>
                                <Text style={styles.dateValue}>{report.testDate}</Text>
                              </View>
                              <View style={styles.dateItem}>
                                <Text style={styles.dateLabel}>Report Issued:</Text>
                                <Text style={[styles.dateValue, isReady && { color: '#00B894', fontWeight: '800' }]}>
                                  {report.reportDate}
                                </Text>
                              </View>
                              {report.fileSize !== 'Processing' && (
                                <Text style={styles.fileSizeText}>{report.fileSize}</Text>
                              )}
                            </View>
                          </View>

                          {/* Biomarker Highlights Preview */}
                          {report.parameters && report.parameters.length > 0 && (
                            <View style={styles.parametersPreviewWrap}>
                              <Text style={styles.parametersTitle}>
                                {isRadiology ? 'Key Anatomical Findings:' : 'Biomarker Highlights:'}
                              </Text>
                              <View style={styles.parametersGrid}>
                                {report.parameters.slice(0, 4).map((p, idx) => (
                                  <View key={idx} style={styles.paramPill}>
                                    <Text style={styles.paramName}>{p.name}:</Text>
                                    <Text style={styles.paramValue}>
                                      {' '}{p.value} {p.unit}
                                    </Text>
                                  </View>
                                ))}
                                {report.parameters.length > 4 && (
                                  <Text style={styles.moreParamsText}>+{report.parameters.length - 4} more parameters</Text>
                                )}
                              </View>
                            </View>
                          )}

                          {/* Actions Row */}
                          <View style={styles.reportActionsRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="shield-checkmark" size={14} color="#13BE9C" style={{ marginRight: 6 }} />
                              <Text style={styles.accreditationText}>NABL & AERB / ICMR Accredited Diagnostic Wing</Text>
                            </View>

                            <View style={styles.buttonsGroup}>
                              {isReady ? (
                                <>
                                  <TouchableOpacity
                                    style={styles.organicActionBtn}
                                    onPress={() => setViewingReport(report)}
                                    activeOpacity={0.8}
                                  >
                                    <View style={styles.organicArrowCircle}>
                                      <Ionicons name="eye-outline" size={13} color="#13BE9C" />
                                    </View>
                                    <Text style={styles.organicActionBtnText}>
                                      {isRadiology ? 'View Report & Film' : 'View Report'}
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.organicActionBtnSecondary}
                                    onPress={() => handleDownloadReport(report)}
                                    activeOpacity={0.8}
                                  >
                                    <View style={styles.organicIconCircleSecondary}>
                                      <Ionicons name="cloud-download-outline" size={12} color="#13BE9C" />
                                    </View>
                                    <Text style={styles.organicActionTextSecondary}>Download PDF</Text>
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <View style={styles.processingIndicator}>
                                  <Ionicons name="sync" size={14} color="#D97706" style={{ marginRight: 6 }} />
                                  <Text style={styles.processingIndicatorText}>Sample In Analysis • Expected Today</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {filteredReports.length > 0 && (
                    <PaginationBar
                      currentPage={reportsPage}
                      totalItems={filteredReports.length}
                      pageSize={ITEMS_PER_PAGE}
                      onPageChange={setReportsPage}
                      itemLabel="diagnostic reports"
                    />
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* =========================================================
          MODAL 1: VIEW DIAGNOSTIC & RADIOLOGY REPORT
      ========================================================= */}
      <Modal visible={Boolean(viewingReport)} transparent animationType="fade" onRequestClose={() => setViewingReport(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.reportModalBox}>
            {/* Header */}
            <View style={styles.reportModalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.reportModalLogo}>Medi</Text>
                  <Text style={[styles.reportModalLogo, { color: '#00B894' }]}>Unify</Text>
                  <Text style={{ fontSize: 13, color: '#94A3B8' }}>• Clinical Diagnostics & Radiology</Text>
                </View>
                <Text style={styles.reportModalTitle}>{viewingReport?.testName}</Text>
                <Text style={styles.reportModalLab}>{viewingReport?.labName}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewingReport(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <View style={styles.reportModalBody}>
                {/* Patient Header Box */}
                <View style={styles.patientReportCard}>
                  <View style={styles.patientCol}>
                    <Text style={styles.prLabel}>PATIENT NAME</Text>
                    <Text style={styles.prValue}>{viewingReport?.patientName}</Text>
                  </View>
                  <View style={styles.patientCol}>
                    <Text style={styles.prLabel}>TEST DATE</Text>
                    <Text style={styles.prValue}>{viewingReport?.testDate}</Text>
                  </View>
                  <View style={styles.patientCol}>
                    <Text style={styles.prLabel}>REPORT DATE</Text>
                    <Text style={styles.prValue}>{viewingReport?.reportDate}</Text>
                  </View>
                  <View style={styles.patientCol}>
                    <Text style={styles.prLabel}>MODALITY</Text>
                    <Text style={styles.prValue}>{viewingReport?.sampleType}</Text>
                  </View>
                </View>

                {/* If Radiology: Detailed Findings and Impression */}
                {viewingReport?.findings && (
                  <View style={styles.radiologySection}>
                    <Text style={styles.tableHeading}>ANATOMICAL FINDINGS & EVALUATION</Text>
                    <View style={styles.findingsBox}>
                      <Text style={styles.findingsText}>{viewingReport.findings}</Text>
                    </View>
                  </View>
                )}

                {/* Parameters Table */}
                {viewingReport?.parameters && viewingReport.parameters.length > 0 && (
                  <>
                    <Text style={styles.tableHeading}>
                      {viewingReport?.category === 'Radiology & Scans'
                        ? 'MEASURED PARAMETERS & ANATOMICAL INDICES'
                        : 'TEST PARAMETERS & BIOLOGICAL REFERENCE RANGES'}
                    </Text>
                    <View style={styles.tableWrap}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHCol, { flex: 2 }]}>Investigation Test</Text>
                        <Text style={[styles.tableHCol, { flex: 1.5, textAlign: 'center' }]}>Observed Result</Text>
                        <Text style={[styles.tableHCol, { flex: 1.5, textAlign: 'center' }]}>Reference Range</Text>
                        <Text style={[styles.tableHCol, { flex: 1, textAlign: 'right' }]}>Flag</Text>
                      </View>

                      {viewingReport.parameters.map((param, idx) => (
                        <View key={idx} style={[styles.tableDataRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                          <Text style={[styles.tableDCol, { flex: 2, fontWeight: '700', color: '#0F172A' }]}>
                            {param.name}
                          </Text>
                          <Text style={[styles.tableDCol, { flex: 1.5, textAlign: 'center', fontWeight: '800', color: '#1E3A8A' }]}>
                            {param.value} <Text style={{ fontSize: 11, fontWeight: '400', color: '#64748B' }}>{param.unit}</Text>
                          </Text>
                          <Text style={[styles.tableDCol, { flex: 1.5, textAlign: 'center', color: '#64748B' }]}>
                            {param.normalRange || '—'}
                          </Text>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <View
                              style={[
                                styles.flagBadge,
                                param.status === 'Normal' ? styles.flagNormal : styles.flagHigh,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.flagBadgeText,
                                  param.status === 'Normal' ? { color: '#00B894' } : { color: '#D97706' },
                                ]}
                              >
                                {param.status || 'Normal'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Impression Box */}
                {(viewingReport?.impression || viewingReport?.doctorNotes) && (
                  <View style={styles.doctorNotesBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="document-text" size={15} color="#00B894" style={{ marginRight: 6 }} />
                      <Text style={styles.notesTitle}>
                        {viewingReport?.category === 'Radiology & Scans'
                          ? 'Radiologist Impression & Summary:'
                          : 'Pathologist Clinical Remark:'}
                      </Text>
                    </View>
                    <Text style={styles.notesBody}>{viewingReport.impression || viewingReport.doctorNotes}</Text>
                  </View>
                )}

                {/* Security Seal */}
                <View style={styles.signStampRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="shield-checkmark" size={18} color="#00B894" style={{ marginRight: 6 }} />
                    <Text style={styles.stampText}>
                      Digitally Verified by Chief Radiologist / Pathologist • NABL ISO 15189 Certified
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setViewingReport(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  handleDownloadReport(viewingReport);
                  setViewingReport(null);
                }}
              >
                <Ionicons name="download-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 0: VIEW COMPLETE BOOKING DETAILS
      ========================================================= */}
      <Modal visible={Boolean(viewingDetails)} transparent animationType="fade" onRequestClose={() => setViewingDetails(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailsModalBox}>
            {/* Modal Header */}
            <View style={styles.detailsModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={[
                    styles.detailsModalIconWrap,
                    {
                      backgroundColor:
                        getBookingTypeLabel(viewingDetails) === 'Radiology'
                          ? '#F3E8FF'
                          : getBookingTypeLabel(viewingDetails) === 'Lab Package'
                          ? '#E0F2FE'
                          : '#E6F8F4',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      getBookingTypeLabel(viewingDetails) === 'Radiology'
                        ? 'scan'
                        : getBookingTypeLabel(viewingDetails) === 'Lab Package'
                        ? 'medkit'
                        : 'flask'
                    }
                    size={22}
                    color={
                      getBookingTypeLabel(viewingDetails) === 'Radiology'
                        ? '#00C2CB'
                        : getBookingTypeLabel(viewingDetails) === 'Lab Package'
                        ? '#1E3A8A'
                        : '#00B894'
                    }
                  />
                </View>
                <View>
                  <Text style={styles.detailsModalHeading}>Booking Details & Status</Text>
                  <Text style={styles.detailsModalSub}>
                    Booking ID: <Text style={{ fontWeight: '800', color: '#1E3A8A' }}>{viewingDetails?.bookingRef || viewingDetails?.id}</Text>
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setViewingDetails(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Content Scroll */}
            <ScrollView style={styles.detailsModalBody} showsVerticalScrollIndicator={true}>
              {/* Hero Banner */}
              <View style={styles.detailsHeroCard}>
                <View style={styles.detailsHeroTopRow}>
                  <View
                    style={[
                      styles.serviceTypeBadge,
                      {
                        backgroundColor:
                          getBookingTypeLabel(viewingDetails) === 'Radiology'
                            ? '#E0F7FA'
                            : getBookingTypeLabel(viewingDetails) === 'Lab Package'
                            ? '#EFF6FF'
                            : '#E6F8F4',
                        borderColor:
                          getBookingTypeLabel(viewingDetails) === 'Radiology'
                            ? '#80DEEA'
                            : getBookingTypeLabel(viewingDetails) === 'Lab Package'
                            ? '#BFDBFE'
                            : '#A7F3D0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.serviceTypeBadgeText,
                        {
                          color:
                            getBookingTypeLabel(viewingDetails) === 'Radiology'
                              ? '#00838F'
                              : getBookingTypeLabel(viewingDetails) === 'Lab Package'
                              ? '#1E3A8A'
                              : '#00B894',
                        },
                      ]}
                    >
                      {getBookingTypeLabel(viewingDetails)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.detailsStatusPill,
                      viewingDetails?.status === 'Cancelled' && { backgroundColor: '#FFF2ED', borderColor: '#FFD7C7' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusIndicatorDot,
                        viewingDetails?.status === 'Cancelled' && { backgroundColor: '#FF7F50' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.detailsStatusText,
                        viewingDetails?.status === 'Cancelled' && { color: '#FF7F50' },
                      ]}
                    >
                      {viewingDetails?.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailsTestName}>{viewingDetails?.testName}</Text>
                <Text style={styles.detailsCategoryText}>
                  Category: {viewingDetails?.categoryLabel || viewingDetails?.testCategory || viewingDetails?.modality || 'Clinical Diagnostics'} • {viewingDetails?.testType || 'Centre Visit'}
                </Text>
              </View>

              {/* Patient & Family Member Grid */}
              <View style={styles.detailsSectionBox}>
                <View style={styles.detailsSectionHeaderRow}>
                  <Ionicons name="person-circle-outline" size={18} color="#1E3A8A" />
                  <Text style={styles.detailsSectionHeading}>Patient & Family Member Information</Text>
                </View>
                <View style={styles.detailsGrid2Col}>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>PATIENT NAME</Text>
                    <Text style={styles.detailsCellVal}>{viewingDetails?.patientName}</Text>
                  </View>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>BOOKED FOR</Text>
                    <Text style={[styles.detailsCellVal, { color: viewingDetails?.familyMemberName ? '#00B894' : '#0F172A' }]}>
                      {viewingDetails?.familyMemberName ? `${viewingDetails.familyMemberName} (Family Member)` : 'Primary Patient (Self)'}
                    </Text>
                  </View>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>AGE & GENDER</Text>
                    <Text style={styles.detailsCellVal}>
                      {viewingDetails?.age || viewingDetails?.patientAge || 28} Years • {viewingDetails?.gender || viewingDetails?.patientGender || 'Male'}
                    </Text>
                  </View>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>REGISTERED PHONE</Text>
                    <Text style={styles.detailsCellVal}>{viewingDetails?.contactPhone || viewingDetails?.patientPhone || '+91 98450 12345'}</Text>
                  </View>
                </View>
              </View>

              {/* Schedule & Center Details */}
              <View style={styles.detailsSectionBox}>
                <View style={styles.detailsSectionHeaderRow}>
                  <Ionicons name="calendar-outline" size={18} color="#1E3A8A" />
                  <Text style={styles.detailsSectionHeading}>Appointment & Center Details</Text>
                </View>
                <View style={styles.detailsGrid2Col}>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>APPOINTMENT DATE</Text>
                    <Text style={[styles.detailsCellVal, { color: '#1E3A8A', fontWeight: '800' }]}>
                      {viewingDetails?.appointmentDate || viewingDetails?.formattedDate || viewingDetails?.date}
                    </Text>
                  </View>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>TIME SLOT</Text>
                    <Text style={[styles.detailsCellVal, { color: '#1E3A8A', fontWeight: '800' }]}>
                      {viewingDetails?.timeSlot}
                    </Text>
                  </View>
                  <View style={[styles.detailsGridCell, { width: '100%' }]}>
                    <Text style={styles.detailsCellLabel}>LAB / HOSPITAL / CENTRE</Text>
                    <Text style={styles.detailsCellVal}>
                      {typeof viewingDetails?.centerName === 'object' ? (viewingDetails?.centerName?.name || 'Diagnostic Centre') : String(viewingDetails?.centerName || viewingDetails?.providerName || 'Diagnostic Centre')}
                    </Text>
                  </View>
                  <View style={[styles.detailsGridCell, { width: '100%' }]}>
                    <Text style={styles.detailsCellLabel}>LOCATION / ADDRESS</Text>
                    <Text style={styles.detailsCellVal}>
                      {formatAddressString(viewingDetails?.address || viewingDetails?.location || viewingDetails?.providerAddress)}
                    </Text>
                    {viewingDetails?.testType !== 'Home Sample Collection' && (
                      <TouchableOpacity
                        style={styles.detailsDirectionsBtn}
                        onPress={() => handleOpenDirections(viewingDetails)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.detailsDirectionsBtnText}>Get Directions in Google Maps</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Billing & Payment Details */}
              <View style={styles.detailsSectionBox}>
                <View style={styles.detailsSectionHeaderRow}>
                  <Ionicons name="card-outline" size={18} color="#1E3A8A" />
                  <Text style={styles.detailsSectionHeading}>Payment & Booking Identification</Text>
                </View>
                <View style={styles.detailsGrid2Col}>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>BOOKING ID / REF</Text>
                    <Text style={[styles.detailsCellVal, { fontFamily: 'monospace', fontWeight: '800', color: '#1E3A8A' }]}>
                      {viewingDetails?.bookingRef || viewingDetails?.id}
                    </Text>
                  </View>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>BOOKING DATE</Text>
                    <Text style={styles.detailsCellVal}>{viewingDetails?.bookingDate || '28 Sep 2026'}</Text>
                  </View>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>TOTAL PRICE</Text>
                    <Text style={[styles.detailsCellVal, { fontSize: 16, fontWeight: '900', color: '#0F172A' }]}>
                      ₹{viewingDetails?.price || viewingDetails?.paidAmount || 0}
                    </Text>
                  </View>
                  <View style={styles.detailsGridCell}>
                    <Text style={styles.detailsCellLabel}>PAYMENT STATUS</Text>
                    <Text style={[styles.detailsCellVal, { color: '#00B894', fontWeight: '800' }]}>
                      {viewingDetails?.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Specific Clinical Instructions (Service specific: Lab vs Radiology) */}
              <View style={[styles.detailsSectionBox, { backgroundColor: getBookingTypeLabel(viewingDetails) === 'Radiology' ? '#E0F7FA' : '#F0FDF4' }]}>
                <View style={styles.detailsSectionHeaderRow}>
                  <Ionicons
                    name={getBookingTypeLabel(viewingDetails) === 'Radiology' ? 'medkit-outline' : 'flask-outline'}
                    size={18}
                    color={getBookingTypeLabel(viewingDetails) === 'Radiology' ? '#00C2CB' : '#00B894'}
                  />
                  <Text
                    style={[
                      styles.detailsSectionHeading,
                      { color: getBookingTypeLabel(viewingDetails) === 'Radiology' ? '#00838F' : '#166534' },
                    ]}
                  >
                    {getBookingTypeLabel(viewingDetails) === 'Radiology' ? 'Radiology Scan Instructions' : 'Pathology Collection Guidelines'}
                  </Text>
                </View>

                {getBookingTypeLabel(viewingDetails) === 'Radiology' ? (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.detailsPrepText}>
                      • <Text style={{ fontWeight: '700' }}>Preparation:</Text> {viewingDetails?.instructions || 'Wear comfortable loose clothing without metal fasteners or jewelry.'}
                    </Text>
                    <Text style={styles.detailsPrepText}>
                      • <Text style={{ fontWeight: '700' }}>Scan Facility:</Text> Report to the Radiology Reception at {typeof viewingDetails?.centerName === 'object' ? viewingDetails?.centerName?.name : String(viewingDetails?.centerName || viewingDetails?.providerName || 'Radiology Diagnostic Centre')} 15 minutes before slot time.
                    </Text>
                    <Text style={styles.detailsPrepText}>
                      • <Text style={{ fontWeight: '700' }}>Prescription:</Text> {viewingDetails?.doctorPrescription || 'Carry doctor referral note and any past imaging films/CDs.'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.detailsPrepText}>
                      • <Text style={{ fontWeight: '700' }}>Collection Mode:</Text> {viewingDetails?.testType === 'Home Sample Collection' ? 'Home Sample Collection (Phlebotomist Visit)' : 'Diagnostic Centre Visit'}
                    </Text>
                    <Text style={styles.detailsPrepText}>
                      • <Text style={{ fontWeight: '700' }}>Fasting Instructions:</Text> {viewingDetails?.instructions || 'Fasting of 10-12 hours required prior to sample collection. Water is permitted.'}
                    </Text>
                    {viewingDetails?.phlebotomist && (
                      <Text style={styles.detailsPrepText}>
                        • <Text style={{ fontWeight: '700' }}>Assigned Phlebotomist:</Text> {viewingDetails.phlebotomist.name} ({viewingDetails.phlebotomist.phone}) • Vehicle: {viewingDetails.phlebotomist.vehicle} (ETA: {viewingDetails.phlebotomist.eta})
                      </Text>
                    )}
                    <Text style={styles.detailsPrepText}>
                      • <Text style={{ fontWeight: '700' }}>Referral Slip:</Text> {viewingDetails?.doctorPrescription || 'Diagnostic Laboratory Screening Referral'}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Modal Footer Actions */}
            <View style={styles.detailsModalFooter}>

              {viewingDetails?.status !== 'Cancelled' && viewingDetails?.status !== 'Completed' && viewingDetails?.canReschedule && (
                <TouchableOpacity
                  style={styles.detailsRescheduleBtn}
                  onPress={() => {
                    const item = viewingDetails;
                    setViewingDetails(null);
                    setReschedulingTest(item);
                  }}
                >
                  <Ionicons name="time-outline" size={15} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.detailsRescheduleBtnText}>Reschedule</Text>
                </TouchableOpacity>
              )}

              {viewingDetails?.status !== 'Cancelled' && viewingDetails?.status !== 'Completed' && viewingDetails?.canCancel && (
                <TouchableOpacity
                  style={styles.detailsCancelBtn}
                  onPress={() => {
                    const item = viewingDetails;
                    setViewingDetails(null);
                    setCancellingTest(item);
                  }}
                >
                  <Text style={styles.detailsCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setViewingDetails(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 2: VIEW BOOKING SLIP & QR PASS
      ========================================================= */}
      <Modal visible={Boolean(viewingSlip)} transparent animationType="fade" onRequestClose={() => setViewingSlip(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.slipModalBox}>
            <View style={styles.slipHeader}>
              <View>
                <Text style={styles.slipBadge}>OFFICIAL BOOKING PASS</Text>
                <Text style={styles.slipTitle}>{viewingSlip?.testName}</Text>
                <Text style={styles.slipSub}>
                  {typeof viewingSlip?.centerName === 'object' ? (viewingSlip.centerName?.name || 'Diagnostic Centre') : String(viewingSlip?.centerName || '')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setViewingSlip(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.slipBody}>
              {/* QR Code graphic */}
              <View style={styles.qrContainer}>
                <View style={styles.qrMockBox}>
                  <Ionicons name="qr-code" size={120} color="#0F172A" />
                </View>
                <Text style={styles.qrCodeText}>SCAN FOR EXPRESS CENTRE CHECK-IN</Text>
                <Text style={styles.qrRefText}>{viewingSlip?.bookingRef}</Text>
              </View>

              {/* Booking Details Grid */}
              <View style={styles.slipGrid}>
                <View style={styles.slipGridItem}>
                  <Text style={styles.slipGridLabel}>PATIENT</Text>
                  <Text style={styles.slipGridVal}>{viewingSlip?.patientName}</Text>
                </View>
                <View style={styles.slipGridItem}>
                  <Text style={styles.slipGridLabel}>APPOINTMENT DATE</Text>
                  <Text style={styles.slipGridVal}>{viewingSlip?.appointmentDate}</Text>
                </View>
                <View style={styles.slipGridItem}>
                  <Text style={styles.slipGridLabel}>TIME SLOT</Text>
                  <Text style={styles.slipGridVal}>{viewingSlip?.timeSlot}</Text>
                </View>
                <View style={styles.slipGridItem}>
                  <Text style={styles.slipGridLabel}>PAYMENT STATUS</Text>
                  <Text style={[styles.slipGridVal, { color: '#00B894' }]}>{viewingSlip?.paymentStatus}</Text>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.slipNotice}>
                <Ionicons name="information-circle" size={15} color="#1E3A8A" style={{ marginRight: 6 }} />
                <Text style={styles.slipNoticeText}>
                  Please arrive 15 minutes before your slot. Present this QR pass at the MediUnify reception desk.
                </Text>
              </View>

              {viewingSlip?.testType !== 'Home Sample Collection' && (
                <TouchableOpacity
                  style={styles.detailsDirectionsBtn}
                  onPress={() => handleOpenDirections(viewingSlip)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.detailsDirectionsBtnText}>Get Location Directions to Lab</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setViewingSlip(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  showToast(`Booking pass saved to device downloads.`);
                  setViewingSlip(null);
                }}
              >
                <Ionicons name="arrow-down-circle" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Save Pass (PDF)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 3: RESCHEDULE TEST SLOT
      ========================================================= */}
      <Modal visible={Boolean(reschedulingTest)} transparent animationType="fade" onRequestClose={() => setReschedulingTest(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.rescheduleModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reschedule Test Slot</Text>
                <Text style={styles.modalSubtitle}>{reschedulingTest?.testName}</Text>
              </View>
              <TouchableOpacity onPress={() => setReschedulingTest(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.rescheduleSectionTitle}>SELECT NEW DATE:</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {RESCHEDULE_DATES.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.rescheduleOption, selectedRescheduleDate === d && styles.rescheduleOptionActive]}
                    onPress={() => setSelectedRescheduleDate(d)}
                  >
                    <Ionicons
                      name={selectedRescheduleDate === d ? 'radio-button-on' : 'radio-button-off'}
                      size={17}
                      color={selectedRescheduleDate === d ? '#00B894' : '#64748B'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.rescheduleOptionText, selectedRescheduleDate === d && { fontWeight: '700', color: '#0F172A' }]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.rescheduleSectionTitle}>SELECT TIME SLOT:</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {RESCHEDULE_SLOTS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.rescheduleOption, selectedRescheduleSlot === s && styles.rescheduleOptionActive]}
                    onPress={() => setSelectedRescheduleSlot(s)}
                  >
                    <Ionicons
                      name={selectedRescheduleSlot === s ? 'radio-button-on' : 'radio-button-off'}
                      size={17}
                      color={selectedRescheduleSlot === s ? '#00B894' : '#64748B'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.rescheduleOptionText, selectedRescheduleSlot === s && { fontWeight: '700', color: '#0F172A' }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setReschedulingTest(null)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleConfirmReschedule}>
                <Ionicons name="checkmark" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Confirm Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 4: CANCEL TEST BOOKING
      ========================================================= */}
      <Modal visible={Boolean(cancellingTest)} transparent animationType="fade" onRequestClose={() => setCancellingTest(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.cancelModalBox}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.alertCircle}>
                <Ionicons name="warning-outline" size={36} color="#FF7F50" />
              </View>
              <Text style={styles.cancelModalTitle}>Cancel Test Booking?</Text>
              <Text style={styles.cancelModalSubtitle}>
                Are you sure you want to cancel {cancellingTest?.testName}?
              </Text>
            </View>

            <View style={styles.refundNoticeBox}>
              <Ionicons name="cash-outline" size={16} color="#00B894" style={{ marginRight: 8 }} />
              <Text style={styles.refundNoticeText}>
                Full refund of ₹{cancellingTest?.price} will be credited to your original payment method within 2-4 business hours.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCancellingTest(null)}>
                <Text style={styles.modalCancelBtnText}>Keep Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { backgroundColor: '#FF7F50' }]}
                onPress={handleConfirmCancel}
              >
                <Text style={styles.modalPrimaryBtnText}>Yes, Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 5: ADD REAL FAMILY MEMBER
      ========================================================= */}
      <Modal visible={isAddMemberModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddMemberModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.rescheduleModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Family Member</Text>
                <Text style={styles.modalSubtitle}>Link your real family dependent for tests, scans, and reports</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddMemberModalOpen(false)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBody, { gap: 14 }]}>
              <View>
                <Text style={styles.slotLabel}>Full Legal Name *</Text>
                <TextInput
                  style={styles.modalInputText}
                  placeholder="e.g. Kavitha, Suresh, Aryan..."
                  placeholderTextColor="#94A3B8"
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                />
              </View>

              <View>
                <Text style={styles.slotLabel}>Relationship *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {FAMILY_RELATIONS.map((rel) => {
                    const isSel = newMemberRelation === rel;
                    return (
                      <TouchableOpacity
                        key={rel}
                        style={[styles.relationPill, isSel && styles.relationPillActive]}
                        onPress={() => setNewMemberRelation(rel)}
                      >
                        <Text style={[styles.relationPillText, isSel && styles.relationPillTextActive]}>{rel}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotLabel}>Age (Years)</Text>
                  <TextInput
                    style={styles.modalInputText}
                    placeholder="e.g. 32"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={newMemberAge}
                    onChangeText={setNewMemberAge}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotLabel}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {['Female', 'Male', 'Other'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderMiniBtn, newMemberGender === g && styles.genderMiniBtnActive]}
                        onPress={() => setNewMemberGender(g)}
                      >
                        <Text style={[styles.genderMiniText, newMemberGender === g && styles.genderMiniTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View>
                <Text style={styles.slotLabel}>Phone Number (Optional)</Text>
                <TextInput
                  style={styles.modalInputText}
                  placeholder="+91 98XXX XXXXX"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={newMemberPhone}
                  onChangeText={setNewMemberPhone}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsAddMemberModalOpen(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveFamilyMember}>
                <Text style={styles.modalPrimaryBtnText}>Save Family Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const MyTestsScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  return !isDesktopLayout(width) ? (
    <MyTestsScreenMobile {...props} />
  ) : (
    <MyTestsScreenWeb {...props} />
  );
};

export default MyTestsScreenResponsive;

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8F1F8',
    backgroundImage: 'linear-gradient(180deg, #E6F0F7 0%, #EBF4FA 35%, #F0F6FA 100%)',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  innerContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  breadcrumbBar: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingBottom: 4,
  },
  breadcrumbContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  breadcrumbActive: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 9999,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  categoryBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#00B894',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0C3B6B',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: '#475569',
    marginTop: 6,
    maxWidth: 680,
    lineHeight: 20,
  },
  bookTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    boxShadow: '0 4px 14px rgba(0, 184, 148, 0.4)',
  },
  bookTestBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  // Image 2 Exact Button Design (Circular Outline Arrow + Bold Action Text in #13BE9C)
  organicHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.8,
    borderColor: '#13BE9C',
    boxShadow: '0 2px 8px rgba(19, 190, 156, 0.15)',
    cursor: 'pointer',
  },
  organicHeroArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicHeroBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#13BE9C',
    letterSpacing: 0.1,
  },

  // Primary Action in Image 2 Style
  organicActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: 'pointer',
  },
  organicArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#13BE9C',
    letterSpacing: 0.1,
  },

  // Secondary Card Actions matching Image 2 circular outline aesthetic
  organicActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: 'pointer',
  },
  organicIconCircleSecondary: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicActionTextSecondary: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },

  // Phlebotomist Call Button in Image 2 style
  organicCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#13BE9C',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  organicCallIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organicCallBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#13BE9C',
  },

  // Unified Controls Card Styles
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
    gap: 12,
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
  },
  searchAndSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchBar: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  sortTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    cursor: 'pointer',
  },
  sortTriggerBtnActive: {
    borderColor: '#13BE9C',
    backgroundColor: '#F0FDF9',
  },
  sortTriggerBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  familyFilterSection: {
    gap: 8,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterResetLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#13BE9C',
    cursor: 'pointer',
  },
  familyPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  familyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    cursor: 'pointer',
    userSelect: 'none',
  },
  familyPillActive: {
    backgroundColor: '#13BE9C',
    borderColor: '#13BE9C',
    boxShadow: '0 4px 12px rgba(19, 190, 156, 0.25)',
  },
  familyAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E6F8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyAvatarActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  familyAvatarInitial: {
    fontSize: 11,
    fontWeight: '800',
    color: '#13BE9C',
  },
  familyPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    userSelect: 'none',
  },
  familyPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  familyRelationPill: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  familyRelationPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  familyRelationPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  familyRelationPillTextActive: {
    color: '#FFFFFF',
  },
  familyCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  familyCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  familyCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  familyCountTextActive: {
    color: '#FFFFFF',
  },
  addMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#13BE9C',
    borderStyle: 'dashed',
    backgroundColor: '#F0FDF9',
    cursor: 'pointer',
  },
  addMemberPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#13BE9C',
  },
  categoryFilterSection: {
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    cursor: 'pointer',
    userSelect: 'none',
  },
  filterChipActive: {
    backgroundColor: '#13BE9C',
    borderColor: '#13BE9C',
    boxShadow: '0 2px 8px rgba(19, 190, 156, 0.2)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    userSelect: 'none',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusChipCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  statusChipCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  statusChipCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  statusChipCountTextActive: {
    color: '#FFFFFF',
  },
  patientRelationTag: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  patientRelationTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  popoverBackdrop: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  popoverCard: {
    position: 'absolute',
    top: 38,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    zIndex: 100,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.15), 0 4px 10px rgba(15, 23, 42, 0.08)',
  },
  filterPopoverCard: {
    width: 440,
    maxWidth: '92vw',
  },
  sortPopoverCard: {
    width: 320,
    maxWidth: '92vw',
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  popoverHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  popoverCloseBtn: {
    padding: 4,
    borderRadius: 6,
  },
  popoverSection: {
    marginBottom: 4,
  },
  popoverSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  popoverPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  popoverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  popoverPillSelectedNavy: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  popoverPillSelectedTeal: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  popoverPillSelectedGreen: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  popoverPillSelectedCoral: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  popoverPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  popoverPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  popoverFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  popoverClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  popoverClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  popoverApplyBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
  },
  popoverApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sortRadioList: {
    gap: 4,
  },
  sortRadioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sortRadioItemActive: {
    backgroundColor: '#F0FDF4',
  },
  sortRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sortRadioCircleActive: {
    borderColor: '#00B894',
  },
  sortRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00B894',
  },
  sortRadioLabel: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  sortRadioLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  activeChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  activeChipsHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 2,
  },
  activeChipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 3,
    borderRadius: 14,
    gap: 4,
  },
  activeChipPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  activeChipRemoveBtn: {
    padding: 2,
    borderRadius: 8,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
  },
  countBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  countBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00B894',
  },
  // Empty Booked Card
  emptyBookedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBookedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyBookedDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420,
  },
  // Booked Test Card (Compact Redesign)
  bookedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  cardTypePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBookingId: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  cardStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  cardStatusWrapCancelled: {
    backgroundColor: '#FEF2F2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardMainInfoCol: {
    flex: 1,
    minWidth: 260,
    gap: 3,
  },
  cardTestName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  cardProviderName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  cardLocationText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  homeVisitBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 6,
  },
  homeVisitBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00B894',
  },
  cardSchedulePriceCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scheduleTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleDateText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTimeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0D9488',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    gap: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  paymentSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00B894',
  },
  cardMetaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardPatientWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPatientText: {
    fontSize: 11.5,
    color: '#475569',
  },
  compactWarningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  compactPhlebBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  compactPhlebText: {
    fontSize: 11.5,
    color: '#166534',
  },
  compactCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactCallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    flexWrap: 'wrap',
    gap: 8,
  },
  referralHintText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardActionBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryViewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  primaryViewDetailsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryDirectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 7,
  },
  secondaryDirectionBtnText: {
    color: '#0D9488',
    fontSize: 12,
    fontWeight: '700',
  },
  moreActionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 7,
  },
  moreActionsBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  moreActionsBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  cardMenuBackdrop: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  cardDropdownMenu: {
    position: 'absolute',
    top: 32,
    right: 0,
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
    paddingVertical: 4,
    zIndex: 100,
  },
  cardMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  // Details Modal Directions Button
  detailsDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  detailsDirectionsBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Completed Report Card
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readyBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00B894',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D97706',
  },
  reportMainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  testName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  labRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  patientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  patientTagText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  sampleTypeText: {
    fontSize: 12,
    color: '#64748B',
  },
  impressionPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 6,
  },
  impressionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  impressionText: {
    fontSize: 12.5,
    color: '#0F172A',
    lineHeight: 18,
    fontWeight: '500',
  },
  datesPillar: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dateItem: {
    flexDirection: 'row',
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  fileSizeText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
  },
  parametersPreviewWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  parametersTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  parametersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  paramPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paramName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  paramValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  moreParamsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00B894',
  },
  reportActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 10,
  },
  accreditationText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  buttonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  viewReportBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  downloadReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  downloadReportBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processingIndicatorText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  // Modal Common Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 720,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reportModalLogo: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  reportModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  reportModalLab: {
    fontSize: 12,
    color: '#64748B',
  },
  modalCloseIcon: {
    padding: 4,
  },
  reportModalBody: {
    padding: 20,
  },
  patientReportCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  patientCol: {
    minWidth: 120,
  },
  prLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  prValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  radiologySection: {
    marginBottom: 16,
  },
  findingsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
  },
  findingsText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  tableHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  tableHCol: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableDCol: {
    fontSize: 12.5,
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  flagNormal: {
    backgroundColor: '#F0FDF4',
  },
  flagHigh: {
    backgroundColor: '#FEF3C7',
  },
  flagBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  doctorNotesBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  notesBody: {
    fontSize: 12.5,
    color: '#065F46',
    lineHeight: 18,
    fontWeight: '500',
  },
  signStampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  stampText: {
    fontSize: 11,
    color: '#00B894',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  // Slip Modal Box
  slipModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  slipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  slipBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00B894',
    letterSpacing: 0.5,
  },
  slipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  slipSub: {
    fontSize: 12,
    color: '#64748B',
  },
  slipBody: {
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  qrMockBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 8,
  },
  qrCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  qrRefText: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  slipGrid: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  slipGridItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slipGridLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  slipGridVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  slipNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    padding: 10,
  },
  slipNoticeText: {
    fontSize: 11.5,
    color: '#1E40AF',
    flex: 1,
  },
  // Reschedule & Cancel Modals
  rescheduleModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rescheduleSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rescheduleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  rescheduleOptionActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  rescheduleOptionText: {
    fontSize: 13,
    color: '#334155',
  },
  cancelModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    padding: 20,
  },
  alertCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  refundNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    marginBottom: 20,
  },
  refundNoticeText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
  },
  addMemberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  addMemberPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  modalInputText: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    marginTop: 6,
  },
  relationPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  relationPillActive: {
    borderColor: '#00B894',
    backgroundColor: '#E6F8F4',
  },
  relationPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  relationPillTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  genderMiniBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  genderMiniBtnActive: {
    borderColor: '#00B894',
    backgroundColor: '#E6F8F4',
  },
  genderMiniText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  genderMiniTextActive: {
    color: '#00B894',
    fontWeight: '700',
  },
  testCategorySubText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 6,
  },
  detailsModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  detailsModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsModalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailsModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  detailsModalBody: {
    padding: 22,
  },
  detailsHeroCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  detailsHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  serviceTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailsStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  detailsStatusText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803D',
  },
  detailsTestName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  detailsCategoryText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  detailsSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  detailsSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  detailsSectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGrid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailsGridCell: {
    width: '48%',
    minWidth: 180,
  },
  detailsCellLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailsCellVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailsPrepText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#334155',
  },
  detailsModalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  detailsSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  detailsSecondaryBtnText: {
    color: '#1E3A8A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  detailsRescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  detailsRescheduleBtnText: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '700',
  },
  detailsCancelBtn: {
    backgroundColor: '#FFF2ED',
    borderWidth: 1,
    borderColor: '#FFD7C7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  detailsCancelBtnText: {
    color: '#FF7F50',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
