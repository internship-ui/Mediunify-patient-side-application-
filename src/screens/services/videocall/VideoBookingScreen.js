import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { pushAppointment } from '../../../services/dataSyncService';
import { saveTransaction } from '../../../services/transactionService';
import { getAvailableDates, getSlotsForDate } from '../../../utils/appointmentSlotHelper';
import { validateAndBookSlot, subscribeToSlotChanges } from '../../../services/slotBookingService';
import { useAuthGuard } from '../../../context/AuthGuardContext';
import { isGuestUser, promptLoginRequired } from '../../../utils/authHelper';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const VideoBookingScreen = ({ route, navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && isDesktopLayout(width);
  const doctor = route?.params?.doctor;
  const { requireLogin } = useAuthGuard();

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
  const currentSlots = getSlotsForDate(currentDateObj, true, doctor);

  const getDefaultSlotForDate = (dateObj) => {
    const slots = getSlotsForDate(dateObj, true, doctor);
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

  const handleSelectDate = (idx) => {
    setSelectedDateIndex(idx);
    const targetDate = availableDates[idx];
    setSelectedTime(getDefaultSlotForDate(targetDate));
  };

  // Patient Info (matching current account user)
  const [patientName, setPatientName] = useState('Hemanth Gowda (Self)');
  const [patientPhone, setPatientPhone] = useState('+91 97414 22544');
  const [healthConcern, setHealthConcern] = useState('Stress, Joint Pain & Wellness');

  // Uploaded Medical Document / PDF / Image
  const [uploadedDocument, setUploadedDocument] = useState(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('WALLET'); // 'WALLET' | 'UPI'
  const [walletBalance, setWalletBalance] = useState(1250);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const guest = await isGuestUser();
      if (guest) {
        setPatientName('');
        setPatientPhone('');
        setWalletBalance(0);
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
      const bal = await AsyncStorage.getItem('@unnathi_wallet_balance');
      if (bal) setWalletBalance(parseInt(bal, 10) || 1250);
    } catch (e) {
      console.log('Error loading user data in video booking:', e);
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
        if (Platform.OS !== 'web') {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            showAlert('Permission Required', 'Gallery access is required.');
            return;
          }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
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

      // PDF / Document Picker
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

  if (!doctor) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.scrollContent}>
          <View style={styles.modalCard}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={50} color="#D32F2F" />
              <Text style={styles.errorTitle}>Doctor Information Unavailable</Text>
              <Text style={styles.errorText}>Please go back and select a doctor again.</Text>
              <TouchableOpacity
                style={styles.confirmBookingBtn}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.confirmBookingBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const fee = doctor.fee || 450;

  const handleConfirmAndPay = async () => {
    const isGuest = await isGuestUser();
    if (isGuest) {
      promptLoginRequired(navigation, { service: 'videocall' });
      return;
    }
    requireLogin(() => _doConfirmAndPay(), 'Please login to continue with video consultation.');
  };

  const _doConfirmAndPay = async () => {

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

    if (paymentMethod === 'WALLET') {
      if (walletBalance < fee) {
        showAlert(
          'Insufficient Wallet Balance',
          `Your MediUnify Wallet has ₹${walletBalance.toLocaleString('en-IN')}, but consultation fee is ₹${fee.toLocaleString('en-IN')}.\n\nPlease top up your wallet or select UPI.`,
          [
            { text: 'Top Up Wallet', onPress: () => navigation.navigate('Wallet') },
            { text: 'Pay via UPI', onPress: () => setPaymentMethod('UPI') },
          ]
        );
        return;
      }
    }

    setIsBooking(true);

    try {
      // Real-Time Atomic Slot Validation (Rules 2, 3, 6)
      const slotValidation = await validateAndBookSlot({
        date: currentDateObj,
        time: selectedTime,
        serviceType: 'video',
        providerId: doctor?.id || doctor?.name || 'doctor',
        patientName: patientName.trim(),
      });

      if (!slotValidation.success) {
        showAlert('Slot Unavailable', 'This slot is no longer available. Please select another time.');
        setIsBooking(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 800));

      const bookingId = `VID-${Math.floor(100000 + Math.random() * 900000)}`;
      const tokenNumber = `TK-${Math.floor(10 + Math.random() * 90)}`;
      const videoRoomLink = `https://telehealth.unnathi.org/room/${bookingId}`;

      // Deduct from wallet if paid via wallet
      if (paymentMethod === 'WALLET') {
        const newBal = Math.max(0, walletBalance - fee);
        setWalletBalance(newBal);
        try {
          await AsyncStorage.setItem('@unnathi_wallet_balance', newBal.toString());
          const storedTx = await AsyncStorage.getItem('@unnathi_wallet_transactions');
          const existingTx = storedTx ? JSON.parse(storedTx) : [];
          const newTx = {
            id: `tx-${Date.now()}`,
            title: 'Paid for Video Consultation',
            subtitle: `Consultation with ${doctor.name} (${doctor.specialty})`,
            amount: `-₹${fee}`,
            type: 'debit',
            date: 'Just Now',
            icon: 'videocam-outline',
          };
          await AsyncStorage.setItem('@unnathi_wallet_transactions', JSON.stringify([newTx, ...existingTx]));
        } catch (e) {
          console.log('Error updating wallet:', e);
        }
      }

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (currentDateObj?.offset || 0));
      const cleanDateStr = targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const cleanTimeStr = selectedTime.includes(',') ? selectedTime.split(',')[1].trim() : selectedTime;

      const newVideoBooking = {
        id: bookingId,
        tokenNumber,
        type: 'Video Consultation',
        doctor: {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          qualification: doctor.qualification,
          experienceYears: doctor.experienceYears || doctor.experience || '10+ Yrs',
          clinicName: doctor.clinicName || 'MediUnify TeleHealth Suite',
          languages: doctor.languages,
          image: doctor.image,
          rating: doctor.rating || '4.9/5',
        },
        specialty: doctor.specialty,
        day: currentDateObj?.displayTitle || 'Today',
        date: cleanDateStr,
        formattedDate: cleanDateStr,
        time: cleanTimeStr,
        timeSlot: selectedTime,
        status: 'Upcoming',
        fee,
        paidAmount: fee,
        paymentStatus: paymentMethod === 'WALLET' ? 'Paid via MediUnify Wallet' : 'Paid Online (UPI)',
        paymentMethod: paymentMethod === 'WALLET' ? 'MediUnify Health Wallet' : 'UPI',
        videoRoomLink,
        meetingRoomId: tokenNumber,
        patientName,
        symptoms: healthConcern,
        patient: {
          name: patientName,
          phone: patientPhone,
          reason: healthConcern,
          reportUri: uploadedDocument?.uri || null,
          reportName: uploadedDocument?.name || null,
          reportType: uploadedDocument?.type || null,
        },
        createdAt: new Date().toISOString(),
      };

      // 1. Save strictly to video consultations storage
      const existingVidJson = await AsyncStorage.getItem('@videoBookings');
      const existingVid = existingVidJson ? JSON.parse(existingVidJson).filter((a) => a.id !== bookingId) : [];
      const updatedVid = [newVideoBooking, ...existingVid];
      await AsyncStorage.setItem('@videoBookings', JSON.stringify(updatedVid));
      await AsyncStorage.setItem('@mediunify_patient_online_consultations', JSON.stringify(updatedVid));

      // ── Save to Payment History ──────────────────────────────────
      try {
        await saveTransaction({
          id:          `TXN-${bookingId}`,
          refId:       bookingId,
          service:     'Video Consultation',
          serviceType: 'consultation',
          title:       doctor.name || 'Video Consultation',
          facility:    doctor.clinicName || 'MediUnify TeleHealth',
          rawDate:     new Date().toISOString(),
          amount:      Number(fee || 0),
          mrp:         Number(fee || 0),
          status:      'Paid',
          paymentMode: paymentMethod === 'WALLET' ? 'MediUnify Wallet' : 'Online UPI',
          gstin:       '29AABCU9603R1ZX',
          items:       [{ name: `Video Consultation – ${doctor.specialty || ''}`, qty: 1, price: Number(fee || 0) }],
        });
      } catch (_txErr) {}
      // ────────────────────────────────────────────────────────────

      // 2. Remove from physical appointments if present (to avoid mixing)
      const existingApptJson = await AsyncStorage.getItem('@unnathi_appointments');
      if (existingApptJson) {
        const filtered = JSON.parse(existingApptJson).filter((a) => a.id !== bookingId);
        await AsyncStorage.setItem('@unnathi_appointments', JSON.stringify(filtered));
        await AsyncStorage.setItem('@mediunify_patient_physical_appointments', JSON.stringify(filtered));
      }

      // 3. Push to central server database
      try {
        await pushAppointment(newVideoBooking);
      } catch (pushErr) {
        console.warn('Could not push video appointment to server:', pushErr);
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('mediunify_consultations_updated', { detail: { consultation: newVideoBooking } }));
      }

      setIsBooking(false);

      showAlert(
        'Video Appointment Confirmed',
        `Your online consultation with ${doctor.name} has been booked for ${selectedTime}.${uploadedDocument ? '\n\nAttached Record: ' + uploadedDocument.name : ''}\n\nBooking ID: ${bookingId}\nRoom Token: ${tokenNumber}`,
        [
          {
            text: 'Go to Online Consultant',
            onPress: () => {
              navigation.navigate('MyOnlineConsultations', {
                newConsultation: newVideoBooking,
                timestamp: Date.now(),
              });
            },
          },
          {
            text: 'Done',
            onPress: () => {
              navigation.navigate('Home');
            },
          },
        ]
      );
    } catch (e) {
      console.log('Error booking video consult:', e);
      setIsBooking(false);
      showAlert('Booking Error', 'Could not complete your video consultation booking. Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? theme.headerBg : "#FFFFFF"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            isDesktopWeb && styles.scrollContentDesktop,
          ]}
        >
          {/* DESKTOP BREADCRUMBS ROW */}
          {isDesktopWeb && (
            <View style={styles.breadcrumbsRow}>
              <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                <Text style={styles.breadcrumbLink}>Home</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbSlash}>/</Text>
              <TouchableOpacity onPress={() => navigation.navigate('VideoConsultation')}>
                <Text style={styles.breadcrumbLink}>Video Doctors</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbSlash}>/</Text>
              <Text style={styles.breadcrumbCurrent}>Book Video Consultation</Text>
            </View>
          )}

          {/* CARD CONTAINER */}
          <View style={[styles.modalCard, isDesktopWeb && { maxWidth: 500 }]}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.confidentialBadgePill}>
                  <Ionicons name="videocam" size={11} color="#059669" />
                  <Text style={styles.confidentialBadgePillText}>100% VERIFIED VIDEO CARE</Text>
                </View>
                <Text style={styles.modalTitle}>Book Online Video Consultation</Text>
                <Text style={styles.modalSub} numberOfLines={1}>
                  {doctor.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* FORM BODY */}
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* PATIENT FULL NAME */}
              <Text style={styles.inputLabel}>Patient Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={patientName}
                onChangeText={setPatientName}
                placeholder="Enter patient name"
                placeholderTextColor="#94A3B8"
              />

              {/* MOBILE NUMBER */}
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.textInput}
                value={patientPhone}
                onChangeText={setPatientPhone}
                keyboardType="phone-pad"
                placeholder="+91 98450 12345"
                placeholderTextColor="#94A3B8"
              />

              {/* PRIMARY HEALTH CONCERN */}
              <Text style={styles.inputLabel}>Primary Health Concern</Text>
              <TextInput
                style={styles.textInput}
                value={healthConcern}
                onChangeText={setHealthConcern}
                placeholder="Stress, Joint Pain & Wellness"
                placeholderTextColor="#94A3B8"
              />

              {/* UPLOAD PDF OR IMAGE OPTION */}
              <Text style={styles.inputLabel}>Medical Records / Prescription (PDF or Image)</Text>
              {!uploadedDocument ? (
                <View style={styles.uploadContainer}>
                  <View style={styles.uploadButtonsRow}>
                    {/* UPLOAD PDF BUTTON */}
                    <TouchableOpacity
                      style={styles.uploadActionBtn}
                      onPress={() => handlePickDocument('pdf')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text" size={18} color="#FF7F50" />
                      <Text style={styles.uploadActionBtnText}>Upload PDF</Text>
                    </TouchableOpacity>

                    {/* UPLOAD IMAGE BUTTON */}
                    <TouchableOpacity
                      style={styles.uploadActionBtn}
                      onPress={() => handlePickDocument('image')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="image" size={18} color="#00B894" />
                      <Text style={styles.uploadActionBtnText}>Upload Image</Text>
                    </TouchableOpacity>

                    {/* CAMERA OPTION */}
                    <TouchableOpacity
                      style={styles.uploadActionBtn}
                      onPress={() => handlePickDocument('camera')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera" size={18} color="#00C2CB" />
                      <Text style={styles.uploadActionBtnText}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.uploadHintText}>
                    Attach past prescriptions, lab tests, or scan reports (PDF, JPG, PNG up to 15MB). Dr. {doctor.name} will review this before your call.
                  </Text>
                </View>
              ) : (
                <View style={styles.uploadedFileCard}>
                  <View style={styles.uploadedFileIconWrap}>
                    {uploadedDocument.type === 'pdf' ? (
                      <Ionicons name="document-text" size={26} color="#FF7F50" />
                    ) : (
                      <Image source={{ uri: uploadedDocument.uri }} style={styles.uploadedFileThumb} />
                    )}
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.uploadedFileName} numberOfLines={1}>
                      {uploadedDocument.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={styles.uploadedFileSize}>{uploadedDocument.size}</Text>
                      <Text style={styles.uploadedFileDot}>•</Text>
                      <Ionicons name="checkmark-circle" size={12} color="#00B894" />
                      <Text style={styles.uploadedFileReady}>Attached for Doctor</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setUploadedDocument(null)}
                    style={styles.removeFileBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF7F50" />
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
                      <Ionicons name="sunny-outline" size={13} color="#FF7F50" />
                      <Text style={styles.sessionHeaderTitle}>
                        Morning Sessions ({currentSlots.morning.filter((s) => s.available).length} available)
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
                              name="videocam-outline"
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
                        Afternoon Sessions ({currentSlots.afternoon.filter((s) => s.available).length} available)
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
                              name="videocam-outline"
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
                        Evening Sessions ({currentSlots.evening.filter((s) => s.available).length} available)
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
                              name="videocam-outline"
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

              {/* PAYMENT OPTION PILLS */}
              <Text style={styles.inputLabel}>Payment Option</Text>
              <View style={styles.payOptionsRow}>
                <TouchableOpacity
                  style={[styles.payMethodChip, paymentMethod === 'WALLET' && styles.payMethodChipActive]}
                  onPress={() => setPaymentMethod('WALLET')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payMethodText, paymentMethod === 'WALLET' && styles.payMethodTextActive]}>
                    Wallet (₹{walletBalance})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payMethodChip, paymentMethod === 'UPI' && styles.payMethodChipActive]}
                  onPress={() => setPaymentMethod('UPI')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payMethodText, paymentMethod === 'UPI' && styles.payMethodTextActive]}>
                    UPI / Online
                  </Text>
                </TouchableOpacity>
              </View>

              {/* PRICING SUMMARY BOX */}
              <View style={styles.pricingSummaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Payable Online</Text>
                  <Text style={styles.summaryValue}>₹{fee}</Text>
                </View>
                <Text style={styles.summaryNote}>
                  Zero cancellation fee • Digital prescription included • Instant confirmation
                </Text>
              </View>

              {/* PRIVACY & VERIFIED ASSURANCE BOX */}
              <View style={styles.privacyAssuranceBox}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.privacyAssuranceText}>
                  End-to-end encrypted private video consultation, zero call recording, instant digital prescription, and encrypted personal records.
                </Text>
              </View>
            </ScrollView>

            {/* MODAL FOOTER & CONFIRM BUTTON */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.confirmBookingBtn, isBooking && styles.confirmBookingBtnDisabled]}
                onPress={handleConfirmAndPay}
                activeOpacity={0.88}
                disabled={isBooking}
              >
                {isBooking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBookingBtnText}>Confirm Appointment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isDesktopWeb && (
            <View style={{ width: '100%', marginTop: 40 }}>
              <WebFooter />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'rgba(15, 23, 42, 0.65)' : '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  scrollContentDesktop: {
    paddingVertical: 32,
  },
  breadcrumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    marginBottom: 16,
    gap: 6,
  },
  breadcrumbLink: {
    fontSize: 12,
    color: Platform.OS === 'web' ? '#34D399' : '#059669',
    fontWeight: '600',
  },
  breadcrumbSlash: {
    fontSize: 12,
    color: '#94A3B8',
  },
  breadcrumbCurrent: {
    fontSize: 12,
    color: Platform.OS === 'web' ? '#CBD5E1' : '#64748B',
    fontWeight: '500',
  },

  // MODAL CARD
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 8,
  },

  // MODAL HEADER
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    letterSpacing: 0.3,
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
    maxWidth: 320,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // FORM BODY
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

  // UPLOAD CONTAINER
  uploadContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
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
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  uploadActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  uploadHintText: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // UPLOADED FILE CARD
  uploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
  },
  uploadedFileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  uploadedFileThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  uploadedFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadedFileSize: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  uploadedFileDot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  uploadedFileReady: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  removeFileBtn: {
    padding: 6,
  },

  // PREFERRED APPOINTMENT SLOTS
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
    marginBottom: 10,
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
    color: '#FF7F50',
    backgroundColor: '#FFF2ED',
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

  // PAYMENT OPTIONS
  payOptionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  payMethodChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
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
    fontWeight: '600',
    color: '#64748B',
  },
  payMethodTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },

  // PRICING SUMMARY BOX
  pricingSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
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

  // PRIVACY ASSURANCE BOX
  privacyAssuranceBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    alignItems: 'flex-start',
  },
  privacyAssuranceText: {
    fontSize: 11,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },

  // MODAL FOOTER & CONFIRM BUTTON
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmBookingBtn: {
    backgroundColor: '#059669',
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

  // ERROR CONTAINER
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  errorText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
});

export default VideoBookingScreen;