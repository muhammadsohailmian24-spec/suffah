-- Create a system_settings table to store all settings as key-value pairs
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can read settings" 
ON public.system_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update settings" 
ON public.system_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
('school_info', '{"name": "The Suffah School", "address": "123 Education Street, Knowledge City", "phone": "+1 234 567 890", "email": "info@thesuffah.edu", "website": "www.thesuffah.edu", "motto": "Excellence in Education"}'),
('academic_settings', '{"currentYear": "2024-2025", "currentSemester": "1", "gradeScale": "percentage", "passingMarks": "40"}'),
('notification_settings', '{"emailEnabled": true, "smsEnabled": true, "pushEnabled": false, "attendanceAlerts": true, "resultAlerts": true, "feeReminders": true}');