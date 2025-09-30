#!/usr/bin/env node

/**
 * Wrapper script that fetches DATABASE_URL and runs a command with it
 * Usage: node scripts/run-with-db-url.js <command>
 * Example: node scripts/run-with-db-url.js "npx prisma migrate deploy"
 */

const { spawn } = require('child_process');
const awsSecrets = require('../src/utils/aws-secrets');

(async () => {
  try {
    const command = process.argv[2];

    if (!command) {
      console.error('❌ Usage: node scripts/run-with-db-url.js "<command>"');
      process.exit(1);
    }

    const nodeEnv = process.env.NODE_ENV || 'development';
    const isLocal = nodeEnv !== 'production' && nodeEnv !== 'aws';

    let databaseUrl;

    if (isLocal) {
      // Load from .env
      require('dotenv').config();
      databaseUrl = process.env.DATABASE_URL;
      console.log('📝 Using DATABASE_URL from .env');
    } else {
      // Fetch from AWS Secrets Manager
      console.log('☁️  Fetching DATABASE_URL from AWS Secrets Manager...');
      databaseUrl = await awsSecrets.getDatabaseURL();
      console.log('✅ DATABASE_URL fetched successfully');
    }

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not available');
    }

    // Run the command with DATABASE_URL set
    console.log(`🚀 Running: ${command}`);

    const child = spawn(command, {
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl
      }
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
