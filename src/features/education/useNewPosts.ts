import { useState, useEffect, useRef } from 'react';
import { useInfiniteContent } from '@/features/education';
import { useAppStatePolling } from '@/shared/hooks/useAppStatePolling';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { Content } from '@/features/education';
import { api } from '@/api';

interface UseNewPostsOptions {
  pollInterval?: number; // in milliseconds, default 30 seconds
  enabled?: boolean;
}

export function useNewPosts(options: UseNewPostsOptions = {}) {
  const { pollInterval = 30000, enabled = true } = options;
  const [newPosts, setNewPosts] = useState<Content[]>([]);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const lastCheckedTimestamp = useRef<string | null>(null);
  
  // Get the first page to check for new posts
  const { data: firstPageData, refetch } = useInfiniteContent();
  const { isOffline } = useNetworkStatus();
  
  // Check for new posts using dedicated endpoint if available, or by comparing timestamps
  const checkForNewPosts = async () => {
    if (isOffline) return;
    
    try {
      // Try to use dedicated new-posts endpoint if available
      // For now, we'll check by comparing the first post's timestamp
      const firstPage = firstPageData?.pages?.[0];
      if (!firstPage?.data || firstPage.data.length === 0) {
        // Initialize timestamp if we haven't checked before
        if (!lastCheckedTimestamp.current && firstPage?.data?.[0]) {
          lastCheckedTimestamp.current = firstPage.data[0].publishedAt;
        }
        return;
      }
      
      const mostRecentPost = firstPage.data[0];
      const currentTimestamp = mostRecentPost.publishedAt;
      
      // If we haven't checked before, just store the timestamp
      if (!lastCheckedTimestamp.current) {
        lastCheckedTimestamp.current = currentTimestamp;
        return;
      }
      
      // Check if there are posts newer than our last check
      if (currentTimestamp > lastCheckedTimestamp.current) {
        // Fetch new posts from API
        try {
          // Use search or getAll with a cursor to get posts after lastCheckedTimestamp
          const response = await api.content.getAll({
            cursor: lastCheckedTimestamp.current,
            limit: 20,
          });
          
          if (response.data && response.data.length > 0) {
            setNewPosts(response.data);
            setNewPostsCount(response.data.length);
            setHasNewPosts(true);
          }
        } catch (error) {
          // Fallback: just set flag if API call fails
          if (__DEV__) {
            console.warn('Failed to fetch new posts:', error);
          }
          setHasNewPosts(true);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking for new posts:', error);
      }
    }
  };
  
  // Use AppState-aware polling instead of setInterval
  useAppStatePolling(checkForNewPosts, pollInterval, {
    enabled: enabled && !isOffline,
  });
  
  // Also check when feed data changes
  useEffect(() => {
    if (enabled && !isOffline && firstPageData?.pages?.[0]?.data) {
      checkForNewPosts();
    }
  }, [enabled, isOffline, firstPageData?.pages?.[0]?.data?.[0]?.publishedAt]);
  
  const mergeNewPosts = async () => {
    // When user taps banner, merge new posts into feed
    // Refetch the feed to get latest data
    await refetch();
    
    setNewPosts([]);
    setHasNewPosts(false);
    setNewPostsCount(0);
    
    if (firstPageData?.pages?.[0]?.data?.[0]) {
      lastCheckedTimestamp.current = firstPageData.pages[0].data[0].publishedAt;
    }
  };
  
  return {
    newPosts,
    hasNewPosts,
    newPostsCount,
    mergeNewPosts,
  };
}

