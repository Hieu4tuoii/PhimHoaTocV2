import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  ScrollView,
  Modal,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Film, Loader2, ChevronDown, RefreshCw, Check, Filter } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { COLORS } from '../theme/colors';
import {
  searchMovies,
  getImageUrl,
  getMoviesByType,
  getGenres,
  getCountries,
} from '../services/api';
import MovieCard from '../components/MovieCard';
import MoviePoster from '../components/MoviePoster';
import { MovieShort } from '../types';
import { SkeletonCard } from '../components/SkeletonLoader';
import PressableScale from '../components/PressableScale';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const YEARS = Array.from({ length: 17 }, (_, i) => String(2026 - i));

const MOVIE_TYPES = [
  { slug: 'phim-moi-cap-nhat', name: 'Mới cập nhật' },
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

type ActiveModal = 'type' | 'category' | 'country' | 'year' | 'sort' | null;

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Search states
  const [keyword, setKeyword] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  // Filter states (mirror web /tim-kiem)
  const [type, setType] = useState('phim-le');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [year, setYear] = useState('');
  const [sortField, setSortField] = useState('modified.time');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [filterTouched, setFilterTouched] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [moviesList, setMoviesList] = useState<MovieShort[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Instant search (debounced)
  const [instantResults, setInstantResults] = useState<MovieShort[]>([]);
  const [isInstantSearching, setIsInstantSearching] = useState(false);

  // Apply typeFilter from "Xem tất cả" nav params
  useEffect(() => {
    const typeFilter = route.params?.typeFilter;
    if (typeFilter && typeof typeFilter === 'string') {
      setType(typeFilter);
      setFilterTouched(true);
      setKeyword('');
      setSearchTriggered(false);
      setSubmittedKeyword('');
      navigation.setParams({ typeFilter: undefined });
    }
  }, [route.params?.typeFilter]);

  // Auto-focus input when tab gains focus (unless user came in via "Xem tất cả" filter)
  useFocusEffect(
    useCallback(() => {
      if (route.params?.typeFilter) return;
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }, [route.params?.typeFilter])
  );

  // Debounced instant search
  useEffect(() => {
    if (keyword.trim().length < 2) {
      setInstantResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      if (searchTriggered) return;
      setIsInstantSearching(true);
      try {
        const data = await searchMovies(keyword.trim(), 1, 6);
        if (data.status) setInstantResults(data.items);
      } catch (error) {
        console.error('Instant search error:', error);
      } finally {
        setIsInstantSearching(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [keyword, searchTriggered]);

  // Static metadata
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });
  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: getCountries,
  });

  // Decide mode: search (has keyword submitted) vs filter/browse (no keyword)
  const isSearchMode = searchTriggered && submittedKeyword !== '';
  const isFilterMode = !isSearchMode;

  // Full search query
  const searchQuery = useQuery({
    queryKey: ['searchFull', submittedKeyword, page],
    queryFn: () => searchMovies(submittedKeyword, page, 24),
    enabled: isSearchMode,
  });

  // Browse / filter query
  const browseQuery = useQuery({
    queryKey: ['browseFilters', type, category, country, year, sortField, page],
    queryFn: () =>
      getMoviesByType(type === 'phim-moi-cap-nhat' ? 'phim-le' : type, page, 24, {
        category,
        country,
        year,
        sort_field: sortField,
      }),
    enabled: isFilterMode,
  });

  const activeQuery = isSearchMode ? searchQuery : browseQuery;

  // Append data
  useEffect(() => {
    if (activeQuery.data?.status) {
      const newItems = activeQuery.data.items || [];
      const pagination = activeQuery.data.pagination;

      if (page === 1) {
        setMoviesList(newItems);
      } else {
        setMoviesList((prev) => {
          const prevSlugs = new Set(prev.map((item) => item.slug));
          const filteredNew = newItems.filter((item) => !prevSlugs.has(item.slug));
          return [...prev, ...filteredNew];
        });
      }
      setHasMore(pagination ? pagination.currentPage < pagination.totalPages : false);
      setIsFetchingMore(false);
    }
  }, [activeQuery.data, page]);

  // Reset list when filters/search target change
  useEffect(() => {
    setPage(1);
    setMoviesList([]);
    setHasMore(true);
  }, [submittedKeyword, isSearchMode, type, category, country, year, sortField]);

  const handleSearchSubmit = () => {
    const trimmed = keyword.trim();
    if (trimmed.length < 2) return;
    Keyboard.dismiss();
    setSubmittedKeyword(trimmed);
    setSearchTriggered(true);
  };

  const handleClearSearch = () => {
    setKeyword('');
    setSearchTriggered(false);
    setSubmittedKeyword('');
    setInstantResults([]);
    inputRef.current?.focus();
  };

  const handleClearFilters = () => {
    setType('phim-le');
    setCategory('');
    setCountry('');
    setYear('');
    setSortField('modified.time');
    setFilterTouched(false);
  };

  const loadMore = () => {
    if (hasMore && !activeQuery.isFetching && !isFetchingMore) {
      setIsFetchingMore(true);
      setPage((prev) => prev + 1);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (type !== 'phim-le') count++;
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
          <PressableScale onPress={() => setActiveModal(null)} style={styles.closeBtn}>
            <X size={18} color="#FFFFFF" />
          </PressableScale>
        </View>

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
                style={({ pressed }) => [
                  styles.optionItem,
                  isSelected && styles.optionItemActive,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
                ]}
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

  const activeCount = getActiveFilterCount();
  const isInitialLoading = activeQuery.isLoading && page === 1;

  // Determine UI mode for rendering
  const showInstantDropdown = keyword.trim().length >= 2 && !searchTriggered;
  const showGrid = isSearchMode || isFilterMode;

  return (
    <View style={styles.container}>
      {/* HEADER: Search bar */}
      <View style={styles.searchHeader}>
        <Text style={styles.headerTitle}>KHÁM PHÁ PHIM</Text>
        <View style={styles.inputContainer}>
          <Search size={18} color={COLORS.zinc400} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            placeholder="Nhập tên phim cần tìm..."
            placeholderTextColor={COLORS.zinc500}
            value={keyword}
            onChangeText={(text) => {
              setKeyword(text);
              if (searchTriggered) setSearchTriggered(false);
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.textInput}
          />
          {isInstantSearching && (
            <Loader2 size={16} color={COLORS.primary} style={styles.loadingSpinner} />
          )}
          {keyword.length > 0 && (
            <PressableScale onPress={handleClearSearch} style={styles.clearBtn}>
              <X size={16} color="#FFFFFF" />
            </PressableScale>
          )}
        </View>
      </View>

      {/* FILTER BAR - chỉ hiện khi không phải đang gõ instant search */}
      {!showInstantDropdown && (
        <View style={styles.filterBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {activeCount > 0 && (
              <PressableScale onPress={handleClearFilters} style={styles.clearBadge}>
                <RefreshCw size={11} color="#FFFFFF" />
                <Text style={styles.clearBadgeText}>{activeCount} Lọc</Text>
              </PressableScale>
            )}

            <FilterChip
              label={getFilterName('type')}
              active={type !== 'phim-le'}
              onPress={() => setActiveModal('type')}
            />
            <FilterChip
              label={getFilterName('category')}
              active={category !== ''}
              onPress={() => setActiveModal('category')}
            />
            <FilterChip
              label={getFilterName('country')}
              active={country !== ''}
              onPress={() => setActiveModal('country')}
            />
            <FilterChip
              label={getFilterName('year')}
              active={year !== ''}
              onPress={() => setActiveModal('year')}
            />
            <FilterChip
              label={getFilterName('sort')}
              active={sortField !== 'modified.time'}
              onPress={() => setActiveModal('sort')}
            />
          </ScrollView>
        </View>
      )}

      {/* CONTENT AREA */}
      {showInstantDropdown ? (
        // Instant search dropdown
        isInstantSearching ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : instantResults.length > 0 ? (
          <FlatList
            data={instantResults}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.instantList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  navigation.navigate('MovieDetail', {
                    slug: item.slug,
                    name: item.name,
                    thumb_url: getImageUrl(item.thumb_url || item.poster_url),
                    poster_url: getImageUrl(item.poster_url || item.thumb_url),
                  });
                }}
                style={({ pressed }) => [styles.instantItem, pressed && styles.instantPressed]}
              >
                <View style={styles.instantPoster}>
                  <MoviePoster url={getImageUrl(item.poster_url || item.thumb_url)} />
                </View>
                <View style={styles.instantInfo}>
                  <Text style={styles.instantName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.instantOriginName} numberOfLines={1}>
                    {item.origin_name}
                  </Text>
                  <View style={styles.instantBadges}>
                    <Text style={styles.instantQuality}>{item.quality || 'HD'}</Text>
                    <Text style={styles.instantYear}>{item.year}</Text>
                  </View>
                </View>
              </Pressable>
            )}
            ListFooterComponent={
              <PressableScale onPress={handleSearchSubmit} style={styles.viewAllResultsBtn}>
                <Text style={styles.viewAllResultsText}>
                  Xem tất cả kết quả cho "{keyword}"
                </Text>
              </PressableScale>
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Film size={32} color={COLORS.zinc700} />
            <Text style={styles.emptyText}>Không tìm thấy phim phù hợp gợi ý.</Text>
          </View>
        )
      ) : (
        // Grid (search results OR filter browse)
        isInitialLoading ? (
          <Animated.FlatList
            entering={FadeIn.duration(200)}
            data={Array.from({ length: 6 })}
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
            removeClippedSubviews
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
        ) : isSearchMode ? (
          <View style={styles.emptyContainer}>
            <Film size={40} color={COLORS.zinc600} />
            <Text style={styles.emptyText}>
              Không tìm thấy phim nào cho từ khóa "{submittedKeyword}".
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Filter size={40} color={COLORS.zinc600} />
            <Text style={styles.emptyText}>Không tìm thấy phim phù hợp bộ lọc.</Text>
            {activeCount > 0 && (
              <PressableScale onPress={handleClearFilters} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Làm mới bộ lọc</Text>
              </PressableScale>
            )}
          </View>
        )
      )}

      {/* FILTER MODAL */}
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

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.filterButton, active && styles.filterButtonActive] as StyleProp<ViewStyle>}
    >
      <Text
        style={[styles.filterButtonText, active && styles.filterButtonTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <ChevronDown size={12} color={active ? COLORS.primary : COLORS.zinc400} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchHeader: {
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 0.5,
    borderColor: COLORS.zinc800,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    gap: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    position: 'relative',
  },
  searchIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  loadingSpinner: {
    marginRight: 6,
    transform: [{ scale: 0.9 }],
  },
  clearBtn: {
    padding: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instantList: {
    paddingVertical: 12,
  },
  instantItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 12,
    alignItems: 'center',
  },
  instantPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  instantPoster: {
    width: 44,
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  instantInfo: {
    flex: 1,
    gap: 2,
  },
  instantName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instantOriginName: {
    color: COLORS.zinc400,
    fontSize: 11,
  },
  instantBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  instantQuality: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  instantYear: {
    color: COLORS.zinc500,
    fontSize: 9,
    fontWeight: '600',
  },
  viewAllResultsBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllResultsText: {
    color: COLORS.primary,
    fontSize: 12,
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
    width: (SCREEN_WIDTH - 36) / 2,
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
    paddingHorizontal: 32,
    marginTop: -40,
  },
  emptyText: {
    color: COLORS.zinc400,
    fontSize: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    height: SCREEN_HEIGHT * 0.5,
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
    fontWeight: '900',
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
    paddingHorizontal: 8,
    borderRadius: 8,
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
