import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, LogOut, BookOpen, FileText, Award, Calendar, ClipboardList, Settings, Loader2, KeyRound
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalSidebarLink from "@/components/PortalSidebarLink";

const StudentSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSignOut = async () => { 
    await supabase.auth.signOut(); 
    navigate("/"); 
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({ title: "Success", description: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to change password", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader portalName="Student Portal" onSignOut={handleSignOut} />

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <PortalSidebarLink to="/dashboard" icon={BookOpen} label="Dashboard" isDashboard />
            <PortalSidebarLink to="/student/courses" icon={BookOpen} label="My Courses" />
            <PortalSidebarLink to="/student/assignments" icon={FileText} label="Assignments" />
            <PortalSidebarLink to="/student/exams" icon={ClipboardList} label="Exams" />
            <PortalSidebarLink to="/student/results" icon={Award} label="Results" />
            <PortalSidebarLink to="/student/timetable" icon={Calendar} label="Timetable" />
            <PortalSidebarLink to="/student/settings" icon={Settings} label="Settings" isActive />
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings</p>
          </div>

          <div className="max-w-xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password. You'll use the new password for future logins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      minLength={6}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full hero-gradient text-primary-foreground"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentSettings;
