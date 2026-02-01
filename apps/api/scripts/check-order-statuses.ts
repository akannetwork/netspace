
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aryqoxtfjjohgknaboby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeXFveHRmampvaGdrbmFib2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNzQ5NCwiZXhwIjoyMDg0OTkzNDk0fQ._VGY1ir6hmeap00Zt1Z7td2Yv6xe2a27Ko2lGhMFb0s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDistinctStatuses() {
    console.log('Fetching distinct statuses from orders table...');

    // Using a trick to get distinct values via select if RPC isn't available
    const { data, error } = await supabase
        .from('orders')
        .select('status');

    if (error) {
        console.error('Error fetching statuses:', error);
    } else {
        const statuses = [...new Set(data.map(item => item.status))];
        console.log('Current statuses in DB:', statuses);

        // Find which ones would violate the new constraint: ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
        const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
        const violators = statuses.filter(s => !allowed.includes(s));
        console.log('Violating statuses:', violators);
    }
}

checkDistinctStatuses();
