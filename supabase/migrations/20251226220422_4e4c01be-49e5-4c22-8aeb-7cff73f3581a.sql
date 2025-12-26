-- Allow teachers to insert their own teacher record
CREATE POLICY "teachers_insert_own" 
ON public.teachers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'teacher'::user_role));