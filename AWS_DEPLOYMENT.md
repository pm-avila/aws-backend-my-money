# AWS Deployment Guide

## Overview

This backend uses AWS Secrets Manager to manage database credentials securely. The Prisma CLI requires `DATABASE_URL` to be available as an environment variable before running migrations.

## Prerequisites

1. **AWS RDS PostgreSQL Database** created with Secrets Manager integration
2. **IAM permissions** to read from Secrets Manager
3. **Environment variables** configured in AWS:
   - `SECRET_NAME` - Name of the RDS secret (e.g., `my-money-backend-secrets`)
   - `AWS_REGION` - AWS region (e.g., `us-east-1`)
   - `JWT_SECRET` - JWT secret for authentication
   - `NODE_ENV=aws` or `NODE_ENV=production`
   - `PORT` - Server port (optional, defaults to 3000)

## Deployment Steps

### Option 1: Using the deployment script

```bash
# Set environment variables
export NODE_ENV=aws
export SECRET_NAME=my-money-backend-secrets
export AWS_REGION=us-east-1
export JWT_SECRET=your-jwt-secret

# Run deployment script
./scripts/aws-deploy.sh
```

### Option 2: Manual steps

```bash
# 1. Setup environment (creates .env with DATABASE_URL)
npm run setup-env

# 2. Run database migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Start application
npm start
```

### Option 3: Using npm scripts

```bash
# Run migrations (includes setup-env)
npm run prisma:migrate

# Generate Prisma Client (includes setup-env)
npm run prisma:generate

# Start application
npm start
```

## How It Works

### 1. Setup Environment Script (`scripts/setup-env.js`)

This script:
- Checks if running in AWS environment (`NODE_ENV=aws` or `production`)
- Fetches database credentials from AWS Secrets Manager
- Constructs `DATABASE_URL` from RDS secret fields
- Writes `DATABASE_URL` to `.env` file for Prisma CLI

### 2. AWS Secrets Manager Integration

The RDS secret contains:
```json
{
  "host": "my-db.cluster-xyz.us-east-1.rds.amazonaws.com",
  "username": "admin",
  "password": "generated-password",
  "port": "5432",
  "dbname": "myapp_production"
}
```

The application automatically constructs:
```
DATABASE_URL="postgresql://admin:generated-password@my-db.cluster-xyz.us-east-1.rds.amazonaws.com:5432/myapp_production"
```

## Docker Deployment

If using Docker, add the setup step to your Dockerfile:

```dockerfile
# Run setup and migrations before starting
CMD ["sh", "-c", "npm run setup-env && npx prisma migrate deploy && npx prisma generate && npm start"]
```

## ECS Task Definition Example

```json
{
  "environment": [
    {
      "name": "NODE_ENV",
      "value": "aws"
    },
    {
      "name": "SECRET_NAME",
      "value": "my-money-backend-secrets"
    },
    {
      "name": "AWS_REGION",
      "value": "us-east-1"
    },
    {
      "name": "JWT_SECRET",
      "value": "your-jwt-secret-here"
    },
    {
      "name": "PORT",
      "value": "8080"
    }
  ]
}
```

## Troubleshooting

### Error: Environment variable not found: DATABASE_URL

**Cause**: Prisma CLI is trying to read `DATABASE_URL` before it's set.

**Solution**: Always run `npm run setup-env` before Prisma commands:
```bash
npm run setup-env
npx prisma migrate deploy
```

Or use the wrapper scripts:
```bash
npm run prisma:migrate
```

### Error: Failed to retrieve secret

**Causes**:
1. IAM permissions missing
2. Secret name incorrect
3. AWS region incorrect

**Solution**:
- Verify IAM policy allows `secretsmanager:GetSecretValue`
- Check `SECRET_NAME` environment variable matches RDS secret name
- Verify `AWS_REGION` is correct

## Local Development

In local development (`NODE_ENV=development`):
- Script skips AWS Secrets Manager
- Uses existing `.env` file with `DATABASE_URL`
- No need to run `setup-env` script

```bash
# Local development
npm run dev
```
