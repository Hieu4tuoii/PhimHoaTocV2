import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, DimensionValue } from 'react-native';
import { COLORS } from '../theme/colors';

interface SkeletonItemProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export function SkeletonItem({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonItemProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ width }: { width?: number }) {
  return (
    <View style={[styles.cardContainer, width ? { width } : { width: '100%' }]}>
      <SkeletonItem height="100%" borderRadius={12} style={styles.cardPoster} />
      <SkeletonItem height={14} width="80%" style={styles.cardText} />
      <SkeletonItem height={10} width="50%" style={styles.cardText} />
    </View>
  );
}

export function SkeletonSlider() {
  return (
    <View style={styles.sliderContainer}>
      <SkeletonItem height={20} width={150} style={styles.sliderTitle} />
      <View style={styles.sliderCards}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} width={120} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonDetail() {
  return (
    <View style={styles.detailContainer}>
      <SkeletonItem height={300} style={styles.detailBanner} />
      <View style={styles.detailContent}>
        <View style={styles.detailHeader}>
          <SkeletonCard width={120} />
          <View style={styles.detailInfo}>
            <SkeletonItem height={22} width="90%" style={styles.detailGap} />
            <SkeletonItem height={14} width="70%" style={styles.detailGap} />
            <View style={styles.detailRow}>
              <SkeletonItem height={16} width={50} style={styles.detailBadge} />
              <SkeletonItem height={16} width={50} style={styles.detailBadge} />
            </View>
          </View>
        </View>
        <SkeletonItem height={12} width="100%" style={styles.detailGap} />
        <SkeletonItem height={12} width="100%" style={styles.detailGap} />
        <SkeletonItem height={12} width="90%" style={styles.detailGap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#27272A', // zinc-700 to match dark theme background
  },
  cardContainer: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  cardPoster: {
    aspectRatio: 2 / 3,
    width: '100%',
  },
  cardText: {
    marginTop: 6,
  },
  sliderContainer: {
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  sliderTitle: {
    marginBottom: 12,
  },
  sliderCards: {
    flexDirection: 'row',
    gap: 12,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailBanner: {
    width: '100%',
  },
  detailContent: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    marginTop: -80, // overlay details onto banner
  },
  detailInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  detailGap: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailBadge: {
    borderRadius: 4,
  },
});
