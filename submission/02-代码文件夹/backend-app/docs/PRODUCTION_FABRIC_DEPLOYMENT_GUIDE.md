# Production Fabric Network Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying a production-grade
Hyperledger Fabric network for the EMR blockchain system. The deployment
includes multi-organization setup, monitoring, and compliance with read111.md
requirements.

## Architecture Overview

### Network Topology

The production network consists of:

- **3 Organizations**: Hospital1, Hospital2, Regulator
- **5 Peers**: 2 peers each for hospitals, 1 peer for regulator
- **1 Orderer**: Raft consensus with single orderer (expandable)
- **3 Certificate Authorities**: One per organization
- **Monitoring Stack**: Prometheus, Grafana, Alertmanager

### Security Features

- **TLS 1.3**: All communications encrypted with TLS 1.3
- **HSM Integration**: Hardware Security Module for key management
- **Multi-signature**: Endorsement policies requiring multiple organizations
- **Audit Trail**: Comprehensive audit logging and compliance

### Performance Specifications

- **Target TPS**: 1000+ transactions per second
- **Latency**: <2 seconds for transaction confirmation
- **Availability**: 99.9% uptime SLA
- **Scalability**: Horizontal scaling support

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or CentOS 8
- **CPU**: Minimum 8 cores, Recommended 16 cores
- **Memory**: Minimum 16GB RAM, Recommended 32GB
- **Storage**: Minimum 500GB SSD, Recommended 1TB NVMe
- **Network**: Gigabit Ethernet, Low latency

### Software Dependencies

```bash
# Docker and Docker Compose
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Hyperledger Fabric binaries (will be downloaded by script)
# Git for version control
sudo apt-get install -y git
```

### Network Configuration

Ensure the following ports are available:

- **7050**: Orderer
- **7051, 8051**: Hospital1 peers
- **9051, 10051**: Hospital2 peers
- **11051**: Regulator peer
- **7054, 8054, 9054**: Certificate Authorities
- **9090**: Prometheus
- **3000**: Grafana
- **9093**: Alertmanager

## Deployment Steps

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd blockchain-project/backend-app

# Install dependencies
npm install

# Copy production environment
cp .env.production .env
```

### Step 2: Configure Environment

Edit `.env` file with your specific configuration:

```bash
# Organization Configuration
FABRIC_ORG=hospital1  # Change to hospital2 or regulator for other nodes

# TLS Certificates (update paths)
TLS_CERT_PATH=/etc/ssl/certs/emr-server.crt
TLS_KEY_PATH=/etc/ssl/private/emr-server.key

# HSM Configuration (if using HSM)
USE_HSM=true
HSM_PROVIDER=aws-cloudhsm
HSM_ENDPOINT=your-hsm-endpoint.cloudhsm.amazonaws.com

# Database Configuration
DB_HOST=your-database-host
DB_PASSWORD=your-secure-password
```

### Step 3: Generate Certificates

```bash
# Navigate to network directory
cd deployment/fabric-network

# Generate cryptographic materials
./scripts/deploy-production-network.sh
```

This script will:

- Download Fabric binaries
- Generate crypto materials for all organizations
- Create channel artifacts
- Start the network containers

### Step 4: Deploy Chaincode

```bash
# Deploy EMR chaincode
./scripts/deploy-chaincode.sh
```

This will:

- Package the chaincode
- Install on all peers
- Approve for all organizations
- Commit to the channel
- Initialize the chaincode

### Step 5: Setup Monitoring

```bash
# Setup monitoring stack
./scripts/setup-monitoring.sh
```

This creates:

- Prometheus for metrics collection
- Grafana for visualization
- Alertmanager for notifications

### Step 6: Verify Deployment

```bash
# Check network status
docker-compose -f docker-compose-production.yaml ps

# Test chaincode functionality
./scripts/deploy-chaincode.sh test

# Verify monitoring
curl http://localhost:9090/metrics
```

## Multi-Organization Setup

### Hospital1 Node Setup

```bash
# Set organization
export FABRIC_ORG=hospital1

# Deploy network (run on Hospital1 server)
./scripts/deploy-production-network.sh

# Configure connection profile
cp connection-profiles/connection-hospital1.json ./connection-profile.json
```

### Hospital2 Node Setup

```bash
# Set organization
export FABRIC_ORG=hospital2

# Join existing network
./scripts/deploy-production-network.sh join

# Configure connection profile
cp connection-profiles/connection-hospital2.json ./connection-profile.json
```

### Regulator Node Setup

```bash
# Set organization
export FABRIC_ORG=regulator

# Join existing network
./scripts/deploy-production-network.sh join

# Configure connection profile
cp connection-profiles/connection-regulator.json ./connection-profile.json
```

## Security Configuration

### TLS 1.3 Setup

```bash
# Generate production certificates
cd ../../scripts
./generate-tls-certificates.sh -d emr.yourdomain.com -o "Your Organization"

# Update environment
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/your/cert.pem
TLS_KEY_PATH=/path/to/your/key.pem
```

### HSM Integration

```bash
# Configure HSM (AWS CloudHSM example)
USE_HSM=true
HSM_PROVIDER=aws-cloudhsm
HSM_REGION=us-east-1
HSM_ENDPOINT=your-cluster.cloudhsm.amazonaws.com
```

### Firewall Configuration

```bash
# Allow required ports
sudo ufw allow 7050/tcp  # Orderer
sudo ufw allow 7051/tcp  # Hospital1 Peer0
sudo ufw allow 8051/tcp  # Hospital1 Peer1
sudo ufw allow 9051/tcp  # Hospital2 Peer0
sudo ufw allow 10051/tcp # Hospital2 Peer1
sudo ufw allow 11051/tcp # Regulator Peer0
sudo ufw allow 7054/tcp  # Hospital1 CA
sudo ufw allow 8054/tcp  # Hospital2 CA
sudo ufw allow 9054/tcp  # Regulator CA
```

## Monitoring and Alerting

### Prometheus Configuration

Access Prometheus at `http://localhost:9090`

Key metrics to monitor:

- `fabric_endorser_proposal_duration`
- `fabric_ledger_block_commits_total`
- `fabric_peer_gossip_state_height`
- `up{job=~"fabric-.*"}`

### Grafana Dashboards

Access Grafana at `http://localhost:3000` (admin/admin123)

Pre-configured dashboards:

- Fabric Network Overview
- Peer Performance
- Orderer Performance
- System Metrics

### Alerting Rules

Key alerts configured:

- Peer/Orderer down
- High transaction latency
- Low block production rate
- High resource usage

## Backup and Recovery

### Automated Backup

```bash
# Enable automated backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

### Manual Backup

```bash
# Backup ledger data
docker exec peer0.hospital1.emr.com tar -czf /tmp/ledger-backup.tar.gz /var/hyperledger/production

# Backup crypto materials
tar -czf crypto-backup.tar.gz crypto-config/

# Backup configuration
tar -czf config-backup.tar.gz *.yaml *.json
```

### Recovery Procedure

```bash
# Stop network
./scripts/deploy-production-network.sh down

# Restore crypto materials
tar -xzf crypto-backup.tar.gz

# Restore ledger data
docker run --rm -v peer0.hospital1.emr.com:/data -v $(pwd):/backup alpine tar -xzf /backup/ledger-backup.tar.gz -C /data

# Restart network
./scripts/deploy-production-network.sh
```

## Performance Tuning

### Orderer Configuration

```yaml
# In configtx.yaml
BatchTimeout: 2s
BatchSize:
  MaxMessageCount: 10
  AbsoluteMaxBytes: 99 MB
  PreferredMaxBytes: 512 KB
```

### Peer Configuration

```yaml
# In docker-compose
environment:
  - CORE_CHAINCODE_EXECUTETIMEOUT=300s
  - CORE_PEER_GOSSIP_DIALINTERVAL=4s
  - CORE_PEER_GOSSIP_PUBLISHCERTPERIOD=10s
```

### Database Optimization

```bash
# PostgreSQL tuning
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

## Troubleshooting

### Common Issues

#### 1. Peer Connection Issues

```bash
# Check peer logs
docker logs peer0.hospital1.emr.com

# Verify network connectivity
telnet peer0.hospital2.emr.com 9051

# Check TLS certificates
openssl x509 -in crypto-config/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/server.crt -text -noout
```

#### 2. Chaincode Issues

```bash
# Check chaincode logs
docker logs dev-peer0.hospital1.emr.com-emr-chaincode-1.0

# Reinstall chaincode
./scripts/deploy-chaincode.sh upgrade 1.1 2
```

#### 3. Orderer Issues

```bash
# Check orderer logs
docker logs orderer.emr.com

# Verify orderer connectivity
curl -k https://localhost:7050/healthz
```

### Log Analysis

```bash
# Centralized logging
docker logs --tail 100 -f peer0.hospital1.emr.com

# Search for errors
docker logs peer0.hospital1.emr.com 2>&1 | grep -i error

# Monitor real-time
docker stats
```

## Maintenance

### Regular Tasks

1. **Certificate Renewal** (Every 90 days)
2. **Backup Verification** (Weekly)
3. **Performance Monitoring** (Daily)
4. **Security Updates** (Monthly)
5. **Log Rotation** (Daily)

### Upgrade Procedure

```bash
# 1. Backup current state
./scripts/backup-network.sh

# 2. Stop network
./scripts/deploy-production-network.sh down

# 3. Update binaries
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.1

# 4. Update chaincode
./scripts/deploy-chaincode.sh upgrade 1.1 2

# 5. Restart network
./scripts/deploy-production-network.sh
```

## Compliance and Auditing

### HIPAA Compliance

- All data encrypted in transit and at rest
- Audit logs for all access
- User authentication and authorization
- Data backup and recovery procedures

### Audit Trail

```bash
# Enable comprehensive auditing
AUDIT_ENABLED=true
AUDIT_LOG_LEVEL=info
AUDIT_RETENTION_DAYS=2555
```

### Compliance Reports

```bash
# Generate compliance report
npm run audit:compliance

# Export audit logs
npm run audit:export --from=2024-01-01 --to=2024-12-31
```

## Support and Maintenance

### Health Checks

```bash
# Network health
curl http://localhost:9090/api/v1/query?query=up

# Application health
curl https://localhost:3443/api/v1/health

# Database health
npm run db:health
```

### Contact Information

- **Technical Support**: support@your-domain.com
- **Emergency Contact**: emergency@your-domain.com
- **Documentation**: https://docs.your-domain.com

## Appendix

### Environment Variables Reference

See `.env.production` for complete configuration options.

### Port Reference

| Service         | Port  | Protocol | Description           |
| --------------- | ----- | -------- | --------------------- |
| Orderer         | 7050  | gRPC/TLS | Orderer service       |
| Hospital1 Peer0 | 7051  | gRPC/TLS | Peer service          |
| Hospital1 Peer1 | 8051  | gRPC/TLS | Peer service          |
| Hospital2 Peer0 | 9051  | gRPC/TLS | Peer service          |
| Hospital2 Peer1 | 10051 | gRPC/TLS | Peer service          |
| Regulator Peer0 | 11051 | gRPC/TLS | Peer service          |
| Hospital1 CA    | 7054  | HTTPS    | Certificate Authority |
| Hospital2 CA    | 8054  | HTTPS    | Certificate Authority |
| Regulator CA    | 9054  | HTTPS    | Certificate Authority |
| Prometheus      | 9090  | HTTP     | Metrics collection    |
| Grafana         | 3000  | HTTP     | Monitoring dashboard  |
| Alertmanager    | 9093  | HTTP     | Alert management      |

### Command Reference

```bash
# Network management
./scripts/deploy-production-network.sh [start|stop|restart|clean]

# Chaincode management
./scripts/deploy-chaincode.sh [deploy|upgrade|test|query]

# Monitoring management
./scripts/setup-monitoring.sh [start|stop|restart|clean]

# Testing
./scripts/test-network.sh [basic|performance|security|compliance]

# Backup and recovery
./scripts/backup-network.sh
./scripts/restore-network.sh <backup-file>
```

## Quick Start Commands

```bash
# Complete production deployment
npm run fabric:deploy:production

# Test network functionality
npm run fabric:test:all

# Monitor network health
npm run fabric:monitor

# Backup network state
npm run fabric:backup

# Clean and restart
npm run fabric:clean && npm run fabric:deploy:production
```

## Production Checklist

### Pre-Deployment

- [ ] System requirements verified
- [ ] TLS certificates generated/obtained
- [ ] HSM configured (if applicable)
- [ ] Database configured and secured
- [ ] Firewall rules configured
- [ ] DNS records configured
- [ ] Backup strategy implemented

### Post-Deployment

- [ ] Network connectivity verified
- [ ] Chaincode deployed and tested
- [ ] Monitoring configured
- [ ] Alerting tested
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Team training completed

## Security Best Practices

### Network Security

- Use TLS 1.3 for all communications
- Implement proper firewall rules
- Regular security audits
- Certificate rotation procedures
- Network segmentation

### Application Security

- Input validation and sanitization
- Proper authentication and authorization
- Secure session management
- Regular dependency updates
- Code security reviews

### Data Security

- Encryption at rest and in transit
- Proper key management (HSM)
- Data classification and handling
- Privacy controls (GDPR/HIPAA)
- Audit trail maintenance

## Disaster Recovery

### Recovery Time Objectives (RTO)

- **Critical Systems**: 4 hours
- **Non-Critical Systems**: 24 hours
- **Data Recovery**: 1 hour

### Recovery Point Objectives (RPO)

- **Transaction Data**: 15 minutes
- **Configuration Data**: 1 hour
- **Log Data**: 24 hours

### Disaster Recovery Procedures

1. **Assess Impact**: Determine scope of failure
2. **Activate DR Plan**: Notify stakeholders
3. **Restore Infrastructure**: Bring up backup systems
4. **Restore Data**: Apply latest backups
5. **Verify Functionality**: Test all systems
6. **Resume Operations**: Switch traffic to DR site
7. **Post-Incident Review**: Document lessons learned

## Conclusion

This production deployment guide provides a comprehensive framework for
deploying and maintaining a secure, scalable, and compliant Hyperledger Fabric
network for the EMR blockchain system. Regular monitoring, maintenance, and
updates are essential for optimal performance and security.

For additional support or questions, please refer to the support contacts listed
in this document or consult the official Hyperledger Fabric documentation.
