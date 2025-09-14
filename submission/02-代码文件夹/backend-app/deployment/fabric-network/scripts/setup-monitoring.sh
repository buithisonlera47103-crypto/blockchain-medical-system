#!/bin/bash

# Fabric Network Monitoring Setup Script
# Sets up Prometheus and Grafana monitoring for production EMR network
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
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

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
    
    cd "$NETWORK_DIR"
    mkdir -p "$MONITORING_DIR"/{prometheus,grafana,alertmanager}
    mkdir -p "$MONITORING_DIR"/grafana/{dashboards,provisioning/{dashboards,datasources}}
    
    log_success "Monitoring directory structure created"
}

# Create Prometheus configuration
create_prometheus_config() {
    log_info "Creating Prometheus configuration..."
    
    cat > "$NETWORK_DIR/$MONITORING_DIR/prometheus/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "fabric_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Orderer metrics
  - job_name: 'fabric-orderer'
    static_configs:
      - targets: ['orderer.emr.com:17050']
    metrics_path: /metrics
    scrape_interval: 5s

  # Hospital1 peer metrics
  - job_name: 'fabric-peer-hospital1'
    static_configs:
      - targets: 
        - 'peer0.hospital1.emr.com:17051'
        - 'peer1.hospital1.emr.com:18051'
    metrics_path: /metrics
    scrape_interval: 5s

  # Hospital2 peer metrics
  - job_name: 'fabric-peer-hospital2'
    static_configs:
      - targets: 
        - 'peer0.hospital2.emr.com:19051'
        - 'peer1.hospital2.emr.com:20051'
    metrics_path: /metrics
    scrape_interval: 5s

  # Regulator peer metrics
  - job_name: 'fabric-peer-regulator'
    static_configs:
      - targets: ['peer0.regulator.emr.com:21051']
    metrics_path: /metrics
    scrape_interval: 5s

  # Certificate Authority metrics
  - job_name: 'fabric-ca'
    static_configs:
      - targets: 
        - 'ca.hospital1.emr.com:17054'
        - 'ca.hospital2.emr.com:18054'
        - 'ca.regulator.emr.com:19054'
    metrics_path: /metrics
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

# Create Fabric alerting rules
create_alerting_rules() {
    log_info "Creating Fabric alerting rules..."
    
    cat > "$NETWORK_DIR/$MONITORING_DIR/prometheus/fabric_rules.yml" << EOF
groups:
  - name: fabric_alerts
    rules:
      # Peer availability alerts
      - alert: PeerDown
        expr: up{job=~"fabric-peer.*"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Fabric peer is down"
          description: "Peer {{ \$labels.instance }} has been down for more than 30 seconds"

      # Orderer availability alerts
      - alert: OrdererDown
        expr: up{job="fabric-orderer"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Fabric orderer is down"
          description: "Orderer {{ \$labels.instance }} has been down for more than 30 seconds"

      # High transaction latency
      - alert: HighTransactionLatency
        expr: fabric_endorser_proposal_duration_sum / fabric_endorser_proposal_duration_count > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High transaction latency detected"
          description: "Average transaction latency is {{ \$value }}s on {{ \$labels.instance }}"

      # Block production rate
      - alert: LowBlockProductionRate
        expr: rate(fabric_ledger_block_commits_total[5m]) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low block production rate"
          description: "Block production rate is {{ \$value }} blocks/sec on {{ \$labels.instance }}"

      # Certificate Authority availability
      - alert: CADown
        expr: up{job="fabric-ca"} == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Certificate Authority is down"
          description: "CA {{ \$labels.instance }} has been down for more than 1 minute"

      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ \$value }}% on {{ \$labels.instance }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ \$value }}% on {{ \$labels.instance }}"

      # Disk space usage
      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage detected"
          description: "Disk usage is {{ \$value }}% on {{ \$labels.instance }}"
EOF

    log_success "Fabric alerting rules created"
}

# Create Grafana datasource configuration
create_grafana_datasource() {
    log_info "Creating Grafana datasource configuration..."
    
    cat > "$NETWORK_DIR/$MONITORING_DIR/grafana/provisioning/datasources/prometheus.yml" << EOF
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
    
    cat > "$NETWORK_DIR/$MONITORING_DIR/grafana/provisioning/dashboards/fabric.yml" << EOF
apiVersion: 1

providers:
  - name: 'fabric-dashboards'
    orgId: 1
    folder: 'Fabric'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    log_success "Grafana dashboard provisioning created"
}

# Create Docker Compose for monitoring stack
create_monitoring_compose() {
    log_info "Creating monitoring Docker Compose configuration..."
    
    cat > "$NETWORK_DIR/$MONITORING_DIR/docker-compose-monitoring.yml" << EOF
version: '3.8'

networks:
  emr-network:
    external: true
    name: emr-production-network

services:
  prometheus:
    image: prom/prometheus:$PROMETHEUS_VERSION
    container_name: prometheus
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
      - emr-network

  grafana:
    image: grafana/grafana:$GRAFANA_VERSION
    container_name: grafana
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
    networks:
      - emr-network

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    networks:
      - emr-network

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
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
      - emr-network

volumes:
  prometheus_data:
  grafana_data:
EOF

    log_success "Monitoring Docker Compose configuration created"
}

# Create Alertmanager configuration
create_alertmanager_config() {
    log_info "Creating Alertmanager configuration..."
    
    mkdir -p "$NETWORK_DIR/$MONITORING_DIR/alertmanager"
    
    cat > "$NETWORK_DIR/$MONITORING_DIR/alertmanager/alertmanager.yml" << EOF
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
        subject: 'EMR Fabric Network Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

    log_success "Alertmanager configuration created"
}

# Start monitoring stack
start_monitoring() {
    log_info "Starting monitoring stack..."
    
    cd "$NETWORK_DIR/$MONITORING_DIR"
    docker-compose -f docker-compose-monitoring.yml up -d
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start monitoring stack"
        exit 1
    fi
    
    log_success "Monitoring stack started successfully"
}

# Display monitoring information
display_monitoring_info() {
    log_info "=== Monitoring Stack Information ==="
    echo ""
    echo "Prometheus: http://localhost:9090"
    echo "Grafana: http://localhost:3000 (admin/admin123)"
    echo "Alertmanager: http://localhost:9093"
    echo "Node Exporter: http://localhost:9100"
    echo ""
    echo "Grafana Dashboards:"
    echo "  - Fabric Network Overview"
    echo "  - Peer Performance"
    echo "  - Orderer Performance"
    echo "  - System Metrics"
    echo ""
    echo "Monitored Components:"
    echo "  - Orderer (port 17050)"
    echo "  - Hospital1 Peers (ports 17051, 18051)"
    echo "  - Hospital2 Peers (ports 19051, 20051)"
    echo "  - Regulator Peer (port 21051)"
    echo "  - Certificate Authorities (ports 17054, 18054, 19054)"
    echo ""
}

# Main function
main() {
    echo ""
    log_info "=== EMR Fabric Network Monitoring Setup ==="
    echo ""
    
    create_monitoring_structure
    create_prometheus_config
    create_alerting_rules
    create_grafana_datasource
    create_grafana_dashboard_provisioning
    create_monitoring_compose
    create_alertmanager_config
    start_monitoring
    
    echo ""
    log_success "Monitoring setup completed successfully!"
    display_monitoring_info
    echo ""
}

# Handle script arguments
case "$1" in
    "stop")
        log_info "Stopping monitoring stack..."
        cd "$NETWORK_DIR/$MONITORING_DIR"
        docker-compose -f docker-compose-monitoring.yml down
        log_success "Monitoring stack stopped"
        ;;
    "restart")
        log_info "Restarting monitoring stack..."
        cd "$NETWORK_DIR/$MONITORING_DIR"
        docker-compose -f docker-compose-monitoring.yml down
        docker-compose -f docker-compose-monitoring.yml up -d
        log_success "Monitoring stack restarted"
        ;;
    "clean")
        log_info "Cleaning monitoring stack..."
        cd "$NETWORK_DIR/$MONITORING_DIR"
        docker-compose -f docker-compose-monitoring.yml down --volumes
        log_success "Monitoring stack cleaned"
        ;;
    *)
        main
        ;;
esac
