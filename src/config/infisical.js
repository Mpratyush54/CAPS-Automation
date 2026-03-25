const { InfisicalSDK } = require('@infisical/sdk');

async function loadSecrets() {
    // We expect INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET to be in the local environment
    // (e.g. injected by Kubernetes or present in a local .env file)
    const clientId = process.env.INFISICAL_CLIENT_ID?.trim();
    const clientSecret = process.env.INFISICAL_CLIENT_SECRET?.trim();
    const projectId = process.env.INFISICAL_PROJECT_ID?.trim();
    const INFISICAL_URL = process.env.INFISICAL_URL?.trim();

    if (!clientId || !clientSecret || !projectId) {
        console.warn('⚠️ Infisical Machine ID credentials missing. Relying on local .env variables...');
        return;
    }

    try {
        console.log('🔒 Connecting to Infisical using Machine Identity...');
        console.log(clientId, clientSecret, projectId, INFISICAL_URL);

        let url = INFISICAL_URL || "https://app.infisical.com";
        if (url.endsWith('/')) url = url.slice(0, -1);

        const client = new InfisicalSDK({
            siteUrl: url
        });

        // Authenticate using Universal Auth (Machine Identity)
        await client.auth().universalAuth.login({
            clientId: clientId,
            clientSecret: clientSecret
        });

        console.log('✅ Infisical Machine Identity authenticated. Fetching secrets...');

        // Fetch all secrets for the given project & environment
        const { secrets } = await client.secrets().listSecrets({
            environment: process.env.INFISICAL_ENV || "dev",
            projectId: projectId,
            path: process.env.INFISICAL_PATH || "/",
            includeImports: true
        });

        // Inject them into process.env so native code can use them transparently
        let count = 0;
        if (secrets && Array.isArray(secrets)) {
            secrets.forEach(secret => {
                if (!process.env[secret.secretKey]) {
                    process.env[secret.secretKey] = secret.secretValue;
                    count++;
                }
            });
        }

        console.log(`✅ Successfully injected ${count} secrets from Infisical into process.env`);

    } catch (err) {
        console.error('❌ Failed to load secrets from Infisical:', err.message);
        // Depending on your strictness, you might want to throw the error to halt startup:
        // throw err;
    }
}

module.exports = { loadSecrets };
