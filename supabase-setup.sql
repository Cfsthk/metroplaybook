-- Run this SQL in the Supabase Dashboard → SQL Editor to set up the storage table.

create table if not exists playbook_states (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Insert a placeholder row so the first upsert always succeeds.
insert into playbook_states (id, data)
values ('main', '{"playbooks":[]}')
on conflict (id) do nothing;

-- Optional: restrict access so only authenticated users can read/write.
-- If your app uses anonymous access (anon key), leave RLS disabled or
-- add a policy that allows the anon role:
--
-- alter table playbook_states enable row level security;
-- create policy "anon read"  on playbook_states for select using (true);
-- create policy "anon write" on playbook_states for all    using (true) with check (true);
