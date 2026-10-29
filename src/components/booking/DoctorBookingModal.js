import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { pushAppointment } from '../../services/dataSyncService';
import { getAvailableDates, getSlotsForDate } from '../../utils/appointmentSlotHelper';
import { validateAndBookSlot, subscribeToSlotChanges } from '../../services/slotBookingService';
import { useAuthGuard } from '../../context/AuthGuardContext';
import { isGuestUser, promptLoginRequired } from '../../utils/authHelper';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { isDesktopLayout } from '../../utils/responsiveLayoutHelper';

const DoctorBookingModal = ({
  visible,
  onClose,
  doctor,
  consultationType = 'In-Person', // 'In-Person' | 'Video'
  navigation,
}) => {
  const { t, isIndic, isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { requireLogin } = useAuthGuard();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && isDesktopLayout(width);
  const isVideo = consultationType === 'Video';

  const [slotTick, setSlotTick] = useState(0);

  // Subscribe to real-time clock advancement & slot booking updates
  useEffect(() => {
    const unsub = subscribeToSlotChanges(() => {
      setSlotTick((prev) => prev + 1);
    });
    return unsub;
  }, []);

  const availableDates = getAvailableDates();
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const currentDateObj = availableDates[selectedDateIndex] || availableDates[0];
  const currentSlots = getSlotsForDate(currentDateObj, isVideo, doctor);

  const getDefaultSlotForDate = (dateObj) => {
    const slots = getSlotsForDate(dateObj, isVideo, doctor);
    if (slots.instant && slots.instant.available) return slots.instant.fullLabel;
    const availMorning = slots.morning?.find((s) => s.available);
    if (availMorning) return availMorning.fullLabel;
    const availAfternoon = slots.afternoon?.find((s) => s.available);
    if (availAfternoon) return availAfternoon.fullLabel;
    const availEvening = slots.evening?.find((s) => s.available);
    if (availEvening) return availEvening.fullLabel;
    return '';
  };

  const [selectedTime, setSelectedTime] = useState(getDefaultSlotForDate(availableDates[0]));

  // Auto-switch to next available slot if selected slot expired or was booked in real-time
  useEffect(() => {
    if (!selectedTime) return;
    const allSlots = [
      ...(currentSlots.instant ? [currentSlots.instant] : []),
      ...currentSlots.morning,
      ...currentSlots.afternoon,
      ...currentSlots.evening,
    ];
    const match = allSlots.find((s) => s.fullLabel === selectedTime);
    if (match && !match.available) {
      setSelectedTime(getDefaultSlotForDate(currentDateObj));
    }
  }, [currentSlots, selectedTime, currentDateObj]);
  const [patientName, setPatientName] = useState('Hemanth Gowda (Self)');
  const [patientPhone, setPatientPhone] = useState('+91 97414 22544');
  const [healthConcern, setHealthConcern] = useState('Stress, Joint Pain & Wellness');
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [paymentOption, setPaymentOption] = useState(isVideo ? 'WALLET' : 'PAY_AT_CLINIC');
  const [walletBalance, setWalletBalance] = useState(1250);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUserData();
      loadWallet();
      setSelectedDateIndex(0);
      setSelectedTime(getDefaultSlotForDate(availableDates[0]));
    }
  }, [visible, doctor, consultationType]);

  const handleSelectDate = (idx) => {
    setSelectedDateIndex(idx);
    const targetDate = availableDates[idx];
    setSelectedTime(getDefaultSlotForDate(targetDate));
  };

  const loadWallet = async () => {
    try {
      const stored = await AsyncStorage.getItem('@unnathi_wallet_balance');
      if (stored !== null) {
        setWalletBalance(parseInt(stored, 10) || 0);
      } else {
        await AsyncStorage.setItem('@unnathi_wallet_balance', '1250');
        setWalletBalance(1250);
      }
    } catch (e) {
      console.log('Error loading wallet in modal:', e);
    }
  };

  const loadUserData = async () => {
    try {
      const guest = await isGuestUser();
      if (guest) {
        setPatientName('');
        setPatientPhone('');
        return;
      }
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName && storedName.trim()) {
        const clean = storedName.trim().replace(/\s*\(Self\)$/i, '');
        setPatientName(`${clean} (Self)`);
      } else {
        setPatientName('Hemanth Gowda (Self)');
      }
      const storedPhone = (await AsyncStorage.getItem('userPhone')) || (await AsyncStorage.getItem('@unnathi_user_phone'));
      if (storedPhone && storedPhone.trim()) {
        setPatientPhone(storedPhone.trim().startsWith('+91') ? storedPhone.trim() : `+91 ${storedPhone.trim()}`);
      } else {
        setPatientPhone('+91 97414 22544');
      }
    } catch (e) {
      console.log('Error loading user data in modal:', e);
    }
  };

  // Upload PDF or Image handler
  const handlePickDocument = async (typeChoice = 'any') => {
    try {
      if (typeChoice === 'camera') {
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            showAlert('Permission Required', 'Camera permission is required to capture documents.');
            return;
          }
        }
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        });
        if (!result.canceled && result.assets?.[0]) {
          const asset = result.assets[0];
          setUploadedDocument({
            name: asset.fileName || `Prescription_Camera_${Date.now()}.jpg`,
            uri: asset.uri,
            type: 'image',
            size: asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
          });
        }
        return;
      }

      if (typeChoice === 'image') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
          const asset = result.assets[0];
          setUploadedDocument({
            name: asset.fileName || `Medical_Image_${Date.now()}.jpg`,
            uri: asset.uri,
            type: 'image',
            size: asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.5 MB',
          });
        }
        return;
      }

      // PDF / File Picker
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = typeChoice === 'pdf' ? '.pdf,application/pdf' : '.pdf,image/*,application/pdf';
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
            setUploadedDocument({
              name: file.name,
              uri: url,
              type: isPdf ? 'pdf' : 'image',
              size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            });
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: typeChoice === 'pdf' ? 'application/pdf' : ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets?.[0]) {
          const file = result.assets[0];
          const isPdf = file.mimeType?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
          setUploadedDocument({
            name: file.name,
            uri: file.uri,
            type: isPdf ? 'pdf' : 'image',
            size: file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF Document',
          });
        }
      }
    } catch (err) {
      console.log('Error picking document:', err);
      showAlert('Upload Error', 'Could not open file picker. Please try again.');
    }
  };

  const feeAmount = doctor?.fee || (isVideo ? 299 : 400);

  const handleConfirm = async () => {
    const isGuest = await isGuestUser();
    if (isGuest) {
      if (onClose) onClose();
      promptLoginRequired(navigation, { service: isVideo ? 'videocall' : 'doctor' });
      return;
    }
    requireLogin(() => _doConfirm(), isVideo ? 'Please login to continue with video consultation.' : 'Please login to continue with this booking.');
  };

  const _doConfirm = async () => {
    if (!patientName.trim()) {
      showAlert('Patient Name Required', 'Please enter patient full name.');
      return;
    }
    if (!patientPhone.trim() || patientPhone.length < 10) {
      showAlert('Mobile Number Required', 'Please enter a valid mobile number.');
      return;
    }
    if (!selectedTime) {
      showAlert('Select Slot', 'Please choose an appointment slot.');
      return;
    }

    setIsBooking(true);

    try {
      // Real-Time Atomic Slot Validation (Rules 2, 3, 6)
      const slotValidation = await validateAndBookSlot({
        date: currentDateObj,
        time: selectedTime,
        serviceType: isVideo ? 'video' : 'doctor',
        providerId: doctor?.id || doctor?.name || 'doctor',
        patientName: patientName.trim(),
      });

      if (!slotValidation.success) {
        showAlert('Slot Unavailable', 'This slot is no longer available. Please select another time.');
        setIsBooking(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));

      const bookingId = isVideo
        ? `VID-${Math.floor(100000 + Math.random() * 900000)}`
        : `DOC-${Math.floor(100000 + Math.random() * 900000)}`;
      const tokenNumber = isVideo
        ? `VID-${Math.floor(100 + Math.random() * 900)}`
        : `TK-${Math.floor(10 + Math.random() * 90)}`;

      // Deduct wallet if used
      if (paymentOption === 'WALLET') {
        if (walletBalance < feeAmount) {
          showAlert('Insufficient Balance', 'Your MediUnify Health Wallet does not have enough balance.');
          setIsBooking(false);
          return;
        }
        const updatedBalance = walletBalance - feeAmount;
        await AsyncStorage.setItem('@unnathi_wallet_balance', updatedBalance.toString());
        setWalletBalance(updatedBalance);
      }

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (currentDateObj?.offset || 0));
      const cleanDateStr = targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const cleanTimeStr = selectedTime.includes(',') ? selectedTime.split(',')[1].trim() : selectedTime;

      if (isVideo) {
        // ONLINE VIDEO CONSULTATION
        const newBooking = {
          id: bookingId,
          tokenNumber,
          type: 'Video Consultation',
          doctor: {
            id: doctor?.id,
            name: doctor?.name || 'Specialist Doctor',
            specialty: doctor?.specialty || 'General Physician',
            qualification: doctor?.qualification || 'MBBS, MD',
            experienceYears: doctor?.experienceYears || doctor?.experience || '10+ Yrs',
            clinicName: doctor?.clinicName || 'MediUnify TeleHealth Suite',
            fee: feeAmount,
            image: doctor?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
            rating: doctor?.rating || '4.9/5',
          },
          specialty: doctor?.specialty || 'General Physician',
          day: currentDateObj?.displayTitle || 'Today',
          date: cleanDateStr,
          formattedDate: cleanDateStr,
          time: cleanTimeStr,
          timeSlot: selectedTime,
          status: 'Upcoming',
          paymentStatus:
            paymentOption === 'WALLET'
              ? 'Paid from Health Wallet'
              : paymentOption === 'PAY_AT_CLINIC'
              ? 'Pay Later'
              : 'Paid Online via UPI',
          fee: feeAmount,
          paidAmount: feeAmount,
          patientName: patientName.trim(),
          symptoms: healthConcern.trim(),
          videoRoomLink: `https://telehealth.mediunify.org/room/${tokenNumber}`,
          meetingRoomId: tokenNumber,
          patient: {
            name: patientName.trim(),
            phone: patientPhone.trim(),
            concern: healthConcern.trim(),
            reportName: uploadedDocument?.name || null,
            reportUri: uploadedDocument?.uri || null,
          },
          createdAt: new Date().toISOString(),
        };

        // 1. Save strictly to video consultations storage
        const vidJson = await AsyncStorage.getItem('@videoBookings');
        const vidList = vidJson ? JSON.parse(vidJson).filter((a) => a.id !== bookingId) : [];
        const updatedVid = [newBooking, ...vidList];
        await AsyncStorage.setItem('@videoBookings', JSON.stringify(updatedVid));
        await AsyncStorage.setItem('@mediunify_patient_online_consultations', JSON.stringify(updatedVid));

        // 2. Sync to background data store
        pushAppointment(newBooking);

        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
          window.dispatchEvent(new CustomEvent('mediunify_consultations_updated', { detail: { consultation: newBooking } }));
        }

        setIsBooking(false);
        onClose();

        showAlert(
          'Video Consultation Confirmed',
          `Your online consultation with ${doctor?.name || 'Doctor'} has been booked for ${selectedTime}.\n\nBooking ID: ${bookingId}\nRoom Token: ${tokenNumber}`,
          [
            {
              text: 'Go to Online Consultant',
              onPress: () => navigation?.navigate('MyOnlineConsultations'),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        // IN-CLINIC / PHYSICAL DOCTOR APPOINTMENT
        const newBooking = {
          id: bookingId,
          tokenNumber,
          type: 'In-Person',
          serviceType: 'In-Clinic Consultation',
          doctor: {
            id: doctor?.id,
            name: doctor?.name || 'Specialist Doctor',
            specialty: doctor?.specialty || 'General Physician',
            qualification: doctor?.qualification || 'MBBS, MD',
            clinicName: doctor?.clinicName || 'MediUnify Partner Clinic',
            clinicAddress: doctor?.clinicAddress || doctor?.address || 'No. 24, 5th Cross, Kuvempunagar, Mysore',
            clinicArea: doctor?.clinicArea || 'Kuvempunagar, Mysore',
            phone: doctor?.phone || '+91 821 245 9901',
            fee: feeAmount,
            image: doctor?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300',
          },
          facilityName: doctor?.clinicName || 'MediUnify Partner Clinic',
          department: doctor?.specialty || 'General Medicine',
          day: currentDateObj?.displayTitle || 'Today',
          date: cleanDateStr,
          formattedDate: cleanDateStr,
          time: cleanTimeStr,
          timeSlot: selectedTime,
          status: 'Upcoming',
          isUpcoming: true,
          paidAmount: feeAmount,
          amount: feeAmount,
          location: doctor?.clinicArea || 'Mysore',
          address: doctor?.clinicAddress || 'No. 24, 5th Cross, Kuvempunagar, Mysore',
          paymentStatus:
            paymentOption === 'PAY_AT_CLINIC'
              ? 'Pay at Clinic Reception'
              : paymentOption === 'WALLET'
              ? 'Paid from Health Wallet'
              : 'Paid Online via UPI',
          patient: {
            name: patientName.trim(),
            phone: patientPhone.trim(),
            reason: healthConcern.trim(),
            reportName: uploadedDocument?.name || null,
            reportUri: uploadedDocument?.uri || null,
          },
          patientName: patientName.trim(),
          bookingDate: new Date().toISOString().split('T')[0],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          createdAt: new Date().toISOString(),
        };

        // 1. Save strictly to physical appointments storage
        const existingJson = await AsyncStorage.getItem('@unnathi_appointments');
        const apptList = existingJson ? JSON.parse(existingJson).filter((a) => a.id !== bookingId) : [];
        const updatedAppts = [newBooking, ...apptList];
        await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify(updatedAppts));
        await AsyncStorage.setItem('@mediunify_patient_physical_appointments', JSON.stringify(updatedAppts));

        // 2. Sync to background data store
        pushAppointment(newBooking);

        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
          window.dispatchEvent(new CustomEvent('mediunify_appointments_updated', { detail: { appointment: newBooking } }));
        }

        setIsBooking(false);
        onClose();

        showAlert(
          'Appointment Confirmed',
          `Your in-clinic appointment with ${doctor?.name || 'Doctor'} has been confirmed for ${selectedTime}.\n\nToken: ${tokenNumber}`,
          [
            {
              text: 'View My Appointments',
              onPress: () => navigation?.navigate('MyAppointments'),
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (e) {
      console.log('Error saving appointment in modal:', e);
      setIsBooking(false);
      showAlert('Booking Error', 'Could not complete appointment. Please try again.');
    }
  };

  if (!doctor) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay} nativeID="doctor-booking-modal-overlay">
        <View style={[styles.modalCard, isDesktopWeb && { maxWidth: 500 }]}>
          {/* MODAL HEADER */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.confidentialBadgePill}>
                <Ionicons name={isVideo ? 'videocam' : 'shield-checkmark'} size={11} color="#059669" />
                <Text style={styles.confidentialBadgePillText}>
                  {isVideo ? '100% PRIVATE & ENCRYPTED HD VIDEO' : '100% VERIFIED CLINIC CARE'}
                </Text>
              </View>
              <Text style={[styles.modalTitle, isIndic && { lineHeight: 24 }]}>
                {isVideo ? t('doctors.book_video_consult', 'Book Instant Video Consult') : t('doctors.book_in_clinic', 'Book In-Clinic Consultation')}
              </Text>
              <Text style={styles.modalSub} numberOfLines={1}>
                {doctor.name} • {t(doctor.specialty || doctor.specialization, doctor.specialty || doctor.specialization)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* FORM BODY */}
          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            {/* PATIENT FULL NAME */}
            <Text style={[styles.inputLabel, isIndic && { lineHeight: 18 }]}>
              {t('auth.full_name', 'Patient Full Name')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={patientName}
              onChangeText={setPatientName}
              placeholder={t('auth.full_name_ph', 'Enter patient name')}
              placeholderTextColor="#94A3B8"
            />

            {/* MOBILE NUMBER */}
            <Text style={[styles.inputLabel, isIndic && { lineHeight: 18 }]}>
              {t('auth.mobile_number', 'Mobile Number')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={patientPhone}
              onChangeText={setPatientPhone}
              keyboardType="phone-pad"
              placeholder="+91 98450 12345"
              placeholderTextColor="#94A3B8"
            />

            {/* PRIMARY HEALTH CONCERN */}
            <Text style={[styles.inputLabel, isIndic && { lineHeight: 18 }]}>
              {t('doctors.reason_for_visit', 'Primary Health Concern')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={healthConcern}
              onChangeText={setHealthConcern}
              placeholder={t('doctors.reason_ph', 'e.g. Fever, Stress, Joint Pain & Wellness')}
              placeholderTextColor="#94A3B8"
            />

            {/* UPLOAD PDF OR IMAGE OPTION */}
            <Text style={[styles.inputLabel, isIndic && { lineHeight: 18 }]}>
              {t('records.records_title', 'Medical Records / Prescription')}
            </Text>
            {!uploadedDocument ? (
              <View style={styles.uploadContainer}>
                <View style={styles.uploadButtonsRow}>
                  <TouchableOpacity
                    style={styles.uploadActionBtn}
                    onPress={() => handlePickDocument('pdf')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text" size={17} color="#DC2626" />
                    <Text style={styles.uploadActionBtnText}>Upload PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadActionBtn}
                    onPress={() => handlePickDocument('image')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image" size={17} color="#059669" />
                    <Text style={styles.uploadActionBtnText}>Upload Image</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadActionBtn}
                    onPress={() => handlePickDocument('camera')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={17} color="#2563EB" />
                    <Text style={styles.uploadActionBtnText}>Camera</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.uploadHintText}>
                  Attach past prescriptions, lab tests, or scan reports for doctor review.
                </Text>
              </View>
            ) : (
              <View style={styles.uploadedFileCard}>
                <View style={styles.uploadedFileIconWrap}>
                  {uploadedDocument.type === 'pdf' ? (
                    <Ionicons name="document-text" size={24} color="#DC2626" />
                  ) : (
                    <Image source={{ uri: uploadedDocument.uri }} style={styles.uploadedFileThumb} />
                  )}
                </View>
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.uploadedFileName} numberOfLines={1}>
                    {uploadedDocument.name}
                  </Text>
                  <Text style={styles.uploadedFileSize}>{uploadedDocument.size} • Attached</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setUploadedDocument(null)}
                  style={styles.removeFileBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={17} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* PREFERRED APPOINTMENT SLOT */}
            <View style={styles.slotPickerSection}>
              <View style={styles.slotHeaderRow}>
                <Text style={styles.inputLabel}>Choose Date & Time Slot</Text>
                <View style={styles.selectedSlotSummaryBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={styles.selectedSlotSummaryText} numberOfLines={1}>
                    {selectedTime}
                  </Text>
                </View>
              </View>

              {/* HORIZONTAL DATE PICKER TABS */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.datePickerScroll}
                contentContainerStyle={styles.datePickerContainer}
              >
                {availableDates.map((dateItem, idx) => {
                  const isSelected = selectedDateIndex === idx;
                  return (
                    <TouchableOpacity
                      key={dateItem.id}
                      style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                      onPress={() => handleSelectDate(idx)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dateChipTitle, isSelected && styles.dateChipTitleSelected]}>
                        {dateItem.displayTitle}
                      </Text>
                      <Text style={[styles.dateChipSub, isSelected && styles.dateChipSubSelected]}>
                        {dateItem.displaySub}
                      </Text>
                      <View style={[styles.dateChipBadge, isSelected && styles.dateChipBadgeSelected]}>
                        <Text style={[styles.dateChipBadgeText, isSelected && styles.dateChipBadgeTextSelected]}>
                          Available
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* SLOTS GROUPED BY SESSION */}
              <View style={styles.slotsGroupCard}>
                {/* INSTANT CONNECT (VIDEO TODAY ONLY) */}
                {currentSlots.instant && (
                  <TouchableOpacity
                    style={[
                      styles.instantSlotCard,
                      selectedTime === currentSlots.instant.fullLabel && styles.instantSlotCardSelected,
                    ]}
                    onPress={() => setSelectedTime(currentSlots.instant.fullLabel)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.instantSlotLeft}>
                      <View style={styles.instantSlotIconWrap}>
                        <Ionicons name="flash" size={15} color="#FFFFFF" />
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.instantSlotTitle}>Instant Video Consultation</Text>
                          <View style={styles.instantLiveBadge}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.livePulseText}>Doctor Ready</Text>
                          </View>
                        </View>
                        <Text style={styles.instantSlotSub}>Within 10-15 mins • Live HD Encrypted Room</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={selectedTime === currentSlots.instant.fullLabel ? 'checkmark-circle' : 'chevron-forward'}
                      size={18}
                      color={selectedTime === currentSlots.instant.fullLabel ? '#059669' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                )}

                {/* MORNING SLOTS */}
                <View style={styles.sessionSection}>
                  <View style={styles.sessionHeaderRow}>
                    <Ionicons name="sunny-outline" size={13} color="#D97706" />
                    <Text style={styles.sessionHeaderTitle}>
                      Morning OPD ({currentSlots.morning.filter((s) => s.available).length} available)
                    </Text>
                  </View>
                  <View style={styles.slotsGrid}>
                    {currentSlots.morning.map((slot) => {
                      const isSel = selectedTime === slot.fullLabel;
                      const isAvail = slot.available !== false;
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          disabled={!isAvail}
                          style={[
                            styles.slotChipGrid,
                            isSel && styles.slotChipGridSelected,
                            !isAvail && styles.slotChipGridDisabled,
                          ]}
                          onPress={() => isAvail && setSelectedTime(slot.fullLabel)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={!isAvail ? '#94A3B8' : isSel ? '#FFFFFF' : '#0D9488'}
                          />
                          <Text
                            style={[
                              styles.slotChipGridText,
                              isSel && styles.slotChipGridTextSelected,
                              !isAvail && styles.slotChipGridTextDisabled,
                            ]}
                          >
                            {slot.time}
                          </Text>
                          {!isAvail && (
                            <Text style={styles.slotStatusTagText}>
                              {slot.isBooked ? 'Booked' : 'Passed'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* AFTERNOON SLOTS */}
                <View style={styles.sessionSection}>
                  <View style={styles.sessionHeaderRow}>
                    <Ionicons name="partly-sunny-outline" size={13} color="#2563EB" />
                    <Text style={styles.sessionHeaderTitle}>
                      Afternoon OPD ({currentSlots.afternoon.filter((s) => s.available).length} available)
                    </Text>
                  </View>
                  <View style={styles.slotsGrid}>
                    {currentSlots.afternoon.map((slot) => {
                      const isSel = selectedTime === slot.fullLabel;
                      const isAvail = slot.available !== false;
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          disabled={!isAvail}
                          style={[
                            styles.slotChipGrid,
                            isSel && styles.slotChipGridSelected,
                            !isAvail && styles.slotChipGridDisabled,
                          ]}
                          onPress={() => isAvail && setSelectedTime(slot.fullLabel)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={!isAvail ? '#94A3B8' : isSel ? '#FFFFFF' : '#0D9488'}
                          />
                          <Text
                            style={[
                              styles.slotChipGridText,
                              isSel && styles.slotChipGridTextSelected,
                              !isAvail && styles.slotChipGridTextDisabled,
                            ]}
                          >
                            {slot.time}
                          </Text>
                          {!isAvail && (
                            <Text style={styles.slotStatusTagText}>
                              {slot.isBooked ? 'Booked' : 'Passed'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* EVENING SLOTS */}
                <View style={[styles.sessionSection, { marginBottom: 0 }]}>
                  <View style={styles.sessionHeaderRow}>
                    <Ionicons name="moon-outline" size={13} color="#1E3A8A" />
                    <Text style={styles.sessionHeaderTitle}>
                      Evening OPD ({currentSlots.evening.filter((s) => s.available).length} available)
                    </Text>
                  </View>
                  <View style={styles.slotsGrid}>
                    {currentSlots.evening.map((slot) => {
                      const isSel = selectedTime === slot.fullLabel;
                      const isAvail = slot.available !== false;
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          disabled={!isAvail}
                          style={[
                            styles.slotChipGrid,
                            isSel && styles.slotChipGridSelected,
                            !isAvail && styles.slotChipGridDisabled,
                          ]}
                          onPress={() => isAvail && setSelectedTime(slot.fullLabel)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={!isAvail ? '#94A3B8' : isSel ? '#FFFFFF' : '#0D9488'}
                          />
                          <Text
                            style={[
                              styles.slotChipGridText,
                              isSel && styles.slotChipGridTextSelected,
                              !isAvail && styles.slotChipGridTextDisabled,
                            ]}
                          >
                            {slot.time}
                          </Text>
                          {!isAvail && (
                            <Text style={styles.slotStatusTagText}>
                              {slot.isBooked ? 'Booked' : 'Passed'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* PAYMENT OPTION */}
            <Text style={[styles.inputLabel, isIndic && { lineHeight: 18 }]}>
              {t('payment.payment_method', 'Payment Option')}
            </Text>
            <View style={styles.payOptionsRow}>
              {!isVideo && (
                <TouchableOpacity
                  style={[styles.payMethodChip, paymentOption === 'PAY_AT_CLINIC' && styles.payMethodChipActive]}
                  onPress={() => setPaymentOption('PAY_AT_CLINIC')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payMethodText, paymentOption === 'PAY_AT_CLINIC' && styles.payMethodTextActive, isIndic && { lineHeight: 16 }]}>
                    {t('payment.cod', 'Pay at Clinic')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.payMethodChip, paymentOption === 'WALLET' && styles.payMethodChipActive]}
                onPress={() => setPaymentOption('WALLET')}
                activeOpacity={0.8}
              >
                <Text style={[styles.payMethodText, paymentOption === 'WALLET' && styles.payMethodTextActive, isIndic && { lineHeight: 16 }]}>
                  {t('profile.health_wallet', 'Wallet')} (₹{walletBalance})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payMethodChip, paymentOption === 'PAY_ONLINE' && styles.payMethodChipActive]}
                onPress={() => setPaymentOption('PAY_ONLINE')}
                activeOpacity={0.8}
              >
                <Text style={[styles.payMethodText, paymentOption === 'PAY_ONLINE' && styles.payMethodTextActive, isIndic && { lineHeight: 16 }]}>
                  {t('payment.upi', 'UPI / Online')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PRICING SUMMARY BOX */}
            <View style={styles.pricingSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, isIndic && { lineHeight: 18 }]}>
                  {paymentOption === 'PAY_AT_CLINIC' ? t('payment.pay_at_clinic_total', 'Total Payable at Clinic') : t('pharmacy.total_payable', 'Total Payable')}
                </Text>
                <Text style={styles.summaryValue}>₹{feeAmount}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <Ionicons name="checkmark-circle" size={13} color="#00B894" />
                <Text style={[styles.summaryNote, isIndic && { lineHeight: 16 }]}>
                  {t('booking.perks_note', 'Zero cancellation fee • Digital prescription included • Instant confirmation')}
                </Text>
              </View>
            </View>

            {/* PRIVACY ASSURANCE BOX */}
            <View style={styles.privacyAssuranceBox}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text style={[styles.privacyAssuranceText, isIndic && { lineHeight: 18 }]}>
                {isVideo
                  ? t('booking.assurance_video', '100% private encrypted HD video consultation with verified doctor. Includes free 3-day digital prescription follow-up.')
                  : t('booking.assurance_clinic', 'Verified specialist doctors with authentic clinical care, sanitized OPD rooms, and verified digital prescription.')}
              </Text>
            </View>
          </ScrollView>

          {/* MODAL FOOTER */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.confirmBookingBtn, isBooking && styles.confirmBookingBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.88}
              disabled={isBooking}
            >
              {isBooking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.confirmBookingBtnText, isIndic && { lineHeight: 22 }]}>
                  {t('booking.confirm', 'Confirm Appointment')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const baseStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? { zIndex: 9990 } : {}),
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  confidentialBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confidentialBadgePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 6,
  },
  modalForm: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  uploadContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    padding: 10,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  uploadActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  uploadHintText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    textAlign: 'center',
  },
  uploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 8,
  },
  uploadedFileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedFileThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  uploadedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  uploadedFileSize: {
    fontSize: 10,
    color: '#059669',
    marginTop: 1,
  },
  removeFileBtn: {
    padding: 4,
  },
  slotPickerSection: {
    marginTop: 4,
    marginBottom: 6,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  selectedSlotSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: '55%',
  },
  selectedSlotSummaryText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  datePickerScroll: {
    marginBottom: 8,
  },
  datePickerContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 84,
  },
  dateChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  dateChipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dateChipTitleSelected: {
    color: '#065F46',
    fontWeight: '800',
  },
  dateChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  dateChipSubSelected: {
    color: '#059669',
    fontWeight: '600',
  },
  dateChipBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  dateChipBadgeSelected: {
    backgroundColor: '#D1FAE5',
  },
  dateChipBadgeText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  dateChipBadgeTextSelected: {
    color: '#047857',
    fontWeight: '700',
  },
  slotsGroupCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  instantSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instantSlotCardSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  instantSlotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  instantSlotIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantSlotTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  instantLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  livePulseText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  instantSlotSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  sessionSection: {
    marginBottom: 10,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  sessionHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotChipGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  slotChipGridSelected: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  slotChipGridDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  slotChipGridTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  slotStatusTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  slotChipGridText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  slotChipGridTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  slotPickerRow: {
    gap: 6,
    marginTop: 4,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  slotChipText: {
    fontSize: 11.5,
    color: '#475569',
  },
  slotChipTextSelected: {
    fontWeight: '800',
    color: '#065F46',
  },
  payOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  payMethodChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payMethodChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  payMethodText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  payMethodTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  pricingSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  summaryNote: {
    fontSize: 10,
    color: '#059669',
    marginTop: 6,
  },
  privacyAssuranceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  privacyAssuranceText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmBookingBtn: {
    backgroundColor: '#00B894',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBookingBtnDisabled: {
    opacity: 0.65,
  },
  confirmBookingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default DoctorBookingModal;
