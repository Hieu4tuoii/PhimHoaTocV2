import { MovieListResponse, MovieDetailResponse, APIV1ListResponse, Genre, Country, Pagination, MovieDetail } from '../types';

const BASE_URL = 'https://phimapi.com';
const IMAGE_BASE_URL = 'https://phimimg.com';

// Helper function to map API pagination safely (calculates totalPages if missing)
const mapPagination = (apiPagination: any, defaultLimit: number = 24): Pagination => {
  if (!apiPagination) {
    return { totalItems: 0, totalItemsPerPage: defaultLimit, currentPage: 1, totalPages: 1 };
  }
  const totalItems = apiPagination.totalItems ?? 0;
  const totalItemsPerPage = apiPagination.totalItemsPerPage ?? defaultLimit;
  const currentPage = apiPagination.currentPage ?? 1;
  const totalPages = apiPagination.totalPages || Math.ceil(totalItems / totalItemsPerPage) || 1;
  return {
    totalItems,
    totalItemsPerPage,
    currentPage,
    totalPages,
  };
};

// Helper function to build full image URL (direct, no proxy)
export const getImageUrl = (path: string | undefined): string => {
  if (!path) return ''; // fallback should be handled locally in React Native Image components
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${IMAGE_BASE_URL}/${path.startsWith('/') ? path.slice(1) : path}`;
};

// 1. Get new updated movies
export async function getNewUpdates(page: number = 1): Promise<MovieListResponse> {
  try {
    const res = await fetch(`${BASE_URL}/v1/api/danh-sach?page=${page}`);
    if (!res.ok) {
      console.error('Failed to fetch new updates: status', res.status);
      return { status: false, items: [], pagination: mapPagination(null, 24) };
    }
    const data: APIV1ListResponse = await res.json();
    if (data.status) {
      return {
        status: true,
        items: data.data.items ?? [],
        pagination: mapPagination(data.data.params.pagination, 24),
      };
    }
    return { status: false, items: [], pagination: mapPagination(null, 24) };
  } catch (error) {
    console.error('Error fetching new updates:', error);
    return { status: false, items: [], pagination: mapPagination(null, 24) };
  }
}

// 2. Get movie detail by slug
export async function getMovieDetail(slug: string): Promise<MovieDetailResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/api/phim/${slug}`);
    if (!res.ok) {
      console.error(`Failed to fetch movie detail for slug ${slug}: status`, res.status);
      return null;
    }
    const apiData = await res.json();
    const isSuccess = apiData.status === 'success' || apiData.status === true;
    if (isSuccess && apiData.data && apiData.data.item) {
      const { episodes, time, ...movieDetail } = apiData.data.item;
      return {
        status: true,
        movie: {
          ...movieDetail,
          duration: time ?? movieDetail.duration ?? '',
        } as MovieDetail,
        episodes: episodes ?? [],
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching movie detail for slug: ${slug}`, error);
    return null;
  }
}

// 3. Get lists of movies by type using V1 API (phim-bo, phim-le, hoat-hinh, tv-shows)
export async function getMoviesByType(
  type: string,
  page: number = 1,
  limit: number = 24,
  extraParams: Record<string, string> = {}
): Promise<MovieListResponse> {
  try {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...extraParams,
    });
    const res = await fetch(`${BASE_URL}/v1/api/danh-sach/${type}?${queryParams.toString()}`);
    if (!res.ok) {
      console.error(`Failed to fetch movies of type ${type}: status`, res.status);
      return { status: false, items: [], pagination: mapPagination(null, limit) };
    }
    const data: APIV1ListResponse = await res.json();

    if (data.status) {
      return {
        status: true,
        items: data.data.items ?? [],
        pagination: mapPagination(data.data.params.pagination, limit),
      };
    }
    console.error(`API returned unsuccessful status for type ${type}`);
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  } catch (error) {
    console.error(`Error fetching movies of type ${type}:`, error);
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  }
}

// 4. Search movies
export async function searchMovies(
  keyword: string,
  page: number = 1,
  limit: number = 24,
  extraParams: Record<string, string> = {}
): Promise<MovieListResponse> {
  try {
    const queryParams = new URLSearchParams({
      keyword,
      page: String(page),
      limit: String(limit),
      ...extraParams,
    });
    const res = await fetch(`${BASE_URL}/v1/api/tim-kiem?${queryParams.toString()}`);
    if (!res.ok) {
      console.error('Failed to search movies: status', res.status);
      return { status: false, items: [], pagination: mapPagination(null, limit) };
    }
    const data: APIV1ListResponse = await res.json();

    if (data.status) {
      return {
        status: true,
        items: data.data.items ?? [],
        pagination: mapPagination(data.data.params.pagination, limit),
      };
    }
    console.error('Search API returned unsuccessful status');
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  } catch (error) {
    console.error('Error searching movies:', error);
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  }
}

// 5. Get list of genres
export async function getGenres(): Promise<Genre[]> {
  try {
    const res = await fetch(`${BASE_URL}/the-loai`);
    if (!res.ok) {
      console.error('Failed to fetch genres: status', res.status);
      return [];
    }
    const data = await res.json();
    const isSuccess = data.status === 'success' || data.status === true;
    if (isSuccess && data.data && data.data.items) {
      return data.data.items.map((item: any) => ({
        id: item._id ?? item.id ?? '',
        name: item.name ?? '',
        slug: item.slug ?? '',
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}

// 6. Get list of countries
export async function getCountries(): Promise<Country[]> {
  try {
    const res = await fetch(`${BASE_URL}/quoc-gia`);
    if (!res.ok) {
      console.error('Failed to fetch countries: status', res.status);
      return [];
    }
    const data = await res.json();
    const isSuccess = data.status === 'success' || data.status === true;
    if (isSuccess && data.data && data.data.items) {
      return data.data.items.map((item: any) => ({
        id: item._id ?? item.id ?? '',
        name: item.name ?? '',
        slug: item.slug ?? '',
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
}

// 7. Get movies by genre
export async function getMoviesByGenre(
  genreSlug: string,
  page: number = 1,
  limit: number = 24
): Promise<MovieListResponse> {
  try {
    const res = await fetch(`${BASE_URL}/v1/api/the-loai/${genreSlug}?page=${page}&limit=${limit}`);
    if (!res.ok) {
      console.error(`Failed to fetch movies for genre ${genreSlug}: status`, res.status);
      return { status: false, items: [], pagination: mapPagination(null, limit) };
    }
    const data: APIV1ListResponse = await res.json();

    if (data.status) {
      return {
        status: true,
        items: data.data.items ?? [],
        pagination: mapPagination(data.data.params.pagination, limit),
      };
    }
    console.error(`API returned unsuccessful status for genre ${genreSlug}`);
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  } catch (error) {
    console.error(`Error fetching movies for genre ${genreSlug}:`, error);
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  }
}

// 8. Get movies by country
export async function getMoviesByCountry(
  countrySlug: string,
  page: number = 1,
  limit: number = 24
): Promise<MovieListResponse> {
  try {
    const res = await fetch(`${BASE_URL}/v1/api/quoc-gia/${countrySlug}?page=${page}&limit=${limit}`);
    if (!res.ok) {
      console.error(`Failed to fetch movies for country ${countrySlug}: status`, res.status);
      return { status: false, items: [], pagination: mapPagination(null, limit) };
    }
    const data: APIV1ListResponse = await res.json();

    if (data.status) {
      return {
        status: true,
        items: data.data.items ?? [],
        pagination: mapPagination(data.data.params.pagination, limit),
      };
    }
    console.error(`API returned unsuccessful status for country ${countrySlug}`);
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  } catch (error) {
    console.error(`Error fetching movies for country ${countrySlug}:`, error);
    return { status: false, items: [], pagination: mapPagination(null, limit) };
  }
}
