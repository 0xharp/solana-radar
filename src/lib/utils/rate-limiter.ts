import { RATE_LIMITS } from '@/lib/config';

export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestInWindow) + 100;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.timestamps.push(now);
  }
}

export const githubLimiter = new RateLimiter(RATE_LIMITS.github.maxRequests, RATE_LIMITS.github.windowMs);
export const heliusLimiter = new RateLimiter(RATE_LIMITS.helius.maxRequests, RATE_LIMITS.helius.windowMs);
export const coingeckoLimiter = new RateLimiter(RATE_LIMITS.coingecko.maxRequests, RATE_LIMITS.coingecko.windowMs);
export const defillamaLimiter = new RateLimiter(RATE_LIMITS.defillama.maxRequests, RATE_LIMITS.defillama.windowMs);
