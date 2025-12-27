-- Allow service role to insert notifications (for edge functions)
CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for notifications table so teachers see them instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;