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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebFooter from '../../../components/web/WebFooter';
import PaginationBar from '../../../components/web/PaginationBar';
import PatientPageBanner from '../../../components/web/PatientPageBanner';
import {
  getActivePatient,
  getOnlineConsultations,
  saveOnlineConsultations,
  isVideoConsultationActive,
} from '../../../data/patientDashboardData';
import { cancelBookedSlot } from '../../../services/slotBookingService';
import { showAlert } from '../../../utils/alert';
import { isGuestUser } from '../../../utils/authHelper';
import { isDesktopLayout, isDesktopSiteRequested } from '../../../utils/responsiveLayoutHelper';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const CONSULTATION_TABS = ['Upcoming', 'Completed', 'Cancelled'];

const MyOnlineConsultationsScreenWeb = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);

  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination (4 items per page)
  const ITEMS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = useState(1);

  // Video Consultation Live Interface Modal
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callNotes, setCallNotes] = useState('');
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);

  // View Details Modal
  const [viewingConsultation, setViewingConsultation] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  useEffect(() => {
    loadData();

    // 1. Navigation focus listener - updates automatically when returning to page
    const unsubscribeFocus = navigation?.addListener ? navigation.addListener('focus', () => {
      loadData();
    }) : null;

    // 2. Storage & custom event listeners for real-time auto-refresh without manual refresh
    const handleStorageChange = (e) => {
      if (!e || !e.key || e.key.includes('consultation') || e.key.includes('video')) {
        loadData();
      }
    };
    const handleUpdate = () => {
      loadData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('mediunify_consultations_updated', handleUpdate);
    }

    // 3. Real-time 15-second clock ticker to automatically enable "Join Video Call" as time advances
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('mediunify_consultations_updated', handleUpdate);
      }
    };
  }, [navigation]);

  const loadData = async () => {
    setLoading(true);
    try {
      const guest = await isGuestUser();
      if (guest) {
        setIsGuestMode(true);
        setPatient(null);
        setConsultations([]);
        setLoading(false);
        return;
      }
      setIsGuestMode(false);
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
      console.warn('Error loading consultations:', e);
    } finally {
      setLoading(false);
    }
  };

  // Video Call Timer
  useEffect(() => {
    let interval = null;
    if (activeVideoCall) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeVideoCall]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filtered consultations
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
        return doc.includes(q) || spec.includes(q) || clinic.includes(q) || id.includes(q);
      }

      return true;
    });
  }, [consultations, activeTab, searchQuery]);

  // Reset pagination when activeTab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Slice consultations for current page (4 items per page)
  const paginatedConsultations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredConsultations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredConsultations, currentPage]);

  const handleEndCall = async () => {
    if (!activeVideoCall) return;
    const durStr = `${Math.max(1, Math.round(callDuration / 60))} Mins`;
    const docName = activeVideoCall.doctor?.name || 'Doctor';
    const updated = consultations.map((c) => {
      if (c.id === activeVideoCall.id) {
        return {
          ...c,
          status: 'Completed',
          duration: durStr,
          completedAt: new Date().toISOString(),
          doctorNotes: callNotes || c.doctorNotes || 'Consultation concluded successfully. Digital prescription issued.',
          hasPrescription: true,
        };
      }
      return c;
    });
    setConsultations(updated);
    await saveOnlineConsultations(updated);
    showToast(`Video consultation ended (${durStr}). Moved to Completed.`);
    setActiveVideoCall(null);
    setActiveTab('Completed');
  };

  const handleCancelConsultation = (item) => {
    if (!item) return;
    showAlert(
      'Cancel Online Consultation',
      `Are you sure you want to cancel your video appointment with ${item.doctor?.name || 'Doctor'} for ${item.date} at ${item.time || item.timeSlot}? Any fee paid will be automatically refunded.`,
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            cancelBookedSlot({
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
                  paymentStatus: 'Refund Processing (₹' + (item.fee || item.paidAmount || 450) + ')',
                };
              }
              return c;
            });
            setConsultations(updated);
            await saveOnlineConsultations(updated);
            showToast(`Consultation ${item.id} cancelled. Refund processing.`);
          },
        },
      ]
    );
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
            title="My Online Consultations"
            subtitle="HD video appointments with certified medical specialists."
            badgeText="Telehealth"
            badgeIcon="videocam"
            iconName="videocam"
            theme="teal"
            pills={[
              {
                label: `Upcoming: ${consultations.filter((c) => c.status === 'Upcoming').length} Calls`,
                bgColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                textColor: '#008B94',
                icon: 'radio-outline',
              },
              {
                label: `Completed: ${consultations.filter((c) => c.status === 'Completed').length}`,
                bgColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                textColor: '#1E3A8A',
                icon: 'checkmark-circle-outline',
              },
            ]}
            rightContent={
              <TouchableOpacity
                style={styles.organicHeroBtn}
                onPress={() => navigation?.navigate('VideoConsultation')}
                activeOpacity={0.85}
              >
                <View style={styles.organicHeroArrowCircle}>
                  <Ionicons name="videocam" size={13} color="#13BE9C" />
                </View>
                <Text style={styles.organicHeroBtnText}>Book Video Consult</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <View style={[styles.innerContainer, { paddingTop: 8, paddingBottom: 60 }]}>

          {/* Controls: Tabs & Search */}
          <View style={styles.controlsCard}>
            <View style={styles.tabsRow}>
              {CONSULTATION_TABS.map((tab) => {
                const count = consultations.filter((c) => c.status === tab).length;
                const active = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
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

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#13BE9C" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search doctors, specialty, or consultation ID..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Consultations List */}
          {isGuestMode ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#E6F8F4' }]}>
                <Ionicons name="videocam-outline" size={42} color="#00B894" />
              </View>
              <Text style={styles.emptyTitle}>Login to view your online consultations</Text>
              <Text style={styles.emptyDesc}>
                Please sign in to view your scheduled video calls, doctor prescriptions, and consultation history.
              </Text>
              <TouchableOpacity
                style={[styles.bookInstantBtn, { marginTop: 18, alignSelf: 'center', paddingHorizontal: 32 }]}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                  }
                  navigation?.navigate('Login', { openAuthModal: true });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.bookInstantBtnText}>Login</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B894" />
              <Text style={styles.loadingText}>Loading your video consultations...</Text>
            </View>
          ) : filteredConsultations.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="videocam-off-outline" size={42} color="#94A3B8" />
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
                  onPress={() => navigation?.navigate('VideoConsultation')}
                >
                  <Ionicons name="flash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.bookInstantBtnText}>Connect with Doctor in 15 Mins</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.consultationsList}>
              {paginatedConsultations.map((item) => {
                const isUpcoming = item.status === 'Upcoming';
                const isReadyToJoin = item.canJoinNow;

                return (
                  <View key={item.id} style={[styles.consultationCard, isReadyToJoin && styles.consultationCardReady]}>
                    {/* Top Row: Type & Status */}
                    <View style={styles.cardTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.videoBadge}>
                          <Ionicons name="videocam" size={13} color="#00B894" style={{ marginRight: 4 }} />
                          <Text style={styles.videoBadgeText}>Live Video Consultation</Text>
                        </View>
                        <Text style={styles.consultIdText}>{item.id}</Text>
                      </View>

                      {isUpcoming ? (
                        <View
                          style={[
                            styles.liveStatusPill,
                            isReadyToJoin ? styles.liveStatusPillReady : styles.liveStatusPillScheduled,
                          ]}
                        >
                          <View
                            style={[
                              styles.liveDot,
                              isReadyToJoin ? { backgroundColor: '#00B894' } : { backgroundColor: '#00C2CB' },
                            ]}
                          />
                          <Text
                            style={[
                              styles.liveStatusText,
                              isReadyToJoin ? { color: '#00B894' } : { color: '#00C2CB' },
                            ]}
                          >
                            {isReadyToJoin ? 'Room Active • Ready to Join' : 'Scheduled Visit'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.completedBadge}>
                          <Ionicons
                            name={item.status === 'Completed' ? 'checkmark-circle' : 'close-circle'}
                            size={14}
                            color={item.status === 'Completed' ? '#1E3A8A' : '#FF7F50'}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.completedBadgeText,
                              { color: item.status === 'Completed' ? '#1E3A8A' : '#FF7F50' },
                            ]}
                          >
                            {item.status} {item.duration ? `• ${item.duration}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Main Row: Doctor & Slot Info */}
                    <View style={styles.cardMainRow}>
                      <Image source={{ uri: item.doctor?.image }} style={styles.doctorAvatar} />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.doctorName}>{item.doctor?.name}</Text>
                        <Text style={styles.doctorSpec}>
                          {item.doctor?.specialty} • {item.doctor?.qualification}
                        </Text>
                        <Text style={styles.doctorExp}>
                          {item.doctor?.experienceYears} experience • {item.doctor?.clinicName}
                        </Text>

                        {item.symptoms && (
                          <View style={styles.symptomsRow}>
                            <Text style={styles.symptomsLabel}>Chief Concern:</Text>
                            <Text style={styles.symptomsValue}>{item.symptoms}</Text>
                          </View>
                        )}
                      </View>

                      {/* Date & Time Pillar */}
                      <View style={[styles.dateTimePillar, isReadyToJoin && styles.dateTimePillarReady]}>
                        <View style={styles.dateTimeHeader}>
                          <Ionicons name="calendar" size={15} color={isReadyToJoin ? '#13BE9C' : '#1E3A8A'} />
                          <Text style={[styles.dateText, isReadyToJoin && { color: '#13BE9C' }]}>{item.date}</Text>
                        </View>
                        <View style={styles.timeHeader}>
                          <Ionicons name="time-outline" size={15} color="#475569" />
                          <Text style={styles.timeText}>{item.timeSlot || item.time}</Text>
                        </View>
                        <Text style={styles.paidStatusText}>{item.paymentStatus}</Text>
                      </View>
                    </View>

                    {/* Action Bar */}
                    <View style={styles.cardActionsRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark" size={14} color="#13BE9C" />
                        <Text style={styles.encryptedText}>256-Bit Encrypted HD TeleHealth</Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => setViewingConsultation(item)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicArrowCircle}>
                            <Ionicons name="arrow-forward" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicPrimaryActionText}>View Details</Text>
                        </TouchableOpacity>

                        {/* Cancel Consultation Option */}
                        {isUpcoming && (
                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => handleCancelConsultation(item)}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.organicActionIconCircle, { borderColor: '#EF4444' }]}>
                              <Ionicons name="close-circle-outline" size={12} color="#DC2626" />
                            </View>
                            <Text style={[styles.organicActionText, { color: '#DC2626' }]}>Cancel</Text>
                          </TouchableOpacity>
                        )}

                        {/* Join Consultation Button */}
                        {isUpcoming && (
                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => {
                              if (isReadyToJoin) {
                                setActiveVideoCall(item);
                              } else {
                                showToast(`Video room opens 10 minutes prior to your appointment (${item.time || item.timeSlot}).`);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[
                              styles.organicActionIconCircle,
                              isReadyToJoin
                                ? { backgroundColor: '#13BE9C', borderColor: '#13BE9C' }
                                : { borderColor: '#94A3B8' }
                            ]}>
                              <Ionicons
                                name={isReadyToJoin ? 'videocam' : 'time-outline'}
                                size={12}
                                color={isReadyToJoin ? '#FFFFFF' : '#64748B'}
                              />
                            </View>
                            <Text style={[
                              styles.organicActionText,
                              isReadyToJoin ? { color: '#13BE9C', fontWeight: '800' } : { color: '#64748B' }
                            ]}>
                              {isReadyToJoin ? 'Join Video Call' : 'Opens 10m Prior'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Completed Actions: View Rx */}
                        {item.status === 'Completed' && item.hasPrescription && (
                          <TouchableOpacity
                            style={styles.organicActionBtn}
                            onPress={() => navigation?.navigate('MyMedicalRecords')}
                            activeOpacity={0.8}
                          >
                            <View style={styles.organicArrowCircle}>
                              <Ionicons name="document-text-outline" size={12} color="#13BE9C" />
                            </View>
                            <Text style={styles.organicPrimaryActionText}>View Prescription</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}

              {filteredConsultations.length > 0 && (
                <PaginationBar
                  currentPage={currentPage}
                  totalItems={filteredConsultations.length}
                  pageSize={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  itemLabel="consultations"
                />
              )}
            </View>
          )}
        </View>

        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* =========================================================
          LIVE VIDEO CONSULTATION INTERFACE (High Quality TeleHealth)
      ========================================================= */}
      <Modal visible={Boolean(activeVideoCall)} transparent={false} animationType="slide">
        <SafeAreaView style={styles.videoRoomContainer}>
          {/* Top Bar */}
          <View style={styles.videoRoomHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.doctorVideoAvatar}>
                <Image source={{ uri: activeVideoCall?.doctor?.image }} style={{ width: 36, height: 36, borderRadius: 18 }} />
              </View>
              <View>
                <Text style={styles.videoDoctorName}>{activeVideoCall?.doctor?.name}</Text>
                <Text style={styles.videoDoctorSpec}>{activeVideoCall?.doctor?.specialty}</Text>
              </View>
            </View>

            {/* Timer & Encryption Indicator */}
            <View style={styles.timerBadge}>
              <View style={styles.pulsingRedDot} />
              <Text style={styles.timerText}>{formatTimer(callDuration)}</Text>
              <View style={styles.encryptionPill}>
                <Ionicons name="lock-closed" size={11} color="#00B894" />
                <Text style={{ fontSize: 10, color: '#00B894', fontWeight: '700' }}>HD • SECURE</Text>
              </View>
            </View>

            {/* Toggle Notes Drawer */}
            <TouchableOpacity
              style={[styles.notesToggleBtn, showNotesDrawer && { backgroundColor: '#00B894' }]}
              onPress={() => setShowNotesDrawer(!showNotesDrawer)}
            >
              <Ionicons name="document-text" size={16} color={showNotesDrawer ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.notesToggleText, showNotesDrawer && { color: '#FFFFFF' }]}>Notes</Text>
            </TouchableOpacity>
          </View>

          {/* Video Streams Layout */}
          <View style={styles.videoStreamsArea}>
            {/* Main Doctor Video Area */}
            <View style={styles.mainDoctorStream}>
              <Image
                source={{ uri: activeVideoCall?.doctor?.image }}
                style={styles.doctorStreamBg}
                blurRadius={20}
              />
              <View style={styles.doctorStreamOverlay}>
                <View style={styles.doctorStreamCard}>
                  <Image source={{ uri: activeVideoCall?.doctor?.image }} style={styles.doctorCardAvatar} />
                  <Text style={styles.doctorCardName}>{activeVideoCall?.doctor?.name}</Text>
                  <Text style={styles.doctorCardStatus}>Consultation Active • Speaking</Text>
                  <View style={styles.audioWaveformRow}>
                    <View style={[styles.audioWave, { height: 14 }]} />
                    <View style={[styles.audioWave, { height: 24 }]} />
                    <View style={[styles.audioWave, { height: 18 }]} />
                    <View style={[styles.audioWave, { height: 28 }]} />
                    <View style={[styles.audioWave, { height: 16 }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Patient Self-View (Picture in Picture) */}
            <View style={styles.patientPipBox}>
              {isCameraOff ? (
                <View style={styles.cameraOffPlaceholder}>
                  <Ionicons name="videocam-off" size={28} color="#64748B" />
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Camera Off</Text>
                </View>
              ) : (
                <View style={styles.patientLiveFeed}>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' }}
                    style={{ width: '100%', height: '100%' }}
                  />
                  <View style={styles.patientPipNameTag}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>You (Self)</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Slide-out Notes Drawer */}
            {showNotesDrawer && (
              <View style={styles.notesDrawer}>
                <Text style={styles.notesDrawerTitle}>Live Consultation Notes</Text>
                <TextInput
                  style={styles.notesDrawerInput}
                  placeholder="Type symptoms or notes to share with doctor during consultation..."
                  placeholderTextColor="#64748B"
                  value={callNotes}
                  onChangeText={setCallNotes}
                  multiline
                />
              </View>
            )}
          </View>

          {/* Bottom Call Controls Bar */}
          <View style={styles.controlsBar}>
            {/* Mic Toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isMicMuted && styles.controlBtnMuted]}
              onPress={() => setIsMicMuted(!isMicMuted)}
            >
              <Ionicons name={isMicMuted ? 'mic-off' : 'mic'} size={22} color="#FFFFFF" />
              <Text style={styles.controlBtnLabel}>{isMicMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* Camera Toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isCameraOff && styles.controlBtnMuted]}
              onPress={() => setIsCameraOff(!isCameraOff)}
            >
              <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={22} color="#FFFFFF" />
              <Text style={styles.controlBtnLabel}>{isCameraOff ? 'Start Video' : 'Stop Video'}</Text>
            </TouchableOpacity>

            {/* Share Screen */}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => showToast('Screen sharing is active.')}
            >
              <Ionicons name="desktop-outline" size={22} color="#FFFFFF" />
              <Text style={styles.controlBtnLabel}>Share</Text>
            </TouchableOpacity>

            {/* Chat */}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setShowNotesDrawer(!showNotesDrawer)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
              <Text style={styles.controlBtnLabel}>Chat</Text>
            </TouchableOpacity>

            {/* END CALL BUTTON */}
            <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
              <Ionicons name="call" size={24} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.endCallText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* =========================================================
          VIEW CONSULTATION DETAILS MODAL
      ========================================================= */}
      <Modal visible={Boolean(viewingConsultation)} transparent animationType="fade" onRequestClose={() => setViewingConsultation(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Consultation Details</Text>
                <Text style={styles.modalSubtitle}>ID: {viewingConsultation?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewingConsultation(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Image source={{ uri: viewingConsultation?.doctor?.image }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{viewingConsultation?.doctor?.name}</Text>
                    <Text style={{ fontSize: 13, color: '#1E3A8A', fontWeight: '600' }}>{viewingConsultation?.doctor?.specialty}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{viewingConsultation?.doctor?.clinicName}</Text>
                  </View>
                </View>

                <View style={styles.detailsMetaGrid}>
                  <View style={styles.metaCell}>
                    <Text style={styles.mcLabel}>Date & Time</Text>
                    <Text style={styles.mcValue}>{viewingConsultation?.date} • {viewingConsultation?.time}</Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.mcLabel}>Status</Text>
                    <Text style={[styles.mcValue, { color: '#00B894' }]}>{viewingConsultation?.status}</Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.mcLabel}>Payment</Text>
                    <Text style={styles.mcValue}>{viewingConsultation?.paymentStatus}</Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.mcLabel}>Duration</Text>
                    <Text style={styles.mcValue}>{viewingConsultation?.duration || '15-20 Mins Expected'}</Text>
                  </View>
                </View>

                {viewingConsultation?.doctorNotes && (
                  <View style={styles.doctorNotesCallout}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534', marginBottom: 4 }}>
                      Doctor's Clinical Summary:
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#166534', lineHeight: 18 }}>
                      {viewingConsultation.doctorNotes}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setViewingConsultation(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
              {viewingConsultation?.status === 'Upcoming' && viewingConsultation?.canJoinNow && (
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setActiveVideoCall(viewingConsultation);
                    setViewingConsultation(null);
                  }}
                >
                  <Ionicons name="videocam" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalPrimaryBtnText}>Join Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MyOnlineConsultationsScreenWeb;

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
  // Image 2 Exact Hero CTA (Circular Outline Arrow + Bold Text in #13BE9C)
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
  // Image 2 Exact Action Buttons (Circular Outline Icon Ring + Bold Text in #13BE9C)
  organicActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
  organicPrimaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#13BE9C',
    letterSpacing: 0.1,
  },
  organicActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
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
  videoBadgePill: {
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
  bookVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    boxShadow: '0 4px 14px rgba(0, 184, 148, 0.3)',
  },
  bookVideoBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
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
  tabBtnActive: {
    backgroundColor: '#13BE9C',
    borderColor: '#13BE9C',
    boxShadow: '0 2px 8px rgba(19, 190, 156, 0.2)',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    userSelect: 'none',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  tabCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 18,
  },
  bookInstantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 14,
  },
  bookInstantBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  consultationsList: {
    gap: 16,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
  },
  consultationCardReady: {
    borderColor: '#A7F3D0',
    borderLeftWidth: 4,
    borderLeftColor: '#00B894',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00B894',
  },
  consultIdText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveStatusPillReady: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  liveStatusPillScheduled: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  doctorAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E2E8F0',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  doctorSpec: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 2,
  },
  doctorExp: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  symptomsRow: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
  },
  symptomsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  symptomsValue: {
    fontSize: 12,
    color: '#334155',
    marginTop: 1,
  },
  dateTimePillar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    minWidth: 190,
    gap: 4,
  },
  dateTimePillarReady: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  dateTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  paidStatusText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  encryptedText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  joinCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,184,148,0.25)',
  },
  joinCallBtnDisabled: {
    backgroundColor: '#94A3B8',
    boxShadow: 'none',
  },
  joinCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  prescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#E6F8F4',
  },
  prescriptionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  // Video Room Fullscreen
  videoRoomContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  videoRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  doctorVideoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  videoDoctorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  videoDoctorSpec: {
    fontSize: 11,
    color: '#94A3B8',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulsingRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7F50',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  encryptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  notesToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  videoStreamsArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  mainDoctorStream: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorStreamBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  doctorStreamOverlay: {
    alignItems: 'center',
  },
  doctorStreamCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  doctorCardAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#00B894',
    marginBottom: 12,
  },
  doctorCardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  doctorCardStatus: {
    fontSize: 12,
    color: '#00B894',
    marginTop: 2,
  },
  audioWaveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    height: 30,
  },
  audioWave: {
    width: 4,
    backgroundColor: '#00B894',
    borderRadius: 2,
  },
  patientPipBox: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 160,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#00B894',
    boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
  },
  cameraOffPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  patientLiveFeed: {
    flex: 1,
    position: 'relative',
  },
  patientPipNameTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(15,23,42,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notesDrawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#1E293B',
    borderLeftWidth: 1,
    borderLeftColor: '#334155',
    padding: 16,
    zIndex: 100,
  },
  notesDrawerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  notesDrawerInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
    outlineStyle: 'none',
    textAlignVertical: 'top',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controlBtnMuted: {
    backgroundColor: '#FF7F50',
  },
  controlBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  endCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF7F50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginLeft: 16,
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  // Modal Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  modalCloseIcon: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  detailsMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 12,
  },
  metaCell: {
    minWidth: 180,
  },
  mcLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  mcValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  doctorNotesCallout: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
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
});
