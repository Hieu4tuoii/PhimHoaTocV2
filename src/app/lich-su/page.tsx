'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Trash2, Home, Play, Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getImageUrl } from '@/services/api';
import { MoviePoster } from '@/components/MoviePoster';

export default function HistoryPage() {
  const { history, clearHistory } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDuration = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins} phút ${secs} giây`;
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (mins < 1) return 'Vừa mới xem';
    if (mins < 60) return `${mins} phút trước`;
    if (hrs < 24) return `${hrs} giờ trước`;
    return `${days} ngày trước`;
  };

  if (!mounted) {
    return (
      <div className="w-full min-h-screen bg-background pb-16 pt-24 sm:pt-28 flex items-center justify-center">
        <div className="animate-pulse text-slate-500 font-bold text-sm">Đang tải lịch sử...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* Header Title with action to clear all */}
        <div className="border-b border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <History className="w-6 h-6 text-brand-rose" />
              Lịch Sử Xem Phim
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Theo dõi và tiếp tục xem dở dang các bộ phim bạn đã xem gần đây.
            </p>
          </div>
          
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700/60 border border-slate-700/50 hover:border-brand-rose/30 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Xóa tất cả lịch sử
            </button>
          )}
        </div>

        {/* History List render */}
        {history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item) => {
              const progressPercentage = item.duration > 0
                ? Math.min(Math.round((item.currentTime / item.duration) * 100), 100)
                : 0;

              return (
                <div
                  key={`${item.slug}-${item.episodeSlug}`}
                  className="flex items-center gap-4 p-4 glass-panel border-slate-850 hover:border-slate-800 rounded-2xl transition-all duration-300 group/history-item"
                >
                  {/* Movie Thumbnail */}
                  <div className="w-16 h-20 sm:w-20 sm:h-28 bg-slate-900 rounded-xl overflow-hidden flex-shrink-0 relative">
                    <MoviePoster
                      src={getImageUrl(item.thumb_url)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Movie Details info & watch progress */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-200 truncate group-hover/history-item:text-brand-rose transition-colors">
                        <Link href={`/phim/${item.slug}`}>
                          {item.name}
                        </Link>
                      </h3>
                      <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                        {getRelativeTime(item.updatedAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 font-bold">
                      Đang xem: <span className="text-brand-cyan">{item.episodeName}</span>
                    </p>

                    {/* Progress Bar indicator */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-600" />
                          Đã xem: {formatDuration(item.currentTime)} / {formatDuration(item.duration)}
                        </span>
                        <span className="font-bold text-slate-400">{progressPercentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-brand rounded-full transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Play action button */}
                  <Link
                    href={`/xem-phim/${item.slug}/${item.episodeSlug}`}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/80 group-hover/history-item:bg-gradient-brand text-slate-300 group-hover/history-item:text-white flex items-center justify-center border border-slate-700/50 group-hover/history-item:border-transparent transition-all duration-300 shadow-md group-hover/history-item:shadow-brand-rose/25 hover:scale-105 flex-shrink-0 cursor-pointer"
                    title={`Xem tiếp ${item.episodeName}`}
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </Link>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center text-slate-500 space-y-6 flex flex-col items-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700">
              <History className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-350">Lịch sử trống</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Bạn chưa xem bộ phim nào trên hệ thống của chúng tôi. Lịch sử xem phim sẽ xuất hiện tại đây khi bạn bấm xem video.
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
