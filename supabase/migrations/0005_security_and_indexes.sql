-- CampManager Open Source
-- 0005_security_and_indexes.sql
-- Persist authentication failure counters without rolling them back on an exception,
-- and add covering indexes reported by Supabase Advisor.

create or replace function public.connexion_multicamping_v4(
  p_camping_code text,
  p_prenom text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping public.campings%rowtype;
  v_personne public.personnel%rowtype;
  v_token text;
  v_role text;
  v_failed integer;
begin
  delete from public.sessions_v4
  where expires_at <= now();

  select *
    into v_camping
  from public.campings c
  where lower(trim(c.code)) = lower(trim(coalesce(p_camping_code, '')))
    and c.actif = true
  limit 1;

  if v_camping.id is null then
    raise exception 'Camping inconnu ou inactif.';
  end if;

  select *
    into v_personne
  from public.personnel p
  where p.camping_id = v_camping.id
    and lower(trim(p.prenom)) = lower(trim(p_prenom))
    and p.actif = true
    and p.disponible = true
    and p.source = 'Google Drive'
  limit 1;

  if v_personne.id is null then
    raise exception 'Prénom ou code PIN incorrect.';
  end if;

  if v_personne.pin_locked_until is not null
     and v_personne.pin_locked_until > now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'Accès temporairement verrouillé. Réessayez dans quelques minutes.'
    );
  end if;

  if v_personne.pin_hash is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'Accès V4 non configuré pour ce prénom.'
    );
  end if;

  if extensions.crypt(coalesce(p_pin, ''), v_personne.pin_hash)
     <> v_personne.pin_hash then

    v_failed := v_personne.pin_failed_attempts + 1;

    update public.personnel
    set pin_failed_attempts = v_failed,
        pin_locked_until =
          case
            when v_failed >= 5
              then now() + interval '10 minutes'
            else null
          end
    where id = v_personne.id
      and camping_id = v_camping.id;

    return jsonb_build_object(
      'ok', false,
      'error',
        case
          when v_failed >= 5
            then 'Accès temporairement verrouillé. Réessayez dans quelques minutes.'
          else 'Prénom ou code PIN incorrect.'
        end
    );
  end if;

  update public.personnel
  set pin_failed_attempts = 0,
      pin_locked_until = null
  where id = v_personne.id
    and camping_id = v_camping.id;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.sessions_v4(
    token_hash,
    personnel_id,
    camping_id,
    expires_at
  )
  values (
    extensions.digest(v_token, 'sha256'),
    v_personne.id,
    v_camping.id,
    now() + interval '12 hours'
  );

  v_role :=
    case
      when v_personne.role_femme_chambre and v_personne.role_gouvernante
        then 'double_role'
      when v_personne.role_gouvernante
        then 'gouvernante'
      when v_personne.role_femme_chambre
        then 'femme_de_chambre'
      else 'inconnu'
    end;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'prenom', v_personne.prenom,
    'role', v_role,
    'femmeDeChambre', v_personne.role_femme_chambre,
    'gouvernante', v_personne.role_gouvernante,
    'campingCode', v_camping.code,
    'campingNom', v_camping.nom,
    'expireLe', now() + interval '12 hours'
  );
end;
$$;


create or replace function public.creer_pin_avec_activation_multicamping_v4(
  p_camping_code text,
  p_prenom text,
  p_code_activation text,
  p_nouveau_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping public.campings%rowtype;
  v_personne public.personnel%rowtype;
  v_failed integer;
begin
  if p_nouveau_pin is null or p_nouveau_pin !~ '^[0-9]{4,8}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'Le PIN doit contenir entre 4 et 8 chiffres.'
    );
  end if;

  if p_code_activation is null or p_code_activation !~ '^[0-9]{6}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'Le code d’activation doit contenir 6 chiffres.'
    );
  end if;

  select *
    into v_camping
  from public.campings c
  where lower(trim(c.code)) = lower(trim(coalesce(p_camping_code, '')))
    and c.actif = true
  limit 1;

  if v_camping.id is null then
    raise exception 'Camping inconnu ou inactif.';
  end if;

  select *
    into v_personne
  from public.personnel p
  where p.camping_id = v_camping.id
    and lower(trim(p.prenom)) = lower(trim(p_prenom))
    and p.source = 'Google Drive'
  limit 1
  for update;

  if v_personne.id is null
     or v_personne.actif <> true
     or v_personne.disponible <> true then
    raise exception 'Accès non autorisé pour ce prénom.';
  end if;

  if v_personne.activation_code_hash is null
     or v_personne.activation_expires_at is null
     or v_personne.activation_expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'error', 'Aucun code d’activation valide. Demandez une réinitialisation au responsable.'
    );
  end if;

  if v_personne.activation_failed_attempts >= 5 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Trop de codes d’activation erronés. Demandez un nouveau code au responsable.'
    );
  end if;

  if extensions.crypt(p_code_activation, v_personne.activation_code_hash)
     <> v_personne.activation_code_hash then

    v_failed := v_personne.activation_failed_attempts + 1;

    update public.personnel
    set activation_failed_attempts = v_failed
    where id = v_personne.id
      and camping_id = v_camping.id;

    return jsonb_build_object(
      'ok', false,
      'error',
        case
          when v_failed >= 5
            then 'Trop de codes d’activation erronés. Demandez un nouveau code au responsable.'
          else 'Code d’activation incorrect.'
        end
    );
  end if;

  update public.personnel
  set pin_hash = extensions.crypt(
        p_nouveau_pin,
        extensions.gen_salt('bf', 10)
      ),
      pin_changed_at = now(),
      pin_failed_attempts = 0,
      pin_locked_until = null,
      activation_code_hash = null,
      activation_expires_at = null,
      activation_failed_attempts = 0
  where id = v_personne.id
    and camping_id = v_camping.id;

  delete from public.sessions_v4
  where personnel_id = v_personne.id
    and camping_id = v_camping.id;

  return jsonb_build_object(
    'ok', true,
    'prenom', v_personne.prenom,
    'campingCode', v_camping.code,
    'campingNom', v_camping.nom,
    'pinConfigure', true
  );
end;
$$;

revoke all on function public.connexion_multicamping_v4(text, text, text)
  from public, authenticated;
revoke all on function public.creer_pin_avec_activation_multicamping_v4(text, text, text, text)
  from public, authenticated;

grant execute on function public.connexion_multicamping_v4(text, text, text)
  to anon;
grant execute on function public.creer_pin_avec_activation_multicamping_v4(text, text, text, text)
  to anon;

create index if not exists taches_menage_camping_logement_idx
  on public.taches_menage(camping_id, logement_id);

create index if not exists affectations_menage_camping_tache_idx
  on public.affectations_menage(camping_id, tache_id);

create index if not exists actions_drive_v4_camping_logement_idx
  on public.actions_drive_v4(camping_id, logement_id);

create index if not exists campmanager_installation_codes_used_camping_idx
  on public.campmanager_installation_codes(used_by_camping_id)
  where used_by_camping_id is not null;
