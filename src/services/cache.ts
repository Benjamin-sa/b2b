// src/services/cache.ts

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * A simple, generic, time-based cache.
 */
export class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultDuration: number;

  constructor(defaultDurationMs: number = 5 * 60 * 1000) { // Default 5 minutes
    this.defaultDuration = defaultDurationMs;
  }

  /**
   * Generates a consistent key from an object.
   */
  generateKey(obj: object): string {
    return JSON.stringify(obj);
  }

  /**
   * Retrieves an entry from the cache if it's not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data as T;
    }
    // Entry is expired or doesn't exist, remove it.
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Adds or updates an entry in the cache.
   */
  set<T>(key: string, data: T, durationMs?: number): void {
    const expiresAt = Date.now() + (durationMs ?? this.defaultDuration);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Invalidates (removes) one or all entries from the cache.
   */
  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Create a singleton instance to be used across the app
export const appCache = new SimpleCache();