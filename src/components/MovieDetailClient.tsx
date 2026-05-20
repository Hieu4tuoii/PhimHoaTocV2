'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Play, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MovieDetail, MovieServer, MovieShort } from '@/types';

interface MovieDetailClientProps {
  movie: MovieDetail;
  episodes: MovieServer[];
  mode?: 'all' | 'buttons-only' | 'content-only';
}

export const MovieDetailClient: React.FC<MovieDetailClientProps> = ({ movie, episodes, mode = 'all' }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, getMovieLastWatchedEpisode, history } = useApp();
  const [isFavorite, setIsFavorite] = useState(false);
  const [lastWatched, setLastWatched] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  
  // Synopsis expand state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Selected Server State
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  // Synced watchlist & history state on client mount
  useEffect(() => {
    setMounted(true);
    setIsFavorite(isInWatchlist(movie.slug));
    
    // Check if there is last watched episode progress
    const watchedInfo = getMovieLastWatchedEpisode(movie.slug);
    if (watchedInfo) {
      setLastWatched(watchedInfo);
    }
  }, [watchlist, history, movie.slug]);

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
      lang: movie.lang
    };

    if (isFavorite) {
      removeFromWatchlist(movie.slug);
      setIsFavorite(false);
    } else {
      addToWatchlist(movieShort);
      setIsFavorite(true);
    }
  };

  // Determine watch link: if history exists, watch that episode. Otherwise, watch first episode.
  const watchLink = (mounted && lastWatched)
    ? `/xem-phim/${movie.slug}/${lastWatched.episodeSlug}`
    : episodes.length > 0 && episodes[0].server_data.length > 0
      ? `/xem-phim/${movie.slug}/${episodes[0].server_data[0].slug}`
      : '#';

  const progressPercentage = (mounted && lastWatched && lastWatched.duration > 0)
    ? Math.min(Math.round((lastWatched.currentTime / lastWatched.duration) * 100), 100)
    : 0;

  const isFavActive = mounted ? isFavorite : false;
  const watchedInfoActive = mounted ? lastWatched : null;

  const renderButtons = () => {
    return (
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        {watchLink !== '#' ? (
          <Link
            href={watchLink}
            className="flex-1 flex flex-col items-center justify-center gap-1 px-8 py-4 bg-gradient-to-r from-brand-violet to-brand-rose text-white rounded-2xl shadow-lg shadow-brand-rose/25 hover:shadow-brand-rose/45 transform hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98] active:translate-y-0 active:shadow-brand-rose/15 active:duration-75 transition-all duration-300 cursor-pointer group relative overflow-hidden"
          >
            {/* Lớp phủ sáng lấp lánh khi hover */}
            <div className="absolute inset-0 w-full h-full bg-white/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
            
            <div className="flex items-center gap-2 relative z-10">
              <Play className="w-5.5 h-5.5 fill-white group-hover:scale-110 transition-transform" />
              {watchedInfoActive ? (
                <span className="font-black text-base uppercase tracking-wider">Xem Tiếp Tập {watchedInfoActive.episodeName}</span>
              ) : (
                <span className="font-black text-base uppercase tracking-wider">Xem Phim Ngay</span>
              )}
            </div>
            
            {watchedInfoActive && (
              <div className="w-full max-w-xs space-y-1 relative z-10">
                <span className="block text-[10px] font-bold text-white/80 uppercase tracking-widest text-center">Đã xem {progressPercentage}%</span>
                {/* Thanh tiến trình mini sang xịn */}
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-cyan rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
                </div>
              </div>
            )}
          </Link>
        ) : (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-2 px-8 py-4.5 bg-white/5 border border-white/5 text-slate-500 text-base font-black uppercase tracking-wider rounded-2xl cursor-not-allowed"
          >
            Phim đang cập nhật
          </button>
        )}

        <button
          onClick={handleFavoriteToggle}
          className={`px-6 py-4 flex items-center justify-center gap-2 text-base font-black uppercase tracking-wider rounded-2xl border transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0 active:duration-75 ${
            isFavActive
              ? 'bg-brand-violet/10 border-brand-violet text-brand-rose shadow-neon'
              : 'bg-white/5 border-white/8 hover:border-brand-rose hover:bg-brand-rose/10 text-slate-200 shadow-md'
          }`}
        >
          <Heart className={`w-5.5 h-5.5 transition-transform duration-300 ${isFavActive ? 'fill-brand-rose stroke-brand-rose scale-110' : 'group-hover:scale-110'}`} />
          <span>{isFavActive ? 'Đã yêu thích' : 'Yêu thích'}</span>
        </button>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="space-y-8">
        {/* 2. Movie Content / Synopsis */}
        <div className="space-y-3.5 bg-white/3 border border-white/5 p-6 rounded-2xl backdrop-blur-sm shadow-xl transition-all duration-300 hover:border-white/8">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-4.5 bg-gradient-to-b from-brand-violet to-brand-rose rounded-full" />
            Nội Dung Tóm Tắt
          </h3>
          <div className="text-slate-300 text-sm leading-relaxed space-y-4 font-medium">
            <div className={`transition-all duration-500 ${isExpanded ? '' : 'line-clamp-4'}`}>
              {movie.content ? (
                <div dangerouslySetInnerHTML={{ __html: movie.content }} className="prose prose-invert prose-sm max-w-none text-slate-300" />
              ) : (
                <p className="italic text-slate-400">Hiện tại chưa có mô tả nội dung chi tiết cho phim "{movie.name}". Dữ liệu đang được chúng tôi cập nhật sớm nhất.</p>
              )}
            </div>
            
            {movie.content && movie.content.length > 250 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-brand-cyan hover:text-brand-rose active:scale-95 active:duration-75 transition-colors pt-2 cursor-pointer group"
              >
                {isExpanded ? (
                  <>Thu gọn <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /></>
                ) : (
                  <>Xem thêm <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 3. Episode Selector Section */}
        {episodes.length > 0 ? (
          <div className="space-y-5 bg-white/3 border border-white/5 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4.5 bg-gradient-to-b from-brand-violet to-brand-rose rounded-full" />
                Chọn Tập Phim
              </h3>
              
              {/* Server Tabs */}
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

            {/* Episodes List Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/10">
              {episodes[selectedServerIndex]?.server_data.map((ep) => {
                // Check if episode is in history to display badge or active color
                const isWatched = mounted && history.some(h => h.slug === movie.slug && h.episodeSlug === ep.slug);
                
                return (
                  <Link
                    key={ep.slug}
                    href={`/xem-phim/${movie.slug}/${ep.slug}`}
                    className={`py-3 px-3 text-center text-xs font-extrabold rounded-xl border transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0 active:duration-75 ${
                      isWatched
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
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400 bg-white/3 border border-white/5 rounded-2xl backdrop-blur-sm">
            Danh sách tập phim đang được cập nhật thêm. Vui lòng quay lại sau!
          </div>
        )}
      </div>
    );
  };

  if (mode === 'buttons-only') {
    return renderButtons();
  }

  if (mode === 'content-only') {
    return renderContent();
  }

  return (
    <div className="space-y-8">
      {renderButtons()}
      {renderContent()}
    </div>
  );
};
