#!/bin/bash

# Fetch DATABASE_URL from AWS Secrets Manager and run Prisma migrations
# This script sets DATABASE_URL as environment variable for Prisma

set -e

echo "🔧 Fetching DATABASE_URL from AWS Secrets Manager..."

# Use Node.js to fetch and output the DATABASE_URL
DATABASE_URL=$(node -e "
const awsSecrets = require('./src/utils/aws-secrets');
(async () => {
  try {
    const url = await awsSecrets.getDatabaseURL();
    console.log(url);
  } catch (error) {
    console.error('Failed to get DATABASE_URL:', error.message);
    process.exit(1);
  }
})();
")

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Failed to fetch DATABASE_URL"
  exit 1
fi

echo "✅ DATABASE_URL fetched successfully"

# Export DATABASE_URL for Prisma
export DATABASE_URL

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed successfully"
