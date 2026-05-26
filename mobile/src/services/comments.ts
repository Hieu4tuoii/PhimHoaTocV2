import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CommentItem {
  id: string;
  author: string;
  avatarColor: string;
  content: string;
  createdAt: number;
}

const COMMENTS_STORAGE_KEY_PREFIX = 'phimhoatoc_comments_';

const AVATAR_COLORS = [
  '#E50914', // Netflix Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
];

// Helper to generate dynamic random gradient avatar color based on name length
export const getRandomAvatarColor = (name: string): string => {
  const index = name.length % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

// 1. Get comments list for a specific movie
export const getMovieComments = async (movieSlug: string): Promise<CommentItem[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(`${COMMENTS_STORAGE_KEY_PREFIX}${movieSlug}`);
    if (jsonValue != null) {
      const parsed: CommentItem[] = JSON.parse(jsonValue);
      // Sort comments by newly added first
      return parsed.sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  } catch (error) {
    console.error('Error reading comments from AsyncStorage:', error);
    return [];
  }
};

// 2. Add a new comment to a specific movie
export const addMovieComment = async (
  movieSlug: string,
  authorName: string,
  content: string
): Promise<CommentItem | null> => {
  if (!authorName.trim() || !content.trim()) return null;

  try {
    const existingComments = await getMovieComments(movieSlug);
    
    const newComment: CommentItem = {
      id: Math.random().toString(36).substring(2, 9),
      author: authorName.trim(),
      avatarColor: getRandomAvatarColor(authorName),
      content: content.trim(),
      createdAt: Date.now(),
    };

    const updatedComments = [newComment, ...existingComments];
    await AsyncStorage.setItem(
      `${COMMENTS_STORAGE_KEY_PREFIX}${movieSlug}`,
      JSON.stringify(updatedComments)
    );

    return newComment;
  } catch (error) {
    console.error('Error saving comment to AsyncStorage:', error);
    return null;
  }
};
