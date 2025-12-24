import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GraduationCap, Users, School, BookOpen, ClipboardList, 
  Bell, LogOut, Search, Plus, Pencil, Trash2, UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserWithProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "student",
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

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

    fetchUsers();
  };

  const fetchUsers = async () => {
    // Fetch profiles with their roles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email, phone")
      .order("full_name", { ascending: true });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setLoading(false);
      return;
    }

    // Fetch all user roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    // Combine profiles with roles
    const usersWithRoles = profiles?.map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.user_id);
      return {
        ...profile,
        role: userRole?.role || "student"
      };
    }) || [];

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Check if role exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let error;
    if (existingRole) {
      // Update existing role
      const result = await supabase
        .from("user_roles")
        .update({ role: newRole as "admin" | "teacher" | "student" | "parent" })
        .eq("user_id", userId);
      error = result.error;
    } else {
      // Insert new role
      const result = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole as "admin" | "teacher" | "student" | "parent" });
      error = result.error;
    }

    if (error) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "User role updated" });
      fetchUsers();
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone: formData.phone || null,
      })
      .eq("user_id", editingUser.user_id);

    if (profileError) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
      return;
    }

    // Update role if changed
    if (formData.role !== editingUser.role) {
      await handleUpdateRole(editingUser.user_id, formData.role);
    } else {
      toast({ title: "Success", description: "User updated successfully" });
    }

    setIsDialogOpen(false);
    setEditingUser(null);
    resetForm();
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user? This will delete their profile and role.")) return;

    // Delete role first
    await supabase.from("user_roles").delete().eq("user_id", userId);
    
    // Delete profile
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "User removed successfully" });
      fetchUsers();
    }
  };

  const openEditDialog = (user: UserWithProfile) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => setFormData({ full_name: "", email: "", phone: "", role: "student" });

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-destructive/10 text-destructive border-destructive/20",
      teacher: "bg-primary/10 text-primary border-primary/20",
      student: "bg-info/10 text-info border-info/20",
      parent: "bg-warning/10 text-warning border-warning/20",
    };
    return <Badge variant="outline" className={styles[role] || ""}>{role}</Badge>;
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold">The Suffah</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card">
          <nav className="p-4 space-y-2">
            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <GraduationCap className="w-5 h-5" /><span className="font-medium">Dashboard</span>
            </Link>
            <Link to="/admin/user-management" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground">
              <Users className="w-5 h-5" /><span className="font-medium">Users</span>
            </Link>
            <Link to="/admin/classes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <School className="w-5 h-5" /><span className="font-medium">Classes</span>
            </Link>
            <Link to="/admin/subjects" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <BookOpen className="w-5 h-5" /><span className="font-medium">Subjects</span>
            </Link>
            <Link to="/admin/admissions" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent text-muted-foreground">
              <ClipboardList className="w-5 h-5" /><span className="font-medium">Admissions</span>
            </Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-2">User Management</h1>
              <p className="text-muted-foreground">Manage users, roles, and permissions</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: users.length, color: "text-primary" },
              { label: "Admins", value: users.filter(u => u.role === "admin").length, color: "text-destructive" },
              { label: "Teachers", value: users.filter(u => u.role === "teacher").length, color: "text-primary" },
              { label: "Students", value: users.filter(u => u.role === "student").length, color: "text-info" },
            ].map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Select 
                              value={user.role} 
                              onValueChange={(value) => handleUpdateRole(user.user_id, value)}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="parent">Parent</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="icon" variant="ghost" onClick={() => openEditDialog(user)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive" 
                              onClick={() => handleDeleteUser(user.user_id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={(o) => { 
            setIsDialogOpen(o); 
            if (!o) { setEditingUser(null); resetForm(); } 
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user profile and role</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={formData.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData(p => ({ ...p, role: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" className="hero-gradient text-primary-foreground">
                    Update User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default UserManagement;
