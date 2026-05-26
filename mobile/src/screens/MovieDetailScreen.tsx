import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  SafeAreaView,
  TextInput,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, Play, ChevronDown, ChevronUp, ArrowLeft, Star, Clock, Film, Send, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../theme/colors';
import { RootStackParamList } from '../../App';
import { getMovieDetail, getMoviesByGenre, getImageUrl } from '../services/api';
import { useAppStore, getMovieLastWatchedEpisode } from '../store/useAppStore';
import { getMovieComments, addMovieComment, CommentItem } from '../services/comments';
import MoviePoster from '../components/MoviePoster';
import MovieSlider from '../components/MovieSlider';
import { SkeletonDetail } from '../components/SkeletonLoader';
import { MovieShort } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MovieDetail'>;

export default function MovieDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { slug } = route.params || {};

  // Store subscription
  const watchlist = useAppStore((state) => state.watchlist);
  const history = useAppStore((state) => state.history);
  const addToWatchlist = useAppStore((state) => state.addToWatchlist);
  const removeFromWatchlist = useAppStore((state) => state.removeFromWatchlist);

  const [isFavorite, setIsFavorite] = useState(false);
  const [lastWatched, setLastWatched] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  // Comment States
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentName, setCommentName] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load comments
  useEffect(() => {
    async function loadComments() {
      const list = await getMovieComments(slug);
      setComments(list);
    }
    loadComments();
  }, [slug]);

  // Sync state with store changes
  useEffect(() => {
    setIsFavorite(watchlist.some((m) => m.slug === slug));
    const watchedInfo = getMovieLastWatchedEpisode(slug);
    if (watchedInfo) {
      setLastWatched(watchedInfo);
    } else {
      setLastWatched(null);
    }
  }, [watchlist, history, slug]);

  // Fetch movie details
  const detailQuery = useQuery({
    queryKey: ['movieDetail', slug],
    queryFn: () => getMovieDetail(slug),
    enabled: !!slug,
  });

  const movie = detailQuery.data?.movie || null;
  const episodes = detailQuery.data?.episodes || [];

  // Fetch related movies based on the first genre category
  const firstGenreSlug = movie?.category?.[0]?.slug;
  const relatedQuery = useQuery({
    queryKey: ['relatedMovies', firstGenreSlug],
    queryFn: () => getMoviesByGenre(firstGenreSlug!, 1, 12),
    enabled: !!firstGenreSlug,
  });

  if (detailQuery.isLoading) {
    return <SkeletonDetail />;
  }

  if (!movie) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy phim yêu cầu.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const handleSendComment = async () => {
    if (!commentName.trim() || !commentContent.trim()) return;
    setIsSubmittingComment(true);
    const newComment = await addMovieComment(slug, commentName, commentContent);
    if (newComment) {
      setComments((prev) => [newComment, ...prev]);
      setCommentContent('');
      Keyboard.dismiss();
    }
    setIsSubmittingComment(false);
  };

  const handleFavoriteToggle = () => {
    const movieShort: MovieShort = {
      _id: movie._id,
      name: movie.name,
      slug: movie.slug,
      origin_name: movie.origin_name,
      poster_url: movie.poster_url,
      thumb_url: movie.thumb_url,
      year: movie.year,
      modified: { time: '' },
      quality: movie.quality,
      lang: movie.lang,
    };

    if (isFavorite) {
      removeFromWatchlist(movie.slug);
    } else {
      addToWatchlist(movieShort);
    }
  };

  // Determine watch link params
  const activeServer = episodes[selectedServerIndex];
  const firstEpisode = activeServer?.server_data?.[0];

  const watchParams = lastWatched
    ? {
        slug: movie.slug,
        movieName: movie.name,
        movieThumb: getImageUrl(movie.thumb_url || movie.poster_url),
        episodeSlug: lastWatched.episodeSlug,
        episodeName: lastWatched.episodeName,
      }
    : firstEpisode
    ? {
        slug: movie.slug,
        movieName: movie.name,
        movieThumb: getImageUrl(movie.thumb_url || movie.poster_url),
        episodeSlug: firstEpisode.slug,
        episodeName: firstEpisode.name,
      }
    : null;

  const progressPercentage = (lastWatched && lastWatched.duration > 0)
    ? Math.min(Math.round((lastWatched.currentTime / lastWatched.duration) * 100), 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Absolute Back Header Button */}
      <SafeAreaView style={styles.headerAbsolute}>
        <Pressable onPress={() => navigation.goBack()} style={styles.circleButton}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. BACKDROP BANNER */}
        <View style={styles.backdropContainer}>
          <MoviePoster
            url={getImageUrl(movie.thumb_url || movie.poster_url)}
            style={styles.backdrop}
          />
          <LinearGradient
            colors={['rgba(20, 20, 20, 0)', 'rgba(20, 20, 20, 0.5)', '#141414']}
            style={styles.backdropMask}
          />
        </View>

        {/* 2. POSTER OVERLAY & DETAILS */}
        <View style={styles.mainInfoSection}>
          <View style={styles.posterColumn}>
            <View style={styles.posterCard}>
              <MoviePoster url={getImageUrl(movie.poster_url)} />
            </View>
          </View>

          <View style={styles.detailsColumn}>
            <Text style={styles.title} numberOfLines={2}>
              {movie.name}
            </Text>
            <Text style={styles.originTitle} numberOfLines={2}>
              {movie.origin_name} ({movie.year})
            </Text>

            <View style={styles.detailMetaRow}>
              <View style={styles.metaBadge}>
                <Star size={11} color="#FBBF24" fill="#FBBF24" />
                <Text style={styles.ratingText}>8.5</Text>
              </View>
              {movie.quality && (
                <View style={[styles.metaBadge, styles.qualityBadge]}>
                  <Text style={styles.qualityText}>{movie.quality}</Text>
                </View>
              )}
              {movie.lang && (
                <View style={[styles.metaBadge, styles.langBadge]}>
                  <Text style={styles.langText}>{movie.lang}</Text>
                </View>
              )}
            </View>

            {movie.duration ? (
              <View style={styles.metaItem}>
                <Clock size={12} color={COLORS.zinc400} />
                <Text style={styles.metaValue}>{movie.duration}</Text>
              </View>
            ) : null}

            {movie.director && movie.director.length > 0 && movie.director[0] !== '' ? (
              <Text style={styles.metaText} numberOfLines={1}>
                Đạo diễn: <Text style={styles.whiteValue}>{movie.director.join(', ')}</Text>
              </Text>
            ) : null}

            {movie.category && movie.category.length > 0 ? (
              <Text style={styles.metaText} numberOfLines={1}>
                Thể loại: <Text style={styles.whiteValue}>{movie.category.map((c: any) => c.name).join(', ')}</Text>
              </Text>
            ) : null}
          </View>
        </View>

        {/* 3. CTA PLAY / FAVORITE BUTTONS */}
        <View style={styles.ctaContainer}>
          {watchParams ? (
            <Pressable
              onPress={() => navigation.navigate('Watch', watchParams)}
              style={styles.watchBtn}
            >
              <View style={styles.watchBtnContent}>
                <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.watchBtnText}>
                  {lastWatched ? `Xem tiếp tập ${lastWatched.episodeName}` : 'Xem phim ngay'}
                </Text>
              </View>

              {lastWatched && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>Đã xem {progressPercentage}%</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPercentage}%` as any }]} />
                  </View>
                </View>
              )}
            </Pressable>
          ) : (
            <View style={[styles.watchBtn, styles.disabledBtn]}>
              <Text style={styles.disabledText}>PHIM ĐANG CẬP NHẬT</Text>
            </View>
          )}

          <Pressable
            onPress={handleFavoriteToggle}
            style={[styles.favBtn, isFavorite && styles.favBtnActive]}
          >
            <Heart size={16} color={isFavorite ? COLORS.primary : '#FFFFFF'} fill={isFavorite ? COLORS.primary : 'transparent'} />
            <Text style={[styles.favBtnText, isFavorite && styles.favBtnTextActive]}>
              {isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
            </Text>
          </Pressable>
        </View>

        {/* 4. SYNOPSIS */}
        <View style={styles.synopsisCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>NỘI DUNG TÓM TẮT</Text>
          </View>

          <Text style={styles.synopsisText} numberOfLines={isExpanded ? undefined : 4}>
            {movie.content
              ? movie.content.replace(/<[^>]*>/g, '')
              : `Hiện tại chưa có mô tả nội dung chi tiết cho phim "${movie.name}". Dữ liệu đang được chúng tôi cập nhật sớm nhất.`}
          </Text>

          {movie.content && movie.content.length > 150 && (
            <Pressable onPress={() => setIsExpanded(!isExpanded)} style={styles.expandBtn}>
              <Text style={styles.expandBtnText}>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
              {isExpanded ? (
                <ChevronUp size={14} color={COLORS.primary} />
              ) : (
                <ChevronDown size={14} color={COLORS.primary} />
              )}
            </Pressable>
          )}
        </View>

        {/* 5. EPISODE SELECTOR */}
        {episodes.length > 0 ? (
          <View style={styles.episodesCard}>
            <View style={styles.episodesHeader}>
              <View style={styles.sectionHeader}>
                <View style={styles.accentBar} />
                <Text style={styles.sectionTitle}>CHỌN TẬP PHIM</Text>
              </View>

              {/* Server selector tabs */}
              {episodes.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serverTabs}>
                  {episodes.map((server: any, idx: number) => (
                    <Pressable
                      key={server.server_name}
                      onPress={() => setSelectedServerIndex(idx)}
                      style={[
                        styles.serverTab,
                        selectedServerIndex === idx && styles.serverTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.serverTabText,
                          selectedServerIndex === idx && styles.serverTabTextActive,
                        ]}
                      >
                        {server.server_name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Grid of episodes */}
            <View style={styles.episodesGrid}>
              {activeServer?.server_data.map((ep: any) => {
                const isWatched = history.some(
                  (h) => h.slug === movie.slug && h.episodeSlug === ep.slug
                );

                return (
                  <Pressable
                    key={ep.slug}
                    onPress={() =>
                      navigation.navigate('Watch', {
                        slug: movie.slug,
                        movieName: movie.name,
                        movieThumb: getImageUrl(movie.thumb_url || movie.poster_url),
                        episodeSlug: ep.slug,
                        episodeName: ep.name,
                      })
                    }
                    style={[
                      styles.episodeBtn,
                      isWatched && styles.episodeBtnWatched,
                    ]}
                  >
                    <Text
                      style={[
                        styles.episodeText,
                        isWatched && styles.episodeTextWatched,
                      ]}
                      numberOfLines={1}
                    >
                      {ep.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.noEpisodesCard}>
            <Text style={styles.noEpisodesText}>
              Danh sách tập phim đang được cập nhật thêm. Vui lòng quay lại sau!
            </Text>
          </View>
        )}

        {/* 6. COMMENTS SECTION */}
        <View style={styles.commentsCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>BÌNH LUẬN THẢO LUẬN ({comments.length})</Text>
          </View>

          {/* Comment input form */}
          <View style={styles.commentForm}>
            <View style={styles.commentInputRow}>
              <User size={12} color={COLORS.zinc400} style={styles.inputIcon} />
              <TextInput
                placeholder="Tên của bạn..."
                placeholderTextColor={COLORS.zinc500}
                value={commentName}
                onChangeText={setCommentName}
                style={styles.nameInput}
              />
            </View>

            <View style={styles.commentContentRow}>
              <TextInput
                placeholder="Nhập nội dung bình luận phim..."
                placeholderTextColor={COLORS.zinc500}
                value={commentContent}
                onChangeText={setCommentContent}
                multiline
                numberOfLines={2}
                style={styles.contentInput}
              />
              <Pressable
                onPress={handleSendComment}
                disabled={isSubmittingComment || commentName.trim() === '' || commentContent.trim() === ''}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (commentName.trim() === '' || commentContent.trim() === '') && styles.sendBtnDisabled,
                  pressed && styles.sendBtnPressed,
                ]}
              >
                {isSubmittingComment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={12} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>

          {/* Comments List */}
          {comments.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.commentItem}>
                  {/* Avatar bubble */}
                  <View style={[styles.avatarBubble, { backgroundColor: item.avatarColor }]}>
                    <Text style={styles.avatarText}>
                      {item.author.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Comment Details */}
                  <View style={styles.commentDetails}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{item.author}</Text>
                      <Text style={styles.commentTime}>Vừa xong</Text>
                    </View>
                    <Text style={styles.commentContentText}>{item.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>
                Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm xúc về bộ phim!
              </Text>
            </View>
          )}
        </View>

        {/* 7. RELATED MOVIES CAROUSEL */}
        {firstGenreSlug && relatedQuery.data?.items && (
          <View style={styles.relatedContainer}>
            <MovieSlider
              title="Cùng Thể Loại"
              movies={relatedQuery.data.items}
              typeSlug={`the-loai/${firstGenreSlug}`}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    color: COLORS.zinc400,
    fontSize: 14,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: 'rgba(10, 10, 10, 0.6)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  backdropContainer: {
    height: SCREEN_HEIGHT * 0.35,
    width: '100%',
    backgroundColor: '#000000',
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    opacity: 0.45,
  },
  backdropMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.25,
  },
  mainInfoSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -80, // overlay onto banner gradient mask
    gap: 16,
    zIndex: 10,
  },
  posterColumn: {
    width: 110,
  },
  posterCard: {
    aspectRatio: 2 / 3,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  detailsColumn: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  originTitle: {
    color: COLORS.zinc400,
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: -1,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  qualityBadge: {
    backgroundColor: COLORS.primary,
    borderColor: 'transparent',
  },
  qualityText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  langBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
    borderColor: 'rgba(229, 9, 20, 0.25)',
  },
  langText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaValue: {
    color: COLORS.zinc400,
    fontSize: 11,
  },
  metaText: {
    color: COLORS.zinc400,
    fontSize: 11,
    marginTop: 1,
  },
  whiteValue: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  ctaContainer: {
    flexDirection: 'column',
    gap: 10,
    paddingHorizontal: 16,
    marginVertical: 18,
  },
  watchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  watchBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: COLORS.zinc500,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressContainer: {
    width: '90%',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    fontWeight: 'bold',
  },
  progressBarBg: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 99,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
  },
  favBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  favBtnActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.06)',
    borderColor: COLORS.primary,
  },
  favBtnText: {
    color: COLORS.zinc200,
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  favBtnTextActive: {
    color: COLORS.primary,
  },
  synopsisCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 3.5,
    height: 14,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  sectionTitle: {
    color: COLORS.zinc400,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  synopsisText: {
    color: COLORS.zinc300,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  expandBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  episodesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  episodesHeader: {
    flexDirection: 'column',
    gap: 12,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  serverTabs: {
    gap: 8,
  },
  serverTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  serverTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'transparent',
  },
  serverTabText: {
    color: COLORS.zinc300,
    fontSize: 10,
    fontWeight: 'bold',
  },
  serverTabTextActive: {
    color: '#FFFFFF',
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  episodeBtn: {
    width: (SCREEN_WIDTH - 64 - 20) / 3, // 3 columns
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeBtnWatched: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  episodeText: {
    color: COLORS.zinc200,
    fontSize: 12,
    fontWeight: '700',
  },
  episodeTextWatched: {
    color: COLORS.primary,
  },
  noEpisodesCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  noEpisodesText: {
    color: COLORS.zinc400,
    fontSize: 12,
    textAlign: 'center',
  },
  relatedContainer: {
    marginTop: 8,
  },
  commentsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  commentForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  inputIcon: {
    marginRight: 6,
  },
  nameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    paddingVertical: 0,
  },
  commentContentRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  contentInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
    height: 50,
    textAlignVertical: 'top',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.zinc600,
    opacity: 0.5,
  },
  sendBtnPressed: {
    transform: [{ scale: 0.95 }],
  },
  commentsList: {
    gap: 12,
    marginTop: 4,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    paddingBottom: 10,
  },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentDetails: {
    flex: 1,
    gap: 2,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentTime: {
    color: COLORS.zinc500,
    fontSize: 9,
  },
  commentContentText: {
    color: COLORS.zinc300,
    fontSize: 12,
    lineHeight: 18,
  },
  noComments: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  noCommentsText: {
    color: COLORS.zinc500,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
