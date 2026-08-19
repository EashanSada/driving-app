import crypto from 'crypto';

// In-memory sliding window rate-limiter store
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface SecurityCheckResult {
  allowed: boolean;
  statusCode?: number;
  message?: string;
  clientIp?: string;
}

/**
 * Applies strict HTTP security headers to serverless response
 */
export function applySecurityHeaders(res: any) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-key, x-auth-token, Authorization');
}

/**
 * Extracts real client IP address safely
 */
export function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
}

/**
 * Checks for known malicious scanner and scraper user agents
 */
export function isMaliciousUserAgent(req: any): boolean {
  const userAgent = (req.headers?.['user-agent'] || '').toLowerCase();
  const blockedSignatures = [
    'sqlmap',
    'nikto',
    'acunetix',
    'nmap',
    'masscan',
    'zgrab',
    'dirbuster',
    'gobuster',
    'wpscan',
    'havij'
  ];

  return blockedSignatures.some(sig => userAgent.includes(sig));
}

/**
 * Sliding-window Rate Limiter
 * @param req Request
 * @param endpointKey Identifier (e.g. 'ai-coach', 'accounts')
 * @param maxRequests Maximum requests allowed per window
 * @param windowMs Window duration in milliseconds (default 60s)
 */
export function enforceRateLimit(
  req: any,
  endpointKey: string,
  maxRequests: number = 60,
  windowMs: number = 60 * 1000
): SecurityCheckResult {
  const ip = getClientIp(req);
  const now = Date.now();
  const key = `${endpointKey}:${ip}`;

  // Check scanner signature
  if (isMaliciousUserAgent(req)) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Access Forbidden: Malicious agent detected.',
      clientIp: ip
    };
  }

  let record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimitStore.set(key, record);
    return { allowed: true, clientIp: ip };
  }

  record.count += 1;

  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      statusCode: 429,
      message: `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`,
      clientIp: ip
    };
  }

  return { allowed: true, clientIp: ip };
}

/**
 * Sanitizes plain string input to prevent XSS and injection
 */
export function sanitizeString(input: unknown, maxLength: number = 250): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip control characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and sanitizes GPS coordinates
 */
export function sanitizeCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const nLat = Number(lat);
  const nLng = Number(lng);

  if (isNaN(nLat) || isNaN(nLng)) return null;
  if (nLat < -90 || nLat > 90) return null;
  if (nLng < -180 || nLng > 180) return null;

  return {
    lat: parseFloat(nLat.toFixed(6)),
    lng: parseFloat(nLng.toFixed(6))
  };
}

/**
 * Masks Sensitive Personally Identifiable Information (PII) for public queries
 */
export function maskPiiAccount(account: any): any {
  if (!account || typeof account !== 'object') return account;

  const sanitized = { ...account };

  // Mask phone number (e.g. (***) ***-1234)
  if (typeof sanitized.phone === 'string' && sanitized.phone.length > 4) {
    sanitized.phone = sanitized.phone.slice(-4).padStart(sanitized.phone.length, '*');
  }

  // Mask parent phone
  if (typeof sanitized.parent_phone === 'string' && sanitized.parent_phone.length > 4) {
    sanitized.parent_phone = sanitized.parent_phone.slice(-4).padStart(sanitized.parent_phone.length, '*');
  }

  // Mask email addresses (e.g. j***@gmail.com)
  if (typeof sanitized.email === 'string' && sanitized.email.includes('@')) {
    const [name, domain] = sanitized.email.split('@');
    sanitized.email = `${name.charAt(0)}***@${domain}`;
  }

  if (typeof sanitized.parent_email === 'string' && sanitized.parent_email.includes('@')) {
    const [name, domain] = sanitized.parent_email.split('@');
    sanitized.parent_email = `${name.charAt(0)}***@${domain}`;
  }

  return sanitized;
}

/**
 * Generates a Cryptographically Secure High-Entropy Token (CSPRNG)
 */
export function generateSecureEntropyToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Computes HMAC-SHA256 Hash for Anti-Tamper Telemetry Verification
 */
export function computeHmacSignature(payload: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}
