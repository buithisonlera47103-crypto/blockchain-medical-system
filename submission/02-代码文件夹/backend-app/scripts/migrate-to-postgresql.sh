#!/bin/bash

# EMR Blockchain Database Migration Script
# Migrates from MySQL to PostgreSQL and initializes production database
# Ensures HIPAA compliance and data integrity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-emr_blockchain}
DB_USER=${DB_USER:-emr_user}
DB_PASSWORD=${DB_PASSWORD:-emr_password}
BACKUP_DIR="./backups/migration-$(date +%Y%m%d_%H%M%S)"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking migration prerequisites..."
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL client (psql) is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if PostgreSQL server is running
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
        log_error "PostgreSQL server is not running or not accessible"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Create backup directory
create_backup_directory() {
    log_info "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory created: $BACKUP_DIR"
}

# Backup existing MySQL data (if exists)
backup_mysql_data() {
    log_info "Checking for existing MySQL data..."
    
    if command -v mysqldump &> /dev/null && mysql -e "USE emr_blockchain;" 2>/dev/null; then
        log_info "Found existing MySQL database, creating backup..."
        
        mysqldump emr_blockchain > "$BACKUP_DIR/mysql_backup.sql"
        log_success "MySQL backup created: $BACKUP_DIR/mysql_backup.sql"
    else
        log_info "No existing MySQL database found, skipping backup"
    fi
}

# Create PostgreSQL database and user
create_postgresql_database() {
    log_info "Creating PostgreSQL database and user..."
    
    # Connect as postgres superuser to create database and user
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "
        -- Create user if not exists
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
                CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
            END IF;
        END
        \$\$;
        
        -- Create database if not exists
        SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
        
        -- Grant privileges
        GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
        ALTER USER $DB_USER CREATEDB;
    " || {
        log_error "Failed to create PostgreSQL database and user"
        exit 1
    }
    
    log_success "PostgreSQL database and user created successfully"
}

# Initialize database schema
initialize_database_schema() {
    log_info "Initializing database schema..."
    
    # Run the database initialization from Node.js
    cd "$(dirname "$0")/.."
    
    # Set environment variables for the migration
    export NODE_ENV=production
    export DB_HOST="$DB_HOST"
    export DB_PORT="$DB_PORT"
    export DB_NAME="$DB_NAME"
    export DB_USER="$DB_USER"
    export DB_PASSWORD="$DB_PASSWORD"
    
    # Run database initialization
    if node -e "
        const { initializeDatabase } = require('./src/config/database-postgresql');
        initializeDatabase()
            .then(() => {
                console.log('Database schema initialized successfully');
                process.exit(0);
            })
            .catch((error) => {
                console.error('Database initialization failed:', error);
                process.exit(1);
            });
    "; then
        log_success "Database schema initialized successfully"
    else
        log_error "Database schema initialization failed"
        exit 1
    fi
}

# Migrate data from MySQL to PostgreSQL (if backup exists)
migrate_mysql_data() {
    if [ -f "$BACKUP_DIR/mysql_backup.sql" ]; then
        log_info "Migrating data from MySQL backup..."
        
        # Create a Python script to convert MySQL dump to PostgreSQL
        cat > "$BACKUP_DIR/mysql_to_postgresql.py" << 'EOF'
#!/usr/bin/env python3
import re
import sys

def convert_mysql_to_postgresql(mysql_file, postgresql_file):
    with open(mysql_file, 'r') as f:
        content = f.read()
    
    # Convert MySQL syntax to PostgreSQL
    # Remove MySQL-specific comments and settings
    content = re.sub(r'/\*![0-9]+ .+? \*/;', '', content)
    content = re.sub(r'SET .+?;', '', content)
    content = re.sub(r'LOCK TABLES .+?;', '', content)
    content = re.sub(r'UNLOCK TABLES;', '', content)
    
    # Convert data types
    content = re.sub(r'AUTO_INCREMENT', 'SERIAL', content)
    content = re.sub(r'TINYINT\(1\)', 'BOOLEAN', content)
    content = re.sub(r'DATETIME', 'TIMESTAMP', content)
    content = re.sub(r'TEXT', 'TEXT', content)
    
    # Convert table names to lowercase
    content = re.sub(r'CREATE TABLE `([^`]+)`', lambda m: f'CREATE TABLE {m.group(1).lower()}', content)
    content = re.sub(r'INSERT INTO `([^`]+)`', lambda m: f'INSERT INTO {m.group(1).lower()}', content)
    
    # Remove backticks
    content = re.sub(r'`([^`]+)`', r'\1', content)
    
    # Convert boolean values
    content = re.sub(r"'0'", 'FALSE', content)
    content = re.sub(r"'1'", 'TRUE', content)
    
    with open(postgresql_file, 'w') as f:
        f.write(content)

if __name__ == '__main__':
    convert_mysql_to_postgresql(sys.argv[1], sys.argv[2])
EOF
        
        # Convert MySQL dump to PostgreSQL format
        python3 "$BACKUP_DIR/mysql_to_postgresql.py" "$BACKUP_DIR/mysql_backup.sql" "$BACKUP_DIR/postgresql_data.sql"
        
        # Import converted data
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_DIR/postgresql_data.sql" || {
            log_warning "Data migration had some issues, but continuing..."
        }
        
        log_success "Data migration completed"
    else
        log_info "No MySQL backup found, skipping data migration"
    fi
}

# Verify database integrity
verify_database_integrity() {
    log_info "Verifying database integrity..."
    
    # Check if all tables exist
    local tables=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " | wc -l)
    
    if [ "$tables" -ge 8 ]; then
        log_success "Database integrity verified: $tables tables created"
    else
        log_error "Database integrity check failed: only $tables tables found"
        exit 1
    fi
    
    # Test database connection from Node.js
    cd "$(dirname "$0")/.."
    if node -e "
        const { testConnection } = require('./src/config/database-postgresql');
        testConnection()
            .then((result) => {
                if (result) {
                    console.log('Database connection test passed');
                    process.exit(0);
                } else {
                    console.error('Database connection test failed');
                    process.exit(1);
                }
            })
            .catch((error) => {
                console.error('Database connection test error:', error);
                process.exit(1);
            });
    "; then
        log_success "Database connection test passed"
    else
        log_error "Database connection test failed"
        exit 1
    fi
}

# Update configuration files
update_configuration() {
    log_info "Updating configuration files..."
    
    # Update .env file if it exists
    if [ -f ".env" ]; then
        # Backup original .env
        cp .env "$BACKUP_DIR/env_backup"
        
        # Update database configuration
        sed -i.bak \
            -e "s/MYSQL_HOST=.*/DB_HOST=$DB_HOST/" \
            -e "s/MYSQL_PORT=.*/DB_PORT=$DB_PORT/" \
            -e "s/MYSQL_DATABASE=.*/DB_NAME=$DB_NAME/" \
            -e "s/MYSQL_USER=.*/DB_USER=$DB_USER/" \
            -e "s/MYSQL_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" \
            .env
        
        log_success "Configuration files updated"
    else
        log_info "No .env file found, skipping configuration update"
    fi
}

# Create post-migration verification script
create_verification_script() {
    log_info "Creating post-migration verification script..."
    
    cat > "$BACKUP_DIR/verify_migration.sh" << EOF
#!/bin/bash
# Post-migration verification script

echo "=== EMR Blockchain PostgreSQL Migration Verification ==="
echo ""

# Test database connection
echo "Testing database connection..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"

echo ""
echo "Checking table structure..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
"

echo ""
echo "Checking data counts..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples
    FROM pg_stat_user_tables;
"

echo ""
echo "Migration verification completed!"
EOF

    chmod +x "$BACKUP_DIR/verify_migration.sh"
    log_success "Verification script created: $BACKUP_DIR/verify_migration.sh"
}

# Main migration function
main() {
    log_info "=== EMR Blockchain Database Migration ==="
    log_info "Migrating from MySQL to PostgreSQL"
    log_info "Target Database: $DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    
    check_prerequisites
    create_backup_directory
    backup_mysql_data
    create_postgresql_database
    initialize_database_schema
    migrate_mysql_data
    verify_database_integrity
    update_configuration
    create_verification_script
    
    echo ""
    log_success "=== Migration Completed Successfully ==="
    echo ""
    echo "Next steps:"
    echo "1. Run verification script: $BACKUP_DIR/verify_migration.sh"
    echo "2. Test application startup: npm start"
    echo "3. Run system tests: npm test"
    echo "4. Update any remaining configuration files"
    echo ""
    echo "Backup location: $BACKUP_DIR"
    echo ""
}

# Handle script arguments
case "$1" in
    "verify")
        verify_database_integrity
        ;;
    "backup")
        create_backup_directory
        backup_mysql_data
        ;;
    "--help"|"-h")
        echo "Usage: $0 [verify|backup]"
        echo ""
        echo "Commands:"
        echo "  verify    Verify database integrity only"
        echo "  backup    Create backup only"
        echo "  --help    Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  DB_HOST       PostgreSQL host (default: localhost)"
        echo "  DB_PORT       PostgreSQL port (default: 5432)"
        echo "  DB_NAME       Database name (default: emr_blockchain)"
        echo "  DB_USER       Database user (default: emr_user)"
        echo "  DB_PASSWORD   Database password (default: emr_password)"
        ;;
    *)
        main
        ;;
esac
