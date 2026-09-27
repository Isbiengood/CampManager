-- CampManager Open Source — backend smoke test
-- Run after migrations 0001 -> 0005.
-- This script is read-only: it does not create, modify or delete business data.

-- ============================================================
-- 1. TABLES PRINCIPALES
-- ============================================================

select
  to_regclass('public.campings') is not null
    as campings_ok,
  to_regclass('public.personnel') is not null
    as personnel_ok,
  to_regclass('public.logements') is not null
    as logements_ok,
  to_regclass('public.taches_menage') is not null
    as taches_ok,
  to_regclass('public.affectations_menage') is not null
    as affectations_ok,
  to_regclass('public.historique_actions') is not null
    as historique_ok,
  to_regclass('public.sessions_v4') is not null
    as sessions_ok,
  to_regclass('public.actions_drive_v4') is not null
    as actions_ok,
  to_regclass('public.campmanager_bridge_tokens') is not null
    as bridge_tokens_ok,
  to_regclass('public.campmanager_installation_codes') is not null
    as installation_codes_ok;


-- ============================================================
-- 2. RPC MOBILES
-- ============================================================

select
  to_regprocedure(
    'public.connexion_multicamping_v4(text,text,text)'
  ) is not null
    as connexion_rpc_exists,
  to_regprocedure(
    'public.creer_pin_avec_activation_multicamping_v4(text,text,text,text)'
  ) is not null
    as creation_pin_rpc_exists,
  to_regprocedure(
    'public.charger_logements_multicamping_v4(text)'
  ) is not null
    as charger_logements_rpc_exists,
  to_regprocedure(
    'public.avancer_etat_menage_multicamping_v4(text,uuid,text)'
  ) is not null
    as avancer_etat_rpc_exists,
  to_regprocedure(
    'public.deconnexion_multicamping_v4(text)'
  ) is not null
    as deconnexion_rpc_exists;


-- Les RPC mobiles nécessaires sont accessibles à anon.
select
  has_function_privilege(
    'anon',
    'public.connexion_multicamping_v4(text,text,text)',
    'EXECUTE'
  ) as anon_connexion_ok,
  has_function_privilege(
    'anon',
    'public.creer_pin_avec_activation_multicamping_v4(text,text,text,text)',
    'EXECUTE'
  ) as anon_creation_pin_ok,
  has_function_privilege(
    'anon',
    'public.charger_logements_multicamping_v4(text)',
    'EXECUTE'
  ) as anon_charger_logements_ok,
  has_function_privilege(
    'anon',
    'public.avancer_etat_menage_multicamping_v4(text,uuid,text)',
    'EXECUTE'
  ) as anon_avancer_etat_ok,
  has_function_privilege(
    'anon',
    'public.deconnexion_multicamping_v4(text)',
    'EXECUTE'
  ) as anon_deconnexion_ok;


-- ============================================================
-- 3. RPC DRIVE / ADMINISTRATION
-- ============================================================

select
  to_regprocedure(
    'public.obtenir_camping_multicamping_v4(text)'
  ) is not null
    as obtenir_camping_rpc_exists,
  to_regprocedure(
    'public.synchroniser_drive_multicamping_v4(text,jsonb)'
  ) is not null
    as synchroniser_drive_rpc_exists,
  to_regprocedure(
    'public.recuperer_actions_drive_multicamping_v4(text,integer)'
  ) is not null
    as recuperer_actions_rpc_exists,
  to_regprocedure(
    'public.marquer_action_drive_multicamping_v4(text,uuid,text,text)'
  ) is not null
    as marquer_action_rpc_exists,
  to_regprocedure(
    'public.lister_acces_personnel_multicamping_v4(text)'
  ) is not null
    as lister_acces_rpc_exists,
  to_regprocedure(
    'public.changer_actif_personnel_multicamping_v4(text,text,boolean)'
  ) is not null
    as changer_actif_rpc_exists,
  to_regprocedure(
    'public.reinitialiser_acces_personnel_multicamping_v4(text,text)'
  ) is not null
    as reinitialiser_acces_rpc_exists,
  to_regprocedure(
    'public.definir_pin_personnel_multicamping_v4(text,text,text)'
  ) is not null
    as definir_pin_rpc_exists;


-- Les RPC d'administration doivent être bloqués pour anon/authenticated
-- et accessibles à service_role.
select
  not has_function_privilege(
    'anon',
    'public.synchroniser_drive_multicamping_v4(text,jsonb)',
    'EXECUTE'
  ) as anon_drive_blocked,
  not has_function_privilege(
    'authenticated',
    'public.synchroniser_drive_multicamping_v4(text,jsonb)',
    'EXECUTE'
  ) as authenticated_drive_blocked,
  has_function_privilege(
    'service_role',
    'public.synchroniser_drive_multicamping_v4(text,jsonb)',
    'EXECUTE'
  ) as service_drive_ok,
  not has_function_privilege(
    'anon',
    'public.reinitialiser_acces_personnel_multicamping_v4(text,text)',
    'EXECUTE'
  ) as anon_admin_blocked,
  not has_function_privilege(
    'authenticated',
    'public.reinitialiser_acces_personnel_multicamping_v4(text,text)',
    'EXECUTE'
  ) as authenticated_admin_blocked,
  has_function_privilege(
    'service_role',
    'public.reinitialiser_acces_personnel_multicamping_v4(text,text)',
    'EXECUTE'
  ) as service_admin_ok;


-- ============================================================
-- 4. BOOTSTRAP SÉCURISÉ
-- ============================================================

select
  to_regprocedure(
    'public.authentifier_pont_campmanager_v4(text)'
  ) is not null
    as bridge_auth_rpc_exists,
  to_regprocedure(
    'public.bootstrap_installation_campmanager_v4(text,text,text,text,text)'
  ) is not null
    as bootstrap_rpc_exists,
  to_regprocedure(
    'public.creer_code_installation_campmanager_v4(text,integer)'
  ) is not null
    as create_install_code_rpc_exists,
  to_regprocedure(
    'public.revoquer_jeton_pont_campmanager_v4(text)'
  ) is not null
    as revoke_bridge_token_rpc_exists;


select
  not has_function_privilege(
    'anon',
    'public.bootstrap_installation_campmanager_v4(text,text,text,text,text)',
    'EXECUTE'
  ) as anon_bootstrap_blocked,
  not has_function_privilege(
    'authenticated',
    'public.bootstrap_installation_campmanager_v4(text,text,text,text,text)',
    'EXECUTE'
  ) as authenticated_bootstrap_blocked,
  has_function_privilege(
    'service_role',
    'public.bootstrap_installation_campmanager_v4(text,text,text,text,text)',
    'EXECUTE'
  ) as service_bootstrap_ok,
  has_function_privilege(
    'service_role',
    'public.authentifier_pont_campmanager_v4(text)',
    'EXECUTE'
  ) as service_bridge_auth_ok;


-- ============================================================
-- 5. RLS
-- ============================================================

select
  relname,
  relrowsecurity
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and relname in (
    'campings',
    'personnel',
    'logements',
    'taches_menage',
    'affectations_menage',
    'historique_actions',
    'sessions_v4',
    'actions_drive_v4',
    'campmanager_bridge_tokens',
    'campmanager_installation_codes'
  )
order by relname;


-- Résumé : toutes les tables attendues doivent avoir relrowsecurity = true.
select
  count(*) = 10
    and bool_and(c.relrowsecurity)
    as all_expected_tables_have_rls
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and relname in (
    'campings',
    'personnel',
    'logements',
    'taches_menage',
    'affectations_menage',
    'historique_actions',
    'sessions_v4',
    'actions_drive_v4',
    'campmanager_bridge_tokens',
    'campmanager_installation_codes'
  );


-- ============================================================
-- 6. ACCÈS DIRECT AUX TABLES SENSIBLES
-- ============================================================

select
  not has_table_privilege(
    'anon',
    'public.personnel',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as anon_personnel_blocked,
  not has_table_privilege(
    'authenticated',
    'public.personnel',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as authenticated_personnel_blocked,
  not has_table_privilege(
    'anon',
    'public.sessions_v4',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as anon_sessions_blocked,
  not has_table_privilege(
    'authenticated',
    'public.sessions_v4',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as authenticated_sessions_blocked,
  not has_table_privilege(
    'anon',
    'public.campmanager_bridge_tokens',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as anon_bridge_tokens_blocked,
  not has_table_privilege(
    'authenticated',
    'public.campmanager_bridge_tokens',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as authenticated_bridge_tokens_blocked;
