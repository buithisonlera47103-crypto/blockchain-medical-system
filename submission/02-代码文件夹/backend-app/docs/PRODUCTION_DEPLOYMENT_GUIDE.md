# EMR Blockchain System - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the EMR blockchain
system to production. It covers all components including Fabric network, IPFS
cluster, monitoring stack, and application services with full compliance to
read111.md requirements.

## Prerequisites

### Hardware Requirements

#### Minimum Production Requirements

- **CPU**: 16 cores (Intel Xeon or AMD EPYC)
- **RAM**: 64GB DDR4
- **Storage**: 2TB NVMe SSD (primary) + 4TB SSD (backup)
- **Network**: 10Gbps network interface
- **Redundancy**: Multiple servers for high availability

#### Recommended Production Setup

- **CPU**: 32 cores per server
- **RAM**: 128GB per server
- **Storage**: 4TB NVMe SSD + 8TB backup storage
- **Network**: 25Gbps with redundant connections
- **Servers**: 5+ servers for full redundancy

### Software Requirements

#### Operating System

- **Primary**: Ubuntu 22.04 LTS Server
- **Alternative**: RHEL 8.x or CentOS Stream 8

#### Container Runtime

- **Docker**: 24.0.x or later
- **Docker Compose**: 2.20.x or later
- **Kubernetes**: 1.28.x or later (optional)

#### Database

- **PostgreSQL**: 15.x or later
- **Redis**: 7.0.x or later

#### Security

- **TLS**: 1.3 minimum
- **HSM**: Hardware Security Module support
- **Firewall**: UFW or iptables configured

## Pre-Deployment Checklist

### Security Configuration

- [ ] TLS 1.3 certificates installed and configured
- [ ] HSM integration tested and operational
- [ ] Firewall rules configured and tested
- [ ] SSH keys configured for secure access
- [ ] User access controls implemented
- [ ] Audit logging enabled

### Network Configuration

- [ ] DNS records configured
- [ ] Load balancer configured (if applicable)
- [ ] Network segmentation implemented
- [ ] VPN access configured for administrators
- [ ] Backup network connectivity verified

### Storage Configuration

- [ ] Primary storage mounted and configured
- [ ] Backup storage configured and tested
- [ ] Database storage optimized
- [ ] Log rotation configured
- [ ] Monitoring storage allocated

### Compliance Verification

- [ ] HIPAA compliance requirements reviewed
- [ ] Data retention policies implemented
- [ ] Backup and recovery procedures tested
- [ ] Incident response procedures documented
- [ ] Staff training completed

## Deployment Steps

### Step 1: System Preparation

#### 1.1 Update System

```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git jq bc htop iotop nethogs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 1.2 Configure System Limits

```bash
# Configure system limits for production
sudo tee -a /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Configure kernel parameters
sudo tee -a /etc/sysctl.conf << EOF
# Network optimization
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# File system optimization
fs.file-max = 2097152
vm.max_map_count = 262144
EOF

sudo sysctl -p
```

#### 1.3 Create Directory Structure

```bash
# Create application directories
sudo mkdir -p /opt/emr-blockchain/{fabric,ipfs,monitoring,backups,logs}
sudo chown -R $USER:$USER /opt/emr-blockchain

# Create data directories
sudo mkdir -p /data/{postgresql,redis,elasticsearch,prometheus,grafana}
sudo chown -R $USER:$USER /data
```

### Step 2: Database Setup

#### 2.1 Install and Configure PostgreSQL

```bash
# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15

# Configure PostgreSQL for production
sudo -u postgres psql << EOF
-- Create EMR database and user
CREATE DATABASE emr_blockchain;
CREATE USER emr_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE emr_blockchain TO emr_user;

-- Configure performance settings
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET max_connections = 200;

SELECT pg_reload_conf();
EOF

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

#### 2.2 Install and Configure Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for production
sudo tee /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
timeout 300
keepalive 60
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### Step 3: Deploy Fabric Network

#### 3.1 Clone Repository and Setup

```bash
# Clone the repository
cd /opt/emr-blockchain
git clone <repository-url> .

# Set environment variables
cp backend-app/.env.example backend-app/.env.production
# Edit .env.production with production values

# Install Node.js dependencies
cd backend-app
npm install --production
```

#### 3.2 Deploy Fabric Network

```bash
# Deploy production Fabric network
npm run fabric:deploy:production

# Verify deployment
npm run fabric:test:all
npm run fabric:health
```

### Step 4: Deploy IPFS Cluster

#### 4.1 Deploy IPFS Cluster

```bash
# Deploy production IPFS cluster
npm run ipfs:deploy:production

# Verify deployment
npm run ipfs:test:all
npm run ipfs:health
```

### Step 5: Deploy Monitoring Stack

#### 5.1 Configure Environment Variables

```bash
# Create monitoring environment file
cat > monitoring/.env << EOF
GRAFANA_ADMIN_PASSWORD=secure_grafana_password
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USERNAME=alerts@company.com
SMTP_PASSWORD=smtp_password
DOMAIN=company.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_SECURITY_KEY=your_pagerduty_key
PAGERDUTY_OPS_KEY=your_pagerduty_key
PAGERDUTY_BLOCKCHAIN_KEY=your_pagerduty_key
PAGERDUTY_DATABASE_KEY=your_pagerduty_key
EOF
```

#### 5.2 Deploy Monitoring Stack

```bash
# Deploy monitoring infrastructure
npm run monitor:deploy

# Verify monitoring deployment
npm run monitor:status
npm run monitor:health
```

### Step 6: Deploy Application Services

#### 6.1 Configure Application Environment

```bash
# Configure production environment
cat > backend-app/.env.production << EOF
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emr_blockchain
DB_USER=emr_user
DB_PASSWORD=secure_password_here
REDIS_HOST=localhost
REDIS_PORT=6379
FABRIC_NETWORK_PATH=/opt/emr-blockchain/fabric-network
IPFS_URL=http://localhost:8090
IPFS_CLUSTER_ENABLED=true
TLS_CERT_PATH=/etc/ssl/certs/emr-blockchain.crt
TLS_KEY_PATH=/etc/ssl/private/emr-blockchain.key
HSM_ENABLED=true
HSM_SLOT=0
HSM_PIN=hsm_pin_here
ENCRYPTION_KEY=32_byte_encryption_key_here
JWT_SECRET=jwt_secret_key_here
LOG_LEVEL=info
AUDIT_LOG_ENABLED=true
METRICS_ENABLED=true
EOF
```

#### 6.2 Initialize Database Schema

```bash
# Run database migrations
npm run db:migrate:production

# Seed initial data
npm run db:seed:production
```

#### 6.3 Start Application Services

```bash
# Start EMR backend service
npm run start:production

# Verify application health
curl -k https://localhost:3001/api/v1/health
```

### Step 7: Configure Load Balancer (Optional)

#### 7.1 Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx for EMR blockchain
sudo tee /etc/nginx/sites-available/emr-blockchain << EOF
upstream emr_backend {
    server 127.0.0.1:3001;
    # Add more backend servers for load balancing
}

server {
    listen 80;
    server_name emr.company.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name emr.company.com;

    ssl_certificate /etc/ssl/certs/emr-blockchain.crt;
    ssl_certificate_key /etc/ssl/private/emr-blockchain.key;
    ssl_protocols TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass https://emr_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/v1/health {
        proxy_pass https://emr_backend;
        access_log off;
    }
}
EOF

# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/emr-blockchain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 8: Configure Backup and Recovery

#### 8.1 Database Backup Configuration

```bash
# Create backup script
sudo tee /opt/emr-blockchain/scripts/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U emr_user -d emr_blockchain | gzip > $BACKUP_DIR/emr_backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "emr_backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: emr_backup_$DATE.sql.gz"
EOF

chmod +x /opt/emr-blockchain/scripts/backup-database.sh

# Schedule daily backups
echo "0 2 * * * /opt/emr-blockchain/scripts/backup-database.sh" | sudo crontab -
```

#### 8.2 System Backup Configuration

```bash
# Create system backup script
sudo tee /opt/emr-blockchain/scripts/backup-system.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/backups/system"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup configuration files
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz \
    /opt/emr-blockchain/backend-app/.env.production \
    /opt/emr-blockchain/fabric-network \
    /opt/emr-blockchain/monitoring \
    /etc/nginx/sites-available/emr-blockchain \
    /etc/ssl/certs/emr-blockchain.crt

# Backup application data
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
    /opt/emr-blockchain/backend-app \
    --exclude=node_modules \
    --exclude=logs

echo "System backup completed: config_backup_$DATE.tar.gz, app_backup_$DATE.tar.gz"
EOF

chmod +x /opt/emr-blockchain/scripts/backup-system.sh
```

### Step 9: Configure Monitoring and Alerting

#### 9.1 Start Continuous Health Monitoring

```bash
# Create systemd service for health monitoring
sudo tee /etc/systemd/system/emr-health-monitor.service << EOF
[Unit]
Description=EMR Blockchain Health Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/emr-blockchain/monitoring
ExecStart=/opt/emr-blockchain/monitoring/scripts/automated-health-check.sh continuous
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Enable and start health monitoring
sudo systemctl daemon-reload
sudo systemctl enable emr-health-monitor
sudo systemctl start emr-health-monitor
```

#### 9.2 Configure Log Rotation

```bash
# Configure log rotation for application logs
sudo tee /etc/logrotate.d/emr-blockchain << EOF
/opt/emr-blockchain/backend-app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload emr-backend || true
    endscript
}

/opt/emr-blockchain/monitoring/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
```

## Post-Deployment Verification

### Comprehensive System Test

```bash
# Run full system test suite
npm run system:full-test

# Verify 1000 TPS performance target
npm run perf:test:1000tps

# Check all health endpoints
npm run system:health

# Verify monitoring and alerting
npm run monitor:health
```

### Security Verification

```bash
# Verify TLS configuration
openssl s_client -connect localhost:443 -tls1_3

# Check certificate validity
openssl x509 -in /etc/ssl/certs/emr-blockchain.crt -text -noout

# Verify HSM integration
# (HSM-specific commands based on your HSM provider)

# Test authentication and authorization
curl -k https://localhost:3001/api/v1/auth/test
```

### Performance Verification

```bash
# Run performance test suite
npm run perf:test:all

# Monitor system resources during load
htop
iotop
nethogs
```

## Operational Procedures

### Daily Operations

- [ ] Check system health dashboard
- [ ] Review overnight alerts and logs
- [ ] Verify backup completion
- [ ] Monitor performance metrics
- [ ] Check security logs for anomalies

### Weekly Operations

- [ ] Review performance trends
- [ ] Update security patches
- [ ] Test backup restoration
- [ ] Review capacity planning
- [ ] Conduct security scan

### Monthly Operations

- [ ] Perform disaster recovery test
- [ ] Review and update documentation
- [ ] Conduct security audit
- [ ] Review compliance requirements
- [ ] Plan capacity upgrades

## Troubleshooting

### Common Issues and Solutions

#### Application Won't Start

1. Check environment variables in `.env.production`
2. Verify database connectivity
3. Check certificate files and permissions
4. Review application logs

#### Performance Issues

1. Check system resources (CPU, memory, disk)
2. Review database performance
3. Analyze application metrics
4. Check network connectivity

#### Security Alerts

1. Follow incident response procedures
2. Check authentication logs
3. Verify certificate status
4. Review firewall logs

### Emergency Contacts

- **Primary On-Call**: +1-555-0123
- **Security Team**: +1-555-0124
- **Database Team**: +1-555-0125
- **Network Team**: +1-555-0126

## Compliance and Audit

### HIPAA Compliance Checklist

- [ ] Data encryption at rest and in transit
- [ ] Access controls and authentication
- [ ] Audit logging enabled and monitored
- [ ] Data backup and recovery procedures
- [ ] Incident response procedures documented
- [ ] Staff training completed
- [ ] Regular security assessments conducted

### Audit Trail

All system activities are logged and monitored:

- User authentication and authorization
- Data access and modifications
- System configuration changes
- Security events and incidents
- Performance and availability metrics

## Support and Maintenance

### Vendor Support

- **Hyperledger Fabric**: Community support + Enterprise support (if applicable)
- **IPFS**: Protocol Labs support
- **PostgreSQL**: Community support + Enterprise support (if applicable)
- **Monitoring Stack**: Community support

### Internal Support

- **Development Team**: backend-dev@company.com
- **Operations Team**: ops@company.com
- **Security Team**: security@company.com
- **Compliance Team**: compliance@company.com

### Documentation Updates

This guide should be updated whenever:

- System architecture changes
- New components are added
- Security procedures are modified
- Compliance requirements change
- Operational procedures are updated

For the most current version of this guide, refer to the project repository
documentation.
