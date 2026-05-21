'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, X, Share, PlusSquare, Smartphone } from 'lucide-react';
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
  deferredPrompt: any;
  isInstallable: boolean;
  isStandalone: boolean;
  showInstallModal: boolean;
  setShowInstallModal: (val: boolean) => void;
  installApp: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<MovieShort[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android_desktop'>('ios');

  // Performance: Ref to track history for high-frequency reads (getWatchProgress)
  const historyRef = useRef<WatchHistoryItem[]>([]);
  historyRef.current = history;

  // Performance: Debounce timer refs for localStorage writes
  const watchlistWriteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const historyWriteTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) 
        || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
      setActiveTab(isIOS ? 'ios' : 'android_desktop');
    }
  }, []);

  useEffect(() => {
    // Phát hiện chế độ standalone
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || (navigator as any).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      console.log('PWA Status - Standalone Mode:', isStandaloneMode);
    }
  }, []);

  useEffect(() => {
    // Đăng ký Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleRegister = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
          .catch((err) => console.error('Service Worker registration failed:', err));
      };
      
      if (document.readyState === 'complete') {
        handleRegister();
      } else {
        window.addEventListener('load', handleRegister);
        return () => window.removeEventListener('load', handleRegister);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Lắng nghe sự kiện beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA: beforeinstallprompt triggered. App is installable.');
    };

    // Lắng nghe sự kiện appinstalled
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallModal(false);
      console.log('PWA: App successfully installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: User response to installation prompt: ${outcome}`);
      } catch (err) {
        console.error('PWA: Error during prompt installation:', err);
        setShowInstallModal(true);
      } finally {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else {
      // Không có deferredPrompt — thử chờ Service Worker ready rồi lắng nghe event trong 3s
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.ready;
          // Chờ tối đa 3s xem beforeinstallprompt có fire không
          const promptEvent = await new Promise<Event | null>((resolve) => {
            const timer = setTimeout(() => resolve(null), 3000);
            const handler = (e: Event) => {
              e.preventDefault();
              clearTimeout(timer);
              window.removeEventListener('beforeinstallprompt', handler);
              resolve(e);
            };
            window.addEventListener('beforeinstallprompt', handler);
          });

          if (promptEvent) {
            // Prompt đã fire — trigger cài đặt ngay
            (promptEvent as any).prompt();
            const { outcome } = await (promptEvent as any).userChoice;
            console.log(`PWA: User response (retry): ${outcome}`);
            setDeferredPrompt(null);
            setIsInstallable(false);
            return;
          }
        } catch (err) {
          console.warn('PWA: SW ready check failed:', err);
        }
      }
      // Fallback: Hiện modal hướng dẫn cài đặt thủ công
      setShowInstallModal(true);
    }
  }, [deferredPrompt]);

  // Load data from LocalStorage on mount
  useEffect(() => {
    try {
      const storedWatchlist = localStorage.getItem('phimhoatoc_watchlist');
      if (storedWatchlist) {
        setWatchlist(JSON.parse(storedWatchlist));
      }

      const storedHistory = localStorage.getItem('phimhoatoc_history');
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        setHistory(parsed);
        historyRef.current = parsed;
      }
    } catch (e) {
      console.error('Error loading LocalStorage data:', e);
    }
    setIsLoaded(true);
  }, []);

  // Performance: Debounced localStorage write for watchlist (500ms delay)
  useEffect(() => {
    if (!isLoaded) return;
    if (watchlistWriteTimerRef.current) clearTimeout(watchlistWriteTimerRef.current);
    watchlistWriteTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('phimhoatoc_watchlist', JSON.stringify(watchlist));
      } catch (e) {
        console.error('Error writing watchlist to LocalStorage:', e);
      }
    }, 500);
  }, [watchlist, isLoaded]);

  // Performance: Debounced localStorage write for history (2s delay — high-frequency updates)
  useEffect(() => {
    if (!isLoaded) return;
    if (historyWriteTimerRef.current) clearTimeout(historyWriteTimerRef.current);
    historyWriteTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('phimhoatoc_history', JSON.stringify(history));
      } catch (e) {
        console.error('Error writing history to LocalStorage:', e);
      }
    }, 2000);
  }, [history, isLoaded]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (watchlistWriteTimerRef.current) clearTimeout(watchlistWriteTimerRef.current);
      if (historyWriteTimerRef.current) clearTimeout(historyWriteTimerRef.current);
    };
  }, []);

  // Watchlist methods — wrapped with useCallback
  const addToWatchlist = useCallback((movie: MovieShort) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.slug === movie.slug)) return prev;
      return [movie, ...prev];
    });
  }, []);

  const removeFromWatchlist = useCallback((slug: string) => {
    setWatchlist((prev) => prev.filter((m) => m.slug !== slug));
  }, []);

  const isInWatchlist = useCallback((slug: string) => {
    return watchlist.some((m) => m.slug === slug);
  }, [watchlist]);

  // Watch history methods — wrapped with useCallback
  const saveWatchProgress = useCallback((
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
  }, []);

  // Performance: Read from ref instead of state for high-frequency access
  const getWatchProgress = useCallback((slug: string, episodeSlug: string) => {
    const record = historyRef.current.find((item) => item.slug === slug && item.episodeSlug === episodeSlug);
    return record ? record.currentTime : 0;
  }, []);

  const getMovieLastWatchedEpisode = useCallback((slug: string) => {
    return history.find((item) => item.slug === slug);
  }, [history]);

  // Cinema Mode methods
  const toggleCinemaMode = useCallback(() => {
    setIsCinemaMode((prev) => !prev);
  }, []);

  const setCinemaMode = useCallback((val: boolean) => {
    setIsCinemaMode(val);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Performance: Memoize the context value to prevent unnecessary re-renders of all consumers
  const contextValue = useMemo<AppContextProps>(() => ({
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
    deferredPrompt,
    isInstallable,
    isStandalone,
    showInstallModal,
    setShowInstallModal,
    installApp,
  }), [
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
    deferredPrompt,
    isInstallable,
    isStandalone,
    showInstallModal,
    installApp,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}

      {/* PWA Manual Install Instructions Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-2xl text-slate-200 overflow-hidden animate-slide-up">
            {/* Background glow decorator */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-brand-rose/10 filter blur-2xl pointer-events-none" />
            
            {/* Header with Close button */}
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-rose/20 border border-white/10">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">Tải ứng dụng Phim Hỏa Tốc</h3>
                  <p className="text-[10px] text-brand-cyan font-black tracking-widest uppercase">Web-App Premium</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body content */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-350 leading-relaxed relative z-10">
              <p className="text-slate-300 font-semibold">
                Cài đặt ứng dụng Phim Hỏa Tốc để có trải nghiệm xem phim siêu tốc độ, mượt mà không có thanh địa chỉ phiền toái.
              </p>

              {/* Tab Switcher */}
              <div className="flex bg-slate-950/85 p-1 rounded-xl border border-slate-800/50">
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                    activeTab === 'ios'
                      ? 'bg-gradient-brand text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  iPhone / iPad (iOS)
                </button>
                <button
                  onClick={() => setActiveTab('android_desktop')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                    activeTab === 'android_desktop'
                      ? 'bg-gradient-brand text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Android / Máy tính
                </button>
              </div>

              {/* Install instructions box */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3.5 shadow-inner">
                {activeTab === 'ios' ? (
                  <>
                    <h4 className="font-bold text-xs uppercase text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <Smartphone className="w-4 h-4 text-brand-rose" />
                      Hướng dẫn cài đặt trên iOS (Safari):
                    </h4>
                    
                    <div className="space-y-3 text-xs font-semibold">
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 font-bold border border-slate-700 text-[10px]">1</span>
                        <div>
                          Mở bằng trình duyệt <span className="text-white font-bold">Safari</span>, nhấn biểu tượng <span className="inline-flex items-center text-brand-cyan gap-0.5 font-bold"><Share className="w-3.5 h-3.5 inline mb-0.5" /> Chia sẻ (Share)</span> ở thanh công cụ trình duyệt.
                        </div>
                      </div>
                      
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 font-bold border border-slate-700 text-[10px]">2</span>
                        <div>
                          Cuộn xuống dưới và chọn <span className="inline-flex items-center text-brand-rose gap-0.5 font-bold"><PlusSquare className="w-3.5 h-3.5 inline mb-0.5" /> Thêm vào MH chính (Add to Home)</span>.
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-xs uppercase text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <Smartphone className="w-4 h-4 text-brand-cyan" />
                      Cài đặt trên Android & Máy tính:
                    </h4>

                    {deferredPrompt ? (
                      <div className="space-y-2 text-xs font-semibold">
                        <p className="text-slate-300">
                          Trình duyệt của bạn hỗ trợ tải app trực tiếp! Nhấn nút <span className="text-brand-rose font-bold">"Tải Ngay"</span> phía dưới để cài đặt lập tức.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 text-[11px] font-semibold text-slate-300">
                        <p className="text-brand-rose font-bold text-[11px] leading-relaxed border-b border-slate-800 pb-1.5 mb-1.5">
                          * Do bạn chưa chạy giao thức bảo mật HTTPS hoặc trình duyệt chưa kịp load hết Service Worker, tính năng tải trực tiếp bằng 1-click hiện bị chặn. Bạn hãy tải nhanh bằng cách:
                        </p>
                        
                        <div className="flex gap-2.5 items-start">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 font-bold border border-slate-700 text-[10px]">1</span>
                          <div>
                            <span className="text-white font-bold">Trên Máy tính (Chrome/Edge):</span> Click vào biểu tượng <span className="text-brand-cyan font-bold">Cài đặt (hình màn hình kèm mũi tên tải xuống ⤓ hoặc dấu +)</span> trực tiếp ở góc bên phải thanh địa chỉ (URL) rồi chọn Cài đặt.
                          </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 font-bold border border-slate-700 text-[10px]">2</span>
                          <div>
                            <span className="text-white font-bold">Trên Điện thoại (Android Chrome):</span> Nhấn Menu <span className="text-brand-cyan font-bold">3 chấm (⋮)</span> ở góc phải, sau đó chọn <span className="text-brand-rose font-bold">"Cài đặt ứng dụng"</span> hoặc <span className="text-brand-rose font-bold">"Thêm vào Màn hình chính"</span>.
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-6 flex gap-3 justify-end relative z-10">
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.origin);
                  }
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/50 rounded-xl hover:border-slate-600"
              >
                📋 Sao chép link
              </button>
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Để sau
              </button>
              <button
                onClick={async () => {
                  setShowInstallModal(false);
                  if (deferredPrompt) {
                    // Có prompt sẵn — trigger native install ngay
                    installApp();
                  } else if ('serviceWorker' in navigator) {
                    // Thử chờ SW ready rồi lắng nghe event 3s
                    try {
                      await navigator.serviceWorker.ready;
                      const promptEvent = await new Promise<Event | null>((resolve) => {
                        const timer = setTimeout(() => resolve(null), 3000);
                        const handler = (e: Event) => {
                          e.preventDefault();
                          clearTimeout(timer);
                          window.removeEventListener('beforeinstallprompt', handler);
                          resolve(e);
                        };
                        window.addEventListener('beforeinstallprompt', handler);
                      });
                      if (promptEvent) {
                        (promptEvent as any).prompt();
                        await (promptEvent as any).userChoice;
                        return;
                      }
                    } catch { /* ignore */ }
                    // Nếu vẫn thất bại — hiện thông báo ngắn bằng alert
                    alert('Trình duyệt chưa hỗ trợ cài đặt trực tiếp. Hãy thử mở bằng Chrome/Edge trên HTTPS và làm theo hướng dẫn ở trên.');
                  }
                }}
                className="px-5 py-2.5 bg-gradient-brand text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-brand-rose/25 cursor-pointer hover:brightness-110 transform active:scale-98 transition-all"
              >
                Tải Ngay
              </button>
            </div>
          </div>
        </div>
      )}
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
