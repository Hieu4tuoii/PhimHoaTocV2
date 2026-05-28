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
  StyleSheet as RNStyleSheet,
  BackHandler,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  Play,
  Pause,
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  ListVideo,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from 'lucide-react-native';

import { COLORS } from '../theme/colors';
import { getMovieDetail } from '../services/api';
import {
  saveWatchProgress,
  getWatchProgress,
  flushWatchProgress,
} from '../store/useAppStore';
import PressableScale from '../components/PressableScale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WatchScreen() {
  useKeepAwake();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {
    slug,
    movieName,
    movieThumb,
    episodeSlug: initialEpisodeSlug,
    episodeName: initialEpisodeName,
  } = route.params || {};

  const [currentEpisodeSlug, setCurrentEpisodeSlug] = useState(initialEpisodeSlug);
  const [currentEpisodeName, setCurrentEpisodeName] = useState(initialEpisodeName);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const [hasSeekedToSavedTime, setHasSeekedToSavedTime] = useState(false);
  const [showResumeIndicator, setShowResumeIndicator] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  // Scrubbing state - khi user kéo, không nhận update từ player
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const [zoomMode, setZoomMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [showZoomToast, setShowZoomToast] = useState(false);
  const [zoomToastText, setZoomToastText] = useState('');
  const zoomToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advanced 2-finger zoom & pan states (matching web mobile zoom percentage and dynamic pan)
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [zoomPercent, setZoomPercent] = useState(100);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const zoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lock landscape on mount, restore on unmount
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
      (async () => {
        try {
          await ScreenOrientation.unlockAsync();
        } catch (e) {
          console.warn('Failed to unlock orientation:', e);
        }
      })();
      flushWatchProgress();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Android hardware back: unlock orientation + goBack
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        (async () => {
          try {
            await ScreenOrientation.unlockAsync();
          } catch {}
          flushWatchProgress();
          navigation.goBack();
        })();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [navigation])
  );

  const detailQuery = useQuery({
    queryKey: ['watchMovieDetail', slug],
    queryFn: () => getMovieDetail(slug),
    enabled: !!slug,
  });

  const movieDetail = detailQuery.data?.movie || null;
  const episodesServers = detailQuery.data?.episodes || [];

  const currentServer = episodesServers[selectedServerIndex];
  const episodesList = currentServer?.server_data || [];
  const currentEpisodeData = episodesList.find((ep: any) => ep.slug === currentEpisodeSlug);

  const currentEpIndex = episodesList.findIndex((ep: any) => ep.slug === currentEpisodeSlug);
  const prevEp = currentEpIndex > 0 ? episodesList[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < episodesList.length - 1 ? episodesList[currentEpIndex + 1] : null;

  const videoUrl = currentEpisodeData?.link_m3u8 || '';
  const embedUrl = currentEpisodeData?.link_embed || '';
  const isEmbedOnly = !videoUrl || videoUrl === '' || playerError;

  const player = useVideoPlayer(videoUrl || 'about:blank', (playerInstance) => {
    playerInstance.loop = false;
    try {
      // Tăng tần suất update để progress bar mượt hơn
      (playerInstance as any).timeUpdateEventInterval = 0.25;
    } catch {}
    if (videoUrl) {
      playerInstance.play();
    }
  });

  const [isPlayingState, setIsPlayingState] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [durationState, setDurationState] = useState(0);

  // Time tracking - try event-based first, fall back to polling
  useEffect(() => {
    if (!player || isEmbedOnly) return;

    let timeSub: any = null;
    let playingSub: any = null;
    let mutedSub: any = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    const handleTime = () => {
      try {
        const ct = player.currentTime || 0;
        const d = player.duration || 0;
        if (!isScrubbing) setCurrentTimeState(ct);
        setDurationState(d);
        if (d > 0 && ct > 5) {
          saveWatchProgress(
            slug,
            movieName,
            movieThumb,
            currentEpisodeSlug,
            currentEpisodeName,
            ct,
            d
          );
        }
      } catch {}
    };

    try {
      timeSub = (player as any).addListener?.('timeUpdate', handleTime);
      playingSub = (player as any).addListener?.('playingChange', (e: any) => {
        const playing = typeof e === 'object' ? !!e.isPlaying : !!e;
        setIsPlayingState(playing);
      });
      mutedSub = (player as any).addListener?.('mutedChange', (e: any) => {
        const muted = typeof e === 'object' ? !!e.muted : !!e;
        setIsMuted(muted);
      });
    } catch {}

    // Polling fallback (also handles initial state)
    interval = setInterval(() => {
      try {
        const ct = player.currentTime || 0;
        const d = player.duration || 0;
        if (!isScrubbing) setCurrentTimeState(ct);
        setDurationState(d);
        setIsPlayingState(player.playing);
        if (d > 0 && ct > 5) {
          saveWatchProgress(
            slug,
            movieName,
            movieThumb,
            currentEpisodeSlug,
            currentEpisodeName,
            ct,
            d
          );
        }
      } catch {}
    }, 1000);
    progressIntervalRef.current = interval;

    return () => {
      try { timeSub?.remove?.(); } catch {}
      try { playingSub?.remove?.(); } catch {}
      try { mutedSub?.remove?.(); } catch {}
      if (interval) clearInterval(interval);
      progressIntervalRef.current = null;
    };
  }, [player, isEmbedOnly, slug, currentEpisodeSlug, currentEpisodeName, movieName, movieThumb, isScrubbing]);

  // Status error -> embed fallback
  useEffect(() => {
    if (!player) return;
    try {
      const sub = (player as any).addListener?.('statusChange', (event: any) => {
        if (event.status === 'error' || event.error) {
          console.warn('Player error, falling back to WebView embed');
          setPlayerError(true);
        }
      });
      return () => { try { sub?.remove?.(); } catch {} };
    } catch {}
  }, [player]);

  useEffect(() => {
    if (!player || isEmbedOnly) return;
    setHasSeekedToSavedTime(false);
    setShowResumeIndicator(false);
    setPlayerError(false);
  }, [currentEpisodeSlug]);

  useEffect(() => {
    if (!player || hasSeekedToSavedTime || durationState <= 0 || isEmbedOnly) return;
    const savedProgressTime = getWatchProgress(slug, currentEpisodeSlug);
    if (savedProgressTime > 10 && savedProgressTime < durationState - 10) {
      try { player.currentTime = savedProgressTime; } catch {}
      setHasSeekedToSavedTime(true);
      setShowResumeIndicator(true);
      setTimeout(() => setShowResumeIndicator(false), 4000);
    } else {
      setHasSeekedToSavedTime(true);
    }
  }, [durationState, player, hasSeekedToSavedTime, slug, currentEpisodeSlug, isEmbedOnly]);

  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlayingState && !isScrubbing) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3500);
    }
  }, [isPlayingState, isScrubbing]);

  const togglePlayerTap = useCallback(() => {
    // Tap vào video: nếu controls ẩn → hiện; nếu đang hiện → ẩn
    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      triggerShowControls();
    }
  }, [showControls, triggerShowControls]);

  const updateZoomUI = useCallback((s: number) => {
    const percent = Math.round(s * 100);
    setZoomPercent(percent);
    const zoomed = s > 1.01;
    setIsZoomed(zoomed);
    
    setShowZoomIndicator(true);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => {
      setShowZoomIndicator(false);
    }, 1500);
  }, []);

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1, { duration: 250 });
    translateX.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    
    // Reset state
    setZoomPercent(100);
    setIsZoomed(false);
    setShowZoomIndicator(true);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => {
      setShowZoomIndicator(false);
    }, 1500);

    setZoomToastText('Tỉ lệ: Đặt lại (100%)');
    setShowZoomToast(true);
    if (zoomToastTimeoutRef.current) clearTimeout(zoomToastTimeoutRef.current);
    zoomToastTimeoutRef.current = setTimeout(() => setShowZoomToast(false), 1500);
  }, []);

  // Pinch Gesture Handler
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.max(1, Math.min(3, savedScale.value * event.scale));
      scale.value = nextScale;
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomUI)(1.0);
      } else {
        savedScale.value = scale.value;
        runOnJS(updateZoomUI)(scale.value);
      }
    });

  // Pan Gesture Handler - 2 fingers pan matching web mobile behavior
  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const s = scale.value;
      if (s <= 1.01) return;
      
      const width = SCREEN_WIDTH;
      const height = Dimensions.get('window').height;
      const maxXVal = (width * (s - 1)) / 2;
      const maxYVal = (height * (s - 1)) / 2;
      
      const nextX = savedTranslateX.value + event.translationX;
      const nextY = savedTranslateY.value + event.translationY;
      
      translateX.value = Math.max(-maxXVal, Math.min(maxXVal, nextX));
      translateY.value = Math.max(-maxYVal, Math.min(maxYVal, nextY));
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedVideoStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const toggleZoomMode = useCallback(() => {
    triggerShowControls();
    let nextMode: 'contain' | 'cover' | 'fill' = 'contain';
    let label = 'Tỉ lệ: Gốc (Contain)';
    
    if (scale.value > 1.01) {
      resetZoom();
      return;
    }

    if (zoomMode === 'contain') {
      nextMode = 'cover';
      label = 'Tỉ lệ: Lấp đầy (Cover - Zoom)';
      scale.value = withTiming(1.35, { duration: 250 });
      runOnJS(updateZoomUI)(1.35);
    } else if (zoomMode === 'cover') {
      nextMode = 'fill';
      label = 'Tỉ lệ: Kéo giãn (Fill - Stretch)';
      scale.value = withTiming(1.0, { duration: 250 });
      translateX.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(0, { duration: 250 });
      runOnJS(updateZoomUI)(1.0);
    } else {
      nextMode = 'contain';
      label = 'Tỉ lệ: Gốc (Contain)';
      scale.value = withTiming(1.0, { duration: 250 });
      translateX.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(0, { duration: 250 });
      runOnJS(updateZoomUI)(1.0);
    }
    setZoomMode(nextMode);
    setZoomToastText(label);
    setShowZoomToast(true);
    
    if (zoomToastTimeoutRef.current) clearTimeout(zoomToastTimeoutRef.current);
    zoomToastTimeoutRef.current = setTimeout(() => setShowZoomToast(false), 1500);
  }, [zoomMode, triggerShowControls, resetZoom, updateZoomUI]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      triggerShowControls();
      if (scale.value > 1.01) {
        resetZoom();
        setZoomMode('contain');
      } else {
        scale.value = withTiming(1.35, { duration: 250 });
        setZoomMode('cover');
        setZoomToastText('Tỉ lệ: Lấp đầy (Cover - Zoom)');
        setShowZoomToast(true);
        if (zoomToastTimeoutRef.current) clearTimeout(zoomToastTimeoutRef.current);
        zoomToastTimeoutRef.current = setTimeout(() => setShowZoomToast(false), 1500);
        runOnJS(updateZoomUI)(1.35);
      }
    } else {
      togglePlayerTap();
    }
    lastTapRef.current = now;
  }, [togglePlayerTap, resetZoom, updateZoomUI, triggerShowControls]);

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
      if (isPlayingState) player.pause();
      else player.play();
    } catch {}
  };

  const handleSkipBack = () => {
    triggerShowControls();
    if (!player) return;
    try {
      player.currentTime = Math.max(0, player.currentTime - 10);
    } catch {}
  };

  const handleSkipForward = () => {
    triggerShowControls();
    if (!player) return;
    try {
      player.currentTime = Math.min(durationState, player.currentTime + 10);
    } catch {}
  };

  const handleMuteToggle = () => {
    triggerShowControls();
    if (!player) return;
    try {
      const newMuted = !isMuted;
      player.muted = newMuted;
      setIsMuted(newMuted);
    } catch {}
  };

  const handleEpisodeChange = (epSlug: string, epName: string) => {
    flushWatchProgress();
    setCurrentEpisodeSlug(epSlug);
    setCurrentEpisodeName(epName);
    setShowEpisodesDrawer(false);
    setPlayerError(false);
  };

  const handleBack = async () => {
    try { await ScreenOrientation.unlockAsync(); } catch {}
    flushWatchProgress();
    navigation.goBack();
  };

  const formatTime = (timeInSeconds: number) => {
    if (!timeInSeconds || timeInSeconds < 0) timeInSeconds = 0;
    const totalSec = Math.floor(timeInSeconds);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  if (detailQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden={true} style="light" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>ĐANG LIÊN KẾT SERVER PHÁT PHIM...</Text>
      </View>
    );
  }

  const sliderValue = isScrubbing ? scrubValue : currentTimeState;

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} style="light" />
      {isEmbedOnly && embedUrl ? (
        <View style={styles.webViewContainer}>
          <SafeAreaView style={styles.backHeaderWebView}>
            <PressableScale onPress={handleBack} style={styles.backBtnCircle}>
              <ArrowLeft size={16} color="#FFFFFF" />
            </PressableScale>
            <Text style={styles.webViewEpText} numberOfLines={1}>
              {movieName} - {currentEpisodeName}
            </Text>
            <PressableScale onPress={() => setShowEpisodesDrawer(true)} style={styles.iconBtn}>
              <ListVideo size={16} color="#FFFFFF" />
            </PressableScale>
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
        <GestureDetector gesture={combinedGesture}>
          <View style={styles.playerContainer}>
            <Animated.View style={[{ width: '100%', height: '100%', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, animatedVideoStyle]}>
              <VideoView player={player} nativeControls={false} contentFit={zoomMode} style={styles.videoView} />
            </Animated.View>

            {/* Zoom Indicator % and Reset button matching web mobile */}
            {isZoomed && (showZoomIndicator || showControls) && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.zoomIndicatorContainer}>
                <ZoomIn size={12} color="#00E5FF" />
                <Text style={styles.zoomIndicatorText}>{zoomPercent}%</Text>
                {isZoomed && showControls && (
                  <PressableScale onPress={resetZoom} style={styles.zoomResetBtn}>
                    <Text style={styles.zoomResetText}>RESET</Text>
                  </PressableScale>
                )}
              </Animated.View>
            )}

            {/* Transparent tap layer — toggles controls; bị ẩn off khi controls đang show
                để các button con (top/center/bottom) nhận touch trực tiếp */}
            {!showControls && (
              <Pressable
                style={RNStyleSheet.absoluteFill}
                onPress={handleDoubleTap}
              />
            )}

          {/* Resume toast */}
          {showResumeIndicator && (
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)} style={styles.resumeToast}>
              <Text style={styles.resumeToastText}>
                Đang phát tiếp từ {formatTime(getWatchProgress(slug, currentEpisodeSlug))}...
              </Text>
            </Animated.View>
          )}

          {/* Zoom Toast */}
          {showZoomToast && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.zoomToast}>
              <Text style={styles.zoomToastText}>{zoomToastText}</Text>
            </Animated.View>
          )}

          {/* Controls overlay — `pointerEvents='box-none'` để chỉ children nhận touch,
              khoảng trống truyền touch xuống lớp tap layer dưới */}
          {showControls && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(180)}
              style={styles.controlsMask}
              pointerEvents="box-none"
            >
              {/* Background tap layer - bao toàn bộ controlMask, tap vào không phải button → ẩn */}
              <Pressable
                style={RNStyleSheet.absoluteFill}
                onPress={handleDoubleTap}
              />

              <LinearGradient
                colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.3)', 'transparent']}
                style={styles.headerGradient}
                pointerEvents="none"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)']}
                style={styles.footerGradient}
                pointerEvents="none"
              />

              {/* TOP BAR */}
              <View style={styles.topBar} pointerEvents="box-none">
                <PressableScale onPress={handleBack} style={styles.backBtnCircle}>
                  <ArrowLeft size={18} color="#FFFFFF" />
                </PressableScale>

                <View style={styles.topInfo}>
                  <Text style={styles.movieTitle} numberOfLines={1}>
                    {movieName}
                  </Text>
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    {currentEpisodeName}
                  </Text>
                </View>

                <View style={styles.topRightControls}>
                   <PressableScale onPress={handleMuteToggle} style={styles.iconBtn}>
                     {isMuted ? (
                       <VolumeX size={18} color="#FFFFFF" />
                     ) : (
                       <Volume2 size={18} color="#FFFFFF" />
                     )}
                   </PressableScale>

                   <PressableScale onPress={toggleZoomMode} style={styles.iconBtn}>
                     <ZoomIn size={18} color={zoomMode !== 'contain' ? COLORS.primary : '#FFFFFF'} />
                   </PressableScale>

                   <PressableScale onPress={() => setShowEpisodesDrawer(true)} style={styles.iconBtn}>
                     <ListVideo size={18} color="#FFFFFF" />
                   </PressableScale>
                </View>
              </View>

              {/* CENTER PLAYBACK CONTROLS */}
              <View style={styles.centerControls} pointerEvents="box-none">
                <PressableScale
                  disabled={!prevEp}
                  onPress={() => prevEp && handleEpisodeChange(prevEp.slug, prevEp.name)}
                  style={[styles.skipBtn, !prevEp && styles.skipBtnDisabled]}
                >
                  <ChevronLeft size={24} color={prevEp ? '#FFFFFF' : COLORS.zinc600} />
                </PressableScale>

                <PressableScale onPress={handleSkipBack} style={styles.centerBtn}>
                  <RotateCcw size={22} color="#FFFFFF" />
                </PressableScale>

                <PressableScale onPress={handlePlayPause} style={styles.playPauseBtn}>
                  <LinearGradient
                    colors={[COLORS.primary, '#C11119']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playPauseGradient}
                  >
                    {isPlayingState ? (
                      <Pause size={26} color="#FFFFFF" fill="#FFFFFF" />
                    ) : (
                      <Play size={26} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
                    )}
                  </LinearGradient>
                </PressableScale>

                <PressableScale onPress={handleSkipForward} style={styles.centerBtn}>
                  <RotateCw size={22} color="#FFFFFF" />
                </PressableScale>

                <PressableScale
                  disabled={!nextEp}
                  onPress={() => nextEp && handleEpisodeChange(nextEp.slug, nextEp.name)}
                  style={[styles.skipBtn, !nextEp && styles.skipBtnDisabled]}
                >
                  <ChevronRight size={24} color={nextEp ? '#FFFFFF' : COLORS.zinc600} />
                </PressableScale>
              </View>

              {/* BOTTOM TIMELINE - blur background to differentiate from gradient */}
              <View style={styles.bottomBar} pointerEvents="box-none">
                <BlurView
                  tint="dark"
                  intensity={20}
                  style={[RNStyleSheet.absoluteFill, { borderRadius: 12 }]}
                  pointerEvents="none"
                />
                <Text style={styles.timeText}>{formatTime(sliderValue)}</Text>

                <Slider
                  style={styles.slider}
                  value={sliderValue}
                  minimumValue={0}
                  maximumValue={Math.max(durationState, 1)}
                  step={0.1}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.25)"
                  thumbTintColor={COLORS.primary}
                  onSlidingStart={() => {
                    setIsScrubbing(true);
                    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                  }}
                  onValueChange={(v) => setScrubValue(v)}
                  onSlidingComplete={(v) => {
                    try {
                      if (player) player.currentTime = v;
                    } catch {}
                    setCurrentTimeState(v);
                    setIsScrubbing(false);
                    triggerShowControls();
                  }}
                />

                <Text style={styles.timeText}>{formatTime(durationState)}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    )}

      {/* EPISODES DRAWER */}
      <Modal
        visible={showEpisodesDrawer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEpisodesDrawer(false)}
      >
        <Pressable style={styles.drawerOverlay} onPress={() => setShowEpisodesDrawer(false)}>
          <View style={styles.drawerWrapper} onStartShouldSetResponder={() => true}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>DANH SÁCH TẬP PHIM</Text>
              <PressableScale
                onPress={() => setShowEpisodesDrawer(false)}
                style={styles.drawerCloseBtn}
              >
                <X size={16} color="#FFFFFF" />
              </PressableScale>
            </View>

            {episodesServers.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.drawerServerScroll}>
                {episodesServers.map((server: any, idx: number) => (
                  <PressableScale
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
                  </PressableScale>
                ))}
              </ScrollView>
            )}

            <ScrollView contentContainerStyle={styles.drawerEpisodesGrid}>
              {episodesList.map((ep: any) => {
                const isActive = ep.slug === currentEpisodeSlug;
                return (
                  <PressableScale
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
                      {ep.name}
                    </Text>
                  </PressableScale>
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
    bottom: 80,
    left: 24,
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
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
    fontSize: 11,
    fontWeight: 'bold',
  },
  controlsMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  footerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 11,
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
    zIndex: 11,
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 99,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  playPauseGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 99,
  },
  centerBtn: {
    width: 44,
    height: 44,
    borderRadius: 99,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipBtn: {
    width: 40,
    height: 40,
    borderRadius: 99,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnDisabled: {
    opacity: 0.3,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    width: 50,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 36,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  drawerWrapper: {
    width: '45%',
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
    maxHeight: 36,
    marginVertical: 10,
  },
  drawerServerTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  drawerServerTabActive: {
    backgroundColor: COLORS.primary,
  },
  drawerServerTabText: {
    color: COLORS.zinc400,
    fontSize: 10,
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
  zoomToast: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 99,
  },
  zoomToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  zoomIndicatorContainer: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    zIndex: 99,
  },
  zoomIndicatorText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  zoomResetBtn: {
    marginLeft: 4,
    paddingLeft: 6,
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.25)',
  },
  zoomResetText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },
});
