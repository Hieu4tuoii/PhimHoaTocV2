import React from 'react';
import { StyleSheet } from 'react-native';
import { Image, ImageStyle } from 'expo-image';

interface MoviePosterProps {
  url: string;
  style?: ImageStyle | ImageStyle[];
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  alt?: string;
}

// Fallback movie poster placeholder matching web brand
const PLACEHOLDER_IMAGE = require('../../assets/favicon.png');

export default function MoviePoster({
  url,
  style,
  contentFit = 'cover',
  alt,
}: MoviePosterProps) {
  const isLocalAsset = !url || url === '';

  return (
    <Image
      source={isLocalAsset ? PLACEHOLDER_IMAGE : { uri: url }}
      placeholder={PLACEHOLDER_IMAGE}
      contentFit={contentFit}
      transition={300} // Smooth fade-in transition (300ms)
      cachePolicy="disk" // Cache image aggressively on disk
      style={[styles.image, style]}
      accessibilityLabel={alt || 'Movie Poster'}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1E1E',
  },
});
