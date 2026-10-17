import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Share,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_MEDICAL_RECORDS, INITIAL_TEST_REPORTS } from '../../data/patientDashboardData';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import WebFooter from '../../components/web/WebFooter';

const CATEGORY_TABS = [
  { id: 'all',        label: 'All',          icon: 'documents-outline' },
  { id: 'rx',         label: 'Prescriptions', icon: 'medkit-outline' },
  { id: 'labs',       label: 'Lab Reports',   icon: 'flask-outline' },
  { id: 'suggestion', label: 'Suggestions',   icon: 'bulb-outline' },
  { id: 'diagnostic', label: 'Diagnostic',    icon: 'scan-outline' },
  { id: 'other',      label: 'Other',         icon: 'folder-open-outline' },
];

const DATE_FILTERS = [
  { id: 'all',   label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: '3m',    label: 'Last 3 Months' },
  { id: '6m',    label: 'Last 6 Months' },
];

function buildCategory(rec) {
  const t = (rec.recordType || '').toLowerCase();
  if (t.includes('prescription')) return 'rx';
  if (t.includes('lab'))         return 'labs';
  if (t.includes('diagnostic'))  return 'diagnostic';
  if (t.includes('suggestion'))  return 'suggestion';
  return 'other';
}

function iconForCategory(cat) {
  switch (cat) {
    case 'rx':         return { icon: 'medkit',        iconColor: '#0D9488', iconBg: '#CCFBF1' };
    case 'labs':       return { icon: 'flask',          iconColor: '#0284C7', iconBg: '#E0F2FE' };
    case 'suggestion': return { icon: 'bulb',           iconColor: '#D97706', iconBg: '#FEF3C7' };
    case 'diagnostic': return { icon: 'scan',           iconColor: '#7C3AED', iconBg: '#EDE9FE' };
    default:           return { icon: 'document-text',  iconColor: '#64748B', iconBg: '#F1F5F9' };
  }
}

function statusForRecord(rec, t = (k) => k) {
  if (rec.recordType === 'Prescription')      return { text: t('Active Rx'),   color: '#0D9488', bg: '#F0FDFA' };
  if (rec.recordType === 'Lab Report')        return { text: t('Completed'),   color: '#059669', bg: '#ECFDF5' };
  if (rec.recordType === 'Diagnostic Report') return { text: t('Reviewed'),    color: '#7C3AED', bg: '#EDE9FE' };
  return { text: t('Filed'), color: '#64748B', bg: '#F1F5F9' };
}

function fmtDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function withinDays(d, days) {
  try {
    const diff = Date.now() - new Date(d).getTime();
    return diff >= 0 && diff <= days * 86400000;
  } catch { return true; }
}

function matchDate(d, filter) {
  if (filter === 'all')   return true;
  if (filter === 'month') return withinDays(d, 30);
  if (filter === '3m')    return withinDays(d, 90);
  if (filter === '6m')    return withinDays(d, 180);
  return true;
}

const HealthRecordsScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [selectedPatientId, setSelectedPatientId] = useState('self');
  const [selectedCategory,   setSelectedCategory]  = useState('all');
  const [searchQuery,         setSearchQuery]        = useState('');
  const [dateFilter,          setDateFilter]         = useState('all');
  const [familyMembers,       setFamilyMembers]      = useState([]);
  const [primaryUserName,     setPrimaryUserName]    = useState('');
  const [primaryDisplayName,  setPrimaryDisplayName] = useState('You');
  const [userUploaded,        setUserUploaded]       = useState([]);
  const [toastMsg,            setToastMsg]           = useState(null);
  const [isSyncing,           setIsSyncing]          = useState(false);
  const [uploadModalVisible,  setUploadModalVisible] = useState(false);
  const [uploadPatientId,     setUploadPatientId]    = useState('self');
  const [detailVisible,       setDetailVisible]      = useState(false);
  const [activeRecord,        setActiveRecord]       = useState(null);
  const [dateModalVisible,    setDateModalVisible]   = useState(false);

  useEffect(() => {
    loadData();
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  const loadData = async () => {
    try {
      const storedPrimary = await AsyncStorage.getItem('@unnathi_primary_user');
      const storedUser    = await AsyncStorage.getItem('user');
      const storedName    = await AsyncStorage.getItem('userName');
      let name = '';
      if (storedPrimary) { try { const p = JSON.parse(storedPrimary); if (p?.name) name = p.name.trim(); } catch {} }
      if (!name && storedUser) { try { const u = JSON.parse(storedUser); if (u?.name) name = u.name.trim(); } catch {} }
      if (!name && storedName) name = storedName.trim();
      if (!name) name = 'Account Holder';
      setPrimaryUserName(name);
      setPrimaryDisplayName(name.split(' ')[0] || 'You');

      const savedFam = await AsyncStorage.getItem('@unnathi_family_members');
      let members = [];
      if (savedFam) { try { const p = JSON.parse(savedFam); if (Array.isArray(p) && p.length > 0) members = p; } catch {} }
      if (members.length === 0) {
        members = [{ id: 'self', name, relation: 'Self', isPrimary: true }];
      } else {
        members = members.map((m) =>
          (m.id === 'self' || m.isPrimary || m.relation === 'Self')
            ? { ...m, name, displayName: name.split(' ')[0] }
            : m
        );
      }
      setFamilyMembers(members);

      const saved = await AsyncStorage.getItem('@unnathi_health_records');
      if (saved) { try { const p = JSON.parse(saved); if (Array.isArray(p)) setUserUploaded(p); } catch {} }
    } catch {}
  };

  const dashboardRecords = useMemo(() =>
    INITIAL_MEDICAL_RECORDS.map((rec) => {
      const cat = buildCategory(rec);
      const st  = statusForRecord(rec, t);
      return {
        id: rec.id, title: rec.name, category: cat,
        patientId: rec.patientId || 'self', patientName: rec.patientName || 'Self',
        doctor: rec.doctorName || '', facility: rec.facilityName || '',
        date: rec.date || '', fileSize: rec.fileSize || '',
        status: st.text, statusColor: st.color, statusBg: st.bg,
        summary: rec.description || '',
        ...iconForCategory(cat),
        hasMedicines: rec.hasMedicines || false,
        medicines: rec.medicines || [],
        parameters: rec.parameters || [],
        hasReferredTest: rec.hasReferredTest || false,
        referredTest: rec.referredTest || null,
        pharmacyOptions: rec.pharmacyOptions || [],
        recordType: rec.recordType, _source: 'dashboard',
      };
    }), [t]);

  const labReportRecords = useMemo(() =>
    INITIAL_TEST_REPORTS.filter((r) => r.reportAvailable).map((rep) => ({
      id: rep.id + '-rpt', title: rep.testName, category: 'labs',
      patientId: rep.patientId || 'self', patientName: rep.patientName || 'Self',
      doctor: '', facility: rep.labName || '',
      date: rep.testDate || rep.reportDate || '', fileSize: rep.fileSize || '',
      status: t(rep.normalStatus || 'Completed'),
      statusColor: rep.normalStatus === 'Normal' ? '#059669' : rep.normalStatus === 'Borderline' ? '#D97706' : '#0284C7',
      statusBg:    rep.normalStatus === 'Normal' ? '#ECFDF5' : rep.normalStatus === 'Borderline' ? '#FEF3C7' : '#E0F2FE',
      summary: rep.doctorNotes || `${rep.modalityType || ''} • ${rep.sampleType || ''}`,
      ...iconForCategory('labs'),
      hasMedicines: false, medicines: [], parameters: rep.parameters || [],
      hasReferredTest: false, referredTest: null,
      recordType: 'Lab Report', _source: 'testReports',
    })), [t]);

  const doctorSuggestions = useMemo(() =>
    INITIAL_MEDICAL_RECORDS.filter((r) => r.hasReferredTest && r.referredTest).map((rec) => ({
      id: rec.id + '-sug', title: `Suggested: ${rec.referredTest.testName}`, category: 'suggestion',
      patientId: rec.patientId || 'self', patientName: rec.patientName || 'Self',
      doctor: rec.doctorName || '', facility: rec.facilityName || '',
      date: rec.date || '', fileSize: '',
      status: t('Recommended'), statusColor: '#D97706', statusBg: '#FEF3C7',
      summary: `Reason: ${rec.referredTest.reason || 'Doctor recommended lab test'}`,
      ...iconForCategory('suggestion'),
      hasMedicines: false, medicines: [], parameters: [],
      hasReferredTest: true, referredTest: rec.referredTest,
      recordType: 'Suggestion', _source: 'suggestion',
    })), [t]);

  const uploadedRecords = useMemo(() =>
    userUploaded.map((r) => ({ ...r, ...iconForCategory(r.category || 'other'), _source: 'uploaded' })), [userUploaded]);

  const allRecords = useMemo(() => {
    const dashLabIds = new Set(dashboardRecords.filter((r) => r.recordType === 'Lab Report').map((r) => r.id));
    const extraLabs  = labReportRecords.filter((r) => !dashLabIds.has(r.id.replace('-rpt', '')));
    return [...uploadedRecords, ...dashboardRecords, ...doctorSuggestions, ...extraLabs];
  }, [uploadedRecords, dashboardRecords, doctorSuggestions, labReportRecords]);

  const selfMemberId = useMemo(() =>
    familyMembers.find((m) => m.isPrimary || m.id === 'self')?.id || 'self', [familyMembers]);

  const familyChips = useMemo(() => {
    return familyMembers.map((m) => {
      const isSelf = m.id === 'self' || m.isPrimary || m.relation === 'Self';
      const count  = allRecords.filter((r) =>
        isSelf ? (r.patientId === 'self' || r.patientId === m.id) : r.patientId === m.id
      ).length;
      const rawName = isSelf ? (primaryDisplayName || 'You') : (m.name || '').split(' ')[0];
      return {
        id: m.id, name: rawName, relation: isSelf ? t('My Records') : t(m.relation || 'Family'),
        initials: rawName.slice(0, 2).toUpperCase(), count, isSelf,
      };
    });
  }, [familyMembers, allRecords, primaryDisplayName, t]);

  const categoryCounts = useMemo(() => {
    const base = allRecords.filter((r) => {
      const isSelf = selectedPatientId === 'self' || selectedPatientId === selfMemberId;
      return isSelf
        ? r.patientId === 'self' || r.patientId === selfMemberId
        : r.patientId === selectedPatientId;
    });
    const counts = { all: base.length };
    CATEGORY_TABS.forEach((t) => { if (t.id !== 'all') counts[t.id] = base.filter((r) => r.category === t.id).length; });
    return counts;
  }, [allRecords, selectedPatientId, selfMemberId]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      const isSelf = selectedPatientId === 'self' || selectedPatientId === selfMemberId;
      const matchesPt = isSelf
        ? rec.patientId === 'self' || rec.patientId === selfMemberId
        : rec.patientId === selectedPatientId;
      if (!matchesPt) return false;
      if (selectedCategory !== 'all' && rec.category !== selectedCategory) return false;
      if (!matchDate(rec.date, dateFilter)) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const hay = [rec.title, rec.doctor, rec.facility, rec.patientName, rec.summary].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, selectedPatientId, selfMemberId, selectedCategory, searchQuery, dateFilter]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsSyncing(false);
    showToast('Health records synced successfully.');
  };

  const handleShare = async (rec) => {
    try {
      await Share.share({
        title: rec.title,
        message: `MediUnify Health Record\n${rec.title}\nPatient: ${rec.patientName}\nDate: ${rec.date}\nDoctor: ${rec.doctor}\nFacility: ${rec.facility}`,
      });
    } catch {}
  };

  const openDetail = (rec) => { setActiveRecord(rec); setDetailVisible(true); };

  // ── RECORD CARD ──
  const renderCard = (rec) => (
    <TouchableOpacity
      key={rec.id}
      style={[styles.recordCard, isTablet && styles.recordCardTablet]}
      onPress={() => openDetail(rec)}
      activeOpacity={0.9}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.cardIconBox, { backgroundColor: rec.iconBg }]}>
          <Ionicons name={rec.icon} size={20} color={rec.iconColor} />
        </View>
        <View style={styles.cardTitleCol}>
          <View style={styles.patientPill}>
            <Ionicons name="person" size={10} color="#0F766E" />
            <Text style={styles.patientPillText} numberOfLines={1}>{rec.patientName}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{rec.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: rec.statusBg }]}>
          <Text style={[styles.statusText, { color: rec.statusColor }]}>{rec.status}</Text>
        </View>
      </View>

      {(rec.doctor || rec.facility) ? (
        <View style={styles.cardMeta}>
          {!!rec.doctor   && <View style={styles.metaRow}><Ionicons name="person-circle-outline" size={13} color="#64748B" /><Text style={styles.metaText}  numberOfLines={1}>{rec.doctor}</Text></View>}
          {!!rec.facility && <View style={styles.metaRow}><Ionicons name="business-outline"      size={13} color="#64748B" /><Text style={styles.metaFacil} numberOfLines={1}>{rec.facility}</Text></View>}
        </View>
      ) : null}

      {!!rec.summary && (
        <View style={styles.summaryBox}>
          <Ionicons name="analytics-outline" size={12} color="#0F766E" />
          <Text style={styles.summaryText} numberOfLines={2}>{rec.summary}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
          <Text style={styles.footerDate}>{fmtDate(rec.date) || rec.date}</Text>
          {!!rec.fileSize && <><Text style={styles.footerDot}>•</Text><Text style={styles.footerDate}>{rec.fileSize}</Text></>}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(rec)} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={15} color="#0F766E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.viewBtn} onPress={() => openDetail(rec)} activeOpacity={0.85}>
            <Ionicons name="eye" size={13} color="#FFF" />
            <Text style={styles.viewBtnText}>{t('View')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {rec.category === 'suggestion' && rec.referredTest && (
        <TouchableOpacity
          style={styles.bookTestBtn}
          onPress={() => { navigation.navigate('LabTests'); }}
          activeOpacity={0.88}
        >
          <Ionicons name="flask-outline" size={14} color="#FFF" />
          <Text style={styles.bookTestBtnText}>{t('Book Recommended Test')}</Text>
          <Ionicons name="arrow-forward" size={13} color="#FFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // ── MAIN RENDER ──
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      {toastMsg && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color="#34D399" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.webHeaderInner}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={isDarkMode ? theme.text : "#0F172A"} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{t('Health Records')}</Text>
              <View style={styles.headerSubRow}>
                <View style={styles.liveDot} />
                <Text style={styles.headerSubText}>{t('ABHA Verified • Private & Secure')}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.uploadHeaderBtn} onPress={() => setUploadModalVisible(true)} activeOpacity={0.85}>
            <Ionicons name="cloud-upload" size={14} color="#FFF" />
            <Text style={styles.uploadHeaderBtnText}>{t('Upload')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={Platform.OS === 'web' ? styles.webInnerContainer : null}>
          {/* FAMILY SWITCHER */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionLabelRow}>
                <Ionicons name="people" size={15} color="#0F766E" />
                <Text style={styles.sectionLabel}>{t('Select Patient')}</Text>
              </View>
              <TouchableOpacity style={styles.manageFamilyBtn} onPress={() => navigation.navigate('FamilyProfiles')} activeOpacity={0.8}>
                <Ionicons name="add" size={12} color="#0F766E" />
                <Text style={styles.manageFamilyText}>{t('Manage Family')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyScroll}>
              {familyChips.map((chip) => {
                const isSel = selectedPatientId === chip.id || (chip.isSelf && selectedPatientId === 'self');
                return (
                  <TouchableOpacity key={chip.id} style={[styles.familyChip, isSel && styles.familyChipActive]} onPress={() => setSelectedPatientId(chip.id)} activeOpacity={0.8}>
                    <View style={[styles.chipAvatar, isSel && styles.chipAvatarActive]}>
                      <Text style={[styles.chipInitials, isSel && styles.chipInitialsActive]}>{chip.initials}</Text>
                      <View style={[styles.chipCount, isSel && styles.chipCountActive]}>
                        <Text style={styles.chipCountText}>{chip.count}</Text>
                      </View>
                    </View>
                    <Text style={[styles.chipName, isSel && styles.chipNameActive]} numberOfLines={1}>{chip.name}</Text>
                    <Text style={[styles.chipRelation, isSel && styles.chipRelationActive]} numberOfLines={1}>{chip.relation}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.addFamilyChip} onPress={() => navigation.navigate('FamilyProfiles')} activeOpacity={0.8}>
                <View style={styles.addFamilyCircle}><Ionicons name="person-add" size={15} color="#0F766E" /></View>
                <Text style={styles.addFamilyText}>+ {t('Add')}</Text>
                <Text style={styles.addFamilySub}>{t('Member')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* SEARCH + DATE FILTER */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('Search doctor, lab, test, prescription...')}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.dateFilterPill} onPress={() => setDateModalVisible(true)} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={13} color="#0F766E" />
              <Text style={styles.dateFilterText}>{t(DATE_FILTERS.find((d) => d.id === dateFilter)?.label || 'All Time')}</Text>
              <Ionicons name="chevron-down" size={12} color="#0F766E" />
            </TouchableOpacity>
          </View>

          {/* CATEGORY TABS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <TouchableOpacity key={tab.id} style={[styles.categoryPill, isActive && styles.categoryPillActive]} onPress={() => setSelectedCategory(tab.id)} activeOpacity={0.8}>
                  <Ionicons name={tab.icon} size={13} color={isActive ? '#FFF' : '#64748B'} />
                  <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>{t(tab.label)}</Text>
                  <View style={[styles.categoryCount, isActive && styles.categoryCountActive]}>
                    <Text style={[styles.categoryCountText, isActive && styles.categoryCountTextActive]}>{categoryCounts[tab.id] || 0}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* RECORDS */}
          <View style={[styles.recordsWrap, isTablet && styles.recordsWrapTablet]}>
            <View style={styles.recordsHeader}>
              <Text style={styles.recordsHeaderText}>{filteredRecords.length} {filteredRecords.length === 1 ? t('Record') : t('Records')}</Text>
              <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={isSyncing} activeOpacity={0.8}>
                {isSyncing ? <ActivityIndicator size="small" color="#0F766E" /> : <Ionicons name="sync" size={14} color="#0F766E" />}
                <Text style={styles.syncBtnText}>{isSyncing ? t('Syncing...') : t('Sync')}</Text>
              </TouchableOpacity>
            </View>

            {filteredRecords.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}><Ionicons name="folder-open-outline" size={40} color="#0D9488" /></View>
                <Text style={styles.emptyTitle}>
                  {searchQuery
                    ? `No records matching "${searchQuery}"`
                    : selectedCategory !== 'all'
                    ? `No ${t(CATEGORY_TABS.find((t) => t.id === selectedCategory)?.label || '')} found`
                    : t('No health records found')}
                </Text>
                <Text style={styles.emptySub}>
                  {selectedPatientId !== 'self' && selectedPatientId !== selfMemberId
                    ? 'No records linked to this family member yet.'
                    : 'Upload a prescription or lab report to get started.'}
                </Text>
                <TouchableOpacity style={styles.emptyUploadBtn} onPress={() => setUploadModalVisible(true)} activeOpacity={0.85}>
                  <Ionicons name="cloud-upload" size={14} color="#FFF" />
                  <Text style={styles.emptyUploadBtnText}>{t('Upload Document')}</Text>
                </TouchableOpacity>
              </View>
            ) : isTablet ? (
              <View style={styles.tabletGrid}>{filteredRecords.map(renderCard)}</View>
            ) : (
              filteredRecords.map(renderCard)
            )}
          </View>

          <View style={{ height: 40 }} />
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* ── RECORD DETAIL MODAL ── */}
      <Modal visible={detailVisible} transparent animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, isTablet && styles.detailModalTablet]}>
            <View style={styles.dragHandle} />
            {activeRecord && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailIconBox, { backgroundColor: activeRecord.iconBg }]}>
                    <Ionicons name={activeRecord.icon} size={22} color={activeRecord.iconColor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailRecordType}>{activeRecord.recordType || activeRecord.category.toUpperCase()}</Text>
                    <Text style={styles.detailTitle} numberOfLines={2}>{activeRecord.title}</Text>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailVisible(false)} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailMetaRow}>
                  <View style={[styles.statusBadge, { backgroundColor: activeRecord.statusBg }]}>
                    <Text style={[styles.statusText, { color: activeRecord.statusColor }]}>{activeRecord.status}</Text>
                  </View>
                  <View style={styles.patientPill}>
                    <Ionicons name="person" size={11} color="#0F766E" />
                    <Text style={styles.patientPillText}>{activeRecord.patientName}</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  {!!activeRecord.doctor   && <View style={styles.infoItem}><Text style={styles.infoLabel}>{t('Doctor')}</Text><Text style={styles.infoValue}>{activeRecord.doctor}</Text></View>}
                  {!!activeRecord.facility && <View style={styles.infoItem}><Text style={styles.infoLabel}>{t('Facility')}</Text><Text style={styles.infoValue}>{activeRecord.facility}</Text></View>}
                  {!!activeRecord.date     && <View style={styles.infoItem}><Text style={styles.infoLabel}>{t('Date')}</Text><Text style={styles.infoValue}>{fmtDate(activeRecord.date) || activeRecord.date}</Text></View>}
                  {!!activeRecord.fileSize && <View style={styles.infoItem}><Text style={styles.infoLabel}>{t('File')}</Text><Text style={styles.infoValue}>{activeRecord.fileSize}</Text></View>}
                </View>

                {!!activeRecord.summary && (
                  <View style={styles.detailSummaryBox}>
                    <Text style={styles.detailSectionTitle}>{t('Summary')}</Text>
                    <Text style={styles.detailSummaryText}>{activeRecord.summary}</Text>
                  </View>
                )}

                {activeRecord.hasMedicines && activeRecord.medicines?.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('Prescribed Medicines')}</Text>
                    {activeRecord.medicines.map((med, i) => (
                      <View key={med.id || i} style={styles.medicineRow}>
                        <View style={styles.medicineIcon}><Ionicons name="medkit-outline" size={14} color="#0D9488" /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medicineName}>{med.name}{med.strength ? ` (${med.strength})` : ''}</Text>
                          <Text style={styles.medicineDosage}>{med.dosage}</Text>
                          {!!med.duration && <Text style={styles.medicineDuration}>Duration: {med.duration}</Text>}
                        </View>
                        {!!med.price && <Text style={styles.medicinePrice}>₹{med.price}</Text>}
                      </View>
                    ))}
                    <TouchableOpacity style={styles.orderMedsBtn} onPress={() => { setDetailVisible(false); navigation.navigate('Pharmacy'); }} activeOpacity={0.88}>
                      <Ionicons name="cart-outline" size={15} color="#FFF" />
                      <Text style={styles.orderMedsBtnText}>{t('Order from Pharmacy')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeRecord.parameters?.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('Test Results')}</Text>
                    {activeRecord.parameters.map((p, i) => {
                      const isNormal = p.status?.toLowerCase() === 'normal';
                      const isHigh   = p.status?.toLowerCase() === 'high';
                      return (
                        <View key={i} style={styles.paramRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.paramName}>{p.name}</Text>
                            {!!p.normalRange && <Text style={styles.paramRange}>Ref: {p.normalRange} {p.unit}</Text>}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.paramValue, isHigh && { color: '#DC2626' }, isNormal && { color: '#059669' }]}>{p.value} {p.unit}</Text>
                            <Text style={[styles.paramStatus, { color: isHigh ? '#DC2626' : isNormal ? '#059669' : '#D97706' }]}>{p.status}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {activeRecord.hasReferredTest && activeRecord.referredTest && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('Doctor Recommendation')}</Text>
                    <View style={styles.suggestionBox}>
                      <Ionicons name="bulb" size={18} color="#D97706" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.suggestionTest}>{activeRecord.referredTest.testName}</Text>
                        {!!activeRecord.referredTest.reason && <Text style={styles.suggestionReason}>{activeRecord.referredTest.reason}</Text>}
                      </View>
                    </View>
                    <TouchableOpacity style={styles.bookTestModalBtn} onPress={() => { setDetailVisible(false); navigation.navigate('LabTests'); }} activeOpacity={0.88}>
                      <Ionicons name="flask-outline" size={15} color="#FFF" />
                      <Text style={styles.bookTestModalBtnText}>{t('Book This Test Now')}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailDownloadBtn} onPress={() => { setDetailVisible(false); showToast('Document downloaded to device.'); }} activeOpacity={0.88}>
                    <Ionicons name="download-outline" size={16} color="#0F766E" />
                    <Text style={styles.detailDownloadBtnText}>{t('Download')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.detailShareBtn} onPress={() => { setDetailVisible(false); handleShare(activeRecord); }} activeOpacity={0.88}>
                    <Ionicons name="share-social-outline" size={16} color="#FFF" />
                    <Text style={styles.detailShareBtnText}>{t('Share')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── DATE FILTER MODAL ── */}
      <Modal visible={dateModalVisible} transparent animationType="fade" onRequestClose={() => setDateModalVisible(false)}>
        <TouchableOpacity style={styles.backdropOverlay} activeOpacity={1} onPress={() => setDateModalVisible(false)}>
          <View style={styles.dateFilterModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.dateFilterModalTitle}>{t('Filter by Date')}</Text>
            {DATE_FILTERS.map((df) => (
              <TouchableOpacity key={df.id} style={styles.dateFilterItem} onPress={() => { setDateFilter(df.id); setDateModalVisible(false); }} activeOpacity={0.8}>
                <Text style={[styles.dateFilterItemText, dateFilter === df.id && styles.dateFilterItemTextActive]}>{t(df.label)}</Text>
                {dateFilter === df.id && <Ionicons name="checkmark-circle" size={18} color="#0F766E" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── UPLOAD MODAL ── */}
      <Modal visible={uploadModalVisible} transparent animationType="slide" onRequestClose={() => setUploadModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModal}>
            <View style={styles.dragHandle} />
            <View style={styles.uploadModalHeader}>
              <View>
                <Text style={styles.uploadModalTag}>DIGITAL HEALTH LOCKER</Text>
                <Text style={styles.uploadModalTitle}>{t('Upload Health Document')}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setUploadModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.uploadModalSub}>Select patient and document type to securely store.</Text>

            <Text style={styles.uploadSectionLabel}>{t('Select Patient:')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {familyMembers.map((m) => {
                const isSelf = m.id === 'self' || m.isPrimary || m.relation === 'Self';
                const isSel  = uploadPatientId === m.id;
                return (
                  <TouchableOpacity key={m.id} style={[styles.uploadPatientChip, isSel && styles.uploadPatientChipActive]} onPress={() => setUploadPatientId(m.id)} activeOpacity={0.8}>
                    <Ionicons name="person" size={12} color={isSel ? '#FFF' : '#0F766E'} />
                    <Text style={[styles.uploadPatientChipText, isSel && styles.uploadPatientChipTextActive]}>
                      {isSelf ? `Self (${primaryDisplayName})` : `${(m.name || '').split(' ')[0]} (${m.relation})`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {[
              { icon: 'camera',          bg: '#F0FDFA', color: '#0F766E', title: 'Scan with Camera',            sub: 'Photo of prescription or doctor slip',    onPress: () => { setUploadModalVisible(false); navigation.navigate('Prescriptions'); } },
              { icon: 'document-attach', bg: '#EFF6FF', color: '#2563EB', title: 'Upload PDF or Image',          sub: 'Upload CBC, MRI, scan or lab PDF report', onPress: () => { setUploadModalVisible(false); navigation.navigate('Reports'); } },
              { icon: 'cloud-download',  bg: '#E6F8F5', color: '#00B894', title: 'Auto-Fetch from Lab/Hospital', sub: 'Sync using registered mobile number',      onPress: () => { setUploadModalVisible(false); showToast('Auto-syncing lab reports via OTP.'); } },
            ].map((opt, i) => (
              <TouchableOpacity key={i} style={styles.uploadOption} onPress={opt.onPress} activeOpacity={0.85}>
                <View style={[styles.uploadOptionIcon, { backgroundColor: opt.bg }]}><Ionicons name={opt.icon} size={22} color={opt.color} /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.uploadOptionTitle}>{opt.title}</Text>
                  <Text style={styles.uploadOptionSub}>{opt.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HealthRecordsScreen;

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  toast: {
    position: 'absolute', top: Platform.OS === 'android' ? 56 : 70, alignSelf: 'center',
    zIndex: 999, flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  toastText: { color: '#FFF', fontSize: 12.5, fontWeight: '700' },
  header: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  webHeaderInner: {
    maxWidth: 1080,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  headerSubText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  uploadHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F766E',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 5,
    shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  uploadHeaderBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  scroll: { paddingBottom: Platform.OS === 'web' ? 0 : 110 },
  webInnerContainer: { maxWidth: 1080, width: '100%', alignSelf: 'center' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  manageFamilyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#CCFBF1', gap: 4 },
  manageFamilyText: { fontSize: 11, fontWeight: '800', color: '#0F766E' },
  familyScroll: { paddingHorizontal: 16, gap: 10 },
  familyChip: { alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', width: 76 },
  familyChipActive: { borderColor: '#0F766E', backgroundColor: '#F0FDFA', shadowColor: '#0F766E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  chipAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 5 },
  chipAvatarActive: { backgroundColor: '#0F766E' },
  chipInitials: { fontSize: 14, fontWeight: '900', color: '#0F766E' },
  chipInitialsActive: { color: '#FFF' },
  chipCount: { position: 'absolute', top: -2, right: -2, backgroundColor: '#0F172A', minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#FFF' },
  chipCountActive: { backgroundColor: '#059669' },
  chipCountText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  chipName:         { fontSize: 11,   fontWeight: '800', color: '#334155', textAlign: 'center' },
  chipNameActive:   { color: '#0F766E' },
  chipRelation:     { fontSize: 9.5,  fontWeight: '600', color: '#94A3B8', marginTop: 1, textAlign: 'center' },
  chipRelationActive: { color: '#0D9488' },
  addFamilyChip: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1.5, borderColor: '#CBD5E1', borderStyle: 'dashed', width: 68 },
  addFamilyCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  addFamilyText: { fontSize: 11, fontWeight: '800', color: '#0F766E' },
  addFamilySub:  { fontSize: 9, color: '#94A3B8', marginTop: 1 },
  searchWrap: { paddingHorizontal: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },
  dateFilterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#CCFBF1', gap: 4 },
  dateFilterText: { fontSize: 11.5, fontWeight: '700', color: '#0F766E' },
  categoryScroll: { paddingHorizontal: 16, gap: 8, marginTop: 14 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', gap: 5 },
  categoryPillActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  categoryPillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  categoryPillTextActive: { color: '#FFF' },
  categoryCount: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 10 },
  categoryCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  categoryCountText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  categoryCountTextActive: { color: '#FFF' },
  recordsWrap: { marginTop: 18, paddingHorizontal: 16 },
  recordsWrapTablet: { paddingHorizontal: 20 },
  recordsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recordsHeaderText: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#CCFBF1' },
  syncBtnText: { fontSize: 11.5, fontWeight: '700', color: '#0F766E' },
  tabletGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  recordCard: { backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  recordCardTablet: { width: Platform.OS === 'web' ? 'calc(50% - 7px)' : '48%' },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitleCol: { flex: 1 },
  patientPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F0FDFA', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 3, borderWidth: 1, borderColor: '#CCFBF1' },
  patientPillText: { fontSize: 10, fontWeight: '800', color: '#0F766E' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', lineHeight: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  cardMeta: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC', gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:  { fontSize: 11.5, fontWeight: '600', color: '#334155', flex: 1 },
  metaFacil: { fontSize: 11, color: '#64748B', flex: 1 },
  summaryBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 8, marginTop: 8, gap: 6, borderWidth: 1, borderColor: '#EDF2F7' },
  summaryText: { fontSize: 11, color: '#0F766E', fontWeight: '600', flex: 1, lineHeight: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap' },
  footerDate: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  footerDot:  { color: '#CBD5E1' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F766E', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, gap: 4 },
  viewBtnText: { color: '#FFF', fontSize: 11.5, fontWeight: '800' },
  bookTestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D97706', paddingVertical: 10, borderRadius: 10, marginTop: 10, gap: 6 },
  bookTestBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  emptyCard: { alignItems: 'center', padding: 28, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 17 },
  emptyUploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F766E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  emptyUploadBtnText: { color: '#FFF', fontSize: 12.5, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'flex-end' },
  backdropOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center' },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  detailModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxHeight: '90%' },
  detailModalTablet: { marginHorizontal: 60, borderRadius: 24, maxHeight: '85%' },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  detailIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailRecordType: { fontSize: 10, fontWeight: '900', color: '#64748B', letterSpacing: 0.5, marginBottom: 2 },
  detailTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  infoItem: { width: '47%' },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 12.5, fontWeight: '700', color: '#0F172A' },
  detailSummaryBox: { backgroundColor: '#F0FDFA', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#CCFBF1' },
  detailSectionTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  detailSummaryText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  detailSection: { marginBottom: 16 },
  medicineRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9', gap: 8 },
  medicineIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' },
  medicineName:     { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  medicineDosage:   { fontSize: 11.5, color: '#64748B', marginTop: 1 },
  medicineDuration: { fontSize: 11, color: '#0D9488', marginTop: 2, fontWeight: '600' },
  medicinePrice:    { fontSize: 12, fontWeight: '800', color: '#0D9488' },
  orderMedsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F766E', paddingVertical: 11, borderRadius: 12, marginTop: 6, gap: 6 },
  orderMedsBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  paramRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 9 },
  paramName:   { fontSize: 12.5, fontWeight: '700', color: '#0F172A' },
  paramRange:  { fontSize: 10.5, color: '#94A3B8', marginTop: 1 },
  paramValue:  { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  paramStatus: { fontSize: 10.5, fontWeight: '700', marginTop: 1 },
  suggestionBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' },
  suggestionTest:   { fontSize: 13.5, fontWeight: '800', color: '#92400E' },
  suggestionReason: { fontSize: 12, color: '#78350F', marginTop: 3, lineHeight: 16 },
  bookTestModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D97706', paddingVertical: 12, borderRadius: 12, gap: 6 },
  bookTestModalBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  detailDownloadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDFA', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CCFBF1', gap: 6 },
  detailDownloadBtnText: { fontSize: 13, fontWeight: '800', color: '#0F766E' },
  detailShareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F766E', paddingVertical: 12, borderRadius: 12, gap: 6 },
  detailShareBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  dateFilterModal: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: 280, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  dateFilterModalTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginBottom: 14 },
  dateFilterItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dateFilterItemText:       { fontSize: 14, fontWeight: '600', color: '#334155' },
  dateFilterItemTextActive: { fontSize: 14, fontWeight: '800', color: '#0F766E' },
  uploadModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  uploadModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  uploadModalTag:   { fontSize: 9.5, fontWeight: '800', color: '#0F766E', letterSpacing: 0.5 },
  uploadModalTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  uploadModalSub: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  uploadSectionLabel: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 8 },
  uploadPatientChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, gap: 6 },
  uploadPatientChipActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  uploadPatientChipText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  uploadPatientChipTextActive: { color: '#FFF', fontWeight: '800' },
  uploadOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 13, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  uploadOptionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadOptionTitle: { fontSize: 13.5, fontWeight: '800', color: '#0F172A' },
  uploadOptionSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
});