alter table orders add column if not exists branch_id uuid references branches(id);
