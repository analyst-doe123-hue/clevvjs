// scripts/test-db.js
import { testConnection } from '../lib/databaseManager.js';

async function test() {
    console.log('Testing database connection...');
    const status = await testConnection();
    console.log('Database Status:', status);
    process.exit(0);
}

test().catch(console.error);