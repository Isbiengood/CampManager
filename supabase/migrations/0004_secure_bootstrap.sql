-- CampManager Open Source
-- 0004_secure_bootstrap.sql
-- Tenant-bound bridge tokens + one-time installation codes.

create table public.campmanager_bridge_tokens (
  id uuid primary key default gen_random_uuid(),
  camping_id uuid not null references public.campings(id) on delete cascade,
  token_hash text not null unique,
  label text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint campmanager_bridge_tokens_hash_ck
    check (token_hash ~ '^[0-9a-f]{64}$')
);

create index campmanager_bridge_tokens_camping_idx
  on public.campmanager_bridge_tokens(camping_id);

alter table public.campmanager_bridge_tokens enable row level security;

create table public.campmanager_installation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_camping_id uuid references public.campings(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint campmanager_installation_codes_hash_ck
    check (code_hash ~ '^[0-9a-f]{64}$')
);

create index campmanager_installation_codes_valid_idx
  on public.campmanager_installation_codes(expires_at)
  where used_at is null;

alter table public.campmanager_installation_codes enable row level security;


create or replace function public.authentifier_pont_campmanager_v4(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token public.campmanager_bridge_tokens%rowtype;
  v_camping public.campings%rowtype;
begin
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Jeton invalide.';
  end if;

  select t.*
    into v_token
  from public.campmanager_bridge_tokens t
  where t.token_hash = lower(p_token_hash)
    and t.actif = true
    and t.revoked_at is null
  limit 1;

  if v_token.id is null then
    raise exception 'Jeton CampManager invalide.';
  end if;

  select c.*
    into v_camping
  from public.campings c
  where c.id = v_token.camping_id
    and c.actif = true
  limit 1;

  if v_camping.id is null then
    raise exception 'Établissement inconnu ou inactif.';
  end if;

  update public.campmanager_bridge_tokens
  set last_used_at = now()
  where id = v_token.id;

  return jsonb_build_object(
    'ok', true,
    'campingId', v_camping.id,
    'campingCode', v_camping.code,
    'campingNom', v_camping.nom,
    'timezone', v_camping.timezone
  );
end;
$$;


create or replace function public.bootstrap_installation_campmanager_v4(
  p_installation_code_hash text,
  p_bridge_token_hash text,
  p_code text,
  p_nom text,
  p_timezone text default 'Europe/Paris'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_install public.campmanager_installation_codes%rowtype;
  v_code text;
  v_nom text;
  v_timezone text;
  v_camping_id uuid;
begin
  if coalesce(p_installation_code_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Code d’installation invalide.';
  end if;

  if coalesce(p_bridge_token_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Jeton d’installation invalide.';
  end if;

  v_code := lower(trim(coalesce(p_code, '')));
  v_nom := trim(coalesce(p_nom, ''));
  v_timezone := trim(coalesce(nullif(p_timezone, ''), 'Europe/Paris'));

  if v_code !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'Code établissement invalide.';
  end if;

  if length(v_nom) < 2 or length(v_nom) > 120 then
    raise exception 'Nom établissement invalide.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names z
    where z.name = v_timezone
  ) then
    raise exception 'Fuseau horaire invalide : %', v_timezone;
  end if;

  select i.*
    into v_install
  from public.campmanager_installation_codes i
  where i.code_hash = lower(p_installation_code_hash)
  for update;

  if v_install.id is null then
    raise exception 'Code d’installation inconnu.';
  end if;

  if v_install.used_at is not null then
    raise exception 'Ce code d’installation a déjà été utilisé.';
  end if;

  if v_install.expires_at <= now() then
    raise exception 'Ce code d’installation a expiré.';
  end if;

  if exists (
    select 1
    from public.campings c
    where lower(c.code) = v_code
  ) then
    raise exception 'Ce code établissement est déjà utilisé.';
  end if;

  insert into public.campings(
    code,
    nom,
    actif,
    timezone
  )
  values (
    v_code,
    v_nom,
    true,
    v_timezone
  )
  returning id into v_camping_id;

  insert into public.campmanager_bridge_tokens(
    camping_id,
    token_hash,
    label,
    actif
  )
  values (
    v_camping_id,
    lower(p_bridge_token_hash),
    'Installation automatique',
    true
  );

  update public.campmanager_installation_codes
  set used_at = now(),
      used_by_camping_id = v_camping_id
  where id = v_install.id;

  return jsonb_build_object(
    'ok', true,
    'campingId', v_camping_id,
    'campingCode', v_code,
    'campingNom', v_nom,
    'timezone', v_timezone
  );
end;
$$;


create or replace function public.creer_code_installation_campmanager_v4(
  p_label text default null,
  p_validite_heures integer default 168
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_expire timestamptz;
  v_code text;
  v_hash text;
begin
  if p_validite_heures is null
     or p_validite_heures < 1
     or p_validite_heures > 2160 then
    raise exception 'Durée de validité invalide.';
  end if;

  v_expire := now() + make_interval(hours => p_validite_heures);

  v_code :=
    'CM-' ||
    encode(
      extensions.gen_random_bytes(18),
      'hex'
    );

  v_hash :=
    encode(
      extensions.digest(v_code, 'sha256'),
      'hex'
    );

  insert into public.campmanager_installation_codes(
    code_hash,
    label,
    expires_at
  )
  values (
    v_hash,
    nullif(trim(coalesce(p_label, '')), ''),
    v_expire
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'codeInstallation', v_code,
    'expiresAt', v_expire
  );
end;
$$;


create or replace function public.revoquer_jeton_pont_campmanager_v4(
  p_camping_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping_id uuid;
  v_count integer;
begin
  select id
    into v_camping_id
  from public.campings
  where lower(code) = lower(trim(coalesce(p_camping_code, '')))
  limit 1;

  if v_camping_id is null then
    raise exception 'Établissement inconnu.';
  end if;

  update public.campmanager_bridge_tokens
  set actif = false,
      revoked_at = now()
  where camping_id = v_camping_id
    and actif = true
    and revoked_at is null;

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'revoked', v_count
  );
end;
$$;


revoke all on table public.campmanager_bridge_tokens
  from public, anon, authenticated;
revoke all on table public.campmanager_installation_codes
  from public, anon, authenticated;

revoke all on function public.authentifier_pont_campmanager_v4(text)
  from public, anon, authenticated;
revoke all on function public.bootstrap_installation_campmanager_v4(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.creer_code_installation_campmanager_v4(text, integer)
  from public, anon, authenticated;
revoke all on function public.revoquer_jeton_pont_campmanager_v4(text)
  from public, anon, authenticated;

grant execute on function public.authentifier_pont_campmanager_v4(text)
  to service_role;
grant execute on function public.bootstrap_installation_campmanager_v4(text, text, text, text, text)
  to service_role;
grant execute on function public.creer_code_installation_campmanager_v4(text, integer)
  to service_role;
grant execute on function public.revoquer_jeton_pont_campmanager_v4(text)
  to service_role;
