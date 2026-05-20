'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { MovieShort } from '@/types';
import { MovieCard } from './MovieCard';

interface MovieSliderProps {
  title: string;
  movies: MovieShort[];
  viewAllLink?: string;
}

export const MovieSlider: React.FC<MovieSliderProps> = ({ title, movies, viewAllLink }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showLeftBtn, setShowLeftBtn] = useState(false);
  const [showRightBtn, setShowRightBtn] = useState(true);

  const checkScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setShowLeftBtn(scrollLeft > 10);
      setShowRightBtn(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider) {
      slider.addEventListener('scroll', checkScroll);
      // Run once on mount
      checkScroll();
      
      // Also check on resize
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (slider) {
        slider.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [movies]);

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const { clientWidth } = sliderRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      sliderRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="relative group/slider w-full space-y-4 py-4">
      {/* Slider Title & Actions */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-gradient-brand rounded-full inline-block" />
          {title}
        </h2>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-cyan hover:text-brand-rose transition-colors duration-300 group/link"
          >
            Xem tất cả
            <ArrowRight className="w-3.5 h-3.5 transform transition-transform duration-300 group-hover/link:translate-x-1" />
          </Link>
        )}
      </div>

      {/* Slider Container */}
      <div className="relative w-full">
        {/* Left Arrow Button */}
        {showLeftBtn && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full glass-panel hover:bg-gradient-brand text-white border border-white/10 hover:border-transparent transition-all duration-300 shadow-neon opacity-0 group-hover/slider:opacity-100 cursor-pointer"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Right Arrow Button */}
        {showRightBtn && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full glass-panel hover:bg-gradient-brand text-white border border-white/10 hover:border-transparent transition-all duration-300 shadow-neon opacity-0 group-hover/slider:opacity-100 cursor-pointer"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Movies Scroll Area */}
        <div
          ref={sliderRef}
          className="w-full flex gap-6 overflow-x-auto snap-inline scrollbar-none pb-4 px-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {movies.map((movie) => (
            <div
              key={movie._id || movie.slug}
              className="w-[140px] sm:w-[170px] md:w-[200px] flex-shrink-0 snap-start"
            >
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
