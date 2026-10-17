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
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../../theme/colors';
import {
  getActivePatient,
  getOnlineConsultations,
  saveOnlineConsultations,
  isVideoConsultationActive,
} from '../../../data/patientDashboardData';
import { cancelBookedSlot } from '../../../services/slotBookingService';
import { showAlert } from '../../../utils/alert';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const CONSULTATION_TABS = ['Upcoming', 'Completed', 'Cancelled'];

const MyOnlineConsultationsScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 600;
  const maxContentWidth = 780;

  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected consultation for Details Modal
  const [viewingConsultation, setViewingConsultation] = useState(null);

  // Quick toast message
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    loadData();

    // 1. Navigation focus listener - updates automatically when returning to page
    const unsubscribeFocus = navigation?.addListener
      ? navigation.addListener('focus', () => {
          loadData();
        })
      : null;

    // 2. Real-time 15-second clock ticker to automatically enable "Join Video Call" as slot time arrives
    const clockInterval = setInterval(() => {
      setConsultations((prev) =>
        prev.map((c) => ({
          ...c,
          canJoinNow: isVideoConsultationActive(c),
        }))
      );
    }, 15000);

    return () => {
      if (unsubscribeFocus) unsubscribeFocus();
      clearInterval(clockInterval);
    };
  }, [navigation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await getActivePatient();
      setPatient(p);
      const items = await getOnlineConsultations();
      // Ensure real-time time-slot activation check is executed
      const verified = items.map((c) => ({
        ...c,
        canJoinNow: isVideoConsultationActive(c),
      }));
      setConsultations(verified);
    } catch (e) {
      console.warn('Error loading online consultations:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered consultations based on Tab & Search Query
  const filteredConsultations = useMemo(() => {
    return consultations.filter((item) => {
      // Tab filter
      if (item.status !== activeTab) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const doc = (item.doctor?.name || '').toLowerCase();
        const spec = (item.doctor?.specialty || '').toLowerCase();
        const clinic = (item.doctor?.clinicName || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const room = (item.meetingRoomId || item.tokenNumber || '').toLowerCase();
        return (
          doc.includes(q) ||
          spec.includes(q) ||
          clinic.includes(q) ||
          id.includes(q) ||
          room.includes(q)
        );
      }

      return true;
    });
  }, [consultations, activeTab, searchQuery]);

  // Counts for each tab
  const tabCounts = useMemo(() => {
    return {
      Upcoming: consultations.filter((c) => c.status === 'Upcoming').length,
      Completed: consultations.filter((c) => c.status === 'Completed').length,
      Cancelled: consultations.filter((c) => c.status === 'Cancelled').length,
    };
  }, [consultations]);

  // Handle Joining Video Meeting Screen
  const handleJoinVideoCall = (item) => {
    const isReady = item.canJoinNow || isVideoConsultationActive(item);
    if (isReady) {
      navigation.navigate('VideoMeeting', {
        appointment: item,
        doctor: item.doctor,
        consultationId: item.id,
      });
    } else {
      showAlert(
        'Video Room Locked',
        `Your consultation room with ${item.doctor?.name || 'Doctor'} will automatically activate 10 minutes before your scheduled slot (${item.time || item.timeSlot}).\n\nPlease check back at your appointment time.`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // Handle Cancelling a Consultation
  const handleCancelConsultation = (item) => {
    if (!item) return;
    showAlert(
      'Cancel Online Consultation',
      `Are you sure you want to cancel your video appointment with ${item.doctor?.name || 'Doctor'} on ${item.date} at ${item.time || item.timeSlot}?\n\nAny consultation fee paid (₹${item.fee || item.paidAmount || 450}) will be automatically refunded to your original payment method.`,
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBookedSlot({
                date: item.date,
                time: item.time || item.timeSlot,
                serviceType: 'video',
                providerId: item.doctor?.id || item.doctor?.name || 'doctor',
              });

              const updated = consultations.map((c) => {
                if (c.id === item.id) {
                  return {
                    ...c,
                    status: 'Cancelled',
                    cancelledAt: new Date().toISOString(),
                    paymentStatus: `Refund Processing (₹${item.fee || item.paidAmount || 450})`,
                  };
                }
                return c;
              });

              setConsultations(updated);
              await saveOnlineConsultations(updated);
              showToast(`Consultation ${item.id} cancelled. Refund processing.`);
            } catch (err) {
              console.warn('Error cancelling appointment:', err);
              showToast('Error cancelling appointment. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {/* ==================================================
          TOAST NOTIFICATION (Float top)
      ================================================== */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* ==================================================
          MOBILE APP HEADER BAR
      ================================================== */}
      <View style={[styles.headerBar, isTablet && styles.tabletContainerWidth]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : "#0F172A"} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              My Online Consultations
            </Text>
            <View style={styles.liveHeaderDot} />
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            HD TeleHealth Video Appointments
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookNewBtn}
          activeOpacity={0.82}
          onPress={() => navigation.navigate('VideoConsultation')}
        >
          <Ionicons name="videocam" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.bookNewBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.tabletContainerWidth,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================
            QUICK STATS SUMMARY BANNER
        ================================================== */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryLeft}>
            <View style={styles.summaryPill}>
              <Ionicons name="shield-checkmark" size={12} color="#007D69" />
              <Text style={styles.summaryPillText}>256-BIT ENCRYPTED TELEHEALTH</Text>
            </View>
            <Text style={styles.summaryTitle}>Private Video Consultations</Text>
            <Text style={styles.summaryDesc}>
              Connect directly with certified specialists from anywhere.
            </Text>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{tabCounts.Upcoming}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#0369A1' }]}>{tabCounts.Completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            SEGMENTED TABS (Upcoming, Completed, Cancelled)
        ================================================== */}
        <View style={styles.tabsRow}>
          {CONSULTATION_TABS.map((tab) => {
            const active = activeTab === tab;
            const count = tabCounts[tab] || 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {tab}
                </Text>
                <View style={[styles.tabCountBadge, active && styles.tabCountBadgeActive]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ==================================================
            SEARCH BAR
        ================================================== */}
        <View style={styles.searchBarBox}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by doctor, specialty, or booking ID..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ==================================================
            CONSULTATIONS LIST / EMPTY / LOADING
        ================================================== */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007D69" />
            <Text style={styles.loadingText}>Loading video consultations...</Text>
          </View>
        ) : filteredConsultations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="videocam-off-outline" size={38} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} consultations</Text>
            <Text style={styles.emptyDesc}>
              {activeTab === 'Upcoming'
                ? 'You do not have any upcoming video appointments scheduled. Book a 15-minute instant video call with an active specialist doctor.'
                : `No ${activeTab.toLowerCase()} video consultation sessions recorded.`}
            </Text>
            {activeTab === 'Upcoming' && (
              <TouchableOpacity
                style={styles.bookInstantBtn}
                onPress={() => navigation.navigate('VideoConsultation')}
                activeOpacity={0.88}
              >
                <Ionicons name="flash" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.bookInstantBtnText}>Connect with Doctor in 15 Mins</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.consultationsList}>
            {filteredConsultations.map((item) => {
              const isUpcoming = item.status === 'Upcoming';
              const isReadyToJoin = item.canJoinNow;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.consultationCard,
                    isReadyToJoin && styles.consultationCardReady,
                  ]}
                >
                  {/* Top Bar: Room Type & Status Badge */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.videoBadge}>
                      <Ionicons name="videocam" size={13} color="#007D69" style={{ marginRight: 4 }} />
                      <Text style={styles.videoBadgeText}>Live Video Consultation</Text>
                    </View>

                    {isUpcoming ? (
                      <View
                        style={[
                          styles.statusPill,
                          isReadyToJoin ? styles.statusPillReady : styles.statusPillScheduled,
                        ]}
                      >
                        <View
                          style={[
                            styles.liveDot,
                            isReadyToJoin ? { backgroundColor: '#10B981' } : { backgroundColor: '#0284C7' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            isReadyToJoin ? { color: '#047857' } : { color: '#0369A1' },
                          ]}
                        >
                          {isReadyToJoin ? 'Room Active • Ready' : 'Scheduled Visit'}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.statusPill,
                          item.status === 'Completed'
                            ? { backgroundColor: '#E0F2FE' }
                            : { backgroundColor: '#FFF2ED' },
                        ]}
                      >
                        <Ionicons
                          name={item.status === 'Completed' ? 'checkmark-circle' : 'close-circle'}
                          size={13}
                          color={item.status === 'Completed' ? '#0284C7' : '#EA580C'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: item.status === 'Completed' ? '#0369A1' : '#C2410C' },
                          ]}
                        >
                          {item.status} {item.duration ? `• ${item.duration}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Booking ID & Token */}
                  <View style={styles.idRow}>
                    <Text style={styles.bookingIdText}>ID: {item.id}</Text>
                    {item.meetingRoomId && (
                      <Text style={styles.roomTokenText}>Room: {item.meetingRoomId}</Text>
                    )}
                  </View>

                  {/* Doctor Details Row */}
                  <View style={styles.doctorRow}>
                    <Image
                      source={{
                        uri:
                          item.doctor?.image ||
                          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
                      }}
                      style={styles.doctorAvatar}
                    />

                    <View style={styles.doctorInfoCol}>
                      <Text style={styles.doctorName} numberOfLines={1}>
                        {item.doctor?.name || 'Specialist Doctor'}
                      </Text>
                      <Text style={styles.doctorSpec} numberOfLines={1}>
                        {item.doctor?.specialty || 'General Physician'}
                        {item.doctor?.qualification ? ` (${item.doctor?.qualification})` : ''}
                      </Text>
                      <Text style={styles.doctorClinic} numberOfLines={1}>
                        {item.doctor?.clinicName || 'MediUnify TeleHealth Suite'}
                      </Text>
                    </View>
                  </View>

                  {/* Health Concern / Chief Symptom if present */}
                  {item.symptoms ? (
                    <View style={styles.symptomBox}>
                      <Ionicons name="chatbox-ellipses-outline" size={13} color="#64748B" style={{ marginRight: 5 }} />
                      <Text style={styles.symptomLabel}>Reason:</Text>
                      <Text style={styles.symptomValue} numberOfLines={1}>
                        {item.symptoms}
                      </Text>
                    </View>
                  ) : null}

                  {/* Date, Time & Payment Row */}
                  <View style={styles.slotDetailsCard}>
                    <View style={styles.slotDetailItem}>
                      <Ionicons name="calendar-outline" size={15} color="#007D69" />
                      <Text style={styles.slotDetailText}>{item.date}</Text>
                    </View>
                    <View style={styles.slotDetailDivider} />
                    <View style={styles.slotDetailItem}>
                      <Ionicons name="time-outline" size={15} color="#007D69" />
                      <Text style={styles.slotDetailText}>{item.time || item.timeSlot}</Text>
                    </View>
                    <View style={styles.slotDetailDivider} />
                    <View style={styles.slotDetailItem}>
                      <MaterialCommunityIcons name="shield-check-outline" size={15} color="#10B981" />
                      <Text style={styles.slotDetailPayment} numberOfLines={1}>
                        {item.paymentStatus?.includes('Wallet')
                          ? 'Wallet'
                          : item.paymentStatus?.includes('Refund')
                          ? 'Refund'
                          : 'Paid Online'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Actions Row */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => setViewingConsultation(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#007D69" style={{ marginRight: 4 }} />
                      <Text style={styles.detailsBtnText}>Details</Text>
                    </TouchableOpacity>

                    {isUpcoming && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelConsultation(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#EA580C" style={{ marginRight: 4 }} />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    )}

                    {isUpcoming && (
                      <TouchableOpacity
                        style={[
                          styles.joinCallBtn,
                          isReadyToJoin ? styles.joinCallBtnActive : styles.joinCallBtnWaiting,
                        ]}
                        onPress={() => handleJoinVideoCall(item)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="videocam" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text style={styles.joinCallBtnText}>
                          {isReadyToJoin ? 'Join Video Call' : 'Opens 10m Prior'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {item.status === 'Completed' && (
                      <TouchableOpacity
                        style={styles.rxBtn}
                        onPress={() => navigation.navigate('HealthRecords')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="document-text-outline" size={15} color="#007D69" style={{ marginRight: 4 }} />
                        <Text style={styles.rxBtnText}>View Rx</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ==================================================
          CONSULTATION DETAILS BOTTOM SHEET MODAL
      ================================================== */}
      <Modal
        visible={Boolean(viewingConsultation)}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingConsultation(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, isTablet && styles.modalBoxTablet]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Consultation Details</Text>
                <Text style={styles.modalSubtitle}>
                  Ref: {viewingConsultation?.id} • Room: {viewingConsultation?.meetingRoomId || viewingConsultation?.tokenNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setViewingConsultation(null)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* Doctor Header */}
              <View style={styles.modalDoctorRow}>
                <Image
                  source={{
                    uri:
                      viewingConsultation?.doctor?.image ||
                      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
                  }}
                  style={styles.modalDoctorAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalDoctorName}>
                    {viewingConsultation?.doctor?.name}
                  </Text>
                  <Text style={styles.modalDoctorSpec}>
                    {viewingConsultation?.doctor?.specialty}
                  </Text>
                  <Text style={styles.modalDoctorClinic}>
                    {viewingConsultation?.doctor?.clinicName || 'MediUnify TeleHealth Suite'}
                  </Text>
                </View>
              </View>

              {/* Grid of Key Info */}
              <View style={styles.metaGrid}>
                <View style={styles.metaCell}>
                  <Text style={styles.metaCellLabel}>Date & Time</Text>
                  <Text style={styles.metaCellValue}>
                    {viewingConsultation?.date} • {viewingConsultation?.time || viewingConsultation?.timeSlot}
                  </Text>
                </View>

                <View style={styles.metaCell}>
                  <Text style={styles.metaCellLabel}>Status</Text>
                  <Text
                    style={[
                      styles.metaCellValue,
                      {
                        color:
                          viewingConsultation?.status === 'Upcoming'
                            ? '#007D69'
                            : viewingConsultation?.status === 'Completed'
                            ? '#0284C7'
                            : '#EA580C',
                      },
                    ]}
                  >
                    {viewingConsultation?.status}
                  </Text>
                </View>

                <View style={styles.metaCell}>
                  <Text style={styles.metaCellLabel}>Payment</Text>
                  <Text style={styles.metaCellValue} numberOfLines={1}>
                    {viewingConsultation?.paymentStatus || 'Paid (₹450)'}
                  </Text>
                </View>

                <View style={styles.metaCell}>
                  <Text style={styles.metaCellLabel}>Duration</Text>
                  <Text style={styles.metaCellValue}>
                    {viewingConsultation?.duration || '15-20 Mins TeleHealth'}
                  </Text>
                </View>
              </View>

              {/* Patient Info */}
              <View style={styles.detailSectionBox}>
                <Text style={styles.detailSectionTitle}>Patient Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Patient Name:</Text>
                  <Text style={styles.detailVal}>
                    {viewingConsultation?.patientName || viewingConsultation?.patient?.name || 'Hemanth Gowda'}
                  </Text>
                </View>
                {viewingConsultation?.patient?.phone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Contact:</Text>
                    <Text style={styles.detailVal}>{viewingConsultation.patient.phone}</Text>
                  </View>
                )}
                {viewingConsultation?.symptoms && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Chief Concern:</Text>
                    <Text style={styles.detailVal}>{viewingConsultation.symptoms}</Text>
                  </View>
                )}
                {viewingConsultation?.patient?.reportName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Attached Report:</Text>
                    <Text style={[styles.detailVal, { color: '#007D69', fontWeight: '700' }]}>
                      {viewingConsultation.patient.reportName}
                    </Text>
                  </View>
                )}
              </View>

              {/* Doctor Clinical Summary / Prescription if present */}
              {viewingConsultation?.doctorNotes && (
                <View style={styles.doctorNotesBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="clipboard" size={14} color="#166534" />
                    <Text style={styles.doctorNotesTitle}>Doctor's Clinical Summary</Text>
                  </View>
                  <Text style={styles.doctorNotesText}>
                    {viewingConsultation.doctorNotes}
                  </Text>
                </View>
              )}

              {/* Modal CTA Buttons */}
              <View style={styles.modalCtaRow}>
                {viewingConsultation?.status === 'Upcoming' && (
                  <TouchableOpacity
                    style={[
                      styles.modalJoinBtn,
                      viewingConsultation.canJoinNow
                        ? { backgroundColor: '#10B981' }
                        : { backgroundColor: '#007D69' },
                    ]}
                    onPress={() => {
                      setViewingConsultation(null);
                      handleJoinVideoCall(viewingConsultation);
                    }}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="videocam" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalJoinBtnText}>
                      {viewingConsultation.canJoinNow ? 'Enter Video Room' : 'Join Video Call'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.modalCloseFullBtn}
                  onPress={() => setViewingConsultation(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseFullBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabletContainerWidth: {
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    zIndex: 9999,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  bookNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007D69',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  bookNewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // Summary Banner
  summaryBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  summaryLeft: {
    marginBottom: 12,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  summaryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007D69',
    letterSpacing: 0.4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#007D69',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#CBD5E1',
  },

  // Segmented Tabs
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#007D69',
    fontWeight: '800',
  },
  tabCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: '#E6F4F1',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabCountTextActive: {
    color: '#007D69',
  },

  // Search Bar
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },

  // Loading & Empty
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  bookInstantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007D69',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  bookInstantBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Consultations List
  consultationsList: {
    gap: 14,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  consultationCardReady: {
    borderColor: '#10B981',
    borderWidth: 1.5,
  },

  // Card Header Row
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007D69',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillReady: {
    backgroundColor: '#D1FAE5',
  },
  statusPillScheduled: {
    backgroundColor: '#E0F2FE',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  idRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  roomTokenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007D69',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Doctor Row
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  doctorInfoCol: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  doctorSpec: {
    fontSize: 12,
    color: '#007D69',
    fontWeight: '600',
    marginTop: 1,
  },
  doctorClinic: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Symptom Box
  symptomBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  symptomLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginRight: 4,
  },
  symptomValue: {
    fontSize: 11,
    color: '#0F172A',
    flex: 1,
  },

  // Slot Details Card
  slotDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 12,
  },
  slotDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotDetailText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  slotDetailPayment: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  slotDetailDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
  },

  // Card Actions Row
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007D69',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA580C',
  },
  joinCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  joinCallBtnActive: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  joinCallBtnWaiting: {
    backgroundColor: '#007D69',
    opacity: 0.85,
  },
  joinCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  rxBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  rxBtnText: {
    color: '#007D69',
    fontSize: 12.5,
    fontWeight: '800',
  },

  // Modal Backdrop & Content
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalBoxTablet: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 24,
    marginBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDoctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  modalDoctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalDoctorSpec: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#007D69',
    marginTop: 2,
  },
  modalDoctorClinic: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  // Meta Grid
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 14,
    gap: 8,
  },
  metaCell: {
    width: '48%',
    paddingVertical: 4,
  },
  metaCellLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  metaCellValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  // Detail Section
  detailSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailKey: {
    fontSize: 11.5,
    color: '#64748B',
  },
  detailVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Doctor Notes
  doctorNotesBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  doctorNotesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  doctorNotesText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },

  modalCtaRow: {
    marginTop: 8,
    gap: 8,
  },
  modalJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalJoinBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalCloseFullBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalCloseFullBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default MyOnlineConsultationsScreen;
