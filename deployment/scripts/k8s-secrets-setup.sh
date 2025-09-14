#!/bin/bash

# Kubernetes Secrets Setup for EMR Blockchain Application
# This script securely creates and manages Kubernetes secrets for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="emr-blockchain-prod"
SECRET_NAME="emr-secrets"
SCRIPT_DIR="$(dirname "$0")"
SECRETS_DIR="$SCRIPT_DIR/../secrets"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is required but not installed. Please install kubectl."
        exit 1
    fi
    
    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Check if openssl is available
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is required but not installed. Please install OpenSSL."
        exit 1
    fi
    
    # Check if base64 is available
    if ! command -v base64 &> /dev/null; then
        print_error "base64 is required but not installed."
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    print_status "Creating namespace if it doesn't exist..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_info "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        print_status "Created namespace: $NAMESPACE"
    fi
    
    # Add labels to namespace
    kubectl label namespace "$NAMESPACE" \
        name="$NAMESPACE" \
        environment="production" \
        app="emr-blockchain" \
        --overwrite
}

# Function to generate secure secret
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to base64 encode
base64_encode() {
    echo -n "$1" | base64 -w 0
}

# Function to create secrets from files or generate new ones
create_secrets() {
    print_status "Creating Kubernetes secrets..."
    
    # Check if secrets directory exists
    if [ -d "$SECRETS_DIR" ]; then
        print_info "Using existing secrets from $SECRETS_DIR"
        create_secrets_from_files
    else
        print_warning "Secrets directory not found. Generating new secrets..."
        create_secrets_generated
    fi
}

# Function to create secrets from existing files
create_secrets_from_files() {
    print_status "Creating secrets from files..."
    
    # Check if all required secret files exist
    local required_files=(
        "mysql_root_password.txt"
        "mysql_password.txt"
        "jwt_secret.txt"
        "jwt_refresh_secret.txt"
        "encryption_key.txt"
        "session_secret.txt"
        "redis_password.txt"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$SECRETS_DIR/$file" ]; then
            print_error "Required secret file not found: $SECRETS_DIR/$file"
            print_info "Please run the generate-secrets.sh script first or create the file manually"
            exit 1
        fi
    done
    
    # Create the secret using kubectl
    kubectl create secret generic "$SECRET_NAME" \
        --namespace="$NAMESPACE" \
        --from-file=mysql-root-password="$SECRETS_DIR/mysql_root_password.txt" \
        --from-file=mysql-user-password="$SECRETS_DIR/mysql_password.txt" \
        --from-file=jwt-secret="$SECRETS_DIR/jwt_secret.txt" \
        --from-file=jwt-refresh-secret="$SECRETS_DIR/jwt_refresh_secret.txt" \
        --from-file=encryption-key="$SECRETS_DIR/encryption_key.txt" \
        --from-file=session-secret="$SECRETS_DIR/session_secret.txt" \
        --from-file=redis-password="$SECRETS_DIR/redis_password.txt" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_status "Secrets created from files successfully"
}

# Function to create secrets with generated values
create_secrets_generated() {
    print_status "Generating new secrets..."
    
    # Generate secrets
    local mysql_root_password=$(generate_secret 24)
    local mysql_password=$(generate_secret 20)
    local jwt_secret=$(generate_secret 64)
    local jwt_refresh_secret=$(generate_secret 64)
    local encryption_key=$(generate_secret 44)
    local session_secret=$(generate_secret 44)
    local redis_password=$(generate_secret 16)
    local api_key_secret=$(generate_secret 32)
    
    # Create the secret
    kubectl create secret generic "$SECRET_NAME" \
        --namespace="$NAMESPACE" \
        --from-literal=mysql-root-password="$mysql_root_password" \
        --from-literal=mysql-user-password="$mysql_password" \
        --from-literal=jwt-secret="$jwt_secret" \
        --from-literal=jwt-refresh-secret="$jwt_refresh_secret" \
        --from-literal=encryption-key="$encryption_key" \
        --from-literal=session-secret="$session_secret" \
        --from-literal=redis-password="$redis_password" \
        --from-literal=api-key-secret="$api_key_secret" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_status "Generated secrets created successfully"
    
    # Save generated secrets to files for backup
    print_info "Saving generated secrets to backup files..."
    mkdir -p "$SECRETS_DIR"
    echo -n "$mysql_root_password" > "$SECRETS_DIR/mysql_root_password.txt"
    echo -n "$mysql_password" > "$SECRETS_DIR/mysql_password.txt"
    echo -n "$jwt_secret" > "$SECRETS_DIR/jwt_secret.txt"
    echo -n "$jwt_refresh_secret" > "$SECRETS_DIR/jwt_refresh_secret.txt"
    echo -n "$encryption_key" > "$SECRETS_DIR/encryption_key.txt"
    echo -n "$session_secret" > "$SECRETS_DIR/session_secret.txt"
    echo -n "$redis_password" > "$SECRETS_DIR/redis_password.txt"
    echo -n "$api_key_secret" > "$SECRETS_DIR/api_key_secret.txt"
    
    chmod 600 "$SECRETS_DIR"/*.txt
    print_warning "Backup files created in $SECRETS_DIR - keep these secure!"
}

# Function to add labels and annotations to secret
label_secret() {
    print_status "Adding labels and annotations to secret..."
    
    kubectl label secret "$SECRET_NAME" \
        --namespace="$NAMESPACE" \
        app="emr-blockchain" \
        component="secrets" \
        environment="production" \
        managed-by="k8s-secrets-setup" \
        --overwrite
    
    kubectl annotate secret "$SECRET_NAME" \
        --namespace="$NAMESPACE" \
        kubernetes.io/description="EMR Blockchain application secrets" \
        created-by="k8s-secrets-setup.sh" \
        created-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --overwrite
}

# Function to verify secret creation
verify_secret() {
    print_status "Verifying secret creation..."
    
    if kubectl get secret "$SECRET_NAME" --namespace="$NAMESPACE" &> /dev/null; then
        print_status "Secret $SECRET_NAME exists in namespace $NAMESPACE"
        
        # Show secret details (without values)
        kubectl describe secret "$SECRET_NAME" --namespace="$NAMESPACE"
        
        # Verify all expected keys exist
        local keys=$(kubectl get secret "$SECRET_NAME" --namespace="$NAMESPACE" -o jsonpath='{.data}' | jq -r 'keys[]' 2>/dev/null || echo "")
        if [ -n "$keys" ]; then
            print_info "Secret contains the following keys:"
            echo "$keys" | while read -r key; do
                echo "  - $key"
            done
        fi
    else
        print_error "Secret $SECRET_NAME was not created successfully"
        exit 1
    fi
}

# Function to create RBAC for secret access
create_rbac() {
    print_status "Creating RBAC for secret access..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: emr-app
  namespace: $NAMESPACE
  labels:
    app: emr-blockchain
    component: serviceaccount
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: emr-secret-reader
  namespace: $NAMESPACE
  labels:
    app: emr-blockchain
    component: rbac
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["$SECRET_NAME"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: emr-secret-reader-binding
  namespace: $NAMESPACE
  labels:
    app: emr-blockchain
    component: rbac
subjects:
- kind: ServiceAccount
  name: emr-app
  namespace: $NAMESPACE
roleRef:
  kind: Role
  name: emr-secret-reader
  apiGroup: rbac.authorization.k8s.io
EOF
    
    print_status "RBAC created successfully"
}

# Function to show usage instructions
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -n, --namespace NAMESPACE  Set the Kubernetes namespace (default: $NAMESPACE)"
    echo "  -s, --secret-name NAME     Set the secret name (default: $SECRET_NAME)"
    echo "  --force        Force recreation of existing secrets"
    echo "  --verify-only  Only verify existing secrets"
    echo ""
    echo "Examples:"
    echo "  $0                         # Create secrets with default settings"
    echo "  $0 -n my-namespace         # Create secrets in custom namespace"
    echo "  $0 --force                 # Force recreate existing secrets"
    echo "  $0 --verify-only           # Only verify existing secrets"
}

# Function to handle force recreation
force_recreate() {
    print_warning "Force recreation requested"
    
    if kubectl get secret "$SECRET_NAME" --namespace="$NAMESPACE" &> /dev/null; then
        print_info "Deleting existing secret..."
        kubectl delete secret "$SECRET_NAME" --namespace="$NAMESPACE"
    fi
    
    create_secrets
    label_secret
    verify_secret
}

# Main function
main() {
    local force=false
    local verify_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -s|--secret-name)
                SECRET_NAME="$2"
                shift 2
                ;;
            --force)
                force=true
                shift
                ;;
            --verify-only)
                verify_only=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    echo "EMR Blockchain Kubernetes Secrets Setup"
    echo "======================================="
    echo "Namespace: $NAMESPACE"
    echo "Secret Name: $SECRET_NAME"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    if [ "$verify_only" = true ]; then
        verify_secret
        exit 0
    fi
    
    # Create namespace
    create_namespace
    
    # Handle force recreation
    if [ "$force" = true ]; then
        force_recreate
    else
        # Check if secret already exists
        if kubectl get secret "$SECRET_NAME" --namespace="$NAMESPACE" &> /dev/null; then
            print_warning "Secret $SECRET_NAME already exists in namespace $NAMESPACE"
            print_info "Use --force to recreate or --verify-only to verify"
            exit 1
        fi
        
        # Create secrets
        create_secrets
        label_secret
    fi
    
    # Create RBAC
    create_rbac
    
    # Verify creation
    verify_secret
    
    echo ""
    print_status "Kubernetes secrets setup completed successfully!"
    echo ""
    print_info "Next steps:"
    echo "1. Update your deployment manifests to use the created secrets"
    echo "2. Ensure your applications use the serviceAccount 'emr-app'"
    echo "3. Test the deployment in a staging environment first"
    echo "4. Monitor secret access and rotation schedules"
    echo ""
    print_warning "Security reminders:"
    echo "- Regularly rotate secrets"
    echo "- Monitor secret access logs"
    echo "- Use external secret management systems for production"
    echo "- Never commit secrets to version control"
}

# Run main function
main "$@"
