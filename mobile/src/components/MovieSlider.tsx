import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { MovieShort } from '../types';
import MovieCard from './MovieCard';
import { COLORS } from '../theme/colors';
import PressableScale from './PressableScale';

interface MovieSliderProps {
  title: string;
  movies: MovieShort[];
  typeSlug?: string;
}

export default function MovieSlider({ title, movies, typeSlug }: MovieSliderProps) {
  const navigation = useNavigation<any>();

  if (!movies || movies.length === 0) return null;

  const handleViewAll = () => {
    if (typeSlug) {
      navigation.navigate('MainTabs', {
        screen: 'SearchTab',
        params: { typeFilter: typeSlug },
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.accentBar} />
          <Text style={styles.title}>{title}</Text>
        </View>

        {typeSlug && (
          <PressableScale onPress={handleViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
            <ChevronRight size={14} color={COLORS.primary} />
          </PressableScale>
        )}
      </View>

      <FlatList
        data={movies}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id || item.slug}
        contentContainerStyle={styles.listContent}
        snapToInterval={132 + 12}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <MovieCard movie={item} width={132} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
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
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    color: COLORS.zinc300,
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    width: 132,
  },
});
