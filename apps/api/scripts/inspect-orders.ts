
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aryqoxtfjjohgknaboby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeXFveHRmampvaGdrbmFib2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNzQ5NCwiZXhwIjoyMDg0OTkzNDk0fQ._VGY1ir6hmeap00Zt1Z7td2Yv6xe2a27Ko2lGhMFb0s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'orders' });
    if (error) {
        // Fallback to direct query if rpc doesn't exist
        console.log('RPC get_table_info not found, trying query...');
        const { data: cols, error: err2 } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, column_default')
            .eq('table_name', 'orders')
            .eq('table_schema', 'public');

        if (err2) {
            console.error('Error:', err2);
        } else {
            console.table(cols);
        }
    } else {
        console.log(data);
    }
}

inspectTable();
