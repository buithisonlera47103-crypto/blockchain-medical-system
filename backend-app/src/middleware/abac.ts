import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import { auditService } from '../services/AuditService';
import { logger } from '../utils/logger';

const usedEmergencyNonces: Map<string, number> = new Map();
const cleanupUsedNonces = (): void => {
  const now = Date.now();
  for (const [k, exp] of usedEmergencyNonces.entries()) if (exp <= now) usedEmergencyNonces.delete(k);
};

//  
const emergencyRate: Map<string, { count: number; resetAt: number }> = new Map();
const cleanupEmergencyRate = (): void => {
  const now = Date.now();
  for (const [k, v] of emergencyRate.entries()) if (v.resetAt <= now) emergencyRate.delete(k);
};
function checkEmergencyRate(ip: string, route: string): { ok: boolean; remaining: number; resetAt: number } {
  const windowSec = Math.max(1, parseInt(process.env.ABAC_EMERGENCY_RL_WINDOW_SEC ?? '60'));
  const max = Math.max(1, parseInt(process.env.ABAC_EMERGENCY_RL_MAX ?? '5'));
  const key = `${ip}|${route}`;
  cleanupEmergencyRate();
  const now = Date.now();
  const cur = emergencyRate.get(key);
  if (!cur || cur.resetAt <= now) {
    emergencyRate.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: Math.max(0, max - 1), resetAt: now + windowSec * 1000 };
  }
  if (cur.count >= max) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt };
  }
  cur.count += 1;
  emergencyRate.set(key, cur);
  return { ok: true, remaining: Math.max(0, max - cur.count), resetAt: cur.resetAt };
}

interface AbacOptions {
  policyName?: string;
  allowEmergencyOverride?: boolean;
}

function parseTimeWindow(spec: string | undefined): { start: number; end: number } | null {
  if (!spec) return null;
  const re = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;
  const m = re.exec(spec);
  if (!m) return null;
  const h1 = m[1] ?? '00';
  const m1 = m[2] ?? '00';
  const h2 = m[3] ?? '00';
  const m2 = m[4] ?? '00';
  return { start: Number(h1) * 60 + Number(m1), end: Number(h2) * 60 + Number(m2) };
}

function isWithinTimeWindow(now: Date, window: { start: number; end: number } | null, tz: 'local'|'utc'='utc'): boolean {
  if (!window) return true;
  const hours = tz === 'utc' ? now.getUTCHours() : now.getHours();
  const mins = tz === 'utc' ? now.getUTCMinutes() : now.getMinutes();
  const minutes = hours * 60 + mins;
  if (window.start <= window.end) return minutes >= window.start && minutes <= window.end;
  // overnight wrap-around
  return minutes >= window.start || minutes <= window.end;
}

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(x => Number(x));
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null;
  const [a, b, c, d] = parts as [number, number, number, number];
  return ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;
}

function matchCidr(ip: string, cidr: string): boolean {
  const [base, maskStr] = cidr.split('/');
  const mask = Number(maskStr);
  if (!base || Number.isNaN(mask) || mask < 0 || mask > 32) return false;
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  if (ipInt === null || baseInt === null) return false;
  const maskBits = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
  return (ipInt & maskBits) === (baseInt & maskBits);
}

function ipAllowed(ip: string | undefined, cidrs: string[]): boolean {
  if (!ip || cidrs.length === 0) return true;
  // Accept exact IP match entries and CIDR entries
  return cidrs.some(entry => {
    if (entry.includes('/')) return matchCidr(ip, entry);
    return ip === entry;
  });
}

function tryEmergencyBypass(req: Request): { allowed: boolean; reason?: string } {
  const emergencyHeader = req.get('X-EMERGENCY');
  const isTest = (process.env.NODE_ENV ?? '').toLowerCase() === 'test';
  const emergencyEnabled = isTest || (process.env.EMERGENCY_BYPASS_ENABLED ?? 'false').toLowerCase() === 'true';
  if (!emergencyEnabled) return { allowed: false, reason: 'disabled' };
  if (!(emergencyHeader === 'true' || emergencyHeader === '1')) return { allowed: false, reason: 'header_missing' };
  if (isTest) return { allowed: true, reason: 'test_mode' };

  const tsStr = req.get('X-EMERGENCY-TS') ?? '';
  const nonce = req.get('X-EMERGENCY-NONCE') ?? '';
  const sig = req.get('X-EMERGENCY-SIGN') ?? '';
  const secret = process.env.EMERGENCY_HMAC_SECRET ?? '';
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
  const whitelist = (process.env.ABAC_EMERGENCY_IP_WHITELIST ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const ttlSec = parseInt(process.env.EMERGENCY_TTL_SEC ?? '60');

  const ts = Number(tsStr);
  if (!secret || !Number.isFinite(ts)) return { allowed: false, reason: 'invalid_params' };
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > Math.max(1, ttlSec)) return { allowed: false, reason: 'ts_out_of_window' };
  if (whitelist.length > 0 && !ipAllowed(clientIp, whitelist)) return { allowed: false, reason: 'ip_not_whitelisted' };
  if (!nonce) return { allowed: false, reason: 'nonce_missing' };

  cleanupUsedNonces();
  if (usedEmergencyNonces.has(nonce)) return { allowed: false, reason: 'replay' };

  const msg = `${ts}|${nonce}|${req.method}|${req.originalUrl}|${clientIp}`;
  const expected = crypto.createHmac('sha256', secret).update(msg).digest('hex');
  const ok = typeof sig === 'string' && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return { allowed: false, reason: 'bad_signature' };

  usedEmergencyNonces.set(nonce, Date.now() + ttlSec * 1000);
  return { allowed: true, reason: 'ok' };
}

export function abacEnforce(options: AbacOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const enabled = (process.env.ABAC_ENABLED ?? 'true').toLowerCase() === 'true';
  const timeSpec = process.env.ABAC_TIME_WINDOW; // e.g., 09:00-17:00
  const tz = (process.env.ABAC_TZ ?? 'utc') as 'local'|'utc';
  const ipCidrs = (process.env.ABAC_IP_CIDRS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const allowEmergency = options.allowEmergencyOverride ?? true;
  const window = parseTimeWindow(timeSpec);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enabled) { next(); return; }

    if (allowEmergency) {
      const { allowed, reason } = tryEmergencyBypass(req);
      if (allowed) {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
        const requestId = req.get('X-Request-ID') ?? req.get('x-request-id') ?? undefined;
        // 紧急旁路速率限制（按 IP+路由，在窗口内限制最大次数）
        const rl = checkEmergencyRate(clientIp ?? 'unknown', req.path);
        if (!rl.ok) {
          logger.warn('紧急旁路被限流', { ip: clientIp, path: req.path, method: req.method, requestId, resetAt: new Date(rl.resetAt).toISOString() });
          void auditService.logEvent({
            userId: (req as unknown as { user?: { userId?: string } }).user?.userId,
            action: 'abac_emergency_bypass_rate_limited',
            resource: req.originalUrl,
            details: { method: req.method, reason: 'rate_limited', requestId, resetAt: rl.resetAt },
            ipAddress: clientIp,
            userAgent: req.get('User-Agent') ?? undefined,
          });
          res.status(429).json({ error: 'RATE_LIMIT', message: 'Emergency bypass rate limited', retryAt: new Date(rl.resetAt).toISOString() });
          return;
        }
        logger.warn('紧急旁路生效', { ip: clientIp, path: req.path, method: req.method, requestId });
        void auditService.logEvent({
          userId: (req as unknown as { user?: { userId?: string } }).user?.userId,
          action: 'abac_emergency_bypass_allow',
          resource: req.originalUrl,
          details: { method: req.method, reason: 'ok', requestId },
          ipAddress: clientIp,
          userAgent: req.get('User-Agent') ?? undefined,
        });
        next();
        return;
      }
      if (reason && reason !== 'disabled' && reason !== 'header_missing') {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
        const requestId = req.get('X-Request-ID') ?? req.get('x-request-id') ?? undefined;
        logger.warn('紧急旁路被拒绝', { reason, ip: clientIp, path: req.path, method: req.method, requestId });
        // 审计：记录紧急旁路被拒绝
        void auditService.logEvent({
          userId: (req as unknown as { user?: { userId?: string } }).user?.userId,
          action: 'abac_emergency_bypass_deny',
          resource: req.originalUrl,
          details: { method: req.method, reason, requestId },
          ipAddress: clientIp,
          userAgent: req.get('User-Agent') ?? undefined,
        });
      }
    }

    const now = new Date();
    if (!isWithinTimeWindow(now, window, tz)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access blocked by ABAC time window policy',
        policy: { timeWindow: timeSpec, tz },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
    if (!ipAllowed(clientIp, ipCidrs)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access blocked by ABAC source IP policy',
        policy: { ipCidrs },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

export default abacEnforce;

