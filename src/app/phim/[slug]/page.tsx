import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, Clock, Globe, ShieldAlert, Film, User, Tag, Calendar } from 'lucide-react';
import { getMovieDetail, getMoviesByType, getImageUrl } from '@/services/api';
import { MovieDetailClient } from '@/components/MovieDetailClient';
import { MovieSlider } from '@/components/MovieSlider';
import { MoviePoster } from '@/components/MoviePoster';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch movie details on server side
  const res = await getMovieDetail(slug);

  if (!res || !res.status || !res.movie) {
    notFound();
  }

  const { movie, episodes } = res;

  // Fetch related movies based on the first genre of this movie
  let relatedMovies: any[] = [];
  if (movie.category && movie.category.length > 0) {
    const firstGenreSlug = movie.category[0].slug;
    
    // Map movie.type sang API type hợp lệ của KKPhim
    let apiType = 'phim-le';
    if (movie.type === 'series') apiType = 'phim-bo';
    else if (movie.type === 'hoathinh') apiType = 'hoat-hinh';
    else if (movie.type === 'tvshows') apiType = 'tv-shows';
    else if (movie.type === 'single') apiType = 'phim-le';

    try {
      const relatedData = await getMoviesByType(apiType, 1, 12, {
        category: firstGenreSlug,
      });
      if (relatedData.status) {
        // Filter out current movie
        relatedMovies = relatedData.items.filter((m) => m.slug !== movie.slug);
      }
    } catch (e) {
      console.error('Error fetching related movies:', e);
    }
  }

  return (
    <div className="w-full min-h-screen relative pb-16 bg-navy-dark">
      
      {/* 1. Cinematic Backdrop Background Banner */}
      <div className="absolute top-0 inset-x-0 h-[65vh] z-0 overflow-hidden">
        <MoviePoster
          src={getImageUrl(movie.thumb_url || movie.poster_url)}
          alt={movie.name}
          className="w-full h-full object-cover filter blur-[80px] brightness-[0.22] scale-110"
        />
        {/* Lớp phủ gradient chuyển tiếp mượt mà sang tông đen tối rạp chiếu phim */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-dark/40 to-navy-dark" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-transparent to-navy-dark opacity-80" />
      </div>

      {/* 2. Main Details Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 space-y-12 animate-slide-up">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          
          {/* Left Column: Poster & Actions */}
          <div className="w-full md:w-64 lg:w-80 flex-shrink-0 space-y-6 flex flex-col items-center md:items-stretch">
            {/* Poster Card Premium với bóng đổ phát sáng đỏ kép */}
            <div className="w-48 sm:w-64 md:w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-slate-950 shadow-neon transform hover:scale-[1.03] hover:rotate-1 hover:border-brand-violet/40 transition-all duration-500 ease-out group">
              <MoviePoster
                src={getImageUrl(movie.poster_url || movie.thumb_url)}
                alt={movie.name}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
            
            {/* Direct Information Badges under poster - Ẩn trên Mobile, chỉ hiện trên PC */}
            <div className="hidden md:grid w-full grid-cols-2 gap-3 text-center text-xs">
              <div className="p-3 bg-white/5 border border-white/8 rounded-xl backdrop-blur-md shadow-inner transition-colors hover:bg-white/8">
                <span className="block text-slate-400 font-bold uppercase tracking-wider mb-1 text-[10px]">Chất lượng</span>
                <span className="text-brand-cyan font-extrabold uppercase text-sm tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{movie.quality || 'HD'}</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/8 rounded-xl backdrop-blur-md shadow-inner transition-colors hover:bg-white/8">
                <span className="block text-slate-400 font-bold uppercase tracking-wider mb-1 text-[10px]">Ngôn ngữ</span>
                <span className="text-brand-rose font-extrabold uppercase text-sm tracking-wide drop-shadow-[0_0_8px_rgba(229,9,20,0.3)]">{movie.lang || 'Vietsub'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Text Metadata Info & Episodes/Comments Selector */}
          <div className="flex-1 space-y-8">
            {/* Titles */}
            <div className="space-y-3 text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md">
                {movie.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1 text-sm text-slate-400">
                <span className="font-semibold italic drop-shadow-sm">
                  {movie.origin_name}
                </span>
                <span className="hidden sm:inline-block text-slate-600">•</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-black bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-md uppercase tracking-wider">
                    {movie.quality || 'HD'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-black bg-brand-rose/10 border border-brand-rose/20 text-brand-rose rounded-md uppercase tracking-wider">
                    {movie.lang || 'Vietsub'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-white/5 border border-white/10 text-slate-350 rounded-md">
                    {movie.year}
                  </span>
                </div>
              </div>

              {/* Nút Xem ngay & Yêu thích trên màn Mobile (hiển thị ngay dưới tên phim) */}
              <div className="md:hidden w-full pt-4">
                <MovieDetailClient movie={movie} episodes={episodes} mode="buttons-only" />
              </div>
            </div>

            {/* Quick Metadata Info grid for details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm bg-white/3 border border-white/5 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
              {/* Điểm Đánh Giá */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-md group-hover:scale-105 transition-transform duration-300">
                  <Star className="w-5.5 h-5.5 fill-amber-400 animate-pulse" />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide">Điểm Đánh Giá</span>
                  <span className="font-extrabold text-white text-base">8.5 <span className="text-xs text-slate-400 font-normal">/ 10</span></span>
                </div>
              </div>

              {movie.duration && (
                <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center text-brand-rose shadow-md group-hover:scale-105 transition-transform duration-300">
                    <Clock className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide">Thời Lượng</span>
                    <span className="font-extrabold text-white text-base">{movie.duration}</span>
                  </div>
                </div>
              )}

              {movie.country && movie.country.length > 0 && (
                <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-md group-hover:scale-105 transition-transform duration-300">
                    <Globe className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-1">Quốc Gia</span>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.country.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/quoc-gia/${c.slug}`}
                          className="px-2 py-0.5 text-xs font-bold bg-white/5 hover:bg-brand-cyan/10 border border-white/10 hover:border-brand-cyan/30 text-slate-300 hover:text-white rounded-lg transition-all duration-300 shadow-sm"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {movie.episode_current && (
                <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-md group-hover:scale-105 transition-transform duration-300">
                    <Film className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide">Trạng Thái</span>
                    <span className="font-extrabold text-white text-base">{movie.episode_current} / {movie.episode_total || '??'}</span>
                  </div>
                </div>
              )}

              {movie.director && movie.director.length > 0 && movie.director[0] && (
                <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-md group-hover:scale-105 transition-transform duration-300">
                    <User className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide">Đạo Diễn</span>
                    <span className="font-extrabold text-white text-base truncate max-w-[150px] inline-block">{movie.director.join(', ')}</span>
                  </div>
                </div>
              )}

              {movie.category && movie.category.length > 0 && (
                <div className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-md group-hover:scale-105 transition-transform duration-300">
                    <Tag className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-1">Thể Loại</span>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.category.map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/the-loai/${cat.slug}`}
                          className="px-2 py-0.5 text-xs font-bold bg-white/5 hover:bg-brand-rose/10 border border-white/10 hover:border-brand-rose/30 text-slate-300 hover:text-white rounded-lg transition-all duration-300 shadow-sm"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dàn diễn viên nếu có */}
            {movie.actor && movie.actor.length > 0 && movie.actor[0] && (
              <div className="space-y-3 bg-white/2 border border-white/5 p-6 rounded-2xl backdrop-blur-sm shadow-xl">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-rose" />
                  DIỄN VIÊN
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {movie.actor.slice(0, 10).map((actorName) => (
                    <span
                      key={actorName}
                      className="px-3.5 py-1.5 text-xs font-bold bg-white/5 hover:bg-brand-rose/10 border border-white/10 hover:border-brand-rose/30 text-slate-300 hover:text-white rounded-xl transition-all duration-300 shadow-sm cursor-default"
                    >
                      {actorName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nút Xem ngay & Yêu thích trên màn Desktop (vị trí cũ) */}
            <div className="hidden md:block w-full">
              <MovieDetailClient movie={movie} episodes={episodes} mode="buttons-only" />
            </div>

            {/* Nội dung tóm tắt & danh sách tập phim (hiện trên cả mobile và desktop) */}
            <MovieDetailClient movie={movie} episodes={episodes} mode="content-only" />

          </div>
        </div>

        {/* 3. Related Movies Carousels Slider */}
        {relatedMovies.length > 0 && (
          <div className="pt-8 border-t border-slate-900">
            <MovieSlider
              title="Có Thể Bạn Thích"
              movies={relatedMovies}
            />
          </div>
        )}

      </div>
    </div>
  );
}
