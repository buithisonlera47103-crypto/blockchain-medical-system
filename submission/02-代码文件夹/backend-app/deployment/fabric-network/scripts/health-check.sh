#!/bin/bash

# Fabric Network Health Check Script
# Comprehensive health monitoring for production EMR network
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
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

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
    HEALTH_REPORT_FILE="$HEALTH_REPORT_DIR/health-report-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$HEALTH_REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "network": "emr-fabric-production",
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

# Check container status
check_containers() {
    log_info "Checking container status..."
    
    local expected_containers=(
        "orderer.emr.com"
        "peer0.hospital1.emr.com"
        "peer1.hospital1.emr.com"
        "peer0.hospital2.emr.com"
        "peer1.hospital2.emr.com"
        "peer0.regulator.emr.com"
        "ca.hospital1.emr.com"
        "ca.hospital2.emr.com"
        "ca.regulator.emr.com"
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
        add_check_result "Network" "container_summary" "PASS" "All containers are running" "$running_containers/$total_containers"
    elif [ $running_containers -gt $((total_containers / 2)) ]; then
        add_check_result "Network" "container_summary" "WARNING" "Some containers are not running" "$running_containers/$total_containers"
    else
        add_check_result "Network" "container_summary" "FAIL" "Most containers are not running" "$running_containers/$total_containers"
    fi
}

# Check network connectivity
check_network_connectivity() {
    log_info "Checking network connectivity..."
    
    # Check orderer
    if timeout $HEALTH_CHECK_TIMEOUT curl -k --silent https://localhost:7050/healthz >/dev/null 2>&1; then
        add_check_result "Orderer" "connectivity" "PASS" "Orderer is accessible" "Port 7050"
    else
        add_check_result "Orderer" "connectivity" "FAIL" "Orderer is not accessible" "Port 7050"
    fi
    
    # Check peers
    local peer_ports=("7051" "8051" "9051" "10051" "11051")
    local peer_names=("Hospital1-Peer0" "Hospital1-Peer1" "Hospital2-Peer0" "Hospital2-Peer1" "Regulator-Peer0")
    
    for i in "${!peer_ports[@]}"; do
        if timeout $HEALTH_CHECK_TIMEOUT nc -z localhost "${peer_ports[$i]}" 2>/dev/null; then
            add_check_result "${peer_names[$i]}" "connectivity" "PASS" "Peer is accessible" "Port ${peer_ports[$i]}"
        else
            add_check_result "${peer_names[$i]}" "connectivity" "FAIL" "Peer is not accessible" "Port ${peer_ports[$i]}"
        fi
    done
    
    # Check CAs
    local ca_ports=("7054" "8054" "9054")
    local ca_names=("Hospital1-CA" "Hospital2-CA" "Regulator-CA")
    
    for i in "${!ca_ports[@]}"; do
        if timeout $HEALTH_CHECK_TIMEOUT curl -k --silent https://localhost:"${ca_ports[$i]}"/cainfo >/dev/null 2>&1; then
            add_check_result "${ca_names[$i]}" "connectivity" "PASS" "CA is accessible" "Port ${ca_ports[$i]}"
        else
            add_check_result "${ca_names[$i]}" "connectivity" "FAIL" "CA is not accessible" "Port ${ca_ports[$i]}"
        fi
    done
}

# Check TLS certificates
check_tls_certificates() {
    log_info "Checking TLS certificates..."
    
    local crypto_dir="$NETWORK_DIR/crypto-config"
    
    if [ ! -d "$crypto_dir" ]; then
        add_check_result "TLS" "certificates" "FAIL" "Crypto config directory not found" "$crypto_dir"
        return
    fi
    
    # Check orderer certificates
    local orderer_cert="$crypto_dir/ordererOrganizations/emr.com/orderers/orderer.emr.com/tls/server.crt"
    if [ -f "$orderer_cert" ]; then
        local expiry=$(openssl x509 -in "$orderer_cert" -noout -enddate 2>/dev/null | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ $days_until_expiry -gt 30 ]; then
            add_check_result "Orderer" "certificate" "PASS" "Certificate is valid" "Expires in $days_until_expiry days"
        elif [ $days_until_expiry -gt 0 ]; then
            add_check_result "Orderer" "certificate" "WARNING" "Certificate expires soon" "Expires in $days_until_expiry days"
        else
            add_check_result "Orderer" "certificate" "FAIL" "Certificate has expired" "Expired $((days_until_expiry * -1)) days ago"
        fi
    else
        add_check_result "Orderer" "certificate" "FAIL" "Certificate file not found" "$orderer_cert"
    fi
    
    # Check peer certificates
    local orgs=("hospital1" "hospital2" "regulator")
    local peer_counts=(2 2 1)
    
    for i in "${!orgs[@]}"; do
        local org="${orgs[$i]}"
        local peer_count="${peer_counts[$i]}"
        
        for ((j=0; j<peer_count; j++)); do
            local peer_cert="$crypto_dir/peerOrganizations/$org.emr.com/peers/peer$j.$org.emr.com/tls/server.crt"
            if [ -f "$peer_cert" ]; then
                local expiry=$(openssl x509 -in "$peer_cert" -noout -enddate 2>/dev/null | cut -d= -f2)
                local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "0")
                local current_epoch=$(date +%s)
                local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
                
                if [ $days_until_expiry -gt 30 ]; then
                    add_check_result "$org-peer$j" "certificate" "PASS" "Certificate is valid" "Expires in $days_until_expiry days"
                elif [ $days_until_expiry -gt 0 ]; then
                    add_check_result "$org-peer$j" "certificate" "WARNING" "Certificate expires soon" "Expires in $days_until_expiry days"
                else
                    add_check_result "$org-peer$j" "certificate" "FAIL" "Certificate has expired" "Expired $((days_until_expiry * -1)) days ago"
                fi
            else
                add_check_result "$org-peer$j" "certificate" "FAIL" "Certificate file not found" "$peer_cert"
            fi
        done
    done
}

# Check chaincode status
check_chaincode() {
    log_info "Checking chaincode status..."
    
    # Set environment for peer query
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Hospital1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK_DIR/crypto-config/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$NETWORK_DIR/crypto-config/peerOrganizations/hospital1.emr.com/users/Admin@hospital1.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:7051
    
    cd "$NETWORK_DIR"
    
    # Check if chaincode is committed
    if timeout $HEALTH_CHECK_TIMEOUT peer lifecycle chaincode querycommitted --channelID emr-channel --name emr-chaincode >/dev/null 2>&1; then
        add_check_result "Chaincode" "committed" "PASS" "Chaincode is committed" "emr-chaincode on emr-channel"
        
        # Test chaincode functionality
        if timeout $HEALTH_CHECK_TIMEOUT peer chaincode query -C emr-channel -n emr-chaincode -c '{"function":"GetAllRecords","Args":[]}' >/dev/null 2>&1; then
            add_check_result "Chaincode" "functionality" "PASS" "Chaincode is functional" "Query test successful"
        else
            add_check_result "Chaincode" "functionality" "FAIL" "Chaincode query failed" "GetAllRecords test failed"
        fi
    else
        add_check_result "Chaincode" "committed" "FAIL" "Chaincode is not committed" "emr-chaincode on emr-channel"
    fi
}

# Check monitoring services
check_monitoring() {
    log_info "Checking monitoring services..."
    
    # Check Prometheus
    if timeout $HEALTH_CHECK_TIMEOUT curl --silent http://localhost:9090/api/v1/query?query=up >/dev/null 2>&1; then
        add_check_result "Prometheus" "service" "PASS" "Prometheus is accessible" "Port 9090"
        
        # Check if Fabric metrics are being collected
        local fabric_metrics=$(curl --silent "http://localhost:9090/api/v1/query?query=up{job=~\"fabric-.*\"}" 2>/dev/null | jq -r '.data.result | length' 2>/dev/null || echo "0")
        if [ "$fabric_metrics" -gt 0 ]; then
            add_check_result "Prometheus" "fabric_metrics" "PASS" "Fabric metrics are being collected" "$fabric_metrics metrics"
        else
            add_check_result "Prometheus" "fabric_metrics" "WARNING" "No Fabric metrics found" ""
        fi
    else
        add_check_result "Prometheus" "service" "FAIL" "Prometheus is not accessible" "Port 9090"
    fi
    
    # Check Grafana
    if timeout $HEALTH_CHECK_TIMEOUT curl --silent http://localhost:3000/api/health >/dev/null 2>&1; then
        add_check_result "Grafana" "service" "PASS" "Grafana is accessible" "Port 3000"
    else
        add_check_result "Grafana" "service" "FAIL" "Grafana is not accessible" "Port 3000"
    fi
    
    # Check Alertmanager
    if timeout $HEALTH_CHECK_TIMEOUT curl --silent http://localhost:9093/api/v1/status >/dev/null 2>&1; then
        add_check_result "Alertmanager" "service" "PASS" "Alertmanager is accessible" "Port 9093"
    else
        add_check_result "Alertmanager" "service" "FAIL" "Alertmanager is not accessible" "Port 9093"
    fi
}

# Check system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        add_check_result "System" "disk_space" "PASS" "Disk usage is normal" "${disk_usage}% used"
    elif [ "$disk_usage" -lt 90 ]; then
        add_check_result "System" "disk_space" "WARNING" "Disk usage is high" "${disk_usage}% used"
    else
        add_check_result "System" "disk_space" "FAIL" "Disk usage is critical" "${disk_usage}% used"
    fi
    
    # Check memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -lt 80 ]; then
        add_check_result "System" "memory_usage" "PASS" "Memory usage is normal" "${memory_usage}% used"
    elif [ "$memory_usage" -lt 90 ]; then
        add_check_result "System" "memory_usage" "WARNING" "Memory usage is high" "${memory_usage}% used"
    else
        add_check_result "System" "memory_usage" "FAIL" "Memory usage is critical" "${memory_usage}% used"
    fi
    
    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "scale=0; $cpu_load * 100 / $cpu_cores" | bc 2>/dev/null || echo "0")
    
    if [ "$load_percentage" -lt 80 ]; then
        add_check_result "System" "cpu_load" "PASS" "CPU load is normal" "${load_percentage}% load"
    elif [ "$load_percentage" -lt 100 ]; then
        add_check_result "System" "cpu_load" "WARNING" "CPU load is high" "${load_percentage}% load"
    else
        add_check_result "System" "cpu_load" "FAIL" "CPU load is critical" "${load_percentage}% load"
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
        log_info "=== Health Check Summary ==="
        echo "Total Checks: $TOTAL_CHECKS"
        echo "✅ Passed: $PASSED_CHECKS"
        echo "❌ Failed: $FAILED_CHECKS"
        echo "⚠️  Warnings: $WARNING_CHECKS"
        echo ""
        
        local health_percentage=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
        echo "Health Score: ${health_percentage}%"
        
        if [ $FAILED_CHECKS -eq 0 ]; then
            log_success "Network is HEALTHY"
        else
            log_error "Network is UNHEALTHY"
        fi
        
        echo ""
        log_info "Detailed report: $HEALTH_REPORT_FILE"
    fi
}

# Main health check function
main() {
    if [ "$JSON_OUTPUT" != "true" ]; then
        echo ""
        log_info "=== EMR Fabric Network Health Check ==="
        echo ""
    fi
    
    init_health_report
    
    check_docker
    check_containers
    check_network_connectivity
    check_tls_certificates
    check_chaincode
    check_monitoring
    check_system_resources
    
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
