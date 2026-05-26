import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import MovieCard from '../components/MovieCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WatchlistScreen() {
  const navigation = useNavigation<any>();
  const watchlist = useAppStore((state) => state.watchlist);

  return (
    <View style={styles.container}>
      {watchlist.length > 0 ? (
        <FlatList
          data={watchlist}
          numColumns={2}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <MovieCard movie={item} />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Heart size={44} color={COLORS.zinc600} />
          <Text style={styles.emptyTitle}>DANH SÁCH RỖNG</Text>
          <Text style={styles.emptyDescription}>
            Hãy nhấn nút "Yêu thích" khi xem chi tiết một bộ phim để lưu lại và truy cập nhanh tại đây bất cứ lúc nào!
          </Text>
          <Pressable
            onPress={() => navigation.navigate('HomeTab')}
            style={styles.exploreBtn}
          >
            <Text style={styles.exploreBtnText}>Khám phá phim ngay</Text>
          </Pressable>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
    marginTop: -40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  emptyDescription: {
    color: COLORS.zinc400,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  exploreBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
