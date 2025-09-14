import logger from '../utils/enhancedLogger';

export type WarmerFn = () => Promise<void>;

interface WarmerEntry {
  name: string;
  fn: WarmerFn;
  intervalMs: number;
  timer?: NodeJS.Timeout;
}

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private readonly warmers: Map<string, WarmerEntry> = new Map();
  private readonly enabled: boolean;

  private constructor() {
    this.enabled = (process.env.WARM_CACHE_ENABLED ?? 'false').toLowerCase() === 'true';
  }

  static getInstance(): CacheWarmingService {
    if (!this.instance) this.instance = new CacheWarmingService();
    return this.instance;
  }

  register(name: string, fn: WarmerFn, intervalMs?: number): void {
    // 大幅增加默认间隔以减少CPU使用率
    const lightMode = (process.env.LIGHT_MODE ?? 'false').toLowerCase() === 'true';
    const baseInterval = Number(process.env.WARM_CACHE_DEFAULT_INTERVAL_MS ?? (lightMode ? 300000 : 120000)); // 轻量模式5分钟，正常模式2分钟
    const entry: WarmerEntry = { name, fn, intervalMs: Math.max(10000, intervalMs ?? baseInterval) }; // 最小10秒
    this.warmers.set(name, entry);
  }

  start(): void {
    if (!this.enabled) {
      logger.info('Cache warming is disabled. Set WARM_CACHE_ENABLED=true to enable.');
      return;
    }
    for (const [name, entry] of this.warmers.entries()) {
      if (entry.timer) continue;
      logger.info(`Starting cache warmer: ${name} (intervalMs=${entry.intervalMs})`);
      entry.timer = setInterval((): void => {
        void (async (): Promise<void> => {
          try {
            const t0 = Date.now();
            await entry.fn();
            const d = Date.now() - t0;
            if (d > 2000) {
              logger.warn('Cache warmer took longer than expected', { name, durationMs: d });
            }
          } catch (e) {
            logger.error('Cache warmer error', { name, error: (e as Error)?.message });
          }
        })();
      }, entry.intervalMs);
    }
  }

  stop(): void {
    for (const entry of this.warmers.values()) {
      if (entry.timer) clearInterval(entry.timer);
      entry.timer = undefined;
    }
  }
}

export default CacheWarmingService;

