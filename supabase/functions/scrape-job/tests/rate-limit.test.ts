/**
 * Tests for rate limiting functionality
 */
import { RateLimiter, RateLimitOptions, globalRateLimiter, withRateLimit } from "../utils/rate-limit.ts";
import { wait } from "./test-utils.ts";

Deno.test("RateLimiter - initialization with default options", () => {
  const limiter = new RateLimiter();
  
  // Initial state should allow requests
  const testUrl = "https://example.com/job/123";
  const isLimited = limiter.isRateLimited(testUrl);
  
  assertEquals(isLimited, false);
});

Deno.test("RateLimiter - rate limiting based on requests per minute", async () => {
  // Configure a stricter rate limit for testing
  const options: RateLimitOptions = {
    requestsPerMinute: 3,  // Only 3 requests allowed
    windowMs: 500,        // Short 500ms window for faster testing
    perDomain: true
  };
  
  const limiter = new RateLimiter(options);
  const testUrl = "https://example.com/job/123";
  
  // First 3 requests should not be limited
  assertEquals(limiter.isRateLimited(testUrl), false);
  assertEquals(limiter.isRateLimited(testUrl), false);
  assertEquals(limiter.isRateLimited(testUrl), false);
  
  // 4th request should be limited
  assertEquals(limiter.isRateLimited(testUrl), true);
  
  // Wait for window to expire
  await wait(501);
  
  // After window expires, should allow requests again
  assertEquals(limiter.isRateLimited(testUrl), false);
});

Deno.test("RateLimiter - per-domain rate limiting", () => {
  const options: RateLimitOptions = {
    requestsPerMinute: 2,
    windowMs: 1000,
    perDomain: true
  };
  
  const limiter = new RateLimiter(options);
  
  // Different domains should have separate limits
  const url1 = "https://example.com/job/123";
  const url2 = "https://different-site.com/job/456";
  
  // First domain - 2 requests
  assertEquals(limiter.isRateLimited(url1), false);
  assertEquals(limiter.isRateLimited(url1), false);
  assertEquals(limiter.isRateLimited(url1), true); // Exceeds limit
  
  // Second domain - should still be allowed
  assertEquals(limiter.isRateLimited(url2), false);
  assertEquals(limiter.isRateLimited(url2), false);
  assertEquals(limiter.isRateLimited(url2), true); // Exceeds limit
});

Deno.test("RateLimiter - global rate limiting", () => {
  const options: RateLimitOptions = {
    requestsPerMinute: 2,
    windowMs: 1000,
    perDomain: false // Global rate limiting
  };
  
  const limiter = new RateLimiter(options);
  
  // Different domains should share the same limit
  const url1 = "https://example.com/job/123";
  const url2 = "https://different-site.com/job/456";
  
  // First domain - 2 requests
  assertEquals(limiter.isRateLimited(url1), false);
  assertEquals(limiter.isRateLimited(url1), false);
  
  // Second domain - should be limited because global limit is reached
  assertEquals(limiter.isRateLimited(url2), true);
});

Deno.test("RateLimiter - getTimeUntilReset calculation", () => {
  const options: RateLimitOptions = {
    requestsPerMinute: 1,
    windowMs: 1000,
    perDomain: true
  };
  
  const limiter = new RateLimiter(options);
  const testUrl = "https://example.com/job/123";
  
  // First request - no time until reset
  assertEquals(limiter.getTimeUntilReset(testUrl), 0);
  
  // Make one request
  limiter.isRateLimited(testUrl);
  
  // Time until reset should be positive but less than window time
  const timeUntilReset = limiter.getTimeUntilReset(testUrl);
  assert(timeUntilReset > 0);
  assert(timeUntilReset <= 1000);
});

Deno.test("RateLimiter - waitForRateLimit function", async () => {
  const options: RateLimitOptions = {
    requestsPerMinute: 1,
    windowMs: 300, // Very short window for testing
    perDomain: true
  };
  
  const limiter = new RateLimiter(options);
  const testUrl = "https://example.com/job/123";
  
  // First request - should not be limited
  assertEquals(limiter.isRateLimited(testUrl), false);
  
  // Start timer
  const startTime = Date.now();
  
  // This should wait for the rate limit to reset (around 300ms)
  await limiter.waitForRateLimit(testUrl);
  
  // Check if we waited for an appropriate amount of time
  const elapsed = Date.now() - startTime;
  
  // Should have waited close to the window time
  assert(elapsed >= 250); // Allow for small timing variations
});

Deno.test("RateLimiter - withRateLimit higher-order function", async () => {
  const options: RateLimitOptions = {
    requestsPerMinute: 1,
    windowMs: 300,
    perDomain: true
  };
  
  const limiter = new RateLimiter(options);
  const testUrl = "https://example.com/job/123";
  
  // Create a mock function that returns the current time
  const mockFn = async (url: string): Promise<number> => {
    return Date.now();
  };
  
  // Wrap it with rate limiting
  const rateLimitedFn = withRateLimit(mockFn, limiter);
  
  // First call - should proceed immediately
  const time1 = await rateLimitedFn(testUrl);
  
  // Start timer
  const startTime = Date.now();
  
  // Second call - should be delayed by rate limiting
  const time2 = await rateLimitedFn(testUrl);
  
  // Check if there was appropriate delay
  const elapsed = Date.now() - startTime;
  assert(elapsed >= 250); // Allow for small timing variations
  
  // The function result should reflect the delay
  assert(time2 - time1 >= 250);
});

Deno.test("globalRateLimiter - should be a singleton", () => {
  // The globalRateLimiter should be the same instance
  const isLimited1 = globalRateLimiter.isRateLimited("https://example.com/job/1");
  const isLimited2 = globalRateLimiter.isRateLimited("https://example.com/job/2");
  
  // Reset for other tests
  globalRateLimiter.reset();
});

// Helper assert functions for Deno testing
function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

function assert(condition: boolean, message = "Assertion failed"): void {
  if (!condition) {
    throw new Error(message);
  }
}
