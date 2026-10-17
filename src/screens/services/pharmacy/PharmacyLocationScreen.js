import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../../../utils/alert';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestLocationPermissionWebSafe,
  getCurrentPositionWebSafe,
  reverseGeocodeWebSafe,
  geocodeWebSafe,
} from '../../../utils/locationHelper';

import colors from '../../../theme/colors';
import { useCart } from '../../../context/CartContext';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../utils/themeStyles';
import WebFooter from '../../../components/web/WebFooter';

const DEFAULT_LOCATION = {
  latitude: 12.2958,
  longitude: 76.6394,
};

const PharmacyLocationScreen = ({ navigation, route }) => {
  const { isDarkMode, theme, t, isIndic } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const mapRef = useRef(null);
  const { updateAddress, selectedAddress } = useCart();

  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [address, setAddress] = useState('Detecting your delivery location...');
  const [city, setCity] = useState('Mysore');
  const [pincode, setPincode] = useState('570023');
  const [stateName, setStateName] = useState('Karnataka');

  const [searchText, setSearchText] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [gettingAddress, setGettingAddress] = useState(false);

  // Reverse geocoding from coordinates
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      setGettingAddress(true);
      const results = await reverseGeocodeWebSafe({
        latitude,
        longitude,
      });

      if (results && results.length > 0) {
        const place = results[0];
        const addressParts = [
          place.name,
          place.street,
          place.district,
          place.subregion,
          place.city,
        ].filter(Boolean);

        const formatted = place.formattedAddress || addressParts
          .filter((item, index) => addressParts.indexOf(item) === index)
          .join(', ');

        const detectedCity = place.city || place.subregion || 'Mysore';
        const detectedPin = place.postalCode || '570001';
        const detectedState = place.region || 'Karnataka';

        setAddress(formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setCity(detectedCity);
        setPincode(detectedPin);
        setStateName(detectedState);
      } else {
        setAddress(`Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
      setAddress('Selected pin location');
    } finally {
      setGettingAddress(false);
    }
  };

  // GPS Current Location
  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const perm = await requestLocationPermissionWebSafe();

      if (!perm.granted && perm.status !== 'granted') {
        showAlert(
          'Location Permission Required',
          'Please allow location permission to auto-detect your location on map.'
        );
        setLoadingLocation(false);
        return;
      }

      const currentLocation = await getCurrentPositionWebSafe({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;
      const newLoc = { latitude, longitude };

      setLocation(newLoc);

      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        800
      );

      await getAddressFromCoordinates(latitude, longitude);
    } catch (error) {
      showAlert('Location Error', 'Unable to fetch current location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Map tap / drag handler
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLocation({ latitude, longitude });
    await getAddressFromCoordinates(latitude, longitude);
  };

  // Search places / addresses
  const searchLocation = async () => {
    const query = searchText.trim();
    if (!query) {
      showAlert('Enter Location', 'Please enter an address, locality, or area to search.');
      return;
    }

    try {
      Keyboard.dismiss();
      setSearching(true);

      const results = await geocodeWebSafe(query);
      if (!results || results.length === 0) {
        showAlert('Location Not Found', 'Could not find this place. Try searching with city or landmark.');
        return;
      }

      const { latitude, longitude } = results[0];
      setLocation({ latitude, longitude });

      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        800
      );

      await getAddressFromCoordinates(latitude, longitude);
    } catch (error) {
      showAlert('Search Error', 'Unable to search for this location.');
    } finally {
      setSearching(false);
    }
  };

  // Confirm Location & send back to Cart / Home / Doctor Screen
  const confirmLocation = async () => {
    const fullLoc = address ? `${address}, ${city}` : `${city}`;
    try {
      await AsyncStorage.setItem('@unnathi_user_location', fullLoc);
    } catch (e) {}

    const newAddressObj = {
      name: selectedAddress?.name || 'User',
      phone: selectedAddress?.phone || '9876543210',
      addressLine: address,
      city,
      state: stateName,
      pincode,
      tag: selectedAddress?.tag || 'Home',
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, Platform.OS === 'web' && { alignItems: 'center' }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, Platform.OS === 'web' && styles.webContainer]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={isDarkMode ? theme.text : colors.secondary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Select Location on Map</Text>
            <Text style={styles.headerSubtitle}>Tap or drag pin to your exact delivery point</Text>
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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={Platform.OS === 'web'}
      >
        <View style={Platform.OS === 'web' ? styles.webContainer : { flex: 1 }}>
          {/* SEARCH BAR OVER MAP */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search locality, street, or landmark..."
              placeholderTextColor={colors.slate}
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

          {/* INTERACTIVE MAP */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
              }}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={location}
                draggable
                onDragEnd={handleMapPress}
                title="Delivery Spot"
                description={address}
              >
                <View style={styles.customMarker}>
                  <View style={styles.markerCircle}>
                    <Ionicons name="location" size={24} color={colors.white} />
                  </View>
                  <View style={styles.markerArrow} />
                </View>
              </Marker>
            </MapView>

            {/* GPS RE-CENTER FLOATING BUTTON */}
            <TouchableOpacity
              style={styles.myLocationFloatingBtn}
              activeOpacity={0.85}
              onPress={getCurrentLocation}
            >
              <Ionicons name="navigate" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* BOTTOM SELECTED ADDRESS CARD */}
          <View style={styles.bottomCard}>
            <View style={styles.addressTopRow}>
              <View style={styles.locIconCircle}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles.addressDetailsWrap}>
                <Text style={styles.addressHeading}>Deliver To This Address</Text>
                {gettingAddress ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.detectingText}>Fetching street details...</Text>
                  </View>
                ) : (
                  <Text style={styles.addressText} numberOfLines={2}>
                    {address}
                  </Text>
                )}
                <Text style={styles.addressCityPincode}>
                  {city} - {pincode}, {stateName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.85}
              onPress={confirmLocation}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={styles.confirmBtnText}>Confirm Location & Set Address</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Platform.OS === 'web' && <WebFooter navigation={navigation} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FA',
  },
  webContainer: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    flex: 1,
    paddingBottom: 20,
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
    zIndex: 10,
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
    flex: 1,
    marginHorizontal: 10,
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
  gpsHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: 12,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
  },
  searchGoBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchGoText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  mapContainer: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 420 : undefined,
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...Platform.select({

      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.25)' },

      default: {

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.25,

        shadowRadius: 4,

        elevation: 5,

      },

    }),
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
  },
  myLocationFloatingBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    position: 'relative',
    zIndex: 999,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  locIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressDetailsWrap: {
    flex: 1,
  },
  addressHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.secondary,
  },
  detectingText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 18,
  },
  addressCityPincode: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 3,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});

export default PharmacyLocationScreen;