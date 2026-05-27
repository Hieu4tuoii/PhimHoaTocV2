import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Play, Info, Flame, Star, Clock, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { COLORS } from '../theme/colors';
import { RootStackParamList } from '../../App';
import {
  getNewUpdates,
  getMoviesByType,
  getMovieDetail,
  getImageUrl,
} from '../services/api';
import MovieSlider from '../components/MovieSlider';
import MoviePoster from '../components/MoviePoster';
import { SkeletonItem, SkeletonSlider, SkeletonHero } from '../components/SkeletonLoader';
import PressableScale from '../components/PressableScale';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const newUpdatesQuery = useQuery({
    queryKey: ['newUpdates'],
    queryFn: () => getNewUpdates(1),
  });

  const seriesQuery = useQuery({
    queryKey: ['movies-series'],
    queryFn: () => getMoviesByType('phim-bo', 1, 12),
  });

  const singleQuery = useQuery({
    queryKey: ['movies-single'],
    queryFn: () => getMoviesByType('phim-le', 1, 12),
  });

  const animeQuery = useQuery({
    queryKey: ['movies-anime'],
    queryFn: () => getMoviesByType('hoat-hinh', 1, 12),
  });

  const tvShowsQuery = useQuery({
    queryKey: ['movies-tvshows'],
    queryFn: () => getMoviesByType('tv-shows', 1, 12),
  });

  const heroShort = newUpdatesQuery.data?.items?.[0];
  const heroDetailQuery = useQuery({
    queryKey: ['movieDetail', heroShort?.slug],
    queryFn: () => getMovieDetail(heroShort!.slug),
    enabled: !!heroShort?.slug,
  });

  const heroMovie = heroDetailQuery.data?.movie || null;
  const firstEpisodeSlug =
    heroDetailQuery.data?.episodes?.[0]?.server_data?.[0]?.slug || 'tap-1';
  const firstEpisodeName =
    heroDetailQuery.data?.episodes?.[0]?.server_data?.[0]?.name || 'Tập 1';

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      newUpdatesQuery.refetch(),
      seriesQuery.refetch(),
      singleQuery.refetch(),
      animeQuery.refetch(),
      tvShowsQuery.refetch(),
    ]);
    if (heroShort?.slug) await heroDetailQuery.refetch();
    setRefreshing(false);
  };

  const handleWatchHero = () => {
    if (heroMovie) {
      navigation.navigate('Watch', {
        slug: heroMovie.slug,
        movieName: heroMovie.name,
        movieThumb: getImageUrl(heroMovie.thumb_url || heroMovie.poster_url),
        episodeSlug: firstEpisodeSlug,
        episodeName: firstEpisodeName,
      });
    }
  };

  const handleHeroDetail = () => {
    if (heroMovie) {
      navigation.navigate('MovieDetail', {
        slug: heroMovie.slug,
        name: heroMovie.name,
        thumb_url: getImageUrl(heroMovie.thumb_url || heroMovie.poster_url),
        poster_url: getImageUrl(heroMovie.poster_url || heroMovie.thumb_url),
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* HERO BANNER */}
      {heroMovie ? (
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroContainer}>
          <MoviePoster
            url={getImageUrl(heroMovie.thumb_url || heroMovie.poster_url)}
            style={styles.heroImage}
          />

          <LinearGradient
            colors={['rgba(20, 20, 20, 0)', 'rgba(20, 20, 20, 0.4)', 'rgba(20, 20, 20, 0.95)', '#141414']}
            style={styles.heroGradient}
          />

          <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.heroContent}>
            <View style={styles.badgeRow}>
              <View style={styles.flameBadge}>
                <Flame size={12} color="#FFFFFF" style={styles.flameIcon} />
                <Text style={styles.flameText}>NỔI BẬT</Text>
              </View>
              {heroMovie.category &&
                heroMovie.category.slice(0, 2).map((cat) => (
                  <View key={cat.slug} style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{cat.name}</Text>
                  </View>
                ))}
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>
              {heroMovie.name}
            </Text>
            <Text style={styles.heroSubTitle} numberOfLines={1}>
              {heroMovie.origin_name} ({heroMovie.year})
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Star size={14} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.ratingText}>8.5</Text>
              </View>
              {heroMovie.duration && (
                <View style={styles.metaItem}>
                  <Clock size={13} color={COLORS.zinc300} />
                  <Text style={styles.metaText}>{heroMovie.duration}</Text>
                </View>
              )}
              {heroMovie.episode_current && (
                <View style={styles.metaItem}>
                  <Calendar size={13} color={COLORS.zinc300} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {heroMovie.episode_current}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.heroDescription} numberOfLines={2}>
              {heroMovie.content
                ? heroMovie.content.replace(/<[^>]*>/g, '')
                : 'Không có mô tả nội dung cho bộ phim này.'}
            </Text>

            <View style={styles.buttonRow}>
              <PressableScale onPress={handleWatchHero} style={styles.playButton}>
                <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.playButtonText}>Xem phim</Text>
              </PressableScale>

              <PressableScale onPress={handleHeroDetail} style={styles.infoButton}>
                <Info size={16} color="#FFFFFF" />
                <Text style={styles.infoButtonText}>Chi tiết</Text>
              </PressableScale>
            </View>
          </Animated.View>
        </Animated.View>
      ) : (
        <SkeletonHero />
      )}

      {/* MOVIE CAROUSELS */}
      <View style={styles.carouselsContainer}>
        <CarouselOrSkeleton
          title="Mới Cập Nhật"
          loading={newUpdatesQuery.isLoading}
          movies={newUpdatesQuery.data?.items || []}
          typeSlug="phim-moi-cap-nhat"
        />
        <CarouselOrSkeleton
          title="Phim Bộ Hot"
          loading={seriesQuery.isLoading}
          movies={seriesQuery.data?.items || []}
          typeSlug="phim-bo"
        />
        <CarouselOrSkeleton
          title="Phim Lẻ Hot"
          loading={singleQuery.isLoading}
          movies={singleQuery.data?.items || []}
          typeSlug="phim-le"
        />
        <CarouselOrSkeleton
          title="Hoạt Hình / Anime"
          loading={animeQuery.isLoading}
          movies={animeQuery.data?.items || []}
          typeSlug="hoat-hinh"
        />
        <CarouselOrSkeleton
          title="TV Shows Đặc Sắc"
          loading={tvShowsQuery.isLoading}
          movies={tvShowsQuery.data?.items || []}
          typeSlug="tv-shows"
        />
      </View>
    </ScrollView>
  );
}

function CarouselOrSkeleton({
  title,
  loading,
  movies,
  typeSlug,
}: {
  title: string;
  loading: boolean;
  movies: any[];
  typeSlug: string;
}) {
  if (loading && movies.length === 0) {
    return <SkeletonSlider />;
  }
  return <MovieSlider title={title} movies={movies} typeSlug={typeSlug} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroContainer: {
    height: SCREEN_HEIGHT * 0.65,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  heroPlaceholder: {
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.45,
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
    flexWrap: 'wrap',
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  flameIcon: {
    marginRight: 4,
  },
  flameText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubTitle: {
    color: COLORS.zinc300,
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: -4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  metaText: {
    color: COLORS.zinc300,
    fontSize: 11,
    maxWidth: 150,
  },
  heroDescription: {
    color: COLORS.zinc300,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  infoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113, 113, 122, 0.25)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  infoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  carouselsContainer: {
    paddingBottom: 24,
    marginTop: -8,
  },
});
