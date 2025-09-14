import { businessMetrics } from '../../utils/enhancedLogger';
import MetricsService from '../../services/MetricsService';

// Keep tests isolated from timers/intervals
jest.spyOn(global, 'setInterval').mockImplementation((() => 0) as unknown as typeof setInterval);

describe('Business Metrics integration', () => {
  const metrics = MetricsService.getInstance();

  it('records medical record create metrics via enhancedLogger bridge', async () => {
    businessMetrics.recordOperation('create', 'rec-1', 'user-1', 123);
    const out = metrics.getPrometheusMetrics();
    expect(out).toContain('medical_record_create_total');
    expect(out).toContain('medical_record_create_duration_ms');
  });

  it('records search metrics and cache hit/miss', () => {
    businessMetrics.searchOperation('basic', 'user-2', 5, 45, true);
    const out = metrics.getPrometheusMetrics();
    expect(out).toContain('search_basic_queries_total');
    expect(out).toContain('search_basic_duration_ms');
    expect(out).toContain('search_basic_results_total');
    expect(out).toContain('search_basic_cache_hit_total');
  });

  it('records cache get hit/miss and durations', () => {
    businessMetrics.cacheOperation('get', 'k:abc', true, 7);
    const out = metrics.getPrometheusMetrics();
    expect(out).toContain('cache_get_hit_total');
    expect(out).toContain('cache_get_duration_ms');
  });

  it('records auth event success/failure', () => {
    businessMetrics.authEvent('login', true, 'u1');
    businessMetrics.authEvent('token_verify', false, 'u2');
    const out = metrics.getPrometheusMetrics();
    expect(out).toContain('auth_login_success_total');
    expect(out).toContain('auth_token_verify_failure_total');
  });

  it('records blockchain tx metrics', () => {
    businessMetrics.blockchainTx(true, 250, 'tx-1');
    const out = metrics.getPrometheusMetrics();
    expect(out).toContain('blockchain_tx_success_total');
    expect(out).toContain('blockchain_tx_latency_ms');
  });
});

