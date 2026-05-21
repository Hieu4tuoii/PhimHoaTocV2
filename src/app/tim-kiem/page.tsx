import React from 'react';
import { Metadata } from 'next';
import { searchMovies, getMoviesByType, getGenres, getCountries } from '@/services/api';
import { MovieCard } from '@/components/MovieCard';
import { Pagination } from '@/components/Pagination';
import { SearchForm } from '@/components/SearchForm';
import { DiscoverFilterBar } from '@/components/DiscoverFilterBar';
import { Search, Film, SlidersHorizontal, Sparkles } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    keyword?: string;
    type?: string;
    category?: string;
    country?: string;
    year?: string;
    sort_field?: string;
    page?: string;
  }>;
}

const TYPE_NAMES: Record<string, string> = {
  'phim-bo': 'Phim Bộ',
  'phim-le': 'Phim Lẻ',
  'hoat-hinh': 'Hoạt Hình - Anime',
  'tv-shows': 'TV Shows',
};

// Sinh SEO Metadata động cho trang Tìm kiếm & Lọc phim gộp
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const keyword = params.keyword || '';
  
  if (keyword) {
    return {
      title: `Tìm Kiếm Phim "${keyword}" Trực Tuyến Hay Nhất 2026 - Phim Hỏa Tốc`,
      description: `Kết quả tìm kiếm phim phù hợp với từ khóa "${keyword}". Xem phim online chất lượng cao Full HD Vietsub Thuyết Minh tốc độ cao không giật lag tại Phim Hỏa Tốc.`,
    };
  }

  const type = params.type || 'phim-le';
  const typeName = TYPE_NAMES[type] || 'Phim Lẻ';
  const [genres, countries] = await Promise.all([getGenres(), getCountries()]);
  const genre = genres.find((g) => g.slug === params.category);
  const country = countries.find((c) => c.slug === params.country);

  let filterTitle = '';
  if (genre) filterTitle += ` ${genre.name}`;
  if (country) filterTitle += ` ${country.name}`;
  if (params.year) filterTitle += ` Năm ${params.year}`;

  const title = filterTitle
    ? `Duyệt Phim ${typeName}${filterTitle} Cực Hay 2026 - Phim Hỏa Tốc`
    : `Tìm Kiếm & Khám Phá Điện Ảnh Thông Minh Netflix-Style - Phim Hỏa Tốc`;

  return {
    title,
    description: `Trang tìm kiếm phim và lọc thông minh của Phim Hỏa Tốc. Nhập từ khóa hoặc sử dụng bộ lọc đa tiêu chí (thể loại, quốc gia, năm phát hành, loại phim) để khám phá ngay những bộ phim ưng ý nhất.`,
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const keyword = params.keyword || '';
  const currentPage = Number(params.page) || 1;

  // Lọc thông số
  const type = params.type || 'phim-le';
  const category = params.category || '';
  const country = params.country || '';
  const year = params.year || '';
  const sortField = params.sort_field || 'modified';

  // Lấy danh sách thể loại và quốc gia phục vụ bộ lọc trên server-side
  const [genres, countries] = await Promise.all([getGenres(), getCountries()]);

  const hasFilters = category || country || year || sortField !== 'modified' || type !== 'phim-le';

  // Trích xuất các tham số bộ lọc nâng cao
  const extraParams: Record<string, string> = {};
  if (category) extraParams.category = category;
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (sortField) extraParams.sort_field = sortField;

  // Phân luồng logic fetch API
  let data = null;
  let isDefaultList = false;

  if (keyword) {
    // Luồng 1: Có từ khóa tìm kiếm kết hợp các bộ lọc nâng cao song song
    data = await searchMovies(keyword, currentPage, 24, extraParams);
  } else if (hasFilters) {
    // Luồng 2: Không có từ khóa nhưng có bộ lọc
    data = await getMoviesByType(type, currentPage, 24, extraParams);
  } else {
    // Luồng 3: Trang mặc định trống (không từ khóa, không bộ lọc) ➔ Tự động fetch phim lẻ mới nhất
    data = await getMoviesByType('phim-le', currentPage, 24);
    isDefaultList = true;
  }

  const movies = data?.items || [];
  const pagination = data?.pagination || { totalItems: 0, currentPage: 1, totalPages: 1 };

  // Tạo link phân trang đồng bộ giữ nguyên cả keyword và các bộ lọc
  const buildPageLink = (pageNumber: number) => {
    const query = new URLSearchParams();
    if (keyword) {
      query.set('keyword', keyword);
    }
    
    // Luôn lưu giữ các tham số bộ lọc khi phân trang
    query.set('type', type);
    if (category) query.set('category', category);
    if (country) query.set('country', country);
    if (year) query.set('year', year);
    if (sortField) query.set('sort_field', sortField);
    
    query.set('page', String(pageNumber));
    return `/tim-kiem?${query.toString()}`;
  };

  // Xác định tiêu đề hiển thị động báo kết quả kết hợp thông minh
  let displayTitle = '';
  let subTitle = '';
  let IconHeader = Search;

  if (keyword) {
    displayTitle = hasFilters ? `Kết Quả Tìm Kiếm & Lọc` : `Kết Quả Tìm Kiếm`;
    
    let filterString = `Từ khóa: "${keyword}"`;
    const typeName = TYPE_NAMES[type] || 'Phim Lẻ';
    const activeGenre = genres.find((g) => g.slug === category);
    const activeCountry = countries.find((c) => c.slug === country);
    
    if (hasFilters) {
      filterString += ` • Loại: ${typeName}`;
      if (activeGenre) filterString += ` • Thể loại: ${activeGenre.name}`;
      if (activeCountry) filterString += ` • ${activeCountry.name}`;
      if (year) filterString += ` • Năm: ${year}`;
    }
    
    subTitle = `${filterString} (Tìm thấy ${pagination.totalItems || 0} phim)`;
    IconHeader = Search;
  } else if (hasFilters) {
    const typeName = TYPE_NAMES[type] || 'Phim Lẻ';
    const activeGenre = genres.find((g) => g.slug === category);
    const activeCountry = countries.find((c) => c.slug === country);

    displayTitle = `Kết Quả Lọc Phim`;
    
    let filterString = `Loại: ${typeName}`;
    if (activeGenre) filterString += ` • Thể loại: ${activeGenre.name}`;
    if (activeCountry) filterString += ` • ${activeCountry.name}`;
    if (year) filterString += ` • Năm: ${year}`;
    
    subTitle = `${filterString} (Tìm thấy ${pagination.totalItems || 0} phim)`;
    IconHeader = SlidersHorizontal;
  } else {
    displayTitle = `Phim Mới Cập Nhật Cho Bạn`;
    subTitle = `Khám phá ngay danh sách phim lẻ chiếu rạp hot nhất đang được săn đón nhiệt tình.`;
    IconHeader = Sparkles;
  }

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28 bg-navy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        
        {/* 1. Thanh tìm kiếm to rõ, tự động focus cực nhạy khi mở trang */}
        <div className="w-full max-w-2xl mx-auto">
          <SearchForm initialKeyword={keyword} autoFocus={true} />
        </div>

        {/* 2. Thanh bộ lọc thông minh thu gọn/xổ ra */}
        <div className="w-full">
          <DiscoverFilterBar
            genres={genres}
            countries={countries}
          />
        </div>

        {/* 3. Tiêu đề hiển thị động báo kết quả (Chỉ hiển thị khi thực sự tìm kiếm hoặc lọc) */}
        {(keyword || hasFilters) && (
          <div className="border-b border-slate-900 pb-4 space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <IconHeader className="w-5 h-5 text-brand-rose" />
              {displayTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold leading-relaxed">
              {subTitle}
            </p>
          </div>
        )}

        {/* 4. Hiển thị Grid danh sách phim */}
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
          <div className="py-24 text-center text-slate-500 space-y-4 flex flex-col items-center">
            <Film className="w-16 h-16 text-slate-800" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-350">Không tìm thấy kết quả</h3>
              <p className="text-sm text-slate-550 max-w-md mx-auto leading-relaxed">
                Rất tiếc, chúng tôi không tìm thấy bộ phim nào phù hợp với bộ lọc hoặc từ khóa của bạn. Vui lòng gõ một từ khóa khác hoặc tinh chỉnh bộ lọc và thử lại.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
