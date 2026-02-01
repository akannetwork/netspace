
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aryqoxtfjjohgknaboby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeXFveHRmampvaGdrbmFib2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQxNzQ5NCwiZXhwIjoyMDg0OTkzNDk0fQ._VGY1ir6hmeap00Zt1Z7td2Yv6xe2a27Ko2lGhMFb0s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTransactions() {
    console.log('Fetching transactions for order #POS-940259-64...');

    // 1. Get Order ID
    const { data: order } = await supabase
        .from('orders')
        .select('id, contact_id')
        .eq('order_number', 'POS-940259-64')
        .single();

    if (!order) {
        console.error('Order not found');
        return;
    }

    console.log('Order found:', order.id);

    // 2. Get Transactions
    const { data: txs, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('order_id', order.id);

    if (error) {
        console.error('Error fetching transactions:', error);
    } else {
        console.table(txs.map(t => ({
            type: t.type,
            category: t.category,
            amount: t.amount,
            description: t.description
        })));
    }
}

checkTransactions();
