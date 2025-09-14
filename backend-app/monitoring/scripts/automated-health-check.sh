#!/bin/bash

# Automated Health Check and Self-Healing System
# Comprehensive health monitoring with automatic recovery actions
# Designed for 99.9% uptime requirement and HIPAA compliance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-60}  # seconds
MAX_RETRY_ATTEMPTS=${MAX_RETRY_ATTEMPTS:-3}
ALERT_THRESHOLD=${ALERT_THRESHOLD:-2}
AUTO_HEALING_ENABLED=${AUTO_HEALING_ENABLED:-true}
NOTIFICATION_WEBHOOK=${NOTIFICATION_WEBHOOK:-""}

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
CRITICAL_FAILURES=0

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="$(dirname "$SCRIPT_DIR")"
HEALTH_REPORTS_DIR="$MONITORING_DIR/health-reports"
RECOVERY_LOGS_DIR="$MONITORING_DIR/recovery-logs"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Initialize health check system
init_health_check_system() {
    mkdir -p "$HEALTH_REPORTS_DIR" "$RECOVERY_LOGS_DIR"
    
    # Create health check report
    HEALTH_REPORT_FILE="$HEALTH_REPORTS_DIR/health-check-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$HEALTH_REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "system": "emr-blockchain-production",
  "checks": [],
  "recovery_actions": []
}
EOF

    log_info "Health check system initialized"
}

# Add check result to report
add_check_result() {
    local component="$1"
    local check_type="$2"
    local status="$3"
    local message="$4"
    local details="$5"
    local recovery_action="$6"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case "$status" in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            if [ "$check_type" = "critical" ]; then
                CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
            fi
            ;;
    esac
    
    # Add to JSON report
    local temp_file=$(mktemp)
    jq --arg component "$component" \
       --arg check_type "$check_type" \
       --arg status "$status" \
       --arg message "$message" \
       --arg details "$details" \
       --arg recovery_action "$recovery_action" \
       --arg timestamp "$(date -Iseconds)" \
       '.checks += [{
         "component": $component,
         "check_type": $check_type,
         "status": $status,
         "message": $message,
         "details": $details,
         "recovery_action": $recovery_action,
         "timestamp": $timestamp
       }]' "$HEALTH_REPORT_FILE" > "$temp_file" && mv "$temp_file" "$HEALTH_REPORT_FILE"
    
    # Log result
    local icon
    case "$status" in
        "PASS") icon="✅" ;;
        "FAIL") icon="❌" ;;
    esac
    
    echo "$icon $component ($check_type): $message"
    if [ -n "$details" ]; then
        echo "   Details: $details"
    fi
    if [ -n "$recovery_action" ] && [ "$status" = "FAIL" ]; then
        echo "   Recovery: $recovery_action"
    fi
}

# Execute recovery action
execute_recovery_action() {
    local component="$1"
    local action="$2"
    local description="$3"
    
    if [ "$AUTO_HEALING_ENABLED" != "true" ]; then
        log_warning "Auto-healing disabled. Manual intervention required for $component"
        return 1
    fi
    
    log_info "Executing recovery action for $component: $description"
    
    local recovery_log="$RECOVERY_LOGS_DIR/recovery-$(date +%Y%m%d_%H%M%S)-$component.log"
    
    {
        echo "Recovery Action: $description"
        echo "Component: $component"
        echo "Timestamp: $(date -Iseconds)"
        echo "Command: $action"
        echo "---"
        
        if eval "$action"; then
            echo "Recovery action completed successfully"
            log_success "Recovery action completed for $component"
            
            # Add to health report
            local temp_file=$(mktemp)
            jq --arg component "$component" \
               --arg action "$action" \
               --arg description "$description" \
               --arg status "success" \
               --arg timestamp "$(date -Iseconds)" \
               '.recovery_actions += [{
                 "component": $component,
                 "action": $action,
                 "description": $description,
                 "status": $status,
                 "timestamp": $timestamp
               }]' "$HEALTH_REPORT_FILE" > "$temp_file" && mv "$temp_file" "$HEALTH_REPORT_FILE"
            
            return 0
        else
            echo "Recovery action failed"
            log_error "Recovery action failed for $component"
            return 1
        fi
    } >> "$recovery_log" 2>&1
}

# Check EMR Backend Health
check_emr_backend() {
    log_info "Checking EMR Backend health..."
    
    local endpoint="https://localhost:3001/api/v1/health"
    local response
    local status_code
    
    if response=$(curl -s -w "%{http_code}" -k --max-time 10 "$endpoint" 2>/dev/null); then
        status_code="${response: -3}"
        response_body="${response%???}"
        
        if [ "$status_code" = "200" ]; then
            add_check_result "EMR-Backend" "critical" "PASS" "Backend is healthy" "Status: $status_code"
        else
            add_check_result "EMR-Backend" "critical" "FAIL" "Backend returned error status" "Status: $status_code" "kubectl rollout restart deployment/emr-backend -n emr-production"
            execute_recovery_action "EMR-Backend" "kubectl rollout restart deployment/emr-backend -n emr-production" "Restart EMR backend deployment"
        fi
    else
        add_check_result "EMR-Backend" "critical" "FAIL" "Backend is unreachable" "Connection failed" "kubectl rollout restart deployment/emr-backend -n emr-production"
        execute_recovery_action "EMR-Backend" "kubectl rollout restart deployment/emr-backend -n emr-production" "Restart EMR backend deployment"
    fi
}

# Check Database Health
check_database() {
    log_info "Checking Database health..."
    
    local db_host=${DB_HOST:-localhost}
    local db_port=${DB_PORT:-5432}
    local db_name=${DB_NAME:-emr_blockchain}
    local db_user=${DB_USER:-postgres}
    
    if pg_isready -h "$db_host" -p "$db_port" -U "$db_user" >/dev/null 2>&1; then
        # Check if we can execute a simple query
        if PGPASSWORD="$DB_PASSWORD" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1;" >/dev/null 2>&1; then
            add_check_result "Database" "critical" "PASS" "Database is accessible" "Connection successful"
        else
            add_check_result "Database" "critical" "FAIL" "Database connection failed" "Query execution failed" "systemctl restart postgresql"
            execute_recovery_action "Database" "systemctl restart postgresql" "Restart PostgreSQL service"
        fi
    else
        add_check_result "Database" "critical" "FAIL" "Database is not ready" "pg_isready failed" "systemctl restart postgresql"
        execute_recovery_action "Database" "systemctl restart postgresql" "Restart PostgreSQL service"
    fi
}

# Check Fabric Network Health
check_fabric_network() {
    log_info "Checking Fabric Network health..."
    
    # Check orderer
    if docker exec orderer.emr.com peer node status >/dev/null 2>&1; then
        add_check_result "Fabric-Orderer" "critical" "PASS" "Orderer is running" ""
    else
        add_check_result "Fabric-Orderer" "critical" "FAIL" "Orderer is not responding" "" "docker restart orderer.emr.com"
        execute_recovery_action "Fabric-Orderer" "docker restart orderer.emr.com" "Restart Fabric orderer"
    fi
    
    # Check peers
    local peers=("peer0.hospital1.emr.com" "peer0.hospital2.emr.com" "peer0.regulator.emr.com")
    
    for peer in "${peers[@]}"; do
        if docker exec "$peer" peer node status >/dev/null 2>&1; then
            add_check_result "Fabric-Peer-$peer" "critical" "PASS" "Peer is running" ""
        else
            add_check_result "Fabric-Peer-$peer" "critical" "FAIL" "Peer is not responding" "" "docker restart $peer"
            execute_recovery_action "Fabric-Peer-$peer" "docker restart $peer" "Restart Fabric peer"
        fi
    done
}

# Check IPFS Cluster Health
check_ipfs_cluster() {
    log_info "Checking IPFS Cluster health..."
    
    # Check cluster nodes
    local cluster_ports=("9094" "9096" "9098")
    local cluster_names=("cluster0" "cluster1" "cluster2")
    
    for i in "${!cluster_ports[@]}"; do
        local port="${cluster_ports[$i]}"
        local name="${cluster_names[$i]}"
        
        if curl -f "http://localhost:$port/id" >/dev/null 2>&1; then
            add_check_result "IPFS-Cluster-$name" "critical" "PASS" "Cluster node is accessible" "Port $port"
        else
            add_check_result "IPFS-Cluster-$name" "critical" "FAIL" "Cluster node is not accessible" "Port $port" "docker restart $name"
            execute_recovery_action "IPFS-Cluster-$name" "docker restart $name" "Restart IPFS cluster node"
        fi
    done
    
    # Check replication status
    local replication_response=$(curl -s "http://localhost:9094/pins" 2>/dev/null)
    if [ -n "$replication_response" ]; then
        add_check_result "IPFS-Replication" "high" "PASS" "Replication status accessible" ""
    else
        add_check_result "IPFS-Replication" "high" "FAIL" "Cannot check replication status" "" ""
    fi
}

# Check Redis Cache Health
check_redis() {
    log_info "Checking Redis health..."
    
    local redis_host=${REDIS_HOST:-localhost}
    local redis_port=${REDIS_PORT:-6379}
    
    if redis-cli -h "$redis_host" -p "$redis_port" ping | grep -q "PONG"; then
        add_check_result "Redis" "medium" "PASS" "Redis is responding" ""
    else
        add_check_result "Redis" "medium" "FAIL" "Redis is not responding" "" "systemctl restart redis"
        execute_recovery_action "Redis" "systemctl restart redis" "Restart Redis service"
    fi
}

# Check System Resources
check_system_resources() {
    log_info "Checking System Resources..."
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    if [ "$(echo "$cpu_usage < 85" | bc)" -eq 1 ]; then
        add_check_result "System-CPU" "medium" "PASS" "CPU usage is normal" "$cpu_usage% used"
    else
        add_check_result "System-CPU" "medium" "FAIL" "High CPU usage detected" "$cpu_usage% used" ""
    fi
    
    # Check memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
    if [ "$(echo "$memory_usage < 85" | bc)" -eq 1 ]; then
        add_check_result "System-Memory" "medium" "PASS" "Memory usage is normal" "$memory_usage% used"
    else
        add_check_result "System-Memory" "medium" "FAIL" "High memory usage detected" "$memory_usage% used" ""
    fi
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 85 ]; then
        add_check_result "System-Disk" "medium" "PASS" "Disk space is sufficient" "$disk_usage% used"
    else
        add_check_result "System-Disk" "medium" "FAIL" "Low disk space detected" "$disk_usage% used" "find /tmp -type f -atime +7 -delete"
        execute_recovery_action "System-Disk" "find /tmp -type f -atime +7 -delete" "Clean old temporary files"
    fi
}

# Check Monitoring Stack Health
check_monitoring_stack() {
    log_info "Checking Monitoring Stack health..."
    
    # Check Prometheus
    if curl -f "http://localhost:9090/-/healthy" >/dev/null 2>&1; then
        add_check_result "Prometheus" "high" "PASS" "Prometheus is healthy" ""
    else
        add_check_result "Prometheus" "high" "FAIL" "Prometheus is not healthy" "" "docker restart emr-prometheus"
        execute_recovery_action "Prometheus" "docker restart emr-prometheus" "Restart Prometheus container"
    fi
    
    # Check Grafana
    if curl -f "http://localhost:3000/api/health" >/dev/null 2>&1; then
        add_check_result "Grafana" "medium" "PASS" "Grafana is accessible" ""
    else
        add_check_result "Grafana" "medium" "FAIL" "Grafana is not accessible" "" "docker restart emr-grafana"
        execute_recovery_action "Grafana" "docker restart emr-grafana" "Restart Grafana container"
    fi
    
    # Check Alertmanager
    if curl -f "http://localhost:9093/-/healthy" >/dev/null 2>&1; then
        add_check_result "Alertmanager" "high" "PASS" "Alertmanager is healthy" ""
    else
        add_check_result "Alertmanager" "high" "FAIL" "Alertmanager is not healthy" "" "docker restart emr-alertmanager"
        execute_recovery_action "Alertmanager" "docker restart emr-alertmanager" "Restart Alertmanager container"
    fi
}

# Check Security Status
check_security_status() {
    log_info "Checking Security Status..."
    
    # Check certificate expiration
    local cert_file="/etc/ssl/certs/emr-blockchain.crt"
    if [ -f "$cert_file" ]; then
        local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            add_check_result "Security-Certificate" "high" "PASS" "Certificate is valid" "$days_until_expiry days until expiry"
        else
            add_check_result "Security-Certificate" "high" "FAIL" "Certificate expires soon" "$days_until_expiry days until expiry" ""
        fi
    else
        add_check_result "Security-Certificate" "high" "FAIL" "Certificate file not found" "" ""
    fi
    
    # Check for failed login attempts
    local failed_logins=$(grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l)
    if [ "$failed_logins" -lt 10 ]; then
        add_check_result "Security-FailedLogins" "medium" "PASS" "Failed login attempts are normal" "$failed_logins attempts today"
    else
        add_check_result "Security-FailedLogins" "medium" "FAIL" "High number of failed logins" "$failed_logins attempts today" ""
    fi
}

# Send notification
send_notification() {
    local message="$1"
    local severity="$2"
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{
               \"text\": \"$message\",
               \"severity\": \"$severity\",
               \"timestamp\": \"$(date -Iseconds)\",
               \"system\": \"emr-blockchain-production\"
             }" >/dev/null 2>&1
    fi
}

# Generate health summary
generate_health_summary() {
    local temp_file=$(mktemp)
    jq --arg total "$TOTAL_CHECKS" \
       --arg passed "$PASSED_CHECKS" \
       --arg failed "$FAILED_CHECKS" \
       --arg critical_failures "$CRITICAL_FAILURES" \
       --arg overall_status "$([ $CRITICAL_FAILURES -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")" \
       '. + {
         "summary": {
           "total_checks": ($total | tonumber),
           "passed": ($passed | tonumber),
           "failed": ($failed | tonumber),
           "critical_failures": ($critical_failures | tonumber),
           "overall_status": $overall_status,
           "health_percentage": (($passed | tonumber) * 100 / ($total | tonumber))
         }
       }' "$HEALTH_REPORT_FILE" > "$temp_file" && mv "$temp_file" "$HEALTH_REPORT_FILE"
}

# Display results
display_results() {
    echo ""
    log_info "=== Health Check Summary ==="
    echo "Total Checks: $TOTAL_CHECKS"
    echo "✅ Passed: $PASSED_CHECKS"
    echo "❌ Failed: $FAILED_CHECKS"
    echo "🚨 Critical Failures: $CRITICAL_FAILURES"
    echo ""
    
    local health_percentage=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    echo "Health Score: ${health_percentage}%"
    
    if [ $CRITICAL_FAILURES -eq 0 ]; then
        log_success "System is HEALTHY"
        send_notification "EMR Blockchain System Health Check: HEALTHY ($health_percentage%)" "info"
    else
        log_error "System has CRITICAL ISSUES"
        send_notification "EMR Blockchain System Health Check: CRITICAL ISSUES ($CRITICAL_FAILURES critical failures)" "critical"
    fi
    
    echo ""
    log_info "Detailed report: $HEALTH_REPORT_FILE"
}

# Main health check function
main() {
    log_info "=== Starting Automated Health Check ==="
    
    init_health_check_system
    
    # Execute all health checks
    check_emr_backend
    check_database
    check_fabric_network
    check_ipfs_cluster
    check_redis
    check_system_resources
    check_monitoring_stack
    check_security_status
    
    generate_health_summary
    display_results
    
    # Exit with error code if critical issues found
    if [ $CRITICAL_FAILURES -ge $ALERT_THRESHOLD ]; then
        exit 1
    fi
}

# Continuous monitoring mode
continuous_monitoring() {
    log_info "Starting continuous health monitoring (interval: ${HEALTH_CHECK_INTERVAL}s)"
    
    while true; do
        main
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Handle script arguments
case "$1" in
    "continuous")
        continuous_monitoring
        ;;
    "once")
        main
        ;;
    "--help"|"-h")
        echo "Usage: $0 [continuous|once]"
        echo ""
        echo "Options:"
        echo "  continuous    Run health checks continuously"
        echo "  once          Run health check once and exit"
        echo "  --help        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  HEALTH_CHECK_INTERVAL     Interval between checks in seconds (default: 60)"
        echo "  AUTO_HEALING_ENABLED      Enable automatic recovery actions (default: true)"
        echo "  ALERT_THRESHOLD           Number of critical failures to trigger alert (default: 2)"
        echo "  NOTIFICATION_WEBHOOK      Webhook URL for notifications"
        ;;
    *)
        main
        ;;
esac
