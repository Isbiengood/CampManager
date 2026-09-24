-- CampManager Open Source
-- 0002_mobile_api.sql
-- Browser API. No direct table access is granted.

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
    raise exception 'Accès temporairement verrouillé. Réessayez dans quelques minutes.';
  end if;

  if v_personne.pin_hash is null then
    raise exception 'Accès V4 non configuré pour ce prénom.';
  end if;

  if extensions.crypt(coalesce(p_pin, ''), v_personne.pin_hash) <> v_personne.pin_hash then
    update public.personnel
    set pin_failed_attempts = pin_failed_attempts + 1,
        pin_locked_until =
          case
            when pin_failed_attempts + 1 >= 5
              then now() + interval '10 minutes'
            else null
          end
    where id = v_personne.id
      and camping_id = v_camping.id;

    raise exception 'Prénom ou code PIN incorrect.';
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
begin
  if p_nouveau_pin is null or p_nouveau_pin !~ '^[0-9]{4,8}$' then
    raise exception 'Le PIN doit contenir entre 4 et 8 chiffres.';
  end if;

  if p_code_activation is null or p_code_activation !~ '^[0-9]{6}$' then
    raise exception 'Le code d’activation doit contenir 6 chiffres.';
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
    raise exception 'Aucun code d’activation valide. Demandez une réinitialisation au responsable.';
  end if;

  if v_personne.activation_failed_attempts >= 5 then
    raise exception 'Trop de codes d’activation erronés. Demandez un nouveau code au responsable.';
  end if;

  if extensions.crypt(p_code_activation, v_personne.activation_code_hash)
     <> v_personne.activation_code_hash then
    update public.personnel
    set activation_failed_attempts = activation_failed_attempts + 1
    where id = v_personne.id
      and camping_id = v_camping.id;

    raise exception 'Code d’activation incorrect.';
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


create or replace function public.charger_logements_multicamping_v4(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_personne public.personnel%rowtype;
  v_camping public.campings%rowtype;
  v_logements jsonb := '[]'::jsonb;
  v_a_venir jsonb := '[]'::jsonb;
begin
  select p.*
    into v_personne
  from public.sessions_v4 s
  join public.personnel p
    on p.id = s.personnel_id
   and p.camping_id = s.camping_id
  where s.token_hash = extensions.digest(coalesce(p_token, ''), 'sha256')
    and s.expires_at > now()
    and p.actif = true
    and p.disponible = true
    and p.source = 'Google Drive'
  limit 1;

  if v_personne.id is null then
    raise exception 'Session expirée ou invalide.';
  end if;

  select *
    into v_camping
  from public.campings c
  where c.id = v_personne.camping_id
    and c.actif = true
  limit 1;

  if v_camping.id is null then
    raise exception 'Camping inconnu ou inactif.';
  end if;

  update public.sessions_v4
  set last_seen_at = now()
  where token_hash = extensions.digest(p_token, 'sha256')
    and camping_id = v_camping.id;

  select coalesce(
    jsonb_agg(item order by ordre_priorite, logement),
    '[]'::jsonb
  )
  into v_logements
  from (
    select
      case
        when t.priorite = '⚠️' then 0
        when t.priorite = '🔴' then 1
        when t.priorite = '🟣' then 2
        when t.priorite = '🔵' then 3
        else 9
      end as ordre_priorite,
      l.numero as logement,
      jsonb_build_object(
        'tacheId', t.id,
        'logementId', l.id,
        'logement', l.numero,
        'categorie', coalesce(l.categorie, ''),
        'personnel', coalesce((
          select string_agg(px.prenom, '/' order by px.prenom)
          from public.affectations_menage ax
          join public.personnel px
            on px.id = ax.personnel_id
           and px.camping_id = ax.camping_id
          where ax.tache_id = t.id
            and ax.camping_id = v_camping.id
        ), ''),
        'priorite', t.priorite,
        'acces', t.acces,
        'etatMenage', t.etat_menage,
        'etatReception', coalesce(t.etat_reception, ''),
        'gouvernante', coalesce(g.prenom, ''),
        'telephoneAttente', coalesce(t.telephone_attente, ''),
        'depart', t.depart,
        'arriveeSuivante', t.arrivee_suivante,
        'mode',
          case
            when v_personne.role_femme_chambre
              and exists (
                select 1
                from public.affectations_menage a
                where a.tache_id = t.id
                  and a.personnel_id = v_personne.id
                  and a.camping_id = v_camping.id
              )
              and t.etat_menage = 'À faire'
              then case
                when v_personne.role_gouvernante
                  then 'menage_controle'
                else 'menage'
              end
            when v_personne.role_gouvernante
              and t.gouvernante_id = v_personne.id
              and t.etat_menage in ('À vérifier', 'À recontrôler')
              then 'controle'
            else ''
          end,
        'actionSuivante',
          case
            when v_personne.role_femme_chambre
              and exists (
                select 1
                from public.affectations_menage a
                where a.tache_id = t.id
                  and a.personnel_id = v_personne.id
                  and a.camping_id = v_camping.id
              )
              and t.etat_menage = 'À faire'
              then case
                when v_personne.role_gouvernante then 'Prêt'
                else 'À vérifier'
              end
            when v_personne.role_gouvernante
              and t.gouvernante_id = v_personne.id
              and t.etat_menage in ('À vérifier', 'À recontrôler')
              then 'Prêt'
            else ''
          end,
        'updatedAt', t.updated_at
      ) as item
    from public.taches_menage t
    join public.logements l
      on l.id = t.logement_id
     and l.camping_id = t.camping_id
    left join public.personnel g
      on g.id = t.gouvernante_id
     and g.camping_id = t.camping_id
    where t.camping_id = v_camping.id
      and l.actif = true
      and t.etat_menage <> 'Prêt'
      and t.source = 'Google Drive'
      and (
        (
          v_personne.role_femme_chambre
          and t.etat_menage = 'À faire'
          and exists (
            select 1
            from public.affectations_menage a
            where a.tache_id = t.id
              and a.personnel_id = v_personne.id
              and a.camping_id = v_camping.id
          )
        )
        or
        (
          v_personne.role_gouvernante
          and t.gouvernante_id = v_personne.id
          and t.etat_menage in ('À vérifier', 'À recontrôler')
        )
      )
  ) q;

  select coalesce(
    jsonb_agg(item order by ordre_priorite, logement),
    '[]'::jsonb
  )
  into v_a_venir
  from (
    select
      case
        when t.priorite = '⚠️' then 0
        when t.priorite = '🔴' then 1
        when t.priorite = '🟣' then 2
        when t.priorite = '🔵' then 3
        else 9
      end as ordre_priorite,
      l.numero as logement,
      jsonb_build_object(
        'tacheId', t.id,
        'logementId', l.id,
        'logement', l.numero,
        'categorie', coalesce(l.categorie, ''),
        'personnel', coalesce((
          select string_agg(px.prenom, '/' order by px.prenom)
          from public.affectations_menage ax
          join public.personnel px
            on px.id = ax.personnel_id
           and px.camping_id = ax.camping_id
          where ax.tache_id = t.id
            and ax.camping_id = v_camping.id
        ), ''),
        'priorite', t.priorite,
        'acces', t.acces,
        'etatMenage', t.etat_menage,
        'etatReception', coalesce(t.etat_reception, ''),
        'gouvernante', coalesce(g.prenom, ''),
        'mode', 'a_venir',
        'actionSuivante', '',
        'updatedAt', t.updated_at
      ) as item
    from public.taches_menage t
    join public.logements l
      on l.id = t.logement_id
     and l.camping_id = t.camping_id
    left join public.personnel g
      on g.id = t.gouvernante_id
     and g.camping_id = t.camping_id
    where t.camping_id = v_camping.id
      and l.actif = true
      and t.source = 'Google Drive'
      and v_personne.role_gouvernante
      and t.etat_menage = 'À faire'
      and t.gouvernante_id = v_personne.id
      and not (
        v_personne.role_femme_chambre
        and exists (
          select 1
          from public.affectations_menage a
          where a.tache_id = t.id
            and a.personnel_id = v_personne.id
            and a.camping_id = v_camping.id
        )
      )
  ) q;

  return jsonb_build_object(
    'prenom', v_personne.prenom,
    'role',
      case
        when v_personne.role_femme_chambre and v_personne.role_gouvernante
          then 'double_role'
        when v_personne.role_gouvernante then 'gouvernante'
        when v_personne.role_femme_chambre then 'femme_de_chambre'
        else 'inconnu'
      end,
    'femmeDeChambre', v_personne.role_femme_chambre,
    'gouvernante', v_personne.role_gouvernante,
    'campingCode', v_camping.code,
    'campingNom', v_camping.nom,
    'logements', v_logements,
    'controlesAVenir', v_a_venir,
    'synchroniseLe', now()
  );
end;
$$;


create or replace function public.avancer_etat_menage_multicamping_v4(
  p_token text,
  p_tache_id uuid,
  p_etat_actuel text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_personne public.personnel%rowtype;
  v_camping public.campings%rowtype;
  v_tache public.taches_menage%rowtype;
  v_logement public.logements%rowtype;
  v_affecte boolean := false;
  v_nouvel_etat text;
begin
  select p.*
    into v_personne
  from public.sessions_v4 s
  join public.personnel p
    on p.id = s.personnel_id
   and p.camping_id = s.camping_id
  where s.token_hash = extensions.digest(coalesce(p_token, ''), 'sha256')
    and s.expires_at > now()
    and p.actif = true
    and p.disponible = true
    and p.source = 'Google Drive'
  limit 1;

  if v_personne.id is null then
    raise exception 'Session expirée ou invalide.';
  end if;

  select *
    into v_camping
  from public.campings c
  where c.id = v_personne.camping_id
    and c.actif = true
  limit 1;

  if v_camping.id is null then
    raise exception 'Camping inconnu ou inactif.';
  end if;

  select *
    into v_tache
  from public.taches_menage
  where id = p_tache_id
    and camping_id = v_camping.id
  for update;

  if v_tache.id is null then
    raise exception 'Tâche introuvable.';
  end if;

  select *
    into v_logement
  from public.logements
  where id = v_tache.logement_id
    and camping_id = v_camping.id;

  if v_logement.id is null then
    raise exception 'Logement non autorisé.';
  end if;

  if v_tache.source <> 'Google Drive' then
    raise exception 'Tâche non autorisée.';
  end if;

  if v_tache.etat_menage <> trim(p_etat_actuel) then
    raise exception 'État déjà modifié.';
  end if;

  if coalesce(trim(v_tache.etat_reception), '') = 'Occupé' then
    raise exception 'Le logement est encore Occupé. La réception doit d’abord le passer sur Parti.';
  end if;

  select exists (
    select 1
    from public.affectations_menage a
    where a.camping_id = v_camping.id
      and a.tache_id = v_tache.id
      and a.personnel_id = v_personne.id
  )
  into v_affecte;

  if v_tache.etat_menage = 'À faire'
     and v_personne.role_femme_chambre
     and v_affecte then
    if v_personne.role_gouvernante then
      v_nouvel_etat := 'Prêt';
    else
      v_nouvel_etat := 'À vérifier';
    end if;

  elsif v_tache.etat_menage in ('À vérifier', 'À recontrôler')
        and v_personne.role_gouvernante
        and v_tache.gouvernante_id = v_personne.id then
    v_nouvel_etat := 'Prêt';

  else
    raise exception 'Action non autorisée pour ce rôle ou ce logement.';
  end if;

  update public.taches_menage
  set etat_menage = v_nouvel_etat,
      modifie_par = v_personne.prenom
  where id = v_tache.id
    and camping_id = v_camping.id;

  update public.sessions_v4
  set last_seen_at = now()
  where token_hash = extensions.digest(p_token, 'sha256')
    and camping_id = v_camping.id;

  insert into public.historique_actions(
    camping_id,
    tache_id,
    logement_id,
    numero_logement,
    action,
    ancien_etat,
    nouvel_etat,
    acteur_prenom,
    details
  )
  values (
    v_camping.id,
    v_tache.id,
    v_logement.id,
    v_logement.numero,
    'validation_mobile_v4_multicamping',
    v_tache.etat_menage,
    v_nouvel_etat,
    v_personne.prenom,
    jsonb_build_object(
      'source', 'CampManager V4',
      'auth', 'session_pin',
      'camping', v_camping.code
    )
  );

  insert into public.actions_drive_v4(
    camping_id,
    tache_id,
    logement_id,
    numero_logement,
    acteur_prenom,
    ancien_etat,
    nouvel_etat,
    source_tache
  )
  values (
    v_camping.id,
    v_tache.id,
    v_logement.id,
    v_logement.numero,
    v_personne.prenom,
    v_tache.etat_menage,
    v_nouvel_etat,
    v_tache.source
  );

  return jsonb_build_object(
    'ok', true,
    'campingCode', v_camping.code,
    'campingNom', v_camping.nom,
    'logement', v_logement.numero,
    'ancienEtat', v_tache.etat_menage,
    'nouvelEtat', v_nouvel_etat,
    'prenom', v_personne.prenom,
    'driveEnAttente', true,
    'synchroniseLe', now()
  );
end;
$$;


create or replace function public.deconnexion_multicamping_v4(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.sessions_v4
  where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256');

  return jsonb_build_object('ok', true);
end;
$$;


-- No PUBLIC / authenticated execution.
revoke all on function public.connexion_multicamping_v4(text, text, text)
  from public, authenticated;
revoke all on function public.creer_pin_avec_activation_multicamping_v4(text, text, text, text)
  from public, authenticated;
revoke all on function public.charger_logements_multicamping_v4(text)
  from public, authenticated;
revoke all on function public.avancer_etat_menage_multicamping_v4(text, uuid, text)
  from public, authenticated;
revoke all on function public.deconnexion_multicamping_v4(text)
  from public, authenticated;

grant execute on function public.connexion_multicamping_v4(text, text, text)
  to anon;
grant execute on function public.creer_pin_avec_activation_multicamping_v4(text, text, text, text)
  to anon;
grant execute on function public.charger_logements_multicamping_v4(text)
  to anon;
grant execute on function public.avancer_etat_menage_multicamping_v4(text, uuid, text)
  to anon;
grant execute on function public.deconnexion_multicamping_v4(text)
  to anon;
