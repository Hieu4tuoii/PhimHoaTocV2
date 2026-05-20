'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Heart, Mail, ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-dark border-t border-slate-800/80 pt-16 pb-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1.5">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-neon">
                <Play className="w-4.5 h-4.5 text-white fill-white ml-0.5" />
              </div>
              <span className="text-lg font-black tracking-wider text-gradient">
                PHIMHOATOC
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Trang web xem phim trực tuyến miễn phí với giao diện hiện đại, tốc độ tải nhanh, chất lượng HD cập nhật liên tục 24/7 từ nguồn API công cộng chất lượng hàng đầu Việt Nam.
            </p>
          </div>

          {/* Quick Categories */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Loại Phim
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/danh-sach/phim-bo" className="hover:text-brand-rose transition-colors">
                  Phim Bộ Mới Nhất
                </Link>
              </li>
              <li>
                <Link href="/danh-sach/phim-le" className="hover:text-brand-rose transition-colors">
                  Phim Lẻ Chiếu Rạp
                </Link>
              </li>
              <li>
                <Link href="/danh-sach/hoat-hinh" className="hover:text-brand-rose transition-colors">
                  Hoạt Hình Đặc Sắc
                </Link>
              </li>
              <li>
                <Link href="/danh-sach/tv-shows" className="hover:text-brand-rose transition-colors">
                  TV Shows Hot
                </Link>
              </li>
            </ul>
          </div>

          {/* User Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Khám Phá
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/watchlist" className="hover:text-brand-rose transition-colors">
                  Phim Đã Lưu (Yêu Thích)
                </Link>
              </li>
              <li>
                <Link href="/lich-su" className="hover:text-brand-rose transition-colors">
                  Lịch Sử Xem Phim
                </Link>
              </li>
              <li>
                <Link href="/danh-sach/phim-le?sort_field=year" className="hover:text-brand-rose transition-colors">
                  Phim Mới Xuất Bản
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Disclaimer */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-brand-cyan" />
              Bản Quyền
            </h4>
            <p className="text-xs text-slate-500 leading-normal">
              Mọi dữ liệu trên website đều được tổng hợp tự động từ các nguồn API công cộng trên internet. Chúng tôi không lưu trữ bất kỳ tài liệu video nào trên server của mình.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
              <Mail className="w-3.5 h-3.5 text-brand-rose" />
              <span>support@phimhoatoc.vip</span>
            </div>
          </div>

        </div>

        {/* Bottom copyright info */}
        <div className="border-t border-slate-800/50 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between text-xs gap-4">
          <p>© {new Date().getFullYear()} PhimHoaToc. Tất cả các quyền được bảo lưu.</p>
          <p className="flex items-center gap-1 text-slate-500">
            Made with <Heart className="w-3 h-3 text-brand-rose fill-brand-rose" /> for Movie Lovers
          </p>
        </div>
      </div>
    </footer>
  );
};
