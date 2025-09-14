#!/bin/bash

# Vercel build script for blockchain medical system
set -e

echo "Starting build process..."

# Check if react-app directory exists
if [ ! -d "react-app" ]; then
    echo "Error: react-app directory not found!"
    echo "Current directory contents:"
    ls -la
    exit 1
fi

echo "react-app directory found. Contents:"
ls -la react-app/

# Navigate to react-app directory
cd react-app

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building React application..."
npm run build

echo "Build completed successfully!"
echo "Build output:"
ls -la build/
