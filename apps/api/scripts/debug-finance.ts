
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from root
// Load env from potential paths
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // apps/api/.env if script is in apps/api/scripts
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // Root .env
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') }); // apps/api/.env relative to CWD


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

console.log('--- DB DEBUG SCRIPT ---');
console.log('URL:', SUPABASE_URL ? 'Set' : 'Missing');
console.log('Key:', SUPABASE_KEY ? 'Set (' + SUPABASE_KEY.substring(0, 5) + '...)' : 'Missing');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

async function run() {
    // 1. Check Enum Types (Indirectly by inserting)
    // const testId = ...

    // We need a valid tenant_id. Let's Fetch one or use a dummy if we can't find.
    // Assuming there is at least ONE tenant.
    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();

    if (!tenant) {
        console.error('No tenants found to test with.');
        return;
    }

    console.log('Testing with Tenant:', tenant.id);

    // 2. Try CASH Insert
    console.log('Attemping CASH insert...');
    const { data: cash, error: cashError } = await supabase.from('finance_accounts').insert({
        tenant_id: tenant.id,
        name: 'Debug Cash Account',
        type: 'cash',
        currency: 'TRY'
    }).select().single();

    if (cashError) console.error('CASH Insert Failed:', cashError);
    else {
        console.log('CASH Insert Success:', cash.id);
        // Clean up
        await supabase.from('finance_accounts').delete().eq('id', cash.id);
    }

    // 3. Try CREDIT_CARD Insert
    console.log('Attemping CREDIT_CARD insert...');
    const { data: cc, error: ccError } = await supabase.from('finance_accounts').insert({
        tenant_id: tenant.id,
        name: 'Debug CC Account',
        type: 'credit_card',
        currency: 'TRY'
    }).select().single();

    if (ccError) {
        console.error('CREDIT_CARD Insert Failed:', ccError);
        console.log('Possible Cause: Enum "credit_card" missing or RLS blocking.');
    } else {
        console.log('CREDIT_CARD Insert Success:', cc.id);
        // Clean up
        await supabase.from('finance_accounts').delete().eq('id', cc.id);
    }
}

run().catch(e => console.error(e));
