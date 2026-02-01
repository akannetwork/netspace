const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from apps/api/.env
const envPath = path.resolve(__dirname, '../apps/api/.env');
dotenv.config({ path: envPath });

console.log('Loading env from:', envPath);

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
// Hide full key log for security, just show existence
console.log('Supabase Key Exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env');
    // Hardcode fallback for local dev if env fails to load
    // Assuming standard supabase local ports
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Check Users
    const { data: users, error: uError } = await supabase.from('users').select('*');
    if (uError) console.error('Users Error:', uError);
    if (!users) console.log('No users found.');
    else {
        console.log(`Total Users: ${users.length}`);
        users.forEach(u => console.log(` - User ID: ${u.id} | Phone: ${u.phone}`));
    }

    // 2. Check Tenants
    const { data: tenants, error: tError } = await supabase.from('tenants').select('*');
    if (tError) console.error('Tenants Error:', tError);
    if (!tenants) console.log('No tenants found.');
    else {
        console.log(`Total Tenants: ${tenants.length}`);
        tenants.forEach(t => console.log(` - Tenant ID: ${t.id} | Slug: ${t.slug} | Status: ${t.status}`));
    }

    // 3. Check Tenant Users
    const { data: tu, error: tuError } = await supabase.from('tenant_users').select('*');
    if (tuError) console.error('TenantUsers Error:', tuError);
    if (!tu) console.log('No tenant_users found.');
    else {
        console.log(`Total Tenant Users: ${tu.length}`);
        tu.forEach(t => console.log(` - Link: Tenant ${t.tenant_id} <-> User ${t.user_id} | Role: ${t.role}`));
    }

    console.log('--- DIAGNOSTIC END ---');
}

main();
