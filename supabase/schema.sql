-- Lumen · contrato de base de datos
-- La app de la primera versión no habla con Supabase.
-- Guarda el mismo JSON en localStorage y en data/*.json.
-- Cuando haya cuentas, `document` es el UniverseDocument de src/schema/universe.ts.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.universes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  -- meta.id del documento, para no perder el borrador local al migrar
  local_id text unique,
  slug text unique,
  title text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- UniverseDocument completo: intro, gate, theme, stars[]
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists universes_owner_idx on public.universes (owner_id, updated_at desc);
create index if not exists universes_slug_idx on public.universes (slug) where status = 'published';

-- Progreso de quien recibe el regalo: elecciones de la lista, secretos abiertos, puerta.
-- Equivale a la clave local `lumen.visit.v1.{id}`.
create table if not exists public.universe_visits (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes (id) on delete cascade,
  visitor_key text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (universe_id, visitor_key)
);

alter table public.profiles enable row level security;
alter table public.universes enable row level security;
alter table public.universe_visits enable row level security;

-- El dueño lee y escribe sus universos.
-- Un universo publicado se puede leer sin cuenta: el enlace es la invitación.
-- Las visitas se leen y escriben con el visitor_key que guarda el móvil.

create policy "perfil propio" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "dueño del universo" on public.universes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "regalo publicado, lectura" on public.universes
  for select using (status = 'published');

create policy "visita del regalo" on public.universe_visits
  for all using (true) with check (true);

-- Al crear la cuenta, hace falta una fila en profiles: universes.owner_id apunta ahí.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quien ya tenía cuenta antes del trigger se queda sin fila. Sin ella, el universo no puede guardarse.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Fotos. El JSON guarda la URL, no el archivo.
-- Lectura pública: quien tiene el enlace del universo puede verlas.
-- Escritura solo en la carpeta del propio usuario: {uid}/{foto}.jpg
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

create policy "leer fotos" on storage.objects
  for select using (bucket_id = 'fotos');

create policy "subir las propias" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cambiar las propias" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "borrar las propias" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Contraseña opcional del enlace. Sin ella, el JSON publicado se puede leer con el slug.
alter table public.universes add column if not exists unlock_hash text;

drop policy if exists "regalo publicado, lectura" on public.universes;
create policy "regalo publicado, lectura" on public.universes
  for select using (status = 'published' and coalesce(unlock_hash, '') = '');

create or replace function public.gift_lock(p_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1 from public.universes u
      where u.slug = p_slug and u.status = 'published'
    ) then 'missing'
    when coalesce((
      select u.unlock_hash from public.universes u
      where u.slug = p_slug and u.status = 'published'
      limit 1
    ), '') = '' then 'open'
    else 'locked'
  end;
$$;

create or replace function public.open_gift(p_slug text, p_phrase text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  row public.universes;
  hashed text;
begin
  select * into row
  from public.universes
  where slug = p_slug and status = 'published';
  if not found then
    return null;
  end if;
  if coalesce(row.unlock_hash, '') = '' then
    return row.document;
  end if;
  hashed := encode(digest(convert_to(coalesce(p_phrase, ''), 'utf8'), 'sha256'), 'hex');
  if hashed = row.unlock_hash then
    return row.document;
  end if;
  raise exception 'wrong_phrase';
end;
$$;

grant execute on function public.gift_lock(text) to anon, authenticated;
grant execute on function public.open_gift(text, text) to anon, authenticated;

-- Una sola llamada desde el móvil: estado + documento si hay contraseña correcta.
create or replace function public.read_gift(p_slug text, p_phrase text default '')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  row public.universes;
  hashed text;
  payload jsonb;
begin
  select * into row
  from public.universes
  where slug = p_slug and status = 'published';
  if not found then
    return jsonb_build_object('state', 'missing');
  end if;
  if coalesce(row.unlock_hash, '') <> '' and coalesce(p_phrase, '') = '' then
    return jsonb_build_object('state', 'locked');
  end if;
  begin
    payload := case
      when jsonb_typeof(to_jsonb(row.document)) = 'string' then (to_jsonb(row.document) #>> '{}')::jsonb
      when jsonb_typeof(row.document) = 'string' then (row.document #>> '{}')::jsonb
      else row.document
    end;
  exception when others then
    payload := row.document;
  end;
  if coalesce(row.unlock_hash, '') = '' then
    return jsonb_build_object('state', 'open', 'document', payload);
  end if;
  hashed := encode(digest(convert_to(p_phrase, 'utf8'), 'sha256'), 'hex');
  if hashed = row.unlock_hash then
    return jsonb_build_object('state', 'open', 'document', payload);
  end if;
  return jsonb_build_object('state', 'wrong');
end;
$$;

grant execute on function public.read_gift(text, text) to anon, authenticated;

create or replace function public.ping_gift(
  p_local_id text,
  p_visitor text,
  p_kind text,
  p_date_id text default '',
  p_date_label text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  visitor text := left(coalesce(nullif(p_visitor, ''), 'anon'), 80);
  now_ts timestamptz := now();
  track jsonb;
begin
  if coalesce(p_local_id, '') = '' then
    return;
  end if;
  select u.id into uid
  from public.universes u
  where u.local_id = p_local_id
     or (u.slug = p_local_id and u.status = 'published')
  order by case when u.local_id = p_local_id then 0 else 1 end
  limit 1;
  if uid is null then
    return;
  end if;

  insert into public.universe_visits (universe_id, visitor_key, state, updated_at)
  values (uid, visitor, '{}'::jsonb, now_ts)
  on conflict (universe_id, visitor_key) do nothing;

  select coalesce(state->'track', '{}'::jsonb) into track
  from public.universe_visits
  where universe_id = uid and visitor_key = visitor;

  if p_kind = 'start' then
    track := track || jsonb_build_object(
      'opens', coalesce((track->>'opens')::int, 0) + 1,
      'lastMs', greatest(
        coalesce((track->>'lastMs')::int, 0),
        case
          when coalesce(track->>'startedAt', '') <> '' and coalesce(track->>'lastAt', '') <> ''
          then greatest(0, (extract(epoch from ((track->>'lastAt')::timestamptz - (track->>'startedAt')::timestamptz)) * 1000)::int)
          else 0
        end
      ),
      'startedAt', now_ts
    );
  elsif p_kind = 'pulse' then
    if coalesce(track->>'startedAt', '') = '' then
      track := track || jsonb_build_object('startedAt', now_ts);
    end if;
    track := track || jsonb_build_object(
      'lastMs', greatest(
        coalesce((track->>'lastMs')::int, 0),
        greatest(0, (extract(epoch from (now_ts - (track->>'startedAt')::timestamptz)) * 1000)::int)
      )
    );
  elsif p_kind = 'no' then
    track := track || jsonb_build_object(
      'noTries', coalesce((track->>'noTries')::int, 0) + 1
    );
  elsif p_kind = 'reply' then
    track := track || jsonb_build_object(
      'reply', jsonb_build_object(
        'at', now_ts,
        'answer', 'yes',
        'dateId', left(coalesce(p_date_id, ''), 80),
        'dateLabel', left(coalesce(p_date_label, ''), 180)
      )
    );
  else
    return;
  end if;
  track := track || jsonb_build_object('lastAt', now_ts);

  update public.universe_visits
  set state = coalesce(state, '{}'::jsonb) || jsonb_build_object('track', track),
      updated_at = now_ts
  where universe_id = uid and visitor_key = visitor;
end;
$$;

create or replace function public.my_gift_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_object_agg(s.local_id, s.stat)
    from (
      select
        u.local_id,
        jsonb_build_object(
          'opens', coalesce((select sum(coalesce((v.state->'track'->>'opens')::int, 0)) from public.universe_visits v where v.universe_id = u.id), 0),
          'lastAt', coalesce((select max(v.state->'track'->>'lastAt') from public.universe_visits v where v.universe_id = u.id), ''),
          'lastMs', coalesce((
            select max(greatest(
              coalesce((v.state->'track'->>'lastMs')::int, 0),
              case
                when coalesce(v.state->'track'->>'startedAt', '') <> ''
                  and coalesce(v.state->'track'->>'lastAt', '') <> ''
                then greatest(0, (extract(epoch from ((v.state->'track'->>'lastAt')::timestamptz - (v.state->'track'->>'startedAt')::timestamptz)) * 1000)::int)
                else 0
              end
            ))
            from public.universe_visits v
            where v.universe_id = u.id
          ), 0),
          'noTries', coalesce((select sum(coalesce((v.state->'track'->>'noTries')::int, 0)) from public.universe_visits v where v.universe_id = u.id), 0),
          'reply', (
            select v.state->'track'->'reply'
            from public.universe_visits v
            where v.universe_id = u.id
              and v.state->'track'->'reply' is not null
            order by v.state->'track'->'reply'->>'at' desc nulls last
            limit 1
          )
        ) as stat
      from public.universes u
      where u.owner_id = auth.uid()
        and coalesce(u.local_id, '') <> ''
    ) s
  ), '{}'::jsonb);
$$;

grant execute on function public.ping_gift(text, text, text, text, text) to anon, authenticated;
grant execute on function public.my_gift_stats() to authenticated, anon;

-- Compras. Un pago abre un proyecto.
-- Hoy mock_checkout lo inserta el propio usuario: no cobra.
-- Cuando entren Stripe y el contrato, se apaga este RPC y el alta la hace el servidor.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('cita', 'cita_pro', 'plantilla', 'plantilla_pro')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  rail text not null check (rail in ('card', 'crypto')),
  asset text not null default '',
  network text not null default '',
  wallet text not null default '',
  status text not null default 'paid' check (status in ('paid', 'used')),
  project_id text not null default '',
  mock boolean not null default true,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists purchases_owner_idx on public.purchases (owner_id, created_at desc);

alter table public.purchases enable row level security;

drop policy if exists "ver mis compras" on public.purchases;
create policy "ver mis compras" on public.purchases
  for select using (auth.uid() = owner_id);

create or replace function public.mock_checkout(
  p_plan text,
  p_rail text,
  p_asset text default '',
  p_network text default '',
  p_wallet text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cents integer;
  row public.purchases;
begin
  if uid is null then
    raise exception 'Entra en la cuenta para pagar.';
  end if;
  if p_plan not in ('cita', 'cita_pro', 'plantilla', 'plantilla_pro') then
    raise exception 'Ese plan no existe.';
  end if;
  if p_rail not in ('card', 'crypto') then
    raise exception 'Esa forma de pago no vale.';
  end if;
  cents := case p_plan
    when 'cita' then 295
    when 'cita_pro' then 495
    when 'plantilla' then 1295
    else 1995
  end;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  insert into public.purchases (
    owner_id, plan, amount_cents, currency, rail, asset, network, wallet, status, mock
  )
  values (
    uid,
    p_plan,
    cents,
    'eur',
    p_rail,
    left(coalesce(p_asset, ''), 24),
    left(coalesce(p_network, ''), 32),
    left(coalesce(p_wallet, ''), 80),
    'paid',
    true
  )
  returning * into row;
  return to_jsonb(row);
end;
$$;

create or replace function public.claim_purchase(p_plan text, p_project text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target uuid;
  row public.purchases;
begin
  if uid is null then
    raise exception 'Entra en la cuenta para crear.';
  end if;
  if p_plan not in ('cita', 'cita_pro', 'plantilla', 'plantilla_pro') then
    raise exception 'Ese plan no existe.';
  end if;
  if coalesce(p_project, '') = '' then
    raise exception 'Falta el proyecto.';
  end if;

  select id into target
  from public.purchases
  where owner_id = uid
    and plan = p_plan
    and status = 'paid'
    and used_at is null
  order by created_at
  limit 1
  for update;

  if target is null then
    raise exception 'No tienes ese plan libre.';
  end if;

  update public.purchases
  set status = 'used',
      used_at = now(),
      project_id = left(p_project, 80)
  where id = target
  returning * into row;

  return to_jsonb(row);
end;
$$;

create or replace function public.release_purchase(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.purchases;
begin
  if uid is null then
    raise exception 'Entra en la cuenta para crear.';
  end if;

  update public.purchases
  set status = 'paid',
      used_at = null,
      project_id = ''
  where id = p_id
    and owner_id = uid
    and status = 'used'
    and mock = true
  returning * into row;

  if not found then
    raise exception 'No pude devolver el plan.';
  end if;
  return to_jsonb(row);
end;
$$;

revoke all on function public.mock_checkout(text, text, text, text, text) from public, anon;
revoke all on function public.claim_purchase(text, text) from public, anon;
revoke all on function public.release_purchase(uuid) from public, anon;
grant execute on function public.mock_checkout(text, text, text, text, text) to authenticated;
grant execute on function public.claim_purchase(text, text) to authenticated;
grant execute on function public.release_purchase(uuid) to authenticated;

-- Cobro al publicar. El importe lo calcula la app (src/lib/pricing.ts) y aquí solo se guarda.
create or replace function public.mock_pay(
  p_project text,
  p_family text,
  p_cents integer,
  p_rail text,
  p_asset text default '',
  p_network text default '',
  p_wallet text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.purchases;
  plan text;
begin
  if uid is null then
    raise exception 'Entra en la cuenta para pagar.';
  end if;
  if coalesce(p_project, '') = '' then
    raise exception 'Falta el proyecto.';
  end if;
  if p_family = 'cita' then
    plan := 'cita';
  elsif p_family = 'plantilla' then
    plan := 'plantilla';
  else
    raise exception 'Ese regalo no se cobra.';
  end if;
  if p_cents < 50 or p_cents > 50000 then
    raise exception 'Ese importe no cuadra.';
  end if;
  if p_rail not in ('card', 'crypto') then
    raise exception 'Esa forma de pago no vale.';
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  insert into public.purchases (
    owner_id, plan, amount_cents, currency, rail, asset, network, wallet, status, project_id, mock, used_at
  )
  values (
    uid,
    plan,
    p_cents,
    'eur',
    p_rail,
    left(coalesce(p_asset, ''), 24),
    left(coalesce(p_network, ''), 32),
    left(coalesce(p_wallet, ''), 80),
    'used',
    left(p_project, 80),
    true,
    now()
  )
  returning * into row;
  return to_jsonb(row);
end;
$$;

revoke all on function public.mock_pay(text, text, integer, text, text, text, text) from public, anon;
grant execute on function public.mock_pay(text, text, integer, text, text, text, text) to authenticated;
