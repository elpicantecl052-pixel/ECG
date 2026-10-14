-- ECG — esquema del Ágora
--
-- Cómo aplicarlo: entra en tu proyecto de Supabase, abre el SQL Editor,
-- pega este archivo entero y pulsa Run. Es idempotente: puedes ejecutarlo
-- más de una vez sin romper nada.
--
-- La seguridad vive aquí, no en el navegador. Cada tabla tiene RLS activado
-- y políticas que describen exactamente quién puede leer y escribir qué.
-- Aunque alguien manipule el JavaScript del cliente, la base de datos
-- rechaza lo que estas reglas no permiten.

-- ============================================================
-- PERFILES
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text unique not null check (handle ~ '^[a-z0-9_.]{3,20}$'),
  bio         text default '' check (char_length(bio) <= 200),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfiles visibles para todos" on public.profiles;
create policy "perfiles visibles para todos"
  on public.profiles for select using (true);

drop policy if exists "cada quien crea su perfil" on public.profiles;
create policy "cada quien crea su perfil"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "cada quien edita su perfil" on public.profiles;
create policy "cada quien edita su perfil"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- TEMAS DE DEBATE
-- ============================================================

create table if not exists public.topics (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 10 and 160),
  created_at  timestamptz not null default now()
);

create index if not exists topics_created_idx on public.topics (created_at desc);

alter table public.topics enable row level security;

drop policy if exists "temas visibles para todos" on public.topics;
create policy "temas visibles para todos"
  on public.topics for select using (true);

drop policy if exists "solo usuarios con sesion crean temas" on public.topics;
create policy "solo usuarios con sesion crean temas"
  on public.topics for insert with check (auth.uid() = author_id);

drop policy if exists "solo el autor borra su tema" on public.topics;
create policy "solo el autor borra su tema"
  on public.topics for delete using (auth.uid() = author_id);

-- ============================================================
-- INTERVENCIONES
--
-- kind describe el papel del mensaje en el debate. Es lo que convierte
-- un hilo en una discusión estructurada y no en una lista de respuestas.
-- ============================================================

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.posts(id) on delete cascade,
  kind        text not null check (kind in ('tesis', 'refutacion', 'matiz')),
  body        text not null check (char_length(body) between 10 and 1200),
  evidence    text check (evidence is null or evidence ~ '^https?://'),
  created_at  timestamptz not null default now()
);

create index if not exists posts_topic_idx on public.posts (topic_id, created_at);

alter table public.posts enable row level security;

drop policy if exists "intervenciones visibles para todos" on public.posts;
create policy "intervenciones visibles para todos"
  on public.posts for select using (true);

drop policy if exists "solo usuarios con sesion intervienen" on public.posts;
create policy "solo usuarios con sesion intervienen"
  on public.posts for insert with check (auth.uid() = author_id);

drop policy if exists "solo el autor borra su intervencion" on public.posts;
create policy "solo el autor borra su intervencion"
  on public.posts for delete using (auth.uid() = author_id);

-- ============================================================
-- VOTOS
--
-- La clave primaria compuesta impide votar dos veces lo mismo: la
-- restriccion la aplica la base de datos, no el navegador.
-- ============================================================

create table if not exists public.votes (
  post_id   uuid not null references public.posts(id) on delete cascade,
  voter_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, voter_id)
);

alter table public.votes enable row level security;

drop policy if exists "votos visibles para todos" on public.votes;
create policy "votos visibles para todos"
  on public.votes for select using (true);

drop policy if exists "cada quien vota por si mismo" on public.votes;
create policy "cada quien vota por si mismo"
  on public.votes for insert with check (auth.uid() = voter_id);

drop policy if exists "cada quien retira su voto" on public.votes;
create policy "cada quien retira su voto"
  on public.votes for delete using (auth.uid() = voter_id);

-- ============================================================
-- REPUTACION
--
-- Calculada, nunca escrita a mano: es la suma de los votos recibidos
-- mas un punto por intervencion aportada. Asi no depende de seguidores
-- ni se puede inflar editando una columna.
-- ============================================================

create or replace view public.reputations as
select
  p.id,
  p.handle,
  coalesce(v.recibidos, 0) + coalesce(c.aportes, 0) as reputation,
  coalesce(c.aportes, 0) as contributions
from public.profiles p
left join (
  select po.author_id, count(*)::int as recibidos
  from public.votes vo
  join public.posts po on po.id = vo.post_id
  group by po.author_id
) v on v.author_id = p.id
left join (
  select author_id, count(*)::int as aportes
  from public.posts
  group by author_id
) c on c.author_id = p.id;

-- ============================================================
-- PERFIL AUTOMATICO AL REGISTRARSE
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, handle)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'handle',
      'usuario_' || substr(new.id::text, 1, 8)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
