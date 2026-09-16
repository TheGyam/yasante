import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedMutation {
  id: string; // Client UUID
  type: string; // 'toggleFavorite', 'createGoal', etc.
  params: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  ttl: number; // Expiration timestamp
}

interface OfflineQueueOptions {
  maxQueueSize?: number;
  defaultTTL?: number;
  defaultMaxRetries?: number;
}

/**
 * Offline queue for mutations with idempotency, ordering, and retry policies
 * - Preserves mutation ordering (FIFO)
 * - De-duplicates mutations (same type + params)
 * - Supports idempotent toggles (favorites, likes)
 * - Limits queue size and TTL
 * - Alerts user on repeated failures
 */
class OfflineQueue {
  private queue: QueuedMutation[] = [];
  private maxQueueSize: number;
  private defaultTTL: number;
  private defaultMaxRetries: number;
  private processing = false;
  private alertCallback?: (mutation: QueuedMutation) => void;

  constructor(options: OfflineQueueOptions = {}) {
    this.maxQueueSize = options.maxQueueSize || 100;
    this.defaultTTL = options.defaultTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.defaultMaxRetries = options.defaultMaxRetries || 3;
  }

  /**
   * Set callback for alerting user about failed mutations
   */
  setAlertCallback(callback: (mutation: QueuedMutation) => void) {
    this.alertCallback = callback;
  }

  /**
   * Generate client UUID for idempotency
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add mutation to queue
   */
  async enqueue(
    type: string,
    params: any,
    options?: {
      maxRetries?: number;
      ttl?: number;
    }
  ): Promise<string> {
    const id = this.generateId();
    const mutation: QueuedMutation = {
      id,
      type,
      params,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options?.maxRetries || this.defaultMaxRetries,
      ttl: Date.now() + (options?.ttl || this.defaultTTL),
    };

    // Check for duplicates (same type + params) - update existing instead
    const duplicateIndex = this.queue.findIndex(
      m => m.type === type && JSON.stringify(m.params) === JSON.stringify(params)
    );
    if (duplicateIndex >= 0) {
      // Update existing mutation timestamp (move to end of queue)
      const existing = this.queue[duplicateIndex];
      existing.timestamp = Date.now();
      existing.retryCount = 0; // Reset retry count for updated mutation
      // Move to end (FIFO - most recent version at end)
      this.queue.splice(duplicateIndex, 1);
      this.queue.push(existing);
      await this.persist();
      return existing.id;
    }

    // Check queue size limit
    if (this.queue.length >= this.maxQueueSize) {
      // Remove oldest mutation
      const removed = this.queue.shift();
      if (__DEV__ && removed) {
        console.warn(`Offline queue full, removing oldest mutation: ${removed.type}`);
      }
    }

    this.queue.push(mutation);
    await this.persist();
    return id;
  }

  /**
   * Process queue when online
   */
  async processQueue(apiCall: (type: string, params: any) => Promise<any>): Promise<void> {
    if (this.processing) {
      if (__DEV__) {
        console.log('Queue processing already in progress');
      }
      return;
    }
    this.processing = true;

    try {
      // Remove expired mutations
      const now = Date.now();
      const expiredCount = this.queue.length;
      this.queue = this.queue.filter(m => m.ttl > now);
      if (__DEV__ && this.queue.length < expiredCount) {
        console.log(`Removed ${expiredCount - this.queue.length} expired mutations`);
      }

      // Process mutations in order (FIFO)
      while (this.queue.length > 0) {
        const mutation = this.queue[0];

        // Skip if max retries exceeded
        if (mutation.retryCount >= mutation.maxRetries) {
          this.queue.shift();
          await this.persist();
          // Alert user about failed mutation
          this.alertFailedMutation(mutation);
          continue;
        }

        try {
          await apiCall(mutation.type, mutation.params);
          // Success - remove from queue
          this.queue.shift();
          await this.persist();
          if (__DEV__) {
            console.log(`✅ Processed queued mutation: ${mutation.type}`);
          }
        } catch (error) {
          // Increment retry count
          mutation.retryCount += 1;
          await this.persist();

          if (__DEV__) {
            console.warn(
              `❌ Failed to process mutation ${mutation.type} (attempt ${mutation.retryCount}/${mutation.maxRetries}):`,
              error
            );
          }

          // Exponential backoff before next retry
          const backoff = Math.min(1000 * Math.pow(2, mutation.retryCount), 30000);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Persist queue to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to persist offline queue:', error);
      }
    }
  }

  /**
   * Restore queue from AsyncStorage
   */
  async restore(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        // Remove expired mutations
        const now = Date.now();
        const beforeCount = this.queue.length;
        this.queue = this.queue.filter(m => m.ttl > now);
        if (this.queue.length < beforeCount) {
          await this.persist();
        }
        if (__DEV__) {
          console.log(`Restored ${this.queue.length} queued mutations`);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to restore offline queue:', error);
      }
      this.queue = [];
    }
  }

  /**
   * Alert user about failed mutation
   */
  private alertFailedMutation(mutation: QueuedMutation): void {
    if (__DEV__) {
      console.warn(`Failed to sync ${mutation.type} after ${mutation.maxRetries} attempts`);
    }
    // Call alert callback if set
    if (this.alertCallback) {
      this.alertCallback(mutation);
    }
  }

  /**
   * Get queue size
   */
  getSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      size: this.queue.length,
      processing: this.processing,
      mutations: this.queue.map(m => ({
        type: m.type,
        retryCount: m.retryCount,
        maxRetries: m.maxRetries,
      })),
    };
  }
}

export const offlineQueue = new OfflineQueue();
