#!/bin/bash

# TLS Certificate Generation Script
# Generates TLS 1.3 compatible certificates for the blockchain EMR system
# Compliant with read111.md security requirements

set -e

# Configuration
CERT_DIR="${CERT_DIR:-./certs}"
DOMAIN="${DOMAIN:-localhost}"
ORGANIZATION="${ORGANIZATION:-EMR Blockchain System}"
COUNTRY="${COUNTRY:-US}"
STATE="${STATE:-CA}"
CITY="${CITY:-San Francisco}"
VALIDITY_DAYS="${VALIDITY_DAYS:-365}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if OpenSSL is available
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is not installed. Please install OpenSSL first."
        exit 1
    fi
    
    local openssl_version=$(openssl version)
    log_info "Using OpenSSL: $openssl_version"
}

# Create certificate directory
create_cert_directory() {
    log_info "Creating certificate directory: $CERT_DIR"
    mkdir -p "$CERT_DIR"
    chmod 700 "$CERT_DIR"
}

# Generate private key
generate_private_key() {
    local key_file="$CERT_DIR/server.key"
    
    log_info "Generating RSA private key (2048 bits)..."
    openssl genrsa -out "$key_file" 2048
    chmod 600 "$key_file"
    
    log_success "Private key generated: $key_file"
}

# Generate Certificate Signing Request (CSR)
generate_csr() {
    local key_file="$CERT_DIR/server.key"
    local csr_file="$CERT_DIR/server.csr"
    
    log_info "Generating Certificate Signing Request..."
    
    # Create OpenSSL config for CSR
    cat > "$CERT_DIR/csr.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=$COUNTRY
ST=$STATE
L=$CITY
O=$ORGANIZATION
OU=IT Department
CN=$DOMAIN

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = localhost
DNS.3 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    openssl req -new -key "$key_file" -out "$csr_file" -config "$CERT_DIR/csr.conf"
    
    log_success "CSR generated: $csr_file"
}

# Generate self-signed certificate
generate_self_signed_cert() {
    local key_file="$CERT_DIR/server.key"
    local cert_file="$CERT_DIR/server.crt"
    
    log_info "Generating self-signed certificate (valid for $VALIDITY_DAYS days)..."
    
    # Create OpenSSL config for certificate
    cat > "$CERT_DIR/cert.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[dn]
C=$COUNTRY
ST=$STATE
L=$CITY
O=$ORGANIZATION
OU=IT Department
CN=$DOMAIN

[v3_ca]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = localhost
DNS.3 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    openssl req -new -x509 -key "$key_file" -out "$cert_file" \
        -days "$VALIDITY_DAYS" -config "$CERT_DIR/cert.conf" \
        -extensions v3_ca
    
    chmod 644 "$cert_file"
    
    log_success "Self-signed certificate generated: $cert_file"
}

# Generate DH parameters for perfect forward secrecy
generate_dh_params() {
    local dh_file="$CERT_DIR/dhparam.pem"
    
    log_info "Generating DH parameters (2048 bits) - this may take a while..."
    openssl dhparam -out "$dh_file" 2048
    chmod 644 "$dh_file"
    
    log_success "DH parameters generated: $dh_file"
}

# Verify certificate
verify_certificate() {
    local cert_file="$CERT_DIR/server.crt"
    
    log_info "Verifying certificate..."
    
    # Check certificate details
    log_info "Certificate details:"
    openssl x509 -in "$cert_file" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:|DNS:|IP Address:)"
    
    # Verify certificate against private key
    local cert_modulus=$(openssl x509 -noout -modulus -in "$cert_file" | openssl md5)
    local key_modulus=$(openssl rsa -noout -modulus -in "$CERT_DIR/server.key" | openssl md5)
    
    if [ "$cert_modulus" = "$key_modulus" ]; then
        log_success "Certificate and private key match"
    else
        log_error "Certificate and private key do not match"
        exit 1
    fi
}

# Create certificate bundle
create_certificate_bundle() {
    local bundle_file="$CERT_DIR/bundle.pem"
    local cert_file="$CERT_DIR/server.crt"
    
    log_info "Creating certificate bundle..."
    cp "$cert_file" "$bundle_file"
    
    log_success "Certificate bundle created: $bundle_file"
}

# Set proper permissions
set_permissions() {
    log_info "Setting proper file permissions..."
    
    # Private key should be readable only by owner
    chmod 600 "$CERT_DIR/server.key"
    
    # Certificates can be readable by group
    chmod 644 "$CERT_DIR"/*.crt "$CERT_DIR"/*.pem
    
    # Remove temporary files
    rm -f "$CERT_DIR/csr.conf" "$CERT_DIR/cert.conf" "$CERT_DIR/server.csr"
    
    log_success "Permissions set correctly"
}

# Display certificate information
display_certificate_info() {
    local cert_file="$CERT_DIR/server.crt"
    
    echo ""
    log_info "=== Certificate Information ==="
    
    # Extract certificate information
    local subject=$(openssl x509 -in "$cert_file" -noout -subject | sed 's/subject=//')
    local issuer=$(openssl x509 -in "$cert_file" -noout -issuer | sed 's/issuer=//')
    local not_before=$(openssl x509 -in "$cert_file" -noout -startdate | sed 's/notBefore=//')
    local not_after=$(openssl x509 -in "$cert_file" -noout -enddate | sed 's/notAfter=//')
    local fingerprint=$(openssl x509 -in "$cert_file" -noout -fingerprint -sha256 | sed 's/SHA256 Fingerprint=//')
    
    echo "Subject: $subject"
    echo "Issuer: $issuer"
    echo "Valid From: $not_before"
    echo "Valid Until: $not_after"
    echo "SHA256 Fingerprint: $fingerprint"
    
    echo ""
    log_info "=== Files Generated ==="
    echo "Private Key: $CERT_DIR/server.key"
    echo "Certificate: $CERT_DIR/server.crt"
    echo "DH Parameters: $CERT_DIR/dhparam.pem"
    echo "Certificate Bundle: $CERT_DIR/bundle.pem"
    
    echo ""
    log_info "=== Environment Variables ==="
    echo "Add these to your .env file:"
    echo "TLS_ENABLED=true"
    echo "TLS_CERT_PATH=$(realpath $CERT_DIR/server.crt)"
    echo "TLS_KEY_PATH=$(realpath $CERT_DIR/server.key)"
    echo "TLS_DH_PARAM_PATH=$(realpath $CERT_DIR/dhparam.pem)"
}

# Main function
main() {
    echo ""
    log_info "=== TLS Certificate Generation for EMR Blockchain System ==="
    log_info "Domain: $DOMAIN"
    log_info "Organization: $ORGANIZATION"
    log_info "Certificate Directory: $CERT_DIR"
    log_info "Validity: $VALIDITY_DAYS days"
    echo ""
    
    check_openssl
    create_cert_directory
    generate_private_key
    generate_csr
    generate_self_signed_cert
    generate_dh_params
    verify_certificate
    create_certificate_bundle
    set_permissions
    display_certificate_info
    
    echo ""
    log_success "TLS certificate generation completed successfully!"
    log_warning "Note: This is a self-signed certificate suitable for development."
    log_warning "For production, use certificates from a trusted Certificate Authority."
    echo ""
}

# Help function
show_help() {
    echo "TLS Certificate Generation Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN        Domain name for the certificate (default: localhost)"
    echo "  -o, --organization ORG     Organization name (default: EMR Blockchain System)"
    echo "  -c, --country COUNTRY      Country code (default: US)"
    echo "  -s, --state STATE          State/Province (default: CA)"
    echo "  -l, --city CITY            City/Locality (default: San Francisco)"
    echo "  -v, --validity DAYS        Certificate validity in days (default: 365)"
    echo "  --cert-dir DIR             Certificate output directory (default: ./certs)"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DOMAIN, ORGANIZATION, COUNTRY, STATE, CITY, VALIDITY_DAYS, CERT_DIR"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Generate with defaults"
    echo "  $0 -d emr.example.com -o \"My Org\"    # Custom domain and organization"
    echo "  $0 --validity 730                    # 2-year validity"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -o|--organization)
            ORGANIZATION="$2"
            shift 2
            ;;
        -c|--country)
            COUNTRY="$2"
            shift 2
            ;;
        -s|--state)
            STATE="$2"
            shift 2
            ;;
        -l|--city)
            CITY="$2"
            shift 2
            ;;
        -v|--validity)
            VALIDITY_DAYS="$2"
            shift 2
            ;;
        --cert-dir)
            CERT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
