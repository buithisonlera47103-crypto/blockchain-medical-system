#!/bin/bash

# Comprehensive Security Scanning Script for Blockchain EMR
# Runs multiple security tools and generates consolidated reports

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECURITY_DIR="$PROJECT_ROOT/security"
REPORTS_DIR="$SECURITY_DIR/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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
    echo "  all         - Run all security scans"
    echo "  sast        - Run static analysis (Semgrep, SonarQube)"
    echo "  secrets     - Run secrets detection (Gitleaks)"
    echo "  containers  - Run container security scan (Trivy)"
    echo "  dependencies - Run dependency vulnerability scan"
    echo "  report      - Generate consolidated security report"
    echo ""
    echo "Options:"
    echo "  --fail-fast     - Stop on first failure"
    echo "  --output-dir    - Custom output directory"
    echo "  --format        - Output format (json|html|sarif)"
    echo "  --severity      - Minimum severity (low|medium|high|critical)"
    echo "  --help          - Show this help message"
}

# Setup security directories
function setup_directories() {
    mkdir -p "$SECURITY_DIR"/{reports,policies,baselines}
    mkdir -p "$REPORTS_DIR/$TIMESTAMP"
    
    log "Security scan results will be saved to: $REPORTS_DIR/$TIMESTAMP"
}

# Check required tools
function check_prerequisites() {
    log "Checking security scanning tools..."
    
    local missing_tools=()
    
    # Check for Semgrep
    if ! command -v semgrep &> /dev/null; then
        missing_tools+=("semgrep")
    fi
    
    # Check for Gitleaks
    if ! command -v gitleaks &> /dev/null; then
        missing_tools+=("gitleaks")
    fi
    
    # Check for Trivy
    if ! command -v trivy &> /dev/null; then
        missing_tools+=("trivy")
    fi
    
    # Check for npm audit
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        error "Please install the missing tools and try again."
        exit 1
    fi
    
    success "All security tools are available"
}

# Run Semgrep SAST scan
function run_semgrep_scan() {
    log "Running Semgrep static analysis scan..."
    
    local output_file="$REPORTS_DIR/$TIMESTAMP/semgrep-results.json"
    local sarif_file="$REPORTS_DIR/$TIMESTAMP/semgrep-results.sarif"
    
    # Run Semgrep with OWASP rules
    semgrep \
        --config=auto \
        --config=p/owasp-top-ten \
        --config=p/security-audit \
        --config=p/secrets \
        --json \
        --output="$output_file" \
        --sarif \
        --sarif-output="$sarif_file" \
        --severity=ERROR \
        --severity=WARNING \
        --timeout=300 \
        --max-memory=2048 \
        --exclude="node_modules" \
        --exclude="dist" \
        --exclude="build" \
        --exclude="coverage" \
        --exclude="*.test.ts" \
        --exclude="*.spec.ts" \
        "$PROJECT_ROOT" || {
        warning "Semgrep scan completed with findings"
    }
    
    # Generate HTML report
    if command -v semgrep &> /dev/null && [ -f "$output_file" ]; then
        semgrep \
            --config=auto \
            --config=p/owasp-top-ten \
            --html \
            --output="$REPORTS_DIR/$TIMESTAMP/semgrep-report.html" \
            "$PROJECT_ROOT" || warning "Failed to generate Semgrep HTML report"
    fi
    
    success "Semgrep scan completed: $output_file"
}

# Run Gitleaks secrets scan
function run_gitleaks_scan() {
    log "Running Gitleaks secrets detection scan..."
    
    local output_file="$REPORTS_DIR/$TIMESTAMP/gitleaks-results.json"
    local sarif_file="$REPORTS_DIR/$TIMESTAMP/gitleaks-results.sarif"
    
    # Run Gitleaks
    gitleaks detect \
        --config="$PROJECT_ROOT/.gitleaks.toml" \
        --source="$PROJECT_ROOT" \
        --report-format=json \
        --report-path="$output_file" \
        --verbose || {
        warning "Gitleaks scan found potential secrets"
    }
    
    # Generate SARIF format
    gitleaks detect \
        --config="$PROJECT_ROOT/.gitleaks.toml" \
        --source="$PROJECT_ROOT" \
        --report-format=sarif \
        --report-path="$sarif_file" || {
        warning "Failed to generate Gitleaks SARIF report"
    }
    
    success "Gitleaks scan completed: $output_file"
}

# Run Trivy container security scan
function run_trivy_scan() {
    log "Running Trivy container security scan..."
    
    local output_file="$REPORTS_DIR/$TIMESTAMP/trivy-results.json"
    local sbom_file="$REPORTS_DIR/$TIMESTAMP/trivy-sbom.json"
    
    # Scan filesystem for vulnerabilities
    trivy fs \
        --config="$PROJECT_ROOT/trivy.yaml" \
        --format=json \
        --output="$output_file" \
        --severity=CRITICAL,HIGH,MEDIUM \
        --ignore-unfixed \
        "$PROJECT_ROOT" || {
        warning "Trivy scan found vulnerabilities"
    }
    
    # Generate SBOM
    trivy fs \
        --format=cyclonedx \
        --output="$sbom_file" \
        "$PROJECT_ROOT" || {
        warning "Failed to generate SBOM"
    }
    
    # Scan Docker images if they exist
    if [ -f "$PROJECT_ROOT/backend-app/Dockerfile" ]; then
        log "Scanning backend Docker image..."
        
        # Build image for scanning
        docker build -t blockchain-emr-backend:scan "$PROJECT_ROOT/backend-app" || {
            warning "Failed to build backend image for scanning"
            return 0
        }
        
        # Scan image
        trivy image \
            --format=json \
            --output="$REPORTS_DIR/$TIMESTAMP/trivy-backend-image.json" \
            --severity=CRITICAL,HIGH,MEDIUM \
            blockchain-emr-backend:scan || {
            warning "Backend image scan found vulnerabilities"
        }
        
        # Clean up scan image
        docker rmi blockchain-emr-backend:scan || true
    fi
    
    success "Trivy scan completed: $output_file"
}

# Run dependency vulnerability scan
function run_dependency_scan() {
    log "Running dependency vulnerability scan..."
    
    local output_file="$REPORTS_DIR/$TIMESTAMP/npm-audit-results.json"
    
    # Scan backend dependencies
    if [ -f "$PROJECT_ROOT/backend-app/package.json" ]; then
        log "Scanning backend dependencies..."
        
        cd "$PROJECT_ROOT/backend-app"
        npm audit --json > "$REPORTS_DIR/$TIMESTAMP/backend-npm-audit.json" || {
            warning "Backend dependencies have vulnerabilities"
        }
        cd "$PROJECT_ROOT"
    fi
    
    # Scan frontend dependencies
    if [ -f "$PROJECT_ROOT/react-app/package.json" ]; then
        log "Scanning frontend dependencies..."
        
        cd "$PROJECT_ROOT/react-app"
        npm audit --json > "$REPORTS_DIR/$TIMESTAMP/frontend-npm-audit.json" || {
            warning "Frontend dependencies have vulnerabilities"
        }
        cd "$PROJECT_ROOT"
    fi
    
    # Scan root dependencies
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        log "Scanning root dependencies..."
        
        npm audit --json > "$output_file" || {
            warning "Root dependencies have vulnerabilities"
        }
    fi
    
    success "Dependency scan completed: $output_file"
}

# Generate consolidated security report
function generate_security_report() {
    log "Generating consolidated security report..."
    
    local report_file="$REPORTS_DIR/$TIMESTAMP/security-report.md"
    local summary_file="$REPORTS_DIR/$TIMESTAMP/security-summary.json"
    
    {
        echo "# Security Scan Report"
        echo "## Blockchain EMR System"
        echo ""
        echo "**Scan Date:** $(date)"
        echo "**Scan ID:** $TIMESTAMP"
        echo ""
        
        echo "## Executive Summary"
        echo ""
        
        # Analyze results and generate summary
        analyze_scan_results
        
        echo ""
        echo "## Scan Details"
        echo ""
        
        # List all generated reports
        echo "### Generated Reports"
        echo ""
        for file in "$REPORTS_DIR/$TIMESTAMP"/*; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                local filesize=$(du -h "$file" | cut -f1)
                echo "- **$filename** ($filesize)"
            fi
        done
        
        echo ""
        echo "## Recommendations"
        echo ""
        echo "1. Review all HIGH and CRITICAL severity findings immediately"
        echo "2. Update dependencies with known vulnerabilities"
        echo "3. Implement additional security controls for identified risks"
        echo "4. Schedule regular security scans"
        echo "5. Monitor security advisories for used dependencies"
        
        echo ""
        echo "## Next Steps"
        echo ""
        echo "1. Prioritize findings by severity and exploitability"
        echo "2. Create tickets for remediation work"
        echo "3. Update security baselines"
        echo "4. Schedule follow-up scans"
        
    } > "$report_file"
    
    success "Security report generated: $report_file"
}

# Analyze scan results
function analyze_scan_results() {
    local critical_count=0
    local high_count=0
    local medium_count=0
    local low_count=0
    
    # Count findings from different tools
    if [ -f "$REPORTS_DIR/$TIMESTAMP/semgrep-results.json" ]; then
        local semgrep_findings=$(jq '.results | length' "$REPORTS_DIR/$TIMESTAMP/semgrep-results.json" 2>/dev/null || echo "0")
        echo "- **Semgrep SAST:** $semgrep_findings findings"
    fi
    
    if [ -f "$REPORTS_DIR/$TIMESTAMP/gitleaks-results.json" ]; then
        local gitleaks_findings=$(jq '. | length' "$REPORTS_DIR/$TIMESTAMP/gitleaks-results.json" 2>/dev/null || echo "0")
        echo "- **Gitleaks Secrets:** $gitleaks_findings potential secrets"
    fi
    
    if [ -f "$REPORTS_DIR/$TIMESTAMP/trivy-results.json" ]; then
        local trivy_findings=$(jq '.Results[].Vulnerabilities | length' "$REPORTS_DIR/$TIMESTAMP/trivy-results.json" 2>/dev/null || echo "0")
        echo "- **Trivy Vulnerabilities:** $trivy_findings vulnerabilities"
    fi
    
    # Overall risk assessment
    echo ""
    echo "### Risk Assessment"
    echo ""
    
    local total_findings=$((semgrep_findings + gitleaks_findings + trivy_findings))
    
    if [ $total_findings -eq 0 ]; then
        echo "✅ **LOW RISK** - No significant security findings detected"
    elif [ $total_findings -lt 10 ]; then
        echo "⚠️ **MEDIUM RISK** - Some security findings require attention"
    else
        echo "🚨 **HIGH RISK** - Multiple security findings require immediate attention"
    fi
}

# Run all security scans
function run_all_scans() {
    log "Running comprehensive security scan suite..."
    
    local failed_scans=()
    
    # Run SAST scan
    if ! run_semgrep_scan; then
        failed_scans+=("Semgrep")
        [ "$FAIL_FAST" = true ] && exit 1
    fi
    
    # Run secrets scan
    if ! run_gitleaks_scan; then
        failed_scans+=("Gitleaks")
        [ "$FAIL_FAST" = true ] && exit 1
    fi
    
    # Run container scan
    if ! run_trivy_scan; then
        failed_scans+=("Trivy")
        [ "$FAIL_FAST" = true ] && exit 1
    fi
    
    # Run dependency scan
    if ! run_dependency_scan; then
        failed_scans+=("Dependencies")
        [ "$FAIL_FAST" = true ] && exit 1
    fi
    
    # Generate report
    generate_security_report
    
    # Summary
    if [ ${#failed_scans[@]} -eq 0 ]; then
        success "All security scans completed successfully"
    else
        warning "Some scans had issues: ${failed_scans[*]}"
    fi
    
    log "Security scan suite completed. Reports available in: $REPORTS_DIR/$TIMESTAMP"
}

# Parse command line arguments
function parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --fail-fast)
                FAIL_FAST=true
                shift
                ;;
            --output-dir)
                REPORTS_DIR="$2"
                shift 2
                ;;
            --format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            --severity)
                MIN_SEVERITY="$2"
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
    local command="${1:-all}"
    shift || true
    
    parse_args "$@"
    
    check_prerequisites
    setup_directories
    
    case "$command" in
        "all")
            run_all_scans
            ;;
        "sast")
            run_semgrep_scan
            ;;
        "secrets")
            run_gitleaks_scan
            ;;
        "containers")
            run_trivy_scan
            ;;
        "dependencies")
            run_dependency_scan
            ;;
        "report")
            generate_security_report
            ;;
        *)
            print_help
            ;;
    esac
}

# Run main function
main "$@"
