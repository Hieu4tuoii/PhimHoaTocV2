import React from 'react';
import Link from 'next/link';
import { Play, Info, Calendar, Clock, Star, Flame } from 'lucide-react';
import { getNewUpdates, getMoviesByType, getMovieDetail, getImageUrl } from '@/services/api';
import { MovieSlider } from '@/components/MovieSlider';

export default async function HomePage() {
  // Fetch data concurrently on server side
  const [newUpdates, seriesMovies, singleMovies, animeMovies, tvShows] = await Promise.all([
    getNewUpdates(1),
    getMoviesByType('phim-bo', 1, 12),
    getMoviesByType('phim-le', 1, 12),
    getMoviesByType('hoat-hinh', 1, 12),
    getMoviesByType('tv-shows', 1, 12),
  ]);

  const heroShort = newUpdates.items[0];
  const heroDetail = heroShort ? await getMovieDetail(heroShort.slug) : null;
  const heroMovie = heroDetail?.movie || null;
  const firstEpisodeSlug = heroDetail?.episodes?.[0]?.server_data?.[0]?.slug || 'tap-1';

  return (
    <div className="w-full min-h-screen pb-16 space-y-12">
      {/* 1. HERO BANNER SECTION */}
      {heroMovie && (
        <section className="relative w-full h-[65vh] sm:h-[80vh] flex items-end overflow-hidden">
          {/* Blur background backdrop */}
          <div className="absolute inset-0 z-0">
            <img
              src={getImageUrl(heroMovie.poster_url || heroMovie.thumb_url)}
              alt={heroMovie.name}
              className="w-full h-full object-cover scale-105 filter brightness-50 contrast-105"
            />
            {/* Dark & Gradient overlays for movie theater vibe */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-dark via-navy-dark/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-transparent to-transparent" />
          </div>

          {/* Featured Movie Information */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-16 flex flex-col items-start space-y-4 sm:space-y-6 animate-slide-up">
            {/* Banner Tags */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-gradient-brand rounded-md shadow-lg shadow-brand-violet/25">
                <Flame className="w-3.5 h-3.5 fill-white" />
                Nổi bật
              </span>
              {heroMovie.category && heroMovie.category.slice(0, 3).map((cat) => (
                <span
                  key={cat.id || cat.slug}
                  className="px-2.5 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-md backdrop-blur-sm transition-colors border border-white/5"
                >
                  {cat.name}
                </span>
              ))}
            </div>

            {/* Title */}
            <div className="space-y-1 max-w-2xl">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-md">
                {heroMovie.name}
              </h1>
              <p className="text-sm sm:text-lg text-slate-300 font-medium italic drop-shadow">
                {heroMovie.origin_name} ({heroMovie.year})
              </p>
            </div>

            {/* Quick Meta Details */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-bold text-white">8.5</span>
                <span className="text-slate-500">/10</span>
              </div>
              {heroMovie.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-brand-cyan" />
                  <span>{heroMovie.duration}</span>
                </div>
              )}
              {heroMovie.episode_current && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-brand-rose" />
                  <span>Trạng thái: {heroMovie.episode_current}</span>
                </div>
              )}
            </div>

            {/* Movie Synopsis Description */}
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl line-clamp-3 leading-relaxed drop-shadow-sm">
              {heroMovie.content ? heroMovie.content.replace(/<[^>]*>/g, '') : 'Không có mô tả nội dung cho bộ phim này.'}
            </p>

            {/* Actions Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
              <Link
                href={`/xem-phim/${heroMovie.slug}/${firstEpisodeSlug}`}
                className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto text-sm sm:text-base font-bold bg-gradient-brand text-white rounded-xl shadow-lg shadow-brand-rose/25 hover:shadow-brand-rose/45 transform hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" />
                Xem phim ngay
              </Link>
              <Link
                href={`/phim/${heroMovie.slug}`}
                className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto text-sm sm:text-base font-bold bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-white rounded-xl backdrop-blur-sm transition-all duration-300 cursor-pointer"
              >
                <Info className="w-5 h-5" />
                Thông tin chi tiết
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 2. MOVIE CAROUSELS LISTS SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* New Updates */}
        <MovieSlider
          title="Mới Cập Nhật"
          movies={newUpdates.items}
          viewAllLink="/danh-sach/phim-moi-cap-nhat"
        />

        {/* Series Movies */}
        <MovieSlider
          title="Phim Bộ Hot"
          movies={seriesMovies.items}
          viewAllLink="/danh-sach/phim-bo"
        />

        {/* Single Movies */}
        <MovieSlider
          title="Phim Lẻ Hot"
          movies={singleMovies.items}
          viewAllLink="/danh-sach/phim-le"
        />

        {/* Anime / Cartoon */}
        <MovieSlider
          title="Hoạt Hình / Anime"
          movies={animeMovies.items}
          viewAllLink="/danh-sach/hoat-hinh"
        />

        {/* TV Shows */}
        <MovieSlider
          title="TV Shows Đặc Sắc"
          movies={tvShows.items}
          viewAllLink="/danh-sach/tv-shows"
        />

      </div>
    </div>
  );
}
