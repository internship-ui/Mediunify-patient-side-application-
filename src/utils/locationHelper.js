import { Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const normalizeCityName = (rawCity) => {
  if (!rawCity || typeof rawCity !== 'string') return '';
  const clean = rawCity.trim().toLowerCase();

  if (clean.includes('mysuru')) return 'Mysuru';
  if (clean.includes('mysore')) return 'Mysore';
  if (clean.includes('bengaluru') || clean.includes('bangalore')) return 'Bangalore';
  if (clean.includes('hubli') || clean.includes('hubballi') || clean.includes('dharwad')) return 'Hubli - Dharwad';
  if (clean.includes('mangaluru') || clean.includes('mangalore')) return 'Mangalore';
  if (clean.includes('belagavi') || clean.includes('belgaum')) return 'Belgaum';
  if (clean.includes('shivamogga') || clean.includes('shimoga')) return 'Shimoga';
  if (clean.includes('davanagere') || clean.includes('davangere')) return 'Davanagere';
  if (clean.includes('kalaburagi') || clean.includes('gulbarga')) return 'Gulbarga';
  if (clean.includes('ballari') || clean.includes('bellary')) return 'Bellary';
  if (clean.includes('udupi') || clean.includes('manipal')) return 'Udupi';
  if (clean.includes('tumakuru') || clean.includes('tumkur')) return 'Tumkur';
  if (clean.includes('delhi') || clean.includes('noida') || clean.includes('gurgaon') || clean.includes('gurugram') || clean.includes('ghaziabad') || clean.includes('faridabad')) return 'Delhi NCR';
  if (clean.includes('mumbai') || clean.includes('thane') || clean.includes('navi mumbai')) return 'Mumbai';
  if (clean.includes('hyderabad') || clean.includes('secunderabad')) return 'Hyderabad';
  if (clean.includes('chennai') || clean.includes('madras')) return 'Chennai';
  if (clean.includes('pune')) return 'Pune';
  if (clean.includes('kolkata') || clean.includes('calcutta')) return 'Kolkata';

  // Capitalize raw city nicely
  return rawCity.trim().charAt(0).toUpperCase() + rawCity.trim().slice(1);
};

export const saveLocationToStorage = async (city, fullLocation = '', coords = null) => {
  try {
    if (city) {
      await AsyncStorage.setItem('@mediunify_selected_city', city);
      await AsyncStorage.setItem('@unnathi_user_location', fullLocation || city);
    }
    if (coords && coords.latitude && coords.longitude) {
      await AsyncStorage.setItem('@unnathi_user_coords', JSON.stringify(coords));
    }
  } catch (e) {
    console.warn('[LocationHelper] Failed to save location to storage:', e);
  }
};

export const MYSORE_LOCALITIES = [
  { id: '1', name: 'Kuvempunagar', city: 'Mysore', full: 'Kuvempunagar, Mysore', latitude: 12.2858, longitude: 76.6341, pincode: '570023' },
  { id: '2', name: 'Jayalakshmipuram', city: 'Mysore', full: 'Jayalakshmipuram, Mysore', latitude: 12.3168, longitude: 76.6285, pincode: '570012' },
  { id: '3', name: 'Saraswathipuram', city: 'Mysore', full: 'Saraswathipuram, Mysore', latitude: 12.3021, longitude: 76.6318, pincode: '570009' },
  { id: '4', name: 'Vijayanagar 2nd Stage', city: 'Mysore', full: 'Vijayanagar 2nd Stage, Mysore', latitude: 12.3312, longitude: 76.6120, pincode: '570017' },
  { id: '5', name: 'Gokulam 3rd Stage', city: 'Mysore', full: 'Gokulam 3rd Stage, Mysore', latitude: 12.3355, longitude: 76.6310, pincode: '570002' },
  { id: '6', name: 'V.V. Mohalla', city: 'Mysore', full: 'V.V. Mohalla, Mysore', latitude: 12.3210, longitude: 76.6390, pincode: '570002' },
  { id: '7', name: 'Bannimantap', city: 'Mysore', full: 'Bannimantap, Mysore', latitude: 12.3380, longitude: 76.6520, pincode: '570015' },
  { id: '8', name: 'Nazarbad', city: 'Mysore', full: 'Nazarbad, Mysore', latitude: 12.3080, longitude: 76.6650, pincode: '570010' },
  { id: '9', name: 'Hebbal 1st Stage', city: 'Mysore', full: 'Hebbal, Mysore', latitude: 12.3610, longitude: 76.6150, pincode: '570016' },
  { id: '10', name: 'Mysore Central', city: 'Mysore', full: 'Mysore Central, Mysore', latitude: 12.3050, longitude: 76.6550, pincode: '570001' },
  { id: '11', name: 'TK Layout', city: 'Mysore', full: 'TK Layout, Mysore', latitude: 12.2965, longitude: 76.6215, pincode: '570009' },
  { id: '12', name: 'Siddhartha Layout', city: 'Mysore', full: 'Siddhartha Layout, Mysore', latitude: 12.3025, longitude: 76.6812, pincode: '570011' },
  { id: '13', name: 'Dattagalli', city: 'Mysore', full: 'Dattagalli, Mysore', latitude: 12.2740, longitude: 76.6110, pincode: '570022' },
  { id: '14', name: 'Bogadi 2nd Stage', city: 'Mysore', full: 'Bogadi 2nd Stage, Mysore', latitude: 12.3010, longitude: 76.6025, pincode: '570026' },
  { id: '15', name: 'Yadavagiri', city: 'Mysore', full: 'Yadavagiri, Mysore', latitude: 12.3260, longitude: 76.6410, pincode: '570020' },
];

export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.0;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

export const getClosestMysoreLocality = (lat, lon) => {
  if (!lat || !lon) return MYSORE_LOCALITIES[0];
  let closest = MYSORE_LOCALITIES[0];
  let minD = Infinity;
  for (const loc of MYSORE_LOCALITIES) {
    const d = calculateDistanceKm(lat, lon, loc.latitude, loc.longitude);
    if (d < minD) {
      minD = d;
      closest = loc;
    }
  }
  return closest;
};

/**
 * Robust, cross-platform permission checker for Web & Native
 */
export const requestLocationPermissionWebSafe = async () => {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      // In web browsers, permissions are prompted when getCurrentPosition is called.
      // If Permissions API is available, check if explicitly denied:
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const res = await navigator.permissions.query({ name: 'geolocation' });
          if (res.state === 'denied') {
            return { status: 'denied', granted: false };
          }
        }
      } catch (e) {
        // Permissions API query not supported in all browsers; treat as promptable
      }
      return { status: 'granted', granted: true };
    }
    return { status: 'denied', granted: false };
  }

  try {
    const res = await Location.requestForegroundPermissionsAsync();
    return res;
  } catch (e) {
    console.warn('[LocationHelper] Permission request error:', e);
    return { status: 'denied', granted: false };
  }
};

/**
 * Robust, cross-platform position fetcher with accuracy fallback & timeout
 */
export const getCurrentPositionWebSafe = async (options = {}) => {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser.');
    }

    // Helper to wrap navigator.geolocation.getCurrentPosition in a promise with timeout
    const getWebPos = (opts) =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                altitude: pos.coords.altitude,
                accuracy: pos.coords.accuracy,
                altitudeAccuracy: pos.coords.altitudeAccuracy,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
              },
              timestamp: pos.timestamp,
            });
          },
          (err) => reject(err),
          opts
        );
      });

    // 1st attempt: High accuracy with 5 second timeout
    try {
      return await getWebPos({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 10000,
      });
    } catch (firstErr) {
      // If user explicitly denied, don't retry
      if (firstErr && firstErr.code === 1) { // PERMISSION_DENIED
        throw new Error('Location permission was denied by the browser.');
      }
      // 2nd attempt: Balanced / Low accuracy (Wi-Fi/IP location for laptops & desktops)
      try {
        return await getWebPos({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      } catch (secondErr) {
        console.warn('[LocationHelper] Web geolocation unavailable:', secondErr);
        throw secondErr;
      }
    }
  }

  // Native Mobile (iOS/Android)
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: options.accuracy || Location.Accuracy.Balanced,
    });
  } catch (err) {
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
      });
    } catch (lowestErr) {
      const last = await Location.getLastKnownPositionAsync();
      if (last) return last;
      throw lowestErr;
    }
  }
};

/**
 * Universal Reverse Geocoding that works reliably on Web and Native.
 * Replaces expo-location's reverseGeocodeAsync which returns [] on Web.
 */
export const reverseGeocodeWebSafe = async ({ latitude, longitude }) => {
  if (!latitude || !longitude) return [];

  // If on Native, try native geocoder first
  if (Platform.OS !== 'web') {
    try {
      const nativeResults = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (Array.isArray(nativeResults) && nativeResults.length > 0 && nativeResults[0].city) {
        return nativeResults;
      }
    } catch (nativeErr) {
      console.warn('[LocationHelper] Native reverseGeocodeAsync failed, falling back to web service:', nativeErr);
    }
  }

  // 1. Try BigDataCloud Reverse Geocoding Client (Fast, CORS friendly, works in all browsers)
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(bdcUrl, {
      signal: controller?.signal,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.locality || data.city || data.principalSubdivision)) {
        const rawCity = data.city || data.locality || data.principalSubdivision;
        const city = normalizeCityName(rawCity);
        const locality = data.locality || data.city || city;
        const state = data.principalSubdivision || 'Karnataka';
        const postalCode = data.postcode || '';

        return [
          {
            name: locality,
            street: locality,
            district: locality,
            subregion: locality,
            city: city,
            region: state,
            postalCode: postalCode,
            country: data.countryName || 'India',
            formattedAddress: `${locality}, ${city}, ${state}${postalCode ? ` - ${postalCode}` : ''}`,
          },
        ];
      }
    }
  } catch (bdcErr) {
    // BigDataCloud failed, try OpenStreetMap
  }

  // 2. Try OpenStreetMap Nominatim
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4500) : null;

    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const headers = Platform.OS === 'web' ? {} : { 'User-Agent': 'UnnathiHealthcareApp/1.0' };
    const res = await fetch(osmUrl, {
      headers,
      signal: controller?.signal,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const mainName = addr.amenity || addr.road || addr.suburb || addr.neighbourhood || 'Current Location';
        const district = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || addr.county || '';
        const rawCity = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || addr.state_district || addr.county || addr.state;
        const city = normalizeCityName(rawCity);
        const state = addr.state || 'Karnataka';
        const postalCode = addr.postcode || '';

        return [
          {
            name: mainName,
            street: addr.road || '',
            district: district || city,
            subregion: district || city,
            city: city,
            region: state,
            postalCode: postalCode,
            country: addr.country || 'India',
            formattedAddress: data.display_name || `${mainName}, ${city} - ${postalCode}`,
          },
        ];
      }
    }
  } catch (osmErr) {
    // OSM failed
  }

  // 3. Distance matcher for known Mysore coords (within 25 km)
  const distToMysore = calculateDistanceKm(latitude, longitude, 12.2958, 76.6394);
  if (distToMysore < 25) {
    const closest = getClosestMysoreLocality(latitude, longitude);
    return [
      {
        name: closest.name,
        street: `${closest.name} Main Road`,
        district: closest.name,
        subregion: closest.name,
        city: 'Mysuru',
        region: 'Karnataka',
        postalCode: closest.pincode || '570023',
        country: 'India',
        formattedAddress: `${closest.name}, Mysuru - ${closest.pincode || '570023'}`,
      },
    ];
  }

  // Do not fake Bangalore or Mysore if completely unknown
  return [];
};

/**
 * Universal forward geocoding (search by place/address) for Web & Native
 */
export const geocodeWebSafe = async (searchText) => {
  if (!searchText || typeof searchText !== 'string' || !searchText.trim()) {
    return [];
  }

  const query = searchText.trim().toLowerCase();

  // Search local list first
  const localMatches = MYSORE_LOCALITIES.filter(
    (loc) => loc.name.toLowerCase().includes(query) || loc.full.toLowerCase().includes(query)
  );

  // If on Native, try native geocoder
  if (Platform.OS !== 'web') {
    try {
      const nativeRes = await Location.geocodeAsync(searchText);
      if (Array.isArray(nativeRes) && nativeRes.length > 0) {
        return nativeRes;
      }
    } catch (e) {}
  }

  // On Web or fallback, try Nominatim search
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText + ', Mysore, Karnataka')}&limit=5`;
    const res = await fetch(url, { headers: { 'User-Agent': 'UnnathiHealthcareApp/1.0' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => ({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          name: item.display_name,
        }));
      }
    }
  } catch (e) {}

  if (localMatches.length > 0) {
    return localMatches.map((m) => ({
      latitude: m.latitude,
      longitude: m.longitude,
      name: m.full,
    }));
  }

  return [];
};

/**
 * All-in-one Helper: Checks permission, fetches GPS coordinates,
 * reverse geocodes to a readable address, and saves to AsyncStorage.
 */
export const detectUserLocationWithAddress = async () => {
  // 1. Permissions
  const perm = await requestLocationPermissionWebSafe();
  if (!perm.granted && perm.status !== 'granted') {
    return {
      success: false,
      error: 'PERMISSION_DENIED',
      message: 'Please enable location permission in your browser or device settings.',
    };
  }

  // 2. Coordinates
  const position = await getCurrentPositionWebSafe({
    accuracy: Location.Accuracy.Balanced,
  });

  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;

  // 3. Address via Web-Safe Reverse Geocoding
  const addresses = await reverseGeocodeWebSafe({ latitude, longitude });
  const place = addresses[0] || {
    name: 'Current Area',
    street: '',
    district: 'Mysore',
    subregion: 'Mysore',
    city: 'Mysore',
    region: 'Karnataka',
    postalCode: '570023',
    country: 'India',
  };

  const areaName = place.district || place.subregion || place.name || 'Kuvempunagar';
  const cityName = place.city || 'Mysore';
  const shortLoc = `${areaName}, ${cityName}`;
  const fullLoc = place.formattedAddress || `${place.name ? `${place.name}, ` : ''}${areaName}, ${cityName} - ${place.postalCode || '570023'}`;

  // Save to AsyncStorage
  try {
    await AsyncStorage.setItem('@unnathi_user_location', shortLoc);
    await AsyncStorage.setItem(
      '@unnathi_user_coords',
      JSON.stringify({ latitude, longitude })
    );
  } catch (e) {}

  return {
    success: true,
    coords: { latitude, longitude },
    place,
    shortLoc,
    fullLoc,
    isFallback: position.isFallback || false,
  };
};

/**
 * Takes location specifically from the phone's hardware GPS sensor.
 * Prompts for permission if needed, obtains high-accuracy coordinates,
 * reverse-geocodes them, and stores the resulting city & address in AsyncStorage.
 */
export const detectPhoneGPSLocation = async (forcePrompt = true) => {
  try {
    // 1. Request location permissions
    const perm = await requestLocationPermissionWebSafe();
    if (!perm.granted && perm.status !== 'granted') {
      return {
        success: false,
        error: 'PERMISSION_DENIED',
        message: 'Location permission was denied. Please allow location access to use phone GPS.',
      };
    }

    let lat = null;
    let lon = null;
    let accuracy = null;

    // 2. High-accuracy GPS positioning
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
          );
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
      }
    } else {
      // Native iOS / Android
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        accuracy = loc.coords.accuracy;
      } catch (nativeErr) {
        // Fallback to balanced if high-accuracy times out
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        accuracy = loc.coords.accuracy;
      }
    }

    if (!lat || !lon) {
      throw new Error('Unable to retrieve coordinates from phone GPS.');
    }

    // 3. Reverse geocode to find real locality and city
    const addresses = await reverseGeocodeWebSafe({ latitude: lat, longitude: lon });
    const first = addresses?.[0];

    const rawCity = first?.city || first?.district || first?.subregion || 'Mysore';
    const detectedCity = normalizeCityName(rawCity);
    const locality = first?.name || first?.district || first?.subregion || detectedCity;
    const fullLoc = first?.formattedAddress || `${locality}, ${detectedCity}, ${first?.region || 'Karnataka'}`;

    // 4. Save to AsyncStorage
    await saveLocationToStorage(detectedCity, fullLoc, { latitude: lat, longitude: lon });

    return {
      success: true,
      city: detectedCity,
      locality: locality,
      fullLocation: fullLoc,
      coords: { latitude: lat, longitude: lon, accuracy },
      source: 'phone_gps',
    };
  } catch (err) {
    console.warn('[LocationHelper] detectPhoneGPSLocation failed:', err);
    return {
      success: false,
      error: err.message || 'GPS_ERROR',
      message: err.message || 'Could not fetch phone GPS location.',
    };
  }
};

/**
 * Automatically detects the user's location via GPS (with IP fallback).
 * Works reliably on Web (browsers) and Native (iOS/Android).
 */
export const detectAutoLocation = async () => {
  try {
    // 1. Try Browser / Device GPS first
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
          );
        });

        if (pos?.coords?.latitude && pos?.coords?.longitude) {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const addresses = await reverseGeocodeWebSafe({ latitude: lat, longitude: lon });
          const first = addresses?.[0];
          if (first && first.city) {
            const detectedCity = normalizeCityName(first.city);
            await saveLocationToStorage(detectedCity, first.formattedAddress || `${detectedCity}, ${first.region || 'India'}`, { latitude: lat, longitude: lon });
            return {
              success: true,
              city: detectedCity,
              fullLocation: first.formattedAddress || `${detectedCity}, ${first.region || 'India'}`,
              coords: { latitude: lat, longitude: lon },
              source: 'gps',
            };
          }
        }
      } catch (gpsErr) {
        console.log('[LocationHelper] GPS request skipped or timed out, trying IP detection:', gpsErr?.message);
      }
    }

    // 2. Mobile Native fallback using expo-location
    if (Platform.OS !== 'web') {
      try {
        const perm = await requestLocationPermissionWebSafe();
        if (perm.granted || perm.status === 'granted') {
          const loc = await getCurrentPositionWebSafe({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords?.latitude && loc?.coords?.longitude) {
            const lat = loc.coords.latitude;
            const lon = loc.coords.longitude;
            const addresses = await reverseGeocodeWebSafe({ latitude: lat, longitude: lon });
            const first = addresses?.[0];
            if (first && first.city) {
              const detectedCity = normalizeCityName(first.city);
              await saveLocationToStorage(detectedCity, first.formattedAddress, { latitude: lat, longitude: lon });
              return {
                success: true,
                city: detectedCity,
                fullLocation: first.formattedAddress,
                coords: { latitude: lat, longitude: lon },
                source: 'gps',
              };
            }
          }
        }
      } catch (nativeErr) {
        console.warn('[LocationHelper] Native GPS detection error:', nativeErr);
      }
    }

    // 3. Fast IP Geolocation Fallback (instant, no browser permission prompt needed)
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
      const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client', {
        signal: controller?.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawCity = data.city || data.locality || data.principalSubdivision;
        if (rawCity) {
          const detectedCity = normalizeCityName(rawCity);
          const lat = data.latitude || 12.9716;
          const lon = data.longitude || 77.5946;
          await saveLocationToStorage(detectedCity, `${detectedCity}, ${data.principalSubdivision || 'India'}`, { latitude: lat, longitude: lon });
          return {
            success: true,
            city: detectedCity,
            fullLocation: `${detectedCity}, ${data.principalSubdivision || 'India'}`,
            coords: { latitude: lat, longitude: lon },
            source: 'ip',
          };
        }
      }
    } catch (ipErr) {
      console.log('[LocationHelper] IP fallback error:', ipErr?.message);
    }

    // 4. Fallback: do not silently substitute an unrelated default city
    return {
      success: false,
      city: null,
      fullLocation: null,
      coords: null,
      source: 'none',
    };
  } catch (err) {
    return {
      success: false,
      city: null,
      fullLocation: null,
      coords: null,
      source: 'none',
    };
  }
};

export default {
  requestLocationPermissionWebSafe,
  getCurrentPositionWebSafe,
  reverseGeocodeWebSafe,
  geocodeWebSafe,
  detectUserLocationWithAddress,
  detectAutoLocation,
  detectPhoneGPSLocation,
  normalizeCityName,
  saveLocationToStorage,
  getClosestMysoreLocality,
  calculateDistanceKm,
  MYSORE_LOCALITIES,
};
