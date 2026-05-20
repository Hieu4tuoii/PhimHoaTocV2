'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, History } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { watchlist } = useApp();

  const navItems = [
    { name: 'Trang Chủ', href: '/', icon: Home },
    { name: 'Tìm Kiếm', href: '/tim-kiem', icon: Search },
    { name: 'Yêu Thích', href: '/watchlist', icon: Heart, badge: watchlist.length },
    { name: 'Lịch Sử', href: '/lich-su', icon: History },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-slate-950/80 border-t border-white/10 backdrop-blur-xl pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          // So sánh khớp active đường dẫn
          const isActive = item.href === '/' 
            ? pathname === '/' 
            : pathname.startsWith(item.href);
          
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-400 active:scale-95 active:duration-75 transition-all outline-none ${
                isActive ? 'text-brand-violet font-black' : 'hover:text-slate-200'
              }`}
            >
              {/* Thanh chỉ báo phát sáng nhẹ sát viền trên của tab đang active */}
              {isActive && (
                <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-gradient-brand rounded-full shadow-[0_0_10px_#E50914] animate-pulse" />
              )}
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[2px]'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-gradient-brand text-[8px] font-black flex items-center justify-center text-white border border-slate-950 shadow-md">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-extrabold mt-1 tracking-wider uppercase">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
