#!/usr/bin/env node

/**
 * Setup environment variables for Prisma CLI
 * This script loads DATABASE_URL from AWS Secrets Manager and writes it to .env
 * Must be run before Prisma CLI commands (migrate, generate, etc.)
 */

const awsSecrets = require('../src/utils/aws-secrets');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    console.log('🔧 Setting up environment variables for Prisma...');

    const isLocal = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'aws';

    if (isLocal) {
      console.log('📝 Local environment detected - using existing .env file');
      process.exit(0);
    }

    console.log('☁️  AWS environment detected - fetching DATABASE_URL from Secrets Manager...');

    // Get DATABASE_URL from AWS Secrets Manager
    const databaseUrl = await awsSecrets.getDatabaseURL();

    // Write to .env file for Prisma CLI
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = `DATABASE_URL="${databaseUrl}"\n`;

    fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

    console.log('✅ .env file created successfully with DATABASE_URL');
    console.log('✅ Prisma CLI can now read DATABASE_URL from .env');

  } catch (error) {
    console.error('❌ Failed to setup environment:', error.message);
    process.exit(1);
  }
})();
