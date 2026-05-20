import React from 'react';
import { searchMovies } from '@/services/api';
import { MovieCard } from '@/components/MovieCard';
import { Pagination } from '@/components/Pagination';
import { Search, Film } from 'lucide-react';
import { SearchForm } from '@/components/SearchForm';

interface PageProps {
  searchParams: Promise<{
    keyword?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const keyword = params.keyword || '';
  const currentPage = Number(params.page) || 1;

  // Search films
  const data = keyword ? await searchMovies(keyword, currentPage, 24) : null;
  const movies = data?.items || [];
  const pagination = data?.pagination || { totalItems: 0, currentPage: 1, totalPages: 1 };

  const buildPageLink = (pageNumber: number) => {
    return `/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${pageNumber}`;
  };

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* Thanh tìm kiếm to rõ - Cực kỳ hữu ích cho Mobile Web App */}
        <div className="w-full max-w-2xl mx-auto">
          <SearchForm initialKeyword={keyword} />
        </div>

        {/* Search header status info */}
        <div className="border-b border-slate-900 pb-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-brand-rose" />
            Kết Quả Tìm Kiếm
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            {keyword ? (
              <>
                Tìm thấy <span className="text-brand-cyan font-bold">{pagination.totalItems}</span> bộ phim phù hợp với từ khóa <span className="text-brand-rose font-bold">"{keyword}"</span>
              </>
            ) : (
              'Vui lòng nhập từ khóa ở thanh tìm kiếm phía trên để tìm phim...'
            )}
          </p>
        </div>

        {/* Results grid layout */}
        {movies.length > 0 ? (
          <div className="space-y-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie._id || movie.slug} movie={movie} />
              ))}
            </div>

            {/* Pagination controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              buildPageLink={buildPageLink}
            />
          </div>
        ) : (
          keyword && (
            <div className="py-20 text-center text-slate-500 space-y-4 flex flex-col items-center">
              <Film className="w-16 h-16 text-slate-700" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-350">Không tìm thấy kết quả</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Rất tiếc, chúng tôi không tìm thấy bộ phim nào phù hợp với từ khóa của bạn. Vui lòng thử tìm với một từ khóa khác.
                </p>
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}
