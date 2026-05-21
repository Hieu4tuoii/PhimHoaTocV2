import React from 'react';
import { notFound } from 'next/navigation';
import { getMoviesByType, getNewUpdates, getGenres, getCountries } from '@/services/api';
import { MovieCard } from '@/components/MovieCard';
import { Pagination } from '@/components/Pagination';
import { FilterBarClient } from '@/components/FilterBarClient';
import { Film } from 'lucide-react';

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
    country?: string;
    year?: string;
    sort_field?: string;
  }>;
}

const TYPE_CONFIG: Record<string, { title: string; desc: string }> = {
  'phim-bo': {
    title: 'Phim Bộ Đặc Sắc',
    desc: 'Tuyển tập các bộ phim truyền hình dài tập, bom tấn Hàn Quốc, Trung Quốc, Âu Mỹ hấp dẫn nhất.',
  },
  'phim-le': {
    title: 'Phim Lẻ Chiếu Rạp',
    desc: 'Tổng hợp các bộ phim lẻ chiếu rạp, phim bom tấn hành động, viễn tưởng đỉnh cao, chất lượng Full HD.',
  },
  'hoat-hinh': {
    title: 'Hoạt Hình - Anime',
    desc: 'Thế giới hoạt hình đặc sắc, Anime Nhật Bản trọn bộ vietsub mới nhất cho mọi lứa tuổi.',
  },
  'tv-shows': {
    title: 'TV Shows Sôi Động',
    desc: 'Chương trình truyền hình thực tế, trò chơi âm nhạc, gameshow Việt Nam và quốc tế vui nhộn nhất.',
  },
  'phim-moi-cap-nhat': {
    title: 'Phim Mới Cập Nhật',
    desc: 'Danh sách các bộ phim mới nhất vừa được cập nhật liên tục từng giờ trên hệ thống Phim Hỏa Tốc.',
  },
};

export default async function CatalogPage({ params, searchParams }: PageProps) {
  const { type } = await params;
  const sParams = await searchParams;

  const config = TYPE_CONFIG[type];
  if (!config) {
    notFound();
  }

  const currentPage = Number(sParams.page) || 1;

  // Fetch filters list on server side
  const [genres, countries] = await Promise.all([getGenres(), getCountries()]);

  // Fetch movies list based on type
  let data;
  if (type === 'phim-moi-cap-nhat') {
    data = await getNewUpdates(currentPage);
  } else {
    // Pass along query parameters for filtering in V1 API
    const extraParams: Record<string, string> = {};
    if (sParams.category) extraParams.category = sParams.category;
    if (sParams.country) extraParams.country = sParams.country;
    if (sParams.year) extraParams.year = sParams.year;
    if (sParams.sort_field) extraParams.sort_field = sParams.sort_field;

    data = await getMoviesByType(type, currentPage, 24, extraParams);
  }

  const movies = data?.items || [];
  const pagination = data?.pagination || { totalItems: 0, currentPage: 1, totalPages: 1 };

  const buildPageLink = (pageNumber: number) => {
    const query = new URLSearchParams();
    query.set('page', String(pageNumber));
    if (sParams.category) query.set('category', sParams.category);
    if (sParams.country) query.set('country', sParams.country);
    if (sParams.year) query.set('year', sParams.year);
    if (sParams.sort_field) query.set('sort_field', sParams.sort_field);

    return `/danh-sach/${type}?${query.toString()}`;
  };

  const currentFilters = {
    category: sParams.category,
    country: sParams.country,
    year: sParams.year,
    sort_field: sParams.sort_field,
  };

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* Title Header */}
        <div className="border-b border-slate-900 pb-6 space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-8 bg-gradient-brand rounded-full inline-block" />
            {config.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-3xl">
            {config.desc}
          </p>
        </div>

        {/* 1. Show advanced filters container if it is not just updates */}
        {type !== 'phim-moi-cap-nhat' && (
          <FilterBarClient
            type={type}
            genres={genres}
            countries={countries}
            currentFilters={currentFilters}
          />
        )}

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
              <h3 className="text-lg font-bold text-slate-350">Không có phim nào phù hợp</h3>
              <p className="text-sm text-slate-550 max-w-sm mx-auto">
                Không tìm thấy phim nào khớp với bộ lọc của bạn trên hệ thống. Vui lòng thử lại với tiêu chí lọc khác.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
