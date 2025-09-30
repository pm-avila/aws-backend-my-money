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

    const nodeEnv = process.env.NODE_ENV || 'development';
    const isLocal = nodeEnv !== 'production' && nodeEnv !== 'aws';

    if (isLocal) {
      console.log('📝 Local environment detected - using existing .env file');
      process.exit(0);
    }

    console.log('☁️  AWS environment detected - fetching DATABASE_URL from Secrets Manager...');

    // Get DATABASE_URL from AWS Secrets Manager
    const databaseUrl = await awsSecrets.getDatabaseURL();

    // Set as environment variable for current process
    process.env.DATABASE_URL = databaseUrl;

    // Write to .env file for Prisma CLI (backup method)
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = `DATABASE_URL="${databaseUrl}"\n`;

    fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

    console.log('✅ DATABASE_URL configured successfully');
    console.log('✅ Environment variable set and .env file created');

  } catch (error) {
    console.error('❌ Failed to setup environment:', error.message);
    process.exit(1);
  }
})();
