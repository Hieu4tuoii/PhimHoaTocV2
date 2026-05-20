import React from 'react';
import { Metadata } from 'next';
import { getMoviesByType, getGenres, getCountries } from '@/services/api';
import { MovieCard } from '@/components/MovieCard';
import { Pagination } from '@/components/Pagination';
import { DiscoverFilterBar } from '@/components/DiscoverFilterBar';
import { Film, Compass } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    country?: string;
    year?: string;
    sort_field?: string;
    page?: string;
  }>;
}

// Cấu hình tên hiển thị của Loại phim để tối ưu tiêu đề SEO
const TYPE_NAMES: Record<string, string> = {
  'phim-bo': 'Phim Bộ',
  'phim-le': 'Phim Lẻ',
  'hoat-hinh': 'Hoạt Hình',
  'tv-shows': 'TV Shows',
};

// Hàm sinh metadata SEO động trên server-side
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sParams = await searchParams;
  const type = sParams.type || 'phim-le';
  const typeName = TYPE_NAMES[type] || 'Phim';

  // Lấy tên tiếng Việt chính xác của thể loại và quốc gia
  const [genres, countries] = await Promise.all([getGenres(), getCountries()]);
  const genre = genres.find((g) => g.slug === sParams.category);
  const country = countries.find((c) => c.slug === sParams.country);

  let filterTitle = '';
  if (genre) filterTitle += ` ${genre.name}`;
  if (country) filterTitle += ` ${country.name}`;
  if (sParams.year) filterTitle += ` Năm ${sParams.year}`;

  const title = filterTitle 
    ? `Duyệt Phim ${typeName}${filterTitle} Hay Nhất 2026 - PhimHoaToc`
    : `Khám Phá & Tìm Kiếm Phim Thông Minh Netflix-Style - PhimHoaToc`;

  return {
    title,
    description: `Trang duyệt phim thông minh cho phép kết hợp đa tiêu chí lọc: Thể loại, quốc gia, năm phát hành và sắp xếp để tìm ra những bộ phim ${typeName.toLowerCase()} Full HD vietsub thuyết minh ưng ý nhất.`,
  };
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const sParams = await searchParams;
  const currentPage = Number(sParams.page) || 1;
  
  // Xác định các tham số filter
  const type = sParams.type || 'phim-le';
  const category = sParams.category || '';
  const country = sParams.country || '';
  const year = sParams.year || '';
  const sortField = sParams.sort_field || 'modified';

  // Fetch danh sách thể loại và quốc gia trên server-side cho bộ lọc
  const [genres, countries] = await Promise.all([getGenres(), getCountries()]);

  // Thiết lập extraParams cho API lọc V1 của KKPhim
  const extraParams: Record<string, string> = {};
  if (category) extraParams.category = category;
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (sortField) extraParams.sort_field = sortField;

  // Lấy dữ liệu phim lọc từ API
  const data = await getMoviesByType(type, currentPage, 24, extraParams);
  const movies = data?.items || [];
  const pagination = data?.pagination || { totalItems: 0, currentPage: 1, totalPages: 1 };

  // Tạo link phân trang đồng bộ với các filter hiện tại
  const buildPageLink = (pageNumber: number) => {
    const query = new URLSearchParams();
    query.set('type', type);
    if (category) query.set('category', category);
    if (country) query.set('country', country);
    if (year) query.set('year', year);
    if (sortField) query.set('sort_field', sortField);
    query.set('page', String(pageNumber));

    return `/kham-pha?${query.toString()}`;
  };

  // Tạo tiêu đề động cho danh sách hiển thị
  const typeName = TYPE_NAMES[type] || 'Phim Lẻ';
  const activeGenre = genres.find((g) => g.slug === category);
  const activeCountry = countries.find((c) => c.slug === country);

  let displayTitle = `Danh sách ${typeName}`;
  if (activeGenre) displayTitle += ` • Thể loại ${activeGenre.name}`;
  if (activeCountry) displayTitle += ` • ${activeCountry.name}`;
  if (year) displayTitle += ` • Năm ${year}`;

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28 bg-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* Title Header */}
        <div className="border-b border-slate-900 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-brand-rose font-bold text-xs uppercase tracking-widest">
            <Compass className="w-3.5 h-3.5 animate-spin-slow text-brand-rose" />
            Trang Duyệt Phim Thông Minh
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-8 bg-gradient-brand rounded-full inline-block" />
            Khám Phá Điện Ảnh
          </h1>
          <p className="text-xs sm:text-sm text-slate-455 font-medium leading-relaxed max-w-3xl">
            Kết hợp đa tiêu chí để tìm kiếm chính xác bộ phim bạn yêu thích. Chọn Loại phim, Thể loại, Quốc gia và Năm phát hành để bắt đầu trải nghiệm rạp phim tại nhà cực chất.
          </p>
        </div>

        {/* 1. Intelligent Filter Bar Component */}
        <DiscoverFilterBar
          genres={genres}
          countries={countries}
        />

        {/* Dynamic List Section Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h2 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest">
            {displayTitle}
          </h2>
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
            Tìm thấy {pagination.totalItems || 0} phim
          </span>
        </div>

        {/* 2. Grid movies display */}
        {movies.length > 0 ? (
          <div className="space-y-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie._id || movie.slug} movie={movie} />
              ))}
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              buildPageLink={buildPageLink}
            />
          </div>
        ) : (
          <div className="py-24 text-center text-slate-500 space-y-4 flex flex-col items-center">
            <Film className="w-16 h-16 text-slate-800" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-350">Không tìm thấy phim phù hợp</h3>
              <p className="text-sm text-slate-550 max-w-sm mx-auto">
                Không tìm thấy phim nào khớp với bộ lọc bạn đã chọn. Vui lòng thay đổi tiêu chí lọc và thử lại.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
