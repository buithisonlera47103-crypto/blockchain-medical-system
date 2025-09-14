#!/bin/bash

# IPFS Cluster Health Check Script
# Comprehensive health monitoring for production IPFS cluster
# Monitors all components and generates detailed health reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_TIMEOUT=10
DETAILED_OUTPUT="${DETAILED_OUTPUT:-false}"
JSON_OUTPUT="${JSON_OUTPUT:-false}"
ALERT_THRESHOLD="${ALERT_THRESHOLD:-2}"
HEALTH_REPORT_DIR="./health-reports"

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_DIR="$(dirname "$SCRIPT_DIR")"

# Logging functions
log_info() {
    if [ "$JSON_OUTPUT" != "true" ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" != "true" ]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warning() {
    if [ "$JSON_OUTPUT" != "true" ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" != "true" ]; then
        echo -e "${RED}[ERROR]${NC} $1"
    fi
}

# Initialize health report
init_health_report() {
    mkdir -p "$HEALTH_REPORT_DIR"
    HEALTH_REPORT_FILE="$HEALTH_REPORT_DIR/ipfs-health-report-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$HEALTH_REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "cluster": "ipfs-cluster-production",
  "checks": []
}
EOF
}

# Add check result to report
add_check_result() {
    local component="$1"
    local check_type="$2"
    local status="$3"
    local message="$4"
    local details="$5"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case "$status" in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            ;;
        "WARNING")
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            ;;
    esac
    
    # Add to JSON report
    local temp_file=$(mktemp)
    jq --arg component "$component" \
       --arg check_type "$check_type" \
       --arg status "$status" \
       --arg message "$message" \
       --arg details "$details" \
       --arg timestamp "$(date -Iseconds)" \
       '.checks += [{
         "component": $component,
         "check_type": $check_type,
         "status": $status,
         "message": $message,
         "details": $details,
         "timestamp": $timestamp
       }]' "$HEALTH_REPORT_FILE" > "$temp_file" && mv "$temp_file" "$HEALTH_REPORT_FILE"
    
    # Console output
    local icon
    case "$status" in
        "PASS") icon="✅" ;;
        "FAIL") icon="❌" ;;
        "WARNING") icon="⚠️" ;;
    esac
    
    if [ "$DETAILED_OUTPUT" = "true" ] || [ "$status" != "PASS" ]; then
        echo "$icon $component ($check_type): $message"
        if [ -n "$details" ] && [ "$DETAILED_OUTPUT" = "true" ]; then
            echo "   Details: $details"
        fi
    fi
}

# Check Docker daemon
check_docker() {
    log_info "Checking Docker daemon..."
    
    if docker info >/dev/null 2>&1; then
        add_check_result "Docker" "daemon" "PASS" "Docker daemon is running" ""
    else
        add_check_result "Docker" "daemon" "FAIL" "Docker daemon is not accessible" ""
        return 1
    fi
}

# Check IPFS containers
check_ipfs_containers() {
    log_info "Checking IPFS containers..."
    
    local expected_containers=(
        "ipfs0"
        "ipfs1"
        "ipfs2"
        "cluster0"
        "cluster1"
        "cluster2"
        "ipfs-gateway-lb"
        "ipfs-exporter"
    )
    
    local running_containers=0
    local total_containers=${#expected_containers[@]}
    
    for container in "${expected_containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            add_check_result "$container" "container_status" "PASS" "Container is running" ""
            running_containers=$((running_containers + 1))
        else
            if docker ps -a --format "table {{.Names}}" | grep -q "^$container$"; then
                local status=$(docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep "^$container" | cut -f2)
                add_check_result "$container" "container_status" "FAIL" "Container is not running" "Status: $status"
            else
                add_check_result "$container" "container_status" "FAIL" "Container does not exist" ""
            fi
        fi
    done
    
    if [ $running_containers -eq $total_containers ]; then
        add_check_result "IPFS-Cluster" "container_summary" "PASS" "All containers are running" "$running_containers/$total_containers"
    elif [ $running_containers -gt $((total_containers / 2)) ]; then
        add_check_result "IPFS-Cluster" "container_summary" "WARNING" "Some containers are not running" "$running_containers/$total_containers"
    else
        add_check_result "IPFS-Cluster" "container_summary" "FAIL" "Most containers are not running" "$running_containers/$total_containers"
    fi
}

# Check IPFS node connectivity
check_ipfs_connectivity() {
    log_info "Checking IPFS node connectivity..."
    
    # Check IPFS nodes
    local ipfs_ports=("5001" "5002" "5003")
    local ipfs_names=("IPFS-Node-0" "IPFS-Node-1" "IPFS-Node-2")
    
    for i in "${!ipfs_ports[@]}"; do
        if timeout $HEALTH_CHECK_TIMEOUT curl -f "http://localhost:${ipfs_ports[$i]}/api/v0/id" >/dev/null 2>&1; then
            add_check_result "${ipfs_names[$i]}" "connectivity" "PASS" "IPFS node is accessible" "Port ${ipfs_ports[$i]}"
        else
            add_check_result "${ipfs_names[$i]}" "connectivity" "FAIL" "IPFS node is not accessible" "Port ${ipfs_ports[$i]}"
        fi
    done
    
    # Check cluster nodes
    local cluster_ports=("9094" "9096" "9098")
    local cluster_names=("Cluster-Node-0" "Cluster-Node-1" "Cluster-Node-2")
    
    for i in "${!cluster_ports[@]}"; do
        if timeout $HEALTH_CHECK_TIMEOUT curl -f "http://localhost:${cluster_ports[$i]}/id" >/dev/null 2>&1; then
            add_check_result "${cluster_names[$i]}" "connectivity" "PASS" "Cluster node is accessible" "Port ${cluster_ports[$i]}"
        else
            add_check_result "${cluster_names[$i]}" "connectivity" "FAIL" "Cluster node is not accessible" "Port ${cluster_ports[$i]}"
        fi
    done
    
    # Check load balancer
    if timeout $HEALTH_CHECK_TIMEOUT curl -f "http://localhost:8090/health" >/dev/null 2>&1; then
        add_check_result "Load-Balancer" "connectivity" "PASS" "Load balancer is accessible" "Port 8090"
    else
        add_check_result "Load-Balancer" "connectivity" "FAIL" "Load balancer is not accessible" "Port 8090"
    fi
}

# Check cluster status
check_cluster_status() {
    log_info "Checking cluster status..."
    
    # Get cluster peers
    local peers_response=$(timeout $HEALTH_CHECK_TIMEOUT curl -s "http://localhost:9094/peers" 2>/dev/null)
    local peer_count=$(echo "$peers_response" | jq length 2>/dev/null || echo "0")
    
    if [ "$peer_count" -ge 3 ]; then
        add_check_result "Cluster" "peer_count" "PASS" "Cluster has sufficient peers" "$peer_count peers"
    elif [ "$peer_count" -gt 0 ]; then
        add_check_result "Cluster" "peer_count" "WARNING" "Cluster has reduced peers" "$peer_count peers"
    else
        add_check_result "Cluster" "peer_count" "FAIL" "Cluster has no peers" "$peer_count peers"
    fi
    
    # Check cluster health
    local health_response=$(timeout $HEALTH_CHECK_TIMEOUT curl -s "http://localhost:9094/health" 2>/dev/null)
    if echo "$health_response" | grep -q "cluster is healthy" 2>/dev/null; then
        add_check_result "Cluster" "health" "PASS" "Cluster reports healthy status" ""
    else
        add_check_result "Cluster" "health" "WARNING" "Cluster health status unclear" ""
    fi
    
    # Check pin status
    local pins_response=$(timeout $HEALTH_CHECK_TIMEOUT curl -s "http://localhost:9094/pins" 2>/dev/null)
    local pin_count=$(echo "$pins_response" | jq length 2>/dev/null || echo "0")
    add_check_result "Cluster" "pin_count" "PASS" "Cluster pin status checked" "$pin_count pins"
}

# Check storage usage
check_storage_usage() {
    log_info "Checking storage usage..."
    
    # Check IPFS node storage
    local ipfs_ports=("5001" "5002" "5003")
    
    for i in "${!ipfs_ports[@]}"; do
        local port="${ipfs_ports[$i]}"
        local stats_response=$(timeout $HEALTH_CHECK_TIMEOUT curl -s "http://localhost:$port/api/v0/stats/repo" 2>/dev/null)
        
        if [ -n "$stats_response" ]; then
            local repo_size=$(echo "$stats_response" | jq -r '.RepoSize' 2>/dev/null || echo "0")
            local storage_max=$(echo "$stats_response" | jq -r '.StorageMax' 2>/dev/null || echo "0")
            
            if [ "$storage_max" -gt 0 ]; then
                local usage_percent=$(echo "scale=2; $repo_size * 100 / $storage_max" | bc 2>/dev/null || echo "0")
                
                if [ "$(echo "$usage_percent < 80" | bc)" -eq 1 ]; then
                    add_check_result "IPFS-Node-$i" "storage_usage" "PASS" "Storage usage is normal" "${usage_percent}% used"
                elif [ "$(echo "$usage_percent < 90" | bc)" -eq 1 ]; then
                    add_check_result "IPFS-Node-$i" "storage_usage" "WARNING" "Storage usage is high" "${usage_percent}% used"
                else
                    add_check_result "IPFS-Node-$i" "storage_usage" "FAIL" "Storage usage is critical" "${usage_percent}% used"
                fi
            else
                add_check_result "IPFS-Node-$i" "storage_usage" "WARNING" "Could not determine storage limits" ""
            fi
        else
            add_check_result "IPFS-Node-$i" "storage_usage" "FAIL" "Could not retrieve storage stats" ""
        fi
    done
}

# Check replication status
check_replication_status() {
    log_info "Checking replication status..."
    
    # Test file for replication check
    local test_content="Health check replication test - $(date)"
    local temp_file="/tmp/health_replication_test.txt"
    echo "$test_content" > "$temp_file"
    
    # Add test file to cluster
    local add_response=$(timeout $HEALTH_CHECK_TIMEOUT curl -s -X POST -F "file=@$temp_file" "http://localhost:9094/add" 2>/dev/null)
    local file_hash=$(echo "$add_response" | jq -r '.cid' 2>/dev/null)
    
    if [ -n "$file_hash" ] && [ "$file_hash" != "null" ]; then
        # Wait for replication
        sleep 5
        
        # Check replication status
        local status_response=$(timeout $HEALTH_CHECK_TIMEOUT curl -s "http://localhost:9094/pins/$file_hash" 2>/dev/null)
        local replica_count=$(echo "$status_response" | jq '.peer_map | length' 2>/dev/null || echo "0")
        
        if [ "$replica_count" -ge 2 ]; then
            add_check_result "Cluster" "replication" "PASS" "File replication is working" "$replica_count replicas"
        elif [ "$replica_count" -gt 0 ]; then
            add_check_result "Cluster" "replication" "WARNING" "Reduced replication factor" "$replica_count replicas"
        else
            add_check_result "Cluster" "replication" "FAIL" "Replication not working" "$replica_count replicas"
        fi
        
        # Clean up test file
        curl -s -X DELETE "http://localhost:9094/pins/$file_hash" >/dev/null 2>&1
    else
        add_check_result "Cluster" "replication" "FAIL" "Could not add test file for replication check" ""
    fi
    
    rm -f "$temp_file"
}

# Check monitoring services
check_monitoring() {
    log_info "Checking monitoring services..."
    
    # Check Prometheus
    if timeout $HEALTH_CHECK_TIMEOUT curl -s "http://localhost:9090/api/v1/query?query=up" >/dev/null 2>&1; then
        add_check_result "Prometheus" "service" "PASS" "Prometheus is accessible" "Port 9090"
        
        # Check if IPFS metrics are being collected
        local ipfs_metrics=$(curl -s "http://localhost:9090/api/v1/query?query=up{job=~\"ipfs.*\"}" 2>/dev/null | jq -r '.data.result | length' 2>/dev/null || echo "0")
        if [ "$ipfs_metrics" -gt 0 ]; then
            add_check_result "Prometheus" "ipfs_metrics" "PASS" "IPFS metrics are being collected" "$ipfs_metrics metrics"
        else
            add_check_result "Prometheus" "ipfs_metrics" "WARNING" "No IPFS metrics found" ""
        fi
    else
        add_check_result "Prometheus" "service" "FAIL" "Prometheus is not accessible" "Port 9090"
    fi
    
    # Check Grafana
    if timeout $HEALTH_CHECK_TIMEOUT curl -s "http://localhost:3000/api/health" >/dev/null 2>&1; then
        add_check_result "Grafana" "service" "PASS" "Grafana is accessible" "Port 3000"
    else
        add_check_result "Grafana" "service" "FAIL" "Grafana is not accessible" "Port 3000"
    fi
}

# Generate health summary
generate_health_summary() {
    local temp_file=$(mktemp)
    jq --arg total "$TOTAL_CHECKS" \
       --arg passed "$PASSED_CHECKS" \
       --arg failed "$FAILED_CHECKS" \
       --arg warnings "$WARNING_CHECKS" \
       --arg overall_status "$([ $FAILED_CHECKS -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")" \
       '. + {
         "summary": {
           "total_checks": ($total | tonumber),
           "passed": ($passed | tonumber),
           "failed": ($failed | tonumber),
           "warnings": ($warnings | tonumber),
           "overall_status": $overall_status,
           "health_percentage": (($passed | tonumber) * 100 / ($total | tonumber))
         }
       }' "$HEALTH_REPORT_FILE" > "$temp_file" && mv "$temp_file" "$HEALTH_REPORT_FILE"
}

# Display results
display_results() {
    if [ "$JSON_OUTPUT" = "true" ]; then
        cat "$HEALTH_REPORT_FILE"
    else
        echo ""
        log_info "=== IPFS Cluster Health Check Summary ==="
        echo "Total Checks: $TOTAL_CHECKS"
        echo "✅ Passed: $PASSED_CHECKS"
        echo "❌ Failed: $FAILED_CHECKS"
        echo "⚠️  Warnings: $WARNING_CHECKS"
        echo ""
        
        local health_percentage=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
        echo "Health Score: ${health_percentage}%"
        
        if [ $FAILED_CHECKS -eq 0 ]; then
            log_success "IPFS Cluster is HEALTHY"
        else
            log_error "IPFS Cluster is UNHEALTHY"
        fi
        
        echo ""
        log_info "Detailed report: $HEALTH_REPORT_FILE"
    fi
}

# Main health check function
main() {
    if [ "$JSON_OUTPUT" != "true" ]; then
        echo ""
        log_info "=== IPFS Cluster Health Check ==="
        echo ""
    fi
    
    init_health_report
    
    check_docker
    check_ipfs_containers
    check_ipfs_connectivity
    check_cluster_status
    check_storage_usage
    check_replication_status
    check_monitoring
    
    generate_health_summary
    display_results
    
    # Exit with error code if critical issues found
    if [ $FAILED_CHECKS -ge $ALERT_THRESHOLD ]; then
        exit 1
    fi
}

# Handle script arguments
case "$1" in
    "--detailed")
        DETAILED_OUTPUT="true"
        main
        ;;
    "--json")
        JSON_OUTPUT="true"
        main
        ;;
    "--help"|"-h")
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --detailed    Show detailed output for all checks"
        echo "  --json        Output results in JSON format"
        echo "  --help        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  HEALTH_CHECK_TIMEOUT    Timeout for individual checks (default: 10)"
        echo "  ALERT_THRESHOLD         Number of failures to trigger alert (default: 2)"
        ;;
    *)
        main
        ;;
esac
