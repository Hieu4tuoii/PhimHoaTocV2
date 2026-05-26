import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovieShort } from '../types';

export interface WatchHistoryItem {
  slug: string;
  name: string;
  thumb_url: string;
  episodeSlug: string;
  episodeName: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

interface AppState {
  watchlist: MovieShort[];
  history: WatchHistoryItem[];
  
  // Watchlist actions
  addToWatchlist: (movie: MovieShort) => void;
  removeFromWatchlist: (slug: string) => void;
  
  // History actions
  saveWatchProgressDirect: (item: WatchHistoryItem) => void;
  clearHistory: () => void;
}

// Global in-memory cache to shadow watch history progress updates
// This prevents excessive AsyncStorage writes and component re-renders (every second)
export const historyMemoryCache: Record<string, WatchHistoryItem> = {};
let isDirty = false;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      history: [],
      
      addToWatchlist: (movie) => set((state) => {
        if (state.watchlist.some((m) => m.slug === movie.slug)) return {};
        return { watchlist: [movie, ...state.watchlist] };
      }),
      
      removeFromWatchlist: (slug) => set((state) => ({
        watchlist: state.watchlist.filter((m) => m.slug !== slug),
      })),
      
      saveWatchProgressDirect: (newItem) => set((state) => {
        // Remove existing items with same slug & episode
        const filtered = state.history.filter(
          (item) => !(item.slug === newItem.slug && item.episodeSlug === newItem.episodeSlug)
        );
        // Also remove duplicate slugs in list views to only show unique movies in history main screen
        const movieFiltered = filtered.filter((item) => item.slug !== newItem.slug);
        
        return {
          history: [newItem, ...movieFiltered].slice(0, 50),
        };
      }),
      
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'phimhoatoc-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        watchlist: state.watchlist,
        history: state.history,
      }),
    }
  )
);

// High-performance wrappers matching web app behaviors
export const getWatchProgress = (slug: string, episodeSlug: string): number => {
  // Check memory cache first
  const cacheKey = `${slug}:${episodeSlug}`;
  if (historyMemoryCache[cacheKey]) {
    return historyMemoryCache[cacheKey].currentTime;
  }
  
  // Fallback to persisted store
  const history = useAppStore.getState().history;
  const record = history.find((item) => item.slug === slug && item.episodeSlug === episodeSlug);
  return record ? record.currentTime : 0;
};

export const getMovieLastWatchedEpisode = (slug: string): WatchHistoryItem | undefined => {
  // Check memory cache first
  const cached = Object.values(historyMemoryCache)
    .filter((item) => item.slug === slug)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  
  if (cached) return cached;
  
  // Fallback to persisted store
  const history = useAppStore.getState().history;
  return history.find((item) => item.slug === slug);
};

export const isInWatchlist = (slug: string): boolean => {
  return useAppStore.getState().watchlist.some((m) => m.slug === slug);
};

// Periodic flush timer reference
let flushTimer: NodeJS.Timeout | null = null;

export const saveWatchProgress = (
  slug: string,
  movieName: string,
  movieThumb: string,
  episodeSlug: string,
  episodeName: string,
  currentTime: number,
  duration: number
) => {
  if (duration <= 0) return;
  
  const cacheKey = `${slug}:${episodeSlug}`;
  const newItem: WatchHistoryItem = {
    slug,
    name: movieName,
    thumb_url: movieThumb,
    episodeSlug,
    episodeName,
    currentTime: Math.floor(currentTime),
    duration: Math.floor(duration),
    updatedAt: Date.now(),
  };
  
  // Write to high-speed memory cache immediately
  historyMemoryCache[cacheKey] = newItem;
  isDirty = true;
  
  // Setup standard debounced/throttled flushing to persisted Zustand store
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushWatchProgress();
    }, 15000); // Flush to disk every 15 seconds
  }
};

// Manually flush memory cache to Zustand store (disk via AsyncStorage)
// Call this when video player unmounts, app state transitions to background, or on page exit.
export const flushWatchProgress = () => {
  if (!isDirty) return;
  
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  
  // Get all cached records, sort by time and flush to Zustand
  const items = Object.values(historyMemoryCache);
  if (items.length > 0) {
    // Flush each to Zustand store
    items.forEach((item) => {
      useAppStore.getState().saveWatchProgressDirect(item);
    });
    isDirty = false;
  }
};
