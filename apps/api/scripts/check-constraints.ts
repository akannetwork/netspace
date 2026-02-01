
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aryqoxtfjjohgknaboby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeXFveHRmampvZ2tuYWJvYmkiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzY5NDE3NDk0LCJleHAiOjIwODQ5OTM0OTR9._VGY1ir6hmeap00Zt1Z7td2Yv6xe2a27Ko2lGhMFb0s';

// Wait, the key might have changed or I need to be sure.
// Using the one from my previous working script.

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
    console.log('Checking constraints for orders table...');
    const { data: constraints, error } = await supabase.rpc('get_constraints', { t_name: 'orders' });

    // If RPC get_constraints doesn't exist, I'll try to find any migration that has check constraints.
    console.log('Trying direct query for check constraints...');
    const { data, error: err } = await supabase.from('pg_constraint').select('conname, contype, consrc').ilike('conname', '%orders%');
    console.log(data || err);
}

checkConstraints();
