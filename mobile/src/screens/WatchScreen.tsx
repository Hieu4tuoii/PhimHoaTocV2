import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Play,
  Pause,
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Maximize,
  Volume2,
  VolumeX,
  ListVideo,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

import { COLORS } from '../theme/colors';
import { getMovieDetail, getImageUrl } from '../services/api';
import {
  saveWatchProgress,
  getWatchProgress,
  flushWatchProgress,
  useAppStore,
} from '../store/useAppStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WatchScreen() {
  useKeepAwake(); // Keep screen awake during playback
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {
    slug,
    movieName,
    movieThumb,
    episodeSlug: initialEpisodeSlug,
    episodeName: initialEpisodeName,
  } = route.params || {};

  // Track current active episode in state for in-place switches
  const [currentEpisodeSlug, setCurrentEpisodeSlug] = useState(initialEpisodeSlug);
  const [currentEpisodeName, setCurrentEpisodeName] = useState(initialEpisodeName);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  // UI Control states
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const [hasSeekedToSavedTime, setHasSeekedToSavedTime] = useState(false);
  const [showResumeIndicator, setShowResumeIndicator] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Force Landscape Orientation when entering Watch Screen
  useEffect(() => {
    async function lockLandscape() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (e) {
        console.warn('Failed to lock landscape:', e);
      }
    }
    lockLandscape();

    return () => {
      // Revert to default portrait when leaving
      async function resetOrientation() {
        try {
          await ScreenOrientation.unlockAsync();
        } catch (e) {
          console.warn('Failed to unlock orientation:', e);
        }
      }
      resetOrientation();

      // Flush watch progress immediately to disk when leaving
      flushWatchProgress();

      // Clear intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Fetch full movie details to get other servers and episodes
  const detailQuery = useQuery({
    queryKey: ['watchMovieDetail', slug],
    queryFn: () => getMovieDetail(slug),
    enabled: !!slug,
  });

  const movieDetail = detailQuery.data?.movie || null;
  const episodesServers = detailQuery.data?.episodes || [];

  // Find current server and current episode data
  const currentServer = episodesServers[selectedServerIndex];
  const episodesList = currentServer?.server_data || [];
  const currentEpisodeData = episodesList.find((ep: any) => ep.slug === currentEpisodeSlug);

  const currentEpIndex = episodesList.findIndex((ep: any) => ep.slug === currentEpisodeSlug);
  const prevEp = currentEpIndex > 0 ? episodesList[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < episodesList.length - 1 ? episodesList[currentEpIndex + 1] : null;

  // Determine source streaming url
  const videoUrl = currentEpisodeData?.link_m3u8 || '';
  const embedUrl = currentEpisodeData?.link_embed || '';
  const isEmbedOnly = !videoUrl || videoUrl === '' || playerError;

  // Initialize expo-video player
  const player = useVideoPlayer(videoUrl || 'about:blank', (playerInstance) => {
    playerInstance.loop = false;
    if (videoUrl) {
      playerInstance.play();
    }
  });

  // Watch playback states from expo-video player
  const [isPlayingState, setIsPlayingState] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [durationState, setDurationState] = useState(0);

  // Poll-based time tracking (more reliable than event listeners across expo-video versions)
  useEffect(() => {
    if (!player || isEmbedOnly) return;

    const interval = setInterval(() => {
      try {
        const currentTime = player.currentTime || 0;
        const duration = player.duration || 0;
        const playing = player.playing;

        setCurrentTimeState(currentTime);
        setDurationState(duration);
        setIsPlayingState(playing);

        // Auto save progress
        if (duration > 0 && currentTime > 5) {
          saveWatchProgress(
            slug,
            movieName,
            movieThumb,
            currentEpisodeSlug,
            currentEpisodeName,
            currentTime,
            duration
          );
        }
      } catch (e) {
        // Player may be disposed
      }
    }, 1000);

    progressIntervalRef.current = interval;

    return () => {
      clearInterval(interval);
      progressIntervalRef.current = null;
    };
  }, [player, isEmbedOnly, slug, currentEpisodeSlug, currentEpisodeName, movieName, movieThumb]);

  // Handle error from player
  useEffect(() => {
    if (!player) return;

    try {
      const errorSub = player.addListener('statusChange', (event: any) => {
        if (event.status === 'error' || event.error) {
          console.warn('Player error, falling back to WebView embed');
          setPlayerError(true);
        }
      });
      return () => {
        try { errorSub.remove(); } catch (e) {}
      };
    } catch (e) {
      // Listener not supported in this version
    }
  }, [player]);

  // Handle auto-seeking watch progress on load
  useEffect(() => {
    if (!player || isEmbedOnly) return;

    // Reset seek status when switching episodes
    setHasSeekedToSavedTime(false);
    setShowResumeIndicator(false);
    setPlayerError(false);
  }, [currentEpisodeSlug]);

  // Perform seek once duration is loaded
  useEffect(() => {
    if (!player || hasSeekedToSavedTime || durationState <= 0 || isEmbedOnly) return;

    const savedProgressTime = getWatchProgress(slug, currentEpisodeSlug);
    if (savedProgressTime > 10 && savedProgressTime < durationState - 10) {
      try {
        player.currentTime = savedProgressTime;
      } catch (e) {}
      setHasSeekedToSavedTime(true);
      setShowResumeIndicator(true);

      // Hide Toast after 4 seconds
      setTimeout(() => {
        setShowResumeIndicator(false);
      }, 4000);
    } else {
      setHasSeekedToSavedTime(true);
    }
  }, [durationState, player, hasSeekedToSavedTime, slug, currentEpisodeSlug, isEmbedOnly]);

  // Controls Visibility Timeout Manager
  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlayingState) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500); // Auto hide after 3.5 seconds
    }
  }, [isPlayingState]);

  useEffect(() => {
    triggerShowControls();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlayingState]);

  const handlePlayPause = () => {
    triggerShowControls();
    if (!player) return;
    try {
      if (isPlayingState) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {}
  };

  const handleSkipBack = () => {
    triggerShowControls();
    if (!player) return;
    try {
      player.currentTime = Math.max(0, player.currentTime - 10);
    } catch (e) {}
  };

  const handleSkipForward = () => {
    triggerShowControls();
    if (!player) return;
    try {
      player.currentTime = Math.min(durationState, player.currentTime + 10);
    } catch (e) {}
  };

  const handleMuteToggle = () => {
    triggerShowControls();
    if (!player) return;
    try {
      player.muted = !isMuted;
      setIsMuted(!isMuted);
    } catch (e) {}
  };

  const handleEpisodeChange = (epSlug: string, epName: string) => {
    // Flush current progress first
    flushWatchProgress();

    // Switch episode details
    setCurrentEpisodeSlug(epSlug);
    setCurrentEpisodeName(epName);
    setShowEpisodesDrawer(false);
    setPlayerError(false);
  };

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Safe progress percentage calculator
  const progressPct = durationState > 0 ? (currentTimeState / durationState) * 100 : 0;

  if (detailQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>ĐANG LIÊN KẾT SERVER PHÁT PHIM...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isEmbedOnly && embedUrl ? (
        /* EMBED PLAYER FALLBACK USING SANDBOXED WEBVIEW */
        <View style={styles.webViewContainer}>
          {/* Web header absolute to go back */}
          <SafeAreaView style={styles.backHeaderWebView}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtnCircle}>
              <ArrowLeft size={16} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.webViewEpText} numberOfLines={1}>
              {movieName} - Tập {currentEpisodeName}
            </Text>

            {/* Episode drawer button */}
            <Pressable onPress={() => setShowEpisodesDrawer(true)} style={styles.iconBtn}>
              <ListVideo size={16} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>

          <WebView
            source={{ uri: embedUrl }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            style={styles.webView}
          />
        </View>
      ) : (
        /* NATIVE HLS PLAYER USING EXPO-VIDEO */
        <Pressable onPress={triggerShowControls} style={styles.playerContainer}>
          <VideoView
            player={player}
            nativeControls={false}
            style={styles.videoView}
          />

          {/* Toast Resume Progress Notification */}
          {showResumeIndicator && (
            <View style={styles.resumeToast}>
              <Text style={styles.resumeToastText}>
                Đang phát tiếp từ {formatTime(getWatchProgress(slug, currentEpisodeSlug))}...
              </Text>
            </View>
          )}

          {/* CONTROLS OVERLAY INTERACTION MASK */}
          {showControls && (
            <View style={styles.controlsMask}>
              {/* Gradient dark headers & footers */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.3)', 'transparent']}
                style={styles.headerGradient}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)']}
                style={styles.footerGradient}
              />

              {/* 1. TOP BAR CONTROL */}
              <View style={styles.topBar}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtnCircle}>
                  <ArrowLeft size={18} color="#FFFFFF" />
                </Pressable>

                <View style={styles.topInfo}>
                  <Text style={styles.movieTitle} numberOfLines={1}>
                    {movieName}
                  </Text>
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    Tập {currentEpisodeName}
                  </Text>
                </View>

                {/* Right controls */}
                <View style={styles.topRightControls}>
                  <Pressable onPress={handleMuteToggle} style={styles.iconBtn}>
                    {isMuted ? (
                      <VolumeX size={18} color="#FFFFFF" />
                    ) : (
                      <Volume2 size={18} color="#FFFFFF" />
                    )}
                  </Pressable>

                  <Pressable onPress={() => setShowEpisodesDrawer(true)} style={styles.iconBtn}>
                    <ListVideo size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              {/* 2. CENTER PLAYBACK CONTROLS */}
              <View style={styles.centerControls}>
                {/* Prev Episode */}
                <Pressable
                  disabled={!prevEp}
                  onPress={() => prevEp && handleEpisodeChange(prevEp.slug, prevEp.name)}
                  style={[styles.skipBtn, !prevEp && styles.skipBtnDisabled]}
                >
                  <ChevronLeft size={24} color={prevEp ? '#FFFFFF' : COLORS.zinc600} />
                </Pressable>

                {/* Seek Back 10s */}
                <Pressable onPress={handleSkipBack} style={styles.centerBtn}>
                  <RotateCcw size={22} color="#FFFFFF" />
                </Pressable>

                {/* Play / Pause */}
                <Pressable onPress={handlePlayPause} style={styles.playPauseBtn}>
                  {isPlayingState ? (
                    <Pause size={24} color="#FFFFFF" fill="#FFFFFF" />
                  ) : (
                    <Play size={24} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
                  )}
                </Pressable>

                {/* Seek Forward 10s */}
                <Pressable onPress={handleSkipForward} style={styles.centerBtn}>
                  <RotateCw size={22} color="#FFFFFF" />
                </Pressable>

                {/* Next Episode */}
                <Pressable
                  disabled={!nextEp}
                  onPress={() => nextEp && handleEpisodeChange(nextEp.slug, nextEp.name)}
                  style={[styles.skipBtn, !nextEp && styles.skipBtnDisabled]}
                >
                  <ChevronRight size={24} color={nextEp ? '#FFFFFF' : COLORS.zinc600} />
                </Pressable>
              </View>

              {/* 3. BOTTOM TIMELINE CONTROLS */}
              <View style={styles.bottomBar}>
                {/* Time indicators */}
                <Text style={styles.timeText}>{formatTime(currentTimeState)}</Text>

                {/* Premium Seekbar Timeline */}
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineBg} />
                  <View style={[styles.timelineFill, { width: `${Math.min(progressPct, 100)}%` as any }]} />
                  <View style={[styles.timelineThumb, { left: `${Math.min(progressPct, 100)}%` as any }]} />
                </View>

                <Text style={styles.timeText}>{formatTime(durationState)}</Text>

                {/* Fullscreen decoration */}
                <Pressable style={styles.fullscreenBtn}>
                  <Maximize size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      )}

      {/* 4. MODAL EPISODE SELECTOR DRAWER */}
      <Modal
        visible={showEpisodesDrawer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEpisodesDrawer(false)}
      >
        <Pressable
          style={styles.drawerOverlay}
          onPress={() => setShowEpisodesDrawer(false)}
        >
          <View style={styles.drawerWrapper} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>DANH SÁCH TẬP PHIM</Text>
              <Pressable
                onPress={() => setShowEpisodesDrawer(false)}
                style={styles.drawerCloseBtn}
              >
                <X size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Server tabs in drawer */}
            {episodesServers.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.drawerServerScroll}>
                {episodesServers.map((server: any, idx: number) => (
                  <Pressable
                    key={server.server_name}
                    onPress={() => setSelectedServerIndex(idx)}
                    style={[
                      styles.drawerServerTab,
                      selectedServerIndex === idx && styles.drawerServerTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.drawerServerTabText,
                        selectedServerIndex === idx && styles.drawerServerTabTextActive,
                      ]}
                    >
                      {server.server_name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* Episodes List inside drawer */}
            <ScrollView contentContainerStyle={styles.drawerEpisodesGrid}>
              {episodesList.map((ep: any) => {
                const isActive = ep.slug === currentEpisodeSlug;
                return (
                  <Pressable
                    key={ep.slug}
                    onPress={() => handleEpisodeChange(ep.slug, ep.name)}
                    style={[
                      styles.drawerEpBtn,
                      isActive && styles.drawerEpBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.drawerEpText,
                        isActive && styles.drawerEpTextActive,
                      ]}
                    >
                      Tập {ep.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backHeaderWebView: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 16,
    gap: 12,
  },
  webViewEpText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  resumeToast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 99,
  },
  resumeToastText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlsMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  footerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 11,
  },
  backBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topInfo: {
    flex: 1,
    marginLeft: 12,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  episodeTitle: {
    color: COLORS.zinc400,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    position: 'absolute',
    left: 0,
    right: 0,
    top: '44%',
    zIndex: 11,
  },
  playPauseBtn: {
    width: 50,
    height: 50,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  centerBtn: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipBtn: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: 'rgba(20, 20, 20, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnDisabled: {
    opacity: 0.3,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 11,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
  },
  timelineContainer: {
    flex: 1,
    height: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  timelineBg: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 99,
  },
  timelineFill: {
    position: 'absolute',
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 99,
  },
  timelineThumb: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  fullscreenBtn: {
    padding: 6,
  },
  // Modal Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    flexDirection: 'row', // Horizontal overlay for Landscape view!
  },
  drawerWrapper: {
    width: '40%', // Take 40% screen width in Landscape mode
    height: '100%',
    backgroundColor: '#0F0F0F',
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 10,
  },
  drawerTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerServerScroll: {
    maxHeight: 32,
    marginVertical: 10,
  },
  drawerServerTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  drawerServerTabActive: {
    backgroundColor: COLORS.primary,
  },
  drawerServerTabText: {
    color: COLORS.zinc400,
    fontSize: 9,
    fontWeight: 'bold',
  },
  drawerServerTabTextActive: {
    color: '#FFFFFF',
  },
  drawerEpisodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  drawerEpBtn: {
    width: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerEpBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'transparent',
  },
  drawerEpText: {
    color: COLORS.zinc300,
    fontSize: 10,
    fontWeight: 'bold',
  },
  drawerEpTextActive: {
    color: '#FFFFFF',
  },
});
