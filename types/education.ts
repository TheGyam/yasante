export type ContentType = 'article' | 'video';
export type ContentTopic = 
  | 'hair-care'
  | 'styling'
  | 'products'
  | 'tools'
  | 'treatments'
  | 'maintenance'
  | 'troubleshooting';

export interface Content {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  topic: ContentTopic;
  thumbnailUri?: string;
  videoUri?: string;
  articleContent?: string;
  author: string;
  publishedAt: string;
  tags: string[];
  hairTypes: string[]; // Hair types this content is relevant for
  views: number;
  likes: number;
  readingTime?: number; // in minutes
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  imageUri: string;
  category: string;
  price?: number;
  currency?: string;
  affiliateLink?: string;
  hairTypes: string[]; // Hair types this product is suitable for
  rating?: number;
  reviews?: number;
}

export interface Tool {
  id: string;
  name: string;
  brand?: string;
  description: string;
  imageUri: string;
  category: string;
  price?: number;
  currency?: string;
  affiliateLink?: string;
  hairTypes: string[];
  rating?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple';
  options: QuizOption[];
  category: 'type' | 'texture' | 'porosity' | 'density' | 'concerns' | 'goals';
}

export interface QuizOption {
  id: string;
  label: string;
  value: string;
  imageUri?: string;
}













