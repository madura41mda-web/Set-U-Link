-- Migration: 20260913000002_create_issue_photos_bucket.sql
-- Create issue-photos storage bucket and setup storage policies for upload and public access

-- Ensure storage schema exists for local test environments
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Register issue-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'issue-photos',
  'issue-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage Policies for issue-photos bucket
DROP POLICY IF EXISTS "Public read issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload issue photos" ON storage.objects;

CREATE POLICY "Public read issue photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'issue-photos');

CREATE POLICY "Authenticated users upload issue photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'issue-photos' AND
    (auth.role() IN ('authenticated', 'anon') OR auth.uid() IS NOT NULL)
  );
