import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateAddressMatchesCity } from '../../../utils/addressLocationValidator';
import { showAlert } from '../../../utils/alert';
import { isGuestUser, promptLoginRequired } from '../../../utils/authHelper';
import WebFooter from '../../../components/web/WebFooter';
import OptimizedImage from '../../../components/common/OptimizedImage';
import Pagination from '../../../components/common/Pagination';
import WebBackButton from '../../../components/web/WebBackButton';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import {
  equipmentCategories,
  equipmentCatalog,
  verifiedVendors,
  initialRentalRequests,
  EQUIPMENT_WORKFLOW_STEPS,
  getEquipmentStatusStageIndex,
} from '../../../data/equipmentRentalData';

const ASYNC_KEY_EQUIPMENT_REQUESTS = '@unnathi_equipment_rental_requests';
const ASYNC_KEY_NOTIFICATIONS = '@mediunify_user_notifications';

const REQUIRED_DATE_CHOICES = ['Today', 'Tomorrow', 'Within 2-3 Days', 'Specific Date'];
const DURATION_CHOICES = ['1 Week', '2 Weeks', '1 Month', '2 Months', '3 Months', 'Long-term'];

import EquipmentRentalScreenMobile from './EquipmentRentalScreen.js';

const EquipmentRentalScreen = ({ navigation, route, ...props }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;
  const isTablet = width >= 640 && width < 992;
  const isMobile = width < 640;

  // View States: 'HOME' | 'DETAILS' | 'REQUEST_FORM' | 'MY_RENTALS'
  const [currentView, setCurrentView] = useState('HOME');

  // Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Equipment
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // Request Form State
  const [formStep, setFormStep] = useState(1); // 1: Form, 2: Review, 3: Submitted
  const [quantity, setQuantity] = useState(1);
  const [requiredFromDate, setRequiredFromDate] = useState('Today');
  const [requiredUntilDuration, setRequiredUntilDuration] = useState('1 Month');
  const [customFromDate, setCustomFromDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Patient & Mobile
  const [patientName, setPatientName] = useState('Ramesh Kumar');
  const [patientMobile, setPatientMobile] = useState('+91 98450 12345');
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState('self');

  // Delivery Address Fields
  const [houseNo, setHouseNo] = useState('No. 44');
  const [streetArea, setStreetArea] = useState('2nd Cross, Saraswathipuram');
  const [pincode, setPincode] = useState('570009');
  const [addressErrors, setAddressErrors] = useState({});

  // Location Single Source of Truth
  const [selectedCity, setSelectedCity] = useState('Mysuru');
  const [addressValidationModalVisible, setAddressValidationModalVisible] = useState(false);
  const [addressValidationMsg, setAddressValidationMsg] = useState('');

  // Requests Data
  const [rentalRequests, setRentalRequests] = useState(initialRentalRequests);
  const [newlyCreatedRequest, setNewlyCreatedRequest] = useState(null);

  // My Rentals & Details Modals
  const [myRentalsTab, setMyRentalsTab] = useState('CURRENT'); // 'CURRENT' | 'PAST'
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [requestDetailModalVisible, setRequestDetailModalVisible] = useState(false);

  useEffect(() => {
    loadContextData();
    const unsub = navigation?.addListener?.('focus', () => {
      loadContextData();
    });
    return () => {
      if (unsub) unsub();
    };
  }, [navigation]);

  const loadContextData = async () => {
    try {
      const storedCity = await AsyncStorage.getItem('@mediunify_selected_city');
      const storedLoc = await AsyncStorage.getItem('@unnathi_user_location');
      const activeCity = storedCity || (storedLoc ? storedLoc.split(',')[0].trim() : 'Mysuru');
      if (activeCity) {
        setSelectedCity(activeCity);
      }

      const storedName = await AsyncStorage.getItem('userName');
      const storedPhone = await AsyncStorage.getItem('userPhone');
      if (storedName) setPatientName(storedName);
      if (storedPhone) setPatientMobile(storedPhone);

      const savedFam = await AsyncStorage.getItem('@unnathi_family_members');
      if (savedFam) {
        try {
          const parsed = JSON.parse(savedFam);
          if (Array.isArray(parsed)) setFamilyMembers(parsed);
        } catch (e) {}
      }

      const storedReqs = await AsyncStorage.getItem(ASYNC_KEY_EQUIPMENT_REQUESTS);
      if (storedReqs) {
        const parsed = JSON.parse(storedReqs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          initialRentalRequests.forEach((item) => {
            if (!merged.some((m) => m.id === item.id)) {
              merged.push(item);
            }
          });
          setRentalRequests(merged);
        }
      }
    } catch (e) {
      console.log('Error loading equipment data:', e);
    }
  };

  const saveRequests = async (updated) => {
    try {
      setRentalRequests(updated);
      await AsyncStorage.setItem(ASYNC_KEY_EQUIPMENT_REQUESTS, JSON.stringify(updated));
    } catch (e) {
      console.log('Error saving requests:', e);
    }
  };

  const pushInAppNotification = async (title, message) => {
    try {
      const stored = await AsyncStorage.getItem(ASYNC_KEY_NOTIFICATIONS);
      const notifs = stored ? JSON.parse(stored) : [];
      const newNotif = {
        id: `notif_${Date.now()}`,
        title,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB'),
        read: false,
        type: 'equipment_rental',
      };
      const updated = [newNotif, ...(Array.isArray(notifs) ? notifs : [])];
      await AsyncStorage.setItem(ASYNC_KEY_NOTIFICATIONS, JSON.stringify(updated));
    } catch (e) {
      console.log('Error saving notification:', e);
    }
  };

  const handleSelectPatient = (member) => {
    if (member === 'self') {
      setSelectedFamilyMemberId('self');
      setPatientName('Self');
      return;
    }
    setSelectedFamilyMemberId(member.id || member._id || member.name);
    setPatientName(member.name || member.displayName || '');
    if (member.phone) setPatientMobile(member.phone);
  };

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    return equipmentCatalog.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCategory = item.categoryLabel?.toLowerCase().includes(q);
        const matchDesc = item.shortDescription?.toLowerCase().includes(q);
        if (!matchName && !matchCategory && !matchDesc) return false;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Items per page based on device width to ensure complete rows (screen full of cards on tablet)
  const itemsPerPage = useMemo(() => {
    if (isDesktop) return 8; // Desktop: 2 rows x 4 cols = 8 cards
    if (isTablet) return 9;  // Tablet: 3 rows x 3 cols = 9 cards (screen full of cards)
    return 4;                // Mobile: 2 rows x 2 cols = 4 cards
  }, [isDesktop, isTablet]);

  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage) || 1;

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredEquipment.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredEquipment, currentPage, itemsPerPage]);

  // Partitioned Rentals
  const currentRentals = useMemo(() => {
    return rentalRequests.filter((r) => {
      return r.status !== 'Returned' && r.status !== 'Equipment Returned' && r.status !== 'Rental Completed' && r.status !== 'Equipment Unavailable';
    });
  }, [rentalRequests]);

  const pastRentals = useMemo(() => {
    return rentalRequests.filter((r) => {
      return r.status === 'Returned' || r.status === 'Equipment Returned' || r.status === 'Rental Completed' || r.status === 'Equipment Unavailable';
    });
  }, [rentalRequests]);

  // Request Flow Handlers
  const handleOpenDetails = (item) => {
    setSelectedEquipment(item);
    setCurrentView('DETAILS');
  };

  const handleStartRequest = (item) => {
    setSelectedEquipment(item);
    setFormStep(1);
    setQuantity(1);
    setRequiredFromDate('Today');
    setRequiredUntilDuration('1 Month');
    setAdditionalNotes('');
    setAddressErrors({});
    setCurrentView('REQUEST_FORM');
  };

  const handleProceedToReview = () => {
    const errors = {};
    if (!patientName.trim()) errors.name = 'Patient name is required';
    if (!patientMobile.trim() || patientMobile.trim().replace(/\D/g, '').length < 10) {
      errors.phone = 'Valid 10-digit mobile number required';
    }
    if (!houseNo.trim()) errors.houseNo = 'House / Flat number required';
    if (!streetArea.trim()) errors.streetArea = 'Street / Area required';
    if (!pincode.trim() || pincode.trim().length < 6) errors.pincode = 'Valid 6-digit pincode required';

    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      showAlert('Enter Delivery Address', 'Please fill in all required delivery address fields.');
      return;
    }

    // Validate address city against selected location
    const fullAddr = `${houseNo.trim()}, ${streetArea.trim()}, ${selectedCity}`;
    const validation = validateAddressMatchesCity(fullAddr, selectedCity, pincode.trim());
    if (!validation.isValid) {
      const err = `Equipment delivery is unavailable for this location. Please enter an address within ${selectedCity}.`;
      setAddressErrors({ address: err });
      setAddressValidationMsg(err);
      setAddressValidationModalVisible(true);
      return;
    }

    setAddressErrors({});
    setFormStep(2);
  };

  const handleSubmitRequest = async () => {
    if (!selectedEquipment) return;

    const isGuest = await isGuestUser();
    if (isGuest) {
      promptLoginRequired(navigation, { service: 'equipment' });
      return;
    }

    const fullAddr = `${houseNo.trim()}, ${streetArea.trim()}, ${selectedCity}`;
    const validation = validateAddressMatchesCity(fullAddr, selectedCity, pincode.trim());
    if (!validation.isValid) {
      setFormStep(1);
      const err = `Equipment delivery is unavailable for this location.`;
      setAddressErrors({ address: err });
      setAddressValidationMsg(err);
      setAddressValidationModalVisible(true);
      return;
    }

    const newId = `ER-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const effectiveFromDate = requiredFromDate === 'Specific Date' && customFromDate.trim()
      ? customFromDate.trim()
      : requiredFromDate;

    const newReq = {
      id: newId,
      requestDate: 'Today',
      equipmentId: selectedEquipment.id,
      equipmentName: selectedEquipment.name,
      equipmentImage: selectedEquipment.image,
      category: selectedEquipment.category,
      quantity,
      requiredFromDate: effectiveFromDate,
      requiredUntilDate: requiredUntilDuration,
      purpose: additionalNotes.trim() || 'Home Care & Recovery',
      patientName: patientName.trim(),
      contactNumber: patientMobile.trim(),
      deliveryAddress: {
        name: patientName.trim(),
        contactNumber: patientMobile.trim(),
        houseNo: houseNo.trim(),
        street: streetArea.trim(),
        city: selectedCity,
        pincode: pincode.trim(),
        address: `${houseNo.trim()}, ${streetArea.trim()}, ${selectedCity} - ${pincode.trim()}`,
      },
      status: 'Request Sent',
      statusStageIndex: 0,
      careTeamNote: "We'll check availability for you and confirm shortly.",
      timeline: [
        { stage: 'Request Sent', completed: true, timestamp: 'Just now' },
        { stage: 'Equipment Available', completed: false, timestamp: 'Checking stock' },
        { stage: 'Rental Confirmed', completed: false, timestamp: '' },
        { stage: 'Preparing', completed: false, timestamp: '' },
        { stage: 'Out for Delivery', completed: false, timestamp: '' },
        { stage: 'Delivered', completed: false, timestamp: '' },
        { stage: 'Return Pending', completed: false, timestamp: '' },
        { stage: 'Returned', completed: false, timestamp: '' },
      ],
    };

    const updated = [newReq, ...rentalRequests];
    await saveRequests(updated);
    await pushInAppNotification(
      `Equipment Request Sent (${newId})`,
      `Your request for ${selectedEquipment.name} has been sent. We'll check availability for you.`
    );

    setNewlyCreatedRequest(newReq);
    setFormStep(3);
  };

  const handleUserReturn = async (req) => {
    const updated = rentalRequests.map((r) => {
      if (r.id === req.id) {
        return {
          ...r,
          status: 'Return Pending',
          statusStageIndex: 6,
          careTeamNote: 'Return scheduled. Our team will collect the equipment.',
          timeline: r.timeline.map((st) => {
            if (st.stage === 'Return Pending') return { ...st, completed: true, timestamp: 'Just now' };
            return st;
          }),
        };
      }
      return r;
    });
    await saveRequests(updated);
    showAlert('Return Scheduled', 'Our team will contact you to collect the equipment.');
  };

  // Card width dynamic style for Web responsive grid
  const getCardWidthStyle = () => {
    if (isDesktop) return styles.cardWidthDesktop;
    if (isTablet) return styles.cardWidthTablet;
    return styles.cardWidthMobile;
  };

  // Render individual Equipment Card in the reference format
  const renderCardItem = (item) => {
    return (
      <View key={item.id} style={[styles.gridCard, getCardWidthStyle()]}>
        <OptimizedImage
          source={{ uri: item.image }}
          style={styles.gridCardImg}
          resizeMode="cover"
          fallbackIcon="fitness-outline"
        />
        <View style={styles.gridCardBody}>
          <Text style={styles.gridCardTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.gridCardDesc} numberOfLines={1}>
            {item.shortDescription}
          </Text>
          <Text style={styles.gridCardAvail}>
            {item.availabilityInfo || 'Available for request'}
          </Text>
          <TouchableOpacity
            style={styles.gridCardBtn}
            onPress={() => handleStartRequest(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.gridCardBtnText}>Request Equipment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==========================================================
  // VIEW: 1. HOME / BROWSE SCREEN
  // ==========================================================
  const renderHomeView = () => {
    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.desktopContainer}>
        {/* Clean Web Header */}
        <View style={styles.topHeaderBar}>
          <WebBackButton
            onPress={() => {
              if (navigation?.canGoBack()) navigation.goBack();
              else navigation?.navigate('Home');
            }}
          />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.screenHeaderTitle}>Equipment Rental</Text>
            <Text style={styles.screenHeaderSubtitle}>Medical equipment for your home care needs</Text>
          </View>

          <View style={styles.locationBadge}>
            <Ionicons name="location-sharp" size={14} color="#00B894" />
            <Text style={styles.locationBadgeText}>{selectedCity}</Text>
          </View>
        </View>

        {/* View Navigation Tabs */}
        <View style={styles.topNavTabs}>
          <TouchableOpacity
            style={[styles.navTabBtn, currentView === 'HOME' && styles.navTabBtnActive]}
            onPress={() => setCurrentView('HOME')}
          >
            <Text style={[styles.navTabText, currentView === 'HOME' && styles.navTabTextActive]}>
              Find Equipment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTabBtn, currentView === 'MY_RENTALS' && styles.navTabBtnActive]}
            onPress={() => setCurrentView('MY_RENTALS')}
          >
            <Text style={[styles.navTabText, currentView === 'MY_RENTALS' && styles.navTabTextActive]}>
              My Requests ({rentalRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search equipment..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setCurrentPage(1);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setCurrentPage(1);
            }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {equipmentCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setCurrentPage(1);
                }}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isSelected ? '#FFFFFF' : '#00B894'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Equipment Cards Section */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>
              {selectedCategory === 'all' && !searchQuery
                ? `Available Equipment (${filteredEquipment.length})`
                : `Search Results (${filteredEquipment.length})`}
            </Text>
            <Text style={styles.pageIndicatorText}>
              Page {currentPage} of {totalPages}
            </Text>
          </View>

          {paginatedItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="medkit-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No equipment found</Text>
              <Text style={styles.emptySub}>Try searching for hospital bed, wheelchair, or oxygen.</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {paginatedItems.map(renderCardItem)}
            </View>
          )}

          {/* Pagination Navigation Bar */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          )}
        </View>

        </View>

        <WebFooter />
      </ScrollView>
    );
  };

  // ==========================================================
  // VIEW: 2. EQUIPMENT DETAILS
  // ==========================================================
  const renderDetailsView = () => {
    if (!selectedEquipment) return null;
    const item = selectedEquipment;

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.desktopContainer}>
        <View style={styles.topHeaderBar}>
          <WebBackButton
            onPress={() => setCurrentView('HOME')}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.screenHeaderTitle}>{item.name}</Text>
            <Text style={styles.screenHeaderSubtitle}>{item.categoryLabel}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <OptimizedImage source={{ uri: item.image }} style={styles.detailsImg} resizeMode="cover" fallbackIcon="fitness-outline" />
          
          <Text style={styles.detailsTitle}>{item.name}</Text>
          <Text style={styles.detailsDesc}>{item.description}</Text>

          {/* Key Features */}
          <Text style={styles.detailsSectionTitle}>Key Features</Text>
          {item.features?.map((f, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color="#00B894" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.bulletText}>{f}</Text>
            </View>
          ))}

          {/* Availability Notice */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle" size={18} color="#1E3A8A" style={{ marginRight: 8 }} />
            <Text style={styles.noticeCardText}>
              Availability will be confirmed after your request is placed.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.detailsRequestBtn}
            onPress={() => handleStartRequest(item)}
          >
            <Text style={styles.detailsRequestBtnText}>Request Equipment</Text>
          </TouchableOpacity>
        </View>

        </View>

        <WebFooter />
      </ScrollView>
    );
  };

  // ==========================================================
  // VIEW: 3. REQUEST FORM (Web Layout)
  // ==========================================================
  const renderRequestFormView = () => {
    if (!selectedEquipment) return null;
    const item = selectedEquipment;

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.desktopContainer}>
        <View style={styles.topHeaderBar}>
          <WebBackButton
            onPress={() => {
              if (formStep === 2) setFormStep(1);
              else setCurrentView('HOME');
            }}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.screenHeaderTitle}>Request Equipment</Text>
            <Text style={styles.screenHeaderSubtitle}>{item.name}</Text>
          </View>
        </View>

        {/* STEP 1: FORM FIELDS */}
        {formStep === 1 && (
          <View style={styles.formBox}>
            {/* Equipment Preview */}
            <View style={styles.formEquipRow}>
              <OptimizedImage source={{ uri: item.image }} style={styles.formEquipImg} resizeMode="cover" fallbackIcon="fitness-outline" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.formEquipName}>{item.name}</Text>
                <Text style={styles.formEquipCity}>Location: {selectedCity}</Text>
              </View>
            </View>

            {/* Quantity */}
            <Text style={styles.inputLabel}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={16} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setQuantity((q) => Math.min(5, q + 1))}
              >
                <Ionicons name="add" size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Required From */}
            <Text style={styles.inputLabel}>Required From</Text>
            <View style={styles.pillSelectRow}>
              {REQUIRED_DATE_CHOICES.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.selectPill, requiredFromDate === d && styles.selectPillActive]}
                  onPress={() => setRequiredFromDate(d)}
                >
                  <Text style={[styles.selectPillText, requiredFromDate === d && styles.selectPillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Required Until */}
            <Text style={styles.inputLabel}>Required Until</Text>
            <View style={styles.pillSelectRow}>
              {DURATION_CHOICES.map((dur) => (
                <TouchableOpacity
                  key={dur}
                  style={[styles.selectPill, requiredUntilDuration === dur && styles.selectPillActive]}
                  onPress={() => setRequiredUntilDuration(dur)}
                >
                  <Text style={[styles.selectPillText, requiredUntilDuration === dur && styles.selectPillTextActive]}>{dur}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Patient */}
            <Text style={styles.inputLabel}>Patient</Text>
            <View style={styles.pillSelectRow}>
              <TouchableOpacity
                style={[styles.selectPill, selectedFamilyMemberId === 'self' && styles.selectPillActive]}
                onPress={() => handleSelectPatient('self')}
              >
                <Text style={[styles.selectPillText, selectedFamilyMemberId === 'self' && styles.selectPillTextActive]}>Self</Text>
              </TouchableOpacity>

              {familyMembers.map((fm) => (
                <TouchableOpacity
                  key={fm.id || fm._id || fm.name}
                  style={[styles.selectPill, selectedFamilyMemberId === (fm.id || fm._id || fm.name) && styles.selectPillActive]}
                  onPress={() => handleSelectPatient(fm)}
                >
                  <Text style={[styles.selectPillText, selectedFamilyMemberId === (fm.id || fm._id || fm.name) && styles.selectPillTextActive]}>
                    {fm.name || fm.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Patient Name"
              placeholderTextColor="#94A3B8"
              value={patientName}
              onChangeText={setPatientName}
            />

            {/* Mobile Number */}
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="10-digit Mobile Number"
              placeholderTextColor="#94A3B8"
              value={patientMobile}
              onChangeText={setPatientMobile}
              keyboardType="phone-pad"
              maxLength={15}
            />

            {/* Delivery Address Section */}
            <View style={styles.addressSection}>
              <Text style={styles.addressSectionHeading}>Delivery Address</Text>
              <Text style={styles.addressHelperText}>Must be within {selectedCity} for equipment delivery.</Text>

              <TextInput
                style={[styles.textInput, addressErrors.houseNo && styles.textInputError]}
                placeholder="House / Flat Number"
                placeholderTextColor="#94A3B8"
                value={houseNo}
                onChangeText={setHouseNo}
              />

              <TextInput
                style={[styles.textInput, addressErrors.streetArea && styles.textInputError]}
                placeholder="Street / Area / Landmark"
                placeholderTextColor="#94A3B8"
                value={streetArea}
                onChangeText={setStreetArea}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.textInput, { flex: 1, backgroundColor: '#E2E8F0', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>{selectedCity}</Text>
                </View>

                <TextInput
                  style={[styles.textInput, { flex: 1 }, addressErrors.pincode && styles.textInputError]}
                  placeholder="Pincode"
                  placeholderTextColor="#94A3B8"
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              {addressErrors.address && (
                <Text style={styles.errorMsgText}>{addressErrors.address}</Text>
              )}
            </View>

            {/* Additional Notes */}
            <Text style={styles.inputLabel}>Additional Requirements</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any special instructions or ground floor delivery?"
              placeholderTextColor="#94A3B8"
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleProceedToReview}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Review & Submit →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: REVIEW */}
        {formStep === 2 && (
          <View style={styles.formBox}>
            <Text style={styles.reviewHeader}>Confirm Details</Text>

            <View style={styles.reviewList}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Equipment</Text>
                <Text style={styles.reviewValue}>{item.name}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Quantity</Text>
                <Text style={styles.reviewValue}>{quantity} Unit</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Required From</Text>
                <Text style={styles.reviewValue}>{requiredFromDate}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Required Until</Text>
                <Text style={styles.reviewValue}>{requiredUntilDuration}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Patient</Text>
                <Text style={styles.reviewValue}>{patientName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Mobile</Text>
                <Text style={styles.reviewValue}>{patientMobile}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Address</Text>
                <Text style={styles.reviewValue}>{houseNo}, {streetArea}, {selectedCity} - {pincode}</Text>
              </View>
            </View>

            <View style={styles.noticeCard}>
              <Ionicons name="information-circle" size={18} color="#1E3A8A" style={{ marginRight: 8 }} />
              <Text style={styles.noticeCardText}>
                Availability will be confirmed after your request is placed.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.btnOutline, { flex: 1, paddingVertical: 12 }]}
                onPress={() => setFormStep(1)}
              >
                <Text style={styles.btnOutlineText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { flex: 2, marginTop: 0 }]}
                onPress={handleSubmitRequest}
              >
                <Text style={styles.submitBtnText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: SUBMITTED CONFIRMATION */}
        {formStep === 3 && newlyCreatedRequest && (
          <View style={styles.submittedBox}>
            <Ionicons name="checkmark-circle" size={56} color="#00B894" style={{ marginBottom: 8 }} />
            <Text style={styles.submittedHeading}>Request sent successfully</Text>
            <Text style={styles.submittedSub}>We'll check availability for you in {selectedCity}.</Text>

            <View style={styles.submittedInfoBox}>
              <Text style={styles.submittedId}>Request ID: {newlyCreatedRequest.id}</Text>
              <Text style={styles.submittedItem}>Equipment: {newlyCreatedRequest.equipmentName} ({newlyCreatedRequest.quantity} Unit)</Text>
              <Text style={styles.submittedItem}>Required From: {newlyCreatedRequest.requiredFromDate}</Text>
              <Text style={styles.submittedItem}>Address: {newlyCreatedRequest.deliveryAddress?.address}</Text>
              <Text style={styles.submittedStatus}>Status: Request Sent</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.btnOutline, { flex: 1, paddingVertical: 12 }]}
                onPress={() => setCurrentView('HOME')}
              >
                <Text style={styles.btnOutlineText}>Browse More</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1.5, marginTop: 0 }]}
                onPress={() => setCurrentView('MY_RENTALS')}
              >
                <Text style={styles.submitBtnText}>Track Status →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        </View>

        <WebFooter />
      </ScrollView>
    );
  };

  // ==========================================================
  // VIEW: 4. MY RENTALS
  // ==========================================================
  const renderMyRentalsView = () => {
    const listToDisplay = myRentalsTab === 'CURRENT' ? currentRentals : pastRentals;

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.desktopContainer}>
        <View style={styles.topHeaderBar}>
          <WebBackButton
            onPress={() => setCurrentView('HOME')}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.screenHeaderTitle}>My Rentals</Text>
            <Text style={styles.screenHeaderSubtitle}>Track your equipment requests</Text>
          </View>
        </View>

        {/* Sub Tabs: Current vs Past */}
        <View style={styles.historyTabsRow}>
          <TouchableOpacity
            style={[styles.historyTab, myRentalsTab === 'CURRENT' && styles.historyTabActive]}
            onPress={() => setMyRentalsTab('CURRENT')}
          >
            <Text style={[styles.historyTabText, myRentalsTab === 'CURRENT' && styles.historyTabTextActive]}>
              Current ({currentRentals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.historyTab, myRentalsTab === 'PAST' && styles.historyTabActive]}
            onPress={() => setMyRentalsTab('PAST')}
          >
            <Text style={[styles.historyTabText, myRentalsTab === 'PAST' && styles.historyTabTextActive]}>
              Past ({pastRentals.length})
            </Text>
          </TouchableOpacity>
        </View>

        {listToDisplay.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="clipboard-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No {myRentalsTab === 'CURRENT' ? 'current' : 'past'} rentals</Text>
            <TouchableOpacity style={styles.btnSolid} onPress={() => setCurrentView('HOME')}>
              <Text style={styles.btnSolidText}>Find Equipment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {listToDisplay.map((req) => {
              const isUnavailable = req.status === 'Equipment Unavailable';
              const isDelivered = req.status === 'Delivered';
              const stageIdx = getEquipmentStatusStageIndex(req.status);

              return (
                <View key={req.id} style={styles.rentalItemCard}>
                  <View style={styles.rentalItemTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rentalItemId}>{req.id}</Text>
                      <Text style={styles.rentalItemName}>{req.equipmentName}</Text>
                      <Text style={styles.rentalItemCity}>{req.deliveryAddress?.city || selectedCity}</Text>
                    </View>

                    <View style={[styles.statusTag, isUnavailable && styles.statusTagUnavailable, isDelivered && styles.statusTagDelivered]}>
                      <Text style={[styles.statusTagText, isUnavailable && { color: '#DC2626' }, isDelivered && { color: '#059669' }]}>
                        {req.status}
                      </Text>
                    </View>
                  </View>

                  {/* Compact Status Indicator */}
                  {!isUnavailable ? (
                    <View style={styles.stepperContainer}>
                      <View style={styles.stepperDotsRow}>
                        {EQUIPMENT_WORKFLOW_STEPS.map((step, idx) => {
                          const isDone = stageIdx >= idx;
                          return (
                            <View key={step} style={styles.stepperSegment}>
                              <View style={[styles.stepDot, isDone && styles.stepDotDone]} />
                              {idx < EQUIPMENT_WORKFLOW_STEPS.length - 1 && (
                                <View style={[styles.stepLine, stageIdx > idx && styles.stepLineDone]} />
                              )}
                            </View>
                          );
                        })}
                      </View>
                      <Text style={styles.stepperStatusText}>Status: {req.status}</Text>
                    </View>
                  ) : (
                    <View style={styles.unavailableBox}>
                      <Text style={styles.unavailableTitle}>✕ Equipment Unavailable</Text>
                      <Text style={styles.unavailableReason}>Reason: {req.unavailableReason || 'Out of stock in your area.'}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.rentalActionRow}>
                    <TouchableOpacity
                      style={styles.btnOutlineSmall}
                      onPress={() => {
                        setSelectedRequestForModal(req);
                        setRequestDetailModalVisible(true);
                      }}
                    >
                      <Text style={styles.btnOutlineSmallText}>View Details →</Text>
                    </TouchableOpacity>

                    {isDelivered && (
                      <TouchableOpacity
                        style={styles.btnReturnSmall}
                        onPress={() => handleUserReturn(req)}
                      >
                        <Text style={styles.btnReturnSmallText}>Schedule Return</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        </View>

        <WebFooter />
      </ScrollView>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedRequestForModal) return null;
    const req = selectedRequestForModal;

    return (
      <Modal visible={requestDetailModalVisible} transparent animationType="slide" onRequestClose={() => setRequestDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Request Details</Text>
            <Text style={styles.modalSub}>{req.id} • {req.equipmentName}</Text>

            <View style={styles.reviewList}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Quantity</Text>
                <Text style={styles.reviewValue}>{req.quantity}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Patient</Text>
                <Text style={styles.reviewValue}>{req.patientName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Address</Text>
                <Text style={styles.reviewValue}>{req.deliveryAddress?.address}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Status</Text>
                <Text style={[styles.reviewValue, { color: '#00B894', fontWeight: '700' }]}>{req.status}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={() => setRequestDetailModalVisible(false)}>
              <Text style={styles.submitBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAddressValidationModal = () => (
    <Modal visible={addressValidationModalVisible} transparent animationType="fade" onRequestClose={() => setAddressValidationModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Ionicons name="location-outline" size={40} color="#FF7F50" style={{ alignSelf: 'center', marginBottom: 6 }} />
          <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Location Rule</Text>
          <Text style={[styles.modalSub, { textAlign: 'center' }]}>{addressValidationMsg}</Text>
          <TouchableOpacity style={[styles.submitBtn, { marginTop: 12 }]} onPress={() => setAddressValidationModalVisible(false)}>
            <Text style={styles.submitBtnText}>Update Address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeContainer, isDarkMode && { backgroundColor: '#080E1A', backgroundImage: 'none' }]}>
      {currentView === 'HOME' && renderHomeView()}
      {currentView === 'DETAILS' && renderDetailsView()}
      {currentView === 'REQUEST_FORM' && renderRequestFormView()}
      {currentView === 'MY_RENTALS' && renderMyRentalsView()}

      {renderDetailsModal()}
      {renderAddressValidationModal()}
    </SafeAreaView>
  );
};

// ============================================================================
// STYLESHEET (MediUnify Standard Theme - Responsive Pagination Grid)
// ============================================================================
const baseStyles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  desktopContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },

  // Header
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 18,
    backgroundColor: 'transparent',
    marginBottom: 6,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  screenHeaderSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  locationBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00B894',
  },

  // Nav Tabs
  topNavTabs: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 4,
    marginBottom: 16,
    gap: 12,
  },
  navTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  navTabBtnActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  navTabText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  navTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E3A8A',
  },

  // Categories
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  categoryPillActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },

  // Sections
  sectionWrapper: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B894',
  },

  // Responsive Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardWidthDesktop: {
    width: '23.6%',
  },
  cardWidthTablet: {
    width: '31.6%',
  },
  cardWidthMobile: {
    width: '48.5%',
  },
  gridCardImg: {
    width: '100%',
    height: 125,
    backgroundColor: '#F1F5F9',
  },
  gridCardBody: {
    padding: 10,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  gridCardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 6,
  },
  gridCardAvail: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  gridCardBtn: {
    backgroundColor: '#00B894',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Pagination Controls
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 16,
    gap: 12,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  pageBtnDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B894',
  },
  pageBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNumberChip: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberChipActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },

  // Details View
  detailsCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsImg: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  detailsDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  bulletText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 14,
  },
  noticeCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
    flex: 1,
  },
  detailsRequestBtn: {
    backgroundColor: '#00B894',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsRequestBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Form Box
  formBox: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formEquipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  formEquipImg: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  formEquipName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  formEquipCity: {
    fontSize: 12,
    color: '#64748B',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  pillSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  selectPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectPillActive: {
    backgroundColor: '#00B894',
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  selectPillTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1E3A8A',
    marginBottom: 8,
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  addressSection: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  addressHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  errorMsgText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: '#00B894',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Review
  reviewHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  reviewList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
    maxWidth: '65%',
    textAlign: 'right',
  },

  // Confirmation
  submittedBox: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submittedHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  submittedSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  submittedInfoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  submittedId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00B894',
  },
  submittedItem: {
    fontSize: 12,
    color: '#334155',
  },
  submittedStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 2,
  },

  // History & Tracking
  historyTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  historyTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  historyTabActive: {
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#00B894',
  },
  historyTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  historyTabTextActive: {
    color: '#00B894',
  },
  rentalItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rentalItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rentalItemId: {
    fontSize: 12,
    color: '#64748B',
  },
  rentalItemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  rentalItemCity: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  statusTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagUnavailable: {
    backgroundColor: '#FEE2E2',
  },
  statusTagDelivered: {
    backgroundColor: '#D1FAE5',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  stepperContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginVertical: 10,
  },
  stepperDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepperSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  stepDotDone: {
    backgroundColor: '#00B894',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  stepLineDone: {
    backgroundColor: '#00B894',
  },
  stepperStatusText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  unavailableBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 6,
    marginVertical: 10,
  },
  unavailableTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  unavailableReason: {
    fontSize: 12,
    color: '#991B1B',
  },
  rentalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  btnOutlineSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  btnOutlineSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  btnReturnSmall: {
    backgroundColor: '#FF7F50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnReturnSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnOutline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  btnSolid: {
    backgroundColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSolidText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },

  // Empty State
  emptyBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 10,
  },
});

const EquipmentRentalScreenResponsive = (props) => {
  const { width } = useWindowDimensions();
  return !isDesktopLayout(width) ? (
    <EquipmentRentalScreenMobile {...props} />
  ) : (
    <EquipmentRentalScreen {...props} />
  );
};

export default EquipmentRentalScreenResponsive;
