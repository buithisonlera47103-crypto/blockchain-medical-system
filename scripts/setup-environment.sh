#!/bin/bash

# Environment Setup Script for Blockchain EMR System
# This script sets up the complete development and production environment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-development}

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
    echo "Usage: $0 [environment]"
    echo "Environments:"
    echo "  development  - Set up development environment (default)"
    echo "  staging      - Set up staging environment"
    echo "  production   - Set up production environment"
    echo "  test         - Set up test environment"
    echo ""
    echo "Options:"
    echo "  --clean      - Clean existing environment before setup"
    echo "  --no-docker  - Skip Docker setup"
    echo "  --no-fabric  - Skip Hyperledger Fabric setup"
    echo "  --no-ipfs    - Skip IPFS setup"
    echo "  --help       - Show this help message"
}

# Parse command line arguments
CLEAN_ENV=false
SKIP_DOCKER=false
SKIP_FABRIC=false
SKIP_IPFS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_ENV=true
            shift
            ;;
        --no-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --no-fabric)
            SKIP_FABRIC=true
            shift
            ;;
        --no-ipfs)
            SKIP_IPFS=true
            shift
            ;;
        --help)
            print_help
            exit 0
            ;;
        development|staging|production|test)
            ENVIRONMENT=$1
            shift
            ;;
        *)
            error "Unknown option: $1"
            print_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production|test)$ ]]; then
    error "Invalid environment: $ENVIRONMENT"
    print_help
    exit 1
fi

log "Setting up Blockchain EMR environment: $ENVIRONMENT"

# Check prerequisites
function check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        warning "jq is not installed. Some features may be limited."
    fi
    
    # Check openssl
    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        error "Please install the missing tools and try again."
        exit 1
    fi
    
    success "All prerequisites are installed"
}

# Generate environment configuration
function generate_env_config() {
    log "Generating environment configuration for $ENVIRONMENT..."
    
    cd "$PROJECT_ROOT"
    
    # Copy environment-specific configuration
    if [ -f ".env.$ENVIRONMENT" ]; then
        cp ".env.$ENVIRONMENT" ".env"
        success "Environment configuration copied from .env.$ENVIRONMENT"
    else
        warning "Environment-specific config not found, using template"
        cp ".env.template" ".env"
    fi
    
    # Generate secure secrets for production
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Generating secure secrets for production..."
        
        # Generate JWT secret
        JWT_SECRET=$(openssl rand -hex 32)
        sed -i "s/\${JWT_SECRET}/$JWT_SECRET/g" .env
        
        # Generate encryption keys
        ENCRYPTION_KEY=$(openssl rand -hex 16)
        MASTER_ENCRYPTION_KEY=$(openssl rand -hex 32)
        sed -i "s/\${ENCRYPTION_KEY}/$ENCRYPTION_KEY/g" .env
        sed -i "s/\${MASTER_ENCRYPTION_KEY}/$MASTER_ENCRYPTION_KEY/g" .env
        
        # Generate session secret
        SESSION_SECRET=$(openssl rand -hex 32)
        sed -i "s/\${SESSION_SECRET}/$SESSION_SECRET/g" .env
        
        # Generate IPFS cluster secret
        IPFS_CLUSTER_SECRET=$(openssl rand -hex 32)
        sed -i "s/\${IPFS_CLUSTER_SECRET}/$IPFS_CLUSTER_SECRET/g" .env
        
        success "Secure secrets generated for production"
    fi
}

# Setup directories
function setup_directories() {
    log "Setting up directory structure..."
    
    cd "$PROJECT_ROOT"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p temp/uploads
    mkdir -p backup
    mkdir -p fabric/organizations
    mkdir -p fabric/channel-artifacts
    mkdir -p fabric/system-genesis-block
    mkdir -p ipfs/config
    mkdir -p database/backups
    mkdir -p monitoring/prometheus
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    mkdir -p nginx/ssl
    mkdir -p nginx/logs
    mkdir -p redis
    mkdir -p security/reports
    
    # Set appropriate permissions
    chmod 755 logs temp backup
    chmod 700 fabric/organizations
    chmod 755 ipfs/config
    
    success "Directory structure created"
}

# Clean existing environment
function clean_environment() {
    if [ "$CLEAN_ENV" = true ]; then
        log "Cleaning existing environment..."
        
        cd "$PROJECT_ROOT"
        
        # Stop and remove containers
        if [ "$SKIP_DOCKER" = false ]; then
            docker-compose down --volumes --remove-orphans 2>/dev/null || true
            docker system prune -f 2>/dev/null || true
        fi
        
        # Remove generated files
        rm -rf fabric/organizations
        rm -rf fabric/channel-artifacts
        rm -rf fabric/system-genesis-block
        rm -rf logs/*
        rm -rf temp/*
        rm -rf backup/*
        
        success "Environment cleaned"
    fi
}

# Setup Docker environment
function setup_docker() {
    if [ "$SKIP_DOCKER" = false ]; then
        log "Setting up Docker environment..."
        
        cd "$PROJECT_ROOT"
        
        # Pull required Docker images
        log "Pulling Docker images..."
        docker-compose pull
        
        # Build custom images
        log "Building custom images..."
        docker-compose build
        
        success "Docker environment setup completed"
    else
        log "Skipping Docker setup"
    fi
}

# Setup Hyperledger Fabric
function setup_fabric() {
    if [ "$SKIP_FABRIC" = false ]; then
        log "Setting up Hyperledger Fabric network..."
        
        cd "$PROJECT_ROOT"
        
        # Make fabric script executable
        chmod +x fabric/network.sh
        
        # Generate crypto material and start network
        ./fabric/network.sh up
        
        # Create channel
        ./fabric/network.sh channel
        
        success "Hyperledger Fabric network setup completed"
    else
        log "Skipping Hyperledger Fabric setup"
    fi
}

# Setup IPFS cluster
function setup_ipfs() {
    if [ "$SKIP_IPFS" = false ]; then
        log "Setting up IPFS cluster..."
        
        cd "$PROJECT_ROOT"
        
        # Make IPFS script executable
        chmod +x ipfs/cluster-setup.sh
        
        # Setup IPFS cluster
        ./ipfs/cluster-setup.sh
        
        success "IPFS cluster setup completed"
    else
        log "Skipping IPFS setup"
    fi
}

# Setup database
function setup_database() {
    log "Setting up database..."
    
    cd "$PROJECT_ROOT"
    
    # Start database container
    docker-compose up -d mysql redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 30
    
    # Run database migrations if in development
    if [ "$ENVIRONMENT" = "development" ]; then
        log "Running database migrations..."
        cd backend-app
        npm run migrate 2>/dev/null || warning "Migration failed or not configured"
        cd ..
    fi
    
    success "Database setup completed"
}

# Install dependencies
function install_dependencies() {
    log "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install backend dependencies
    if [ -d "backend-app" ]; then
        log "Installing backend dependencies..."
        cd backend-app
        npm install
        cd ..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend-app" ]; then
        log "Installing frontend dependencies..."
        cd frontend-app
        npm install
        cd ..
    fi
    
    success "Dependencies installed"
}

# Start services
function start_services() {
    log "Starting services for $ENVIRONMENT environment..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 60
    
    # Check service health
    check_service_health
    
    success "Services started successfully"
}

# Check service health
function check_service_health() {
    log "Checking service health..."
    
    local services=("mysql" "redis" "backend")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            success "$service is running"
        else
            error "$service is not running"
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -ne 0 ]; then
        error "Failed services: ${failed_services[*]}"
        error "Check logs with: docker-compose logs [service_name]"
        return 1
    fi
    
    # Test API endpoint
    if curl -f http://localhost:3000/api/v1/monitoring/health &>/dev/null; then
        success "API health check passed"
    else
        warning "API health check failed"
    fi
}

# Generate setup report
function generate_setup_report() {
    log "Generating setup report..."
    
    cd "$PROJECT_ROOT"
    
    cat > setup-report.md << EOF
# Blockchain EMR Environment Setup Report

## Environment: $ENVIRONMENT
## Setup Date: $(date)

## Services Status
$(docker-compose ps)

## Environment Configuration
- Node.js Version: $(node --version 2>/dev/null || echo "Not installed")
- npm Version: $(npm --version 2>/dev/null || echo "Not installed")
- Docker Version: $(docker --version 2>/dev/null || echo "Not installed")
- Docker Compose Version: $(docker-compose --version 2>/dev/null || echo "Not installed")

## Network Information
- API Endpoint: http://localhost:3000
- Frontend URL: http://localhost:3001
- Grafana Dashboard: http://localhost:3002
- Prometheus Metrics: http://localhost:9090

## Next Steps
1. Verify all services are running: \`docker-compose ps\`
2. Check application logs: \`docker-compose logs backend\`
3. Access the application at: http://localhost:3001
4. Run tests: \`npm test\`
5. Run security tests: \`./scripts/security-test.sh\`

## Troubleshooting
- View logs: \`docker-compose logs [service_name]\`
- Restart services: \`docker-compose restart [service_name]\`
- Clean restart: \`docker-compose down && docker-compose up -d\`

EOF

    success "Setup report generated: setup-report.md"
}

# Main execution
function main() {
    log "Starting Blockchain EMR environment setup..."
    
    check_prerequisites
    clean_environment
    setup_directories
    generate_env_config
    install_dependencies
    
    if [ "$SKIP_DOCKER" = false ]; then
        setup_docker
        setup_database
    fi
    
    setup_fabric
    setup_ipfs
    
    if [ "$SKIP_DOCKER" = false ]; then
        start_services
    fi
    
    generate_setup_report
    
    success "Environment setup completed successfully!"
    log "Check setup-report.md for details and next steps."
}

# Run main function
main "$@"
