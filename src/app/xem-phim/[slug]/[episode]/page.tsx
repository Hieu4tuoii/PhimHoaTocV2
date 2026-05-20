import React from 'react';
import { notFound } from 'next/navigation';
import { getMovieDetail, getMoviesByType } from '@/services/api';
import { WatchPlayerClient } from '@/components/WatchPlayerClient';
import { MovieSlider } from '@/components/MovieSlider';

interface PageProps {
  params: Promise<{
    slug: string;
    episode: string;
  }>;
}

export default async function WatchMoviePage({ params }: PageProps) {
  const { slug, episode } = await params;

  // 1. Fetch movie details on server side
  const res = await getMovieDetail(slug);

  if (!res || !res.status || !res.movie || !res.episodes || res.episodes.length === 0) {
    notFound();
  }

  const { movie, episodes } = res;

  // 2. Find the current playing episode from server data
  let currentEpisodeData = null;
  
  // Search in primary server (server index 0)
  const mainServer = episodes[0];
  if (mainServer && mainServer.server_data && mainServer.server_data.length > 0) {
    currentEpisodeData = mainServer.server_data.find((ep) => ep.slug === episode);
    
    // If not found by slug, maybe fallback to the first episode as safety
    if (!currentEpisodeData) {
      currentEpisodeData = mainServer.server_data[0];
    }
  }

  if (!currentEpisodeData) {
    notFound();
  }

  // 3. Fetch related movies based on genre
  let relatedMovies: any[] = [];
  if (movie.category && movie.category.length > 0) {
    const firstGenreSlug = movie.category[0].slug;
    
    // Map movie.type sang API type hợp lệ của KKPhim
    let apiType = 'phim-le';
    if (movie.type === 'series') apiType = 'phim-bo';
    else if (movie.type === 'hoathinh') apiType = 'hoat-hinh';
    else if (movie.type === 'tvshows') apiType = 'tv-shows';
    else if (movie.type === 'single') apiType = 'phim-le';

    try {
      const relatedData = await getMoviesByType(apiType, 1, 12, {
        category: firstGenreSlug,
      });
      if (relatedData.status) {
        relatedMovies = relatedData.items.filter((m) => m.slug !== movie.slug);
      }
    } catch (e) {
      console.error('Error fetching related movies in watch page:', e);
    }
  }

  return (
    <div className="w-full min-h-screen pb-16 pt-24 sm:pt-28 relative">
      {/* Main Page Layout Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Watch Player Client Component */}
        <WatchPlayerClient
          movie={movie}
          currentEpisode={currentEpisodeData}
          episodes={episodes}
        />

        {/* Related movies listing */}
        {relatedMovies.length > 0 && (
          <div className="pt-8 border-t border-slate-900">
            <MovieSlider
              title="Phim Đề Xuất Cho Bạn"
              movies={relatedMovies}
            />
          </div>
        )}

      </div>
    </div>
  );
}
