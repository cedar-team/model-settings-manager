// Simple in-memory cache service for model settings data
class CacheService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes TTL for fallback

  // Set cache with key
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Get cache by key
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Optional: Check TTL (not used for main data, only for fallback safety)
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // Check if key exists in cache
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // Clear specific cache key
  clear(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
  }

  // Get cache info for debugging
  getInfo(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Cache keys
export const CACHE_KEYS = {
  MODEL_SETTINGS: 'model_settings',
  MODEL_SETTING_DETAIL: (name: string) => `model_setting_detail_${name}`,
  TEAM_MAPPING: 'team_mapping'
} as const;