import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMoviesByCountry, getCountries } from '@/services/api';
import { MovieCard } from '@/components/MovieCard';
import { Pagination } from '@/components/Pagination';
import { Film, Globe } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Tối ưu SEO động thông qua metadata sinh từ server-side
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const countries = await getCountries();
  const country = countries.find((c) => c.slug === slug);
  const countryName = country ? country.name : slug;

  return {
    title: `Phim ${countryName} Hay Nhất 2026 | Xem Phim ${countryName} Full HD - PhimHoaToc`,
    description: `Tuyển tập danh sách phim ${countryName} mới nhất, phim truyền hình & chiếu rạp ${countryName} hay nhất được cập nhật liên tục với chất lượng Full HD, vietsub thuyết minh cực mượt trên PhimHoaToc.`,
  };
}

export default async function CountryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const currentPage = Number(sParams.page) || 1;

  // Lấy danh sách quốc gia để tìm tên hiển thị chuẩn tiếng Việt
  const countries = await getCountries();
  const country = countries.find((c) => c.slug === slug);
  
  if (!country && slug !== 'all') {
    // Nếu slug không tồn tại trong danh sách quốc gia hệ thống
    console.warn(`Country slug not found: ${slug}`);
  }

  const countryName = country ? country.name : 'Quốc Gia';

  // Lấy danh sách phim theo quốc gia từ API
  const data = await getMoviesByCountry(slug, currentPage, 24);
  const movies = data?.items || [];
  const pagination = data?.pagination || { totalItems: 0, currentPage: 1, totalPages: 1 };

  const buildPageLink = (pageNumber: number) => {
    return `/quoc-gia/${slug}?page=${pageNumber}`;
  };

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28 bg-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* Title Header */}
        <div className="border-b border-slate-900 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-brand-cyan font-bold text-xs uppercase tracking-widest">
            <Globe className="w-3.5 h-3.5 animate-spin-slow" />
            Quốc Gia Phim
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-8 bg-gradient-brand rounded-full inline-block" />
            Phim {countryName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-450 font-medium leading-relaxed max-w-3xl">
            Tổng hợp danh sách các bộ phim {countryName.toLowerCase()} đặc sắc nhất, chất lượng hình ảnh sắc nét, âm thanh sống động, cập nhật tập mới nhanh chóng.
          </p>
        </div>

        {/* Grid movies display */}
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
            <Film className="w-16 h-16 text-slate-800 animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-350">Đang cập nhật phim</h3>
              <p className="text-sm text-slate-550 max-w-sm mx-auto">
                Hiện tại chưa có phim nào thuộc quốc gia này trên hệ thống. Vui lòng quay lại sau!
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
