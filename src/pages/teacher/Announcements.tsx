import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Bell, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  target_audience: string[] | null;
  is_published: boolean | null;
  created_at: string;
}

const TeacherAnnouncements = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    target_audience: "all",
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });

    setAnnouncements(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      priority: "normal",
      target_audience: "all",
    });
    setEditingAnnouncement(null);
  };

  const openEditDialog = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setFormData({
      title: ann.title,
      content: ann.content,
      priority: ann.priority || "normal",
      target_audience: ann.target_audience?.[0] || "all",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const announcementData = {
      title: formData.title,
      content: formData.content,
      priority: formData.priority,
      target_audience: [formData.target_audience],
      author_id: user.id,
      is_published: true,
    };

    if (editingAnnouncement) {
      const { error } = await supabase
        .from("announcements")
        .update(announcementData)
        .eq("id", editingAnnouncement.id);
      if (error) {
        toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Announcement updated" });
    } else {
      const { error } = await supabase.from("announcements").insert(announcementData);
      if (error) {
        toast({ title: "Error", description: "Failed to create announcement", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Announcement published" });
    }

    setDialogOpen(false);
    resetForm();
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "Deleted", description: "Announcement removed" });
    fetchAnnouncements();
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case "high": return <Badge variant="destructive">Urgent</Badge>;
      case "medium": return <Badge variant="secondary">Important</Badge>;
      default: return <Badge variant="outline">Normal</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Announcements</h1>
              <p className="text-muted-foreground">Create and manage announcements</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                    required
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your announcement..."
                    rows={5}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="medium">Important</SelectItem>
                        <SelectItem value="high">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target Audience</Label>
                    <Select value={formData.target_audience} onValueChange={(v) => setFormData({ ...formData, target_audience: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="students">Students Only</SelectItem>
                        <SelectItem value="parents">Parents Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingAnnouncement ? "Update" : "Publish"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-6">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Announcements</h3>
              <p className="text-muted-foreground mb-4">You haven't created any announcements yet.</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Create First Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map(ann => (
              <Card key={ann.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <CardTitle className="text-lg">{ann.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(parseISO(ann.created_at), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(ann.priority)}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(ann)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(ann.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{ann.content}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Target: {ann.target_audience?.[0] || "all"}
                    </Badge>
                    <Badge variant={ann.is_published ? "default" : "secondary"} className="text-xs">
                      {ann.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherAnnouncements;
