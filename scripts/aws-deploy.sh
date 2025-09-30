#!/bin/bash

# AWS Deployment Script for My Money Backend
# This script sets up environment and runs database migrations

set -e  # Exit on error

echo "🚀 Starting AWS deployment..."

# Set AWS environment
export NODE_ENV=aws

# Step 1: Setup environment variables from AWS Secrets Manager
echo "📝 Setting up environment variables..."
npm run setup-env

# Step 2: Run Prisma migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Step 3: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Step 4: Start the application
echo "✅ Starting application..."
npm start
