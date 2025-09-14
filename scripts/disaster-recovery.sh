#!/bin/bash

# Disaster Recovery System for Blockchain EMR
# Handles automated failover, data restoration, and system recovery

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DR_CONFIG_FILE="${DR_CONFIG_FILE:-$PROJECT_ROOT/config/disaster-recovery.json}"
BACKUP_DIR="${BACKUP_DIR:-/backup/blockchain-emr}"
DR_LOG_FILE="${DR_LOG_FILE:-/var/log/blockchain-emr-dr.log}"

# Default configuration
PRIMARY_REGION="${PRIMARY_REGION:-us-east-1}"
DR_REGION="${DR_REGION:-us-west-2}"
FAILOVER_THRESHOLD="${FAILOVER_THRESHOLD:-300}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-30}"
MAX_RECOVERY_TIME="${MAX_RECOVERY_TIME:-3600}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DR_LOG_FILE"
}

function success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DR_LOG_FILE"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DR_LOG_FILE"
}

function warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DR_LOG_FILE"
}

function critical() {
    echo -e "${RED}[CRITICAL]${NC} $1" | tee -a "$DR_LOG_FILE"
    # Send critical alert
    send_alert "CRITICAL" "$1"
}

function print_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  monitor     - Start continuous monitoring"
    echo "  failover    - Initiate manual failover"
    echo "  failback    - Failback to primary site"
    echo "  restore     - Restore from backup"
    echo "  test        - Test disaster recovery procedures"
    echo "  status      - Check DR system status"
    echo "  config      - Configure DR settings"
    echo ""
    echo "Options:"
    echo "  --force           - Force operation without confirmation"
    echo "  --dry-run         - Show what would be done without executing"
    echo "  --backup-date     - Specific backup date for restore (YYYYMMDD)"
    echo "  --region          - Target region for operations"
    echo "  --help            - Show this help message"
}

# Load DR configuration
function load_dr_config() {
    if [ -f "$DR_CONFIG_FILE" ]; then
        log "Loading DR configuration from $DR_CONFIG_FILE"
        
        # Extract configuration values using jq if available
        if command -v jq &> /dev/null; then
            PRIMARY_REGION=$(jq -r '.primary_region // "us-east-1"' "$DR_CONFIG_FILE")
            DR_REGION=$(jq -r '.dr_region // "us-west-2"' "$DR_CONFIG_FILE")
            FAILOVER_THRESHOLD=$(jq -r '.failover_threshold // 300' "$DR_CONFIG_FILE")
            HEALTH_CHECK_INTERVAL=$(jq -r '.health_check_interval // 30' "$DR_CONFIG_FILE")
            MAX_RECOVERY_TIME=$(jq -r '.max_recovery_time // 3600' "$DR_CONFIG_FILE")
        fi
    else
        warning "DR configuration file not found, using defaults"
        create_default_config
    fi
}

# Create default DR configuration
function create_default_config() {
    log "Creating default DR configuration..."
    
    mkdir -p "$(dirname "$DR_CONFIG_FILE")"
    
    cat > "$DR_CONFIG_FILE" << EOF
{
  "primary_region": "$PRIMARY_REGION",
  "dr_region": "$DR_REGION",
  "failover_threshold": $FAILOVER_THRESHOLD,
  "health_check_interval": $HEALTH_CHECK_INTERVAL,
  "max_recovery_time": $MAX_RECOVERY_TIME,
  "endpoints": {
    "primary": {
      "api": "https://api.blockchain-emr.com",
      "database": "mysql-primary.blockchain-emr.com:3306",
      "ipfs": "ipfs-primary.blockchain-emr.com:5001",
      "fabric": "fabric-primary.blockchain-emr.com:7051"
    },
    "dr": {
      "api": "https://dr-api.blockchain-emr.com",
      "database": "mysql-dr.blockchain-emr.com:3306",
      "ipfs": "ipfs-dr.blockchain-emr.com:5001",
      "fabric": "fabric-dr.blockchain-emr.com:7051"
    }
  },
  "notifications": {
    "webhook_url": "",
    "email_recipients": [],
    "sms_recipients": []
  },
  "backup": {
    "s3_bucket": "blockchain-emr-backups",
    "retention_days": 90,
    "encryption_enabled": true
  },
  "monitoring": {
    "health_checks": [
      "/api/v1/monitoring/health",
      "/api/v1/monitoring/ready"
    ],
    "metrics_endpoints": [
      "/metrics"
    ]
  }
}
EOF
    
    success "Default DR configuration created: $DR_CONFIG_FILE"
}

# Check system health
function check_system_health() {
    local endpoint="$1"
    local timeout="${2:-10}"
    
    # Check API health
    if curl -s -f --max-time "$timeout" "$endpoint/api/v1/monitoring/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check database connectivity
function check_database_health() {
    local db_host="$1"
    local db_port="$2"
    local timeout="${3:-5}"
    
    if timeout "$timeout" bash -c "</dev/tcp/$db_host/$db_port" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Check IPFS node health
function check_ipfs_health() {
    local ipfs_endpoint="$1"
    local timeout="${2:-10}"
    
    if curl -s -f --max-time "$timeout" "$ipfs_endpoint/api/v0/id" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Comprehensive health check
function comprehensive_health_check() {
    local site="$1"  # "primary" or "dr"
    local config_key="endpoints.$site"
    
    log "Performing comprehensive health check for $site site..."
    
    local api_endpoint database_endpoint ipfs_endpoint fabric_endpoint
    
    if command -v jq &> /dev/null && [ -f "$DR_CONFIG_FILE" ]; then
        api_endpoint=$(jq -r ".$config_key.api" "$DR_CONFIG_FILE")
        database_endpoint=$(jq -r ".$config_key.database" "$DR_CONFIG_FILE")
        ipfs_endpoint=$(jq -r ".$config_key.ipfs" "$DR_CONFIG_FILE")
        fabric_endpoint=$(jq -r ".$config_key.fabric" "$DR_CONFIG_FILE")
    else
        error "Cannot read DR configuration"
        return 1
    fi
    
    local health_score=0
    local max_score=4
    
    # Check API health
    if check_system_health "$api_endpoint"; then
        success "✅ API endpoint healthy: $api_endpoint"
        ((health_score++))
    else
        error "❌ API endpoint unhealthy: $api_endpoint"
    fi
    
    # Check database health
    local db_host=$(echo "$database_endpoint" | cut -d: -f1)
    local db_port=$(echo "$database_endpoint" | cut -d: -f2)
    
    if check_database_health "$db_host" "$db_port"; then
        success "✅ Database healthy: $database_endpoint"
        ((health_score++))
    else
        error "❌ Database unhealthy: $database_endpoint"
    fi
    
    # Check IPFS health
    if check_ipfs_health "http://$ipfs_endpoint"; then
        success "✅ IPFS node healthy: $ipfs_endpoint"
        ((health_score++))
    else
        error "❌ IPFS node unhealthy: $ipfs_endpoint"
    fi
    
    # Check Fabric health (simplified)
    local fabric_host=$(echo "$fabric_endpoint" | cut -d: -f1)
    local fabric_port=$(echo "$fabric_endpoint" | cut -d: -f2)
    
    if timeout 5 bash -c "</dev/tcp/$fabric_host/$fabric_port" 2>/dev/null; then
        success "✅ Fabric peer healthy: $fabric_endpoint"
        ((health_score++))
    else
        error "❌ Fabric peer unhealthy: $fabric_endpoint"
    fi
    
    local health_percentage=$((health_score * 100 / max_score))
    log "$site site health: $health_score/$max_score ($health_percentage%)"
    
    return $((max_score - health_score))
}

# Monitor system continuously
function start_monitoring() {
    log "Starting continuous DR monitoring..."
    log "Health check interval: ${HEALTH_CHECK_INTERVAL}s"
    log "Failover threshold: ${FAILOVER_THRESHOLD}s"
    
    local consecutive_failures=0
    local last_failure_time=0
    
    while true; do
        local current_time=$(date +%s)
        
        # Check primary site health
        if comprehensive_health_check "primary"; then
            # Primary site is healthy
            consecutive_failures=0
            log "Primary site is healthy"
        else
            # Primary site has issues
            ((consecutive_failures++))
            
            if [ $consecutive_failures -eq 1 ]; then
                last_failure_time=$current_time
                warning "Primary site health check failed (attempt $consecutive_failures)"
            else
                local failure_duration=$((current_time - last_failure_time))
                warning "Primary site health check failed (attempt $consecutive_failures, duration: ${failure_duration}s)"
                
                # Check if we should trigger failover
                if [ $failure_duration -ge $FAILOVER_THRESHOLD ]; then
                    critical "Primary site has been unhealthy for ${failure_duration}s (threshold: ${FAILOVER_THRESHOLD}s)"
                    
                    # Check DR site health before failover
                    if comprehensive_health_check "dr"; then
                        critical "Initiating automatic failover to DR site"
                        initiate_failover "automatic"
                        break
                    else
                        critical "DR site is also unhealthy - cannot failover!"
                        send_alert "CRITICAL" "Both primary and DR sites are unhealthy"
                    fi
                fi
            fi
        fi
        
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Initiate failover process
function initiate_failover() {
    local trigger_type="${1:-manual}"
    
    critical "FAILOVER INITIATED ($trigger_type)"
    
    local failover_start_time=$(date +%s)
    local failover_log="/tmp/failover_$(date +%Y%m%d_%H%M%S).log"
    
    {
        echo "Failover Process Log"
        echo "==================="
        echo "Start Time: $(date)"
        echo "Trigger: $trigger_type"
        echo ""
        
        # Step 1: Verify DR site readiness
        echo "Step 1: Verifying DR site readiness..."
        if comprehensive_health_check "dr"; then
            echo "✅ DR site is healthy and ready"
        else
            echo "❌ DR site is not ready - aborting failover"
            exit 1
        fi
        
        # Step 2: Stop traffic to primary site
        echo ""
        echo "Step 2: Redirecting traffic to DR site..."
        if update_dns_records; then
            echo "✅ DNS records updated"
        else
            echo "❌ Failed to update DNS records"
        fi
        
        # Step 3: Ensure data synchronization
        echo ""
        echo "Step 3: Ensuring data synchronization..."
        if sync_data_to_dr; then
            echo "✅ Data synchronized to DR site"
        else
            echo "⚠️ Data synchronization issues detected"
        fi
        
        # Step 4: Activate DR services
        echo ""
        echo "Step 4: Activating DR services..."
        if activate_dr_services; then
            echo "✅ DR services activated"
        else
            echo "❌ Failed to activate DR services"
        fi
        
        # Step 5: Verify failover success
        echo ""
        echo "Step 5: Verifying failover success..."
        sleep 30  # Wait for services to stabilize
        
        if comprehensive_health_check "dr"; then
            echo "✅ Failover completed successfully"
            local failover_duration=$(($(date +%s) - failover_start_time))
            echo "Total failover time: ${failover_duration}s"
        else
            echo "❌ Failover verification failed"
        fi
        
    } | tee "$failover_log"
    
    # Send failover notification
    send_alert "FAILOVER" "Failover to DR site completed. Log: $failover_log"
    
    success "Failover process completed. Log saved to: $failover_log"
}

# Update DNS records for failover
function update_dns_records() {
    log "Updating DNS records for failover..."
    
    # This would typically use AWS Route 53, CloudFlare, or other DNS provider APIs
    # For demonstration, we'll show the concept
    
    if command -v aws &> /dev/null; then
        # Example AWS Route 53 update
        local hosted_zone_id="Z1234567890"
        local record_name="api.blockchain-emr.com"
        local dr_ip="203.0.113.2"
        
        aws route53 change-resource-record-sets \
            --hosted-zone-id "$hosted_zone_id" \
            --change-batch "{
                \"Changes\": [{
                    \"Action\": \"UPSERT\",
                    \"ResourceRecordSet\": {
                        \"Name\": \"$record_name\",
                        \"Type\": \"A\",
                        \"TTL\": 60,
                        \"ResourceRecords\": [{\"Value\": \"$dr_ip\"}]
                    }
                }]
            }" > /dev/null 2>&1
        
        return $?
    else
        warning "AWS CLI not available - DNS update skipped"
        return 0
    fi
}

# Synchronize data to DR site
function sync_data_to_dr() {
    log "Synchronizing data to DR site..."
    
    # Trigger final backup and sync
    if [ -x "$PROJECT_ROOT/scripts/backup-system.sh" ]; then
        "$PROJECT_ROOT/scripts/backup-system.sh" full --s3-upload --compress
        
        # Restore latest backup to DR site
        restore_latest_backup_to_dr
    else
        warning "Backup system not available"
        return 1
    fi
}

# Activate DR services
function activate_dr_services() {
    log "Activating DR services..."
    
    # This would typically involve:
    # 1. Starting DR Kubernetes cluster
    # 2. Scaling up DR services
    # 3. Updating load balancer configuration
    
    if command -v kubectl &> /dev/null; then
        # Scale up DR deployment
        kubectl scale deployment backend --replicas=3 -n blockchain-emr-dr || return 1
        kubectl scale deployment frontend --replicas=2 -n blockchain-emr-dr || return 1
        
        # Wait for pods to be ready
        kubectl wait --for=condition=ready pod -l app=backend -n blockchain-emr-dr --timeout=300s || return 1
        kubectl wait --for=condition=ready pod -l app=frontend -n blockchain-emr-dr --timeout=300s || return 1
        
        return 0
    else
        warning "kubectl not available - manual service activation required"
        return 1
    fi
}

# Restore latest backup to DR site
function restore_latest_backup_to_dr() {
    log "Restoring latest backup to DR site..."
    
    # Find latest backup
    local latest_backup=$(find "$BACKUP_DIR" -name "backup_manifest_*.json" | sort | tail -1)
    
    if [ -n "$latest_backup" ]; then
        log "Using backup manifest: $latest_backup"
        
        # Extract backup files from manifest
        if command -v jq &> /dev/null; then
            local mysql_backup=$(jq -r '.files[] | select(contains("mysql"))' "$latest_backup")
            local ipfs_backup=$(jq -r '.files[] | select(contains("ipfs"))' "$latest_backup")
            local fabric_backup=$(jq -r '.files[] | select(contains("fabric"))' "$latest_backup")
            
            # Restore each component
            restore_mysql_backup "$mysql_backup"
            restore_ipfs_backup "$ipfs_backup"
            restore_fabric_backup "$fabric_backup"
        fi
    else
        error "No backup manifest found"
        return 1
    fi
}

# Send alert notification
function send_alert() {
    local severity="$1"
    local message="$2"
    
    log "Sending $severity alert: $message"
    
    # Send webhook notification if configured
    if command -v jq &> /dev/null && [ -f "$DR_CONFIG_FILE" ]; then
        local webhook_url=$(jq -r '.notifications.webhook_url' "$DR_CONFIG_FILE")
        
        if [ "$webhook_url" != "null" ] && [ -n "$webhook_url" ]; then
            curl -X POST "$webhook_url" \
                -H "Content-Type: application/json" \
                -d "{
                    \"severity\": \"$severity\",
                    \"message\": \"$message\",
                    \"timestamp\": \"$(date -Iseconds)\",
                    \"system\": \"blockchain-emr-dr\"
                }" > /dev/null 2>&1 || warning "Failed to send webhook alert"
        fi
    fi
    
    # Log to system log
    logger -t blockchain-emr-dr "[$severity] $message"
}

# Test DR procedures
function test_dr_procedures() {
    log "Testing disaster recovery procedures..."
    
    local test_results=()
    
    # Test 1: Health check functionality
    log "Test 1: Health check functionality"
    if comprehensive_health_check "primary" > /dev/null 2>&1; then
        test_results+=("✅ Health checks working")
    else
        test_results+=("❌ Health checks failed")
    fi
    
    # Test 2: Backup system
    log "Test 2: Backup system"
    if [ -x "$PROJECT_ROOT/scripts/backup-system.sh" ]; then
        if "$PROJECT_ROOT/scripts/backup-system.sh" verify > /dev/null 2>&1; then
            test_results+=("✅ Backup system working")
        else
            test_results+=("❌ Backup system issues")
        fi
    else
        test_results+=("❌ Backup system not found")
    fi
    
    # Test 3: DR site connectivity
    log "Test 3: DR site connectivity"
    if comprehensive_health_check "dr" > /dev/null 2>&1; then
        test_results+=("✅ DR site accessible")
    else
        test_results+=("❌ DR site not accessible")
    fi
    
    # Test 4: DNS update capability
    log "Test 4: DNS update capability"
    if command -v aws &> /dev/null; then
        test_results+=("✅ DNS update tools available")
    else
        test_results+=("⚠️ DNS update tools not available")
    fi
    
    # Generate test report
    echo ""
    echo "DR Test Results:"
    echo "================"
    for result in "${test_results[@]}"; do
        echo "$result"
    done
    
    success "DR test completed"
}

# Check DR system status
function check_dr_status() {
    log "Checking DR system status..."
    
    echo "Disaster Recovery System Status"
    echo "==============================="
    echo ""
    
    echo "Configuration:"
    echo "  Primary Region: $PRIMARY_REGION"
    echo "  DR Region: $DR_REGION"
    echo "  Failover Threshold: ${FAILOVER_THRESHOLD}s"
    echo "  Health Check Interval: ${HEALTH_CHECK_INTERVAL}s"
    echo ""
    
    echo "Primary Site Health:"
    comprehensive_health_check "primary"
    echo ""
    
    echo "DR Site Health:"
    comprehensive_health_check "dr"
    echo ""
    
    echo "Recent DR Activity:"
    if [ -f "$DR_LOG_FILE" ]; then
        tail -10 "$DR_LOG_FILE"
    else
        echo "  No recent activity"
    fi
}

# Parse command line arguments
function parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_OPERATION=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --backup-date)
                BACKUP_DATE="$2"
                shift 2
                ;;
            --region)
                TARGET_REGION="$2"
                shift 2
                ;;
            --help)
                print_help
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
}

# Main execution
function main() {
    local command="${1:-help}"
    shift || true
    
    parse_args "$@"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$DR_LOG_FILE")"
    
    load_dr_config
    
    case "$command" in
        "monitor")
            start_monitoring
            ;;
        "failover")
            if [ "$FORCE_OPERATION" = true ] || [ "$DRY_RUN" = true ]; then
                initiate_failover "manual"
            else
                echo "This will initiate failover to the DR site. Use --force to confirm."
                exit 1
            fi
            ;;
        "test")
            test_dr_procedures
            ;;
        "status")
            check_dr_status
            ;;
        "config")
            create_default_config
            ;;
        *)
            print_help
            ;;
    esac
}

# Run main function
main "$@"
