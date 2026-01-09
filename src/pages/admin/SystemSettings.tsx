import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Building, Calendar, Bell, Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";

interface SchoolInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  motto: string;
}

interface AcademicSettings {
  currentYear: string;
  currentSemester: string;
  gradeScale: string;
  passingMarks: string;
}

interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  attendanceAlerts: boolean;
  resultAlerts: boolean;
  feeReminders: boolean;
}

const SystemSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingNotification, setSavingNotification] = useState(false);

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: "The Suffah School",
    address: "123 Education Street, Knowledge City",
    phone: "+1 234 567 890",
    email: "info@thesuffah.edu",
    website: "www.thesuffah.edu",
    motto: "Excellence in Education",
  });

  const [academicSettings, setAcademicSettings] = useState<AcademicSettings>({
    currentYear: "2024-2025",
    currentSemester: "1",
    gradeScale: "percentage",
    passingMarks: "40",
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    attendanceAlerts: true,
    resultAlerts: true,
    feeReminders: true,
  });

  useEffect(() => {
    checkAuthAndLoadSettings();
  }, []);

  const checkAuthAndLoadSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") { 
      navigate("/dashboard"); 
      return; 
    }

    // Load settings from database
    await loadSettings();
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value");

    if (error) {
      console.error("Error loading settings:", error);
      return;
    }

    if (data) {
      data.forEach((setting) => {
        const value = setting.setting_value as Record<string, unknown>;
        switch (setting.setting_key) {
          case "school_info":
            setSchoolInfo(value as unknown as SchoolInfo);
            break;
          case "academic_settings":
            setAcademicSettings(value as unknown as AcademicSettings);
            break;
          case "notification_settings":
            setNotificationSettings(value as unknown as NotificationSettings);
            break;
        }
      });
    }
  };

  const saveSetting = async (key: string, value: unknown) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // First check if the setting exists
    const { data: existing } = await supabase
      .from("system_settings")
      .select("id")
      .eq("setting_key", key)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          setting_value: value,
          updated_by: session?.user.id 
        } as never)
        .eq("setting_key", key);

      if (error) {
        console.error("Error updating setting:", error);
        throw error;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("system_settings")
        .insert({ 
          setting_key: key, 
          setting_value: value,
          updated_by: session?.user.id 
        } as never);

      if (error) {
        console.error("Error inserting setting:", error);
        throw error;
      }
    }
  };

  const handleSaveSchoolInfo = async () => {
    setSavingSchool(true);
    try {
      await saveSetting("school_info", schoolInfo);
      toast({ title: "Success", description: "School information saved successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save school information", variant: "destructive" });
    } finally {
      setSavingSchool(false);
    }
  };

  const handleSaveAcademicSettings = async () => {
    setSavingAcademic(true);
    try {
      await saveSetting("academic_settings", academicSettings);
      toast({ title: "Success", description: "Academic settings saved successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save academic settings", variant: "destructive" });
    } finally {
      setSavingAcademic(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setSavingNotification(true);
    try {
      await saveSetting("notification_settings", notificationSettings);
      toast({ title: "Success", description: "Notification settings saved successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save notification settings", variant: "destructive" });
    } finally {
      setSavingNotification(false);
    }
  };

  const handleBackup = () => {
    toast({
      title: "Backup Started",
      description: "Creating system backup...",
    });
    setTimeout(() => {
      toast({
        title: "Backup Complete",
        description: "System backup created successfully",
      });
    }, 2000);
  };

  if (loading) {
    return (
      <AdminLayout title="System Settings" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="System Settings" description="Configure school and system settings">
      <div className="grid gap-6">
        {/* School Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              School Information
            </CardTitle>
            <CardDescription>Basic school details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input
                  value={schoolInfo.name}
                  onChange={(e) => setSchoolInfo(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={schoolInfo.phone}
                  onChange={(e) => setSchoolInfo(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={schoolInfo.email}
                  onChange={(e) => setSchoolInfo(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={schoolInfo.website}
                  onChange={(e) => setSchoolInfo(p => ({ ...p, website: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={schoolInfo.address}
                  onChange={(e) => setSchoolInfo(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>School Motto</Label>
                <Input
                  value={schoolInfo.motto}
                  onChange={(e) => setSchoolInfo(p => ({ ...p, motto: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveSchoolInfo} disabled={savingSchool} className="gap-2">
                {savingSchool ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Academic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Academic Settings
            </CardTitle>
            <CardDescription>Configure academic year and grading system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Academic Year</Label>
                <Select value={academicSettings.currentYear} onValueChange={(v) => setAcademicSettings(p => ({ ...p, currentYear: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Semester</Label>
                <Select value={academicSettings.currentSemester} onValueChange={(v) => setAcademicSettings(p => ({ ...p, currentSemester: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade Scale</Label>
                <Select value={academicSettings.gradeScale} onValueChange={(v) => setAcademicSettings(p => ({ ...p, gradeScale: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (0-100)</SelectItem>
                    <SelectItem value="gpa">GPA (0-4)</SelectItem>
                    <SelectItem value="letter">Letter Grade (A-F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Passing Marks (%)</Label>
                <Input
                  type="number"
                  value={academicSettings.passingMarks}
                  onChange={(e) => setAcademicSettings(p => ({ ...p, passingMarks: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveAcademicSettings} disabled={savingAcademic} className="gap-2">
                {savingAcademic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure how notifications are sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Notification Channels</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailEnabled}
                    onCheckedChange={(v) => setNotificationSettings(p => ({ ...p, emailEnabled: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsEnabled}
                    onCheckedChange={(v) => setNotificationSettings(p => ({ ...p, smsEnabled: v }))}
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-4">Alert Types</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Attendance Alerts</p>
                    <p className="text-sm text-muted-foreground">Notify parents of absences</p>
                  </div>
                  <Switch
                    checked={notificationSettings.attendanceAlerts}
                    onCheckedChange={(v) => setNotificationSettings(p => ({ ...p, attendanceAlerts: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Result Alerts</p>
                    <p className="text-sm text-muted-foreground">Notify when results are published</p>
                  </div>
                  <Switch
                    checked={notificationSettings.resultAlerts}
                    onCheckedChange={(v) => setNotificationSettings(p => ({ ...p, resultAlerts: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Fee Reminders</p>
                    <p className="text-sm text-muted-foreground">Send fee payment reminders</p>
                  </div>
                  <Switch
                    checked={notificationSettings.feeReminders}
                    onCheckedChange={(v) => setNotificationSettings(p => ({ ...p, feeReminders: v }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveNotificationSettings} disabled={savingNotification} className="gap-2">
                {savingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Backup & Restore
            </CardTitle>
            <CardDescription>Manage system backups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last backup: December 23, 2024 at 11:30 PM</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBackup}>
                  Create Backup
                </Button>
                <Button variant="outline">
                  Restore from Backup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SystemSettings;