-- Add father_cnic column to parents table for CNIC-based login
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS father_cnic text UNIQUE;

-- Add photo_url column to admissions table for applicant photo
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS photo_url text;

-- Create index for faster CNIC lookups
CREATE INDEX IF NOT EXISTS idx_parents_father_cnic ON public.parents(father_cnic);