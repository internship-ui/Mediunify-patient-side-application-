import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { PROMOTIONAL_OFFERS } from '../../data/promotionalOffersData';
import { isDesktopSiteRequested } from '../../utils/responsiveLayoutHelper';

export default function PromotionalAdsSection({ onNavigate }) {
  const { width } = useWindowDimensions();
  const { t, isIndic, isDarkMode } = useTheme();
  const desktopSiteMode = isDesktopSiteRequested();
  const isDesktop = desktopSiteMode || width >= 1024;
  const isTablet = !desktopSiteMode && (width >= 768 && width < 1024);
  const isMobile = !desktopSiteMode && (width < 768);

  const totalOffers = PROMOTIONAL_OFFERS.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCouponId, setCopiedCouponId] = useState(null);

  // Auto-advance sliding timer (4.5s), pauses when user hovers
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalOffers);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, totalOffers]);

  const handlePrev = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? totalOffers - 1 : prev - 1));
  };

  const handleNext = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % totalOffers);
  };

  const handleDotClick = (idx, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setCurrentIndex(idx);
  };

  const handleCopyCoupon = (id, code, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCouponId(id);
    setTimeout(() => {
      setCopiedCouponId(null);
    }, 2200);
  };

  return (
    <View style={[styles.sectionContainer, { maxWidth: isDesktop ? 1340 : '96%' }]}>
      {/* SECTION HEADER WITH SLIDER CONTROLS */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.badgeWrap, isDarkMode && { backgroundColor: 'rgba(5, 150, 105, 0.15)', borderColor: 'rgba(5, 150, 105, 0.35)' }]}>
            <Ionicons name="sparkles" size={13} color={isDarkMode ? '#00E5B0' : '#059669'} style={{ marginRight: 6 }} />
            <Text style={[styles.badgeText, isDarkMode && { color: '#00E5B0' }]}>{t('special_deals_badge', 'OFFERS & DEALS')}</Text>
          </View>
          <Text style={[styles.sectionTitle, isIndic && { lineHeight: 32 }, isDarkMode && { color: '#FFFFFF' }]}>
            {t('special_deals_title', 'Healthcare Deals & Savings')}
          </Text>
        </View>


      </View>

      {/* ============================================================
          MAIN SLIDING CAROUSEL VIEWPORT (SHOWS EXACTLY ONE AD AT A TIME)
      ============================================================ */}
      <View
        style={styles.sliderViewport}
        // @ts-ignore
        onMouseEnter={() => setIsPaused(true)}
        // @ts-ignore
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Floating Side Arrow: Previous (Z-Index above slides, does not overlap text thanks to 68px card padding) */}
        <TouchableOpacity
          style={[styles.floatingSideArrow, styles.floatingArrowLeft, isDarkMode && { backgroundColor: '#18253D', borderColor: 'rgba(255, 255, 255, 0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }]}
          onPress={handlePrev}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Previous Offer"
        >
          <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#FFFFFF' : '#0C3B6B'} />
        </TouchableOpacity>

        {/* Floating Side Arrow: Next */}
        <TouchableOpacity
          style={[styles.floatingSideArrow, styles.floatingArrowRight, isDarkMode && { backgroundColor: '#18253D', borderColor: 'rgba(255, 255, 255, 0.15)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }]}
          onPress={handleNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Next Offer"
        >
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#FFFFFF' : '#0C3B6B'} />
        </TouchableOpacity>

        {/* Sliding Track containing all offer cards */}
        <View
          style={[
            styles.sliderTrack,
            {
              width: `${totalOffers * 100}%`,
              ...(Platform.OS === 'web'
                ? {
                    transform: `translateX(-${currentIndex * (100 / totalOffers)}%)`,
                    transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
                  }
                : {}),
            },
          ]}
        >
          {PROMOTIONAL_OFFERS.map((ad, idx) => {
            const isCopied = copiedCouponId === ad.id;

            return (
              <View
                key={ad.id}
                style={[
                  styles.slideItem,
                  { width: `${100 / totalOffers}%` },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.adShowcaseCard,
                    {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : ad.borderColor,
                      backgroundColor: isDarkMode ? '#121D32' : ad.solidBg,
                      paddingHorizontal: isDesktop ? 68 : isTablet ? 56 : 20,
                      ...(Platform.OS === 'web'
                        ? {
                            backgroundImage: isDarkMode
                              ? 'linear-gradient(145deg, #131E35 0%, #0E1626 100%)'
                              : `linear-gradient(135deg, ${ad.gradientColors[0]} 0%, ${ad.gradientColors[1]} 50%, ${ad.gradientColors[2]} 100%)`,
                            boxShadow: isDarkMode
                              ? '0 14px 34px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                              : '0 8px 24px rgba(12, 59, 107, 0.08)',
                          }
                        : {}),
                    },
                  ]}
                  activeOpacity={0.96}
                  onPress={() => onNavigate && onNavigate(ad.route)}
                >
                  {/* TOP BADGE ROW */}
                  <View style={styles.showcaseTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.categoryBadge, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF', borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.14)' : ad.borderColor }]}>
                        <Text style={[styles.categoryBadgeText, { color: isDarkMode ? (ad.accentColor || '#00E5B0') : ad.tagColor }]}>{ad.discount || ad.badge}</Text>
                      </View>
                    </View>

                    <View style={[styles.slideCounterTag, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                      <Text style={[styles.slideCounterTagText, isDarkMode && { color: '#94A3B8' }]}>
                        {idx + 1} / {totalOffers}
                      </Text>
                    </View>
                  </View>

                  {/* MAIN BODY: 2-COLUMN SPLIT (DETAILS + PHOTO) */}
                  <View style={[styles.showcaseBody, isMobile && { flexDirection: 'column-reverse' }]}>
                    {/* Left Column: Title, Single Short Benefit, Pricing, CTA */}
                    <View style={styles.showcaseLeftCol}>
                      <Text style={[styles.showcaseTitle, isDarkMode && { color: '#FFFFFF' }]}>{ad.title}</Text>

                      {/* One short benefit */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 }}>
                        <Ionicons name="checkmark-circle" size={16} color={ad.accentColor} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? '#94A3B8' : '#334155' }}>{ad.subtitle}</Text>
                      </View>

                      {/* Bottom Pricing & Action Bar */}
                      <View style={[styles.bottomActionBar, isDarkMode && { borderTopColor: 'rgba(255, 255, 255, 0.08)' }]}>
                        {/* Price Block */}
                        <View style={styles.priceBlock}>
                          <View style={styles.priceRow}>
                            <Text style={[styles.offerPrice, { color: ad.accentColor }]}>{ad.offerPrice}</Text>
                            {ad.originalPrice && (
                              <Text style={styles.originalPrice}>{ad.originalPrice}</Text>
                            )}
                          </View>
                        </View>

                        {/* Coupon Code Chip */}
                        {ad.couponCode && (
                          <TouchableOpacity
                            style={[
                              styles.couponBox,
                              { borderColor: isDarkMode ? 'rgba(0, 229, 176, 0.4)' : ad.borderColor },
                              isDarkMode && { backgroundColor: '#17243E' },
                              isCopied && styles.couponBoxActive,
                            ]}
                            onPress={(e) => handleCopyCoupon(ad.id, ad.couponCode, e)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={`Coupon code ${ad.couponCode}. Click to copy`}
                          >
                            <Ionicons
                              name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                              size={14}
                              color={isCopied ? '#00E5B0' : (isDarkMode ? '#00E5B0' : '#0C3B6B')}
                              style={{ marginRight: 6 }}
                            />
                            <View>
                              <Text style={[styles.couponLabelText, isDarkMode && { color: '#94A3B8' }]}>{t('coupon_code', 'COUPON CODE')}</Text>
                              <Text style={[styles.couponCodeText, isDarkMode && { color: '#00E5B0' }, isCopied && styles.couponCodeTextActive]}>
                                {isCopied ? t('coupon_copied', 'COPIED!') : ad.couponCode}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        {/* Primary CTA Button */}
                        <TouchableOpacity
                          style={[styles.ctaButton, { backgroundColor: ad.accentColor }]}
                          onPress={() => onNavigate && onNavigate(ad.route)}
                          activeOpacity={0.88}
                        >
                          <Text style={styles.ctaButtonText}>{ad.ctaText}</Text>
                          <Ionicons name="arrow-forward" size={15} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Right Column: High-Res Medical Visual */}
                    <View style={[styles.showcaseRightCol, isMobile && { width: '100%', height: 180, marginBottom: 12 }]}>
                      <View style={[styles.imageContainer, isDarkMode && { borderColor: 'rgba(255, 255, 255, 0.15)' }]}>
                        <Image source={ad.image} style={styles.adHeroPhoto} resizeMode="cover" />
                        <View style={[styles.discountFloatingBadge, { backgroundColor: ad.accentColor }]}>
                          <Text style={styles.discountFloatingText}>{ad.discount}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* ============================================================
          BOTTOM DOT PAGINATION INDICATORS
      ============================================================ */}
      <View style={styles.dotsContainer}>
        {PROMOTIONAL_OFFERS.map((ad, idx) => {
          const isActive = idx === currentIndex;
          return (
            <TouchableOpacity
              key={ad.id}
              style={[
                styles.dotItem,
                isActive
                  ? [styles.dotItemActive, { backgroundColor: ad.accentColor, width: 34 }]
                  : [styles.dotItemInactive, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }],
              ]}
              onPress={(e) => handleDotClick(idx, e)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Go to offer ${idx + 1}`}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 24,
    position: 'relative',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0C3B6B',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 20,
    maxWidth: 720,
  },
  headerControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slideCounterPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  slideCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  miniArrowsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
  },
  sliderViewport: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
    position: 'relative',
    boxShadow: '0 12px 32px -8px rgba(12, 59, 107, 0.12), 0 4px 12px -2px rgba(12, 59, 107, 0.04)',
  },
  floatingSideArrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -21 }],
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
  },
  floatingArrowLeft: {
    left: 14,
  },
  floatingArrowRight: {
    right: 14,
  },
  sliderTrack: {
    flexDirection: 'row',
  },
  slideItem: {
    // Width set dynamically in component to 100 / totalOffers %
  },
  adShowcaseCard: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 26,
    minHeight: 280,
    justifyContent: 'space-between',
  },
  showcaseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  categoryBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF7F50',
    letterSpacing: 0.4,
  },
  slideCounterTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  slideCounterTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  showcaseBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  showcaseLeftCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleWrap: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  showcaseTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  showcaseSubtitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  showcaseDesc: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 21,
    marginBottom: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  featureItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.07)',
  },
  priceBlock: {
    flexDirection: 'column',
    gap: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  offerPrice: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  savePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  savePillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  couponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  couponBoxActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  couponLabelText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  couponCodeText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0C3B6B',
    letterSpacing: 0.8,
  },
  couponCodeTextActive: {
    color: '#059669',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
    marginLeft: 'auto',
  },
  ctaButtonText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  showcaseRightCol: {
    width: 290,
    height: 220,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  adHeroPhoto: {
    width: '100%',
    height: '100%',
  },
  discountFloatingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  discountFloatingText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  dotItem: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  dotItemInactive: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  dotItemActive: {
    width: 34,
  },
});
