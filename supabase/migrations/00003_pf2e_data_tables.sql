-- ============================================================
-- PF2e Regelwerk Data Tables
-- Stores imported Pathfinder 2e game data
-- ============================================================

-- Ancestries
create table public.pf2e_ancestries (
  id text primary key,
  name text not null,
  source_id text not null unique,
  hp integer not null,
  size text not null check (size in ('tiny', 'small', 'medium', 'large')),
  speed integer not null,
  ability_boosts jsonb not null default '[]',
  ability_flaws jsonb not null default '[]',
  languages jsonb not null default '[]',
  traits jsonb not null default '[]',
  features jsonb not null default '[]',
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

-- Classes
create table public.pf2e_classes (
  id text primary key,
  name text not null,
  source_id text not null unique,
  hp integer not null,
  key_ability jsonb not null,
  proficiencies jsonb not null default '[]',
  skill_trained_count integer not null default 0,
  attack_proficiency text not null,
  defense_proficiency text not null,
  perception text not null,
  fortitude text not null,
  reflex text not null,
  will text not null,
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

-- Feats
create table public.pf2e_feats (
  id text primary key,
  name text not null,
  source_id text not null unique,
  level integer not null default 0,
  feat_type text not null check (feat_type in ('ancestry', 'class', 'skill', 'general', 'archetype')),
  action_cost text not null default 'passive',
  traits jsonb not null default '[]',
  prerequisites jsonb not null default '[]',
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_feats_level on public.pf2e_feats(level);
create index idx_pf2e_feats_feat_type on public.pf2e_feats(feat_type);

-- Spells
create table public.pf2e_spells (
  id text primary key,
  name text not null,
  source_id text not null unique,
  level integer not null default 0,
  traditions jsonb not null default '[]',
  school text,
  components jsonb not null default '[]',
  cast_actions text not null,
  range integer,
  area jsonb,
  save jsonb,
  damage jsonb,
  duration text,
  sustained boolean not null default false,
  traits jsonb not null default '[]',
  description text not null default '',
  heightening jsonb,
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_spells_level on public.pf2e_spells(level);
create index idx_pf2e_spells_traditions on public.pf2e_spells using gin(traditions);

-- Items (weapons, armor, equipment)
create table public.pf2e_items (
  id text primary key,
  name text not null,
  source_id text not null unique,
  item_type text not null check (item_type in ('weapon', 'armor', 'shield', 'consumable', 'equipment', 'treasure')),
  level integer not null default 0,
  price jsonb not null default '{"gp": 0, "sp": 0, "cp": 0}',
  bulk text not null default '0',
  traits jsonb not null default '[]',
  weapon_stats jsonb,
  armor_stats jsonb,
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_items_item_type on public.pf2e_items(item_type);
create index idx_pf2e_items_level on public.pf2e_items(level);

-- Monsters / NPCs
create table public.pf2e_monsters (
  id text primary key,
  name text not null,
  source_id text not null unique,
  level integer not null,
  traits jsonb not null default '[]',
  size text not null check (size in ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan')),
  alignment text,
  hp integer not null,
  ac integer not null,
  fortitude integer not null,
  reflex integer not null,
  will integer not null,
  perception integer not null,
  speed integer not null,
  abilities jsonb not null,
  immunities jsonb not null default '[]',
  resistances jsonb not null default '{}',
  weaknesses jsonb not null default '{}',
  strikes jsonb not null default '[]',
  spellcasting jsonb,
  special_abilities jsonb not null default '[]',
  description text not null default '',
  source text not null default 'Pathfinder Bestiary',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_monsters_level on public.pf2e_monsters(level);

-- ============================================================
-- RLS: PF2e data is read-only for all authenticated users
-- ============================================================

alter table public.pf2e_ancestries enable row level security;
alter table public.pf2e_classes enable row level security;
alter table public.pf2e_feats enable row level security;
alter table public.pf2e_spells enable row level security;
alter table public.pf2e_items enable row level security;
alter table public.pf2e_monsters enable row level security;

-- All authenticated users can read PF2e data
create policy "Anyone can read ancestries" on public.pf2e_ancestries for select using (true);
create policy "Anyone can read classes" on public.pf2e_classes for select using (true);
create policy "Anyone can read feats" on public.pf2e_feats for select using (true);
create policy "Anyone can read spells" on public.pf2e_spells for select using (true);
create policy "Anyone can read items" on public.pf2e_items for select using (true);
create policy "Anyone can read monsters" on public.pf2e_monsters for select using (true);

-- Only service role can write (used by import pipeline)
create policy "Service role can insert ancestries" on public.pf2e_ancestries for insert with check (true);
create policy "Service role can update ancestries" on public.pf2e_ancestries for update using (true);
create policy "Service role can insert classes" on public.pf2e_classes for insert with check (true);
create policy "Service role can update classes" on public.pf2e_classes for update using (true);
create policy "Service role can insert feats" on public.pf2e_feats for insert with check (true);
create policy "Service role can update feats" on public.pf2e_feats for update using (true);
create policy "Service role can insert spells" on public.pf2e_spells for insert with check (true);
create policy "Service role can update spells" on public.pf2e_spells for update using (true);
create policy "Service role can insert items" on public.pf2e_items for insert with check (true);
create policy "Service role can update items" on public.pf2e_items for update using (true);
create policy "Service role can insert monsters" on public.pf2e_monsters for insert with check (true);
create policy "Service role can update monsters" on public.pf2e_monsters for update using (true);
