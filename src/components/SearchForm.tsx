'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface SearchFormProps {
  initialKeyword?: string;
  autoFocus?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ initialKeyword = '', autoFocus = false }) => {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      router.push(`/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}`);
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
          onClick={() => setKeyword('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
};
