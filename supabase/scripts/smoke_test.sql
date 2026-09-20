-- CampManager Open Source — basic backend smoke test

select
  to_regclass('public.campings') is not null as campings_ok,
  to_regclass('public.personnel') is not null as personnel_ok,
  to_regclass('public.logements') is not null as logements_ok,
  to_regclass('public.taches_menage') is not null as taches_ok,
  to_regclass('public.actions_drive_v4') is not null as actions_ok,
  to_regclass('public.campmanager_bridge_tokens') is not null as bridge_tokens_ok;

select
  has_function_privilege('anon', 'public.connexion_multicamping_v4(text,text,text)', 'EXECUTE')
    as anon_connexion_ok,
  not has_function_privilege('authenticated', 'public.synchroniser_drive_multicamping_v4(text,jsonb)', 'EXECUTE')
    as authenticated_drive_blocked,
  has_function_privilege('service_role', 'public.synchroniser_drive_multicamping_v4(text,jsonb)', 'EXECUTE')
    as service_drive_ok;

select
  relname,
  relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
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
