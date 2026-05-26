import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Film, Loader2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../theme/colors';
import { searchMovies, getImageUrl } from '../services/api';
import MovieCard from '../components/MovieCard';
import MoviePoster from '../components/MoviePoster';
import { MovieShort } from '../types';
import { SkeletonCard } from '../components/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const [keyword, setKeyword] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  // Pagination for full search results
  const [page, setPage] = useState(1);
  const [searchResults, setSearchResults] = useState<MovieShort[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Debounced search for instant results
  const [instantResults, setInstantResults] = useState<MovieShort[]>([]);
  const [isInstantSearching, setIsInstantSearching] = useState(false);

  useEffect(() => {
    if (keyword.trim().length < 2) {
      setInstantResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (searchTriggered) return; // Skip instant search if user already pressed search
      setIsInstantSearching(true);
      try {
        const data = await searchMovies(keyword.trim(), 1, 6); // Top 6 suggestions
        if (data.status) {
          setInstantResults(data.items);
        }
      } catch (error) {
        console.error('Instant search error:', error);
      } finally {
        setIsInstantSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [keyword, searchTriggered]);

  // Full search query hook
  const fullSearchQuery = useQuery({
    queryKey: ['searchFull', submittedKeyword, page],
    queryFn: () => searchMovies(submittedKeyword, page, 24),
    enabled: searchTriggered && submittedKeyword !== '',
  });

  // Handle data appending for full search infinite scroll
  useEffect(() => {
    if (fullSearchQuery.data?.status) {
      const newItems = fullSearchQuery.data.items || [];
      const pagination = fullSearchQuery.data.pagination;

      if (page === 1) {
        setSearchResults(newItems);
      } else {
        setSearchResults((prev) => {
          const prevSlugs = new Set(prev.map((item) => item.slug));
          const filteredNew = newItems.filter((item) => !prevSlugs.has(item.slug));
          return [...prev, ...filteredNew];
        });
      }

      setHasMore(pagination ? pagination.currentPage < pagination.totalPages : false);
      setIsFetchingMore(false);
    }
  }, [fullSearchQuery.data, page]);

  const handleSearchSubmit = () => {
    const trimmed = keyword.trim();
    if (trimmed.length < 2) return;

    Keyboard.dismiss();
    setSubmittedKeyword(trimmed);
    setSearchTriggered(true);
    setPage(1);
    setSearchResults([]);
    setHasMore(true);
  };

  const handleClearSearch = () => {
    setKeyword('');
    setSearchTriggered(false);
    setSubmittedKeyword('');
    setSearchResults([]);
    setInstantResults([]);
    setPage(1);
    inputRef.current?.focus();
  };

  const loadMoreResults = () => {
    if (hasMore && !fullSearchQuery.isFetching && !isFetchingMore) {
      setIsFetchingMore(true);
      setPage((prev) => prev + 1);
    }
  };

  const isInitialLoading = fullSearchQuery.isLoading && page === 1;

  return (
    <View style={styles.container}>
      {/* 1. SEARCH BAR HEADER */}
      <View style={styles.searchHeader}>
        <View style={styles.inputContainer}>
          <Search size={18} color={COLORS.zinc400} style={styles.searchIcon} />
          
          <TextInput
            ref={inputRef}
            placeholder="Nhập tên phim cần tìm..."
            placeholderTextColor={COLORS.zinc500}
            value={keyword}
            onChangeText={(text) => {
              setKeyword(text);
              if (searchTriggered) {
                setSearchTriggered(false); // Reset to instant mode on text change
              }
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
            style={styles.textInput}
          />

          {isInstantSearching && (
            <Loader2 size={16} color={COLORS.primary} style={styles.loadingSpinner} />
          )}

          {keyword.length > 0 && (
            <Pressable onPress={handleClearSearch} style={styles.clearBtn}>
              <X size={16} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. DYNAMIC CONTENT AREA */}
      {searchTriggered ? (
        /* Full search Grid results */
        isInitialLoading ? (
          <FlatList
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
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            numColumns={2}
            keyExtractor={(item) => item._id || item.slug}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.columnWrapper}
            onEndReached={loadMoreResults}
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
                  <Text style={styles.footerLoaderText}>Đang tải thêm kết quả...</Text>
                </View>
              ) : null
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Film size={40} color={COLORS.zinc600} />
            <Text style={styles.emptyText}>
              Không tìm thấy phim nào cho từ khóa "{submittedKeyword}".
            </Text>
          </View>
        )
      ) : keyword.trim().length >= 2 ? (
        /* Debounced Instant Search Results List */
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
                  navigation.navigate('MovieDetail', { slug: item.slug });
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
              <Pressable onPress={handleSearchSubmit} style={styles.viewAllResultsBtn}>
                <Text style={styles.viewAllResultsText}>
                  Xem tất cả kết quả cho "{keyword}"
                </Text>
              </Pressable>
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Film size={32} color={COLORS.zinc700} />
            <Text style={styles.emptyText}>Không tìm thấy phim phù hợp gợi ý.</Text>
          </View>
        )
      ) : (
        /* Empty / Initial State instructions */
        <View style={styles.initialContainer}>
          <Search size={48} color={COLORS.zinc700} />
          <Text style={styles.initialTitle}>TÌM KIẾM PHIM SIÊU TỐC</Text>
          <Text style={styles.initialDescription}>
            Nhập tên phim tiếng Việt hoặc tiếng Anh không dấu để Phim Hỏa Tốc tìm kiếm ngay lập tức cho bạn.
          </Text>
        </View>
      )}
    </View>
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
    paddingVertical: 12,
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
  initialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
    marginTop: -40,
  },
  initialTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  initialDescription: {
    color: COLORS.zinc400,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
  // Full Search Grid Styles
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
});
