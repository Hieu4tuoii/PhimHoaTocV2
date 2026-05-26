import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MovieShort } from '../types';
import { getImageUrl } from '../services/api';
import { COLORS } from '../theme/colors';
import MoviePoster from './MoviePoster';
import { RootStackParamList } from '../../App';

interface MovieCardProps {
  movie: MovieShort;
  width?: number; // Optional custom width for slider/list cards
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

function MovieCardInner({ movie, width }: MovieCardProps) {
  const navigation = useNavigation<NavigationProp>();
  
  const posterUrl = getImageUrl(movie.poster_url || movie.thumb_url);

  const formatLang = (lang: string) => {
    if (!lang) return '';
    let formatted = lang;
    formatted = formatted.replace(/Thuyết minh/gi, 'TM');
    formatted = formatted.replace(/Lồng tiếng/gi, 'LT');
    formatted = formatted.replace(/Vietsub/gi, 'Sub');
    return formatted;
  };

  const badgeText = movie.episode_current && movie.episode_current.toLowerCase() !== 'full'
    ? movie.episode_current
    : movie.quality || 'HD';

  const subText = formatLang(movie.lang || 'Vietsub');

  const handlePress = () => {
    navigation.navigate('MovieDetail', { slug: movie.slug });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        width ? { width } : styles.fullWidth,
        pressed && styles.pressed,
      ]}
    >
      {/* Poster Image Container */}
      <View style={styles.posterContainer}>
        <MoviePoster url={posterUrl} alt={movie.name} style={styles.poster} />

        {/* Top Left Badge (Episode / Quality) */}
        <View style={styles.badgeLeft}>
          <Text style={styles.badgeLeftText}>{badgeText}</Text>
        </View>

        {/* Top Right Badge (Year) */}
        {movie.year && (
          <View style={styles.badgeRight}>
            <Text style={styles.badgeRightText}>{movie.year}</Text>
          </View>
        )}

        {/* Bottom Left Badge (Language) */}
        {subText !== '' && (
          <View style={styles.badgeBottom}>
            <Text style={styles.badgeBottomText}>{subText}</Text>
          </View>
        )}
      </View>

      {/* Title Details */}
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {movie.name}
        </Text>
        <Text style={styles.originTitle} numberOfLines={1}>
          {movie.origin_name}
        </Text>
      </View>
    </Pressable>
  );
}

export const MovieCard = React.memo(MovieCardInner);
export default MovieCard;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  badgeLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeLeftText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  badgeRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeRightText: {
    color: COLORS.zinc300,
    fontSize: 9,
    fontWeight: '600',
  },
  badgeBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeBottomText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  details: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  originTitle: {
    color: COLORS.zinc400,
    fontSize: 10,
    marginTop: 1,
  },
});
