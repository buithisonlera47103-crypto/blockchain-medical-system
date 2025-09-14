# EMR Blockchain Performance Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing the EMR blockchain
system to achieve and maintain 1000+ TPS performance targets. It covers all
system components including Fabric network, IPFS cluster, database, and
application layer optimizations.

## Performance Targets

### Primary Targets (read111.md Compliance)

- **Throughput**: 1000+ transactions per second (TPS)
- **Latency**: <2 seconds average response time
- **Availability**: 99.9% uptime
- **Scalability**: Linear scaling with additional resources

### Secondary Targets

- **P95 Latency**: <5 seconds
- **Error Rate**: <1%
- **Resource Efficiency**: <80% CPU/Memory utilization
- **Storage Growth**: Predictable and manageable

## System Architecture Optimization

## Implemented Performance Architecture (Backend)

The backend implements the following optimizations (backward-compatible and toggleable via env):

- Multi-tier caching: L1 in-memory + L2 Redis with Brotli payload compression in cache values
- JWT verification caching: reduces repeated signature verification cost on hot tokens
- Database read/write separation: MySQL primary for writes + optional replicas for reads; slow-query timing logs via DB_SLOW_QUERY_MS
- IPFS parallelism: configurable chunked add/cat concurrency (IPFS_UPLOAD_CONCURRENCY, IPFS_DOWNLOAD_CONCURRENCY)
- HTTP compression: gzip with intelligent content-type filter and 1KB threshold
- Distributed tracing: OpenTelemetry SDK + auto-instrumentations for HTTP/Express, MySQL2, ioredis; conditional via OTEL_ENABLED
- Cache warming: optional periodic warmers for hot blockchain queries and API endpoints
- Benchmarking: autocannon scripts (read/burst/soak) with JSON outputs and a summarizer

### New environment variables

- OTEL_ENABLED=true|false (default false)
- OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318/v1/traces (default http://localhost:4318/v1/traces)
- IPFS_UPLOAD_CONCURRENCY (default 4)
- IPFS_DOWNLOAD_CONCURRENCY (default 6)
- WARM_CACHE_ENABLED=true|false (default false)
- WARM_BLOCKCHAIN_GETCONTRACTINFO=true|false (default true)
- WARM_BLOCKCHAIN_LISTRECORDS=true|false (default false)
- WARM_GETCONTRACTINFO_MS (default 30000)
- WARM_LISTRECORDS_MS (default 60000)
- DB_SLOW_QUERY_MS (default 200)

### How to run the perf suite (backend-app)

- Start backend (ensure PORT=3001): `npm --prefix backend-app run dev`
- Run scenarios:
  - `npm --prefix backend-app run perf:ac:read`
  - `npm --prefix backend-app run perf:ac:burst`
  - `npm --prefix backend-app run perf:ac:soak`
- Summarize: `npm --prefix backend-app run perf:ac:summarize`

Results are saved under backend-app/perf/*.json.

### Monitoring artifacts

### Dedicated perf endpoint and clean measurements

- New endpoint: GET /perf/ping — registered before all middlewares and rate limits to provide a clean, ultra‑lightweight target for load testing.
- Rationale: avoids interference from compression, auth, ABAC, request logging, rate limiting, etc.
- For realistic endpoint tests, prefer specific API routes and disable only the global limiter via `ENABLE_RATE_LIMIT=false`.

### Updated perf commands (disable pipelining)

- We recommend running autocannon with pipelining disabled to avoid limiter/store edge cases:
  - Read: `npx autocannon -j -p 1 -c 200 -d 30 http://localhost:3001/perf/ping > perf/dev-read.json`
  - Burst: `npx autocannon -j -p 1 -c 1000 -d 15 -R 1000 http://localhost:3001/perf/ping > perf/dev-burst.json`
  - Soak: `npx autocannon -j -p 1 -c 200 -d 60 http://localhost:3001/perf/ping > perf/dev-soak.json`

### Dev vs Prod benchmarking (recommended)

- Dev server: `START_SERVER=true ENABLE_RATE_LIMIT=true npm run dev`
- Prod build: `npm run build && NODE_ENV=production START_SERVER=true PORT=3001 node dist/src/index.js`
- Compare metrics by saving JSON as `perf/dev-*.json` and `perf/prod-*.json` and summarizing.
- Helper: `node scripts/parse-perf.js` prints RPS and latency percentiles from JSON outputs.

### New/updated environment variables (performance)

- ENABLE_RATE_LIMIT=true|false (default true): disable only for benchmarks.
- API_RATE_LIMIT_MAX (number): adjust global limit when ENABLE_RATE_LIMIT=true.
- OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT: OpenTelemetry tracing toggle/export.
- CACHE/REDIS: enable L2 cache and tune TTL/eviction; ensure REDIS_URL is set in staging/prod.
- DB_SLOW_QUERY_MS, DB_READ_REPLICA_*, DB_POOL_*: tune slow-query log threshold and read/write pools.
- IPFS_UPLOAD_CONCURRENCY, IPFS_DOWNLOAD_CONCURRENCY: tune IPFS parallelism.

### Monitoring setup (operators)

- Prometheus: scrape `http://<backend-host>:3001/metrics` and load rules from `monitoring/prometheus/rules/emr-critical-alerts.yml`.
- Grafana: import `monitoring/grafana/dashboards/emr-performance.json` and validate panels update under load.
- Verify: fire a short load (`autocannon -c 100 -d 15 /perf/ping`) and check RPS/latency panels and alert firing by temporarily lowering thresholds in a test copy of the rules file.

### Troubleshooting (perf)

- 429 responses during perf: ensure `/perf/ping` is used or set `ENABLE_RATE_LIMIT=false` for realistic API tests; run with `-p 1` to disable pipelining.
- bcrypt native module error: auth route lazy‑loads bcrypt to avoid startup failures in perf env; ensure node-gyp toolchain is present in CI if you build native.
- DB unavailable: backend continues in limited mode; you can still benchmark `/perf/ping`. Set `DB_CONNECT_TIMEOUT` low for faster startup.


- Prometheus alert rules updated: monitoring/prometheus/rules/emr-critical-alerts.yml
- Grafana dashboard JSON: monitoring/grafana/dashboards/emr-performance.json


### 1. Fabric Network Optimization

#### Orderer Configuration

```yaml
# Optimized orderer settings for high throughput
BatchTimeout: 1s
BatchSize:
  MaxMessageCount: 100
  AbsoluteMaxBytes: 10MB
  PreferredMaxBytes: 2MB

# Raft consensus optimization
TickInterval: 500ms
ElectionTick: 10
HeartbeatTick: 1
MaxInflightBlocks: 5
```

#### Peer Configuration

```yaml
# Peer performance tuning
CORE_CHAINCODE_EXECUTETIMEOUT: 120s
CORE_PEER_GOSSIP_DIALINTERVAL: 2s
CORE_PEER_GOSSIP_PUBLISHCERTPERIOD: 5s
CORE_PEER_GOSSIP_REQUESTSTATEINFOINTERNAL: 4s

# Database optimization
CORE_LEDGER_STATE_STATEDATABASE: CouchDB
CORE_LEDGER_STATE_COUCHDBCONFIG_MAXRETRIES: 3
CORE_LEDGER_STATE_COUCHDBCONFIG_MAXRETRIESONSTARTUP: 20
CORE_LEDGER_STATE_COUCHDBCONFIG_REQUESTTIMEOUT: 35s
```

#### Chaincode Optimization

```javascript
// Optimized chaincode patterns
class OptimizedChaincode {
  // Use batch operations
  async createMultipleRecords(ctx, records) {
    const promises = records.map(record =>
      ctx.stub.putState(record.id, Buffer.from(JSON.stringify(record)))
    );
    await Promise.all(promises);
  }

  // Implement efficient queries
  async getRecordsByRange(ctx, startKey, endKey) {
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const results = [];

    while (true) {
      const result = await iterator.next();
      if (result.done) break;

      results.push({
        key: result.value.key,
        record: JSON.parse(result.value.value.toString()),
      });
    }

    await iterator.close();
    return results;
  }

  // Use composite keys for efficient indexing
  createCompositeKey(objectType, attributes) {
    return ctx.stub.createCompositeKey(objectType, attributes);
  }
}
```

### 2. IPFS Cluster Optimization

#### Node Configuration

```json
{
  "Datastore": {
    "StorageMax": "100GB",
    "StorageGCWatermark": 90,
    "GCPeriod": "1h",
    "BloomFilterSize": 1048576
  },
  "Swarm": {
    "ConnMgr": {
      "Type": "basic",
      "LowWater": 600,
      "HighWater": 900,
      "GracePeriod": "20s"
    }
  },
  "Gateway": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": ["*"],
      "Access-Control-Allow-Methods": ["GET", "POST"],
      "Access-Control-Allow-Headers": [
        "X-Requested-With",
        "Range",
        "User-Agent"
      ]
    }
  }
}
```

#### Cluster Configuration

```json
{
  "cluster": {
    "replication_factor_min": 2,
    "replication_factor_max": 3,
    "monitor_ping_interval": "10s",
    "peer_watch_interval": "3s"
  },
  "pin_tracker": {
    "stateless": {
      "concurrent_pins": 20,
      "priority_pin_max_age": "12h0m0s"
    }
  }
}
```

### 3. Database Optimization

#### PostgreSQL Configuration

```sql
-- Performance tuning parameters
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

-- Connection pooling
max_connections = 200
```

#### Database Schema Optimization

```sql
-- Optimized indexes for EMR queries
CREATE INDEX CONCURRENTLY idx_medical_records_patient_timestamp
ON medical_records(patient_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_medical_records_doctor_timestamp
ON medical_records(doctor_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_medical_records_hospital_timestamp
ON medical_records(hospital_id, created_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_medical_records_active
ON medical_records(created_at DESC)
WHERE status = 'active';

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_medical_records_composite
ON medical_records(patient_id, record_type, created_at DESC);
```

### 4. Application Layer Optimization

#### Connection Pooling

```typescript
// Optimized database connection pool
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  min: 10,
  max: 50,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
};
```

#### Caching Strategy

```typescript
// Multi-layer caching implementation
class CacheManager {
  private redisClient: Redis;
  private memoryCache: Map<string, any>;

  constructor() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.memoryCache = new Map();
  }

  async get(key: string): Promise<any> {
    // L1: Memory cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // L2: Redis cache
    const redisValue = await this.redisClient.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      this.memoryCache.set(key, parsed);
      return parsed;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, value);
    await this.redisClient.setex(key, ttl, JSON.stringify(value));
  }
}
```

#### Async Processing

```typescript
// Queue-based async processing
class AsyncProcessor {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('emr-processing', {
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupWorkers();
  }

  private setupWorkers(): void {
    // Process IPFS uploads asynchronously
    this.queue.process('ipfs-upload', 10, async job => {
      const { fileData, metadata } = job.data;
      return await this.uploadToIPFS(fileData, metadata);
    });

    // Process blockchain transactions asynchronously
    this.queue.process('blockchain-tx', 5, async job => {
      const { transaction } = job.data;
      return await this.submitToBlockchain(transaction);
    });
  }

  async queueIPFSUpload(fileData: Buffer, metadata: any): Promise<void> {
    await this.queue.add(
      'ipfs-upload',
      { fileData, metadata },
      {
        priority: 1,
      }
    );
  }

  async queueBlockchainTransaction(transaction: any): Promise<void> {
    await this.queue.add(
      'blockchain-tx',
      { transaction },
      {
        priority: 2,
      }
    );
  }
}
```

## Performance Monitoring

### Key Metrics to Monitor

#### System Metrics

- **CPU Usage**: Target <80%
- **Memory Usage**: Target <80%
- **Disk I/O**: Monitor IOPS and latency
- **Network I/O**: Monitor bandwidth utilization

#### Application Metrics

- **Request Rate**: Requests per second
- **Response Time**: Average, P95, P99 latencies
- **Error Rate**: Percentage of failed requests
- **Queue Depth**: Async processing queue sizes

#### Blockchain Metrics

- **Block Production Rate**: Blocks per second
- **Transaction Throughput**: TPS
- **Endorsement Time**: Time for transaction endorsement
- **Commit Time**: Time for transaction commit

#### IPFS Metrics

- **Pin Success Rate**: Percentage of successful pins
- **Retrieval Time**: Time to retrieve files
- **Replication Factor**: Current replication status
- **Storage Usage**: Disk space utilization

### Monitoring Setup

#### Prometheus Queries

```yaml
# High-level performance queries
- name: emr_performance_rules
  rules:
    - alert: HighThroughputAchieved
      expr: rate(emr_transactions_total[5m]) >= 1000
      for: 1m
      labels:
        severity: info
      annotations:
        summary: 'Target throughput achieved'
        description: 'System is processing {{ $value }} TPS'

    - alert: HighLatency
      expr:
        histogram_quantile(0.95, rate(emr_request_duration_seconds_bucket[5m]))
        > 5
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: 'High response latency detected'
        description: 'P95 latency is {{ $value }}s'

    - alert: LowThroughput
      expr: rate(emr_transactions_total[5m]) < 500
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: 'Throughput below target'
        description: 'Current TPS: {{ $value }}'
```

## Performance Testing Strategy

### Test Scenarios

#### 1. Baseline Testing

- Single user, sequential operations
- Establish baseline performance metrics
- Identify bottlenecks in optimal conditions

#### 2. Load Testing

- Target user load (100-1000 concurrent users)
- Sustained load for extended periods
- Verify system meets TPS targets

#### 3. Stress Testing

- Beyond normal capacity (2x-5x target load)
- Identify breaking points
- Test system recovery

#### 4. Endurance Testing

- Extended duration (24+ hours)
- Verify system stability
- Monitor for memory leaks and degradation

#### 5. Mixed Workload Testing

- Realistic EMR operation mix
- Different transaction types and sizes
- Varying user patterns

### Performance Test Execution

```bash
# Complete performance test suite
npm run perf:test:all

# Specific test types
npm run perf:test:baseline
npm run perf:test:load
npm run perf:test:stress
npm run perf:test:endurance

# Target TPS verification
npm run perf:test:1000tps

# Real-time monitoring
npm run perf:dashboard
```

## Optimization Checklist

### Pre-Deployment

- [ ] Database indexes optimized
- [ ] Connection pools configured
- [ ] Caching strategy implemented
- [ ] Async processing setup
- [ ] Monitoring configured

### Network Level

- [ ] Fabric network tuned for throughput
- [ ] IPFS cluster optimized
- [ ] Load balancing configured
- [ ] TLS 1.3 properly configured
- [ ] HSM integration tested

### Application Level

- [ ] Code profiled and optimized
- [ ] Memory usage optimized
- [ ] Error handling robust
- [ ] Logging optimized
- [ ] Security measures in place

### Infrastructure Level

- [ ] Hardware resources adequate
- [ ] Network bandwidth sufficient
- [ ] Storage performance verified
- [ ] Backup systems tested
- [ ] Disaster recovery planned

## Troubleshooting Common Issues

### Low Throughput

1. Check database connection pool utilization
2. Verify Fabric network configuration
3. Monitor IPFS cluster health
4. Review application bottlenecks
5. Check system resource utilization

### High Latency

1. Analyze database query performance
2. Check network latency between components
3. Review caching effectiveness
4. Monitor garbage collection
5. Verify TLS handshake performance

### High Error Rates

1. Check system resource exhaustion
2. Verify network connectivity
3. Review timeout configurations
4. Monitor queue overflow
5. Check certificate validity

### Memory Issues

1. Monitor for memory leaks
2. Optimize object creation
3. Review caching strategies
4. Check garbage collection settings
5. Verify connection pool limits

## Continuous Optimization

### Regular Tasks

- **Daily**: Monitor key performance metrics
- **Weekly**: Review performance trends
- **Monthly**: Conduct performance tests
- **Quarterly**: Optimize based on usage patterns
- **Annually**: Capacity planning and scaling

### Performance Regression Prevention

- Automated performance tests in CI/CD
- Performance budgets for new features
- Regular code reviews for performance
- Monitoring alerts for degradation
- Rollback procedures for performance issues

## Conclusion

Achieving and maintaining 1000+ TPS requires a holistic approach covering all
system components. Regular monitoring, testing, and optimization are essential
for sustained high performance. This guide provides the foundation for building
and maintaining a high-performance EMR blockchain system that meets the
demanding requirements of healthcare environments.

For additional support or specific optimization questions, refer to the
component-specific documentation or contact the development team.
