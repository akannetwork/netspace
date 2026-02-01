
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('--- Checking Tenants Configuration ---');
    console.log('URL:', SUPABASE_URL);

    // 1. Fetch Tenants
    const { data: tenants, error } = await supabase
        .from('tenants')
        .select('*'); // Select ALL columns to see if subscription_features is returned

    if (error) {
        console.error('Error fetching tenants:', error.message);
        return;
    }

    console.log(`Found ${tenants?.length} tenants.`);

    if (tenants && tenants.length > 0) {
        tenants.forEach(t => {
            console.log(`\nTenant: ${t.name} (${t.slug})`);
            // Check if column exists in the returned object
            if ('subscription_features' in t) {
                console.log('subscription_features column status: FOUND');
                console.log('Value:', JSON.stringify(t.subscription_features, null, 2));
            } else {
                console.log('subscription_features column status: MISSING');
                console.log('NOTE: The UI shows features as disabled because the column is missing (default fallback is empty).');
            }
        });
    } else {
        console.log('No tenants found.');
    }
}

main().catch(console.error);
