import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AdminLayout from "@/components/admin/AdminLayout";
import AbsentStudentsList from "@/components/AbsentStudentsList";
import { CalendarIcon, Users, UserCheck, UserX, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

const AttendanceOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, late: 0, excused: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingNotifications, setSendingNotifications] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchStats();
    }
  }, [selectedDate]);

  const checkAuthAndFetch = async () => {
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

    await fetchStats();
    setLoading(false);
  };

  const fetchStats = async () => {
    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("status")
      .eq("date", formattedDate);

    if (attendanceData) {
      setStats({
        total: attendanceData.length,
        present: attendanceData.filter(a => a.status === "present").length,
        absent: attendanceData.filter(a => a.status === "absent").length,
        late: attendanceData.filter(a => a.status === "late").length,
        excused: attendanceData.filter(a => a.status === "excused").length,
      });
    }
  };

  const handleSendNotifications = async () => {
    setSendingNotifications(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-attendance-notification", {
        body: { date: format(selectedDate, "yyyy-MM-dd") },
      });

      if (error) throw error;

      toast({
        title: "Notifications Sent",
        description: `Sent ${data.emailsSent || 0} emails and ${data.whatsappSent || 0} WhatsApp messages`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notifications",
        variant: "destructive",
      });
    } finally {
      setSendingNotifications(false);
    }
  };

  const statCards = [
    { label: "Total Marked", value: stats.total, icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Present", value: stats.present, icon: UserCheck, color: "text-success", bgColor: "bg-success/10" },
    { label: "Absent", value: stats.absent, icon: UserX, color: "text-destructive", bgColor: "bg-destructive/10" },
    { label: "Late", value: stats.late, icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  ];

  const attendanceRate = stats.total > 0 
    ? Math.round((stats.present / stats.total) * 100) 
    : 0;

  return (
    <AdminLayout title="Attendance Overview" description="View and manage daily attendance">
      {/* Date Picker & Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-64 justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button 
          onClick={handleSendNotifications} 
          disabled={sendingNotifications || stats.absent === 0}
          className="hero-gradient text-primary-foreground"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendingNotifications ? "Sending..." : "Notify Parents of Absences"}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Rate */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Attendance Rate</h3>
              <p className="text-sm text-muted-foreground">For {format(selectedDate, "MMMM d, yyyy")}</p>
            </div>
            <span className={`text-3xl font-bold ${attendanceRate >= 90 ? "text-success" : attendanceRate >= 70 ? "text-warning" : "text-destructive"}`}>
              {attendanceRate}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${attendanceRate >= 90 ? "bg-success" : attendanceRate >= 70 ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Absent Students List */}
      <AbsentStudentsList date={selectedDate} />
    </AdminLayout>
  );
};

export default AttendanceOverview;
