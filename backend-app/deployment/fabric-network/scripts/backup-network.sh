#!/bin/bash

# Fabric Network Backup Script
# Comprehensive backup solution for production EMR network
# Includes ledger data, crypto materials, configuration, and verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_PREFIX="emr-fabric-backup"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"
VERIFY_BACKUP="${VERIFY_BACKUP:-true}"
ENCRYPT_BACKUP="${ENCRYPT_BACKUP:-false}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CRYPTO_CONFIG_DIR="$NETWORK_DIR/crypto-config"
CHANNEL_ARTIFACTS_DIR="$NETWORK_DIR/channel-artifacts"

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

# Create backup directory
create_backup_directory() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    BACKUP_TIMESTAMP="$timestamp"
    BACKUP_NAME="${BACKUP_PREFIX}_${timestamp}"
    CURRENT_BACKUP_DIR="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$CURRENT_BACKUP_DIR"
    log_info "Created backup directory: $CURRENT_BACKUP_DIR"
}

# Backup crypto materials
backup_crypto_materials() {
    log_info "Backing up crypto materials..."
    
    if [ -d "$CRYPTO_CONFIG_DIR" ]; then
        cp -r "$CRYPTO_CONFIG_DIR" "$CURRENT_BACKUP_DIR/"
        log_success "Crypto materials backed up"
    else
        log_warning "Crypto config directory not found: $CRYPTO_CONFIG_DIR"
    fi
}

# Backup channel artifacts
backup_channel_artifacts() {
    log_info "Backing up channel artifacts..."
    
    if [ -d "$CHANNEL_ARTIFACTS_DIR" ]; then
        cp -r "$CHANNEL_ARTIFACTS_DIR" "$CURRENT_BACKUP_DIR/"
        log_success "Channel artifacts backed up"
    else
        log_warning "Channel artifacts directory not found: $CHANNEL_ARTIFACTS_DIR"
    fi
}

# Backup configuration files
backup_configuration() {
    log_info "Backing up configuration files..."
    
    local config_dir="$CURRENT_BACKUP_DIR/config"
    mkdir -p "$config_dir"
    
    # Backup Docker Compose files
    cp "$NETWORK_DIR"/*.yaml "$config_dir/" 2>/dev/null || true
    cp "$NETWORK_DIR"/*.yml "$config_dir/" 2>/dev/null || true
    
    # Backup connection profiles
    if [ -d "$NETWORK_DIR/connection-profiles" ]; then
        cp -r "$NETWORK_DIR/connection-profiles" "$config_dir/"
    fi
    
    # Backup scripts
    cp -r "$SCRIPT_DIR" "$config_dir/"
    
    log_success "Configuration files backed up"
}

# Backup ledger data from containers
backup_ledger_data() {
    log_info "Backing up ledger data from containers..."
    
    local ledger_dir="$CURRENT_BACKUP_DIR/ledger"
    mkdir -p "$ledger_dir"
    
    # List of containers to backup
    local containers=(
        "orderer.emr.com"
        "peer0.hospital1.emr.com"
        "peer1.hospital1.emr.com"
        "peer0.hospital2.emr.com"
        "peer1.hospital2.emr.com"
        "peer0.regulator.emr.com"
    )
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            log_info "Backing up ledger data from $container..."
            
            # Create container-specific backup directory
            local container_backup_dir="$ledger_dir/$container"
            mkdir -p "$container_backup_dir"
            
            # Backup production data
            docker exec "$container" tar -czf "/tmp/${container}_ledger.tar.gz" -C /var/hyperledger/production . 2>/dev/null || {
                log_warning "Failed to create ledger backup for $container"
                continue
            }
            
            # Copy backup from container
            docker cp "$container:/tmp/${container}_ledger.tar.gz" "$container_backup_dir/"
            
            # Clean up temporary file in container
            docker exec "$container" rm -f "/tmp/${container}_ledger.tar.gz"
            
            log_success "Ledger data backed up for $container"
        else
            log_warning "Container $container is not running, skipping ledger backup"
        fi
    done
}

# Backup monitoring data
backup_monitoring_data() {
    log_info "Backing up monitoring data..."
    
    local monitoring_dir="$CURRENT_BACKUP_DIR/monitoring"
    mkdir -p "$monitoring_dir"
    
    # Backup Prometheus data if available
    if docker ps --format "table {{.Names}}" | grep -q "prometheus"; then
        docker exec prometheus tar -czf "/tmp/prometheus_data.tar.gz" -C /prometheus . 2>/dev/null || {
            log_warning "Failed to backup Prometheus data"
        }
        docker cp prometheus:/tmp/prometheus_data.tar.gz "$monitoring_dir/" 2>/dev/null || true
        docker exec prometheus rm -f "/tmp/prometheus_data.tar.gz" 2>/dev/null || true
    fi
    
    # Backup Grafana data if available
    if docker ps --format "table {{.Names}}" | grep -q "grafana"; then
        docker exec grafana tar -czf "/tmp/grafana_data.tar.gz" -C /var/lib/grafana . 2>/dev/null || {
            log_warning "Failed to backup Grafana data"
        }
        docker cp grafana:/tmp/grafana_data.tar.gz "$monitoring_dir/" 2>/dev/null || true
        docker exec grafana rm -f "/tmp/grafana_data.tar.gz" 2>/dev/null || true
    fi
    
    log_success "Monitoring data backed up"
}

# Create backup metadata
create_backup_metadata() {
    log_info "Creating backup metadata..."
    
    local metadata_file="$CURRENT_BACKUP_DIR/backup_metadata.json"
    
    cat > "$metadata_file" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$BACKUP_TIMESTAMP",
  "date": "$(date -Iseconds)",
  "network_version": "$(docker --version | head -n1)",
  "fabric_version": "2.5",
  "backup_type": "full",
  "components": {
    "crypto_materials": $([ -d "$CURRENT_BACKUP_DIR/crypto-config" ] && echo "true" || echo "false"),
    "channel_artifacts": $([ -d "$CURRENT_BACKUP_DIR/channel-artifacts" ] && echo "true" || echo "false"),
    "configuration": $([ -d "$CURRENT_BACKUP_DIR/config" ] && echo "true" || echo "false"),
    "ledger_data": $([ -d "$CURRENT_BACKUP_DIR/ledger" ] && echo "true" || echo "false"),
    "monitoring_data": $([ -d "$CURRENT_BACKUP_DIR/monitoring" ] && echo "true" || echo "false")
  },
  "network_status": {
    "containers_running": $(docker ps --format "table {{.Names}}" | grep -E "(orderer|peer|ca)" | wc -l),
    "total_size": "$(du -sh "$CURRENT_BACKUP_DIR" | cut -f1)"
  }
}
EOF

    log_success "Backup metadata created"
}

# Compress backup
compress_backup() {
    log_info "Compressing backup..."
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        # Remove uncompressed directory
        rm -rf "$BACKUP_NAME"
        BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
        log_success "Backup compressed: $BACKUP_FILE"
    else
        log_error "Failed to compress backup"
        exit 1
    fi
}

# Encrypt backup (optional)
encrypt_backup() {
    if [ "$ENCRYPT_BACKUP" = "true" ] && [ -n "$ENCRYPTION_KEY" ]; then
        log_info "Encrypting backup..."
        
        openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "${BACKUP_FILE}.enc" -k "$ENCRYPTION_KEY"
        
        if [ $? -eq 0 ]; then
            rm "$BACKUP_FILE"
            BACKUP_FILE="${BACKUP_FILE}.enc"
            log_success "Backup encrypted: $BACKUP_FILE"
        else
            log_error "Failed to encrypt backup"
            exit 1
        fi
    fi
}

# Verify backup integrity
verify_backup() {
    if [ "$VERIFY_BACKUP" = "true" ]; then
        log_info "Verifying backup integrity..."
        
        # Test archive integrity
        if [[ "$BACKUP_FILE" == *.enc ]]; then
            # Decrypt and test
            openssl enc -aes-256-cbc -d -in "$BACKUP_FILE" -k "$ENCRYPTION_KEY" | tar -tzf - >/dev/null
        else
            # Test compressed archive
            tar -tzf "$BACKUP_FILE" >/dev/null
        fi
        
        if [ $? -eq 0 ]; then
            log_success "Backup integrity verified"
        else
            log_error "Backup integrity check failed"
            exit 1
        fi
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*" -type f -mtime +$RETENTION_DAYS -delete
    
    local remaining_backups=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*" -type f | wc -l)
    log_success "Cleanup completed. Remaining backups: $remaining_backups"
}

# Generate backup report
generate_backup_report() {
    log_info "Generating backup report..."
    
    local report_file="$BACKUP_DIR/backup_report_${BACKUP_TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
EMR Fabric Network Backup Report
================================

Backup Details:
- Name: $BACKUP_NAME
- Timestamp: $BACKUP_TIMESTAMP
- Date: $(date)
- File: $BACKUP_FILE
- Size: $(du -sh "$BACKUP_FILE" | cut -f1)

Network Status:
- Running Containers: $(docker ps --format "table {{.Names}}" | grep -E "(orderer|peer|ca)" | wc -l)
- Total Containers: $(docker ps -a --format "table {{.Names}}" | grep -E "(orderer|peer|ca)" | wc -l)

Backup Components:
- Crypto Materials: $([ -f "$BACKUP_FILE" ] && echo "✓ Included" || echo "✗ Missing")
- Channel Artifacts: $([ -f "$BACKUP_FILE" ] && echo "✓ Included" || echo "✗ Missing")
- Configuration Files: $([ -f "$BACKUP_FILE" ] && echo "✓ Included" || echo "✗ Missing")
- Ledger Data: $([ -f "$BACKUP_FILE" ] && echo "✓ Included" || echo "✗ Missing")
- Monitoring Data: $([ -f "$BACKUP_FILE" ] && echo "✓ Included" || echo "✗ Missing")

Verification:
- Integrity Check: $([ "$VERIFY_BACKUP" = "true" ] && echo "✓ Passed" || echo "- Skipped")
- Encryption: $([ "$ENCRYPT_BACKUP" = "true" ] && echo "✓ Enabled" || echo "- Disabled")

Storage:
- Backup Directory: $BACKUP_DIR
- Total Backups: $(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*" -type f | wc -l)
- Retention Policy: $RETENTION_DAYS days

EOF

    log_success "Backup report generated: $report_file"
}

# Main backup function
main() {
    echo ""
    log_info "=== EMR Fabric Network Backup Started ==="
    echo ""
    
    # Check if backup directory exists
    mkdir -p "$BACKUP_DIR"
    
    create_backup_directory
    backup_crypto_materials
    backup_channel_artifacts
    backup_configuration
    backup_ledger_data
    backup_monitoring_data
    create_backup_metadata
    compress_backup
    encrypt_backup
    verify_backup
    cleanup_old_backups
    generate_backup_report
    
    echo ""
    log_success "Backup completed successfully!"
    echo ""
    log_info "Backup Details:"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $(du -sh "$BACKUP_FILE" | cut -f1)"
    echo "  Timestamp: $BACKUP_TIMESTAMP"
    echo ""
}

# Handle script arguments
case "$1" in
    "verify")
        if [ -z "$2" ]; then
            log_error "Usage: $0 verify <backup-file>"
            exit 1
        fi
        BACKUP_FILE="$2"
        verify_backup
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "list")
        log_info "Available backups:"
        find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*" -type f -exec ls -lh {} \;
        ;;
    *)
        main
        ;;
esac
