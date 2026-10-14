import React from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import {
  NavigationContainer,
  getStateFromPath,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import FloatingAiBotIcon from '../components/web/FloatingAiBotIcon';
import { AuthGuardProvider } from '../context/AuthGuardContext';
import { navigationRef } from './navigationRef';

export { navigationRef };

const Stack = createNativeStackNavigator();

const BASE_URL = 'https://internship-ui.github.io/Mediunify-patient-side-application-';
const BASE_PATH = '/Mediunify-patient-side-application-';

const linking = {
  prefixes: [
    BASE_URL,
    'https://internship-ui.github.io',
    'https://internship-ui.github.io/Mediunify-patient-side-application-',
    'https://hemanthgowdatn2003.github.io',
    'https://navabharth-technologies.github.io/Mediunify-patient-side-application-',
    '/Mediunify-patient-side-application-',
    '/mediunify-patient',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:19006',
    'exp://',
  ],
  getInitialURL: async () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window?.location?.href) {
        return window.location.href;
      }
      return null;
    }
    try {
      const { Linking } = require('react-native');
      return await Linking.getInitialURL();
    } catch (e) {
      return null;
    }
  },
  getStateFromPath: (path, options) => {
    let cleanPath = path || '';
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch (e) {}

    // Trim whitespace
    cleanPath = cleanPath.trim();

    // Map common URL variations with spaces, hyphens, and casing:
    // e.g. '/find doctors', '/find%20doctors', '/find_doctors', '/FindDoctors' -> '/find-doctors'
    if (cleanPath.match(/^\/?(find[\s%20_+-]+doctors|finddoctors)/i)) {
      cleanPath = '/find-doctors';
    } else if (cleanPath.match(/^\/?(doctor-list|doctors-list|doctorlist)/i)) {
      cleanPath = '/doctors';
    } else if (cleanPath.match(/^\/?bookings?/i)) {
      cleanPath = '/my-tests';
    } else if (cleanPath.match(/^\/?login/i)) {
      cleanPath = Platform.OS === 'web' ? '/home' : '/login';
    }

    try {
      const state = getStateFromPath(cleanPath, options);
      if (state) {
        return state;
      }
    } catch (err) {
      console.warn('[NavigationLinking] getStateFromPath parse error:', err);
    }

    // Safe fallback: On Web fallback to MainApp/Home, on Mobile fallback to Auth/Login
    if (Platform.OS === 'web') {
      return {
        routes: [
          {
            name: 'MainApp',
            state: {
              routes: [{ name: 'Home' }],
            },
          },
        ],
      };
    }

    return {
      routes: [
        {
          name: 'Auth',
          state: {
            routes: [{ name: 'Login' }],
          },
        },
      ],
    };
  },
  config: {
    screens: {
      Auth: {
        screens: {
          Login: {
            path: 'login',
            alias: Platform.OS === 'web' ? ['Login'] : ['Login', ''],
          },
          Splash: 'splash',
          Register: 'register',
          OTP: 'otp',
          ForgotPassword: 'forgot-password',
        },
      },
      MainApp: {
        screens: {
          Home: {
            path: 'home',
            alias: Platform.OS === 'web' ? ['home', 'Home', ''] : ['home', 'Home'],
          },
          LabTests: 'lab-tests',
          Imaging: {
            path: 'scan-xray',
            alias: ['scan-xray', 'scans-xray', 'radiology', 'Imaging', 'imaging'],
          },
          RadiologyLabs: {
            path: 'radiology-labs',
            alias: ['radiology-labs', 'radiology_labs', 'RadiologyLabs'],
          },
          Pharmacy: 'pharmacy',
          Cart: 'cart',
          Checkout: 'checkout',
          Payment: 'payment',
          OrderSuccess: {
            path: 'order-success',
            alias: ['order-success', 'order_success', 'OrderSuccess'],
          },
          RadiologyOrderSuccess: {
            path: 'radiology-order-success',
            alias: ['radiology-order-success', 'RadiologyOrderSuccess'],
          },
          FindDoctors: {
            path: 'find-doctors',
            alias: ['find doctors', 'find%20doctors', 'find_doctors', 'FindDoctors', 'finddoctors'],
          },
          DoctorList: {
            path: 'doctors',
            alias: ['doctor-list', 'doctors-list', 'DoctorList', 'doctorlist'],
          },
          DoctorBooking: {
            path: 'doctor-booking',
            alias: ['doctor-booking', 'DoctorBooking', 'doctor_booking'],
          },
          DoctorDetails: {
            path: 'doctor-details',
            alias: ['doctor-details', 'DoctorDetails', 'doctor_details'],
          },
          VideoConsultation: 'consultation',
          HospitalCare: 'hospital-care',
          HealthInsurance: 'insurance',
          NurseBooking: {
            path: 'home-care',
            alias: ['home-care', 'home-nursing', 'nurse-booking', 'nursing', 'home_care', 'home_nursing', 'NurseBooking', 'HomeNursing', 'HomeCare'],
          },
          Emergency: 'emergency',
          AyurvedaWellness: 'ayurveda-wellness',
          EquipmentRental: 'equipment-rental',
          AllServices: 'all-services',
          Chatbot: 'chatbot',
          Profile: 'profile',
          Membership: 'membership',
          MyAppointments: 'my-appointments',
          MyTests: {
            path: 'my-tests',
            alias: ['my-tests', 'my_tests', 'MyTests', 'bookings', 'Bookings'],
          },
          MyMedicineOrders: {
            path: 'my-medicine-orders',
            alias: ['my-medicine-orders', 'my_medicine_orders', 'MyMedicineOrders', 'my-orders', 'MyOrders', 'my_orders'],
          },
          MyMedicalRecords: 'my-medical-records',
          MyOnlineConsultations: {
            path: 'my-online-consultations',
            alias: ['my_online_consultations', 'MyOnlineConsultations', 'online-consultations', 'my-consultations'],
          },
          OnlineConsultant: {
            path: 'online-consultant',
            alias: ['online_consultant', 'OnlineConsultant'],
          },
          MyFeedback: 'my-feedback',
          Settings: 'settings',
          Notifications: {
            path: 'alerts',
            alias: ['alerts', 'Alerts', 'notifications', 'Notifications'],
          },
          Alerts: 'alerts',
          TransactionHistory: {
            path: 'history',
            alias: ['history', 'History', 'transaction-history', 'TransactionHistory', 'payment-history'],
          },
          History: 'history',
        },
      },
    },
  },
};


const AppNavigator = () => {
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      fallback={
        <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00B894" />
        </View>
      }
    >
      <AuthGuardProvider>
        <View style={{ flex: 1 }}>
          <Stack.Navigator
            initialRouteName={Platform.OS === 'web' ? 'MainApp' : 'Auth'}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
            />

            <Stack.Screen
              name="MainApp"
              component={MainNavigator}
            />
          </Stack.Navigator>

          {Platform.OS === 'web' && <FloatingAiBotIcon />}
        </View>
      </AuthGuardProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;