export interface Pagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export interface MovieShort {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  year: number;
  modified: {
    time: string;
  };
  episode_current?: string;
  quality?: string;
  lang?: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Country {
  id: string;
  name: string;
  slug: string;
}

export interface MovieDetail {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  content: string;
  type: 'series' | 'single' | 'hoathinh' | 'tvshows';
  status: 'completed' | 'ongoing';
  poster_url: string;
  thumb_url: string;
  year: number;
  episode_current: string;
  episode_total: string;
  quality: string;
  lang: string;
  duration: string;
  view: number;
  actor: string[];
  director: string[];
  category: Genre[];
  country: Country[];
  showtime?: string;
}

export interface EpisodeData {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

export interface MovieServer {
  server_name: string;
  server_data: EpisodeData[];
}

export interface MovieDetailResponse {
  status: boolean;
  msg?: string;
  movie: MovieDetail;
  episodes: MovieServer[];
}

export interface MovieListResponse {
  status: boolean;
  items: MovieShort[];
  pagination: Pagination;
}

export interface APIV1ListResponse {
  status: boolean;
  data: {
    items: MovieShort[];
    params: {
      type_list: string;
      filterCategory: string[];
      filterCountry: string[];
      filterYear: string;
      pagination: Pagination;
    };
  };
}
