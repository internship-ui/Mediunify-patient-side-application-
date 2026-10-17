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
import WebFooter from '../../components/web/WebFooter';
import PaginationBar from '../../components/web/PaginationBar';
import PatientPageBanner from '../../components/web/PatientPageBanner';
import { useCart } from '../../context/CartContext';
import { isGuestUser } from '../../utils/authHelper';
import {
  getActivePatient,
  getPatientFamilyMembers,
  addPatientFamilyMember,
  getMedicalRecords,
} from '../../data/patientDashboardData';

import HealthRecordsScreenMobile from './HealthRecordsScreen';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { isDesktopLayout, isDesktopSiteRequested } from '../../utils/responsiveLayoutHelper';

const RECORD_TABS = ['All Records', 'Lab Reports', 'Radiology & Scans', 'Prescriptions', 'Other Records'];

const MyMedicalRecordsScreenWeb = ({ navigation, route, ...props }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);

  const { addToCart } = useCart() || {};

  const [patient, setPatient] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState('All Records');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination (4 items per page)
  const ITEMS_PER_PAGE = 4;
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [viewingRecord, setViewingRecord] = useState(null); // Document View Modal
  const [orderMedsRecord, setOrderMedsRecord] = useState(null); // Action: Order Medicines Modal
  const [bookLabRecord, setBookLabRecord] = useState(null); // Action: Book Referred Test Modal

  // Order Medicines Modal State
  const [selectedMedicines, setSelectedMedicines] = useState({}); // { [id]: { selected: bool, qty: number } }
  const [selectedPharmacyOption, setSelectedPharmacyOption] = useState(0);

  // Book Lab Modal State
  const [selectedLabOption, setSelectedLabOption] = useState(0);
  const [selectedLabSlot, setSelectedLabSlot] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const guest = await isGuestUser();
      if (guest) {
        setIsGuestMode(true);
        setPatient(null);
        setFamilyMembers([]);
        setRecords([]);
        setLoading(false);
        return;
      }
      setIsGuestMode(false);
      const p = await getActivePatient();
      setPatient(p);
      const fam = await getPatientFamilyMembers();
      setFamilyMembers(fam);
      const recs = await getMedicalRecords();
      setRecords(recs);
    } catch (e) {
      console.warn('Error loading medical records:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Tab filter
      if (activeTab !== 'All Records') {
        if (activeTab === 'Prescriptions' && rec.recordType !== 'Prescription') return false;
        if (activeTab === 'Lab Reports' && rec.recordType !== 'Lab Report') return false;
        if (activeTab === 'Radiology & Scans' && rec.recordType !== 'Diagnostic Report') return false;
        if (activeTab === 'Other Records' && rec.recordType !== 'Other') return false;
      }

      // Family Member filter
      if (selectedFamilyMember !== 'all' && rec.patientId !== selectedFamilyMember) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (rec.name || '').toLowerCase();
        const doc = (rec.doctorName || '').toLowerCase();
        const facility = (rec.facilityName || '').toLowerCase();
        const desc = (rec.description || '').toLowerCase();
        const pName = (rec.patientName || '').toLowerCase();
        return name.includes(q) || doc.includes(q) || facility.includes(q) || desc.includes(q) || pName.includes(q);
      }

      return true;
    });
  }, [records, activeTab, selectedFamilyMember, searchQuery]);

  // Reset pagination when activeTab, member, or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedFamilyMember, searchQuery]);

  // Slice records for current page (4 items per page)
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  // Open "Order Medicines" modal
  const handleOpenOrderMedicines = (record) => {
    setOrderMedsRecord(record);
    const initialMap = {};
    if (record.medicines) {
      record.medicines.forEach((m) => {
        initialMap[m.id] = { selected: true, quantity: 1, ...m };
      });
    }
    setSelectedMedicines(initialMap);
    setSelectedPharmacyOption(0);
  };

  // Open "Book Lab Test" modal
  const handleOpenBookLabTest = (record) => {
    setBookLabRecord(record);
    setSelectedLabOption(0);
    const firstLab = record.referredTest?.labs?.[0];
    if (firstLab && firstLab.slots?.length > 0) {
      setSelectedLabSlot(firstLab.slots[0]);
    }
  };

  // Add selected medicines to cart & continue to Pharmacy
  const handleConfirmOrderMedicines = () => {
    if (!orderMedsRecord) return;
    const selectedItems = Object.values(selectedMedicines).filter((m) => m.selected);
    if (selectedItems.length === 0) {
      showToast('Please select at least one prescribed medicine.');
      return;
    }

    if (addToCart) {
      selectedItems.forEach((m) => {
        addToCart(
          {
            id: `rx-med-${m.id}-${Date.now()}`,
            name: m.name,
            price: m.price,
            category: 'Pharmacy',
            itemType: 'pharmacy',
          },
          m.quantity || 1,
          'pharmacy'
        );
      });
    }

    setOrderMedsRecord(null);
    showToast(`Added ${selectedItems.length} prescribed medicines to cart!`);
    navigation?.navigate('Cart');
  };

  // Confirm Referred Lab Booking
  const handleConfirmBookLab = () => {
    if (!bookLabRecord) return;
    const lab = bookLabRecord.referredTest?.labs?.[selectedLabOption];
    setBookLabRecord(null);
    showToast(`Diagnostic slot booked at ${lab?.name || 'Neuberg Anand'} for ${selectedLabSlot}!`);
    navigation?.navigate('MyAppointments');
  };

  const getRecordBadgeStyle = (type) => {
    switch (type) {
      case 'Prescription':
        return { bg: '#E6F8F4', text: '#00B894', border: '#A7F3D0', icon: 'receipt-outline' };
      case 'Lab Report':
        return { bg: '#E0F7FA', text: '#00C2CB', border: '#B2EBF2', icon: 'flask-outline' };
      case 'Diagnostic Report':
        return { bg: '#E0F7FA', text: '#1E3A8A', border: '#B2EBF2', icon: 'scan-outline' };
      default:
        return { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0', icon: 'document-text-outline' };
    }
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
            title={t('My Medical Records')}
            subtitle={t('View and manage your prescriptions, lab reports, and scans.')}
            badgeText={t('Health Records')}
            badgeIcon="folder-open"
            iconName="document-text"
            theme="teal"
            pills={[
              {
                label: `${t('Total Records')}: ${records.length}`,
                bgColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                textColor: '#008B94',
                icon: 'shield-checkmark-outline',
              },
              {
                label: `${t('Prescriptions')}: ${records.filter((r) => r.recordType === 'Prescription').length}`,
                bgColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                textColor: '#1E3A8A',
                icon: 'receipt-outline',
              },
            ]}
            rightContent={
              <TouchableOpacity
                style={styles.organicHeroBtn}
                onPress={() => showToast('Select PDF or camera scan to upload to your MediUnify vault.')}
                activeOpacity={0.85}
              >
                <View style={styles.organicHeroArrowCircle}>
                  <Ionicons name="cloud-upload" size={13} color="#13BE9C" />
                </View>
                <Text style={styles.organicHeroBtnText}>{t('Upload Document')}</Text>
              </TouchableOpacity>
            }
          />
        </View>

        <View style={[styles.innerContainer, { paddingTop: 8, paddingBottom: 60 }]}>

          {/* Controls: Tabs, Family Filter & Search */}
          <View style={styles.controlsCard}>
            {/* Record Type Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {RECORD_TABS.map((tab) => {
                const count =
                  tab === 'All Records'
                    ? records.length
                    : tab === 'Lab Reports'
                    ? records.filter((r) => r.recordType === 'Lab Report').length
                    : tab === 'Radiology & Scans'
                    ? records.filter((r) => r.recordType === 'Diagnostic Report').length
                    : tab === 'Prescriptions'
                    ? records.filter((r) => r.recordType === 'Prescription').length
                    : records.filter((r) => r.recordType === 'Other').length;
                const active = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabBtn, active && styles.tabBtnActive]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                      {t(tab)}
                    </Text>
                    <View style={[styles.tabCountBadge, active && styles.tabCountBadgeActive]}>
                      <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search & Family Filter Row */}
            <View style={styles.filterRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#13BE9C" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('Search records, doctors, or medicines...')}
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

              {/* Family Dropdown / Buttons */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{t('Family:')}</Text>
                <TouchableOpacity
                  style={[styles.memberChip, selectedFamilyMember === 'all' && styles.memberChipActive]}
                  onPress={() => setSelectedFamilyMember('all')}
                >
                  <Text style={[styles.memberChipText, selectedFamilyMember === 'all' && styles.memberChipTextActive]}>
                    {t('All')}
                  </Text>
                  <View style={[styles.memberCountBadge, selectedFamilyMember === 'all' && styles.memberCountBadgeActive]}>
                    <Text style={[styles.memberCountText, selectedFamilyMember === 'all' && styles.memberCountTextActive]}>
                      {records.length}
                    </Text>
                  </View>
                </TouchableOpacity>
                {familyMembers.map((m) => {
                  const isSel = selectedFamilyMember === m.id;
                  const c = records.filter((r) => r.patientId === m.id).length;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberChip, isSel && styles.memberChipActive]}
                      onPress={() => setSelectedFamilyMember(m.id)}
                    >
                      <Text style={[styles.memberChipText, isSel && styles.memberChipTextActive]}>
                        {m.name.split(' ')[0]}
                      </Text>
                      <View style={[styles.memberCountBadge, isSel && styles.memberCountBadgeActive]}>
                        <Text style={[styles.memberCountText, isSel && styles.memberCountTextActive]}>
                          {c}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Records List */}
          {isGuestMode ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#E6F8F4' }]}>
                <Ionicons name="document-text-outline" size={42} color="#00B894" />
              </View>
              <Text style={styles.emptyTitle}>{t('Login to view your medical records')}</Text>
              <Text style={styles.emptyDesc}>
                {t('Please login to continue')}
              </Text>
              <TouchableOpacity
                style={[styles.uploadFab, { marginTop: 18, alignSelf: 'center', paddingHorizontal: 32 }]}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                  }
                  navigation?.navigate('Login', { openAuthModal: true });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.uploadFabText}>{t('Login')}</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00B894" />
              <Text style={styles.loadingText}>{t('Loading your clinical records...')}</Text>
            </View>
          ) : filteredRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="folder-open-outline" size={42} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>{t('No medical documents found')}</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery || activeTab !== 'All Records' || selectedFamilyMember !== 'all'
                  ? t('No data found')
                  : t('no_records')}
              </Text>
            </View>
          ) : (
            <View style={styles.recordsList}>
              {paginatedRecords.map((record) => {
                const badge = getRecordBadgeStyle(record.recordType);

                return (
                  <View key={record.id} style={styles.recordCard}>
                    {/* Top Row: Type Badge + Patient info + Date */}
                    <View style={styles.recordTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.typeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Ionicons name={badge.icon} size={13} color={badge.text} style={{ marginRight: 4 }} />
                          <Text style={[styles.typeBadgeText, { color: badge.text }]}>{t(record.recordType)}</Text>
                        </View>
                        <Text style={styles.recordId}>{record.id}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={styles.patientPill}>
                          <Ionicons name="person" size={11} color="#1E3A8A" style={{ marginRight: 4 }} />
                          <Text style={styles.patientPillText}>{record.patientName}</Text>
                        </View>
                        <Text style={styles.recordDateText}>{record.date}</Text>
                      </View>
                    </View>

                    {/* Main Row: Details */}
                    <View style={styles.recordMainRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recordName}>{record.name}</Text>
                        <View style={styles.authorRow}>
                          <Ionicons name="medical" size={14} color="#00B894" style={{ marginRight: 4 }} />
                          <Text style={styles.authorText}>
                            {record.doctorName} • <Text style={{ color: '#64748B' }}>{record.facilityName}</Text>
                          </Text>
                        </View>
                        <Text style={styles.recordDesc}>{record.description}</Text>
                      </View>
                    </View>

                    {/* =========================================================
                        CLINICAL BIOMARKER & RADIOLOGY PARAMETERS PREVIEW
                    ========================================================= */}
                    {record.parameters && record.parameters.length > 0 && (
                      <View style={styles.paramPreviewBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Ionicons
                            name={record.recordType === 'Lab Report' ? 'flask' : 'scan'}
                            size={14}
                            color={record.recordType === 'Lab Report' ? '#00C2CB' : '#1E3A8A'}
                          />
                          <Text style={styles.paramPreviewTitle}>
                            {record.recordType === 'Lab Report' ? 'Key Biomarker Values:' : 'Radiological Findings:'}
                          </Text>
                        </View>
                        <View style={styles.paramChipsRow}>
                          {record.parameters.map((p, idx) => {
                            const isHigh = p.status === 'High';
                            const isBorder = p.status === 'Borderline' || p.status === 'Prediabetes';
                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.paramChip,
                                  isHigh && styles.paramChipHigh,
                                  isBorder && styles.paramChipBorderline,
                                ]}
                              >
                                <Text style={[styles.paramChipName, (isHigh || isBorder) && { color: isHigh ? '#FF7F50' : '#64748B' }]}>
                                  {p.name}:
                                </Text>
                                <Text style={[styles.paramChipValue, (isHigh || isBorder) && { color: isHigh ? '#FF7F50' : '#1E3A8A' }]}>
                                  {' '}{p.value} {p.unit}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* =========================================================
                        ACTIONABLE RECORD CALLOUTS:
                        1. Prescriptions -> Order Medicines
                        2. Referred Lab Tests -> Book Lab Test
                    ========================================================= */}
                    {record.hasMedicines && record.medicines && (
                      <View style={styles.actionablePrescriptionBox}>
                        <View style={{ flex: 1, minWidth: 200 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="medkit-outline" size={15} color="#13BE9C" />
                            <Text style={styles.actionBoxTitle}>{record.medicines.length} Prescribed Medicines</Text>
                          </View>
                          <Text style={styles.actionBoxSubtitle} numberOfLines={1}>
                            {record.medicines.map((m) => m.name).join(', ')}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => handleOpenOrderMedicines(record)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicArrowCircle}>
                            <Ionicons name="cart-outline" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicPrimaryActionText}>{t('Order Medicines')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {record.hasReferredTest && record.referredTest && (
                      <View style={styles.actionableReferredLabBox}>
                        <View style={{ flex: 1, minWidth: 200 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="flask-outline" size={15} color="#13BE9C" />
                            <Text style={[styles.actionBoxTitle, { color: '#0F172A' }]}>
                              {t('Referred Test')}: {record.referredTest.testName}
                            </Text>
                          </View>
                          <Text style={styles.actionBoxSubtitle} numberOfLines={1}>{record.referredTest.reason}</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => handleOpenBookLabTest(record)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicArrowCircle}>
                            <Ionicons name="calendar-outline" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicPrimaryActionText}>{t('Book Lab Test')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Actions: View & Download */}
                    <View style={styles.recordActionsRow}>
                      <Text style={styles.fileSizeText}>PDF • {record.fileSize}</Text>

                      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => setViewingRecord(record)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicActionIconCircle}>
                            <Ionicons name="eye-outline" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicActionText}>{t('View Document')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.organicActionBtn}
                          onPress={() => showToast(`Downloading ${record.name}... (PDF)`)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.organicActionIconCircle}>
                            <Ionicons name="cloud-download-outline" size={12} color="#13BE9C" />
                          </View>
                          <Text style={styles.organicActionText}>{t('Download')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}

              {filteredRecords.length > 0 && (
                <PaginationBar
                  currentPage={currentPage}
                  totalItems={filteredRecords.length}
                  pageSize={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  itemLabel="medical records"
                />
              )}
            </View>
          )}
        </View>

        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* =========================================================
          MODAL 1: VIEW MEDICAL RECORD
      ========================================================= */}
      <Modal visible={Boolean(viewingRecord)} transparent animationType="fade" onRequestClose={() => setViewingRecord(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.docModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{viewingRecord?.name}</Text>
                <Text style={styles.modalSubtitle}>{viewingRecord?.facilityName} • {viewingRecord?.date}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewingRecord(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <View style={styles.patientMetaBox}>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>
                    Patient: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{viewingRecord?.patientName}</Text>
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>
                    Doctor: <Text style={{ fontWeight: '700', color: '#1E3A8A' }}>{viewingRecord?.doctorName}</Text>
                  </Text>
                </View>

                <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20, marginVertical: 14 }}>
                  {viewingRecord?.description}
                </Text>

                {/* If parameters present, show detailed clinical parameters table */}
                {viewingRecord?.parameters && viewingRecord.parameters.length > 0 && (
                  <View style={{ marginTop: 10, marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E3A8A', marginBottom: 8, textTransform: 'uppercase' }}>
                      Diagnostic Biomarkers & Clinical Measurements:
                    </Text>
                    <View style={styles.modalParamTable}>
                      <View style={styles.modalParamTableRowHeader}>
                        <Text style={[styles.modalParamCell, { flex: 2, fontWeight: '800' }]}>Test Parameter</Text>
                        <Text style={[styles.modalParamCell, { flex: 1.5, fontWeight: '800' }]}>Observed Value</Text>
                        <Text style={[styles.modalParamCell, { flex: 1.5, fontWeight: '800' }]}>Biological Range</Text>
                        <Text style={[styles.modalParamCell, { flex: 1, fontWeight: '800', textAlign: 'right' }]}>Status</Text>
                      </View>
                      {viewingRecord.parameters.map((p, idx) => (
                        <View key={idx} style={styles.modalParamTableRow}>
                          <Text style={[styles.modalParamCell, { flex: 2, fontWeight: '600' }]}>{p.name}</Text>
                          <Text style={[styles.modalParamCell, { flex: 1.5, fontWeight: '700', color: '#0F172A' }]}>
                            {p.value} {p.unit}
                          </Text>
                          <Text style={[styles.modalParamCell, { flex: 1.5, color: '#64748B' }]}>{p.normalRange || '—'}</Text>
                          <Text
                            style={[
                              styles.modalParamCell,
                              {
                                flex: 1,
                                textAlign: 'right',
                                fontWeight: '700',
                                color: p.status === 'High' ? '#DC2626' : p.status === 'Borderline' ? '#D97706' : '#00B894',
                              },
                            ]}
                          >
                            {p.status || 'Normal'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* If prescription, show medicines table */}
                {viewingRecord?.medicines && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E3A8A', marginBottom: 8, textTransform: 'uppercase' }}>
                      Prescribed Medications:
                    </Text>
                    {viewingRecord.medicines.map((m, idx) => (
                      <View key={idx} style={styles.modalMedRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{m.name}</Text>
                          <Text style={{ fontSize: 11.5, color: '#64748B' }}>{m.dosage}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#00B894' }}>Qty: {m.quantity}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.securitySealBox}>
                  <Ionicons name="lock-closed" size={16} color="#00B894" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 11.5, color: '#00B894', fontWeight: '600' }}>
                    Digitally signed & encrypted per Indian Health Data Standards (EHR 2016).
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setViewingRecord(null)}>
                <Text style={styles.modalCancelBtnText}>{t('Close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  showToast(`Downloaded ${viewingRecord?.name} (PDF)`);
                  setViewingRecord(null);
                }}
              >
                <Ionicons name="download-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>{t('Download PDF')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 2: ACTION - ORDER MEDICINES FROM PRESCRIPTION
      ========================================================= */}
      <Modal visible={Boolean(orderMedsRecord)} transparent animationType="fade" onRequestClose={() => setOrderMedsRecord(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="cart" size={18} color="#00B894" />
                  <Text style={styles.modalTitle}>{t('Order Prescribed Medicines')}</Text>
                </View>
                <Text style={styles.modalSubtitle}>From {orderMedsRecord?.doctorName}</Text>
              </View>
              <TouchableOpacity onPress={() => setOrderMedsRecord(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <Text style={styles.inputSectionHeading}>1. Select Medicines to Order</Text>
                <View style={{ gap: 8, marginBottom: 16 }}>
                  {orderMedsRecord?.medicines?.map((m) => {
                    const isChecked = selectedMedicines[m.id]?.selected;
                    const qty = selectedMedicines[m.id]?.quantity || 1;
                    return (
                      <View key={m.id} style={styles.medSelectCard}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}
                          onPress={() => {
                            setSelectedMedicines((prev) => ({
                              ...prev,
                              [m.id]: { ...prev[m.id], selected: !prev[m.id]?.selected },
                            }));
                          }}
                        >
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isChecked ? '#00B894' : '#94A3B8'}
                          />
                          <View>
                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>{m.name}</Text>
                            <Text style={{ fontSize: 11.5, color: '#64748B' }}>{m.dosage}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E3A8A', marginTop: 2 }}>₹{m.price}</Text>
                          </View>
                        </TouchableOpacity>

                        {/* Quantity Counter */}
                        {isChecked && (
                          <View style={styles.qtyControl}>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => {
                                if (qty > 1) {
                                  setSelectedMedicines((prev) => ({
                                    ...prev,
                                    [m.id]: { ...prev[m.id], quantity: qty - 1 },
                                  }));
                                }
                              }}
                            >
                              <Text style={styles.qtyBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => {
                                setSelectedMedicines((prev) => ({
                                  ...prev,
                                  [m.id]: { ...prev[m.id], quantity: qty + 1 },
                                }));
                              }}
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Available Pharmacy Partners */}
                <Text style={styles.inputSectionHeading}>2. Choose Pharmacy Partner & Delivery</Text>
                <View style={{ gap: 8 }}>
                  {orderMedsRecord?.pharmacyOptions?.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.pharmacyOptionCard, selectedPharmacyOption === idx && styles.pharmacyOptionCardActive]}
                      onPress={() => setSelectedPharmacyOption(idx)}
                    >
                      <Ionicons
                        name={selectedPharmacyOption === idx ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selectedPharmacyOption === idx ? '#00B894' : '#94A3B8'}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{p.name}</Text>
                        <Text style={{ fontSize: 11.5, color: '#64748B' }}>{p.delivery} • {p.rating}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#00B894' }}>Est. ₹{p.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setOrderMedsRecord(null)}>
                <Text style={styles.modalCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleConfirmOrderMedicines}>
                <Ionicons name="cart-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>{t('Add to Cart & Checkout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          MODAL 3: ACTION - BOOK REFERRED LAB TEST
      ========================================================= */}
      <Modal visible={Boolean(bookLabRecord)} transparent animationType="fade" onRequestClose={() => setBookLabRecord(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="flask" size={18} color="#2563EB" />
                  <Text style={styles.modalTitle}>{t('Book Referred Lab Test')}</Text>
                </View>
                <Text style={styles.modalSubtitle}>{bookLabRecord?.referredTest?.testName}</Text>
              </View>
              <TouchableOpacity onPress={() => setBookLabRecord(null)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <View style={styles.doctorReferralPill}>
                  <Ionicons name="shield-checkmark" size={16} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#1E40AF', flex: 1 }}>
                    Referred by: <Text style={{ fontWeight: '700' }}>{bookLabRecord?.doctorName}</Text> • {bookLabRecord?.referredTest?.reason}
                  </Text>
                </View>

                {/* Choose Diagnostic Centre */}
                <Text style={[styles.inputSectionHeading, { marginTop: 14 }]}>1. Select Accredited Diagnostic Centre</Text>
                <View style={{ gap: 8, marginBottom: 14 }}>
                  {bookLabRecord?.referredTest?.labs?.map((lab, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.pharmacyOptionCard, selectedLabOption === idx && styles.pharmacyOptionCardActive]}
                      onPress={() => {
                        setSelectedLabOption(idx);
                        if (lab.slots?.length > 0) setSelectedLabSlot(lab.slots[0]);
                      }}
                    >
                      <Ionicons
                        name={selectedLabOption === idx ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selectedLabOption === idx ? '#00B894' : '#94A3B8'}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{lab.name}</Text>
                        <Text style={{ fontSize: 11.5, color: '#64748B' }}>Free Home Sample Collection Available</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#00B894' }}>₹{lab.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Available Slots */}
                <Text style={styles.inputSectionHeading}>2. Select Sample Collection Slot</Text>
                <View style={{ gap: 6 }}>
                  {bookLabRecord?.referredTest?.labs?.[selectedLabOption]?.slots?.map((slot, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.slotOptionBtn, selectedLabSlot === slot && styles.slotOptionBtnActive]}
                      onPress={() => setSelectedLabSlot(slot)}
                    >
                      <Ionicons
                        name={selectedLabSlot === slot ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={selectedLabSlot === slot ? '#00B894' : '#94A3B8'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.slotOptionText, selectedLabSlot === slot && { color: '#00B894', fontWeight: '700' }]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setBookLabRecord(null)}>
                <Text style={styles.modalCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleConfirmBookLab}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>{t('Confirm Slot Booking')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const MyMedicalRecordsScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  return !isDesktopLayout(width) ? (
    <HealthRecordsScreenMobile {...props} />
  ) : (
    <MyMedicalRecordsScreenWeb {...props} />
  );
};

export default MyMedicalRecordsScreenResponsive;

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
  recordsBadgePill: {
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
    color: '#1E3A8A',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: '#647488',
    marginTop: 6,
    maxWidth: 680,
    lineHeight: 20,
  },
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    boxShadow: '0 4px 14px rgba(0, 184, 148, 0.3)',
  },
  uploadDocBtnText: {
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    minWidth: 280,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    cursor: 'pointer',
  },
  memberChipActive: {
    backgroundColor: '#13BE9C',
    borderColor: '#13BE9C',
  },
  memberChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  memberChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  memberCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 0.5,
    borderRadius: 6,
  },
  memberCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  memberCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  memberCountTextActive: {
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
  recordsList: {
    gap: 16,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
  },
  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  recordId: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  patientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  patientPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  recordDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  recordMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  authorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  recordDesc: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },
  // ACTIONABLE CALLOUT BOXES
  actionablePrescriptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  actionableReferredLabBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  actionBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  actionBoxSubtitle: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  orderMedsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  orderMedsActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  bookLabActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bookLabActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  recordActionsRow: {
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
  fileSizeText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  viewDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  downloadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#E6F8F4',
  },
  downloadDocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  // Modal Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  docModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  actionModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 620,
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
  patientMetaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  modalMedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  securitySealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    padding: 10,
    marginTop: 16,
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
  // Order Medicines Modal
  inputSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  medSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  qtyText: {
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pharmacyOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pharmacyOptionCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#F0FDF4',
  },
  // Book Lab Modal
  doctorReferralPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10,
  },
  slotOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  slotOptionBtnActive: {
    borderColor: '#00B894',
    backgroundColor: '#E6F8F4',
  },
  slotOptionText: {
    fontSize: 12.5,
    color: '#334155',
  },
  // Parameter Preview on Card
  paramPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 10,
  },
  paramPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  paramChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paramChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paramChipHigh: {
    backgroundColor: '#FFF2ED',
    borderColor: '#FFD8CC',
  },
  paramChipBorderline: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  paramChipName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  paramChipValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  // Modal Parameter Table
  modalParamTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  modalParamTableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  modalParamTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalParamCell: {
    fontSize: 12,
    color: '#334155',
  },
});
