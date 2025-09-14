#!/bin/bash

# EMR Blockchain Performance Testing Suite
# Comprehensive performance testing for 1000+ TPS verification
# Tests end-to-end system performance with realistic EMR scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Performance Test Configuration
TARGET_TPS=1000
TEST_DURATION=300  # 5 minutes
CONCURRENT_USERS=100
RAMP_UP_TIME=60    # 1 minute
WARM_UP_TIME=30    # 30 seconds

# Test Data Configuration
PATIENT_COUNT=10000
DOCTOR_COUNT=1000
HOSPITAL_COUNT=3
RECORD_TYPES=("diagnosis" "treatment" "lab_result" "imaging" "prescription")

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERF_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$PERF_DIR/results"
DATA_DIR="$PERF_DIR/test-data"

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

# Create test directories
create_test_directories() {
    log_info "Creating test directories..."
    
    mkdir -p "$RESULTS_DIR"/{reports,logs,metrics}
    mkdir -p "$DATA_DIR"/{patients,doctors,records}
    
    log_success "Test directories created"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking performance testing prerequisites..."
    
    # Check if system is running
    if ! curl -f http://localhost:3001/api/v1/health >/dev/null 2>&1; then
        log_error "EMR backend is not running. Please start the system first."
        exit 1
    fi
    
    # Check Fabric network
    if ! curl -f http://localhost:9090/api/v1/query?query=up >/dev/null 2>&1; then
        log_error "Fabric network monitoring is not accessible."
        exit 1
    fi
    
    # Check IPFS cluster
    if ! curl -f http://localhost:8090/health >/dev/null 2>&1; then
        log_error "IPFS cluster is not accessible."
        exit 1
    fi
    
    # Check required tools
    local required_tools=("node" "npm" "curl" "jq" "bc")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    log_success "Prerequisites check completed"
}

# Generate test data
generate_test_data() {
    log_info "Generating test data..."
    
    # Generate patient data
    log_info "Generating patient data ($PATIENT_COUNT patients)..."
    node "$PERF_DIR/generators/generate-patients.js" \
        --count "$PATIENT_COUNT" \
        --output "$DATA_DIR/patients/patients.json"
    
    # Generate doctor data
    log_info "Generating doctor data ($DOCTOR_COUNT doctors)..."
    node "$PERF_DIR/generators/generate-doctors.js" \
        --count "$DOCTOR_COUNT" \
        --output "$DATA_DIR/doctors/doctors.json"
    
    # Generate medical record templates
    log_info "Generating medical record templates..."
    node "$PERF_DIR/generators/generate-record-templates.js" \
        --types "${RECORD_TYPES[*]}" \
        --output "$DATA_DIR/records/templates.json"
    
    log_success "Test data generation completed"
}

# Start system monitoring
start_monitoring() {
    log_info "Starting performance monitoring..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local monitor_log="$RESULTS_DIR/logs/monitoring_$timestamp.log"
    
    # Start system resource monitoring
    {
        echo "timestamp,cpu_percent,memory_percent,disk_io_read,disk_io_write,network_rx,network_tx"
        while true; do
            local timestamp=$(date +%s)
            local cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
            local memory=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
            local disk_stats=$(iostat -d 1 1 | tail -n +4 | awk '{print $3","$4}' | head -1)
            local network_stats=$(cat /proc/net/dev | grep eth0 | awk '{print $2","$10}')
            
            echo "$timestamp,$cpu,$memory,$disk_stats,$network_stats"
            sleep 5
        done
    } > "$RESULTS_DIR/metrics/system_metrics_$(date +%Y%m%d_%H%M%S).csv" &
    
    MONITORING_PID=$!
    echo "$MONITORING_PID" > "$RESULTS_DIR/.monitoring_pid"
    
    log_success "Performance monitoring started (PID: $MONITORING_PID)"
}

# Stop system monitoring
stop_monitoring() {
    if [ -f "$RESULTS_DIR/.monitoring_pid" ]; then
        local monitoring_pid=$(cat "$RESULTS_DIR/.monitoring_pid")
        if kill -0 "$monitoring_pid" 2>/dev/null; then
            kill "$monitoring_pid"
            log_info "Performance monitoring stopped"
        fi
        rm -f "$RESULTS_DIR/.monitoring_pid"
    fi
}

# Run baseline performance test
run_baseline_test() {
    log_info "Running baseline performance test..."
    
    local test_name="baseline_$(date +%Y%m%d_%H%M%S)"
    local results_file="$RESULTS_DIR/reports/${test_name}.json"
    
    # Single user test for baseline
    node "$PERF_DIR/tests/baseline-test.js" \
        --duration 60 \
        --users 1 \
        --output "$results_file"
    
    # Extract baseline metrics
    local baseline_tps=$(jq -r '.summary.transactions_per_second' "$results_file")
    local baseline_latency=$(jq -r '.summary.average_response_time' "$results_file")
    
    log_success "Baseline test completed: ${baseline_tps} TPS, ${baseline_latency}ms avg latency"
    
    echo "$baseline_tps" > "$RESULTS_DIR/.baseline_tps"
    echo "$baseline_latency" > "$RESULTS_DIR/.baseline_latency"
}

# Run load test
run_load_test() {
    log_info "Running load test (Target: $TARGET_TPS TPS)..."
    
    local test_name="load_test_$(date +%Y%m%d_%H%M%S)"
    local results_file="$RESULTS_DIR/reports/${test_name}.json"
    
    # Calculate users needed for target TPS
    local baseline_tps=$(cat "$RESULTS_DIR/.baseline_tps" 2>/dev/null || echo "10")
    local calculated_users=$(echo "scale=0; $TARGET_TPS / $baseline_tps" | bc)
    local test_users=$([ "$calculated_users" -gt "$CONCURRENT_USERS" ] && echo "$calculated_users" || echo "$CONCURRENT_USERS")
    
    log_info "Running load test with $test_users concurrent users..."
    
    node "$PERF_DIR/tests/load-test.js" \
        --duration "$TEST_DURATION" \
        --users "$test_users" \
        --rampup "$RAMP_UP_TIME" \
        --target-tps "$TARGET_TPS" \
        --output "$results_file"
    
    # Extract load test metrics
    local achieved_tps=$(jq -r '.summary.transactions_per_second' "$results_file")
    local avg_latency=$(jq -r '.summary.average_response_time' "$results_file")
    local p95_latency=$(jq -r '.summary.p95_response_time' "$results_file")
    local error_rate=$(jq -r '.summary.error_rate' "$results_file")
    
    log_info "Load test results:"
    echo "  Achieved TPS: $achieved_tps"
    echo "  Average Latency: ${avg_latency}ms"
    echo "  P95 Latency: ${p95_latency}ms"
    echo "  Error Rate: ${error_rate}%"
    
    # Check if target TPS was achieved
    if [ "$(echo "$achieved_tps >= $TARGET_TPS" | bc)" -eq 1 ]; then
        log_success "✅ Target TPS achieved: $achieved_tps >= $TARGET_TPS"
        echo "PASS" > "$RESULTS_DIR/.tps_test_result"
    else
        log_warning "⚠️ Target TPS not achieved: $achieved_tps < $TARGET_TPS"
        echo "FAIL" > "$RESULTS_DIR/.tps_test_result"
    fi
}

# Run stress test
run_stress_test() {
    log_info "Running stress test (Beyond normal capacity)..."
    
    local test_name="stress_test_$(date +%Y%m%d_%H%M%S)"
    local results_file="$RESULTS_DIR/reports/${test_name}.json"
    
    # Stress test with 2x target users
    local stress_users=$((CONCURRENT_USERS * 2))
    
    node "$PERF_DIR/tests/stress-test.js" \
        --duration 180 \
        --users "$stress_users" \
        --rampup 30 \
        --output "$results_file"
    
    local max_tps=$(jq -r '.summary.max_transactions_per_second' "$results_file")
    local breaking_point=$(jq -r '.summary.breaking_point_users' "$results_file")
    
    log_info "Stress test results:"
    echo "  Maximum TPS: $max_tps"
    echo "  Breaking Point: $breaking_point users"
    
    log_success "Stress test completed"
}

# Run endurance test
run_endurance_test() {
    log_info "Running endurance test (30 minutes sustained load)..."
    
    local test_name="endurance_test_$(date +%Y%m%d_%H%M%S)"
    local results_file="$RESULTS_DIR/reports/${test_name}.json"
    
    # 30-minute endurance test
    node "$PERF_DIR/tests/endurance-test.js" \
        --duration 1800 \
        --users "$CONCURRENT_USERS" \
        --target-tps "$TARGET_TPS" \
        --output "$results_file"
    
    local avg_tps=$(jq -r '.summary.average_transactions_per_second' "$results_file")
    local stability_score=$(jq -r '.summary.stability_score' "$results_file")
    
    log_info "Endurance test results:"
    echo "  Average TPS: $avg_tps"
    echo "  Stability Score: ${stability_score}%"
    
    log_success "Endurance test completed"
}

# Run mixed workload test
run_mixed_workload_test() {
    log_info "Running mixed workload test (Realistic EMR scenarios)..."
    
    local test_name="mixed_workload_$(date +%Y%m%d_%H%M%S)"
    local results_file="$RESULTS_DIR/reports/${test_name}.json"
    
    # Mixed workload with different operation types
    node "$PERF_DIR/tests/mixed-workload-test.js" \
        --duration "$TEST_DURATION" \
        --users "$CONCURRENT_USERS" \
        --scenarios "create:40,read:30,update:20,share:10" \
        --output "$results_file"
    
    local mixed_tps=$(jq -r '.summary.transactions_per_second' "$results_file")
    local operation_breakdown=$(jq -r '.summary.operation_breakdown' "$results_file")
    
    log_info "Mixed workload test results:"
    echo "  Overall TPS: $mixed_tps"
    echo "  Operation Breakdown: $operation_breakdown"
    
    log_success "Mixed workload test completed"
}

# Collect system metrics
collect_system_metrics() {
    log_info "Collecting system metrics..."
    
    local metrics_file="$RESULTS_DIR/metrics/system_metrics_$(date +%Y%m%d_%H%M%S).json"
    
    # Fabric network metrics
    local fabric_metrics=$(curl -s "http://localhost:9090/api/v1/query?query=up{job=~\"fabric-.*\"}")
    
    # IPFS cluster metrics
    local ipfs_metrics=$(curl -s "http://localhost:9090/api/v1/query?query=up{job=~\"ipfs-.*\"}")
    
    # Database metrics
    local db_connections=$(curl -s "http://localhost:3001/api/v1/metrics" | grep "db_connections" || echo "db_connections 0")
    
    # Create metrics summary
    cat > "$metrics_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "fabric_network": $fabric_metrics,
  "ipfs_cluster": $ipfs_metrics,
  "database": {
    "connections": "$db_connections"
  },
  "system": {
    "cpu_cores": $(nproc),
    "memory_total": "$(free -h | awk 'NR==2{print $2}')",
    "disk_space": "$(df -h / | awk 'NR==2{print $4}')"
  }
}
EOF

    log_success "System metrics collected"
}

# Generate performance report
generate_performance_report() {
    log_info "Generating comprehensive performance report..."
    
    local report_file="$RESULTS_DIR/performance_report_$(date +%Y%m%d_%H%M%S).html"
    
    # Collect all test results
    local baseline_result=$(ls "$RESULTS_DIR/reports/baseline_"*.json | tail -1)
    local load_result=$(ls "$RESULTS_DIR/reports/load_test_"*.json | tail -1)
    local stress_result=$(ls "$RESULTS_DIR/reports/stress_test_"*.json | tail -1)
    local endurance_result=$(ls "$RESULTS_DIR/reports/endurance_test_"*.json | tail -1)
    local mixed_result=$(ls "$RESULTS_DIR/reports/mixed_workload_"*.json | tail -1)
    
    # Generate HTML report
    node "$PERF_DIR/generators/generate-report.js" \
        --baseline "$baseline_result" \
        --load "$load_result" \
        --stress "$stress_result" \
        --endurance "$endurance_result" \
        --mixed "$mixed_result" \
        --target-tps "$TARGET_TPS" \
        --output "$report_file"
    
    log_success "Performance report generated: $report_file"
    
    # Display summary
    local tps_result=$(cat "$RESULTS_DIR/.tps_test_result" 2>/dev/null || echo "UNKNOWN")
    echo ""
    log_info "=== PERFORMANCE TEST SUMMARY ==="
    echo "Target TPS: $TARGET_TPS"
    echo "TPS Test Result: $tps_result"
    echo "Report: $report_file"
    echo ""
}

# Cleanup function
cleanup() {
    log_info "Cleaning up performance test resources..."
    
    stop_monitoring
    
    # Clean up any temporary files
    rm -f "$RESULTS_DIR"/.baseline_* "$RESULTS_DIR"/.tps_test_result
    
    log_success "Cleanup completed"
}

# Main performance test function
main() {
    echo ""
    log_info "=== EMR Blockchain Performance Testing Suite ==="
    echo "Target TPS: $TARGET_TPS"
    echo "Test Duration: $TEST_DURATION seconds"
    echo "Concurrent Users: $CONCURRENT_USERS"
    echo ""
    
    # Setup
    create_test_directories
    check_prerequisites
    generate_test_data
    start_monitoring
    
    # Performance tests
    run_baseline_test
    run_load_test
    run_stress_test
    run_endurance_test
    run_mixed_workload_test
    
    # Analysis
    collect_system_metrics
    generate_performance_report
    
    # Cleanup
    cleanup
    
    echo ""
    local tps_result=$(cat "$RESULTS_DIR/.tps_test_result" 2>/dev/null || echo "UNKNOWN")
    if [ "$tps_result" = "PASS" ]; then
        log_success "🎉 Performance testing completed successfully! Target TPS achieved."
    else
        log_warning "⚠️ Performance testing completed. Target TPS not achieved - optimization needed."
    fi
    echo ""
}

# Handle script arguments
case "$1" in
    "baseline")
        create_test_directories
        check_prerequisites
        generate_test_data
        start_monitoring
        run_baseline_test
        stop_monitoring
        ;;
    "load")
        create_test_directories
        check_prerequisites
        start_monitoring
        run_load_test
        stop_monitoring
        ;;
    "stress")
        create_test_directories
        check_prerequisites
        start_monitoring
        run_stress_test
        stop_monitoring
        ;;
    "endurance")
        create_test_directories
        check_prerequisites
        start_monitoring
        run_endurance_test
        stop_monitoring
        ;;
    "mixed")
        create_test_directories
        check_prerequisites
        start_monitoring
        run_mixed_workload_test
        stop_monitoring
        ;;
    "report")
        generate_performance_report
        ;;
    "clean")
        cleanup
        ;;
    *)
        main
        ;;
esac
