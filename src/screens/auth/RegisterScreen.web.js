import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import HomeScreenWeb from '../home/HomeScreen.web';

const RegisterScreenWeb = (props) => {
  const { navigation, route } = props;

  useEffect(() => {
    try {
      if (navigation?.replace) {
        navigation.replace('MainApp', { screen: 'Home' });
      } else if (navigation?.navigate) {
        navigation.navigate('MainApp', { screen: 'Home' });
      }
    } catch (e) {
      console.warn('[RegisterScreenWeb] Navigation redirect to Home:', e);
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { tab: 'register' } }));
      }, 300);
    }
  }, [navigation]);

  return <HomeScreenWeb navigation={navigation} route={route} />;
};

export default RegisterScreenWeb;
