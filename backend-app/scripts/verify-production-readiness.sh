#!/bin/bash

# EMR Blockchain Production Readiness Verification Script
# Comprehensive system verification for production deployment
# Ensures all components meet healthcare compliance and performance requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verification results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
CRITICAL_FAILURES=0

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

# Add check result
add_check_result() {
    local component="$1"
    local check_type="$2"
    local status="$3"
    local message="$4"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case "$status" in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            echo "✅ $component ($check_type): $message"
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            if [ "$check_type" = "critical" ]; then
                CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
            fi
            echo "❌ $component ($check_type): $message"
            ;;
        "WARN")
            echo "⚠️  $component ($check_type): $message"
            ;;
    esac
}

# Check Node.js and npm versions
check_nodejs_environment() {
    log_info "Checking Node.js environment..."
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        if [[ "$node_version" =~ v1[8-9]\.|v[2-9][0-9]\. ]]; then
            add_check_result "Node.js" "critical" "PASS" "Version $node_version (compatible)"
        else
            add_check_result "Node.js" "critical" "FAIL" "Version $node_version (requires v18+)"
        fi
    else
        add_check_result "Node.js" "critical" "FAIL" "Node.js not installed"
    fi
    
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        add_check_result "npm" "medium" "PASS" "Version $npm_version"
    else
        add_check_result "npm" "critical" "FAIL" "npm not installed"
    fi
}

# Check PostgreSQL configuration
check_postgresql() {
    log_info "Checking PostgreSQL configuration..."
    
    if command -v psql &> /dev/null; then
        add_check_result "PostgreSQL Client" "critical" "PASS" "psql client available"
        
        # Test connection
        if pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" >/dev/null 2>&1; then
            add_check_result "PostgreSQL Server" "critical" "PASS" "Server is running and accessible"
        else
            add_check_result "PostgreSQL Server" "critical" "FAIL" "Server not accessible"
        fi
    else
        add_check_result "PostgreSQL Client" "critical" "FAIL" "psql client not installed"
    fi
}

# Check Docker and Docker Compose
check_docker_environment() {
    log_info "Checking Docker environment..."
    
    if command -v docker &> /dev/null; then
        if docker info >/dev/null 2>&1; then
            local docker_version=$(docker --version)
            add_check_result "Docker" "critical" "PASS" "$docker_version"
        else
            add_check_result "Docker" "critical" "FAIL" "Docker daemon not running"
        fi
    else
        add_check_result "Docker" "critical" "FAIL" "Docker not installed"
    fi
    
    if command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version)
        add_check_result "Docker Compose" "critical" "PASS" "$compose_version"
    else
        add_check_result "Docker Compose" "critical" "FAIL" "Docker Compose not installed"
    fi
}

# Check system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    if [ "$cpu_cores" -ge 8 ]; then
        add_check_result "CPU Cores" "high" "PASS" "$cpu_cores cores available"
    elif [ "$cpu_cores" -ge 4 ]; then
        add_check_result "CPU Cores" "high" "WARN" "$cpu_cores cores (8+ recommended)"
    else
        add_check_result "CPU Cores" "high" "FAIL" "$cpu_cores cores (minimum 4 required)"
    fi
    
    # Check memory
    local memory_gb=$(free -g | awk 'NR==2{print $2}')
    if [ "$memory_gb" -ge 16 ]; then
        add_check_result "Memory" "high" "PASS" "${memory_gb}GB available"
    elif [ "$memory_gb" -ge 8 ]; then
        add_check_result "Memory" "high" "WARN" "${memory_gb}GB (16GB+ recommended)"
    else
        add_check_result "Memory" "high" "FAIL" "${memory_gb}GB (minimum 8GB required)"
    fi
    
    # Check disk space
    local disk_space=$(df / | awk 'NR==2{print $4}')
    local disk_space_gb=$((disk_space / 1024 / 1024))
    if [ "$disk_space_gb" -ge 100 ]; then
        add_check_result "Disk Space" "high" "PASS" "${disk_space_gb}GB available"
    elif [ "$disk_space_gb" -ge 50 ]; then
        add_check_result "Disk Space" "high" "WARN" "${disk_space_gb}GB (100GB+ recommended)"
    else
        add_check_result "Disk Space" "high" "FAIL" "${disk_space_gb}GB (minimum 50GB required)"
    fi
}

# Check project dependencies
check_project_dependencies() {
    log_info "Checking project dependencies..."
    
    if [ -f "package.json" ]; then
        add_check_result "Package.json" "critical" "PASS" "Found"
        
        # Check if node_modules exists
        if [ -d "node_modules" ]; then
            add_check_result "Dependencies" "critical" "PASS" "node_modules directory exists"
        else
            add_check_result "Dependencies" "critical" "FAIL" "node_modules not found - run npm install"
        fi
        
        # Check for PostgreSQL dependencies
        if grep -q '"pg"' package.json; then
            add_check_result "PostgreSQL Deps" "critical" "PASS" "PostgreSQL client dependency found"
        else
            add_check_result "PostgreSQL Deps" "critical" "FAIL" "PostgreSQL client dependency missing"
        fi
        
    else
        add_check_result "Package.json" "critical" "FAIL" "package.json not found"
    fi
}

# Check configuration files
check_configuration_files() {
    log_info "Checking configuration files..."
    
    # Check environment template
    if [ -f ".env.production.template" ]; then
        add_check_result "Env Template" "medium" "PASS" "Production environment template exists"
    else
        add_check_result "Env Template" "medium" "FAIL" "Production environment template missing"
    fi
    
    # Check TLS configuration
    if [ -f "src/config/tls.ts" ]; then
        add_check_result "TLS Config" "critical" "PASS" "TLS configuration file exists"
    else
        add_check_result "TLS Config" "critical" "FAIL" "TLS configuration file missing"
    fi
    
    # Check database configuration
    if [ -f "src/config/database-postgresql.ts" ]; then
        add_check_result "DB Config" "critical" "PASS" "PostgreSQL database configuration exists"
    else
        add_check_result "DB Config" "critical" "FAIL" "PostgreSQL database configuration missing"
    fi
    
    # Check deployment configurations
    if [ -f "deployment/fabric-network/docker-compose-production.yaml" ]; then
        add_check_result "Fabric Config" "critical" "PASS" "Fabric production configuration exists"
    else
        add_check_result "Fabric Config" "critical" "FAIL" "Fabric production configuration missing"
    fi
    
    if [ -f "deployment/ipfs-cluster/docker-compose-production.yaml" ]; then
        add_check_result "IPFS Config" "critical" "PASS" "IPFS cluster configuration exists"
    else
        add_check_result "IPFS Config" "critical" "FAIL" "IPFS cluster configuration missing"
    fi
    
    if [ -f "monitoring/docker-compose-monitoring-stack.yml" ]; then
        add_check_result "Monitoring Config" "high" "PASS" "Monitoring stack configuration exists"
    else
        add_check_result "Monitoring Config" "high" "FAIL" "Monitoring stack configuration missing"
    fi
}

# Check deployment scripts
check_deployment_scripts() {
    log_info "Checking deployment scripts..."
    
    local scripts=(
        "scripts/deploy-production-system.sh"
        "scripts/migrate-to-postgresql.sh"
        "monitoring/scripts/automated-health-check.sh"
        "deployment/fabric-network/scripts/deploy-fabric-production.sh"
        "deployment/ipfs-cluster/scripts/deploy-ipfs-cluster.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ] && [ -x "$script" ]; then
            add_check_result "Script" "medium" "PASS" "$(basename "$script") exists and is executable"
        elif [ -f "$script" ]; then
            add_check_result "Script" "medium" "WARN" "$(basename "$script") exists but not executable"
        else
            add_check_result "Script" "medium" "FAIL" "$(basename "$script") missing"
        fi
    done
}

# Check security requirements
check_security_requirements() {
    log_info "Checking security requirements..."
    
    # Check for SSL/TLS certificates directory
    if [ -d "/etc/ssl/certs" ]; then
        add_check_result "SSL Directory" "high" "PASS" "SSL certificates directory exists"
    else
        add_check_result "SSL Directory" "high" "WARN" "SSL certificates directory not found"
    fi
    
    # Check for OpenSSL
    if command -v openssl &> /dev/null; then
        local openssl_version=$(openssl version)
        add_check_result "OpenSSL" "critical" "PASS" "$openssl_version"
    else
        add_check_result "OpenSSL" "critical" "FAIL" "OpenSSL not installed"
    fi
    
    # Check firewall status
    if command -v ufw &> /dev/null; then
        local ufw_status=$(ufw status | head -1)
        add_check_result "Firewall" "high" "PASS" "UFW available - $ufw_status"
    elif command -v iptables &> /dev/null; then
        add_check_result "Firewall" "high" "PASS" "iptables available"
    else
        add_check_result "Firewall" "high" "WARN" "No firewall tools detected"
    fi
}

# Check compliance requirements
check_compliance_requirements() {
    log_info "Checking HIPAA compliance requirements..."
    
    # Check audit logging capability
    if [ -d "/var/log" ]; then
        add_check_result "Audit Logs" "critical" "PASS" "Log directory accessible"
    else
        add_check_result "Audit Logs" "critical" "FAIL" "Log directory not accessible"
    fi
    
    # Check backup directory
    if [ -d "./backups" ] || mkdir -p "./backups" 2>/dev/null; then
        add_check_result "Backup Dir" "high" "PASS" "Backup directory available"
    else
        add_check_result "Backup Dir" "high" "FAIL" "Cannot create backup directory"
    fi
    
    # Check encryption tools
    if command -v gpg &> /dev/null; then
        add_check_result "Encryption" "high" "PASS" "GPG available for encryption"
    else
        add_check_result "Encryption" "high" "WARN" "GPG not available"
    fi
}

# Check performance requirements
check_performance_requirements() {
    log_info "Checking performance requirements..."
    
    # Check if performance test files exist
    if [ -f "performance-testing/tests/load-test.js" ]; then
        add_check_result "Perf Tests" "medium" "PASS" "Performance test suite exists"
    else
        add_check_result "Perf Tests" "medium" "FAIL" "Performance test suite missing"
    fi
    
    # Check monitoring tools
    if command -v htop &> /dev/null; then
        add_check_result "Monitoring Tools" "medium" "PASS" "htop available"
    elif command -v top &> /dev/null; then
        add_check_result "Monitoring Tools" "medium" "PASS" "top available"
    else
        add_check_result "Monitoring Tools" "medium" "WARN" "No system monitoring tools"
    fi
}

# Check network connectivity
check_network_connectivity() {
    log_info "Checking network connectivity..."
    
    # Check internet connectivity
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        add_check_result "Internet" "medium" "PASS" "Internet connectivity available"
    else
        add_check_result "Internet" "medium" "WARN" "No internet connectivity"
    fi
    
    # Check localhost connectivity
    if ping -c 1 localhost >/dev/null 2>&1; then
        add_check_result "Localhost" "critical" "PASS" "Localhost connectivity working"
    else
        add_check_result "Localhost" "critical" "FAIL" "Localhost connectivity failed"
    fi
}

# Generate readiness report
generate_readiness_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="./production-readiness-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "EMR Blockchain Production Readiness Report"
        echo "Generated: $timestamp"
        echo "=========================================="
        echo ""
        echo "Summary:"
        echo "  Total Checks: $TOTAL_CHECKS"
        echo "  Passed: $PASSED_CHECKS"
        echo "  Failed: $FAILED_CHECKS"
        echo "  Critical Failures: $CRITICAL_FAILURES"
        echo ""
        
        local success_rate=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
        echo "  Success Rate: ${success_rate}%"
        echo ""
        
        if [ $CRITICAL_FAILURES -eq 0 ]; then
            echo "Status: ✅ READY FOR PRODUCTION"
        elif [ $CRITICAL_FAILURES -le 2 ]; then
            echo "Status: ⚠️  NEEDS MINOR FIXES"
        else
            echo "Status: ❌ NOT READY FOR PRODUCTION"
        fi
        echo ""
        
        echo "Recommendations:"
        if [ $CRITICAL_FAILURES -gt 0 ]; then
            echo "  - Fix all critical failures before production deployment"
        fi
        if [ $FAILED_CHECKS -gt $CRITICAL_FAILURES ]; then
            echo "  - Address non-critical failures for optimal performance"
        fi
        echo "  - Run comprehensive system tests before deployment"
        echo "  - Ensure all security configurations are properly set"
        echo "  - Verify backup and recovery procedures"
        echo ""
        
        echo "Next Steps:"
        echo "  1. Address any critical failures identified above"
        echo "  2. Run database migration: npm run db:migrate:postgresql"
        echo "  3. Deploy system: ./scripts/deploy-production-system.sh"
        echo "  4. Run performance tests: npm run perf:test:1000tps"
        echo "  5. Verify monitoring: npm run monitor:health"
        echo ""
        
    } > "$report_file"
    
    log_info "Production readiness report generated: $report_file"
}

# Display results
display_results() {
    echo ""
    log_info "=== Production Readiness Verification Summary ==="
    echo "Total Checks: $TOTAL_CHECKS"
    echo "✅ Passed: $PASSED_CHECKS"
    echo "❌ Failed: $FAILED_CHECKS"
    echo "🚨 Critical Failures: $CRITICAL_FAILURES"
    echo ""
    
    local success_rate=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    echo "Success Rate: ${success_rate}%"
    echo ""
    
    if [ $CRITICAL_FAILURES -eq 0 ]; then
        log_success "🎉 System is READY for production deployment!"
    elif [ $CRITICAL_FAILURES -le 2 ]; then
        log_warning "⚠️  System needs minor fixes before production deployment"
    else
        log_error "❌ System is NOT READY for production deployment"
    fi
    
    echo ""
}

# Main verification function
main() {
    log_info "=== EMR Blockchain Production Readiness Verification ==="
    echo ""
    
    check_nodejs_environment
    check_postgresql
    check_docker_environment
    check_system_resources
    check_project_dependencies
    check_configuration_files
    check_deployment_scripts
    check_security_requirements
    check_compliance_requirements
    check_performance_requirements
    check_network_connectivity
    
    display_results
    generate_readiness_report
    
    # Exit with error code if critical issues found
    if [ $CRITICAL_FAILURES -gt 0 ]; then
        exit 1
    fi
}

# Handle script arguments
case "$1" in
    "--help"|"-h")
        echo "Usage: $0"
        echo ""
        echo "EMR Blockchain Production Readiness Verification"
        echo "Checks all system components for production deployment readiness"
        echo ""
        echo "This script verifies:"
        echo "  - System requirements and dependencies"
        echo "  - Configuration files and deployment scripts"
        echo "  - Security and compliance requirements"
        echo "  - Performance testing capabilities"
        echo "  - Network connectivity"
        echo ""
        ;;
    *)
        main
        ;;
esac
