import React from 'react';

export default function WatchLoading() {
  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        
        {/* Video Player Skeleton */}
        <div className="relative aspect-video w-full bg-slate-800 rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          {/* Play button placeholder */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-slate-700/50" />
        </div>

        {/* Under player info skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-b border-slate-900 pb-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="h-7 bg-slate-800 rounded-md w-64" />
            <div className="h-4 bg-slate-800 rounded-md w-48" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 bg-slate-800 rounded-xl" />
            <div className="h-10 w-32 bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* Episode list skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-slate-800 rounded-md w-36" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
