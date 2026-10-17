# MediUnify Healthcare Application — Full Project Architecture & Function Reference

> **Application Name**: MediUnify (Patient Side Application)  
> **Framework**: React Native 0.86.3 / Expo SDK 57 (Cross-Platform: Web, Android, iOS)  
> **Language**: JavaScript (ES6+ / React 19.2)  
> **Styling**: Vanilla React Native `StyleSheet` & Dynamic Theme System (Light / Dark)  
> **Deployment**: Responsive Desktop & Mobile Web (GitHub Pages / Standalone PWA), Native Android & iOS  

---

## 1. Project Overview & Architecture

MediUnify is an enterprise-grade healthcare mobile and web application for patients in Karnataka (Mysore, Bengaluru, and surrounding regions). It serves as an integrated digital healthcare hub providing:
- **Doctor Consultations**: In-clinic appointments & real-time HD video consultations.
- **Diagnostics & Pathology**: Doorstep lab sample collection and certified center bookings.
- **Radiology & Advanced Imaging**: MRI, CT scans, Ultrasound, X-Ray, 2D Echo, Mammography across accredited imaging centers with slot selection and prescription upload.
- **Doorstep Pharmacy**: Medicine ordering with prescription verification, 15–45 min express delivery, and multi-pharmacy store carts.
- **Hospital & Surgery Care**: Surgery cost estimators, quote requests, and cashless hospital admissions.
- **Fertility & IVF Specialized Care**: End-to-end journey tracker for IVF/IUI, clinic comparisons, doctor profiles, egg freezing, consent management, and dedicated care coordinators.
- **Home Healthcare**: Equipment rentals (ICU beds, oxygen concentrators, wheelchairs) and verified home nursing visits.
- **Ayurveda & Panchakarma**: Holistic therapies, AYUSH-certified Vaidyas, and herbal remedies.
- **MediUnify Care+ VIP Membership**: Savings calculator, discounted consultations, free express deliveries, and health checkups.
- **Health Records & Digital Vault**: Electronic health records (EHR), prescriptions, lab reports, and vital stats monitoring.
- **24/7 AI Clinical Assistant**: Intelligent triage, symptom analysis, and instant doctor recommendations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│   Web Header (Desktop)  │  Bottom Tabs (Mobile)  │  Dynamic Modals    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                           NAVIGATION LAYER                             │
│   AppNavigator  ──>  AuthNavigator (Login, Register, OTP, ForgotPass)  │
│                 ──>  MainNavigator (50+ Stack Screens & Sub-flows)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        STATE & CONTEXT LAYER                           │
│   CartContext: Multi-service cart (Pharmacy, Lab, Radiology, Orders)   │
│   ThemeContext: Dark/Light Mode, Multi-lingual (5 Languages), Alerts  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     DATA & LOCAL PERSISTENCE LAYER                     │
│   dataSyncService.js  (Decoupled Client-Side Storage Adapter)          │
│   AsyncStorage (Local Cache & State — Ready for Node.js Backend API)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
d:/unnathi healthcare app/front-end design/
├── App.js                      # Root application entry point
├── app.json                    # Expo configuration & app metadata
├── package.json                # Project dependencies and build scripts
├── scripts/
│   ├── patchGhPages.js         # Post-export bundle & asset patcher for GitHub Pages
│   └── patchExpoAsset.js       # Compatibility patch for expo-asset
├── src/
│   ├── components/             # Reusable UI widgets, cards, inputs, and modals
│   │   ├── booking/            # Doctor booking modals
│   │   ├── fertility/          # 18 specialized IVF/fertility UI components
│   │   └── web/                # Desktop WebHeader and WebFooter
│   ├── context/
│   │   ├── CartContext.js      # Global cart, pricing, orders, and checkout state
│   │   └── ThemeContext.js     # Light/dark theme, localization, and preferences
│   ├── data/                   # Mock & seed databases for doctors, labs, products
│   ├── navigation/             # Navigation stacks, tab navigators, route configs
│   ├── screens/
│   │   ├── auth/               # Login, Register, OTP, Password recovery
│   │   ├── chatbot/            # MediUnify AI Assistant chat interface
│   │   ├── health/             # Health vault, vitals, prescriptions, reports
│   │   ├── home/               # Homepage dashboard & notification center
│   │   ├── profile/            # User profile, wallet, family, transactions
│   │   ├── search/             # Global federated search screen
│   │   ├── services/           # All healthcare service screen modules:
│   │   │   ├── ayurveda/       # Ayurvedic wellness & Panchakarma
│   │   │   ├── booking/        # Central appointment history & details
│   │   │   ├── doctors/        # Doctor search, profile, and slot booking
│   │   │   ├── emergency/      # Emergency SOS & ambulance dispatch
│   │   │   ├── equipment/      # Medical equipment rentals
│   │   │   ├── fertility/      # 20 IVF & fertility journey screens
│   │   │   ├── hospitals/      # Hospital admissions & surgery packages
│   │   │   ├── insurance/      # Health insurance comparison & claims
│   │   │   ├── lab/            # Pathology lab tests & home sample collection
│   │   │   ├── membership/     # Care+ VIP membership tier plans
│   │   │   ├── nurse/          # Home nursing service booking
│   │   │   ├── pharmacy/       # Medicine catalog, cart, multi-store checkout
│   │   │   ├── radiology/      # MRI/CT/Ultrasound labs, radiologists, booking
│   │   │   └── videocall/      # Telemedicine booking & live video meeting
│   │   └── settings/           # App settings, language switch, support
│   ├── services/
│   │   └── dataSyncService.js  # Bi-directional client sync service with fallback
│   ├── theme/
│   │   ├── colors.js           # Core color palette & branding constants
│   │   ├── fonts.js            # Font family definitions
│   │   └── spacing.js          # Layout padding & margin metrics
│   └── utils/
│       ├── alert.js            # Universal cross-platform alert helper
│       ├── constants.js        # Global app constants, city coords, timeouts
│       ├── locationHelper.js   # Geolocation & reverse geocoding utility
│       ├── navigationHelper.js # Central navigation dispatchers
│       └── validation.js       # Form validators (phone, email, password)
```

---

## 3. Global Contexts & State Functions

### 3.1 `CartContext.js` (`src/context/CartContext.js`)
Manages separate, independent carts for Pharmacy, Pathology Lab Tests, and Radiology Scans, with multi-vendor grouping, coupon logic, and order creation.

| Function / State | Type | Description |
|---|---|---|
| `pharmacyCart` | State (`Array`) | Medicines and over-the-counter pharmacy items in cart |
| `labCart` | State (`Array`) | Pathology/blood diagnostic tests and health packages in cart |
| `radiologyCart` | State (`Array`) | Diagnostic imaging scans (MRI, CT, Ultrasound, X-Ray) in cart |
| `orders` | State (`Array`) | List of all completed and active user orders |
| `selectedPharmacyStore` | State (`Object`) | Active partner pharmacy selected for fulfillment |
| `selectedAddress` | State (`Object`) | Current delivery/sample collection address |
| `appliedCoupon` | State (`Object`) | Currently applied discount coupon |
| `addToCart(product, qty, forcedType, store)` | Function | Automatically classifies product into radiology, lab, or pharmacy cart and increments quantity |
| `addRadiologyScanToCart(scan, qty)` | Function | Explicit helper to add an imaging scan to the radiology cart |
| `addLabTestToCart(test, qty)` | Function | Explicit helper to add a pathology test to the lab cart |
| `addPharmacyProductToCart(item, qty)` | Function | Explicit helper to add medicines to the pharmacy cart |
| `increaseQuantity(id, cartType, storeId)` | Function | Increments quantity of an item in the designated cart |
| `decreaseQuantity(id, cartType, storeId)` | Function | Decrements item quantity, removing if count reaches zero |
| `removeFromCart(id, cartType, storeId)` | Function | Removes an item completely from the cart |
| `clearCart(cartType)` | Function | Clears specific cart (`pharmacy`, `lab`, `radiology`) or all carts |
| `applyCoupon(code)` | Function | Validates and applies promo codes (`UNNATHI20`, `HEALTH50`, `FIRSTFREE`) |
| `removeCoupon()` | Function | Resets applied coupon state |
| `setSelectedPharmacyStore(store)` | Function | Updates and persists chosen partner pharmacy in `AsyncStorage` |
| `updateAddress(address)` | Function | Updates and persists active delivery address |
| `addOrder(newOrder)` | Function | Appends new order to state, saves to `AsyncStorage`, and triggers server sync |
| `requestProductReturn(orderId, payload)` | Function | Submits return request with scheduled pickup details |
| `groupedPharmacyCarts` | Memo (`Array`) | Automatically groups medicines by store with separate totals & delivery fees |
| `groupedHospitalCarts` | Memo (`Array`) | Groups lab tests by diagnostic center/hospital |
| `groupedRadiologyCarts` | Memo (`Array`) | Groups imaging tests by scan center/radiology lab |
| `clearPharmacyStoreCart(storeId)` | Function | Clears items for a single pharmacy store |
| `clearHospitalCart(labId)` | Function | Clears items for a single diagnostic hospital |
| `clearRadiologyCenterCart(labId)` | Function | Clears items for a single imaging center |
| `pharmacyFinalTotal`, `labFinalTotal`, `radiologyFinalTotal` | Memos (`Number`) | Computes subtotals, packaging, delivery fees, and coupon discounts |

---

### 3.2 `ThemeContext.js` (`src/context/ThemeContext.js`)
Manages UI theme modes, internationalization across 5 Indian languages, biometric flags, and notification preferences.

| Function / State | Type | Description |
|---|---|---|
| `isDarkMode` | State (`Boolean`) | Active dark theme boolean |
| `toggleDarkMode()` | Function | Toggles between Dark (`#0B1120`) and Light (`#F4F8FA`) themes with persistence |
| `language` | State (`String`) | Current language code (`en`, `kn`, `hi`, `te`, `ta`) |
| `changeLanguage(code)` | Function | Updates active language and persists in `@unnathi_app_language` |
| `t(key)` | Function | Translation dictionary lookup function returning translated string |
| `notifications` | State (`Object`) | Toggles for Push, WhatsApp, and SMS alerts |
| `updateNotifications(key, val)`| Function | Updates notification preferences and persists to storage |
| `biometricEnabled` | State (`Boolean`) | Toggles biometric login requirement |
| `toggleBiometric(val)` | Function | Persists biometric setting in `@unnathi_biometric_enabled` |
| `theme` | Object | Full active color tokens (background, card, text, border, primary, etc.) |
| `LANGUAGES` | Constant (`Array`) | Available languages metadata with native names and flags |

---

## 4. Navigation & Screen Catalog

### 4.1 Navigation Structure
1. **`AppNavigator.js`**: Root controller checking auth session; switches between `AuthNavigator` and `MainNavigator`.
2. **`AuthNavigator.js`**:
   - `Login`: Credentials / phone login.
   - `Register`: New patient registration.
   - `ForgotPassword`: Mobile OTP recovery flow.
   - `OTP`: 6-digit OTP verification screen.
3. **`MainNavigator.js`**: Cross-platform responsive navigator.
   - Desktop Web: Rendered with persistent `WebHeader.js` (mega dropdowns, city selector, search bar, VIP link, cart dropdown, notifications, profile).
   - Mobile: Rendered with adaptive `BottomNavigation` (Home, Doctors, Pharmacy, Care+, Profile).

---

### 4.2 Complete Screen List & Key Functions

#### A. Core & Home
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `HomeScreen` | `src/screens/home/HomeScreen.js` | Top quick-access banners, category shortcuts, Care+ VIP promo, urgent care widgets, personalized recommendations |
| `NotificationsScreen` | `src/screens/home/NotificationsScreen.js` | Push alerts, appointment reminders, lab report readiness, order updates |
| `GlobalSearchScreen` | `src/screens/search/GlobalSearchScreen.js` | Federated cross-service search covering doctors, medicines, lab tests, and scans |

#### B. Doctors & Consultations
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `DoctorListScreen` | `src/screens/services/doctors/DoctorListScreen.js` | Specialty filtering, doctor search, fees, experience, ratings, OPD hours |
| `DoctorDetailsScreen` | `src/screens/services/doctors/DoctorDetailsScreen.js` | Full doctor biography, hospital affiliation, consultation modes, reviews |
| `DoctorBookingScreen` | `src/screens/services/doctors/DoctorBookingScreen.js` | Date picker, slot selection, patient details, clinic vs video toggle, payment |

#### C. Video Consultations (Telemedicine)
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `VideoBookingScreen` | `src/screens/services/videocall/VideoBookingScreen.js` | Instant video call booking (under 15 mins) or scheduled specialist sessions |
| `VideoConsultationScreen` | `src/screens/services/videocall/VideoConsultationScreen.js` | Active consultation queue, doctor status, patient notes entry |
| `VideoMeetingScreen` | `src/screens/services/videocall/VideoMeetingScreen.js` | Live video consultation call room with camera/mic controls, chat, end call |

#### D. Diagnostics & Pathology Lab
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `LabTestsScreen` | `src/screens/services/lab/LabTestsScreen.js` | Catalog of 100+ lab tests and full-body health checkup packages with fast add-to-cart |
| `LabBookingScreen` | `src/screens/services/lab/LabBookingScreen.js` | Sample collection slot booking (doorstep phlebotomist vs lab visit), patient selector |

#### E. Radiology & Diagnostic Imaging (Scans & X-Ray)
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `ImagingScreen` / `ImagingScreen.web` | `src/screens/services/radiology/ImagingScreen.web.js` | Unified Master Flow: Modality-specific categories (MRI, CT, PET-CT, USG, X-Ray), tests, diagnostic centres, 3-step booking wizard, payment, directions, and My Bookings across Web & Mobile |
| `RadiologyLabsScreen` | `src/screens/services/radiology/RadiologyLabsScreen.js` | Cross-platform navigation entry point for diagnostic scan centres and search integration |
| `RadiologyOrderSuccessScreen` | `src/screens/services/radiology/RadiologyOrderSuccessScreen.js` | Deep-link / confirmation entry point routing to confirmed bookings |

#### F. Doorstep Pharmacy & Medicines
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `PharmacyScreen` | `src/screens/services/pharmacy/PharmacyScreen.js` | Medicine search, categories (Prescription, OTC, Diabetes, Cardiac), quick add |
| `PharmacyStoreDetailScreen` | `src/screens/services/pharmacy/PharmacyStoreDetailScreen.js` | Specific store catalog (Apollo, MedPlus, Jan Aushadhi), localized inventory |
| `PharmacyLocationScreen` | `src/screens/services/pharmacy/PharmacyLocationScreen.js` | GPS location picker, radius filter (3km, 5km, 10km) for partner pharmacies |
| `ProductDetailsScreen` | `src/screens/services/pharmacy/ProductDetailsScreen.js` | Composition, dosage, side effects, manufacturer, price comparison, quantity selector |
| `CartScreen` | `src/screens/services/pharmacy/CartScreen.js` | Dedicated multi-service cart view, coupon entry, multi-store breakdown |
| `CheckoutScreen` | `src/screens/services/pharmacy/CheckoutScreen.js` | Address selection, delivery speed choice (Express 15m vs Standard), billing summary |
| `PaymentScreen` | `src/screens/services/pharmacy/PaymentScreen.js` | Payment gateway interface (UPI PhonePe/GPay, Credit/Debit card, COD, MediCoins) |
| `OrderSuccessScreen` | `src/screens/services/pharmacy/OrderSuccessScreen.js` | Order tracking visualizer, estimated delivery timeline, receipt generation |
| `MyOrdersScreen` | `src/screens/services/pharmacy/MyOrdersScreen.js` | Full pharmacy and diagnostic order history, re-order, return request modal |

#### G. Hospitals, Surgeries & Insurance
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `HospitalListScreen` | `src/screens/services/hospitals/HospitalListScreen.js` | Directory of multi-specialty hospitals, ICU bed availability, emergency contacts |
| `HospitalCareScreen` | `src/screens/services/hospitals/HospitalCareScreen.js` | Surgery categories (Orthopedic, Cataract, Laparoscopy, Cardiac, Hernia) |
| `HospitalSurgeryDetailsScreen` | `src/screens/services/hospitals/HospitalSurgeryDetailsScreen.js` | Cost ranges, recovery time, hospital stay duration, surgeon qualifications |
| `SurgeryQuoteRequestScreen` | `src/screens/services/hospitals/SurgeryQuoteRequestScreen.js` | Request tailored cashless quote and free hospital coordinator consultation |
| `HealthInsuranceScreen` | `src/screens/services/insurance/HealthInsuranceScreen.js` | Cashless policy check, TPA claim assistance, policy comparison |

#### H. Fertility & IVF Comprehensive Care
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `FertilityIvfScreen` | `src/screens/services/fertility/FertilityIvfScreen.js` | Fertility care homepage, milestone roadmap, treatment options overview |
| `FertilitySpecialistsScreen` | `src/screens/services/fertility/FertilitySpecialistsScreen.js` | Senior reproductive endocrinologists and embryologists |
| `FertilityDoctorProfileScreen` | `src/screens/services/fertility/FertilityDoctorProfileScreen.js` | Specialist clinical background, IVF success rates, consultation slots |
| `FertilityClinicsScreen` | `src/screens/services/fertility/FertilityClinicsScreen.js` | List of accredited IVF centers and embryology labs in Karnataka |
| `FertilityClinicProfileScreen` | `src/screens/services/fertility/FertilityClinicProfileScreen.js` | Center technology, lab certifications (ICMR), pricing plans, patient stories |
| `CompareClinicsScreen` | `src/screens/services/fertility/CompareClinicsScreen.js` | Side-by-side clinic comparison on success rates, costs, and facilities |
| `FertilityCareRequestScreen` | `src/screens/services/fertility/FertilityCareRequestScreen.js` | Confidential consultation and second opinion intake form |
| `FertilityConsentScreen` | `src/screens/services/fertility/FertilityConsentScreen.js` | Digital consent forms, ICMR compliance documentation, digital signature |
| `FertilityTestsScreen` | `src/screens/services/fertility/FertilityTestsScreen.js` | Hormone profiling (AMH, FSH, LH), semen analysis, genetic screening tests |
| `FertilityTestDetailsScreen` | `src/screens/services/fertility/FertilityTestDetailsScreen.js` | Diagnostic preparation instructions, report interpretation guidelines |
| `IUIJourneyScreen` | `src/screens/services/fertility/IUIJourneyScreen.js` | Intrauterine Insemination cycle tracker and medication calendar |
| `IVFJourneyScreen` | `src/screens/services/fertility/IVFJourneyScreen.js` | Multi-stage IVF cycle tracker (Stimulation, Retrieval, Fertilization, Transfer) |
| `TreatmentDetailsScreen` | `src/screens/services/fertility/TreatmentDetailsScreen.js` | Step-by-step clinical explanations of fertility treatments |
| `IVFPackageScreen` | `src/screens/services/fertility/IVFPackageScreen.js` | All-inclusive IVF package pricing with 0% EMI financing options |
| `SecondOpinionScreen` | `src/screens/services/fertility/SecondOpinionScreen.js` | Submit prior IVF reports for evaluation by expert review panels |
| `MyFertilityJourneyScreen` | `src/screens/services/fertility/MyFertilityJourneyScreen.js` | Patient's active fertility treatment timeline, daily medications, and logs |
| `FertilityRecordsScreen` | `src/screens/services/fertility/FertilityRecordsScreen.js` | Encrypted vault for semen analysis, embryo grading reports, and ultrasounds |
| `FertilityInsuranceScreen` | `src/screens/services/fertility/FertilityInsuranceScreen.js` | Maternity & IVF insurance coverage checker, financing plans |
| `FertilityCoordinatorScreen` | `src/screens/services/fertility/FertilityCoordinatorScreen.js` | 1-on-1 direct chat and call with assigned fertility care manager |
| `FertilityNotificationsScreen`| `src/screens/services/fertility/FertilityNotificationsScreen.js`| Injection reminders, scan appointment alerts, medication timers |
| `FertilityAIScreen` | `src/screens/services/fertility/FertilityAIScreen.js` | Specialized AI assistant for fertility questions, cycle tracking, and advice |

#### I. Home Care, Nursing & Equipment
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `EquipmentRentalScreen` | `src/screens/services/equipment/EquipmentRentalScreen.js` | Monthly/daily medical equipment rental (Oxygen concentrators, ICU beds, CPAP) |
| `NurseBookingScreen` | `src/screens/services/nurse/NurseBookingScreen.js` | Certified home nurse visits (Wound dressing, injections, elderly care, post-op) |
| `AyurvedaWellnessScreen` | `src/screens/services/ayurveda/AyurvedaWellnessScreen.js` | Nadi Pariksha, Panchakarma therapy packages, herbal remedies |
| `EmergencyScreen` | `src/screens/services/emergency/EmergencyScreen.js` | 1-tap SOS ambulance booking, emergency dispatch, live GPS tracking |

#### J. Care+ VIP Membership
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `MembershipScreen` | `src/screens/services/membership/MembershipScreen.js` | Tier selection (Quarterly @ ₹165/3mos, Annual @ ₹499/yr), benefits calculator, instant activation modal |

#### K. Patient Health Vault & Monitoring
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `HealthMonitorScreen` | `src/screens/health/HealthMonitorScreen.js` | Vitals logging (Blood pressure, Blood glucose, SpO2, Heart rate, Weight, BMI) |
| `HealthRecordsScreen` | `src/screens/health/HealthRecordsScreen.js` | Document upload (Camera, Image Picker, PDF), tagging, chronological record vault |
| `PrescriptionsScreen` | `src/screens/health/PrescriptionsScreen.js` | Digitized prescription viewer, doctor notes, refill reminders |
| `ReportsScreen` | `src/screens/health/ReportsScreen.js` | Diagnostic pathology and radiology test report downloads |

#### L. AI Clinical Assistant
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `ChatbotScreen` | `src/screens/chatbot/ChatbotScreen.js` | Interactive 24/7 clinical AI chat for symptom triage, doctor matching, quick reply chips |

#### M. Account, Profile & Settings
| Screen | File | Key Functions / Responsibilities |
|---|---|---|
| `ProfileScreen` | `src/screens/profile/ProfileScreen.js` | User info, Care+ VIP badge, wallet balance, loyalty points, menu links |
| `EditProfileScreen` | `src/screens/profile/EditProfileScreen.js` | Edit name, email, phone, blood group, emergency contact, home address |
| `FamilyProfilesScreen` | `src/screens/profile/FamilyProfilesScreen.js` | Manage multiple family dependents (Spouse, Children, Elderly parents) |
| `WalletScreen` | `src/screens/profile/WalletScreen.js` | MediUnify Health Wallet, top-up balance, MediCoins rewards redemption |
| `TransactionHistoryScreen` | `src/screens/profile/TransactionHistoryScreen.js` | Detailed ledger of all deposits, payments, refunds, and cashback |
| `ReferEarnScreen` | `src/screens/profile/ReferEarnScreen.js` | Referral code generation, invite sharing, rewards tracker |
| `SettingsScreen` | `src/screens/settings/SettingsScreen.js` | Theme toggle (Light/Dark), language selector, notifications, biometric security |
| `HelpSupportScreen` | `src/screens/settings/HelpSupportScreen.js` | FAQs, live support chat, toll-free helpline, grievance redressal |

---

## 5. Services & Client Persistence Architecture

### 5.1 `dataSyncService.js` (`src/services/dataSyncService.js`)
Decoupled client-side persistence and data access layer. It operates reliably on local storage (`AsyncStorage`) with zero network latency, and is architected to seamlessly connect to your upcoming **Node.js (Express / NestJS) + MongoDB / PostgreSQL** backend.

| Function | Parameters | Description |
|---|---|---|
| `getBackendUrl()` | None | Returns configured backend API URL (`process.env.EXPO_PUBLIC_API_URL` or `null`) |
| `saveUserToLocalStorage(user)` | `user` | Consolidates user profile, wallet balance, appointments (video, lab, radiology, nurse), family members, orders, prescriptions, and offline fallback credentials to `AsyncStorage` |
| `syncLogin(identifier, password)` | `identifier, password` | Authenticates against registered or pre-seeded credentials; saves active session locally |
| `syncRegister(userData, password)` | `userData, password` | Registers new user account in local storage and creates active session |
| `pullUserData(userId)` | `userId` | Reads latest centralized profile and state from local storage |
| `syncActiveUser()` | None | Reads and validates active user state from local storage |
| `pushAppointment(appointmentData)` | `appointmentData` | Categorizes and saves appointment (Doctor, Video, Lab, Radiology, Nurse) to corresponding AsyncStorage stores and records payment ledger transaction |
| `syncSaveFamilyMembers(updatedMembers)` | `updatedMembers` | Synchronizes family dependents list to local storage |
| `syncFetchFamilyMembers()` | None | Retrieves all family dependents from local storage |
| `syncDeleteFamilyMember(memberId)` | `memberId` | Removes specified family dependent from local storage |

---

### 5.2 Upcoming Backend Integration Specification
The application frontend is structured for easy integration with a Node.js (Express / NestJS) REST API:

| Route Expected | Method | Payload / Params | Target Implementation |
|---|---|---|---|
| `/api/auth/login` | `POST` | `{ identifier, password }` | Authenticates patient against database (PostgreSQL / MongoDB) |
| `/api/auth/register` | `POST` | `{ name, phone, email, password }` | Registers user record with initial wallet balance & referral setup |
| `/api/user/:userId` | `GET` | `userId` in URL | Returns consolidated patient profile |
| `/api/user/:userId/sync` | `POST` | Full user object | Merges and persists user profile, bookings, and orders |
| `/api/user/:userId/appointment` | `POST` | `{ appointment }` | Creates new doctor/lab/radiology/nursing booking |
| `/api/user/:userId/family` | `PUT` | `{ familyMembers }` | Updates family dependents list |
| `/api/orders` | `POST` | `{ order }` | Saves completed pharmacy / diagnostic order |

---

## 6. Utilities & Helpers

### `locationHelper.js` (`src/utils/locationHelper.js`)
- `requestLocationPermission()`: Requests foreground location access via `expo-location`.
- `getCurrentLocation()`: Fetches current GPS coordinates (`latitude`, `longitude`).
- `reverseGeocode(coords)`: Converts GPS coordinates into formatted city, locality, and pincode.
- `calculateDistance(lat1, lon1, lat2, lon2)`: Haversine formula returning distance in kilometers.

### `validation.js` (`src/utils/validation.js`)
- `validatePhone(phone)`: Checks for valid 10-digit Indian mobile number (`^[6-9]\d{9}$`).
- `validateEmail(email)`: Standard RFC email regex validation.
- `validatePassword(password)`: Minimum 6 characters validation.
- `validatePincode(pincode)`: Validates 6-digit Indian postal code.

### `alert.js` (`src/utils/alert.js`)
- `showAlert(title, message, buttons)`: Universal alert wrapper executing native `Alert.alert` on mobile and `window.alert` / custom dialogs on Web.

### `constants.js` (`src/utils/constants.js`)
- System configurations, supported cities (`Mysore`, `Bengaluru`, `Mangalore`, `Hubli`), service fee rules, and timeout intervals.

---

## 7. Component Library Summary

### Core Components (`src/components/`)
- `Header.js`: Universal top header for mobile screens with back navigation, titles, and action icons.
- `WebHeader.js`: Desktop navigation bar with mega dropdowns (Find Care, Consultation, Lab Tests, Radiology, Pharmacy, Hospitals, Insurance, Care+ VIP, More), city selector, search bar, notification counter, cart badge, and user menu.
- `WebFooter.js`: Desktop footer with sitemap links, accreditation badges, and support contacts.
- `CustomButton.js`: Reusable styled button supporting primary, secondary, outline, loading spinners, and disabled states.
- `CustomInput.js`: Styled text field with floating labels, error messages, and eye-toggle for passwords.
- `SearchBar.js`: Live search input with debouncing and clear button.
- `DoctorCard.js`: Doctor avatar, specialty badge, experience, hospital affiliation, fees, and booking CTA.
- `ProductCard.js` / `MedicineCard.js`: Medicine information, discount badge, MRP strikeout, and quantity counter.
- `LabTestCard.js` / `LabPackageCard.js`: Test parameters count, sample type, fasting requirement, and add-to-cart button.
- `HealthRecordCard.js`: Medical record card displaying upload date, category badge, and report preview.
- `QuantitySelector.js`: Interactive `[-] qty [+]` component for shopping carts.
- `CartButton.js`: Floating cart summary badge.
- `ChatMessage.js`: Styled message bubble for patient and AI assistant with timestamp and source indicators.

### Fertility Specialized Components (`src/components/fertility/`)
- `CareRequestCard`, `ClinicCard`, `ClinicComparisonCard`, `ConsentItem`, `CoordinatorCard`, `DocumentUploadCard`, `FertilityDoctorCard`, `FertilityRecordCard`, `FertilityServiceCard`, `NotificationCard`, `PackageCard`, `ProgressTracker`, `States`, `StatusBadge`, `TestCard`, `TreatmentJourneyTimeline`, `TreatmentStageCard`.

---

## 8. Build, Run & Deployment Scripts

| Script | Command | Action |
|---|---|---|
| Development Server | `npm run start` / `npx expo start` | Starts Metro bundler for mobile devices and simulators |
| Web Development | `npm run web` / `npx expo start --web` | Runs app locally in browser |
| Pre-deploy Web Build | `npm run predeploy` | Runs `npx expo export -p web`, executes `patchGhPages.js` to fix font/asset paths and creates SPA `.nojekyll` and `404.html` |
| GitHub Pages Deploy | `npm run deploy` | Deploys static build from `dist/` to `gh-pages` branch |
