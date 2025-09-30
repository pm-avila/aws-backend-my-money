const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const path = require('path');

class AWSSecretsManager {
  constructor() {
    this.isLocal = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'aws';
    this.secretName = process.env.SECRET_NAME || 'my-money-backend-secrets';
    this.client = null;

    if (!this.isLocal) {
      this.client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
      });
    } else {
      require('dotenv').config();
    }
  }

  async getSecretValue(secretName = null) {
    if (this.isLocal) {
      // Return local .env values for development
      // DATABASE_URL comes as complete string from .env
      // JWT_SECRET is handled as direct environment variable
      return {
        DATABASE_URL: process.env.DATABASE_URL
      };
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName || this.secretName
      });

      const response = await this.client.send(command);

      if (response.SecretString) {
        return JSON.parse(response.SecretString);
      } else {
        // Binary secrets not supported in this implementation
        throw new Error('Binary secrets are not supported');
      }
    } catch (error) {
      console.error('Error retrieving secret:', error);
      throw new Error(`Failed to retrieve secret: ${error.message}`);
    }
  }

  async getDatabaseURL() {
    const secrets = await this.getSecretValue();

    if (this.isLocal) {
      // In development, DATABASE_URL is a complete string
      return secrets.DATABASE_URL;
    }

    // In production, use all fields from RDS secret
    const { host, username, password, port, dbname } = secrets;

    if (!host || !username || !password || !dbname) {
      throw new Error('Missing required RDS secret parameters: host, username, password, dbname');
    }

    const dbPort = port || '5432';
    return `postgresql://${username}:${password}@${host}:${dbPort}/${dbname}`;
  }

  async getJWTSecret() {
    // JWT_SECRET is now a direct environment variable, not stored in secrets
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return jwtSecret;
  }

  async getConfig() {
    const databaseUrl = await this.getDatabaseURL();
    const jwtSecret = await this.getJWTSecret();

    // PORT is handled as a direct environment variable, not stored in secrets
    return {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: jwtSecret,
      PORT: process.env.PORT || '3000'
    };
  }
}

module.exports = new AWSSecretsManager();