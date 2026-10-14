import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Linking,
  Platform,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../../utils/alert';
import WebFooter from '../../../components/web/WebFooter';
import { surgerySpecialties, surgeryHospitals } from '../../../data/surgeryHospitalsData';
import { useAuthGuard } from '../../../context/AuthGuardContext';
import { useTheme } from '../../../context/ThemeContext';

const SURGERY_LIST = [
  'General Surgery Consultation',
  'Cataract Surgery',
  'Gallbladder Stone Removal (Laparoscopic)',
  'Hernia Repair (Mesh / Laparoscopic)',
  'Knee Replacement (Robotic / Total)',
  'Kidney Stone Removal (Laser RIRS/PCNL)',
  'Appendectomy (Laser / Laparoscopic)',
  'Piles, Fissure & Fistula (Laser)',
  'Lasik Eye Laser Surgery',
  'ACL & Meniscus Reconstruction',
  'Gynecological Laparoscopic Care',
  'Bariatric & Weight Loss Surgery',
  'ENT & Sinus (FESS) Surgery',
];

const CITY_LIST = [
  'Mysuru',
  'Bengaluru',
  'Hassan',
  'Mangaluru',
  'Bangalore',
  'Mysore',
  'Hyderabad',
  'Chennai',
  'Mumbai',
  'Delhi NCR',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Mangalore',
];

const SurgeryScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 992;
  const isTablet = width >= 600 && width < 992;
  const { requireLogin } = useAuthGuard();
  const { t } = useTheme();

  // Form State
  const [selectedSurgery, setSelectedSurgery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Dropdown Modals
  const [surgeryModalVisible, setSurgeryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'quotes'
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [searchProcedure, setSearchProcedure] = useState('');
  const [surgeryRequests, setSurgeryRequests] = useState([]);


  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedCity = await AsyncStorage.getItem('@mediunify_selected_city');
        const storedLoc = await AsyncStorage.getItem('@unnathi_user_location');
        const activeCity = storedCity || (storedLoc ? storedLoc.split(',')[0].trim() : 'Mysuru');
        if (activeCity) {
          const match = CITY_LIST.find((c) => c.toLowerCase().includes(activeCity.toLowerCase())) || activeCity;
          setSelectedCity(match);
        }

        const storedName = await AsyncStorage.getItem('userName');
        const storedPhone = await AsyncStorage.getItem('userPhone');
        if (storedName) setName(storedName);
        if (storedPhone) setMobileNumber(storedPhone);

        const savedQuotes = await AsyncStorage.getItem('@unnathi_surgery_requests');
        if (savedQuotes) {
          try {
            setSurgeryRequests(JSON.parse(savedQuotes));
          } catch (e) {}
        }
      } catch (e) {}
    };
    loadStoredUser();
  }, []);

  const handleBookAppointment = () => {
    requireLogin(() => _doBookAppointment());
  };

  const _doBookAppointment = async () => {

    if (!name.trim()) {
      showAlert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      showAlert('Valid Mobile Required', 'Please enter a valid 10-digit mobile number to receive your callback.');
      return;
    }

    setLoading(true);
    try {
      const consultationLead = {
        surgery: selectedSurgery || 'General Surgery Consultation',
        city: selectedCity,
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@unnathi_surgery_lead', JSON.stringify(consultationLead));
      setLoading(false);
      setBookingSuccess(true);
      showAlert(
        'Consultation Booked',
        `Thank you ${name.trim()}! Your request for ${selectedSurgery || 'Surgery Consultation'} in ${selectedCity} has been received. Our dedicated Care Coordinator will call ${mobileNumber.trim()} within 15 minutes.`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (e) {
      setLoading(false);
      showAlert('Booking Received', 'Thank you! Our surgery specialist will call you shortly.');
    }
  };

  const handleCall = () => {
    Linking.openURL('tel:+918045685554').catch(() => {
      showAlert('Helpline', 'Please dial +91-8045685554 to reach our Surgery Desk.');
    });
  };

  
  // Flatten surgeries with their parent hospital info
  const allProceduresWithHospitals = useMemo(() => {
    const list = [];
    surgeryHospitals.forEach((hosp) => {
      if (Array.isArray(hosp.availableSurgeries)) {
        hosp.availableSurgeries.forEach((surg) => {
          list.push({
            ...surg,
            hospital: hosp,
          });
        });
      }
    });
    return list;
  }, []);

  // Filter hospitals strictly based on Home Screen selected city
  const cityHospitals = useMemo(() => {
    const cityClean = (selectedCity || 'Mysuru').toLowerCase();
    const isBlr = cityClean.includes('bangalore') || cityClean.includes('bengaluru');
    const isMys = cityClean.includes('mysore') || cityClean.includes('mysuru');
    const isHas = cityClean.includes('hassan');

    return (surgeryHospitals || []).filter((h) => {
      if (!h) return false;
      const hCity = (h.city || '').toLowerCase();
      const hArea = (h.area || '').toLowerCase();
      const hAddr = (h.address || '').toLowerCase();
      if (isBlr) {
        return hCity.includes('bangalore') || hCity.includes('bengaluru') || hArea.includes('bangalore') || hAddr.includes('bangalore') || hArea.includes('whitefield') || hArea.includes('bannerghatta');
      }
      if (isMys) {
        return hCity.includes('mysore') || hCity.includes('mysuru') || hArea.includes('mysore') || hAddr.includes('mysore') || hArea.includes('kuvempunagar') || hArea.includes('bannimantap');
      }
      if (isHas) {
        return hCity.includes('hassan') || hArea.includes('hassan') || hAddr.includes('hassan') || hAddr.includes('573');
      }
      return hCity.includes(cityClean) || hArea.includes(cityClean) || hAddr.includes(cityClean);
    });
  }, [selectedCity]);

  // Filter surgeries based on specialty, search query, and selected city
  const filteredProcedures = useMemo(() => {
    const cityHospitalIds = new Set((cityHospitals || []).map((h) => h?.id));

    return (allProceduresWithHospitals || []).filter((item) => {
      if (!item) return false;
      // Must be from an accredited hospital in the selected city if city hospitals exist
      if (cityHospitalIds.size > 0 && item.hospital && !cityHospitalIds.has(item.hospital.id)) {
        return false;
      }
      if (selectedSpecialty !== 'all' && item.specialty !== selectedSpecialty) {
        return false;
      }
      if (searchProcedure.trim()) {
        const q = searchProcedure.toLowerCase().trim();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesTech = (item.technique || '').toLowerCase().includes(q);
        const matchesCat = (item.categoryLabel || '').toLowerCase().includes(q);
        const matchesHosp = (item.hospital?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTech && !matchesCat && !matchesHosp) return false;
      }
      return true;
    });
  }, [allProceduresWithHospitals, cityHospitals, selectedSpecialty, searchProcedure]);

  const handleWhatsApp = () => {
    const text = encodeURIComponent('Hi, I would like to consult with a surgery specialist on MediUnify.');
    Linking.openURL(`https://wa.me/917353101441?text=${text}`).catch(() => {
      showAlert('WhatsApp', 'Please message +91-7353101441 on WhatsApp.');
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER BAR */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => {
            if (activeTab === 'quotes') {
              setActiveTab('explore');
            } else if (navigation?.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation?.navigate('Home');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
            {t('Surgery')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <TouchableOpacity
              style={styles.cityLocationPill}
              onPress={() => setCityModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="location-sharp" size={11} color="#007D69" />
              <Text style={styles.cityLocationText}>{selectedCity || 'Bangalore'}</Text>
              <Ionicons name="chevron-down" size={10} color="#007D69" />
            </TouchableOpacity>
            {isDesktopWeb && (
              <View style={styles.liveVerifiedPill}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveVerifiedPillText}>{t('24/7 Verified Care')}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.helplineBtn}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={12} color="#0D9488" />
          <Text style={styles.helplineBtnText}>1800-425-0099</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainBody, isDesktopWeb && styles.desktopContainer]}>
          {activeTab === 'explore' ? (
            <View>
              {/* Hero Banner Card */}
              <View style={[styles.heroBannerCard, !isDesktopWeb && styles.heroBannerCardMobile]}>
                <Text style={styles.heroHeadline}>
                  {t('Surgical Care')}, <Text style={styles.heroHeadlineAccent}>{t('Near You')}</Text>
                </Text>

                {/* Trust Badges */}
                <View style={styles.heroValuePropsRow}>
                  <View style={[styles.heroValueItem, !isDesktopWeb && styles.heroValueItemMobile]}>
                    <Ionicons name="shield-checkmark" size={12} color="#0D9488" />
                    <Text style={styles.heroValueText}>{t('NABH Accredited')}</Text>
                  </View>
                  <View style={[styles.heroValueItem, !isDesktopWeb && styles.heroValueItemMobile]}>
                    <Ionicons name="pricetag-outline" size={11} color="#0D9488" />
                    <Text style={styles.heroValueText}>{t('Fixed Prices')}</Text>
                  </View>
                  <View style={[styles.heroValueItem, !isDesktopWeb && styles.heroValueItemMobile]}>
                    <Ionicons name="checkmark-circle" size={12} color="#0D9488" />
                    <Text style={styles.heroValueText}>{t('Cashless Insurance')}</Text>
                  </View>
                </View>

                {/* Quick Consultation Form */}
                <View style={[styles.quickFormCard, !isDesktopWeb && styles.quickFormCardMobile]}>
                  <Text style={styles.quickFormTitle}>{t('Book a Free Callback')}</Text>
                  <Text style={styles.quickFormSubtitle}>
                    {t('Free hospital guidance & price estimate.')}
                  </Text>

                  {/* Form Fields Grid with Clean Gaps */}
                  <View style={[styles.formFieldsGrid, isDesktopWeb && styles.formFieldsGridDesktop]}>
                    {/* Surgery Selector */}
                    <View style={[styles.formFieldItem, isDesktopWeb && styles.formFieldItemHalf]}>
                      <TouchableOpacity
                        style={styles.dropdownField}
                        onPress={() => setSurgeryModalVisible(true)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                          <Ionicons name="medkit-outline" size={17} color="#00B894" />
                          <Text
                            style={[
                              styles.dropdownFieldText,
                              !selectedSurgery && styles.placeholderText,
                            ]}
                            numberOfLines={1}
                          >
                            {selectedSurgery ? t(selectedSurgery) : t('Select Procedure')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    {/* City Selector */}
                    <View style={[styles.formFieldItem, isDesktopWeb && styles.formFieldItemHalf]}>
                      <TouchableOpacity
                        style={styles.dropdownField}
                        onPress={() => setCityModalVisible(true)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                          <Ionicons name="location-outline" size={17} color="#00B894" />
                          <Text style={styles.dropdownFieldText} numberOfLines={1}>
                            {selectedCity ? `${t('City')}: ${selectedCity}` : t('Select City')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    {/* Full Name */}
                    <View style={[styles.formFieldItem, isDesktopWeb && styles.formFieldItemHalf]}>
                      <View style={styles.quickInputField}>
                        <Ionicons name="person-outline" size={16} color="#00B894" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.quickTextInput}
                          placeholder={t('Patient Name')}
                          placeholderTextColor="#94A3B8"
                          value={name}
                          onChangeText={setName}
                        />
                      </View>
                    </View>

                    {/* Mobile Number */}
                    <View style={[styles.formFieldItem, isDesktopWeb && styles.formFieldItemHalf]}>
                      <View style={styles.quickInputField}>
                        <Ionicons name="call-outline" size={16} color="#00B894" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.quickTextInput}
                          placeholder={t('Mobile Number')}
                          placeholderTextColor="#94A3B8"
                          value={mobileNumber}
                          onChangeText={setMobileNumber}
                          keyboardType="phone-pad"
                          maxLength={15}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Submit Quick Request */}
                  <TouchableOpacity
                    style={styles.quickSubmitBtn}
                    onPress={handleBookAppointment}
                    activeOpacity={0.9}
                    disabled={loading}
                  >
                    <Text style={styles.quickSubmitBtnText}>
                      {loading ? t('Submitting...') : t('Get Free Callback')}
                    </Text>
                  </TouchableOpacity>

                  {/* Direct Assistance Desk */}
                  <View style={styles.quickContactRow}>
                    <TouchableOpacity style={styles.quickContactBtn} onPress={handleCall} activeOpacity={0.8}>
                      <Ionicons name="call" size={13} color="#0D9488" />
                      <Text style={styles.quickContactBtnText}>{t('Call Helpline')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickContactBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
                      <Ionicons name="logo-whatsapp" size={13} color="#16A34A" />
                      <Text style={[styles.quickContactBtnText, { color: '#16A34A' }]}>{t('WhatsApp')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Trust & Stats Strip */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>2L+</Text>
                  <Text style={styles.statLabel}>{t('Surgeries')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>4.9★</Text>
                  <Text style={styles.statLabel}>{t('Rating')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>1,000+</Text>
                  <Text style={styles.statLabel}>{t('Hospitals')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>15 min</Text>
                  <Text style={styles.statLabel}>{t('Callback')}</Text>
                </View>
              </View>
            </View>
          ) : (
            /* MY SURGERY QUOTES & REQUESTS VIEW */
            <View style={styles.quotesSectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                  onPress={() => setActiveTab('explore')}
                >
                  <Ionicons name="arrow-back" size={18} color="#0D9488" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0D9488', marginLeft: 4 }}>
                    {t('Back to Surgeries')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.sectionMainTitle}>{t('My Quotes')}</Text>
                <Text style={styles.sectionSubtitle}>
                  {t('Your surgery cost estimates')}
                </Text>
              </View>

              {surgeryRequests.length === 0 ? (
                <View style={styles.emptyQuotesCard}>
                  <Ionicons name="clipboard-outline" size={44} color="#94A3B8" />
                  <Text style={styles.emptyQuotesTitle}>{t('No Quotes Yet')}</Text>
                  <Text style={styles.emptyQuotesSubtitle}>
                    {t('Request a free price estimate anytime.')}
                  </Text>
                  <TouchableOpacity
                    style={styles.exploreNowBtn}
                    onPress={() => setActiveTab('explore')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.exploreNowBtnText}>{t('Explore Surgeries')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.quotesList}>
                  {(surgeryRequests || []).map((req) => (
                    <View key={req.id} style={styles.quoteItemCard}>
                      <View style={styles.quoteItemHeader}>
                        <View style={styles.quoteIdPill}>
                          <Text style={styles.quoteIdText}>{req.id}</Text>
                        </View>
                        <View style={styles.quoteStatusPill}>
                          <Text style={styles.quoteStatusText}>{t(req.status || 'Under Review')}</Text>
                        </View>
                      </View>

                      <Text style={styles.quoteSurgeryName}>{req.surgeryName || req.type}</Text>
                      <Text style={styles.quoteHospitalName}>🏥 {req.hospitalName || 'Network Hospital'}</Text>

                      <View style={styles.quoteDetailsRow}>
                        <Text style={styles.quoteDetailText}>
                          👤 {t('Patient')}: <Text style={{ fontWeight: '700' }}>{req.patientName}</Text>
                        </Text>
                        <Text style={styles.quoteDetailText}>
                          📅 {t('Date')}: <Text style={{ fontWeight: '700' }}>{req.preferredDate ? t(req.preferredDate) : t('Flexible')}</Text>
                        </Text>
                      </View>

                      <View style={styles.quoteEstimateBox}>
                        <Text style={styles.quoteEstimateLabel}>{t('Estimated Cost')}</Text>
                        <Text style={styles.quoteEstimateVal}>{t(req.indicativeEstimate || 'Pending Review')}</Text>
                      </View>

                      <View style={styles.quoteActionsRow}>
                        <TouchableOpacity
                          style={styles.quoteCallBtn}
                          onPress={handleCall}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={13} color="#1E3A8A" />
                          <Text style={styles.quoteCallBtnText}>{t('Call Care Coordinator')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.quoteWhatsAppBtn}
                          onPress={handleWhatsApp}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={13} color="#16A34A" />
                          <Text style={styles.quoteWhatsAppBtnText}>{t('WhatsApp')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* WEB FOOTER */}
        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>

      {/* ============================================================
          SURGERY SELECTION MODAL
      ============================================================ */}
      <Modal
        visible={surgeryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSurgeryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSurgeryModalVisible(false)}
        >
          <View style={styles.modalContentCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select Surgery Procedure')}</Text>
              <TouchableOpacity onPress={() => setSurgeryModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={true}>
              {SURGERY_LIST.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.modalListItem,
                    selectedSurgery === item && styles.modalListItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedSurgery(item);
                    setSurgeryModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalListItemText,
                      selectedSurgery === item && styles.modalListItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedSurgery === item && (
                    <Ionicons name="checkmark-circle" size={18} color="#1E3A8A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          CITY SELECTION MODAL
      ============================================================ */}
      <Modal
        visible={cityModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCityModalVisible(false)}
        >
          <View style={styles.modalContentCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Select City')}</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={true}>
              {CITY_LIST.map((city, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.modalListItem,
                    selectedCity === city && styles.modalListItemSelected,
                  ]}
                  onPress={async () => {
                    setSelectedCity(city);
                    setCityModalVisible(false);
                    try {
                      await AsyncStorage.setItem('@mediunify_selected_city', city);
                      await AsyncStorage.setItem('@unnathi_user_location', city);
                    } catch (e) {}
                  }}
                >
                  <Text
                    style={[
                      styles.modalListItemText,
                      selectedCity === city && styles.modalListItemTextSelected,
                    ]}
                  >
                    {city}
                  </Text>
                  {selectedCity === city && (
                    <Ionicons name="checkmark-circle" size={18} color="#1E3A8A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  cityLocationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007D69',
  },
  liveVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveVerifiedPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
  },
  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 4,
  },
  helplineBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },

  // HERO BANNER CARD - Modern Healthcare Light Banner
  heroBannerCard: {
    backgroundColor: '#E6F8F5',
    backgroundImage: Platform.OS === 'web' ? 'linear-gradient(180deg, #E6F8F5 0%, #F0FDFA 100%)' : undefined,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heroBannerCardMobile: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    marginBottom: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  heroValueItemMobile: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  quickFormCardMobile: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  heroBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 5,
    marginBottom: 10,
  },
  heroBadgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0D9488',
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroHeadlineAccent: {
    color: '#0D9488',
  },
  heroSubheadline: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  heroValuePropsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  heroValueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  heroValueText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '700',
  },
  quickFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  quickFormTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  quickFormSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 17,
  },
  formFieldsGrid: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  formFieldsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  formFieldItem: {
    width: '100%',
  },
  formFieldItemHalf: {
    width: '48.8%',
  },
  quickInputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  quickTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    height: '100%',
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  quickSubmitBtn: {
    backgroundColor: '#007D69',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007D69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  quickSubmitBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  quickContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  heroActionsRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  heroPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  quickMatchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  quickMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quickMatchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickMatchSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  quickMatchChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    gap: 5,
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#5EEAD4',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00B894',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // HEADER CITY PILL
  headerCityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  headerCityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // SEGMENT TABS
  segmentTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  segmentTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTabTextActive: {
    fontWeight: '800',
    color: '#1E3A8A',
  },

  // CATALOG & PROCEDURES
  catalogSectionWrap: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  procedureSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginVertical: 10,
  },
  procedureSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  specialtiesScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    marginBottom: 12,
  },
  specialtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  specialtyPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  specialtyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  specialtyPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  proceduresGrid: {
    gap: 12,
  },
  procedureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  procedureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  procedureBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  procedureBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  procedureStayText: {
    fontSize: 12,
    color: '#64748B',
  },
  procedureName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  procedureTechnique: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 10,
  },
  procedureHospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  procedureHospitalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  procedureArea: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  procedureEstimateBox: {
    alignItems: 'flex-end',
  },
  procedureEstimateLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  procedureEstimateVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00B894',
  },
  procedureActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  procedureQuoteBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    borderRadius: 10,
  },
  procedureQuoteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  procedureHospDetailsBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
  },
  procedureHospDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // HOSPITALS SECTION
  hospitalsSectionWrap: {
    marginTop: 28,
  },
  hospitalsList: {
    gap: 12,
  },
  hospitalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hospitalCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  accreditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  accreditPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  hospitalTagline: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  hospitalAddress: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
  },
  hospitalRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hospitalRatingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  facilitiesRow: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  facilityText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  exploreHospSurgeriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreHospSurgeriesBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  // QUOTES SECTION
  quotesSectionWrap: {
    marginTop: 10,
  },
  emptyQuotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  emptyQuotesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyQuotesSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  exploreNowBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exploreNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quotesList: {
    gap: 12,
    marginTop: 12,
  },
  quoteItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quoteItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quoteIdPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quoteIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  quoteStatusPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quoteStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  quoteSurgeryName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  quoteHospitalName: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    marginBottom: 8,
  },
  quoteDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderColor: '#F8FAFC',
  },
  quoteDetailText: {
    fontSize: 12,
    color: '#475569',
  },
  quoteEstimateBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  quoteEstimateLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  quoteEstimateVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00B894',
    marginTop: 2,
  },
  quoteActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  quoteCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 8,
  },
  quoteCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  quoteWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    borderRadius: 8,
  },
  quoteWhatsAppBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#F4F7FC',
  },
  mainBody: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'web' ? 40 : (Platform.OS === 'ios' ? 120 : 110),
  },
  desktopContainer: {
    maxWidth: 1240,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // MOBILE HEADER
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  mobileHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },

  // DESKTOP BREADCRUMB
  desktopBreadcrumbWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  desktopBreadcrumbInner: {
    maxWidth: 1240,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: '#64748B',
  },
  breadcrumbActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },

  // LAYOUT
  layoutRow: {
    flexDirection: 'column',
    gap: 24,
  },
  layoutRowDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  leftColumn: {
    width: '100%',
    gap: 24,
  },
  leftColumnDesktop: {
    flex: 1.35,
  },
  rightColumn: {
    width: '100%',
    gap: 16,
  },
  rightColumnDesktop: {
    flex: 0.9,
    maxWidth: 420,
    position: Platform.OS === 'web' ? 'sticky' : 'relative',
    top: Platform.OS === 'web' ? 20 : 0,
  },

  // 1. HERO NETWORK BANNER CARD
  heroCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlowCircleTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 194, 203, 0.18)', // Aqua glow
    pointerEvents: 'none',
  },
  heroGlowCircleBottom: {
    position: 'absolute',
    bottom: -70,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0, 184, 148, 0.16)', // Teal glow
    pointerEvents: 'none',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    zIndex: 2,
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00C2CB', // Brand Aqua accent
    textAlign: 'center',
    marginBottom: 26,
    zIndex: 2,
  },

  // Doctor Graphic with surrounding badges
  doctorVisualSection: {
    width: '100%',
    maxWidth: 480,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  doctorCircleBackdrop: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#00C2CB', // Glowing Aqua ring
    shadowColor: '#00C2CB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  doctorImage: {
    width: 210,
    height: 230,
    marginTop: 10,
  },

  // 4 Badges
  floatingBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  badgeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeBoldText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    lineHeight: 16,
  },
  badgeSubText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 13,
  },

  badgeTopLeft: {
    top: 20,
    left: 10,
  },
  badgeTopRight: {
    top: 20,
    right: 10,
  },
  badgeBottomLeft: {
    bottom: 25,
    left: 15,
  },
  badgeBottomRight: {
    bottom: 25,
    right: 15,
  },

  // 2. WHY PRACTO ASSURED SECTION
  assuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  assuredSectionHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
  },
  assuredSubHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitItemCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 180 : '100%',
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#DCEEFF',
    borderRadius: 12,
    padding: 16,
  },
  benefitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  benefitScoreText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  benefitItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 18,
  },
  benefitItemDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },

  // Network 3-Column Strip
  networkStatsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#DCEEFF',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  networkStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  networkStatNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  networkStatLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  networkStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#CBD5E1',
  },

  // RIGHT COLUMN: FORM CARD
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  formBody: {
    gap: 14,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dropdownFieldText: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  submitBtn: {
    backgroundColor: '#1E293B',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  termsLink: {
    color: '#2563EB',
    fontWeight: '600',
  },

  // OR DIVIDER
  orDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    paddingHorizontal: 12,
  },

  // DIRECT CONTACT CARD
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  contactNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // MODALS
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalListItemSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  modalListItemText: {
    fontSize: 14,
    color: '#334155',
  },
  modalListItemTextSelected: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
});

export default SurgeryScreen;