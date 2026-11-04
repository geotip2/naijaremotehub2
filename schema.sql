-- NaijaRemoteHub database schema
-- Run this entire file in Supabase SQL Editor using the project owner account.
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  is_paid boolean not null default false,
  paid_until timestamptz,
  referred_by uuid references public.users(id) on delete set null,
  bank_name text,
  bank_account text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('membership','commission','withdrawal')),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','success','paid','rejected','failed')),
  paystack_ref text,
  level integer check (level in (1,2,3) or level is null),
  bank_name text,
  bank_account text,
  created_at timestamptz not null default now()
);
create unique index if not exists payments_paystack_ref_unique
  on public.payments(paystack_ref) where paystack_ref is not null and type = 'membership';

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referee_id uuid not null references public.users(id) on delete cascade,
  level integer not null check (level in (1,2,3)),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'success' check (status in ('pending','success','rejected')),
  created_at timestamptz not null default now(),
  unique(referrer_id, referee_id, level)
);

create index if not exists payments_user_created_idx on public.payments(user_id, created_at desc);
create index if not exists referrals_referrer_level_idx on public.referrals(referrer_id, level);

-- Automatically create a profile after Supabase Auth signup. Referral IDs are validated.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_referrer uuid;
begin
  begin
    v_referrer := nullif(new.raw_user_meta_data->>'referred_by','')::uuid;
  exception when invalid_text_representation then
    v_referrer := null;
  end;
  if v_referrer = new.id or not exists(select 1 from public.users where id = v_referrer) then
    v_referrer := null;
  end if;
  insert into public.users(id,email,referred_by)
  values(new.id, coalesce(new.email,''), v_referrer)
  on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS: clients can read their own profile and own transaction history only.
alter table public.users enable row level security;
alter table public.payments enable row level security;
alter table public.referrals enable row level security;
drop policy if exists "members read own profile" on public.users;
create policy "members read own profile" on public.users for select to authenticated using (auth.uid()=id);
drop policy if exists "members update own bank details" on public.users;
create policy "members update own bank details" on public.users for update to authenticated
using (auth.uid()=id) with check (auth.uid()=id);
drop policy if exists "members read own payments" on public.payments;
create policy "members read own payments" on public.payments for select to authenticated using (auth.uid()=user_id);
drop policy if exists "members read own referrals" on public.referrals;
create policy "members read own referrals" on public.referrals for select to authenticated
using (auth.uid()=referrer_id or auth.uid()=referee_id);

-- Never grant client-side balance, paid status, payment or commission writes.
revoke insert, update, delete on public.users from anon, authenticated;
grant update(bank_name,bank_account) on public.users to authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;
revoke insert, update, delete on public.referrals from anon, authenticated;

-- Atomic membership processing; unique reference makes retries safe.
create or replace function public.finalize_membership_payment(p_user_id uuid,p_reference text,p_amount numeric)
returns void language plpgsql security definer set search_path = public
as $$
declare v_ref uuid; v_l2 uuid; v_l3 uuid; v_now timestamptz := now();
begin
  if p_amount <> 25000 or p_reference is null or length(p_reference)<5 then
    raise exception 'Invalid membership payment';
  end if;
  if exists(select 1 from public.payments where paystack_ref=p_reference and type='membership') then
    raise exception 'Payment already processed';
  end if;
  if not exists(select 1 from public.users where id=p_user_id) then raise exception 'Member not found'; end if;
  insert into public.payments(user_id,type,amount,status,paystack_ref)
  values(p_user_id,'membership',25000,'success',p_reference);

  update public.users set is_paid=true, paid_until=v_now + interval '30 days' where id=p_user_id;
  select referred_by into v_ref from public.users where id=p_user_id;
  if v_ref is not null then
    update public.users set balance=balance+8000 where id=v_ref;
    insert into public.payments(user_id,type,amount,status,level) values(v_ref,'commission',8000,'success',1);
    insert into public.referrals(referrer_id,referee_id,level,amount,status) values(v_ref,p_user_id,1,8000,'success') on conflict do nothing;
    select referred_by into v_l2 from public.users where id=v_ref;
    if v_l2 is not null then
      update public.users set balance=balance+4000 where id=v_l2;
      insert into public.payments(user_id,type,amount,status,level) values(v_l2,'commission',4000,'success',2);
      insert into public.referrals(referrer_id,referee_id,level,amount,status) values(v_l2,p_user_id,2,4000,'success') on conflict do nothing;
      select referred_by into v_l3 from public.users where id=v_l2;
      if v_l3 is not null then
        update public.users set balance=balance+2000 where id=v_l3;
        insert into public.payments(user_id,type,amount,status,level) values(v_l3,'commission',2000,'success',3);
        insert into public.referrals(referrer_id,referee_id,level,amount,status) values(v_l3,p_user_id,3,2000,'success') on conflict do nothing;
      end if;
    end if;
  end if;
end;
$$;

-- Admin manual approval is deliberately callable only by service_role (server-side admin route checks email).
create or replace function public.admin_approve_membership(p_user_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.finalize_membership_payment(p_user_id,'admin_'||gen_random_uuid()::text,25000);
end;
$$;

-- Atomic withdrawal reservation prevents simultaneous requests spending the same balance.
create or replace function public.request_withdrawal(p_user_id uuid,p_bank_name text,p_account_number text,p_amount numeric)
returns void language plpgsql security definer set search_path = public
as $$
declare v_balance numeric;
begin
  if p_amount < 1000 or p_amount <> trunc(p_amount) or length(p_account_number)<>10 or length(trim(p_bank_name))<2 then
    raise exception 'Invalid withdrawal details';
  end if;
  select balance into v_balance from public.users where id=p_user_id for update;
  if v_balance is null then raise exception 'Member not found'; end if;
  if p_amount > v_balance then raise exception 'Insufficient balance'; end if;
  update public.users set balance=balance-p_amount,bank_name=trim(p_bank_name),bank_account=p_account_number where id=p_user_id;
  insert into public.payments(user_id,type,amount,status,bank_name,bank_account)
  values(p_user_id,'withdrawal',p_amount,'pending',trim(p_bank_name),p_account_number);
end;
$$;

create or replace function public.admin_set_withdrawal_status(p_payment_id uuid,p_status text)
returns void language plpgsql security definer set search_path = public
as $$
declare v_row public.payments%rowtype;
begin
  if p_status not in ('paid','rejected') then raise exception 'Invalid status'; end if;
  select * into v_row from public.payments where id=p_payment_id and type='withdrawal' for update;
  if not found or v_row.status<>'pending' then raise exception 'Pending withdrawal not found'; end if;
  update public.payments set status=p_status where id=p_payment_id;
  if p_status='rejected' then update public.users set balance=balance+v_row.amount where id=v_row.user_id; end if;
end;
$$;

create or replace function public.get_team_counts(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  with l1 as (select id from public.users where referred_by=p_user_id),
       l2 as (select u.id from public.users u join l1 on u.referred_by=l1.id),
       l3 as (select u.id from public.users u join l2 on u.referred_by=l2.id)
  select jsonb_build_object(
    'level1',(select count(*) from l1),
    'level2',(select count(*) from l2),
    'level3',(select count(*) from l3)
  );
$$;

-- Restrict sensitive RPCs to the backend service role. No browser client can invoke them.
revoke all on function public.finalize_membership_payment(uuid,text,numeric) from public, anon, authenticated;
revoke all on function public.admin_approve_membership(uuid) from public, anon, authenticated;
revoke all on function public.request_withdrawal(uuid,text,text,numeric) from public, anon, authenticated;
revoke all on function public.admin_set_withdrawal_status(uuid,text) from public, anon, authenticated;
revoke all on function public.get_team_counts(uuid) from public, anon, authenticated;
grant execute on function public.finalize_membership_payment(uuid,text,numeric) to service_role;
grant execute on function public.admin_approve_membership(uuid) to service_role;
grant execute on function public.request_withdrawal(uuid,text,text,numeric) to service_role;
grant execute on function public.admin_set_withdrawal_status(uuid,text) to service_role;
grant execute on function public.get_team_counts(uuid) to service_role;
