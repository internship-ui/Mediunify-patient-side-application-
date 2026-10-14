import React, { useState } from 'react';

import {
  View,
  StyleSheet,
} from 'react-native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  Ionicons,
} from '@expo/vector-icons';

import colors from '../theme/colors';

import HomeScreen from '../screens/home/HomeScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';

import FindDoctorsScreen from '../screens/services/doctors/FindDoctorsScreen';
import DoctorListScreen from '../screens/services/doctors/DoctorListScreen';
import DoctorDetailsScreen from '../screens/services/doctors/DoctorDetailsScreen';
import DoctorBookingScreen from '../screens/services/doctors/DoctorBookingScreen';

import HospitalListScreen from '../screens/services/surgery/HospitalListScreen';

import VideoBookingScreen from '../screens/services/videocall/VideoBookingScreen';
import VideoConsultationScreen from '../screens/services/videocall/VideoConsultationScreen';
import VideoMeetingScreen from '../screens/services/videocall/VideoMeetingScreen';

import LabTestsScreen from '../screens/services/lab/LabTestsScreen';
import LabBookingScreen from '../screens/services/lab/LabBookingScreen';

import PharmacyScreen from '../screens/services/pharmacy/PharmacyScreen';
import PharmacyStoreDetailScreen from '../screens/services/pharmacy/PharmacyStoreDetailScreen';
import PharmacyLocationScreen from '../screens/services/pharmacy/PharmacyLocationScreen';

import ImagingScreen from '../screens/services/radiology/ImagingScreen';

import SurgeryScreen from '../screens/services/surgery/SurgeryScreen';
import HospitalSurgeryDetailsScreen from '../screens/services/surgery/HospitalSurgeryDetailsScreen';
import SurgeryQuoteRequestScreen from '../screens/services/surgery/SurgeryQuoteRequestScreen';
import HealthInsuranceScreen from '../screens/services/insurance/HealthInsuranceScreen';
import NurseBookingScreen from '../screens/services/nurse/NurseBookingScreen';
import EmergencyScreen from '../screens/services/emergency/EmergencyScreen';
import AyurvedaWellnessScreen from '../screens/services/ayurveda/AyurvedaWellnessScreen';
import EquipmentRentalScreen from '../screens/services/equipment/EquipmentRentalScreen';

import RadiologyLabsScreen from '../screens/services/radiology/RadiologyLabsScreen';
import RadiologyOrderSuccessScreen from '../screens/services/radiology/RadiologyOrderSuccessScreen';


import ChatbotScreen from '../screens/chatbot/ChatbotScreen';

import HealthMonitorScreen from '../screens/health/HealthMonitorScreen';
import HealthRecordsScreen from '../screens/health/HealthRecordsScreen';

import MyTestsScreen from '../screens/services/lab/MyTestsScreen';
import BookingDetailsScreen from '../screens/services/booking/BookingDetailsScreen';

import GlobalSearchScreen from '../screens/search/GlobalSearchScreen';

import ProfileScreen from '../screens/profile/ProfileScreen';
import TransactionHistoryScreen from '../screens/profile/TransactionHistoryScreen';
import WalletScreen from '../screens/profile/WalletScreen';
import ReferEarnScreen from '../screens/profile/ReferEarnScreen';


const Stack = createNativeStackNavigator();


// ==================================================
// BOTTOM NAVIGATION
// ==================================================

const BottomNavigation = ({
  navigation,
  currentRoute,
}) => {

  const goTo = (route) => {

    console.log('BOTTOM NAVIGATION:', route);

    navigation.navigate(route);

  };


  return (

    <View style={styles.bottomNavigation}>

      {/* HOME */}

      <TouchableOpacity
        style={styles.bottomItem}
        activeOpacity={0.8}
        onPress={() => goTo('Home')}
      >

        <View
          style={[
            styles.bottomIcon,
            currentRoute === 'Home' &&
              styles.activeBottomIcon,
          ]}
        >

          <Ionicons
            name={
              currentRoute === 'Home'
                ? 'home'
                : 'home-outline'
            }
            size={22}
            color={
              currentRoute === 'Home'
                ? colors.white
                : colors.secondary
            }
          />

        </View>

        <Text
          style={[
            styles.bottomText,
            currentRoute === 'Home' &&
              styles.activeBottomText,
          ]}
        >
          Home
        </Text>

      </TouchableOpacity>


      {/* IN-PERSON */}

      <TouchableOpacity
        style={styles.bottomItem}
        activeOpacity={0.8}
        onPress={() => goTo('DoctorList')}
      >

        <View
          style={[
            styles.bottomIcon,
            currentRoute === 'DoctorList' &&
              styles.activeBottomIcon,
          ]}
        >

          <Ionicons
            name={
              currentRoute === 'DoctorList'
                ? 'medical'
                : 'medical-outline'
            }
            size={22}
            color={
              currentRoute === 'DoctorList'
                ? colors.white
                : colors.secondary
            }
          />

        </View>

        <Text
          style={[
            styles.bottomText,
            currentRoute === 'DoctorList' &&
              styles.activeBottomText,
          ]}
        >
          In-Person
        </Text>

      </TouchableOpacity>


      {/* VIDEO */}

      <TouchableOpacity
        style={styles.bottomItem}
        activeOpacity={0.8}
        onPress={() =>
          goTo('VideoConsultation')
        }
      >

        <View
          style={[
            styles.bottomIcon,
            currentRoute === 'VideoConsultation' &&
              styles.activeBottomIcon,
          ]}
        >

          <Ionicons
            name={
              currentRoute === 'VideoConsultation'
                ? 'videocam'
                : 'videocam-outline'
            }
            size={22}
            color={
              currentRoute === 'VideoConsultation'
                ? colors.white
                : colors.secondary
            }
          />

        </View>

        <Text
          style={[
            styles.bottomText,
            currentRoute === 'VideoConsultation' &&
              styles.activeBottomText,
          ]}
        >
          Video
        </Text>

      </TouchableOpacity>


      {/* ACCOUNT */}

      <TouchableOpacity
        style={styles.bottomItem}
        activeOpacity={0.8}
        onPress={() => goTo('Profile')}
      >

        <View
          style={[
            styles.bottomIcon,
            currentRoute === 'Profile' &&
              styles.activeBottomIcon,
          ]}
        >

          <Ionicons
            name={
              currentRoute === 'Profile'
                ? 'person'
                : 'person-outline'
            }
            size={22}
            color={
              currentRoute === 'Profile'
                ? colors.white
                : colors.secondary
            }
          />

        </View>

        <Text
          style={[
            styles.bottomText,
            currentRoute === 'Profile' &&
              styles.activeBottomText,
          ]}
        >
          Account
        </Text>

      </TouchableOpacity>

    </View>
  );
};


// ==================================================
// MAIN STACK SCREEN
// ==================================================

const MainStackScreen = () => {

  const [currentRoute, setCurrentRoute] =
    useState('Home');


  return (

    <View style={styles.container}>

      <Stack.Navigator

        initialRouteName="Home"

        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#F4F8FA',
          },
        }}

        screenListeners={{
          state: (event) => {

            const state =
              event.data.state;

            if (!state) {
              return;
            }

            const route =
              state.routes[state.index];

            if (route) {

              setCurrentRoute(
                route.name
              );

            }

          },
        }}

      >

        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="GlobalSearch"
          component={GlobalSearchScreen}
        />

        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
        />

        <Stack.Screen
          name="Chatbot"
          component={ChatbotScreen}
        />

        <Stack.Screen
          name="FindDoctors"
          component={FindDoctorsScreen}
        />

        <Stack.Screen
          name="DoctorList"
          component={DoctorListScreen}
        />

        <Stack.Screen
          name="DoctorDetails"
          component={DoctorDetailsScreen}
        />

        <Stack.Screen
          name="DoctorBooking"
          component={DoctorBookingScreen}
        />

        <Stack.Screen
          name="HospitalList"
          component={HospitalListScreen}
        />

        <Stack.Screen
          name="HospitalCare"
          component={SurgeryScreen}
        />

        <Stack.Screen
          name="HospitalSurgeryDetails"
          component={HospitalSurgeryDetailsScreen}
        />

        <Stack.Screen
          name="SurgeryQuoteRequest"
          component={SurgeryQuoteRequestScreen}
        />

        <Stack.Screen
          name="HealthInsurance"
          component={HealthInsuranceScreen}
        />

        <Stack.Screen
          name="NurseBooking"
          component={NurseBookingScreen}
        />

        <Stack.Screen
          name="AyurvedaWellness"
          component={AyurvedaWellnessScreen}
        />


        <Stack.Screen
          name="EquipmentRental"
          component={EquipmentRentalScreen}
        />

        <Stack.Screen
          name="VideoConsultation"
          component={VideoConsultationScreen}
        />

        <Stack.Screen
          name="VideoBooking"
          component={VideoBookingScreen}
        />

        <Stack.Screen
          name="VideoMeeting"
          component={VideoMeetingScreen}
        />

        <Stack.Screen
          name="LabTests"
          component={LabTestsScreen}
        />

        <Stack.Screen
          name="LabBooking"
          component={LabBookingScreen}
        />

        <Stack.Screen
          name="Pharmacy"
          component={PharmacyScreen}
        />

        <Stack.Screen
          name="PharmacyStoreDetail"
          component={PharmacyStoreDetailScreen}
        />

        <Stack.Screen
          name="PharmacyLocation"
          component={PharmacyLocationScreen}
        />

        <Stack.Screen
          name="Imaging"
          component={ImagingScreen}
        />

        <Stack.Screen
          name="Emergency"
          component={EmergencyScreen}
        />

        <Stack.Screen
          name="HealthRecords"
          component={HealthRecordsScreen}
        />

        <Stack.Screen
          name="RadiologyLabs"
          component={RadiologyLabsScreen}
        />

        <Stack.Screen
          name="RadiologyLabDetails"
          component={ImagingScreen}
        />

        <Stack.Screen
          name="RadiologyBooking"
          component={ImagingScreen}
        />

        <Stack.Screen
          name="RadiologyPayment"
          component={ImagingScreen}
        />

        <Stack.Screen
          name="RadiologyOrderSuccess"
          component={RadiologyOrderSuccessScreen}
        />

        <Stack.Screen
          name="RadiologistList"
          component={RadiologyLabsScreen}
        />

        <Stack.Screen
          name="RadiologistBooking"
          component={ImagingScreen}
        />

        <Stack.Screen
          name="Bookings"
          component={MyTestsScreen}
        />

        <Stack.Screen
          name="BookingDetails"
          component={BookingDetailsScreen}
        />

        <Stack.Screen
          name="HealthMonitor"
          component={HealthMonitorScreen}
        />

        <Stack.Screen
          name="HealthRecords"
          component={HealthRecordsScreen}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />

        <Stack.Screen
          name="TransactionHistory"
          component={TransactionHistoryScreen}
        />

        <Stack.Screen
          name="Wallet"
          component={WalletScreen}
        />

        <Stack.Screen
          name="ReferEarn"
          component={ReferEarnScreen}
        />

      </Stack.Navigator>


      {/* IMPORTANT:
          This navigation object now comes
          from the Stack Navigator above.
      */}

      <BottomNavigation
        currentRoute={currentRoute}
      />

    </View>
  );
};


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F4F8FA',
  },

  bottomNavigation: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    height: 72,
    borderRadius: 28,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 100,
  },

  bottomItem: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomIcon: {
    width: 42,
    height: 35,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeBottomIcon: {
    backgroundColor: colors.primary,
  },

  bottomText: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
  },

  activeBottomText: {
    color: colors.primary,
    fontWeight: '900',
  },

});


export default MainStackScreen;