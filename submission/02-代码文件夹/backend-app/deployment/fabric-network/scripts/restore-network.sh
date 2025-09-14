#!/bin/bash

# Fabric Network Restore Script
# Comprehensive restore solution for production EMR network
# Restores from backup with verification and rollback capabilities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE=""
RESTORE_DIR="./restore_temp"
FORCE_RESTORE="${FORCE_RESTORE:-false}"
VERIFY_RESTORE="${VERIFY_RESTORE:-true}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

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

# Show usage
show_usage() {
    echo "Usage: $0 <backup-file> [options]"
    echo ""
    echo "Options:"
    echo "  --force              Force restore without confirmation"
    echo "  --no-verify          Skip restore verification"
    echo "  --encryption-key KEY Decryption key for encrypted backups"
    echo "  --no-rollback        Disable rollback capability"
    echo ""
    echo "Examples:"
    echo "  $0 backups/emr-fabric-backup_20240101_120000.tar.gz"
    echo "  $0 backup.tar.gz.enc --encryption-key mykey --force"
}

# Parse command line arguments
parse_arguments() {
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    BACKUP_FILE="$1"
    shift
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_RESTORE="true"
                shift
                ;;
            --no-verify)
                VERIFY_RESTORE="false"
                shift
                ;;
            --encryption-key)
                ENCRYPTION_KEY="$2"
                shift 2
                ;;
            --no-rollback)
                ROLLBACK_ENABLED="false"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate backup file
validate_backup_file() {
    log_info "Validating backup file..."
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    # Check if file is encrypted
    if [[ "$BACKUP_FILE" == *.enc ]]; then
        if [ -z "$ENCRYPTION_KEY" ]; then
            log_error "Encrypted backup requires decryption key (--encryption-key)"
            exit 1
        fi
        log_info "Encrypted backup detected"
    fi
    
    log_success "Backup file validated"
}

# Create rollback point
create_rollback_point() {
    if [ "$ROLLBACK_ENABLED" = "true" ]; then
        log_info "Creating rollback point..."
        
        local rollback_dir="./rollback_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$rollback_dir"
        
        # Backup current state
        if [ -d "$NETWORK_DIR/crypto-config" ]; then
            cp -r "$NETWORK_DIR/crypto-config" "$rollback_dir/"
        fi
        
        if [ -d "$NETWORK_DIR/channel-artifacts" ]; then
            cp -r "$NETWORK_DIR/channel-artifacts" "$rollback_dir/"
        fi
        
        # Save container states
        docker ps -a --format "table {{.Names}}\t{{.Status}}" > "$rollback_dir/container_states.txt"
        
        echo "$rollback_dir" > "$NETWORK_DIR/.rollback_point"
        log_success "Rollback point created: $rollback_dir"
    fi
}

# Stop network
stop_network() {
    log_info "Stopping current network..."
    
    cd "$NETWORK_DIR"
    
    # Stop Docker Compose services
    if [ -f "docker-compose-production.yaml" ]; then
        docker-compose -f docker-compose-production.yaml down --volumes 2>/dev/null || true
    fi
    
    # Stop monitoring stack
    if [ -d "monitoring" ] && [ -f "monitoring/docker-compose-monitoring.yml" ]; then
        cd monitoring
        docker-compose -f docker-compose-monitoring.yml down --volumes 2>/dev/null || true
        cd ..
    fi
    
    log_success "Network stopped"
}

# Extract backup
extract_backup() {
    log_info "Extracting backup..."
    
    # Clean restore directory
    rm -rf "$RESTORE_DIR"
    mkdir -p "$RESTORE_DIR"
    
    cd "$RESTORE_DIR"
    
    if [[ "$BACKUP_FILE" == *.enc ]]; then
        # Decrypt and extract
        log_info "Decrypting backup..."
        openssl enc -aes-256-cbc -d -in "$BACKUP_FILE" -k "$ENCRYPTION_KEY" | tar -xzf -
    else
        # Extract directly
        tar -xzf "$BACKUP_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Backup extracted successfully"
    else
        log_error "Failed to extract backup"
        exit 1
    fi
    
    cd - > /dev/null
}

# Verify backup contents
verify_backup_contents() {
    log_info "Verifying backup contents..."
    
    local backup_contents=$(find "$RESTORE_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)
    
    if [ -z "$backup_contents" ]; then
        log_error "No backup contents found"
        exit 1
    fi
    
    BACKUP_CONTENTS_DIR="$backup_contents"
    
    # Check for required components
    local required_components=("crypto-config" "channel-artifacts" "config")
    local missing_components=()
    
    for component in "${required_components[@]}"; do
        if [ ! -d "$BACKUP_CONTENTS_DIR/$component" ]; then
            missing_components+=("$component")
        fi
    done
    
    if [ ${#missing_components[@]} -gt 0 ]; then
        log_warning "Missing components: ${missing_components[*]}"
        if [ "$FORCE_RESTORE" != "true" ]; then
            read -p "Continue with incomplete backup? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    # Check metadata
    if [ -f "$BACKUP_CONTENTS_DIR/backup_metadata.json" ]; then
        log_info "Backup metadata found:"
        cat "$BACKUP_CONTENTS_DIR/backup_metadata.json" | jq . 2>/dev/null || cat "$BACKUP_CONTENTS_DIR/backup_metadata.json"
    fi
    
    log_success "Backup contents verified"
}

# Restore crypto materials
restore_crypto_materials() {
    log_info "Restoring crypto materials..."
    
    if [ -d "$BACKUP_CONTENTS_DIR/crypto-config" ]; then
        # Backup existing crypto config
        if [ -d "$NETWORK_DIR/crypto-config" ]; then
            mv "$NETWORK_DIR/crypto-config" "$NETWORK_DIR/crypto-config.backup.$(date +%s)"
        fi
        
        # Restore crypto config
        cp -r "$BACKUP_CONTENTS_DIR/crypto-config" "$NETWORK_DIR/"
        
        log_success "Crypto materials restored"
    else
        log_warning "No crypto materials found in backup"
    fi
}

# Restore channel artifacts
restore_channel_artifacts() {
    log_info "Restoring channel artifacts..."
    
    if [ -d "$BACKUP_CONTENTS_DIR/channel-artifacts" ]; then
        # Backup existing channel artifacts
        if [ -d "$NETWORK_DIR/channel-artifacts" ]; then
            mv "$NETWORK_DIR/channel-artifacts" "$NETWORK_DIR/channel-artifacts.backup.$(date +%s)"
        fi
        
        # Restore channel artifacts
        cp -r "$BACKUP_CONTENTS_DIR/channel-artifacts" "$NETWORK_DIR/"
        
        log_success "Channel artifacts restored"
    else
        log_warning "No channel artifacts found in backup"
    fi
}

# Restore configuration
restore_configuration() {
    log_info "Restoring configuration..."
    
    if [ -d "$BACKUP_CONTENTS_DIR/config" ]; then
        # Restore Docker Compose files
        cp "$BACKUP_CONTENTS_DIR/config"/*.yaml "$NETWORK_DIR/" 2>/dev/null || true
        cp "$BACKUP_CONTENTS_DIR/config"/*.yml "$NETWORK_DIR/" 2>/dev/null || true
        
        # Restore connection profiles
        if [ -d "$BACKUP_CONTENTS_DIR/config/connection-profiles" ]; then
            cp -r "$BACKUP_CONTENTS_DIR/config/connection-profiles" "$NETWORK_DIR/"
        fi
        
        log_success "Configuration restored"
    else
        log_warning "No configuration found in backup"
    fi
}

# Restore ledger data
restore_ledger_data() {
    log_info "Restoring ledger data..."
    
    if [ -d "$BACKUP_CONTENTS_DIR/ledger" ]; then
        # Start containers first to create volumes
        cd "$NETWORK_DIR"
        docker-compose -f docker-compose-production.yaml up -d
        
        # Wait for containers to be ready
        sleep 30
        
        # Restore ledger data for each container
        for ledger_backup in "$BACKUP_CONTENTS_DIR/ledger"/*; do
            if [ -d "$ledger_backup" ]; then
                local container_name=$(basename "$ledger_backup")
                local backup_file="$ledger_backup/${container_name}_ledger.tar.gz"
                
                if [ -f "$backup_file" ] && docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
                    log_info "Restoring ledger data for $container_name..."
                    
                    # Copy backup to container
                    docker cp "$backup_file" "$container_name:/tmp/"
                    
                    # Stop container, restore data, restart
                    docker stop "$container_name"
                    docker exec "$container_name" rm -rf /var/hyperledger/production/* 2>/dev/null || true
                    docker exec "$container_name" tar -xzf "/tmp/$(basename "$backup_file")" -C /var/hyperledger/production/
                    docker exec "$container_name" rm -f "/tmp/$(basename "$backup_file")"
                    docker start "$container_name"
                    
                    log_success "Ledger data restored for $container_name"
                else
                    log_warning "Ledger backup not found or container not running: $container_name"
                fi
            fi
        done
        
        log_success "Ledger data restoration completed"
    else
        log_warning "No ledger data found in backup"
    fi
}

# Restore monitoring data
restore_monitoring_data() {
    log_info "Restoring monitoring data..."
    
    if [ -d "$BACKUP_CONTENTS_DIR/monitoring" ]; then
        # Start monitoring stack
        if [ -d "$NETWORK_DIR/monitoring" ]; then
            cd "$NETWORK_DIR/monitoring"
            docker-compose -f docker-compose-monitoring.yml up -d
            sleep 10
            
            # Restore Prometheus data
            if [ -f "$BACKUP_CONTENTS_DIR/monitoring/prometheus_data.tar.gz" ] && docker ps --format "table {{.Names}}" | grep -q "prometheus"; then
                docker cp "$BACKUP_CONTENTS_DIR/monitoring/prometheus_data.tar.gz" prometheus:/tmp/
                docker exec prometheus sh -c "rm -rf /prometheus/* && tar -xzf /tmp/prometheus_data.tar.gz -C /prometheus/"
                docker exec prometheus rm -f /tmp/prometheus_data.tar.gz
                docker restart prometheus
            fi
            
            # Restore Grafana data
            if [ -f "$BACKUP_CONTENTS_DIR/monitoring/grafana_data.tar.gz" ] && docker ps --format "table {{.Names}}" | grep -q "grafana"; then
                docker cp "$BACKUP_CONTENTS_DIR/monitoring/grafana_data.tar.gz" grafana:/tmp/
                docker exec grafana sh -c "rm -rf /var/lib/grafana/* && tar -xzf /tmp/grafana_data.tar.gz -C /var/lib/grafana/"
                docker exec grafana rm -f /tmp/grafana_data.tar.gz
                docker restart grafana
            fi
            
            cd - > /dev/null
        fi
        
        log_success "Monitoring data restored"
    else
        log_warning "No monitoring data found in backup"
    fi
}

# Verify restore
verify_restore() {
    if [ "$VERIFY_RESTORE" = "true" ]; then
        log_info "Verifying restore..."
        
        # Wait for network to be ready
        sleep 30
        
        # Check container status
        local running_containers=$(docker ps --format "table {{.Names}}" | grep -E "(orderer|peer|ca)" | wc -l)
        log_info "Running containers: $running_containers"
        
        # Test basic connectivity
        if command -v curl &> /dev/null; then
            if curl -k --connect-timeout 5 https://localhost:7050/healthz &>/dev/null; then
                log_success "Orderer connectivity verified"
            else
                log_warning "Orderer connectivity test failed"
            fi
        fi
        
        # Run network test if available
        if [ -f "$SCRIPT_DIR/test-network.sh" ]; then
            log_info "Running network tests..."
            "$SCRIPT_DIR/test-network.sh" basic || log_warning "Network tests failed"
        fi
        
        log_success "Restore verification completed"
    fi
}

# Cleanup restore files
cleanup_restore() {
    log_info "Cleaning up restore files..."
    
    rm -rf "$RESTORE_DIR"
    
    log_success "Cleanup completed"
}

# Rollback function
rollback() {
    if [ -f "$NETWORK_DIR/.rollback_point" ]; then
        local rollback_dir=$(cat "$NETWORK_DIR/.rollback_point")
        
        if [ -d "$rollback_dir" ]; then
            log_info "Rolling back to previous state..."
            
            # Stop current network
            stop_network
            
            # Restore from rollback point
            if [ -d "$rollback_dir/crypto-config" ]; then
                rm -rf "$NETWORK_DIR/crypto-config"
                cp -r "$rollback_dir/crypto-config" "$NETWORK_DIR/"
            fi
            
            if [ -d "$rollback_dir/channel-artifacts" ]; then
                rm -rf "$NETWORK_DIR/channel-artifacts"
                cp -r "$rollback_dir/channel-artifacts" "$NETWORK_DIR/"
            fi
            
            # Clean up rollback point
            rm -rf "$rollback_dir"
            rm -f "$NETWORK_DIR/.rollback_point"
            
            log_success "Rollback completed"
        else
            log_error "Rollback point not found: $rollback_dir"
        fi
    else
        log_error "No rollback point available"
    fi
}

# Main restore function
main() {
    echo ""
    log_info "=== EMR Fabric Network Restore Started ==="
    echo ""
    
    validate_backup_file
    
    if [ "$FORCE_RESTORE" != "true" ]; then
        echo "This will restore the network from backup: $BACKUP_FILE"
        echo "Current network state will be lost!"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi
    
    create_rollback_point
    stop_network
    extract_backup
    verify_backup_contents
    restore_crypto_materials
    restore_channel_artifacts
    restore_configuration
    restore_ledger_data
    restore_monitoring_data
    verify_restore
    cleanup_restore
    
    echo ""
    log_success "Network restore completed successfully!"
    echo ""
    log_info "Network should be accessible at the usual endpoints"
    echo "Run 'npm run fabric:test:basic' to verify functionality"
    echo ""
}

# Handle script arguments
case "$1" in
    "rollback")
        rollback
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        parse_arguments "$@"
        main
        ;;
esac
