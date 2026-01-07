import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, LogOut, BookOpen, FileText, Award, Calendar, 
  Wallet, UserCheck, UserX, Clock, AlertCircle
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalSidebarLink from "@/components/PortalSidebarLink";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

const StudentAttendance = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchAttendance();
    }
  }, [currentMonth, studentId]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || (roleData as any).role !== "student") { 
      navigate("/dashboard"); 
      return; 
    }

    // Get student record
    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (studentData) {
      setStudentId(studentData.id);
    }
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!studentId) return;

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("attendance")
      .select("id, date, status, remarks")
      .eq("student_id", studentId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false });

    if (!error && data) {
      setRecords(data);
      
      const present = data.filter(r => r.status === "present").length;
      const absent = data.filter(r => r.status === "absent").length;
      const late = data.filter(r => r.status === "late").length;
      const excused = data.filter(r => r.status === "excused").length;
      const total = data.length;
      
      setStats({
        total,
        present,
        absent,
        late,
        excused,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-success text-success-foreground";
      case "absent": return "bg-destructive text-destructive-foreground";
      case "late": return "bg-warning text-warning-foreground";
      case "excused": return "bg-info text-info-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <UserCheck className="w-4 h-4" />;
      case "absent": return <UserX className="w-4 h-4" />;
      case "late": return <Clock className="w-4 h-4" />;
      case "excused": return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getAttendanceForDate = (date: Date) => {
    return records.find(r => isSameDay(new Date(r.date), date));
  };

  const statCards = [
    { label: "Attendance Rate", value: `${stats.percentage}%`, icon: UserCheck, color: "text-success", bgColor: "bg-success/10" },
    { label: "Present", value: stats.present, icon: UserCheck, color: "text-success", bgColor: "bg-success/10" },
    { label: "Absent", value: stats.absent, icon: UserX, color: "text-destructive", bgColor: "bg-destructive/10" },
    { label: "Late", value: stats.late, icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader portalName="Student Portal" onSignOut={handleSignOut} />

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <PortalSidebarLink to="/dashboard" icon={BookOpen} label="Dashboard" isDashboard />
            <PortalSidebarLink to="/student/courses" icon={BookOpen} label="My Courses" />
            <PortalSidebarLink to="/student/attendance" icon={UserCheck} label="Attendance" isActive />
            <PortalSidebarLink to="/student/assignments" icon={FileText} label="Assignments" />
            <PortalSidebarLink to="/student/results" icon={Award} label="Results" />
            <PortalSidebarLink to="/student/timetable" icon={Calendar} label="Timetable" />
            <PortalSidebarLink to="/student/fees" icon={Wallet} label="Fee Status" />
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">My Attendance</h1>
            <p className="text-muted-foreground">View your attendance record for {format(currentMonth, "MMMM yyyy")}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Stats */}
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

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                >
                  Previous Month
                </Button>
                <h2 className="font-heading text-xl font-semibold">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                >
                  Next Month
                </Button>
              </div>

              {/* Calendar View */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                  <CardDescription>Click on a day to see details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for days before the first of the month */}
                    {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {days.map(day => {
                      const attendance = getAttendanceForDate(day);
                      return (
                        <div
                          key={day.toString()}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm border transition-colors ${
                            isToday(day) ? "ring-2 ring-primary" : ""
                          } ${
                            attendance 
                              ? attendance.status === "present" 
                                ? "bg-success/10 border-success/20" 
                                : attendance.status === "absent"
                                  ? "bg-destructive/10 border-destructive/20"
                                  : attendance.status === "late"
                                    ? "bg-warning/10 border-warning/20"
                                    : "bg-info/10 border-info/20"
                              : "bg-muted/30 border-border"
                          }`}
                        >
                          <span className="font-medium">{format(day, "d")}</span>
                          {attendance && (
                            <span className={`mt-1 ${
                              attendance.status === "present" ? "text-success" :
                              attendance.status === "absent" ? "text-destructive" :
                              attendance.status === "late" ? "text-warning" : "text-info"
                            }`}>
                              {getStatusIcon(attendance.status)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Legend */}
              <Card className="mb-8">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-success/20 border border-success/30" />
                      <span className="text-sm">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/30" />
                      <span className="text-sm">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-warning/20 border border-warning/30" />
                      <span className="text-sm">Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-info/20 border border-info/30" />
                      <span className="text-sm">Excused</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Records */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Records</CardTitle>
                  <CardDescription>Your attendance history</CardDescription>
                </CardHeader>
                <CardContent>
                  {records.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No attendance records for this month</p>
                  ) : (
                    <div className="space-y-3">
                      {records.slice(0, 10).map(record => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(record.status)}`}>
                              {getStatusIcon(record.status)}
                            </div>
                            <div>
                              <p className="font-medium">{format(new Date(record.date), "EEEE, MMMM d, yyyy")}</p>
                              {record.remarks && (
                                <p className="text-xs text-muted-foreground">{record.remarks}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentAttendance;
