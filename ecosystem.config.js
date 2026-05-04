module.exports = {
  apps: [
    {
      name: 'travel-planner-api',
      script: 'server.js',
      instances: 1,            // Use 1 on t3.small (2 vCPUs, 2GB RAM)
      exec_mode: 'fork',       // Fork mode is simpler and stable for small instances
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        AWS_REGION: 'ap-south-1',
      },
      error_file: '~/.pm2/logs/travel-planner-error.log',
      out_file: '~/.pm2/logs/travel-planner-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '400M',
    },
  ],
};
