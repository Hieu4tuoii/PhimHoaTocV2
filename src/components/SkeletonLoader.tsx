import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="w-full flex flex-col space-y-3 animate-pulse">
      <div className="relative aspect-[2/3] w-full bg-slate-800 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="h-4 bg-slate-800 rounded-md w-3/4" />
      <div className="h-3 bg-slate-800 rounded-md w-1/2" />
    </div>
  );
};

export const SkeletonSlider: React.FC<{ cardsCount?: number }> = ({ cardsCount = 6 }) => {
  return (
    <div className="w-full space-y-4">
      <div className="h-8 bg-slate-800 rounded-md w-48 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array.from({ length: cardsCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
};

export const SkeletonDetail: React.FC = () => {
  return (
    <div className="w-full min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 lg:w-80 flex-shrink-0 aspect-[2/3] bg-slate-800 rounded-2xl" />
        <div className="flex-1 space-y-6">
          <div className="h-10 bg-slate-800 rounded-md w-2/3" />
          <div className="h-6 bg-slate-800 rounded-md w-1/3" />
          <div className="flex gap-2">
            <div className="h-8 bg-slate-800 rounded-full w-20" />
            <div className="h-8 bg-slate-800 rounded-full w-20" />
            <div className="h-8 bg-slate-800 rounded-full w-20" />
          </div>
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="h-4 bg-slate-800 rounded-md w-full" />
            <div className="h-4 bg-slate-800 rounded-md w-full" />
            <div className="h-4 bg-slate-800 rounded-md w-5/6" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="h-12 bg-slate-800 rounded-lg" />
            <div className="h-12 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};
