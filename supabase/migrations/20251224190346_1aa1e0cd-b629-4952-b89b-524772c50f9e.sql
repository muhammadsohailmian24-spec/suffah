-- Create storage bucket for study materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-materials', 
  'study-materials', 
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg']
);

-- Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions', 
  'submissions', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'text/plain', 'application/zip']
);

-- Policies for study-materials bucket (public read, teachers can upload)
CREATE POLICY "Study materials are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-materials');

CREATE POLICY "Teachers can upload study materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'study-materials' 
  AND has_role(auth.uid(), 'teacher'::user_role)
);

CREATE POLICY "Teachers can update their study materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'study-materials' 
  AND has_role(auth.uid(), 'teacher'::user_role)
);

CREATE POLICY "Teachers can delete study materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'study-materials' 
  AND has_role(auth.uid(), 'teacher'::user_role)
);

-- Policies for submissions bucket (students can upload, teachers can view)
CREATE POLICY "Students can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' 
  AND has_role(auth.uid(), 'student'::user_role)
);

CREATE POLICY "Students can view their own submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions' 
  AND (
    has_role(auth.uid(), 'teacher'::user_role) 
    OR has_role(auth.uid(), 'admin'::user_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Students can update their own submissions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can delete their own submissions"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);