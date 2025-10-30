module.exports = {
  apps: [{
    name: 'meu-backend',
    script: './src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'aws',
      PORT: 3001,
      SECRET_NAME: 'money2-backend-dev-secret-rds',
      AWS_REGION: 'us-east-1',
      // JWT_SECRET será injetado via variável de ambiente no application_start.sh
      JWT_SECRET: process.env.JWT_SECRET || ''
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    time: true
  }]
};
