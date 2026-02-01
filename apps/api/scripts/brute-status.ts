
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aryqoxtfjjohgknaboby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeXFveHRmampvaGdrbmFib2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNzQ5NCwiZXhwIjoyMDg0OTkzNDk0fQ._VGY1ir6hmeap00Zt1Z7td2Yv6xe2a27Ko2lGhMFb0s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    const statuses = ['confirmed', 'processing', 'received', 'shipped', 'pending'];
    for (const s of statuses) {
        const { error } = await supabase
            .from('orders')
            .update({ status: s })
            .eq('order_number', 'POS-940259-64');

        if (error) {
            console.log(`Status '${s}': FAILED (${error.message})`);
        } else {
            console.log(`Status '${s}': SUCCESS`);
        }
    }
}

checkStatus();
