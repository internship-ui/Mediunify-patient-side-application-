import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Platform,
  Linking,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebFooter from '../../../components/web/WebFooter';
import PaginationBar from '../../../components/web/PaginationBar';
import PatientPageBanner from '../../../components/web/PatientPageBanner';
import { showAlert } from '../../../utils/alert';
import { isGuestUser } from '../../../utils/authHelper';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';
import {
  getActivePatient,
  getPatientFamilyMembers,
  matchAppointmentToAccount,
  getPhysicalAppointments,
  savePhysicalAppointments,
} from '../../../data/patientDashboardData';
import {
  getSlotStatus,
  validateAndBookSlot,
  cancelBookedSlot,
  subscribeToSlotChanges,
} from '../../../services/slotBookingService';
import {
  getUserTimezone,
  getLocalDateString,
  addDaysToDate,
  formatAppointmentDateLabel,
  formatAppointmentDateTimeLabel,
  formatBookingDateLabel,
  getAppointmentDynamicStatus,
  getStatusBadgeConfig,
} from '../../../utils/appointmentDateUtils';
import { useTheme } from '../../../context/ThemeContext';

const STATUS_FILTERS = ['All', 'Upcoming', 'Today', 'Completed', 'Cancelled', 'Rescheduled'];
const ITEMS_PER_PAGE = 4;

export const renderSafeAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [
      addr.addressLine || addr.line1 || addr.address || addr.street,
      addr.landmark,
      addr.city,
      addr.state,
      addr.pincode ? `${addr.pincode}` : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (addr.name) return addr.name;
    try {
      const vals = Object.values(addr).filter((v) => typeof v === 'string' && v.trim().length > 0);
      return vals.join(', ') || 'Kuvempunagar, Mysuru';
    } catch (e) {
      return 'Kuvempunagar, Mysuru';
    }
  }
  return String(addr);
};

export const renderSafeText = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (val.addressLine || val.street || val.city) {
      return renderSafeAddress(val);
    }
    if (val.name) return String(val.name);
    if (val.label) return String(val.label);
    if (val.title) return String(val.title);
    try {
      const vals = Object.values(val).filter((v) => typeof v === 'string' && v.trim().length > 0);
      return vals.join(', ') || fallback;
    } catch (e) {
      return fallback;
    }
  }
  return String(val);
};

const MyAppointmentsScreenWeb = ({ navigation, route }) => {
  const { t, isIndic } = useTheme();
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);

  const [patient, setPatient] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('all');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'details' | 'reschedule' | 'cancel' | 'directions' | 'contact' | null
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Real-time Clock & Auto-Rollover State
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    // 1. Tick every 30 seconds to catch slot transitions in real time
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    // 2. Exact midnight trigger to automatically rollover Today/Tomorrow/Past at 00:00:01
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => {
      setCurrentTime(new Date());
      loadData();
    }, msUntilMidnight);

    return () => {
      clearInterval(interval);
      clearTimeout(midnightTimeout);
    };
  }, []);

  // Dynamic reschedule dates (Tomorrow + next 5 days) using user's local timezone
  const rescheduleDatesList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 6; i++) {
      list.push(getLocalDateString(addDaysToDate(currentTime, i)));
    }
    return list;
  }, [currentTime]);

  // Reschedule Form State
  const [newDate, setNewDate] = useState(() => {
    return getLocalDateString(addDaysToDate(new Date(), 1));
  });
  const [newTimeSlot, setNewTimeSlot] = useState('11:30 AM (Morning Slot)');
  const [rescheduleReason, setRescheduleReason] = useState('Work schedule conflict');

  // Real-time slot update ticker
  const [, setSlotTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeToSlotChanges(() => {
      setSlotTick((t) => t + 1);
    });
    return unsub;
  }, []);

  // Cancel Form State
  const [cancelReason, setCancelReason] = useState('Personal reasons / schedule clash');
  const [cancelRemarks, setCancelRemarks] = useState('');

  // Toast / notification
  const [toastMessage, setToastMessage] = useState('');

  const handleOpenDirections = (appt) => {
    if (!appt) return;
    if (appt.directionsUrl) {
      Linking.openURL(appt.directionsUrl);
      return;
    }
    let destination = '';
    if (appt.latitude && appt.longitude) {
      destination = `${appt.latitude},${appt.longitude}`;
    } else if (appt.address) {
      const facility = appt.facilityName || appt.providerName || appt.centerName || '';
      const addr = renderSafeAddress(appt.address);
      destination = encodeURIComponent(`${facility ? facility + ', ' : ''}${addr}`);
    } else {
      const full = [appt.facilityName || appt.providerName || appt.centerName, appt.city].filter(Boolean).join(', ');
      destination = encodeURIComponent(full || 'Diagnostic Centre');
    }
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    loadData();

    // 1. Navigation focus listener - updates automatically when returning to page
    const unsubscribeFocus = navigation?.addListener ? navigation.addListener('focus', () => {
      loadData();
    }) : null;

    // 2. Storage & custom event listeners for real-time auto-refresh without manual refresh
    const handleStorageChange = (e) => {
      if (!e || !e.key || e.key.includes('appointment')) {
        loadData();
      }
    };
    const handleApptUpdate = () => {
      loadData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('mediunify_appointments_updated', handleApptUpdate);
    }

    return () => {
      if (unsubscribeFocus) unsubscribeFocus();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('mediunify_appointments_updated', handleApptUpdate);
      }
    };
  }, [navigation]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await getActivePatient();
      setPatient(p);
      const fam = await getPatientFamilyMembers();
      setFamilyMembers(fam);
      const appts = await getPhysicalAppointments();
      setAppointments(appts);
    } catch (e) {
      console.warn('Error loading appointments:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to reliably resolve which family member an appointment belongs to
  const getApptMember = useCallback((appt) => {
    if (patient && Array.isArray(familyMembers) && familyMembers.length > 0) {
      const match = matchAppointmentToAccount(appt, patient, familyMembers);
      if (match?.member) return match.member;
    }
    const ptId = String(appt?.patientId || '').toLowerCase().trim();
    if (ptId && Array.isArray(familyMembers)) {
      const foundById = familyMembers.find((m) => String(m.id).toLowerCase() === ptId);
      if (foundById) return foundById;
    }
    const ptName = (typeof appt?.patient === 'string' ? appt.patient : (appt?.patient?.name || appt?.patientName || '')).toLowerCase();
    if (ptName && Array.isArray(familyMembers)) {
      const foundByName = familyMembers.find((m) => ptName.includes((m.name || '').toLowerCase()));
      if (foundByName) return foundByName;
    }

    const selfMember = Array.isArray(familyMembers) ? familyMembers.find((m) => m.id === 'self' || m.relation?.toLowerCase() === 'self') : null;
    return selfMember || { id: 'self', name: patient?.name || 'Self', relation: 'Self' };
  }, [patient, familyMembers]);

  // Dynamic appointment counts for each family member
  const familyMemberCounts = useMemo(() => {
    const counts = { all: 0 };
    if (!Array.isArray(familyMembers)) return counts;

    familyMembers.forEach((m) => {
      counts[m.id] = 0;
    });

    const physicalOnly = appointments.filter((item) => {
      if (item.serviceType?.toLowerCase().includes('video') || item.type?.toLowerCase().includes('video')) {
        return false;
      }
      if (patient && Array.isArray(familyMembers) && familyMembers.length > 0) {
        const match = matchAppointmentToAccount(item, patient, familyMembers);
        if (!match) return false;
      }
      return true;
    });

    counts.all = physicalOnly.length;

    physicalOnly.forEach((item) => {
      const mem = getApptMember(item);
      const mId = mem?.id || 'self';
      if (counts[mId] !== undefined) {
        counts[mId] += 1;
      } else {
        counts['self'] = (counts['self'] || 0) + 1;
      }
    });

    return counts;
  }, [appointments, patient, familyMembers, getApptMember]);

  // Dynamically calculated status counts from actual appointment data (respects selectedFamilyMember)
  const statusCounts = useMemo(() => {
    const counts = {
      All: 0,
      Upcoming: 0,
      Today: 0,
      Completed: 0,
      Cancelled: 0,
      Rescheduled: 0,
    };

    const physicalOnly = appointments.filter((item) => {
      if (item.serviceType?.toLowerCase().includes('video') || item.type?.toLowerCase().includes('video')) {
        return false;
      }
      if (patient && Array.isArray(familyMembers) && familyMembers.length > 0) {
        const match = matchAppointmentToAccount(item, patient, familyMembers);
        if (!match) return false;
      }
      if (selectedFamilyMember !== 'all') {
        const mem = getApptMember(item);
        if (mem?.id !== selectedFamilyMember) return false;
      }
      return true;
    });

    counts.All = physicalOnly.length;

    physicalOnly.forEach((appt) => {
      const dynamicStatus = getAppointmentDynamicStatus(appt, currentTime);
      if (dynamicStatus === 'Cancelled') {
        counts.Cancelled += 1;
      } else if (dynamicStatus === 'Completed') {
        counts.Completed += 1;
      } else if (dynamicStatus === 'Rescheduled') {
        counts.Rescheduled += 1;
        counts.Upcoming += 1;
      } else if (dynamicStatus === 'Today') {
        counts.Today += 1;
        counts.Upcoming += 1;
      } else if (dynamicStatus === 'Upcoming') {
        counts.Upcoming += 1;
      }
    });

    return counts;
  }, [appointments, currentTime, patient, familyMembers, selectedFamilyMember, getApptMember]);

  // Filtered Appointments (Strict Security Filtering for Logged-In User + Linked Family Members + Family Filter)
  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      // Exclude video calls if any leaked
      if (item.serviceType?.toLowerCase().includes('video') || item.type?.toLowerCase().includes('video')) {
        return false;
      }

      // Security check: verify this appointment strictly belongs to user or linked family member
      if (patient && Array.isArray(familyMembers) && familyMembers.length > 0) {
        const match = matchAppointmentToAccount(item, patient, familyMembers);
        if (!match) return false;
      }

      // Family member filter
      if (selectedFamilyMember !== 'all') {
        const mem = getApptMember(item);
        if (mem?.id !== selectedFamilyMember) {
          return false;
        }
      }

      const dynamicStatus = getAppointmentDynamicStatus(item, currentTime);

      // Status filter
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Upcoming') {
          if (dynamicStatus !== 'Upcoming' && dynamicStatus !== 'Today' && dynamicStatus !== 'Rescheduled') {
            return false;
          }
        } else if (selectedStatus === 'Today') {
          if (dynamicStatus !== 'Today') {
            return false;
          }
        } else if (selectedStatus === 'Completed') {
          if (dynamicStatus !== 'Completed') {
            return false;
          }
        } else if (selectedStatus === 'Cancelled') {
          if (dynamicStatus !== 'Cancelled') {
            return false;
          }
        } else if (selectedStatus === 'Rescheduled') {
          if (dynamicStatus !== 'Rescheduled') {
            return false;
          }
        }
      }

      // Search query (doctor, facility, department, ID, patient name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const docName = (item.doctor?.name || '').toLowerCase();
        const facility = (item.facilityName || '').toLowerCase();
        const dept = (item.department || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const city = (item.location || '').toLowerCase();
        const ptName = (typeof item.patient === 'string' ? item.patient : (item.patient?.name || item.patientName || '')).toLowerCase();
        return docName.includes(q) || facility.includes(q) || dept.includes(q) || id.includes(q) || city.includes(q) || ptName.includes(q);
      }

      return true;
    });
  }, [appointments, selectedStatus, selectedFamilyMember, searchQuery, patient, familyMembers, currentTime, getApptMember]);

  // Paginated Appointments (3-5 items per page)
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAppointments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  // Handle Cancel Appointment
  const handleConfirmCancel = async () => {
    if (!selectedAppt) return;

    cancelBookedSlot({
      date: selectedAppt.date,
      time: selectedAppt.time || selectedAppt.timeSlot,
      serviceType: selectedAppt.type || 'doctor',
      providerId: selectedAppt.doctor?.id || selectedAppt.doctor?.name || selectedAppt.facilityName || selectedAppt.clinicName,
    });

    const updated = appointments.map((a) => {
      if (a.id === selectedAppt.id) {
        const payStr = String(a.paymentStatus || '');
        const refundMsg = payStr.includes('Paid') ? `Refund Processing (₹${a.amount || 650})` : 'Payment Cancelled';
        return {
          ...a,
          status: 'Cancelled',
          isCancelled: true,
          isUpcoming: false,
          cancelReason: cancelReason + (cancelRemarks ? `: ${cancelRemarks}` : ''),
          cancelledAt: new Date().toISOString(),
          paymentStatus: refundMsg,
          address: renderSafeAddress(a.address),
        };
      }
      return a;
    });
    setAppointments(updated);
    await savePhysicalAppointments(updated);
    setActiveModal(null);
    showToast(`Appointment ${selectedAppt.id} cancelled successfully.`);
  };

  // Handle Reschedule Appointment
  const handleConfirmReschedule = async () => {
    if (!selectedAppt) return;

    const targetTime = newTimeSlot.split(' ')[0] + ' ' + newTimeSlot.split(' ')[1];
    const sType = selectedAppt.type || 'doctor';
    const pId = selectedAppt.doctor?.id || selectedAppt.doctor?.name || selectedAppt.facilityName || selectedAppt.clinicName;

    const slotValidation = await validateAndBookSlot({
      date: newDate,
      time: targetTime,
      serviceType: sType,
      providerId: pId,
      bookingDetails: {
        appointmentId: selectedAppt.id,
        patientName: selectedAppt.patientName,
      },
    });

    if (!slotValidation.success) {
      showToast(slotValidation.message || 'This slot is no longer available. Please select another time.');
      return;
    }

    cancelBookedSlot({
      date: selectedAppt.date,
      time: selectedAppt.time || selectedAppt.timeSlot,
      serviceType: sType,
      providerId: pId,
    });

    const updated = appointments.map((a) => {
      if (a.id === selectedAppt.id) {
        return {
          ...a,
          date: newDate,
          formattedDate: newDate,
          time: targetTime,
          timeSlot: newTimeSlot,
          timezone: getUserTimezone(),
          status: 'Rescheduled',
          isRescheduled: true,
          isUpcoming: true,
          rescheduledAt: new Date().toISOString(),
          instructions: `Rescheduled to ${formatAppointmentDateTimeLabel(newDate, targetTime, currentTime)}. Reason: ${rescheduleReason}`,
        };
      }
      return a;
    });
    setAppointments(updated);
    await savePhysicalAppointments(updated);
    setActiveModal(null);
    showToast(`Appointment ${selectedAppt.id} rescheduled to ${formatAppointmentDateTimeLabel(newDate, targetTime, currentTime)}.`);
  };

  const getStatusBadgeStyle = (status) => {
    return getStatusBadgeConfig(status);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
            title={t('booking.my_appointments', 'My Appointments')}
            subtitle={t('Manage your in-person clinic and hospital appointments.')}
            badgeText={t('In-Person Visits')}
            badgeIcon="business"
            iconName="calendar"
            theme="teal"
            pills={[
              {
                label: `${t('booking.upcoming', 'Upcoming')}: ${statusCounts.Upcoming} ${t('Visits')}`,
                bgColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                textColor: '#008B94',
                icon: 'checkmark-circle',
              },
              {
                label: `${t('Today')}: ${statusCounts.Today}`,
                bgColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                textColor: '#1E3A8A',
                icon: 'today-outline',
              },
              {
                label: `${t('booking.completed', 'Completed')}: ${statusCounts.Completed}`,
                bgColor: '#EBF8E7',
                borderColor: '#C2EDB7',
                textColor: '#15803D',
                icon: 'time-outline',
              },
            ]}
            rightContent={
              <TouchableOpacity
                style={styles.organicHeroBtn}
                onPress={() => navigation?.navigate('DoctorList')}
                activeOpacity={0.85}
              >
                <View style={styles.organicHeroArrowCircle}>
                  <Ionicons name="arrow-forward" size={13} color="#13BE9C" />
                </View>
                <Text style={styles.organicHeroBtnText}>{t('doctors.book_in_clinic', 'Book In-Clinic Visit')}</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <View style={[styles.innerContainer, { paddingTop: 6, paddingBottom: 60 }]}>

          {/* Redesigned Search & Filter Controls */}
          <View style={styles.controlsCard}>
            {/* 1. Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#13BE9C" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('Search by clinic, hospital, doctor name, department, or appointment ID...')}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* 2. Family Members Filter Row (Sleek Single-Line Pills) */}
            {Array.isArray(familyMembers) && familyMembers.length > 0 && (
              <View style={styles.familyFilterSection}>
                <View style={styles.filterSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="people-outline" size={15} color="#13BE9C" />
                    <Text style={[styles.filterSectionTitle, isIndic && { lineHeight: 18 }]}>
                      {t('Family Members')}
                    </Text>
                  </View>
                  {selectedFamilyMember !== 'all' && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedFamilyMember('all');
                        setCurrentPage(1);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterResetLink, isIndic && { lineHeight: 16 }]}>
                        {t('Reset to All')}
                      </Text>
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
                    onPress={() => {
                      setSelectedFamilyMember('all');
                      setCurrentPage(1);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.familyAvatar, selectedFamilyMember === 'all' && styles.familyAvatarActive]}>
                      <Ionicons name="people" size={12} color={selectedFamilyMember === 'all' ? '#FFFFFF' : '#13BE9C'} />
                    </View>
                    <Text style={[styles.familyPillText, selectedFamilyMember === 'all' && styles.familyPillTextActive, isIndic && { lineHeight: 16 }]}>
                      {t('All Members')}
                    </Text>
                    <View style={[styles.familyCountBadge, selectedFamilyMember === 'all' && styles.familyCountBadgeActive]}>
                      <Text style={[styles.familyCountText, selectedFamilyMember === 'all' && styles.familyCountTextActive]}>
                        {familyMemberCounts.all || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Individual Family Members */}
                  {familyMembers.map((member) => {
                    const isSelected = selectedFamilyMember === member.id;
                    const count = familyMemberCounts[member.id] || 0;
                    const relation = member.relation || (member.id === 'self' ? 'Self' : 'Family');
                    const initial = (member.name || 'M').charAt(0).toUpperCase();

                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.familyPill, isSelected && styles.familyPillActive]}
                        onPress={() => {
                          setSelectedFamilyMember(member.id);
                          setCurrentPage(1);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.familyAvatar, isSelected && styles.familyAvatarActive]}>
                          <Text style={[styles.familyAvatarInitial, isSelected && { color: '#FFFFFF' }]}>
                            {initial}
                          </Text>
                        </View>
                        <Text style={[styles.familyPillText, isSelected && styles.familyPillTextActive, isIndic && { lineHeight: 16 }]}>
                          {member.name}
                        </Text>
                        <View style={[styles.familyRelationPill, isSelected && styles.familyRelationPillActive]}>
                          <Text style={[styles.familyRelationPillText, isSelected && styles.familyRelationPillTextActive]}>
                            {relation}
                          </Text>
                        </View>
                        <View style={[styles.familyCountBadge, isSelected && styles.familyCountBadgeActive]}>
                          <Text style={[styles.familyCountText, isSelected && styles.familyCountTextActive]}>
                            {count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 3. Status Filter Tabs */}
            <View style={styles.statusFilterSection}>
              <View style={styles.filterSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="funnel-outline" size={14} color="#13BE9C" />
                  <Text style={[styles.filterSectionTitle, isIndic && { lineHeight: 18 }]}>
                    {t('Filter by Status')}
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipRow}
              >
                {STATUS_FILTERS.map((status) => {
                  const count = statusCounts[status] ?? 0;
                  const active = selectedStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      accessibilityRole="button"
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => {
                        setSelectedStatus(status);
                        setCurrentPage(1);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive, isIndic && { lineHeight: 16 }]}>
                        {t(status, status)}
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

          {/* Appointments List */}
          {isGuestMode ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#E6F8F4' }]}>
                <Ionicons name="calendar-outline" size={42} color="#00B894" />
              </View>
              <Text style={[styles.emptyTitle, isIndic && { lineHeight: 22 }]}>{t('auth.login_required', 'Login to view your appointments')}</Text>
              <Text style={[styles.emptyDesc, isIndic && { lineHeight: 18 }]}>
                {t('Please sign in to access your upcoming consultations, in-clinic visits, and medical prescriptions.')}
              </Text>
              <TouchableOpacity
                style={[styles.bookDoctorBtn, { marginTop: 18, alignSelf: 'center', paddingHorizontal: 32 }]}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                  }
                  navigation?.navigate('Login', { openAuthModal: true });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.bookDoctorBtnText}>{t('auth.login', 'Login')}</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B894" />
              <Text style={[styles.loadingText, isIndic && { lineHeight: 18 }]}>{t('common.loading', 'Fetching your physical appointments...')}</Text>
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={42} color="#94A3B8" />
              </View>
              <Text style={[styles.emptyTitle, isIndic && { lineHeight: 22 }]}>{t('booking.no_appointments_found', 'No appointments found for you or your family members.')}</Text>
              <Text style={[styles.emptyDesc, isIndic && { lineHeight: 18 }]}>
                {searchQuery || selectedStatus !== 'All' || selectedFamilyMember !== 'all'
                  ? t('No physical visits match your search criteria. Try resetting filters.')
                  : t('Appointments booked by you or for your linked family members will appear here.')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                {(searchQuery || selectedStatus !== 'All' || selectedFamilyMember !== 'all') && (
                  <TouchableOpacity
                    style={styles.resetFilterBtn}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedStatus('All');
                      setSelectedFamilyMember('all');
                      setCurrentPage(1);
                    }}
                  >
                    <Text style={[styles.resetFilterBtnText, isIndic && { lineHeight: 16 }]}>{t('common.clear_all', 'Clear Filters')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.organicHeroBtn}
                  onPress={() => navigation?.navigate('DoctorList')}
                  activeOpacity={0.85}
                >
                  <View style={styles.organicHeroArrowCircle}>
                    <Ionicons name="arrow-forward" size={13} color="#13BE9C" />
                  </View>
                  <Text style={[styles.organicHeroBtnText, isIndic && { lineHeight: 18 }]}>{t('doctors.book_in_clinic', 'Book In-Clinic Visit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.appointmentList}>
              {paginatedAppointments.map((appt) => {
                const dynamicStatus = getAppointmentDynamicStatus(appt, currentTime);
                const badge = getStatusBadgeConfig(dynamicStatus);
                const isUpcomingVisit = dynamicStatus === 'Upcoming' || dynamicStatus === 'Today' || dynamicStatus === 'Rescheduled';
                const dynamicDateLabel = formatAppointmentDateLabel(appt.date, currentTime);
                const bookingDateLabel = formatBookingDateLabel(appt.bookingDate);

                return (
                  <View key={appt.id} style={[styles.apptCard, isUpcomingVisit && styles.apptCardHighlight]}>
                    {/* Top Status Header */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.idBadgeGroup}>
                        <Text style={styles.apptIdText}>{appt.id}</Text>
                        <View style={styles.typeBadge}>
                          <Ionicons name="business-outline" size={12} color="#13BE9C" style={{ marginRight: 4 }} />
                          <Text style={styles.typeBadgeText}>{appt.serviceType}</Text>
                        </View>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Ionicons name={badge.icon} size={14} color={badge.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{dynamicStatus}</Text>
                      </View>
                    </View>

                    {/* Facility & Doctor Info */}
                    <View style={styles.cardMainRow}>
                      {appt.doctor?.image ? (
                        <Image source={{ uri: appt.doctor.image }} style={styles.doctorImg} />
                      ) : (
                        <View style={styles.facilityAvatar}>
                          <Ionicons name="medical" size={24} color="#13BE9C" />
                        </View>
                      )}

                      <View style={{ flex: 1, minWidth: 260 }}>
                        <Text style={styles.facilityName}>{appt.facilityName}</Text>
                        {appt.doctor?.name && (
                          <Text style={styles.doctorName}>
                            {appt.doctor.name}
                            {appt.doctor.specialty ? (
                              <Text style={styles.doctorSpecialty}> • {appt.doctor.specialty}</Text>
                            ) : null}
                          </Text>
                        )}
                        {/* Only show department if distinct from doctor specialty */}
                        {appt.department && (!appt.doctor?.specialty || appt.department.trim().toLowerCase() !== appt.doctor.specialty.trim().toLowerCase()) ? (
                          <Text style={styles.departmentName}>{appt.department}</Text>
                        ) : null}

                        {/* Location / Address (clean 1-line) */}
                        <View style={styles.addressRow}>
                          <Ionicons name="location-outline" size={13} color="#94A3B8" style={{ marginRight: 4, marginTop: 1 }} />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {renderSafeAddress(appt.address)}
                          </Text>
                        </View>
                      </View>

                      {/* Prominent Date & Time Pillar (No duplicate time) */}
                      <View style={[styles.dateTimePillar, isUpcomingVisit && styles.dateTimePillarUpcoming]}>
                        <View style={styles.dateRow}>
                          <Ionicons name="calendar" size={15} color={isUpcomingVisit ? '#13BE9C' : '#0F172A'} style={{ marginRight: 6 }} />
                          <Text style={[styles.dateText, isUpcomingVisit && { color: '#13BE9C' }]}>{dynamicDateLabel}</Text>
                        </View>
                        <View style={styles.timeRow}>
                          <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.timeText}>{appt.timeSlot || appt.time}</Text>
                        </View>
                        <View style={styles.paymentPill}>
                          <Text style={styles.paymentPillText}>{appt.paymentStatus}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Patient & Instructions banner */}
                    <View style={styles.patientMetaRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Ionicons name="person-outline" size={13} color="#64748B" style={{ marginRight: 2 }} />
                        <Text style={[styles.patientMetaText, isIndic && { lineHeight: 16 }]}>
                          {t('doctors.patient_details', 'Patient:')}{' '}
                          <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                            {typeof appt.patient === 'string'
                              ? appt.patient
                              : (appt.patient?.name || appt.patientName || patient?.name || 'Hemanth Gowda')}
                          </Text>
                        </Text>
                        {(() => {
                          const mem = getApptMember(appt);
                          if (mem && mem.relation) {
                            const isSelf = mem.relation.toLowerCase() === 'self' || mem.id === 'self';
                            return (
                              <View style={[styles.patientRelationBadge, isSelf && styles.patientRelationBadgeSelf]}>
                                <Text style={[styles.patientRelationBadgeText, isSelf && styles.patientRelationBadgeTextSelf]}>
                                  {mem.relation}
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                      <Text style={[styles.bookingDateText, isIndic && { lineHeight: 14 }]}>{t('Booked on:')} {bookingDateLabel}</Text>
                    </View>

                    {/* Action Buttons Row matching Image 2 (Circular Outline Arrow + Bold Action Text in #13BE9C) */}
                    <View style={styles.actionBtnRow}>
                      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Image 2 Primary Action: Circular Arrow & Book Again */}
                        <TouchableOpacity
                          style={styles.organicBookNowBtn}
                          onPress={() => navigation?.navigate('DoctorList')}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicArrowCircle}>
                            <Ionicons name="arrow-forward" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicBookNowText}>{t('Book Again')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => {
                            setSelectedAppt(appt);
                            setActiveModal('details');
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicActionIconCircle}>
                            <Ionicons name="document-text-outline" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicActionText}>{t('common.view_details', 'View Details')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => {
                            setSelectedAppt(appt);
                            setActiveModal('directions');
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicActionIconCircle}>
                            <Ionicons name="navigate-outline" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicActionText}>{t('booking.view_directions', 'View Directions')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => {
                            setSelectedAppt(appt);
                            setActiveModal('contact');
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicActionIconCircle}>
                            <Ionicons name="call-outline" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicActionText}>{t('Contact Centre')}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Reschedule & Cancel actions (available for active/upcoming) */}
                      {isUpcomingVisit && (
                        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => {
                              setSelectedAppt(appt);
                              setActiveModal('reschedule');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.organicActionIconCircle, { borderColor: '#F59E0B' }]}>
                              <Ionicons name="calendar-outline" size={12} color="#D97706" />
                            </View>
                            <Text style={[styles.organicActionText, { color: '#D97706' }]}>{t('booking.reschedule_btn', 'Reschedule')}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => {
                              setSelectedAppt(appt);
                              setActiveModal('cancel');
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.organicActionIconCircle, { borderColor: '#EF4444' }]}>
                              <Ionicons name="close-circle-outline" size={12} color="#DC2626" />
                            </View>
                            <Text style={[styles.organicActionText, { color: '#DC2626' }]}>{t('common.cancel', 'Cancel')}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              <PaginationBar
                currentPage={currentPage}
                totalItems={filteredAppointments.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                itemLabel="appointments"
              />
            </View>
          )}
        </View>

        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* =========================================================
          MODALS
      ========================================================= */}

      {/* 1. VIEW DETAILS MODAL */}
      <Modal visible={activeModal === 'details'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Appointment Slip</Text>
                <Text style={styles.modalSubtitle}>ID: {selectedAppt?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* Status Callout */}
                <View style={[styles.modalStatusBanner, { backgroundColor: getStatusBadgeConfig(getAppointmentDynamicStatus(selectedAppt, currentTime)).bg }]}>
                  <Ionicons
                    name={getStatusBadgeConfig(getAppointmentDynamicStatus(selectedAppt, currentTime)).icon}
                    size={20}
                    color={getStatusBadgeConfig(getAppointmentDynamicStatus(selectedAppt, currentTime)).text}
                  />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: getStatusBadgeConfig(getAppointmentDynamicStatus(selectedAppt, currentTime)).text }}>
                      Status: {getAppointmentDynamicStatus(selectedAppt, currentTime)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#475569' }}>Payment: {selectedAppt?.paymentStatus}</Text>
                  </View>
                </View>

                {/* Patient Information */}
                <Text style={styles.modalSectionHeading}>Patient Details</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Patient Name:</Text>
                  <Text style={styles.infoVal}>
                    {typeof selectedAppt?.patient === 'string'
                      ? selectedAppt.patient
                      : (selectedAppt?.patient?.name || selectedAppt?.patientName || patient?.name || 'Hemanth Gowda')}
                  </Text>
                </View>
                {selectedAppt?.patient?.relation && selectedAppt.patient.relation.toLowerCase() !== 'self' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Relationship:</Text>
                    <Text style={styles.infoVal}>{selectedAppt.patient.relation}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age & Gender:</Text>
                  <Text style={styles.infoVal}>{selectedAppt?.patient?.age || selectedAppt?.age || 28} Yrs, {selectedAppt?.patient?.gender || selectedAppt?.gender || 'Male'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Visit Reason:</Text>
                  <Text style={styles.infoVal}>{renderSafeText(selectedAppt?.patient?.reason || selectedAppt?.reason, 'Routine Health Consultation')}</Text>
                </View>

                {/* Facility Details */}
                <Text style={[styles.modalSectionHeading, { marginTop: 14 }]}>Clinic / Hospital Details</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Facility:</Text>
                  <Text style={styles.infoVal}>{renderSafeText(selectedAppt?.facilityName, 'MediUnify Partner Clinic')}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Department:</Text>
                  <Text style={styles.infoVal}>{renderSafeText(selectedAppt?.department, 'Specialist Care')}</Text>
                </View>
                {selectedAppt?.doctor?.name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Doctor:</Text>
                    <Text style={styles.infoVal}>{selectedAppt.doctor.name} ({selectedAppt.doctor.specialty})</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoVal}>{renderSafeAddress(selectedAppt?.address)}</Text>
                </View>

                {/* Date & Time */}
                <Text style={[styles.modalSectionHeading, { marginTop: 14 }]}>Appointment Slot</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Scheduled Date:</Text>
                  <Text style={[styles.infoVal, { fontWeight: '700', color: '#00B894' }]}>
                    {formatAppointmentDateTimeLabel(selectedAppt?.date, selectedAppt?.time, currentTime)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Time Slot:</Text>
                  <Text style={styles.infoVal}>{selectedAppt?.timeSlot || selectedAppt?.time}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Booked on:</Text>
                  <Text style={styles.infoVal}>{formatBookingDateLabel(selectedAppt?.bookingDate)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Timezone:</Text>
                  <Text style={styles.infoVal}>{selectedAppt?.timezone || getUserTimezone()}</Text>
                </View>

                {/* Preparation Instructions */}
                {selectedAppt?.instructions && (
                  <View style={styles.instructionsBox}>
                    <Ionicons name="information-circle" size={18} color="#0369A1" style={{ marginRight: 6 }} />
                    <Text style={styles.instructionsText}>{selectedAppt.instructions}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setActiveModal(null);
                  showToast('Appointment slip ready for print.');
                }}
              >
                <Ionicons name="print-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Print / Download Slip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. RESCHEDULE MODAL */}
      <Modal visible={activeModal === 'reschedule'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reschedule Appointment</Text>
                <Text style={styles.modalSubtitle}>
                  Current: {formatAppointmentDateTimeLabel(selectedAppt?.date, selectedAppt?.time, currentTime)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Select New Date</Text>
              <View style={styles.datePickerRow}>
                {rescheduleDatesList.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dateChoiceBtn, newDate === d && styles.dateChoiceBtnActive]}
                    onPress={() => setNewDate(d)}
                  >
                    <Text style={[styles.dateChoiceText, newDate === d && styles.dateChoiceTextActive]}>
                      {formatAppointmentDateLabel(d, currentTime)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Select Available Slot</Text>
              <View style={{ gap: 8 }}>
                {[
                  '10:00 AM (Morning Slot)',
                  '11:30 AM (Morning Slot)',
                  '02:30 PM (Afternoon Slot)',
                  '04:45 PM (Evening Slot)',
                ].map((s) => {
                  const sTime = s.split(' ')[0] + ' ' + s.split(' ')[1];
                  const slotStatus = getSlotStatus({
                    date: newDate,
                    time: sTime,
                    serviceType: selectedAppt?.type || 'doctor',
                    providerId: selectedAppt?.doctor?.id || selectedAppt?.doctor?.name || selectedAppt?.facilityName || selectedAppt?.clinicName,
                  });
                  const isAvailable = slotStatus.available;
                  const isSelected = newTimeSlot === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.slotChoiceBtn,
                        isSelected && styles.slotChoiceBtnActive,
                        !isAvailable && { opacity: 0.55, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
                      ]}
                      disabled={!isAvailable}
                      onPress={() => setNewTimeSlot(s)}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={isSelected ? '#00B894' : isAvailable ? '#94A3B8' : '#CBD5E1'}
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={[
                          styles.slotChoiceText,
                          isSelected && { color: '#00B894', fontWeight: '700' },
                          !isAvailable && { color: '#94A3B8', textDecorationLine: 'line-through' },
                        ]}
                      >
                        {s}
                      </Text>
                      {!isAvailable && (
                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' }}>
                            {slotStatus.status === 'PASSED' ? 'Passed' : 'Booked'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Reason for Rescheduling</Text>
              <TextInput
                style={styles.modalInput}
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                placeholder="e.g. Schedule clash, unwell, doctor advice..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleConfirmReschedule}>
                <Text style={styles.modalPrimaryBtnText}>Confirm Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. CANCEL APPOINTMENT MODAL */}
      <Modal visible={activeModal === 'cancel'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Cancel In-Person Visit</Text>
                <Text style={styles.modalSubtitle}>ID: {selectedAppt?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.alertWarning}>
                <Ionicons name="alert-circle" size={18} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={styles.alertWarningText}>
                  Any online consultation fee paid will be automatically refunded to your original payment method within 2-4 business days.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Reason for Cancellation</Text>
              {[
                'Personal reasons / schedule clash',
                'Patient recovered / symptoms resolved',
                'Doctor recommended different test/visit',
                'Booked another date or facility',
              ].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.slotChoiceBtn, cancelReason === r && styles.slotChoiceBtnActive]}
                  onPress={() => setCancelReason(r)}
                >
                  <Ionicons
                    name={cancelReason === r ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={cancelReason === r ? '#EF4444' : '#94A3B8'}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.slotChoiceText, cancelReason === r && { color: '#EF4444', fontWeight: '700' }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Additional Remarks (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                value={cancelRemarks}
                onChangeText={setCancelRemarks}
                placeholder="Optional notes for hospital administration..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelBtnText}>Keep Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: '#EF4444' }]} onPress={handleConfirmCancel}>
                <Text style={styles.modalPrimaryBtnText}>Yes, Cancel Appointment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. DIRECTIONS MODAL */}
      <Modal visible={activeModal === 'directions'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Facility Location & Navigation</Text>
                <Text style={styles.modalSubtitle}>{selectedAppt?.facilityName}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.mapPreviewBox}>
                <Ionicons name="map" size={40} color="#00B894" />
                <Text style={{ fontWeight: '700', color: '#1E3A8A', marginTop: 8 }}>
                  {renderSafeText(selectedAppt?.facilityName, 'Medical Centre')}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                  {renderSafeAddress(selectedAppt?.address)}
                </Text>
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={12} color="#00B894" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#00B894' }}>Approx 4.8 km from your saved address</Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 12 }}>
                Parking: On-site multi-level parking available for patients. Show your appointment token for priority barrier access.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  handleOpenDirections(selectedAppt);
                }}
              >
                <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. CONTACT CENTRE MODAL */}
      <Modal visible={activeModal === 'contact'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Contact Centre</Text>
                <Text style={styles.modalSubtitle}>{selectedAppt?.facilityName}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.contactItem}>
                <View style={styles.contactIconWrap}>
                  <Ionicons name="call" size={20} color="#00B894" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactTitle}>Front Desk & Appointments Desk</Text>
                  <Text style={styles.contactSubtitle}>{selectedAppt?.phone || '+91 80 4342 0100'}</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>Available 7:00 AM - 9:00 PM</Text>
                </View>
                <TouchableOpacity
                  style={styles.callNowBtn}
                  onPress={() => Linking.openURL(`tel:${selectedAppt?.phone || '+918043420100'}`)}
                >
                  <Text style={styles.callNowBtnText}>Call Now</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.contactItem}>
                <View style={[styles.contactIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="logo-whatsapp" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactTitle}>WhatsApp Care Concierge</Text>
                  <Text style={styles.contactSubtitle}>Instant route directions & parking assistance</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>Automated AI & Human Support</Text>
                </View>
                <TouchableOpacity
                  style={[styles.callNowBtn, { backgroundColor: '#16A34A' }]}
                  onPress={() => Linking.openURL('https://wa.me/918043420100')}
                >
                  <Text style={styles.callNowBtnText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MyAppointmentsScreenWeb;

const styles = StyleSheet.create({
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
    color: '#0C3B6B',
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
  hospitalBadgePill: {
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
  statsPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCEAE4',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    boxShadow: '0 2px 10px rgba(12, 59, 107, 0.06)',
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00B894',
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 20,
    gap: 14,
    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  familyFilterSection: {
    gap: 8,
  },
  statusFilterSection: {
    gap: 8,
    paddingTop: 4,
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
    gap: 10,
    paddingVertical: 2,
  },
  familyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 20,
  },
  resetFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  resetFilterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  bookDoctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  bookDoctorBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appointmentList: {
    gap: 16,
  },
  apptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 22,
    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
    transition: 'all 0.25s ease',
  },
  apptCardHighlight: {
    borderColor: '#13BE9C',
    borderLeftWidth: 5,
    borderLeftColor: '#13BE9C',
    boxShadow: '0 8px 25px -4px rgba(19, 190, 156, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.05)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  idBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  apptIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#13BE9C',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
    flexWrap: 'wrap',
  },
  facilityAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#E2E8F0',
  },
  facilityName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  doctorName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#13BE9C',
    marginTop: 3,
  },
  doctorSpecialty: {
    fontWeight: '500',
    color: '#64748B',
  },
  departmentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    maxWidth: 520,
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  dateTimePillar: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minWidth: 190,
    alignItems: 'flex-start',
    gap: 5,
  },
  dateTimePillarUpcoming: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  paymentPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 2,
  },
  paymentPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#13BE9C',
  },
  patientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  patientMetaText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  patientRelationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: 2,
  },
  patientRelationBadgeSelf: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  patientRelationBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#13BE9C',
  },
  patientRelationBadgeTextSelf: {
    color: '#1E3A8A',
  },
  bookingDateText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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

  // Primary Action in Image 2 Style (no bulky outer container box)
  organicBookNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: 'pointer',
  },
  organicArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.8,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicBookNowText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#13BE9C',
    letterSpacing: 0.1,
  },

  // Secondary Card Actions matching Image 2 circular outline aesthetic
  organicActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: 'pointer',
  },
  organicActionIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#13BE9C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  organicActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  // Legacy Action Buttons Support
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#E6F8F4',
  },
  directionsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  rescheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
  },
  rescheduleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEE2E2',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseIcon: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalSectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: 320,
    textAlign: 'right',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  dateChoiceBtnActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  dateChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dateChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  slotChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  slotChoiceBtnActive: {
    borderColor: '#A7F3D0',
    backgroundColor: '#E6F8F4',
  },
  slotChoiceText: {
    fontSize: 13,
    color: '#334155',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  alertWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  alertWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  mapPreviewBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  contactIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6F8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  callNowBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
