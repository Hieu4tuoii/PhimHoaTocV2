import { MovieListResponse, MovieDetailResponse, APIV1ListResponse, Genre, Country } from '@/types';

const BASE_URL = 'https://phimapi.com';
const IMAGE_BASE_URL = 'https://phimimg.com';

// Helper function to build full image URL
export const getImageUrl = (path: string | undefined): string => {
  if (!path) return '/placeholder-movie.jpg'; // fallback image
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${IMAGE_BASE_URL}/${path.startsWith('/') ? path.slice(1) : path}`;
};

// 1. Get new updated movies
export async function getNewUpdates(page: number = 1): Promise<MovieListResponse> {
  try {
    const res = await fetch(`${BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`, {
      next: { revalidate: 600 }, // Cache response for 10 minutes
    });
    if (!res.ok) {
      console.error('Failed to fetch new updates: status', res.status);
      return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: 10, currentPage: page, totalPages: 1 } };
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching new updates:', error);
    return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: 10, currentPage: page, totalPages: 1 } };
  }
}

// 2. Get movie detail by slug
export async function getMovieDetail(slug: string): Promise<MovieDetailResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/phim/${slug}`, {
      next: { revalidate: 3600 }, // Cache response for 1 hour
    });
    if (!res.ok) {
      console.error(`Failed to fetch movie detail for slug ${slug}: status`, res.status);
      return null;
    }
    return res.json();
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
    const res = await fetch(`${BASE_URL}/v1/api/danh-sach/${type}?${queryParams.toString()}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      console.error(`Failed to fetch movies of type ${type}: status`, res.status);
      return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: page, totalPages: 1 } };
    }
    const data: APIV1ListResponse = await res.json();

    if (data.status) {
      return {
        status: true,
        items: data.data.items,
        pagination: data.data.params.pagination,
      };
    }
    console.error(`API returned unsuccessful status for type ${type}`);
    return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: page, totalPages: 1 } };
  } catch (error) {
    console.error(`Error fetching movies of type ${type}:`, error);
    return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: page, totalPages: 1 } };
  }
}

// 4. Search movies
export async function searchMovies(keyword: string, page: number = 1, limit: number = 24): Promise<MovieListResponse> {
  try {
    const queryParams = new URLSearchParams({
      keyword,
      page: String(page),
      limit: String(limit),
    });
    const res = await fetch(`${BASE_URL}/v1/api/tim-kiem?${queryParams.toString()}`, {
      // Don't cache searches as they are highly dynamic
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('Failed to search movies: status', res.status);
      return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: 1, totalPages: 1 } };
    }
    const data: APIV1ListResponse = await res.json();

    if (data.status) {
      return {
        status: true,
        items: data.data.items,
        pagination: data.data.params.pagination,
      };
    }
    console.error('Search API returned unsuccessful status');
    return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: 1, totalPages: 1 } };
  } catch (error) {
    console.error('Error searching movies:', error);
    return { status: false, items: [], pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: 1, totalPages: 1 } };
  }
}

// 5. Get list of genres
export async function getGenres(): Promise<Genre[]> {
  try {
    const res = await fetch(`${BASE_URL}/the-loai`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });
    if (!res.ok) {
      console.error('Failed to fetch genres: status', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}

// 6. Get list of countries
export async function getCountries(): Promise<Country[]> {
  try {
    const res = await fetch(`${BASE_URL}/quoc-gia`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });
    if (!res.ok) {
      console.error('Failed to fetch countries: status', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
}
