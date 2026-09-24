-- CampManager Open Source
-- 0003_drive_admin_api.sql
-- Server-only RPCs used through campmanager-v4-bridge.

create or replace function public.obtenir_camping_multicamping_v4(
  p_camping_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping public.campings%rowtype;
begin
  select *
    into v_camping
  from public.campings c
  where lower(trim(c.code)) = lower(trim(coalesce(p_camping_code, '')))
    and c.actif = true
  limit 1;

  if v_camping.id is null then
    raise exception 'Camping inconnu ou inactif.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'campingId', v_camping.id,
    'campingCode', v_camping.code,
    'campingNom', v_camping.nom,
    'timezone', v_camping.timezone
  );
end;
$$;


create or replace function public.synchroniser_drive_multicamping_v4(
  p_camping_code text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping public.campings%rowtype;
  v_item jsonb;
  v_logement_id uuid;
  v_tache_id uuid;
  v_personnel_id uuid;
  v_nb_logements int := 0;
  v_nb_personnel int := 0;
  v_nb_taches int := 0;
  v_nb_affectations int := 0;
  v_nb_protegees int := 0;
  v_nb_retires int := 0;
begin
  if p_payload is null then
    raise exception 'Payload absent';
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

  perform pg_advisory_xact_lock(
    hashtextextended(v_camping.id::text, 420260820)
  );

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(p_payload -> 'personnel', '[]'::jsonb)
    )
  loop
    if nullif(trim(coalesce(v_item ->> 'prenom', '')), '') is null then
      continue;
    end if;

    insert into public.personnel(
      camping_id,
      prenom,
      nom,
      role_femme_chambre,
      role_gouvernante,
      disponible,
      actif,
      source,
      updated_at
    )
    values (
      v_camping.id,
      trim(v_item ->> 'prenom'),
      nullif(trim(coalesce(v_item ->> 'nom', '')), ''),
      coalesce((v_item ->> 'role_femme_chambre')::boolean, false),
      coalesce((v_item ->> 'role_gouvernante')::boolean, false),
      coalesce((v_item ->> 'disponible')::boolean, true),
      coalesce((v_item ->> 'actif')::boolean, true),
      'Google Drive',
      now()
    )
    on conflict (camping_id, (lower(prenom)))
    do update set
      nom = excluded.nom,
      role_femme_chambre = excluded.role_femme_chambre,
      role_gouvernante = excluded.role_gouvernante,
      disponible = excluded.disponible,
      -- actif remains an access-control decision managed server-side.
      actif = public.personnel.actif,
      source = 'Google Drive',
      updated_at = now();

    v_nb_personnel := v_nb_personnel + 1;
  end loop;

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(p_payload -> 'logements', '[]'::jsonb)
    )
  loop
    if nullif(trim(coalesce(v_item ->> 'numero', '')), '') is null then
      continue;
    end if;

    insert into public.logements(
      camping_id,
      numero,
      categorie,
      actif,
      source,
      updated_at
    )
    values (
      v_camping.id,
      trim(v_item ->> 'numero'),
      nullif(trim(coalesce(v_item ->> 'categorie', '')), ''),
      coalesce((v_item ->> 'actif')::boolean, true),
      'Google Drive',
      now()
    )
    on conflict (camping_id, numero)
    do update set
      categorie = excluded.categorie,
      actif = excluded.actif,
      source = 'Google Drive',
      updated_at = now()
    returning id into v_logement_id;

    v_nb_logements := v_nb_logements + 1;
  end loop;

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(p_payload -> 'taches', '[]'::jsonb)
    )
  loop
    v_logement_id := null;
    v_tache_id := null;

    select id
      into v_logement_id
    from public.logements
    where camping_id = v_camping.id
      and numero = trim(v_item ->> 'logement')
    limit 1;

    if v_logement_id is null then
      continue;
    end if;

    select id
      into v_tache_id
    from public.taches_menage
    where camping_id = v_camping.id
      and logement_id = v_logement_id
    limit 1;

    if v_tache_id is not null
       and exists (
         select 1
         from public.actions_drive_v4 a
         where a.camping_id = v_camping.id
           and a.tache_id = v_tache_id
           and a.statut in ('en_attente', 'en_cours')
       ) then
      v_nb_protegees := v_nb_protegees + 1;
      continue;
    end if;

    insert into public.taches_menage(
      camping_id,
      logement_id,
      etat_menage,
      etat_reception,
      priorite,
      acces,
      telephone_attente,
      depart,
      arrivee_suivante,
      modifie_par,
      source,
      created_at,
      updated_at
    )
    values (
      v_camping.id,
      v_logement_id,
      coalesce(
        nullif(trim(v_item ->> 'etat_menage'), ''),
        'À faire'
      ),
      nullif(trim(coalesce(v_item ->> 'etat_reception', '')), ''),
      coalesce(v_item ->> 'priorite', ''),
      coalesce(v_item ->> 'acces', ''),
      nullif(trim(coalesce(v_item ->> 'telephone_attente', '')), ''),
      nullif(v_item ->> 'depart', '')::date,
      nullif(v_item ->> 'arrivee_suivante', '')::date,
      'Google Drive',
      'Google Drive',
      now(),
      now()
    )
    on conflict (logement_id)
    do update set
      camping_id = excluded.camping_id,
      etat_menage = excluded.etat_menage,
      etat_reception = excluded.etat_reception,
      priorite = excluded.priorite,
      acces = excluded.acces,
      telephone_attente = excluded.telephone_attente,
      depart = excluded.depart,
      arrivee_suivante = excluded.arrivee_suivante,
      modifie_par = 'Google Drive',
      source = 'Google Drive',
      updated_at = now()
    returning id into v_tache_id;

    delete from public.affectations_menage
    where camping_id = v_camping.id
      and tache_id = v_tache_id;

    if jsonb_typeof(v_item -> 'personnel') = 'array' then
      for v_personnel_id in
        select p.id
        from public.personnel p
        join jsonb_array_elements_text(
          v_item -> 'personnel'
        ) x(prenom)
          on lower(p.prenom) = lower(trim(x.prenom))
        where p.camping_id = v_camping.id
      loop
        insert into public.affectations_menage(
          camping_id,
          tache_id,
          personnel_id
        )
        values (
          v_camping.id,
          v_tache_id,
          v_personnel_id
        )
        on conflict do nothing;

        v_nb_affectations := v_nb_affectations + 1;
      end loop;
    end if;

    update public.taches_menage
    set gouvernante_id = null
    where id = v_tache_id
      and camping_id = v_camping.id;

    if nullif(trim(coalesce(v_item ->> 'gouvernante', '')), '') is not null then
      update public.taches_menage tm
      set gouvernante_id = p.id
      from public.personnel p
      where tm.id = v_tache_id
        and tm.camping_id = v_camping.id
        and p.camping_id = v_camping.id
        and lower(p.prenom) =
            lower(trim(v_item ->> 'gouvernante'));
    end if;

    v_nb_taches := v_nb_taches + 1;
  end loop;

  -- Grace period prevents temporary payload gaps from making tasks flicker.
  delete from public.affectations_menage a
  using public.taches_menage t, public.logements l
  where a.camping_id = v_camping.id
    and t.camping_id = v_camping.id
    and l.camping_id = v_camping.id
    and a.tache_id = t.id
    and t.logement_id = l.id
    and t.source = 'Google Drive'
    and t.updated_at < now() - interval '3 minutes'
    and not exists (
      select 1
      from jsonb_array_elements(
        coalesce(p_payload -> 'taches', '[]'::jsonb)
      ) x(item)
      where trim(x.item ->> 'logement') = l.numero
    )
    and not exists (
      select 1
      from public.actions_drive_v4 ad
      where ad.camping_id = v_camping.id
        and ad.tache_id = t.id
        and ad.statut in ('en_attente', 'en_cours')
    );

  update public.taches_menage t
  set etat_menage = 'Prêt',
      etat_reception = null,
      priorite = '',
      acces = '',
      gouvernante_id = null,
      telephone_attente = null,
      depart = null,
      arrivee_suivante = null,
      modifie_par = 'Google Drive — tâche retirée',
      updated_at = now()
  from public.logements l
  where t.camping_id = v_camping.id
    and l.camping_id = v_camping.id
    and t.logement_id = l.id
    and t.source = 'Google Drive'
    and t.etat_menage <> 'Prêt'
    and t.updated_at < now() - interval '3 minutes'
    and not exists (
      select 1
      from jsonb_array_elements(
        coalesce(p_payload -> 'taches', '[]'::jsonb)
      ) x(item)
      where trim(x.item ->> 'logement') = l.numero
    )
    and not exists (
      select 1
      from public.actions_drive_v4 ad
      where ad.camping_id = v_camping.id
        and ad.tache_id = t.id
        and ad.statut in ('en_attente', 'en_cours')
    );

  get diagnostics v_nb_retires = row_count;

  return jsonb_build_object(
    'ok', true,
    'campingCode', v_camping.code,
    'campingNom', v_camping.nom,
    'personnel', v_nb_personnel,
    'logements', v_nb_logements,
    'taches', v_nb_taches,
    'affectations', v_nb_affectations,
    'taches_protegees', v_nb_protegees,
    'taches_retirees', v_nb_retires,
    'synchronise_le', now()
  );
end;
$$;


create or replace function public.recuperer_actions_drive_multicamping_v4(
  p_camping_code text,
  p_limite integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping public.campings%rowtype;
  v_result jsonb;
begin
  select *
    into v_camping
  from public.campings c
  where lower(trim(c.code)) = lower(trim(coalesce(p_camping_code, '')))
    and c.actif = true
  limit 1;

  if v_camping.id is null then
    raise exception 'Camping inconnu ou inactif.';
  end if;

  with candidates as (
    select a.id
    from public.actions_drive_v4 a
    where a.camping_id = v_camping.id
      and (
        a.statut = 'en_attente'
        or (
          a.statut = 'en_cours'
          and a.leased_at < now() - interval '10 minutes'
        )
      )
    order by a.created_at
    limit greatest(1, least(coalesce(p_limite, 20), 100))
    for update skip locked
  ),
  claimed as (
    update public.actions_drive_v4 a
    set statut = 'en_cours',
        leased_at = now(),
        tentatives = a.tentatives + 1
    from candidates c
    where a.id = c.id
      and a.camping_id = v_camping.id
    returning a.*
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'tacheId', tache_id,
        'logementId', logement_id,
        'logement', numero_logement,
        'prenom', acteur_prenom,
        'ancienEtat', ancien_etat,
        'nouvelEtat', nouvel_etat,
        'sourceTache', source_tache,
        'tentatives', tentatives,
        'creeLe', created_at,
        'campingCode', v_camping.code
      )
      order by created_at
    ),
    '[]'::jsonb
  )
  into v_result
  from claimed;

  return v_result;
end;
$$;


create or replace function public.marquer_action_drive_multicamping_v4(
  p_camping_code text,
  p_action_id uuid,
  p_statut text,
  p_erreur text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping public.campings%rowtype;
begin
  if p_statut not in ('applique', 'simule', 'erreur', 'en_attente') then
    raise exception 'Statut Drive invalide.';
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

  update public.actions_drive_v4
  set statut = p_statut,
      erreur = nullif(trim(coalesce(p_erreur, '')), ''),
      processed_at =
        case
          when p_statut in ('applique', 'simule', 'erreur')
            then now()
          else null
        end,
      leased_at =
        case
          when p_statut = 'en_attente'
            then null
          else leased_at
        end
  where id = p_action_id
    and camping_id = v_camping.id;

  if not found then
    raise exception 'Action Drive introuvable pour ce camping.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', p_action_id,
    'statut', p_statut,
    'campingCode', v_camping.code
  );
end;
$$;


create or replace function public.lister_acces_personnel_multicamping_v4(
  p_camping_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping_id uuid;
  v_camping_nom text;
  v_result jsonb;
begin
  select c.id, c.nom
    into v_camping_id, v_camping_nom
  from public.campings c
  where lower(trim(c.code)) = lower(trim(p_camping_code))
    and c.actif = true
  limit 1;

  if v_camping_id is null then
    raise exception 'Camping introuvable ou inactif.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'campingCode', p_camping_code,
        'campingNom', v_camping_nom,
        'prenom', p.prenom,
        'actif', p.actif,
        'disponible', p.disponible,
        'pinConfigure', p.pin_hash is not null,
        'activationEnAttente',
          p.activation_code_hash is not null
          and p.activation_expires_at > now(),
        'activationExpireLe', p.activation_expires_at
      )
      order by p.prenom
    ),
    '[]'::jsonb
  )
  into v_result
  from public.personnel p
  where p.camping_id = v_camping_id
    and p.source = 'Google Drive';

  return v_result;
end;
$$;


create or replace function public.changer_actif_personnel_multicamping_v4(
  p_camping_code text,
  p_prenom text,
  p_actif boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping_id uuid;
  v_camping_nom text;
  v_personne public.personnel%rowtype;
begin
  select c.id, c.nom
    into v_camping_id, v_camping_nom
  from public.campings c
  where lower(trim(c.code)) = lower(trim(p_camping_code))
    and c.actif = true
  limit 1;

  if v_camping_id is null then
    raise exception 'Camping introuvable ou inactif.';
  end if;

  select *
    into v_personne
  from public.personnel p
  where p.camping_id = v_camping_id
    and lower(trim(p.prenom)) = lower(trim(p_prenom))
    and p.source = 'Google Drive'
  limit 1
  for update;

  if v_personne.id is null then
    raise exception 'Personnel introuvable pour ce camping.';
  end if;

  update public.personnel
  set actif = coalesce(p_actif, false),
      activation_code_hash =
        case when coalesce(p_actif, false)
          then activation_code_hash else null end,
      activation_expires_at =
        case when coalesce(p_actif, false)
          then activation_expires_at else null end,
      activation_failed_attempts =
        case when coalesce(p_actif, false)
          then activation_failed_attempts else 0 end,
      pin_failed_attempts =
        case when coalesce(p_actif, false)
          then pin_failed_attempts else 0 end,
      pin_locked_until =
        case when coalesce(p_actif, false)
          then pin_locked_until else null end
  where id = v_personne.id
    and camping_id = v_camping_id;

  if coalesce(p_actif, false) = false then
    delete from public.sessions_v4
    where personnel_id = v_personne.id
      and camping_id = v_camping_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'campingCode', p_camping_code,
    'campingNom', v_camping_nom,
    'prenom', v_personne.prenom,
    'actif', coalesce(p_actif, false)
  );
end;
$$;


create or replace function public.reinitialiser_acces_personnel_multicamping_v4(
  p_camping_code text,
  p_prenom text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_camping_id uuid;
  v_camping_nom text;
  v_personne public.personnel%rowtype;
  v_bytes bytea;
  v_num bigint;
  v_code text;
begin
  select c.id, c.nom
    into v_camping_id, v_camping_nom
  from public.campings c
  where lower(trim(c.code)) = lower(trim(p_camping_code))
    and c.actif = true
  limit 1;

  if v_camping_id is null then
    raise exception 'Camping introuvable ou inactif.';
  end if;

  select *
    into v_personne
  from public.personnel p
  where p.camping_id = v_camping_id
    and lower(trim(p.prenom)) = lower(trim(p_prenom))
    and p.source = 'Google Drive'
  limit 1
  for update;

  if v_personne.id is null then
    raise exception 'Personnel introuvable pour ce camping.';
  end if;

  if v_personne.actif <> true then
    raise exception 'Cette personne est inactive. Réactivez-la avant de préparer un accès.';
  end if;

  v_bytes := extensions.gen_random_bytes(4);

  v_num := (
      get_byte(v_bytes, 0)::bigint * 16777216
    + get_byte(v_bytes, 1)::bigint * 65536
    + get_byte(v_bytes, 2)::bigint * 256
    + get_byte(v_bytes, 3)::bigint
  ) % 1000000;

  v_code := lpad(v_num::text, 6, '0');

  update public.personnel
  set pin_hash = null,
      pin_changed_at = null,
      pin_failed_attempts = 0,
      pin_locked_until = null,
      activation_code_hash =
        extensions.crypt(
          v_code,
          extensions.gen_salt('bf', 10)
        ),
      activation_expires_at = now() + interval '24 hours',
      activation_failed_attempts = 0
  where id = v_personne.id
    and camping_id = v_camping_id;

  delete from public.sessions_v4
  where personnel_id = v_personne.id
    and camping_id = v_camping_id;

  return jsonb_build_object(
    'ok', true,
    'campingCode', p_camping_code,
    'campingNom', v_camping_nom,
    'prenom', v_personne.prenom,
    'codeActivation', v_code,
    'expireLe', now() + interval '24 hours'
  );
end;
$$;


create or replace function public.definir_pin_personnel_multicamping_v4(
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
  v_camping_id uuid;
  v_camping_nom text;
  v_personne public.personnel%rowtype;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'Le PIN doit contenir entre 4 et 8 chiffres.';
  end if;

  select c.id, c.nom
    into v_camping_id, v_camping_nom
  from public.campings c
  where lower(trim(c.code)) = lower(trim(p_camping_code))
    and c.actif = true
  limit 1;

  if v_camping_id is null then
    raise exception 'Camping introuvable ou inactif.';
  end if;

  select *
    into v_personne
  from public.personnel p
  where p.camping_id = v_camping_id
    and lower(trim(p.prenom)) = lower(trim(p_prenom))
    and p.actif = true
    and p.source = 'Google Drive'
  limit 1
  for update;

  if v_personne.id is null then
    raise exception 'Personnel réel introuvable pour ce camping.';
  end if;

  update public.personnel
  set pin_hash =
        extensions.crypt(
          p_pin,
          extensions.gen_salt('bf', 10)
        ),
      pin_changed_at = now(),
      pin_failed_attempts = 0,
      pin_locked_until = null
  where id = v_personne.id
    and camping_id = v_camping_id;

  delete from public.sessions_v4
  where personnel_id = v_personne.id
    and camping_id = v_camping_id;

  return jsonb_build_object(
    'ok', true,
    'campingCode', p_camping_code,
    'campingNom', v_camping_nom,
    'prenom', v_personne.prenom,
    'pinConfigure', true
  );
end;
$$;


-- Drive/admin RPCs are server-only.
revoke all on function public.obtenir_camping_multicamping_v4(text)
  from public, anon, authenticated;
revoke all on function public.synchroniser_drive_multicamping_v4(text, jsonb)
  from public, anon, authenticated;
revoke all on function public.recuperer_actions_drive_multicamping_v4(text, integer)
  from public, anon, authenticated;
revoke all on function public.marquer_action_drive_multicamping_v4(text, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.lister_acces_personnel_multicamping_v4(text)
  from public, anon, authenticated;
revoke all on function public.changer_actif_personnel_multicamping_v4(text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.reinitialiser_acces_personnel_multicamping_v4(text, text)
  from public, anon, authenticated;
revoke all on function public.definir_pin_personnel_multicamping_v4(text, text, text)
  from public, anon, authenticated;

grant execute on function public.obtenir_camping_multicamping_v4(text)
  to service_role;
grant execute on function public.synchroniser_drive_multicamping_v4(text, jsonb)
  to service_role;
grant execute on function public.recuperer_actions_drive_multicamping_v4(text, integer)
  to service_role;
grant execute on function public.marquer_action_drive_multicamping_v4(text, uuid, text, text)
  to service_role;
grant execute on function public.lister_acces_personnel_multicamping_v4(text)
  to service_role;
grant execute on function public.changer_actif_personnel_multicamping_v4(text, text, boolean)
  to service_role;
grant execute on function public.reinitialiser_acces_personnel_multicamping_v4(text, text)
  to service_role;
grant execute on function public.definir_pin_personnel_multicamping_v4(text, text, text)
  to service_role;
