import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { showAlert } from '../../../utils/alert';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  requestLocationPermissionWebSafe,
  getCurrentPositionWebSafe,
  reverseGeocodeWebSafe,
  geocodeWebSafe,
} from '../../../utils/locationHelper';

import colors from '../../../theme/colors';
import { useCart } from '../../../context/CartContext';
import WebBackButton from '../../../components/web/WebBackButton';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';

const DEFAULT_LOCATION = {
  latitude: 12.2958,
  longitude: 76.6394,
};

const PharmacyLocationScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { updateAddress, selectedAddress } = useCart();

  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [address, setAddress] = useState('Detecting your delivery location...');
  const [city, setCity] = useState('Mysore');
  const [pincode, setPincode] = useState('570023');
  const [stateName, setStateName] = useState('Karnataka');

  const [searchText, setSearchText] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);

  // Reverse geocode
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const results = await reverseGeocodeWebSafe({ latitude, longitude });
      if (results && results.length > 0) {
        const place = results[0];
        const addressParts = [
          place.name,
          place.street,
          place.district,
          place.subregion,
          place.city,
        ].filter(Boolean);

        const formatted = place.formattedAddress || addressParts.join(', ') || 'Selected Location';
        setAddress(formatted);
        if (place.city) setCity(place.city);
        if (place.postalCode) setPincode(place.postalCode);
        if (place.region) setStateName(place.region);
      }
    } catch (err) {
      setAddress(`Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`);
    }
  };

  // Get Current Location
  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const perm = await requestLocationPermissionWebSafe();
      if (!perm.granted && perm.status !== 'granted') {
        showAlert('Permission Denied', 'Please allow location access to fetch your current location.');
        return;
      }

      const loc = await getCurrentPositionWebSafe({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(coords);
      await getAddressFromCoordinates(coords.latitude, coords.longitude);
    } catch (error) {
      showAlert('Location Error', 'Unable to fetch current location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const searchLocation = async () => {
    if (!searchText.trim()) return;
    try {
      setSearching(true);
      const results = await geocodeWebSafe(searchText);
      if (!results || results.length === 0) {
        showAlert('Location Not Found', 'Could not find this place. Try another search query.');
        return;
      }

      const { latitude, longitude } = results[0];
      setLocation({ latitude, longitude });
      await getAddressFromCoordinates(latitude, longitude);
    } catch (error) {
      showAlert('Search Error', 'Unable to search for this location.');
    } finally {
      setSearching(false);
    }
  };

  const confirmLocation = () => {
    const newAddressObj = {
      name: selectedAddress.name || 'User',
      phone: selectedAddress.phone || '9876543210',
      addressLine: address,
      city,
      state: stateName,
      pincode,
      tag: selectedAddress.tag || 'Home',
      latitude: location.latitude,
      longitude: location.longitude,
    };

    updateAddress(newAddressObj);
    if (route?.params?.onLocationSelected) {
      route.params.onLocationSelected(newAddressObj);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <WebBackButton
          onPress={() => navigation.goBack()}
        />

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Select Delivery Location</Text>
          <Text style={styles.headerSubtitle}>Confirm your delivery address for pharmacy orders</Text>
        </View>

        <TouchableOpacity
          style={styles.gpsHeaderBtn}
          onPress={getCurrentLocation}
          disabled={loadingLocation}
          activeOpacity={0.8}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color={colors.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search locality, street, city..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={searchLocation}
          returnKeyType="search"
        />
        {searching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <TouchableOpacity onPress={searchLocation} style={styles.searchGoBtn}>
            <Text style={styles.searchGoText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* WEB MAP SIMULATION / LOCATION CARD */}
      <View style={styles.content}>
        <View style={styles.mapCard}>
          <View style={styles.locationIconWrap}>
            <Ionicons name="location" size={48} color={colors.primary} />
          </View>
          <Text style={styles.coordsTitle}>Current Delivery Coordinates</Text>
          <Text style={styles.coordsText}>
            Latitude: {location.latitude.toFixed(5)}, Longitude: {location.longitude.toFixed(5)}
          </Text>
          <TouchableOpacity style={styles.locateMeBtn} onPress={getCurrentLocation}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.locateMeText}>Use Current GPS Location</Text>
          </TouchableOpacity>
        </View>

        {/* ADDRESS FORM */}
        <View style={styles.addressCard}>
          <Text style={styles.cardHeader}>Delivery Address Details</Text>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Address line"
            multiline
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
            />
            <TextInput
              style={[styles.input, { width: 100 }]}
              value={pincode}
              onChangeText={setPincode}
              placeholder="Pincode"
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      {/* FOOTER CONFIRM BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={confirmLocation} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>Confirm Delivery Location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gpsHeaderBtn: {
    padding: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1E3A8A',
  },
  searchGoBtn: {
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchGoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mapCard: {
    backgroundColor: '#E6F8F3',
    backgroundImage: 'linear-gradient(145deg, #ECFDF5 0%, #E2F8F0 50%, #D1F4E8 100%)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 16,
    boxShadow: '0 8px 24px -2px rgba(0, 184, 148, 0.12)',
  },
  locationIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    boxShadow: '0 4px 12px rgba(0, 184, 148, 0.12)',
  },
  coordsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 16,
  },
  locateMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  locateMeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#F0F9FF',
    backgroundImage: 'linear-gradient(145deg, #F0F9FF 0%, #E0F2FE 50%, #BAE6FD 100%)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    boxShadow: '0 8px 24px -2px rgba(2, 132, 199, 0.10)',
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  addressInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    minHeight: 60,
  },
  row: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PharmacyLocationScreen;
