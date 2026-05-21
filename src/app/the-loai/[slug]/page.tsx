import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getMoviesByGenre, getGenres } from '@/services/api';
import { MovieCard } from '@/components/MovieCard';
import { Pagination } from '@/components/Pagination';
import { Film, Tag } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Tối ưu SEO động thông qua metadata sinh từ server-side
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genres = await getGenres();
  const genre = genres.find((g) => g.slug === slug);
  const genreName = genre ? genre.name : slug;

  return {
    title: `Phim ${genreName} Hay Nhất 2026 | Xem Phim ${genreName} Full HD - Phim Hỏa Tốc`,
    description: `Tuyển tập danh sách phim ${genreName} mới nhất, phim ${genreName} chiếu rạp hay nhất được cập nhật liên tục với chất lượng Full HD, vietsub thuyết minh cực mượt trên Phim Hỏa Tốc.`,
  };
}

export default async function GenrePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const currentPage = Number(sParams.page) || 1;

  // Lấy danh sách thể loại để tìm tên hiển thị chuẩn tiếng Việt
  const genres = await getGenres();
  const genre = genres.find((g) => g.slug === slug);
  
  if (!genre && slug !== 'all') {
    // Nếu slug không tồn tại trong danh sách thể loại hệ thống
    console.warn(`Genre slug not found: ${slug}`);
  }

  const genreName = genre ? genre.name : 'Thể Loại';

  // Lấy danh sách phim theo thể loại từ API
  const data = await getMoviesByGenre(slug, currentPage, 24);
  const movies = data?.items || [];
  const pagination = data?.pagination || { totalItems: 0, currentPage: 1, totalPages: 1 };

  const buildPageLink = (pageNumber: number) => {
    return `/the-loai/${slug}?page=${pageNumber}`;
  };

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28 bg-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* Title Header */}
        <div className="border-b border-slate-900 pb-6 space-y-2">
          <div className="flex items-center gap-2 text-brand-rose font-bold text-xs uppercase tracking-widest">
            <Tag className="w-3.5 h-3.5" />
            Thể Loại Phim
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-8 bg-gradient-brand rounded-full inline-block" />
            Phim {genreName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-450 font-medium leading-relaxed max-w-3xl">
            Tổng hợp danh sách các bộ phim {genreName.toLowerCase()} đặc sắc nhất, chất lượng hình ảnh sắc nét, âm thanh sống động, cập nhật tập mới nhanh chóng.
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
                Hiện tại chưa có phim nào thuộc thể loại này trên hệ thống. Vui lòng quay lại sau!
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
