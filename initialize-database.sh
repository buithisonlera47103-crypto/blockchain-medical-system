#!/bin/bash

# Database Initialization Script
# This script will initialize the database schema for the EMR blockchain system

echo "=== Database Initialization Script ==="

# Database connection parameters
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="emr_user"
DB_PASSWORD="emr_password"
DB_NAME="emr_blockchain"

# Test database connection
echo "Testing database connection..."
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" 2>/dev/null; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
    echo "Please ensure the database is set up correctly using fix-database-connection.sh"
    exit 1
fi

# Initialize database schema
echo "Initializing database schema..."
if [ -f "database/init/01-schema.sql" ]; then
    echo "Running schema initialization..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/init/01-schema.sql
    if [ $? -eq 0 ]; then
        echo "✓ Schema initialization completed"
    else
        echo "✗ Schema initialization failed"
        exit 1
    fi
else
    echo "Schema file not found, skipping..."
fi

# Initialize sample data
echo "Initializing sample data..."
if [ -f "database/init/02-sample-data.sql" ]; then
    echo "Running sample data initialization..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/init/02-sample-data.sql
    if [ $? -eq 0 ]; then
        echo "✓ Sample data initialization completed"
    else
        echo "⚠ Sample data initialization failed (this may be normal if data already exists)"
    fi
else
    echo "Sample data file not found, skipping..."
fi

# Run migrations
echo "Running database migrations..."
if [ -f "database/init/03-migrations.sql" ]; then
    echo "Running migrations..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/init/03-migrations.sql
    if [ $? -eq 0 ]; then
        echo "✓ Migrations completed"
    else
        echo "⚠ Migrations failed (this may be normal if migrations already applied)"
    fi
else
    echo "Migrations file not found, skipping..."
fi

# Verify database setup
echo "Verifying database setup..."
TABLES=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | wc -l)
if [ "$TABLES" -gt 1 ]; then
    echo "✓ Database contains $((TABLES-1)) tables"
    echo "Tables in database:"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null
else
    echo "⚠ Database appears to be empty"
fi

echo "=== Database initialization completed ==="
