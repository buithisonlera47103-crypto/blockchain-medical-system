#!/bin/bash

# Comprehensive Backup System for Blockchain EMR
# Handles MySQL, IPFS, Hyperledger Fabric, and application data backups

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/backup/blockchain-emr}"
S3_BUCKET="${S3_BUCKET:-blockchain-emr-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Database configuration
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-backup}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-backup_password}"
MYSQL_DATABASE="${MYSQL_DATABASE:-blockchain_emr}"

# IPFS configuration
IPFS_HOST="${IPFS_HOST:-localhost}"
IPFS_PORT="${IPFS_PORT:-5001}"

# Fabric configuration
FABRIC_DATA_DIR="${FABRIC_DATA_DIR:-./fabric}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$BACKUP_DIR/backup.log"
}

function success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$BACKUP_DIR/backup.log"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$BACKUP_DIR/backup.log"
}

function warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$BACKUP_DIR/backup.log"
}

function print_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  full      - Run full system backup"
    echo "  mysql     - Backup MySQL database only"
    echo "  ipfs      - Backup IPFS data only"
    echo "  fabric    - Backup Hyperledger Fabric data only"
    echo "  restore   - Restore from backup"
    echo "  list      - List available backups"
    echo "  cleanup   - Clean old backups"
    echo "  verify    - Verify backup integrity"
    echo ""
    echo "Options:"
    echo "  --s3-upload       - Upload backup to S3"
    echo "  --encrypt         - Encrypt backup files"
    echo "  --compress        - Compress backup files"
    echo "  --retention DAYS  - Retention period (default: 30)"
    echo "  --backup-dir DIR  - Backup directory"
    echo "  --help            - Show this help message"
}

# Setup backup environment
function setup_backup_env() {
    # Create backup directory structure
    mkdir -p "$BACKUP_DIR"/{mysql,ipfs,fabric,logs,temp}
    
    # Initialize log file
    touch "$BACKUP_DIR/backup.log"
    
    # Check required tools
    local missing_tools=()
    
    if ! command -v mysqldump &> /dev/null; then
        missing_tools+=("mysqldump")
    fi
    
    if [ "$S3_UPLOAD" = true ] && ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi
    
    if [ "$ENCRYPT_BACKUP" = true ] && ! command -v gpg &> /dev/null; then
        missing_tools+=("gpg")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log "Backup environment setup completed"
}

# Backup MySQL database
function backup_mysql() {
    log "Starting MySQL database backup..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/mysql/mysql_backup_$timestamp.sql"
    
    # Create database dump
    mysqldump \
        --host="$MYSQL_HOST" \
        --port="$MYSQL_PORT" \
        --user="$MYSQL_USER" \
        --password="$MYSQL_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --add-drop-database \
        --databases "$MYSQL_DATABASE" \
        > "$backup_file" || {
        error "MySQL backup failed"
        return 1
    }
    
    # Verify backup file
    if [ ! -s "$backup_file" ]; then
        error "MySQL backup file is empty"
        return 1
    fi
    
    # Compress if requested
    if [ "$COMPRESS_BACKUP" = true ]; then
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
    fi
    
    # Encrypt if requested
    if [ "$ENCRYPT_BACKUP" = true ] && [ -n "$ENCRYPTION_KEY" ]; then
        encrypt_file "$backup_file"
        backup_file="${backup_file}.gpg"
    fi
    
    # Calculate checksum
    sha256sum "$backup_file" > "${backup_file}.sha256"
    
    success "MySQL backup completed: $backup_file"
    echo "$backup_file"
}

# Backup IPFS data
function backup_ipfs() {
    log "Starting IPFS data backup..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="$BACKUP_DIR/ipfs/ipfs_backup_$timestamp"
    
    mkdir -p "$backup_dir"
    
    # Export IPFS repository
    if command -v ipfs &> /dev/null; then
        # Export all pinned objects
        ipfs pin ls --type=recursive | while read hash type; do
            if [ "$type" = "recursive" ]; then
                log "Exporting IPFS object: $hash"
                ipfs get "$hash" -o "$backup_dir/$hash" || warning "Failed to export $hash"
            fi
        done
        
        # Export IPFS configuration
        ipfs config show > "$backup_dir/ipfs_config.json"
        
        # Export pin list
        ipfs pin ls > "$backup_dir/pin_list.txt"
        
    else
        # Use HTTP API if ipfs command not available
        curl -s "http://$IPFS_HOST:$IPFS_PORT/api/v0/pin/ls?type=recursive" | \
            jq -r '.Keys | keys[]' > "$backup_dir/pin_list.txt" || {
            warning "Failed to get IPFS pin list via API"
        }
    fi
    
    # Create archive
    local archive_file="$BACKUP_DIR/ipfs/ipfs_backup_$timestamp.tar"
    tar -cf "$archive_file" -C "$BACKUP_DIR/ipfs" "ipfs_backup_$timestamp"
    
    # Compress if requested
    if [ "$COMPRESS_BACKUP" = true ]; then
        gzip "$archive_file"
        archive_file="${archive_file}.gz"
    fi
    
    # Encrypt if requested
    if [ "$ENCRYPT_BACKUP" = true ] && [ -n "$ENCRYPTION_KEY" ]; then
        encrypt_file "$archive_file"
        archive_file="${archive_file}.gpg"
    fi
    
    # Calculate checksum
    sha256sum "$archive_file" > "${archive_file}.sha256"
    
    # Cleanup temporary directory
    rm -rf "$backup_dir"
    
    success "IPFS backup completed: $archive_file"
    echo "$archive_file"
}

# Backup Hyperledger Fabric data
function backup_fabric() {
    log "Starting Hyperledger Fabric backup..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/fabric/fabric_backup_$timestamp.tar"
    
    if [ ! -d "$FABRIC_DATA_DIR" ]; then
        warning "Fabric data directory not found: $FABRIC_DATA_DIR"
        return 0
    fi
    
    # Create archive of fabric data
    tar -cf "$backup_file" -C "$(dirname "$FABRIC_DATA_DIR")" "$(basename "$FABRIC_DATA_DIR")" || {
        error "Failed to create Fabric backup archive"
        return 1
    }
    
    # Compress if requested
    if [ "$COMPRESS_BACKUP" = true ]; then
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
    fi
    
    # Encrypt if requested
    if [ "$ENCRYPT_BACKUP" = true ] && [ -n "$ENCRYPTION_KEY" ]; then
        encrypt_file "$backup_file"
        backup_file="${backup_file}.gpg"
    fi
    
    # Calculate checksum
    sha256sum "$backup_file" > "${backup_file}.sha256"
    
    success "Fabric backup completed: $backup_file"
    echo "$backup_file"
}

# Encrypt file using GPG
function encrypt_file() {
    local file="$1"
    
    if [ -z "$ENCRYPTION_KEY" ]; then
        warning "No encryption key provided, skipping encryption"
        return 0
    fi
    
    log "Encrypting file: $file"
    
    gpg --symmetric \
        --cipher-algo AES256 \
        --compress-algo 1 \
        --s2k-mode 3 \
        --s2k-digest-algo SHA512 \
        --s2k-count 65011712 \
        --passphrase "$ENCRYPTION_KEY" \
        --batch \
        --yes \
        --output "${file}.gpg" \
        "$file" || {
        error "Failed to encrypt file: $file"
        return 1
    }
    
    # Remove original file after successful encryption
    rm "$file"
    
    success "File encrypted: ${file}.gpg"
}

# Upload backup to S3
function upload_to_s3() {
    local file="$1"
    local s3_key="backups/$(date +%Y/%m/%d)/$(basename "$file")"
    
    log "Uploading to S3: s3://$S3_BUCKET/$s3_key"
    
    aws s3 cp "$file" "s3://$S3_BUCKET/$s3_key" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$(date -Iseconds),retention-days=$RETENTION_DAYS" || {
        error "Failed to upload to S3: $file"
        return 1
    }
    
    # Upload checksum file if it exists
    if [ -f "${file}.sha256" ]; then
        aws s3 cp "${file}.sha256" "s3://$S3_BUCKET/${s3_key}.sha256" || {
            warning "Failed to upload checksum file"
        }
    fi
    
    success "Uploaded to S3: s3://$S3_BUCKET/$s3_key"
}

# Run full system backup
function run_full_backup() {
    log "Starting full system backup..."
    
    local backup_manifest="$BACKUP_DIR/backup_manifest_$(date +%Y%m%d_%H%M%S).json"
    local backup_files=()
    
    # Create backup manifest
    cat > "$backup_manifest" << EOF
{
  "backup_date": "$(date -Iseconds)",
  "backup_type": "full",
  "retention_days": $RETENTION_DAYS,
  "components": {},
  "files": []
}
EOF
    
    # Backup MySQL
    if mysql_file=$(backup_mysql); then
        backup_files+=("$mysql_file")
        jq '.components.mysql = true | .files += ["'$(basename "$mysql_file")'"]' "$backup_manifest" > "$backup_manifest.tmp" && mv "$backup_manifest.tmp" "$backup_manifest"
    else
        jq '.components.mysql = false' "$backup_manifest" > "$backup_manifest.tmp" && mv "$backup_manifest.tmp" "$backup_manifest"
    fi
    
    # Backup IPFS
    if ipfs_file=$(backup_ipfs); then
        backup_files+=("$ipfs_file")
        jq '.components.ipfs = true | .files += ["'$(basename "$ipfs_file")'"]' "$backup_manifest" > "$backup_manifest.tmp" && mv "$backup_manifest.tmp" "$backup_manifest"
    else
        jq '.components.ipfs = false' "$backup_manifest" > "$backup_manifest.tmp" && mv "$backup_manifest.tmp" "$backup_manifest"
    fi
    
    # Backup Fabric
    if fabric_file=$(backup_fabric); then
        backup_files+=("$fabric_file")
        jq '.components.fabric = true | .files += ["'$(basename "$fabric_file")'"]' "$backup_manifest" > "$backup_manifest.tmp" && mv "$backup_manifest.tmp" "$backup_manifest"
    else
        jq '.components.fabric = false' "$backup_manifest" > "$backup_manifest.tmp" && mv "$backup_manifest.tmp" "$backup_manifest"
    fi
    
    # Upload to S3 if requested
    if [ "$S3_UPLOAD" = true ]; then
        upload_to_s3 "$backup_manifest"
        
        for file in "${backup_files[@]}"; do
            upload_to_s3 "$file"
            if [ -f "${file}.sha256" ]; then
                upload_to_s3 "${file}.sha256"
            fi
        done
    fi
    
    success "Full backup completed. Manifest: $backup_manifest"
    
    # Generate backup report
    generate_backup_report "$backup_manifest" "${backup_files[@]}"
}

# Generate backup report
function generate_backup_report() {
    local manifest="$1"
    shift
    local files=("$@")
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d_%H%M%S).md"
    
    {
        echo "# Backup Report"
        echo "## Blockchain EMR System"
        echo ""
        echo "**Date:** $(date)"
        echo "**Type:** Full System Backup"
        echo ""
        
        echo "## Components Backed Up"
        echo ""
        
        if jq -e '.components.mysql' "$manifest" > /dev/null; then
            echo "- ✅ MySQL Database"
        else
            echo "- ❌ MySQL Database (failed)"
        fi
        
        if jq -e '.components.ipfs' "$manifest" > /dev/null; then
            echo "- ✅ IPFS Data"
        else
            echo "- ❌ IPFS Data (failed)"
        fi
        
        if jq -e '.components.fabric' "$manifest" > /dev/null; then
            echo "- ✅ Hyperledger Fabric"
        else
            echo "- ❌ Hyperledger Fabric (failed)"
        fi
        
        echo ""
        echo "## Backup Files"
        echo ""
        
        for file in "${files[@]}"; do
            local size=$(du -h "$file" | cut -f1)
            echo "- $(basename "$file") ($size)"
        done
        
        echo ""
        echo "## Storage Locations"
        echo ""
        echo "- Local: $BACKUP_DIR"
        
        if [ "$S3_UPLOAD" = true ]; then
            echo "- S3: s3://$S3_BUCKET/backups/$(date +%Y/%m/%d)/"
        fi
        
        echo ""
        echo "## Retention Policy"
        echo ""
        echo "- Retention Period: $RETENTION_DAYS days"
        echo "- Automatic Cleanup: Enabled"
        
        echo ""
        echo "## Verification"
        echo ""
        echo "All backup files include SHA256 checksums for integrity verification."
        
    } > "$report_file"
    
    success "Backup report generated: $report_file"
}

# List available backups
function list_backups() {
    log "Listing available backups..."
    
    echo "Local Backups:"
    echo "=============="
    
    for component in mysql ipfs fabric; do
        echo ""
        echo "$component backups:"
        if [ -d "$BACKUP_DIR/$component" ]; then
            ls -la "$BACKUP_DIR/$component" | grep -E '\.(sql|tar|gz|gpg)$' || echo "  No backups found"
        else
            echo "  Directory not found"
        fi
    done
    
    if [ "$S3_UPLOAD" = true ]; then
        echo ""
        echo "S3 Backups:"
        echo "==========="
        aws s3 ls "s3://$S3_BUCKET/backups/" --recursive --human-readable || {
            warning "Failed to list S3 backups"
        }
    fi
}

# Cleanup old backups
function cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -name "*.sql*" -delete
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -name "*.tar*" -delete
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -name "*.gz*" -delete
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -name "*.gpg*" -delete
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -name "*.sha256" -delete
    
    # S3 cleanup
    if [ "$S3_UPLOAD" = true ]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "backups/" \
            --query "Contents[?LastModified<='$cutoff_date'].Key" \
            --output text | \
        while read -r key; do
            if [ -n "$key" ]; then
                aws s3 rm "s3://$S3_BUCKET/$key"
                log "Deleted old S3 backup: $key"
            fi
        done
    fi
    
    success "Cleanup completed"
}

# Verify backup integrity
function verify_backups() {
    log "Verifying backup integrity..."
    
    local failed_files=()
    
    # Check all backup files with checksums
    find "$BACKUP_DIR" -name "*.sha256" | while read -r checksum_file; do
        local backup_file="${checksum_file%.sha256}"
        
        if [ -f "$backup_file" ]; then
            log "Verifying: $(basename "$backup_file")"
            
            if sha256sum -c "$checksum_file" > /dev/null 2>&1; then
                success "✅ $(basename "$backup_file")"
            else
                error "❌ $(basename "$backup_file") - checksum mismatch"
                failed_files+=("$backup_file")
            fi
        else
            warning "Backup file missing: $backup_file"
        fi
    done
    
    if [ ${#failed_files[@]} -eq 0 ]; then
        success "All backups verified successfully"
    else
        error "Failed verification for ${#failed_files[@]} files"
        return 1
    fi
}

# Parse command line arguments
function parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --s3-upload)
                S3_UPLOAD=true
                shift
                ;;
            --encrypt)
                ENCRYPT_BACKUP=true
                shift
                ;;
            --compress)
                COMPRESS_BACKUP=true
                shift
                ;;
            --retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            --backup-dir)
                BACKUP_DIR="$2"
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
    local command="${1:-help}"
    shift || true
    
    parse_args "$@"
    
    setup_backup_env
    
    case "$command" in
        "full")
            run_full_backup
            ;;
        "mysql")
            backup_mysql
            ;;
        "ipfs")
            backup_ipfs
            ;;
        "fabric")
            backup_fabric
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "verify")
            verify_backups
            ;;
        *)
            print_help
            ;;
    esac
}

# Run main function
main "$@"
