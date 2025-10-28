const express = require('express');
const cors = require('cors');
const awsSecrets = require('./utils/aws-secrets');

// Initialize AWS secrets or local .env BEFORE importing routes
(async () => {
  try {
    console.log('🔧 Initializing application configuration...');

    // CRITICAL: Load configuration from AWS Secrets Manager or .env FIRST
    const config = await awsSecrets.getConfig();

    // Set environment variables BEFORE importing routes (which may use Prisma)
    process.env.DATABASE_URL = config.DATABASE_URL;
    process.env.JWT_SECRET = config.JWT_SECRET;
    // PORT is handled as direct environment variable, not from secrets

    console.log(`✅ Configuration loaded from: ${process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'aws' ? 'AWS Secrets Manager' : 'local .env'}`);
    console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'MISSING'}`);
    console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'configured' : 'MISSING'}`);

    // NOW import routes (after DATABASE_URL is set)
    const healthRoutes = require('./routes/health.routes');
    const authRoutes = require('./routes/auth.routes');
    const accountRoutes = require('./routes/account.routes');
    const categoryRoutes = require('./routes/category.routes');
    const transactionRoutes = require('./routes/transaction.routes');

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

    // Health check route for AWS Load Balancer (no auth required)
    app.use('/health', healthRoutes);

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
