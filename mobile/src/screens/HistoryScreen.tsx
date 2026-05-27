import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { Clock, Play, Trash2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import MoviePoster from '../components/MoviePoster';
import { getImageUrl } from '../services/api';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const history = useAppStore((state) => state.history);
  const clearHistory = useAppStore((state) => state.clearHistory);
  
  // Custom manual delete item from store
  const deleteHistoryItem = (slug: string, episodeSlug: string) => {
    useAppStore.setState((state) => ({
      history: state.history.filter(
        (item) => !(item.slug === slug && item.episodeSlug === episodeSlug)
      ),
    }));
  };

  const handleClearAll = () => {
    Alert.alert(
      'Xóa lịch sử xem',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {history.length > 0 ? (
        <FlatList
          data={history}
          keyExtractor={(item) => `${item.slug}:${item.episodeSlug}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.headerSubtitle}>
                Bạn có {history.length} phim đã xem gần đây
              </Text>
              <Pressable onPress={handleClearAll} style={styles.clearAllBtn}>
                <Trash2 size={13} color={COLORS.primary} />
                <Text style={styles.clearAllText}>Xóa tất cả</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const progressPct = item.duration > 0 ? Math.min(Math.round((item.currentTime / item.duration) * 100), 100) : 0;
            const posterUrl = item.thumb_url && (item.thumb_url.startsWith('http://') || item.thumb_url.startsWith('https://'))
              ? item.thumb_url
              : getImageUrl(item.thumb_url);

            return (
              <View style={styles.historyCard}>
                {/* Poster Link to Detail */}
                <Pressable
                  onPress={() => navigation.navigate('MovieDetail', { slug: item.slug })}
                  style={styles.posterContainer}
                >
                  <MoviePoster url={posterUrl} style={styles.poster} />
                </Pressable>

                {/* Details */}
                <View style={styles.infoContainer}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.name}
                  </Text>
                  
                  <Text style={styles.episodeText} numberOfLines={1}>
                    Đang xem: <Text style={styles.episodeName}>Tập {item.episodeName}</Text>
                  </Text>

                  {/* Progress Bar & percentage */}
                  <View style={styles.progressRow}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                    </View>
                    <Text style={styles.progressPctText}>{progressPct}%</Text>
                  </View>

                  {/* Watch status duration text */}
                  <Text style={styles.durationText}>
                    Đã xem {Math.floor(item.currentTime / 60)} phút / {Math.floor(item.duration / 60)} phút
                  </Text>
                </View>

                {/* Actions column */}
                <View style={styles.actionsContainer}>
                  {/* Play Quick Link */}
                  <Pressable
                    onPress={() =>
                      navigation.navigate('Watch', {
                        slug: item.slug,
                        movieName: item.name,
                        movieThumb: posterUrl,
                        episodeSlug: item.episodeSlug,
                        episodeName: item.episodeName,
                      })
                    }
                    style={styles.playQuickBtn}
                  >
                    <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                  </Pressable>

                  {/* Remove Item */}
                  <Pressable
                    onPress={() => deleteHistoryItem(item.slug, item.episodeSlug)}
                    style={styles.removeBtn}
                  >
                    <X size={16} color={COLORS.zinc500} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Clock size={44} color={COLORS.zinc600} />
          <Text style={styles.emptyTitle}>LỊCH SỬ TRỐNG</Text>
          <Text style={styles.emptyDescription}>
            Lịch sử xem phim sẽ tự động ghi lại quá trình xem dở của bạn đến từng giây để bạn dễ dàng xem tiếp lần sau!
          </Text>
          <Pressable
            onPress={() => navigation.navigate('HomeTab')}
            style={styles.exploreBtn}
          >
            <Text style={styles.exploreBtnText}>Xem phim ngay</Text>
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
  listContent: {
    paddingBottom: 24,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: COLORS.zinc400,
    fontSize: 11,
    fontWeight: '600',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(229, 9, 20, 0.2)',
    backgroundColor: 'rgba(229, 9, 20, 0.03)',
  },
  clearAllText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 12,
  },
  posterContainer: {
    width: 60,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  episodeText: {
    color: COLORS.zinc400,
    fontSize: 11,
  },
  episodeName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  progressBarBg: {
    flex: 1,
    height: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 99,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 99,
  },
  progressPctText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'right',
  },
  durationText: {
    color: COLORS.zinc500,
    fontSize: 9,
    marginTop: 1,
  },
  actionsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 10,
  },
  playQuickBtn: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  removeBtn: {
    padding: 4,
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
