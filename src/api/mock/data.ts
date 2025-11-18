import { User, HairProfile } from '@/types/user';
import { Goal, ProgressPhoto, Activity, Routine, ScheduledRoutine, MonthlyHairstyle } from '@/types/planner';
import { Content, ProductRecommendation, Favorite } from '@/types/education';
import { DIY } from '@/components/composed/DIYCard';
import { FlashcardStep } from '@/components/composed/SwipeableFlashcard';

// Mock User
export const mockUser: User = {
  id: 'user-1',
  name: 'Alex',
  email: 'alex@example.com',
  hairProfile: {
    texture: 'curly',
    density: 'medium',
    porosity: 'medium',
    goals: ['growth', 'moisture'],
    completedAt: new Date().toISOString(),
  },
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock Goals
export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Grow hair to shoulder length',
    description: 'Working towards healthy shoulder-length hair',
    targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    successMetric: 'Hair length reaches shoulders',
    status: 'active',
    progress: 45,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-2',
    userId: 'user-1',
    name: 'Improve hair moisture',
    description: 'Reduce dryness and improve overall hair health',
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    successMetric: 'Hair feels soft and hydrated',
    status: 'active',
    progress: 70,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock Progress Photos
export const mockProgressPhotos: ProgressPhoto[] = [
  {
    id: 'photo-1',
    goalId: 'goal-1',
    uri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80',
    thumbnailUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=300&fit=crop&q=80',
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    caption: 'Starting point',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'photo-2',
    goalId: 'goal-1',
    uri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=600&fit=crop&q=80',
    thumbnailUri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=200&h=300&fit=crop&q=80',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    caption: 'One month progress',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'photo-3',
    goalId: 'goal-1',
    uri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=600&fit=crop&q=80',
    thumbnailUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200&h=300&fit=crop&q=80',
    date: new Date().toISOString(),
    caption: 'Current progress',
    createdAt: new Date().toISOString(),
  },
];

// Mock Activities
export const mockActivities: Activity[] = [
  {
    id: 'activity-1',
    goalId: 'goal-1',
    type: 'treatment',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Deep conditioning treatment',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'activity-2',
    goalId: 'goal-1',
    type: 'trim',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Trimmed split ends',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock Routines
export const mockRoutines: Routine[] = [
  {
    id: 'routine-1',
    userId: 'user-1',
    name: 'Weekly Hair Care',
    description: 'Weekly deep conditioning and styling routine',
    frequency: 'weekly',
    steps: [
      { id: 'step-1', name: 'Shampoo', duration: 5, order: 1 },
      { id: 'step-2', name: 'Deep Condition', duration: 30, order: 2 },
      { id: 'step-3', name: 'Style', duration: 20, order: 3 },
    ],
    scheduledTime: '10:00',
    daysOfWeek: [0], // Sunday
    reminderEnabled: true,
    reminderTime: 30,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'routine-2',
    userId: 'user-1',
    name: 'Daily Moisturizing',
    description: 'Quick daily moisture routine',
    frequency: 'daily',
    steps: [
      { id: 'step-4', name: 'Apply leave-in conditioner', duration: 5, order: 1 },
      { id: 'step-5', name: 'Seal with oil', duration: 3, order: 2 },
    ],
    scheduledTime: '08:00',
    reminderEnabled: true,
    reminderTime: 15,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock Scheduled Routines
export const mockScheduledRoutines: ScheduledRoutine[] = [
  {
    id: 'scheduled-1',
    routineId: 'routine-1',
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed: false,
  },
  {
    id: 'scheduled-2',
    routineId: 'routine-2',
    scheduledDate: new Date().toISOString(),
    completed: false,
  },
];

// Mock Content
export const mockContent: Content[] = [
  {
    id: 'content-1',
    title: 'The Ultimate Guide to Curly Hair Care',
    description: 'Learn how to properly care for your curly hair with these expert tips and techniques.',
    type: 'article',
    topic: 'care',
    hairTypes: ['curly', 'wavy'],
    thumbnailUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop&q=80',
    articleContent: `Caring for curly hair requires a different approach than straight hair. Understanding your curl pattern, porosity, and density is the first step to achieving healthy, defined curls.

Understanding Your Curl Type

Curly hair comes in various patterns, from loose waves (2A) to tight coils (4C). Each type has unique needs and responds differently to products and styling techniques.

Moisture is Key

Curly hair tends to be drier than straight hair because natural oils have a harder time traveling down the curved hair shaft. This makes proper moisturization essential for maintaining healthy curls.

The Right Products

Using the right products for your curl type can make all the difference. Look for sulfate-free shampoos, rich conditioners, and styling products that enhance rather than weigh down your curls.`,
    author: 'Hair Expert',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    views: 1250,
    likes: 89,
  },
  {
    id: 'content-2',
    title: 'Deep Conditioning Techniques',
    description: 'Master the art of deep conditioning for maximum moisture and shine.',
    type: 'video',
    topic: 'treatments',
    hairTypes: ['curly', 'coily', 'kinky'],
    thumbnailUri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=300&fit=crop&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 8,
    author: 'Beauty Pro',
    articleContent: `Deep conditioning is one of the most important steps in any hair care routine, especially for curly, coily, and kinky hair types that tend to be naturally drier. This intensive treatment goes beyond regular conditioning to provide deep hydration and repair.

Why Deep Conditioning Matters

Regular conditioners work on the surface of your hair, but deep conditioners penetrate the hair shaft to deliver moisture and nutrients where they're needed most. This is especially important for textured hair, which has a harder time retaining moisture due to its structure.

Choosing the Right Deep Conditioner

Look for products with ingredients like shea butter, coconut oil, argan oil, and proteins. The best deep conditioner for you depends on your hair's porosity and current needs. High porosity hair benefits from protein-rich treatments, while low porosity hair needs lightweight, penetrating moisturizers.

Application Techniques

Start with freshly shampooed, towel-dried hair. Apply the deep conditioner section by section, focusing on the mid-lengths and ends where hair is oldest and most damaged. Use a wide-tooth comb to distribute the product evenly, then cover with a plastic cap and apply heat for 15-30 minutes.

Frequency and Timing

How often you deep condition depends on your hair's needs. Most people benefit from weekly deep conditioning, but those with very dry or damaged hair might need it more frequently. Pay attention to how your hair feels and adjust accordingly.`,
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    views: 2100,
    likes: 156,
  },
  {
    id: 'content-3',
    title: 'Best Products for Fine Hair',
    description: 'Discover the top products that work wonders for fine hair types.',
    type: 'article',
    topic: 'products',
    hairTypes: ['straight', 'wavy'],
    thumbnailUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=300&fit=crop&q=80',
    articleContent: `Fine hair requires special care to avoid weighing it down while still providing the nourishment it needs. The right products can add volume, body, and shine without making your hair look greasy or flat.

Choosing the Right Shampoo

Look for volumizing shampoos that are lightweight and won't strip your hair of its natural oils. Clarifying shampoos used once a week can help remove product buildup.

Conditioning Strategies

Fine hair benefits from lightweight conditioners applied mainly to the ends. Avoid heavy, creamy conditioners that can weigh down your hair and make it look limp.

Styling Products

Volumizing mousses and light-hold sprays work best for fine hair. Avoid heavy oils and thick creams that can make your hair look greasy and flat.`,
    author: 'Product Reviewer',
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    views: 890,
    likes: 67,
  },
  {
    id: 'content-4',
    title: 'Protective Styling Ideas',
    description: 'Creative and protective styling options for all hair types.',
    type: 'video',
    topic: 'styling',
    hairTypes: ['curly', 'coily', 'kinky'],
    thumbnailUri: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=300&fit=crop&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 12,
    author: 'Style Expert',
    articleContent: `Protective styling is a game-changer for maintaining healthy hair, especially for those with curly, coily, or kinky textures. These styles protect your ends, reduce manipulation, and help retain length while still looking fabulous.

What Makes a Style Protective

A protective style keeps your ends tucked away and minimizes daily manipulation. This reduces breakage, prevents split ends, and allows your hair to retain moisture better. The key is that the style should protect your hair without causing tension or stress on your scalp.

Braids and Twists

Box braids, cornrows, and two-strand twists are classic protective styles that can last for weeks. They're versatile, low-maintenance, and give your hair a break from daily styling. Make sure they're not too tight to avoid traction alopecia.

Buns and Updos

Simple buns, chignons, and other updos are quick protective styles you can do daily. They keep your ends protected and can be dressed up or down. Use hair-friendly accessories like satin scrunchies or spiral pins to avoid breakage.

Wigs and Extensions

Wigs and extensions offer the ultimate protection by completely covering your natural hair. They allow you to experiment with different looks while your hair grows underneath. Just make sure to maintain your natural hair underneath with regular moisturizing and gentle cleansing.`,
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    views: 3400,
    likes: 234,
  },
  {
    id: 'content-5',
    title: 'Hair Growth 101',
    description: 'Essential tips for promoting healthy hair growth naturally.',
    type: 'article',
    topic: 'growth',
    hairTypes: ['curly', 'straight', 'wavy'],
    thumbnailUri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=300&fit=crop&q=80',
    articleContent: `Achieving healthy hair growth is a journey that requires patience, consistency, and the right approach. While genetics play a role, there are many things you can do to support and maximize your hair's natural growth potential.

Understanding Hair Growth Cycles

Hair grows in three distinct phases: anagen (growth), catagen (transition), and telogen (resting). Most of your hair is in the anagen phase, which can last anywhere from 2 to 7 years. Understanding these cycles helps you set realistic expectations for growth.

Nutrition and Hair Health

What you eat directly impacts your hair's health and growth rate. Protein is essential since hair is made of keratin, a protein. Iron, biotin, zinc, and vitamins A, C, D, and E all play crucial roles in supporting healthy hair growth.

Scalp Care for Growth

A healthy scalp is the foundation for healthy hair growth. Regular scalp massages can improve circulation, bringing more nutrients to hair follicles. Gentle exfoliation removes dead skin cells and product buildup that can clog follicles.

Protective Practices

Minimizing damage is just as important as promoting growth. Avoid excessive heat styling, tight hairstyles that pull on the roots, and harsh chemical treatments. When you do style, use heat protectants and opt for lower heat settings.`,
    author: 'Growth Expert',
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    views: 4500,
    likes: 312,
  },
  {
    id: 'content-6',
    title: 'Scalp Health Essentials',
    description: 'Maintain a healthy scalp for optimal hair growth.',
    type: 'article',
    topic: 'health',
    hairTypes: ['curly', 'straight', 'wavy', 'coily'],
    thumbnailUri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=300&fit=crop&q=80',
    articleContent: `Your scalp is the foundation of healthy hair. Just like healthy soil is essential for a thriving garden, a healthy scalp is crucial for strong, beautiful hair. Understanding how to care for your scalp can transform your hair's health and appearance.

The Importance of Scalp Health

A healthy scalp has the right balance of natural oils, good circulation, and a clean environment free from buildup. When your scalp is unhealthy, it can lead to issues like dandruff, itching, excessive oiliness, or dryness—all of which can affect hair growth and quality.

Common Scalp Issues

Dry scalp, oily scalp, dandruff, and product buildup are among the most common scalp concerns. Each requires a different approach. Dry scalps need gentle, moisturizing products, while oily scalps benefit from regular cleansing with balancing formulas.

Proper Cleansing Techniques

How you wash your hair matters just as much as what you use. Use lukewarm water (not hot), massage your scalp gently with your fingertips (not nails), and make sure to thoroughly rinse out all products. Over-washing can strip natural oils, while under-washing can lead to buildup.

Scalp Massage Benefits

Regular scalp massages improve blood circulation, which brings more oxygen and nutrients to hair follicles. This can help promote hair growth and reduce stress. Use your fingertips to gently massage in circular motions for 3-5 minutes daily.`,
    author: 'Health Expert',
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    views: 3200,
    likes: 198,
  },
  {
    id: 'content-7',
    title: 'Color Protection Guide',
    description: 'Keep your color vibrant with these protection tips.',
    type: 'video',
    topic: 'color',
    hairTypes: ['straight', 'wavy', 'curly'],
    thumbnailUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 10,
    author: 'Color Expert',
    articleContent: `Colored hair requires special care to maintain its vibrancy and health. Whether you've gone bold with bright colors or subtle with highlights, protecting your color investment means using the right products and techniques.

Understanding Color Fade

Hair color fades due to several factors: UV exposure, heat styling, harsh shampoos, and frequent washing. The cuticle of colored hair is more porous, making it more susceptible to damage and color loss. Understanding this helps you take the right protective measures.

Color-Safe Products

Switch to sulfate-free shampoos and color-protecting conditioners. These products are gentler on your hair and help seal the cuticle to lock in color. Look for products specifically formulated for color-treated hair, which often contain UV filters and color-preserving ingredients.

Heat Protection is Essential

Heat styling can cause color to fade faster. Always use a heat protectant spray before using any hot tools, and try to limit heat styling to special occasions. When you do style, use lower heat settings and consider air-drying when possible.

UV Protection

Just like your skin, your hair needs protection from the sun. UV rays can cause color to fade and make hair more brittle. Wear a hat when spending extended time outdoors, or use hair products with UV filters to shield your color from sun damage.`,
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    views: 2800,
    likes: 167,
  },
  {
    id: 'content-8',
    title: 'Daily Hair Care Tips',
    description: 'Simple daily routines for maintaining healthy hair.',
    type: 'article',
    topic: 'tips',
    hairTypes: ['curly', 'straight', 'wavy'],
    thumbnailUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop&q=80',
    articleContent: `Maintaining healthy hair doesn't have to be complicated. With a few simple daily habits, you can keep your hair looking its best and prevent common issues before they start.

Morning Routine

Start your day by gently detangling your hair with a wide-tooth comb or your fingers. If you have curly or wavy hair, refresh with a light mist of water and a leave-in conditioner. For all hair types, protect your hair from UV damage with a hat or UV-protectant spray when spending time outdoors.

Protective Styling

Throughout the day, avoid styles that pull too tightly on your hair. If you wear your hair up, use soft scrunchies or hair-friendly elastics. Change up your part regularly to avoid stress on the same section of hair.

Evening Care

Before bed, gently brush your hair to distribute natural oils from scalp to ends. If you have long hair, consider a loose braid or silk/satin pillowcase to reduce friction and prevent breakage while you sleep.

Weekly Maintenance

Set aside time once a week for deeper care. This might include a clarifying shampoo to remove buildup, a deep conditioning treatment, or a scalp treatment. Consistency is key—small, regular care yields better results than occasional intensive treatments.`,
    author: 'Care Expert',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    views: 1900,
    likes: 145,
  },
  {
    id: 'content-9',
    title: 'Wash Day Routine',
    description: 'Master your wash day for maximum results.',
    type: 'video',
    topic: 'care',
    hairTypes: ['curly', 'coily', 'kinky'],
    thumbnailUri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
    author: 'Routine Expert',
    articleContent: `A proper wash day routine is the foundation of healthy hair care, especially for curly, coily, and kinky hair types. Taking the time to do it right can make all the difference in your hair's health, manageability, and appearance.

Pre-Wash Preparation

Before you even step into the shower, take time to detangle your hair. Start with dry or slightly damp hair, working from ends to roots with a wide-tooth comb or your fingers. This prevents breakage and makes the washing process much smoother.

The Washing Process

Use lukewarm water and focus on your scalp. Massage gently with your fingertips in circular motions to stimulate blood flow and remove buildup. Let the shampoo run down your hair naturally—don't pile it on top of your head. Rinse thoroughly to ensure no product residue remains.

Conditioning and Detangling

Apply conditioner from mid-lengths to ends, avoiding the roots. Use this time to detangle again with a wide-tooth comb while the conditioner is in. Leave it in for at least 3-5 minutes to allow the product to penetrate and moisturize your hair.

Post-Wash Care

After rinsing, gently squeeze out excess water with a microfiber towel or cotton t-shirt (avoid regular towels that can cause frizz). Apply your leave-in conditioner and styling products while your hair is still damp to lock in moisture and define your curls.`,
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    views: 5600,
    likes: 423,
  },
  {
    id: 'content-10',
    title: 'Braids and Twists',
    description: 'Beautiful protective styles for all occasions.',
    type: 'video',
    topic: 'styling',
    hairTypes: ['curly', 'coily', 'kinky'],
    thumbnailUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=300&fit=crop&q=80',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: 20,
    author: 'Style Expert',
    articleContent: `Braids and twists are timeless protective styles that have been used for centuries to protect and style hair. These versatile techniques work beautifully for curly, coily, and kinky hair types, offering both protection and stunning aesthetics.

Types of Braids

From classic three-strand braids to intricate box braids and cornrows, there's a braid style for every occasion. French braids add elegance, while fishtail braids offer a modern twist. Box braids provide long-lasting protection and can be styled in countless ways.

Two-Strand Twists

Two-strand twists are simpler than braids but equally effective for protection. They're perfect for twist-outs, which create beautiful defined curls when unraveled. These can be done on natural hair or with extensions for added length and volume.

Maintenance and Care

Even in protective styles, your hair needs care. Keep your scalp clean and moisturized, and don't leave styles in too long—typically 6-8 weeks maximum. When removing braids or twists, be gentle and take your time to prevent breakage.

Styling Options

Braids and twists offer endless styling possibilities. You can wear them down, in updos, buns, or half-up styles. Accessorize with beads, cuffs, or scarves to personalize your look. The versatility makes them perfect for both casual and formal occasions.`,
    publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    views: 7200,
    likes: 589,
  },
];

// Mock Product Recommendations
export const mockProducts: ProductRecommendation[] = [
  {
    id: 'product-1',
    name: 'Moisturizing Shampoo',
    brand: 'HairCare Pro',
    description: 'Gentle cleansing formula with natural oils',
    imageUri: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=200&h=200&fit=crop&q=80',
    category: 'shampoo',
    link: 'https://example.com/product1',
  },
  {
    id: 'product-2',
    name: 'Deep Conditioner',
    brand: 'HairCare Pro',
    description: 'Intensive hydration for dry hair',
    imageUri: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&q=80',
    category: 'treatment',
    link: 'https://example.com/product2',
  },
];

// Mock Favorites
export const mockFavorites: Favorite[] = [
  {
    id: 'favorite-1',
    userId: 'user-1',
    contentId: 'content-1',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'favorite-2',
    userId: 'user-1',
    contentId: 'content-2',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock DIY data - in real app, this would come from API
// Using Unsplash for high-quality hair-related images
export const mockDIYs: DIY[] = [
  {
    id: 'diy-1',
    title: 'How to Braid Your Own Hair',
    description: 'Learn the basics of creating beautiful braids at home',
    thumbnailUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop&q=80',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Prepare Your Hair',
        description: 'Start with clean, detangled hair. Apply a light leave-in conditioner or styling cream to make your hair more manageable.',
        imageUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Section Your Hair',
        description: 'Divide your hair into three equal sections. Hold the left section in your left hand, the right section in your right hand, and the middle section between your fingers.',
        imageUri: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Start Braiding',
        description: 'Cross the right section over the middle, then cross the left section over the new middle. Continue this pattern, alternating sides.',
        imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Continue the Pattern',
        description: 'Keep the tension even as you braid. Make sure each section is the same size to create a uniform braid.',
        imageUri: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        title: 'Add More Hair (Optional)',
        description: 'For a French braid, add small sections of hair to each side as you braid. This creates a more intricate look.',
        imageUri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-6',
        stepNumber: 6,
        title: 'Maintain Even Tension',
        description: 'As you continue braiding, keep the tension consistent. Pull each section with the same amount of force to ensure an even braid throughout.',
        imageUri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-7',
        stepNumber: 7,
        title: 'Work Down the Length',
        description: 'Continue braiding all the way down to the ends of your hair. Keep the sections tight and even as you go.',
        imageUri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-8',
        stepNumber: 8,
        title: 'Check Your Progress',
        description: 'Periodically check your braid in a mirror to ensure it looks even and straight. Adjust tension if needed.',
        imageUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-9',
        stepNumber: 9,
        title: 'Finish the Braid',
        description: 'When you reach the end, hold all three sections together firmly to prevent the braid from unraveling.',
        imageUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-10',
        stepNumber: 10,
        title: 'Secure the End',
        description: 'Once you reach the end of your hair, secure the braid with a hair tie. For a more polished look, gently pull on the sides of the braid to make it fuller.',
        imageUri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-11',
        stepNumber: 11,
        title: 'Style the Braid',
        description: 'Gently pull on the sides of the braid to make it look fuller and more voluminous. You can also add hair accessories for extra flair.',
        imageUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-12',
        stepNumber: 12,
        title: 'Final Touches',
        description: 'Spray with a light hairspray to hold the style in place. Your beautiful braid is now complete!',
        imageUri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'diy-2',
    title: 'How to Fix a Wig',
    description: 'Essential tips for maintaining and fixing your wigs',
    thumbnailUri: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&q=80',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Inspect the Wig',
        description: 'Lay the wig on a wig stand or mannequin head. Check for any tangles, loose threads, or damaged areas that need attention.',
        imageUri: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Detangle Gently',
        description: 'Using a wide-tooth comb or wig brush, start from the ends and work your way up. Be gentle to avoid pulling out hair strands.',
        imageUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Wash if Needed',
        description: 'Fill a basin with cool water and add a small amount of wig shampoo. Gently swish the wig in the water, then rinse thoroughly with cool water.',
        imageUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Condition the Wig',
        description: 'Apply a small amount of wig conditioner, focusing on the ends. Let it sit for a few minutes, then rinse with cool water.',
        imageUri: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        title: 'Dry Properly',
        description: 'Gently pat the wig with a towel to remove excess water. Place it on a wig stand and let it air dry completely. Never use heat on synthetic wigs.',
        imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-6',
        stepNumber: 6,
        title: 'Style and Store',
        description: 'Once dry, style as desired using wig-friendly products. Store on a wig stand to maintain its shape when not in use.',
        imageUri: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-7',
        stepNumber: 7,
        title: 'Maintain the Cap',
        description: 'Check the wig cap for any tears or loose threads. Repair small issues with a needle and thread to extend the wig\'s lifespan.',
        imageUri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-8',
        stepNumber: 8,
        title: 'Final Inspection',
        description: 'Give the wig a final check to ensure it looks natural and is ready to wear. Your wig is now properly maintained!',
        imageUri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'diy-3',
    title: 'How to Create a Twist Out',
    description: 'Master the art of twist outs for defined curls',
    thumbnailUri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=300&fit=crop&q=80',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Start with Clean Hair',
        description: 'Wash and condition your hair. Apply a leave-in conditioner while your hair is still damp to lock in moisture.',
        imageUri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Apply Styling Product',
        description: 'Work a curl cream or styling gel through your hair section by section. Make sure each section is well-coated for best results.',
        imageUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Section Your Hair',
        description: 'Divide your hair into small sections. The size of the sections will determine the size of your curls - smaller sections = tighter curls.',
        imageUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Twist Each Section',
        description: 'Take two strands from each section and twist them around each other. Twist from root to end, keeping the tension even.',
        imageUri: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        title: 'Secure the Twists',
        description: 'Once twisted, secure each section with a small clip or bobby pin. This prevents the twists from unraveling while they dry.',
        imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-6',
        stepNumber: 6,
        title: 'Let It Dry',
        description: 'Allow your twists to air dry completely or use a hooded dryer. This can take several hours, so plan accordingly.',
        imageUri: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-7',
        stepNumber: 7,
        title: 'Untwist and Separate',
        description: 'Once completely dry, carefully untwist each section. Gently separate the curls with your fingers for volume and definition.',
        imageUri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-8',
        stepNumber: 8,
        title: 'Fluff and Style',
        description: 'Flip your head upside down and gently shake your roots for volume. Style as desired and enjoy your beautiful twist out!',
        imageUri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-9',
        stepNumber: 9,
        title: 'Add Finishing Products',
        description: 'Apply a light oil or serum to add shine and reduce frizz. Your twist out is now complete and ready to show off!',
        imageUri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=600&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'diy-4',
    title: 'How to Style Curly Hair',
    description: 'Learn techniques for beautiful, defined curls',
    thumbnailUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&q=80',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Start with Wet Hair',
        description: 'Begin styling on freshly washed, wet hair. This is when your curls are most pliable and will hold the style best.',
        imageUri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Apply Leave-In Conditioner',
        description: 'Work a generous amount of leave-in conditioner through your hair, focusing on the ends where curls tend to be driest.',
        imageUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Add Curl Cream',
        description: 'Apply a curl-defining cream section by section. Use the praying hands method to distribute the product evenly.',
        imageUri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Scrunch Your Hair',
        description: 'Gently scrunch your hair from the ends upward to encourage curl formation. This helps create defined, bouncy curls.',
        imageUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        title: 'Diffuse or Air Dry',
        description: 'Use a diffuser attachment on low heat to dry your hair, or let it air dry naturally. Avoid touching your hair while it dries.',
        imageUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-6',
        stepNumber: 6,
        title: 'Fluff and Separate',
        description: 'Once dry, gently fluff your roots and separate any curls that have clumped together for a fuller, more voluminous look.',
        imageUri: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=600&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'diy-5',
    title: 'How to Create Bantu Knots',
    description: 'Step-by-step guide to perfect Bantu knots',
    thumbnailUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop&q=80',
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: 'Prepare Your Hair',
        description: 'Start with clean, moisturized hair. Apply a styling cream or gel to help hold the knots and define your curls.',
        imageUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: 'Section Your Hair',
        description: 'Divide your hair into small, even sections. The size will determine the size of your curls - smaller sections create tighter curls.',
        imageUri: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: 'Twist Each Section',
        description: 'Take each section and twist it tightly from root to end. Make sure the twist is even and smooth throughout.',
        imageUri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        title: 'Wrap into a Knot',
        description: 'Wrap the twisted section around itself to form a small knot at the base. Secure with a bobby pin or small hair tie.',
        imageUri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        title: 'Repeat for All Sections',
        description: 'Continue creating knots throughout your entire head. Make sure all knots are similar in size for a uniform look.',
        imageUri: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-6',
        stepNumber: 6,
        title: 'Let It Set',
        description: 'Leave the knots in overnight or for at least 6-8 hours. You can cover with a satin scarf to protect your style.',
        imageUri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-7',
        stepNumber: 7,
        title: 'Unravel the Knots',
        description: 'Carefully remove the pins and unravel each knot. Gently separate the curls with your fingers for volume.',
        imageUri: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=600&fit=crop&q=80',
      },
      {
        id: 'step-8',
        stepNumber: 8,
        title: 'Style and Finish',
        description: 'Fluff your hair and style as desired. Your beautiful Bantu knot-out is complete!',
        imageUri: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=600&fit=crop&q=80',
      },
    ],
  },
];

// Mock Monthly Hairstyles
export const mockMonthlyHairstyles: MonthlyHairstyle[] = [
  {
    id: 'hairstyle-1',
    month: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
    userId: 'user-1',
    photoUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop&q=80',
    thumbnailUri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=150&fit=crop&q=80',
    notes: 'Curly bob with highlights',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

