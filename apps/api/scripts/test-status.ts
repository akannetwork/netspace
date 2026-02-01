
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aryqoxtfjjohgknaboby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeXFveHRmampvaGdrbmFib2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNzQ5NCwiZXhwIjoyMDg0OTkzNDk0fQ._VGY1ir6hmeap00Zt1Z7td2Yv6xe2a27Ko2lGhMFb0s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('Checking status column in orders...');

    const { error } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('order_number', 'POS-940259-64');

    if (error) {
        console.error('Update to pending Error:', error.message);
    } else {
        console.log('Update to pending successful');
    }

    const { error: error2 } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('order_number', 'POS-940259-64');

    if (error2) {
        console.error('Update to delivered Error:', error2.message);
    } else {
        console.log('Update to delivered successful');
    }
}

checkStatus();
