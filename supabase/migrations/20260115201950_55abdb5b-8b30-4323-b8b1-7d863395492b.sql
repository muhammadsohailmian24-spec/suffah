-- Drop the overly permissive policy
DROP POLICY IF EXISTS submissions_insert ON public.submissions;

-- Create policy that only allows students to submit their own assignments
CREATE POLICY "submissions_insert_own" ON public.submissions
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  )
);