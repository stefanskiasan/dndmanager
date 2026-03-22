-- Add 3D model fields to characters table
alter table public.characters
  add column model_url text,
  add column model_thumbnail_url text,
  add column model_status text not null default 'none'
    check (model_status in ('none', 'pending', 'processing', 'succeeded', 'failed'));

-- Create storage bucket for character models
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-models',
  'character-models',
  true,
  52428800, -- 50MB
  array['model/gltf-binary', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Storage policies: owners can upload/update their character models
create policy "Character owners can upload models"
  on storage.objects for insert
  with check (
    bucket_id = 'character-models'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Character owners can update models"
  on storage.objects for update
  using (
    bucket_id = 'character-models'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view character models"
  on storage.objects for select
  using (bucket_id = 'character-models');
