-- Add school_section column to students table for campus/branch info
ALTER TABLE public.students 
ADD COLUMN school_section TEXT DEFAULT 'Main';

-- Add a comment to clarify the column purpose
COMMENT ON COLUMN public.students.school_section IS 'School campus/branch: Main, Akhundabad, or J & G';