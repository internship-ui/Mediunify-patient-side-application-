import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebFooter from '../../components/web/WebFooter';
import PatientPageBanner from '../../components/web/PatientPageBanner';
import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

export const SAMPLE_REPORTS = [
  {
    id: 'rep-1',
    testName: 'Complete Blood Count (CBC) with ESR',
    category: 'Pathology & Blood Test',
    labName: 'Unnathi Advanced Diagnostics, Mysore',
    doctor: 'Dr. Anita Sharma',
    date: '25 Aug 2026',
    status: 'Normal',
    downloadUrl: 'cbc_report_aug2026.pdf',
    parameters: [
      { name: 'Hemoglobin', value: '14.2 g/dL', range: '13.0 - 17.0', status: 'Normal' },
      { name: 'Total WBC Count', value: '7,400 /µL', range: '4,000 - 11,000', status: 'Normal' },
      { name: 'Platelet Count', value: '2.4 Lakhs/µL', range: '1.5 - 4.5 Lakhs', status: 'Normal' },
      { name: 'RBC Count', value: '4.8 million/µL', range: '4.5 - 5.9', status: 'Normal' },
      { name: 'ESR (1st Hour)', value: '12 mm/hr', range: '0 - 15', status: 'Normal' },
    ],
    remarks: 'All hematological parameters within healthy biological reference intervals.',
  },
  {
    id: 'rep-2',
    testName: 'HbA1c & Fasting Blood Sugar (FBS)',
    category: 'Diabetes Screening',
    labName: 'Unnathi Advanced Diagnostics, Mysore',
    doctor: 'Dr. Rajesh Verma',
    date: '18 Aug 2026',
    status: 'Attention',
    downloadUrl: 'diabetes_profile_aug2026.pdf',
    parameters: [
      { name: 'Fasting Blood Glucose', value: '118 mg/dL', range: '70 - 99', status: 'High' },
      { name: 'HbA1c (Glycated Hb)', value: '6.2 %', range: '< 5.7 (Normal), 5.7 - 6.4 (Prediabetes)', status: 'High' },
      { name: 'Estimated Avg Glucose (eAG)', value: '131 mg/dL', range: '90 - 120', status: 'High' },
    ],
    remarks: 'Pre-diabetic range indicated. Dietary modification and 30 min daily aerobic exercise recommended.',
  },
  {
    id: 'rep-3',
    testName: 'Lipid Profile Comprehensive',
    category: 'Cardiology & Lipids',
    labName: 'Apollo Diagnostics Hub',
    doctor: 'Dr. Rajesh Verma',
    date: '10 Jul 2026',
    status: 'Normal',
    downloadUrl: 'lipid_profile_jul2026.pdf',
    parameters: [
      { name: 'Total Cholesterol', value: '182 mg/dL', range: '< 200', status: 'Normal' },
      { name: 'HDL (Good Cholesterol)', value: '48 mg/dL', range: '> 40', status: 'Normal' },
      { name: 'LDL (Bad Cholesterol)', value: '108 mg/dL', range: '< 100', status: 'Borderline' },
      { name: 'Triglycerides', value: '130 mg/dL', range: '< 150', status: 'Normal' },
    ],
    remarks: 'Lipid profile is within acceptable cardiovascular safety standards.',
  },
  {
    id: 'rep-4',
    testName: 'Vitamin D (25-OH) & Vitamin B12',
    category: 'Vitamins & Nutrition',
    labName: 'SRL Health Care Laboratory',
    doctor: 'Dr. Anita Sharma',
    date: '02 Jun 2026',
    status: 'Attention',
    downloadUrl: 'vitamins_report_jun2026.pdf',
    parameters: [
      { name: 'Vitamin D Total (25-OH)', value: '18.4 ng/mL', range: '30.0 - 100.0 (Sufficiency)', status: 'Low' },
      { name: 'Vitamin B12', value: '340 pg/mL', range: '211 - 911', status: 'Normal' },
    ],
    remarks: 'Mild Vitamin D deficiency observed. Weekly Vitamin D3 60,000 IU supplement advised.',
  },
];

const ReportsScreenWeb = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  const [reports, setReports] = useState(SAMPLE_REPORTS);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const normalCount = reports.filter((r) => r.status === 'Normal').length;
  const attentionCount = reports.filter((r) => r.status === 'Attention').length;

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      // Status tab filter
      if (activeTab === 'Normal' && rep.status !== 'Normal') return false;
      if (activeTab === 'Attention' && rep.status !== 'Attention') return false;

      // Search filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = rep.testName?.toLowerCase().includes(q);
        const matchesCategory = rep.category?.toLowerCase().includes(q);
        const matchesLab = rep.labName?.toLowerCase().includes(q);
        const matchesDoctor = rep.doctor?.toLowerCase().includes(q);
        return matchesName || matchesCategory || matchesLab || matchesDoctor;
      }
      return true;
    });
  }, [reports, activeTab, searchQuery]);

  // Mobile-aligned Status Colors (MediUnify Teal #00B894 for Normal, Coral/Orange #FF7F50 for Attention)
  const getStatusColor = (status) => {
    if (status === 'Normal') return '#00B894';
    if (status === 'Attention' || status === 'High' || status === 'Low' || status === 'Borderline') return '#FF7F50';
    return '#FF7F50';
  };

  const handleDownloadReport = (rep) => {
    showToast(`Downloading certified PDF for ${rep?.testName || 'report'}...`);
  };

  const handleShareReport = (rep) => {
    showToast(`Sharing link copied for ${rep?.testName || 'report'}`);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, isDarkMode && { backgroundColor: '#080E1A', backgroundImage: 'none' }]}>
      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastWrap}>
          <Ionicons name="checkmark-circle" size={18} color="#00B894" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Top Hero Banner matching MediUnify Patient App Standard */}
        <View style={styles.innerContainer}>
          <PatientPageBanner
            onBack={() => {
              if (navigation?.canGoBack?.()) {
                navigation.goBack();
              } else if (navigation?.navigate) {
                navigation.navigate('Home');
              }
            }}
            title={t('Lab & Diagnostic Reports', 'Lab & Diagnostic Reports')}
            subtitle={t(
              'Verified clinical test results, pathological summaries & digital diagnostic records',
              'Verified clinical test results, pathological summaries & digital diagnostic records'
            )}
            badgeText={t('Diagnostic Pathology', 'Diagnostic Pathology')}
            badgeIcon="flask"
            iconName="document-text"
            theme="teal"
            pills={[
              {
                label: `Total Reports: ${reports.length}`,
                bgColor: '#E8F7F4',
                borderColor: '#A7F3D0',
                textColor: '#00B894',
                icon: 'document-text-outline',
              },
              {
                label: `Normal Results: ${normalCount}`,
                bgColor: '#E8F7F4',
                borderColor: '#A7F3D0',
                textColor: '#00B894',
                icon: 'checkmark-circle',
              },
              {
                label: `Attention Needed: ${attentionCount}`,
                bgColor: '#FFF2ED',
                borderColor: '#FFD8CC',
                textColor: '#FF7F50',
                icon: 'alert-circle',
              },
            ]}
            rightContent={
              <TouchableOpacity
                style={styles.organicHeroBtn}
                onPress={() => setShowUploadModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.organicHeroArrowCircle}>
                  <Ionicons name="cloud-upload" size={13} color="#00B894" />
                </View>
                <Text style={styles.organicHeroBtnText}>Upload Report</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* Content Section */}
        <View style={[styles.innerContainer, { paddingTop: 10, paddingBottom: 60 }]}>
          {/* Controls Card: Filter Tabs + Search Bar */}
          <View style={[styles.controlsCard, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Status Filter Tabs */}
            <View style={styles.tabsRow}>
              {[
                { id: 'All', label: 'All Reports', count: reports.length },
                { id: 'Normal', label: 'Normal', count: normalCount },
                { id: 'Attention', label: 'Attention Needed', count: attentionCount },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tabBtn,
                      isActive && styles.tabBtnActive,
                      isDarkMode && !isActive && { backgroundColor: theme.headerBg, borderColor: theme.border },
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        isActive && styles.tabBtnTextActive,
                        isDarkMode && !isActive && { color: theme.textSecondary },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    <View
                      style={[
                        styles.tabBadge,
                        isActive && styles.tabBadgeActive,
                        tab.id === 'Normal' && !isActive && { backgroundColor: '#E8F7F4' },
                        tab.id === 'Attention' && !isActive && { backgroundColor: '#FFF2ED' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          isActive && styles.tabBadgeTextActive,
                          tab.id === 'Normal' && !isActive && { color: '#00B894' },
                          tab.id === 'Attention' && !isActive && { color: '#FF7F50' },
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search Input */}
            <View style={[styles.searchBar, isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color="#00B894" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.searchInput, isDarkMode && { color: theme.text }]}
                placeholder="Search by test name, category, or diagnostic lab..."
                placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Reports Grid */}
          {filteredReports.length === 0 ? (
            <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
              </View>
              <Text style={[styles.emptyTitle, isDarkMode && { color: theme.text }]}>No Reports Found</Text>
              <Text style={[styles.emptySubtitle, isDarkMode && { color: theme.textSecondary }]}>
                {searchQuery ? `No reports match "${searchQuery}"` : 'No diagnostic reports recorded in this filter.'}
              </Text>
              {(searchQuery || activeTab !== 'All') && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setActiveTab('All');
                  }}
                >
                  <Text style={styles.clearFiltersText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={[styles.reportsGrid, isDesktop && styles.reportsGridDesktop]}>
              {filteredReports.map((report) => {
                const statusColor = getStatusColor(report.status);
                const isAttention = report.status === 'Attention';
                return (
                  <View
                    key={report.id}
                    style={[
                      styles.reportCard,
                      isDesktop && styles.reportCardDesktop,
                      isDarkMode && { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                  >
                    {/* Card Top Row: Matching Mobile Layout (Flask Icon in circle + Title/Category + Status Pill) */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.reportIconCircle}>
                        <Ionicons name="flask" size={22} color="#00B894" />
                      </View>

                      <View style={styles.reportMainInfo}>
                        <Text style={[styles.reportTestName, isDarkMode && { color: theme.text }]}>
                          {report.testName}
                        </Text>
                        <Text style={styles.categoryNameText}>{report.category}</Text>
                        <Text style={[styles.labNameText, isDarkMode && { color: theme.textSecondary }]}>
                          {report.labName}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isAttention ? '#FFF2ED' : '#E8F7F4',
                            borderColor: isAttention ? '#FFD8CC' : '#A7F3D0',
                          },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {report.status}
                        </Text>
                      </View>
                    </View>

                    {/* Parameters Preview Box (Matching Mobile App Reference) */}
                    <View
                      style={[
                        styles.parametersBox,
                        isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border },
                      ]}
                    >
                      {report.parameters.slice(0, 3).map((param, i) => {
                        const isAbnormal = param.status !== 'Normal';
                        return (
                          <View key={i} style={styles.paramRow}>
                            <Text
                              style={[
                                styles.paramName,
                                isDarkMode && { color: theme.textSecondary },
                                isAbnormal && { fontWeight: '600' },
                              ]}
                              numberOfLines={1}
                            >
                              {param.name}
                            </Text>
                            <Text
                              style={[
                                styles.paramValue,
                                isAbnormal
                                  ? { color: '#FF7F50', fontWeight: '800' }
                                  : { color: isDarkMode ? theme.text : '#1E3A8A' },
                              ]}
                            >
                              {param.value}
                            </Text>
                          </View>
                        );
                      })}
                      {report.parameters.length > 3 && (
                        <Text style={styles.moreParamsText}>
                          + {report.parameters.length - 3} more parameters analyzed
                        </Text>
                      )}
                    </View>

                    {/* Card Footer: Tested Date + View Report Button (Matching Mobile App Reference) */}
                    <View style={[styles.cardFooter, isDarkMode && { borderTopColor: theme.border }]}>
                      <Text style={[styles.reportDateText, isDarkMode && { color: theme.textSecondary }]}>
                        Tested on: {report.date}
                      </Text>

                      <View style={styles.footerActionRow}>
                        <TouchableOpacity
                          style={styles.viewReportBtn}
                          onPress={() => setSelectedReport(report)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewReportBtnText}>View Report</Text>
                          <Ionicons name="chevron-forward" size={15} color="#00B894" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.iconActionBtn,
                            isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border },
                          ]}
                          onPress={() => handleDownloadReport(report)}
                          activeOpacity={0.8}
                          accessibilityLabel="Download PDF"
                        >
                          <Ionicons name="download-outline" size={16} color="#00B894" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.iconActionBtn,
                            isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border },
                          ]}
                          onPress={() => handleShareReport(report)}
                          activeOpacity={0.8}
                          accessibilityLabel="Share Report"
                        >
                          <Ionicons name="share-social-outline" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Global Web Footer */}
        <WebFooter navigation={navigation} />
      </ScrollView>

      {/* DETAILED REPORT VIEW MODAL (Desktop Dialog) */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeaderRow, isDarkMode && { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={styles.modalCategoryBadge}>
                    <Text style={styles.modalCategoryBadgeText}>{selectedReport?.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: selectedReport?.status === 'Attention' ? '#FFF2ED' : '#E8F7F4',
                        borderColor: selectedReport?.status === 'Attention' ? '#FFD8CC' : '#A7F3D0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(selectedReport?.status) },
                      ]}
                    >
                      {selectedReport?.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.modalTitleText, isDarkMode && { color: theme.text }]}>
                  {selectedReport?.testName}
                </Text>
                <Text style={[styles.modalSubtitleText, isDarkMode && { color: theme.textSecondary }]}>
                  {selectedReport?.labName}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedReport(null)}
                style={[styles.modalCloseBtn, isDarkMode && { backgroundColor: theme.headerBg }]}
              >
                <Ionicons name="close" size={20} color={isDarkMode ? '#CBD5E1' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={true}>
              {/* Meta Stats Row */}
              <View style={[styles.modalMetaCard, isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border }]}>
                <View style={styles.modalMetaCol}>
                  <Text style={styles.modalMetaLabel}>Referring Clinician</Text>
                  <Text style={[styles.modalMetaValue, isDarkMode && { color: theme.text }]}>
                    {selectedReport?.doctor}
                  </Text>
                </View>
                <View style={styles.modalMetaCol}>
                  <Text style={styles.modalMetaLabel}>Sample Collected Date</Text>
                  <Text style={[styles.modalMetaValue, isDarkMode && { color: theme.text }]}>
                    {selectedReport?.date}
                  </Text>
                </View>
                <View style={styles.modalMetaCol}>
                  <Text style={styles.modalMetaLabel}>Verification Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Ionicons name="shield-checkmark" size={14} color="#00B894" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#00B894' }}>Pathologist Certified</Text>
                  </View>
                </View>
              </View>

              {/* Parameters Table */}
              <Text style={[styles.modalSectionTitle, isDarkMode && { color: theme.text }]}>
                Quantitative Clinical Parameters
              </Text>

              <View style={[styles.tableContainer, isDarkMode && { borderColor: theme.border }]}>
                <View style={[styles.tableHeaderRow, isDarkMode && { backgroundColor: theme.headerBg }]}>
                  <Text style={[styles.thCol, { flex: 2 }, isDarkMode && { color: theme.text }]}>Parameter / Biomarker</Text>
                  <Text style={[styles.thCol, { flex: 1.2 }, isDarkMode && { color: theme.text }]}>Observed Result</Text>
                  <Text style={[styles.thCol, { flex: 1.6 }, isDarkMode && { color: theme.text }]}>Biological Range</Text>
                  <Text style={[styles.thCol, { flex: 1, textAlign: 'right' }, isDarkMode && { color: theme.text }]}>Status</Text>
                </View>

                {selectedReport?.parameters.map((param, idx) => {
                  const isAbnormal = param.status !== 'Normal';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.tableDataRow,
                        idx % 2 === 1 && { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' },
                        isDarkMode && { borderTopColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.tdCol, { flex: 2, fontWeight: '600' }, isDarkMode && { color: theme.text }]}>
                        {param.name}
                      </Text>
                      <Text
                        style={[
                          styles.tdCol,
                          { flex: 1.2, fontWeight: '800' },
                          isAbnormal ? { color: '#FF7F50' } : { color: isDarkMode ? theme.text : '#1E3A8A' },
                        ]}
                      >
                        {param.value}
                      </Text>
                      <Text style={[styles.tdCol, { flex: 1.6, fontSize: 12, color: isDarkMode ? theme.textSecondary : '#64748B' }]}>
                        {param.range}
                      </Text>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <View
                          style={[
                            styles.paramPillBadge,
                            {
                              backgroundColor: isAbnormal ? '#FFF2ED' : '#E8F7F4',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.paramPillBadgeText,
                              { color: isAbnormal ? '#FF7F50' : '#00B894' },
                            ]}
                          >
                            {param.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Pathologist Summary & Remarks */}
              <Text style={[styles.modalSectionTitle, isDarkMode && { color: theme.text }]}>
                Pathologist Summary & Clinical Notes
              </Text>
              <View
                style={[
                  styles.remarksCard,
                  isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border },
                ]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#00B894" style={{ marginTop: 2, marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.remarksBodyText, isDarkMode && { color: theme.text }]}>
                    {selectedReport?.remarks}
                  </Text>
                  <Text style={[styles.remarksSignOff, isDarkMode && { color: theme.textSecondary }]}>
                    Digitally signed by Chief Pathologist, {selectedReport?.labName}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={[styles.modalFooterRow, isDarkMode && { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={styles.modalDownloadBtn}
                onPress={() => {
                  handleDownloadReport(selectedReport);
                  setSelectedReport(null);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalDownloadBtnText}>Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSecondaryBtn, isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border }]}
                onPress={() => {
                  handleShareReport(selectedReport);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="share-social-outline" size={16} color={isDarkMode ? theme.text : '#334155'} style={{ marginRight: 6 }} />
                <Text style={[styles.modalSecondaryBtnText, isDarkMode && { color: theme.text }]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSecondaryBtn, isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border }]}
                onPress={() => setSelectedReport(null)}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalSecondaryBtnText, isDarkMode && { color: theme.text }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* UPLOAD REPORT MODAL */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.uploadCard, isDarkMode && { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.modalHeaderRow, isDarkMode && { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.modalTitleText, isDarkMode && { color: theme.text }]}>Upload Medical Report</Text>
                <Text style={[styles.modalSubtitleText, isDarkMode && { color: theme.textSecondary }]}>
                  Upload digital pathology PDF or scanned laboratory slips
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowUploadModal(false)}
                style={[styles.modalCloseBtn, isDarkMode && { backgroundColor: theme.headerBg }]}
              >
                <Ionicons name="close" size={20} color={isDarkMode ? '#CBD5E1' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.uploadBody}>
              <View
                style={[
                  styles.dropZone,
                  isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border },
                ]}
              >
                <View style={styles.dropZoneIcon}>
                  <Ionicons name="cloud-upload" size={32} color="#00B894" />
                </View>
                <Text style={[styles.dropZoneTitle, isDarkMode && { color: theme.text }]}>
                  Select PDF or Document Image
                </Text>
                <Text style={[styles.dropZoneSub, isDarkMode && { color: theme.textSecondary }]}>
                  Supports PDF, JPG, PNG up to 25 MB
                </Text>
              </View>

              <View style={styles.uploadBtnRow}>
                <TouchableOpacity
                  style={styles.modalDownloadBtn}
                  onPress={() => {
                    setShowUploadModal(false);
                    showToast('Report uploaded successfully! Encrypted and saved to Health Vault.');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="attach" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalDownloadBtnText}>Browse & Upload File</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSecondaryBtn, isDarkMode && { backgroundColor: theme.headerBg, borderColor: theme.border }]}
                  onPress={() => setShowUploadModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalSecondaryBtnText, isDarkMode && { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ReportsScreenWeb;

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 0,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },

  // Toast
  toastWrap: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Organic Hero Action Button (Matching PatientPageBanner Design System)
  organicHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  organicHeroArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organicHeroBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B894',
    letterSpacing: 0.2,
  },

  // Controls Card: Tabs & Search
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Search Bar
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
  },

  // Reports Grid
  reportsGrid: {
    gap: 16,
  },
  reportsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  reportCardDesktop: {
    width: '48.9%',
  },

  // Card Content (Mobile-matched design)
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  reportIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportMainInfo: {
    flex: 1,
  },
  reportTestName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.2,
  },
  categoryNameText: {
    fontSize: 11.5,
    color: '#00B894',
    fontWeight: '700',
    marginTop: 2,
  },
  labNameText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  // Parameters Box
  parametersBox: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3.5,
  },
  paramName: {
    fontSize: 11.5,
    color: '#64748B',
    flex: 1,
    paddingRight: 10,
  },
  paramValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  moreParamsText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00B894',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F6',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F6',
  },
  reportDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewReportBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00B894',
  },
  iconActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyContainer: {
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
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 400,
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#00B894',
  },
  clearFiltersText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Backdrop & Desktop Dialog
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 760,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCategoryBadge: {
    backgroundColor: '#E8F7F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.2,
  },
  modalSubtitleText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '700',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    padding: 20,
  },
  modalMetaCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
  },
  modalMetaCol: {
    flex: 1,
    minWidth: 160,
  },
  modalMetaLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  modalMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 10,
  },

  // Table in Modal
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F7F4',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  thCol: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00B894',
    textTransform: 'uppercase',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tdCol: {
    fontSize: 12.5,
    color: '#334155',
  },
  paramPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  paramPillBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Remarks Card
  remarksCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  remarksBodyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  remarksSignOff: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Modal Footer
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  modalDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalDownloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  // Upload Modal
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  uploadBody: {
    padding: 20,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: '#00B894',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#E8F7F4',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dropZoneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dropZoneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  dropZoneSub: {
    fontSize: 12,
    color: '#64748B',
  },
  uploadBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
