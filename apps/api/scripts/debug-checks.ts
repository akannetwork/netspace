
import { supabase } from '../src/config/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function debugChecks() {
    console.log('--- Debugging Checks Table Logic ---');
    console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('SUPABASE_KEY present:', !!process.env.SUPABASE_KEY);

    // 1. Try to list checks (should work if RLS allows or Service Role)
    const { data: list, error: listError } = await supabase.from('checks').select('*').limit(5);
    if (listError) {
        console.error('List Error:', listError);
    } else {
        console.log('List Success. Count:', list?.length);
    }

    // 2. Inspect Table Schema (Skipped)

    console.log('--- Inspecting via Error Message ---');

    // We need a valid tenant ID. Let's try to fetch one.
    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
    if (!tenant) {
        console.log('No tenant found to test insert.');
        return;
    }

    console.log('Attempting Insert for Tenant:', tenant.id);
    // Try to insert just tenant_id and amount, see if it fails on other columns
    const { data: insertData, error: insertError } = await supabase.from('checks').insert({
        tenant_id: tenant.id,
        amount: 50,
        due_date: new Date().toISOString(),
        bank_name: 'Debug Bank',
        check_number: 'DEBUG-002'
    }).select();

    if (insertError) {
        console.error('Insert Error:', insertError);
    } else {
        console.log('Insert Success:', insertData);
    }
}

debugChecks();
