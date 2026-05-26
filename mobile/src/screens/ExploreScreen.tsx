import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Filter, ChevronDown, RefreshCw, X, Check } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import { COLORS } from '../theme/colors';
import { getGenres, getCountries, getMoviesByType } from '../services/api';
import MovieCard from '../components/MovieCard';
import { MovieShort, Genre, Country } from '../types';
import { SkeletonCard } from '../components/SkeletonLoader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const YEARS = Array.from({ length: 17 }, (_, i) => String(2026 - i)); // 2026 to 2010

const MOVIE_TYPES = [
  { slug: 'phim-bo', name: 'Phim Bộ' },
  { slug: 'phim-le', name: 'Phim Lẻ' },
  { slug: 'hoat-hinh', name: 'Hoạt Hình' },
  { slug: 'tv-shows', name: 'TV Shows' },
];

const SORT_OPTIONS = [
  { slug: 'modified.time', name: 'Mới cập nhật' },
  { slug: '_id', name: 'Mới đăng' },
  { slug: 'year', name: 'Năm sản xuất' },
];

export default function ExploreScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // Filter States
  const [type, setType] = useState('phim-bo');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [year, setYear] = useState('');
  const [sortField, setSortField] = useState('modified.time');

  // Pagination & Data states
  const [page, setPage] = useState(1);
  const [moviesList, setMoviesList] = useState<MovieShort[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Modal active state
  const [activeModal, setActiveModal] = useState<'type' | 'category' | 'country' | 'year' | 'sort' | null>(null);

  // Sync type filter from Home 'Xem tất cả' click
  useEffect(() => {
    if (route.params?.type) {
      setType(route.params.type);
      // Clean params so it doesn't override future changes
      navigation.setParams({ type: undefined });
      resetAndFetch();
    }
  }, [route.params?.type]);

  // Fetch static metadata
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });

  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: getCountries,
  });

  // Fetch movies list matching filters
  const moviesQuery = useQuery({
    queryKey: ['exploreMovies', type, category, country, year, sortField, page],
    queryFn: () =>
      getMoviesByType(type, page, 24, {
        category,
        country,
        year,
        sort_field: sortField,
      }),
  });

  // Handle data appending for infinite scroll
  useEffect(() => {
    if (moviesQuery.data?.status) {
      const newItems = moviesQuery.data.items || [];
      const pagination = moviesQuery.data.pagination;

      if (page === 1) {
        setMoviesList(newItems);
      } else {
        // Concat unique items only
        setMoviesList((prev) => {
          const prevSlugs = new Set(prev.map((item) => item.slug));
          const filteredNew = newItems.filter((item) => !prevSlugs.has(item.slug));
          return [...prev, ...filteredNew];
        });
      }

      setHasMore(pagination ? pagination.currentPage < pagination.totalPages : false);
      setIsFetchingMore(false);
    }
  }, [moviesQuery.data, page]);

  // Trigger when filters change
  const resetAndFetch = () => {
    setPage(1);
    setMoviesList([]);
    setHasMore(true);
  };

  useEffect(() => {
    resetAndFetch();
  }, [type, category, country, year, sortField]);

  const loadMore = () => {
    if (hasMore && !moviesQuery.isFetching && !isFetchingMore) {
      setIsFetchingMore(true);
      setPage((prev) => prev + 1);
    }
  };

  const handleClearFilters = () => {
    setType('phim-bo');
    setCategory('');
    setCountry('');
    setYear('');
    setSortField('modified.time');
    resetAndFetch();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (category !== '') count++;
    if (country !== '') count++;
    if (year !== '') count++;
    if (sortField !== 'modified.time') count++;
    return count;
  };

  const getFilterName = (filterType: string) => {
    switch (filterType) {
      case 'type':
        return MOVIE_TYPES.find((t) => t.slug === type)?.name || 'Loại phim';
      case 'category':
        return genresQuery.data?.find((g) => g.slug === category)?.name || 'Thể loại';
      case 'country':
        return countriesQuery.data?.find((c) => c.slug === country)?.name || 'Quốc gia';
      case 'year':
        return year !== '' ? `Năm ${year}` : 'Năm phát hành';
      case 'sort':
        return SORT_OPTIONS.find((s) => s.slug === sortField)?.name || 'Sắp xếp';
      default:
        return '';
    }
  };

  const renderModalContent = () => {
    let data: { slug: string; name: string }[] = [];
    let selectedValue = '';
    let onSelect = (val: string) => {};

    switch (activeModal) {
      case 'type':
        data = MOVIE_TYPES;
        selectedValue = type;
        onSelect = (val) => setType(val);
        break;
      case 'category':
        data = [{ slug: '', name: 'Tất cả thể loại' }, ...(genresQuery.data || [])];
        selectedValue = category;
        onSelect = (val) => setCategory(val);
        break;
      case 'country':
        data = [{ slug: '', name: 'Tất cả quốc gia' }, ...(countriesQuery.data || [])];
        selectedValue = country;
        onSelect = (val) => setCountry(val);
        break;
      case 'year':
        data = [{ slug: '', name: 'Tất cả các năm' }, ...YEARS.map((y) => ({ slug: y, name: `Năm ${y}` }))];
        selectedValue = year;
        onSelect = (val) => setYear(val);
        break;
      case 'sort':
        data = SORT_OPTIONS;
        selectedValue = sortField;
        onSelect = (val) => setSortField(val);
        break;
    }

    return (
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {activeModal === 'type'
              ? 'LOẠI PHIM'
              : activeModal === 'category'
              ? 'THỂ LOẠI'
              : activeModal === 'country'
              ? 'QUỐC GIA'
              : activeModal === 'year'
              ? 'NĂM PHÁT HÀNH'
              : 'SẮP XẾP THEO'}
          </Text>
          <Pressable onPress={() => setActiveModal(null)} style={styles.closeBtn}>
            <X size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Options List */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.slug}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.optionsList}
          renderItem={({ item }) => {
            const isSelected = selectedValue === item.slug;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.slug);
                  setActiveModal(null);
                }}
                style={[styles.optionItem, isSelected && styles.optionItemActive]}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                  {item.name}
                </Text>
                {isSelected && <Check size={16} color={COLORS.primary} />}
              </Pressable>
            );
          }}
        />
      </View>
    );
  };

  const isInitialLoading = moviesQuery.isLoading && page === 1;
  const activeCount = getActiveFilterCount();

  return (
    <View style={styles.container}>
      {/* 1. FILTER BAR (Horizontal Scrollable) */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Active Count Badge */}
          {activeCount > 0 && (
            <Pressable onPress={handleClearFilters} style={styles.clearBadge}>
              <RefreshCw size={11} color="#FFFFFF" />
              <Text style={styles.clearBadgeText}>{activeCount} Lọc</Text>
            </Pressable>
          )}

          {/* Type Selector */}
          <Pressable onPress={() => setActiveModal('type')} style={styles.filterButton}>
            <Text style={styles.filterButtonText} numberOfLines={1}>
              {getFilterName('type')}
            </Text>
            <ChevronDown size={12} color={COLORS.zinc400} />
          </Pressable>

          {/* Category Selector */}
          <Pressable
            onPress={() => setActiveModal('category')}
            style={[styles.filterButton, category !== '' && styles.filterButtonActive]}
          >
            <Text
              style={[styles.filterButtonText, category !== '' && styles.filterButtonTextActive]}
              numberOfLines={1}
            >
              {getFilterName('category')}
            </Text>
            <ChevronDown size={12} color={category !== '' ? COLORS.primary : COLORS.zinc400} />
          </Pressable>

          {/* Country Selector */}
          <Pressable
            onPress={() => setActiveModal('country')}
            style={[styles.filterButton, country !== '' && styles.filterButtonActive]}
          >
            <Text
              style={[styles.filterButtonText, country !== '' && styles.filterButtonTextActive]}
              numberOfLines={1}
            >
              {getFilterName('country')}
            </Text>
            <ChevronDown size={12} color={country !== '' ? COLORS.primary : COLORS.zinc400} />
          </Pressable>

          {/* Year Selector */}
          <Pressable
            onPress={() => setActiveModal('year')}
            style={[styles.filterButton, year !== '' && styles.filterButtonActive]}
          >
            <Text
              style={[styles.filterButtonText, year !== '' && styles.filterButtonTextActive]}
              numberOfLines={1}
            >
              {getFilterName('year')}
            </Text>
            <ChevronDown size={12} color={year !== '' ? COLORS.primary : COLORS.zinc400} />
          </Pressable>

          {/* Sort Selector */}
          <Pressable
            onPress={() => setActiveModal('sort')}
            style={[
              styles.filterButton,
              sortField !== 'modified.time' && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                sortField !== 'modified.time' && styles.filterButtonTextActive,
              ]}
              numberOfLines={1}
            >
              {getFilterName('sort')}
            </Text>
            <ChevronDown size={12} color={sortField !== 'modified.time' ? COLORS.primary : COLORS.zinc400} />
          </Pressable>
        </ScrollView>
      </View>

      {/* 2. MOVIES GRID */}
      {isInitialLoading ? (
        <FlatList
          data={Array.from({ length: 8 })}
          numColumns={2}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={() => (
            <View style={styles.cardWrapper}>
              <SkeletonCard />
            </View>
          )}
        />
      ) : moviesList.length > 0 ? (
        <FlatList
          data={moviesList}
          numColumns={2}
          keyExtractor={(item) => item._id || item.slug}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <MovieCard movie={item} />
            </View>
          )}
          ListFooterComponent={
            hasMore && isFetchingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.footerLoaderText}>Đang tải thêm phim...</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Filter size={40} color={COLORS.zinc600} />
          <Text style={styles.emptyText}>Không tìm thấy phim phù hợp bộ lọc.</Text>
          <Pressable onPress={handleClearFilters} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Làm mới bộ lọc</Text>
          </Pressable>
        </View>
      )}

      {/* 3. BOTTOM FILTER SELECTION MODAL */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
          <View style={styles.modalWrapper} onStartShouldSetResponder={() => true}>
            <BlurView tint="dark" intensity={90} style={StyleSheet.absoluteFill} />
            {activeModal !== null && renderModalContent()}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBarContainer: {
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 0.5,
    borderColor: COLORS.zinc800,
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  clearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  clearBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    maxWidth: 150,
  },
  filterButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(229, 9, 20, 0.06)',
  },
  filterButtonText: {
    color: COLORS.zinc300,
    fontSize: 11,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  cardWrapper: {
    width: (SCREEN_WIDTH - 36) / 2, // 2 columns dynamically
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    color: COLORS.zinc400,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: COLORS.zinc400,
    fontSize: 13,
    textAlign: 'center',
  },
  resetBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    height: SCREEN_HEIGHT * 0.45,
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalContent: {
    flex: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
    marginBottom: 8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '950',
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    paddingBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  optionItemActive: {
    borderColor: 'transparent',
  },
  optionText: {
    color: COLORS.zinc300,
    fontSize: 13,
    fontWeight: '600',
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
