import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../../../theme/colors';
import { useCart } from '../../../context/CartContext';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VideoMeetingScreen = ({ route, navigation }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { addToCart } = useCart();
  const appointment = route?.params?.appointment || {};
  const doctor = appointment?.doctor || route?.params?.doctor || {
    name: 'Dr. Ananya Rao',
    specialty: 'General Physician & TeleHealth Specialist',
    qualification: 'MBBS, MD - General Medicine',
    experience: '12+ Years Exp',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
    clinicName: 'MediUnify Virtual TeleHealth Room',
  };

  const patient = appointment?.patient || {
    name: 'Ramesh Kumar',
    age: '28',
    gender: 'Male',
  };

  // Call Controls State
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(128); // seconds

  // Uploaded Documents & Pictures State
  const [uploadedDocuments, setUploadedDocuments] = useState([
    {
      id: 'doc-init-1',
      name: 'Blood_Test_CBC_Report.pdf',
      type: 'Lab Report',
      time: 'Just now',
      uri: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=400',
      isImage: true,
      verified: true,
    },
  ]);
  const [selectedDocPreview, setSelectedDocPreview] = useState(null);

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-1',
      sender: 'doctor',
      text: `Hello ${patient.name || 'there'}! I am ${doctor.name}. How are you feeling today?`,
      time: '04:30 PM',
    },
    {
      id: 'msg-2',
      sender: 'doctor',
      text: 'Please share any previous lab reports, prescription slips, or photos of your symptoms here.',
      time: '04:31 PM',
    },
  ]);
  const [messageInput, setMessageInput] = useState('');

  // Live Call Timer
  useEffect(() => {
    let timer;
    if (!isCallEnded) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallEnded]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Upload Report / Pic from Gallery
  const handlePickFromGallery = async () => {
    try {
      setIsUploading(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setIsUploading(false);
        showAlert('Permission Required', 'Please grant photo library access to upload medical records.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      setIsUploading(false);

      if (!result.canceled && result.assets?.[0]) {
        const newDoc = {
          id: `doc-${Date.now()}`,
          name: `Medical_Scan_${Math.floor(100 + Math.random() * 900)}.jpg`,
          type: 'Patient Image/Doc',
          time: 'Just now',
          uri: result.assets[0].uri,
          isImage: true,
          verified: true,
        };

        setUploadedDocuments((prev) => [newDoc, ...prev]);
        setIsUploadModalOpen(false);

        // Add automated chat confirmation
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'user',
            text: `Uploaded file: ${newDoc.name}`,
            time: 'Just now',
            docAttachment: newDoc,
          },
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'doctor',
            text: `Thank you! I have received ${newDoc.name} on my clinical dashboard. Let me review this.`,
            time: 'Just now',
          },
        ]);

        showAlert('Uploaded to Doctor', 'Your document has been sent directly to the doctor in this call.');
      }
    } catch (e) {
      setIsUploading(false);
      console.log('Error uploading:', e);
      showAlert('Upload Error', 'Could not access file. Please try again.');
    }
  };

  // Capture Photo with Camera
  const handleCapturePhoto = async () => {
    try {
      setIsUploading(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setIsUploading(false);
        showAlert('Permission Required', 'Camera permission is required to capture symptom photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      setIsUploading(false);

      if (!result.canceled && result.assets?.[0]) {
        const newDoc = {
          id: `doc-${Date.now()}`,
          name: `Symptom_Photo_${Math.floor(100 + Math.random() * 900)}.jpg`,
          type: 'Symptom Photo',
          time: 'Just now',
          uri: result.assets[0].uri,
          isImage: true,
          verified: true,
        };

        setUploadedDocuments((prev) => [newDoc, ...prev]);
        setIsUploadModalOpen(false);

        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'user',
            text: `Shared live camera photo: ${newDoc.name}`,
            time: 'Just now',
            docAttachment: newDoc,
          },
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'doctor',
            text: `Received the photo clearly. I am noting this down in your electronic prescription.`,
            time: 'Just now',
          },
        ]);

        showAlert('Photo Shared with Doctor', 'Your photo has been transmitted to the doctor.');
      }
    } catch (e) {
      setIsUploading(false);
      console.log('Error capturing camera photo:', e);
      showAlert('Camera Error', 'Could not open camera.');
    }
  };

  // Add simulated prescription / blood report
  const handleSelectSampleDoc = (docType) => {
    const docName = docType === 'rx' ? 'Past_Prescription_Slip.pdf' : 'Comprehensive_Lipid_Profile.pdf';
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: docName,
      type: docType === 'rx' ? 'Previous Rx Slip' : 'Lab Diagnostic Report',
      time: 'Just now',
      uri: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
      isImage: true,
      verified: true,
    };

    setUploadedDocuments((prev) => [newDoc, ...prev]);
    setIsUploadModalOpen(false);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: `Attached from Health Vault: ${newDoc.name}`,
        time: 'Just now',
        docAttachment: newDoc,
      },
      {
        id: `msg-${Date.now() + 1}`,
        sender: 'doctor',
        text: `Got your document: ${newDoc.name}. Looks clear!`,
        time: 'Just now',
      },
    ]);

    showAlert('Document Attached', `${newDoc.name} has been shared with ${doctor.name}.`);
  };

  // Send message in chat
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: messageInput.trim(),
      time: 'Just now',
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setMessageInput('');

    // Doctor auto response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 10}`,
          sender: 'doctor',
          text: 'Understood. I am adding this to your medical advice notes.',
          time: 'Just now',
        },
      ]);
    }, 1200);
  };

  // Handle Order Prescribed Medicines
  const handleOrderPrescription = () => {
    try {
      const rxItems = [
        {
          id: '1',
          name: 'Paracetamol 650mg Tablets',
          brand: 'Unnathi TeleHealth',
          price: 32,
          category: 'Medicines',
          requiresPrescription: true,
        },
        {
          id: '8',
          name: 'Vitamin C & Zinc Chewable',
          brand: 'Unnathi Care',
          price: 110,
          category: 'Wellness',
          requiresPrescription: false,
        },
      ];

      rxItems.forEach((item) => {
        addToCart(item, 1);
      });

      showAlert(
        'Medicines Added to Cart',
        `Prescription from ${doctor.name} has been added to your cart.\n\n• Paracetamol 650mg Tablets (₹32)\n• Vitamin C & Zinc Chewable (₹110)\n\nTotal: ₹142`,
        [
          {
            text: 'Go to Cart & Checkout',
            onPress: () => navigation.navigate('Cart'),
          },
          {
            text: 'View Prescriptions',
            onPress: () => navigation.navigate('Prescriptions'),
          },
          {
            text: 'Pharmacy Store',
            onPress: () => navigation.navigate('Pharmacy'),
          },
        ]
      );
    } catch (e) {
      console.log('Error ordering prescription:', e);
      navigation.navigate('Prescriptions');
    }
  };

  // Handle Back to Appointments
  const handleBackToAppointments = () => {
    navigation.navigate('MyAppointments', { initialTab: 'Video Consults', timestamp: Date.now() });
  };

  // Handle Go to Home
  const handleBackToHome = () => {
    navigation.navigate('Home');
  };

  // End Call
  const handleEndCall = () => {
    showAlert(
      'End Video Consultation?',
      'Are you sure you want to end this tele-consultation session with the doctor?',
      [
        { text: 'Stay in Call', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            setIsUploadModalOpen(false);
            setIsChatOpen(false);
            setSelectedDocPreview(null);
            setIsCallEnded(true);

            // Save digital prescription generated during call
            try {
              const newRx = {
                id: `rx-live-${Math.floor(100 + Math.random() * 900)}`,
                doctorName: doctor.name,
                specialty: doctor.specialty,
                hospital: doctor.clinicName || 'MediUnify TeleHealth Network',
                date: 'Today',
                diagnosis: 'Acute Consultation & Follow-up Plan',
                validTill: '3 Months',
                status: 'Active',
                medicines: [
                  {
                    id: '1',
                    name: 'Paracetamol 650mg Tablets',
                    dosage: '1 tablet twice daily after meals',
                    duration: '5 days',
                    price: 32,
                  },
                  {
                    id: '8',
                    name: 'Vitamin C & Zinc Chewable',
                    dosage: '1 tablet once daily morning',
                    duration: '15 days',
                    price: 110,
                  },
                ],
                doctorAdvice: 'Drink plenty of fluids, rest adequately. Free follow-up chat available for 3 days.',
              };

              const existingRxJson = await AsyncStorage.getItem('@unnathi_prescriptions');
              const rxList = existingRxJson ? JSON.parse(existingRxJson) : [];
              await AsyncStorage.setItem('@unnathi_prescriptions', JSON.stringify([newRx, ...rxList]));
            } catch (e) {
              console.log('Error saving generated Rx:', e);
            }
          },
        },
      ]
    );
  };

  // ====================================================
  // IF CALL HAS ENDED: RENDER CALL SUMMARY & PRESCRIPTION SCREEN
  // ====================================================
  if (isCallEnded) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.summaryContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.summaryScroll}
        >
          <View style={styles.summaryTopCard}>
            <View style={styles.summarySuccessIcon}>
              <Ionicons name="checkmark-done" size={40} color="#FFFFFF" />
            </View>

            <Text style={styles.summaryHeading}>Consultation Completed!</Text>
            <Text style={styles.summarySubHeading}>
              Your video session with {doctor.name} has concluded successfully.
            </Text>

            <View style={styles.callStatsPill}>
              <Ionicons name="time" size={14} color="#0D9488" />
              <Text style={styles.callStatsPillText}>
                Duration: {formatTimer(callDuration)} • HD Quality
              </Text>
            </View>
          </View>

          {/* GENERATED PRESCRIPTION PREVIEW */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="document-text" size={20} color={colors.teal} />
              <Text style={styles.summaryCardTitle}>Doctor's Digital Prescription</Text>
            </View>

            <View style={styles.rxDocBlock}>
              <Text style={styles.rxDocName}>{doctor.name}</Text>
              <Text style={styles.rxDocSpec}>{doctor.specialty}</Text>
              <Text style={styles.rxDocDate}>Date: Today • ID: #RX-TELE-{Math.floor(1000 + Math.random() * 9000)}</Text>
            </View>

            <Text style={styles.rxSectionLabel}>Prescribed Medicines (2):</Text>
            <View style={styles.rxMedItem}>
              <Ionicons name="ellipse" size={7} color={colors.teal} style={{ marginTop: 5 }} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.rxMedName}>Paracetamol 650mg Tablets</Text>
                <Text style={styles.rxMedDosage}>1 tablet twice daily after meals • 5 Days</Text>
              </View>
            </View>

            <View style={styles.rxMedItem}>
              <Ionicons name="ellipse" size={7} color={colors.teal} style={{ marginTop: 5 }} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.rxMedName}>Vitamin C & Zinc Chewable</Text>
                <Text style={styles.rxMedDosage}>1 tablet daily in the morning • 15 Days</Text>
              </View>
            </View>

            <View style={styles.doctorAdviceBox}>
              <Text style={styles.doctorAdviceLabel}>Doctor Advice:</Text>
              <Text style={styles.doctorAdviceText}>
                "Drink warm water, take proper rest. Follow-up consultation is free for 3 days."
              </Text>
            </View>

            {/* ACTION: ORDER MEDICINES DIRECTLY WITH CART INTEGRATION */}
            <TouchableOpacity
              style={styles.orderMedsCtaBtn}
              activeOpacity={0.88}
              onPress={handleOrderPrescription}
            >
              <Ionicons name="cart" size={18} color="#FFFFFF" />
              <Text style={styles.orderMedsCtaText}>Order Prescribed Medicines (₹142)</Text>
            </TouchableOpacity>
          </View>

          {/* RETURN TO BOOKINGS BUTTON */}
          <TouchableOpacity
            style={styles.returnBookingsBtn}
            activeOpacity={0.88}
            onPress={handleBackToAppointments}
          >
            <Ionicons name="calendar-outline" size={17} color={colors.teal} />
            <Text style={styles.returnBookingsText}>Back to My Appointments</Text>
          </TouchableOpacity>

          {/* RETURN TO HOME BUTTON */}
          <TouchableOpacity
            style={styles.returnHomeBtn}
            activeOpacity={0.8}
            onPress={handleBackToHome}
          >
            <Text style={styles.returnHomeText}>Go to Home Screen</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ==================================================
          ACTIVE VIDEO STREAM VIEWPORT
      ================================================== */}
      <View style={styles.videoViewport}>
        {/* DOCTOR REMOTE STREAM */}
        <Image
          source={{ uri: doctor.image }}
          style={styles.doctorFullVideo}
          resizeMode="cover"
        />

        {/* DARK GRADIENT OVERLAYS */}
        <View style={styles.topGradient} />
        <View style={styles.bottomGradient} />

        {/* TOP STATUS BAR */}
        <View style={styles.callHeaderBar}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={handleEndCall}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.doctorHeaderInfo}>
            <View style={styles.liveIndicatorBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE HD • {formatTimer(callDuration)}</Text>
            </View>
            <Text style={styles.doctorHeaderName}>{doctor.name}</Text>
            <Text style={styles.doctorHeaderSpec}>{doctor.specialty}</Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.networkBadge}
              onPress={() => showAlert('Network Quality', 'Connection: Excellent (HD 1080p Encrypted)')}
            >
              <Ionicons name="wifi" size={14} color="#10B981" />
              <Text style={styles.networkText}>HD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PATIENT SELF PIP CAMERA PREVIEW */}
        <View style={styles.selfPipBox}>
          {isVideoOff ? (
            <View style={styles.videoOffPlaceholder}>
              <Ionicons name="videocam-off" size={20} color="#94A3B8" />
              <Text style={styles.videoOffText}>Camera Off</Text>
            </View>
          ) : (
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300',
              }}
              style={styles.selfPipImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.pipBadge}>
            <Text style={styles.pipText}>You ({patient.name?.split(' ')[0] || 'Patient'})</Text>
          </View>

          <TouchableOpacity
            style={styles.pipFlipBtn}
            onPress={() => setIsFrontCamera(!isFrontCamera)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* SHARED DOCUMENTS FLOATING CHIPS BAR */}
        {uploadedDocuments.length > 0 && (
          <View style={styles.sharedDocsFloatingBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <View style={styles.sharedDocsTag}>
                <Ionicons name="document-text" size={13} color="#FFFFFF" />
                <Text style={styles.sharedDocsTagText}>Shared ({uploadedDocuments.length}):</Text>
              </View>

              {uploadedDocuments.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.sharedDocChip}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDocPreview(doc)}
                >
                  <Ionicons name="attach" size={13} color="#0D9488" />
                  <Text style={styles.sharedDocChipText} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Ionicons name="eye-outline" size={12} color="#0D9488" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* PRIMARY IN-CALL FLOATING CONTROL BAR */}
        <View style={styles.controlsFloatingBar}>
          {/* 1. MUTE / UNMUTE MIC */}
          <TouchableOpacity
            style={[styles.controlBtn, isMicMuted && styles.controlBtnActive]}
            onPress={() => setIsMicMuted(!isMicMuted)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isMicMuted ? 'mic-off' : 'mic'}
              size={22}
              color={isMicMuted ? '#FFFFFF' : '#0F172A'}
            />
            <Text style={[styles.controlBtnLabel, isMicMuted && styles.controlBtnLabelActive]}>
              {isMicMuted ? 'Muted' : 'Mute'}
            </Text>
          </TouchableOpacity>

          {/* 2. CAMERA TOGGLE */}
          <TouchableOpacity
            style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
            onPress={() => setIsVideoOff(!isVideoOff)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isVideoOff ? 'videocam-off' : 'videocam'}
              size={22}
              color={isVideoOff ? '#FFFFFF' : '#0F172A'}
            />
            <Text style={[styles.controlBtnLabel, isVideoOff && styles.controlBtnLabelActive]}>
              {isVideoOff ? 'Cam Off' : 'Camera'}
            </Text>
          </TouchableOpacity>

          {/* 3. UPLOAD DOC / PIC (KEY USER FEATURE) */}
          <TouchableOpacity
            style={[styles.controlBtn, styles.uploadControlBtn]}
            onPress={() => setIsUploadModalOpen(true)}
            activeOpacity={0.85}
          >
            <View style={styles.uploadBadgeDot} />
            <Ionicons name="cloud-upload" size={22} color="#FFFFFF" />
            <Text style={[styles.controlBtnLabel, { color: '#FFFFFF', fontWeight: '900' }]}>
              Upload Pic/Doc
            </Text>
          </TouchableOpacity>

          {/* 4. CHAT / NOTES */}
          <TouchableOpacity
            style={[styles.controlBtn, isChatOpen && styles.controlBtnSelected]}
            onPress={() => setIsChatOpen(true)}
            activeOpacity={0.85}
          >
            <View style={styles.chatBadgeDot}>
              <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
            </View>
            <Ionicons name="chatbubbles" size={22} color={colors.teal} />
            <Text style={styles.controlBtnLabel}>Chat ({chatMessages.length})</Text>
          </TouchableOpacity>

          {/* 5. END CALL */}
          <TouchableOpacity
            style={styles.endCallBtn}
            onPress={handleEndCall}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={24} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text style={styles.endCallBtnText}>End Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================================================
          MODAL 1: UPLOAD DOC OR PIC DURING VIDEO CALL
      ================================================== */}
      <Modal
        visible={isUploadModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsUploadModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <View style={styles.uploadModalBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#0D9488" />
                  <Text style={styles.uploadModalBadgeText}>LIVE TELECONSULT VAULT</Text>
                </View>
                <Text style={styles.modalTitle}>Share Document or Photo with Doctor</Text>
                <Text style={styles.modalSub}>
                  Upload medical reports, prescriptions, or capture a live symptom photo
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsUploadModalOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            {isUploading ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator size="large" color={colors.teal} />
                <Text style={styles.uploadingText}>Transmitting file securely to Doctor...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* OPTION 1: CAPTURE PHOTO */}
                <TouchableOpacity
                  style={styles.uploadOptionCard}
                  activeOpacity={0.85}
                  onPress={handleCapturePhoto}
                >
                  <View style={[styles.uploadOptionIcon, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="camera" size={24} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.uploadOptionTitle}>Take Live Camera Photo</Text>
                    <Text style={styles.uploadOptionSub}>
                      Capture a high-res photo of skin rash, wound, eye, or physical slip
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                {/* OPTION 2: GALLERY / FILE PICKER */}
                <TouchableOpacity
                  style={styles.uploadOptionCard}
                  activeOpacity={0.85}
                  onPress={handlePickFromGallery}
                >
                  <View style={[styles.uploadOptionIcon, { backgroundColor: '#F0FDFA' }]}>
                    <Ionicons name="images" size={24} color={colors.teal} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.uploadOptionTitle}>Upload from Gallery / Files</Text>
                    <Text style={styles.uploadOptionSub}>
                      Select PDF reports, blood tests, or previous doctor documents
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                {/* OPTION 3: ATTACH FROM MEDIUNIFY VAULT */}
                <TouchableOpacity
                  style={styles.uploadOptionCard}
                  activeOpacity={0.85}
                  onPress={() => handleSelectSampleDoc('lab')}
                >
                  <View style={[styles.uploadOptionIcon, { backgroundColor: '#E0F7FA' }]}>
                    <Ionicons name="flask" size={24} color="#00C2CB" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.uploadOptionTitle}>Attach Blood Test / Lab Report</Text>
                    <Text style={styles.uploadOptionSub}>
                      Instantly sync CBC, HbA1c, Thyroid or Lipid report from records
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadOptionCard}
                  activeOpacity={0.85}
                  onPress={() => handleSelectSampleDoc('rx')}
                >
                  <View style={[styles.uploadOptionIcon, { backgroundColor: '#E0F7FA' }]}>
                    <Ionicons name="medkit" size={24} color="#00B894" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.uploadOptionTitle}>Attach Previous Prescription</Text>
                    <Text style={styles.uploadOptionSub}>
                      Share earlier medications and dosage instructions with doctor
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================================================
          MODAL 2: DOCUMENT PREVIEW MODAL
      ================================================== */}
      <Modal
        visible={!!selectedDocPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDocPreview(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {selectedDocPreview?.name}
                </Text>
                <Text style={styles.previewSub}>
                  {selectedDocPreview?.type} • Shared with {doctor.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={() => setSelectedDocPreview(null)}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {selectedDocPreview?.uri && (
              <Image
                source={{ uri: selectedDocPreview.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.previewFooter}>
              <View style={styles.previewVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                <Text style={styles.previewVerifiedText}>Doctor Received & Verified</Text>
              </View>
              <TouchableOpacity
                style={styles.previewDoneBtn}
                onPress={() => setSelectedDocPreview(null)}
              >
                <Text style={styles.previewDoneText}>Back to Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          MODAL 3: IN-CALL CHAT & MESSAGES DRAWER
      ================================================== */}
      <Modal
        visible={isChatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsChatOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={{ uri: doctor.image }} style={styles.chatAvatar} />
                <View>
                  <Text style={styles.modalTitle}>{doctor.name}</Text>
                  <Text style={styles.modalSub}>Live In-Call Doctor Chat & Advice</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsChatOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            {/* CHAT MESSAGES LIST */}
            <ScrollView
              style={styles.chatScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 10 }}
            >
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubbleWrap,
                      isUser ? styles.chatBubbleUserWrap : styles.chatBubbleDocWrap,
                    ]}
                  >
                    <View
                      style={[
                        styles.chatBubble,
                        isUser ? styles.chatBubbleUser : styles.chatBubbleDoc,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatBubbleText,
                          isUser ? styles.chatBubbleUserText : styles.chatBubbleDocText,
                        ]}
                      >
                        {msg.text}
                      </Text>
                      {msg.docAttachment && (
                        <TouchableOpacity
                          style={styles.chatAttachmentCard}
                          onPress={() => setSelectedDocPreview(msg.docAttachment)}
                        >
                          <Ionicons name="document-attach" size={16} color="#0D9488" />
                          <Text style={styles.chatAttachmentName} numberOfLines={1}>
                            {msg.docAttachment.name}
                          </Text>
                          <Text style={styles.chatAttachmentView}>View ›</Text>
                        </TouchableOpacity>
                      )}
                      <Text
                        style={[
                          styles.chatTimeText,
                          isUser ? { color: '#CCFBF1' } : { color: '#94A3B8' },
                        ]}
                      >
                        {msg.time}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* CHAT INPUT ROW */}
            <View style={styles.chatInputRow}>
              <TouchableOpacity
                style={styles.chatUploadSmallBtn}
                onPress={() => {
                  setIsChatOpen(false);
                  setIsUploadModalOpen(true);
                }}
              >
                <Ionicons name="attach" size={20} color={colors.teal} />
              </TouchableOpacity>

              <TextInput
                style={styles.chatTextInput}
                placeholder="Type a message or question to doctor..."
                placeholderTextColor="#94A3B8"
                value={messageInput}
                onChangeText={setMessageInput}
              />

              <TouchableOpacity
                style={styles.chatSendBtn}
                onPress={handleSendMessage}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default VideoMeetingScreen;

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },

  // VIEWPORT
  videoViewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0B1120',
    justifyContent: 'space-between',
  },
  doctorFullVideo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },

  // TOP HEADER BAR
  callHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
    zIndex: 10,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorHeaderInfo: {
    alignItems: 'center',
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2DD4BF',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  liveText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#CCFBF1',
    letterSpacing: 0.5,
  },
  doctorHeaderName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  doctorHeaderSpec: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  networkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },

  // SELF PIP WINDOW
  selfPipBox: {
    position: 'absolute',
    top: 110,
    right: 16,
    width: 105,
    height: 145,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38BDF8',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 15,
  },
  selfPipImage: {
    width: '100%',
    height: '100%',
  },
  videoOffPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  videoOffText: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '700',
  },
  pipBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pipText: {
    fontSize: 8.5,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pipFlipBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SHARED DOCS FLOATING BAR
  sharedDocsFloatingBar: {
    position: 'absolute',
    bottom: 115,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    zIndex: 12,
  },
  sharedDocsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sharedDocsTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CCFBF1',
  },
  sharedDocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    maxWidth: 150,
  },
  sharedDocChipText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F766E',
    maxWidth: 90,
  },

  // CONTROLS FLOATING BAR
  controlsFloatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'android' ? 18 : 24,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 20,
    elevation: 10,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  controlBtnActive: {
    backgroundColor: '#FF7F50',
  },
  controlBtnSelected: {
    backgroundColor: '#CCFBF1',
  },
  controlBtnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
    marginTop: 2,
  },
  controlBtnLabelActive: {
    color: '#FFFFFF',
  },
  uploadControlBtn: {
    backgroundColor: colors.teal,
    width: 74,
    borderWidth: 1.5,
    borderColor: '#5EEAD4',
  },
  uploadBadgeDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C2CB',
  },
  chatBadgeDot: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: '#FF7F50',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  chatBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  endCallBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FF7F50',
  },
  endCallBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // MODAL OVERLAYS & CARDS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  uploadModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  uploadModalBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.secondary,
  },
  modalSub: {
    fontSize: 11,
    color: colors.slate,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  uploadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal,
  },
  uploadOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.secondary,
  },
  uploadOptionSub: {
    fontSize: 11,
    color: colors.slate,
    marginTop: 2,
  },

  // PREVIEW MODAL
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    padding: 16,
  },
  previewContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  previewCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 340,
    backgroundColor: '#0F172A',
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  previewVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewVerifiedText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#10B981',
  },
  previewDoneBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  previewDoneText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // CHAT MODAL
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  chatScroll: {
    flex: 1,
  },
  chatBubbleWrap: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  chatBubbleUserWrap: {
    justifyContent: 'flex-end',
  },
  chatBubbleDocWrap: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
  },
  chatBubbleUser: {
    backgroundColor: colors.teal,
    borderBottomRightRadius: 4,
  },
  chatBubbleDoc: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatBubbleUserText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chatBubbleDocText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  chatTimeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 6,
    gap: 6,
  },
  chatAttachmentName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    flex: 1,
  },
  chatAttachmentView: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  chatUploadSmallBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTextInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SUMMARY SCREEN (CALL ENDED)
  summaryContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  summaryScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryTopCard: {
    backgroundColor: colors.teal,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  summarySuccessIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  summarySubHeading: {
    fontSize: 12,
    color: '#CCFBF1',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  callStatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
    gap: 6,
  },
  callStatsPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.teal,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.secondary,
  },
  rxDocBlock: {
    backgroundColor: '#F0FDFA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  rxDocName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
  },
  rxDocSpec: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: '700',
    marginTop: 2,
  },
  rxDocDate: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 4,
  },
  rxSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 8,
  },
  rxMedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  rxMedName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.secondary,
  },
  rxMedDosage: {
    fontSize: 11,
    color: colors.slate,
    marginTop: 2,
  },
  doctorAdviceBox: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 6,
    marginBottom: 14,
  },
  doctorAdviceLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1E3A8A',
    textTransform: 'uppercase',
  },
  doctorAdviceText: {
    fontSize: 11.5,
    color: '#334155',
    marginTop: 2,
    fontStyle: 'italic',
  },
  orderMedsCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  orderMedsCtaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  returnBookingsBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.teal,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  returnBookingsText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.teal,
  },
  returnHomeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  returnHomeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.slate,
  },
});
