import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPharmacyStoreForCity,
  getPharmacyCityConfig,
  normalizePharmacyCity,
} from '../data/pharmacyStores';
import {
  isTestIncludedInCartPackages,
  isPackageItem,
  getPackageTests,
  enrichLabItemDetails,
  doesPackageIncludeTest,
} from '../utils/labPackageMatcher.js';
import { showAlert } from '../utils/alert.js';

const DEFAULT_PHARMACY_STORE = getPharmacyStoreForCity('Mysuru');

const CartContext = createContext();

const ORDERS_STORAGE_KEY = '@unnathi_pharmacy_orders';
const ADDRESS_STORAGE_KEY = '@unnathi_delivery_address';
const PHARMACY_CART_KEY = '@unnathi_pharmacy_cart';
const LAB_CART_KEY = '@unnathi_lab_cart';
const RADIOLOGY_CART_KEY = '@unnathi_radiology_cart';
const SELECTED_STORE_KEY = '@unnathi_selected_pharmacy_store';

const DEFAULT_ORDERS = [];

export const CartProvider = ({ children }) => {
  // Separate carts for Pharmacy, Lab tests, and Radiology scans
  const [pharmacyCart, setPharmacyCart] = useState([]);
  const [labCart, setLabCart] = useState([]);
  const [radiologyCart, setRadiologyCart] = useState([]);

  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [selectedCity, setSelectedCity] = useState('Mysuru');
  const [selectedPharmacyStore, setSelectedPharmacyStoreState] = useState(DEFAULT_PHARMACY_STORE);
  const [selectedAddress, setSelectedAddress] = useState({
    name: 'User',
    phone: '9876543210',
    addressLine: 'No. 24, 5th Cross, Kuvempunagar',
    city: 'Mysuru',
    state: 'Karnataka',
    pincode: '570023',
    tag: 'Home',
  });

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const storedOrders = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      const storedGenOrders = await AsyncStorage.getItem('@orders');
      let combinedOrders = [];
      if (storedOrders) {
        try { combinedOrders = JSON.parse(storedOrders); } catch (e) {}
      }
      if (storedGenOrders) {
        try {
          const parsedGen = JSON.parse(storedGenOrders);
          if (Array.isArray(parsedGen)) {
            const map = new Map();
            [...combinedOrders, ...parsedGen].forEach((o) => {
              if (o && o.id) map.set(o.id, o);
            });
            combinedOrders = Array.from(map.values());
          }
        } catch (e) {}
      }
      if (combinedOrders.length > 0) {
        setOrders(combinedOrders);
      }

      const storedAddress = await AsyncStorage.getItem(ADDRESS_STORAGE_KEY);
      if (storedAddress) setSelectedAddress(JSON.parse(storedAddress));

      const storedCity = (await AsyncStorage.getItem('@mediunify_selected_city')) || (await AsyncStorage.getItem('@unnathi_user_location'));
      const activeCity = normalizePharmacyCity(storedCity);
      setSelectedCity(activeCity);
      const activeStore = getPharmacyStoreForCity(activeCity);
      setSelectedPharmacyStoreState(activeStore);

      const storedPharm = await AsyncStorage.getItem(PHARMACY_CART_KEY);
      if (storedPharm) setPharmacyCart(JSON.parse(storedPharm));

      const storedLab = await AsyncStorage.getItem(LAB_CART_KEY);
      if (storedLab) setLabCart(JSON.parse(storedLab));

      // Scans & X-Ray items are not supported in the shopping cart.
      // Clear any previously persisted radiology cart items.
      await AsyncStorage.removeItem(RADIOLOGY_CART_KEY);
      setRadiologyCart([]);
    } catch (e) {
      console.log('Error loading saved cart data:', e);
    }
  };

  const syncLocationWithHome = async () => {
    try {
      const storedCity = (await AsyncStorage.getItem('@mediunify_selected_city')) || (await AsyncStorage.getItem('@unnathi_user_location'));
      const activeCity = normalizePharmacyCity(storedCity);
      setSelectedCity(activeCity);
      const activeStore = getPharmacyStoreForCity(activeCity);
      setSelectedPharmacyStoreState(activeStore);
      return activeCity;
    } catch (e) {
      return 'Mysuru';
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onStorage = (e) => {
        if (!e || e.key === '@mediunify_selected_city' || e.key === '@unnathi_user_location') {
          syncLocationWithHome();
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
  }, []);

  const setSelectedPharmacyStore = async (store) => {
    setSelectedPharmacyStoreState(store);
    try {
      await AsyncStorage.setItem(SELECTED_STORE_KEY, JSON.stringify(store));
    } catch (e) {
      console.log('Error saving selected store:', e);
    }
  };

  // Save carts when changed
  useEffect(() => {
    AsyncStorage.setItem(PHARMACY_CART_KEY, JSON.stringify(pharmacyCart)).catch(() => {});
  }, [pharmacyCart]);

  useEffect(() => {
    AsyncStorage.setItem(LAB_CART_KEY, JSON.stringify(labCart)).catch(() => {});
  }, [labCart]);

  useEffect(() => {
    AsyncStorage.setItem(RADIOLOGY_CART_KEY, JSON.stringify(radiologyCart)).catch(() => {});
  }, [radiologyCart]);

  // Helper to determine if an item is a radiology/imaging scan
  const isRadiologyItem = (item, forcedType) => {
    if (forcedType === 'radiology') return true;
    if (forcedType === 'lab' || forcedType === 'pharmacy') return false;
    const cat = (item.category || '').toLowerCase();
    const catLabel = (item.categoryLabel || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return (
      item.cartType === 'radiology' ||
      item.itemType === 'radiology' ||
      item.itemType === 'scan' ||
      item.itemType === 'imaging' ||
      cat === 'radiology' ||
      cat === 'diagnostic scan' ||
      Boolean(item.modality) ||
      Boolean(item.modalityCode) ||
      catLabel.includes('mri') ||
      catLabel.includes('ct') ||
      catLabel.includes('x-ray') ||
      catLabel.includes('xray') ||
      catLabel.includes('ultrasound') ||
      catLabel.includes('usg') ||
      catLabel.includes('echo') ||
      catLabel.includes('ecg') ||
      catLabel.includes('dexa') ||
      catLabel.includes('mammo') ||
      catLabel.includes('pet') ||
      name.includes('mri') ||
      name.includes('ct scan') ||
      name.includes('ultrasound') ||
      name.includes('x-ray') ||
      name.includes('2d echo')
    );
  };

  // Helper to determine if an item is a pathology/blood lab test
  const isLabItem = (item, forcedType) => {
    if (forcedType === 'lab') return true;
    if (forcedType === 'radiology' || forcedType === 'pharmacy') return false;
    if (isRadiologyItem(item, forcedType)) return false;
    const cat = (item.category || '').toLowerCase();
    return (
      item.cartType === 'lab' ||
      item.itemType === 'lab' ||
      item.itemType === 'diagnostic' ||
      cat === 'lab test' ||
      cat === 'health package' ||
      cat === 'blood test' ||
      cat === 'pathology' ||
      item.isLabTest === true ||
      Boolean(item.sampleType) ||
      Boolean(item.testsCount)
    );
  };

  // ==========================================
  // ADD TO CART (AUTOMATIC CART ROUTING)
  // ==========================================
  const addToCart = (product, quantityToAdd = 1, forcedType = null, storeOverride = null) => {
    // Scans & X-Ray (radiology) items cannot be added to the shopping cart.
    // They have their own dedicated booking flow in the Scans & X-Ray section.
    if (isRadiologyItem(product, forcedType)) {
      console.log('[Cart] Blocked: Scans & X-Ray items cannot be added to the cart.');
      return;
    } else if (isLabItem(product, forcedType)) {
      const isPkg = isPackageItem(product);

      // 1. If adding an individual test, check if already covered in any package currently in labCart
      if (!isPkg) {
        const check = isTestIncludedInCartPackages(product, labCart);
        if (check.included) {
          showAlert(
            'Test Already Included in Package',
            `"${product.name}" is already included in "${check.packageName}" in your cart.\n\nYou do not need to book or pay for this test separately.`
          );
          return { success: false, reason: 'included_in_package', ...check };
        }
      }

      // Enrich lab item with complete clinical parameters, sample info, and descriptions
      const enrichedItem = enrichLabItemDetails(product) || product;
      const finalItem = {
        ...enrichedItem,
        quantity: quantityToAdd,
        cartType: 'lab',
        isPackage: isPkg,
      };

      setLabCart((prev) => {
        // If adding a package, remove any individual tests in cart that this package already covers
        let filteredPrev = prev;
        if (isPkg) {
          const duplicateTests = prev.filter(
            (item) => !isPackageItem(item) && doesPackageIncludeTest(product, item).included
          );
          if (duplicateTests.length > 0) {
            filteredPrev = prev.filter(
              (item) => isPackageItem(item) || !doesPackageIncludeTest(product, item).included
            );
            const duplicateNames = duplicateTests.map((t) => t.name).join(', ');
            setTimeout(() => {
              showAlert(
                'Cart Optimized',
                `"${duplicateNames}" is already included in your newly added package "${product.name}". We removed the duplicate test to save you money!`
              );
            }, 300);
          }
        }

        const existing = filteredPrev.find((item) => item.id === product.id);
        if (existing) {
          return filteredPrev.map((item) =>
            item.id === product.id ? { ...item, ...finalItem, quantity: item.quantity + quantityToAdd } : item
          );
        }
        return [...filteredPrev, finalItem];
      });
      return { success: true };
    } else {
      const cityStore = getPharmacyStoreForCity(selectedCity);
      const targetStore = storeOverride || cityStore || selectedPharmacyStore;

      const productWithStore = {
        ...product,
        storeId: product.storeId || targetStore.id,
        storeName: product.storeName || targetStore.name,
        storeArea: product.storeArea || targetStore.locality || selectedCity,
        storeAddress: product.storeAddress || targetStore.address || '',
        storeCity: product.storeCity || targetStore.city || selectedCity,
        deliveryTime: product.deliveryTime || targetStore.deliveryTime || '15-25 mins',
        storePhone: product.storePhone || targetStore.phone || '+91 821 2548901',
        partnerTier: product.partnerTier || targetStore.partnerTier || 'Verified Partner',
        cartType: 'pharmacy',
      };

      setPharmacyCart((prev) => {
        const existing = prev.find(
          (item) => item.id === product.id && (item.storeId === productWithStore.storeId || (!item.storeId && !productWithStore.storeId))
        );
        if (existing) {
          return prev.map((item) =>
            item.id === product.id && (item.storeId === productWithStore.storeId || (!item.storeId && !productWithStore.storeId))
              ? { ...item, quantity: item.quantity + quantityToAdd }
              : item
          );
        }
        return [...prev, { ...productWithStore, quantity: quantityToAdd }];
      });
    }
  };

  // Dedicated Radiology Scan Add — blocked: Scans & X-Ray use their own booking flow
  const addRadiologyScanToCart = (scan, quantity = 1) => {
    // Scans & X-Ray items are not added to the cart.
    console.log('[Cart] Blocked: Use the Scans & X-Ray booking flow instead of the cart.');
  };

  // Dedicated Lab Test Add
  const addLabTestToCart = (test, quantity = 1) => {
    addToCart(test, quantity, 'lab');
  };

  // Dedicated Pharmacy Add
  const addPharmacyProductToCart = (product, quantity = 1) => {
    addToCart(product, quantity, 'pharmacy');
  };

  // ==========================================
  // INCREASE QUANTITY
  // ==========================================
  const increaseQuantity = (productId, cartType = null, storeId = null) => {
    if (cartType === 'radiology' || (radiologyCart.some((i) => i.id === productId) && cartType !== 'pharmacy' && cartType !== 'lab')) {
      setRadiologyCart((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity: item.quantity + 1 } : item))
      );
    } else if (cartType === 'lab' || (labCart.some((i) => i.id === productId) && cartType !== 'pharmacy' && cartType !== 'radiology')) {
      setLabCart((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity: item.quantity + 1 } : item))
      );
    } else {
      setPharmacyCart((prev) =>
        prev.map((item) =>
          item.id === productId && (!storeId || item.storeId === storeId)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    }
  };

  // ==========================================
  // DECREASE QUANTITY
  // ==========================================
  const decreaseQuantity = (productId, cartType = null, storeId = null) => {
    if (cartType === 'radiology' || (radiologyCart.some((i) => i.id === productId) && cartType !== 'pharmacy' && cartType !== 'lab')) {
      setRadiologyCart((prev) =>
        prev
          .map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
          .filter((item) => item.quantity > 0)
      );
    } else if (cartType === 'lab' || (labCart.some((i) => i.id === productId) && cartType !== 'pharmacy' && cartType !== 'radiology')) {
      setLabCart((prev) =>
        prev
          .map((item) => (item.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
          .filter((item) => item.quantity > 0)
      );
    } else {
      setPharmacyCart((prev) =>
        prev
          .map((item) =>
            item.id === productId && (!storeId || item.storeId === storeId)
              ? { ...item, quantity: item.quantity - 1 }
              : item
          )
          .filter((item) => item.quantity > 0)
      );
    }
  };

  // ==========================================
  // REMOVE ITEM
  // ==========================================
  const removeFromCart = (productId, cartType = null, storeId = null) => {
    if (cartType === 'radiology') {
      setRadiologyCart((prev) => prev.filter((item) => item.id !== productId));
    } else if (cartType === 'lab') {
      setLabCart((prev) => prev.filter((item) => item.id !== productId));
    } else if (cartType === 'pharmacy') {
      setPharmacyCart((prev) =>
        prev.filter((item) => !(item.id === productId && (!storeId || item.storeId === storeId)))
      );
    } else {
      setRadiologyCart((prev) => prev.filter((item) => item.id !== productId));
      setLabCart((prev) => prev.filter((item) => item.id !== productId));
      setPharmacyCart((prev) =>
        prev.filter((item) => !(item.id === productId && (!storeId || item.storeId === storeId)))
      );
    }
  };

  // ==========================================
  // CLEAR CART
  // ==========================================
  const clearCart = (cartType = null) => {
    if (cartType === 'pharmacy') {
      setPharmacyCart([]);
    } else if (cartType === 'lab') {
      setLabCart([]);
    } else if (cartType === 'radiology') {
      setRadiologyCart([]);
    } else {
      setPharmacyCart([]);
      setLabCart([]);
      setRadiologyCart([]);
      setAppliedCoupon(null);
    }
  };

  // ==========================================
  // COUPON HANDLING
  // ==========================================
  const applyCoupon = (code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (cleanCode === 'UNNATHI20') {
      const coupon = {
        code: 'UNNATHI20',
        discountPercent: 20,
        description: '20% OFF on all orders',
      };
      setAppliedCoupon(coupon);
      return { success: true, message: '20% discount coupon applied!' };
    }
    if (cleanCode === 'HEALTH50') {
      const coupon = {
        code: 'HEALTH50',
        discountAmount: 50,
        description: 'Flat ₹50 OFF',
      };
      setAppliedCoupon(coupon);
      return { success: true, message: 'Flat ₹50 discount applied!' };
    }
    if (cleanCode === 'FIRSTFREE') {
      const coupon = {
        code: 'FIRSTFREE',
        freeDelivery: true,
        description: 'Free Express Delivery',
      };
      setAppliedCoupon(coupon);
      return { success: true, message: 'Free delivery applied!' };
    }
    return { success: false, message: 'Invalid promo code. Try UNNATHI20 or HEALTH50' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // ==========================================
  // PHARMACY TOTALS
  // ==========================================
  const pharmacyCartCount = useMemo(() => {
    return pharmacyCart.reduce((total, item) => total + item.quantity, 0);
  }, [pharmacyCart]);

  const pharmacySubtotal = useMemo(() => {
    return pharmacyCart.reduce(
      (total, item) => total + Number(item.price || 0) * item.quantity,
      0
    );
  }, [pharmacyCart]);

  const pharmacyMrpTotal = useMemo(() => {
    return pharmacyCart.reduce(
      (total, item) => total + Number(item.mrp || item.oldPrice || item.price || 0) * item.quantity,
      0
    );
  }, [pharmacyCart]);

  const pharmacySavings = useMemo(() => {
    return Math.max(0, pharmacyMrpTotal - pharmacySubtotal);
  }, [pharmacyMrpTotal, pharmacySubtotal]);

  const pharmacyDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountPercent) {
      return Math.round((pharmacySubtotal * appliedCoupon.discountPercent) / 100);
    }
    if (appliedCoupon.discountAmount) {
      return Math.min(pharmacySubtotal, appliedCoupon.discountAmount);
    }
    return 0;
  }, [appliedCoupon, pharmacySubtotal]);

  const pharmacyDeliveryFee = useMemo(() => {
    if (pharmacyCart.length === 0) return 0;
    if (appliedCoupon?.freeDelivery) return 0;
    return pharmacySubtotal >= 499 ? 0 : 40;
  }, [pharmacyCart.length, appliedCoupon, pharmacySubtotal]);

  const pharmacyPackagingFee = pharmacyCart.length > 0 ? 5 : 0;

  const pharmacyFinalTotal = useMemo(() => {
    if (pharmacyCart.length === 0) return 0;
    return Math.max(0, pharmacySubtotal - pharmacyDiscountAmount + pharmacyDeliveryFee + pharmacyPackagingFee);
  }, [pharmacyCart.length, pharmacySubtotal, pharmacyDiscountAmount, pharmacyDeliveryFee, pharmacyPackagingFee]);

  // ==========================================
  // LAB TESTS TOTALS
  // ==========================================
  const labCartCount = useMemo(() => {
    return labCart.reduce((total, item) => total + item.quantity, 0);
  }, [labCart]);

  const labSubtotal = useMemo(() => {
    return labCart.reduce(
      (total, item) => total + Number(item.price || 0) * item.quantity,
      0
    );
  }, [labCart]);

  const labMrpTotal = useMemo(() => {
    return labCart.reduce(
      (total, item) => total + Number(item.mrp || item.oldPrice || item.price || 0) * item.quantity,
      0
    );
  }, [labCart]);

  const labSavings = useMemo(() => {
    return Math.max(0, labMrpTotal - labSubtotal);
  }, [labMrpTotal, labSubtotal]);

  const labDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountPercent) {
      return Math.round((labSubtotal * appliedCoupon.discountPercent) / 100);
    }
    if (appliedCoupon.discountAmount) {
      return Math.min(labSubtotal, appliedCoupon.discountAmount);
    }
    return 0;
  }, [appliedCoupon, labSubtotal]);

  const labSampleFee = 0; // Free doorstep / center sample collection

  const labFinalTotal = useMemo(() => {
    if (labCart.length === 0) return 0;
    return Math.max(0, labSubtotal - labDiscountAmount + labSampleFee);
  }, [labCart.length, labSubtotal, labDiscountAmount, labSampleFee]);

  // ==========================================
  // RADIOLOGY & SCANS TOTALS
  // ==========================================
  const radiologyCartCount = useMemo(() => {
    return radiologyCart.reduce((total, item) => total + item.quantity, 0);
  }, [radiologyCart]);

  const radiologySubtotal = useMemo(() => {
    return radiologyCart.reduce(
      (total, item) => total + Number(item.price || 0) * item.quantity,
      0
    );
  }, [radiologyCart]);

  const radiologyMrpTotal = useMemo(() => {
    return radiologyCart.reduce(
      (total, item) => total + Number(item.mrp || item.oldPrice || item.price || 0) * item.quantity,
      0
    );
  }, [radiologyCart]);

  const radiologySavings = useMemo(() => {
    return Math.max(0, radiologyMrpTotal - radiologySubtotal);
  }, [radiologyMrpTotal, radiologySubtotal]);

  const radiologyDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountPercent) {
      return Math.round((radiologySubtotal * appliedCoupon.discountPercent) / 100);
    }
    if (appliedCoupon.discountAmount) {
      return Math.min(radiologySubtotal, appliedCoupon.discountAmount);
    }
    return 0;
  }, [appliedCoupon, radiologySubtotal]);

  const radiologyFinalTotal = useMemo(() => {
    if (radiologyCart.length === 0) return 0;
    return Math.max(0, radiologySubtotal - radiologyDiscountAmount);
  }, [radiologyCart.length, radiologySubtotal, radiologyDiscountAmount]);

  // ==========================================
  // MULTI-CENTER SEPARATE CARTS FOR RADIOLOGY
  // ==========================================
  const groupedRadiologyCarts = useMemo(() => {
    const map = new Map();
    radiologyCart.forEach((item) => {
      const centerKey = item.labId || item.labName || 'default-scan-center';
      if (!map.has(centerKey)) {
        map.set(centerKey, {
          labId: item.labId || 'default-scan-center',
          labName: item.labName || 'MediUnify Advanced Imaging & Scan Center',
          labArea: item.labArea || 'Kuvempunagar, Mysore',
          labAddress: item.labAddress || 'Plot 14, Kuvempunagar, Mysore',
          labPhone: item.labPhone || '+91 821 245 8890',
          accreditation: item.labAccreditation || item.accreditation || 'NABL & NABH Accredited',
          items: [],
          itemsCount: 0,
          subtotal: 0,
          mrpTotal: 0,
          savings: 0,
        });
      }

      const centerCart = map.get(centerKey);
      centerCart.items.push(item);
      centerCart.itemsCount += item.quantity;
      centerCart.subtotal += Number(item.price || 0) * item.quantity;
      centerCart.mrpTotal += Number(item.mrp || item.oldPrice || item.price || 0) * item.quantity;
      centerCart.savings = Math.max(0, centerCart.mrpTotal - centerCart.subtotal);
    });

    return Array.from(map.values());
  }, [radiologyCart]);

  const clearRadiologyCenterCart = (labId) => {
    setRadiologyCart((prev) =>
      prev.filter((item) => (item.labId || item.labName || 'default-scan-center') !== labId)
    );
  };

  // ==========================================
  // MULTI-HOSPITAL SEPARATE CARTS FOR LAB TESTS
  // ==========================================
  const groupedHospitalCarts = useMemo(() => {
    const map = new Map();
    labCart.forEach((item) => {
      const hospitalKey = item.labId || item.labName || 'default-hospital';
      if (!map.has(hospitalKey)) {
        map.set(hospitalKey, {
          labId: item.labId || 'default-hospital',
          labName: item.labName || 'MediUnify Diagnostic Lab & Pathology',
          labArea: item.labArea || 'Kuvempunagar, Mysore',
          labAddress: item.labAddress || 'Plot 14, Kuvempunagar, Mysore',
          labPhone: item.labPhone || '+91 821 245 8890',
          accreditation: item.labAccreditation || 'NABL & NABH Accredited',
          items: [],
          itemsCount: 0,
          subtotal: 0,
          mrpTotal: 0,
          savings: 0,
        });
      }

      const hospCart = map.get(hospitalKey);
      hospCart.items.push(item);
      hospCart.itemsCount += item.quantity;
      hospCart.subtotal += Number(item.price || 0) * item.quantity;
      hospCart.mrpTotal += Number(item.mrp || item.oldPrice || item.price || 0) * item.quantity;
      hospCart.savings = Math.max(0, hospCart.mrpTotal - hospCart.subtotal);
    });

    return Array.from(map.values());
  }, [labCart]);

  const clearHospitalCart = (labId) => {
    setLabCart((prev) =>
      prev.filter((item) => (item.labId || item.labName || 'default-hospital') !== labId)
    );
  };

  // ==========================================
  // MULTI-STORE SEPARATE CARTS FOR PHARMACY MEDICINES
  // ==========================================
  const groupedPharmacyCarts = useMemo(() => {
    const map = new Map();
    pharmacyCart.forEach((item) => {
      const storeKey = item.storeId || item.storeName || 'store-apollo-kuvempu';
      if (!map.has(storeKey)) {
        map.set(storeKey, {
          storeId: item.storeId || 'store-apollo-kuvempu',
          storeName: item.storeName || 'Apollo Pharmacy - Kuvempunagar',
          storeArea: item.storeArea || 'Kuvempunagar, Mysore',
          storeAddress: item.storeAddress || '#45, 8th Cross, Complex Road, Kuvempunagar, Mysore - 570023',
          storePhone: item.storePhone || '+91 821 2548901',
          deliveryTime: item.deliveryTime || '15-25 mins',
          partnerTier: item.partnerTier || 'Platinum Partner',
          items: [],
          itemsCount: 0,
          subtotal: 0,
          mrpTotal: 0,
          savings: 0,
          deliveryFee: 25,
          packagingFee: 5,
          requiresPrescription: false,
        });
      }

      const storeCart = map.get(storeKey);
      storeCart.items.push(item);
      storeCart.itemsCount += item.quantity;
      storeCart.subtotal += Number(item.price || 0) * item.quantity;
      storeCart.mrpTotal += Number(item.mrp || item.oldPrice || item.price || 0) * item.quantity;
      storeCart.savings = Math.max(0, storeCart.mrpTotal - storeCart.subtotal);
      if (storeCart.subtotal >= 299) {
        storeCart.deliveryFee = 0;
      }
      if (item.requiresPrescription || item.category === 'Medicines' || item.category === 'Antibiotics') {
        storeCart.requiresPrescription = true;
      }
    });

    return Array.from(map.values()).map((s) => ({
      ...s,
      finalTotal: Math.max(0, s.subtotal + s.deliveryFee + s.packagingFee),
    }));
  }, [pharmacyCart]);

  const clearPharmacyStoreCart = (storeId) => {
    setPharmacyCart((prev) =>
      prev.filter((item) => (item.storeId || item.storeName || 'store-apollo-kuvempu') !== storeId)
    );
  };

  // Overall combined totals (for global headers if needed)
  // Radiology/Scans & X-Ray items are excluded from the cart count — they use a dedicated booking flow.
  const totalCartCount = pharmacyCartCount + labCartCount;

  // ==========================================
  // ORDERS MANAGEMENT
  // ==========================================
  const addOrder = async (newOrder) => {
    const updatedOrders = [newOrder, ...orders.filter((o) => o.id !== newOrder.id)];
    setOrders(updatedOrders);
    try {
      await AsyncStorage.setItem(
        ORDERS_STORAGE_KEY,
        JSON.stringify(updatedOrders)
      );
      await AsyncStorage.setItem(
        '@orders',
        JSON.stringify(updatedOrders)
      );
      await AsyncStorage.setItem(
        '@mediunify_patient_medicine_orders',
        JSON.stringify(updatedOrders)
      );
    } catch (e) {
      console.log('Error saving order to storage:', e);
    }

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('mediunify_orders_updated', { detail: updatedOrders }));
        if (typeof Event === 'function') {
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch (_evtErr) {}

    // Background sync to central server
    try {
      const { syncActiveUser } = require('../services/dataSyncService');
      await syncActiveUser();
    } catch (err) {}
  };

  const requestProductReturn = async (orderId, returnPayload) => {
    const updatedOrders = orders.map((order) => {
      if (order.id === orderId) {
        return {
          ...order,
          status: 'Return Requested',
          returnRequested: true,
          returnDetails: {
            ...returnPayload,
            requestedAt: new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            pickupStatus: 'Pickup Scheduled (Within 24-48 hrs)',
            pickupSlot: 'Tomorrow, 10:00 AM - 02:00 PM',
          },
        };
      }
      return order;
    });

    setOrders(updatedOrders);
    try {
      const str = JSON.stringify(updatedOrders);
      await AsyncStorage.setItem(ORDERS_STORAGE_KEY, str);
      await AsyncStorage.setItem('@orders', str);
      await AsyncStorage.setItem('@mediunify_patient_medicine_orders', str);
    } catch (e) {
      console.log('Error saving returned order:', e);
    }

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('mediunify_orders_updated', { detail: updatedOrders }));
        if (typeof Event === 'function') {
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch (_evtErr) {}
  };

  const updateAddress = async (address) => {
    setSelectedAddress(address);
    try {
      await AsyncStorage.setItem(
        ADDRESS_STORAGE_KEY,
        JSON.stringify(address)
      );
    } catch (e) {
      console.log('Error saving address:', e);
    }
  };

  return (
    <CartContext.Provider
      value={{
        // Separate Carts
        pharmacyCart,
        labCart,
        radiologyCart,
        cart: pharmacyCart, // fallback for legacy components
        cartItems: pharmacyCart,

        // Add actions
        addToCart,
        addLabTestToCart,
        addRadiologyScanToCart,
        addPharmacyProductToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,

        // Counts
        totalCartCount,
        cartCount: pharmacyCartCount,
        pharmacyCartCount,
        labCartCount,
        radiologyCartCount,

        // Pharmacy Pricing & Multi-Store Carts
        subtotal: pharmacySubtotal,
        mrpTotal: pharmacyMrpTotal,
        productSavings: pharmacySavings,
        discountAmount: pharmacyDiscountAmount,
        deliveryFee: pharmacyDeliveryFee,
        packagingFee: pharmacyPackagingFee,
        finalTotal: pharmacyFinalTotal,
        pharmacySubtotal,
        pharmacyMrpTotal,
        pharmacySavings,
        pharmacyDiscountAmount,
        pharmacyDeliveryFee,
        pharmacyPackagingFee,
        pharmacyFinalTotal,
        groupedPharmacyCarts,
        clearPharmacyStoreCart,

        // Lab Pricing & Multi-Hospital Carts
        labSubtotal,
        labMrpTotal,
        labSavings,
        labDiscountAmount,
        labSampleFee,
        labFinalTotal,
        groupedHospitalCarts,
        clearHospitalCart,

        // Radiology Pricing & Multi-Center Carts
        radiologySubtotal,
        radiologyMrpTotal,
        radiologySavings,
        radiologyDiscountAmount,
        radiologyFinalTotal,
        groupedRadiologyCarts,
        clearRadiologyCenterCart,

        // Lab Package Inclusions & Test Checks
        checkTestInCartPackages: (test) => isTestIncludedInCartPackages(test, labCart),

        // Coupons
        appliedCoupon,
        applyCoupon,
        removeCoupon,

        // Selected Pharmacy Store & Location Single Source of Truth
        selectedCity,
        pharmacyCityConfig: getPharmacyCityConfig(selectedCity),
        selectedPharmacyStore,
        setSelectedPharmacyStore,
        setPharmacyStore: setSelectedPharmacyStore,
        syncLocationWithHome,
        pharmacyStores: [],

        // Address & Orders
        selectedAddress,
        updateAddress,
        orders,
        addOrder,
        requestProductReturn,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
};