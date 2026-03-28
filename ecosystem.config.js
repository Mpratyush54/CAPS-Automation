const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  apps: [
    {
      name: "Automation-api",
      script: "app.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: process.env.PORT || 3010
      },
      env_production: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3010
      },
      out_file: "/dev/stdout",
      error_file: "/dev/stderr",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000
    },
    {
      name: "Automation-worker",
      script: "./worker.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: process.env.WORKER_PORT || 3050
      },
      env_production: {
        NODE_ENV: "production",
        PORT: process.env.WORKER_PORT || 3050
      },
      out_file: "/dev/stdout",
      error_file: "/dev/stderr",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 2000
    }
  ]
};
