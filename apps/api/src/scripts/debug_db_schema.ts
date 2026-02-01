
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('--- Inspecting tenants table schema ---');

    // Attempt to select the new column
    const { data, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_features')
        .limit(1);

    if (error) {
        console.error('Column verification failed:', error.message);
        console.log('Use this SQL in Supabase SQL Editor:');
        console.log(`
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS subscription_features JSONB NOT NULL DEFAULT '{
    "office": true,
    "inventory": true,
    "finance": true,
    "orders": true,
    "personnel": true,
    "go": false,
    "portal": false,
    "web": false
}';
        `);
    } else {
        console.log('SUCCESS: subscription_features column exists!');
        console.log('Sample Data:', data);
    }
}

main().catch(console.error);
