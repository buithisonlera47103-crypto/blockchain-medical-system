#!/bin/bash

# Performance Testing Script for Blockchain EMR System
# Validates 1000 TPS performance target using multiple testing tools

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PERFORMANCE_DIR="$PROJECT_ROOT/performance"
REPORTS_DIR="$PERFORMANCE_DIR/reports"
TARGET_URL="${TARGET_URL:-http://localhost:3000}"
TPS_TARGET="${TPS_TARGET:-1000}"
LATENCY_TARGET="${LATENCY_TARGET:-100}"
ERROR_RATE_TARGET="${ERROR_RATE_TARGET:-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

function success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function print_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  quick     - Run quick performance test (5 minutes)"
    echo "  full      - Run full performance test suite (30 minutes)"
    echo "  stress    - Run stress test to find breaking point"
    echo "  baseline  - Create performance baseline"
    echo "  compare   - Compare with baseline"
    echo "  monitor   - Start real-time monitoring dashboard"
    echo "  report    - Generate performance report"
    echo ""
    echo "Options:"
    echo "  --target URL      - Target application URL (default: http://localhost:3000)"
    echo "  --tps TARGET      - TPS target (default: 1000)"
    echo "  --duration MINS   - Test duration in minutes"
    echo "  --tool TOOL       - Testing tool (artillery|k6|both)"
    echo "  --no-warmup       - Skip warmup phase"
    echo "  --help            - Show this help message"
}

# Check prerequisites
function check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    # Check if testing tools are available
    local has_artillery=false
    local has_k6=false
    
    if command -v artillery &> /dev/null; then
        has_artillery=true
    fi
    
    if command -v k6 &> /dev/null; then
        has_k6=true
    fi
    
    if [ "$has_artillery" = false ] && [ "$has_k6" = false ]; then
        warning "No load testing tools found. Installing Artillery..."
        npm install -g artillery || {
            error "Failed to install Artillery"
            missing_tools+=("artillery or k6")
        }
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        error "Please install the missing tools and try again."
        exit 1
    fi
    
    success "All prerequisites are available"
}

# Setup directories
function setup_directories() {
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$PERFORMANCE_DIR/baseline"
    mkdir -p "$PERFORMANCE_DIR/dashboard"
    
    # Create timestamp for this test run
    export TEST_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    export TEST_RUN_DIR="$REPORTS_DIR/run_$TEST_TIMESTAMP"
    mkdir -p "$TEST_RUN_DIR"
    
    log "Test results will be saved to: $TEST_RUN_DIR"
}

# Wait for application to be ready
function wait_for_app() {
    log "Waiting for application to be ready at $TARGET_URL..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$TARGET_URL/api/v1/monitoring/health" > /dev/null 2>&1; then
            success "Application is ready!"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Application not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    error "Application failed to respond within expected time."
    return 1
}

# Run Artillery load test
function run_artillery_test() {
    log "Running Artillery load test..."
    
    if ! command -v artillery &> /dev/null; then
        warning "Artillery not available, skipping"
        return 0
    fi
    
    local config_file="$PERFORMANCE_DIR/artillery-config.yml"
    local output_file="$TEST_RUN_DIR/artillery-results.json"
    local report_file="$TEST_RUN_DIR/artillery-report.html"
    
    # Update config with current target URL
    sed "s|target: 'http://localhost:3000'|target: '$TARGET_URL'|g" "$config_file" > "$TEST_RUN_DIR/artillery-config.yml"
    
    # Run Artillery test
    artillery run "$TEST_RUN_DIR/artillery-config.yml" \
        --output "$output_file" \
        || warning "Artillery test completed with warnings"
    
    # Generate HTML report
    if [ -f "$output_file" ]; then
        artillery report "$output_file" --output "$report_file"
        success "Artillery test completed. Report: $report_file"
    fi
}

# Run K6 load test
function run_k6_test() {
    log "Running K6 load test..."
    
    if ! command -v k6 &> /dev/null; then
        warning "K6 not available, skipping"
        return 0
    fi
    
    local script_file="$PERFORMANCE_DIR/k6-load-test.js"
    local output_file="$TEST_RUN_DIR/k6-results.json"
    
    # Set environment variables for K6
    export BASE_URL="$TARGET_URL"
    
    # Run K6 test
    k6 run "$script_file" \
        --out json="$output_file" \
        --summary-export="$TEST_RUN_DIR/k6-summary.json" \
        || warning "K6 test completed with warnings"
    
    success "K6 test completed. Results: $output_file"
}

# Run quick performance test
function run_quick_test() {
    log "Running quick performance test (5 minutes)..."
    
    # Create quick test config
    cat > "$TEST_RUN_DIR/quick-artillery-config.yml" << EOF
config:
  target: '$TARGET_URL'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm-up"
    - duration: 180
      arrivalRate: 10
      rampTo: 500
      name: "Ramp-up"
    - duration: 120
      arrivalRate: 500
      name: "Sustained load"
  ensure:
    maxErrorRate: 5
    p95: 200
scenarios:
  - name: "Quick Test"
    weight: 100
    flow:
      - get:
          url: "/api/v1/monitoring/health"
          expect:
            - statusCode: 200
EOF
    
    if command -v artillery &> /dev/null; then
        artillery run "$TEST_RUN_DIR/quick-artillery-config.yml" \
            --output "$TEST_RUN_DIR/quick-results.json"
        
        if [ -f "$TEST_RUN_DIR/quick-results.json" ]; then
            artillery report "$TEST_RUN_DIR/quick-results.json" \
                --output "$TEST_RUN_DIR/quick-report.html"
        fi
    fi
    
    success "Quick test completed"
}

# Run stress test
function run_stress_test() {
    log "Running stress test to find breaking point..."
    
    # Create stress test config
    cat > "$TEST_RUN_DIR/stress-artillery-config.yml" << EOF
config:
  target: '$TARGET_URL'
  phases:
    - duration: 60
      arrivalRate: 100
      name: "Baseline"
    - duration: 120
      arrivalRate: 100
      rampTo: 1500
      name: "Stress ramp-up"
    - duration: 180
      arrivalRate: 1500
      rampTo: 3000
      name: "High stress"
    - duration: 60
      arrivalRate: 3000
      name: "Breaking point"
  ensure:
    maxErrorRate: 50  # Allow higher error rate for stress test
scenarios:
  - name: "Stress Test"
    weight: 100
    flow:
      - get:
          url: "/api/v1/monitoring/health"
EOF
    
    if command -v artillery &> /dev/null; then
        artillery run "$TEST_RUN_DIR/stress-artillery-config.yml" \
            --output "$TEST_RUN_DIR/stress-results.json" \
            || warning "Stress test completed (expected to find limits)"
        
        if [ -f "$TEST_RUN_DIR/stress-results.json" ]; then
            artillery report "$TEST_RUN_DIR/stress-results.json" \
                --output "$TEST_RUN_DIR/stress-report.html"
        fi
    fi
    
    success "Stress test completed"
}

# Start performance monitoring dashboard
function start_monitoring() {
    log "Starting performance monitoring dashboard..."
    
    cd "$PERFORMANCE_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install express socket.io axios
    fi
    
    # Start monitor
    TARGET_URL="$TARGET_URL" \
    TPS_TARGET="$TPS_TARGET" \
    LATENCY_TARGET="$LATENCY_TARGET" \
    ERROR_RATE_TARGET="$ERROR_RATE_TARGET" \
    node performance-monitor.js &
    
    local monitor_pid=$!
    echo $monitor_pid > "$PERFORMANCE_DIR/monitor.pid"
    
    success "Performance monitor started (PID: $monitor_pid)"
    log "Dashboard available at: http://localhost:3003"
    
    # Wait a bit for the monitor to start
    sleep 3
}

# Stop monitoring dashboard
function stop_monitoring() {
    if [ -f "$PERFORMANCE_DIR/monitor.pid" ]; then
        local pid=$(cat "$PERFORMANCE_DIR/monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$PERFORMANCE_DIR/monitor.pid"
            success "Performance monitor stopped"
        fi
    fi
}

# Analyze test results
function analyze_results() {
    log "Analyzing test results..."
    
    local analysis_file="$TEST_RUN_DIR/analysis.md"
    
    {
        echo "# Performance Test Analysis"
        echo "## Test Run: $TEST_TIMESTAMP"
        echo ""
        echo "**Target:** $TARGET_URL"
        echo "**TPS Target:** $TPS_TARGET"
        echo "**Latency Target:** ${LATENCY_TARGET}ms"
        echo "**Error Rate Target:** ${ERROR_RATE_TARGET}%"
        echo ""
        
        # Analyze Artillery results if available
        if [ -f "$TEST_RUN_DIR/artillery-results.json" ]; then
            echo "## Artillery Results"
            echo ""
            
            # Extract key metrics using jq if available
            if command -v jq &> /dev/null; then
                local rps=$(jq -r '.aggregate.rps.mean // "N/A"' "$TEST_RUN_DIR/artillery-results.json")
                local latency_p95=$(jq -r '.aggregate.latency.p95 // "N/A"' "$TEST_RUN_DIR/artillery-results.json")
                local error_rate=$(jq -r '.aggregate.errors // 0' "$TEST_RUN_DIR/artillery-results.json")
                
                echo "- **Average RPS:** $rps"
                echo "- **P95 Latency:** ${latency_p95}ms"
                echo "- **Errors:** $error_rate"
                echo ""
                
                # Performance assessment
                if [ "$rps" != "N/A" ] && [ $(echo "$rps >= $TPS_TARGET * 0.8" | bc -l 2>/dev/null || echo "0") -eq 1 ]; then
                    echo "✅ **TPS Assessment:** PASS (${rps} >= 80% of target)"
                else
                    echo "❌ **TPS Assessment:** FAIL (${rps} < 80% of target)"
                fi
                
                if [ "$latency_p95" != "N/A" ] && [ $(echo "$latency_p95 <= $LATENCY_TARGET" | bc -l 2>/dev/null || echo "0") -eq 1 ]; then
                    echo "✅ **Latency Assessment:** PASS (${latency_p95}ms <= ${LATENCY_TARGET}ms)"
                else
                    echo "❌ **Latency Assessment:** FAIL (${latency_p95}ms > ${LATENCY_TARGET}ms)"
                fi
            else
                echo "- Artillery results available but jq not installed for detailed analysis"
            fi
            echo ""
        fi
        
        # Analyze K6 results if available
        if [ -f "$TEST_RUN_DIR/k6-summary.json" ]; then
            echo "## K6 Results"
            echo ""
            
            if command -v jq &> /dev/null; then
                local http_reqs=$(jq -r '.metrics.http_reqs.values.count // "N/A"' "$TEST_RUN_DIR/k6-summary.json")
                local http_req_duration_p95=$(jq -r '.metrics.http_req_duration.values.p95 // "N/A"' "$TEST_RUN_DIR/k6-summary.json")
                local http_req_failed_rate=$(jq -r '.metrics.http_req_failed.values.rate // "N/A"' "$TEST_RUN_DIR/k6-summary.json")
                
                echo "- **Total Requests:** $http_reqs"
                echo "- **P95 Duration:** ${http_req_duration_p95}ms"
                echo "- **Failure Rate:** ${http_req_failed_rate}%"
            else
                echo "- K6 results available but jq not installed for detailed analysis"
            fi
            echo ""
        fi
        
        echo "## Recommendations"
        echo ""
        echo "1. Review detailed reports in HTML format"
        echo "2. Monitor system resources during peak load"
        echo "3. Identify bottlenecks in slow endpoints"
        echo "4. Consider horizontal scaling if TPS target not met"
        echo "5. Optimize database queries for better latency"
        echo ""
        
        echo "## Files Generated"
        echo ""
        for file in "$TEST_RUN_DIR"/*; do
            if [ -f "$file" ]; then
                echo "- $(basename "$file")"
            fi
        done
        
    } > "$analysis_file"
    
    success "Analysis completed: $analysis_file"
}

# Generate performance report
function generate_report() {
    log "Generating comprehensive performance report..."
    
    local report_file="$REPORTS_DIR/performance-summary.md"
    
    {
        echo "# Performance Testing Summary"
        echo "## Blockchain EMR System"
        echo ""
        echo "**Generated:** $(date)"
        echo "**Target Application:** $TARGET_URL"
        echo ""
        
        echo "## Recent Test Runs"
        echo ""
        
        # List recent test runs
        for run_dir in "$REPORTS_DIR"/run_*; do
            if [ -d "$run_dir" ]; then
                local run_name=$(basename "$run_dir")
                local run_date=$(echo "$run_name" | sed 's/run_//' | sed 's/_/ /')
                echo "- [$run_name](./$run_name/) - $run_date"
            fi
        done
        
        echo ""
        echo "## Performance Targets"
        echo ""
        echo "| Metric | Target | Status |"
        echo "|--------|--------|--------|"
        echo "| TPS | $TPS_TARGET | 🎯 |"
        echo "| Latency (P95) | ${LATENCY_TARGET}ms | 🎯 |"
        echo "| Error Rate | <${ERROR_RATE_TARGET}% | 🎯 |"
        echo ""
        
        echo "## Tools Used"
        echo ""
        echo "- **Artillery:** HTTP load testing with scenarios"
        echo "- **K6:** JavaScript-based load testing"
        echo "- **Performance Monitor:** Real-time metrics dashboard"
        echo ""
        
        echo "## Next Steps"
        echo ""
        echo "1. Run regular performance tests"
        echo "2. Set up continuous performance monitoring"
        echo "3. Create performance regression tests"
        echo "4. Optimize identified bottlenecks"
        
    } > "$report_file"
    
    success "Performance report generated: $report_file"
}

# Parse command line arguments
function parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --target)
                TARGET_URL="$2"
                shift 2
                ;;
            --tps)
                TPS_TARGET="$2"
                shift 2
                ;;
            --duration)
                TEST_DURATION="$2"
                shift 2
                ;;
            --tool)
                TEST_TOOL="$2"
                shift 2
                ;;
            --no-warmup)
                NO_WARMUP=true
                shift
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
    
    check_prerequisites
    setup_directories
    
    case "$command" in
        "quick")
            if wait_for_app; then
                run_quick_test
                analyze_results
            else
                error "Application not ready"
                exit 1
            fi
            ;;
        "full")
            if wait_for_app; then
                run_artillery_test
                run_k6_test
                analyze_results
            else
                error "Application not ready"
                exit 1
            fi
            ;;
        "stress")
            if wait_for_app; then
                run_stress_test
                analyze_results
            else
                error "Application not ready"
                exit 1
            fi
            ;;
        "monitor")
            start_monitoring
            log "Press Ctrl+C to stop monitoring"
            trap stop_monitoring EXIT
            wait
            ;;
        "report")
            generate_report
            ;;
        *)
            print_help
            ;;
    esac
}

# Run main function
main "$@"
