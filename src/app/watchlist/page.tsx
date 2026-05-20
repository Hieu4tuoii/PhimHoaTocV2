'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Trash2, Home, Play } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MovieCard } from '@/components/MovieCard';

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full min-h-screen bg-background pb-16 pt-24 sm:pt-28 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 font-bold text-sm">Đang tải danh sách...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* Header Title */}
        <div className="border-b border-slate-900 pb-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-brand-rose fill-brand-rose" />
            Phim Yêu Thích Đã Lưu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Danh sách lưu trữ các bộ phim bạn đã đánh dấu yêu thích. Bạn có thể xem lại bất cứ lúc nào.
          </p>
        </div>

        {/* Watchlist display grid */}
        {watchlist.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {watchlist.map((movie) => (
              <div key={movie.slug} className="relative group/watchlist-card">
                <MovieCard movie={movie} />
                
                {/* Delete button positioned floating over the card */}
                <button
                  onClick={() => removeFromWatchlist(movie.slug)}
                  className="absolute top-2 right-2 z-20 flex items-center justify-center w-8 h-8 rounded-lg bg-navy-dark/95 border border-slate-800 text-slate-400 hover:text-brand-rose shadow-md active:scale-90 md:opacity-0 md:group-hover/watchlist-card:opacity-100 transition-opacity duration-300 cursor-pointer"
                  title="Xóa khỏi danh sách yêu thích"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-slate-500 space-y-6 flex flex-col items-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700">
              <Heart className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-350">Danh sách yêu thích trống</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Bạn chưa thêm bất kỳ bộ phim nào vào danh sách yêu thích của mình. Bấm nút "Yêu thích" ở trang chi tiết phim để thêm.
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-brand text-xs font-bold text-white rounded-xl shadow-md cursor-pointer hover:opacity-90"
            >
              <Home className="w-4 h-4" />
              Quay lại Trang Chủ
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
