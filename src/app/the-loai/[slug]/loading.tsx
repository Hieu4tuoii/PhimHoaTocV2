import React from 'react';

export default function GenreLoading() {
  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="border-b border-slate-900 pb-6 space-y-2">
          <div className="h-9 bg-slate-800 rounded-md w-64" />
          <div className="h-4 bg-slate-800 rounded-md w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] bg-slate-800 rounded-2xl" />
              <div className="h-4 bg-slate-800 rounded-md w-3/4" />
              <div className="h-3 bg-slate-800 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
