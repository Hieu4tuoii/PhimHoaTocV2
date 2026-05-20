'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Heart, History, Menu, X, Play, Film } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { searchMovies, getImageUrl } from '@/services/api';
import { MovieShort } from '@/types';

export const Header: React.FC = () => {
  const { watchlist } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Search States
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<MovieShort[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic
  useEffect(() => {
    if (keyword.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const data = await searchMovies(keyword, 1, 5); // get top 5 results
        if (data.status) {
          setResults(data.items);
        }
      } catch (error) {
        console.error('Instant search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [keyword]);

  // Submit full search page
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      setShowDropdown(false);
      router.push(`/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}`);
    }
  };

  const navLinks = [
    { name: 'Trang Chủ', href: '/' },
    { name: 'Phim Bộ', href: '/danh-sach/phim-bo' },
    { name: 'Phim Lẻ', href: '/danh-sach/phim-le' },
    { name: 'Hoạt Hình', href: '/danh-sach/hoat-hinh' },
    { name: 'TV Shows', href: '/danh-sach/tv-shows' },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass-panel py-3 shadow-lg shadow-black/20'
          : 'bg-gradient-to-b from-black/80 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center justify-center shadow-neon border border-white/10 group-hover:scale-105 transition-transform duration-300">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-wider text-gradient">
              PHIMHOATOC
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 text-sm font-semibold">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative py-1.5 transition-colors duration-300 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-brand rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Search Bar & Actions Container */}
          <div className="flex-1 max-w-md mx-4 hidden md:block relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative group">
              <input
                type="text"
                placeholder="Tìm kiếm phim..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onFocus={() => {
                  if (keyword.trim().length >= 2) setShowDropdown(true);
                }}
                className="w-full h-10 px-4 pl-10 text-sm bg-slate-900/60 border border-slate-700/50 rounded-full focus:outline-none focus:border-brand-violet text-white transition-all duration-300 placeholder-slate-400 group-hover:border-slate-600 focus:bg-slate-900 focus:shadow-neon"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
            </form>

            {/* Instant Search Dropdown */}
            {showDropdown && (
              <div className="absolute top-12 left-0 right-0 glass-panel rounded-2xl overflow-hidden shadow-2xl z-50 border border-slate-800 animate-slide-up">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    Đang tìm kiếm...
                  </div>
                ) : results.length > 0 ? (
                  <div className="flex flex-col divide-y divide-slate-800/50">
                    {results.map((movie) => (
                      <Link
                        key={movie._id}
                        href={`/phim/${movie.slug}`}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 p-3 hover:bg-slate-800/40 transition-colors duration-200"
                      >
                        <div className="w-10 h-14 bg-slate-900 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={getImageUrl(movie.thumb_url || movie.poster_url)}
                            alt={movie.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-movie.jpg';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-slate-200 truncate group-hover:text-brand-rose">
                            {movie.name}
                          </h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {movie.origin_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-brand-cyan uppercase">
                              {movie.quality || 'HD'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {movie.year}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full py-2.5 bg-slate-800/30 text-center text-xs font-bold text-brand-cyan hover:text-brand-rose hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      Xem tất cả kết quả cho "{keyword}"
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400">
                    Không tìm thấy phim nào
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions (Watchlist, History) & Mobile Menu Toggle */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Watchlist Button */}
            <Link
              href="/watchlist"
              className="relative p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer"
              title="Danh sách yêu thích"
            >
              <Heart className="w-5.5 h-5.5" />
              {mounted && watchlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-brand text-[10px] font-black flex items-center justify-center text-white border border-navy-dark shadow-md">
                  {watchlist.length}
                </span>
              )}
            </Link>

            {/* History Button */}
            <Link
              href="/lich-su"
              className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer"
              title="Lịch sử xem phim"
            >
              <History className="w-5.5 h-5.5" />
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-colors duration-200 lg:hidden cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation & Search Drawer */}
      {isOpen && (
        <div className="lg:hidden glass-panel border-t border-slate-800/50 py-4 px-4 space-y-4 shadow-xl">
          {/* Mobile Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative group">
            <input
              type="text"
              placeholder="Tìm kiếm phim..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-10 px-4 pl-10 text-sm bg-slate-900/60 border border-slate-700/50 rounded-full focus:outline-none focus:border-brand-violet text-white transition-colors"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </form>

          {/* Mobile Links */}
          <nav className="flex flex-col space-y-2 text-sm font-semibold">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gradient-brand text-white'
                      : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
