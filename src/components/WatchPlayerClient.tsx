'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Pause, Tv, ArrowLeft, ArrowRight, AlertTriangle, Monitor, RotateCcw, RotateCw, Volume2, Maximize, PlayCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MovieDetail, MovieServer, EpisodeData } from '@/types';
import Hls from 'hls.js';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Custom Controls States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find all episodes of selected server to facilitate navigation
  const currentServerEpisodes = episodes[selectedServerIndex]?.server_data || [];
  
  // Find the episode matching the slug of currentEpisode dynamically
  const activeEpisode = currentServerEpisodes.find((ep) => ep.slug === currentEpisode.slug) || currentEpisode;
  
  const currentEpIndex = currentServerEpisodes.findIndex((ep) => ep.slug === activeEpisode.slug);
  
  const prevEp = currentEpIndex > 0 ? currentServerEpisodes[currentEpIndex - 1] : null;
  const nextEp = currentEpIndex < currentServerEpisodes.length - 1 ? currentServerEpisodes[currentEpIndex + 1] : null;

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

  // 2.1. Cleanup control & resume timers on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

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
        maxMaxBufferLength: 30, // limit memory
        enableWorker: true
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
  const checkAndShowResume = () => {
    const progress = getWatchProgress(movie.slug, activeEpisode.slug);
    if (progress > 10) { // Only resume if watched more than 10 seconds
      setSavedTime(progress);
      setShowResumeToast(true);
      // Auto-hide toast after 10 seconds
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => setShowResumeToast(false), 10000);
    }
  };

  const handleResumePlay = () => {
    if (videoRef.current && savedTime > 0) {
      videoRef.current.currentTime = savedTime;
      videoRef.current.play();
      setIsPlaying(true);
    }
    setShowResumeToast(false);
  };

  // 4. Progress Auto-Save Timer & Video events hook
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playMode !== 'hls') return;

    let saveInterval: NodeJS.Timeout;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
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
  }, [activeEpisode, playMode, nextEp]);

  // Custom Player Actions
  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    let newTime = video.currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (newTime > duration) newTime = duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => console.error("Error playing video:", err));
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
  };

  const toggleFullscreen = () => {
    const playerContainer = document.querySelector('.custom-player-container');
    if (!playerContainer) return;

    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);

    let result = '';
    if (hrs > 0) result += `${hrs}:`;
    result += `${mins < 10 ? '0' : ''}${mins}:`;
    result += `${secs < 10 ? '0' : ''}${secs}`;
    return result;
  };

  // Micro-interaction: hide cursor & control panel during play
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // hide control bar after 3 seconds of inactivity
    }
  };

  return (
    <div className="w-full space-y-8 animate-slide-up" onMouseMove={handleMouseMove}>
      
      {/* 1. CINEMA BACKDROP OVERLAY OVER WHOLE PAGE */}
      <div 
        className="cinema-backdrop cinema-backdrop-overlay" 
        onClick={() => toggleCinemaMode()}
      />

      {/* 2. CINEMA PLAYER CONTAINER */}
      <div className={`custom-player-container relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl z-40 transition-all duration-500 ${
        isCinemaMode 
          ? 'ring-4 ring-brand-violet/50 shadow-brand-violet/40 scale-102' 
          : 'shadow-black/60'
      }`}>
        
        {/* Play HLS m3u8 Mode */}
        {playMode === 'hls' && activeEpisode.link_m3u8 && (
          <div className="relative w-full h-full group/player cursor-none" style={{ cursor: showControls ? 'default' : 'none' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onClick={togglePlay}
              playsInline
            />

            {/* Custom Overlay Controls */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40 flex flex-col justify-between p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              {/* Top controls: Movie titles */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-base text-white">{movie.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold">{activeEpisode.name}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlayMode('embed')}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-brand-cyan hover:text-white glass-panel rounded-lg cursor-pointer"
                    title="Chuyển sang server Iframe dự phòng"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    Chuyển Server Iframe
                  </button>
                </div>
              </div>

              {/* Large Play Icon in the Center (appears when paused) */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center border border-white/20 text-white shadow-lg cursor-pointer transform hover:scale-105 transition-transform shadow-brand-violet/50"
                >
                  <Play className="w-8 h-8 text-white fill-white ml-1.5" />
                </button>
              )}

              {/* Bottom controls panel */}
              <div className="space-y-3 w-full">
                
                {/* Progress bar timeline */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 tabular-nums">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-rose focus:outline-none"
                  />
                  <span className="text-xs text-slate-300 tabular-nums">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Controls action buttons row */}
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center gap-5">
                    {/* Backward 10s Button */}
                    <button
                      onClick={() => handleSkip(-10)}
                      className="text-slate-300 hover:text-brand-rose cursor-pointer transition-colors"
                      title="Lùi 10 giây"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* Play/Pause Button */}
                    <button onClick={togglePlay} className="hover:text-brand-rose cursor-pointer transition-colors" title={isPlaying ? "Tạm dừng" : "Phát video"}>
                      {isPlaying ? (
                        <Pause className="w-5.5 h-5.5 fill-white" />
                      ) : (
                        <Play className="w-5.5 h-5.5 fill-white" />
                      )}
                    </button>

                    {/* Forward 10s Button */}
                    <button
                      onClick={() => handleSkip(10)}
                      className="text-slate-300 hover:text-brand-rose cursor-pointer transition-colors"
                      title="Tua 10 giây"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>

                    {/* Volume Bar slider */}
                    <div className="flex items-center gap-2 group/volume ml-2">
                      <Volume2 className="w-5 h-5 text-slate-300" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Fullscreen Button */}
                    <button onClick={toggleFullscreen} className="hover:text-brand-cyan cursor-pointer">
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
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
            
            {/* Top Switcher in Iframe mode */}
            {activeEpisode.link_m3u8 && (
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={() => setPlayMode('hls')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-gradient-brand text-white rounded-lg shadow-md cursor-pointer hover:opacity-90"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Sử dụng HLS Stream xịn
                </button>
              </div>
            )}
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

      {/* 3. UNDER PLAYER STATS & NAVIGATION ACTIONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-b border-slate-900 pb-6">
        {/* Episode description stats */}
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-white">{movie.name}</h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Đang phát: <span className="text-brand-rose font-bold">{activeEpisode.name}</span> | Server: {episodes[selectedServerIndex]?.server_name || 'Standard'}
          </p>
        </div>

        {/* Prev / Next navigation buttons */}
        <div className="flex items-center gap-3">
          {prevEp ? (
            <Link
              href={`/xem-phim/${movie.slug}/${prevEp.slug}`}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 text-xs sm:text-sm font-bold text-slate-200 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Tập trước
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900/20 text-slate-600 text-xs sm:text-sm font-bold border border-slate-850 rounded-xl cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Tập trước
            </button>
          )}

          {nextEp ? (
            <Link
              href={`/xem-phim/${movie.slug}/${nextEp.slug}`}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-brand text-xs sm:text-sm font-bold text-white rounded-xl shadow-lg hover:shadow-brand-rose/25 transform hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              Tập tiếp theo
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900/20 text-slate-600 text-xs sm:text-sm font-bold border border-slate-850 rounded-xl cursor-not-allowed"
            >
              Tập tiếp theo
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. CHOOSE SERVER & OTHERS EPISODES GRID SELECTOR */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-brand rounded-full" />
              Danh sách tập
            </h3>
            <p className="text-xs text-slate-500">Chuyển Danh sách tập hoặc đổi nguồn phát (Server) nếu bị lỗi tải.</p>
          </div>
          
          {/* Server Switch tabs */}
          {episodes.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              {episodes.map((server, idx) => (
                <button
                  key={server.server_name}
                  onClick={() => setSelectedServerIndex(idx)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedServerIndex === idx
                      ? 'bg-gradient-brand text-white shadow-md'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/30'
                  }`}
                >
                  {server.server_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick select grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-56 overflow-y-auto pr-1">
          {currentServerEpisodes.map((ep) => {
            const isCurrent = ep.slug === activeEpisode.slug;
            
            return (
              <Link
                key={ep.slug}
                href={`/xem-phim/${movie.slug}/${ep.slug}`}
                className={`py-2.5 px-3 text-center text-xs font-bold rounded-xl border transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? 'bg-gradient-brand border-transparent text-white shadow-lg shadow-brand-violet/25'
                    : 'bg-slate-900/40 border-slate-800 hover:border-brand-rose hover:bg-slate-800 text-slate-300'
                }`}
                title={ep.filename}
              >
                {ep.name}
              </Link>
            );
          })}
        </div>

        {/* Error reporting guide info */}
        <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-brand-rose flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-xs text-slate-300">Gặp sự cố khi tải phim?</h5>
            <p className="text-xs text-slate-500 leading-normal">
              Nếu phim không tải được, bạn vui lòng chuyển đổi nguồn phát bằng cách bấm nút **"Chuyển Server Iframe"** hoặc đổi sang **Server 2** ở bảng trên để khắc phục sự cố.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
