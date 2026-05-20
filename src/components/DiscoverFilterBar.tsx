'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Genre, Country } from '@/types';

interface DiscoverFilterBarProps {
  genres: Genre[];
  countries: Country[];
}

const YEARS = Array.from({ length: 17 }, (_, i) => String(2026 - i)); // 2026 to 2010

const MOVIE_TYPES = [
  { slug: 'phim-le', name: 'Phim Lẻ Chiếu Rạp' },
  { slug: 'phim-bo', name: 'Phim Bộ Đặc Sắc' },
  { slug: 'hoat-hinh', name: 'Hoạt Hình - Anime' },
  { slug: 'tv-shows', name: 'TV Shows Thực Tế' }
];

export const DiscoverFilterBar: React.FC<DiscoverFilterBarProps> = ({
  genres,
  countries,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Đọc các giá trị filter hiện tại từ URL query parameters
  const currentType = searchParams.get('type') || 'phim-le';
  const currentCategory = searchParams.get('category') || '';
  const currentCountry = searchParams.get('country') || '';
  const currentYear = searchParams.get('year') || '';
  const currentSort = searchParams.get('sort_field') || 'modified';

  // Khai báo state cục bộ của bộ lọc
  const [type, setType] = useState(currentType);
  const [category, setCategory] = useState(currentCategory);
  const [country, setCountry] = useState(currentCountry);
  const [year, setYear] = useState(currentYear);
  const [sortField, setSortField] = useState(currentSort);

  // State quản lý thu gọn xổ ra cho mobile
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Tự động mở rộng bộ lọc trên màn hình lớn từ tablet trở lên
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsCollapsed(false);
    }
  }, []);

  // Đồng bộ trạng thái khi URL query thay đổi
  useEffect(() => {
    setType(searchParams.get('type') || 'phim-le');
    setCategory(searchParams.get('category') || '');
    setCountry(searchParams.get('country') || '');
    setYear(searchParams.get('year') || '');
    setSortField(searchParams.get('sort_field') || 'modified');
  }, [searchParams]);

  const handleApplyFilters = () => {
    const queryParams = new URLSearchParams();
    
    // Giữ lại keyword hiện tại trên URL nếu có để tìm kiếm kết hợp lọc
    const keyword = searchParams.get('keyword');
    if (keyword) {
      queryParams.set('keyword', keyword);
    }
    
    // Luôn bắt buộc có loại phim (Type) để kết hợp API của KKPhim
    queryParams.set('type', type);
    
    if (category) queryParams.set('category', category);
    if (country) queryParams.set('country', country);
    if (year) queryParams.set('year', year);
    if (sortField) queryParams.set('sort_field', sortField);

    // Điều hướng về trang tìm kiếm kèm các tham số mới
    router.push(`/tim-kiem?${queryParams.toString()}`);
  };

  const handleClearFilters = () => {
    setType('phim-le');
    setCategory('');
    setCountry('');
    setYear('');
    setSortField('modified');
    router.push('/tim-kiem');
  };

  const hasActiveFilters = category || country || year || sortField !== 'modified' || type !== 'phim-le';

  return (
    <div className="w-full bg-white/3 border border-white/5 p-5 sm:p-6 rounded-2xl backdrop-blur-md shadow-2xl transition-all duration-300 hover:border-white/8">
      {/* Header của Bộ lọc */}
      <div 
        onClick={() => {
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setIsCollapsed(!isCollapsed);
          }
        }}
        className="flex items-center justify-between border-b border-white/5 pb-4 cursor-pointer md:cursor-default"
      >
        <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2 select-none">
          <SlidersHorizontal className="w-4 h-4 text-brand-rose" />
          BỘ LỌC TÌM KIẾM THÔNG MINH
        </h4>
        <div className="flex items-center gap-2.5">
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilters();
              }}
              className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-brand-cyan hover:text-brand-rose transition-colors cursor-pointer uppercase tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Làm mới</span>
            </button>
          )}
          
          {/* Nút bấm ẩn hiện chỉ hiện trên Mobile */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white md:hidden active:scale-90 transition-all cursor-pointer outline-none"
          >
            {isCollapsed ? (
              <span className="text-[10px] font-black uppercase text-brand-rose bg-brand-rose/10 border border-brand-rose/20 px-2.5 py-1 rounded-md">Hiện bộ lọc</span>
            ) : (
              <span className="text-[10px] font-black uppercase text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">Thu gọn</span>
            )}
          </button>
        </div>
      </div>

      {/* Khối selectors - Hỗ trợ thu gọn xổ ra cực mượt trên di động */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
        isCollapsed 
          ? 'max-h-0 opacity-0 pointer-events-none mt-0' 
          : 'max-h-[1000px] opacity-100 mt-5 space-y-5'
      }`}>
        {/* Grid các ô chọn Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* 1. Loại phim */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Loại Phim</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 px-3 text-xs bg-slate-900 border border-white/5 rounded-xl focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet text-slate-200 cursor-pointer font-bold transition-all"
            >
              {MOVIE_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Thể loại */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Thể Loại</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 px-3 text-xs bg-slate-900 border border-white/5 rounded-xl focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet text-slate-200 cursor-pointer font-bold transition-all"
            >
              <option value="">Tất cả thể loại</option>
              {genres.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Quốc gia */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Quốc Gia</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-11 px-3 text-xs bg-slate-900 border border-white/5 rounded-xl focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet text-slate-200 cursor-pointer font-bold transition-all"
            >
              <option value="">Tất cả quốc gia</option>
              {countries.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Năm phát hành */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Năm Phát Hành</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-11 px-3 text-xs bg-slate-900 border border-white/5 rounded-xl focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet text-slate-200 cursor-pointer font-bold transition-all"
            >
              <option value="">Tất cả các năm</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Sắp xếp */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Sắp Xếp Theo</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="h-11 px-3 text-xs bg-slate-900 border border-white/5 rounded-xl focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet text-slate-200 cursor-pointer font-bold transition-all"
            >
              <option value="modified">Thời gian cập nhật</option>
              <option value="_id">Phim mới thêm</option>
              <option value="year">Năm sản xuất</option>
            </select>
          </div>
        </div>

        {/* Button Action */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleApplyFilters}
            className="flex items-center gap-2 w-full sm:w-auto justify-center px-8 py-3 bg-gradient-brand text-xs font-black text-white rounded-xl shadow-lg shadow-brand-rose/20 hover:shadow-brand-rose/40 transform hover:-translate-y-0.5 active:scale-98 transition-all duration-300 cursor-pointer uppercase tracking-widest"
          >
            <Filter className="w-4 h-4" />
            Áp dụng bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
};

