'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Loader2 } from 'lucide-react';
import { searchMovies, getImageUrl } from '@/services/api';
import { MovieShort } from '@/types';

interface SearchFormProps {
  initialKeyword?: string;
  autoFocus?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ initialKeyword = '', autoFocus = false }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(initialKeyword);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // States cho gợi ý tìm kiếm tức thì (Debounced)
  const [results, setResults] = useState<MovieShort[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Đồng bộ hóa keyword khi initialKeyword từ URL thay đổi (như khi nhấn Back/Forward trình duyệt)
  useEffect(() => {
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  // Tự động focus vào ô tìm kiếm khi mount trang
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Xử lý click ra ngoài để đóng dropdown
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
        const data = await searchMovies(keyword.trim(), 1, 5); // Lấy top 5 kết quả
        if (data.status) {
          setResults(data.items);
        }
      } catch (error) {
        console.error('Instant search error on mobile:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [keyword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.blur(); // Tự động đóng bàn phím di động trên mobile khi bấm Enter
    }
    setShowDropdown(false);
    const trimmed = keyword.trim();
    const queryParams = new URLSearchParams();

    // Giữ lại các bộ lọc hiện tại trên URL
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const country = searchParams.get('country');
    const year = searchParams.get('year');
    const sortField = searchParams.get('sort_field');

    if (type) queryParams.set('type', type);
    if (category) queryParams.set('category', category);
    if (country) queryParams.set('country', country);
    if (year) queryParams.set('year', year);
    if (sortField) queryParams.set('sort_field', sortField);

    if (trimmed) {
      queryParams.set('keyword', trimmed);
    } else {
      queryParams.delete('keyword');
    }

    router.push(`/tim-kiem?${queryParams.toString()}`);
  };

  const handleClear = () => {
    setKeyword('');
    setResults([]);
    setShowDropdown(false);
    const queryParams = new URLSearchParams();

    // Giữ lại các bộ lọc hiện tại trên URL
    const type = searchParams.get('type') || 'phim-le';
    const category = searchParams.get('category');
    const country = searchParams.get('country');
    const year = searchParams.get('year');
    const sortField = searchParams.get('sort_field');

    queryParams.set('type', type);
    if (category) queryParams.set('category', category);
    if (country) queryParams.set('country', country);
    if (year) queryParams.set('year', year);
    if (sortField) queryParams.set('sort_field', sortField);

    router.push(`/tim-kiem?${queryParams.toString()}`);
    if (inputRef.current) {
      inputRef.current.focus(); // Giữ lại focus sau khi xóa nhanh để người dùng nhập từ khóa mới
    }
  };

  return (
    <div ref={searchRef} className="w-full relative max-w-2xl mx-auto z-50">
      <form onSubmit={handleSubmit} className="w-full relative group">
        <input
          ref={inputRef}
          type="text"
          placeholder="Nhập tên phim cần tìm..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => {
            if (keyword.trim().length >= 2) setShowDropdown(true);
          }}
          className="w-full h-12 px-5 pl-12 pr-12 text-sm sm:text-base bg-white/3 hover:bg-white/5 focus:bg-slate-900/90 border border-white/5 focus:border-brand-violet rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-violet text-white transition-all duration-300 placeholder-slate-450 focus:shadow-neon"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isSearching && (
            <Loader2 className="w-4 h-4 text-brand-cyan animate-spin" />
          )}
          {keyword && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown hiển thị gợi ý tìm kiếm tức thì */}
      {showDropdown && (
        <div className="absolute top-14 left-0 right-0 glass-panel rounded-2xl overflow-hidden shadow-2xl z-50 border border-slate-800 animate-slide-up">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 text-brand-cyan animate-spin" />
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
                      src={getImageUrl(movie.poster_url || movie.thumb_url)}
                      alt={movie.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-movie.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-slate-200 truncate hover:text-brand-rose transition-colors">
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
                type="button"
                onClick={handleSubmit}
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
  );
};
