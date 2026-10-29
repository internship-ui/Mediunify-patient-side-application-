import React, { useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import colors from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../utils/themeStyles';
import { safeNavigateToMain } from '../../utils/navigationHelper';
import LoginScreenWeb from './LoginScreen.web';

const SplashScreen = (props) => {
  const { isDarkMode, theme } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const { navigation } = props;

  if (Platform.OS === 'web') {
    return <LoginScreenWeb {...props} />;
  }

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const loggedIn = await AsyncStorage.getItem('isLoggedIn');
        if (loggedIn === 'true') {
          if (isMounted) {
            safeNavigateToMain(navigation);
          }
          return;
        }
      } catch (e) {}

      if (isMounted) {
        navigation.replace('Login');
      }
    };

    if (Platform.OS === 'web') {
      checkAuth();
      return () => {
        isMounted = false;
      };
    }

    const timer = setTimeout(checkAuth, 1800);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [navigation]);


  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && { backgroundColor: '#080E1A' }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#080E1A' : '#FFFFFF'} />

      <View style={styles.container}>

        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />


        <Text style={styles.tagline}>
          Bringing Healthcare Together
        </Text>


        <View style={styles.loadingContainer}>

          <View style={styles.loadingCircle} />

        </View>

      </View>

    </SafeAreaView>
  );
};


const baseStyles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  logo: {
    width: 300,
    height: 240,
    marginBottom: 15,
  },

  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.3,
  },

  loadingContainer: {
    marginTop: 35,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.lightTeal,
    borderTopColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },

});


export default SplashScreen;