'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface SearchFormProps {
  initialKeyword?: string;
  autoFocus?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ initialKeyword = '', autoFocus = false }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(initialKeyword);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.blur(); // Tự động đóng bàn phím di động trên mobile khi bấm Enter
    }
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
    <form onSubmit={handleSubmit} className="w-full relative group max-w-2xl mx-auto">
      <input
        ref={inputRef}
        type="text"
        placeholder="Nhập tên phim cần tìm..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus={autoFocus}
        className="w-full h-12 px-5 pl-12 pr-12 text-sm sm:text-base bg-white/3 hover:bg-white/5 focus:bg-slate-900/90 border border-white/5 focus:border-brand-violet rounded-2xl focus:outline-none focus:ring-1 focus:ring-brand-violet text-white transition-all duration-300 placeholder-slate-450 focus:shadow-neon"
      />
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-cyan transition-colors" />
      {keyword && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
};

