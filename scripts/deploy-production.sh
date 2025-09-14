#!/bin/bash

# Production Deployment Script for Blockchain EMR System
# Comprehensive deployment with health checks, rollback capability, and monitoring

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_CONFIG="${DEPLOYMENT_CONFIG:-$PROJECT_ROOT/config/deployment.json}"
NAMESPACE="${NAMESPACE:-blockchain-emr}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Default values
DOCKER_REGISTRY="${DOCKER_REGISTRY:-registry.blockchain-emr.com}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
KUBECTL_TIMEOUT="${KUBECTL_TIMEOUT:-600s}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

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
    echo "  deploy      - Deploy to production"
    echo "  rollback    - Rollback to previous version"
    echo "  status      - Check deployment status"
    echo "  logs        - View application logs"
    echo "  scale       - Scale application components"
    echo "  health      - Run health checks"
    echo "  backup      - Create pre-deployment backup"
    echo ""
    echo "Options:"
    echo "  --tag TAG           - Docker image tag (default: latest)"
    echo "  --namespace NS      - Kubernetes namespace (default: blockchain-emr)"
    echo "  --environment ENV   - Environment (default: production)"
    echo "  --registry URL      - Docker registry URL"
    echo "  --dry-run           - Show what would be deployed"
    echo "  --skip-tests        - Skip pre-deployment tests"
    echo "  --skip-backup       - Skip pre-deployment backup"
    echo "  --force             - Force deployment without confirmations"
    echo "  --help              - Show this help message"
}

# Check prerequisites
function check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        warning "Namespace $NAMESPACE does not exist, creating..."
        kubectl create namespace "$NAMESPACE"
    fi
    
    success "Prerequisites check passed"
}

# Load deployment configuration
function load_deployment_config() {
    if [ -f "$DEPLOYMENT_CONFIG" ]; then
        log "Loading deployment configuration from $DEPLOYMENT_CONFIG"
        
        # Extract configuration values
        if command -v jq &> /dev/null; then
            DOCKER_REGISTRY=$(jq -r '.docker_registry // "registry.blockchain-emr.com"' "$DEPLOYMENT_CONFIG")
            REPLICAS=$(jq -r '.replicas // {}' "$DEPLOYMENT_CONFIG")
            RESOURCES=$(jq -r '.resources // {}' "$DEPLOYMENT_CONFIG")
        fi
    else
        warning "Deployment configuration not found, using defaults"
        create_default_deployment_config
    fi
}

# Create default deployment configuration
function create_default_deployment_config() {
    log "Creating default deployment configuration..."
    
    mkdir -p "$(dirname "$DEPLOYMENT_CONFIG")"
    
    cat > "$DEPLOYMENT_CONFIG" << EOF
{
  "docker_registry": "$DOCKER_REGISTRY",
  "environment": "$ENVIRONMENT",
  "replicas": {
    "backend": 3,
    "frontend": 2,
    "mysql": 1,
    "redis": 1
  },
  "resources": {
    "backend": {
      "requests": {"cpu": "250m", "memory": "512Mi"},
      "limits": {"cpu": "1", "memory": "2Gi"}
    },
    "frontend": {
      "requests": {"cpu": "100m", "memory": "256Mi"},
      "limits": {"cpu": "500m", "memory": "1Gi"}
    }
  },
  "health_checks": {
    "timeout": 300,
    "retries": 3,
    "endpoints": [
      "/api/v1/monitoring/health",
      "/api/v1/monitoring/ready"
    ]
  },
  "deployment": {
    "strategy": "RollingUpdate",
    "max_surge": 1,
    "max_unavailable": 0
  }
}
EOF
    
    success "Default deployment configuration created"
}

# Pre-deployment backup
function create_pre_deployment_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        log "Skipping pre-deployment backup"
        return 0
    fi
    
    log "Creating pre-deployment backup..."
    
    if [ -x "$PROJECT_ROOT/scripts/backup-system.sh" ]; then
        "$PROJECT_ROOT/scripts/backup-system.sh" full --compress --s3-upload || {
            error "Pre-deployment backup failed"
            return 1
        }
        success "Pre-deployment backup completed"
    else
        warning "Backup system not available"
    fi
}

# Run pre-deployment tests
function run_pre_deployment_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log "Skipping pre-deployment tests"
        return 0
    fi
    
    log "Running pre-deployment tests..."
    
    # Run unit tests
    if [ -f "$PROJECT_ROOT/backend-app/package.json" ]; then
        cd "$PROJECT_ROOT/backend-app"
        npm test || {
            error "Unit tests failed"
            return 1
        }
        cd "$PROJECT_ROOT"
    fi
    
    # Run security tests
    if [ -x "$PROJECT_ROOT/backend-app/scripts/security-test.sh" ]; then
        "$PROJECT_ROOT/backend-app/scripts/security-test.sh" || {
            error "Security tests failed"
            return 1
        }
    fi
    
    success "Pre-deployment tests passed"
}

# Build and push Docker images
function build_and_push_images() {
    log "Building and pushing Docker images..."
    
    # Build backend image
    log "Building backend image..."
    docker build -t "$DOCKER_REGISTRY/blockchain-emr-backend:$IMAGE_TAG" "$PROJECT_ROOT/backend-app" || {
        error "Failed to build backend image"
        return 1
    }
    
    # Build frontend image
    log "Building frontend image..."
    docker build -t "$DOCKER_REGISTRY/blockchain-emr-frontend:$IMAGE_TAG" "$PROJECT_ROOT/frontend-app" || {
        error "Failed to build frontend image"
        return 1
    }
    
    # Push images
    if [ "$DRY_RUN" != true ]; then
        log "Pushing images to registry..."
        docker push "$DOCKER_REGISTRY/blockchain-emr-backend:$IMAGE_TAG" || {
            error "Failed to push backend image"
            return 1
        }
        
        docker push "$DOCKER_REGISTRY/blockchain-emr-frontend:$IMAGE_TAG" || {
            error "Failed to push frontend image"
            return 1
        }
    fi
    
    success "Docker images built and pushed"
}

# Deploy Kubernetes manifests
function deploy_kubernetes_manifests() {
    log "Deploying Kubernetes manifests..."
    
    # Update image tags in manifests
    update_image_tags_in_manifests
    
    # Apply manifests in order
    local manifests=(
        "namespace.yaml"
        "configmap.yaml"
        "secrets.yaml"
        "mysql.yaml"
        "redis.yaml"
        "ipfs.yaml"
        "fabric.yaml"
        "backend.yaml"
        "frontend.yaml"
        "nginx.yaml"
        "monitoring.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        local manifest_path="$PROJECT_ROOT/k8s/$manifest"
        
        if [ -f "$manifest_path" ]; then
            log "Applying $manifest..."
            
            if [ "$DRY_RUN" = true ]; then
                kubectl apply -f "$manifest_path" --dry-run=client -o yaml
            else
                kubectl apply -f "$manifest_path" --timeout="$KUBECTL_TIMEOUT" || {
                    error "Failed to apply $manifest"
                    return 1
                }
            fi
        else
            warning "Manifest not found: $manifest_path"
        fi
    done
    
    success "Kubernetes manifests deployed"
}

# Update image tags in manifests
function update_image_tags_in_manifests() {
    log "Updating image tags in manifests..."
    
    # Update backend deployment
    if [ -f "$PROJECT_ROOT/k8s/backend.yaml" ]; then
        sed -i.bak "s|image: blockchain-emr/backend:.*|image: $DOCKER_REGISTRY/blockchain-emr-backend:$IMAGE_TAG|g" "$PROJECT_ROOT/k8s/backend.yaml"
    fi
    
    # Update frontend deployment
    if [ -f "$PROJECT_ROOT/k8s/frontend.yaml" ]; then
        sed -i.bak "s|image: blockchain-emr/frontend:.*|image: $DOCKER_REGISTRY/blockchain-emr-frontend:$IMAGE_TAG|g" "$PROJECT_ROOT/k8s/frontend.yaml"
    fi
}

# Wait for deployment to be ready
function wait_for_deployment() {
    log "Waiting for deployment to be ready..."
    
    local deployments=("backend" "frontend")
    
    for deployment in "${deployments[@]}"; do
        log "Waiting for $deployment deployment..."
        
        if ! kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout="$KUBECTL_TIMEOUT"; then
            error "Deployment $deployment failed to become ready"
            return 1
        fi
    done
    
    success "All deployments are ready"
}

# Run health checks
function run_health_checks() {
    log "Running post-deployment health checks..."
    
    # Get service endpoint
    local service_ip=$(kubectl get service nginx-service -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "localhost")
    local service_port=$(kubectl get service nginx-service -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "80")
    
    local endpoint="http://$service_ip:$service_port"
    
    # Wait for service to be available
    local retries=0
    local max_retries=30
    
    while [ $retries -lt $max_retries ]; do
        if curl -s -f "$endpoint/health" > /dev/null 2>&1; then
            break
        fi
        
        log "Waiting for service to be available... (attempt $((retries + 1))/$max_retries)"
        sleep 10
        ((retries++))
    done
    
    if [ $retries -eq $max_retries ]; then
        error "Service did not become available within timeout"
        return 1
    fi
    
    # Run comprehensive health checks
    local health_endpoints=(
        "/health"
        "/api/v1/monitoring/health"
        "/api/v1/monitoring/ready"
    )
    
    for endpoint_path in "${health_endpoints[@]}"; do
        log "Checking $endpoint_path..."
        
        if curl -s -f "$endpoint$endpoint_path" > /dev/null 2>&1; then
            success "✅ $endpoint_path is healthy"
        else
            error "❌ $endpoint_path is unhealthy"
            return 1
        fi
    done
    
    success "All health checks passed"
}

# Rollback deployment
function rollback_deployment() {
    log "Rolling back deployment..."
    
    local deployments=("backend" "frontend")
    
    for deployment in "${deployments[@]}"; do
        log "Rolling back $deployment..."
        
        kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE" || {
            error "Failed to rollback $deployment"
        }
        
        kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout="$KUBECTL_TIMEOUT" || {
            error "Rollback of $deployment failed to complete"
        }
    done
    
    success "Rollback completed"
}

# Check deployment status
function check_deployment_status() {
    log "Checking deployment status..."
    
    echo "Namespace: $NAMESPACE"
    echo "Environment: $ENVIRONMENT"
    echo ""
    
    echo "Deployments:"
    kubectl get deployments -n "$NAMESPACE" -o wide
    echo ""
    
    echo "Pods:"
    kubectl get pods -n "$NAMESPACE" -o wide
    echo ""
    
    echo "Services:"
    kubectl get services -n "$NAMESPACE" -o wide
    echo ""
    
    echo "Ingress:"
    kubectl get ingress -n "$NAMESPACE" -o wide 2>/dev/null || echo "No ingress resources found"
}

# Scale deployment
function scale_deployment() {
    local component="$1"
    local replicas="$2"
    
    if [ -z "$component" ] || [ -z "$replicas" ]; then
        error "Usage: scale <component> <replicas>"
        return 1
    fi
    
    log "Scaling $component to $replicas replicas..."
    
    kubectl scale deployment "$component" --replicas="$replicas" -n "$NAMESPACE" || {
        error "Failed to scale $component"
        return 1
    }
    
    kubectl rollout status deployment/"$component" -n "$NAMESPACE" --timeout="$KUBECTL_TIMEOUT" || {
        error "Scaling of $component failed to complete"
        return 1
    }
    
    success "$component scaled to $replicas replicas"
}

# View application logs
function view_logs() {
    local component="${1:-backend}"
    local lines="${2:-100}"
    
    log "Viewing logs for $component (last $lines lines)..."
    
    kubectl logs -l app="$component" -n "$NAMESPACE" --tail="$lines" --follow
}

# Main deployment function
function deploy_to_production() {
    log "Starting production deployment..."
    log "Environment: $ENVIRONMENT"
    log "Namespace: $NAMESPACE"
    log "Image Tag: $IMAGE_TAG"
    
    # Confirmation prompt
    if [ "$FORCE_DEPLOYMENT" != true ] && [ "$DRY_RUN" != true ]; then
        echo ""
        echo "⚠️  You are about to deploy to PRODUCTION environment"
        echo "   Namespace: $NAMESPACE"
        echo "   Image Tag: $IMAGE_TAG"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Pre-deployment steps
    create_pre_deployment_backup
    run_pre_deployment_tests
    build_and_push_images
    
    # Deployment
    deploy_kubernetes_manifests
    wait_for_deployment
    
    # Post-deployment verification
    if run_health_checks; then
        success "🎉 Production deployment completed successfully!"
        
        # Start monitoring
        if [ -x "$PROJECT_ROOT/scripts/disaster-recovery.sh" ]; then
            log "Starting DR monitoring..."
            nohup "$PROJECT_ROOT/scripts/disaster-recovery.sh" monitor > /dev/null 2>&1 &
        fi
        
    else
        error "Health checks failed after deployment"
        
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            warning "Initiating automatic rollback..."
            rollback_deployment
        fi
        
        exit 1
    fi
}

# Parse command line arguments
function parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --registry)
                DOCKER_REGISTRY="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --force)
                FORCE_DEPLOYMENT=true
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
    local command="${1:-deploy}"
    shift || true
    
    parse_args "$@"
    
    check_prerequisites
    load_deployment_config
    
    case "$command" in
        "deploy")
            deploy_to_production
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            check_deployment_status
            ;;
        "logs")
            view_logs "$@"
            ;;
        "scale")
            scale_deployment "$@"
            ;;
        "health")
            run_health_checks
            ;;
        "backup")
            create_pre_deployment_backup
            ;;
        *)
            print_help
            ;;
    esac
}

# Run main function
main "$@"
