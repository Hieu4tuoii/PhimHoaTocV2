'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Pause, Tv, ArrowLeft, ArrowRight, AlertTriangle, Monitor, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, PlayCircle, Lock, Unlock, SkipForward, List, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MovieDetail, MovieServer, EpisodeData } from '@/types';
import Hls from 'hls.js';

// SVG Icon tùy chỉnh cho Picture-in-Picture
const PipIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M8 4.5v5H3v-5z" />
    <path d="M2 12v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-8" />
    <path d="M13 11v7h8v-7z" fill="currentColor" className="text-brand-rose" />
  </svg>
);

interface WatchPlayerClientProps {
  movie: MovieDetail;
  currentEpisode: EpisodeData;
  episodes: MovieServer[];
}

export const WatchPlayerClient: React.FC<WatchPlayerClientProps> = ({ movie, currentEpisode, episodes }) => {
  const router = useRouter();
  const { isCinemaMode, toggleCinemaMode, setCinemaMode, saveWatchProgress, getWatchProgress } = useApp();
  
  // Player Configuration States
  const [selectedServerIndex, setSelectedServerIndex] = useState(0); // Index of episodes server list
  const [playMode, setPlayMode] = useState<'hls' | 'embed'>('hls'); // default HLS player if supported
  
  // Custom States cho các nút điều khiển mới
  const [isLandscapeFullscreen, setIsLandscapeFullscreen] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockBtn, setShowUnlockBtn] = useState(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);

  const unlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevVolumeRef = useRef(1);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Performance: Use refs for high-frequency values to avoid re-renders
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const progressBarRef = useRef<HTMLInputElement>(null);
  const currentTimeDisplayRef = useRef<HTMLSpanElement>(null);
  const durationDisplayRef = useRef<HTMLSpanElement>(null);
  
  // Custom Controls States (only for low-frequency UI updates)
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseMoveThrottleRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isTouchDeviceRef = useRef(false);
  const touchHandledRef = useRef(false);

  // Find all episodes of selected server to facilitate navigation
  const currentServerEpisodes = episodes[selectedServerIndex]?.server_data || [];
  
  // Find the episode matching the slug of currentEpisode dynamically
  const activeEpisode = currentServerEpisodes.find((ep) => ep.slug === currentEpisode.slug) || currentEpisode;
  
  const currentEpIndex = currentServerEpisodes.findIndex((ep) => ep.slug === activeEpisode.slug);
  
  const prevEp = currentEpIndex > 0 ? currentServerEpisodes[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < currentServerEpisodes.length - 1 ? currentServerEpisodes[currentEpIndex + 1] : null;

  // Performance: Prefetch next episode route for instant navigation
  useEffect(() => {
    if (nextEp) {
      router.prefetch(`/xem-phim/${movie.slug}/${nextEp.slug}`);
    }
  }, [nextEp, movie.slug, router]);

  // 1. Sync server list index on mount
  useEffect(() => {
    // If HLS link is empty, fall back to embed iframe immediately
    if (!activeEpisode.link_m3u8) {
      setPlayMode('embed');
    } else {
      setPlayMode('hls');
    }
  }, [activeEpisode]);

  // 2. Cinema backdrop side-effect
  useEffect(() => {
    // Inject or toggle class on body/html for cinema mode styling
    const backdrop = document.querySelector('.cinema-backdrop-overlay');
    if (isCinemaMode) {
      backdrop?.classList.add('active');
    } else {
      backdrop?.classList.remove('active');
    }
    return () => {
      // Always reset on page leave
      setCinemaMode(false);
      backdrop?.classList.remove('active');
    };
  }, [isCinemaMode]);

  // 2.1. Cleanup control & resume timers on unmount + fullscreen orientation reset & PiP check
  useEffect(() => {
    const checkLandscapeFullscreen = () => {
      const isFS = !!document.fullscreenElement;
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsLandscapeFullscreen(isFS && isLandscape);
    };

    const handleFullscreenChange = () => {
      checkLandscapeFullscreen();
      if (!document.fullscreenElement) {
        // User thoát fullscreen (Escape/Back) → unlock orientation và đóng drawer
        setShowEpisodesDrawer(false);
        try {
          (screen.orientation as any).unlock();
        } catch {
          // Không hỗ trợ — bỏ qua
        }
      }
    };

    const handleResize = () => {
      if (document.fullscreenElement) {
        checkLandscapeFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);

    // Kiểm tra xem trình duyệt có hỗ trợ Picture-in-Picture hay không
    setIsPipSupported(
      typeof document !== 'undefined' && 
      document.pictureInPictureEnabled && 
      !!videoRef.current
    );

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    };
  }, []);

  // 2.2. Auto-hide controls based on play/pause status
  useEffect(() => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);


  // Performance: formatTime as a stable helper (no dependency on state)
  const formatTime = useCallback((timeInSeconds: number) => {
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);

    let result = '';
    if (hrs > 0) result += `${hrs}:`;
    result += `${mins < 10 ? '0' : ''}${mins}:`;
    result += `${secs < 10 ? '0' : ''}${secs}`;
    return result;
  }, []);

  // Performance: Direct DOM update for progress bar — avoids setState 4x/sec
  const updateProgressDOM = useCallback(() => {
    const time = currentTimeRef.current;
    const dur = durationRef.current;
    
    if (progressBarRef.current) {
      progressBarRef.current.value = String(time);
      progressBarRef.current.max = String(dur || 0);
      // Tô màu đỏ phần progress trượt qua theo đúng mã màu thiết kế #E50914
      const pct = dur > 0 ? (time / dur) * 100 : 0;
      progressBarRef.current.style.background = `linear-gradient(to right, #E50914 0%, #E50914 ${pct}%, #334155 ${pct}%, #334155 100%)`;
      progressBarRef.current.style.accentColor = '#E50914';
    }
    if (currentTimeDisplayRef.current) {
      currentTimeDisplayRef.current.textContent = formatTime(time);
    }
    if (durationDisplayRef.current) {
      durationDisplayRef.current.textContent = formatTime(dur);
    }
  }, [formatTime]);

  // 3. Initialize HLS Player on m3u8 link change
  useEffect(() => {
    if (playMode !== 'hls' || !videoRef.current || !activeEpisode.link_m3u8) return;

    const video = videoRef.current;
    const hlsUrl = activeEpisode.link_m3u8;

    // Clean up existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Performance: Optimized HLS config for smoother streaming
        maxMaxBufferLength: 60,           // Increase buffer from 30s → 60s for unstable networks
        maxBufferSize: 60 * 1000 * 1000,  // 60MB buffer size
        maxBufferHole: 0.5,               // Allow small buffer holes
        enableWorker: true,
        startLevel: -1,                   // Auto-detect best quality level
        capLevelToPlayerSize: true,       // Don't load resolution > player size
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Hls loaded successfully
        checkAndShowResume();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS fatal network error, trying to recover...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS fatal media error, trying to recover...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('HLS unrecoverable error, switching to Embed Player...', data);
              setPlayMode('embed');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (mainly Safari iOS)
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        checkAndShowResume();
      });
    } else {
      // browser does not support HLS at all, fallback to Embed
      setPlayMode('embed');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeEpisode.link_m3u8, playMode]);

  // Check watch progress of this episode to offer resume
  const checkAndShowResume = useCallback(() => {
    const progress = getWatchProgress(movie.slug, activeEpisode.slug);
    if (progress > 10) { // Only resume if watched more than 10 seconds
      setSavedTime(progress);
      setShowResumeToast(true);
      // Auto-hide toast after 10 seconds
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => setShowResumeToast(false), 10000);
    }
  }, [getWatchProgress, movie.slug, activeEpisode.slug]);

  const handleResumePlay = useCallback(() => {
    if (videoRef.current && savedTime > 0) {
      videoRef.current.currentTime = savedTime;
      videoRef.current.play();
      setIsPlaying(true);
    }
    setShowResumeToast(false);
  }, [savedTime]);

  // 4. Progress Auto-Save Timer & Video events hook
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playMode !== 'hls') return;

    let saveInterval: NodeJS.Timeout;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    // Performance: Update ref + DOM directly instead of setState
    const handleTimeUpdate = () => {
      currentTimeRef.current = video.currentTime;
      updateProgressDOM();
    };

    const handleDurationChange = () => {
      durationRef.current = video.duration;
      updateProgressDOM();
    };

    // Auto save progress every 5 seconds when playing
    const startProgressSaving = () => {
      saveInterval = setInterval(() => {
        if (video.currentTime > 5 && video.duration > 0) {
          saveWatchProgress(
            movie.slug,
            movie.name,
            movie.thumb_url || movie.poster_url,
            activeEpisode.slug,
            activeEpisode.name,
            video.currentTime,
            video.duration
          );
        }
      }, 5000);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    
    let nextEpisodeTimeout: NodeJS.Timeout;

    // Auto-next when movie ends
    const handleEnded = () => {
      setIsPlaying(false);
      if (nextEp) {
        // Auto-navigate to next episode after 3 seconds
        nextEpisodeTimeout = setTimeout(() => {
          router.push(`/xem-phim/${movie.slug}/${nextEp.slug}`);
        }, 3000);
      }
    };
    video.addEventListener('ended', handleEnded);

    startProgressSaving();

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
      clearInterval(saveInterval);
      if (nextEpisodeTimeout) clearTimeout(nextEpisodeTimeout);
    };
  }, [activeEpisode, playMode, nextEp, movie.slug, movie.name, movie.thumb_url, movie.poster_url, activeEpisode.slug, activeEpisode.name, saveWatchProgress, updateProgressDOM, router]);

  // Custom Player Actions
  const handleSkip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    let newTime = video.currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (newTime > durationRef.current) newTime = durationRef.current;
    video.currentTime = newTime;
    currentTimeRef.current = newTime;
    updateProgressDOM();
  }, [updateProgressDOM]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(err => console.error("Error playing video:", err));
    } else {
      video.pause();
    }
  }, []);

  // Logic chung toggle controls / play — dùng cho cả click lẫn touch
  const handlePlayerTap = useCallback(() => {
    lastClickTimeRef.current = Date.now();

    if (isPlaying) {
      setShowControls((prev) => {
        const nextState = !prev;
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (nextState) {
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
          }, 3000);
        }
        return nextState;
      });
    } else {
      togglePlay();
    }
  }, [isPlaying, togglePlay]);

  // Kiểm tra xem event target có phải interactive element không
  const isInteractiveTarget = useCallback((target: HTMLElement): boolean => {
    const interactiveTags = ['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA'];
    // Kiểm tra chính element hoặc parent gần nhất
    if (interactiveTags.includes(target.tagName)) return true;
    if (target.closest('button, input, a, .controls-prevent-click')) return true;
    // SVG icon bên trong button
    if (target.closest('svg')?.closest('button')) return true;
    return false;
  }, []);

  const handlePlayerClick = useCallback((e: React.MouseEvent) => {
    // Nếu touch đã xử lý rồi, bỏ qua click (tránh double-fire trên mobile)
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }

    const target = e.target as HTMLElement;
    if (isInteractiveTarget(target)) return;

    e.preventDefault();
    e.stopPropagation();
    handlePlayerTap();
  }, [handlePlayerTap, isInteractiveTarget]);

  // Touch handler riêng cho mobile — phản hồi ngay tại touchend, không chờ 300ms click delay
  const handlePlayerTouchEnd = useCallback((e: React.TouchEvent) => {
    isTouchDeviceRef.current = true;
    const target = e.target as HTMLElement;
    if (isInteractiveTarget(target)) return;

    e.preventDefault();
    touchHandledRef.current = true;
    handlePlayerTap();
  }, [handlePlayerTap, isInteractiveTarget]);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    currentTimeRef.current = seekTime;
    updateProgressDOM();
  }, [updateProgressDOM]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const playerContainer = playerContainerRef.current;
    if (!playerContainer) return;

    if (!document.fullscreenElement) {
      try {
        await playerContainer.requestFullscreen();
        // Thử xoay ngang khi vào fullscreen (mobile/tablet)
        try {
          await (screen.orientation as any).lock('landscape');
        } catch {
          // Orientation lock không được hỗ trợ hoặc bị từ chối — bỏ qua
        }
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else {
      try {
        (screen.orientation as any).unlock();
      } catch {
        // Không hỗ trợ orientation unlock — bỏ qua
      }
      document.exitFullscreen();
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Picture-in-Picture error:', err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.volume > 0) {
      prevVolumeRef.current = video.volume;
      video.volume = 0;
      setVolume(0);
    } else {
      const targetVol = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      video.volume = targetVol;
      setVolume(targetVol);
    }
  }, []);

  // Performance: Throttled mouse move handler (max 1 call per 300ms)
  const handleMouseMove = useCallback(() => {
    // Bỏ qua trên touch device — đã có touch handler riêng
    if (isTouchDeviceRef.current) return;

    // Ngăn chặn mousemove làm hiện lại controls ngay sau khi click ẩn controls (trong vòng 800ms)
    if (Date.now() - lastClickTimeRef.current < 800) return;

    if (mouseMoveThrottleRef.current) return;
    mouseMoveThrottleRef.current = true;

    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // hide control bar after 3 seconds of inactivity
    }

    setTimeout(() => {
      mouseMoveThrottleRef.current = false;
    }, 300);
  }, [isPlaying]);

  return (
    <div className="w-full space-y-8 animate-slide-up">
      
      {/* 1. CINEMA BACKDROP OVERLAY OVER WHOLE PAGE */}
      <div 
        className="cinema-backdrop cinema-backdrop-overlay" 
        onClick={() => toggleCinemaMode()}
      />

      {/* 2. CINEMA PLAYER CONTAINER */}
      <div 
        ref={playerContainerRef}
        className={`custom-player-container relative aspect-video w-[calc(100%+2rem)] -mx-4 sm:mx-0 sm:w-full bg-black rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-slate-800/80 shadow-2xl z-40 transition-all duration-500 ${
          isCinemaMode 
            ? 'ring-4 ring-brand-violet/50 shadow-brand-violet/40 scale-102' 
            : 'shadow-black/60'
        }`}
        onMouseMove={handleMouseMove}
      >
        
        {/* Play HLS m3u8 Mode */}
        {playMode === 'hls' && activeEpisode.link_m3u8 && (
          <div className="relative w-full h-full group/player cursor-none" style={{ cursor: showControls ? 'default' : 'none' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onClick={handlePlayerClick}
              onTouchEnd={handlePlayerTouchEnd}
              playsInline
            />

            {/* Khóa màn hình Overlay */}
            {isLocked && isLandscapeFullscreen && (
              <div 
                className="absolute inset-0 z-50 flex items-center justify-start p-6 bg-black/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnlockBtn(true);
                  if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
                  unlockTimeoutRef.current = setTimeout(() => setShowUnlockBtn(false), 3000);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  setShowUnlockBtn(true);
                  if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
                  unlockTimeoutRef.current = setTimeout(() => setShowUnlockBtn(false), 3000);
                }}
              >
                {(showUnlockBtn || !isPlaying) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLocked(false);
                      setShowControls(true);
                    }}
                    className="w-12 h-12 rounded-full bg-brand-rose/85 hover:bg-brand-rose border border-white/20 flex items-center justify-center text-white cursor-pointer shadow-lg animate-pulse transition-all"
                    title="Mở khóa màn hình"
                  >
                    <Lock className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            )}

            {/* Custom Overlay Controls */}
            {!isLocked && (
              <div 
                className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40 flex flex-col justify-between p-4 transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={handlePlayerClick}
                onTouchEnd={handlePlayerTouchEnd}
              >
              {/* Top controls: Movie titles & Quick Episode list (Ẩn mượt mà khi chưa bấm phát) */}
              <div className={`flex justify-between items-center controls-prevent-click transition-all duration-300 ${
                !isPlaying ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100'
              }`}>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-base text-white">{movie.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold">{activeEpisode.name}</p>
                </div>

                {isLandscapeFullscreen && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEpisodesDrawer(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer active:scale-95 transition-all shadow-md"
                    title="Danh sách tập"
                  >
                    <List className="w-4 h-4 text-slate-200" />
                    <span>Chọn tập</span>
                  </button>
                )}
              </div>

              {/* Screen Lock Button - Chỉ hiện khi ở chế độ màn hình ngang mobile */}
              {isLandscapeFullscreen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLocked(true);
                    setShowControls(false);
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all z-40"
                  title="Khóa màn hình"
                >
                  <Unlock className="w-5 h-5 text-slate-200" />
                </button>
              )}

              {/* Large Play/Pause & Skip Controls in the Center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-5 sm:gap-8 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkip(-10);
                  }}
                  className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 flex items-center justify-center text-white cursor-pointer active:scale-95 hover:scale-105 active:duration-75 transition-all duration-200"
                  title="Lùi 10 giây"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center border border-white/20 text-white shadow-lg cursor-pointer transform hover:scale-105 transition-transform shadow-brand-violet/50 active:scale-95 duration-200"
                  title={isPlaying ? "Tạm dừng" : "Phát video"}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white fill-white" />
                  ) : (
                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkip(10);
                  }}
                  className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 flex items-center justify-center text-white cursor-pointer active:scale-95 hover:scale-105 active:duration-75 transition-all duration-200"
                  title="Tua 10 giây"
                >
                  <RotateCw className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Bottom controls panel (Ẩn mượt mà khi chưa bấm phát) */}
              <div className={`space-y-3 w-full controls-prevent-click transition-all duration-300 ${
                !isPlaying ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'
              }`}>
                
                {/* Progress bar timeline */}
                <div className="flex items-center gap-3">
                  <span ref={currentTimeDisplayRef} className="text-xs text-slate-300 tabular-nums">
                    0:00
                  </span>
                  <input
                    ref={progressBarRef}
                    type="range"
                    min="0"
                    max="0"
                    defaultValue="0"
                    onChange={handleSeekChange}
                    className="player-slider w-full cursor-pointer focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #E50914 0%, #E50914 0%, #334155 0%, #334155 100%)`,
                      accentColor: '#E50914'
                    }}
                  />
                  <span ref={durationDisplayRef} className="text-xs text-slate-300 tabular-nums">
                    0:00
                  </span>
                </div>

                {/* Controls action buttons row */}
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center gap-3 sm:gap-5">
                    {/* Play/Pause Button */}
                    <button onClick={togglePlay} className="hover:text-brand-rose cursor-pointer transition-colors" title={isPlaying ? "Tạm dừng" : "Phát video"}>
                      {isPlaying ? (
                        <Pause className="w-5.5 h-5.5 fill-white" />
                      ) : (
                        <Play className="w-5.5 h-5.5 fill-white" />
                      )}
                    </button>

                    {/* Quick Next Episode Button - Chuyển tập tiếp theo nhanh */}
                    {nextEp && (
                      <button
                        onClick={() => {
                          router.push(`/xem-phim/${movie.slug}/${nextEp.slug}`);
                        }}
                        className="text-slate-300 hover:text-brand-rose cursor-pointer transition-colors ml-0.5 active:scale-90 duration-100"
                        title="Tập tiếp theo"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                    )}

                    {/* Volume Bar slider - Hiển thị nút âm thanh trên mọi thiết bị, chỉ ẩn thanh slider ở mobile dọc */}
                    <div className="flex items-center gap-2 group/volume ml-1 sm:ml-2">
                      {volume === 0 ? (
                        <button
                          onClick={toggleMute}
                          className="text-brand-rose hover:text-white cursor-pointer transition-colors"
                          title="Bật tiếng"
                        >
                          <VolumeX className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={toggleMute}
                          className="text-slate-300 hover:text-brand-rose cursor-pointer transition-colors"
                          title="Tắt tiếng"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      )}
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="player-slider hidden sm:block w-16 cursor-pointer focus:outline-none"
                        style={{
                          background: `linear-gradient(to right, #E50914 0%, #E50914 ${volume * 100}%, #334155 ${volume * 100}%, #334155 100%)`,
                          accentColor: '#E50914'
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:gap-4">
                    {/* Picture-in-Picture Button */}
                    {isPipSupported && playMode === 'hls' && (
                      <button
                        onClick={togglePictureInPicture}
                        className="hover:text-brand-rose text-slate-300 cursor-pointer transition-colors"
                        title="Xem dạng cửa sổ nổi"
                      >
                        <PipIcon />
                      </button>
                    )}

                    {/* Fullscreen Button */}
                    <button onClick={toggleFullscreen} className="hover:text-brand-cyan cursor-pointer">
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Drawer danh sách tập phim trượt từ cạnh phải (Chỉ hiển thị khi xoay ngang fullscreen di động) */}
          {isLandscapeFullscreen && (
            <>
              {/* Overlay mờ nền */}
              <div 
                className={`absolute inset-0 bg-black/60 z-[60] transition-opacity duration-300 ${
                  showEpisodesDrawer ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEpisodesDrawer(false);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  setShowEpisodesDrawer(false);
                }}
              />
              
              {/* Drawer Panel */}
              <div 
                className={`absolute top-0 right-0 h-full w-80 bg-slate-950/95 backdrop-blur-md border-l border-white/10 z-[70] flex flex-col p-6 shadow-2xl transition-transform duration-300 ease-out ${
                  showEpisodesDrawer ? 'translate-x-0' : 'translate-x-full'
                }`}
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
                  <div className="space-y-1">
                    <h4 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-4 bg-gradient-to-b from-brand-violet to-brand-rose rounded-full" />
                      Danh sách tập
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">Server: {episodes[selectedServerIndex]?.server_name || 'Standard'}</p>
                  </div>
                  <button 
                    onClick={() => setShowEpisodesDrawer(false)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Body: Episode Grid/List Scrollable */}
                <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
                  {currentServerEpisodes.map((ep) => {
                    const isCurrent = ep.slug === activeEpisode.slug;
                    return (
                      <button
                        key={ep.slug}
                        onClick={() => {
                          setShowEpisodesDrawer(false);
                          router.push(`/xem-phim/${movie.slug}/${ep.slug}`);
                        }}
                        className={`w-full text-left py-3 px-4 text-xs font-bold rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? 'bg-gradient-brand border-transparent text-white shadow-lg shadow-brand-violet/25'
                            : 'bg-white/5 border-white/5 hover:border-brand-rose/50 hover:bg-white/8 text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">{ep.name}</span>
                        {isCurrent && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-cyan"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

        {/* Play Embed Iframe Mode */}
        {(playMode === 'embed' || !activeEpisode.link_m3u8) && (
          <div className="relative w-full h-full">
            <iframe
              src={activeEpisode.link_embed}
              className="w-full h-full border-0"
              allowFullScreen
              // Sandbox integration to block aggressive popup ads
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            />
          </div>
        )}

        {/* 3. AUTO RESUME TOAST ALERT */}
        {showResumeToast && (
          <div className="absolute bottom-16 left-6 z-50 p-4 glass-panel border-brand-violet/50 rounded-2xl shadow-2xl flex items-center justify-between gap-6 animate-slide-up">
            <div className="space-y-0.5">
              <h5 className="font-bold text-xs text-brand-cyan uppercase tracking-wider">Tiếp tục xem phim?</h5>
              <p className="text-xs text-slate-300">
                Hệ thống phát hiện bạn xem dở ở phút <span className="font-bold text-white tabular-nums">{formatTime(savedTime)}</span>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResumePlay}
                className="px-3 py-1.5 text-xs font-bold bg-gradient-brand text-white rounded-lg shadow-md cursor-pointer"
              >
                Đồng ý
              </button>
              <button
                onClick={() => setShowResumeToast(false)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Cụm chọn nguồn phát dự phòng (Play Mode) tích hợp dưới player */}
      {activeEpisode.link_m3u8 && activeEpisode.link_embed && (
        <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-white/2 border border-white/5 rounded-2xl">
          <span className="text-xs font-bold text-slate-400">Nguồn phát:</span>
          <button
            onClick={() => setPlayMode('hls')}
            className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border active:scale-95 active:duration-75 ${
              playMode === 'hls'
                ? 'bg-gradient-to-r from-brand-violet to-brand-rose text-white border-transparent shadow-md shadow-brand-violet/10'
                : 'bg-white/5 hover:bg-white/8 text-slate-300 border-white/5'
            }`}
          >
            VIP
          </button>
          <button
            onClick={() => setPlayMode('embed')}
            className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border active:scale-95 active:duration-75 ${
              playMode === 'embed'
                ? 'bg-gradient-to-r from-brand-violet to-brand-rose text-white border-transparent shadow-md shadow-brand-violet/10'
                : 'bg-white/5 hover:bg-white/8 text-slate-300 border-white/5'
            }`}
          >
            Dự phòng
          </button>
        </div>
      )}

      {/* 3. UNDER PLAYER STATS & NAVIGATION ACTIONS */}
      <div className="flex items-center justify-between gap-4 pt-3 pb-4 border-b border-slate-900/60">
        {/* Episode description stats */}
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-black text-white truncate" title={movie.name}>{movie.name}</h1>
          <p className="text-[11px] sm:text-xs text-slate-400 font-semibold truncate mt-0.5">
            Đang phát: <span className="text-brand-rose font-bold">{activeEpisode.name}</span>
            <span className="hidden xs:inline"> | Server: {episodes[selectedServerIndex]?.server_name || 'Standard'}</span>
          </p>
        </div>

        {/* Prev / Next navigation buttons - Làm cực kỳ nhỏ gọn để đỡ tốn diện tích */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {prevEp ? (
            <Link
              href={`/xem-phim/${movie.slug}/${prevEp.slug}`}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700/50 hover:border-slate-600 rounded-xl active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tập trước</span>
              <span className="inline sm:hidden">Trước</span>
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-900/20 text-slate-600 text-xs font-bold border border-slate-850 rounded-xl cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tập trước</span>
              <span className="inline sm:hidden">Trước</span>
            </button>
          )}

          {nextEp ? (
            <Link
              href={`/xem-phim/${movie.slug}/${nextEp.slug}`}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-brand text-xs font-bold text-white rounded-xl shadow-lg hover:shadow-brand-rose/25 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <span className="hidden sm:inline">Tập tiếp theo</span>
              <span className="inline sm:hidden">Tiếp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-900/20 text-slate-600 text-xs font-bold border border-slate-850 rounded-xl cursor-not-allowed"
            >
              <span className="hidden sm:inline">Tập tiếp theo</span>
              <span className="inline sm:hidden">Tiếp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. CHOOSE SERVER & OTHERS EPISODES GRID SELECTOR */}
      <div className="space-y-6 bg-white/3 border border-white/5 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4.5 bg-gradient-to-b from-brand-violet to-brand-rose rounded-full" />
              Danh Sách Tập Phim
            </h3>
            <p className="text-xs text-slate-500 font-medium">Chuyển Danh sách tập hoặc đổi nguồn phát (Server) nếu bị lỗi tải.</p>
          </div>
          
          {/* Server Switch tabs */}
          {episodes.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              {episodes.map((server, idx) => (
                <button
                  key={server.server_name}
                  onClick={() => setSelectedServerIndex(idx)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap border active:scale-95 active:duration-75 ${
                    selectedServerIndex === idx
                      ? 'bg-gradient-to-r from-brand-violet to-brand-rose text-white border-transparent shadow-md'
                      : 'bg-white/5 hover:bg-white/8 text-slate-300 border-white/5'
                  }`}
                >
                  {server.server_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick select grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
          {currentServerEpisodes.map((ep) => {
            const isCurrent = ep.slug === activeEpisode.slug;
            
            return (
              <Link
                key={ep.slug}
                href={`/xem-phim/${movie.slug}/${ep.slug}`}
                className={`py-3 px-3 text-center text-xs font-extrabold rounded-xl border transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0 active:duration-75 ${
                  isCurrent
                    ? 'bg-white/10 border-brand-violet/60 text-brand-cyan hover:border-brand-violet hover:bg-white/15'
                    : 'bg-white/5 border-white/5 hover:border-brand-rose hover:bg-gradient-to-r hover:from-brand-violet hover:to-brand-rose text-slate-200'
                }`}
                title={ep.filename}
              >
                {ep.name}
              </Link>
            );
          })}
        </div>

        {/* Error reporting guide info */}
        <div className="p-4 bg-white/2 border border-white/5 rounded-2xl flex items-start gap-3 mt-4">
          <AlertTriangle className="w-5 h-5 text-brand-rose flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-xs text-slate-300">Gặp sự cố khi tải phim?</h5>
            <p className="text-xs text-slate-500 leading-normal font-medium">
              Nếu phim không tải được, bạn vui lòng chuyển đổi nguồn phát bằng cách bấm nút **"Dự phòng"** hoặc đổi sang các server khác ở bảng trên để khắc phục sự cố.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
