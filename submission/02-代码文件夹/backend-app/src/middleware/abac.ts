import { Request, Response, NextFunction } from 'express';

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

export function abacEnforce(options: AbacOptions = {}) {
  const enabled = (process.env.ABAC_ENABLED ?? 'true').toLowerCase() === 'true';
  const timeSpec = process.env.ABAC_TIME_WINDOW; // e.g., 09:00-17:00
  const tz = (process.env.ABAC_TZ ?? 'utc') as 'local'|'utc';
  const ipCidrs = (process.env.ABAC_IP_CIDRS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const allowEmergency = options.allowEmergencyOverride ?? true;
  const window = parseTimeWindow(timeSpec);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enabled) {
      next();
    } else if (allowEmergency && (req.get('X-EMERGENCY') === 'true' || req.get('X-EMERGENCY') === '1')) {
      next();
    } else {
      const now = new Date();
      if (!isWithinTimeWindow(now, window, tz)) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access blocked by ABAC time window policy',
          policy: { timeWindow: timeSpec, tz },
          timestamp: new Date().toISOString(),
        });
      } else {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
        if (!ipAllowed(clientIp, ipCidrs)) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Access blocked by ABAC source IP policy',
            policy: { ipCidrs },
            timestamp: new Date().toISOString(),
          });
        } else {
          next();
        }
      }
    }
    // Placeholder for future record-level policy evaluation: if record policy exists, evaluate here
  };
}

export default abacEnforce;

