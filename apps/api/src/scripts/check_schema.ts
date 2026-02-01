
import { supabase } from '../config/supabase';

async function checkSchema() {
    console.log('Checking users table schema...');

    // Try to select tenant_id from users
    const { data, error } = await supabase
        .from('users')
        .select('id, tenant_id')
        .limit(1);

    if (error) {
        console.error('Error selecting tenant_id:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('Column tenant_id MISSING');
        }
    } else {
        console.log('Column tenant_id EXISTS');
    }
}

checkSchema();
