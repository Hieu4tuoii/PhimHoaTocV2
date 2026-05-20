'use client';

import React, { useState, useEffect } from 'react';

interface MoviePosterProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

export const MoviePoster: React.FC<MoviePosterProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder-movie.jpg',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);

  // Sync state with src prop in case it changes dynamically
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};

export default MoviePoster;
