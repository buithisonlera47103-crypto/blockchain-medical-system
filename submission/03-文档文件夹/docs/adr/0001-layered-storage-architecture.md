# ADR-0001: Layered Storage Architecture

## Status

Accepted

## Date

2024-01-15

## Context

The Blockchain EMR system needs to handle medical records with varying access
patterns, sizes, and retention requirements. We need a storage solution that
provides:

- High-performance access for frequently used data
- Cost-effective storage for large files and historical data
- Compliance with healthcare data retention regulations
- Scalability to handle growing data volumes
- Data integrity and immutability guarantees

## Decision

We will implement a 4-layer storage architecture:

### Layer 1: Redis Cache (Hot Data)

- **Purpose**: Ultra-fast access to frequently requested data
- **TTL**: 1 hour default, configurable per data type
- **Size Limit**: 2GB total cache size
- **Use Cases**: Active user sessions, recent medical records, permission checks

### Layer 2: MySQL Database (Warm Data)

- **Purpose**: Structured data with ACID guarantees
- **Retention**: 24 hours to 30 days depending on access patterns
- **Size Limit**: 500GB per instance with read replicas
- **Use Cases**: Medical record metadata, user profiles, audit logs

### Layer 3: IPFS Network (Cool Data)

- **Purpose**: Distributed storage for large files and archived records
- **Retention**: 30 days to 7 years
- **Size Limit**: 10TB cluster capacity
- **Use Cases**: Medical images, documents, historical records

### Layer 4: Cold Storage (Archive Data)

- **Purpose**: Long-term archival for compliance
- **Retention**: 7+ years (healthcare compliance requirement)
- **Provider**: AWS S3 Glacier or equivalent
- **Use Cases**: Old records, backup data, compliance archives

## Consequences

### Positive

- **Performance**: Sub-100ms response times for hot data
- **Cost Efficiency**: Automatic data lifecycle management reduces storage costs
- **Scalability**: Each layer can scale independently
- **Compliance**: Meets healthcare data retention requirements
- **Reliability**: Multiple redundancy levels across layers

### Negative

- **Complexity**: Requires sophisticated data lifecycle management
- **Consistency**: Eventual consistency between layers
- **Monitoring**: Need comprehensive monitoring across all layers
- **Migration**: Complex data movement between layers

## Implementation Details

### Data Flow

1. **Write Path**: Data written to L1 (cache) and L2 (database) simultaneously
2. **Read Path**: Check L1 → L2 → L3 → L4 in sequence
3. **Lifecycle**: Automated promotion/demotion based on access patterns

### Access Patterns

- **Hot Data** (L1): Accessed multiple times per hour
- **Warm Data** (L2): Accessed daily or weekly
- **Cool Data** (L3): Accessed monthly or for compliance
- **Cold Data** (L4): Rarely accessed, compliance-driven retention

### Consistency Model

- **L1-L2**: Strong consistency with write-through caching
- **L2-L3**: Eventual consistency with async replication
- **L3-L4**: Batch archival with verification

## Monitoring and Metrics

- Cache hit rates for each layer
- Data access patterns and lifecycle transitions
- Storage costs per layer
- Performance metrics (latency, throughput)
- Data integrity verification

## Alternatives Considered

### Single Database Approach

- **Rejected**: Would not scale to required performance levels
- **Issues**: High costs for large data volumes, performance degradation

### Pure Blockchain Storage

- **Rejected**: Too expensive and slow for large medical files
- **Issues**: Limited throughput, high transaction costs

### Traditional File System

- **Rejected**: Lacks distributed capabilities and compliance features
- **Issues**: Single point of failure, limited scalability

## Related Decisions

- ADR-0002: Blockchain Integration Strategy
- ADR-0003: Encryption and Security Model
- ADR-0004: ABAC Permission System

## References

- [Healthcare Data Retention Requirements](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access/index.html)
- [IPFS Documentation](https://docs.ipfs.io/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [MySQL Performance Tuning](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
