import React, { useEffect } from 'react';
import HomeScreenWeb from '../home/HomeScreen.web';

const LoginScreenWeb = (props) => {
  const { navigation, route } = props;

  useEffect(() => {
    try {
      if (navigation?.replace) {
        navigation.replace('MainApp', { screen: 'Home' });
      } else if (navigation?.navigate) {
        navigation.navigate('MainApp', { screen: 'Home' });
      }
    } catch (e) {
      console.warn('[LoginScreenWeb] Navigation redirect to Home:', e);
    }
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { tab: 'login' } }));
      }, 300);
    }
  }, [navigation]);

  return <HomeScreenWeb navigation={navigation} route={route} />;
};

export default LoginScreenWeb;
