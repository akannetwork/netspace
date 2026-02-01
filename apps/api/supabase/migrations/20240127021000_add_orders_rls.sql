-- Enable RLS for Orders and Items
alter table orders enable row level security;
alter table order_items enable row level security;

-- Policy: Allow all for authenticated users (Temporary/Dev)
create policy "Allow all for authenticated" on orders
    for all using (true) with check (true);

create policy "Allow all for authenticated" on order_items
    for all using (true) with check (true);
