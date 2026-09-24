export type ContentType = 'article' | 'video';
export type ContentTopic =
  | 'care'
  | 'styling'
  | 'products'
  | 'treatments'
  | 'color'
  | 'growth'
  | 'health'
  | 'tips';

export interface Content {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  topic: ContentTopic;
  hairTypes: string[]; // Array of hair type identifiers
  thumbnailUri?: string;
  videoUri?: string;
  articleContent?: string;
  duration?: number; // in minutes for videos
  author?: string;
  publishedAt: string;
  views?: number;
  likes?: number;
}

export interface ProductRecommendation {
  id: string;
  name: string;
  brand?: string;
  description: string;
  imageUri?: string;
  link?: string;
  category: 'shampoo' | 'conditioner' | 'treatment' | 'styling' | 'tool' | 'other';
}

export interface Favorite {
  id: string;
  userId: string;
  contentId: string;
  createdAt: string;
}
