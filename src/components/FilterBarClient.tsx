'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Genre, Country } from '@/types';

interface FilterBarClientProps {
  type: string;
  genres: Genre[];
  countries: Country[];
  currentFilters: {
    category?: string;
    country?: string;
    year?: string;
    sort_field?: string;
  };
}

const YEARS = Array.from({ length: 13 }, (_, i) => String(2026 - i)); // 2026 to 2014

export const FilterBarClient: React.FC<FilterBarClientProps> = ({
  type,
  genres,
  countries,
  currentFilters,
}) => {
  const router = useRouter();
  const [category, setCategory] = useState(currentFilters.category || '');
  const [country, setCountry] = useState(currentFilters.country || '');
  const [year, setYear] = useState(currentFilters.year || '');
  const [sortField, setSortField] = useState(currentFilters.sort_field || 'modified');

  // Đồng bộ hóa trạng thái filter khi props từ URL thay đổi (ví dụ: khi người dùng bấm Back hoặc chuyển trang)
  useEffect(() => {
    setCategory(currentFilters.category || '');
    setCountry(currentFilters.country || '');
    setYear(currentFilters.year || '');
    setSortField(currentFilters.sort_field || 'modified');
  }, [currentFilters]);

  const handleApplyFilters = () => {
    const queryParams = new URLSearchParams();
    if (category) queryParams.set('category', category);
    if (country) queryParams.set('country', country);
    if (year) queryParams.set('year', year);
    if (sortField) queryParams.set('sort_field', sortField);

    router.push(`/danh-sach/${type}?${queryParams.toString()}`);
  };

  const handleClearFilters = () => {
    setCategory('');
    setCountry('');
    setYear('');
    setSortField('modified');
    router.push(`/danh-sach/${type}`);
  };

  return (
    <div className="w-full glass-panel border-slate-850 p-5 rounded-2xl space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand-rose" />
          Bộ lọc nâng cao
        </h4>
        {(category || country || year || sortField !== 'modified') && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-brand-cyan hover:text-brand-rose transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        )}
      </div>

      {/* Select Grids */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Genre Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-bold uppercase">Thể Loại</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 px-3 text-xs bg-slate-900 border border-slate-700/50 rounded-xl focus:outline-none focus:border-brand-violet text-slate-200"
          >
            <option value="">Tất cả thể loại</option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Country Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-bold uppercase">Quốc Gia</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-10 px-3 text-xs bg-slate-900 border border-slate-700/50 rounded-xl focus:outline-none focus:border-brand-violet text-slate-200"
          >
            <option value="">Tất cả quốc gia</option>
            {countries.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-bold uppercase">Năm Phát Hành</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-10 px-3 text-xs bg-slate-900 border border-slate-700/50 rounded-xl focus:outline-none focus:border-brand-violet text-slate-200"
          >
            <option value="">Tất cả các năm</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Field Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-bold uppercase">Sắp Xếp</label>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="h-10 px-3 text-xs bg-slate-900 border border-slate-700/50 rounded-xl focus:outline-none focus:border-brand-violet text-slate-200"
          >
            <option value="modified">Thời gian cập nhật</option>
            <option value="_id">Phim mới thêm</option>
            <option value="year">Năm sản xuất</option>
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleApplyFilters}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-brand text-xs font-bold text-white rounded-xl shadow-md hover:shadow-brand-rose/25 transform hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <Filter className="w-4 h-4" />
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
};
