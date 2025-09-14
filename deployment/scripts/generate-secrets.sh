#!/bin/bash

# Generate Secure Secrets for EMR Blockchain Application
# This script generates cryptographically secure secrets for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SECRETS_DIR="$(dirname "$0")/../secrets"
BACKUP_DIR="$(dirname "$0")/../secrets-backup"

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

# Function to generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to generate secure password
generate_password() {
    local length=${1:-16}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to backup existing secrets
backup_existing_secrets() {
    if [ -d "$SECRETS_DIR" ]; then
        print_warning "Existing secrets directory found. Creating backup..."
        mkdir -p "$BACKUP_DIR"
        cp -r "$SECRETS_DIR" "$BACKUP_DIR/secrets-$(date +%Y%m%d-%H%M%S)"
        print_status "Backup created in $BACKUP_DIR"
    fi
}

# Function to create secrets directory
create_secrets_directory() {
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    print_status "Created secrets directory: $SECRETS_DIR"
}

# Function to generate and save secret
save_secret() {
    local name=$1
    local value=$2
    local file="$SECRETS_DIR/${name}.txt"
    
    echo -n "$value" > "$file"
    chmod 600 "$file"
    print_status "Generated secret: $name"
}

# Function to validate environment
validate_environment() {
    # Check if openssl is available
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is required but not installed. Please install OpenSSL."
        exit 1
    fi
    
    # Check if running as root (not recommended)
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root is not recommended for security reasons."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to generate all secrets
generate_all_secrets() {
    print_status "Generating secure secrets..."
    
    # Database passwords
    save_secret "mysql_root_password" "$(generate_password 24)"
    save_secret "mysql_password" "$(generate_password 20)"
    save_secret "redis_password" "$(generate_password 16)"
    
    # JWT secrets (longer for better security)
    save_secret "jwt_secret" "$(generate_secret 64)"
    save_secret "jwt_refresh_secret" "$(generate_secret 64)"
    
    # Encryption keys (256-bit = 32 bytes = 44 base64 chars)
    save_secret "encryption_key" "$(generate_secret 44)"
    save_secret "session_secret" "$(generate_secret 44)"
    
    # Additional security secrets
    save_secret "api_key_secret" "$(generate_secret 32)"
    save_secret "webhook_secret" "$(generate_secret 32)"
    
    print_status "All secrets generated successfully!"
}

# Function to display usage instructions
show_usage_instructions() {
    echo
    print_status "Secrets have been generated in: $SECRETS_DIR"
    echo
    echo "Next steps:"
    echo "1. Review the generated secrets (they are in individual .txt files)"
    echo "2. For production deployment:"
    echo "   - Copy secrets to your production server securely"
    echo "   - Ensure proper file permissions (600 for files, 700 for directory)"
    echo "   - Consider using a proper secrets management system (HashiCorp Vault, AWS Secrets Manager, etc.)"
    echo
    echo "3. For Kubernetes deployment:"
    echo "   - Run: kubectl create secret generic emr-secrets \\"
    echo "     --from-file=$SECRETS_DIR/mysql_password.txt \\"
    echo "     --from-file=$SECRETS_DIR/jwt_secret.txt \\"
    echo "     --from-file=$SECRETS_DIR/encryption_key.txt"
    echo
    echo "4. Update your environment variables to use these secrets"
    echo
    print_warning "IMPORTANT: Keep these secrets secure and never commit them to version control!"
}

# Function to create .gitignore for secrets
create_gitignore() {
    local gitignore_file="$SECRETS_DIR/.gitignore"
    cat > "$gitignore_file" << EOF
# Ignore all secret files
*.txt
*.key
*.pem
*.p12
*.jks

# But allow this .gitignore file
!.gitignore
EOF
    print_status "Created .gitignore to prevent accidental commits"
}

# Function to create README for secrets directory
create_secrets_readme() {
    local readme_file="$SECRETS_DIR/README.md"
    cat > "$readme_file" << EOF
# EMR Blockchain Secrets Directory

This directory contains sensitive cryptographic secrets for the EMR blockchain application.

## Security Guidelines

1. **Never commit these files to version control**
2. **Restrict access to this directory** (chmod 700)
3. **Restrict access to secret files** (chmod 600)
4. **Use proper secrets management in production**
5. **Rotate secrets regularly**
6. **Monitor access to these files**

## Files Description

- \`mysql_root_password.txt\` - MySQL root password
- \`mysql_password.txt\` - MySQL application user password
- \`redis_password.txt\` - Redis authentication password
- \`jwt_secret.txt\` - JWT signing secret
- \`jwt_refresh_secret.txt\` - JWT refresh token secret
- \`encryption_key.txt\` - Application encryption key
- \`session_secret.txt\` - Session encryption secret

## Production Deployment

For production environments, consider using:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- Kubernetes Secrets

## Emergency Procedures

If secrets are compromised:
1. Immediately rotate all affected secrets
2. Invalidate all existing sessions/tokens
3. Audit access logs
4. Update all dependent systems

Generated on: $(date)
EOF
    print_status "Created README with security guidelines"
}

# Main execution
main() {
    echo "EMR Blockchain Secrets Generator"
    echo "================================"
    echo
    
    # Validate environment
    validate_environment
    
    # Backup existing secrets if they exist
    backup_existing_secrets
    
    # Create secrets directory
    create_secrets_directory
    
    # Generate all secrets
    generate_all_secrets
    
    # Create supporting files
    create_gitignore
    create_secrets_readme
    
    # Show usage instructions
    show_usage_instructions
    
    echo
    print_status "Secret generation completed successfully!"
}

# Run main function
main "$@"
