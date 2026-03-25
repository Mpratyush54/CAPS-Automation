require('dotenv').config();
const { loadSecrets } = require('./config/infisical');

async function bootstrap() {
    try {
        console.log('🚀 Bootstrapping application credentials...');

        // 1. Fetch secrets dynamically from Infisical using Machine ID
        await loadSecrets();

        // 2. NOW require the actual server implementation.
        // This ensures top-level module constants like process.env.REDIS_HOST
        // are correctly initialized when server.js runs.
        require('./server.js');

    } catch (err) {
        console.error("❌ Failed to bootstrap application:", err.stack);
        process.exit(1);
    }
}

bootstrap();
