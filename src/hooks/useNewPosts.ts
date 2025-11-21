import { useState, useEffect, useRef } from 'react';
import { useInfiniteContent } from '@/api/hooks/useContent';
import { Content } from '@/types/education';

interface UseNewPostsOptions {
  pollInterval?: number; // in milliseconds, default 15 seconds
  enabled?: boolean;
}

export function useNewPosts(options: UseNewPostsOptions = {}) {
  const { pollInterval = 15000, enabled = true } = options;
  const [newPosts, setNewPosts] = useState<Content[]>([]);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const lastCheckedTimestamp = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get the first page to check for new posts
  const { data: firstPageData } = useInfiniteContent();
  
  useEffect(() => {
    if (!enabled || !firstPageData?.pages?.[0]?.data) return;
    
    const checkForNewPosts = () => {
      const firstPage = firstPageData.pages[0];
      if (!firstPage?.data || firstPage.data.length === 0) return;
      
      // Get the most recent post's publishedAt
      const mostRecentPost = firstPage.data[0];
      const currentTimestamp = mostRecentPost.publishedAt;
      
      // If we haven't checked before, just store the timestamp
      if (!lastCheckedTimestamp.current) {
        lastCheckedTimestamp.current = currentTimestamp;
        return;
      }
      
      // Check if there are posts newer than our last check
      // In a real app, you'd make an API call to check for new posts
      // For now, we'll simulate by checking if the first post changed
      if (currentTimestamp > lastCheckedTimestamp.current) {
        // New posts detected - in real app, fetch them from API
        // For now, we'll just set the flag
        setHasNewPosts(true);
      }
    };
    
    // Initial check
    checkForNewPosts();
    
    // Set up polling
    pollIntervalRef.current = setInterval(checkForNewPosts, pollInterval);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enabled, firstPageData, pollInterval]);
  
  const mergeNewPosts = () => {
    // When user taps banner, merge new posts into feed
    // This would typically prepend newPosts to the existing feed
    setNewPosts([]);
    setHasNewPosts(false);
    if (firstPageData?.pages?.[0]?.data?.[0]) {
      lastCheckedTimestamp.current = firstPageData.pages[0].data[0].publishedAt;
    }
  };
  
  return {
    newPosts,
    hasNewPosts,
    mergeNewPosts,
  };
}

