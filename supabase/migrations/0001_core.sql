-- CampManager Open Source
-- 0001_core.sql
-- Clean final-state schema: no demo data, no default camping, no historical migration.

create extension if not exists pgcrypto with schema extensions;

create table public.campings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom text not null,
  actif boolean not null default true,
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campings_code_non_vide check (btrim(code) <> ''),
  constraint campings_code_format check (code ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  constraint campings_nom_non_vide check (btrim(nom) <> '')
);

create table public.personnel (
  id uuid primary key default gen_random_uuid(),
  camping_id uuid not null references public.campings(id) on delete cascade,
  prenom text not null,
  nom text,
  role_femme_chambre boolean not null default false,
  role_gouvernante boolean not null default false,
  disponible boolean not null default true,
  actif boolean not null default true,
  source text not null default 'Google Drive',

  pin_hash text,
  pin_changed_at timestamptz,
  pin_failed_attempts integer not null default 0,
  pin_locked_until timestamptz,

  activation_code_hash text,
  activation_expires_at timestamptz,
  activation_failed_attempts integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint personnel_prenom_non_vide check (btrim(prenom) <> '')
);

create table public.logements (
  id uuid primary key default gen_random_uuid(),
  camping_id uuid not null references public.campings(id) on delete cascade,
  numero text not null,
  categorie text,
  actif boolean not null default true,
  source text not null default 'Google Drive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint logements_numero_non_vide check (btrim(numero) <> '')
);

create unique index logements_camping_id_id_unique
  on public.logements(camping_id, id);

create unique index personnel_camping_id_id_unique
  on public.personnel(camping_id, id);

create unique index logements_camping_numero_unique_idx
  on public.logements(camping_id, numero);

create unique index personnel_camping_prenom_unique_idx
  on public.personnel(camping_id, lower(prenom));

create index logements_camping_idx
  on public.logements(camping_id);

create index personnel_camping_idx
  on public.personnel(camping_id);

create table public.taches_menage (
  id uuid primary key default gen_random_uuid(),
  camping_id uuid not null references public.campings(id) on delete cascade,
  logement_id uuid not null,
  etat_menage text not null default 'À faire',
  etat_reception text,
  priorite text not null default '',
  acces text not null default '',
  gouvernante_id uuid,
  telephone_attente text,
  depart date,
  arrivee_suivante date,
  modifie_par text,
  source text not null default 'Google Drive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint taches_menage_logement_unique unique (logement_id),

  constraint taches_menage_etat_check check (
    etat_menage in ('À faire', 'À vérifier', 'À recontrôler', 'Prêt')
  ),

  constraint taches_reception_etat_check check (
    etat_reception is null
    or etat_reception in (
      'Occupé', 'Parti', 'À recontrôler', 'Prêt', 'Libre', 'Indisponible'
    )
  ),

  constraint taches_menage_camping_logement_fkey
    foreign key (camping_id, logement_id)
    references public.logements(camping_id, id)
    on delete cascade,

  constraint taches_menage_camping_gouvernante_fkey
    foreign key (camping_id, gouvernante_id)
    references public.personnel(camping_id, id)
    on delete restrict
);

create unique index taches_menage_camping_id_id_unique
  on public.taches_menage(camping_id, id);

create index taches_menage_camping_idx
  on public.taches_menage(camping_id);

create index taches_menage_etat_idx
  on public.taches_menage(camping_id, etat_menage);

create index taches_menage_gouvernante_idx
  on public.taches_menage(camping_id, gouvernante_id);

create table public.affectations_menage (
  camping_id uuid not null references public.campings(id) on delete cascade,
  tache_id uuid not null,
  personnel_id uuid not null,
  created_at timestamptz not null default now(),

  primary key (tache_id, personnel_id),

  constraint affectations_menage_camping_tache_fkey
    foreign key (camping_id, tache_id)
    references public.taches_menage(camping_id, id)
    on delete cascade,

  constraint affectations_menage_camping_personnel_fkey
    foreign key (camping_id, personnel_id)
    references public.personnel(camping_id, id)
    on delete cascade
);

create index affectations_menage_camping_idx
  on public.affectations_menage(camping_id);

create index affectations_menage_personnel_idx
  on public.affectations_menage(camping_id, personnel_id);

create table public.historique_actions (
  id bigint generated always as identity primary key,
  camping_id uuid not null references public.campings(id) on delete cascade,
  tache_id uuid,
  logement_id uuid,
  numero_logement text,
  action text not null,
  ancien_etat text,
  nouvel_etat text,
  acteur_prenom text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index historique_actions_camping_idx
  on public.historique_actions(camping_id, created_at desc);

create index historique_actions_logement_idx
  on public.historique_actions(camping_id, logement_id, created_at desc);

create index historique_actions_tache_idx
  on public.historique_actions(camping_id, tache_id, created_at desc);

create table public.sessions_v4 (
  token_hash bytea primary key,
  camping_id uuid not null references public.campings(id) on delete cascade,
  personnel_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),

  constraint sessions_v4_camping_personnel_fkey
    foreign key (camping_id, personnel_id)
    references public.personnel(camping_id, id)
    on delete cascade
);

create index sessions_v4_camping_idx
  on public.sessions_v4(camping_id, expires_at);

create index sessions_v4_expires_idx
  on public.sessions_v4(expires_at);

create index sessions_v4_personnel_idx
  on public.sessions_v4(camping_id, personnel_id);

create table public.actions_drive_v4 (
  id uuid primary key default gen_random_uuid(),
  camping_id uuid not null references public.campings(id) on delete cascade,
  tache_id uuid not null,
  logement_id uuid not null,
  numero_logement text not null,
  acteur_prenom text not null,
  ancien_etat text not null,
  nouvel_etat text not null,
  source_tache text not null,
  statut text not null default 'en_attente',
  tentatives integer not null default 0,
  erreur text,
  created_at timestamptz not null default now(),
  leased_at timestamptz,
  processed_at timestamptz,

  constraint actions_drive_statut_check check (
    statut in ('en_attente', 'en_cours', 'applique', 'simule', 'erreur')
  ),

  constraint actions_drive_v4_camping_tache_fkey
    foreign key (camping_id, tache_id)
    references public.taches_menage(camping_id, id)
    on delete cascade,

  constraint actions_drive_v4_camping_logement_fkey
    foreign key (camping_id, logement_id)
    references public.logements(camping_id, id)
    on delete cascade
);

create index actions_drive_v4_camping_idx
  on public.actions_drive_v4(camping_id, statut, created_at);

create index actions_drive_v4_statut_created_idx
  on public.actions_drive_v4(statut, created_at);

create index actions_drive_v4_tache_idx
  on public.actions_drive_v4(camping_id, tache_id);

create or replace function public.mettre_a_jour_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger campings_updated_at
before update on public.campings
for each row execute function public.mettre_a_jour_updated_at();

create trigger personnel_updated_at
before update on public.personnel
for each row execute function public.mettre_a_jour_updated_at();

create trigger logements_updated_at
before update on public.logements
for each row execute function public.mettre_a_jour_updated_at();

create trigger taches_menage_updated_at
before update on public.taches_menage
for each row execute function public.mettre_a_jour_updated_at();

alter table public.campings enable row level security;
alter table public.personnel enable row level security;
alter table public.logements enable row level security;
alter table public.taches_menage enable row level security;
alter table public.affectations_menage enable row level security;
alter table public.historique_actions enable row level security;
alter table public.sessions_v4 enable row level security;
alter table public.actions_drive_v4 enable row level security;

revoke all on table public.campings from anon, authenticated;
revoke all on table public.personnel from anon, authenticated;
revoke all on table public.logements from anon, authenticated;
revoke all on table public.taches_menage from anon, authenticated;
revoke all on table public.affectations_menage from anon, authenticated;
revoke all on table public.historique_actions from anon, authenticated;
revoke all on table public.sessions_v4 from anon, authenticated;
revoke all on table public.actions_drive_v4 from anon, authenticated;
