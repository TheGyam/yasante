import { Content, Product, Tool, QuizQuestion } from '@/types/education';
import { Goal, Routine } from '@/types/planner';

// Mock Educational Content
export const mockContent: Content[] = [
  {
    id: '1',
    title: 'Understanding Your Hair Porosity',
    description: 'Learn how to determine your hair porosity and choose the right products for your hair type.',
    type: 'article',
    topic: 'hair-care',
    thumbnailUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    articleContent: 'Hair porosity refers to your hair\'s ability to absorb and retain moisture...',
    author: 'Sarah Johnson',
    publishedAt: '2024-01-15T10:00:00Z',
    tags: ['porosity', 'hair-care', 'basics'],
    hairTypes: ['curly', 'coily', 'kinky'],
    views: 1250,
    likes: 89,
    readingTime: 5,
  },
  {
    id: '2',
    title: 'Beginner Braid-Out Tutorial',
    description: 'Step-by-step guide to creating beautiful braid-out styles for natural hair.',
    type: 'video',
    topic: 'styling',
    thumbnailUri: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400',
    videoUri: 'https://example.com/video1.mp4',
    author: 'Maria Garcia',
    publishedAt: '2024-01-20T14:30:00Z',
    tags: ['braid-out', 'styling', 'tutorial'],
    hairTypes: ['curly', 'coily', 'kinky'],
    views: 2100,
    likes: 156,
    readingTime: 8,
  },
  {
    id: '3',
    title: 'Deep Conditioning Routine for High Porosity Hair',
    description: 'Discover the best deep conditioning techniques for high porosity hair.',
    type: 'article',
    topic: 'treatments',
    thumbnailUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400',
    articleContent: 'High porosity hair requires special care to maintain moisture...',
    author: 'Emily Chen',
    publishedAt: '2024-01-18T09:15:00Z',
    tags: ['deep-conditioning', 'high-porosity', 'treatments'],
    hairTypes: ['curly', 'coily', 'kinky', 'wavy'],
    views: 980,
    likes: 72,
    readingTime: 6,
  },
  {
    id: '4',
    title: 'Protective Styling Options',
    description: 'Explore various protective styles to promote hair growth and reduce breakage.',
    type: 'video',
    topic: 'styling',
    thumbnailUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400',
    videoUri: 'https://example.com/video2.mp4',
    author: 'Jessica Williams',
    publishedAt: '2024-01-22T11:00:00Z',
    tags: ['protective-styles', 'hair-growth', 'styling'],
    hairTypes: ['curly', 'coily', 'kinky'],
    views: 1750,
    likes: 134,
    readingTime: 10,
  },
  {
    id: '5',
    title: 'Wash Day Routine for Curly Hair',
    description: 'The ultimate wash day routine to keep your curls looking their best.',
    type: 'article',
    topic: 'hair-care',
    thumbnailUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400',
    articleContent: 'A proper wash day routine is essential for maintaining healthy curls...',
    author: 'Amanda Brown',
    publishedAt: '2024-01-25T08:00:00Z',
    tags: ['wash-day', 'curly-hair', 'routine'],
    hairTypes: ['curly', 'wavy'],
    views: 1450,
    likes: 98,
    readingTime: 7,
  },
];

// Mock Products
export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Moisturizing Shampoo',
    brand: 'HairCare Pro',
    description: 'Gentle cleansing shampoo for all hair types',
    imageUri: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?w=300',
    category: 'Shampoo',
    price: 24.99,
    currency: 'USD',
    affiliateLink: 'https://example.com/product1',
    hairTypes: ['straight', 'wavy', 'curly'],
    rating: 4.5,
    reviews: 234,
  },
  {
    id: 'p2',
    name: 'Deep Conditioner',
    brand: 'Natural Hair Co',
    description: 'Intensive deep conditioner for dry, damaged hair',
    imageUri: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300',
    category: 'Conditioner',
    price: 29.99,
    currency: 'USD',
    affiliateLink: 'https://example.com/product2',
    hairTypes: ['curly', 'coily', 'kinky'],
    rating: 4.8,
    reviews: 189,
  },
  {
    id: 'p3',
    name: 'Leave-In Conditioner',
    brand: 'Curl Care',
    description: 'Lightweight leave-in for daily moisture',
    imageUri: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=300',
    category: 'Leave-In',
    price: 18.99,
    currency: 'USD',
    affiliateLink: 'https://example.com/product3',
    hairTypes: ['curly', 'wavy'],
    rating: 4.6,
    reviews: 312,
  },
];

// Mock Tools
export const mockTools: Tool[] = [
  {
    id: 't1',
    name: 'Microfiber Hair Towel',
    brand: 'Hair Essentials',
    description: 'Gentle microfiber towel that reduces frizz and breakage',
    imageUri: 'https://images.unsplash.com/photo-1583484963886-47ce2d0a2e4e?w=300',
    category: 'Accessories',
    price: 15.99,
    currency: 'USD',
    affiliateLink: 'https://example.com/tool1',
    hairTypes: ['curly', 'coily', 'kinky', 'wavy'],
    rating: 4.7,
  },
  {
    id: 't2',
    name: 'Wide-Tooth Comb',
    brand: 'Detangle Pro',
    description: 'Professional wide-tooth comb for detangling wet hair',
    imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300',
    category: 'Tools',
    price: 8.99,
    currency: 'USD',
    affiliateLink: 'https://example.com/tool2',
    hairTypes: ['curly', 'coily', 'kinky'],
    rating: 4.9,
  },
  {
    id: 't3',
    name: 'Satin Bonnet',
    brand: 'Sleep Well',
    description: 'Protective satin bonnet for overnight hair protection',
    imageUri: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=300',
    category: 'Accessories',
    price: 12.99,
    currency: 'USD',
    affiliateLink: 'https://example.com/tool3',
    hairTypes: ['curly', 'coily', 'kinky', 'wavy'],
    rating: 4.8,
  },
];

// Mock Quiz Questions
export const mockQuizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'What best describes your natural hair pattern?',
    type: 'single',
    category: 'type',
    options: [
      { id: 'o1', label: 'Straight - No curl pattern', value: 'straight' },
      { id: 'o2', label: 'Wavy - Slight S-shaped pattern', value: 'wavy' },
      { id: 'o3', label: 'Curly - Defined curls', value: 'curly' },
      { id: 'o4', label: 'Coily - Tightly coiled pattern', value: 'coily' },
      { id: 'o5', label: 'Kinky - Very tight zigzag pattern', value: 'kinky' },
    ],
  },
  {
    id: 'q2',
    question: 'How would you describe the thickness of individual hair strands?',
    type: 'single',
    category: 'texture',
    options: [
      { id: 'o6', label: 'Fine - Thin strands', value: 'fine' },
      { id: 'o7', label: 'Medium - Average thickness', value: 'medium' },
      { id: 'o8', label: 'Thick - Thick strands', value: 'thick' },
    ],
  },
  {
    id: 'q3',
    question: 'How does your hair react to water?',
    type: 'single',
    category: 'porosity',
    options: [
      { id: 'o9', label: 'Water beads up and sits on hair (Low Porosity)', value: 'low' },
      { id: 'o10', label: 'Water absorbs normally (Medium Porosity)', value: 'medium' },
      { id: 'o11', label: 'Water absorbs quickly (High Porosity)', value: 'high' },
    ],
  },
  {
    id: 'q4',
    question: 'How much hair do you have on your head?',
    type: 'single',
    category: 'density',
    options: [
      { id: 'o12', label: 'Low - Can see scalp easily', value: 'low' },
      { id: 'o13', label: 'Medium - Some scalp visible', value: 'medium' },
      { id: 'o14', label: 'High - Scalp not easily visible', value: 'high' },
    ],
  },
  {
    id: 'q5',
    question: 'What are your main hair concerns? (Select all that apply)',
    type: 'multiple',
    category: 'concerns',
    options: [
      { id: 'o15', label: 'Dryness', value: 'Dryness' },
      { id: 'o16', label: 'Frizz', value: 'Frizz' },
      { id: 'o17', label: 'Breakage', value: 'Breakage' },
      { id: 'o18', label: 'Split Ends', value: 'Split Ends' },
      { id: 'o19', label: 'Hair Loss', value: 'Hair Loss' },
      { id: 'o20', label: 'Scalp Issues', value: 'Scalp Issues' },
      { id: 'o21', label: 'Color Fading', value: 'Color Fading' },
      { id: 'o22', label: 'Lack of Volume', value: 'Lack of Volume' },
    ],
  },
  {
    id: 'q6',
    question: 'What are your hair goals? (Select all that apply)',
    type: 'multiple',
    category: 'goals',
    options: [
      { id: 'o23', label: 'Grow Longer Hair', value: 'Grow Longer Hair' },
      { id: 'o24', label: 'Increase Hair Thickness', value: 'Increase Hair Thickness' },
      { id: 'o25', label: 'Reduce Breakage', value: 'Reduce Breakage' },
      { id: 'o26', label: 'Improve Hair Health', value: 'Improve Hair Health' },
      { id: 'o27', label: 'Maintain Color', value: 'Maintain Color' },
      { id: 'o28', label: 'Reduce Frizz', value: 'Reduce Frizz' },
    ],
  },
];

// Mock Goals (will be populated by user)
export const mockGoals: Goal[] = [];

// Mock Routines (will be populated by user)
export const mockRoutines: Routine[] = [];













