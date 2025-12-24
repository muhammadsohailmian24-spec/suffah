-- Add sms_enabled preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.sms_notifications_enabled IS 'Whether the user wants to receive SMS notifications';