import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserX, Calendar, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

interface AbsentStudent {
  id: string;
  date: string;
  remarks: string | null;
  student: {
    id: string;
    student_id: string;
    profile: {
      full_name: string;
      email: string;
      phone: string | null;
    } | null;
  } | null;
  class: {
    name: string;
    section: string | null;
  } | null;
}

interface AbsentStudentsListProps {
  date?: Date;
  showTitle?: boolean;
  maxItems?: number;
}

const AbsentStudentsList = ({ date = new Date(), showTitle = true, maxItems }: AbsentStudentsListProps) => {
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAbsentStudents();
  }, [date]);

  const fetchAbsentStudents = async () => {
    setLoading(true);
    const formattedDate = format(date, "yyyy-MM-dd");

    const { data: attendanceData, error } = await supabase
      .from("attendance")
      .select(`
        id,
        date,
        remarks,
        student_id,
        class_id
      `)
      .eq("date", formattedDate)
      .eq("status", "absent");

    if (error) {
      console.error("Error fetching absent students:", error);
      setLoading(false);
      return;
    }

    if (!attendanceData || attendanceData.length === 0) {
      setAbsentStudents([]);
      setLoading(false);
      return;
    }

    // Fetch student details
    const studentIds = attendanceData.map(a => a.student_id);
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, user_id")
      .in("id", studentIds);

    // Fetch profiles
    const userIds = studentsData?.map(s => s.user_id) || [];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    // Fetch classes
    const classIds = attendanceData.filter(a => a.class_id).map(a => a.class_id);
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name, section")
      .in("id", classIds);

    // Combine data
    const enrichedData = attendanceData.map(attendance => {
      const student = studentsData?.find(s => s.id === attendance.student_id);
      const profile = profilesData?.find(p => p.user_id === student?.user_id);
      const classInfo = classesData?.find(c => c.id === attendance.class_id);

      return {
        id: attendance.id,
        date: attendance.date,
        remarks: attendance.remarks,
        student: student ? {
          id: student.id,
          student_id: student.student_id,
          profile: profile ? {
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
          } : null,
        } : null,
        class: classInfo ? {
          name: classInfo.name,
          section: classInfo.section,
        } : null,
      };
    });

    setAbsentStudents(maxItems ? enrichedData.slice(0, maxItems) : enrichedData);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-destructive" />
              Absent Students
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-destructive" />
            Absent Students
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {format(date, "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {absentStudents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No absent students for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {absentStudents.map((record) => (
              <div
                key={record.id}
                className="flex items-start gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/10"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {record.student?.profile?.full_name || "Unknown Student"}
                    </p>
                    <Badge variant="outline" className="shrink-0 font-mono text-xs">
                      {record.student?.student_id || "N/A"}
                    </Badge>
                  </div>
                  {record.class && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {record.class.name}{record.class.section ? ` - ${record.class.section}` : ""}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {record.student?.profile?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {record.student.profile.email}
                      </span>
                    )}
                    {record.student?.profile?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {record.student.profile.phone}
                      </span>
                    )}
                  </div>
                  {record.remarks && (
                    <p className="text-xs mt-2 text-muted-foreground italic">
                      Remarks: {record.remarks}
                    </p>
                  )}
                </div>
                <Badge variant="destructive" className="shrink-0">Absent</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AbsentStudentsList;
