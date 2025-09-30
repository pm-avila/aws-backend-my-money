const express = require('express');
const cors = require('cors');
const awsSecrets = require('./utils/aws-secrets');
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const categoryRoutes = require('./routes/category.routes');
const transactionRoutes = require('./routes/transaction.routes');

// Initialize AWS secrets or local .env
(async () => {
  try {
    console.log('Initializing application configuration...');

    // Load configuration from AWS Secrets Manager or .env
    const config = await awsSecrets.getConfig();

    // Set environment variables from secrets
    process.env.DATABASE_URL = config.DATABASE_URL;
    process.env.JWT_SECRET = config.JWT_SECRET;
    // PORT is handled as direct environment variable, not from secrets

    console.log(`Configuration loaded from: ${process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'aws' ? 'AWS Secrets Manager' : 'local .env'}`);

    const app = express();

    app.use(cors({
      origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    app.use(express.json());

    app.get('/', (req, res) => {
      res.send('My Money Backend API');
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/account', accountRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/transactions', transactionRoutes);

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🔒 Database URL configured from ${process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'aws' ? 'AWS Secrets Manager' : '.env file'}`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
})();
