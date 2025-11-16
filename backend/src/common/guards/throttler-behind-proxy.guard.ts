import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

/**
 * Custom throttler guard that works correctly behind proxies (like nginx, load balancers)
 * It extracts the real client IP from X-Forwarded-For or X-Real-IP headers
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Check for proxied IP first
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one (client)
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    // Fall back to direct connection IP
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
}

