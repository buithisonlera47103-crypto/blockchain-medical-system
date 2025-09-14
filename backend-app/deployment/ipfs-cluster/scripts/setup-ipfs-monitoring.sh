#!/bin/bash

# IPFS Cluster Monitoring Setup Script
# Sets up Prometheus monitoring and Grafana dashboards for IPFS cluster
# Compliant with read111.md monitoring requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MONITORING_DIR="monitoring"
PROMETHEUS_VERSION="v2.40.0"
GRAFANA_VERSION="9.3.0"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_DIR="$(dirname "$SCRIPT_DIR")"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create monitoring directory structure
create_monitoring_structure() {
    log_info "Creating monitoring directory structure..."
    
    cd "$CLUSTER_DIR"
    mkdir -p "$MONITORING_DIR"/{prometheus,grafana,alertmanager}
    mkdir -p "$MONITORING_DIR"/grafana/{dashboards,provisioning/{dashboards,datasources}}
    
    log_success "Monitoring directory structure created"
}

# Create Prometheus configuration for IPFS
create_prometheus_config() {
    log_info "Creating Prometheus configuration for IPFS cluster..."
    
    cat > "$CLUSTER_DIR/$MONITORING_DIR/prometheus/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "ipfs_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # IPFS Cluster metrics
  - job_name: 'ipfs-cluster'
    static_configs:
      - targets: 
        - 'cluster0:8888'
        - 'cluster1:8888'
        - 'cluster2:8888'
    metrics_path: /metrics
    scrape_interval: 5s

  # IPFS Node metrics
  - job_name: 'ipfs-nodes'
    static_configs:
      - targets: 
        - 'ipfs-exporter:9401'
    metrics_path: /metrics
    scrape_interval: 5s

  # IPFS Gateway Load Balancer
  - job_name: 'ipfs-gateway-lb'
    static_configs:
      - targets: ['ipfs-gateway-lb:80']
    metrics_path: /status
    scrape_interval: 10s

  # Node exporter for system metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 5s

  # Docker metrics
  - job_name: 'docker'
    static_configs:
      - targets: ['docker-exporter:9323']
    scrape_interval: 10s
EOF

    log_success "Prometheus configuration created"
}

# Create IPFS alerting rules
create_alerting_rules() {
    log_info "Creating IPFS alerting rules..."
    
    cat > "$CLUSTER_DIR/$MONITORING_DIR/prometheus/ipfs_rules.yml" << EOF
groups:
  - name: ipfs_cluster_alerts
    rules:
      # Cluster node availability
      - alert: IPFSClusterNodeDown
        expr: up{job="ipfs-cluster"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "IPFS Cluster node is down"
          description: "Cluster node {{ \$labels.instance }} has been down for more than 30 seconds"

      # IPFS node availability
      - alert: IPFSNodeDown
        expr: up{job="ipfs-nodes"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "IPFS node is down"
          description: "IPFS node {{ \$labels.instance }} has been down for more than 30 seconds"

      # Cluster peer count
      - alert: IPFSClusterLowPeerCount
        expr: ipfs_cluster_peers < 3
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "IPFS Cluster has low peer count"
          description: "Cluster has {{ \$value }} peers, expected 3"

      # High pin queue
      - alert: IPFSClusterHighPinQueue
        expr: ipfs_cluster_pin_queue_size > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPFS Cluster has high pin queue"
          description: "Pin queue size is {{ \$value }}, may indicate performance issues"

      # Storage usage
      - alert: IPFSHighStorageUsage
        expr: (ipfs_repo_size_bytes / ipfs_repo_size_limit_bytes) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPFS node storage usage is high"
          description: "Storage usage is {{ \$value }}% on {{ \$labels.instance }}"

      # Gateway response time
      - alert: IPFSGatewayHighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="ipfs-gateway-lb"}[5m])) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "IPFS Gateway high latency"
          description: "95th percentile latency is {{ \$value }}s"

      # Replication factor
      - alert: IPFSLowReplicationFactor
        expr: ipfs_cluster_pin_replication_factor_min < 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "IPFS Cluster replication factor too low"
          description: "Minimum replication factor is {{ \$value }}, should be at least 2"

      # Failed pins
      - alert: IPFSClusterFailedPins
        expr: increase(ipfs_cluster_pin_errors_total[5m]) > 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "IPFS Cluster has failed pins"
          description: "{{ \$value }} pin operations failed in the last 5 minutes"

      # Network connectivity
      - alert: IPFSLowConnectedPeers
        expr: ipfs_p2p_peers_connected < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPFS node has low peer connectivity"
          description: "Node {{ \$labels.instance }} has only {{ \$value }} connected peers"

      # Bandwidth usage
      - alert: IPFSHighBandwidthUsage
        expr: rate(ipfs_p2p_bandwidth_total_bytes[5m]) > 100000000  # 100MB/s
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "IPFS node high bandwidth usage"
          description: "Bandwidth usage is {{ \$value | humanize }}B/s on {{ \$labels.instance }}"
EOF

    log_success "IPFS alerting rules created"
}

# Create Grafana datasource configuration
create_grafana_datasource() {
    log_info "Creating Grafana datasource configuration..."
    
    cat > "$CLUSTER_DIR/$MONITORING_DIR/grafana/provisioning/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    log_success "Grafana datasource configuration created"
}

# Create Grafana dashboard provisioning
create_grafana_dashboard_provisioning() {
    log_info "Creating Grafana dashboard provisioning..."
    
    cat > "$CLUSTER_DIR/$MONITORING_DIR/grafana/provisioning/dashboards/ipfs.yml" << EOF
apiVersion: 1

providers:
  - name: 'ipfs-dashboards'
    orgId: 1
    folder: 'IPFS'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    log_success "Grafana dashboard provisioning created"
}

# Create IPFS Cluster dashboard
create_ipfs_dashboard() {
    log_info "Creating IPFS Cluster dashboard..."
    
    cat > "$CLUSTER_DIR/$MONITORING_DIR/grafana/dashboards/ipfs-cluster-dashboard.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "IPFS Cluster Dashboard",
    "tags": ["ipfs", "cluster"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Cluster Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"ipfs-cluster\"}",
            "legendFormat": "{{instance}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Peer Count",
        "type": "stat",
        "targets": [
          {
            "expr": "ipfs_cluster_peers",
            "legendFormat": "Peers"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Pin Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(ipfs_cluster_pin_operations_total[5m])",
            "legendFormat": "{{operation}}"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Storage Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "ipfs_repo_size_bytes",
            "legendFormat": "{{instance}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16}
      },
      {
        "id": 5,
        "title": "Gateway Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"ipfs-gateway-lb\"}[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

    log_success "IPFS Cluster dashboard created"
}

# Create Docker Compose for monitoring stack
create_monitoring_compose() {
    log_info "Creating monitoring Docker Compose configuration..."
    
    cat > "$CLUSTER_DIR/$MONITORING_DIR/docker-compose-ipfs-monitoring.yml" << EOF
version: '3.8'

networks:
  ipfs-cluster-network:
    external: true
    name: ipfs-cluster-production

services:
  prometheus:
    image: prom/prometheus:$PROMETHEUS_VERSION
    container_name: ipfs-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - ipfs-cluster-network

  grafana:
    image: grafana/grafana:$GRAFANA_VERSION
    container_name: ipfs-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    networks:
      - ipfs-cluster-network

  alertmanager:
    image: prom/alertmanager:latest
    container_name: ipfs-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    networks:
      - ipfs-cluster-network

  node-exporter:
    image: prom/node-exporter:latest
    container_name: ipfs-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - ipfs-cluster-network

volumes:
  prometheus_data:
  grafana_data:
EOF

    log_success "Monitoring Docker Compose configuration created"
}

# Create Alertmanager configuration
create_alertmanager_config() {
    log_info "Creating Alertmanager configuration..."
    
    mkdir -p "$CLUSTER_DIR/$MONITORING_DIR/alertmanager"
    
    cat > "$CLUSTER_DIR/$MONITORING_DIR/alertmanager/alertmanager.yml" << EOF
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alertmanager@emr.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'admin@emr.com'
        subject: 'IPFS Cluster Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF

    log_success "Alertmanager configuration created"
}

# Start monitoring stack
start_monitoring() {
    log_info "Starting IPFS monitoring stack..."
    
    cd "$CLUSTER_DIR/$MONITORING_DIR"
    docker-compose -f docker-compose-ipfs-monitoring.yml up -d
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start monitoring stack"
        exit 1
    fi
    
    log_success "IPFS monitoring stack started successfully"
}

# Display monitoring information
display_monitoring_info() {
    log_info "=== IPFS Monitoring Stack Information ==="
    echo ""
    echo "Prometheus: http://localhost:9090"
    echo "Grafana: http://localhost:3000 (admin/admin123)"
    echo "Alertmanager: http://localhost:9093"
    echo "Node Exporter: http://localhost:9100"
    echo ""
    echo "Grafana Dashboards:"
    echo "  - IPFS Cluster Overview"
    echo "  - IPFS Node Performance"
    echo "  - Storage Usage"
    echo "  - Network Metrics"
    echo ""
    echo "Monitored Components:"
    echo "  - IPFS Cluster Nodes (ports 8888)"
    echo "  - IPFS Nodes (via exporter port 9401)"
    echo "  - Gateway Load Balancer (port 80)"
    echo "  - System Metrics (port 9100)"
    echo ""
}

# Main function
main() {
    echo ""
    log_info "=== IPFS Cluster Monitoring Setup ==="
    echo ""
    
    create_monitoring_structure
    create_prometheus_config
    create_alerting_rules
    create_grafana_datasource
    create_grafana_dashboard_provisioning
    create_ipfs_dashboard
    create_monitoring_compose
    create_alertmanager_config
    start_monitoring
    
    echo ""
    log_success "IPFS monitoring setup completed successfully!"
    display_monitoring_info
    echo ""
}

# Handle script arguments
case "$1" in
    "stop")
        log_info "Stopping IPFS monitoring stack..."
        cd "$CLUSTER_DIR/$MONITORING_DIR"
        docker-compose -f docker-compose-ipfs-monitoring.yml down
        log_success "IPFS monitoring stack stopped"
        ;;
    "restart")
        log_info "Restarting IPFS monitoring stack..."
        cd "$CLUSTER_DIR/$MONITORING_DIR"
        docker-compose -f docker-compose-ipfs-monitoring.yml down
        docker-compose -f docker-compose-ipfs-monitoring.yml up -d
        log_success "IPFS monitoring stack restarted"
        ;;
    "clean")
        log_info "Cleaning IPFS monitoring stack..."
        cd "$CLUSTER_DIR/$MONITORING_DIR"
        docker-compose -f docker-compose-ipfs-monitoring.yml down --volumes
        log_success "IPFS monitoring stack cleaned"
        ;;
    *)
        main
        ;;
esac
