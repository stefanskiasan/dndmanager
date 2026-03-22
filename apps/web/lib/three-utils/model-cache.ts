/**
 * Model cache eviction utility.
 * Tracks loaded model URLs and evicts models that have been off-screen
 * for longer than EVICTION_TIMEOUT to prevent memory bloat.
 */

const loadedModels = new Map<string, { lastVisible: number }>()
const EVICTION_TIMEOUT = 60_000 // 60 seconds

/**
 * Mark a model URL as currently visible. Resets the eviction timer.
 */
export function markModelVisible(url: string): void {
  loadedModels.set(url, { lastVisible: Date.now() })
}

/**
 * Returns model URLs that have been off-screen for longer than EVICTION_TIMEOUT.
 * Call this periodically (e.g. every 10s) and pass results to useGLTF.clear().
 */
export function getStaleModels(): string[] {
  const now = Date.now()
  const stale: string[] = []

  loadedModels.forEach(({ lastVisible }, url) => {
    if (now - lastVisible > EVICTION_TIMEOUT) {
      stale.push(url)
    }
  })

  return stale
}

/**
 * Remove entries from the tracking map after they've been evicted.
 */
export function removeFromCache(urls: string[]): void {
  urls.forEach((url) => loadedModels.delete(url))
}

/**
 * Evicts stale models and returns the URLs that were evicted.
 * Caller is responsible for calling useGLTF.clear() on returned URLs.
 */
export function evictStaleModels(): string[] {
  const stale = getStaleModels()
  removeFromCache(stale)
  return stale
}

/**
 * Returns the number of tracked models (for testing/monitoring).
 */
export function getTrackedModelCount(): number {
  return loadedModels.size
}

/**
 * Clears all tracked models (for testing).
 */
export function clearCache(): void {
  loadedModels.clear()
}
