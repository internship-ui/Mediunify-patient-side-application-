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
import * as ImagePicker from 'expo-image-picker';

import colors from '../../theme/colors';
import { useCart } from '../../context/CartContext';
import WebFooter from '../../components/web/WebFooter';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';

const INITIAL_PRESCRIPTIONS = [
  {
    id: 'rx-101',
    doctorName: 'Dr. Anita Sharma',
    specialty: 'General Physician & Diabetologist',
    hospital: 'Unnathi OneCare Medical Center',
    date: '28 Aug 2026',
    diagnosis: 'Acute Upper Respiratory Tract Infection & Mild Fever',
    validTill: '28 Nov 2026',
    status: 'Active',
    medicines: [
      {
        id: '1',
        name: 'Paracetamol 500mg',
        dosage: '1 tablet 3 times a day (After food)',
        duration: '5 days',
        price: 35,
      },
      {
        id: '8',
        name: 'Amoxicillin + Clavulanic Acid 625mg',
        dosage: '1 tablet twice daily (After food)',
        duration: '5 days',
        price: 210,
      },
      {
        id: '2',
        name: 'Vitamin C 500mg',
        dosage: '1 chewable tablet daily',
        duration: '15 days',
        price: 120,
      },
    ],
    doctorAdvice:
      'Drink plenty of warm fluids, steam inhalation twice daily, and complete the full 5-day antibiotic course.',
  },
  {
    id: 'rx-102',
    doctorName: 'Dr. Rajesh Verma',
    specialty: 'Cardiologist',
    hospital: 'Apollo Heart & Vascular Institute',
    date: '12 Jul 2026',
    diagnosis: 'Hypertension Management & Preventive Care',
    validTill: '12 Jan 2027',
    status: 'Active',
    medicines: [
      {
        id: '3',
        name: 'Daily Multivitamin & Minerals',
        dosage: '1 capsule daily morning',
        duration: '30 days',
        price: 199,
      },
    ],
    doctorAdvice: 'Monitor BP weekly, low sodium diet, and regular 30 min morning walk.',
  },
  {
    id: 'rx-103',
    doctorName: 'Dr. Priya Nambiar',
    specialty: 'Dermatologist',
    hospital: 'Skin & Laser Center',
    date: '04 May 2026',
    diagnosis: 'Dry Sensitive Skin & Seasonal Pruritus',
    validTill: '04 Aug 2026',
    status: 'Expired',
    medicines: [
      {
        id: '11',
        name: 'CeraVe Hydrating Facial Cleanser 236ml',
        dosage: 'Apply twice daily on face',
        duration: '30 days',
        price: 499,
      },
    ],
    doctorAdvice: 'Avoid harsh soaps, apply moisturiser on damp skin.',
  },
];

const PrescriptionsScreen = ({ navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { addToCart } = useCart();
  const [prescriptions, setPrescriptions] = useState(INITIAL_PRESCRIPTIONS);
  const [selectedRx, setSelectedRx] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredList = prescriptions.filter((rx) => {
    if (activeFilter === 'Active') return rx.status === 'Active';
    if (activeFilter === 'Expired') return rx.status === 'Expired';
    return true;
  });

  const handleOrderAllMedicines = (rx) => {
    rx.medicines.forEach((med) => {
      addToCart(
        {
          id: med.id,
          name: med.name,
          brand: 'Unnathi Care',
          price: med.price,
          category: 'Medicines',
          requiresPrescription: true,
        },
        1
      );
    });

    showAlert(
      'Medicines Added to Cart',
      `All ${rx.medicines.length} prescribed medicines have been added to your cart with prescription linked.`,
      [
        { text: 'Keep Browsing', style: 'cancel' },
        { text: 'Go to Cart', onPress: () => navigation.navigate('Cart') },
      ]
    );
  };

  const handleUploadPrescription = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Needed', 'Please grant photo gallery permission.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newRx = {
          id: `rx-${Math.floor(100 + Math.random() * 900)}`,
          doctorName: 'Uploaded Prescription',
          specialty: 'Self Uploaded Document',
          hospital: 'Pending Pharmacist Review',
          date: 'Today',
          diagnosis: 'General Health Prescription',
          validTill: '3 Months',
          status: 'Active',
          medicines: [],
          doctorAdvice: 'Document will be verified by Unnathi pharmacist.',
        };
        setPrescriptions([newRx, ...prescriptions]);
        showAlert('Prescription Uploaded', 'Your prescription document has been added.');
      }
    } catch (e) {
      showAlert('Upload Simulated', 'Prescription saved to your medical records.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, Platform.OS === 'web' && { alignItems: 'center' }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, Platform.OS === 'web' && styles.webInnerContainer]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : colors.secondary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>My Prescriptions</Text>
            <Text style={styles.headerSubtitle}>Doctor advice & medicines</Text>
          </View>
          <TouchableOpacity
            style={styles.uploadHeaderBtn}
            onPress={handleUploadPrescription}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTER TABS */}
      <View style={[styles.filterRow, Platform.OS === 'web' && { alignItems: 'center' }]}>
        <View style={[{ flexDirection: 'row', gap: 8, width: '100%' }, Platform.OS === 'web' && styles.webInnerContainer]}>
          {['All', 'Active', 'Expired'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}
              >
                {filter}
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
        {filteredList.map((rx) => (
          <View key={rx.id} style={styles.rxCard}>
            {/* RX CARD TOP */}
            <View style={styles.rxCardTop}>
              <View style={styles.doctorAvatar}>
                <Ionicons name="medkit" size={22} color={colors.primary} />
              </View>
              <View style={styles.rxDoctorInfo}>
                <Text style={styles.doctorName}>{rx.doctorName}</Text>
                <Text style={styles.doctorSpecialty}>{rx.specialty}</Text>
                <Text style={styles.hospitalName}>{rx.hospital}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  rx.status === 'Active' ? styles.statusActive : styles.statusExpired,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    rx.status === 'Active'
                      ? styles.statusTextActive
                      : styles.statusTextExpired,
                  ]}
                >
                  {rx.status}
                </Text>
              </View>
            </View>

            {/* DIAGNOSIS */}
            <View style={styles.diagnosisBox}>
              <Text style={styles.diagnosisLabel}>Diagnosis:</Text>
              <Text style={styles.diagnosisValue}>{rx.diagnosis}</Text>
            </View>

            {/* PRESCRIBED MEDICINES LIST */}
            {rx.medicines.length > 0 && (
              <View style={styles.medicinesSection}>
                <Text style={styles.medicinesHeader}>
                  Prescribed Medicines ({rx.medicines.length})
                </Text>
                {rx.medicines.map((med, index) => (
                  <View key={`${med.id}-${index}`} style={styles.medItem}>
                    <Ionicons name="ellipse" size={6} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medDosage}>
                        {med.dosage} • {med.duration}
                      </Text>
                    </View>
                    <Text style={styles.medPrice}>₹{med.price}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.dateRow}>
              <Text style={styles.dateText}>Prescribed on: {rx.date}</Text>
              <Text style={styles.validText}>Valid till: {rx.validTill}</Text>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.rxActionsRow}>
              <TouchableOpacity
                style={styles.viewDetailsBtn}
                onPress={() => setSelectedRx(rx)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                <Text style={styles.viewDetailsText}>View Details</Text>
              </TouchableOpacity>

              {rx.medicines.length > 0 && rx.status === 'Active' && (
                <TouchableOpacity
                  style={styles.orderMedsBtn}
                  onPress={() => handleOrderAllMedicines(rx)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cart" size={15} color={colors.white} />
                  <Text style={styles.orderMedsText}>Order Medicines</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

          <View style={{ height: 40 }} />
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* DETAILED PRESCRIPTION MODAL */}
      <Modal
        visible={!!selectedRx}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Medical Prescription</Text>
                <Text style={styles.modalSubtitle}>ID: #{selectedRx?.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedRx(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalDocCard}>
                <Text style={styles.modalDocName}>{selectedRx?.doctorName}</Text>
                <Text style={styles.modalDocSub}>{selectedRx?.specialty}</Text>
                <Text style={styles.modalDocHosp}>{selectedRx?.hospital}</Text>
                <Text style={styles.modalDocDate}>Date: {selectedRx?.date}</Text>
              </View>

              <Text style={styles.modalSectionTitle}>Diagnosis & Symptoms</Text>
              <Text style={styles.modalDesc}>{selectedRx?.diagnosis}</Text>

              <Text style={styles.modalSectionTitle}>Prescribed Medicines & Dosage</Text>
              {selectedRx?.medicines.map((med, index) => (
                <View key={`${med.id}-${index}`} style={styles.modalMedCard}>
                  <Text style={styles.modalMedName}>{med.name}</Text>
                  <Text style={styles.modalMedDosage}>Dosage: {med.dosage}</Text>
                  <Text style={styles.modalMedDuration}>Duration: {med.duration}</Text>
                </View>
              ))}

              <Text style={styles.modalSectionTitle}>Doctor's Special Advice</Text>
              <Text style={styles.modalAdvice}>{selectedRx?.doctorAdvice}</Text>

              {/* MODAL BOTTOM ACTION */}
              <View style={styles.modalActionGroup}>
                <TouchableOpacity
                  style={styles.downloadPdfBtn}
                  onPress={() => showAlert('Prescription Downloaded', 'PDF saved to your device.')}
                >
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                  <Text style={styles.downloadPdfText}>Download PDF</Text>
                </TouchableOpacity>

                {selectedRx?.medicines.length > 0 && selectedRx?.status === 'Active' && (
                  <TouchableOpacity
                    style={styles.modalOrderBtn}
                    onPress={() => {
                      handleOrderAllMedicines(selectedRx);
                      setSelectedRx(null);
                    }}
                  >
                    <Ionicons name="cart" size={16} color={colors.white} />
                    <Text style={styles.modalOrderText}>Order All Medicines</Text>
                  </TouchableOpacity>
                )}
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
    fontSize: 17,
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
    paddingHorizontal: 16,
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
  rxCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rxCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxDoctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.secondary,
  },
  doctorSpecialty: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  hospitalName: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#E8F8F2',
  },
  statusExpired: {
    backgroundColor: '#F0F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#00A382',
  },
  statusTextExpired: {
    color: colors.slate,
  },
  diagnosisBox: {
    backgroundColor: '#F8FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  diagnosisLabel: {
    fontSize: 10,
    color: colors.slate,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  diagnosisValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    marginTop: 2,
  },
  medicinesSection: {
    marginTop: 12,
    backgroundColor: '#F0FAF8',
    borderRadius: 12,
    padding: 12,
  },
  medicinesHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  medName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  medDosage: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 1,
  },
  medPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F6',
  },
  dateText: {
    fontSize: 10,
    color: colors.slate,
  },
  validText: {
    fontSize: 10,
    color: colors.slate,
    fontWeight: '700',
  },
  rxActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  viewDetailsBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E6FAF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#B3EFE6',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  orderMedsBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  orderMedsText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.secondary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '800',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDocCard: {
    backgroundColor: '#F8FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  modalDocName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.secondary,
  },
  modalDocSub: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  modalDocHosp: {
    fontSize: 11,
    color: colors.slate,
    marginTop: 2,
  },
  modalDocDate: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 6,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.secondary,
    marginTop: 12,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    color: colors.slate,
    lineHeight: 18,
  },
  modalMedCard: {
    backgroundColor: '#F0FAF8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  modalMedName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.secondary,
  },
  modalMedDosage: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  modalMedDuration: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 1,
  },
  modalAdvice: {
    fontSize: 12,
    color: colors.slate,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalActionGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  downloadPdfBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E6FAF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#B3EFE6',
  },
  downloadPdfText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  modalOrderBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalOrderText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
  },
});

export default PrescriptionsScreen;
