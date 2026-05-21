'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { MovieShort } from '@/types';
import { getImageUrl } from '@/services/api';

interface MovieCardProps {
  movie: MovieShort;
}

const MovieCardInner: React.FC<MovieCardProps> = ({ movie }) => {
  const [imgSrc, setImgSrc] = useState<string>(() => getImageUrl(movie.poster_url || movie.thumb_url));

  // Performance: useCallback to stabilize image error handler reference
  const handleImageError = useCallback(() => {
    // If poster_url fails, try thumb_url. If both fail, use default placeholder.
    const thumbUrl = getImageUrl(movie.thumb_url);
    setImgSrc((prev) => {
      if (prev !== thumbUrl && movie.thumb_url) {
        return thumbUrl;
      }
      return '/placeholder-movie.jpg';
    });
  }, [movie.thumb_url]);

  const formatLang = (lang: string) => {
    if (!lang) return '';
    let formatted = lang;
    // Rút gọn tiếng Việt cho màn di động
    formatted = formatted.replace(/Thuyết minh/gi, 'TM');
    formatted = formatted.replace(/Lồng tiếng/gi, 'LT');
    formatted = formatted.replace(/Vietsub/gi, 'Sub');
    return formatted;
  };

  // Safe formatting for episode/quality badge
  const badgeText = movie.episode_current && movie.episode_current.toLowerCase() !== 'full'
    ? movie.episode_current
    : movie.quality || 'HD';

  const subText = formatLang(movie.lang || 'Vietsub');

  return (
    <Link
      href={`/phim/${movie.slug}`}
      className="group block relative flex flex-col w-full focus:outline-none focus:ring-2 focus:ring-brand-violet rounded-2xl overflow-hidden active:scale-[0.98] active:brightness-90 active:duration-75 transition-all duration-300"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full rounded-2xl bg-slate-900 overflow-hidden shadow-lg border border-slate-800/30 transition-all duration-500 group-hover:scale-105 group-hover:border-brand-violet/50 shadow-neon-hover">
        <img
          src={imgSrc}
          alt={movie.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-102 group-hover:brightness-90"
          loading="lazy"
          onError={handleImageError}
        />

        {/* Top Left Badge (Episode / Quality) */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <span className="px-2 py-0.75 text-[10px] sm:text-xs font-bold uppercase tracking-wide bg-gradient-brand text-white rounded-md shadow-md shadow-black/30">
            {badgeText}
          </span>
        </div>

        {/* Top Right Badge (Year) */}
        {movie.year && (
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <span className="px-2 py-0.75 text-[10px] sm:text-xs font-medium bg-slate-900/80 text-slate-300 rounded-md backdrop-blur-sm border border-slate-700/30">
              {movie.year}
            </span>
          </div>
        )}

        {/* Bottom Left Badge (Language) - Gọn gàng không lo đè lề */}
        {subText && (
          <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
            <span className="px-2 py-0.75 text-[9px] sm:text-xs font-bold uppercase tracking-wide bg-navy-dark/85 text-brand-cyan border border-brand-cyan/20 rounded-md backdrop-blur-sm shadow-md">
              {subText}
            </span>
          </div>
        )}

        {/* Hover Hover Overlay Gradient & Play Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-dark via-navy-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {/* Play Button Icon */}
          <div className="transform translate-y-8 group-hover:translate-y-0 transition-transform duration-300 ease-out w-14 h-14 rounded-full bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-violet/50 border border-white/20">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      </div>

      {/* Title Details */}
      <div className="mt-3 flex flex-col space-y-1">
        <h3 className="font-semibold text-sm sm:text-base text-slate-100 group-hover:text-brand-rose line-clamp-1 transition-colors duration-300">
          {movie.name}
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
          {movie.origin_name}
        </p>
      </div>
    </Link>
  );
};

export const MovieCard = React.memo(MovieCardInner);
