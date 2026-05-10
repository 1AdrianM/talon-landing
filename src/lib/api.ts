// Talon API Client - Lightweight abstraction for demo endpoints
// No authentication required - uses internal demo backend

const DEMO_URL = import.meta.env.PUBLIC_DEMO_URL || 'https://api-talon.fly.dev/demo';
const API_URL = import.meta.env.PUBLIC_DEMO_URL?.replace('/demo', '') || 'https://api-talon.fly.dev';
const DEMO_API_KEY = import.meta.env.PUBLIC_DEMO_KEY || 'demo_test_2024';

// Rate limiting - simple client-side tracking
let requestCount = 0;
const MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
let windowStart = Date.now();

export interface TrackProductRequest {
  url: string;
  selector: string;
}

export interface TrackProductResponse {
  id: string;
  url: string;
  selector: string;
}

export interface ProductPriceResponse {
  price: number;
  previous: number | null;
  changed: boolean;
  changeType: 'price_drop' | 'price_increase' | null;
  lastChecked: string;
  firstScrape: boolean;
  message: string | null;
}

export interface TrackedItem {
  id: string;
  url: string;
  selector: string;
  price: number;
  previous: number | null;
  changed: boolean;
  changeType: 'price_drop' | 'price_increase' | null;
  lastChecked: string;
  timestamp: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError; errorType: 'validation' | 'not_found' | 'rate_limit' | 'network' | 'unknown' };

// Check and reset rate limit window
function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - windowStart > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    windowStart = now;
  }
  return requestCount < MAX_REQUESTS;
}

function incrementRequestCount() {
  requestCount++;
}

// Create product tracker
export async function trackProduct({ url, selector }: TrackProductRequest): Promise<ApiResult<TrackProductResponse>> {
  if (!checkRateLimit()) {
    return {
      success: false,
      error: {
        statusCode: 429,
        message: 'Demo rate limit exceeded. Try again in a minute.',
        error: 'Rate Limit Exceeded'
      },
      errorType: 'rate_limit'
    };
  }

  try {
    const response = await fetch(`${DEMO_URL}/track-product`, {
      method: 'POST',
      headers: {
        'x-api-key': DEMO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, selector })
    });

    incrementRequestCount();

    const data = await response.json();

    if (!response.ok) {
      const errorType = response.status === 400 ? 'validation' :
                       response.status === 429 ? 'rate_limit' : 'unknown';
      return {
        success: false,
        error: data as ApiError,
        errorType
      };
    }

    return {
      success: true,
      data: data as TrackProductResponse
    };
  } catch (err) {
    return {
      success: false,
      error: {
        statusCode: 0,
        message: err instanceof Error ? err.message : 'Network error',
        error: 'Network Error'
      },
      errorType: 'network'
    };
  }
}

// Get product price data
export async function getProductPrice(productId: string): Promise<ApiResult<ProductPriceResponse>> {
  if (!checkRateLimit()) {
    return {
      success: false,
      error: {
        statusCode: 429,
        message: 'Demo rate limit exceeded. Try again in a minute.',
        error: 'Rate Limit Exceeded'
      },
      errorType: 'rate_limit'
    };
  }

  try {
    const response = await fetch(`${API_URL}/products/product/${productId}`, {
      method: 'GET',
      headers: {
        'x-api-key': DEMO_API_KEY
      }
    });

    incrementRequestCount();

    const data = await response.json();

    if (!response.ok) {
      const errorType = response.status === 404 ? 'not_found' :
                       response.status === 429 ? 'rate_limit' : 'unknown';
      return {
        success: false,
        error: data as ApiError,
        errorType
      };
    }

    return {
      success: true,
      data: data as ProductPriceResponse
    };
  } catch (err) {
    return {
      success: false,
      error: {
        statusCode: 0,
        message: err instanceof Error ? err.message : 'Network error',
        error: 'Network Error'
      },
      errorType: 'network'
    };
  }
}

// Combined function: track and fetch in one call
export async function trackAndFetch({ url, selector }: TrackProductRequest): Promise<ApiResult<TrackedItem>> {
  // Step 1: Create tracker
  const trackResult = await trackProduct({ url, selector });

  if (!trackResult.success) {
    return trackResult as ApiResult<TrackedItem>;
  }

  const { id, url: trackedUrl, selector: trackedSelector } = trackResult.data;

  // Step 2: Fetch price (with retry logic for first scrape)
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const priceResult = await getProductPrice(id);

    if (!priceResult.success) {
      // Don't retry on certain errors
      if (priceResult.errorType === 'rate_limit' || priceResult.errorType === 'not_found') {
        return priceResult as ApiResult<TrackedItem>;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        return priceResult as ApiResult<TrackedItem>;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }

    const priceData = priceResult.data;

    // If first scrape, wait and retry
    if (priceData.firstScrape && attempts < maxAttempts - 1) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    // Success - return combined data
    const trackedItem: TrackedItem = {
      id,
      url: trackedUrl,
      selector: trackedSelector,
      price: priceData.price,
      previous: priceData.previous,
      changed: priceData.changed,
      changeType: priceData.changeType,
      lastChecked: priceData.lastChecked,
      timestamp: Date.now()
    };

    return {
      success: true,
      data: trackedItem
    };
  }

  return {
    success: false,
    error: {
      statusCode: 500,
      message: 'Failed to fetch price after multiple attempts',
      error: 'Fetch Failed'
    },
    errorType: 'unknown'
  };
}

// Refresh existing tracked item
export async function refreshTrackedItem(item: TrackedItem): Promise<ApiResult<TrackedItem>> {
  const result = await trackAndFetch({ url: item.url, selector: item.selector });

  if (result.success) {
    // Preserve the original ID for continuity in the dashboard
    result.data.id = item.id;
  }

  return result;
}

// localStorage helpers for mini-dashboard
const STORAGE_KEY = 'talon_recent_tracks';
const MAX_STORED_ITEMS = 5;

export function saveToRecent(trackedItem: TrackedItem): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getRecentTracks();

    // Remove duplicates (by URL)
    const filtered = existing.filter(item => item.url !== trackedItem.url);

    // Add new item at the beginning
    const updated = [trackedItem, ...filtered].slice(0, MAX_STORED_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

export function getRecentTracks(): TrackedItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearRecentTracks(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function removeRecentTrack(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getRecentTracks();
    const updated = existing.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

// Helper to truncate URL for display
export function truncateUrl(url: string, maxLength: number = 40): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const path = urlObj.pathname;
    const full = hostname + path;

    if (full.length <= maxLength) return full;
    return full.slice(0, maxLength - 3) + '...';
  } catch {
    return url.length > maxLength ? url.slice(0, maxLength - 3) + '...' : url;
  }
}

// Format price with currency
export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price);
}

// Format timestamp
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}
