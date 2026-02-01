-- Enable RLS
alter table contacts enable row level security;
alter table transactions enable row level security;

-- Create Policies (Allow everything for now, or per tenant)
-- Ideally: using `auth.uid()` or session variable. 
-- For this backend service (Node.js), if using Service Role, it bypasses.
-- If using Anon key, we need policies.

-- Policy: Allow all operations for authenticated users (Temporary for dev)
create policy "Allow all for authenticated" on contacts
    for all using (true) with check (true);

create policy "Allow all for authenticated" on transactions
    for all using (true) with check (true);
