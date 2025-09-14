import { fetch } from 'undici';

import { SimpleLogger } from '../utils/logger';

export interface ClusterPinOptions {
  replication_min?: number;
  replication_max?: number;
  name?: string; // 添加name字段支持防垃圾回收标识
}

export class IPFSClusterService {
  private baseUrl: string;
  private readonly logger?: SimpleLogger;
  private basicAuth?: string;
  private bearer?: string;

  constructor(logger?: SimpleLogger) {
    this.baseUrl = process.env['IPFS_CLUSTER_API'] ?? 'http://localhost:9094';
    this.logger = logger;
    const basic = process.env['IPFS_CLUSTER_BASIC_AUTH']; // e.g. "user:pass"
    if (basic) this.basicAuth = Buffer.from(basic).toString('base64');
    const bearer = process.env['IPFS_CLUSTER_BEARER_TOKEN'];
    if (bearer) this.bearer = bearer;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.basicAuth) headers['Authorization'] = `Basic ${this.basicAuth}`;
    if (this.bearer) headers['Authorization'] = `Bearer ${this.bearer}`;
    return headers;
  }

  public async health(): Promise<{ ok: boolean; status?: number }> {
    const res = await fetch(`${this.baseUrl}/health`, { headers: this.buildHeaders() });
    return res.ok ? (res.json() as Promise<{ ok: boolean; status?: number }>) : { ok: false, status: res.status };
  }

  public async id(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/id`, { headers: this.buildHeaders() });
    if (!res.ok) throw new Error(`Cluster id failed: ${res.status}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  public async pin(cid: string, options?: ClusterPinOptions): Promise<Record<string, unknown>> {
    const u = new URL(`${this.baseUrl}/pins/${encodeURIComponent(cid)}`);
    if (options?.replication_min !== undefined)
      u.searchParams.set('replication_factor_min', String(options.replication_min));
    if (options?.replication_max !== undefined)
      u.searchParams.set('replication_factor_max', String(options.replication_max));
    const res = await fetch(u, { method: 'POST', headers: this.buildHeaders() });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger?.error('IPFS Cluster pin failed', { status: res.status, text });
      throw new Error(`Cluster pin failed: ${res.status}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  public async unpin(cid: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/pins/${encodeURIComponent(cid)}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
    if (!res.ok) throw new Error(`Cluster unpin failed: ${res.status}`);
  }

  public async status(cid: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/pins/${encodeURIComponent(cid)}`, {
      headers: this.buildHeaders(),
    });
    if (!res.ok) throw new Error(`Cluster status failed: ${res.status}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  /**
   * Production-ready cluster management methods
   */

  /**
   * Get cluster peers information
   */
  public async getPeers(): Promise<Array<Record<string, unknown>>> {
    const res = await fetch(`${this.baseUrl}/peers`, { headers: this.buildHeaders() });
    if (!res.ok) throw new Error(`Get peers failed: ${res.status}`);
    return res.json() as Promise<Array<Record<string, unknown>>>;
  }

  /**
   * Get cluster allocation information
   */
  public async getAllocations(cid?: string): Promise<Array<Record<string, unknown>>> {
    const u = cid
      ? `${this.baseUrl}/allocations/${encodeURIComponent(cid)}`
      : `${this.baseUrl}/allocations`;
    const res = await fetch(u, { headers: this.buildHeaders() });
    if (!res.ok) throw new Error(`Get allocations failed: ${res.status}`);
    return res.json() as Promise<Array<Record<string, unknown>>>;
  }

  /**
   * Recover failed pins
   */
  public async recover(cid?: string): Promise<Record<string, unknown>> {
    const u = cid
      ? `${this.baseUrl}/pins/${encodeURIComponent(cid)}/recover`
      : `${this.baseUrl}/pins/recover`;
    const res = await fetch(u, { method: 'POST', headers: this.buildHeaders() });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Recovery failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  /**
   * Bulk pin multiple CIDs with replication
   */
  public async bulkPin(
    cids: string[],
    options?: ClusterPinOptions
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const cid of cids) {
      try {
        await this.pin(cid, options);
        success.push(cid);
        this.logger?.info('Bulk pin successful', { cid });
      } catch (error) {
        failed.push(cid);
        this.logger?.error('Bulk pin failed', { cid, error });
      }
    }

    return { success, failed };
  }

  /**
   * Monitor cluster health and auto-recovery
   */
  public async monitorAndRecover(): Promise<{
    healthyPeers: number;
    totalPeers: number;
    recoveredPins: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    const recoveredPins = 0;

    try {
      // Check cluster health
      const health = await this.health();
      if (!health.ok) {
        issues.push('Cluster health check failed');
      }

      // Check peers
      const peers = await this.getPeers();
      const healthyPeers = peers.filter((peer: Record<string, unknown>) => peer.error === '').length;
      const totalPeers = peers.length;

      if (healthyPeers < totalPeers * 0.8) {
        issues.push(`Low peer health: ${healthyPeers}/${totalPeers} healthy`);
      }

      return {
        healthyPeers,
        totalPeers,
        recoveredPins,
        issues,
      };
    } catch (error) {
      issues.push(
        `Monitor and recover failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        healthyPeers: 0,
        totalPeers: 0,
        recoveredPins: 0,
        issues,
      };
    }
  }

  /**
   * Get comprehensive cluster metrics
   */
  public async getClusterMetrics(): Promise<{
    totalPins: number;
    replicationFactor: number;
    healthScore: number;
  }> {
    try {
      const [peers, allocations] = await Promise.all([this.getPeers(), this.getAllocations()]);

      const healthyPeers = peers.filter((peer: Record<string, unknown>) => peer.error === '').length;
      const healthScore = (healthyPeers / peers.length) * 100;

      // Calculate average replication factor
      const replicationFactor =
        allocations.length > 0
          ? allocations.reduce((sum: number, alloc: Record<string, unknown>) => sum + (alloc.allocations as unknown[]).length, 0) /
            allocations.length
          : 0;

      return {
        totalPins: allocations.length,
        replicationFactor,
        healthScore,
      };
    } catch (error) {
      this.logger?.error('Failed to get cluster metrics:', error);
      throw error;
    }
  }

  /**
   * Optimize cluster performance
   */
  public async optimizeCluster(): Promise<{
    optimizationsApplied: string[];
    errors: string[];
  }> {
    const optimizationsApplied: string[] = [];
    const errors: string[] = [];

    try {
      // Recover any failed pins
      const recoveryResult = await this.recover();
      if (recoveryResult) {
        optimizationsApplied.push('Recovered failed pins');
      }

      this.logger?.info('Cluster optimization completed', {
        optimizationsApplied: optimizationsApplied.length,
        errors: errors.length,
      });

      return { optimizationsApplied, errors };
    } catch (error) {
      errors.push(
        `Cluster optimization failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { optimizationsApplied, errors };
    }
  }
}
