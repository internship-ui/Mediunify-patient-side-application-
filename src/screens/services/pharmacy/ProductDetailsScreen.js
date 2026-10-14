import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../../theme/colors';
import pharmacyProducts from '../../../data/pharmacyProducts';
import { EXTENDED_PRODUCTS, getProductImage } from './PharmacyScreen.web';
import { useCart } from '../../../context/CartContext';
import { useAuthGuard } from '../../../context/AuthGuardContext';
import { isDesktopLayout } from '../../../utils/responsiveLayoutHelper';
import { showAlert } from '../../../utils/alert';
import WebFooter from '../../../components/web/WebFooter';
import WebBackButton from '../../../components/web/WebBackButton';
import OptimizedImage from '../../../components/common/OptimizedImage';

// Helper: Format category names to short, concise tags
const getShortCategory = (category) => {
  if (!category) return 'Medicines';
  const c = String(category).trim().toLowerCase();
  if (c.includes('vitamin') || c.includes('mineral')) return 'Vitamins';
  if (c.includes('device') || c.includes('monitor') || c.includes('thermometer') || c.includes('glucometer')) return 'Devices';
  if (c.includes('first aid')) return 'First Aid';
  if (c.includes('covid') || c.includes('sanitizer')) return 'Covid Care';
  if (c.includes('pain')) return 'Pain Relief';
  if (c.includes('stomach') || c.includes('antacid') || c.includes('digestion')) return 'Stomach';
  if (c.includes('skin') || c.includes('derma')) return 'Skin Care';
  if (c.includes('ayurved') || c.includes('herbal')) return 'Ayurveda';
  if (c.includes('baby')) return 'Baby Care';
  if (c.includes('oral') || c.includes('dental')) return 'Oral Care';
  if (c.includes('cardiac') || c.includes('heart')) return 'Cardiac';
  if (c.includes('diabet')) return 'Diabetes';
  return 'Medicines';
};

// Helper: Shorten review count format: e.g. (1.2k)
const formatReviewCount = (count) => {
  const num = Number(count) || 850;
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `(${formatted}k)`;
  }
  return `(${num})`;
};

// Helper: Format discount text
const formatDiscountText = (discount, mrp, price) => {
  if (discount && typeof discount === 'string' && discount.trim()) {
    const d = discount.trim().toUpperCase();
    if (d.includes('OFF')) return d;
    return `${d} OFF`;
  }
  if (mrp && price && Number(mrp) > Number(price)) {
    const pct = Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100);
    if (pct > 0) return `${pct}% OFF`;
  }
  return 'FLAT 20% OFF';
};

const ProductDetailsScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && isDesktopLayout(width);

  const { productId, product: passedProduct, store: passedStore } = route.params || {};
  const {
    cart,
    pharmacyCart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    cartCount,
    pharmacyCartCount,
    selectedPharmacyStore,
  } = useCart();

  const currentStore = passedStore || selectedPharmacyStore;
  const [quantity, setQuantity] = useState(1);

  // Find product from dataset if not passed directly
  const product = useMemo(() => {
    if (passedProduct && passedProduct.name) return passedProduct;
    const list = Array.isArray(EXTENDED_PRODUCTS) && EXTENDED_PRODUCTS.length > 0 ? EXTENDED_PRODUCTS : (pharmacyProducts || []);
    return (
      list.find((p) => String(p.id) === String(productId)) ||
      (pharmacyProducts || []).find((p) => String(p.id) === String(productId)) ||
      (pharmacyProducts || [])[0]
    );
  }, [passedProduct, productId]);

  // Related products from same category
  const relatedProducts = useMemo(() => {
    const list = Array.isArray(EXTENDED_PRODUCTS) && EXTENDED_PRODUCTS.length > 0 ? EXTENDED_PRODUCTS : (pharmacyProducts || []);
    return list
      .filter((p) => p.category === product?.category && String(p.id) !== String(product?.id))
      .slice(0, 4);
  }, [product]);

  const { requireLogin } = useAuthGuard();

  if (!product) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.notFoundWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#64748B" />
          <Text style={styles.notFoundText}>Product not found.</Text>
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backHomeText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, quantity, 'pharmacy', currentStore);
    showAlert(
      'Added to Cart',
      `${quantity} × ${product.name} added to your basket (${currentStore?.name || 'Apollo Pharmacy'}).`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        {
          text: 'View Cart',
          onPress: () => navigation.navigate('Cart', { initialTab: 'pharmacy' }),
        },
      ]
    );
  };

  const handleBuyNow = () => {
    requireLogin(() => _doBuyNow());
  };

  const _doBuyNow = () => {
    addToCart(product, quantity, 'pharmacy', currentStore);
    navigation.navigate('Cart', { initialTab: 'pharmacy', openCheckout: true });
  };

  const prodImg = getProductImage(product);
  const discountStr = formatDiscountText(product.discount, product.mrp || product.oldPrice, product.price);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* 1. HEADER / BREADCRUMBS */}
      {isDesktopWeb ? (
        <View style={styles.webBreadcrumbBar}>
          <View style={styles.webBreadcrumbInner}>
            <WebBackButton
              onPress={() => navigation.goBack()}
              title="Order Medicine"
              subtitle="Back to Pharmacy Catalog"
            />
            <View style={styles.breadcrumbPath}>
              <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                <Text style={styles.breadcrumbLink}>Home</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbDivider}>/</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Pharmacy')}>
                <Text style={styles.breadcrumbLink}>Order Medicine</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbDivider}>/</Text>
              <Text style={styles.breadcrumbActive} numberOfLines={1}>
                {product.name}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            style={styles.mobileBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle} numberOfLines={1}>
            Product Details
          </Text>
          <TouchableOpacity
            style={styles.mobileCartBtn}
            onPress={() => navigation.navigate('Cart', { initialTab: 'pharmacy' })}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={22} color="#1E3A8A" />
            {(pharmacyCartCount || cartCount) > 0 && (
              <View style={styles.mobileCartBadge}>
                <Text style={styles.mobileCartBadgeText}>
                  {(pharmacyCartCount || cartCount) > 99 ? '99+' : (pharmacyCartCount || cartCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. MAIN SCROLL CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          !isDesktopWeb && { paddingBottom: 110 },
        ]}
      >
        {isDesktopWeb ? (
          /* ========================================================
             DESKTOP WEB 2-COLUMN SHOWCASE LAYOUT (Matching MediUnify Design)
             ======================================================== */
          <View style={styles.desktopLayoutWrap}>
            <View style={styles.desktopShowcaseRow}>
              {/* Left Column: Image Showcase & Trust Strip */}
              <View style={styles.desktopImageCol}>
                <View style={styles.desktopImageCard}>
                  {/* Top Multi-Color Gradient Accent Bar */}
                  <View style={styles.cardGradientBarMulticolor} />

                  {discountStr ? (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{discountStr}</Text>
                    </View>
                  ) : null}

                  {Boolean(product.requiresPrescription) ? (
                    <View style={styles.rxBadge}>
                      <Text style={styles.rxBadgeText}>Rx</Text>
                    </View>
                  ) : null}

                  <View style={styles.stockBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#00B894" />
                    <Text style={styles.stockBadgeText}>In Stock</Text>
                  </View>

                  <OptimizedImage
                    source={{ uri: prodImg }}
                    style={styles.desktopProductImage}
                    containerStyle={{ backgroundColor: 'transparent' }}
                    placeholderColor="transparent"
                    resizeMode="contain"
                    fallbackIcon="medkit-outline"
                    fallbackColor="#00B894"
                  />
                </View>

                {/* Trust Highlights - Premium Gradient Cards */}
                <View style={styles.trustBadgesGrid}>
                  <View style={[styles.trustBadgeItem, styles.trustBadge1]}>
                    <View style={[styles.trustIconCircle, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="shield-checkmark" size={15} color="#00B894" />
                    </View>
                    <Text style={styles.trustBadgeText}>100% Genuine Medicine</Text>
                  </View>
                  <View style={[styles.trustBadgeItem, styles.trustBadge2]}>
                    <View style={[styles.trustIconCircle, { backgroundColor: '#FFF5F0' }]}>
                      <Ionicons name="flash" size={15} color="#FF7F50" />
                    </View>
                    <Text style={styles.trustBadgeText}>Express 60-Min Delivery</Text>
                  </View>
                  <View style={[styles.trustBadgeItem, styles.trustBadge3]}>
                    <View style={[styles.trustIconCircle, { backgroundColor: '#F0F9FF' }]}>
                      <Ionicons name="snow" size={15} color="#00C2CB" />
                    </View>
                    <Text style={styles.trustBadgeText}>Cold-Chain Protected</Text>
                  </View>
                  <View style={[styles.trustBadgeItem, styles.trustBadge4]}>
                    <View style={[styles.trustIconCircle, { backgroundColor: '#FAF5FF' }]}>
                      <Ionicons name="medkit" size={15} color="#1E3A8A" />
                    </View>
                    <Text style={styles.trustBadgeText}>Pharmacist Verified</Text>
                  </View>
                </View>
              </View>

              {/* Right Column: Title, Price, Quantity & CTA Actions */}
              <View style={styles.desktopInfoCol}>
                <View style={styles.brandCategoryRow}>
                  <Text style={styles.categoryPill}>{getShortCategory(product.category)}</Text>
                  <Text style={styles.brandPillText}>{product.brand || 'Verified Manufacturer'}</Text>
                </View>

                <Text style={styles.productTitleDesktop}>{product.name}</Text>
                {product.packSize ? (
                  <Text style={styles.packSizeDesktop}>{product.packSize}</Text>
                ) : null}

                {/* Ratings */}
                <View style={styles.ratingRowDesktop}>
                  <View style={styles.ratingPillDesktop}>
                    <Ionicons name="star" size={13} color="#FF7F50" />
                    <Text style={styles.ratingPillText}>{product.rating || '4.8'}</Text>
                  </View>
                  <Text style={styles.ratingCountDesktop}>
                    {formatReviewCount(product.reviewsCount)} verified patient ratings
                  </Text>
                </View>

                {/* Pricing Card */}
                <View style={styles.pricingCardDesktop}>
                  <View style={styles.cardGradientBarTeal} />
                  <View style={styles.pricingInnerPad}>
                    <View style={styles.priceRowDesktop}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                        <Text style={styles.priceCurrentDesktop}>₹{product.price}</Text>
                        {Boolean(product.mrp && product.mrp > product.price) ? (
                          <Text style={styles.priceMrpDesktop}>MRP ₹{product.mrp}</Text>
                        ) : null}
                        <View style={styles.savingsPill}>
                          <Text style={styles.savingsPillText}>{discountStr}</Text>
                        </View>
                      </View>

                      {/* Right Express Delivery Badge */}
                      <View style={styles.pricingRightBadge}>
                        <Ionicons name="flash" size={13} color="#FF7F50" />
                        <Text style={styles.pricingRightBadgeText}>60-Min Express</Text>
                      </View>
                    </View>
                    <Text style={styles.taxInclusiveText}>Inclusive of all applicable taxes</Text>
                  </View>
                </View>

                {/* Rx Alert (if prescription required) */}
                {Boolean(product.requiresPrescription) ? (
                  <View style={styles.rxAlertCard}>
                    <Ionicons name="document-text-outline" size={22} color="#1E3A8A" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rxAlertTitle}>Doctor's Prescription Required</Text>
                      <Text style={styles.rxAlertText}>
                        A valid medical prescription is required to dispense this medicine. You can upload it during checkout or consult our online doctor.
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Quantity & Purchase Action Buttons */}
                <View style={styles.desktopActionsBox}>
                  <View style={styles.cardGradientBarNavy} />
                  <View style={styles.actionsInnerPad}>
                    <View style={styles.desktopQtyRow}>
                      <Text style={styles.desktopQtyLabel}>Quantity:</Text>
                      <View style={styles.desktopQtyStepper}>
                        <TouchableOpacity
                          style={styles.desktopQtyBtn}
                          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="remove" size={16} color="#00B894" />
                        </TouchableOpacity>
                        <Text style={styles.desktopQtyNumber}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.desktopQtyBtn}
                          onPress={() => setQuantity((q) => q + 1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={16} color="#00B894" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.desktopSubtotalText}>
                        Subtotal: <Text style={styles.desktopSubtotalBold}>₹{product.price * quantity}</Text>
                      </Text>
                    </View>

                    <View style={styles.desktopBtnGroup}>
                      <TouchableOpacity
                        style={styles.desktopAddToCartBtn}
                        onPress={handleAddToCart}
                        activeOpacity={0.88}
                      >
                        <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.desktopAddToCartText}>Add to Cart</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.desktopBuyNowBtn}
                        onPress={handleBuyNow}
                        activeOpacity={0.88}
                      >
                        <Ionicons name="flash" size={17} color="#FFFFFF" />
                        <Text style={styles.desktopBuyNowText}>Buy Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Store Fulfilment Banner */}
                {currentStore ? (
                  <View style={styles.storeFulfilmentCard}>
                    <View style={styles.storeIconCircle}>
                      <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.storeFulfilmentTitle}>
                        Fulfilled & Dispensed by {currentStore.name}
                      </Text>
                      <Text style={styles.storeFulfilmentSub}>
                        {currentStore.locality} • Delivery in {currentStore.deliveryTime || '15-25 mins'} • Verified Partner
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Product Information & Care Specifications */}
            <View style={styles.specsSection}>
              <Text style={styles.sectionHeadingLarge}>Product Information & Care</Text>
              <View style={styles.specsGrid}>
                <View style={[styles.specCard, styles.specCardOverview]}>
                  <View style={styles.cardGradientBarTeal} />
                  <View style={styles.specCardInnerPad}>
                    <View style={styles.specCardHeader}>
                      <View style={[styles.specIconCircle, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                        <Ionicons name="document-text-outline" size={16} color="#00B894" />
                      </View>
                      <Text style={styles.specCardTitle}>Product Overview</Text>
                    </View>
                    <Text style={styles.specCardBody}>
                      {product.description || 'Quality-assured healthcare formulation directly supplied by certified pharmaceutical partners.'}
                    </Text>
                  </View>
                </View>

                {product.activeIngredients ? (
                  <View style={[styles.specCard, styles.specCardIngredients]}>
                    <View style={styles.cardGradientBarCyan} />
                    <View style={styles.specCardInnerPad}>
                      <View style={styles.specCardHeader}>
                        <View style={[styles.specIconCircle, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                          <Ionicons name="flask-outline" size={16} color="#00C2CB" />
                        </View>
                        <Text style={styles.specCardTitle}>Active Ingredients & Composition</Text>
                      </View>
                      <Text style={styles.specCardBody}>{product.activeIngredients}</Text>
                    </View>
                  </View>
                ) : null}

                {product.uses ? (
                  <View style={[styles.specCard, styles.specCardUses]}>
                    <View style={styles.cardGradientBarPurple} />
                    <View style={styles.specCardInnerPad}>
                      <View style={styles.specCardHeader}>
                        <View style={[styles.specIconCircle, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                          <Ionicons name="bandage-outline" size={16} color="#7C3AED" />
                        </View>
                        <Text style={styles.specCardTitle}>Key Therapeutic Uses</Text>
                      </View>
                      <Text style={styles.specCardBody}>{product.uses}</Text>
                    </View>
                  </View>
                ) : null}

                {product.dosage ? (
                  <View style={[styles.specCard, styles.specCardDosage]}>
                    <View style={styles.cardGradientBarCoral} />
                    <View style={styles.specCardInnerPad}>
                      <View style={styles.specCardHeader}>
                        <View style={[styles.specIconCircle, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                          <Ionicons name="time-outline" size={16} color="#FF7F50" />
                        </View>
                        <Text style={styles.specCardTitle}>Dosage & Administration</Text>
                      </View>
                      <Text style={styles.specCardBody}>{product.dosage}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Similar Healthcare Items (Matching Pharmacy Cards Standard) */}
            {relatedProducts.length > 0 ? (
              <View style={styles.relatedSectionDesktop}>
                <Text style={styles.sectionHeadingLarge}>Similar Healthcare Products</Text>
                <View style={styles.relatedGridDesktop}>
                  {relatedProducts.map((item) => {
                    const itemImg = getProductImage(item);
                    const itemDiscount = formatDiscountText(item.discount, item.mrp || item.oldPrice, item.price);
                    const cartItem = (pharmacyCart || []).find((ci) => ci.id === item.id);
                    const itemQty = cartItem?.quantity || 0;

                    return (
                      <View key={item.id} style={styles.relatedCard}>
                        {/* Top Gradient Bar */}
                        <View style={styles.cardGradientBarMulticolor} />

                        <View style={styles.relatedBadge}>
                          <Text style={styles.relatedBadgeText}>{itemDiscount}</Text>
                        </View>
                        {Boolean(item.requiresPrescription) ? (
                          <View style={styles.relatedRxBadge}>
                            <Text style={styles.relatedRxBadgeText}>Rx</Text>
                          </View>
                        ) : null}

                        <TouchableOpacity
                          onPress={() => {
                            if (navigation.push) {
                              navigation.push('ProductDetails', { product: item, productId: item.id });
                            } else {
                              navigation.navigate('ProductDetails', { product: item, productId: item.id });
                            }
                          }}
                          style={styles.relatedImgWrap}
                          activeOpacity={0.88}
                        >
                          <OptimizedImage
                            source={{ uri: itemImg }}
                            style={styles.relatedImg}
                            resizeMode="contain"
                            fallbackIcon="medkit-outline"
                            fallbackColor="#00B894"
                          />
                        </TouchableOpacity>

                        <View style={styles.relatedBody}>
                          <Text style={styles.relatedCat}>{getShortCategory(item.category)}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              if (navigation.push) {
                                navigation.push('ProductDetails', { product: item, productId: item.id });
                              } else {
                                navigation.navigate('ProductDetails', { product: item, productId: item.id });
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.relatedTitle} numberOfLines={2}>
                              {item.name}
                            </Text>
                          </TouchableOpacity>

                          <View style={styles.relatedRatingRow}>
                            <Ionicons name="star" size={11} color="#FF7F50" />
                            <Text style={styles.relatedRatingText}>{item.rating || '4.8'}</Text>
                            <Text style={styles.relatedReviewsText}>{formatReviewCount(item.reviewsCount)}</Text>
                          </View>

                          <View style={styles.relatedPriceRow}>
                            <Text style={styles.relatedPrice}>₹{item.price}</Text>
                            {Boolean(item.mrp || item.oldPrice) ? (
                              <Text style={styles.relatedMrp}>MRP ₹{item.mrp || item.oldPrice}</Text>
                            ) : null}
                          </View>

                          {itemQty > 0 ? (
                            <View style={styles.relatedStepper}>
                              <TouchableOpacity
                                style={styles.relatedStepperBtn}
                                onPress={() => decreaseQuantity(item.id, 'pharmacy')}
                              >
                                <Ionicons name="remove" size={13} color="#00B894" />
                              </TouchableOpacity>
                              <Text style={styles.relatedStepperQty}>{itemQty}</Text>
                              <TouchableOpacity
                                style={styles.relatedStepperBtn}
                                onPress={() => increaseQuantity(item.id, 'pharmacy')}
                              >
                                <Ionicons name="add" size={13} color="#00B894" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.relatedAddBtn}
                              onPress={() => addToCart(item, 1, 'pharmacy', currentStore)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="cart-outline" size={14} color="#FFFFFF" />
                              <Text style={styles.relatedAddBtnText}>Add to Cart</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          /* ========================================================
             MOBILE RESPONSIVE SINGLE-COLUMN LAYOUT
             ======================================================== */
          <View style={styles.mobileLayoutWrap}>
            <View style={styles.mobileImageCard}>
              {discountStr ? (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discountStr}</Text>
                </View>
              ) : null}

              {Boolean(product.requiresPrescription) ? (
                <View style={styles.rxBadge}>
                  <Text style={styles.rxBadgeText}>Rx</Text>
                </View>
              ) : null}

              <View style={styles.stockBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#00B894" />
                <Text style={styles.stockBadgeText}>In Stock</Text>
              </View>

              <OptimizedImage
                source={{ uri: prodImg }}
                style={styles.mobileProductImage}
                containerStyle={{ backgroundColor: '#FFFFFF' }}
                placeholderColor="#FFFFFF"
                resizeMode="contain"
                fallbackIcon="medkit-outline"
                fallbackColor="#00B894"
              />
            </View>

            <View style={styles.mobileMetaBox}>
              <View style={styles.brandCategoryRow}>
                <Text style={styles.categoryPill}>{getShortCategory(product.category)}</Text>
                <View style={styles.ratingBadgeMobile}>
                  <Ionicons name="star" size={11} color="#FF7F50" />
                  <Text style={styles.ratingTextMobile}>{product.rating || '4.8'}</Text>
                </View>
              </View>

              <Text style={styles.productTitleMobile}>{product.name}</Text>
              {product.packSize ? (
                <Text style={styles.packSizeMobile}>{product.packSize}</Text>
              ) : null}

              <View style={styles.priceRowMobile}>
                <Text style={styles.priceCurrentMobile}>₹{product.price}</Text>
                {Boolean(product.mrp && product.mrp > product.price) ? (
                  <Text style={styles.priceMrpMobile}>MRP ₹{product.mrp}</Text>
                ) : null}
                <View style={styles.savingsPill}>
                  <Text style={styles.savingsPillText}>{discountStr}</Text>
                </View>
              </View>

              {/* Quantity Picker Mobile */}
              <View style={styles.mobileQtyRow}>
                <Text style={styles.mobileQtyLabel}>Quantity:</Text>
                <View style={styles.mobileQtyStepper}>
                  <TouchableOpacity
                    style={styles.mobileQtyBtn}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={16} color="#00B894" />
                  </TouchableOpacity>
                  <Text style={styles.mobileQtyNumber}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.mobileQtyBtn}
                    onPress={() => setQuantity((q) => q + 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#00B894" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Specs Cards Mobile */}
              <View style={styles.mobileSpecsSection}>
                <Text style={styles.sectionHeadingMobile}>Product Overview</Text>
                <Text style={styles.descTextMobile}>{product.description}</Text>

                {product.activeIngredients ? (
                  <View style={styles.specCardMobile}>
                    <Text style={styles.specTitleMobile}>Active Ingredients</Text>
                    <Text style={styles.specBodyMobile}>{product.activeIngredients}</Text>
                  </View>
                ) : null}

                {product.uses ? (
                  <View style={styles.specCardMobile}>
                    <Text style={styles.specTitleMobile}>Key Uses</Text>
                    <Text style={styles.specBodyMobile}>{product.uses}</Text>
                  </View>
                ) : null}

                {product.dosage ? (
                  <View style={styles.specCardMobile}>
                    <Text style={styles.specTitleMobile}>Dosage</Text>
                    <Text style={styles.specBodyMobile}>{product.dosage}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* 3. WEB FOOTER (Desktop only) */}
        {isDesktopWeb ? <WebFooter navigation={navigation} /> : null}
      </ScrollView>

      {/* 4. MOBILE BOTTOM ACTION BAR (Hidden on Desktop Web) */}
      {!isDesktopWeb ? (
        <View style={styles.mobileBottomBar}>
          <View style={styles.mobileBottomPriceWrap}>
            <Text style={styles.mobileBottomPriceLabel}>Total ({quantity} item{quantity > 1 ? 's' : ''})</Text>
            <Text style={styles.mobileBottomPriceValue}>₹{product.price * quantity}</Text>
          </View>

          <View style={styles.mobileBottomBtnGroup}>
            <TouchableOpacity
              style={styles.mobileAddCartBtn}
              activeOpacity={0.85}
              onPress={handleAddToCart}
            >
              <Ionicons name="cart-outline" size={16} color="#00B894" />
              <Text style={styles.mobileAddCartText}>Add to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mobileBuyNowBtn}
              activeOpacity={0.85}
              onPress={handleBuyNow}
            >
              <Ionicons name="flash" size={15} color="#FFFFFF" />
              <Text style={styles.mobileBuyNowText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FAFCFD',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
  },

  // 1. DESKTOP BREADCRUMB & HEADER
  webBreadcrumbBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    width: '100%',
  },
  webBreadcrumbInner: {
    width: '100%',
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  breadcrumbPath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  breadcrumbDivider: {
    fontSize: 13,
    color: '#94A3B8',
  },
  breadcrumbActive: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '700',
    maxWidth: 600,
  },

  // 2. MOBILE HEADER
  mobileHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mobileBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  mobileCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mobileCartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF7F50',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  mobileCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // CARD TOP GRADIENT ACCENT BARS
  cardGradientBarMulticolor: {
    height: 4,
    width: '100%',
    backgroundImage: 'linear-gradient(90deg, #00B894 0%, #00C2CB 50%, #1E3A8A 100%)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  cardGradientBarTeal: {
    height: 4,
    width: '100%',
    backgroundImage: 'linear-gradient(90deg, #00B894 0%, #00C2CB 100%)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  cardGradientBarNavy: {
    height: 4,
    width: '100%',
    backgroundImage: 'linear-gradient(90deg, #1E3A8A 0%, #00B894 100%)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  cardGradientBarCyan: {
    height: 4,
    width: '100%',
    backgroundImage: 'linear-gradient(90deg, #00C2CB 0%, #0284C7 100%)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  cardGradientBarPurple: {
    height: 4,
    width: '100%',
    backgroundImage: 'linear-gradient(90deg, #7C3AED 0%, #6366F1 100%)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  cardGradientBarCoral: {
    height: 4,
    width: '100%',
    backgroundImage: 'linear-gradient(90deg, #FF7F50 0%, #F59E0B 100%)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },

  // 3. DESKTOP SHOWCASE LAYOUT
  desktopLayoutWrap: {
    width: '100%',
    paddingHorizontal: 40,
    paddingVertical: 24,
  },
  desktopShowcaseRow: {
    flexDirection: 'row',
    gap: 40,
    alignItems: 'flex-start',
    width: '100%',
  },
  desktopImageCol: {
    width: 500,
    maxWidth: 540,
  },
  desktopImageCard: {
    width: '100%',
    height: 460,
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(160deg, #FFFFFF 0%, #F8FAFC 60%, #F0FDF9 100%)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    boxShadow: '0 10px 30px -4px rgba(0, 184, 148, 0.09), 0 4px 12px rgba(30, 58, 138, 0.04)',
  },
  desktopProductImage: {
    width: '92%',
    height: '92%',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 2,
  },
  discountBadgeText: {
    color: '#FF7F50',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rxBadge: {
    position: 'absolute',
    top: 14,
    left: 92,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 2,
  },
  rxBadgeText: {
    color: '#1E3A8A',
    fontSize: 10,
    fontWeight: '800',
  },
  stockBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  stockBadgeText: {
    color: '#00B894',
    fontSize: 10.5,
    fontWeight: '800',
  },
  trustBadgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  trustBadgeItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 8px rgba(30, 58, 138, 0.04)',
  },
  trustBadge1: {
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)',
    borderColor: '#A7F3D0',
  },
  trustBadge2: {
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FFF5F0 100%)',
    borderColor: '#FED7AA',
  },
  trustBadge3: {
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)',
    borderColor: '#BAE6FD',
  },
  trustBadge4: {
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)',
    borderColor: '#E9D5FF',
  },
  trustIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },

  // RIGHT INFO COLUMN
  desktopInfoCol: {
    flex: 1,
  },
  brandCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  categoryPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B894',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  brandPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  productTitleDesktop: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E3A8A',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  packSizeDesktop: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  ratingRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  ratingPillDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF7F50',
  },
  ratingCountDesktop: {
    fontSize: 12,
    color: '#64748B',
  },

  // PRICING CARD
  pricingCardDesktop: {
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #F0FDF9 100%)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    borderLeftWidth: 4,
    borderLeftColor: '#00B894',
    marginTop: 16,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 6px 20px -2px rgba(0, 184, 148, 0.08)',
  },
  pricingInnerPad: {
    padding: 18,
    paddingTop: 20,
  },
  pricingRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pricingRightBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF7F50',
  },
  priceRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  priceCurrentDesktop: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  priceMrpDesktop: {
    fontSize: 15,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  savingsPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsPillText: {
    color: '#00B894',
    fontSize: 11,
    fontWeight: '800',
  },
  taxInclusiveText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // RX WARNING
  rxAlertCard: {
    marginTop: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rxAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  rxAlertText: {
    fontSize: 11.5,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 16,
  },

  // DESKTOP ACTIONS BOX
  desktopActionsBox: {
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 50%, #EFF6FF 100%)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    marginTop: 18,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 24px -2px rgba(30, 58, 138, 0.07)',
  },
  actionsInnerPad: {
    padding: 20,
    paddingTop: 22,
    gap: 16,
  },
  desktopQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  desktopQtyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  desktopQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    height: 36,
  },
  desktopQtyBtn: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopQtyNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00B894',
    minWidth: 24,
    textAlign: 'center',
  },
  desktopSubtotalText: {
    fontSize: 13,
    color: '#64748B',
  },
  desktopSubtotalBold: {
    fontWeight: '800',
    color: '#1E3A8A',
    fontSize: 14,
  },
  desktopBtnGroup: {
    flexDirection: 'row',
    gap: 14,
    maxWidth: 580,
  },
  desktopAddToCartBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#00B894',
    backgroundImage: 'linear-gradient(135deg, #00B894 0%, #009B7B 100%)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0 4px 14px rgba(0, 184, 148, 0.3)',
  },
  desktopAddToCartText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopBuyNowBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#1E3A8A',
    backgroundImage: 'linear-gradient(135deg, #1E3A8A 0%, #152A63 100%)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0 4px 14px rgba(30, 58, 138, 0.3)',
  },
  desktopBuyNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // STORE FULFILMENT
  storeFulfilmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF9 60%, #ECFDF5 100%)',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    boxShadow: '0 4px 14px rgba(0, 184, 148, 0.06)',
  },
  storeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00B894',
    backgroundImage: 'linear-gradient(135deg, #00B894 0%, #00C2CB 100%)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  storeFulfilmentTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  storeFulfilmentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // SPECS & INFORMATION SECTION
  specsSection: {
    marginTop: 36,
    width: '100%',
  },
  sectionHeadingLarge: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  specCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    boxShadow: '0 6px 20px -2px rgba(30, 58, 138, 0.07)',
  },
  specCardInnerPad: {
    padding: 18,
    paddingTop: 20,
  },
  specCardOverview: {
    backgroundImage: 'linear-gradient(145deg, #FFFFFF 0%, #F0FDF4 65%, #ECFDF5 100%)',
    borderColor: '#A7F3D0',
  },
  specCardIngredients: {
    backgroundImage: 'linear-gradient(145deg, #FFFFFF 0%, #F0F9FF 65%, #E0F2FE 100%)',
    borderColor: '#BAE6FD',
  },
  specCardUses: {
    backgroundImage: 'linear-gradient(145deg, #FFFFFF 0%, #FAF5FF 65%, #F3E8FF 100%)',
    borderColor: '#DDD6FE',
  },
  specCardDosage: {
    backgroundImage: 'linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 65%, #FFEDD5 100%)',
    borderColor: '#FED7AA',
  },
  specIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  specCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  specCardBody: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 19,
  },

  // RELATED PRODUCTS (DESKTOP)
  relatedSectionDesktop: {
    marginTop: 40,
    width: '100%',
  },
  relatedGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  relatedCard: {
    flex: 1,
    minWidth: 230,
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 60%, #F0FDF9 100%)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    paddingTop: 18,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    minHeight: 310,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    boxShadow: '0 8px 24px -3px rgba(30, 58, 138, 0.08), 0 2px 6px rgba(0, 184, 148, 0.04)',
    cursor: 'pointer',
  },
  relatedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  relatedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FF7F50',
  },
  relatedRxBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  relatedRxBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  relatedImgWrap: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8FAFC',
    backgroundImage: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 50%, #ECFDF5 100%)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginTop: 14,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  relatedImg: {
    width: '85%',
    height: '85%',
  },
  relatedBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  relatedCat: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00B894',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    lineHeight: 18,
    height: 36,
  },
  relatedRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  relatedRatingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  relatedReviewsText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  relatedPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 8,
  },
  relatedPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  relatedMrp: {
    fontSize: 11.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  relatedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00B894',
    backgroundImage: 'linear-gradient(135deg, #00B894 0%, #009B7B 100%)',
    borderRadius: 8,
    height: 36,
    cursor: 'pointer',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  relatedAddBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  relatedStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    height: 34,
    paddingHorizontal: 8,
  },
  relatedStepperBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedStepperQty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00B894',
  },

  // 4. MOBILE SINGLE-COLUMN LAYOUT
  mobileLayoutWrap: {
    padding: 16,
  },
  mobileImageCard: {
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 16,
  },
  mobileProductImage: {
    width: '85%',
    height: '85%',
  },
  mobileMetaBox: {
    marginTop: 16,
  },
  ratingBadgeMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingTextMobile: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF7F50',
  },
  productTitleMobile: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    lineHeight: 24,
    marginTop: 6,
  },
  packSizeMobile: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  priceRowMobile: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 10,
  },
  priceCurrentMobile: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  priceMrpMobile: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  mobileQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginTop: 14,
  },
  mobileQtyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  mobileQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00B894',
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    height: 34,
  },
  mobileQtyBtn: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileQtyNumber: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#00B894',
    minWidth: 20,
    textAlign: 'center',
  },
  mobileSpecsSection: {
    marginTop: 20,
  },
  sectionHeadingMobile: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  descTextMobile: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  specCardMobile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  specTitleMobile: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 3,
  },
  specBodyMobile: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },

  // 5. MOBILE BOTTOM ACTION BAR
  mobileBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
  },
  mobileBottomPriceWrap: {
    justifyContent: 'center',
  },
  mobileBottomPriceLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  mobileBottomPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  mobileBottomBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileAddCartBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#00B894',
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mobileAddCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B894',
  },
  mobileBuyNowBtn: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#00B894',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mobileBuyNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // NOT FOUND
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 12,
  },
  backHomeBtn: {
    marginTop: 16,
    backgroundColor: '#00B894',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ProductDetailsScreen;