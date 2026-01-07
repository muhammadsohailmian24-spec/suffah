import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Users, BookOpen, ClipboardList, Bell, LogOut, 
  Calendar, CheckCircle, XCircle, Clock, FileText, BookMarked, Award
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalSidebarLink from "@/components/PortalSidebarLink";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  student_id: string;
  user_id: string;
  class_id: string | null;
  profiles?: { full_name: string };
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  status: string;
  date: string;
}

interface ClassOption {
  id: string;
  name: string;
  section: string | null;
}

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [existingRecords, setExistingRecords] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass, selectedDate]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "teacher") {
      navigate("/dashboard");
      return;
    }

    // Get teacher ID
    const { data: teacherData } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (teacherData) {
      setTeacherId(teacherData.id);
    }

    // Fetch only classes assigned to this teacher via timetable
    if (teacherData) {
      const { data: timetableData } = await supabase
        .from("timetable")
        .select("class_id, classes(id, name, section)")
        .eq("teacher_id", teacherData.id);

      if (timetableData) {
        // Get unique classes from timetable entries
        const uniqueClasses = new Map<string, ClassOption>();
        timetableData.forEach((entry: any) => {
          if (entry.classes && !uniqueClasses.has(entry.class_id)) {
            uniqueClasses.set(entry.class_id, {
              id: entry.classes.id,
              name: entry.classes.name,
              section: entry.classes.section,
            });
          }
        });
        const classesArray = Array.from(uniqueClasses.values());
        setClasses(classesArray);
        if (classesArray.length > 0) {
          setSelectedClass(classesArray[0].id);
        }
      }
    }

    setLoading(false);
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;

    setLoading(true);

    // Fetch students in the selected class
    const { data: studentsData, error } = await supabase
      .from("students")
      .select("id, student_id, user_id, class_id")
      .eq("class_id", selectedClass)
      .eq("status", "active")
      .order("student_id", { ascending: true });

    if (error) {
      console.error("Error fetching students:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles for student names
    if (studentsData && studentsData.length > 0) {
      const userIds = studentsData.map(s => s.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const studentsWithNames = studentsData.map(student => ({
        ...student,
        profiles: profilesData?.find(p => p.user_id === student.user_id),
      }));

      setStudents(studentsWithNames);

      // Fetch existing attendance records for this date
      const studentIds = studentsData.map(s => s.id);
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("id, student_id, status")
        .eq("date", selectedDate)
        .eq("class_id", selectedClass)
        .in("student_id", studentIds);

      // Initialize attendance state
      const attendanceState: Record<string, string> = {};
      const existingState: Record<string, string> = {};
      
      studentsData.forEach(s => {
        const existing = existingAttendance?.find(a => a.student_id === s.id);
        if (existing) {
          attendanceState[s.id] = existing.status;
          existingState[s.id] = existing.id;
        } else {
          attendanceState[s.id] = "present";
        }
      });

      setAttendance(attendanceState);
      setExistingRecords(existingState);
    } else {
      setStudents([]);
      setAttendance({});
      setExistingRecords({});
    }

    setLoading(false);
  };

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    if (!selectedClass) {
      toast({
        title: "Error",
        description: "Please select a class first",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const updates: any[] = [];
      const inserts: any[] = [];
      const absentStudentIds: string[] = [];

      Object.entries(attendance).forEach(([studentId, status]) => {
        const record = {
          student_id: studentId,
          class_id: selectedClass,
          date: selectedDate,
          status,
          marked_by: teacherId,
        };

        if (existingRecords[studentId]) {
          // Update existing record
          updates.push({ id: existingRecords[studentId], ...record });
        } else {
          // Insert new record
          inserts.push(record);
        }

        if (status === "absent") {
          absentStudentIds.push(studentId);
        }
      });

      // Perform updates
      for (const update of updates) {
        const { id, ...data } = update;
        const { error } = await supabase
          .from("attendance")
          .update(data)
          .eq("id", id);

        if (error) throw error;
      }

      // Perform inserts
      if (inserts.length > 0) {
        const { error } = await supabase
          .from("attendance")
          .insert(inserts);

        if (error) throw error;
      }

      toast({
        title: "Attendance Saved",
        description: `Attendance for ${selectedDate} has been recorded successfully.`,
      });

      // Automatically send notifications for absent students
      if (absentStudentIds.length > 0) {
        try {
          const { data, error } = await supabase.functions.invoke("send-attendance-notification", {
            body: { date: selectedDate },
          });

          if (!error && data) {
            toast({
              title: "Parents Notified",
              description: `Sent ${data.emailsSent || 0} emails and ${data.whatsappSent || 0} WhatsApp messages to parents.`,
            });
          }
        } catch (notifyError) {
          console.error("Error sending notifications:", notifyError);
        }
      }

      // Refresh the data
      await fetchStudents();
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present": return <Badge className="bg-success/10 text-success border-success/20">Present</Badge>;
      case "absent": return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Absent</Badge>;
      case "late": return <Badge className="bg-warning/10 text-warning border-warning/20">Late</Badge>;
      case "excused": return <Badge className="bg-info/10 text-info border-info/20">Excused</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const stats = [
    { label: "Present", value: Object.values(attendance).filter(s => s === "present").length, icon: CheckCircle, color: "text-success" },
    { label: "Absent", value: Object.values(attendance).filter(s => s === "absent").length, icon: XCircle, color: "text-destructive" },
    { label: "Late", value: Object.values(attendance).filter(s => s === "late").length, icon: Clock, color: "text-warning" },
    { label: "Excused", value: Object.values(attendance).filter(s => s === "excused").length, icon: Calendar, color: "text-info" },
  ];

  const hasExistingAttendance = Object.keys(existingRecords).length > 0;

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader portalName="Teacher Portal" onSignOut={handleSignOut} />

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <PortalSidebarLink to="/dashboard" icon={BookOpen} label="Dashboard" isDashboard />
            <PortalSidebarLink to="/teacher/attendance" icon={ClipboardList} label="Attendance" isActive />
            <PortalSidebarLink to="/teacher/assignments" icon={FileText} label="Assignments" />
            <PortalSidebarLink to="/teacher/results" icon={Award} label="Results" />
            <PortalSidebarLink to="/teacher/materials" icon={BookMarked} label="Materials" />
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">Mark Attendance</h1>
              <p className="text-muted-foreground">
                {hasExistingAttendance 
                  ? "Edit existing attendance records" 
                  : "Record daily student attendance"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={selectedClass || ""} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}{cls.section ? ` - ${cls.section}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background"
              />
              <Button onClick={saveAttendance} disabled={saving || students.length === 0} className="hero-gradient text-primary-foreground">
                {saving ? "Saving..." : hasExistingAttendance ? "Update Attendance" : "Save Attendance"}
              </Button>
            </div>
          </div>

          {hasExistingAttendance && (
            <Card className="mb-6 border-info/50 bg-info/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-info" />
                <p className="text-sm">
                  Attendance has already been marked for this date. You can edit the records and save changes.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-4">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Attendance</CardTitle>
              <CardDescription>
                {students.length > 0 
                  ? `${students.length} students in selected class` 
                  : "Select a class to view students"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : !selectedClass ? (
                <div className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Please select a class to mark attendance</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No students found in this class</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.student_id}</TableCell>
                        <TableCell>{student.profiles?.full_name || "N/A"}</TableCell>
                        <TableCell>{getStatusBadge(attendance[student.id] || "present")}</TableCell>
                        <TableCell>
                          <Select
                            value={attendance[student.id] || "present"}
                            onValueChange={(value) => handleAttendanceChange(student.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="excused">Excused</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default TeacherAttendance;