import React from 'react';
import { View, StyleSheet, Animated, DimensionValue, Dimensions } from 'react-native';
import { COLORS } from '../theme/colors';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonItemProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

// Global shared animated value for synchronized skeleton pulsing.
// This single animation loop replaces dozens of independent loops,
// dramatically reducing CPU usage and eliminating animation lag on lower-end devices.
const globalPulseValue = new Animated.Value(0.35);

function startGlobalPulse() {
  Animated.loop(
    Animated.sequence([
      Animated.timing(globalPulseValue, {
        toValue: 0.65,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(globalPulseValue, {
        toValue: 0.35,
        duration: 900,
        useNativeDriver: true,
      }),
    ])
  ).start();
}

// Start the global loop immediately when the module is loaded
startGlobalPulse();

export function SkeletonItem({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonItemProps) {
  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: globalPulseValue,
        },
        style,
      ]}
    />
  );
}

// Synced with MovieCard.tsx (aspectRatio: 2/3, details text, same border/bg styles)
export function SkeletonCard({ width }: { width?: number }) {
  const cardWidth = width || '100%';
  return (
    <View style={[styles.cardContainer, { width: cardWidth }]}>
      <View style={styles.cardPosterContainer}>
        <SkeletonItem height="100%" borderRadius={12} style={styles.cardPoster} />
      </View>
      <View style={styles.cardDetails}>
        <SkeletonItem height={13} width="85%" style={styles.cardText} />
        <SkeletonItem height={10} width="60%" style={styles.cardTextSub} />
      </View>
    </View>
  );
}

// Synced with MovieSlider.tsx (paddingHorizontal: 16, accentBar, gap: 12, snapToInterval, card width 132)
export function SkeletonSlider() {
  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <View style={styles.titleContainer}>
          <View style={styles.accentBar} />
          <SkeletonItem height={18} width={130} borderRadius={4} />
        </View>
      </View>
      <View style={styles.sliderCards}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} width={132} />
        ))}
      </View>
    </View>
  );
}

// Synced with HomeScreen.tsx Hero Banner (covers SCREEN_HEIGHT * 0.65, linear gradient, same badges & cta spacing)
export function SkeletonHero() {
  return (
    <View style={styles.heroContainer}>
      <SkeletonItem height="100%" width="100%" style={styles.heroPlaceholderImage} />
      <View style={styles.heroContent}>
        <View style={styles.badgeRow}>
          <SkeletonItem height={18} width={70} borderRadius={6} />
          <SkeletonItem height={18} width={60} borderRadius={6} />
          <SkeletonItem height={18} width={60} borderRadius={6} />
        </View>
        <SkeletonItem height={28} width="80%" style={{ marginVertical: 4 }} />
        <SkeletonItem height={14} width="50%" style={{ marginBottom: 4 }} />
        <View style={styles.metaRow}>
          <SkeletonItem height={13} width={45} />
          <SkeletonItem height={13} width={60} />
          <SkeletonItem height={13} width={80} />
        </View>
        <SkeletonItem height={12} width="95%" style={{ marginTop: 6 }} />
        <SkeletonItem height={12} width="85%" style={{ marginTop: 4 }} />
        <View style={styles.buttonRow}>
          <SkeletonItem height={38} style={styles.heroCtaBtn} borderRadius={8} />
          <SkeletonItem height={38} style={styles.heroCtaBtn} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

// Synced with MovieDetailScreen.tsx (backdrop SCREEN_HEIGHT*0.35, mainInfoSection negative margin, ctaContainer, synopsisCard, episodesCard)
export function SkeletonDetail() {
  return (
    <View style={styles.detailContainer}>
      {/* Backdrop Banner Skeleton */}
      <SkeletonItem height={SCREEN_HEIGHT * 0.35} style={styles.detailBanner} />

      {/* Main Info Section (Poster Left, Meta Right) */}
      <View style={styles.detailContentHeader}>
        <View style={styles.detailPosterColumn}>
          {/* Synced with posterCard style (aspectRatio: 2/3, borderWidth: 1.5, borderColor) */}
          <View style={styles.detailPosterCard}>
            <SkeletonItem height="100%" width="100%" />
          </View>
        </View>
        <View style={styles.detailDetailsColumn}>
          <SkeletonItem height={20} width="95%" style={styles.detailGap} />
          <SkeletonItem height={12} width="70%" style={styles.detailGap} />
          <View style={styles.detailMetaRow}>
            <SkeletonItem height={16} width={40} style={styles.detailBadge} />
            <SkeletonItem height={16} width={45} style={styles.detailBadge} />
            <SkeletonItem height={16} width={45} style={styles.detailBadge} />
          </View>
          <SkeletonItem height={12} width={80} style={styles.detailGap} />
          <SkeletonItem height={12} width={130} style={styles.detailGap} />
        </View>
      </View>

      {/* CTA Buttons (Play & Favorite) - Synced with ctaContainer */}
      <View style={styles.ctaContainer}>
        <SkeletonItem height={44} style={styles.ctaBtn} borderRadius={10} />
        <SkeletonItem height={44} style={styles.ctaBtn} borderRadius={10} />
      </View>

      {/* Synopsis Card - Synced with synopsisCard */}
      <View style={styles.synopsisCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.accentBar} />
          <SkeletonItem height={12} width={120} />
        </View>
        <SkeletonItem height={13} width="100%" style={{ marginTop: 8 }} />
        <SkeletonItem height={13} width="100%" style={{ marginTop: 6 }} />
        <SkeletonItem height={13} width="90%" style={{ marginTop: 6 }} />
      </View>

      {/* Episodes Card - Synced with episodesCard */}
      <View style={styles.episodesCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.accentBar} />
          <SkeletonItem height={12} width={100} />
        </View>
        <View style={styles.episodesGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonItem key={i} height={36} style={styles.episodeBtnSkeleton} borderRadius={10} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#27272A', // zinc-700 to match dark theme background
  },
  
  // Card styles
  cardContainer: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  cardPosterContainer: {
    aspectRatio: 2 / 3,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#1E1E1E',
  },
  cardPoster: {
    width: '100%',
    height: '100%',
  },
  cardDetails: {
    marginTop: 6,
    paddingHorizontal: 2,
    gap: 4,
  },
  cardText: {
    marginTop: 2,
  },
  cardTextSub: {
    marginTop: 1,
  },

  // Slider styles
  sliderContainer: {
    marginVertical: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 3.5,
    height: 18,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  sliderCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },

  // Hero styles
  heroContainer: {
    height: SCREEN_HEIGHT * 0.65,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  heroPlaceholderImage: {
    opacity: 0.25,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  heroCtaBtn: {
    flex: 1,
    opacity: 0.6,
  },

  // Detail styles
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailBanner: {
    width: '100%',
    opacity: 0.2,
  },
  detailContentHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -80,
    gap: 16,
    zIndex: 10,
  },
  detailPosterColumn: {
    width: 110,
  },
  detailPosterCard: {
    aspectRatio: 2 / 3,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#1E1E1E',
  },
  detailDetailsColumn: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
    gap: 6,
  },
  detailGap: {
    marginBottom: 2,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  detailBadge: {
    borderRadius: 4,
  },

  // Detail CTA
  ctaContainer: {
    flexDirection: 'column',
    gap: 10,
    paddingHorizontal: 16,
    marginVertical: 18,
  },
  ctaBtn: {
    width: '100%',
    opacity: 0.6,
  },

  // Detail Synopsis
  synopsisCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Detail Episodes
  episodesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  episodeBtnSkeleton: {
    // Synced with MovieDetailScreen episode layout (Math.floor((SCREEN_WIDTH - 64 - 30) / 4) - 1.5)
    width: Math.floor((SCREEN_WIDTH - 64 - 30) / 4) - 1.5,
    opacity: 0.5,
  },
});
