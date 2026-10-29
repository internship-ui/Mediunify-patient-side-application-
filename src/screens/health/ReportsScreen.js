import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';

import colors from '../../theme/colors';
import WebFooter from '../../components/web/WebFooter';
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

import ReportsScreenWeb from './ReportsScreen.web';

const ReportsScreen = (props) => {
  if (Platform.OS === 'web') {
    return <ReportsScreenWeb {...props} />;
  }
  const { navigation } = props;
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const [reports, setReports] = useState(SAMPLE_REPORTS);
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  const filteredReports = reports.filter((rep) => {
    if (activeTab === 'Normal') return rep.status === 'Normal';
    if (activeTab === 'Attention') return rep.status === 'Attention';
    return true;
  });

  const handleUploadReport = () => {
    showAlert(
      'Upload Medical Report',
      'Select document format:',
      [
        { text: 'Take Photo', onPress: () => showAlert('Report Saved', 'Report photographed and saved.') },
        { text: 'Upload PDF / File', onPress: () => showAlert('Report Saved', 'PDF report uploaded successfully.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getStatusColor = (status) => {
    if (status === 'Normal') return '#00B894';
    if (status === 'Attention' || status === 'High' || status === 'Low') return '#E67E22';
    return colors.coral;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, Platform.OS === 'web' && { alignItems: 'center' }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, Platform.OS === 'web' && styles.webInnerContainer]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (navigation?.canGoBack?.()) {
                navigation.goBack();
              } else if (navigation?.navigate) {
                navigation.navigate('Home');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : colors.secondary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Lab & Diagnostic Reports</Text>
            <Text style={styles.headerSubtitle}>Verified clinical test results</Text>
          </View>

          <TouchableOpacity
            style={styles.uploadHeaderBtn}
            onPress={handleUploadReport}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTER TABS */}
      <View style={[styles.filterRow, Platform.OS === 'web' && { alignItems: 'center' }]}>
        <View style={[{ flexDirection: 'row', gap: 8, width: '100%' }, Platform.OS === 'web' && styles.webInnerContainer]}>
          {['All', 'Normal', 'Attention'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, activeTab === tab && styles.filterPillActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.filterText, activeTab === tab && styles.filterTextActive]}
              >
                {tab} ({reports.filter((r) => tab === 'All' || r.status === tab).length})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={Platform.OS === 'web' ? styles.webInnerContainer : null}>
        {filteredReports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportCard}
            activeOpacity={0.88}
            onPress={() => setSelectedReport(report)}
          >
            <View style={styles.reportTop}>
              <View style={styles.reportIconCircle}>
                <Ionicons name="flask" size={22} color={colors.primary} />
              </View>
              <View style={styles.reportMainInfo}>
                <Text style={styles.testName}>{report.testName}</Text>
                <Text style={styles.categoryName}>{report.category}</Text>
                <Text style={styles.labName}>{report.labName}</Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  { backgroundColor: `${getStatusColor(report.status)}18` },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    { color: getStatusColor(report.status) },
                  ]}
                >
                  {report.status}
                </Text>
              </View>
            </View>

            {/* PREVIEW PARAMETERS */}
            <View style={styles.parametersBox}>
              {report.parameters.slice(0, 3).map((param, i) => (
                <View key={i} style={styles.paramRow}>
                  <Text style={styles.paramName}>{param.name}</Text>
                  <Text
                    style={[
                      styles.paramValue,
                      param.status !== 'Normal' && styles.paramAbnormal,
                    ]}
                  >
                    {param.value}
                  </Text>
                </View>
              ))}
              {report.parameters.length > 3 && (
                <Text style={styles.moreParamsText}>
                  + {report.parameters.length - 3} more parameters analyzed
                </Text>
              )}
            </View>

            <View style={styles.reportBottomRow}>
              <Text style={styles.reportDate}>Tested on: {report.date}</Text>
              <View style={styles.viewReportBtn}>
                <Text style={styles.viewReportText}>View Report</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}

          <View style={{ height: 40 }} />
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* DETAILED REPORT VIEW MODAL */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalTitle}>{selectedReport?.testName}</Text>
                <Text style={styles.modalSubtitle}>{selectedReport?.labName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedReport(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* META INFO */}
              <View style={styles.reportMetaCard}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Referred By</Text>
                  <Text style={styles.metaValue}>{selectedReport?.doctor}</Text>
                </View>
                <View style={styles.metaColRight}>
                  <Text style={styles.metaLabel}>Sample Date</Text>
                  <Text style={styles.metaValue}>{selectedReport?.date}</Text>
                </View>
              </View>

              {/* TABLE HEADER */}
              <Text style={styles.tableHeading}>Clinical Parameters & Reference Values</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.thTest}>Parameter</Text>
                <Text style={styles.thResult}>Result</Text>
                <Text style={styles.thRange}>Normal Range</Text>
              </View>

              {/* TABLE ROWS */}
              {selectedReport?.parameters.map((param, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.tdTest}>{param.name}</Text>
                  <View style={styles.tdResultWrap}>
                    <Text
                      style={[
                        styles.tdResult,
                        param.status !== 'Normal' && styles.tdResultAlert,
                      ]}
                    >
                      {param.value}
                    </Text>
                  </View>
                  <Text style={styles.tdRange}>{param.range}</Text>
                </View>
              ))}

              {/* REMARKS */}
              <Text style={styles.tableHeading}>Pathologist Summary & Remarks</Text>
              <View style={styles.remarksCard}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} />
                <Text style={styles.remarksText}>{selectedReport?.remarks}</Text>
              </View>

              {/* DOWNLOAD & SHARE ACTIONS */}
              <View style={styles.modalActionGroup}>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => showAlert('Report Downloaded', 'PDF report saved to downloads.')}
                >
                  <Ionicons name="download" size={16} color={colors.white} />
                  <Text style={styles.downloadBtnText}>Download PDF Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => showAlert('Share Report', 'Report sharing link copied to clipboard.')}
                >
                  <Ionicons name="share-social-outline" size={16} color={colors.primary} />
                  <Text style={styles.shareBtnText}>Share</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F4F8FA',
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F4F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.secondary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.slate,
    fontWeight: '600',
  },
  uploadHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F4F6',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 40,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  webInnerContainer: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 0,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
  testName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.secondary,
  },
  categoryName: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  labName: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '900',
  },
  parametersBox: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paramName: {
    fontSize: 11,
    color: colors.slate,
  },
  paramValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },
  paramAbnormal: {
    color: '#E67E22',
  },
  moreParamsText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  reportBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F6',
  },
  reportDate: {
    fontSize: 10,
    color: colors.slate,
  },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewReportText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.secondary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  reportMetaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaCol: {
    flex: 1,
  },
  metaColRight: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 10,
    color: colors.slate,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    marginTop: 2,
  },
  tableHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 10,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EAF4F5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  thTest: {
    flex: 1.5,
    fontSize: 10,
    fontWeight: '900',
    color: colors.secondary,
  },
  thResult: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: colors.secondary,
    textAlign: 'center',
  },
  thRange: {
    flex: 1.2,
    fontSize: 10,
    fontWeight: '900',
    color: colors.secondary,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F6',
  },
  tdTest: {
    flex: 1.5,
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  tdResultWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tdResult: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },
  tdResultAlert: {
    color: '#E67E22',
  },
  tdRange: {
    flex: 1.2,
    fontSize: 10,
    color: colors.slate,
    textAlign: 'right',
  },
  remarksCard: {
    backgroundColor: '#E6FAF7',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  remarksText: {
    fontSize: 11,
    color: colors.secondary,
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  modalActionGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  downloadBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
  },
  shareBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E6FAF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#B3EFE6',
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
});

export default ReportsScreen;
