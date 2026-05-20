'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MovieShort } from '@/types';

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

interface AppContextProps {
  watchlist: MovieShort[];
  history: WatchHistoryItem[];
  isCinemaMode: boolean;
  addToWatchlist: (movie: MovieShort) => void;
  removeFromWatchlist: (slug: string) => void;
  isInWatchlist: (slug: string) => boolean;
  saveWatchProgress: (
    slug: string,
    movieName: string,
    movieThumb: string,
    episodeSlug: string,
    episodeName: string,
    currentTime: number,
    duration: number
  ) => void;
  getWatchProgress: (slug: string, episodeSlug: string) => number;
  getMovieLastWatchedEpisode: (slug: string) => WatchHistoryItem | undefined;
  toggleCinemaMode: () => void;
  setCinemaMode: (val: boolean) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<MovieShort[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load data from LocalStorage on mount
  useEffect(() => {
    try {
      const storedWatchlist = localStorage.getItem('phimhoatoc_watchlist');
      if (storedWatchlist) {
        setWatchlist(JSON.parse(storedWatchlist));
      }

      const storedHistory = localStorage.getItem('phimhoatoc_history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error('Error loading LocalStorage data:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save watchlist to LocalStorage when changed
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('phimhoatoc_watchlist', JSON.stringify(watchlist));
    } catch (e) {
      console.error('Error writing watchlist to LocalStorage:', e);
    }
  }, [watchlist, isLoaded]);

  // Save history to LocalStorage when changed
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('phimhoatoc_history', JSON.stringify(history));
    } catch (e) {
      console.error('Error writing history to LocalStorage:', e);
    }
  }, [history, isLoaded]);

  // Watchlist methods
  const addToWatchlist = (movie: MovieShort) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.slug === movie.slug)) return prev;
      return [movie, ...prev];
    });
  };

  const removeFromWatchlist = (slug: string) => {
    setWatchlist((prev) => prev.filter((m) => m.slug !== slug));
  };

  const isInWatchlist = (slug: string) => {
    return watchlist.some((m) => m.slug === slug);
  };

  // Watch history methods
  const saveWatchProgress = (
    slug: string,
    movieName: string,
    movieThumb: string,
    episodeSlug: string,
    episodeName: string,
    currentTime: number,
    duration: number
  ) => {
    if (duration <= 0) return;
    
    setHistory((prev) => {
      const filtered = prev.filter((item) => !(item.slug === slug && item.episodeSlug === episodeSlug));
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
      
      // Keep only unique movies in main history view by filtering out older progress of the same movie
      // But we still want to keep the most recent progress
      const movieFiltered = filtered.filter(item => item.slug !== slug);
      return [newItem, ...movieFiltered].slice(0, 50); // limit to 50 items
    });
  };

  const getWatchProgress = (slug: string, episodeSlug: string) => {
    const record = history.find((item) => item.slug === slug && item.episodeSlug === episodeSlug);
    return record ? record.currentTime : 0;
  };

  const getMovieLastWatchedEpisode = (slug: string) => {
    return history.find((item) => item.slug === slug);
  };

  // Cinema Mode methods
  const toggleCinemaMode = () => {
    setIsCinemaMode((prev) => !prev);
  };

  const setCinemaMode = (val: boolean) => {
    setIsCinemaMode(val);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <AppContext.Provider
      value={{
        watchlist,
        history,
        isCinemaMode,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        saveWatchProgress,
        getWatchProgress,
        getMovieLastWatchedEpisode,
        toggleCinemaMode,
        setCinemaMode,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
