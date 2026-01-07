import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, LogOut, BookOpen, FileText, Award, Calendar, Download, Wallet, BookMarked, File
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalSidebarLink from "@/components/PortalSidebarLink";

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  created_at: string;
  class_id: string;
  subject_id: string;
  subjects: { name: string } | null;
}

const StudentMaterials = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    if (!roleData || roleData.role !== "student") { navigate("/dashboard"); return; }

    // Get student's class
    const { data: studentData } = await supabase
      .from("students")
      .select("class_id, classes(name)")
      .eq("user_id", session.user.id)
      .single();

    if (studentData) {
      setClassName((studentData.classes as any)?.name || "");
      
      // Fetch materials for student's class
      const { data: materialsData } = await supabase
        .from("study_materials")
        .select("*, subjects(name)")
        .eq("class_id", studentData.class_id)
        .order("created_at", { ascending: false });

      setMaterials((materialsData as Material[]) || []);
    }

    setLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  const getFileIcon = (fileType: string | null) => {
    switch (fileType) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'document': return <FileText className="w-6 h-6 text-blue-500" />;
      case 'presentation': return <FileText className="w-6 h-6 text-orange-500" />;
      case 'image': return <FileText className="w-6 h-6 text-green-500" />;
      case 'video': return <FileText className="w-6 h-6 text-purple-500" />;
      default: return <File className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader portalName="Student Portal" onSignOut={handleSignOut} />

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <PortalSidebarLink to="/dashboard" icon={BookOpen} label="Dashboard" isDashboard />
            <PortalSidebarLink to="/student/courses" icon={BookOpen} label="My Courses" />
            <PortalSidebarLink to="/student/materials" icon={BookMarked} label="Study Materials" isActive />
            <PortalSidebarLink to="/student/assignments" icon={FileText} label="Assignments" />
            <PortalSidebarLink to="/student/results" icon={Award} label="Results" />
            <PortalSidebarLink to="/student/timetable" icon={Calendar} label="Timetable" />
            <PortalSidebarLink to="/student/fees" icon={Wallet} label="Fee Status" />
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Study Materials</h1>
            <p className="text-muted-foreground">
              Learning resources for {className || "your class"}
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
          ) : materials.length === 0 ? (
            <Card className="p-8 text-center">
              <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No study materials available yet</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for resources from your teachers</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((material) => (
                <Card key={material.id} className="card-hover">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        {getFileIcon(material.file_type)}
                      </div>
                      <Badge variant="outline">{material.subjects?.name}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{material.title}</CardTitle>
                    <CardDescription>{material.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(material.created_at)}
                      </span>
                      <Button variant="default" size="sm" asChild>
                        <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-1" />Download
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentMaterials;