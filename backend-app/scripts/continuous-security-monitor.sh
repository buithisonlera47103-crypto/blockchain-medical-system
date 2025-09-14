#!/bin/bash

# Continuous Security Monitoring Script
# Integrates with CI/CD pipelines for automated security testing

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONITOR_CONFIG="${PROJECT_ROOT}/security/monitor-config.json"
ALERTS_DIR="${PROJECT_ROOT}/security/alerts"
BASELINE_DIR="${PROJECT_ROOT}/security/baseline"
REPORTS_DIR="${PROJECT_ROOT}/security/reports"

# Default configuration
DEFAULT_CHECK_INTERVAL=3600  # 1 hour
DEFAULT_ALERT_THRESHOLD="medium"
DEFAULT_WEBHOOK_URL=""
DEFAULT_EMAIL_RECIPIENTS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ALERTS_DIR/monitor.log"
}

function success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ALERTS_DIR/monitor.log"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ALERTS_DIR/monitor.log"
}

function warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ALERTS_DIR/monitor.log"
}

function print_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start     - Start continuous monitoring"
    echo "  stop      - Stop continuous monitoring"
    echo "  status    - Check monitoring status"
    echo "  scan      - Run immediate security scan"
    echo "  baseline  - Create security baseline"
    echo "  alert     - Test alert system"
    echo "  config    - Configure monitoring settings"
    echo ""
    echo "Options:"
    echo "  --interval SECONDS    - Check interval (default: 3600)"
    echo "  --threshold LEVEL     - Alert threshold (low|medium|high)"
    echo "  --webhook URL         - Webhook URL for alerts"
    echo "  --email ADDRESSES     - Email addresses for alerts"
    echo "  --daemon              - Run as daemon process"
    echo "  --help                - Show this help message"
}

# Load configuration
function load_config() {
    if [ -f "$MONITOR_CONFIG" ]; then
        CHECK_INTERVAL=$(jq -r '.check_interval // 3600' "$MONITOR_CONFIG")
        ALERT_THRESHOLD=$(jq -r '.alert_threshold // "medium"' "$MONITOR_CONFIG")
        WEBHOOK_URL=$(jq -r '.webhook_url // ""' "$MONITOR_CONFIG")
        EMAIL_RECIPIENTS=$(jq -r '.email_recipients // ""' "$MONITOR_CONFIG")
        BASELINE_ENABLED=$(jq -r '.baseline_enabled // true' "$MONITOR_CONFIG")
    else
        CHECK_INTERVAL=$DEFAULT_CHECK_INTERVAL
        ALERT_THRESHOLD=$DEFAULT_ALERT_THRESHOLD
        WEBHOOK_URL=$DEFAULT_WEBHOOK_URL
        EMAIL_RECIPIENTS=$DEFAULT_EMAIL_RECIPIENTS
        BASELINE_ENABLED=true
    fi
}

# Save configuration
function save_config() {
    mkdir -p "$(dirname "$MONITOR_CONFIG")"
    
    cat > "$MONITOR_CONFIG" << EOF
{
  "check_interval": $CHECK_INTERVAL,
  "alert_threshold": "$ALERT_THRESHOLD",
  "webhook_url": "$WEBHOOK_URL",
  "email_recipients": "$EMAIL_RECIPIENTS",
  "baseline_enabled": $BASELINE_ENABLED,
  "last_updated": "$(date -Iseconds)"
}
EOF
    
    success "Configuration saved to $MONITOR_CONFIG"
}

# Setup monitoring directories
function setup_directories() {
    mkdir -p "$ALERTS_DIR"
    mkdir -p "$BASELINE_DIR"
    mkdir -p "$REPORTS_DIR"
    
    # Initialize log file
    touch "$ALERTS_DIR/monitor.log"
    
    # Rotate log if it's too large (>10MB)
    if [ -f "$ALERTS_DIR/monitor.log" ] && [ $(stat -f%z "$ALERTS_DIR/monitor.log" 2>/dev/null || stat -c%s "$ALERTS_DIR/monitor.log") -gt 10485760 ]; then
        mv "$ALERTS_DIR/monitor.log" "$ALERTS_DIR/monitor.log.old"
        touch "$ALERTS_DIR/monitor.log"
    fi
}

# Check if application is running
function check_app_status() {
    local app_url="${APP_URL:-http://localhost:3000}"
    
    if curl -s -f "$app_url/api/v1/monitoring/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Run security scan
function run_security_scan() {
    log "Running security scan..."
    
    local scan_timestamp=$(date +"%Y%m%d_%H%M%S")
    local scan_dir="$REPORTS_DIR/monitor_scan_$scan_timestamp"
    
    mkdir -p "$scan_dir"
    
    # Run lightweight security checks
    run_quick_security_checks "$scan_dir"
    
    # Run ZAP baseline if available
    if command -v zap-baseline.py &> /dev/null || [ "$USE_ZAP_DOCKER" = true ]; then
        run_zap_quick_scan "$scan_dir"
    fi
    
    # Analyze results
    analyze_scan_results "$scan_dir"
    
    success "Security scan completed: $scan_dir"
}

# Run quick security checks
function run_quick_security_checks() {
    local output_dir="$1"
    local app_url="${APP_URL:-http://localhost:3000}"
    
    log "Running quick security checks..."
    
    {
        echo "Quick Security Check Report"
        echo "=========================="
        echo "Timestamp: $(date)"
        echo "Target: $app_url"
        echo ""
        
        echo "Security Headers Check:"
        echo "----------------------"
        check_security_headers_quick "$app_url"
        
        echo ""
        echo "SSL/TLS Check:"
        echo "-------------"
        check_ssl_quick "$app_url"
        
        echo ""
        echo "API Endpoints Check:"
        echo "-------------------"
        check_api_endpoints_quick "$app_url"
        
    } > "$output_dir/quick-security-check.txt"
}

# Quick security headers check
function check_security_headers_quick() {
    local url="$1"
    local headers=(
        "Strict-Transport-Security"
        "Content-Security-Policy"
        "X-Frame-Options"
        "X-Content-Type-Options"
    )
    
    for header in "${headers[@]}"; do
        if curl -s -I "$url" | grep -qi "$header"; then
            echo "✓ $header: Present"
        else
            echo "✗ $header: Missing"
        fi
    done
}

# Quick SSL check
function check_ssl_quick() {
    local url="$1"
    
    if [[ "$url" == https://* ]]; then
        local hostname=$(echo "$url" | sed -e 's|^[^/]*//||' -e 's|/.*||' -e 's|:.*||')
        local port=443
        
        if echo | openssl s_client -connect "$hostname:$port" -servername "$hostname" 2>/dev/null | grep -q "CONNECTED"; then
            echo "✓ SSL/TLS: Connection successful"
            
            # Check certificate expiry
            local expiry=$(echo | openssl s_client -connect "$hostname:$port" -servername "$hostname" 2>/dev/null | \
                          openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
            if [ -n "$expiry" ]; then
                echo "✓ Certificate expires: $expiry"
            fi
        else
            echo "✗ SSL/TLS: Connection failed"
        fi
    else
        echo "- SSL/TLS: Not applicable (HTTP endpoint)"
    fi
}

# Quick API endpoints check
function check_api_endpoints_quick() {
    local base_url="$1"
    local endpoints=(
        "/api/v1/monitoring/health"
        "/api/v1/auth/login"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="$base_url$endpoint"
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        
        case $status in
            200|201|204|401|403)
                echo "✓ $endpoint: Responding (HTTP $status)"
                ;;
            500|502|503)
                echo "✗ $endpoint: Server error (HTTP $status)"
                ;;
            *)
                echo "? $endpoint: Unexpected response (HTTP $status)"
                ;;
        esac
    done
}

# Run ZAP quick scan
function run_zap_quick_scan() {
    local output_dir="$1"
    local app_url="${APP_URL:-http://localhost:3000}"
    
    log "Running ZAP quick scan..."
    
    local zap_cmd=""
    if [ "$USE_ZAP_DOCKER" = true ]; then
        zap_cmd="docker run --rm -v $output_dir:/zap/wrk/:rw --network host owasp/zap2docker-stable zap-baseline.py"
    elif command -v zap-baseline.py &> /dev/null; then
        zap_cmd="zap-baseline.py"
    else
        warning "ZAP not available for quick scan"
        return 0
    fi
    
    # Run quick ZAP scan with reduced scope
    timeout 300 $zap_cmd \
        -t "$app_url" \
        -J "zap-quick-scan.json" \
        -r "zap-quick-scan.html" \
        -T 5 \
        -z "-config spider.maxDuration=2" \
        -z "-config scanner.strength=LOW" \
        || warning "ZAP quick scan completed with warnings"
}

# Analyze scan results
function analyze_scan_results() {
    local scan_dir="$1"
    
    log "Analyzing scan results..."
    
    local findings_count=0
    local high_risk_count=0
    local medium_risk_count=0
    
    # Analyze ZAP results if available
    if [ -f "$scan_dir/zap-quick-scan.json" ] && command -v jq &> /dev/null; then
        findings_count=$(jq '.site[0].alerts | length' "$scan_dir/zap-quick-scan.json" 2>/dev/null || echo "0")
        high_risk_count=$(jq '.site[0].alerts[] | select(.riskdesc | contains("High"))' "$scan_dir/zap-quick-scan.json" 2>/dev/null | jq -s length)
        medium_risk_count=$(jq '.site[0].alerts[] | select(.riskdesc | contains("Medium"))' "$scan_dir/zap-quick-scan.json" 2>/dev/null | jq -s length)
    fi
    
    # Check against baseline if enabled
    local baseline_changed=false
    if [ "$BASELINE_ENABLED" = true ] && [ -f "$BASELINE_DIR/baseline-findings.json" ]; then
        baseline_changed=$(compare_with_baseline "$scan_dir")
    fi
    
    # Determine if alert should be triggered
    local should_alert=false
    case $ALERT_THRESHOLD in
        "high")
            [ $high_risk_count -gt 0 ] && should_alert=true
            ;;
        "medium")
            [ $((high_risk_count + medium_risk_count)) -gt 0 ] && should_alert=true
            ;;
        "low")
            [ $findings_count -gt 0 ] && should_alert=true
            ;;
    esac
    
    # Trigger alert if necessary
    if [ "$should_alert" = true ] || [ "$baseline_changed" = true ]; then
        trigger_security_alert "$scan_dir" "$findings_count" "$high_risk_count" "$medium_risk_count"
    else
        log "No security alerts triggered (findings: $findings_count, high: $high_risk_count, medium: $medium_risk_count)"
    fi
}

# Compare with baseline
function compare_with_baseline() {
    local scan_dir="$1"
    
    if [ ! -f "$scan_dir/zap-quick-scan.json" ] || [ ! -f "$BASELINE_DIR/baseline-findings.json" ]; then
        return 1
    fi
    
    # Simple comparison - in production, this would be more sophisticated
    local current_hash=$(jq -S '.site[0].alerts' "$scan_dir/zap-quick-scan.json" 2>/dev/null | sha256sum | cut -d' ' -f1)
    local baseline_hash=$(jq -S '.site[0].alerts' "$BASELINE_DIR/baseline-findings.json" 2>/dev/null | sha256sum | cut -d' ' -f1)
    
    if [ "$current_hash" != "$baseline_hash" ]; then
        log "Security baseline deviation detected"
        return 0
    else
        return 1
    fi
}

# Trigger security alert
function trigger_security_alert() {
    local scan_dir="$1"
    local findings_count="$2"
    local high_risk_count="$3"
    local medium_risk_count="$4"
    
    warning "Security alert triggered!"
    warning "Findings: $findings_count, High Risk: $high_risk_count, Medium Risk: $medium_risk_count"
    
    # Create alert message
    local alert_message="🚨 Security Alert - Blockchain EMR System

Timestamp: $(date)
Findings: $findings_count
High Risk: $high_risk_count
Medium Risk: $medium_risk_count

Scan Directory: $scan_dir

Please review the security reports and take appropriate action."
    
    # Save alert
    echo "$alert_message" > "$ALERTS_DIR/alert_$(date +%Y%m%d_%H%M%S).txt"
    
    # Send webhook notification
    if [ -n "$WEBHOOK_URL" ]; then
        send_webhook_alert "$alert_message"
    fi
    
    # Send email notification
    if [ -n "$EMAIL_RECIPIENTS" ]; then
        send_email_alert "$alert_message"
    fi
}

# Send webhook alert
function send_webhook_alert() {
    local message="$1"
    
    if command -v curl &> /dev/null; then
        curl -X POST "$WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"$message\"}" \
             || warning "Failed to send webhook alert"
    fi
}

# Send email alert
function send_email_alert() {
    local message="$1"
    
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "Security Alert - Blockchain EMR" "$EMAIL_RECIPIENTS" \
            || warning "Failed to send email alert"
    fi
}

# Create security baseline
function create_baseline() {
    log "Creating security baseline..."
    
    if ! check_app_status; then
        error "Application is not running. Cannot create baseline."
        return 1
    fi
    
    local baseline_scan_dir="$BASELINE_DIR/baseline_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$baseline_scan_dir"
    
    # Run comprehensive scan for baseline
    run_security_scan
    
    # Copy latest scan results to baseline
    local latest_scan=$(ls -t "$REPORTS_DIR"/monitor_scan_* | head -1)
    if [ -n "$latest_scan" ]; then
        cp -r "$latest_scan"/* "$baseline_scan_dir/"
        
        # Create baseline reference
        if [ -f "$baseline_scan_dir/zap-quick-scan.json" ]; then
            cp "$baseline_scan_dir/zap-quick-scan.json" "$BASELINE_DIR/baseline-findings.json"
        fi
        
        success "Security baseline created: $baseline_scan_dir"
    else
        error "No scan results found to create baseline"
        return 1
    fi
}

# Start monitoring daemon
function start_monitoring() {
    log "Starting continuous security monitoring..."
    
    # Check if already running
    if [ -f "$ALERTS_DIR/monitor.pid" ]; then
        local pid=$(cat "$ALERTS_DIR/monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            warning "Monitoring is already running (PID: $pid)"
            return 0
        else
            rm -f "$ALERTS_DIR/monitor.pid"
        fi
    fi
    
    # Start monitoring loop
    {
        echo $$ > "$ALERTS_DIR/monitor.pid"
        
        while true; do
            if check_app_status; then
                run_security_scan
            else
                warning "Application is not responding, skipping security scan"
            fi
            
            sleep "$CHECK_INTERVAL"
        done
    } &
    
    success "Monitoring started (PID: $$, Interval: ${CHECK_INTERVAL}s)"
}

# Stop monitoring daemon
function stop_monitoring() {
    if [ -f "$ALERTS_DIR/monitor.pid" ]; then
        local pid=$(cat "$ALERTS_DIR/monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$ALERTS_DIR/monitor.pid"
            success "Monitoring stopped (PID: $pid)"
        else
            warning "Monitoring process not found"
            rm -f "$ALERTS_DIR/monitor.pid"
        fi
    else
        warning "Monitoring is not running"
    fi
}

# Check monitoring status
function check_status() {
    if [ -f "$ALERTS_DIR/monitor.pid" ]; then
        local pid=$(cat "$ALERTS_DIR/monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            success "Monitoring is running (PID: $pid)"
            log "Configuration: Interval=${CHECK_INTERVAL}s, Threshold=$ALERT_THRESHOLD"
        else
            warning "Monitoring PID file exists but process is not running"
            rm -f "$ALERTS_DIR/monitor.pid"
        fi
    else
        log "Monitoring is not running"
    fi
}

# Parse command line arguments
function parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --interval)
                CHECK_INTERVAL="$2"
                shift 2
                ;;
            --threshold)
                ALERT_THRESHOLD="$2"
                shift 2
                ;;
            --webhook)
                WEBHOOK_URL="$2"
                shift 2
                ;;
            --email)
                EMAIL_RECIPIENTS="$2"
                shift 2
                ;;
            --daemon)
                DAEMON_MODE=true
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
    
    setup_directories
    load_config
    
    case "$command" in
        "start")
            if [ "$DAEMON_MODE" = true ]; then
                nohup "$0" start > "$ALERTS_DIR/monitor.log" 2>&1 &
                success "Monitoring started in daemon mode"
            else
                start_monitoring
            fi
            ;;
        "stop")
            stop_monitoring
            ;;
        "status")
            check_status
            ;;
        "scan")
            if check_app_status; then
                run_security_scan
            else
                error "Application is not running"
                exit 1
            fi
            ;;
        "baseline")
            create_baseline
            ;;
        "alert")
            trigger_security_alert "test" "0" "0" "0"
            ;;
        "config")
            save_config
            ;;
        *)
            print_help
            ;;
    esac
}

# Run main function
main "$@"
