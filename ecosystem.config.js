module.exports = {
  apps: [
    {
      name: 'travel-planner-api',
      script: 'server.js',
      instances: 'max',       // Use all CPU cores
      exec_mode: 'cluster',   // Cluster mode for zero-downtime reload
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        AWS_REGION: 'ap-south-1',
      },
      error_file: '/var/log/pm2/travel-planner-error.log',
      out_file: '/var/log/pm2/travel-planner-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '512M',
    },
  ],
};
