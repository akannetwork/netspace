import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Check Users
    const { data: users, error: uError } = await supabase.from('users').select('*');
    if (uError) console.error('Users Error:', uError);
    console.log(`Total Users: ${users?.length}`);
    users?.forEach(u => console.log(` - User: ${u.id} | Phone: ${u.phone}`));

    // 2. Check Tenants
    const { data: tenants, error: tError } = await supabase.from('tenants').select('*');
    if (tError) console.error('Tenants Error:', tError);
    console.log(`Total Tenants: ${tenants?.length}`);
    tenants?.forEach(t => console.log(` - Tenant: ${t.id} | Slug: ${t.slug} | Status: ${t.status}`));

    // 3. Check Tenant Users
    const { data: tu, error: tuError } = await supabase.from('tenant_users').select('*');
    if (tuError) console.error('TenantUsers Error:', tuError);
    console.log(`Total Tenant Users: ${tu?.length}`);
    tu?.forEach(t => console.log(` - Link: Tenant ${t.tenant_id} <-> User ${t.user_id} | Role: ${t.role}`));

    console.log('--- DIAGNOSTIC END ---');
}

main();
