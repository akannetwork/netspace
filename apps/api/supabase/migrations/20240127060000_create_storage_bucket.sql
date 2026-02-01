-- Create the 'media' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow Public Read Access
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- Policy: Allow Authenticated Insert
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'media' AND auth.role() = 'authenticated' );

-- Policy: Allow Authenticated Update
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'media' AND auth.role() = 'authenticated' );

-- Policy: Allow Authenticated Delete
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'media' AND auth.role() = 'authenticated' );
