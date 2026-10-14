import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { showAlert } from './alert';

/**
 * Check if the user is in Guest mode or not authenticated
 */
export const isGuestUser = async () => {
  try {
    const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
    const isGuest = await AsyncStorage.getItem('@unnathi_is_guest');
    const userStr = (await AsyncStorage.getItem('user')) || (await AsyncStorage.getItem('@unnathi_primary_user'));
    if (isGuest === 'true' || isLoggedIn !== 'true' || !userStr) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
};

/**
 * Get current authentication summary
 */
export const getAuthStatus = async () => {
  try {
    const isLoggedInStr = await AsyncStorage.getItem('isLoggedIn');
    const isGuestStr = await AsyncStorage.getItem('@unnathi_is_guest');
    const userStr = await AsyncStorage.getItem('user') || await AsyncStorage.getItem('@unnathi_primary_user');
    const isLoggedIn = isLoggedInStr === 'true' && isGuestStr !== 'true';
    const isGuest = !isLoggedIn;
    let user = null;
    if (userStr && isLoggedIn) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {}
    }
    return { isLoggedIn, isGuest, user };
  } catch (e) {
    return { isLoggedIn: false, isGuest: true, user: null };
  }
};

/**
 * Service-specific Login Required Prompts
 */
export const SERVICE_LOGIN_MESSAGES = {
  doctor: 'Please login to continue with this booking.',
  videocall: 'Please login to continue with this online consultation.',
  pharmacy: 'Please login to order medicines.',
  cart: 'Please login to proceed with your order.',
  lab: 'Please login to book this test.',
  radiology: 'Please login to book this scan.',
  equipment: 'Please login to request equipment.',
  nursing: 'Please login to submit a care request.',
  surgery: 'Please login to request a surgery quote.',
  payment: 'Please login before making a payment.',
  family: 'Please login to manage family members.',
  membership: 'Please login to continue with membership.',
  appointments: 'Please login to view your appointments.',
  orders: 'Please login to view your medicine orders.',
  notifications: 'Please login to view your notifications.',
  profile: 'Please login to access your profile.',
  general: 'Please login to continue.',
};

/**
 * Prompt user when attempting a guest-restricted action
 */
export const promptLoginRequired = (navigation, options = {}) => {
  const {
    service = 'general',
    title = 'Login Required',
    message,
    onLogin,
    onCancel,
  } = options;

  const msg = message || SERVICE_LOGIN_MESSAGES[service] || SERVICE_LOGIN_MESSAGES.general;

  const handleNavigateToLogin = () => {
    if (onLogin) {
      onLogin();
      return;
    }
    if (navigation) {
      const parent = navigation.getParent?.();
      if (parent?.navigate) {
        try {
          parent.navigate('Auth', { screen: 'Login' });
          return;
        } catch (e) {}
      }
      if (navigation.navigate) {
        try {
          navigation.navigate('Auth', { screen: 'Login' });
          return;
        } catch (e) {}
        try {
          navigation.navigate('Login');
          return;
        } catch (e) {}
      }
    }
  };

  showAlert(
    title,
    msg,
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: onCancel || (() => {}),
      },
      {
        text: 'Login',
        onPress: handleNavigateToLogin,
      },
    ]
  );
};
