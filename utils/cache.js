// cache.js
const cache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds
const MAX_CACHE_SIZE = 1000; // Limit cache to 1000 entries

// Clean expired cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, { timestamp }] of cache) {
    if (now - timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Invalidate cache
const invalidateCache = () => {
  cache.clear();
};

module.exports = { cache, MAX_CACHE_SIZE, CACHE_DURATION, invalidateCache };